import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Sparkles, Cpu, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  {
    id: 'auto',
    name: 'Auto',
    description: 'Balanced response with full long-term memory integration',
    icon: Sparkles,
  },
  {
    id: 'fast',
    name: 'Fast',
    description: 'Low-latency concise responses for quick answers',
    icon: Zap,
  },
  {
    id: 'deep',
    name: 'Deep',
    description: 'Thorough analytical breakdown with expanded context',
    icon: Cpu,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Explorative, high-divergence conceptual thinking',
    icon: Layers,
  },
];

export default function ModeSelector({ selectedMode = 'auto', onSelectMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentMode = MODES.find((m) => m.id === selectedMode) || MODES[0];
  const Icon = currentMode.icon;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#27272A] bg-[#18181B] hover:bg-[#27272A]/70 text-[#E4E4E7] text-xs font-medium transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
        <span>{currentMode.name}</span>
        <ChevronDown className="w-3 h-3 text-[#71717A] ml-0.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-1.5 w-64 rounded-xl border border-[#27272A] bg-[#18181B] shadow-2xl p-1.5 z-50 text-xs"
          >
            <div className="px-2.5 py-1.5 text-[10px] uppercase font-mono tracking-wider text-[#71717A] border-b border-[#27272A]/80 mb-1">
              Select Mode
            </div>

            <div className="space-y-0.5">
              {MODES.map((mode) => {
                const ModeIcon = mode.icon;
                const isSelected = mode.id === selectedMode;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onSelectMode(mode.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-[#27272A] text-[#FAFAFA]'
                        : 'text-[#D4D4D8] hover:bg-[#27272A]/50'
                    }`}
                  >
                    <ModeIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[#FAFAFA]' : 'text-[#71717A]'}`} />
                    <div className="flex-1">
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-[11px] text-[#A1A1AA] leading-tight mt-0.5">
                        {mode.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-[#27272A]/80 px-2 py-1 text-[10px] text-[#71717A] leading-normal">
              * Mode routing is architected on client; backend parameter support is coming in a future release.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
