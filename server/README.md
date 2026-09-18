# ChatGPT Clone — Backend Service

A real-time conversational AI backend engine powered by Node.js, Express 5, Socket.IO, Google Gemini (`gemini-3.6-flash`), and Pinecone vector search for contextual long-term memory retrieval.

---

## Key Capabilities

- **Real-Time WebSocket Engine:** Socket.IO integration with HTTP-only JWT cookie verification on connection handshake.
- **Vector Search & Memory Persistence:** Dual-layer architecture indexing 768-dimensional embeddings in Pinecone (`gemini-embedding-001`) alongside chronological conversation history in MongoDB.
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

Configure variables in `server/.env`:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` | Server listen port. |
| `NODE_ENV` | No | `development` | Set to `production` for secure cookie enforcement and strict env validation. |
| `CLIENT_ORIGIN` | Recommended | `http://localhost:5173` (dev) | Allowed frontend origin for Socket.IO handshake. |
| `MONGODB_URL` | **Yes** | None | MongoDB Atlas or cluster connection URI. |
| `JWT_SECRET` | **Yes** | None | Secret key for signing authentication JWT cookies (min 64 chars in prod). |
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

## Deployment Considerations

- **Topology**: Recommended behind a single-origin reverse proxy forwarding `/api` and `/socket.io` to `http://127.0.0.1:3000`.
- **Process Management**: Use PM2 (`pm2 start server.js --name "chatgpt-backend" --env production`) or systemd.
- **Graceful Shutdown**: Intercepts `SIGTERM` / `SIGINT`, closes HTTP & Socket connections, and disconnects MongoDB with a 10s safety backstop.
- **Scaling**: For multi-instance scaling, integrate `@socket.io/redis-adapter` and Redis-backed rate limiting.
