import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";
import BillingDashboard from "./BillingDashboard";
import STRIPE_CONFIG from "../config/stripe";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];
const VALID_PRODUCT_TYPES = ["trading", "admin"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

function normalizeProductType(value) {
  const product = String(value || "trading").toLowerCase().trim();
  return VALID_PRODUCT_TYPES.includes(product) ? product : "trading";
}

function getErrorMessage(err) {
  const raw =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong.";

  const msg = String(raw);

  if (
    msg.toLowerCase().includes("token") ||
    msg.toLowerCase().includes("jwt") ||
    msg.toLowerCase().includes("unauthorized") ||
    msg.toLowerCase().includes("session")
  ) {
    return "Your session expired. Please log out, log back in, and try adding your card again.";
  }

  return msg;
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
  const [clientSecret, setClientSecret] = useState(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const productType = normalizeProductType(
    params.get("product_type") ||
      params.get("product") ||
      user?.product_type ||
      "trading"
  );

  const currentTier = normalizeTier(user?.tier || "starter");

  const selectedTier = normalizeTier(
    params.get("tier") ||
      params.get("plan") ||
      location.state?.tier ||
      currentTier
  );

  const displayTier = selectedTier || currentTier;
  const isAdminProduct = productType === "admin";
  const isPaidTier = displayTier === "pro" || displayTier === "elite";

  const hasValidPayment = useMemo(() => {
    return Boolean(
      cardStatus?.has_card ||
        cardStatus?.has_card_on_file ||
        activation?.has_card_on_file ||
        user?.has_card_on_file ||
        subscription?.stripe_customer_id
    );
  }, [cardStatus, activation, user, subscription]);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!BotAPI.isAuthenticated()) {
        throw new Error("Your session expired. Please log out, log back in, and try adding your card again.");
      }

      const [cardRes, activationRes, subscriptionRes] = await Promise.allSettled([
        BotAPI.getCardStatusSafe(true),
        BotAPI.getActivationStatus(true),
        BotAPI.getSubscriptionDetails(true),
      ]);

      setCardStatus(cardRes.status === "fulfilled" ? cardRes.value?.data || cardRes.value || {} : {});
      setActivation(activationRes.status === "fulfilled" ? activationRes.value || {} : {});
      setSubscription(subscriptionRes.status === "fulfilled" ? subscriptionRes.value || null : null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const refreshAll = async () => {
    BotAPI.clearCache?.();
    await refreshUser?.();
    await refreshActivation?.();
    await loadBilling();
  };

  const openCardForm = async () => {
    setError("");
    setNotice("");
    setBusy("card");
    setShowCardForm(false);
    setClientSecret(null);
    setPendingTier(displayTier);

    try {
      if (!BotAPI.isAuthenticated()) {
        throw new Error("Your session expired. Please log out, log back in, and try adding your card again.");
      }

      if (!isPaidTier) {
        throw new Error("Please choose Pro or Elite before adding a payment method.");
      }

      const priceId = STRIPE_CONFIG.getPriceIdForTier(displayTier, productType);

      if (!priceId) {
        throw new Error(`Missing Stripe price ID for ${displayTier} / ${productType}.`);
      }

      const result = await BotAPI.createSetupIntent({
        tier: displayTier,
        productType,
        priceId,
      });

      const secret = result?.client_secret || result?.data?.client_secret;

      if (!secret) {
        throw new Error("Stripe setup failed. No client secret returned.");
      }

      setClientSecret(secret);
      setShowCardForm(true);
      setFormKey((prev) => prev + 1);
    } catch (err) {
      setError(getErrorMessage(err));
      setShowCardForm(false);
      setClientSecret(null);
    } finally {
      setBusy("");
    }
  };

  const closeCardForm = () => {
    setShowCardForm(false);
    setPendingTier(null);
    setClientSecret(null);
  };

  const handleCardSuccess = async () => {
    setNotice("Payment method saved successfully.");
    setShowCardForm(false);
    setPendingTier(null);
    setClientSecret(null);
    await refreshAll();
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
      setError(getErrorMessage(err));
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
      setError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const goToDashboard = () => {
    navigate(isAdminProduct ? "/admin/dashboard" : "/dashboard", { replace: true });
  };

  const goToLogin = () => {
    localStorage.removeItem("imali_token");
    localStorage.removeItem("token");
    navigate("/login", { replace: true, state: { from: "/billing" } });
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

      <div className="relative max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Billing</h1>
            <p className="text-white/60 mt-1">
              Manage your plan and payment method.
            </p>
          </div>

          <button
            onClick={goToDashboard}
            className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3 font-black transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <Alert type="error">
            <div className="space-y-3">
              <p>{error}</p>
              {error.toLowerCase().includes("session expired") && (
                <button
                  onClick={goToLogin}
                  className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-white font-black"
                >
                  Log In Again
                </button>
              )}
            </div>
          </Alert>
        )}

        {notice && <Alert type="success">{notice}</Alert>}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
            <div>
              <p className="text-sm uppercase tracking-widest text-white/40 font-black">
                Current Plan
              </p>

              <h2 className="text-2xl font-black mt-2">
                {displayTier.charAt(0).toUpperCase() + displayTier.slice(1)} Plan
                {isAdminProduct && (
                  <span className="text-sm text-purple-300 ml-2">
                    Admin Platform
                  </span>
                )}
              </h2>

              <p className="text-white/60 mt-2">
                {hasValidPayment
                  ? "Your payment method is active."
                  : isPaidTier
                    ? "Add a card to activate or continue your paid plan."
                    : "Starter does not require a payment method."}
              </p>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-black border ${
                  hasValidPayment
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-200 border-amber-500/30"
                }`}
              >
                {hasValidPayment ? "Payment Active" : "No Card on File"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <h2 className="text-xl font-black">Payment Method</h2>

          <p className="text-white/60 mt-2">
            {hasValidPayment
              ? "You have a payment method saved. You can update it anytime."
              : "No payment method is currently saved."}
          </p>

          {!isPaidTier && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
              Choose Pro or Elite before adding a credit card.
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={openCardForm}
              disabled={busy === "card" || !isPaidTier}
              className="rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-4 font-black transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "card"
                ? "Preparing secure card form..."
                : hasValidPayment
                  ? "Update Card"
                  : "Add Credit Card"}
            </button>

            {hasValidPayment && (
              <button
                onClick={handleRemoveCard}
                disabled={busy === "remove"}
                className="rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-4 font-black transition disabled:opacity-50"
              >
                {busy === "remove" ? "Removing..." : "Remove Card"}
              </button>
            )}
          </div>
        </section>

        {showCardForm && clientSecret && (
          <section className="rounded-[2rem] border border-blue-500/30 bg-blue-500/10 p-5 md:p-6">
            <h2 className="text-xl font-black">Secure Card Form</h2>
            <p className="text-white/60 mt-2">
              Enter your card details below. Your payment is handled securely by Stripe.
            </p>

            <div className="mt-5">
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
                productType={productType}
                clientSecret={clientSecret}
                onUpdateCard={openCardForm}
                onRemoveCard={handleRemoveCard}
                onCancelSubscription={handleCancelSubscription}
                onCancelCardForm={closeCardForm}
                onCardSuccess={handleCardSuccess}
              />
            </div>
          </section>
        )}

        {!showCardForm && (
          <BillingDashboard
            tier={displayTier}
            user={user}
            cardStatus={cardStatus}
            activation={activation}
            subscription={subscription}
            busy={busy}
            showCardForm={false}
            formKey={formKey}
            pendingTier={pendingTier}
            productType={productType}
            clientSecret={clientSecret}
            onUpdateCard={openCardForm}
            onRemoveCard={handleRemoveCard}
            onCancelSubscription={handleCancelSubscription}
            onCancelCardForm={closeCardForm}
            onCardSuccess={handleCardSuccess}
          />
        )}

        {hasValidPayment && (
          <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
            <h2 className="text-xl font-black text-red-300">Cancel Subscription</h2>
            <p className="text-white/60 mt-2">
              Cancel your paid subscription if you no longer want premium access.
            </p>

            <button
              onClick={handleCancelSubscription}
              disabled={busy === "cancel"}
              className="mt-4 rounded-2xl bg-red-600 hover:bg-red-500 px-5 py-3 font-black disabled:opacity-50 transition"
            >
              {busy === "cancel" ? "Cancelling..." : "Cancel Subscription"}
            </button>
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
    <div className={`rounded-2xl border p-4 font-black ${styles}`}>
      {children}
    </div>
  );
}
