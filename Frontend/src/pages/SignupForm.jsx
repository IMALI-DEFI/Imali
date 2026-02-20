import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup, login } = useAuth();

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
  const [step, setStep] = useState(""); // '', 'creating', 'logging-in', 'redirecting'

  const validate = () => {
    if (!form.email.trim()) return "Email is required.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password.length > 72)
      return "Password must be 72 characters or less.";
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

    const email = form.email.trim().toLowerCase();

    try {
      // ── Step 1: Create account ──
      setStep("creating");
      console.log("[Signup] Creating account...");

      const signupResult = await signup({
        email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      if (!signupResult.success) {
        setError(signupResult.error);
        setLoading(false);
        setStep("");
        return;
      }

      console.log("[Signup] Account created successfully");

      // Small delay between signup and login to avoid 429
      await new Promise((r) => setTimeout(r, 1000));

      // ── Step 2: Log in ──
      setStep("logging-in");
      console.log("[Signup] Logging in...");

      const loginResult = await login(email, form.password);

      if (!loginResult.success) {
        // Login failed but account was created
        // Send them to login page with a message
        console.warn("[Signup] Auto-login failed, redirecting to login");
        setError("");
        navigate("/login", {
          replace: true,
          state: {
            message: "Account created! Please log in to continue.",
            email: email,
          },
        });
        return;
      }

      console.log("[Signup] Login successful");

      // ── Step 3: Store metadata for billing page ──
      localStorage.setItem("IMALI_EMAIL", email);
      localStorage.setItem("IMALI_TIER", form.tier);

      // ── Step 4: Navigate to billing immediately ──
      // Don't wait for loadUserData — the token is saved,
      // billing page will work
      setStep("redirecting");
      console.log("[Signup] Navigating to /billing...");

      navigate("/billing", {
        replace: true,
        state: {
          email: email,
          tier: form.tier,
          strategy: form.strategy,
          fromSignup: true,
        },
      });
    } catch (err) {
      console.error("[Signup] Unexpected error:", err);

      const status = err?.response?.status;

      if (status === 409) {
        setError("An account with this email already exists.");
      } else if (status === 400) {
        setError(err.response?.data?.message || "Invalid signup information.");
      } else if (status === 429) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (status === 503 || status >= 500) {
        setError("Service temporarily unavailable. Please try again.");
      } else if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
        setError("Unable to connect to server. Please check your connection.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }

      setStep("");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    switch (step) {
      case "creating":
        return "Creating account…";
      case "logging-in":
        return "Signing in…";
      case "redirecting":
        return "Redirecting to billing…";
      default:
        return loading ? "Please wait…" : "Create account & continue";
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
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
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
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
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
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          <select
            value={form.strategy}
            onChange={(e) =>
              setForm((f) => ({ ...f, strategy: e.target.value }))
            }
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
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
              disabled={loading}
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {getButtonText()}
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
