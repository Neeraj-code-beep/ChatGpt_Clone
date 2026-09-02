# Error Handling Architecture

This document describes how errors are captured, managed, formatted, and recorded across the request lifecycle.

## Error Categories & Responses

All WebSocket errors are emitted back to the invoking client via the `ai-response` event.

| Failure Stage | Error Trigger | Client Response Payload | Request Lifecycle State |
|---|---|---|---|
| **Validation** | Invalid payload type, missing fields, non-string input | `{ error: 'Invalid message payload.' }` | None (Rejected before DB creation) |
| **Validation** | Missing `requestId` | `{ error: 'requestId is required.' }` | None |
| **Validation** | `requestId.length > 100` | `{ error: 'requestId is too long.' }` | None |
| **Validation** | `content.length > 10,000` | `{ error: 'Message cannot exceed 10000 characters.' }` | None |
| **Validation** | Invalid MongoDB ObjectId for `chat` | `{ error: 'Invalid chat ID.' }` | None |
| **Authorization** | Chat not found or owned by another user | `{ error: 'Chat not found or access denied.' }` | None |
| **Concurrency (E11000)** | Duplicate key error on `(chat, requestId)` | Resolves cleanly to cached response or `{ status: 'processing' }` | Inherits state of existing record |
| **Critical Execution** | Gemini API failure, network error, DB disconnect | `{ error: err.message \|\| 'Something went wrong.', requestId }` | Marked `requestStatus: 'failed'` |

---

## Failure State Recording

When an unhandled error occurs in the `socket.on('ai-message')` `try...catch (err)` block, the system ensures the request is explicitly transitioned to a known state:

```javascript
} catch (err) {
  console.error('Socket Error:', err);

  if (currentRequestId) {
    try {
      await messageModel.updateOne(
        {
          chat: messagePayload?.chat,
          user: socket.user._id,
          requestId: currentRequestId,
          role: 'user',
        },
        {
          $set: {
            requestStatus: 'failed',
          },
        },
      );
    } catch (statusError) {
      // Secondary failure logging without obscuring original error
      console.error('Failed to update request status:', statusError);
    }
  }

  socket.emit('ai-response', {
    error: err.message || 'Something went wrong.',
    requestId: currentRequestId,
  });
}
```

### Purpose of `failed` Status
Marking a request `requestStatus: 'failed'` allows subsequent client retries with the same `requestId` to safely reclaim the request (via `failed → pending` atomic transition) and reuse the existing user message.

---

## Non-Blocking Background Error Isolation

Long-term memory extraction (`processMemories`) runs asynchronously **after** emitting the AI response to the client:

```javascript
processMemories({
  userMessage: content,
  aiResponse: response,
  userId: socket.user._id,
  chatId: chat,
})
  .then((result) => {
    console.log('Background memory processing:', result);
  })
  .catch((error) => {
    console.error('Background memory processing error:', error);
  });
```

- Failures during memory extraction, embedding, or Pinecone indexing are logged to server output.
- Background memory errors **never** alter the user's completed chat response or modify the `requestStatus` of a completed message.
