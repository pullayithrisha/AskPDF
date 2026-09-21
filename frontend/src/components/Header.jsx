import React from 'react';
import { Bot, Menu, FileText, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export default function Header({ 
  activeDoc, 
  status, 
  onToggleSidebar, 
  isSidebarOpen,
  onResetSession
}) {
  const isReady = status?.status === 'ready' || Boolean(activeDoc);

  return (
    <header className="app-header">
      <div className="brand-section">
        <button
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="bot-icon-badge">
          <Bot size={20} />
        </div>
        <div className="brand-title-group">
          <h1 className="brand-name">AskPDF</h1>
          <span className="brand-tag">RAG Engine</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Active Document Indicator */}
        <div className="doc-status-indicator">
          {isReady ? (
            <div className="active-doc-chip" title={`Active: ${activeDoc || status?.active_document || 'sample.pdf'}`}>
              <FileText size={14} className="doc-icon" />
              <span className="doc-text">{activeDoc || status?.active_document || 'sample.pdf'}</span>
              <span className="status-dot online" title="Indexed & Ready"></span>
            </div>
          ) : (
            <div className="no-doc-chip">
              <span className="status-dot offline"></span>
              <span>No Document</span>
            </div>
          )}
        </div>

        {onResetSession && (
          <button
            onClick={onResetSession}
            className="reset-btn"
            title="Reset active document and chat session"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>
    </header>
  );
}
