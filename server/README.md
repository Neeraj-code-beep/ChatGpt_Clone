# ChatGPT Clone — Backend Service

A real-time conversational AI backend engine powered by Node.js, Express 5, Socket.IO, Google Gemini (`gemini-3.6-flash`), and Pinecone vector search for contextual long-term memory retrieval.

Designed to run as a **Free Web Service on Render** with a **MongoDB Atlas Free (M0)** database.

---

## Key Capabilities

- **Real-Time WebSocket Engine:** Socket.IO integration with HTTP-only JWT cookie verification on connection handshake.
- **Cross-Origin Security & CORS:** Strict CORS origin matching with `Access-Control-Allow-Credentials: true` and `SameSite=None; Secure; HttpOnly` cookie security in production.
- **Vector Search & Memory Persistence:** Dual-layer architecture indexing 768-dimensional embeddings in Pinecone (`gemini-embedding-001`) alongside chronological conversation history in MongoDB Atlas.
- **Idempotency & Concurrency:** Compound unique index `{ chat, requestId }` deduplicates retried requests; Compare-And-Swap (CAS) state machine automatically recovers stale pending messages.
- **In-Memory Rate Limiting:** Enforces 15 messages per 60-second sliding window per authenticated user.
- **Fail-Fast Validation & Health Monitoring:** Validates required environment variables at boot; exposes `GET /health` with real-time MongoDB connectivity status.

---

## API & WebSocket Reference

### HTTP REST Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user (`fullName: { firstName, lastName }`, `email`, `password`) | No |
| `POST` | `/api/auth/login` | Authenticate user & set HTTP-only JWT cookie (`token`) | No |
| `GET` | `/api/auth/me` | Fetch authenticated user's safe profile (`_id`, `email`, `fullName`) | Yes (Cookie) |
| `POST` | `/api/auth/logout` | Invalidate/clear authentication JWT cookie | No |
| `GET` | `/api/chat` | List all chat sessions for authenticated user (sorted by `lastActivity` desc) | Yes (Cookie) |
| `POST` | `/api/chat` | Create a new chat session (`title`) | Yes (Cookie) |
| `GET` | `/api/chat/:id/messages` | Retrieve historical message turns for a chat (chronological) | Yes (Cookie) |
| `PATCH` | `/api/chat/:id` | Update chat title (`title`) | Yes (Cookie) |
| `DELETE` | `/api/chat/:id` | Delete a chat session and cascade-delete all associated message turns | Yes (Cookie) |
| `GET` | `/health` | Server and MongoDB connection health check (returns 200 or 503) | No |

### Socket.IO Event Contract

- **Handshake Authentication:** Automatically parses `token` cookie from client request (`withCredentials: true`).
- **Client Event — `ai-message`:**
  ```json
  {
    "chat": "<chat_id>",
    "content": "What is vector search?",
    "requestId": "<unique_request_uuid>"
  }
  ```
- **Server Response Event — `ai-response`:**
  ```json
  {
    "content": "Vector search is a methodology...",
    "chat": "<chat_id>",
    "messageId": "<message_id>",
    "requestId": "<unique_request_uuid>"
  }
  ```
- **Server Error Event — `error`:**
  ```json
  {
    "message": "Something went wrong. Please try again.",
    "chat": "<chat_id>",
    "requestId": "<unique_request_uuid>"
  }
  ```

---

## Environment Configuration

Configure variables in `server/.env` (or in Render Web Service Dashboard):

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` (or Render assigned) | Server listen port. |
| `NODE_ENV` | No | `development` | Set to `production` in production to enforce `Secure; SameSite=None` cookies and strict env validation. |
| `CLIENT_ORIGIN` | Recommended | `http://localhost:5173` (dev) | Allowed frontend origin for CORS and Socket.IO (e.g. `https://<frontend>.onrender.com`). |
| `MONGODB_URL` | **Yes** | None | MongoDB Atlas Free M0 cluster connection URI. |
| `JWT_SECRET` | **Yes** | None | Secret key for signing authentication JWT cookies. |
| `GEMINI_API_KEY` | **Yes** | None | Google Gemini API key. |
| `PINECONE_API_KEY` | **Yes** | None | Pinecone vector database API key. |
| `PENDING_REQUEST_TIMEOUT_MS` | No | `60000` | CAS stale message recovery threshold (ms). |

---

## Scripts & Operations

```bash
# Install production dependencies only
npm install --omit=dev

# Start production server
npm start

# Start development server
npm run dev

# Run automated integration test suite (19 tests)
npm test
```

---

## Free Hosting Deployment on Render

1. Create a **Web Service** on Render with Root Directory `server`.
2. Set Build Command: `npm ci --omit=dev` and Start Command: `npm start`.
3. Set Plan: `Free`.
4. Configure required Environment Variables (`NODE_ENV=production`, `MONGODB_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `PINECONE_API_KEY`, `CLIENT_ORIGIN`).
5. Render assigns `PORT` automatically and provides public HTTPS endpoint.
