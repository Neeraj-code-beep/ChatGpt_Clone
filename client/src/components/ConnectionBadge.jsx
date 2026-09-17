import React from 'react';

export default function ConnectionBadge({ status = 'connected' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          dotClass: 'bg-[#10B981]',
          pulse: false,
          label: 'Connected',
        };
      case 'reconnecting':
        return {
          dotClass: 'bg-[#F59E0B]',
          pulse: true,
          label: 'Reconnecting',
        };
      case 'connecting':
        return {
          dotClass: 'bg-[#F59E0B]',
          pulse: true,
          label: 'Connecting',
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'bg-[#71717A]',
          pulse: false,
          label: 'Offline',
        };
    }
  };

  const { dotClass, pulse, label } = getStatusConfig();

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#27272A] bg-[#18181B] text-[11px] text-[#A1A1AA]"
      title={`Socket Status: ${label}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span className="hidden sm:inline font-mono text-[10px] text-[#71717A]">{label}</span>
    </div>
  );
}
