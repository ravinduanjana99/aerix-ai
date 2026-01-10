import { Link } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar() {
  return (
    <nav>
      <h2>AERIX</h2>
      <div>
        <Link to="/">Home</Link>
        <Link to="/chat">Chat</Link>
      </div>
    </nav>
  );
}
