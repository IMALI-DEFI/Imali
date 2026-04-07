// src/pages/Billing.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../context/AuthContext";
import StripeElements from "../components/StripeElements";
import BotAPI from "../utils/BotAPI";

// ==============================================
// CONFIGURATION
// ==============================================

const TIER_COPY = {
  starter: { label: "Starter", price: "$0/mo", badge: "🌱", summary: "Paper trading and beginner tools" },
  pro: { label: "Pro", price: "$19/mo", badge: "⭐", summary: "Advanced trading signals and analytics" },
  elite: { label: "Elite", price: "$49/mo", badge: "👑", summary: "Full access to advanced trading features" },
  stock: { label: "DeFi", price: "$99/mo", badge: "📈", summary: "DEX-focused trading and market intelligence" },
  bundle: { label: "Bundle", price: "$199/mo", badge: "🧩", summary: "Everything included in one plan" },
};

// Initialize Stripe with publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "pk_test_default");

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return TIER_COPY[tier] ? tier : "starter";
}

function safeExtract(response, fallback = {}) {
  if (!response) return fallback;
  if (response.data && typeof response.data === "object") return response.data;
  return response;
}

// ==============================================
// MAIN BILLING COMPONENT
// ==============================================

export default function Billing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, activation, refreshActivation } = useAuth();

  // Derived state from props and user
  const tier = useMemo(() => {
    return normalizeTier(
      location.state?.tier ||
        user?.tier ||
        localStorage.getItem("IMALI_TIER") ||
        localStorage.getItem("imali_selected_tier") ||
        "starter"
    );
  }, [location.state?.tier, user?.tier]);

  const tierInfo = TIER_COPY[tier];

  const email = useMemo(() => {
    return location.state?.email || user?.email || localStorage.getItem("IMALI_EMAIL") || "";
  }, [location.state?.email, user?.email]);

  // State management
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [setupIntentId, setSetupIntentId] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [billingAvailable, setBillingAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // ==============================================
  // BILLING STATE MANAGEMENT
  // ==============================================

  const loadBillingState = useCallback(async () => {
    // Check if we have user email
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

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Optional: Probe billing routes to check availability
      if (BotAPI.probeBillingRoutes) {
        await BotAPI.probeBillingRoutes().catch(console.warn);
      }
      
      // Check if user already has a card on file
      const cardStatusRes = await BotAPI.getCardStatus();
      const cardStatus = safeExtract(cardStatusRes, {});

      const alreadyHasCard =
        !!cardStatus?.has_card ||
        !!cardStatus?.has_card_on_file ||
        !!activation?.has_card_on_file ||
        !!activation?.billing_complete;

      setHasCard(alreadyHasCard);

      // If user already has a card, no need to create SetupIntent
      if (alreadyHasCard) {
        setClientSecret("");
        setSetupIntentId("");
        setLoading(false);
        return;
      }

      // Create SetupIntent for card collection
      const intentRes = await BotAPI.createSetupIntent({ email, tier });
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

  // Load billing state on mount and when dependencies change
  useEffect(() => {
    loadBillingState();
  }, [loadBillingState]);

  // ==============================================
  // PAYMENT HANDLERS
  // ==============================================

  const handlePaymentSuccess = useCallback(async (paymentResult) => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const { setupIntentId: intentId, confirmed } = paymentResult;
      
      if (!intentId && !confirmed) {
        throw new Error("Payment confirmation failed. Please try again.");
      }

      // Refresh activation status to update billing flags
      await refreshActivation?.();
      
      setHasCard(true);
      setClientSecret("");
      setSetupIntentId("");
      setSuccess("✅ Card added successfully! Redirecting to activation...");
      
      // Short delay before redirecting to activation
      setTimeout(() => {
        navigate("/activation", {
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
  }, [navigate, refreshActivation, tier]);

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
    navigate("/activation", {
      replace: true,
      state: { tier, fromBilling: true },
    });
  };

  // ==============================================
  // RENDER GUARDS
  // ==============================================

  // Check if user is logged in
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

  // ==============================================
  // MAIN RENDER
  // ==============================================

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          
          {/* LEFT COLUMN - Billing Form */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{tierInfo.badge}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Billing Setup</h1>
                <p className="text-white/50 text-sm">
                  {tierInfo.label} Plan • {tierInfo.price}
                </p>
              </div>
            </div>

            {/* Plan Summary */}
            <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm text-white/70">{tierInfo.summary}</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200 font-semibold">⚠️ Error</p>
                <p className="text-sm text-red-200/80">{error}</p>
                {!loading && !hasCard && !clientSecret && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm text-red-200 hover:text-red-100 underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm text-emerald-200">{success}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3" />
                <p className="text-white/50">Preparing secure billing form...</p>
              </div>
            )}

            {/* Card Already on File */}
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

            {/* Payment Form */}
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

            {/* Fallback - No Billing Available */}
            {!loading && !hasCard && !clientSecret && !billingAvailable && (
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚠️</span>
                  <span className="text-yellow-300 font-semibold">Billing Temporarily Unavailable</span>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  We're having trouble setting up billing. Please try again in a few moments.
                </p>
                <button
                  onClick={handleRetry}
                  className="w-full px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 font-semibold transition-colors"
                >
                  Retry Setup
                </button>
              </div>
            )}
          </section>

          {/* RIGHT COLUMN - Next Steps */}
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">Setup Progress</h2>
            
            <div className="space-y-3">
              {/* Step 1: Billing */}
              <div className={`rounded-xl border p-4 transition-colors ${
                hasCard 
                  ? "border-emerald-500/30 bg-emerald-500/10" 
                  : "border-white/10 bg-black/30"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasCard 
                      ? "bg-emerald-500 text-white" 
                      : "bg-white/20 text-white/50"
                  }`}>
                    {hasCard ? "✓" : "1"}
                  </div>
                  <div>
                    <p className={`font-semibold ${hasCard ? "text-emerald-300" : "text-white"}`}>
                      Billing Setup
                    </p>
                    {hasCard && (
                      <p className="text-xs text-emerald-300/70">Complete</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Connect Accounts */}
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

              {/* Step 3: Enable Trading */}
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

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-start gap-2 text-xs text-white/40">
                <span className="text-lg">🔒</span>
                <p>
                  Your payment information is processed securely through Stripe. 
                  We never store full card details on our servers.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
