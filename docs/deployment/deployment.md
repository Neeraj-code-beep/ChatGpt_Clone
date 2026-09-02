# Deployment Guide & Architecture

This guide describes how to build, run, configure, and operate the Node.js AI Chat backend in production environments.

## Platform-Neutral Architecture

The backend is built as a single-process Node.js service using:
- **Express 5** for REST API routes and `/health` monitoring.
- **Socket.IO 4** for real-time WebSocket messaging.
- **Mongoose 9** for durable MongoDB storage.
- **Pinecone 8** for vector similarity memory retrieval.
- **Google Gemini 3.6 Flash & Embedding-001** for AI capabilities.

```mermaid
flowchart TD
    LB[Load Balancer / Reverse Proxy\nNginx / Caddy / Cloudflare]
    Node[Node.js App Server\nprocess.env.PORT]
    MongoDB[(MongoDB Production Cluster)]
    Pinecone[(Pinecone Vector Index)]
    Gemini[Google Gemini API]

    LB <-->|HTTP / WebSockets| Node
    Node <-->|Mongoose Driver| MongoDB
    Node <-->|Pinecone SDK| Pinecone
    Node <-->|@google/genai SDK| Gemini
```

---

## 1. Installation & Environment Setup

### Step 1: Install Dependencies
```bash
npm install --omit=dev
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` or set environment variables in your deployment platform settings (Render, Railway, Fly.io, AWS, DigitalOcean, etc.):

```env
PORT=3000
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend-domain.com

MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/chatgpt_clone
JWT_SECRET=your_secure_random_jwt_secret_64_chars
GEMINI_API_KEY=your_production_gemini_api_key
PINECONE_API_KEY=your_production_pinecone_api_key
```

---

## 2. Running in Production

### Direct Node.js Execution
```bash
NODE_ENV=production node server.js
```

### Using PM2 Process Manager
```bash
npm install -g pm2
pm2 start server.js --name "chatgpt-clone-api" --env production
```

---

## 3. Health Checks & Monitoring

### Liveness & Readiness Endpoint
- **URL**: `GET /health`
- **Successful Response (HTTP 200)**:
  ```json
  {
    "status": "ok",
    "uptime": 1420,
    "timestamp": "2026-09-03T00:15:00.000Z",
    "database": "connected"
  }
  ```
- **Degraded Response (HTTP 503)**:
  ```json
  {
    "status": "degraded",
    "uptime": 1420,
    "timestamp": "2026-09-03T00:15:00.000Z",
    "database": "disconnected"
  }
  ```

---

## 4. Graceful Shutdown & Rollout Strategy

When a container orchestrator or process manager updates the deployment, it sends a `SIGTERM` signal:

1. **Signal Interception**: The process captures `SIGTERM` or `SIGINT`.
2. **Stop Ingress**: HTTP server stops accepting new connections (`httpServer.close()`).
3. **Database Cleanup**: Mongoose connection is closed cleanly (`mongoose.connection.close()`).
4. **Timeout Backstop**: If shutdown takes longer than 10 seconds, `process.exit(1)` forces termination.

---

## 5. Rollback Considerations

- **Database Backward Compatibility**: Database indexes and message schema fields are backward-compatible. Rolling back to a previous server version will not break existing MongoDB collections.
- **Pinecone Vector Database**: Vector namespaces and memory statuses (`active` / `superseded`) are non-destructive.
