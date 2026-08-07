const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

const userModel = require('../models/user.model');
const aiService = require('../services/ai.service');
const messageModel = require('../models/message.model');
const { createMemory, queryMemory } = require('../services/vector.service');

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
      try {
        /*
        messagePayload = {
          chat: chatId,
          content: message text
        }
        */

        // Save user message
        const message = await messageModel.create({
          chat: messagePayload.chat,
          user: socket.user._id,
          content: messagePayload.content,
          role: 'user',
        });

        // Generate embedding for user message
        const vectors = await aiService.generateVector(messagePayload.content);

        const memory = await queryMemory({
          queryVector: vectors,
          limit: 3,
          metadata: {
            chat: messagePayload.chat,
            user: socket.user._id,
          },
        });

        console.log(memory);

        await createMemory(
          vectors,
          {
            chat: messagePayload.chat,
            user: socket.user._id,
            text: messagePayload.content,
          },
          message.id,
        );
        console.log('User vectors stored successfully.');

        // Get last 20 messages
        const chatHistory = (
          await messageModel
            .find({
              chat: messagePayload.chat,
            })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
        ).reverse();

        // Generate AI response
        const response = await aiService.generateResponse(
          chatHistory.map((item) => ({
            role: item.role,
            parts: [{ text: item.content }],
          })),
        );

        // Save AI response
        const responseMessage = await messageModel.create({
          chat: messagePayload.chat,
          user: socket.user._id,
          content: response,
          role: 'model',
        });

        // Generate embedding for AI response
        const responseVectors = await aiService.generateVector(response);

        // Store AI response in Pinecone
        await createMemory(
          responseVectors,
          {
            chat: messagePayload.chat,
            user: socket.user._id,
            text: response,
          },
          responseMessage.id,
        );

        console.log('AI vectors stored successfully.');

        socket.emit('ai-response', {
          content: response,
          chat: messagePayload.chat,
        });
      } catch (err) {
        console.error('Socket Error:', err);

        socket.emit('ai-response', {
          error: err.message || 'Something went wrong.',
        });
      }
    });
  });
}

module.exports = initSocketServer;
