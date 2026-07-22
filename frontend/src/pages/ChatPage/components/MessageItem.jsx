import ReactMarkdown from "react-markdown";
import "./MessageItem.css";

export default function MessageItem({ sender, text }) {
  const isBot = sender === "AERIX";

  return (
    <div className={`chat-message ${isBot ? "bot" : "user"}`}>
      {isBot ? <ReactMarkdown>{text}</ReactMarkdown> : text}
    </div>
  );
}