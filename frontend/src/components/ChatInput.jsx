export default function ChatInput({ input, setInput, onSend }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-box">
      <div className="input-container">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here..."
        />
        <button 
          onClick={onSend} 
          className="send-btn"
          disabled={!input.trim()} /* Optional: disables button when input is empty */
        >
          <img 
            src="/images/send-icon.png" 
            alt="Send" 
            className="send-icon" 
          />
        </button>
      </div>
    </div>
  );
}