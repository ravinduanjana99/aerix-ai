import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollTo = (id) => {
    // If we're already on the landing page, scroll smoothly
    if (location.pathname === "/") {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // If on another page, navigate home first
      navigate("/", { state: { scrollTo: id } });
    }
  };

  return (
    <nav className="fade-in">
      <h2>
        AERIX<span>.ai</span>
      </h2>
      <div className="nav-links" onClick={() => handleScrollTo("hero")}>
        <Link to="/">Home</Link>
        <button className="nav-btn" onClick={() => handleScrollTo("about")}>
          About
        </button>
        <button className="nav-btn" onClick={() => handleScrollTo("features")}>
          Features
        </button>
        <Link to="/chat">Chat</Link>
      </div>
    </nav>
  );
}