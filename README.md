# ChatGPT Clone

Full-stack ChatGPT clone application featuring a React + Vite frontend and a Node.js + Express + Socket.IO + Gemini + Pinecone backend.

## Project Architecture

```text
Chatgpt_Clone/
├── client/          # React + Vite frontend application
├── server/          # Node.js + Express + Socket.IO + Gemini backend
├── docs/            # Architecture, DB schema, and API documentation
├── .gitignore
├── package.json     # Workspace root scripts
└── README.md
```

## Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment
Set up `server/.env` with your credentials:
```env
PORT=3000
MONGODB_URL=mongodb://localhost:27017/chatgpt_clone
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

### 3. Run Development Servers
From the root directory:
```bash
# Run backend
npm run dev:server

# Run frontend
npm run dev:client
```
