import React from "react";
import { useNavigate } from "react-router-dom";
import "./HeroSection.css";

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section id = "hero" className="hero-section">
      <h1 className="hero-title fade-in">
        Intelligence, Unbound.
        <br />
        Welcome to the Next Horizon.
      </h1>

      <div className="hero-subheading fade-in">
        Meet <span className="brand-red">AERIX</span>
      </div>

      <p className="hero-description fade-in">
        Your synthetic co-pilot engineered to decode complexity, execute
        tasks at lightspeed, and navigate tomorrow's challenges today.
      </p>

      <button className="primary-btn fade-in" onClick={() => navigate("/chat")}>
        Launch AERIX
      </button>

      <p className="tagline-italic fade-in">
        The future isn't coming—it's running on our servers
      </p>
    </section>
  );
}