import React from 'react';
import { 
  FileText, Database, Cpu, ShieldCheck, Sparkles, 
  Upload, ChevronLeft, ChevronRight, Zap, RefreshCw 
} from 'lucide-react';

export default function Sidebar({ 
  status, 
  isOpen, 
  onToggle, 
  onSelectPrompt, 
  onFileUpload, 
  isUploading 
}) {
  const SUGGESTED_QUESTIONS = [
    "What is the main topic of this document?",
    "What are the target users and applications?",
    "Who is the author or supervisor of the project?",
    "What is the capital of France?"
  ];

  return (
    <aside className={`fixed md:relative z-30 top-0 left-0 h-full bg-[#0D121F] border-r border-gray-800/80 flex flex-col transition-all duration-300 ${
      isOpen ? 'w-72' : 'w-0 md:w-16'
    } overflow-hidden`}>
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                AskDoc AI
              </h2>
              <p className="text-[10px] text-gray-400">ChatGPT-style RAG Engine</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white mx-auto">
            <Zap className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors hidden md:block"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Active Document Box */}
          <div className="p-3.5 rounded-xl bg-gray-900/90 border border-gray-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                <FileText className="w-4 h-4 text-cyan-400" />
                Active PDF
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                Indexed
              </span>
            </div>
            <p className="text-sm font-semibold text-white truncate" title={status?.active_document || 'sample.pdf'}>
              {status?.active_document || 'sample.pdf'}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
              <span>Indexed Vectors:</span>
              <span className="text-cyan-300 font-mono font-semibold">{status?.total_chunks ?? 0} chunks</span>
            </div>
          </div>

          {/* Upload New Document Button */}
          <div>
            <input
              type="file"
              accept=".pdf"
              id="sidebar-pdf-upload"
              onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor="sidebar-pdf-upload"
              className={`w-full py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Processing PDF...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload New Document</span>
                </>
              )}
            </label>
          </div>

          {/* Quick Prompts */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 px-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Suggested Prompts
            </h3>
            <div className="space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt(q)}
                  className="w-full text-left p-2.5 rounded-lg bg-gray-900/60 hover:bg-gray-800 border border-gray-800/60 text-xs text-gray-300 hover:text-white transition-colors truncate"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Architecture Specs */}
          <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800/80 text-[11px] space-y-2">
            <h4 className="font-medium text-gray-400 text-[10px] uppercase tracking-wider">Engine Specs</h4>
            <div className="flex justify-between text-gray-400">
              <span>LLM</span>
              <span className="text-indigo-300 font-mono">Gemini 2.5 Flash</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Embeddings</span>
              <span className="text-purple-300 font-mono">gemini-embedding</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Chunking</span>
              <span className="text-cyan-300 font-mono">500c / 20% overlap</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Vector Store</span>
              <span className="text-emerald-400 font-mono">ChromaDB Cosine</span>
            </div>
          </div>

        </div>
      )}

      {/* Footer info */}
      {isOpen && (
        <div className="p-3 border-t border-gray-800/80 text-[10px] text-gray-500 text-center">
          AskDoc AI • Production RAG
        </div>
      )}

    </aside>
  );
}
