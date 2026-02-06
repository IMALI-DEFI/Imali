import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

/**
 * Login
 * --------------------------------------------------
 * Rules:
 * - ALL auth goes through BotAPI
 * - Token storage handled centrally (BotAPI)
 * - Activation page decides readiness
 * - Login ONLY decides: dashboard vs activation
 */

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
      /* ---------------- Login ---------------- */
      await BotAPI.login({
        email: email.trim(),
        password,
      });

      /* ---------------- Activation truth ---------------- */
      let status = null;
      try {
        status = await BotAPI.activationStatus();
      } catch {
        // non-fatal — activation page will re-check
      }

      const billingComplete = !!status?.billing_complete;
      const tradingEnabled = !!status?.trading_enabled;
      const activationComplete =
        status?.activation_complete === true ||
        (billingComplete && tradingEnabled);

      /* ---------------- Route ---------------- */
      if (activationComplete) {
        navigate("/MemberDashboard", { replace: true });
      } else {
        navigate("/activation", { replace: true });
      }
    } catch (err) {
      console.error("[login] failed:", err);

      if (err?.status === 401) {
        setError("Invalid email or password.");
      } else if (err?.status === 404) {
        setError(
          "Login endpoint not found on server. Ensure POST /api/login exists."
        );
      } else {
        setError(err?.message || "Login failed.");
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 disabled:opacity-60 font-bold transition"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-white/60">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-emerald-300 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
