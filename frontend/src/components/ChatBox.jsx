import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Loader2, FileText, Sparkles, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  {
    label: "📄 Summarize Document",
    query: "Provide a comprehensive, structured summary of this document covering the main objectives, key findings, and conclusions."
  },
  {
    label: "💡 Key Takeaways",
    query: "What are the most important key takeaways, discoveries, or core points in this document?"
  },
  {
    label: "❓ What is this document about?",
    query: "What is the primary topic, problem, and objective discussed in this document?"
  }
];

export default function ChatBox({ 
  activeDoc, 
  onFileUpload, 
  isUploading, 
  onDocUpdated,
  messages,
  setMessages
}) {
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openSourcesId, setOpenSourcesId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading || isUploading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate response.');
      }

      const data = await response.json();

      if (data.active_document && onDocUpdated) {
        onDocUpdated(data.active_document);
      }

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.answer,
        sources: data.source_documents || []
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Error: ${err.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (id) => {
    setOpenSourcesId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1017] text-zinc-100 overflow-hidden relative">
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
        className="hidden"
      />

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="chat-container flex flex-col gap-6">
          
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="my-auto pt-16 pb-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
                Ask Questions About Your PDF
              </h1>
              
              <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
                {activeDoc 
                  ? `Uploaded document: "${activeDoc}". Get quick summaries, key takeaways, or ask any question.`
                  : "Upload a PDF document to summarize content and get fast, accurate answers."}
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 w-full max-w-xl">
                {QUICK_ACTIONS.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(action.query)}
                    disabled={isLoading || isUploading}
                    className="py-2.5 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 bg-[#161b26] border border-zinc-700/70 hover:border-blue-500/50 text-xs font-medium text-zinc-200 hover:text-white transition-all shadow-sm cursor-pointer"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.sender === 'user' ? (
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 bg-blue-600 text-white text-sm leading-relaxed whitespace-pre-wrap shadow-sm font-normal">
                  {msg.text}
                </div>
              ) : (
                <div className="w-full max-w-3xl rounded-2xl bg-[#151922] p-5 border border-zinc-800/90 shadow-sm">
                  {/* Assistant Response */}
                  <div className="text-sm text-zinc-200 leading-relaxed space-y-3 prose-zinc">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* Sources reference */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80">
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {msg.sources.length} {msg.sources.length === 1 ? 'source page' : 'source pages'} referenced
                        </span>
                        {openSourcesId === msg.id ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {openSourcesId === msg.id && (
                        <div className="mt-2.5 space-y-2">
                          {msg.sources.map((source, idx) => (
                            <div 
                              key={idx} 
                              className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300"
                            >
                              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                                <span className="font-semibold text-zinc-300">
                                  Page {source.page}
                                </span>
                              </div>
                              <p className="text-zinc-300 text-xs leading-relaxed italic bg-zinc-950/40 p-2 rounded border border-zinc-800/60">
                                "{source.snippet}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 text-zinc-400 text-xs py-3 px-4 rounded-xl bg-[#151922] border border-zinc-800 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Searching document and generating answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 border-t border-zinc-800 bg-[#0d1017]">
        <div className="chat-container">
          {/* Quick Action Chips when messages exist */}
          {messages.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 mb-2.5 overflow-x-auto pb-1">
              <button
                onClick={() => handleSend("Provide a comprehensive, structured summary of this document.")}
                className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 hover:text-white transition-colors border border-zinc-700/60 cursor-pointer shrink-0"
              >
                📄 Summarize
              </button>
              <button
                onClick={() => handleSend("What are the most important key takeaways from this document?")}
                className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 hover:text-white transition-colors border border-zinc-700/60 cursor-pointer shrink-0"
              >
                💡 Key Takeaways
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-[#151922] border border-zinc-700/70 focus-within:border-blue-500 rounded-xl px-3 py-2 transition-all shadow-sm"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
              title="Upload PDF document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isUploading 
                  ? "Indexing document..." 
                  : activeDoc 
                    ? `Ask anything about ${activeDoc}...` 
                    : "Ask a question..."
              }
              disabled={isLoading || isUploading}
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-500 px-1 font-normal"
            />

            <button
              type="submit"
              disabled={isLoading || isUploading || !inputQuery.trim()}
              className="w-8 h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              title="Send question"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
