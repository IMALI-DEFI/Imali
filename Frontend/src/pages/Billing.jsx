// src/pages/Billing.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";
import BillingDashboard from "./BillingDashboard";
import CardUpdateForm from "./CardUpdateForm";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

export default function Billing() {
  const { user, refreshUser, refreshActivation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan") || params.get("selected");
  }, [location.search]);

  // Actual user tier from backend (source of truth)
  const actualUserTier = user?.tier || "starter";

  // Has valid payment method? Only check has_card_on_file, not billing_complete
  const hasValidPayment = 
    cardStatus?.has_card === true ||
    cardStatus?.has_card_on_file === true ||
    activation?.has_card_on_file === true ||
    user?.has_card_on_file === true ||
    subscription?.stripe_customer_id;

  // Display tier: if URL tier differs from actual and user has payment, show the new tier (upgrade)
  const displayTier = useMemo(() => {
    if (urlTier && urlTier !== actualUserTier && hasValidPayment) {
      return normalizeTier(urlTier);
    }
    return normalizeTier(actualUserTier);
  }, [urlTier, actualUserTier, hasValidPayment]);

  // Tier used for card updates (Pro or Elite)
  const billingTier = useMemo(() => {
    if (displayTier === "starter") return "pro";
    return displayTier;
  }, [displayTier]);

  const isStarter = actualUserTier === "starter";

  // Redirect Starter users immediately – they have no billing to manage
  useEffect(() => {
    if (isStarter && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isStarter, loading, navigate]);

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

      // Only show card form if explicitly requested and tier is being changed
      if (location.state?.updateCard && urlTier && urlTier !== actualUserTier) {
        setShowCardForm(true);
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

  const refreshAll = async () => {
    BotAPI.clearCache?.();
    await refreshUser?.();
    await refreshActivation?.();
    await loadBilling();
  };

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

  const closeCardForm = () => {
    setShowCardForm(false);
    setPendingTier(null);
    navigate(`/billing`, { replace: true });
  };

  const handleCardSuccess = async () => {
    await refreshAll();
    const newTier = user?.tier;
    if (newTier && newTier !== actualUserTier) {
      setNotice(`Successfully upgraded to ${newTier} plan!`);
      setShowCardForm(false);
      setPendingTier(null);
      // Go to activation to complete setup
      setTimeout(() => navigate("/activation", { replace: true, state: { tier: newTier } }), 1500);
    } else {
      setError("Upgrade was not processed. Please try again.");
    }
  };

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

  const handleDowngradeToStarter = async () => {
    if (!window.confirm("Switch to the free Starter plan? You'll lose premium features.")) return;
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

  const goToDashboard = () => navigate("/dashboard", { replace: true });

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

  // Starter: redirect (already handled by useEffect, but fallback)
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

  return (
    <main className="min-h-screen bg-[#050816] text-white px-4 py-6 md:py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {error && (
          <Alert type="error">
            {error}
            {error.toLowerCase().includes("log in") && (
              <button
                onClick={() => navigate("/login", { state: { from: "/dashboard" } })}
                className="block mt-3 px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
              >
                Log In Again
              </button>
            )}
          </Alert>
        )}
        {notice && <Alert type="success">{notice}</Alert>}

        <div className="flex justify-end">
          <button
            onClick={goToDashboard}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3 font-bold transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Current plan status */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{displayTier === "elite" ? "👑" : "⭐"}</span>
            <h2 className="text-2xl font-black">{displayTier === "elite" ? "Elite" : "Pro"} Plan Active</h2>
          </div>
          <p className="text-white/60 mt-2">
            You're currently on the {displayTier === "elite" ? "Elite" : "Pro"} plan. Manage your payment method and subscription below.
          </p>
          {!hasValidPayment && (
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-200 text-sm">
                ⚠️ No payment method on file. Add a payment method to activate premium features.
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={goToDashboard} className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black transition">
              Go to Dashboard
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm text-white/40">Switch to the free Starter plan below if you'd like to downgrade.</p>
          </div>
        </div>

        {/* Downgrade option – only if they have payment */}
        {hasValidPayment && (
          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
            <h2 className="text-xl font-bold text-red-300">Switch to Free Starter Plan</h2>
            <p className="text-white/60 mt-2">
              Downgrade to the free tier. You'll keep basic access and paper trading, but lose premium features.
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

        <BillingDashboard
          tier={displayTier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          busy={busy}
          showCardForm={showCardForm}
          onUpdateCard={() => openCardForm(displayTier)}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
        />

        {showCardForm && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
            <CardUpdateForm
              key={formKey}
              tier={pendingTier || billingTier}
              onSuccess={handleCardSuccess}
              onCancel={closeCardForm}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function Alert({ type, children }) {
  const styles =
    type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";

  return (
    <div className={`rounded-2xl border p-4 font-semibold ${styles}`}>
      {type === "success" ? "✅ " : "⚠️ "}
      {children}
    </div>
  );
}