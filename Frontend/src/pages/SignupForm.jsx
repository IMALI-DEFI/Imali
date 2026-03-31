// src/pages/Signup.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, login } = useAuth();

  const referralCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ref") || "";
  }, [location.search]);

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || "starter";
  }, [location.search]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    tier: urlTier,
    strategy: "ai_weighted",
    acceptTerms: false,
    subscribeNewsletter: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Update tier if URL param changes
  useEffect(() => {
    setForm(prev => ({ ...prev, tier: urlTier }));
  }, [urlTier]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const email = form.email.trim().toLowerCase();

    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }

    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (form.password.length > 72) {
      return "Password must be 72 characters or less.";
    }

    if (!/[A-Z]/.test(form.password)) {
      return "Password must include at least one uppercase letter.";
    }

    if (!/[a-z]/.test(form.password)) {
      return "Password must include at least one lowercase letter.";
    }

    if (!/[0-9]/.test(form.password)) {
      return "Password must include at least one number.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    if (!form.acceptTerms) {
      return "You must accept the Terms of Service and Privacy Policy.";
    }

    return null;
  };

  const getFriendlyError = (resultOrError) => {
    if (!resultOrError) return "Something went wrong. Please try again.";

    if (typeof resultOrError === "string") return resultOrError;

    return (
      resultOrError.error ||
      resultOrError.message ||
      resultOrError.response?.data?.message ||
      "Something went wrong. Please try again."
    );
  };

  const getTierDescription = (tier) => {
    switch (tier) {
      case "starter":
        return "Free plan - 30% performance fee";
      case "pro":
        return "Pro - $19/mo + 5% performance fee";
      case "elite":
        return "Elite - $49/mo + 5% performance fee";
      case "stock":
        return "DeFi - $99/mo (DEX trading)";
      case "bundle":
        return "Bundle - $199/mo (All bots)";
      default:
        return "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const email = form.email.trim().toLowerCase();

    setLoading(true);
    setError("");
    setStep("creating");

    try {
      const signupPayload = {
        email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
        subscribe_newsletter: form.subscribeNewsletter,
        referral_code: referralCode || undefined,
      };

      console.log("[Signup] Creating account...", {
        email,
        tier: form.tier,
        strategy: form.strategy,
        hasReferralCode: !!referralCode,
      });

      const signupResult = await signup(signupPayload);

      if (!signupResult?.success) {
        setError(getFriendlyError(signupResult));
        setStep("");
        setLoading(false);
        return;
      }

      console.log("[Signup] Account created successfully");
      setShowSuccess(true);

      await new Promise((resolve) => setTimeout(resolve, 800));

      setStep("logging-in");
      console.log("[Signup] Logging in...");

      const loginResult = await login(email, form.password);

      if (!loginResult?.success) {
        console.warn("[Signup] Auto-login failed after signup:", loginResult);

        navigate("/login", {
          replace: true,
          state: {
            message: "Account created successfully. Please log in to continue.",
            email,
          },
        });
        return;
      }

      console.log("[Signup] Login successful");

      localStorage.setItem("IMALI_EMAIL", email);
      localStorage.setItem("IMALI_TIER", form.tier);
      localStorage.setItem(
        "IMALI_NEWSLETTER",
        form.subscribeNewsletter ? "true" : "false"
      );

      setStep("redirecting-to-activation");
      console.log("[Signup] Redirecting to activation...");

      // Redirect to activation page with selected tier
      navigate("/activation", {
        replace: true,
        state: {
          email,
          tier: form.tier,
          strategy: form.strategy,
          fromSignup: true,
          showWelcome: true,
        },
      });
    } catch (err) {
      console.error("[Signup] Unexpected error:", err);
      setError(getFriendlyError(err));
      setStep("");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (showSuccess) return "Account created! 🎉";

    switch (step) {
      case "creating":
        return "Creating account…";
      case "logging-in":
        return "Signing you in…";
      case "redirecting-to-activation":
        return "Setting up your account…";
      default:
        return loading ? "Please wait…" : "Create free account";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black px-4">
      <div className="w-full max-w-lg bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚀</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Start Trading Smarter
          </h1>
          <p className="text-gray-400 mt-2">
            Join the AI-powered trading platform
          </p>
        </div>

        <div className="mb-6 flex justify-between text-xs text-gray-500">
          <span className="text-blue-400">1. Sign Up</span>
          <span>→</span>
          <span>2. Connect Accounts</span>
          <span>→</span>
          <span>3. Start Trading</span>
        </div>

        {referralCode && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
            🎁 Referral code detected: <span className="font-semibold">{referralCode}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {showSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            ✅ Account created! Setting up your account...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading || showSuccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading || showSuccess}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 8 characters, with uppercase, lowercase, and a number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading || showSuccess}
            />
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Select Your Plan
            </label>
            <select
              value={form.tier}
              onChange={(e) => updateField("tier", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={loading || showSuccess}
            >
              <option value="starter">Starter - Free (30% performance fee)</option>
              <option value="pro">Pro - $19/mo + 5% performance fee</option>
              <option value="elite">Elite - $49/mo + 5% performance fee</option>
              <option value="stock">DeFi (New Crypto) - $99/mo</option>
              <option value="bundle">Bundle - $199/mo (All bots)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {getTierDescription(form.tier)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Trading Strategy
            </label>
            <select
              value={form.strategy}
              onChange={(e) => updateField("strategy", e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              disabled={loading || showSuccess}
            >
              <option value="ai_weighted">🤖 AI Weighted (Recommended)</option>
              <option value="momentum">⚡ Momentum Trading</option>
              <option value="mean_reversion">🔄 Mean Reversion</option>
            </select>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.subscribeNewsletter}
                onChange={(e) =>
                  updateField("subscribeNewsletter", e.target.checked)
                }
                className="mt-1 w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                disabled={loading || showSuccess}
              />
              <div className="flex-1">
                <div className="text-sm text-gray-200 font-medium">
                  📧 Get trading insights & updates
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Weekly market analysis, new features, and trading tips.
                  You can unsubscribe anytime.
                </div>
              </div>
            </label>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => updateField("acceptTerms", e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              disabled={loading || showSuccess}
            />
            <div className="text-sm text-gray-400">
              I agree to the{" "}
              <Link
                to="/terms"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Privacy Policy
              </Link>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || showSuccess}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
          >
            {getButtonText()}
          </button>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center mb-3">
              ✨ Your selected plan includes:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> AI-powered trading
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> Paper trading
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> Real-time alerts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> Performance-based fees
              </div>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-400 hover:text-blue-300 underline font-medium"
          >
            Log in
          </Link>
        </p>

        <div className="mt-6 flex justify-center gap-4 text-xs text-gray-600">
          <span>🔒 SSL Encrypted</span>
          <span>💳 Secure Payments</span>
          <span>🛡️ 24/7 Monitoring</span>
        </div>
      </div>
    </div>
  );
}