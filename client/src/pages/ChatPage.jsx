import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageFeed from '../components/MessageFeed';
import Composer from '../components/Composer';
import { useChatSocket } from '../hooks/useChatSocket';
import {
  createChat,
  getChats,
  getChatMessages,
  updateChatTitle,
  deleteChat,
} from '../api/chat.api';
import { useToast } from '../context/ToastContext';

export default function ChatPage() {
  const { chatId: paramChatId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatListError, setChatListError] = useState(null);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('auto');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const activeChatId = paramChatId || null;
  const currentChat = chats.find((c) => c._id === activeChatId);

  // Track active history request to eliminate chat-switch race conditions
  const loadingChatIdRef = useRef(null);

  // 1. Fetch user's active chats list from backend on mount
  const refreshChats = useCallback(async () => {
    setIsLoadingChats(true);
    setChatListError(null);
    try {
      const response = await getChats();
      if (Array.isArray(response?.chats)) {
        setChats(response.chats);
      }
    } catch (err) {
      console.error('Failed to load chats from server:', err);
      setChatListError(err.message || 'Unable to load conversations.');
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialLoadChats() {
      try {
        const response = await getChats();
        if (isMounted && Array.isArray(response?.chats)) {
          setChats(response.chats);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load chats from server:', err);
          setChatListError(err.message || 'Unable to load conversations.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingChats(false);
        }
      }
    }

    initialLoadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Socket communication hook for the active chat
  const { messages, connectionStatus, isProcessing, sendMessage, setMessages } =
    useChatSocket(activeChatId);

  // 3. Load historical message turns when activeChatId changes with race condition protection
  const retryLoadHistory = useCallback(async () => {
    if (!activeChatId) return;

    loadingChatIdRef.current = activeChatId;
    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const response = await getChatMessages(activeChatId);
      if (loadingChatIdRef.current === activeChatId) {
        if (Array.isArray(response?.messages)) {
          setMessages(response.messages);
        }
      }
    } catch (err) {
      if (loadingChatIdRef.current === activeChatId) {
        setHistoryError(err.message || 'Unable to load message history.');
      }
    } finally {
      if (loadingChatIdRef.current === activeChatId) {
        setIsLoadingHistory(false);
      }
    }
  }, [activeChatId, setMessages]);

  useEffect(() => {
    if (!activeChatId) {
      loadingChatIdRef.current = null;
      setMessages([]);
      return;
    }

    loadingChatIdRef.current = activeChatId;
    let isMounted = true;

    async function fetchHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);
      setMessages([]); // Clear previous chat turns immediately to prevent UI flash

      try {
        const response = await getChatMessages(activeChatId);

        if (isMounted && loadingChatIdRef.current === activeChatId) {
          if (Array.isArray(response?.messages)) {
            setMessages(response.messages);
          }
        }
      } catch (err) {
        if (isMounted && loadingChatIdRef.current === activeChatId) {
          console.error('Failed to load chat history:', err);
          if (err.status === 404) {
            addToast({
              type: 'error',
              title: 'Conversation Not Found',
              message: 'This conversation may have been deleted or is no longer accessible.',
            });
            // Remove missing chat from sidebar and return to clean new chat state
            setChats((prev) => prev.filter((c) => c._id !== activeChatId));
            navigate('/chat', { replace: true });
          } else {
            setHistoryError(err.message || 'Unable to load message history.');
          }
        }
      } finally {
        if (isMounted && loadingChatIdRef.current === activeChatId) {
          setIsLoadingHistory(false);
        }
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [activeChatId, setMessages, addToast, navigate]);

  // 4. Create a new chat session
  const handleCreateNewChat = useCallback(
    async (initialTitle = 'New Conversation') => {
      setIsCreatingChat(true);
      try {
        const response = await createChat({ title: initialTitle });
        const newChat = response.chat;

        setChats((prev) => {
          const exists = prev.some((c) => c._id === newChat._id);
          return exists ? prev : [newChat, ...prev];
        });

        navigate(`/chat/${newChat._id}`);
        return newChat;
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Unable to Create Chat',
          message: error.message || 'Server error while starting conversation.',
        });
        return null;
      } finally {
        setIsCreatingChat(false);
      }
    },
    [navigate, addToast]
  );

  // 5. Message submission coordinator (with first-message dispatch for new chats)
  const handleSendMessage = async (content) => {
    if (!content || !content.trim()) return;

    if (!activeChatId) {
      // Starting from empty/new conversation: create chat and dispatch first message
      const generatedTitle =
        content.slice(0, 30).trim() + (content.length > 30 ? '...' : '');
      const created = await handleCreateNewChat(generatedTitle || 'New Conversation');
      if (!created) return;

      // Immediately send message to the newly created chat
      await sendMessage(content, created._id);
      return;
    }

    await sendMessage(content, activeChatId);
  };

  // 6. Rename chat session
  const handleRenameChat = async (chatId, newTitle) => {
    try {
      const response = await updateChatTitle(chatId, newTitle);
      const updatedChat = response.chat;

      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, title: updatedChat.title } : c))
      );

      addToast({
        type: 'success',
        title: 'Conversation Renamed',
        message: `Updated title to "${updatedChat.title}"`,
      });
      return true;
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Rename Failed',
        message: error.message || 'Unable to update conversation title.',
      });
      return false;
    }
  };

  // 7. Delete chat session
  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);

      setChats((prev) => prev.filter((c) => c._id !== chatId));

      // If active chat was deleted, navigate back to empty new chat state
      if (chatId === activeChatId) {
        setMessages([]);
        navigate('/chat', { replace: true });
      }

      addToast({
        type: 'success',
        title: 'Conversation Deleted',
        message: 'The chat session and its turns were cleanly removed.',
      });
      return true;
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: error.message || 'Unable to delete conversation.',
      });
      return false;
    }
  };

  return (
    <div className="h-screen w-screen flex bg-[#121214] text-[#E4E4E7] overflow-hidden">
      {/* Collapsible / Responsive Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={() => navigate('/chat')}
        isCreatingChat={isCreatingChat}
        isLoadingChats={isLoadingChats}
        chatListError={chatListError}
        onRetryLoadChats={refreshChats}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#121214]">
        {/* Header */}
        <ChatHeader
          title={currentChat?.title || 'New Conversation'}
          connectionStatus={connectionStatus}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Message Feed */}
        <MessageFeed
          messages={messages}
          isProcessing={isProcessing}
          isLoadingHistory={isLoadingHistory}
          historyError={historyError}
          onRetryLoadHistory={retryLoadHistory}
          onStarterPromptClick={handleSendMessage}
        />

        {/* Composer */}
        <Composer
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          disabled={connectionStatus === 'disconnected'}
        />
      </div>
    </div>
  );
}
