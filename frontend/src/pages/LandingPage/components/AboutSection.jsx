import React from "react";
import "./AboutSection.css";

export default function AboutSection() {
  return (
    <section id="about" className="about-section">
      <h2 className="section-title fade-in">
        From Static PDF Reader to
        <br />
        Autonomous Spatial Synthesizer
      </h2>

      <div className="about-content fade-in">
        <p>
          What started as a single-purpose telecom PDF assistant has
          evolved into a hyper-dimensional AI engine. We stripped away basic
          chat boxes and built a fully immersive operational environment.
        </p>
        <p>
          By combining real-time Sinhala vocal neural translation, instant
          3D object rendering, and high-velocity code and content
          synthesis, AERIX bridges human expression and digital reality.
        </p>
      </div>
    </section>
  );
}