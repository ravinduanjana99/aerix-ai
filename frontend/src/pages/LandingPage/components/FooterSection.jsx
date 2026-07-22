import React from "react";
import "./FooterSection.css";

export default function FooterSection() {
  return (
    <footer className="footer-section fade-in">
      <div className="footer-logo">
        AERIX<span>.ai</span>
      </div>

      <p className="disclaimer">
        "This deployment is an interactive sandbox prototype. Core systems—including
        real-time Sinhala voice synthesis, WebGL spatial rendering, and deep context
        LLM reasoning are operating under active development parameters."
      </p>

      <div className="status-badges">
        <span className="badge">SYSTEM: ONLINE</span>
        <span className="badge">STATUS: STAGING ENVIRONMENT</span>
        <span className="badge">REVISION: DEMO-V2</span>
      </div>
    </footer>
  );
}