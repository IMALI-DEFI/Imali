import React, { useMemo, useState, useEffect } from "react";
import {
  useNavigate,
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const VALID_TIERS = ["starter", "pro", "elite", "stock", "bundle"];

const TIER_LABELS = {
  starter: {
    name: "Starter",
    price: "Free",
    summary: "Beginner access, simulator access, and paper-friendly onboarding.",
  },
  pro: {
    name: "Pro",
    price: "$19/mo",
    summary: "More tools, stronger analytics, and expanded automation.",
  },
  elite: {
    name: "Elite",
    price: "$49/mo",
    summary: "Advanced features, deeper automation, and stronger trading controls.",
  },
  stock: {
    name: "DeFi",
    price: "$99/mo",
    summary: "DEX-focused automation tools and DeFi trading features.",
  },
  bundle: {
    name: "Bundle",
    price: "$199/mo",
    summary: "Full platform access across trading, automation, and analytics.",
  },
};

const ENTERPRISE_TIERS = {
  starter: {
    name: "Community Demo",
    price: "Pilot",
    summary:
      "Simulation-based access for education, workforce, and community programs.",
  },
  pro: {
    name: "Program Pilot",
    price: "Custom",
    summary:
      "Expanded organization pilot with participant tracking and reporting.",
  },
  elite: {
    name: "Enterprise Lab",
    price: "Custom",
    summary:
      "Advanced organization access for workforce, education, and innovation programs.",
  },
  stock: {
    name: "Innovation Lab",
    price: "Custom",
    summary:
      "Sandbox-style access for AI, automation, analytics, and financial education.",
  },
  bundle: {
    name: "Full Organization Suite",
    price: "Custom",
    summary:
      "Complete organization package with simulation, analytics, and admin visibility.",
  },
};

const STRATEGIES = {
  ai_weighted: {
    title: "AI Weighted",
    badge: "Recommended",
    risk: "Balanced",
    bestFor: "Most users and programs",
    explanation:
      "Blends multiple signals and gives more weight to stronger opportunities.",
    enterpriseExplanation:
      "Helps participants understand how AI-assisted decision systems compare multiple signals before taking action.",
    example:
      "Instead of trusting one clue, it scores several clues before entering a trade.",
  },
  momentum: {
    title: "Momentum",
    badge: "Trend-following",
    risk: "Medium to High",
    bestFor: "Users who like strong market moves",
    explanation:
      "Looks for assets already moving strongly and tries to ride the trend.",
    enterpriseExplanation:
      "Shows participants how automated systems can identify trends and react to market movement.",
    example:
      "If a coin keeps pushing higher with strength, Momentum may try to follow that move.",
  },
  mean_reversion: {
    title: "Mean Reversion",
    badge: "More conservative",
    risk: "Lower",
    bestFor: "Users who want steadier entries",
    explanation:
      "Looks for assets that may have moved too far and could return closer to normal.",
    enterpriseExplanation:
      "Teaches participants how systems can look for overextended moves and possible recovery zones.",
    example:
      "If a stock drops too fast and looks oversold, it may look for a bounce instead of chasing.",
  },
  volume_spike: {
    title: "Volume Spike",
    badge: "Fast action",
    risk: "Higher",
    bestFor: "Users comfortable with more volatility",
    explanation:
      "Watches for sudden bursts in trading volume that may signal a breakout.",
    enterpriseExplanation:
      "Demonstrates how activity spikes can be used as signals in automated decision-making.",
    example:
      "If activity suddenly explodes, the bot may treat that as a sign something important is happening.",
  },
};

const normalizeTier = (value) => {
  const tier = String(value || "").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
};

const safeGetLocalStorage = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // fail silently
  }
};

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();

  const mode = String(searchParams.get("mode") || "").toLowerCase();
  const isEnterprise = mode === "enterprise" || mode === "organization";

  const labels = isEnterprise ? ENTERPRISE_TIERS : TIER_LABELS;

  const initialTier = useMemo(() => {
    const queryTier = searchParams.get("tier");
    const stateTier = location.state?.selectedTier;
    const savedTier = safeGetLocalStorage("imali_selected_tier", "starter");

    return normalizeTier(queryTier || stateTier || savedTier || "starter");
  }, [searchParams, location.state]);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    tier: initialTier,
    strategy: "ai_weighted",
    acceptTerms: false,
    organizationName: "",
    contactName: "",
    useCase: "financial_literacy",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, tier: initialTier }));
  }, [initialTier]);

  useEffect(() => {
    safeSetLocalStorage("imali_selected_tier", form.tier);
  }, [form.tier]);

  const currentStrategy = STRATEGIES[form.strategy];
  const currentTier = labels[form.tier] || labels.starter;

  const validate = () => {
    if (isEnterprise && !form.organizationName.trim()) {
      return "Organization name is required.";
    }

    if (isEnterprise && !form.contactName.trim()) {
      return "Contact name is required.";
    }

    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (form.password.length > 72) {
      return "Password must be 72 characters or less.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    if (!form.acceptTerms) {
      return "You must accept the Terms and Privacy Policy.";
    }

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
        mode: isEnterprise ? "enterprise" : "consumer",
        organizationName: form.organizationName.trim(),
        contactName: form.contactName.trim(),
        useCase: form.useCase,
      });

      if (!signupResult?.success) {
        setError(signupResult?.error || "Signup failed. Please try again.");
        setStep("");
        setLoading(false);
        return;
      }

      safeSetLocalStorage("IMALI_EMAIL", email);
      safeSetLocalStorage("IMALI_TIER", form.tier);
      safeSetLocalStorage("IMALI_STRATEGY", form.strategy);
      safeSetLocalStorage("IMALI_MODE", isEnterprise ? "enterprise" : "consumer");

      if (isEnterprise) {
        safeSetLocalStorage("IMALI_ORGANIZATION", form.organizationName.trim());
        safeSetLocalStorage("IMALI_CONTACT_NAME", form.contactName.trim());
        safeSetLocalStorage("IMALI_USE_CASE", form.useCase);
      }

      setStep("redirecting");

      navigate(isEnterprise ? "/billing?mode=enterprise" : "/billing", {
        replace: true,
        state: {
          email,
          tier: form.tier,
          strategy: form.strategy,
          fromSignup: true,
          mode: isEnterprise ? "enterprise" : "consumer",
          organizationName: form.organizationName.trim(),
          contactName: form.contactName.trim(),
          useCase: form.useCase,
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
        return isEnterprise ? "Creating pilot account…" : "Creating account…";
      case "redirecting":
        return isEnterprise ? "Preparing pilot setup…" : "Redirecting to billing…";
      default:
        return loading
          ? "Please wait…"
          : isEnterprise
          ? "Create pilot account"
          : "Create account & continue";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-28">
      <div className="w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="mb-7">
          <div className="inline-flex mb-4 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
            {isEnterprise ? "IMALI Enterprise / Community Lab" : "IMALI Trading Platform"}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {isEnterprise ? "Create your organization demo account" : "Create your account"}
          </h1>

          <p className="text-gray-400">
            {isEnterprise
              ? "Set up a safe simulation account for financial education, workforce training, and program demos."
              : "Start with AI-powered trading tools, strategy selection, and paper-friendly onboarding."}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-sm text-gray-300">
            {isEnterprise ? "Selected pilot option" : "Selected plan"}
          </div>

          <div className="mt-1 text-xl font-bold text-white">
            {currentTier.name}{" "}
            <span className="text-emerald-400">{currentTier.price}</span>
          </div>

          <div className="text-sm text-gray-400">{currentTier.summary}</div>

          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to={isEnterprise ? "/enterprise" : "/pricing"}
              className="text-sm text-emerald-300 underline"
            >
              {isEnterprise ? "Back to enterprise overview" : "Change plan"}
            </Link>

            {!isEnterprise && (
              <Link
                to="/signup?mode=enterprise"
                className="text-sm text-blue-300 underline"
              >
                Signing up for an organization?
              </Link>
            )}

            {isEnterprise && (
              <Link to="/signup" className="text-sm text-blue-300 underline">
                Signing up as an individual?
              </Link>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isEnterprise && (
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Organization / program name"
                value={form.organizationName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, organizationName: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />

              <input
                type="text"
                required
                placeholder="Your name"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder={isEnterprise ? "Work email" : "Email"}
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
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
              {isEnterprise ? (
                <>
                  <option value="starter">Community Demo</option>
                  <option value="pro">Program Pilot</option>
                  <option value="elite">Enterprise Lab</option>
                  <option value="stock">Innovation Lab</option>
                  <option value="bundle">Full Organization Suite</option>
                </>
              ) : (
                <>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                  <option value="stock">DeFi</option>
                  <option value="bundle">Bundle</option>
                </>
              )}
            </select>
          </div>

          {isEnterprise && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Main use case
              </label>

              <select
                value={form.useCase}
                onChange={(e) =>
                  setForm((f) => ({ ...f, useCase: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="financial_literacy">Financial literacy program</option>
                <option value="workforce_training">Workforce training</option>
                <option value="small_business">Small business support</option>
                <option value="innovation_sandbox">Innovation sandbox</option>
                <option value="education">School / education program</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">
              {isEnterprise
                ? "Choose a learning strategy model"
                : "Choose your strategy"}
            </div>

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
                      <div className="font-semibold text-white">
                        {strategy.title}
                      </div>

                      <span className="text-[11px] px-2 py-1 rounded-full bg-gray-700 text-gray-200">
                        {strategy.badge}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-300">
                      {isEnterprise
                        ? strategy.enterpriseExplanation
                        : strategy.explanation}
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                      <div>
                        <span className="font-semibold text-gray-300">
                          Risk:
                        </span>{" "}
                        {strategy.risk}
                      </div>

                      <div>
                        <span className="font-semibold text-gray-300">
                          Best for:
                        </span>{" "}
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
              {isEnterprise && (
                <>
                  {" "}
                  and understand this pilot/demo uses simulation-first tools unless
                  live access is separately approved.
                </>
              )}
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold disabled:opacity-50 hover:from-blue-500 hover:to-purple-500 transition"
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