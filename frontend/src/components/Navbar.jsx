import React from "react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ isOpen, setIsOpen ] = useState(false);

  // Hide the navbar entirely if the user is on the /chat page (both mobile and desktop)
  if (location.pathname === "/chat") {
    return null;
  }

  const handleScrollTo = (id) => {
    if (location.pathname === "/") {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollTo: id } });
    }
  };

  return (
    <nav className="fade-in">
      <h2>
        AERIX<span>.ai</span>
      </h2>

      <button
        className={`hamburger ${isOpen ? "hamburger-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links ${isOpen ? "nav-links-open" : ""}`}>
        <button className="nav-btn" onClick={() => { handleScrollTo("hero"); setIsOpen(false); }}>
          Home
        </button>
        <button className="nav-btn" onClick={() => { handleScrollTo("about"); setIsOpen(false); }}>
          About
        </button>
        <button className="nav-btn" onClick={() => { handleScrollTo("features"); setIsOpen(false); }}>
          Features
        </button>
        <Link to="/studio" className="nav-3d-pill" onClick={() => setIsOpen(false)}>
          3D Studio
        </Link>
        <Link to="/chat" onClick={() => setIsOpen(false)}>Chat</Link>
      </div>
    </nav>
  );
}