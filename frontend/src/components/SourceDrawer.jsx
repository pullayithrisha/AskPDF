import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, Quote } from 'lucide-react';

export default function SourceDrawer({ sources }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-slate-800/60"
        title="Toggle cited document excerpts"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
        <span>
          {sources.length} {sources.length === 1 ? 'source reference' : 'source references'} cited
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2.5 animate-fadeIn">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Quote className="w-3 h-3 text-blue-400" />
                  Reference #{idx + 1}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700/60">
                  Page {source.page}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed italic bg-slate-950/40 p-2.5 rounded-md border border-slate-800/80">
                "{source.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
