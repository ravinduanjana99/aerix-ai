import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  ArrowLeft, 
  Code2, 
  Copy, 
  Check, 
  ArrowUp, 
  Loader2,
  Upload,
  Download,
  X
} from "lucide-react";
import ThreeCanvas from "../../components/ThreeCanvas/ThreeCanvas";
import "./ThreeStudio.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const ThreeStudio = () => {
  const [code, setCode] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const res = await axios.post(
        `${API_BASE}/3d/generate`,
        { prompt: prompt.trim() },
        { timeout: 35000 }
      );

      if (res.data && res.data.code) {
        setCode(res.data.code);
        setPrompt("");
      }
    } catch (err) {
      console.error("[ThreeStudio] Generation failed:", err);
      alert("Failed to generate 3D scene. Please try another prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && canvasRef.current) {
      canvasRef.current.importGLB(file);
    }
  };

  const handleExportGLB = () => {
    if (canvasRef.current) {
      canvasRef.current.exportGLB();
    }
  };

  return (
    <div className="studio-page-layout">
      {/* Top Header Matching ChatPanel */}
      <header className="studio-top-header">
        <div className="studio-header-inner">
          <div className="header-brand-section">
            <Link to="/chat" className="studio-back-btn" title="Back to Chat">
              <ArrowLeft size={16} />
              <span>Chat</span>
            </Link>

            <h2 className="studio-brand-logo">
              AERIX<span>.ai</span>
            </h2>

            {/* Model/Status Indicator matching ChatPanel.jsx */}
            <div className="chat-model-indicator studio-indicator">
              <span className="status-dot"></span>
              <span className="model-name">AERIX 3D Studio</span>
              <span className="model-tag">WebGL 2.0</span>
            </div>
          </div>

          <div className="header-actions-section">
            {/* Import GLB */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".glb,.gltf" 
              style={{ display: "none" }} 
              onChange={handleFileChange} 
            />
            <button 
              className="studio-action-btn"
              onClick={handleImportClick}
              title="Import 3D GLB Model"
            >
              <Upload size={14} />
              <span>Import GLB</span>
            </button>

            {/* Export GLB */}
            <button 
              className="studio-action-btn"
              onClick={handleExportGLB}
              title="Export Current Model as .glb"
            >
              <Download size={14} />
              <span>Export GLB</span>
            </button>

            {/* View / Hide Code Side by Side */}
            <button 
              className={`studio-code-toggle ${showCode ? "active" : ""}`}
              onClick={() => setShowCode(!showCode)}
              title="Toggle Side-by-Side Code View"
            >
              <Code2 size={15} />
              <span>{showCode ? "Hide Code" : "View Code"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (Side-by-Side Flex Layout) */}
      <main className="studio-main-workspace">
        {/* Canvas Section */}
        <div className={`canvas-viewport-panel ${showCode ? "split-active" : ""}`}>
          <ThreeCanvas 
            ref={canvasRef} 
            code={code} 
            onCodeGenerated={(newCode) => setCode(newCode)} 
          />

          {/* Clean Red & Black Gradient Empty State (until user generates or imports a model) */}
          {!code && !isGenerating && (
            <div className="studio-empty-state">
              <div className="studio-empty-glow" />
              <h3 className="studio-empty-title">
                AERIX <span>3D Studio</span>
              </h3>
              <p className="studio-empty-subtitle">
                Describe any 3D object below or drop a <code>.glb</code> model to begin
              </p>
            </div>
          )}

          {/* Loading Animation Overlay */}
          {isGenerating && (
            <div className="canvas-generating-overlay">
              <div className="generating-card">
                <Loader2 size={20} className="generating-spinner" />
                <span>Generating 3D Scene...</span>
              </div>
            </div>
          )}

          {/* Bottom Floating Prompt Bar (Matching ChatInput) */}
          <div className="studio-prompt-wrapper">
            <form className="studio-prompt-bar" onSubmit={handleGenerate}>
              <input
                type="text"
                className="studio-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a 3D object to generate (e.g. 'A futuristic rotating cyber core')..."
                disabled={isGenerating}
                autoFocus
              />

              <button 
                type="submit" 
                className="studio-submit-btn"
                disabled={isGenerating || !prompt.trim()}
                title="Generate 3D"
              >
                {isGenerating ? <Loader2 size={16} className="spinner" /> : <ArrowUp size={16} />}
              </button>
            </form>
          </div>
        </div>

        {/* Side-by-Side Code Panel */}
        {showCode && (
          <aside className="studio-side-code-panel">
            <div className="side-code-header">
              <div className="side-code-title">
                <Code2 size={14} className="code-header-icon" />
                <span>Three.js Script</span>
              </div>
              <div className="side-code-actions">
                <button className="code-btn" onClick={handleCopyCode} title="Copy Code">
                  {copied ? <Check size={13} className="check-icon" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button className="code-btn close-btn" onClick={() => setShowCode(false)} title="Close Panel">
                  <X size={14} />
                </button>
              </div>
            </div>

            <pre className="side-code-editor">
              <code>{code}</code>
            </pre>
          </aside>
        )}
      </main>
    </div>
  );
};

export default ThreeStudio;
