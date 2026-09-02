# Architecture Decision Records (ADRs)

This document records the major architectural decisions implemented in the backend service.

---

## ADR 1: Real-Time WebSocket Communication via Socket.IO

- **Status**: Implemented
- **Context**: The application requires low-latency, bidirectional real-time messaging between clients and the AI assistant, including real-time authentication and server pushes.
- **Decision**: Use `Socket.IO` over pure HTTP REST for message exchange, with HTTP-only cookie JWT verification during the connection handshake.
- **Trade-offs**: Requires stateful connection management on the server, but provides instant real-time message delivery and streaming readiness.

---

## ADR 2: MongoDB for Durable State & Pinecone for Semantic Vectors

- **Status**: Implemented
- **Context**: The system must store structured chat sessions and message logs durably, while enabling semantic long-term memory similarity retrieval across historic conversations.
- **Decision**: Use a dual-storage architecture:
  - **MongoDB** stores users, chats, chronological message logs, and request lifecycle state.
  - **Pinecone** indexes 768-dimensional Gemini embeddings (`gemini-embedding-001`) with metadata filtering (`user`, `status`).
- **Trade-offs**: Requires managing data consistency across two databases, but combines exact document queries with fast vector similarity search.

---

## ADR 3: `requestId` Idempotency Key & Compound Unique Index

- **Status**: Implemented
- **Context**: Mobile dropouts, UI double clicks, and socket reconnects cause duplicate request submissions.
- **Decision**: Require clients to pass a unique `requestId` with every AI message payload. Enforce uniqueness using a MongoDB compound partial index on `{ chat: 1, requestId: 1 }`.
- **Trade-offs**: Requires clients to generate and manage request IDs, but prevents duplicate user messages and redundant AI generation calls.

---

## ADR 4: Stale Request Compare-and-Set Recovery

- **Status**: Implemented
- **Context**: If a server crashes or disconnects while a request is `pending`, the record remains pending indefinitely.
- **Decision**: Implement compare-and-set stale recovery matching `_id`, `requestStatus: 'pending'`, and `requestStartedAt`. Reclaim stale requests by updating `requestStartedAt` to `now` and setting `reuseExistingMessage = true`.
- **Trade-offs**: Relies on time-based timeout heuristics (`PENDING_REQUEST_TIMEOUT_MS`), but guarantees safe single-worker recovery without duplicate message creation.

---

## ADR 5: Non-Blocking Background Long-Term Memory Processing

- **Status**: Implemented
- **Context**: Extracting memories, generating embeddings, judging relationships, and upserting vectors to Pinecone takes significant time (1–3 seconds).
- **Decision**: Run `processMemories(...)` in the background asynchronously using `.then()/.catch()` **after** the AI response is emitted to the client socket.
- **Trade-offs**: Memory processing errors cannot update the already-sent user response, but critical response latency is reduced by up to 70%.

---

## ADR 6: Parallel Pipeline Execution (`Promise.all`)

- **Status**: Implemented
- **Context**: The critical response path involves multiple independent I/O operations.
- **Decision**: Execute independent I/O operations concurrently using `Promise.all`:
  - Step 1: Save user message + Generate query embedding.
  - Step 2: Retrieve candidate memories from Pinecone + Retrieve recent chat history from MongoDB.
- **Trade-offs**: Increases concurrent connection load on database pools slightly, but significantly improves end-to-end response speed.
