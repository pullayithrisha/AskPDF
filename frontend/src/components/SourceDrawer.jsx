import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

export default function SourceDrawer({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-950/60 hover:bg-gray-900 border border-gray-800 text-[11px] font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
        <span>{sources.length} Document Sources Cited</span>
        {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto">
          {sources.map((source, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 text-xs">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="font-semibold text-cyan-300 text-[11px]">
                  Excerpt #{idx + 1}
                </span>
                <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                  Page {source.page}
                </span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed italic bg-black/30 p-2 rounded-lg border border-gray-900">
                "{source.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
