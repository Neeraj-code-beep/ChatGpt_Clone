import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import MessageFeed from '../components/MessageFeed';
import Composer from '../components/Composer';
import { useChatSocket } from '../hooks/useChatSocket';
import { createChat, getChats, getChatMessages } from '../api/chat.api';
import { useToast } from '../context/ToastContext';

export default function ChatPage() {
  const { chatId: paramChatId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [chats, setChats] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState('auto');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // 1. Fetch user's active chats list from backend on mount
  useEffect(() => {
    let isMounted = true;

    async function loadChats() {
      try {
        const response = await getChats();
        if (isMounted && Array.isArray(response?.chats)) {
          setChats(response.chats);
        }
      } catch (err) {
        console.error('Failed to load chats from server:', err);
      }
    }

    loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeChatId = paramChatId || (chats.length > 0 ? chats[0]._id : null);
  const currentChat = chats.find((c) => c._id === activeChatId);

  // 2. Socket communication hook for the active chat
  const { messages, connectionStatus, isProcessing, sendMessage, setMessages } =
    useChatSocket(activeChatId);

  // 3. Load historical message turns when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    async function loadHistory() {
      try {
        const response = await getChatMessages(activeChatId);
        if (isMounted && Array.isArray(response?.messages)) {
          setMessages(response.messages);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [activeChatId, setMessages]);

  // Create a new chat session
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

  // Message submission coordinator
  const handleSendMessage = async (content) => {
    if (!activeChatId) {
      const generatedTitle =
        content.slice(0, 30).trim() + (content.length > 30 ? '...' : '');
      const created = await handleCreateNewChat(generatedTitle || 'New Conversation');
      if (!created) return;
      return;
    }

    await sendMessage(content, selectedMode);
  };

  return (
    <div className="h-screen w-screen flex bg-[#121214] text-[#E4E4E7] overflow-hidden">
      {/* Collapsible / Responsive Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={() => handleCreateNewChat()}
        isCreatingChat={isCreatingChat}
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
