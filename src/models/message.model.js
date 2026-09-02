const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'chat',
    },

    requestId: {
      type: String,
      trim: true,
    },

    requestStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
    },

    requestStartedAt: {
      type: Date,
    },

    responseMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'message',
    },

    content: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index(
  { chat: 1, requestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      requestId: { $type: 'string' },
    },
  },
);

const messageModel = mongoose.model('message', messageSchema);

module.exports = messageModel;
