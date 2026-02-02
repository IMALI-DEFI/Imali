// src/pages/Login.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

/* ---------------- API base resolver (match your app) ---------------- */
const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API_BASE = String(API_ORIGIN).replace(/\/+$/, "");

/** Must match BotAPI.js */
const TOKEN_KEY = "imali_token";

/* ---------------- axios client ---------------- */
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // harmless even if you use tokens
});

// Inject token automatically (if present)
api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch {
    // ignore
  }
  return cfg;
});

function saveTokenFromResponse(data) {
  const token =
    data?.token ||
    data?.access_token ||
    data?.auth_token ||
    data?.jwt ||
    data?.data?.token ||
    "";

  if (!token) return false;

  try {
    localStorage.setItem(TOKEN_KEY, String(token).trim());
    return true;
  } catch {
    return false;
  }
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailTrimmed = useMemo(() => email.trim(), [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // 1) Login (your backend MUST implement POST /api/login for this to succeed)
      // If you don’t have it yet, you should add it OR change this page to not exist.
      const loginRes = await api.post("/login", {
        email: emailTrimmed,
        password,
      });

      // Some backends return { ok: true }, some { success: true }, etc.
      const ok =
        loginRes.data?.ok === true ||
        loginRes.data?.success === true ||
        !!loginRes.data?.user ||
        !!loginRes.data?.token ||
        !!loginRes.data?.access_token;

      if (!ok) {
        throw new Error(
          loginRes.data?.message ||
            loginRes.data?.error ||
            "Login failed"
        );
      }

      // Store email (optional)
      try {
        localStorage.setItem("IMALI_EMAIL", emailTrimmed);
      } catch {}

      // Store token if backend provided one (token auth path)
      // If your backend uses cookies instead, this just won’t store anything—still fine.
      saveTokenFromResponse(loginRes.data);

      // 2) Ask backend for activation truth (GET /api/me/activation-status exists in your route list)
      const statusRes = await api.get("/me/activation-status");
      const status = statusRes.data?.status || statusRes.data || null;

      if (!status) {
        // If status endpoint is down, at least try to enter activation page
        navigate("/activation", { replace: true });
        return;
      }

      // 3) Route based on activation state (align to your Activation.jsx fields)
      const billingComplete = !!status.billing_complete;
      const tradingEnabled = !!status.trading_enabled;

      // fallback for older keys (just in case)
      const complete =
        status.complete === true ||
        status.stripe_webhook_confirmed === true ||
        (billingComplete && tradingEnabled);

      if (complete || (billingComplete && tradingEnabled)) {
        navigate("/MemberDashboard", { replace: true });
        return;
      }

      // Not complete → activation page shows the remaining steps
      navigate("/activation", { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed.";

      // If /api/login doesn't exist, call it out clearly:
      if (String(msg).includes("404") || err?.response?.status === 404) {
        setError(
          "Backend route POST /api/login was not found. Add /api/login on the server or remove Login and use a tokenless flow."
        );
      } else {
        setError(msg);
      }
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

        <p className="text-sm text-center text-white/70 mb-4">
          Resume setup or continue trading
        </p>

        <div className="text-center text-xs text-white/40 mb-5">
          API: {API_BASE}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-400 outline-none"
            required
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-400 outline-none"
            required
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed font-bold transition"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/60">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-emerald-300 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
