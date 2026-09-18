# Production Deployment & Operational Checklist

This document provides the standard 12-step sequential deployment procedure, security deployment checklist, and post-deploy smoke test plan for the ChatGPT Clone application.

---

## 1. 12-Step Sequential Deployment Procedure

```
1. Provision MongoDB ──► 2. Configure Env Vars ──► 3. Build Frontend ──► 4. Prepare Backend
                                                                                 │
8. Verify Auth ◄── 7. Configure Health ◄── 6. Start Backend ◄── 5. Setup Reverse Proxy
       │
       ▼
9. Verify Socket.IO ──► 10. Verify Persistence ──► 11. Verify Logout ──► 12. Verify Shutdown
```

1. **Provision Database**:
   - Provision a MongoDB cluster (e.g., MongoDB Atlas) with network access restricted to the backend IP/VPC.
   - Verify Pinecone index `chatgptclone` (768 dimensions, cosine similarity) is active.
2. **Configure Environment Variables**:
   - In the backend environment (`server/.env` or hosting panel), configure:
     - `PORT=3000`
     - `NODE_ENV=production`
     - `CLIENT_ORIGIN=https://yourdomain.com`
     - `MONGODB_URL=mongodb+srv://...`
     - `JWT_SECRET=<64-char-random-secret>`
     - `GEMINI_API_KEY=<production-key>`
     - `PINECONE_API_KEY=<production-key>`
3. **Build Frontend**:
   ```bash
   cd client
   npm install --include=dev
   npm run build
   ```
   Verify `client/dist/` contains `index.html` and compiled assets in `assets/`.
4. **Prepare Backend**:
   ```bash
   cd server
   npm install --omit=dev
   ```
5. **Configure Reverse Proxy / Static Web Server**:
   - Configure Nginx/Caddy with SSL/TLS certificate (Let's Encrypt / Cloudflare).
   - Point root `/` to `client/dist/` with SPA rewrite fallback (`try_files $uri $uri/ /index.html`).
   - Reverse proxy `/api/` to `http://127.0.0.1:3000`.
   - Reverse proxy `/socket.io/` to `http://127.0.0.1:3000` with WebSocket upgrade headers.
6. **Start Backend Process**:
   ```bash
   cd server
   NODE_ENV=production npm start
   # Or using PM2:
   pm2 start server.js --name "chatgpt-backend" --env production
   ```
7. **Configure & Verify Health Check**:
   - Query `GET /health` and confirm HTTP 200 with `{"status":"ok","database":"connected"}`.
8. **Verify Authentication**:
   - Test user registration and login via the web UI.
   - Verify `token` cookie is issued with `HttpOnly; Secure; SameSite=Lax`.
9. **Verify Socket.IO Handshake**:
   - Open browser developer tools → Network → WS tab.
   - Confirm WebSocket handshake succeeds using cookie authentication.
10. **Verify AI Message & Chat Persistence**:
    - Create a chat and send a prompt.
    - Confirm real-time AI response is received and rendered in markdown.
    - Refresh page and verify chat history persists from MongoDB.
11. **Verify Logout**:
    - Click logout in the UI.
    - Confirm `token` cookie is cleared and user is redirected to `/login`.
12. **Verify Graceful Shutdown**:
    - Send `SIGTERM` to backend process (`pm2 stop chatgpt-backend`).
    - Verify logs confirm HTTP/Socket servers closed and MongoDB disconnected cleanly.

---

## 2. Production Security Deployment Checklist

- [ ] **Strong JWT Secret**: `JWT_SECRET` is generated using a cryptographically secure random generator (min 64 characters) and never committed to git.
- [ ] **Production Node Environment**: `NODE_ENV=production` is set so auth cookies are marked `Secure` (HTTPS only) and environment validator runs in strict fail-fast mode.
- [ ] **HTTPS Enforced**: All public traffic is forced to HTTPS over port 443 with HSTS enabled.
- [ ] **Cookie Security Flags**: Auth cookies use `HttpOnly`, `Secure`, and `SameSite=Lax`. JavaScript cannot read the session token.
- [ ] **Explicit Client Origin**: `CLIENT_ORIGIN` matches the exact public domain in production; origin reflection is disabled.
- [ ] **Database Access Controls**: MongoDB user credentials use least-privilege permissions with IP whitelist.
- [ ] **AI & Vector Secrets**: `GEMINI_API_KEY` and `PINECONE_API_KEY` are provided exclusively via environment variables and never logged or exposed.
- [ ] **No Committed Environment Files**: `.env` and `.env.*` are excluded by `.gitignore`.
- [ ] **SPA Fallback Routing**: Reverse proxy serves `index.html` for unknown routes without directory browsing enabled.
- [ ] **WebSocket Proxy Headers**: Reverse proxy forwards `Upgrade: websocket` and `Connection: "Upgrade"` headers for Socket.IO.

---

## 3. Post-Deployment Manual Smoke Test Plan

Execute these 18 manual verification steps immediately following a deployment to confirm end-to-end functionality:

| Step # | Action | Expected Result |
| :--- | :--- | :--- |
| **1** | Open `https://yourdomain.com/health` | Returns HTTP 200 `{"status":"ok","database":"connected"}` |
| **2** | Navigate to `/register` and create a new account | Registration succeeds, cookie set, redirected to `/chat` |
| **3** | Click Logout | Cookie cleared, redirected to `/login` |
| **4** | Login with newly registered credentials | Login succeeds, redirected to `/chat` |
| **5** | Hard refresh browser on `/chat` | Session persists, authenticated user profile loaded |
| **6** | Create a new chat via sidebar "+ New Chat" | New chat appears in sidebar and is selected in main view |
| **7** | Send message: "What is quantum computing?" | User bubble appears, loading indicator shows |
| **8** | Receive AI response via Socket.IO | Formatted markdown response renders cleanly |
| **9** | Hard refresh the browser on `/chat/:chatId` | Chat and message history persist chronologically |
| **10** | Rename chat title from sidebar options menu | Title updates in sidebar and header |
| **11** | Create a second chat | Second chat added to sidebar list |
| **12** | Switch between the two chats in sidebar | Active chat messages switch seamlessly without bleed |
| **13** | Send message in second chat | Response received and stored independently |
| **14** | Delete the second chat | Chat removed from sidebar and database |
| **15** | Log out of the account | Session terminated cleanly |
| **16** | Log back in with the same account | First chat and message history still present |
| **17** | Directly navigate to an invalid chat ID `/chat/507f1f77bcf86cd799439011` | Application handles gracefully (redirects or displays empty state) |
| **18** | Navigate to an unknown route `/nonexistent-page` | SPA router redirects cleanly to landing page `/` |

---

## 4. Rollback Plan

If a deployment fails during verification:

1. **Static Frontend**: Re-point the web server root to the previous `dist/` build directory or re-run `npm run build` on the previous release commit.
2. **Backend**: Stop the service (`pm2 stop chatgpt-backend`), check out the previous release tag, install production dependencies (`npm install --omit=dev`), and restart the process (`pm2 restart chatgpt-backend`).
3. **Database Integrity**: The MongoDB schema additions (such as the `{ user: 1, lastActivity: -1 }` index) are backward-compatible and do not require rollbacks or data migrations.
