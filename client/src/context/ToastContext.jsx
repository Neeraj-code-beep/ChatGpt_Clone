import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 4500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            const isSuccess = toast.type === 'success';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md ${
                  isError
                    ? 'bg-[#1C1917]/95 border-[#78350F]/50 text-[#FED7AA]'
                    : isSuccess
                    ? 'bg-[#18181B]/95 border-[#27272A] text-[#E4E4E7]'
                    : 'bg-[#18181B]/95 border-[#27272A] text-[#E4E4E7]'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isError ? (
                    <AlertCircle className="w-4 h-4 text-[#F97316]" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Info className="w-4 h-4 text-[#A1A1AA]" />
                  )}
                </div>

                <div className="flex-1 text-sm">
                  {toast.title && (
                    <div className="font-medium text-[#FAFAFA]">{toast.title}</div>
                  )}
                  {toast.message && (
                    <div className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                      {toast.message}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-[#71717A] hover:text-[#FAFAFA] p-0.5 rounded-md hover:bg-white/5 transition-colors"
                  aria-label="Close notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
