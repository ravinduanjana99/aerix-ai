import { useEffect } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage/LandingPage";
import ChatPage from "./pages/ChatPage/ChatPage";
import ThreeStudio from "./pages/ThreeStudio/ThreeStudio";

import "./index.css";

function AppContent() {
  const location = useLocation();

  // Check if current route is full-screen interactive app (chat or 3D studio)
  const isFullScreenApp = location.pathname === "/chat" || location.pathname === "/studio" || location.pathname === "/canvas";

  useEffect(() => {
    // Skip smooth scrolling on chat & 3D studio pages so interactions stay responsive
    if (isFullScreenApp) return;

    // Initialize Lenis with ultra-slow, heavy inertia parameters
    const lenis = new Lenis({
      lerp: 0.04,            // Low lerp creates a heavy, slow momentum glide delay
      wheelMultiplier: 0.6, // Lowers scroll speed per wheel notch
      smoothWheel: true,
      syncTouch: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [isFullScreenApp]);

  return (
    <>
      {/* Show Navbar on landing pages */}
      {!isFullScreenApp && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/studio" element={<ThreeStudio />} />
        <Route path="/canvas" element={<ThreeStudio />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}