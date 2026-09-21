import React, { useState } from 'react';
import { Upload, FileCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PdfUploader({ onUploadSuccess, currentDoc }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadMessage(`Indexed '${data.filename}' into ${data.total_chunks} vector chunks!`);
      if (onUploadSuccess) onUploadSuccess(data);
    } catch (err) {
      setErrorMessage(err.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Document Ingestion Engine
        </h2>
        <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          500 Chars | 100 Overlap (20%)
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-gray-700 hover:border-indigo-500/50 bg-gray-900/40 hover:bg-gray-900/60'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
          id="pdf-upload-input"
          disabled={isUploading}
        />
        <label htmlFor="pdf-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-cyan-300 font-medium">Extracting PDF text & generating Chroma vectors...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">
                  <span className="text-cyan-400 font-semibold underline">Click to upload</span> or drag and drop a PDF file
                </p>
                <p className="text-xs text-gray-400 mt-1">Digital PDFs up to 50MB (Single-pass vector embedding)</p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Success Notification */}
      {uploadMessage && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
