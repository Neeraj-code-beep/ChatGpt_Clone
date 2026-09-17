import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Composer({ onSendMessage, isProcessing = false, disabled = false }) {
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea based on scrollHeight
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Max height ~ 200px
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!content.trim() || isProcessing || disabled) return;

    onSendMessage(content.trim());
    setContent('');

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = content.trim().length > 0 && !isProcessing && !disabled;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-2 rounded-2xl border border-[#27272A] bg-[#18181B] shadow-xl focus-within:border-[#3F3F46] focus-within:ring-1 focus-within:ring-[#3F3F46] transition-all"
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Helper anything... (Shift+Enter for newline)"
          rows={1}
          disabled={disabled}
          className="flex-1 max-h-48 resize-none bg-transparent px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none leading-relaxed font-sans"
        />

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.94 } : {}}
          className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-all ${
            canSubmit
              ? 'bg-[#FAFAFA] text-[#121214] hover:bg-[#E4E4E7] shadow-sm cursor-pointer'
              : 'bg-[#27272A] text-[#71717A] cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#A1A1AA]" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </motion.button>
      </form>

      <div className="flex items-center justify-between text-[11px] text-[#71717A] px-3 mt-1.5 font-mono">
        <span>Helper v1.0 • Conversational Memory</span>
        <span className="hidden sm:inline">Press Enter ↵ to send</span>
      </div>
    </div>
  );
}
