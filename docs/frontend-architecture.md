# Frontend Architecture & Client Specification

This document details the frontend implementation for the **Helper AI Conversational Workspace**.

---

## 1. Overview & Design Philosophy

The client application is built with **React 19**, **Vite 8**, **React Router 7**, and **Tailwind CSS v4**.

### Visual & Architectural Principles
- **Color Direction:** Built entirely on a sophisticated warm neutral palette (charcoal surfaces `#141417`, deep background `#121214`, fine borders `#27272A`, off-white typography `#FAFAFA`). No generic blue/purple SaaS gradients or neon glows.
- **Typography:** Clear hierarchy with **Inter** for UI prose and **JetBrains Mono** for code blocks, status indicators, and metadata.
- **Motion:** Subtle, intentional transitions powered by **Framer Motion**, respecting `prefers-reduced-motion`.
- **Security:** Zero localStorage token storage. Full authentication relies on HTTP-only JWT cookies transmitted automatically with `credentials: 'include'` and WebSocket `withCredentials: true`.

---

## 2. Information Architecture & Routes

```
/ (LandingPage)
├── /login (LoginPage)
├── /register (RegisterPage)
└── Authenticated Area (Guarded by AuthGuard)
    ├── /chat (ChatPage — active session or fresh conversation)
    └── /chat/:chatId (ChatPage — specific chat session thread)
```

| Route | Access | Component | Description |
|---|---|---|---|
| `/` | Public | `LandingPage` | Minimalist editorial hero, capabilities grid, memory concept preview, and CTA. |
| `/login` | Public | `LoginPage` | Email/password login with visibility toggle and validation. |
| `/register` | Public | `RegisterPage` | First/last name, email, and password registration form. |
| `/chat` | Protected | `ChatPage` | Authenticated chat workspace shell (sidebar, header, message feed, composer). |
| `/chat/:chatId` | Protected | `ChatPage` | Specific chat session with real-time Socket.IO communication. |

---

## 3. Core Subsystems

### A. HTTP API Client (`src/api/client.js`)
Native `fetch` abstraction with:
- Automatic `credentials: 'include'` on all calls.
- Content-type header injection and JSON parsing.
- Normalized error handling with status codes and backend error messages.

### B. Authentication Context (`src/context/AuthContext.jsx`)
- Manages user session state (`user`, `isAuthenticated`, `isLoading`, `error`).
- Normalizes server user models (`fullName.firstName`, `fullName.lastName`, `email`, `_id`).
- Manages `sessionStorage` caching for non-sensitive display fields during page refresh.
- Architecture ready for `GET /api/auth/me` and `POST /api/auth/logout`.

### C. Socket.IO Service & Hook (`src/services/socket.js`, `src/hooks/useChatSocket.js`)
- Singleton Socket.IO connection manager with `withCredentials: true` and reconnection lifecycle.
- State machine tracking connection states (`connected`, `connecting`, `reconnecting`, `disconnected`).
- Emits real-time `ai-message` payload:
  ```json
  {
    "chat": "65f9876543210fedcba54321",
    "content": "Message string...",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- Subscribes to `ai-response` event:
  - **Standard Completion:** Updates message state from `pending` → `completed` and appends model turn.
  - **Duplicate Replay (`duplicate: true`):** Resolves pending state without creating duplicate chat bubbles.
  - **In-flight Processing (`status: "processing"`):** Updates message to processing state without triggering duplicate emissions.
  - **Error Response:** Sets request status to `failed` and triggers user-facing toast notifications.

### D. Mode Selection UI (`src/components/ModeSelector.jsx`)
- Modes supported on UI: `Auto`, `Fast`, `Deep`, `Creative`.
- Frontend maintains the selected mode state and renders visual indicators.
- **Backend Note:** Modes are architected as client extension points and do not alter Gemini parameters until backend multi-mode routing is enabled.

---

## 4. Backend Capabilities Matrix

### Currently Available & Integrated
- `POST /api/auth/register` — User registration.
- `POST /api/auth/login` — User authentication and 7-day HTTP-only JWT cookie issuance.
- `POST /api/chat/` — Chat session creation.
- `GET /health` — Service and database health monitoring.
- Socket.IO `ai-message` & `ai-response` — Real-time turn exchange with `requestId` idempotency.

### Backend Capabilities Still Required (Integration Gaps)
1. **`GET /api/auth/me`**: To verify active session cookie on cold page reload.
2. **`POST /api/auth/logout`**: To invalidate/clear the HTTP-only `token` cookie on the server.
3. **`GET /api/chat`**: To fetch the authenticated user's active conversations list on the sidebar.
4. **`GET /api/chat/:id/messages`**: To fetch historical messages when opening an existing chat thread.
5. **`DELETE /api/chat/:id` & `PATCH /api/chat/:id`**: For chat deletion and renaming.

---

## 5. Local Development & Verification

### Running the Application
```bash
# In workspace root (runs both server and client concurrently)
npm run dev

# Or in client directory
cd client
npm run dev
```

### Build & Verification Commands
```bash
cd client
npm run lint    # ESLint check (0 errors, 0 warnings)
npm run build   # Production Vite bundle compilation
```
