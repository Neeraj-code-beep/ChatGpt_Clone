import { apiClient } from './client';

/**
 * Chat API Service
 * Interacts with backend chat session and history endpoints.
 */

export async function createChat({ title = 'New Conversation' } = {}) {
  return apiClient('/api/chat', {
    method: 'POST',
    body: {
      title: title.trim(),
    },
  });
}

export async function getChats() {
  return apiClient('/api/chat', {
    method: 'GET',
  });
}

export async function getChatMessages(chatId) {
  return apiClient(`/api/chat/${chatId}/messages`, {
    method: 'GET',
  });
}

export async function updateChatTitle(chatId, title) {
  return apiClient(`/api/chat/${chatId}`, {
    method: 'PATCH',
    body: {
      title: title.trim(),
    },
  });
}

export async function deleteChat(chatId) {
  return apiClient(`/api/chat/${chatId}`, {
    method: 'DELETE',
  });
}
