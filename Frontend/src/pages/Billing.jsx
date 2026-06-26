// src/pages/Billing.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";
import BillingDashboard from "./BillingDashboard";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

export default function Billing() {
  const { user, refreshUser, refreshActivation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cardStatus, setCardStatus] = useState({});
  const [activation, setActivation] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pendingTier, setPendingTier] = useState(null);

  // Get tier from URL
  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan") || params.get("selected");
  }, [location.search]);

  // Actual user tier from backend
  const actualUserTier = user?.tier || "starter";

  // Check if user has valid payment method
  const hasValidPayment = useMemo(() => {
    return (
      cardStatus?.has_card === true ||
      cardStatus?.has_card_on_file === true ||
      activation?.has_card_on_file === true ||
      user?.has_card_on_file === true ||
      subscription?.stripe_customer_id
    );
  }, [cardStatus, activation, user, subscription]);

  // Determine which tier to display
  const displayTier = useMemo(() => {
    if (urlTier && urlTier !== actualUserTier && hasValidPayment) {
      return normalizeTier(urlTier);
    }
    return normalizeTier(actualUserTier);
  }, [urlTier, actualUserTier, hasValidPayment]);

  // Tier used for card updates
  const billingTier = useMemo(() => {
    if (displayTier === "starter") return "pro";
    return displayTier;
  }, [displayTier]);

  const isStarter = actualUserTier === "starter";
  const isPaidUser = actualUserTier === "pro" || actualUserTier === "elite";

  // Redirect starters
  useEffect(() => {
    if (isStarter && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isStarter, loading, navigate]);

  // Load billing data
  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!BotAPI.isAuthenticated()) {
        throw new Error("Please log in again to manage billing.");
      }

      const [cardRes, activationRes, subscriptionRes] = await Promise.allSettled([
        BotAPI.getCardStatusSafe(true),
        BotAPI.getActivationStatus(true),
        BotAPI.getSubscriptionDetails(true),
      ]);

      setCardStatus(
        cardRes.status === "fulfilled"
          ? cardRes.value?.data || cardRes.value || {}
          : {}
      );
      setActivation(
        activationRes.status === "fulfilled" ? activationRes.value || {} : {}
      );
      setSubscription(
        subscriptionRes.status === "fulfilled" ? subscriptionRes.value || null : null
      );

      // Show card form if updating card and tier is changing
      if (location.state?.updateCard && urlTier && urlTier !== actualUserTier) {
        setShowCardForm(true);
        setPendingTier(normalizeTier(urlTier));
      }
    } catch (err) {
      setError(err?.message || "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }, [location.state?.updateCard, urlTier, actualUserTier]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  // Refresh all data
  const refreshAll = async () => {
    BotAPI.clearCache?.();
    await refreshUser?.();
    await refreshActivation?.();
    await loadBilling();
  };

  // Open card form for a specific tier
  const openCardForm = (tier) => {
    setError("");
    setNotice("");
    setPendingTier(tier);
    setShowCardForm(true);
    setFormKey((prev) => prev + 1);
    navigate(`/billing?tier=${tier}`, {
      replace: true,
      state: { tier, updateCard: true },
    });
  };

  // Close card form
  const closeCardForm = () => {
    setShowCardForm(false);
    setPendingTier(null);
    navigate(`/billing`, { replace: true });
  };

  // Handle successful card save
  const handleCardSuccess = async () => {
    await refreshAll();

    // Check if user's tier was upgraded
    const updatedUser = await BotAPI.getMe(true);
    const newTier = updatedUser?.tier || actualUserTier;

    if (newTier !== actualUserTier && newTier !== "starter") {
      setNotice(
        `✅ Successfully upgraded to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} plan!`
      );
      setShowCardForm(false);
      setPendingTier(null);

      // Redirect to activation to complete setup
      setTimeout(() => {
        navigate("/activation", {
          replace: true,
          state: { tier: newTier, fromBilling: true },
        });
      }, 1500);
    } else {
      setNotice("✅ Payment method saved successfully!");
      setShowCardForm(false);
      setPendingTier(null);
      await refreshAll();
    }
  };

  // Remove card
  const handleRemoveCard = async () => {
    if (!window.confirm("Remove your saved payment method?")) return;
    setBusy("remove");
    setError("");
    setNotice("");
    try {
      await BotAPI.removeCard();
      setNotice("Payment method removed.");
      await refreshAll();
    } catch (err) {
      setError(err?.message || "Failed to remove card.");
    } finally {
      setBusy("");
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription?")) return;
    setBusy("cancel");
    setError("");
    setNotice("");
    try {
      await BotAPI.cancelSubscription();
      setNotice("Subscription cancellation submitted.");
      await refreshAll();
    } catch (err) {
      setError(err?.message || "Failed to cancel subscription.");
    } finally {
      setBusy("");
    }
  };

  // Downgrade to Starter
  const handleDowngradeToStarter = async () => {
    if (
      !window.confirm(
        "Switch to the free Starter plan? You'll lose premium features."
      )
    )
      return;
    setBusy("downgrade");
    setError("");
    setNotice("");
    try {
      await BotAPI.cancelSubscription();
      setNotice("Successfully switched to Starter plan.");
      await refreshAll();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to switch to Starter plan.");
    } finally {
      setBusy("");
    }
  };

  // Go to dashboard
  const goToDashboard = () => navigate("/dashboard", { replace: true });

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading billing...</p>
        </div>
      </main>
    );
  }

  // Starter redirect (fallback)
  if (isStarter) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Redirecting to dashboard...</p>
        </div>
      </main>
    );
  }

  // Main render
  return (
    <main className="min-h-screen bg-[#050816] text-white px-4 py-6 md:py-10">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Alerts */}
        {error && (
          <Alert type="error">
            {error}
            {error.toLowerCase().includes("log in") && (
              <button
                onClick={() => navigate("/login", { state: { from: "/dashboard" } })}
                className="block mt-3 px-4 py-2 rounded-xl bg-red-600 text-white font-black"
              >
                Log In Again
              </button>
            )}
          </Alert>
        )}
        {notice && <Alert type="success">{notice}</Alert>}

        {/* Back to Dashboard */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black">Billing & Subscription</h1>
          <button
            onClick={goToDashboard}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3 font-black transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Current plan status */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">
              {displayTier === "elite" ? "👑" : displayTier === "pro" ? "⭐" : "🌱"}
            </span>
            <h2 className="text-2xl font-black">
              {displayTier === "elite"
                ? "Elite"
                : displayTier === "pro"
                ? "Pro"
                : "Starter"}{" "}
              Plan
            </h2>
            {hasValidPayment && (
              <span className="ml-2 px-3 py-1 text-xs font-black bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                ✅ Active
              </span>
            )}
          </div>
          <p className="text-white/60 mt-2">
            {hasValidPayment
              ? `You're currently on the ${displayTier} plan with a valid payment method.`
              : `You've selected the ${displayTier} plan but need to add a payment method to activate.`}
          </p>
          {!hasValidPayment && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-200 text-sm">
                ⚠️ No payment method on file. Click "Add Card" below to activate your
                premium features.
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => openCardForm(displayTier)}
              className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black transition"
            >
              {hasValidPayment ? "Update Card" : "Add Card"}
            </button>
            <button
              onClick={goToDashboard}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black transition"
            >
              Go to Dashboard
            </button>
          </div>
          {isPaidUser && hasValidPayment && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/40">
                Switch to the free Starter plan below if you'd like to downgrade.
              </p>
            </div>
          )}
        </div>

        {/* Downgrade option */}
        {isPaidUser && hasValidPayment && (
          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
            <h2 className="text-xl font-black text-red-300">
              Switch to Free Starter Plan
            </h2>
            <p className="text-white/60 mt-2">
              Downgrade to the free tier. You'll keep basic access and paper trading,
              but lose premium features.
            </p>
            <button
              onClick={handleDowngradeToStarter}
              disabled={busy === "downgrade"}
              className="mt-4 rounded-2xl bg-red-600 hover:bg-red-500 px-5 py-3 font-black disabled:opacity-50 transition"
            >
              {busy === "downgrade" ? "Switching..." : "Switch to Starter"}
            </button>
          </div>
        )}

        {/* Billing Dashboard - Now includes card form inline */}
        <BillingDashboard
          tier={displayTier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          busy={busy}
          showCardForm={showCardForm}
          formKey={formKey}
          pendingTier={pendingTier}
          onUpdateCard={() => openCardForm(displayTier)}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
          onCancelCardForm={closeCardForm}
          onCardSuccess={handleCardSuccess}
        />
      </div>
    </main>
  );
}

// Alert component
function Alert({ type, children }) {
  const styles =
    type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";

  return (
    <div className={`rounded-2xl border p-4 font-black ${styles}`}>
      {type === "success" ? "✅ " : "⚠️ "}
      {children}
    </div>
  );
}
