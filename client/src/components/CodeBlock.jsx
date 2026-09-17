import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-[#27272A] bg-[#09090B] overflow-hidden text-xs">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#27272A] bg-[#141417]">
        <span className="font-mono text-[11px] text-[#A1A1AA] uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA] px-2 py-0.5 rounded hover:bg-[#27272A] transition-colors"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#10B981]" />
              <span className="text-[#10B981]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto">
        <pre className="font-mono text-[#D4D4D8] leading-relaxed">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}
