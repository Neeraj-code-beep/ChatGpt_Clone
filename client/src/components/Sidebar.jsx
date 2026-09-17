import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  MessageSquare,
  Sparkles,
  LogOut,
  User,
  X,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({
  isOpen = false,
  onClose,
  chats = [],
  activeChatId = null,
  onNewChat,
  isCreatingChat = false,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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

        {chats.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[#71717A] leading-relaxed">
            No active conversations. Start a new chat to begin.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat._id === activeChatId;

            return (
              <Link
                key={chat._id}
                to={`/chat/${chat._id}`}
                onClick={onClose}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                  isActive
                    ? 'bg-[#27272A] text-[#FAFAFA] font-medium border border-[#3F3F46]/50'
                    : 'text-[#A1A1AA] hover:bg-[#1C1C20] hover:text-[#FAFAFA]'
                }`}
              >
                <MessageSquare
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-[#FAFAFA]' : 'text-[#71717A] group-hover:text-[#A1A1AA]'
                  }`}
                />
                <span className="truncate flex-1">{chat.title || 'Conversation'}</span>
              </Link>
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
