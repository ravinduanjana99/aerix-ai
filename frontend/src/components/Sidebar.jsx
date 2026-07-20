import HistoryList from "./HistoryList";
import "../styles/sidebar.css";

export default function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  chatHistory,
  onLoadChat,
  onResetHistory,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? "open" : ""}`}
        onClick={onToggle}
      />

      <aside className={`sidebar ${!isOpen ? "collapsed" : ""}`}>
        {/* Header with Brand, Title, and Toggle Icon */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img
              src="/images/logo.png"
              alt="AERIX Logo"
              className="brand-logo"
            />
            <span className="brand-title">AERIX</span>
          </div>

          <button
            className="sidebar-toggle-btn"
            onClick={onToggle}
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            aria-label="Toggle Sidebar"
          >
            <img
              src={isOpen ? "/images/hide-sidepanel.png" : "/images/show-sidepanel.png"}
              alt={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              className="toggle-icon"
            />
          </button>
        </div>

        {/* New Chat Button with Plus Icon */}
        <button
          className="new-chat-btn"
          onClick={onNewChat}
          title="New Chat"
        >
          <img 
            src="/images/new-chat.png" 
            alt="New Chat" 
            className="btn-icon" 
          />
          <span className="btn-text">New Chat</span>
        </button>

        {/* History List */}
        <HistoryList chatHistory={chatHistory} onLoadChat={onLoadChat} />

        {/* Reset Button with Trash Icon */}
        <button
          className="reset-btn"
          onClick={onResetHistory}
          title="Reset History"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="btn-icon"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span className="btn-text">Reset History</span>
        </button>
      </aside>
    </>
  );
}