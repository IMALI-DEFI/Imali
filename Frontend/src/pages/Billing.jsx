// src/pages/Billing.jsx - REWRITTEN (Based on new pricing tiers)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../context/AuthContext";
import StripeElements from "../components/StripeElements";
import BotAPI from "../utils/BotAPI";

const TIER_COPY = {
  starter: { 
    label: "Starter", 
    price: "$0", 
    period: "7-day trial", 
    badge: "🌱", 
    summary: "Paper trading and beginner tools. No credit card required.",
    requiresPayment: false,
    redirectTo: "/dashboard"
  },
  common: { 
    label: "Pro", 
    price: "$19", 
    period: "month", 
    badge: "⭐", 
    summary: "Live trading + advanced signals and analytics.",
    requiresPayment: true,
    redirectTo: "/activation"
  },
  rare: { 
    label: "Elite", 
    price: "$49", 
    period: "month", 
    badge: "👑", 
    summary: "Full access + DEX trading + custom indicators.",
    requiresPayment: true,
    redirectTo: "/activation"
  },
  epic: { 
    label: "Elite+", 
    price: "$99", 
    period: "month", 
    badge: "💎", 
    summary: "Everything in Elite + priority execution + futures trading.",
    requiresPayment: true,
    redirectTo: "/activation"
  },
  legendary: { 
    label: "Legendary", 
    price: "$199", 
    period: "month", 
    badge: "🏆", 
    summary: "Everything in Elite+ + custom strategies + alpha signals.",
    requiresPayment: true,
    redirectTo: "/activation"
  },
  enterprise: { 
    label: "Enterprise", 
    price: "Custom", 
    period: "", 
    badge: "🏢", 
    summary: "Custom pricing + team management + dedicated support.",
    requiresPayment: false,
    redirectTo: "/contact-sales",
    isEnterprise: true
  },
};

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_default");

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return TIER_COPY[tier] ? tier : "starter";
}

function safeExtract(response, fallback = {}) {
  if (!response) return fallback;
  if (response.data && typeof response.data === "object") return response.data;
  return response;
}

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, activation, refreshActivation, refreshUser } = useAuth();

  // Get tier from URL params, then state, then user
  const tier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tierFromUrl = params.get("tier") || params.get("plan");
    
    return normalizeTier(
      tierFromUrl ||
        location.state?.tier ||
        user?.tier ||
        localStorage.getItem("IMALI_TIER") ||
        "starter"
    );
  }, [location.search, location.state?.tier, user?.tier]);

  const tierInfo = TIER_COPY[tier];

  const email = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const emailFromUrl = params.get("email");
    return emailFromUrl || location.state?.email || user?.email || localStorage.getItem("IMALI_EMAIL") || "";
  }, [location.search, location.state?.email, user?.email]);

  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [billingAvailable, setBillingAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Check if user already has a card on file
  const loadBillingState = useCallback(async () => {
    if (!email && !user?.email) {
      setLoading(false);
      setError("Please log in to set up billing");
      return;
    }

    // Admin bypass - no billing needed
    if (isAdmin || user?.is_admin === true || user?.email === "wayne@imali-defi.com") {
      setHasCard(true);
      setClientSecret("");
      setBillingAvailable(true);
      setLoading(false);
      return;
    }

    // Starter tier - no payment needed
    if (tier === "starter") {
      setHasCard(true);
      setClientSecret("");
      setBillingAvailable(true);
      setLoading(false);
      return;
    }

    // Enterprise tier - contact sales
    if (tier === "enterprise") {
      setHasCard(false);
      setClientSecret("");
      setBillingAvailable(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Check if user already has a card
      const cardStatusRes = await BotAPI.getCardStatus?.().catch(() => null);
      const cardStatus = safeExtract(cardStatusRes, {});

      const alreadyHasCard =
        !!cardStatus?.has_card ||
        !!cardStatus?.has_card_on_file ||
        !!activation?.has_card_on_file ||
        !!activation?.billing_complete;

      setHasCard(alreadyHasCard);

      if (alreadyHasCard) {
        setClientSecret("");
        setSetupIntentId("");
        setLoading(false);
        return;
      }

      // Create setup intent for payment
      const intentRes = await BotAPI.createSetupIntent?.({ email, tier });
      const intentData = safeExtract(intentRes, {});
      
      const secret = intentData?.client_secret || intentData?.clientSecret || "";
      const intentId = intentData?.setup_intent_id || intentData?.setupIntentId || "";

      if (!secret) {
        throw new Error("Unable to initialize secure billing form. Please try again.");
      }

      setClientSecret(secret);
      setSetupIntentId(intentId);
      setBillingAvailable(true);
      
    } catch (err) {
      console.error("[Billing] Failed to initialize billing:", err);
      
      const errorMessage = 
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load billing setup. Please check your connection and try again.";
      
      setError(errorMessage);
      setClientSecret("");
      setSetupIntentId("");
      setBillingAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [activation?.billing_complete, activation?.has_card_on_file, email, isAdmin, tier, user?.email, user?.is_admin]);

  useEffect(() => {
    loadBillingState();
  }, [loadBillingState]);

  const handlePaymentSuccess = useCallback(async (paymentResult) => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const { setupIntentId: intentId, confirmed } = paymentResult;
      
      if (!intentId && !confirmed) {
        throw new Error("Payment confirmation failed. Please try again.");
      }

      await refreshActivation?.();
      if (refreshUser) await refreshUser();
      
      setHasCard(true);
      setClientSecret("");
      setSetupIntentId("");
      setSuccess("✅ Card added successfully! Redirecting...");
      
      // Redirect based on tier
      const redirectPath = tierInfo.redirectTo || "/activation";
      
      setTimeout(() => {
        navigate(redirectPath, {
          replace: true,
          state: { 
            tier, 
            fromBilling: true,
            paymentCompleted: true 
          },
        });
      }, 1500);
      
    } catch (err) {
      console.error("[Billing] Payment success handler error:", err);
      setError(err?.message || "Failed to save payment method. Please try again.");
      setBusy(false);
    }
  }, [navigate, refreshActivation, refreshUser, tier, tierInfo.redirectTo]);

  const handlePaymentError = useCallback((err) => {
    console.error("[Billing] Payment error:", err);
    
    let errorMessage = "Failed to save payment method. Please try again.";
    
    if (err?.message?.includes("card_declined")) {
      errorMessage = "Your card was declined. Please use a different card or contact your bank.";
    } else if (err?.message?.includes("invalid_expiry_year")) {
      errorMessage = "The card expiry year is invalid.";
    } else if (err?.message?.includes("invalid_cvc")) {
      errorMessage = "The security code is invalid.";
    } else if (err?.message) {
      errorMessage = err.message;
    }
    
    setError(errorMessage);
    setBusy(false);
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError("");
    setSuccess("");
    loadBillingState();
  };

  const handleContinue = () => {
    const redirectPath = tierInfo.redirectTo || "/activation";
    navigate(redirectPath, {
      replace: true,
      state: { tier, fromBilling: true },
    });
  };

  const handleContactSales = () => {
    window.location.href = "mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry&body=I'm%20interested%20in%20the%20Enterprise%20plan%20for%20IMALI.%20Please%20contact%20me.";
  };

  // If no user, show login prompt
  if (!user && !email) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-3">Billing Setup Requires Login</h1>
          <p className="text-white/50 mb-6">Please log in to continue with billing setup.</p>
          <button
            onClick={() => navigate("/login", { 
              replace: true,
              state: { from: "/billing", tier } 
            })}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Enterprise tier - show contact sales page
  if (tier === "enterprise") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 p-8 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Plan</h1>
            <p className="text-xl text-white/70 mb-6">Custom pricing tailored to your organization</p>
            
            <div className="max-w-2xl mx-auto text-left space-y-4 mb-8">
              <h2 className="text-xl font-semibold mb-3">Includes:</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">✅ Everything in Elite+</li>
                <li className="flex items-center gap-2">✅ Custom branded dashboard</li>
                <li className="flex items-center gap-2">✅ Dedicated account manager</li>
                <li className="flex items-center gap-2">✅ Team management & roles</li>
                <li className="flex items-center gap-2">✅ Custom bot development</li>
                <li className="flex items-center gap-2">✅ White-label options</li>
                <li className="flex items-center gap-2">✅ SLAs available</li>
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleContactSales}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-bold text-lg transition-colors"
              >
                Contact Sales →
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition-colors"
              >
                View Other Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Starter tier - no payment needed
  if (tier === "starter") {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Starter Plan</h1>
            <p className="text-xl text-white/70 mb-6">Free 7-day trial • No credit card required</p>
            
            <div className="max-w-2xl mx-auto text-left space-y-4 mb-8">
              <h2 className="text-xl font-semibold mb-3">Includes:</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">✅ $1,000 paper trading credits</li>
                <li className="flex items-center gap-2">✅ Test all bots risk-free</li>
                <li className="flex items-center gap-2">✅ Stock & crypto trading demo</li>
                <li className="flex items-center gap-2">✅ No credit card required</li>
                <li className="flex items-center gap-2">✅ Email support</li>
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleContinue}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-lg transition-colors"
              >
                Continue to Dashboard →
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition-colors"
              >
                View Other Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Paid tiers (Pro, Elite, Elite+, Legendary)
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          
          {/* Billing Form Section */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{tierInfo.badge}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Billing Setup</h1>
                <p className="text-white/50 text-sm">
                  {tierInfo.label} Plan • {tierInfo.price}/{tierInfo.period}
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/70">{tierInfo.summary}</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200 font-semibold">⚠️ Error</p>
                <p className="text-sm text-red-200/80">{error}</p>
                {!loading && !hasCard && !clientSecret && (
                  <button onClick={handleRetry} className="mt-2 text-sm text-red-200 hover:text-red-100 underline">
                    Retry
                  </button>
                )}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm text-emerald-200">{success}</p>
              </div>
            )}

            {loading && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
                <p className="text-white/50">Preparing secure billing form...</p>
              </div>
            )}

            {!loading && hasCard && (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✅</span>
                  <span className="text-emerald-300 font-semibold">Payment method on file</span>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  Your billing information is complete. Continue to activation to start trading.
                </p>
                <button
                  onClick={handleContinue}
                  disabled={busy}
                  className="w-full px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50"
                >
                  Continue to Activation →
                </button>
              </div>
            )}

            {!loading && !hasCard && clientSecret && (
              <div className="mt-6">
                <StripeElements
                  clientSecret={clientSecret}
                  setupIntentId={setupIntentId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  returnPath="/billing/success"
                  buttonLabel={`Add Card for ${tierInfo.label} Plan`}
                />
              </div>
            )}

            {!loading && !hasCard && !clientSecret && !billingAvailable && (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚠️</span>
                  <span className="text-yellow-300 font-semibold">Billing Temporarily Unavailable</span>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  We're having trouble setting up billing. Please try again in a few moments.
                </p>
                <button onClick={handleRetry} className="w-full px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-semibold transition-colors">
                  Retry Setup
                </button>
              </div>
            )}
          </section>

          {/* Progress Sidebar */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Setup Progress</h2>
            
            <div className="space-y-3">
              <div className={`rounded-xl border p-4 transition-colors ${
                hasCard ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-black/30"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasCard ? "bg-emerald-500 text-white" : "bg-white/20 text-white/50"
                  }`}>
                    {hasCard ? "✓" : "1"}
                  </div>
                  <div>
                    <p className={`font-semibold ${hasCard ? "text-emerald-300" : "text-white"}`}>
                      Billing Setup
                    </p>
                    {hasCard && <p className="text-xs text-emerald-300/70">Complete</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white/50">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Connect Accounts</p>
                    <p className="text-xs text-white/50">Link OKX, Alpaca, or wallet</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white/50">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Enable Trading</p>
                    <p className="text-xs text-white/50">Start automated trading</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-start gap-2 text-xs text-white/40">
                <span className="text-lg">🔒</span>
                <p>
                  Your payment information is processed securely through Stripe. 
                  We never store full card details on our servers.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-2 text-xs text-white/40">
                <span className="text-lg">🔄</span>
                <p>
                  Cancel anytime. Your subscription will remain active until the end of the billing period.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
