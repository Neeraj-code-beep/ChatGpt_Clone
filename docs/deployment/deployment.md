# Full-Stack Deployment Guide & Architecture

This guide describes how to build, configure, deploy, and operate the full-stack ChatGPT Clone application in production environments.

---

## 1. Production Architecture & Topology

The application uses a **Single-Origin Reverse Proxy** topology. This architecture provides maximum security, eliminates cross-origin complexity for cookies and WebSockets, and allows the frontend to be served efficiently as static assets.

```
                               Browser / Client
                                      │
                                      ▼ HTTPS (:443)
                     ┌───────────────────────────────────┐
                     │   Reverse Proxy (Nginx / Caddy)   │
                     └─────────────────┬─────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
  Static Files (/ )             REST API (/api/*)           WebSockets (/socket.io/*)
  client/dist/                  Node.js Backend             Node.js Backend
  (HTML, CSS, JS)               localhost:3000              localhost:3000
                                       │                              │
                                       └──────────────┬───────────────┘
                                                      │
                                   ┌──────────────────┴──────────────────┐
                                   │                                     │
                                   ▼                                     ▼
                            MongoDB Cluster                    AI & Vector Services
                            (Session & Chats)                  - Google Gemini 3.6 Flash
                                                               - Gemini Embedding-001
                                                               - Pinecone Vector DB
```

### Key Topology Characteristics:
- **Single Public Origin**: Browser communicates with a single domain (e.g., `https://chat.example.com`).
- **Static Frontend Serving**: `client/dist/` is served directly by the web server (Nginx/Caddy/Cloudflare Pages), relieving the Node.js event loop from serving static assets.
- **SPA Routing Fallback**: All unrecognized frontend paths (`/`, `/login`, `/register`, `/chat`, `/chat/:chatId`) are rewritten to `/index.html` for client-side routing by React Router.
- **Same-Origin API & Sockets**: `/api/*` and `/socket.io/*` paths are proxied internally to the Node.js process listening on `localhost:3000`.
- **Seamless Authentication**: JWT session cookies (`token`) are sent automatically with `SameSite=Lax`, `HttpOnly`, and `Secure` without third-party cookie restrictions.

---

## 2. Environment Variables & Configuration

### Backend Environment (`server/.env`)

All required production variables are validated at startup via `validateEnv()`. If any required variable is missing in production (`NODE_ENV=production`), the backend halts immediately with a fatal error.

| Variable | Required | Default / Mode | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3000` | Local port for HTTP & Socket.IO server to listen on. |
| `NODE_ENV` | No | `development` | Set to `production` in production. Enforces `Secure` cookies and strict env validation. |
| `CLIENT_ORIGIN` | Recommended | `false` in prod | Allowed origin for Socket.IO handshake (e.g., `https://chat.example.com`). |
| `MONGODB_URL` | **Yes** | None | MongoDB Atlas or cluster connection URI. |
| `JWT_SECRET` | **Yes** | None | High-entropy random secret key (min 64 chars) for signing authentication cookies. |
| `GEMINI_API_KEY` | **Yes** | None | Google Gemini API key for response generation (`gemini-3.6-flash`) and embeddings (`gemini-embedding-001`). |
| `PINECONE_API_KEY` | **Yes** | None | Pinecone API key for vector similarity memory index (`chatgptclone`). |
| `PENDING_REQUEST_TIMEOUT_MS` | No | `60000` | Stale message recovery threshold in ms (must be greater than 45s AI timeout). |

### Frontend Environment (`client/.env`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | No | `''` (relative) | Leave unset for single-origin reverse proxy. Set only if hosting API on a separate domain. |
| `VITE_SOCKET_URL` | No | `''` (relative) | Leave unset for single-origin reverse proxy. Set only if hosting Socket.IO on a separate domain. |

> [!TIP]
> Leaving `VITE_API_URL` and `VITE_SOCKET_URL` empty allows the same built frontend bundle (`client/dist/`) to be deployed across different domain names and environments without rebuilding.

---

## 3. Build & Startup Commands

### Frontend Build
```bash
cd client
npm install
npm run build
```
Output directory: `client/dist/` containing `index.html` and bundled assets in `assets/`.

### Backend Production Startup
```bash
cd server
npm install --omit=dev
npm start
```
Starts `node server.js` directly without dev dependencies.

---

## 4. Reverse Proxy Configuration Examples

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name chat.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.example.com;

    ssl_certificate /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

    # 1. Frontend Static Files & SPA Fallback
    root /var/www/chatgpt-clone/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Socket.IO WebSocket Reverse Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 4. Health Check
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Caddy Configuration
```caddyfile
chat.example.com {
    # 1. REST API
    handle /api/* {
        reverse_proxy 127.0.0.1:3000
    }

    # 2. Socket.IO WebSockets
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:3000
    }

    # 3. Health Check
    handle /health {
        reverse_proxy 127.0.0.1:3000
    }

    # 4. Frontend Static Files with SPA Fallback
    handle {
        root * /var/www/chatgpt-clone/client/dist
        try_files {path} /index.html
        file_server
    }
}
```

---

## 5. Process Management & Graceful Shutdown

For production process management on a VPS or dedicated host, use **PM2** or **systemd**:

### PM2 Example
```bash
cd server
npm install -g pm2
pm2 start server.js --name "chatgpt-backend" --env production
pm2 save
pm2 startup
```

### Graceful Shutdown Behavior
The server process listens for `SIGTERM` and `SIGINT`:
1. Intercepts termination signal.
2. Stops accepting new HTTP connections via `server.close()`.
3. Closes all active Socket.IO connections.
4. Cleanly closes the MongoDB connection (`mongoose.connection.close()`).
5. Enforces a 10-second safety backstop timeout (`process.exit(1)` if closing hangs).
6. Exits with code `0` on successful drain.

---

## 6. Health Checks & Monitoring

### Endpoint
- **URL**: `GET /health`
- **Port**: `3000` (or behind reverse proxy `/health`)
- **Authentication**: None required (public for load balancers / uptime monitors)

### Status Responses

**Healthy (HTTP 200)**:
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-09-19T01:00:00.000Z",
  "database": "connected"
}
```

**Degraded (HTTP 503)** (when MongoDB connection is disconnected or down):
```json
{
  "status": "degraded",
  "uptime": 3600,
  "timestamp": "2026-09-19T01:00:00.000Z",
  "database": "disconnected"
}
```

---

## 7. Scaling, State & Rate Limiting

- **Current Deployment**: Single Node.js backend instance.
- **In-Memory Rate Limiter**: Limits users to 15 messages per 60-second window in memory.
- **Horizontal Scaling Consideration**: To scale horizontally across multiple backend instances in the future:
  - Configure a Socket.IO Redis Adapter (`@socket.io/redis-adapter`) to broadcast events across nodes.
  - Implement Redis-backed token bucket rate limiting.
  - Enable sticky sessions on the load balancer for WebSocket handshake stability.

---

## 8. Observability & Logging

- **Current Logging**: Application logs startup lifecycle, health events, and AI pipeline diagnostic information via `console.log` / `console.error` to `stdout` and `stderr`.
- **Log Aggregation**: Production operators should capture `stdout`/`stderr` streams using PM2 logs (`pm2 logs`), systemd journal (`journalctl`), or container logging drivers (Docker/AWS CloudWatch/Datadog).
- **Future Follow-up**: Migration to structured JSON logging (e.g., Pino or Winston) with configurable log levels (`INFO`, `DEBUG`, `WARN`, `ERROR`).

---

## 9. Rollback Strategy

1. **Frontend Rollback**: Re-point static web server root to the previous `client/dist/` build directory.
2. **Backend Rollback**: Re-deploy the previous server version and restart the process (`pm2 restart chatgpt-backend`).
3. **Database Schema Compatibility**: MongoDB schemas and compound indexes are fully backward-compatible. Rolling back code will not corrupt existing chat or user data.
4. **Pinecone Vector Index**: Vector embeddings and memory statuses (`active`/`superseded`) are non-destructive and remain compatible across releases.
