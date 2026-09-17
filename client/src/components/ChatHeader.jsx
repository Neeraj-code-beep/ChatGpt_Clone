import React from 'react';
import { Menu } from 'lucide-react';
import ConnectionBadge from './ConnectionBadge';
import ModeSelector from './ModeSelector';

export default function ChatHeader({
  title = 'Conversation',
  connectionStatus = 'connected',
  selectedMode = 'auto',
  onSelectMode,
  onOpenSidebar,
}) {
  return (
    <header className="h-14 border-b border-[#27272A] bg-[#121214]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left: Mobile Toggle & Chat Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="sm:hidden p-1.5 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B]"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="truncate">
          <h1 className="text-sm font-semibold text-[#FAFAFA] truncate tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Mode Selector & Connection Status */}
      <div className="flex items-center gap-2.5 shrink-0">
        <ConnectionBadge status={connectionStatus} />
        <ModeSelector selectedMode={selectedMode} onSelectMode={onSelectMode} />
      </div>
    </header>
  );
}
