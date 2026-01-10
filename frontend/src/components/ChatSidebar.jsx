export default function ChatSidebar({
  sessions,
  activeSession,
  onSelect,
  onNewChat,
}) {
  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="session-list">
        {sessions.map((s) => (
          <div
            key={s.session_id}
            className={
              s.session_id === activeSession
                ? "session-item active"
                : "session-item"
            }
            onClick={() => onSelect(s.session_id)}
          >
            Chat {s.session_id.slice(0, 8)}
          </div>
        ))}
      </div>
    </div>
  );
}
