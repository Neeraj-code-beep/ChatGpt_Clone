# $0/Month Free Hosting Deployment Guide (Render + MongoDB Atlas)

This guide describes how to deploy the full-stack ChatGPT Clone application completely **free ($0/month)** using **Render** (Static Site + Web Service) and **MongoDB Atlas** (Free M0 Cluster).

---

## 1. Free Deployment Architecture ($0/Month)

The application is deployed across two decoupled Render services sharing a free-tier MongoDB Atlas cluster:

```
                            Browser Client (HTTPS)
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        ▼                                                           ▼
Render Static Site                                          Render Web Service
https://<frontend>.onrender.com                             https://<backend>.onrender.com
(React 19 + Vite 8 SPA)                                     (Node.js + Express 5 + Socket.IO)
Publish: client/dist                                        Root: server/
Rewrite: /* -> /index.html                                  Health: /health
        │                                                           │
        │── Cross-Origin REST API (credentials: 'include') ─────────┤
        │── Cross-Origin Socket.IO (withCredentials: true) ─────────┤
                                                                    │
                                            ┌───────────────────────┴───────────────────────┐
                                            ▼                                               ▼
                                   MongoDB Atlas (Free M0)                         AI & Vector Services
                                   - 512 MB Storage                                - Google Gemini 3.6 Flash
                                   - TLS Connection String                         - Gemini Embedding-001
                                   - Network Access Tradeoff (0.0.0.0/0)           - Pinecone Vector DB
```

---

## 2. Free-Tier Behavior & Limitations (Honest Disclosure)

> [!WARNING]
> **Free-Tier Inactivity Sleep & Cold Starts**:
> - Render Free Web Services **spin down (sleep)** after 15 minutes of inactivity.
> - The **first request** after spinning down will take **50 to 70 seconds** while the container boots up.
> - While sleeping, active Socket.IO connections will close. When the user visits the frontend and triggers a request, the backend boots up and Socket.IO client automatically reconnects.
> - **Estimated Hosting Cost**: **$0.00 / month** for hosting. AI provider quotas (Google Gemini and Pinecone) follow their respective free/starter plan limits.

---

## 3. Security & Network Access Architecture

### MongoDB Atlas Network Access: Security Tradeoff vs. Best Practice
- **Production Best Practice**: On paid cloud infrastructure with static IP addresses, MongoDB Atlas network access should always be locked down strictly to the backend server's static egress IP.
- **Free-Tier Reality & Tradeoff**: Render Free Web Services operate on dynamic, shared outbound IP pools that change over time without static IP guarantees. Therefore, connecting Render Free to Atlas Free requires setting Atlas Network Access to **`0.0.0.0/0` (Allow Access from Anywhere)**.
- **Compensating Security Controls**:
  - All communication uses end-to-end TLS encryption via `mongodb+srv://`.
  - Database access is strictly guarded by high-entropy database user passwords.
  - The database user permissions are scoped with least-privilege access restricted only to the `chatgpt_clone` database.
  - The `0.0.0.0/0` setting is documented as an intentional free-tier connectivity tradeoff, not an architectural ideal.

### Cross-Origin Cookie Security (`SameSite=None; Secure; HttpOnly`)
- **Public Suffix List (PSL) Separation**: The domain `onrender.com` is registered on Mozilla's Public Suffix List. Consequently, `https://<frontend>.onrender.com` and `https://<backend>.onrender.com` are recognized by web browsers as **cross-site** entities (distinct eTLD+1).
- **Why SameSite=None is Mandatory**: When making cross-site fetch calls (`credentials: 'include'`) and establishing WebSocket handshakes between separate `onrender.com` subdomains, browsers enforce cross-site cookie restrictions. A cookie marked `SameSite=Lax` or `SameSite=Strict` will be silently blocked by the browser.
- **Hardened Settings**: In production (`NODE_ENV=production`), cookies are issued with `SameSite=None; Secure; HttpOnly; Max-Age=7d`. This ensures cookies travel securely over HTTPS without exposing JWT tokens to JavaScript (`document.cookie`).
- **Development Compatibility**: In local development (`NODE_ENV !== 'production'`), `SameSite=Lax` and `Secure=false` are used to allow plain HTTP localhost development.

### Strict CORS Origin Matching
Express and Socket.IO do not use wildcard `*` or arbitrary origin reflection. All incoming requests are matched strictly against `CLIENT_ORIGIN` (`https://<frontend-name>.onrender.com`).

---

## 4. Build-Time `VITE_*` Configuration

> [!IMPORTANT]
> **Vite Environment Variables are Baked in at Build Time**:
> Vite embeds `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_SOCKET_URL` into the compiled JavaScript bundle during `npm run build`.
> - If you change `VITE_API_URL` or `VITE_SOCKET_URL` in the Render Static Site dashboard, you **must trigger a redeploy (`Clear build cache & deploy`)** for the compiled assets to reflect the updated backend URL.
> - Backend secrets (`MONGODB_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `PINECONE_API_KEY`) are scoped strictly to the backend Web Service and are never accessible to the frontend.

---

## 5. Logical Deployment Order

Follow this safe, sequential deployment order:

```
1. Setup MongoDB Atlas ──► 2. Deploy Backend Web Service ──► 3. Verify /health
                                                                    │
6. Run 20-Step Smoke Test ◄── 5. Sync Backend CLIENT_ORIGIN ◄── 4. Build & Deploy Frontend
```

### Step 1: Provision MongoDB Atlas Free Cluster
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster and select the **M0 Free (Shared Sandbox)** tier.
3. In **Database Access**, create a dedicated database user (e.g. `db_user`) with read/write privileges and a secure password.
4. In **Network Access**, click **Add IP Address** and add `0.0.0.0/0` (noted as the free-tier connectivity tradeoff for dynamic Render IPs).
5. In **Database Deployments**, click **Connect** → **Drivers** (Node.js) and copy the connection string:
   ```text
   mongodb+srv://db_user:<password>@cluster0.xxxxx.mongodb.net/chatgpt_clone?retryWrites=true&w=majority
   ```

### Step 2: Deploy Backend Web Service on Render
1. In [Render Dashboard](https://render.com), click **New +** → **Web Service** (or use Blueprint).
2. Connect your GitHub repository (`ChatGpt_Clone`).
3. Configure settings:
   - **Name**: `chatgpt-clone-api`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci --omit=dev`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
   - **Health Check Path**: `/health`
4. Add Environment Variables:
   - `NODE_ENV=production`
   - `MONGODB_URL=mongodb+srv://...`
   - `JWT_SECRET=<secure_64_character_random_string>`
   - `GEMINI_API_KEY=<your_gemini_key>`
   - `PINECONE_API_KEY=<your_pinecone_key>`
   - `CLIENT_ORIGIN=https://chatgpt-clone-client.onrender.com` (placeholder until frontend is named)
   - `PENDING_REQUEST_TIMEOUT_MS=60000`
5. Click **Create Web Service**.
6. Once deployed, verify `https://<backend-name>.onrender.com/health` returns `{"status":"ok","database":"connected"}`.
7. Copy your backend service URL: `https://<backend-name>.onrender.com`.

### Step 3: Deploy Frontend Static Site on Render
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `chatgpt-clone-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variables:
   - `VITE_API_URL=https://<backend-name>.onrender.com`
   - `VITE_SOCKET_URL=https://<backend-name>.onrender.com`
5. Under **Redirects / Rewrites**, add the React Router SPA rule:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.
7. Note your frontend URL: `https://<frontend-name>.onrender.com`.

### Step 4: Final CORS Sync
1. In the Backend Web Service (`chatgpt-clone-api`) settings, update `CLIENT_ORIGIN`:
   ```text
   CLIENT_ORIGIN=https://<frontend-name>.onrender.com
   ```
2. Save changes (Render will automatically redeploy the backend).

---

## 6. One-Click Blueprint Deployment (`render.yaml`)

Both services can be provisioned together via [`render.yaml`](file:///render.yaml):

1. Push your repository to GitHub.
2. In Render, select **New +** → **Blueprint** and select your repository.
3. Render will parse `render.yaml` and configure:
   - `chatgpt-clone-api` with health check path `/health`.
   - `chatgpt-clone-client` with SPA rewrite `/*` → `/index.html`.
4. Enter your secret environment variables (`MONGODB_URL`, `GEMINI_API_KEY`, `PINECONE_API_KEY`).
5. Click **Apply**.

---

## 7. Optional Self-Hosted VPS Deployment

For production deployments requiring dedicated single-origin infrastructure on a VPS with Nginx and systemd, refer to [`deployment/optional-vps/`](file:///deployment/optional-vps/README.md).
