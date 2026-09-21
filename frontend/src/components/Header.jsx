import React from 'react';
import { FileText, Upload, RotateCcw } from 'lucide-react';

export default function Header({ 
  activeDoc, 
  onFileUpload, 
  isUploading, 
  onClearChat, 
  hasMessages 
}) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-[#12141a] px-4 sm:px-8 flex items-center justify-between shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <FileText size={16} />
        </div>
        <span className="font-semibold text-base text-zinc-100 tracking-tight">
          AskPDF
        </span>
      </div>

      {/* Document info & Actions */}
      <div className="flex items-center gap-3">
        {activeDoc && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-200 max-w-[240px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="truncate font-medium">{activeDoc}</span>
          </div>
        )}

        {/* Upload Button */}
        <div>
          <input
            type="file"
            accept=".pdf"
            id="header-pdf-upload"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            className="hidden"
            disabled={isUploading}
          />
          <label
            htmlFor="header-pdf-upload"
            className={`px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload size={13} />
            <span>{isUploading ? 'Indexing PDF...' : 'Upload PDF'}</span>
          </label>
        </div>

        {/* Clear Chat Button */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            className="p-1.5 px-2.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Clear chat"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </header>
  );
}
