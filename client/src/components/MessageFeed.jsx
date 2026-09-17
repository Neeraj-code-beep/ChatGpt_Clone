import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Sparkles, User, AlertCircle, Loader2 } from 'lucide-react';
import CodeBlock from './CodeBlock';

export default function MessageFeed({
  messages = [],
  isProcessing = false,
  onStarterPromptClick,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-4 text-[#D4D4D8] shadow-sm"
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="text-lg sm:text-xl font-semibold text-[#FAFAFA] tracking-tight"
        >
          How can Helper assist you today?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="text-xs sm:text-sm text-[#A1A1AA] mt-1.5 max-w-md leading-relaxed"
        >
          Equipped with long-term memory retrieval and real-time reasoning.
          Ask technical questions, explore concepts, or brainstorm systems.
        </motion.p>

        {/* Starter Prompts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full text-left"
        >
          {[
            {
              title: 'Explain system architecture',
              prompt: 'Explain the benefits of combining vector search with relational databases.',
            },
            {
              title: 'Code review & refactoring',
              prompt: 'Review this code snippet for performance bottlenecks and idempotency.',
            },
            {
              title: 'Recall saved context',
              prompt: 'What technologies or project decisions have we previously discussed?',
            },
            {
              title: 'Design API endpoints',
              prompt: 'Draft a REST API contract for a multi-tenant messaging workspace.',
            },
          ].map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onStarterPromptClick?.(item.prompt)}
              className="p-3.5 rounded-xl border border-[#27272A] bg-[#18181B]/60 hover:bg-[#18181B] hover:border-[#3F3F46] text-left transition-all group"
            >
              <div className="text-xs font-medium text-[#FAFAFA] group-hover:text-white">
                {item.title}
              </div>
              <div className="text-[11px] text-[#71717A] group-hover:text-[#A1A1AA] mt-1 line-clamp-1">
                {item.prompt}
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isPending = message.requestStatus === 'pending' || message.requestStatus === 'processing';
        const isFailed = message.requestStatus === 'failed';

        return (
          <motion.div
            key={message.id || index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex items-start gap-3 sm:gap-4 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs mt-0.5 border ${
                isUser
                  ? 'bg-[#27272A] border-[#3F3F46] text-[#E4E4E7]'
                  : 'bg-[#18181B] border-[#27272A] text-[#FAFAFA]'
              }`}
            >
              {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-[#D4D4D8]" />}
            </div>

            {/* Message Body */}
            <div
              className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 px-0.5">
                <span className="text-[11px] font-medium text-[#71717A]">
                  {isUser ? 'You' : 'Helper'}
                </span>
                {isPending && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#A1A1AA]">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Processing</span>
                  </span>
                )}
                {isFailed && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#F97316]">
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Failed</span>
                  </span>
                )}
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#27272A] text-[#FAFAFA] border border-[#3F3F46]/50 rounded-tr-sm'
                    : 'bg-[#18181B] text-[#D4D4D8] border border-[#27272A] rounded-tl-sm w-full'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-[#D4D4D8] leading-relaxed break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children).replace(/\n$/, '');

                          if (!inline && (match || codeString.includes('\n'))) {
                            return (
                              <CodeBlock
                                language={match ? match[1] : ''}
                                value={codeString}
                              />
                            );
                          }

                          return (
                            <code
                              className="font-mono text-[12px] bg-[#27272A] text-[#FAFAFA] px-1.5 py-0.5 rounded border border-[#3F3F46]"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        p({ children }) {
                          return <p className="mb-2.5 last:mb-0">{children}</p>;
                        },
                        ul({ children }) {
                          return <ul className="list-disc pl-4 mb-2.5 space-y-1">{children}</ul>;
                        },
                        ol({ children }) {
                          return <ol className="list-decimal pl-4 mb-2.5 space-y-1">{children}</ol>;
                        },
                        li({ children }) {
                          return <li className="text-xs sm:text-sm text-[#D4D4D8]">{children}</li>;
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {message.errorMessage && (
                <div className="mt-1 text-[11px] text-[#F97316] flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{message.errorMessage}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Processing shimmer indicator when model is thinking and no turn is rendered yet */}
      {isProcessing &&
        messages[messages.length - 1]?.role === 'user' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 sm:gap-4"
          >
            <div className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-xs mt-0.5 text-[#FAFAFA]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4D4D8] animate-pulse" />
            </div>
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl rounded-tl-sm p-3.5 text-xs text-[#A1A1AA] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4D4D8]" />
              <span className="font-mono text-[11px]">Reasoning & retrieving memory...</span>
            </div>
          </motion.div>
        )}

      <div ref={bottomRef} />
    </div>
  );
}
