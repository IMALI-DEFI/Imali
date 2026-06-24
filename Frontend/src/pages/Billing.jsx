// src/pages/Billing.jsx - Production ready (Pro/Elite only, two-step payment, supports card updates)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StripeElements from "../components/StripeElements";
import BotAPI from "../utils/BotAPI";

const TIER_COPY = {
  starter: {
    label: "Starter", price: "$0", period: "7-day trial", badge: "🌱",
    summary: "Paper trading and beginner tools. No credit card required.",
    requiresPayment: false, redirectTo: "/dashboard",
  },
  pro: {
    label: "Pro", price: "$19", period: "month", badge: "⭐",
    summary: "Live trading + advanced signals and analytics.",
    requiresPayment: true, redirectTo: "/activation",
    profitShareAvailable: true, profitSharePct: 10,
  },
  elite: {
    label: "Elite", price: "$49", period: "month", badge: "👑",
    summary: "Full access + DEX trading + custom indicators.",
    requiresPayment: true, redirectTo: "/activation",
    profitShareAvailable: true, profitSharePct: 8,
  },
  enterprise: {
    label: "Enterprise", price: "Custom", period: "", badge: "🏢",
    summary: "Custom pricing + team management + dedicated support.",
    requiresPayment: false, redirectTo: "/contact-sales", isEnterprise: true,
  },
};

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return TIER_COPY[tier] ? tier : "starter";
}

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, activation, refreshActivation, refreshUser } = useAuth();

  const tier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tierFromUrl = params.get("tier") || params.get("plan");
    return normalizeTier(
      tierFromUrl || location.state?.tier || user?.tier || localStorage.getItem("IMALI_TIER") || "starter"
    );
  }, [location.search, location.state?.tier, user?.tier]);

  const tierInfo = TIER_COPY[tier];

  const email = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("email") || location.state?.email || user?.email || "";
  }, [location.search, location.state?.email, user?.email]);

  const [billingModel, setBillingModel] = useState("fixed");
  const [profitSharePct, setProfitSharePct] = useState(tierInfo.profitSharePct || 10);

  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState("select");

  // If user came from "Update Card" button on dashboard, don't redirect them away
  const isUpdatingCard = location.state?.updateCard === true;

  const alreadyPaid = useMemo(() => {
    if (tier === "starter" || tier === "enterprise") return true;
    if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com") return true;
    return (
      user?.subscription_status === "active" ||
      user?.billing_complete === true ||
      activation?.billing_complete === true ||
      activation?.has_card_on_file === true ||
      !!user?.stripe_subscription_id
    );
  }, [tier, isAdmin, user, activation]);

  // Redirect paid users unless they're updating their card
  useEffect(() => {
    if (!loading && alreadyPaid && tierInfo.requiresPayment && !isUpdatingCard) {
      navigate(tierInfo.redirectTo || "/activation", {
        replace: true,
        state: { tier, fromBilling: true, alreadyPaid: true },
      });
    }
  }, [loading, alreadyPaid, tier, navigate, tierInfo.redirectTo, tierInfo.requiresPayment, isUpdatingCard]);

  const loadBillingState = useCallback(async () => {
    if (!email && !user?.email) { setLoading(false); setError("Please log in"); return; }
    if (isAdmin || user?.is_admin || user?.email === "wayne@imali-defi.com") { setHasCard(true); setLoading(false); return; }
    if (tier === "starter" || tier === "enterprise") { setHasCard(true); setLoading(false); return; }
    if (alreadyPaid && !isUpdatingCard) { setHasCard(true); setLoading(false); return; }

    setLoading(true);
    setError("");
    try {
      const cardStatusRes = await BotAPI.getCardStatus?.().catch(() => null);
      const cardStatus = cardStatusRes?.data || cardStatusRes || {};
      const alreadyHasCard = !!cardStatus?.has_card || !!cardStatus?.has_card_on_file || !!activation?.has_card_on_file || !!activation?.billing_complete;
      setHasCard(alreadyHasCard);
      if (alreadyHasCard && !isUpdatingCard) {
        setLoading(false);
        navigate(tierInfo.redirectTo || "/activation", { replace: true, state: { tier, fromBilling: true } });
      }
    } catch (err) {
      console.error("[Billing] Failed:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load billing setup.");
    } finally {
      setLoading(false);
    }
  }, [email, user?.email, isAdmin, user?.is_admin, tier, activation, alreadyPaid, navigate, tierInfo.redirectTo, isUpdatingCard]);

  useEffect(() => {
    loadBillingState();
  }, [loadBillingState]);

  const proceedToPayment = async () => {
    setBusy(true);
    setError("");
    try {
      const intentRes = await BotAPI.createSetupIntent?.({
        email,
        tier,
        billing_model: billingModel,
        profit_share_pct: billingModel === "profit_share" ? profitSharePct : null,
      });
      const intentData = intentRes?.data || intentRes || {};
      const secret = intentData?.client_secret || intentData?.clientSecret || "";
      if (!secret) throw new Error("Unable to initialize secure billing form.");
      setClientSecret(secret);
      setStep("payment");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to initiate payment.");
    } finally {
      setBusy(false);
    }
  };

  const handlePaymentSuccess = useCallback(async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await refreshActivation?.();
      if (refreshUser) await refreshUser();
      setHasCard(true);
      setSuccess("✅ Payment method saved! Redirecting...");
      setTimeout(() => {
        navigate(isUpdatingCard ? "/billing-dashboard" : tierInfo.redirectTo || "/activation", {
          replace: true,
          state: { tier, fromBilling: true, billingModel, profitSharePct },
        });
      }, 1500);
    } catch (err) {
      setError(err?.message || "Failed to save payment method.");
      setBusy(false);
    }
  }, [navigate, refreshActivation, refreshUser, tier, tierInfo.redirectTo, billingModel, profitSharePct, isUpdatingCard]);

  const handlePaymentError = useCallback((err) => {
    let msg = "Failed to save payment method.";
    if (err?.message?.includes("card_declined")) msg = "Your card was declined.";
    else if (err?.message) msg = err.message;
    setError(msg);
    setBusy(false);
  }, []);

  const handleContinue = () => {
    navigate(isUpdatingCard ? "/billing-dashboard" : tierInfo.redirectTo || "/activation", {
      replace: true,
      state: { tier, fromBilling: true },
    });
  };

  // Not logged in
  if (!user && !email) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-3">Billing Setup Requires Login</h1>
          <p className="text-white/50 mb-6">Please log in to continue.</p>
          <button onClick={() => navigate("/login", { state: { from: "/billing", tier } })} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">Go to Login</button>
        </div>
      </div>
    );
  }

  // Enterprise
  if (tier === "enterprise") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-3xl font-bold mb-4">Enterprise Plan</h1>
            <p className="text-xl text-white/70 mb-6">Custom pricing tailored to your organization</p>
            <button onClick={() => window.location.href = "mailto:sales@imali-defi.com"} className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-lg">Contact Sales →</button>
          </div>
        </div>
      </div>
    );
  }

  // Starter
  if (tier === "starter") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h1 className="text-3xl font-bold mb-4">Starter Plan</h1>
            <p className="text-xl text-white/70 mb-6">Free 7-day trial • No credit card required</p>
            <button onClick={handleContinue} className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-lg">Continue to Dashboard →</button>
          </div>
        </div>
      </div>
    );
  }

  // Paid tiers
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Show this only if paid AND not updating card */}
        {alreadyPaid && !isUpdatingCard && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-3">Billing Already Complete</h1>
            <p className="text-white/70 mb-6">Your payment method is on file. Redirecting...</p>
            <button onClick={handleContinue} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">Continue →</button>
          </div>
        )}

        {/* Show billing form if NOT already paid OR updating card */}
        {(!alreadyPaid || isUpdatingCard) && (
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{tierInfo.badge}</span>
                <div>
                  <h1 className="text-2xl font-bold">{isUpdatingCard ? "Update Payment Method" : "Billing Setup"}</h1>
                  <p className="text-white/50 text-sm">{tierInfo.label} Plan</p>
                </div>
              </div>

              {step === "select" && (
                <>
                  {tierInfo.profitShareAvailable && !isUpdatingCard && (
                    <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
                      <h3 className="font-semibold mb-3">Billing Model</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setBillingModel("fixed")}
                          className={`p-4 rounded-xl border text-left transition-all ${billingModel === "fixed" ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                          <p className="font-semibold text-sm">Fixed Monthly</p>
                          <p className="text-2xl font-bold mt-1">{tierInfo.price}<span className="text-sm text-white/50">/{tierInfo.period}</span></p>
                        </button>
                        <button onClick={() => setBillingModel("profit_share")}
                          className={`p-4 rounded-xl border text-left transition-all ${billingModel === "profit_share" ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                          <p className="font-semibold text-sm">Profit Share</p>
                          <p className="text-2xl font-bold mt-1">{profitSharePct}%<span className="text-sm text-white/50"> of profits</span></p>
                        </button>
                      </div>
                      {billingModel === "profit_share" && (
                        <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-white/60 space-y-1">
                          <p className="text-emerald-300 font-semibold">How profit share works:</p>
                          <p>• You keep 100% of profits up to 3% monthly return</p>
                          <p>• Above 3%, we take {profitSharePct}% of the excess profits</p>
                          <p>• $0 when you don't profit.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/70">
                      {isUpdatingCard ? "Replace your existing payment method with a new card." : tierInfo.summary}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">{error}</div>
                  )}

                  <button onClick={proceedToPayment} disabled={busy}
                    className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold disabled:opacity-50">
                    {busy ? "Preparing..." : isUpdatingCard ? "Update Card →" : "Continue →"}
                  </button>
                </>
              )}

              {step === "payment" && (
                <>
                  {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
                      {error}
                      <button onClick={() => setStep("select")} className="ml-4 underline">Back</button>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm">{success}</div>
                  )}
                  {!clientSecret ? (
                    <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
                      <p className="text-white/50">Preparing secure payment form...</p>
                    </div>
                  ) : (
                    <StripeElements
                      clientSecret={clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      buttonLabel={billingModel === "profit_share" ? `Save Card for ${profitSharePct}% Profit Share` : isUpdatingCard ? "Save New Card" : `Add Card for ${tierInfo.label} Plan`}
                      tier={tier}
                    />
                  )}
                </>
              )}
            </section>

            {/* Sidebar */}
            <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4">{isUpdatingCard ? "Update Card" : "Setup Progress"}</h2>
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 ${hasCard || step === "payment" ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasCard || step === "payment" ? "bg-emerald-500 text-white" : "bg-white/20 text-white/50"}`}>1</div>
                    <p className="font-semibold">{isUpdatingCard ? "Card Details" : "Billing Setup"}</p>
                  </div>
                </div>
                {!isUpdatingCard && (
                  <>
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white/50">2</div>
                        <p className="font-semibold text-white">Connect Accounts</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white/50">3</div>
                        <p className="font-semibold text-white">Enable Trading</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 text-xs text-white/40">
                <p>🔒 Processed securely through Stripe. We never store full card details.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
