import { useState } from "react";

export default function HistoryList({ chatHistory, onLoadChat }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="history-section">
      {/* Recents Header */}
      <div 
        className="history-summary" 
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="history-title">Recents</span>
        <svg 
          className={`chevron-icon ${isOpen ? "open" : ""}`} 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {/* Animated Accordion Wrapper */}
      <div className={`history-accordion ${isOpen ? "open" : "closed"}`}>
        <div className="history-accordion-inner">
          <div className="history-list">
            {chatHistory && chatHistory.map((chat, i) => (
              <button
                key={i}
                className="history-item"
                onClick={() => onLoadChat(i)}
                title={chat.title}
              >
                <span className="history-text">{chat.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}