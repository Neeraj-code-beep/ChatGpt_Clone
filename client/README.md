# Nexa — Frontend Client

The web client for Nexa, built with React 19, Vite 8, Tailwind CSS v4, and Socket.IO Client.

Designed to be hosted as a **Free Static Site on Render**.

---

## Tech Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`)
- **Routing:** React Router DOM v7 (`react-router-dom`)
- **Real-Time Layer:** Socket.IO Client v4 (`socket.io-client`)
- **Markdown & Code:** `react-markdown`, `remark-gfm`, Lucide icons, Framer Motion

---

## Scripts

```bash
# Install dependencies
npm install

# Start Vite development server (http://localhost:5173)
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle (outputs to client/dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## Development vs Production Configuration

### Development
In local development, leaving `VITE_API_URL` and `VITE_SOCKET_URL` unset routes traffic through the Vite proxy (`vite.config.js`):
- `/api` requests → `http://localhost:3000`
- `/socket.io` WebSocket connections → `http://localhost:3000`

### Production on Render Static Site
In production on Render:
- Configure environment variables in the Render Static Site Dashboard:
  - `VITE_API_URL=https://<your-backend-service>.onrender.com`
  - `VITE_SOCKET_URL=https://<your-backend-service>.onrender.com`
- Configure a Rewrite rule under **Redirects / Rewrites**:
  - **Source**: `/*`
  - **Destination**: `/index.html`
  - **Type**: `Rewrite`

---

## Application Route Structure

- **`/`**: Public Landing page with product overview and authentication links.
- **`/login`**: User login form (issues cross-origin `HttpOnly; Secure; SameSite=None` JWT cookie).
- **`/register`**: User account registration form.
- **`/chat`**: Authenticated chat workspace (protected by `AuthGuard`).
- **`/chat/:chatId`**: Authenticated view for a specific chat conversation.
- **`*`**: Catch-all redirect to `/`.
