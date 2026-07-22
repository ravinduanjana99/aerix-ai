import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // ✅ explicitly include .jsx


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
