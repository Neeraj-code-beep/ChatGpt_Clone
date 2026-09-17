const mongoose = require('mongoose');
const chatModel = require('../models/chat.model');
const messageModel = require('../models/message.model');

async function createChat(req, res) {
  const { title } = req.body;
  const user = req.user;

  const chatTitle =
    typeof title === 'string' && title.trim()
      ? title.trim().slice(0, 100)
      : 'New Conversation';

  const chat = await chatModel.create({
    user: user._id,
    title: chatTitle,
  });

  res.status(201).json({
    message: 'Chat created successfully',
    chat: {
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    },
  });
}

async function getChats(req, res) {
  const user = req.user;

  const chats = await chatModel
    .find({ user: user._id })
    .sort({ lastActivity: -1, createdAt: -1 })
    .select('_id title lastActivity user createdAt updatedAt')
    .lean();

  res.status(200).json({
    chats,
  });
}

async function getChatMessages(req, res) {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid chat ID' });
  }

  // Verify chat exists and belongs to the authenticated user
  const chat = await chatModel
    .findOne({ _id: id, user: user._id })
    .select('_id')
    .lean();

  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  const messages = await messageModel
    .find({ chat: id })
    .sort({ createdAt: 1 })
    .select('_id chat user role content requestId requestStatus createdAt updatedAt')
    .lean();

  res.status(200).json({
    messages,
  });
}

async function updateChat(req, res) {
  const { id } = req.params;
  const { title } = req.body;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid chat ID' });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length > 100) {
    return res.status(400).json({ message: 'Title cannot exceed 100 characters' });
  }

  const chat = await chatModel
    .findOneAndUpdate(
      { _id: id, user: user._id },
      { title: trimmedTitle, lastActivity: new Date() },
      { returnDocument: 'after' }
    )
    .select('_id title lastActivity user createdAt updatedAt')
    .lean();

  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  res.status(200).json({
    message: 'Chat updated successfully',
    chat,
  });
}

async function deleteChat(req, res) {
  const { id } = req.params;
  const user = req.user;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid chat ID' });
  }

  const chat = await chatModel.findOne({ _id: id, user: user._id });

  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  // Delete associated messages first, then the chat session
  await messageModel.deleteMany({ chat: id });
  await chatModel.deleteOne({ _id: id });

  res.status(200).json({
    message: 'Chat deleted successfully',
  });
}

module.exports = {
  createChat,
  getChats,
  getChatMessages,
  updateChat,
  deleteChat,
};
