import { useEffect } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage/LandingPage";
import ChatPage from "./pages/ChatPage/ChatPage";

import "./index.css";

function AppContent() {
  const location = useLocation();

  // Check if current route is the chat page
  const isChatPage = location.pathname === "/chat";

  useEffect(() => {
    // Skip smooth scrolling on the chat page so message inputs stay responsive
    if (isChatPage) return;

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
  }, [isChatPage]);

  return (
    <>
      {/* Show Navbar on all pages EXCEPT /chat */}
      {!isChatPage && <Navbar />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>

      {/* Show Footer on all pages EXCEPT /chat */}
      {!isChatPage && <Footer />}
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