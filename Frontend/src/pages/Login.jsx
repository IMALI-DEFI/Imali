// src/pages/Login.jsx
import React, { useMemo, useState, useCallback } from "react";
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

function parseApiError(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.data?.error ||
    err?.data?.message ||
    err?.message ||
    fallback
  );
}

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleClose = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setEmail(initialEmail || "");
    onClose();
  }, [initialEmail, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setStatus("loading");
    setMessage("");

    try {
      const result = await BotAPI.forgotPassword(normalizedEmail);

      if (!result?.success) {
        throw new Error(result?.error || "Failed to send reset email.");
      }

      setStatus("success");
      setMessage("Password reset link sent. Check your email.");

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage(parseApiError(err, "Failed to send reset email. Please try again."));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-white"
          aria-label="Close reset password modal"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <h2 className="mb-2 text-2xl font-bold text-white">Reset Password</h2>
          <p className="mb-6 text-sm text-gray-400">
            Enter your email address and we&apos;ll send you a reset link.
          </p>

          {message && (
            <div
              className={`mb-4 rounded-xl border p-3 text-sm ${
                status === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
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
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status === "loading" || status === "success"}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-gray-700 px-4 py-3 text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            If an account exists, a reset link will be sent.
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

  const expiredMessage = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      return params.get("expired") === "true";
    } catch {
      return false;
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!normalizedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await login(normalizedEmail, trimmedPassword);

      if (!result?.success) {
        setError(result?.error || "Login failed. Please try again.");
        return;
      }

      try {
        localStorage.setItem("IMALI_EMAIL", normalizedEmail);
      } catch (err) {
        console.warn("[Login] Failed to store IMALI_EMAIL:", err);
      }

      navigate(destination, { replace: true });
    } catch (err) {
      console.error("[Login] Login error:", err);
      setError(parseApiError(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="mb-2 text-center text-3xl font-extrabold">Log in to IMALI</h1>

        {expiredMessage && !error && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            Your session expired. Please log in again.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {location.state?.message && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-200">
            {location.state.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="email"
            disabled={loading}
            inputMode="email"
          />

          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoComplete="current-password"
            disabled={loading}
          />

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-bold transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/60">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-emerald-300 underline hover:text-emerald-200">
            Create one
          </Link>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-gray-500">
          Demo: demo@imali-defi.com / demo123
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />
    </div>
  );
}
