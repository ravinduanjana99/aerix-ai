import React, { useRef, useState } from "react";
import { X, FileText } from "lucide-react";
import "./ChatInput.css";

export default function ChatInput({ input, setInput, onSend, onFileSelect }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
    e.target.value = null;
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (onFileSelect) onFileSelect(null);
  };

  // FIXED: Passes input (string) AND selectedFile (File object)
  const handleSend = () => {
    if (!input.trim() && !selectedFile) return;
    
    onSend(input, selectedFile);
    
    // Reset state after sending
    setSelectedFile(null);
    setInput("");
  };

  return (
    <div className="input-box">
      <div className="input-container">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* GEMINI-STYLE ATTACHMENT CARD */}
        {selectedFile && (
          <div className="gemini-file-card">
            <div className="file-card-icon-wrapper">
              <FileText size={20} className="file-card-icon" />
            </div>
            <div className="file-card-info">
              <span className="file-card-name">{selectedFile.name}</span>
              <span className="file-card-type">
                {selectedFile.type ? selectedFile.type.split("/")[1]?.toUpperCase() : "FILE"}
              </span>
            </div>
            <button
              type="button"
              className="remove-file-btn"
              onClick={handleRemoveFile}
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* INPUT ROW */}
        <div className="input-row">
          <button
            type="button"
            onClick={handleFileClick}
            className="add-file-btn"
            title="Add File"
          >
            <img
              src="/images/add-file.png"
              alt="Add File"
              className="add-file-icon"
            />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here..."
            className="chat-input-field"
          />

          <button
            type="button"
            onClick={handleSend}
            className="send-btn"
            disabled={!input.trim() && !selectedFile}
            title="Send message"
          >
            <img
              src="/images/send-icon.png"
              alt="Send"
              className="send-icon"
            />
          </button>
        </div>
      </div>
    </div>
  );
}