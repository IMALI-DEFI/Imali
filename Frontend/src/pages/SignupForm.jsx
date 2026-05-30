// src/pages/SignupForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TIERS = {
  starter: { name: "Starter", price: "$0", period: "7 days", icon: "🌱" },
  pro: { name: "Pro", price: "$19", period: "month", icon: "⭐" },
  elite: { name: "Elite", price: "$49", period: "month", icon: "👑" },
  enterprise: { name: "Enterprise", price: "Custom", period: "", icon: "🏢" },
};

export default function SignupForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();
  
  const params = new URLSearchParams(location.search);
  const selectedTier = params.get("tier") || params.get("plan") || "starter";
  
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    tier: selectedTier,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(f => ({ ...f, tier: selectedTier }));
  }, [selectedTier]);

  const handleTierChange = (tierId) => {
    setForm(f => ({ ...f, tier: tierId }));
    // Update URL without reload
    navigate(`/signup?tier=${tierId}`, { replace: true });
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
      });
      
      if (!result?.success) {
        setError(result?.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }
      
      // Redirect based on tier
      if (form.tier === "starter") {
        navigate("/trade-demo", { replace: true });
      } else {
        // Paid tier - go to billing to add payment method
        navigate("/billing", { 
          state: { tier: form.tier, email: form.email },
          replace: true 
        });
      }
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
            {currentTier.name} Plan • {currentTier.price}/{currentTier.period}
          </p>
        </div>

        {/* Tier Selection */}
        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Select your plan:</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(TIERS).map(([id, tier]) => (
              <button
                key={id}
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
              placeholder="Password"
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
                <Link to="/terms" className="text-emerald-400 underline">Terms</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold disabled:opacity-50 transition hover:from-emerald-500 hover:to-cyan-500"
            >
              {loading ? "Creating account..." : form.tier === "starter" ? "Start Free Trial →" : `Start ${currentTier.name} →`}
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
              <span>✅ 7-day free trial</span>
              <span className="mx-2">•</span>
              <span>💰 $1,000 paper trading</span>
              <span className="mx-2">•</span>
              <span>🔒 No credit card required</span>
            </>
          ) : (
            <>
              <span>💳 Credit card required for paid plans</span>
              <span className="mx-2">•</span>
              <span>🔄 Cancel anytime</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
