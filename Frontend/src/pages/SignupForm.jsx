// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

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

  const validate = () => {
    if (!form.email.trim()) return "Email is required.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    if (!form.acceptTerms)
      return "You must accept the Terms and Privacy Policy.";
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

    try {
      const email = form.email.trim().toLowerCase();

      // 1️⃣ Create account
      await BotAPI.signup({
        email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      // 2️⃣ Automatically log in
      await BotAPI.login({
        email,
        password: form.password,
      });

      // 3️⃣ Always go to billing (onboarding step 1)
      navigate("/billing", { replace: true });

    } catch (err) {
      console.error("[Signup] Error:", err);

      if (err.response?.status === 409) {
        setError("An account with this email already exists.");
      } else if (err.response?.status === 400) {
        setError("Invalid signup information.");
      } else if (err.code === "ERR_NETWORK") {
        setError("Network error. Please try again.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">
          Create your account
        </h1>
        <p className="text-gray-400 mb-6">
          Start trading with AI in minutes
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          />

          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          />

          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmPassword: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          />

          <select
            value={form.strategy}
            onChange={(e) =>
              setForm((f) => ({ ...f, strategy: e.target.value }))
            }
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
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  acceptTerms: e.target.checked,
                }))
              }
              className="mt-1"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="text-blue-400 underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-blue-400 underline">
                Privacy Policy
              </Link>
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
          <Link to="/login" className="text-blue-400 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
