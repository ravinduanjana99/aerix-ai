import { useState, useEffect, useRef } from "react";
import { sendMessage } from "../api/chatApi";
import "../styles/chat.css";
import ReactMarkdown from "react-markdown";

const INITIAL_MESSAGE = {
  sender: "AERIX",
  text: "Hello! I’m AERIX. How can I help you today?",
};

const STORAGE_MESSAGES = "aerix_messages";
const STORAGE_HISTORY = "aerix_chat_history";

export default function ChatPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const chatBoxRef = useRef(null);

  /* ----------------------------------
     LOAD FROM LOCAL STORAGE
  ---------------------------------- */
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_MESSAGES);
    const savedHistory = localStorage.getItem(STORAGE_HISTORY);

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
  }, []);

  /* ----------------------------------
     SAVE TO LOCAL STORAGE
  ---------------------------------- */
  useEffect(() => {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  /* ----------------------------------
     AUTO SCROLL
  ---------------------------------- */
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);

  /* ----------------------------------
     SEND MESSAGE
  ---------------------------------- */
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "You", text: input };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendMessage(input);
      setMessages((prev) => [
        ...prev,
        { sender: "AERIX", text: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "AERIX", text: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------
     ENTER KEY SUPPORT
  ---------------------------------- */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ----------------------------------
     NEW CHAT
  ---------------------------------- */
  const newChat = () => {
    const firstUserMsg = messages.find((m) => m.sender === "You");

    if (messages.length > 1 && firstUserMsg) {
      setChatHistory((prev) => [
        ...prev,
        {
          title: firstUserMsg.text.slice(0, 30),
          messages,
        },
      ]);
    }

    setMessages([INITIAL_MESSAGE]);
  };

  /* ----------------------------------
     LOAD CHAT
  ---------------------------------- */
  const loadChat = (index) => {
    setMessages(chatHistory[index].messages);
  };

  /* ----------------------------------
     RESET HISTORY
  ---------------------------------- */
  const resetHistory = () => {
    localStorage.removeItem(STORAGE_MESSAGES);
    localStorage.removeItem(STORAGE_HISTORY);
    setChatHistory([]);
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <div className="app-layout">
      {/* BACKGROUND VIDEO */}
      <video className="background-video" autoPlay loop muted playsInline>
        <source src="/background1.mp4" type="video/mp4" />
      </video>

      {/* SIDEBAR */}
      <div className="sidebar">
        <button className="new-chat-btn" onClick={newChat}>
          + New Chat
        </button>

        <div className="history-list">
          {chatHistory.map((chat, i) => (
            <button
              key={i}
              className="history-item"
              onClick={() => loadChat(i)}
              title={chat.title}
            >
              {chat.title}...
            </button>
          ))}
        </div>

        <button className="reset-btn" onClick={resetHistory}>
          Reset History
        </button>
      </div>

      {/* CHAT PANEL */}
      <div className="chat-panel">
        <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${
                msg.sender === "You" ? "user" : "bot"
              }`}
            >
              {msg.sender === "AERIX" ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-message bot">AERIX is typing...</div>
          )}
        </div>

        <div className="input-box">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here..."
          />
          <button onClick={handleSend}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className="send-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10l9-7 11 11-9 7-2-5-5-2z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
