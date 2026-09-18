import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '../services/socket';
import { useToast } from '../context/ToastContext';

/**
 * useChatSocket hook.
 * Encapsulates Socket.IO connection lifecycle, real-time message exchange,
 * and client-side requestId idempotency tracking.
 */
export function useChatSocket(chatId) {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(() =>
    getSocket().connected ? 'connected' : 'disconnected'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const activeRequestIdRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!chatId) return;

    const socket = connectSocket();

    const handleConnect = () => {
      setConnectionStatus('connected');
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
    };

    const handleConnectError = (error) => {
      setConnectionStatus('disconnected');
      console.error('Socket connection error:', error.message);
      if (error.message?.includes('Authentication error')) {
        addToast({
          type: 'error',
          title: 'Session Expired',
          message: 'Please log in again to continue messaging.',
        });
      }
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    // Main AI response handler
    const handleAiResponse = (payload) => {
      if (!payload) return;

      const {
        content,
        chat: responseChatId,
        messageId,
        requestId,
        status,
        error,
      } = payload;

      // Ensure response matches current active chat
      if (responseChatId && responseChatId !== chatId) {
        return;
      }

      // 1. Error state
      if (error) {
        setIsProcessing(false);
        activeRequestIdRef.current = null;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.requestId === requestId
              ? { ...msg, requestStatus: 'failed', errorMessage: error }
              : msg
          )
        );

        addToast({
          type: 'error',
          title: 'Message Delivery Failed',
          message: error,
        });
        return;
      }

      // 2. In-flight processing status
      if (status === 'processing') {
        setIsProcessing(true);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.requestId === requestId
              ? { ...msg, requestStatus: 'processing' }
              : msg
          )
        );
        return;
      }

      // 3. Successful completion (standard or duplicate replay)
      if (content !== undefined) {
        setIsProcessing(false);
        activeRequestIdRef.current = null;

        setMessages((prev) => {
          // Mark the user message as completed
          const updated = prev.map((msg) =>
            msg.requestId === requestId
              ? { ...msg, requestStatus: 'completed' }
              : msg
          );

          // Check if the model response is already present
          const alreadyHasModelMsg = updated.some(
            (msg) => msg.id === messageId || (msg.requestId === requestId && msg.role === 'model')
          );

          if (alreadyHasModelMsg) {
            return updated;
          }

          // Append new model message
          const modelMessage = {
            id: messageId || `model-${Date.now()}`,
            role: 'model',
            content,
            requestId,
            createdAt: new Date().toISOString(),
          };

          return [...updated, modelMessage];
        });
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('ai-response', handleAiResponse);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('ai-response', handleAiResponse);
    };
  }, [chatId, addToast]);

  /**
   * Send a user message to the active chat session.
   * Generates a unique requestId to enforce backend idempotency.
   */
  const sendMessage = useCallback(
    async (content, explicitChatId = null) => {
      const destinationChatId = explicitChatId || chatId;
      if (!content || !content.trim() || !destinationChatId) return false;

      const trimmedContent = content.trim();
      const requestId = crypto.randomUUID();
      activeRequestIdRef.current = requestId;

      // 1. Optimistic User Message
      const userMessage = {
        id: `user-${requestId}`,
        role: 'user',
        content: trimmedContent,
        requestId,
        requestStatus: 'pending',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      // 2. Emit to backend via Socket.IO
      const socket = getSocket();

      if (!socket.connected) {
        socket.connect();
      }

      // Backend expects: { chat, content, requestId }
      socket.emit('ai-message', {
        chat: destinationChatId,
        content: trimmedContent,
        requestId,
      });

      return true;
    },
    [chatId]
  );

  return {
    messages,
    connectionStatus,
    isProcessing,
    sendMessage,
    setMessages,
  };
}
