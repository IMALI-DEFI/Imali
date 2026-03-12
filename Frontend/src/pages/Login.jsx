// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

function safeInternalPath(path, fallback = "/activation") {
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  return path;
}

// Forgot Password Modal Component
const ForgotPasswordModal = ({ isOpen, onClose, initialEmail }) => {
  const [email, setEmail] = useState(initialEmail || "");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      await BotAPI.forgotPassword(email.trim().toLowerCase());
      setStatus("success");
      setMessage("Password reset link sent! Check your email.");
      
      // Auto-close after 3 seconds on success
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setEmail("");
      }, 3000);
    } catch (err) {
      setStatus("error");
      const errorMsg = err.response?.data?.message || 
        err.message || 
        "Failed to send reset email. Please try again.";
      setMessage(errorMsg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl">
        {/* Close button */}
        <button
          onClick={() => {
            onClose();
            setStatus("idle");
            setEmail("");
            setMessage("");
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${
              status === "success" 
                ? "bg-green-500/10 border border-green-500/30 text-green-400" 
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === "loading" || status === "success"}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {status === "loading" ? "Sending..." : "Send Reset Link"}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setStatus("idle");
                  setEmail("");
                  setMessage("");
                }}
                className="px-4 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            We'll send a password reset link to your email if an account exists.
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);

  const nextFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      return params.get("next") || "";
    } catch {
      return "";
    }
  }, [location.search]);

  const fromState = useMemo(() => {
    const raw = location.state?.from;
    return typeof raw === "string" ? raw : "";
  }, [location.state]);

  const destination = useMemo(() => {
    const raw = nextFromQuery || fromState || "/activation";
    return safeInternalPath(raw, "/activation");
  }, [nextFromQuery, fromState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await login(normalizedEmail, password);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Check if 2FA required
      if (result.twofaRequired) {
        navigate("/2fa", {
          state: {
            tempToken: result.tempToken,
            email: normalizedEmail,
            destination,
          },
        });
        return;
      }

      localStorage.setItem("IMALI_EMAIL", normalizedEmail);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/5 border border-white/10">
        <h1 className="text-3xl font-extrabold text-center mb-2">
          Log in to IMALI
        </h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {location.state?.message && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-4 py-2 text-sm">
            {location.state.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
            autoComplete="email"
            disabled={loading}
          />

          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500"
            autoComplete="current-password"
            disabled={loading}
          />

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/60">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-emerald-300 underline hover:text-emerald-200"
          >
            Create one
          </Link>
        </div>

        {/* Demo credentials hint (optional - remove in production) */}
        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-center text-gray-500">
          Demo: demo@imali-defi.com / demo123
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </div>
  );
}
