import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import FeaturesSection from "./components/FeaturesSection";
import FooterSection from "./components/FooterSection";
import "./LandingPage.css";

export default function LandingPage() {
  const location = useLocation();

  // Handle scroll target when redirected from another page
  useEffect(() => {
    if (location.state?.scrollTo) {
      const element = document.getElementById(location.state.scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  // IntersectionObserver to trigger smooth fade-in animations on scroll
  useEffect(() => {
    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("appear");
          observer.unobserve(entry.target);
        }
      });
    };

    const observerOptions = {
      threshold: 0.15,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const fadeElements = document.querySelectorAll(".fade-in");

    fadeElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-container">
      {/* Navbar Component */}
      <Navbar />

      {/* Ambient Red Background Glow */}
      <div className="radial-ambient-glow" />

      {/* Main Content Wrapper */}
      <main className="main-wrapper">
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <FooterSection />
      </main>
    </div>
  );
}