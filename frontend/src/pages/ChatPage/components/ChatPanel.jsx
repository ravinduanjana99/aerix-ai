import React, { useState, useRef, useEffect } from "react";
import { Menu, Sparkles } from "lucide-react";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import WelcomeView from "./WelcomeView";
import VoiceAssistantModal from "./VoiceAssistantModal";
import "./ChatPanel.css";

export default function ChatPanel({
  messages = [],
  loading = false,
  input = "",
  setInput,
  onSend,
  onEditMessage,
  onNewChat,
  onToggleSidebar,
}) {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const isChatEmpty = !messages || messages.length === 0;

  return (
    <div className="chat-panel">
      {/* Top Header - Aligned to edges */}
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-header-left">
            <button
              className="mobile-hamburger-btn"
              onClick={onToggleSidebar}
              title="Open Menu"
              aria-label="Toggle Navigation"
            >
              <Menu size={18} />
            </button>
            <div className="chat-model-indicator">
              <span className="status-dot"></span>
              <span className="model-name">AERIX 2.0</span>
              <span className="model-tag">Groq · Sinhala RAG</span>
            </div>
          </div>

          <div className="chat-header-right">
            <button
              type="button"
              className="voice-assistant-badge"
              onClick={() => {
                if (onNewChat) onNewChat();
                setIsVoiceOpen(true);
              }}
              title="Open Voice Assistant (New Chat)"
            >
              <Sparkles size={13} className="voice-badge-icon" />
              <span>Voice Assistant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {isChatEmpty ? (
        <WelcomeView input={input} setInput={setInput} onSend={onSend} />
      ) : (
        <div className="chat-content-column">
          {/* Messages Scroll Area */}
          <div className="chat-messages-area" ref={chatBoxRef}>
            <div className="chat-messages-container">
              {messages.map((msg, i) => (
                <MessageItem 
                  key={msg.id || i} 
                  index={i}
                  sender={msg.sender} 
                  text={msg.text} 
                  fileName={msg.fileName}
                  isNew={msg.isNew}
                  onEditMessage={onEditMessage}
                />
              ))}

              {loading && (
                <div className="typing-indicator-row">
                  <div className="bot-header">
                    <div className="bot-avatar-badge">
                      <span className="bot-avatar-letter">A</span>
                    </div>
                    <span className="bot-name">AERIX</span>
                  </div>
                  <div className="typing-indicator-bubble">
                    <span className="typing-dot dot-1"></span>
                    <span className="typing-dot dot-2"></span>
                    <span className="typing-dot dot-3"></span>
                    <span className="typing-text">AERIX is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Input Bar */}
          <div className="chat-input-bottom-wrapper">
            <ChatInput input={input} setInput={setInput} onSend={onSend} />
          </div>
        </div>
      )}

      {/* Voice Assistant Modal with Liquid Moving Bubble */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSendVoiceMessage={onSend}
      />
    </div>
  );
}
