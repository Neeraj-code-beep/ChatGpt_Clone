# ChatGPT Clone

A full-stack, real-time conversational AI workspace featuring a React + Vite frontend and a Node.js + Express + Socket.IO backend powered by Google Gemini and Pinecone vector search.

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
├── docs/                   # Architecture, database schema, and deployment guides
│   └── deployment/         # Production deployment guide and checklist
├── package.json            # Root workspace scripts
└── README.md
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI
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

## Production Build & Deployment

The application is architected to run behind a **Single-Origin Reverse Proxy** (e.g. Nginx, Caddy, or Cloudflare).

1. **Build Frontend**:
   ```bash
   npm run build:client
   ```
   Generates production static assets in `client/dist/`.

2. **Start Backend**:
   ```bash
   NODE_ENV=production npm start
   ```

For comprehensive production deployment steps, sample reverse proxy configurations, and verification checklists, refer to:
- [Deployment Guide](file:///docs/deployment/deployment.md)
- [Production Checklist & Smoke Test Plan](file:///docs/deployment/production-checklist.md)
