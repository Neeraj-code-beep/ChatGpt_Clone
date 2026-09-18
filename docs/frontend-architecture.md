# Frontend Architecture & Full-Stack Integration Specification

This document details the frontend architecture, client subsystems, and full-stack integration contracts for the **Helper AI Conversational Workspace**.

---

## 1. Overview & Design Philosophy

The client application is built with **React 19**, **Vite 8**, **React Router 7**, and **Tailwind CSS v4**.

### Visual & Architectural Principles
- **Color Direction:** Built entirely on a sophisticated warm neutral palette (charcoal surfaces `#141417`, deep background `#121214`, fine borders `#27272A`, off-white typography `#FAFAFA`). No generic blue/purple SaaS gradients or neon glows.
- **Typography:** Clear hierarchy with **Inter** for UI prose and **JetBrains Mono** for code blocks, status indicators, and metadata.
- **Motion:** Subtle, intentional transitions powered by **Framer Motion**, respecting `prefers-reduced-motion`.
- **Security:** Zero localStorage token storage. Full authentication relies on HTTP-only JWT cookies transmitted automatically with `credentials: 'include'` on REST calls and WebSocket `withCredentials: true`.

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
| `/login` | Public | `LoginPage` | Email/password login with visibility toggle, session cookie issuance, and redirection. |
| `/register` | Public | `RegisterPage` | First/last name, email, and password registration form. |
| `/chat` | Protected | `ChatPage` | Authenticated chat workspace shell (sidebar, header, message feed, composer). |
| `/chat/:chatId` | Protected | `ChatPage` | Specific chat session with real-time Socket.IO communication and history restoration. |

---

## 3. Full-Stack Subsystems & Lifecycle Flows

### A. HTTP API Client (`src/api/client.js`)
Fetch abstraction configured with:
- Automatic `credentials: 'include'` across all requests.
- Automatic content-type JSON serialization.
- Normalized HTTP error bubbling with server status codes and human-readable messages.
- Production-ready environment fallback (`VITE_API_URL || ''` for proxy in dev and same-origin in production).

### B. Authentication & Session Lifecycle (`src/context/AuthContext.jsx`)
- **Registration (`POST /api/auth/register`):** Sends `{ fullName: { firstName, lastName }, email, password }`, receives safe user model, sets HTTP-only cookie, and navigates to `/chat`.
- **Login (`POST /api/auth/login`):** Validates credentials, sets HTTP-only cookie, hydrates AuthContext.
- **Hydration on Refresh (`GET /api/auth/me`):** On initial mount or browser refresh, verifies the cookie with the backend. If valid, populates the safe user profile; if invalid (401), clears local state.
- **Logout (`POST /api/auth/logout`):** Invalidates server session cookie, invokes `disconnectSocket()` to tear down WebSocket connection and remove event listeners, clears session storage display cache, and redirects to `/login`.
- **Display Cache:** `sessionStorage` is used strictly as a non-authoritative fast display cache during the initial render tick to prevent layout shifts while `getMe()` authoritative verification completes.

### C. Chat Session Management (`src/pages/ChatPage.jsx`, `src/components/Sidebar.jsx`, `src/api/chat.api.js`)
- **Chat Listing (`GET /api/chat`):**
  - Serves as the single source of truth for the sidebar.
  - Skeletons displayed during loading (`isLoadingChats`).
  - Error state with manual retry button (`chatListError`, `refreshChats`).
  - Strict user-isolation enforced by backend.
- **Chat Creation (`POST /api/chat`):**
  - Triggered by "New conversation" button or by sending a first message from `/chat`.
  - Automatically updates sidebar state and navigates to `/chat/:chatId`.
  - First message submission from empty state automatically generates a concise conversation title, creates the chat on the server, and immediately dispatches the message to the created chat ID without dropped turns.
- **Chat Renaming (`PATCH /api/chat/:id`):**
  - Inline edit trigger in sidebar with real-time validation (trimmed, non-empty, max 100 characters).
  - Keyboard accessible: `Enter` to commit, `Escape` to cancel.
  - Updates sidebar and active chat header reactively upon server confirmation.
- **Chat Deletion (`DELETE /api/chat/:id`):**
  - Inline confirmation step ("Delete chat?" with Confirm/Cancel) to prevent accidental deletions.
  - Deletes chat session and cascades turn deletion in MongoDB.
  - If the active chat is deleted, clears the message feed and smoothly navigates back to `/chat`.

### D. Chat History & Race Condition Protection (`src/pages/ChatPage.jsx`, `src/components/MessageFeed.jsx`)
- **History Loading (`GET /api/chat/:id/messages`):**
  - When opening `/chat/:chatId`, message feed displays loading skeleton turns.
  - Distinguishes `user` and `model` message roles with Markdown and code syntax highlighting.
- **Race Condition Prevention:**
  - Employs `loadingChatIdRef` tracking to guard against async race conditions when users switch rapidly between Chat A and Chat B.
  - Stale responses from earlier requests are discarded before they can overwrite the active conversation feed.
- **404 Handling:**
  - If a chat was deleted in another session, `getChatMessages` returns 404, which surfaces a notification, removes the dead entry from sidebar, and navigates to `/chat`.

### E. Socket.IO Real-Time Messaging & Idempotency (`src/services/socket.js`, `src/hooks/useChatSocket.js`)
- **Singleton Manager:** Single Socket.IO instance configured with `withCredentials: true`, `reconnection: true`, and exponential backoff.
- **Connection Badge:** Reflects live states (`connected`, `reconnecting`, `connecting`, `disconnected`).
- **Turn Emission (`ai-message`):**
  ```json
  {
    "chat": "65f9876543210fedcba54321",
    "content": "Message content...",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Response Handling (`ai-response`):**
  - **Standard Completion:** Transitions optimistic user message `pending` → `completed` and appends the model message turn.
  - **Duplicate Replay (`duplicate: true`):** Resolves pending state without creating duplicate UI bubbles.
  - **In-flight Processing (`status: "processing"`):** Updates message status to `processing` without duplicate turns.
  - **Error Response:** Sets request status to `failed` and triggers user-facing toast alerts.
  - **Message Persistence:** Turns are stored in MongoDB turns collection and retrieved on reload via REST history.

### F. Mode Selector (`src/components/ModeSelector.jsx`)
- UI modes: `Auto`, `Fast`, `Deep`, `Creative`.
- Maintained as client-side UI selection state.
- **Contract Note:** Mode is intentionally omitted from the `ai-message` payload to maintain backend contract compatibility until multi-mode routing is enabled on the server.

---

## 4. Verification & Testing

### Verification Suite
- **Backend API Integration Tests:** `npm test` in `server/` (14/14 automated tests passing: register, login, me, logout, IDOR checks, chat CRUD, turn history).
- **Client Linter:** `npm run lint` in `client/` (ESLint: 0 errors, 0 warnings).
- **Client Production Build:** `npm run build` in `client/` (Vite production bundle compiled cleanly).

---

## 5. Future Extension Points
1. **Model Parameter Routing:** Passing selected mode (`auto`, `fast`, `deep`, `creative`) to socket handlers once backend routing is enabled.
2. **Server-Push Token Streaming:** Upgrading `ai-message` turns to incremental SSE/Socket token streaming.

