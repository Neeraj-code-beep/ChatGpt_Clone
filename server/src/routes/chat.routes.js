const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

/* All chat endpoints require authenticated session */
router.use(authMiddleware.authUser);

/* GET /api/chat - List all chats for authenticated user */
router.get('/', chatController.getChats);

/* POST /api/chat - Create a new chat session */
router.post('/', chatController.createChat);

/* GET /api/chat/:id/messages - Retrieve message history for a chat */
router.get('/:id/messages', chatController.getChatMessages);

/* PATCH /api/chat/:id - Rename/update a chat title */
router.patch('/:id', chatController.updateChat);

/* DELETE /api/chat/:id - Delete a chat and its associated messages */
router.delete('/:id', chatController.deleteChat);

module.exports = router;
