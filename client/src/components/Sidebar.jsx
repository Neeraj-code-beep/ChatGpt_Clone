import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  MessageSquare,
  Sparkles,
  LogOut,
  User,
  X,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({
  isOpen = false,
  onClose,
  chats = [],
  activeChatId = null,
  onNewChat,
  isCreatingChat = false,
  isLoadingChats = false,
  chatListError = null,
  onRetryLoadChats,
  onRenameChat,
  onDeleteChat,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Rename state
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete state
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const startRename = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingDeleteId(null);
    setEditingChatId(chat._id);
    setEditTitle(chat.title || '');
  };

  const cancelRename = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleSaveRename = async (e, chatId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed.length > 100) return;

    setIsRenaming(true);
    try {
      if (onRenameChat) {
        await onRenameChat(chatId, trimmed);
      }
      setEditingChatId(null);
      setEditTitle('');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(e, chatId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename(e);
    }
  };

  const startDelete = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(null);
    setConfirmingDeleteId(chatId);
  };

  const cancelDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmingDeleteId(null);
  };

  const handleConfirmDelete = async (e, chatId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsDeleting(true);
    try {
      if (onDeleteChat) {
        await onDeleteChat(chatId);
      }
      setConfirmingDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-[#141417] text-[#E4E4E7] border-r border-[#27272A] w-64 sm:w-72 select-none">
      {/* Top Section: Header & New Chat */}
      <div className="p-3.5 space-y-3">
        {/* Brand & Mobile Close */}
        <div className="flex items-center justify-between px-1">
          <Link
            to="/"
            className="flex items-center gap-2 text-[#FAFAFA] font-medium tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-6 h-6 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-xs text-[#FAFAFA]">
              <Sparkles className="w-3 h-3 text-[#D4D4D8]" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Helper</span>
          </Link>

          {/* Close button for mobile */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1 rounded-md text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreatingChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#FAFAFA] text-[#121214] hover:bg-[#E4E4E7] text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isCreatingChat ? 'Creating...' : 'New conversation'}</span>
        </button>
      </div>

      {/* Middle Section: Chat History */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        <div className="px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider text-[#71717A]">
          Recent Conversations
        </div>

        {/* Loading Skeletons */}
        {isLoadingChats ? (
          <div className="space-y-2 px-2 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-8 rounded-xl bg-[#1C1C20] animate-pulse"
                style={{ opacity: 1 - i * 0.18 }}
              />
            ))}
          </div>
        ) : chatListError ? (
          /* Error State */
          <div className="px-3 py-4 text-center text-xs text-[#A1A1AA] bg-[#18181B] rounded-xl border border-[#27272A] m-2 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[#F97316]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Failed to load chats</span>
            </div>
            <p className="text-[11px] text-[#71717A]">{chatListError}</p>
            {onRetryLoadChats && (
              <button
                type="button"
                onClick={onRetryLoadChats}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : chats.length === 0 ? (
          /* Empty State */
          <div className="px-3 py-6 text-center text-xs text-[#71717A] leading-relaxed">
            No active conversations. Start a new chat to begin.
          </div>
        ) : (
          /* Chat Items */
          chats.map((chat) => {
            const isActive = chat._id === activeChatId;
            const isEditing = editingChatId === chat._id;
            const isConfirmingDelete = confirmingDeleteId === chat._id;

            if (isEditing) {
              return (
                <div
                  key={chat._id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#1C1C20] border border-[#3F3F46]"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleRenameKeyDown(e, chat._id)}
                    maxLength={100}
                    autoFocus
                    disabled={isRenaming}
                    className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-[#FAFAFA] focus:outline-none placeholder:text-[#71717A]"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSaveRename(e, chat._id)}
                    disabled={isRenaming || !editTitle.trim()}
                    className="p-1 rounded text-[#10B981] hover:bg-[#27272A] disabled:opacity-40"
                    title="Save title (Enter)"
                    aria-label="Save title"
                  >
                    {isRenaming ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    disabled={isRenaming}
                    className="p-1 rounded text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A]"
                    title="Cancel (Esc)"
                    aria-label="Cancel rename"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            if (isConfirmingDelete) {
              return (
                <div
                  key={chat._id}
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1C1414] border border-[#7F1D1D]/50 text-xs"
                >
                  <span className="text-[#FCA5A5] text-[11px] font-medium">Delete chat?</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleConfirmDelete(e, chat._id)}
                      disabled={isDeleting}
                      className="px-2 py-0.5 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-medium transition-colors disabled:opacity-50"
                      aria-label="Confirm delete"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      disabled={isDeleting}
                      className="px-1.5 py-0.5 rounded text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] text-[10px] transition-colors"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={chat._id}
                className={`group relative flex items-center rounded-xl text-xs transition-colors ${
                  isActive
                    ? 'bg-[#27272A] text-[#FAFAFA] font-medium border border-[#3F3F46]/50'
                    : 'text-[#A1A1AA] hover:bg-[#1C1C20] hover:text-[#FAFAFA]'
                }`}
              >
                <Link
                  to={`/chat/${chat._id}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0"
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#FAFAFA]' : 'text-[#71717A] group-hover:text-[#A1A1AA]'
                    }`}
                  />
                  <span className="truncate flex-1">{chat.title || 'Conversation'}</span>
                </Link>

                {/* Inline Action Buttons (Rename & Delete) */}
                <div className="hidden group-hover:flex items-center gap-0.5 pr-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => startRename(e, chat)}
                    className="p-1 rounded text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                    title="Rename chat"
                    aria-label="Rename conversation"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => startDelete(e, chat._id)}
                    className="p-1 rounded text-[#71717A] hover:text-[#EF4444] hover:bg-[#27272A] transition-colors"
                    title="Delete chat"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Section: User Profile & Actions */}
      <div className="p-3 border-t border-[#27272A] bg-[#121214]/60 space-y-2">
        {/* User Card */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs">
          <div className="w-7 h-7 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center font-medium text-[#FAFAFA] text-xs shrink-0">
            {user?.fullName?.firstName ? (
              user.fullName.firstName.charAt(0).toUpperCase()
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[#FAFAFA] truncate">
              {user?.displayName || 'User'}
            </div>
            <div className="text-[11px] text-[#71717A] truncate font-mono">
              {user?.email || 'Authenticated'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden sm:block h-full shrink-0">{content}</aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-y-0 left-0 max-w-[80%] h-full"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
