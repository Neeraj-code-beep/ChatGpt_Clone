# Production Deployment & Verification Checklist

This document provides a comprehensive operational checklist across Pre-Deploy, Deploy, and Post-Deploy phases for the Node.js AI Chat backend.

---

## 1. PRE-DEPLOY CHECKLIST

- [ ] **Repository Status**: `git status` is clean with no uncommitted scratch files or debug code.
- [ ] **Secrets & Security**: No real secrets, JWT tokens, or API keys are committed in code or documentation.
- [ ] **Environment Validation**: All required environment variables are available in the hosting environment:
  - `MONGODB_URL`: Valid production MongoDB connection string.
  - `JWT_SECRET`: High-entropy 64-character secret key.
  - `GEMINI_API_KEY`: Production Google Gemini API key with active quotas.
  - `PINECONE_API_KEY`: Production Pinecone API key with active `chatgptclone` index.
  - `CLIENT_ORIGIN`: Exact production frontend domain URL (e.g., `https://chat.example.com`).
  - `NODE_ENV`: Set to `production`.
  - `PORT`: Configured by platform or set to production port (e.g., `3000`).
- [ ] **Dependency Installation**: `npm install --omit=dev` or `npm ci` completes cleanly without errors.
- [ ] **Syntax & Loading Checks**: Syntax checks (`node -c`) and module loading checks pass on target deployment environment.

---

## 2. DEPLOY CHECKLIST

- [ ] **Process Startup**: Production process starts via `npm start` (`node server.js`) or PM2 process manager.
- [ ] **Startup Logs**: Logs confirm successful environment validation (`validateEnv()`), server listening on target port, and MongoDB connection.
- [ ] **Health Endpoint Check**: `GET /health` returns HTTP 200 with `{"status": "ok", "database": "connected"}`.
- [ ] **Socket.IO Connectivity**: Frontend establishes Socket.IO connection and receives socket ID without CORS errors.
- [ ] **Cookie Verification**: HTTP login (`POST /api/auth/login`) issues HTTP-only `token` cookie with `Secure` and `SameSite=Lax` flags.
- [ ] **AI Response Generation**: Emitting `ai-message` payload produces a valid `ai-response` event from Google Gemini.

---

## 3. POST-DEPLOY VERIFICATION CHECKLIST

- [ ] **Idempotency Enforcement**: Emitting a duplicate `ai-message` payload with an existing `requestId` returns the cached response with `duplicate: true` without calling Gemini again.
- [ ] **Vector Memory Retrieval**: Subsequent queries retrieve relevant context from Pinecone and inject memories into the prompt.
- [ ] **Authentication Boundary**: Unauthenticated socket connections or requests with invalid/expired JWT cookies are rejected immediately (`Authentication error`).
- [ ] **CORS Origin Rejection**: Requests originating from unauthorized domains are rejected by Socket.IO CORS configuration.
- [ ] **Graceful Shutdown**: Sending `SIGTERM` or `SIGINT` to the Node process allows in-flight HTTP/socket operations to close cleanly before disconnecting MongoDB and exiting within 10 seconds.

---

## 4. Operational Summary & Environment Variables

| Variable Name | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | Optional | `3000` | HTTP & Socket.IO server listen port. |
| `NODE_ENV` | Optional | `development` | Runtime environment mode (`production` / `development`). |
| `CLIENT_ORIGIN` | Required (Prod) | `http://localhost:5173` | Allowed frontend origin for Socket.IO CORS and credentialed cookies. |
| `MONGODB_URL` | **Required** | None | Production MongoDB Atlas or cluster connection string. |
| `JWT_SECRET` | **Required** | None | Secret key used to sign and verify authentication JWT cookies. |
| `GEMINI_API_KEY` | **Required** | None | API key for Google Gemini generative and embedding models. |
| `PINECONE_API_KEY` | **Required** | None | API key for Pinecone vector database index `chatgptclone`. |
| `PENDING_REQUEST_TIMEOUT_MS` | Optional | `60000` | Stale request recovery threshold (must be > 45s AI timeout). |
