const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const chatModel = require('../models/chat.model');
const userModel = require('../models/user.model');
const aiService = require('../services/ai.service');
const messageModel = require('../models/message.model');
const { retrieveMemories } = require('../services/retrieval.service');

const { buildContext } = require('../services/context.service');

const { processMemories } = require('../services/memory.service');

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  // Authentication Middleware
  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || '');

    console.log('Socket connection cookies:', cookies);

    if (!cookies.token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

      const user = await userModel.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Store the complete user document
      socket.user = user;

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);

    socket.on('ai-message', async (messagePayload) => {
      let currentRequestId = null;
      try {
        if (!messagePayload || typeof messagePayload !== 'object') {
          return socket.emit('ai-response', {
            error: 'Invalid message payload.',
          });
        }

        const { chat, content, requestId } = messagePayload;

        if (
          typeof chat !== 'string' ||
          typeof content !== 'string' ||
          !chat.trim() ||
          !content.trim()
        ) {
          return socket.emit('ai-response', {
            error: 'Invalid message payload.',
          });
        }

        if (typeof requestId !== 'string' || !requestId.trim()) {
          return socket.emit('ai-response', {
            error: 'requestId is required.',
          });
        }

        const normalizedRequestId = requestId.trim();

        currentRequestId = normalizedRequestId;

        if (normalizedRequestId.length > 100) {
          return socket.emit('ai-response', {
            error: 'requestId is too long.',
          });
        }

        const MAX_MESSAGE_LENGTH = 10_000;

        if (content.length > MAX_MESSAGE_LENGTH) {
          return socket.emit('ai-response', {
            error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
          });
        }

        if (!mongoose.Types.ObjectId.isValid(chat)) {
          return socket.emit('ai-response', {
            error: 'Invalid chat ID.',
          });
        }

        const chatDocument = await chatModel
          .findOne({
            _id: chat,
            user: socket.user._id,
          })
          .select('_id');

        if (!chatDocument) {
          return socket.emit('ai-response', {
            error: 'Chat not found or access denied.',
          });
        }

        const existingRequest = await messageModel
          .findOne({
            chat,
            user: socket.user._id,
            requestId: normalizedRequestId,
            role: 'user',
          })
          .select('_id content requestStatus responseMessageId')
          .lean();

        if (existingRequest) {
          if (existingRequest.requestStatus === 'completed') {
            const existingResponse = await messageModel
              .findById(existingRequest.responseMessageId)
              .select('_id content')
              .lean();

            if (existingResponse) {
              return socket.emit('ai-response', {
                content: existingResponse.content,
                chat,
                messageId: existingResponse._id,
                requestId: normalizedRequestId,
                duplicate: true,
              });
            }
          }

          if (existingRequest.requestStatus === 'pending') {
            return socket.emit('ai-response', {
              chat,
              requestId: normalizedRequestId,
              status: 'processing',
              messageId: existingRequest._id,
            });
          }

          if (existingRequest.requestStatus === 'failed') {
            // We'll allow the request to be retried.
            await messageModel.updateOne(
              { _id: existingRequest._id },
              {
                $set: {
                  requestStatus: 'pending',
                },
              },
            );
          }
        }

        // --------------------------------
        // 1. Save user message + generate
        //    query embedding in parallel
        // --------------------------------

        let message;
        let queryVector;

        try {
          [message, queryVector] = await Promise.all([
            messageModel.create({
              chat,
              user: socket.user._id,
              requestId: normalizedRequestId,
              content,
              role: 'user',
            }),

            aiService.generateVector(content),
          ]);
        } catch (error) {
          if (error?.code === 11000) {
            const existingMessage = await messageModel
              .findOne({
                chat,
                requestId: normalizedRequestId,
                user: socket.user._id,
                role: 'user',
              })
              .select('_id requestStatus responseMessageId')
              .lean();

            if (!existingMessage) {
              throw error;
            }

            // Request is still being processed
            if (existingMessage.requestStatus === 'pending') {
              return socket.emit('ai-response', {
                chat,
                requestId: normalizedRequestId,
                status: 'processing',
                messageId: existingMessage._id,
              });
            }

            // Request already completed
            if (existingMessage.requestStatus === 'completed') {
              if (!existingMessage.responseMessageId) {
                throw new Error(
                  'Request is completed but response message is missing.',
                );
              }

              const existingResponse = await messageModel
                .findById(existingMessage.responseMessageId)
                .select('_id content')
                .lean();

              if (!existingResponse) {
                throw new Error(
                  'Request is completed but response message could not be found.',
                );
              }

              return socket.emit('ai-response', {
                content: existingResponse.content,
                chat,
                messageId: existingResponse._id,
                requestId: normalizedRequestId,
                duplicate: true,
              });
            }

            // Failed requests are allowed to continue.
            if (existingMessage.requestStatus === 'failed') {
              // Let the normal failed-request retry path handle it.
              throw error;
            }

            throw error;
          }

          throw error;
        }

        // --------------------------------
        // 2. Retrieval + chat history
        //    happen in parallel
        // --------------------------------

        const [memories, chatHistory] = await Promise.all([
          retrieveMemories({
            query: content,
            queryVector,
            userId: socket.user._id,
            limit: 5,
          }),

          messageModel
            .find({
              chat,
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
        ]);

        // Mongo gives newest → oldest.
        // Context should receive oldest → newest.
        chatHistory.reverse();

        // --------------------------------
        // 3. Build context
        // --------------------------------

        const context = buildContext({
          userMessage: content,
          chatHistory,
          memories,
        });

        // --------------------------------
        // 4. Generate response
        // --------------------------------

        const response = await aiService.generateResponse(context.contents);

        // --------------------------------
        // 5. Save response + emit
        // --------------------------------

        const responseMessage = await messageModel.create({
          chat,
          user: socket.user._id,
          content: response,
          role: 'model',
        });

        await messageModel.updateOne(
          {
            _id: message._id,
            requestId: normalizedRequestId,
          },
          {
            $set: {
              requestStatus: 'completed',
              responseMessageId: responseMessage._id,
            },
          },
        );

        socket.emit('ai-response', {
          content: response,
          chat,
          messageId: responseMessage._id,
        });

        // --------------------------------
        // 6. Long-term memory
        //    runs AFTER response
        // --------------------------------

        processMemories({
          userMessage: content,
          aiResponse: response,
          userId: socket.user._id,
          chatId: chat,
        })
          .then((result) => {
            console.log('Background memory processing:', result);
          })
          .catch((error) => {
            console.error('Background memory processing error:', error);
          });
      } catch (err) {
        console.error('Socket Error:', err);

        if (currentRequestId) {
          try {
            await messageModel.updateOne(
              {
                chat: messagePayload?.chat,
                user: socket.user._id,
                requestId: currentRequestId,
                role: 'user',
              },
              {
                $set: {
                  requestStatus: 'failed',
                },
              },
            );
          } catch (statusError) {
            console.error('Failed to update request status:', statusError);
          }
        }

        socket.emit('ai-response', {
          error: err.message || 'Something went wrong.',
          requestId: currentRequestId,
        });
      }
    });
  });
}

module.exports = initSocketServer;
