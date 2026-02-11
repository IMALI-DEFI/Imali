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

    try {
      console.log("[Signup] Creating account for:", form.email.trim());

      // 1️⃣ Create account
      await BotAPI.signup({
        email: form.email.trim(),
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      console.log("[Signup] Account created");

      // 2️⃣ Login
      const loginData = await BotAPI.login({
        email: form.email.trim(),
        password: form.password,
      });

      console.log("[Signup] Login response:", loginData);

      // 3️⃣ Force store token directly
      if (!loginData?.token) {
        throw new Error("No token received from server.");
      }

      localStorage.setItem("imali_token", loginData.token);

      console.log("[Signup] Token saved to localStorage");

      // 4️⃣ Confirm token exists before redirect
      const stored = localStorage.getItem("imali_token");
      if (!stored) {
        throw new Error("Token failed to persist in localStorage.");
      }

      // 5️⃣ Redirect
      navigate("/billing", { replace: true });

    } catch (err) {
      console.error("[Signup] Error:", err);
      setError(err.message || "Signup failed.");
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

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            required
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
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmPassword: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold"
          >
            {loading ? "Creating..." : "Create account & continue"}
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
