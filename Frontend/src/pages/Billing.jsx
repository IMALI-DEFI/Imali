// imali/Frontend/src/pages/Billing.jsx
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

function hasToken() {
  return !!(
    localStorage.getItem("imali_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("IMALI_TOKEN")
  );
}

export default function Billing() {
  const { user, refreshUser } = useAuth();
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

  useEffect(() => {
    localStorage.setItem("IMALI_SELECTED_TIER", tier);
  }, [tier]);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!hasToken()) {
        throw new Error("Invalid or expired token");
      }

      const [card, act, sub] = await Promise.allSettled([
        BotAPI.getCardStatusSafe(true),
        BotAPI.getActivationStatus(true),
        BotAPI.getSubscriptionDetails(true),
      ]);

      setCardStatus(card.status === "fulfilled" ? card.value?.data || card.value || {} : {});
      setActivation(act.status === "fulfilled" ? act.value || {} : {});
      setSubscription(sub.status === "fulfilled" ? sub.value || null : null);

      if (location.state?.updateCard === true) {
        setShowCardForm(true);
      }
    } catch (err) {
      setError(err?.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  }, [location.state?.updateCard]);

  useEffect(() => {
    if (!user && !hasToken()) {
      navigate("/login", { replace: true, state: { from: "/billing" } });
      return;
    }

    loadBilling();
  }, [user, navigate, loadBilling]);

  const refreshAll = async () => {
    await refreshUser?.();
    await loadBilling();
  };

  const handleUpdateCard = () => {
    setError("");
    setNotice("");
    setShowCardForm(true);

    navigate(`/billing?tier=${billingTier}`, {
      replace: true,
      state: { tier: billingTier, updateCard: true },
    });
  };

  const handleCardSuccess = async () => {
    setShowCardForm(false);
    setNotice("Payment method saved successfully.");
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
      setError(err?.message || "Failed to remove payment method.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading billing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white px-4 py-6 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 font-semibold">
            ⚠️ {error}
            {String(error).toLowerCase().includes("token") && (
              <button
                onClick={() => navigate("/login", { state: { from: "/billing" } })}
                className="block mt-3 px-4 py-2 rounded-xl bg-red-600 text-white"
              >
                Log In Again
              </button>
            )}
          </div>
        )}

        {notice && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200 font-semibold">
            ✅ {notice}
          </div>
        )}

        <BillingDashboard
          tier={tier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          busy={busy}
          onUpdateCard={handleUpdateCard}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
          onRefresh={refreshAll}
        />

        {showCardForm && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:p-6">
            <CardUpdateForm
              tier={billingTier}
              onSuccess={handleCardSuccess}
              onCancel={() => setShowCardForm(false)}
            />
          </section>
        )}
      </div>
    </div>
  );
}