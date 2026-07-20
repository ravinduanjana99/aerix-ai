import { useState, useEffect } from "react";
import { sendMessage } from "../api/chatApi";
import Sidebar from "../components/Sidebar";
import ChatPanel from "../components/ChatPanel";

import "../styles/global.css";

import "../styles/chat-layout.css";
import "../styles/chat-messages.css";
import "../styles/chat-input.css";

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

  // 1. Sidebar Toggle State (defaults to open on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 2. Automatically close sidebar on initial mobile page load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Run once on load
    handleResize();
  }, []);

  /* Load Local Storage */
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_MESSAGES);
    const savedHistory = localStorage.getItem(STORAGE_HISTORY);

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
  }, []);

  /* Persist Local Storage */
  useEffect(() => {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  /* Actions */
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "You", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendMessage(input);
      setMessages((prev) => [...prev, { sender: "AERIX", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "AERIX", text: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
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
    
    // On mobile, auto-close sidebar after starting a new chat
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const handleLoadChat = (index) => {
    setMessages(chatHistory[index].messages);
    
    // On mobile, auto-close sidebar after choosing a conversation
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const handleResetHistory = () => {
    localStorage.removeItem(STORAGE_MESSAGES);
    localStorage.removeItem(STORAGE_HISTORY);
    setChatHistory([]);
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        onLoadChat={handleLoadChat}
        onResetHistory={handleResetHistory}
      />
      <ChatPanel
        messages={messages}
        loading={loading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
}