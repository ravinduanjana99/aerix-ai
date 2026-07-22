import React from "react";
import "./FeaturesSection.css";

export default function FeaturesSection() {
  return (
    <section id="features" className="features-section">
      <h2 className="section-title brand-red fade-in">
        Packed with Powerful Features
      </h2>

      <div className="features-grid">
        <div className="feature-card fade-in">
          <h3>Vocal Neural Link</h3>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </div>
          <p>
            Full voice-to-voice chat with native Sinhala support and continuous
            streaming speed.
          </p>
        </div>

        <div className="feature-card fade-in">
          <h3>Spatial Mesh Generator</h3>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.57 21.82C12.41 21.91 12.21 21.96 12 21.96C11.79 21.96 11.59 21.91 11.43 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.43 2.18C11.59 2.09 11.79 2.04 12 2.04C12.21 2.04 12.41 2.09 12.57 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5ZM12 4.15L5.04 8.05L12 11.95L18.96 8.05L12 4.15Z" />
            </svg>
          </div>
          <p>
            Generates and renders live 3D models and shapes directly in the
            browser via Three.js.
          </p>
        </div>

        <div className="feature-card fade-in">
          <h3>Synthetic Narrative Engine</h3>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" />
            </svg>
          </div>
          <p>
            Full-suite writing assistant for essays, blogs, copy, and creative output.
          </p>
        </div>

        <div className="feature-card fade-in">
          <h3>Code & Architecture Core</h3>
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
            </svg>
          </div>
          <p>
            High-tier coding assistance, syntax generation, and logic debugging.
          </p>
        </div>
      </div>
    </section>
  );
}