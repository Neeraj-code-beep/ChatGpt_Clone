import { apiClient } from './client';

/**
 * Chat API Service
 * Interacts with backend chat session endpoints.
 */

export async function createChat({ title = 'New Conversation' } = {}) {
  return apiClient('/api/chat', {
    method: 'POST',
    body: {
      title: title.trim(),
    },
  });
}

/**
 * Backend Integration Note:
 * The following chat endpoints are currently NOT exposed by the backend:
 * - GET /api/chat (Fetch user's active chats list)
 * - GET /api/chat/:id/messages (Fetch message history for a chat session)
 * - PATCH /api/chat/:id (Rename chat)
 * - DELETE /api/chat/:id (Delete chat)
 * These will be wired here once supported on the backend.
 */
