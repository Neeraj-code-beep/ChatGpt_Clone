# Production Deployment Checklist

This document provides a comprehensive verification checklist before deploying the Node.js AI Chat backend to a production environment.

## 1. Environment & Secrets Management

- [ ] `.env` file is excluded from git version control (verified in `.gitignore`).
- [ ] Production environment variables configured in hosting environment:
  - `PORT`: Set by platform or explicitly specified (e.g. `3000`).
  - `NODE_ENV`: Set to `production`.
  - `CLIENT_ORIGIN`: Configured with exact frontend domain URL (e.g. `https://chat.example.com`).
  - `MONGODB_URL`: Valid production MongoDB Atlas or replica set connection string.
  - `JWT_SECRET`: High-entropy, random 64-character secret key.
  - `GEMINI_API_KEY`: Production Google Gemini API Key with appropriate quotas.
  - `PINECONE_API_KEY`: Production Pinecone API Key with active index (`chatgptclone`).
- [ ] Startup environment validation (`validateEnv`) executes on bootstrap and fails fast if required secrets are missing.

---

## 2. Security & Authentication

- [ ] HTTP-only cookies enabled (`httpOnly: true`).
- [ ] Secure cookies enabled in production (`secure: true`).
- [ ] Cookie SameSite policy configured (`sameSite: 'lax'`).
- [ ] JWT tokens issued with explicit expiration (`expiresIn: '7d'`).
- [ ] Socket.IO CORS configured to match `CLIENT_ORIGIN` with `credentials: true`.
- [ ] Client chat ID authorization enforced on every Socket.IO request (`chatModel.findOne({ _id, user })`).
- [ ] Server log audit completed — zero logging of raw tokens, cookies, passwords, or Gemini API keys.

---

## 3. Performance & Abuse Protection

- [ ] Rate limiting active on Socket.IO AI requests (configured for 15 requests / 60 seconds per user).
- [ ] Bounded timeout wrapper active on Google Gemini API calls (45 seconds).
- [ ] Critical response path parallelization preserved:
  - Step 1: User message creation + embedding generation (`Promise.all`).
  - Step 2: Vector retrieval + chat history query (`Promise.all`).
- [ ] Query vector reuse verified (`retrieveMemories` reuses `queryVector` generated in Step 1).
- [ ] Background memory extraction (`processMemories`) runs asynchronously after response emission.

---

## 4. Database & Indexes

- [ ] MongoDB connection options production-ready (`ConnectToDB` handles errors and fails fast).
- [ ] Compound unique partial index created on `messageModel`: `{ chat: 1, requestId: 1 }` with `partialFilterExpression: { requestId: { $type: 'string' } }`.
- [ ] Chat history query index created on `messageModel`: `{ chat: 1, createdAt: -1 }`.
- [ ] Schema request lifecycle fields cleaned (`requestStatus` and `responseMessageId` defaults removed).

---

## 5. Monitoring & Operational Readiness

- [ ] Health check endpoint active at `GET /health` (returns HTTP 200 when MongoDB is connected, HTTP 503 when degraded).
- [ ] Graceful shutdown handlers active for `SIGTERM` and `SIGINT` (10-second force exit timeout).
- [ ] Server logs output to stdout/stderr formatted for container log aggregators.
