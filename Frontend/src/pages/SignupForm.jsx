import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const VALID_TIERS = ["starter", "pro", "elite", "stock", "bundle"];

const TIER_LABELS = {
  starter: {
    name: "Starter",
    price: "Free",
    summary: "Beginner access and paper-friendly onboarding",
  },
  pro: {
    name: "Pro",
    price: "$19/mo",
    summary: "More tools and stronger analytics",
  },
  elite: {
    name: "Elite",
    price: "$49/mo",
    summary: "Advanced features and deeper automation",
  },
  stock: {
    name: "DeFi",
    price: "$99/mo",
    summary: "DEX-focused trading tools",
  },
  bundle: {
    name: "Bundle",
    price: "$199/mo",
    summary: "Everything in one plan",
  },
};

const STRATEGIES = {
  ai_weighted: {
    title: "AI Weighted",
    badge: "Recommended",
    risk: "Balanced",
    bestFor: "Most users",
    explanation:
      "This strategy blends multiple signals and gives more weight to stronger opportunities.",
    example:
      "Instead of trusting just one clue, it scores several clues before entering a trade.",
  },
  momentum: {
    title: "Momentum",
    badge: "Trend-following",
    risk: "Medium to High",
    bestFor: "Users who like strong market moves",
    explanation:
      "This strategy looks for assets already moving strongly and tries to ride the trend.",
    example:
      "If a coin keeps pushing higher with strength, Momentum may try to follow that move.",
  },
  mean_reversion: {
    title: "Mean Reversion",
    badge: "More conservative",
    risk: "Lower",
    bestFor: "Users who want steadier entries",
    explanation:
      "This strategy looks for assets that may have moved too far and could return closer to normal.",
    example:
      "If a stock drops too fast and looks oversold, it may look for a bounce instead of chasing.",
  },
  volume_spike: {
    title: "Volume Spike",
    badge: "Fast action",
    risk: "Higher",
    bestFor: "Users comfortable with more volatility",
    explanation:
      "This strategy watches for sudden bursts in trading volume that may signal a breakout.",
    example:
      "If activity suddenly explodes, the bot may treat that as a sign something important is happening.",
  },
};

const normalizeTier = (value) => {
  const tier = String(value || "").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();

  const initialTier = useMemo(() => {
    const queryTier = searchParams.get("tier");
    const stateTier = location.state?.selectedTier;
    const savedTier = localStorage.getItem("imali_selected_tier");
    return normalizeTier(queryTier || stateTier || savedTier || "starter");
  }, [searchParams, location.state]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    tier: initialTier,
    strategy: "ai_weighted",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, tier: initialTier }));
  }, [initialTier]);

  useEffect(() => {
    localStorage.setItem("imali_selected_tier", form.tier);
  }, [form.tier]);

  const currentStrategy = STRATEGIES[form.strategy];

  const validate = () => {
    if (!form.email.trim()) return "Email is required.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password.length > 72) return "Password must be 72 characters or less.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.acceptTerms) return "You must accept the Terms and Privacy Policy.";
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
    setStep("creating");

    const email = form.email.trim().toLowerCase();

    try {
      const signupResult = await signup({
        email,
        password: form.password,
        tier: form.tier,
        strategy: form.strategy,
      });

      if (!signupResult.success) {
        setError(signupResult.error || "Signup failed");
        setStep("");
        setLoading(false);
        return;
      }

      localStorage.setItem("IMALI_EMAIL", email);
      localStorage.setItem("IMALI_TIER", form.tier);
      localStorage.setItem("IMALI_STRATEGY", form.strategy);

      setStep("redirecting");
      navigate("/billing", {
        replace: true,
        state: {
          email,
          tier: form.tier,
          strategy: form.strategy,
          fromSignup: true,
        },
      });
    } catch (err) {
      console.error("[Signup] Unexpected error:", err);
      setError(err?.message || "Signup failed. Please try again.");
      setStep("");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    switch (step) {
      case "creating":
        return "Creating account…";
      case "redirecting":
        return "Redirecting to billing…";
      default:
        return loading ? "Please wait…" : "Create account & continue";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-gray-400 mb-6">Start trading with AI in minutes</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-sm text-gray-300">Selected plan</div>
          <div className="mt-1 text-xl font-bold text-white">
            {TIER_LABELS[form.tier].name}{" "}
            <span className="text-emerald-400">{TIER_LABELS[form.tier].price}</span>
          </div>
          <div className="text-sm text-gray-400">{TIER_LABELS[form.tier].summary}</div>
          <div className="mt-3">
            <Link to="/pricing" className="text-sm text-emerald-300 underline">
              Change plan
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />

            <select
              value={form.tier}
              onChange={(e) =>
                setForm((f) => ({ ...f, tier: normalizeTier(e.target.value) }))
              }
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
              <option value="stock">DeFi</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">Choose your strategy</div>

            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(STRATEGIES).map(([value, strategy]) => {
                const selected = form.strategy === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, strategy: value }))}
                    className={`text-left rounded-xl border p-4 transition ${
                      selected
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-500"
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-white">{strategy.title}</div>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-gray-700 text-gray-200">
                        {strategy.badge}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-300">{strategy.explanation}</div>
                    <div className="mt-3 text-xs text-gray-400">
                      <div>
                        <span className="font-semibold text-gray-300">Risk:</span> {strategy.risk}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-300">Best for:</span>{" "}
                        {strategy.bestFor}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
              <div className="font-semibold">{currentStrategy.title}</div>
              <div className="mt-1">{currentStrategy.example}</div>
            </div>
          </div>

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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50"
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
