import { useRef, useEffect } from "react";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";

export default function ChatPanel({
  messages,
  loading,
  input,
  setInput,
  onSend,
  onToggleSidebar,
}) {
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="chat-panel">
      {/* Top Header */}
      <div className="chat-header">
        {/* Hamburger Icon: Only rendered & visible on Mobile via CSS */}
        <button
          className="mobile-hamburger-btn"
          onClick={onToggleSidebar}
          title="Open Menu"
          aria-label="Open Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-box" ref={chatBoxRef}>
        <div className="chat-box-inner">
          {messages.map((msg, i) => (
            <MessageItem key={i} sender={msg.sender} text={msg.text} />
          ))}

          {loading && <div className="chat-message bot">AERIX is typing...</div>}
        </div>
      </div>

      <ChatInput input={input} setInput={setInput} onSend={onSend} />
    </div>
  );
}