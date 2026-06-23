// src/pages/SignupForm.jsx - REWRITTEN (Simplified: Starter/Pro/Elite + profit share + token context)
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TIERS = {
  starter: {
    name: "Starter",
    price: "$0",
    period: "7‑day trial",
    icon: "🌱",
    requiresPayment: false,
    redirectTo: "/dashboard",
    profitShare: null,
  },
  pro: {
    name: "Pro",
    price: "$19",
    period: "/month",
    icon: "⭐",
    requiresPayment: true,
    redirectTo: "/billing",
    profitShare: 10,
  },
  elite: {
    name: "Elite",
    price: "$49",
    period: "/month",
    icon: "👑",
    requiresPayment: true,
    redirectTo: "/billing",
    profitShare: 8,
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: "🏢",
    requiresPayment: false,
    redirectTo: "/enterprise-pending",
  },
};

export default function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  // Read tier from URL params → route state → default
  const params = new URLSearchParams(location.search);
  const routeTier = location.pathname.split("/").pop(); // handles /signup/:tier
  const stateTier = location.state?.tier;
  const selectedTier =
    params.get("tier") || params.get("plan") ||
    (routeTier && routeTier !== "signup" ? routeTier : null) ||
    stateTier ||
    "starter";

  const validTiers = Object.keys(TIERS);
  const initialTier = validTiers.includes(selectedTier) ? selectedTier : "starter";

  // Billing model & token tier from pricing page state
  const initialBillingModel = location.state?.billingModel || "fixed";
  const initialProfitSharePct = location.state?.profitSharePct || null;
  const initialTokenTier = location.state?.tokenTier || "none";

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    tier: initialTier,
    billingModel: initialBillingModel,
    profitSharePct: initialProfitSharePct,
    tokenTier: initialTokenTier,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync tier from URL changes
  useEffect(() => {
    setForm(f => ({ ...f, tier: initialTier }));
  }, [initialTier]);

  // Sync billing context from location state (e.g., after pricing page selection)
  useEffect(() => {
    setForm(f => ({
      ...f,
      billingModel: initialBillingModel,
      profitSharePct: initialProfitSharePct,
      tokenTier: initialTokenTier,
    }));
  }, [initialBillingModel, initialProfitSharePct, initialTokenTier]);

  const handleTierChange = (tierId) => {
    setForm(f => ({ ...f, tier: tierId }));
    navigate(`/signup?tier=${tierId}`, { replace: true, state: location.state });
  };

  const validate = () => {
    if (!form.email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address";
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
      const result = await signup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        tier: form.tier,
        accepted_terms: form.acceptTerms,
        billingModel: form.billingModel,
        profitSharePct: form.profitSharePct,
        tokenTier: form.tokenTier,
      });

      if (!result?.success) {
        setError(result?.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      // Determine redirect path
      let redirectPath;

      if (result.requiresApproval || form.tier === "enterprise") {
        redirectPath = "/enterprise-pending";
      } else if (form.tier === "starter") {
        redirectPath = "/dashboard";
      } else if (TIERS[form.tier]?.requiresPayment) {
        // Paid tiers → go to billing with full context
        redirectPath = `/billing?tier=${form.tier}&email=${encodeURIComponent(form.email.trim().toLowerCase())}`;
      } else {
        redirectPath = result.redirectTo || TIERS[form.tier]?.redirectTo || "/dashboard";
      }

      navigate(redirectPath, {
        replace: true,
        state: {
          tier: form.tier,
          billingModel: form.billingModel,
          profitSharePct: form.profitSharePct,
          tokenTier: form.tokenTier,
        },
      });
    } catch (err) {
      setError(err?.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  const currentTier = TIERS[form.tier] || TIERS.starter;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-black px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{currentTier.icon}</div>
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400 mt-2">
            {currentTier.name} Plan
            {form.billingModel === "profit_share" && form.profitSharePct
              ? ` · ${form.profitSharePct}% profit share`
              : ` · ${currentTier.price}${currentTier.period}`}
          </p>
        </div>

        {/* Tier Selection */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Select your plan:</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(TIERS).map(([id, tier]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTierChange(id)}
                className={`px-3 py-2 rounded-xl text-center transition-all ${
                  form.tier === id
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="text-xl">{tier.icon}</div>
                <div className="text-xs font-semibold">{tier.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Token discount hint if applicable */}
        {form.tokenTier && form.tokenTier !== "none" && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
            🎉 IMALI token discount active –{" "}
            {form.billingModel === "profit_share"
              ? `profit share reduced accordingly`
              : `${form.tokenTier === "bronze" ? "5%" : form.tokenTier === "silver" ? "10%" : form.tokenTier === "gold" ? "15%" : "20%"} off monthly price`}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Password (minimum 8 characters)"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />

            <label className="flex items-start gap-3 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => setForm(f => ({ ...f, acceptTerms: e.target.checked }))}
                className="mt-1"
                disabled={loading}
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="text-emerald-400 underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold disabled:opacity-50 transition hover:from-emerald-500 hover:to-cyan-500"
            >
              {loading
                ? "Creating account..."
                : form.tier === "starter"
                ? "Start Free Trial →"
                : form.tier === "enterprise"
                ? "Request Enterprise Access →"
                : `Start ${currentTier.name} (${currentTier.price}/mo) →`}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-emerald-400 underline">Log in</Link>
        </p>

        <div className="mt-6 text-center text-xs text-gray-500">
          {form.tier === "starter" ? (
            <>
              <span>✅ 7‑day free trial</span>
              <span className="mx-2">•</span>
              <span>💰 $1,000 paper trading</span>
              <span className="mx-2">•</span>
              <span>🔒 No credit card required</span>
              <span className="mx-2">•</span>
              <span>🎮 Practice trading immediately</span>
            </>
          ) : form.tier === "enterprise" ? (
            <>
              <span>🏢 Custom enterprise pricing</span>
              <span className="mx-2">•</span>
              <span>👥 Team management</span>
              <span className="mx-2">•</span>
              <span>🎨 Custom branding</span>
              <span className="mx-2">•</span>
              <span>📊 Advanced analytics</span>
            </>
          ) : (
            <>
              <span>💳 Credit card required</span>
              <span className="mx-2">•</span>
              <span>🔄 Cancel anytime</span>
              <span className="mx-2">•</span>
              <span>🚀 Full live trading access</span>
              {form.billingModel === "profit_share" && (
                <>
                  <span className="mx-2">•</span>
                  <span>💡 Profit share billing</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
