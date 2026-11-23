import React, { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-yaml";

import { 
  FileText, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Volume2, 
  VolumeX, 
  Pencil,
  Terminal,
  Activity
} from "lucide-react";
import "./MessageItem.css";

// Helper for safe Prism syntax highlighting
function highlightCode(code, language) {
  const lang = (language || "").toLowerCase().trim();
  const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.markup;
  if (grammar) {
    try {
      return Prism.highlight(code, grammar, lang);
    } catch (e) {
      console.warn("Prism highlight error:", e);
    }
  }
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Interactive Animated Mermaid Diagram Component
function MermaidDiagram({ chart }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#0d0d12",
            primaryColor: "#ff3344",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#ff3344",
            lineColor: "#ff6b7a",
            secondaryColor: "#1a1a24",
            tertiaryColor: "#121218",
            noteBkgColor: "#1c1c26",
            noteTextColor: "#ffffff"
          },
          securityLevel: "loose",
          fontFamily: "'Inter', sans-serif"
        });

        const id = `mermaid_${Math.random().toString(36).substring(2, 9)}`;
        const { svg: generatedSvg } = await mermaid.render(id, chart.trim());
        if (isMounted) {
          setSvg(generatedSvg);
          setError(null);
        }
      } catch (err) {
        console.warn("Mermaid render error:", err);
        if (isMounted) {
          setError(err.message || "Failed to render diagram");
        }
      }
    };

    if (chart && chart.trim()) {
      renderChart();
    }

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-fallback-box">
        <pre className="code-block-pre">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="mermaid-diagram-card">
      <div className="mermaid-header">
        <div className="mermaid-meta">
          <Activity size={13} className="mermaid-icon" />
          <span className="mermaid-tag">System Diagram</span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="mermaid-viewport" 
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
}

// Dedicated Gemini-Style Code Block Component
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const displayLang = (language || "code").toLowerCase();

  const highlightedHtml = useMemo(() => {
    return highlightCode(code, displayLang);
  }, [code, displayLang]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-block-meta">
          <Terminal size={13} className="code-block-icon" />
          <span className="code-block-lang">{displayLang}</span>
        </div>
        <button
          type="button"
          className="code-block-copy-btn"
          onClick={handleCopyCode}
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? <Check size={12} className="copy-check" /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="code-block-pre">
        <code
          className={`language-${displayLang} code-font-jetbrains`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}

export default function MessageItem({
  sender,
  text,
  fileName,
  isNew = false,
  index,
  onEditMessage,
}) {
  const isUser = sender === "user";
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || "");

  const handleCopy = async () => {
    const contentToCopy = isEditing ? editText : text;
    if (!contentToCopy) return;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReaction = (type) => {
    setReaction((prev) => (prev === type ? null : type));
  };

  const handleSpeak = () => {
    if (!("speechSynthesis" in window) || !text) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Check if text contains Sinhala Unicode characters (U+0D80 to U+0DFF)
    const hasSinhala = /[\u0D80-\u0DFF]/.test(text);
    utterance.lang = hasSinhala ? "si-LK" : "en-US";
    utterance.rate = 1.0;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== text) {
      onEditMessage?.(index, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(text || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`message-row ${isUser ? "user-row" : "bot-row"} ${
        isNew ? "new-message" : ""
      }`}
    >
      <div className={`message-bubble-wrapper ${isUser ? "user-wrapper" : "bot-wrapper"}`}>
        {/* Bot Identity Header */}
        {!isUser && (
          <div className="bot-header">
            <div className="bot-avatar-badge">
              <span className="bot-avatar-letter">A</span>
            </div>
            <span className="bot-name">AERIX</span>
          </div>
        )}

        <div className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"} ${isEditing ? "editing" : ""}`}>
          {/* Render File Attachment Badge if fileName is present */}
          {fileName && (
            <div className="message-file-badge">
              <div className="file-badge-icon">
                <FileText size={15} />
              </div>
              <span className="file-badge-name">{fileName}</span>
            </div>
          )}

          {/* Render Text or Inline Editor */}
          {isEditing ? (
            <div className="message-edit-box">
              <textarea
                className="message-edit-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={Math.max(2, editText.split("\n").length)}
                autoFocus
              />
              <div className="message-edit-buttons">
                <button
                  type="button"
                  className="edit-action-btn cancel-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="edit-action-btn save-btn"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                >
                  Save & Send
                </button>
              </div>
            </div>
          ) : (
            text && (
              <div className="message-text">
                {isUser ? (
                  <p>{text}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeString = String(children).replace(/\n$/, "");
                        const isMultiLine = codeString.includes("\n");
                        const lang = (match ? match[1] : "").toLowerCase();

                        if (lang === "mermaid") {
                          return <MermaidDiagram chart={codeString} />;
                        }

                        if (!match && !isMultiLine && inline !== false) {
                          return (
                            <code className="inline-code code-font-jetbrains" {...props}>
                              {children}
                            </code>
                          );
                        }

                        return (
                          <CodeBlock
                            language={lang}
                            code={codeString}
                          />
                        );
                      },
                      p({ children }) {
                        return <p className="gemini-p">{children}</p>;
                      },
                      h1({ children }) {
                        return <h1 className="gemini-h1">{children}</h1>;
                      },
                      h2({ children }) {
                        return <h2 className="gemini-h2">{children}</h2>;
                      },
                      h3({ children }) {
                        return <h3 className="gemini-h3">{children}</h3>;
                      },
                      ul({ children }) {
                        return <ul className="gemini-ul">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="gemini-ol">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="gemini-li">{children}</li>;
                      },
                      blockquote({ children }) {
                        return <blockquote className="gemini-blockquote">{children}</blockquote>;
                      },
                      strong({ children }) {
                        return <strong className="gemini-strong">{children}</strong>;
                      },
                      table({ children }) {
                        return (
                          <div className="gemini-table-wrapper">
                            <table className="gemini-table">{children}</table>
                          </div>
                        );
                      }
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                )}
              </div>
            )
          )}
        </div>

        {/* User Message Action Toolbar (Pencil & Copy) */}
        {isUser && !isEditing && text && (
          <div className="message-actions user-actions">
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setEditText(text);
                setIsEditing(true);
              }}
              title="Edit message"
              aria-label="Edit message"
            >
              <Pencil size={12} />
              <span className="action-label">Edit</span>
            </button>

            <button
              type="button"
              className={`action-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
              title={copied ? "Copied to clipboard!" : "Copy message"}
              aria-label="Copy message"
            >
              {copied ? <Check size={12} className="copied-icon" /> : <Copy size={12} />}
              <span className="action-label">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}

        {/* Bot Message Action Toolbar (Copy, Reactions, Read Aloud) */}
        {!isUser && text && (
          <div className="message-actions bot-actions">
            <button
              type="button"
              className={`action-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
              title={copied ? "Copied to clipboard!" : "Copy response"}
              aria-label="Copy response"
            >
              {copied ? <Check size={13} className="copied-icon" /> : <Copy size={13} />}
              <span className="action-label">{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              className={`action-btn ${reaction === "like" ? "active-like" : ""}`}
              onClick={() => handleReaction("like")}
              title="Good response"
              aria-label="Thumbs up"
            >
              <ThumbsUp size={13} />
            </button>

            <button
              type="button"
              className={`action-btn ${reaction === "dislike" ? "active-dislike" : ""}`}
              onClick={() => handleReaction("dislike")}
              title="Bad response"
              aria-label="Thumbs down"
            >
              <ThumbsDown size={13} />
            </button>

            {"speechSynthesis" in window && (
              <button
                type="button"
                className={`action-btn ${speaking ? "active-speaking" : ""}`}
                onClick={handleSpeak}
                title={speaking ? "Stop reading" : "Read aloud"}
                aria-label="Read aloud"
              >
                {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="action-label">{speaking ? "Stop" : "Listen"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
