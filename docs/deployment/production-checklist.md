# Free Deployment Checklist & Operational Smoke Test Plan (Render + Atlas)

This document provides the pre-deployment security verification, operational checklist, and manual smoke test plan for deploying the ChatGPT Clone on the **$0/month Free Tier** using **Render** and **MongoDB Atlas Free (M0)**.

---

## 1. Pre-Deployment Configuration & Security Checklist

- [ ] **MongoDB Atlas Free Cluster**: M0 cluster created in target region with TLS (`mongodb+srv://`) enabled.
- [ ] **Database User Scoping**: Dedicated database user created with read/write permissions restricted to `chatgpt_clone`.
- [ ] **Atlas Network Access Tradeoff**: `0.0.0.0/0` added as the required free-tier connectivity tradeoff for dynamic Render outbound IPs.
- [ ] **Pinecone Index**: Index `chatgptclone` (768 dimensions, cosine metric) verified active.
- [ ] **Google Gemini API Key**: API key generated with active quotas for `gemini-3.6-flash` and `gemini-embedding-001`.
- [ ] **Render Account**: Account created and connected to repository.

---

## 2. Render Deployment Checklist

- [ ] **1. Backend Web Service**: Render Web Service (`chatgpt-clone-api`) created with Root Directory `server`.
- [ ] **2. Backend Build Command**: `npm ci --omit=dev` configured.
- [ ] **3. Backend Start Command**: `npm start` configured.
- [ ] **4. Backend Health Check**: `healthCheckPath: /health` configured.
- [ ] **5. Backend Plan**: `Free` plan selected.
- [ ] **6. Backend Environment Variables**:
  - `NODE_ENV=production`
  - `MONGODB_URL=mongodb+srv://...`
  - `JWT_SECRET=<64-char-random-string>`
  - `GEMINI_API_KEY=<key>`
  - `PINECONE_API_KEY=<key>`
  - `CLIENT_ORIGIN=https://<your-client-name>.onrender.com`
  - `PENDING_REQUEST_TIMEOUT_MS=60000`
- [ ] **7. Backend Health Verification**: `https://<backend-name>.onrender.com/health` returns HTTP 200 `{"status":"ok","database":"connected"}`.
- [ ] **8. Frontend Static Site**: Render Static Site (`chatgpt-clone-client`) created with Root Directory `client`.
- [ ] **9. Frontend Build Command**: `npm ci && npm run build` configured.
- [ ] **10. Frontend Publish Directory**: `dist` configured.
- [ ] **11. Frontend Build-Time Variables**:
  - `VITE_API_URL=https://<backend-name>.onrender.com`
  - `VITE_SOCKET_URL=https://<backend-name>.onrender.com`
  *(Note: Must be set prior to frontend build step).*
- [ ] **12. Frontend SPA Rewrite**: Rewrite rule `/*` → `/index.html` configured in Render Redirects/Rewrites.
- [ ] **13. CORS Sync**: Confirmed `CLIENT_ORIGIN` on backend matches exact frontend URL (`https://<frontend-name>.onrender.com`).

---

## 3. Post-Deployment 20-Step Manual Smoke Test Plan

Execute these 20 manual verification steps in the production browser:

| Step # | Action | Verification Criteria |
| :--- | :--- | :--- |
| **1** | Open `https://<backend-name>.onrender.com/health` | Returns HTTP 200 `{"status":"ok","database":"connected"}` |
| **2** | Open `https://<frontend-name>.onrender.com` | Landing page loads cleanly over HTTPS |
| **3** | Click "Get Started" / Navigate to `/register` | Registration form renders |
| **4** | Register a new user (`First Last`, `email`, `password`) | Form submits, issues cookie (`SameSite=None; Secure; HttpOnly`), redirects to `/chat` |
| **5** | Click Logout in user profile menu | Session destroyed, cookie cleared, redirects to `/login` |
| **6** | Log in with newly registered credentials | Login succeeds, redirected to `/chat` |
| **7** | Hard refresh browser (Ctrl+F5 / Cmd+Shift+R) | Session persists seamlessly; `GET /api/auth/me` returns profile |
| **8** | Click "+ New Chat" button in sidebar | New chat created and selected in main window |
| **9** | Type message: "Explain vector embeddings in 2 sentences" | User turn appears; loading indicator shows |
| **10** | Receive AI response via Socket.IO | Response renders with formatted markdown, syntax highlighting, and copy button |
| **11** | Hard refresh on `/chat/:chatId` | Chat thread and message history persist chronologically from MongoDB Atlas |
| **12** | Rename chat title from sidebar options menu | Title updates in sidebar and header |
| **13** | Create a second chat | Second chat added to sidebar list |
| **14** | Switch between chats in sidebar | Active chat messages switch instantly without state bleed |
| **15** | Send message in second chat | Response received and stored independently |
| **16** | Delete second chat | Chat deleted from sidebar and database with cascade message deletion |
| **17** | Log out of the application | Session terminated |
| **18** | Log back in with the same account | First chat and message history remain intact |
| **19** | Direct URL test: Navigate to `/nonexistent-route` | SPA router captures request and redirects cleanly to `/` |
| **20** | Cold Start & Reconnect Verification | After 15 minutes of inactivity, refresh page and verify backend wakes up and reconnects Socket.IO cleanly |

---

## 4. Security Verification Checklist

- [ ] **Cross-Origin Cookie Security**: Cookies use `HttpOnly: true`, `Secure: true`, and `SameSite: 'none'` in production.
- [ ] **No Secrets in Frontend Bundle**: Verified `client/dist/` contains zero API keys, secrets, or JWT tokens.
- [ ] **Strict CORS Enforcement**: Express REST routes and Socket.IO accept connections only from `CLIENT_ORIGIN`. Wildcard `*` and origin reflection are disabled.
- [ ] **Zero Token in JS**: JWT is never stored in `localStorage`, `sessionStorage`, or React state.
- [ ] **Database Network Security**: MongoDB Atlas user utilizes strong credentials and least-privilege scoping.
- [ ] **Fail-Fast Boot**: Backend halts immediately if any required environment variable is missing.
