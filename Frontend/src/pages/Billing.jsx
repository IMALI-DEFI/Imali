// src/pages/Billing.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";
import BillingDashboard from "./BillingDashboard";
import CardUpdateForm from "./CardUpdateForm";

const VALID_TIERS = ["starter", "pro", "elite", "enterprise"];
const VALID_PRODUCT_TYPES = ["trading", "admin"];

function normalizeTier(value) {
  const tier = String(value || "starter").toLowerCase().trim();
  return VALID_TIERS.includes(tier) ? tier : "starter";
}

function normalizeProductType(value) {
  const productType = String(value || "trading").toLowerCase().trim();

  return VALID_PRODUCT_TYPES.includes(productType)
    ? productType
    : "trading";
}

function getErrorMessage(error) {
  const rawMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong.";

  const message = String(rawMessage);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("token") ||
    normalized.includes("jwt") ||
    normalized.includes("unauthorized") ||
    normalized.includes("session")
  ) {
    return "Your session expired. Please log out, log back in, and try again.";
  }

  return message;
}

function unwrapData(value) {
  return value?.data || value || {};
}

export default function Billing() {
  const {
    user,
    refreshUser,
    refreshActivation,
  } = useAuth();

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

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

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

  const isPaidTier =
    displayTier === "pro" ||
    displayTier === "elite";

  const hasValidPayment = useMemo(() => {
    return Boolean(
      cardStatus?.has_card ||
        cardStatus?.hasCard ||
        cardStatus?.has_card_on_file ||
        activation?.has_card_on_file ||
        activation?.status?.has_card_on_file ||
        user?.has_card_on_file
    );
  }, [cardStatus, activation, user]);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!BotAPI.isAuthenticated()) {
        throw new Error("Your session expired.");
      }

      const results = await Promise.allSettled([
        BotAPI.getCardStatusSafe(true),
        BotAPI.getActivationStatus(true),
        BotAPI.getSubscriptionDetails(true),
      ]);

      const [cardResult, activationResult, subscriptionResult] = results;

      if (cardResult.status === "fulfilled") {
        const cardValue = cardResult.value;

        setCardStatus(
          cardValue?.data ||
            cardValue ||
            {}
        );
      } else {
        setCardStatus({});
      }

      if (activationResult.status === "fulfilled") {
        setActivation(
          unwrapData(activationResult.value)
        );
      } else {
        setActivation({});
      }

      if (subscriptionResult.status === "fulfilled") {
        setSubscription(
          unwrapData(subscriptionResult.value)
        );
      } else {
        setSubscription(null);
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  async function refreshAll() {
    BotAPI.clearCache?.();

    await Promise.allSettled([
      refreshUser?.(),
      refreshActivation?.(),
    ]);

    await loadBilling();
  }

  function openCardForm() {
    setError("");
    setNotice("");

    if (!BotAPI.isAuthenticated()) {
      setError(
        "Your session expired. Please log out, log back in, and try again."
      );
      return;
    }

    if (!isPaidTier) {
      setError(
        "Please select the Pro or Elite plan before adding a payment method."
      );
      return;
    }

    setFormKey((current) => current + 1);
    setShowCardForm(true);

    window.setTimeout(() => {
      document
        .getElementById("secure-card-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function closeCardForm() {
    setShowCardForm(false);
  }

  async function handleCardSuccess() {
    setNotice("Payment method saved successfully.");
    setError("");
    setShowCardForm(false);

    await refreshAll();
  }

  async function handleRemoveCard() {
    const confirmed = window.confirm(
      "Remove your saved payment method?"
    );

    if (!confirmed) {
      return;
    }

    setBusy("remove");
    setError("");
    setNotice("");

    try {
      await BotAPI.removeCard();

      setNotice("Payment method removed.");
      setShowCardForm(false);

      await refreshAll();
    } catch (removeError) {
      setError(getErrorMessage(removeError));
    } finally {
      setBusy("");
    }
  }

  async function handleCancelSubscription() {
    const confirmed = window.confirm(
      "Cancel your subscription?"
    );

    if (!confirmed) {
      return;
    }

    setBusy("cancel");
    setError("");
    setNotice("");

    try {
      await BotAPI.cancelSubscription();

      setNotice(
        "Your subscription cancellation request was submitted."
      );

      await refreshAll();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setBusy("");
    }
  }

  function goToDashboard() {
    navigate(
      isAdminProduct
        ? "/admin/dashboard"
        : "/dashboard"
    );
  }

  function goToLogin() {
    BotAPI.logout?.();

    localStorage.removeItem("imali_token");
    localStorage.removeItem("token");

    navigate("/login", {
      replace: true,
      state: {
        from: location.pathname + location.search,
      },
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] px-4 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />

            <p className="text-white/60">
              Loading billing...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-6 text-white md:py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">
              Billing & Account Settings
            </h1>

            <p className="mt-1 text-white/60">
              Manage your plan, payment method, trading connections, and account settings.
            </p>
          </div>

          <button
            type="button"
            onClick={goToDashboard}
            className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black transition hover:bg-white/20"
          >
            ← Back to Dashboard
          </button>
        </header>

        {error && (
          <Alert type="error">
            <div className="space-y-3">
              <p>{error}</p>

              {error
                .toLowerCase()
                .includes("session expired") && (
                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-xl bg-red-600 px-4 py-2 font-black text-white transition hover:bg-red-500"
                >
                  Log In Again
                </button>
              )}
            </div>
          </Alert>
        )}

        {notice && (
          <Alert type="success">
            {notice}
          </Alert>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white/40">
                Current Plan
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {displayTier.charAt(0).toUpperCase() +
                  displayTier.slice(1)}{" "}
                Plan

                {isAdminProduct && (
                  <span className="ml-2 text-sm text-purple-300">
                    Admin Platform
                  </span>
                )}
              </h2>

              <p className="mt-2 text-white/60">
                {hasValidPayment
                  ? "Your payment method is active."
                  : isPaidTier
                    ? "Add a card to activate or continue your paid plan."
                    : "The Starter plan does not require a payment method."}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-4 py-2 text-sm font-black ${
                hasValidPayment
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {hasValidPayment
                ? "Payment Active"
                : "No Card on File"}
            </span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black">
                Payment Method
              </h2>

              <p className="mt-2 text-white/60">
                {hasValidPayment
                  ? "A payment method is saved. You can update or remove it."
                  : "No payment method is currently saved."}
              </p>

              {cardStatus?.brand &&
                cardStatus?.last4 && (
                  <p className="mt-2 text-sm font-bold text-emerald-300">
                    {String(
                      cardStatus.brand
                    ).toUpperCase()}{" "}
                    •••• {cardStatus.last4}
                  </p>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCardForm}
                disabled={!isPaidTier || showCardForm}
                className="rounded-2xl bg-blue-600 px-5 py-4 font-black transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showCardForm
                  ? "Card Form Open"
                  : hasValidPayment
                    ? "Update Credit Card"
                    : "Add Credit Card"}
              </button>

              {hasValidPayment && (
                <button
                  type="button"
                  onClick={handleRemoveCard}
                  disabled={busy === "remove"}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {busy === "remove"
                    ? "Removing..."
                    : "Remove Card"}
                </button>
              )}
            </div>
          </div>

          {!isPaidTier && (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
              Choose the Pro or Elite plan before adding a payment method.
            </div>
          )}

          {showCardForm && (
            <div
              id="secure-card-form"
              className="mt-6 border-t border-white/10 pt-6"
            >
              <div className="mb-5">
                <h3 className="text-xl font-black">
                  Secure Card Form
                </h3>

                <p className="mt-2 text-sm text-white/60">
                  Enter your card details below. Payment information is handled securely by Stripe.
                </p>
              </div>

              <CardUpdateForm
                key={formKey}
                tier={displayTier}
                onSuccess={handleCardSuccess}
                onCancel={closeCardForm}
              />
            </div>
          )}
        </section>

        <BillingDashboard
          tier={displayTier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          busy={busy}
          productType={productType}
          onUpdateCard={openCardForm}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
        />
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
    <div
      className={`rounded-2xl border p-4 font-black ${styles}`}
    >
      {children}
    </div>
  );
}
