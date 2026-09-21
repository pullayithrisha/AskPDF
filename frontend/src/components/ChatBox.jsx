import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, FileText, RefreshCw, Sparkles, Zap, HelpCircle, Bot, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MetricsBadge from './MetricsBadge';
import SourceDrawer from './SourceDrawer';

const SUGGESTIONS = [
  { label: "⚡ Summarize Document", query: "Generate a comprehensive summary of this document." },
  { label: "💡 Key Concepts", query: "What are the key concepts and core topics in this document?" },
  { label: "🔍 Target Applications", query: "What are the target applications and real-world use cases?" },
  { label: "🛡️ Anti-Hallucination Test", query: "What is the capital of France?" }
];

export default function ChatBox({ 
  activeDoc, 
  onFileUpload, 
  isUploading, 
  selectedPrompt, 
  onClearSelectedPrompt,
  onDocUpdated
}) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isDocActive = Boolean(activeDoc);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isUploading]);

  // Handle suggested prompt from Sidebar
  useEffect(() => {
    if (selectedPrompt) {
      handleSend(selectedPrompt);
      if (onClearSelectedPrompt) onClearSelectedPrompt();
    }
  }, [selectedPrompt]);

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
        throw new Error(errorData.detail || 'Failed to fetch answer.');
      }

      const data = await response.json();

      if (data.active_document && onDocUpdated) {
        onDocUpdated(data.active_document);
      }

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.answer,
        retrievalTimeMs: data.retrieval_time_ms,
        generationTimeMs: data.generation_time_ms,
        totalTimeMs: data.total_time_ms,
        sources: data.source_documents || []
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: `⚠️ **Error:** ${err.message}`
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

  return (
    <div className="chat-card">
      {/* Hidden File Input */}
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {/* Messages Canvas */}
      <div className="chat-messages-container">
        
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <Bot size={36} />
            </div>
            <h2 className="empty-state-title">AskDoc RAG Assistant</h2>
            <p className="empty-state-desc">
              Ask any question about your document. Powered by LangChain, Gemini 2.5 Flash, and ChromaDB vector search with sub-second retrieval.
            </p>

            <div className="empty-state-grid">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sug.query)}
                  disabled={isLoading || isUploading}
                  className="empty-state-pill"
                >
                  <span className="pill-title">{sug.label}</span>
                  <span className="pill-query">{sug.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row ${msg.sender === 'user' ? 'user' : 'bot'}`}
          >
            {msg.sender === 'user' ? (
              <div className="user-bubble">
                {msg.text}
              </div>
            ) : (
              <div className="bot-bubble-wrapper">
                <div className="bot-bubble markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>

                {/* Sub-500ms Vector Metrics Badge */}
                {typeof msg.retrievalTimeMs === 'number' && (
                  <MetricsBadge
                    retrievalTimeMs={msg.retrievalTimeMs}
                    generationTimeMs={msg.generationTimeMs}
                    totalTimeMs={msg.totalTimeMs}
                  />
                )}

                {/* Cited Sources Accordion Drawer */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourceDrawer sources={msg.sources} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="message-row bot">
            <div className="bot-bubble loading-bubble">
              <Loader2 size={16} className="animate-spin text-cyan-400" />
              <span>Searching vector database & synthesizing response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips Bar */}
      {messages.length > 0 && (
        <div className="compact-suggestions-bar">
          <span className="suggestions-label">Suggestions:</span>
          <div className="chips-row">
            {SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sug.query)}
                disabled={isLoading || isUploading}
                className="suggestion-chip"
              >
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="input-section">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="input-form"
        >
          {/* Active File Name Badge & Change PDF Button / Loading State */}
          {isUploading ? (
            <div className="uploading-file-badge">
              <Loader2 size={14} className="animate-spin text-cyan-400" />
              <span>Indexing PDF...</span>
            </div>
          ) : isDocActive ? (
            <div className="active-file-badge-group">
              <div className="active-file-pill" title={activeDoc}>
                <FileText size={14} className="doc-icon" />
                <span className="doc-name-text">{activeDoc}</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="change-pdf-btn"
                title="Upload a different PDF document"
              >
                <RefreshCw size={12} />
                <span>Change</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="upload-inline-btn"
              title="Upload PDF document"
            >
              <Paperclip size={16} />
              <span>Upload PDF</span>
            </button>
          )}

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? "Uploading & indexing document..." : "Ask a question about the document..."}
            disabled={isLoading || isUploading}
            className="prompt-input"
          />

          <button
            type="submit"
            disabled={isLoading || isUploading || !inputQuery.trim()}
            className="send-btn"
            title="Send query"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
}
