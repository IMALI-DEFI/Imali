// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

/**
 * API Base resolution
 */
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // 1️⃣ Authenticate user
      const loginRes = await axios.post(
        `${API_BASE}/api/login`,
        { email: email.trim(), password },
        { withCredentials: true, timeout: 15000 }
      );

      if (!loginRes.data?.ok) {
        throw new Error("Login failed");
      }

      // Optional: store email only (for UI convenience)
      localStorage.setItem("IMALI_EMAIL", email.trim());

      // 2️⃣ Ask backend for activation truth
      const statusRes = await axios.get(
        `${API_BASE}/api/me/activation-status`,
        { withCredentials: true, timeout: 15000 }
      );

      const status = statusRes.data?.status;

      if (!status) {
        throw new Error("Unable to verify account status");
      }

      /**
       * Backend is the single source of truth:
       * status = {
       *   stripe_active: boolean,
       *   api_connected: boolean,
       *   bot_selected: boolean,
       *   complete: boolean
       * }
       */

      // 3️⃣ Route based on activation state
      if (status.complete) {
        navigate("/members", { replace: true });
        return;
      }

      // Stripe paid but API not connected
      if (status.stripe_active && !status.api_connected) {
        navigate("/activation", { replace: true });
        return;
      }

      // Not paid yet → back to signup
      navigate("/signup", { replace: true });
    } catch (err) {
      console.error("Login error:", err);

      let msg = "Login failed.";
      if (err.response?.data?.detail) msg = err.response.data.detail;
      if (err.message) msg = err.message;

      setError(msg);
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

        <p className="text-sm text-center text-white/70 mb-6">
          Resume setup or continue trading
        </p>

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
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-400 outline-none"
            required
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
