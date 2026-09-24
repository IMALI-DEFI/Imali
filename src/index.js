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
