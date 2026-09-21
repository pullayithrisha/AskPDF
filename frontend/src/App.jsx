import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Paperclip, 
  ArrowUp, 
  X, 
  Check, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Pencil
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function App() {
  const [docState, setDocState] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'ready' | 'error'
  const [attachedDoc, setAttachedDoc] = useState(null); // { name, size, type }
  const [docError, setDocError] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [expandedExcerpts, setExpandedExcerpts] = useState({});

  // Navbar and Editing state (like ChatGPT)
  const [activeModal, setActiveModal] = useState(null); // 'how' | 'about' | null
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraftText, setEditDraftText] = useState('');

  const fileInputRef = useRef(null);

  // Format inline page citations like ((pg.no. 1).) or (pg.no. 1) into very little text (11px badge)
  const formatResponseText = (text) => {
    if (!text) return '';
    const citationRegex = /\({1,2}\s*(?:pg\.?\s*no\.?|page|pg\.?)\s*([0-9\s,\-\&and]+?)\.?\s*[\)\.]+/gi;
    return text.replace(citationRegex, (match, p1) => {
      const cleanPage = p1.trim().replace(/\.$/, '');
      return `<span class="page-ref">pg.no. ${cleanPage}</span>`;
    });
  };

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-grow textarea with natural single-line height (prevents clipping placeholder/text)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 38), 160);
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [inputQuery, messages.length]);

  // Check initial server state on load
  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ready' && data.active_document) {
          const ext = data.active_document.split('.').pop()?.toUpperCase() || 'PDF';
          setDocState('ready');
          setAttachedDoc({
            name: data.active_document,
            size: 'Ready',
            type: ext
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0 || isSearching) {
      scrollToBottom();
    }
  }, [messages, isSearching]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '179 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  // Upload handler
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInlineError('');
    const formattedSize = formatFileSize(file.size);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';

    setAttachedDoc({
      name: file.name,
      size: formattedSize,
      type: ext
    });
    setDocState('uploading');
    setDocError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setTimeout(() => {
        setDocState((current) => (current === 'uploading' ? 'processing' : current));
      }, 300);

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Couldn't read this file");
      }

      const data = await response.json();
      setAttachedDoc({
        name: data.filename || file.name,
        size: formattedSize,
        type: ext
      });
      setDocState('ready');
    } catch (err) {
      setDocState('error');
      setDocError(err.message || "Couldn't read this file");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Remove attached file
  const handleRemoveAttachedDoc = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await fetch('http://localhost:8000/api/reset', { method: 'POST' });
    } catch (err) {
      console.error('Error resetting document:', err);
    }
    setAttachedDoc(null);
    setDocState('idle');
    setDocError('');
    setInlineError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send question
  const handleSend = async (e) => {
    if (e) e.preventDefault();

    if (isSearching) return;

    if (!attachedDoc || docState !== 'ready') {
      setInlineError('Attach a document first');
      return;
    }

    if (!inputQuery.trim()) {
      setInlineError('Type a question');
      return;
    }

    setInlineError('');
    const userText = inputQuery.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userText
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsSearching(true);

    try {
      const response = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to generate answer.');
      }

      const data = await response.json();

      let answerText = data.answer || '';
      const fallbackPhrases = [
        "i don't know",
        "i do not know",
        "i don't have information",
        "i do not have information",
        "not mentioned in the provided",
        "not found in the document"
      ];
      const isFallback = fallbackPhrases.some((phrase) => answerText.toLowerCase().includes(phrase));
      if (isFallback) {
        answerText = "I couldn't find this information in the uploaded document.";
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: answerText,
        sources: isFallback ? [] : (data.source_documents || [])
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: "I couldn't find this information in the uploaded document.",
          sources: []
        }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  // Start editing user message (ChatGPT style)
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditDraftText(msg.text);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditDraftText('');
  };

  // Save and Submit edited query (ChatGPT branch behavior)
  const handleSaveAndSubmitEdit = async (msgId) => {
    if (!editDraftText.trim() || isSearching) return;

    const newText = editDraftText.trim();
    const targetIndex = messages.findIndex((m) => m.id === msgId);
    if (targetIndex === -1) return;

    // Truncate messages after this message
    const updatedUserMsg = {
      ...messages[targetIndex],
      text: newText
    };

    const truncated = [...messages.slice(0, targetIndex), updatedUserMsg];
    setMessages(truncated);
    setEditingMessageId(null);
    setEditDraftText('');
    setIsSearching(true);

    try {
      const response = await fetch('http://localhost:8000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newText }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to generate answer.');
      }

      const data = await response.json();

      let answerText = data.answer || '';
      const fallbackPhrases = [
        "i don't know",
        "i do not know",
        "i don't have information",
        "i do not have information",
        "not mentioned in the provided",
        "not found in the document"
      ];
      const isFallback = fallbackPhrases.some((phrase) => answerText.toLowerCase().includes(phrase));
      if (isFallback) {
        answerText = "I couldn't find this information in the uploaded document.";
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: answerText,
        sources: isFallback ? [] : (data.source_documents || [])
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: "I couldn't find this information in the uploaded document.",
          sources: []
        }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  // Navigation Home handler
  const handleNavHome = () => {
    setActiveModal(null);
    if (messages.length > 0) {
      setMessages([]);
    }
    setInlineError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleExcerpts = (msgId) => {
    setExpandedExcerpts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const hasMessages = messages.length > 0;
  const isSendActive = inputQuery.trim().length > 0 && attachedDoc && docState === 'ready';

  // Helper for chip icon styling based on extension
  const getFileTypeStyle = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'PDF') {
      return { boxClass: 'chip-icon-pdf', iconColor: '#dc2626' };
    }
    if (t === 'DOCX' || t === 'DOC') {
      return { boxClass: 'chip-icon-docx', iconColor: '#2563eb' };
    }
    return { boxClass: 'chip-icon-txt', iconColor: '#6b7280' };
  };

  // Reusable Composer Component
  const renderComposer = (isConversationMode = false) => (
    <div className="w-full flex flex-col items-center">
      <form
        onSubmit={handleSend}
        className="composer-card"
      >
        {/* 1) Attachment Chip Row */}
        {attachedDoc && (
          <div className="attachment-chip-row">
            <div className="attachment-chip">
              {(() => {
                const styleInfo = getFileTypeStyle(attachedDoc.type);
                return (
                  <div className={`chip-icon-box ${styleInfo.boxClass}`}>
                    <FileText style={{ width: '15px', height: '15px', color: styleInfo.iconColor }} />
                  </div>
                );
              })()}

              {/* File Name & Size */}
              <span className="chip-name" title={attachedDoc.name}>
                {attachedDoc.name}
              </span>
              <span className="chip-size">
                {attachedDoc.size}
              </span>

              {/* Status Indicator */}
              {(docState === 'uploading' || docState === 'processing') && (
                <div className="chip-status" style={{ color: '#6b7280' }}>
                  <Loader2 className="animate-spin" style={{ width: '13px', height: '13px' }} />
                  <span>Processing...</span>
                </div>
              )}
              {docState === 'ready' && (
                <div className="chip-status" style={{ color: '#16a34a', fontWeight: 500 }}>
                  <Check style={{ width: '13px', height: '13px' }} />
                  <span>Ready</span>
                </div>
              )}
              {docState === 'error' && (
                <div className="chip-status" style={{ color: '#dc2626', fontWeight: 500 }}>
                  <span>Couldn't read this file</span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={handleRemoveAttachedDoc}
                className="chip-remove-btn"
                title="Remove file"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          </div>
        )}

        {/* 2) Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputQuery}
          onChange={(e) => {
            setInputQuery(e.target.value);
            if (inlineError) setInlineError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={isConversationMode ? "Ask a follow-up question..." : "Ask a question about your document..."}
          className="composer-textarea"
        />

        {/* 3) Bottom Bar */}
        <div className="composer-bottom-bar">
          {/* Attach Button using HTML label for native file selection */}
          <label
            className="composer-attach-btn"
            title="Attach file (PDF, DOCX, TXT)"
            style={{
              cursor: (docState === 'uploading' || docState === 'processing') ? 'not-allowed' : 'pointer',
              opacity: (docState === 'uploading' || docState === 'processing') ? 0.6 : 1
            }}
          >
            <Paperclip style={{ width: '16px', height: '16px' }} />
            <span>Attach file</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
              disabled={docState === 'uploading' || docState === 'processing'}
            />
          </label>

          {/* Send Button */}
          <button
            type="submit"
            className={`composer-send-btn ${isSendActive ? 'active' : 'inactive'}`}
            title="Send"
          >
            <ArrowUp style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </form>

      {/* Inline Validation Error below composer */}
      {inlineError && (
        <div className="composer-inline-error">
          {inlineError}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <header className="header-container">
        <div 
          className="flex items-center cursor-pointer" 
          style={{ gap: '10px' }}
          onClick={handleNavHome}
          title="AskDoc Home"
        >
          <div 
            className="flex items-center justify-center text-white" 
            style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#2563eb' }}
          >
            <FileText style={{ width: '18px', height: '18px', strokeWidth: 2 }} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            AskDoc
          </span>
        </div>

        {/* Navigation Links: Home, How it works, About Us */}
        <nav className="nav-links">
          <button
            type="button"
            onClick={handleNavHome}
            className={`nav-link ${!hasMessages && !activeModal ? 'active' : ''}`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('how')}
            className={`nav-link ${activeModal === 'how' ? 'active' : ''}`}
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('about')}
            className={`nav-link ${activeModal === 'about' ? 'active' : ''}`}
          >
            About Us
          </button>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      {!hasMessages ? (
        /* LANDING VIEW (No messages yet) */
        <main className="landing-container">
          {/* Centered Heading */}
          <h1 className="landing-heading">
            Upload a document and ask questions
          </h1>

          {/* Subtitle */}
          <p className="landing-subtitle">
            Answers come only from your document, with the pages they were found on.
          </p>

          {/* Composer */}
          {renderComposer(false)}
        </main>
      ) : (
        /* CONVERSATION VIEW (Active discussion) */
        <main className="w-full flex-1">
          <div className="thread-container">
            <div className="conversation-msg-gap">
              {messages.map((msg) => (
                <div key={msg.id} className="w-full">
                  {msg.sender === 'user' ? (
                    editingMessageId === msg.id ? (
                      /* Inline Edit Mode (ChatGPT style) */
                      <div className="flex justify-end w-full">
                        <div className="edit-mode-container">
                          <textarea
                            rows={2}
                            value={editDraftText}
                            onChange={(e) => setEditDraftText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveAndSubmitEdit(msg.id);
                              }
                            }}
                            className="edit-mode-textarea"
                            placeholder="Edit your question..."
                            autoFocus
                          />
                          <div className="edit-mode-actions">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="edit-cancel-btn"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAndSubmitEdit(msg.id)}
                              disabled={!editDraftText.trim() || isSearching}
                              className="edit-submit-btn"
                            >
                              Save & Submit
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Normal User Message Bubble with Edit button */
                      <div className="user-message-wrapper">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg)}
                          className="edit-msg-btn"
                          title="Edit question"
                        >
                          <Pencil style={{ width: '13px', height: '13px' }} />
                        </button>
                        <div className="user-message-bubble">
                          {msg.text}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="w-full">
                      {/* AskDoc Answer */}
                      <div className="answer-typography">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                          {formatResponseText(msg.text)}
                        </ReactMarkdown>
                      </div>

                      {/* Sources Row */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-row">
                          <span className="sources-label">Sources</span>
                          {Array.from(new Set(msg.sources.map((s, idx) => s.page || (idx + 1)))).map((page, pIdx) => (
                            <div key={pIdx} className="source-chip">
                              <FileText style={{ width: '14px', height: '14px' }} />
                              <span>Page {page}</span>
                            </div>
                          ))}

                          {/* Show/Hide Excerpts button */}
                          <button
                            type="button"
                            onClick={() => toggleExcerpts(msg.id)}
                            className="excerpts-toggle-btn"
                          >
                            <span>{expandedExcerpts[msg.id] ? 'Hide excerpts' : 'Show excerpts'}</span>
                            {expandedExcerpts[msg.id] ? (
                              <ChevronUp style={{ width: '13px', height: '13px' }} />
                            ) : (
                              <ChevronDown style={{ width: '13px', height: '13px' }} />
                            )}
                          </button>

                          {/* Expanded Excerpts Panel */}
                          {expandedExcerpts[msg.id] && (
                            <div className="w-full excerpts-panel">
                              {msg.sources.map((src, idx) => (
                                <div key={idx} className="excerpt-item">
                                  <span className="excerpt-page-tag">
                                    Page {src.page || idx + 1}:
                                  </span>
                                  <span>{src.snippet || 'Referenced document excerpt'}</span>
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

              {/* Loading indicator */}
              {isSearching && (
                <div className="loading-indicator">
                  <span>Reading your document</span>
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky Bottom Composer */}
          <div className="sticky-bottom-bar">
            {renderComposer(true)}
          </div>
        </main>
      )}

      {/* MODAL: How it works */}
      {activeModal === 'how' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">How AskDoc Works</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="modal-close-btn"
                title="Close"
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div className="modal-body">
              <div className="how-step-card">
                <div className="how-step-number">1</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                    Attach Your Document
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Upload any PDF document. Your file is processed ephemerally with zero permanent disk storage.
                  </div>
                </div>
              </div>

              <div className="how-step-card">
                <div className="how-step-number">2</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                    Ask Any Question
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Type your question, request key takeaways, or ask for a detailed summary in natural language.
                  </div>
                </div>
              </div>

              <div className="how-step-card">
                <div className="how-step-number">3</div>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                    Get Verified Answers
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Answers are strictly grounded in your document with inline page references and verifiable sources.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: About Us */}
      {activeModal === 'about' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">About AskDoc</h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="modal-close-btn"
                title="Close"
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>AskDoc</strong> is an intelligent document AI companion engineered to deliver instant, factually grounded answers from your documents without hallucination.
              </p>
              <p>
                Powered by state-of-the-art Retrieval-Augmented Generation (RAG), Gemini 2.5 Flash, and ChromaDB vector indexing, AskDoc reads through complex documents and points you directly to the exact page where the answer resides.
              </p>
              <div style={{ marginTop: '8px', padding: '12px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' }}>
                🔒 <strong>Privacy First:</strong> Uploaded documents are processed in-memory and temporary storage, with no unauthorized tracking or persistent file retention.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
