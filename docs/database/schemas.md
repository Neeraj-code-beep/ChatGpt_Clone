# Database Schemas

This document defines the MongoDB collections and Mongoose schemas used by the backend service.

## Schemas Summary

| Collection Name | Model Name | Primary Responsibility |
|---|---|---|
| `users` | `User` | User identity and authentication credentials |
| `chats` | `chat` | Chat thread sessions owned by users |
| `messages` | `message` | Conversation turns, request lifecycle states, and AI responses |

---

## Message Schema (`src/models/message.model.js`)

```javascript
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
```

---

## Message Role Semantics & Field Matrix

Request lifecycle fields (`requestId`, `requestStatus`, `requestStartedAt`, `responseMessageId`) belong specifically to **User Request Messages** (`role: 'user'`). Non-user messages (`role: 'model'`, `role: 'system'`) do not specify these fields and leave them `undefined`.

| Message Role | `requestId` | `requestStatus` | `requestStartedAt` | `responseMessageId` |
|---|---|---|---|---|
| **`user`** (Request) | String (client-supplied) | `'pending'` → `'completed'` / `'failed'` | Timestamp on creation/reclaim | ObjectId of model response |
| **`model`** (Response) | `undefined` | `undefined` | `undefined` | `undefined` |
| **`system`** (System) | `undefined` | `undefined` | `undefined` | `undefined` |

### Field Definitions

| Field Name | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated MongoDB primary key. |
| `user` | `ObjectId` | Reference to `User` document who owns this message. |
| `chat` | `ObjectId` | Reference to `chat` session document. |
| `requestId` | `String` | Client-supplied unique request identifier (present on `user` role messages). |
| `requestStatus` | `String` | State machine status (`'pending'`, `'completed'`, `'failed'`). Set explicitly on `user` messages. |
| `requestStartedAt` | `Date` | Timestamp recording when user request processing started or was last reclaimed. |
| `responseMessageId` | `ObjectId` | Reference from `user` message to the corresponding `model` response document. |
| `content` | `String` | Raw text contents of the message turn. |
| `role` | `String` | Message role enum (`'user'`, `'model'`, `'system'`). Defaults to `'user'`. |
| `createdAt` | `Date` | Mongoose auto-timestamp for record creation. |
| `updatedAt` | `Date` | Mongoose auto-timestamp for last modification. |

---

## Chat Schema (`src/models/chat.model.js`)

```javascript
const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);
```

---

## User Schema (`src/models/user.model.js`)

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  password: {
    type: String,
  },
});
```

---

## Historical Data Migration Note

> [!NOTE]
> Existing historical MongoDB documents created prior to this schema update may retain `requestStatus: 'pending'` on legacy `role: 'model'` records due to previous default values.
> A database cleanup migration script can be run if historical records need to have legacy `requestStatus: 'pending'` removed from `role: 'model'` documents.
