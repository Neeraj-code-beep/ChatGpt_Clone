# ChatGPT Clone — Frontend Client

The web client for the ChatGPT Clone application, built with React 19, Vite 8, Tailwind CSS v4, and Socket.IO Client.

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
In local development, the Vite dev server (`vite.config.js`) proxies:
- `/api` requests → `http://localhost:3000`
- `/socket.io` WebSocket connections → `http://localhost:3000`

### Production
In production, the application is deployed behind a **Single-Origin Reverse Proxy** (e.g. Nginx, Caddy).
- Static assets in `client/dist/` are served by the web server.
- The web server proxies `/api/*` and `/socket.io/*` internally to the backend Node.js process.
- No environment variables are required in production when using the single-origin setup (`VITE_API_URL` and `VITE_SOCKET_URL` default to empty strings, using relative paths).

### Optional Environment Variables (`client/.env`)

If deploying frontend and backend to separate domains:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `''` (relative) | Base URL for REST API requests (e.g., `https://api.yourdomain.com`). |
| `VITE_SOCKET_URL` | `''` (relative) | Base URL for Socket.IO WebSocket server (e.g., `https://api.yourdomain.com`). |

---

## Application Route Structure

- **`/`**: Public Landing page with product overview and authentication links.
- **`/login`**: User login form (issues HTTP-only JWT cookie).
- **`/register`**: User account registration form.
- **`/chat`**: Authenticated chat workspace (protected by `AuthGuard`).
- **`/chat/:chatId`**: Authenticated view for a specific chat conversation.
- **`*`**: Catch-all redirect to `/`.

> [!NOTE]
> When serving `client/dist/` with a static web server (Nginx, Caddy, etc.), configure single-page application fallback (`try_files $uri $uri/ /index.html;`) so direct navigations to `/chat` or `/login` resolve correctly.
