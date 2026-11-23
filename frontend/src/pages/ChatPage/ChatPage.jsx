import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import { sendMessage, resetHistory, getSessions, getHistory } from "../../api/chatApi";
import "./ChatPage.css";

const STORAGE_KEY_CHATS = "aerix_chats_history";
const STORAGE_KEY_CURRENT = "aerix_current_chat_id";

export default function ChatPage() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize chats history from localStorage
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CHATS);
    return saved ? JSON.parse(saved) : {};
  });

  // Reset active chat to null when browser closes/reopens
  const [currentChatId, setCurrentChatId] = useState(() => {
    const isSessionActive = sessionStorage.getItem("aerix_session_active");
    if (!isSessionActive) {
      sessionStorage.setItem("aerix_session_active", "true");
      localStorage.removeItem(STORAGE_KEY_CURRENT);
      return null;
    }
    return localStorage.getItem(STORAGE_KEY_CURRENT) || null;
  });

  // Sync chats state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
  }, [chats]);

  // Sync active chat ID to localStorage
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem(STORAGE_KEY_CURRENT, currentChatId);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT);
    }
  }, [currentChatId]);

  // Scroll to bottom of chat when page refreshes or chat changes
  useEffect(() => {
    if (currentChatId && chats[currentChatId]?.messages?.length > 0) {
      setTimeout(() => {
        const chatContainer = document.querySelector(".chat-messages-area");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
    }
  }, [currentChatId, chats]);

  // Load sessions from server if local storage has no chats
  useEffect(() => {
    let isMounted = true;
    async function fetchRemoteSessions() {
      try {
        const serverSessions = await getSessions();
        if (isMounted && Array.isArray(serverSessions) && serverSessions.length > 0) {
          setChats((prev) => {
            const updated = { ...prev };
            let changed = false;
            serverSessions.forEach((s) => {
              const sessionTitle = s.title || s.topic || "New Conversation";
              if (s.session_id && !updated[s.session_id]) {
                changed = true;
                updated[s.session_id] = {
                  id: s.session_id,
                  title: sessionTitle,
                  messages: [],
                };
              } else if (s.session_id && updated[s.session_id] && updated[s.session_id].title.startsWith("Session ")) {
                changed = true;
                updated[s.session_id].title = sessionTitle;
              }
            });
            return changed ? updated : prev;
          });
        }
      } catch (err) {
        // Backend not yet reachable on initial load, ignore
      }
    }
    fetchRemoteSessions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derive recents array for sidebar
  const recents = Object.values(chats).map((chat) => ({
    id: chat.id,
    title: chat.title,
  }));

  // Get active chat messages
  const activeMessages =
    currentChatId && chats[currentChatId]
      ? chats[currentChatId].messages
      : [];

  const handleSend = async (textToSend, attachedFile = null, language = null) => {
    const messageText = typeof textToSend === "string" ? textToSend : input;
    
    if (!messageText.trim() && !attachedFile) return;

    let activeId = currentChatId;

    // Create session if starting from a fresh chat
    if (!activeId || !chats[activeId]) {
      activeId = Date.now().toString();
      setCurrentChatId(activeId);

      const titleSource = messageText || attachedFile?.name || "New Chat";
      const newChatTitle =
        titleSource.length > 25
          ? `${titleSource.substring(0, 25)}...`
          : titleSource;

      setChats((prev) => ({
        ...prev,
        [activeId]: {
          id: activeId,
          title: newChatTitle,
          messages: [],
        },
      }));
    }

    // 1. Instantly append User message locally
    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: messageText,
      fileName: attachedFile ? attachedFile.name : null,
      isNew: true,
    };

    setChats((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        messages: [...(prev[activeId]?.messages || []), userMessage],
      },
    }));

    setInput("");
    setLoading(true);

    // 2. Send to API backend (passing matching arguments)
    try {
      const response = await sendMessage(messageText, activeId, language);

      const botReplyText =
        response.response ||
        response.reply ||
        response.message ||
        (typeof response === "string" ? response : JSON.stringify(response));

      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botReplyText,
        isNew: true,
      };

      setChats((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          messages: [...(prev[activeId]?.messages || []), botMessage],
        },
      }));

      return { reply: botReplyText };
    } catch (error) {
      console.error("API Chat Error:", error);

      const errorText = "⚠️ Something went wrong connecting to the server. Please verify your backend is running on http://localhost:8000.";
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: errorText,
      };

      setChats((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          messages: [...(prev[activeId]?.messages || []), errorMessage],
        },
      }));

      return { reply: errorText };
    } finally {
      setLoading(false);
    }
  };

  const handleEditMessage = async (index, newText) => {
    if (!newText.trim() || !currentChatId) return;

    const currentMessages = chats[currentChatId]?.messages || [];
    const precedingMessages = currentMessages.slice(0, index);

    const editedUserMsg = {
      ...currentMessages[index],
      text: newText,
      isNew: false,
    };

    const newMsgList = [...precedingMessages, editedUserMsg];

    setChats((prev) => ({
      ...prev,
      [currentChatId]: {
        ...prev[currentChatId],
        messages: newMsgList,
      },
    }));

    setLoading(true);

    try {
      const response = await sendMessage(newText, currentChatId);

      const botReplyText =
        response.response ||
        response.reply ||
        response.message ||
        (typeof response === "string" ? response : JSON.stringify(response));

      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: botReplyText,
        isNew: true,
      };

      setChats((prev) => ({
        ...prev,
        [currentChatId]: {
          ...prev[currentChatId],
          messages: [...newMsgList, botMessage],
        },
      }));
    } catch (error) {
      console.error("API Chat Edit Error:", error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "⚠️ Something went wrong connecting to the server.",
      };

      setChats((prev) => ({
        ...prev,
        [currentChatId]: {
          ...prev[currentChatId],
          messages: [...newMsgList, errorMessage],
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setInput("");
    setIsMobileOpen(false);
  };

  const handleSelectChat = async (id) => {
    setCurrentChatId(id);
    setIsMobileOpen(false);

    try {
      const history = await getHistory(id);
      const msgList = Array.isArray(history) ? history : (history?.messages || []);
      if (Array.isArray(msgList) && msgList.length > 0) {
        const normalized = msgList.map((m, idx) => ({
          id: m.id || `${id}_${idx}`,
          sender: m.sender || (m.role === "user" ? "user" : "bot"),
          text: m.text || m.content || "",
          fileName: m.fileName || null,
        }));
        setChats((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            id,
            messages: normalized,
          },
        }));
      }
    } catch (err) {
      console.warn("Could not sync remote history:", err);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await resetHistory(id);
    } catch (err) {
      console.warn("Server delete failed or endpoint unavailable:", err);
    }

    setChats((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    if (currentChatId === id) {
      setCurrentChatId(null);
    }
  };

  const handleResetHistory = async () => {
    if (currentChatId) {
      try {
        await resetHistory(currentChatId);
      } catch (err) {
        console.warn("Reset history API call failed:", err);
      }
    }

    setChats({});
    setCurrentChatId(null);
    setInput("");
    localStorage.removeItem(STORAGE_KEY_CHATS);
    localStorage.removeItem(STORAGE_KEY_CURRENT);
    sessionStorage.removeItem("aerix_session_active");
    setIsMobileOpen(false);
  };

  return (
    <div className="chat-page-layout">
      <Sidebar
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        recents={recents}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onResetHistory={handleResetHistory}
        onDeleteChat={handleDeleteChat}
      />

      <ChatPanel
        messages={activeMessages}
        loading={loading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onEditMessage={handleEditMessage}
        onToggleSidebar={() => setIsMobileOpen((prev) => !prev)}
      />
    </div>
  );
}
