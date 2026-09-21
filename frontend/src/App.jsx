import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatBox from './components/ChatBox';

export default function App() {
  const [status, setStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleResetSession = async () => {
    try {
      await fetch('http://localhost:8000/api/reset', { method: 'POST' });
      await fetchStatus();
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Upload failed');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Upload failed:', err);
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPrompt = (promptText) => {
    setSelectedPrompt(promptText);
  };

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header
        activeDoc={status?.active_document}
        status={status}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onResetSession={handleResetSession}
      />

      {/* Main Body with Sidebar + Chat */}
      <div className="app-body">
        <Sidebar
          status={status}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectPrompt={handleSelectPrompt}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
        />

        <main className="main-workspace">
          <ChatBox
            activeDoc={status?.active_document}
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            selectedPrompt={selectedPrompt}
            onClearSelectedPrompt={() => setSelectedPrompt(null)}
            onDocUpdated={() => fetchStatus()}
          />
        </main>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <span>AskPDF • Production RAG Engine</span>
        <span className="footer-dot">•</span>
        <span>LangChain + Gemini 2.5 Flash + ChromaDB</span>
      </footer>
    </div>
  );
}
