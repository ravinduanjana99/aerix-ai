import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Search, 
  RotateCcw, 
  PanelLeftClose, 
  PanelLeftOpen, 
  MoreVertical, 
  Trash2, 
  X,
  ChevronDown,
  ChevronRight,
  Box
} from "lucide-react";
import "./Sidebar.css";

const Sidebar = ({ 
  isOpenMobile, 
  onCloseMobile, 
  onNewChat, 
  onResetHistory, 
  recents = [], 
  currentChatId, 
  onSelectChat, 
  onDeleteChat 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isRecentsOpen, setIsRecentsOpen] = useState(true); // State for Recents collapse/expand
  const [activeMenuId, setActiveMenuId] = useState(null);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".item-dropdown-menu") && !e.target.closest(".menu-btn")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDesktopCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setActiveMenuId(null);
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (onDeleteChat) onDeleteChat(id);
    setActiveMenuId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile} 
          onTouchStart={onCloseMobile}
        />
      )}

      <aside 
        ref={sidebarRef}
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isOpenMobile ? "mobile-open" : ""}`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <h2 className="sidebar-logo">
            {isCollapsed ? "A" : <>AERIX<span>.ai</span></>}
          </h2>
          
          <button 
            className="collapse-btn desktop-only" 
            onClick={toggleDesktopCollapse} 
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button 
            className="collapse-btn mobile-only" 
            onClick={onCloseMobile} 
            title="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="sidebar-actions">
          <button className="new-chat-btn" onClick={onNewChat} title="New Chat">
            <MessageSquare size={18} />
            {!isCollapsed && <span>New Chat</span>}
          </button>
          <button className="studio-3d-btn" onClick={() => navigate("/studio")} title="3D Canvas Studio">
            <Box size={18} className="box-icon" />
            {!isCollapsed && <span>3D Studio</span>}
          </button>
          <button className="search-chat-btn" title="Search in Chats">
            <Search size={18} />
            {!isCollapsed && <span>Search in Chats</span>}
          </button>
        </div>

        {/* Collapsible Recents Section */}
        {!isCollapsed && (
          <div className="sidebar-recents-section">
            <button 
              className="recents-header-btn" 
              onClick={() => setIsRecentsOpen((prev) => !prev)}
            >
              <span className="recents-title">Recents</span>
              {isRecentsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {isRecentsOpen && (
              <div className="recents-list">
                {recents.length === 0 ? (
                  <div className="no-recents">No recent chats</div>
                ) : (
                  recents.map((chat) => (
                    <div
                      key={chat.id}
                      className={`recent-item ${chat.id === currentChatId ? "active" : ""}`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <span className="recent-text">{chat.title || "New Chat"}</span>

                      <button 
                        className="menu-btn" 
                        onClick={(e) => toggleMenu(e, chat.id)} 
                        title="Options"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenuId === chat.id && (
                        <div className="item-dropdown-menu">
                          <button 
                            className="delete-action-btn" 
                            onClick={(e) => handleDelete(e, chat.id)}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="reset-btn" onClick={onResetHistory} title="Reset Chat History">
            <RotateCcw size={18} />
            {!isCollapsed && <span>Reset Chat History</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;