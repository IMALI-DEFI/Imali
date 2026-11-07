// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {DashboardRecovery} from "./components/Dashboard/DashboardErrorBoundary";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./context/WalletContext";
import { AuthProvider } from "./context/AuthContext";

// ✅ THIS IS REQUIRED FOR TAILWIND
import "./index.css";
// Fun kit: glossy bouncing buttons, floating emoji tiles, game HUD
import "./styles/imali-fun.css";

// Error boundary to catch and display errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[App] Rendering failed; recovery screen displayed.");
  }
  render() {
    if (this.state.hasError) {
      return <DashboardRecovery />;
    }
    return this.props.children;
  }
}

// Lightweight, user-gesture-triggered interface sounds. No autoplay.
let lastUiSoundAt = 0;
document.addEventListener("click", (event) => {
  if (window.localStorage.getItem("imali_sounds_muted") === "true") return;
  const target = event.target instanceof Element ? event.target.closest("button, a, [role=button]") : null;
  if (!target || target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return;
  const now = Date.now();
  if (now - lastUiSoundAt < 120) return;
  lastUiSoundAt = now;
  const audio = new Audio(target.matches("a") ? "/sounds/navigate.wav" : "/sounds/click.wav");
  audio.volume = 0.16;
  audio.play().catch(() => {});
}, { passive: true });

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
