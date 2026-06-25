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

  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan") || params.get("selected");
  }, [location.search]);

  const tier = useMemo(() => {
    return normalizeTier(
      urlTier ||
        location.state?.tier ||
        localStorage.getItem("IMALI_SELECTED_TIER") ||
        user?.tier ||
        "starter"
    );
  }, [urlTier, location.state?.tier, user?.tier]);

  const billingTier = tier === "starter" ? "pro" : tier;
  const isStarterView = tier === "starter";

  // Persist selected tier
  useEffect(() => {
    localStorage.setItem("IMALI_SELECTED_TIER", tier);
  }, [tier]);

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

      setShowCardForm(Boolean(location.state?.updateCard));
    } catch (err) {
      setError(err?.message || "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }, [location.state?.updateCard]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const refreshAll = async () => {
    BotAPI.clearCache?.();
    await refreshUser?.();
    await refreshActivation?.();
    await loadBilling();
  };

  const openCardForm = () => {
    setError("");
    setNotice("");
    setShowCardForm(true);
    setFormKey((prev) => prev + 1);

    navigate(`/billing?tier=${billingTier}`, {
      replace: true,
      state: { tier: billingTier, updateCard: true },
    });
  };

  const closeCardForm = () => {
    setShowCardForm(false);
    navigate(`/billing?tier=${billingTier}`, {
      replace: true,
      state: { tier: billingTier },
    });
  };

  const handleCardSuccess = async () => {
    setShowCardForm(false);
    setNotice("Payment method saved successfully.");
    localStorage.setItem("IMALI_SELECTED_TIER", billingTier);
    localStorage.setItem("IMALI_BILLING_COMPLETE", "true");
    await refreshAll();

    navigate(`/billing?tier=${billingTier}`, {
      replace: true,
      state: { tier: billingTier },
    });
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

  const handleChangePlan = (nextTier) => {
    localStorage.setItem("IMALI_SELECTED_TIER", nextTier);
    navigate(`/pricing?selected=${nextTier}`, {
      state: { tier: nextTier },
    });
  };

  // NEW: Downgrade to Starter (free) plan
  const handleDowngradeToStarter = async () => {
    if (!window.confirm("Switch to the free Starter plan? You'll lose access to premium features.")) return;

    setBusy("downgrade");
    setError("");
    setNotice("");

    try {
      await BotAPI.changePlan("starter");
      setNotice("Successfully switched to Starter plan.");
      localStorage.setItem("IMALI_SELECTED_TIER", "starter");
      await refreshAll();
      // Redirect to the member dashboard after downgrade
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed to switch to Starter plan.");
    } finally {
      setBusy("");
    }
  };

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

        {/* Starter View (shown when tier is already starter) */}
        {isStarterView && (
          <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 md:p-6">
            <h2 className="text-2xl font-black">Starter Plan Active</h2>
            <p className="text-white/60 mt-2">
              Starter users can use the member dashboard for paper trading without adding a card.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-4 font-black"
              >
                Go to Member Dashboard
              </button>

              <button
                onClick={() =>
                  navigate("/billing?tier=pro", {
                    state: { tier: "pro", updateCard: true },
                  })
                }
                className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black"
              >
                Upgrade to Pro
              </button>

              <button
                onClick={() =>
                  navigate("/billing?tier=elite", {
                    state: { tier: "elite", updateCard: true },
                  })
                }
                className="rounded-2xl bg-purple-600 hover:bg-purple-500 px-5 py-4 font-black"
              >
                Upgrade to Elite
              </button>
            </div>
          </div>
        )}

        {/* NEW: Downgrade to Starter option for non-starter users */}
        {!isStarterView && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
            <h2 className="text-xl font-bold">Switch to Free Starter Plan</h2>
            <p className="text-white/60 mt-2">
              Downgrade to the free tier. You’ll keep basic access and paper trading, but
              lose premium features.
            </p>
            <button
              onClick={handleDowngradeToStarter}
              disabled={busy === "downgrade"}
              className="mt-4 rounded-2xl bg-gray-600 hover:bg-gray-500 px-5 py-3 font-black disabled:opacity-50"
            >
              {busy === "downgrade" ? "Switching..." : "Switch to Starter"}
            </button>
          </div>
        )}

        <BillingDashboard
          tier={tier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          busy={busy}
          showCardForm={showCardForm}
          onUpdateCard={openCardForm}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
          onChangePlan={handleChangePlan}
        />

        {showCardForm && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl">
            <CardUpdateForm
              key={formKey}
              tier={billingTier}
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