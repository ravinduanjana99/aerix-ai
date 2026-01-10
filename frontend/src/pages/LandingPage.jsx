import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    
    <div className="landing-container">
       <video
        autoPlay
        loop
        muted
        className="background-video"
        src="/background2.mp4" // because it's in public folder
      ></video>
      <section className="hero">
        <h1>Smart Telecom Support Assistant, Powered by <span className="coloured-text">AERIX</span></h1>
        <p>
          Experience fast, reliable, and intelligent assistance with AERIX <br/>The AI-powered 
          virtual assistant designed to provide instant support, answer your queries, and make 
          your interactions with <br/><span className="coloured-text1">NovaTel Communications</span> smoother and more efficient than ever 
          before.
        </p>
        <button onClick={() => navigate("/chat")}>Chat with AERIX</button>
      </section>
    </div>
  );
}
