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

function getErrorMessage(error) {
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong.";

  const normalized = String(message).toLowerCase();

  if (
    normalized.includes("token") ||
    normalized.includes("jwt") ||
    normalized.includes("unauthorized") ||
    normalized.includes("session")
  ) {
    return "Your session expired. Please log out, log back in, and try again.";
  }

  return String(message);
}

function unwrap(value) {
  return value?.data || value || {};
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
  const [cardFormKey, setCardFormKey] = useState(0);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const accountTier = normalizeTier(user?.tier);

  const selectedTier = normalizeTier(
    searchParams.get("tier") ||
      searchParams.get("plan") ||
      location.state?.tier ||
      accountTier
  );

  const displayTier = selectedTier || accountTier;

  const isPaidTier =
    displayTier === "pro" ||
    displayTier === "elite";

  const activationStatus =
    activation?.status ||
    activation ||
    {};

  const hasValidPayment = useMemo(() => {
    return Boolean(
      cardStatus?.hasCard ||
        cardStatus?.has_card ||
        cardStatus?.has_card_on_file ||
        cardStatus?.billing_complete ||
        activationStatus?.has_card_on_file ||
        activationStatus?.billing_complete ||
        user?.has_card_on_file ||
        user?.billing_complete
    );
  }, [cardStatus, activationStatus, user]);

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
        setCardStatus(
          cardResult.value?.data ||
            cardResult.value ||
            {}
        );
      } else {
        setCardStatus({});
      }

      if (activationResult.status === "fulfilled") {
        setActivation(unwrap(activationResult.value));
      } else {
        setActivation({});
      }

      if (subscriptionResult.status === "fulfilled") {
        setSubscription(unwrap(subscriptionResult.value));
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

  async function refreshEverything() {
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
        "The Starter plan does not require a payment method."
      );
      return;
    }

    setCardFormKey((current) => current + 1);
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
    setNotice(
      "Payment method saved. Your plan features are now available."
    );
    setError("");
    setShowCardForm(false);

    await refreshEverything();
  }

  async function handleRemoveCard() {
    const confirmed = window.confirm(
      "Remove your saved payment method? Paid features will be locked."
    );

    if (!confirmed) return;

    setBusy("remove");
    setError("");
    setNotice("");

    try {
      await BotAPI.removeCard();

      setShowCardForm(false);
      setNotice(
        "Payment method removed. Paid connections have been locked."
      );

      await refreshEverything();
    } catch (removeError) {
      setError(getErrorMessage(removeError));
    } finally {
      setBusy("");
    }
  }

  async function handleCancelSubscription() {
    const confirmed = window.confirm(
      "Cancel your paid subscription?"
    );

    if (!confirmed) return;

    setBusy("cancel");
    setError("");
    setNotice("");

    try {
      await BotAPI.cancelSubscription();

      setNotice(
        "Your subscription cancellation request was submitted."
      );

      await refreshEverything();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setBusy("");
    }
  }

  function goToDashboard() {
    navigate("/dashboard");
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
              Loading account settings...
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
              Billing & Plan Setup
            </h1>

            <p className="mt-1 text-white/60">
              Complete the steps required for your current plan.
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
                  className="rounded-xl bg-red-600 px-4 py-2 font-black text-white hover:bg-red-500"
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

        <BillingDashboard
          tier={displayTier}
          user={user}
          cardStatus={cardStatus}
          activation={activation}
          subscription={subscription}
          billingReady={
            displayTier === "starter" ||
            hasValidPayment
          }
          busy={busy}
          onAddCard={openCardForm}
          onRemoveCard={handleRemoveCard}
          onCancelSubscription={handleCancelSubscription}
        />

        {showCardForm && isPaidTier && (
          <section
            id="secure-card-form"
            className="rounded-[2rem] border border-blue-500/30 bg-blue-500/10 p-5 shadow-xl md:p-6"
          >
            <h2 className="text-xl font-black">
              Secure Card Form
            </h2>

            <p className="mt-2 text-white/60">
              Add a payment method to unlock your {displayTier} plan features.
            </p>

            <div className="mt-5">
              <CardUpdateForm
                key={cardFormKey}
                tier={displayTier}
                onSuccess={handleCardSuccess}
                onCancel={closeCardForm}
              />
            </div>
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
    <div
      className={`rounded-2xl border p-4 font-black ${styles}`}
    >
      {children}
    </div>
  );
}
