# Nexa
> Your AI, with context.

Nexa is a full-stack, real-time conversational AI application featuring:
- **Authenticated conversations** with secure cookie-based session management
- **Long-term memory** that extracts and persists key user context across sessions
- **Semantic retrieval** via 768-dimensional vector embeddings powered by Pinecone
- **Contextual responses** generated with Google Gemini
- **Real-time Socket.IO communication** with idempotent request guarantees

Designed for **$0/month free hosting** on Render and MongoDB Atlas.

---

## Repository Structure

```text
Chatgpt_Clone/
├── client/                 # React 19 + Vite 8 frontend (Tailwind CSS v4)
│   ├── src/                # UI components, pages, context, and API clients
│   └── package.json
├── server/                 # Node.js + Express 5 + Socket.IO backend
│   ├── src/                # Routes, controllers, services, models, and sockets
│   ├── test/               # Automated backend integration test suite
│   └── package.json
├── render.yaml             # Render Blueprint for 1-click free deployment
├── deployment/
│   └── optional-vps/       # Optional paid self-hosted VPS configs (Nginx/systemd)
├── docs/                   # Architecture, database schema, and deployment guides
│   └── deployment/         # Free hosting guide & production checklist
├── package.json            # Root workspace scripts
└── README.md
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas Free M0 Cluster URI
- **Google Gemini API Key**: For `gemini-3.6-flash` generation and `gemini-embedding-001` embeddings
- **Pinecone Vector DB API Key**: With an index named `chatgptclone` (768 dimensions, cosine metric)

---

## Quick Start (Development)

### 1. Install Dependencies
```bash
# Install backend dependencies
npm install --prefix server

# Install frontend dependencies
npm install --prefix client
```

### 2. Configure Environment
Copy example environment files and supply your API keys:
```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration (optional for dev, Vite proxy handles routing)
cp client/.env.example client/.env
```

Edit `server/.env` with your credentials:
```env
PORT=3000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URL=mongodb://localhost:27017/chatgpt_clone
JWT_SECRET=your_development_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### 3. Run Development Servers
```bash
# Run both backend and frontend concurrently
npm run dev

# Or run individually:
npm run dev:server   # Starts backend on http://localhost:3000
npm run dev:client   # Starts frontend on http://localhost:5173
```

---

## Testing & Quality Checks

```bash
# Run backend integration test suite (19 tests)
npm test

# Run frontend lint check
npm run lint --prefix client

# Run frontend production build
npm run build:client
```

---

## $0/Month Free Deployment (Render + MongoDB Atlas)

The application is configured for deployment on the **Render Free Tier**:
1. **Frontend**: Render Static Site (`client/dist`) with SPA rewrite rule `/*` → `/index.html`.
2. **Backend**: Render Free Web Service (`server/`) with Express REST API & Socket.IO.
3. **Database**: MongoDB Atlas Free (M0 Shared Sandbox) cluster.

### Deploy with Render Blueprint (`render.yaml`)
1. Push repository to GitHub.
2. In Render, select **New +** → **Blueprint** and connect your repository.
3. Fill in the prompted secret values (`MONGODB_URL`, `GEMINI_API_KEY`, `PINECONE_API_KEY`).
4. Click **Apply**.

> [!NOTE]
> **Free-Tier Inactivity Sleep**: Render Free Web Services sleep after 15 minutes of inactivity. The first request after sleep takes 50–70 seconds to spin up, after which Socket.IO reconnects automatically.

For detailed deployment steps, CORS configuration, and post-deploy smoke tests:
- [Free Hosting Deployment Guide](file:///docs/deployment/deployment.md)
- [Operational Checklist & Smoke Test Plan](file:///docs/deployment/production-checklist.md)
