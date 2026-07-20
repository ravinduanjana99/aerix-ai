import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";
import ChatPage from "./pages/ChatPage";

function AppContent() {
  const location = useLocation();

  // Check if current route is the chat page
  const isChatPage = location.pathname === "/chat";

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