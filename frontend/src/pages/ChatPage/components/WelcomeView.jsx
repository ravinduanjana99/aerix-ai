import React from "react";
import { useNavigate } from "react-router-dom";
import ChatInput from "./ChatInput";

import "./WelcomeView.css";

export default function WelcomeView({ input, setInput, onSend }) {
  const navigate = useNavigate();

  // Quick starter prompts
  const promptChips = [
    { label: "✦ 3D Studio Canvas", isStudio: true },
    { label: "Code </>", prompt: "Help me write code for " },
    { label: "About Creator", prompt: "Who created AERIX and what are his technical achievements?" },
    { label: "Write", prompt: "Draft a response about " },
  ];

  const handleChipClick = (chip) => {
    if (chip.isStudio) {
      navigate("/studio");
      return;
    }
    setInput(chip.prompt);
  };

  return (
    <div className="welcome-container">
      {/* Hero Greeting */}
      <div className="welcome-hero">
        <h1 className="welcome-title">Hello There!</h1>
        <p className="welcome-subtitle">
          Welcome to AERIX Neural Interface. I am your intelligent spatial co-pilot.
        </p>
      </div>

      {/* Central Input & Prompt Buttons */}
      <div className="welcome-input-wrapper">
        <ChatInput input={input} setInput={setInput} onSend={onSend} />

        {/* Quick Action Chips */}
        <div className="prompt-chips">
          {promptChips.map((chip, index) => (
            <button
              key={index}
              className={`chip-btn ${chip.isStudio ? "chip-3d-btn" : ""}`}
              onClick={() => handleChipClick(chip)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="welcome-disclaimer">AI Can Make Mistakes</div>
    </div>
  );
}