# Performance Strategy & Critical Path Optimizations

This document details the performance optimizations designed into the critical response path.

## Critical Response Path Execution Model

The system structures the critical response path into parallelized I/O stages to minimize end-to-end latency before emitting responses to the client.

```mermaid
flowchart TD
    subgraph Stage 1: Parallel User Message & Embedding
        MDB_Create[Save User Message to MongoDB]
        GEM_Embed[Generate Query Embedding via Gemini]
    end

    subgraph Stage 2: Parallel Memory & History Retrieval
        PC_Query[Query Candidate Memories from Pinecone]
        MDB_Hist[Query Recent Chat History from MongoDB]
    end

    subgraph Stage 3 & 4: Context Building & Response Generation
        CTX[Build Context Prompt]
        GEM_Gen[Generate Response via Gemini]
    end

    subgraph Stage 5: Response Emission
        Save_Resp[Save AI Response & Emit Socket Event]
    end

    subgraph Stage 6: Background Long-Term Memory
        MEM_Proc[Extract & Index Memories asynchronously]
    end

    Stage 1 --> Stage 2
    Stage 2 --> Stage 3 & 4
    Stage 3 & 4 --> Stage 5
    Stage 5 -. "Non-blocking" .-> Stage 6
```

---

## Architectural Performance Decisions

### 1. Concurrent Message Creation & Vector Embedding
- **Implementation**:
  ```javascript
  [message, queryVector] = await Promise.all([
    messageModel.create(...),
    aiService.generateVector(content),
  ]);
  ```
- **Rationale**: Saving the user message record to MongoDB and requesting the query embedding from Gemini (`gemini-embedding-001`) are independent I/O operations. Executing them concurrently via `Promise.all` eliminates sequential blocking delay on the critical path.

### 2. Pre-Computed `queryVector` Reuse in Retrieval
- **Implementation**:
  ```javascript
  // socket.server.js passes pre-computed queryVector to retrieveMemories()
  retrieveMemories({ query: content, queryVector, userId: socket.user._id, limit: 5 })

  // retrieval.service.js reuses vector directly
  const vector = Array.isArray(queryVector) && queryVector.length === 768
    ? queryVector
    : await aiService.generateVector(query);
  ```
- **Rationale**: Reusing `queryVector` prevents `retrieval.service.js` from making a second redundant embedding API call to Gemini. Eliminating the duplicate remote network call reduces latency and API billable usage.

### 3. Concurrent Vector Search & Chat History Retrieval
- **Implementation**:
  ```javascript
  const [memories, chatHistory] = await Promise.all([
    retrieveMemories({ query: content, queryVector, userId, limit: 5 }),
    messageModel.find({ chat }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  ```
- **Rationale**: Pinecone vector querying (`findSimilarMemories`) and MongoDB chat history retrieval (`messageModel.find`) are independent queries. Running them concurrently avoids serializing vector search behind MongoDB read latency.

### 4. Configured Context Window Limits

| Target | Parameter Name | Configured Value | Source Location | Rationale |
|---|---|---|---|---|
| **Chat History Messages** | `MAX_HISTORY_MESSAGES` | `20` messages | `context.service.js` | Prevents token expansion and maintains fast LLM prompt evaluation. |
| **Chat History Chars** | `MAX_HISTORY_CHARS` | `12,000` chars | `context.service.js` | Enforces upper bound on history text size. |
| **Memories** | `MAX_MEMORY_COUNT` | `5` memories | `context.service.js` | Restricts long-term context to highest-scoring candidates. |
| **Memory Chars** | `MAX_MEMORY_CHARS` | `4,000` chars | `context.service.js` | Enforces upper bound on injected long-term memory text. |

### 5. Non-Blocking Background Memory Extraction
- **Implementation**: `processMemories(...)` is invoked with `.then()/.catch()` **after** `socket.emit('ai-response')`.
- **Rationale**: Long-term memory processing requires multiple LLM operations (`extractMemories`, `judgeMemory`) and Pinecone upserts. Executing this work asynchronously after client emission keeps user-perceived response times fast and independent of memory processing time.
