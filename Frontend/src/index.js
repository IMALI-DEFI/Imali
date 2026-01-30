import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
body::before {
  content: "✅ ACTIVE CSS: src/index.css";
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 999999;
  padding: 8px 10px;
  border-radius: 10px;
  background: red;
  color: white;
  font: 14px/1.2 monospace;
}
