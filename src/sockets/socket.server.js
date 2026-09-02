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

// How long a pending request can remain "fresh" before we consider it stale.
// A stale request is one whose processing appears to have stopped (e.g. server
// crash, client disconnect) and can be safely reclaimed by a future retry.
//
// CURRENT VALUE: 10 seconds — intentionally short for testing stale-request
// recovery. A production value should be chosen based on actual AI response
// latency (typically 30-120s depending on model and context size).
const PENDING_REQUEST_TIMEOUT_MS = 10 * 1000;

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  // ================================================================
  // AUTHENTICATION MIDDLEWARE
  // ================================================================
  // Every Socket.IO connection must be authenticated via JWT cookie.
  // The JWT is read from the HTTP-only cookie set during login.
  // The verified user document is attached to socket.user for all
  // subsequent event handlers — we never trust client-provided user IDs.
  // ================================================================
  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || '');

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

    // ================================================================
    // AI MESSAGE HANDLER
    // ================================================================
    // This is the critical request path. The lifecycle is:
    //
    //   validate → authorize → idempotency check → create/reuse message
    //   → embed query → retrieve memories + history (parallel)
    //   → build context → generate AI response → save response
    //   → emit response → background memory processing
    //
    // Key architectural properties:
    //   1. Idempotent: same (chat, requestId) = same logical request
    //   2. Concurrent-safe: MongoDB unique index prevents duplicates
    //   3. Recoverable: stale/failed requests can be reclaimed
    //   4. Low-latency: independent ops run in parallel via Promise.all
    //   5. Non-blocking: memory processing runs after response emission
    // ================================================================
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

        // Security: verify chat belongs to the authenticated user.
        // Never trust a client-provided chat ID alone.
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

        // ================================================================
        // IDEMPOTENCY CHECK
        // ================================================================
        // The requestId acts as an idempotency key. A client may resend
        // the same logical request after a reconnect, timeout, or double
        // click. We look up (chat, requestId, role='user') to determine
        // whether this is a new request, a duplicate, or a recoverable
        // stale/failed request.
        //
        // This application-level check handles the common case. The
        // MongoDB unique index on {chat, requestId} is the concurrency
        // safety net — see E11000 handling below.
        // ================================================================
        const existingRequest = await messageModel
          .findOne({
            chat,
            requestId: normalizedRequestId,
            role: 'user',
          })
          .select(
            '_id content requestId requestStatus requestStartedAt responseMessageId',
          )
          .lean();

        let reuseExistingMessage = false;

        if (existingRequest) {
          // COMPLETED: Return the cached response. No new AI generation needed.
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

          // PENDING: check if the request is still fresh or has gone stale.
          if (existingRequest.requestStatus === 'pending') {
            const startedAt = existingRequest.requestStartedAt
              ? new Date(existingRequest.requestStartedAt).getTime()
              : null;

            const isStale =
              !startedAt || Date.now() - startedAt > PENDING_REQUEST_TIMEOUT_MS;

            // Fresh pending: another handler is actively processing this.
            if (!isStale) {
              return socket.emit('ai-response', {
                chat,
                requestId: normalizedRequestId,
                status: 'processing',
                messageId: existingRequest._id,
              });
            }

            // STALE PENDING RECOVERY
            // The request has been pending longer than the timeout,
            // meaning the original processing likely stopped (server
            // crash, disconnect, etc). We atomically reclaim it by
            // refreshing requestStartedAt.
            //
            // Reclaim the existing request instead of creating another user message.
            // The requestStartedAt condition makes this a compare-and-set operation,
            // preventing two concurrent sockets from processing the same stale request.
            console.warn(
              `Stale pending request detected: ${normalizedRequestId}`,
            );

            const staleRecovery = await messageModel.updateOne(
              {
                _id: existingRequest._id,
                requestStatus: 'pending',
                requestStartedAt: existingRequest.requestStartedAt,
              },
              {
                $set: {
                  requestStartedAt: new Date(),
                },
              },
            );

            if (staleRecovery.modifiedCount !== 1) {
              // Another process already reclaimed this request.
              return socket.emit('ai-response', {
                chat,
                requestId: normalizedRequestId,
                status: 'processing',
                messageId: existingRequest._id,
              });
            }

            // Successfully reclaimed — reuse the existing user message.
            reuseExistingMessage = true;
          }

          // FAILED RETRY: atomically transition failed → pending and
          // reuse the existing user message. The filter on requestStatus
          // ensures only one concurrent retry can succeed.
          if (existingRequest.requestStatus === 'failed') {
            const retryUpdate = await messageModel.updateOne(
              {
                _id: existingRequest._id,
                requestStatus: 'failed',
              },
              {
                $set: {
                  requestStatus: 'pending',
                  requestStartedAt: new Date(),
                },
              },
            );

            if (retryUpdate.modifiedCount !== 1) {
              // Another process already reclaimed this failed request.
              return socket.emit('ai-response', {
                chat,
                requestId: normalizedRequestId,
                status: 'processing',
                messageId: existingRequest._id,
              });
            }

            reuseExistingMessage = true;
          }
        }

        // ================================================================
        // STEP 1: Save user message + generate query embedding
        // ================================================================
        // Performance: for NEW requests, message creation and vector
        // generation are independent operations, so they run in parallel
        // via Promise.all to reduce latency.
        //
        // For REUSED requests (stale recovery or failed retry), the
        // message already exists — we only need the query vector.
        // ================================================================

        let message;
        let queryVector;

        try {
          if (reuseExistingMessage) {
            // Stale or failed recovery: reuse existing user message.
            // Do NOT call messageModel.create() — it would hit E11000.
            message = existingRequest;

            queryVector = await aiService.generateVector(content);
          } else {
            // New request: create message + embed query in parallel.
            [message, queryVector] = await Promise.all([
              messageModel.create({
                chat,
                user: socket.user._id,
                requestId: normalizedRequestId,
                content,
                role: 'user',
                requestStatus: 'pending',
                requestStartedAt: new Date(),
              }),

              aiService.generateVector(content),
            ]);
          }
        } catch (error) {
          // ============================================================
          // E11000 DUPLICATE KEY HANDLER (concurrency safety net)
          // ============================================================
          // This catch handles the race condition where two concurrent
          // requests for the same (chat, requestId) both pass the
          // application-level existence check and both attempt
          // messageModel.create(). The MongoDB unique index on
          // {chat, requestId} ensures only one succeeds; the loser
          // gets E11000 and lands here.
          //
          // We must NOT remove this handler even though there is an
          // application-level check above — they solve different
          // problems (app-level = common case, DB-level = concurrency).
          // ============================================================
          if (error?.code === 11000) {
            const existingMessage = await messageModel
              .findOne({
                chat,
                requestId: normalizedRequestId,
                role: 'user',
              })
              .select('_id content requestStatus requestStartedAt responseMessageId')
              .lean();

            if (!existingMessage) {
              // Extremely unlikely: the index said duplicate but we
              // can't find the document. Rethrow as unrecoverable.
              throw error;
            }

            // Pending: another handler is actively processing this request.
            if (existingMessage.requestStatus === 'pending') {
              return socket.emit('ai-response', {
                chat,
                requestId: normalizedRequestId,
                status: 'processing',
                messageId: existingMessage._id,
              });
            }

            // Completed: return the cached response.
            if (existingMessage.requestStatus === 'completed') {
              if (!existingMessage.responseMessageId) {
                throw new Error(
                  'Request is completed but response message ID is missing.',
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

            // Failed: reclaim and continue processing.
            if (existingMessage.requestStatus === 'failed') {
              const retryUpdate = await messageModel.updateOne(
                {
                  _id: existingMessage._id,
                  requestStatus: 'failed',
                },
                {
                  $set: {
                    requestStatus: 'pending',
                    requestStartedAt: new Date(),
                  },
                },
              );

              if (retryUpdate.modifiedCount !== 1) {
                // Another process already reclaimed this failed request.
                return socket.emit('ai-response', {
                  chat,
                  requestId: normalizedRequestId,
                  status: 'processing',
                  messageId: existingMessage._id,
                });
              }

              // Successfully reclaimed failed request — continue processing.
              message = existingMessage;
              queryVector = await aiService.generateVector(content);
              // Fall through to step 2 (retrieval + context + AI generation).
            } else {
              // Unknown status — should not happen given schema enum.
              throw error;
            }
          } else {
            // Non-E11000 error — rethrow to the outer catch.
            throw error;
          }
        }

        // ================================================================
        // STEP 2: Retrieve memories + chat history in parallel
        // ================================================================
        // Performance: memory retrieval (Pinecone vector search + ranking)
        // and chat history (MongoDB query) are independent operations.
        // Running them in parallel reduces latency on the critical path.
        //
        // The pre-computed queryVector from Step 1 is passed to
        // retrieveMemories to avoid redundant embedding generation.
        //
        // Security: memory retrieval is scoped to socket.user._id,
        // ensuring users can only access their own memories.
        //
        // History: limited to 20 most recent messages to keep context
        // size manageable and avoid excessive token usage / latency.
        // ================================================================

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

        // MongoDB returns newest → oldest with sort({createdAt: -1}).
        // Context needs chronological order (oldest → newest).
        chatHistory.reverse();

        // ================================================================
        // STEP 3: Build context (memories + history + current message)
        // ================================================================

        const context = buildContext({
          userMessage: content,
          chatHistory,
          memories,
        });

        // ================================================================
        // STEP 4: Generate AI response
        // ================================================================

        const response = await aiService.generateResponse(context.contents);

        // ================================================================
        // STEP 5: Save AI response, mark completed, emit to client
        // ================================================================
        // The response message is saved first, then the user message is
        // atomically marked as completed with the responseMessageId.
        // This ordering ensures we never mark a request "completed"
        // without having a persisted response to return on future
        // duplicate lookups.
        // ================================================================

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
          requestId: normalizedRequestId,
        });

        // ================================================================
        // STEP 6: Background long-term memory processing
        // ================================================================
        // Performance: memory extraction, embedding, and Pinecone upsert
        // are expensive operations. They run AFTER the response is
        // emitted to the client so the user does not wait for them.
        //
        // The fire-and-forget pattern (.then/.catch) is intentional —
        // memory processing failures should not affect the user's
        // experience or the request lifecycle state.
        // ================================================================

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
        // ============================================================
        // ERROR HANDLER
        // ============================================================
        // Every request must end in a known state (completed or failed).
        // If processing fails, we attempt to mark the request as failed
        // so it can be retried later. If marking failed itself fails,
        // we log the secondary error without hiding the original one.
        //
        // Security: error messages are sent to the client, so we must
        // not expose internal stack traces, secrets, or infrastructure
        // details. The generic fallback 'Something went wrong.' is
        // intentional.
        // ============================================================
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
            // Log secondary failure without hiding the original error.
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
