# Database Indexes

This document documents the database index strategy, compound index definitions, and partial filtering expressions in MongoDB.

## Message Model Indexes ([`src/models/message.model.js`](file:///n:/Chatgpt_Clone/src/models/message.model.js))

### Compound Unique Partial Index

```javascript
messageSchema.index(
  { chat: 1, requestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      requestId: { $type: 'string' },
    },
  },
);
```

---

## Technical Index Rationale

### 1. Why Compound Key (`{ chat: 1, requestId: 1 }`)?
- `requestId` is supplied by the client app or frontend session.
- Scope Uniqueness: A `requestId` is generated per chat thread session. Scoping `requestId` under `chat` guarantees uniqueness per chat session while preventing potential collisions across different chats.
- Fast Lookup: Speeds up the critical application-level idempotency query:
  ```javascript
  messageModel.findOne({ chat, requestId, role: 'user' })
  ```

### 2. Why `unique: true`?
- Acts as the database-level concurrency backstop.
- Prevents race conditions when concurrent duplicate requests bypass the application-level pre-lookup.
- Forces MongoDB to enforce uniqueness and emit `E11000 duplicate key error` on duplicate insert attempts.

### 3. Why `partialFilterExpression: { requestId: { $type: 'string' } }`?
- AI model responses (`role: 'model'`) and system messages (`role: 'system'`) do not contain a `requestId` property (`requestId` is `undefined` / missing).
- Without partial filtering, MongoDB's unique index would index missing/null values, preventing more than one `requestId`-less message from existing per `chat`!
- Partial filtering instructs MongoDB to index **only** documents where `requestId` is explicitly a string. Non-request messages (model responses) bypass this unique index cleanly.

---

## Summary Table

| Collection | Index Fields | Unique | Partial Filter | Purpose |
|---|---|---|---|---|
| `messages` | `{ chat: 1, requestId: 1 }` | `true` | `{ requestId: { $type: 'string' } }` | Idempotency enforcement & fast request lookups |
| `users` | `{ email: 1 }` | `true` | None | Unique user login credential lookup |
