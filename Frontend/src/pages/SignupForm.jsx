// src/pages/Signup.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { useAuth } from '../contexts/AuthContext';
export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    tier: "starter",
    strategy: "ai_weighted",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (BotAPI.isLoggedIn()) {
      console.log("[Signup] Already logged in → redirecting to /members");
      navigate("/members", { replace: true });
    }
  }, [navigate]);

  const validate = () => {
    if (!form.email.trim()) return "Email is required";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.acceptTerms) return "You must accept the Terms and Privacy Policy";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("[Signup] Creating account for:", form.email.trim());

      // 1. Signup
      await BotAPI.signup({
        email: form.email.trim(),
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      console.log("[Signup] Account created successfully");

      setSuccess("Account created. Signing you in…");

      // 2. Auto-login
      console.log("[Signup] Starting auto-login...");
      const loginData = await BotAPI.login({
        email: form.email.trim(),
        password: form.password,
      });

      console.log("[Signup] Auto-login response:", loginData);

      // Critical safety check
      const tokenAfterLogin = BotAPI.getToken();
      console.log("[Signup] Token after auto-login:", tokenAfterLogin ? "present" : "MISSING");

      if (!tokenAfterLogin) {
        throw new Error("Auto-login succeeded but no authentication token was received or stored. Please try logging in manually.");
      }

      // 3. Only navigate if we have a token
      console.log("[Signup] Token confirmed → redirecting to billing");
      navigate("/billing", {
        replace: true,
        state: { justSignedUp: true },
      });
    } catch (err) {
      console.error("[Signup] Flow failed:", err);

      let userMessage = "Signup failed. Please try again.";

      if (err.status === 409) {
        userMessage = "An account with this email already exists.";
      } else if (err.status === 400) {
        userMessage = err.message || "Invalid input. Check your details.";
      } else if (err.message?.includes("no authentication token")) {
        userMessage = "Account created, but login failed. Please log in manually from the login page.";
      } else if (err.message) {
        userMessage = err.message;
      }

      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-gray-400 mb-6">Start trading with AI in minutes</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Confirm password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
            disabled={loading}
          />
          <select
            value={form.strategy}
            onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          >
            <option value="ai_weighted">AI Weighted (Recommended)</option>
            <option value="momentum">Momentum</option>
            <option value="mean_reversion">Mean Reversion</option>
          </select>
          <label className="flex items-start gap-3 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
              className="mt-1"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="text-blue-400 underline">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-blue-400 underline">Privacy Policy</Link>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account & continue"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
