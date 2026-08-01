// src/pages/CardUpdateForm.jsx

import React, { useCallback, useEffect, useState } from "react";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const CARD_OPTIONS = {
  hidePostalCode: false,
  style: {
    base: {
      color: "#ffffff",
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "16px",
      fontSmoothing: "antialiased",
      lineHeight: "24px",

      "::placeholder": {
        color: "#6b7280",
      },
    },

    invalid: {
      color: "#f87171",
      iconColor: "#ef4444",
    },
  },
};

function getClientSecret(response) {
  return (
    response?.data?.client_secret ||
    response?.client_secret ||
    response?.data?.clientSecret ||
    response?.clientSecret ||
    ""
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export default function CardUpdateForm({
  tier = "pro",
  onSuccess,
  onCancel,
}) {
  const { user } = useAuth();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSetupIntent = useCallback(async () => {
    setLoading(true);
    setError("");
    setClientSecret("");

    try {
      if (!stripeKey || !stripePromise) {
        throw new Error(
          "Stripe is not configured. Check REACT_APP_STRIPE_PUBLISHABLE_KEY."
        );
      }

      if (!user?.email) {
        throw new Error("Your account email is unavailable.");
      }

      const response = await BotAPI.createSetupIntent({
        email: user.email,
        tier: tier || user?.tier || "pro",
      });

      const secret = getClientSecret(response);

      if (
        !secret ||
        !String(secret).startsWith("seti_") ||
        !String(secret).includes("_secret_")
      ) {
        console.error("Unexpected SetupIntent response:", response);

        throw new Error(
          "The server did not return a valid Stripe SetupIntent."
        );
      }

      setClientSecret(secret);
    } catch (err) {
      console.error("Billing initialization error:", err);

      setError(
        getErrorMessage(err, "Failed to load the secure payment form.")
      );
    } finally {
      setLoading(false);
    }
  }, [tier, user?.email, user?.tier]);

  useEffect(() => {
    loadSetupIntent();
  }, [loadSetupIntent]);

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6 text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />

        <p className="text-sm text-white/60">
          Loading secure payment form...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5">
        <p className="mb-4 text-sm text-red-200">⚠️ {error}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadSetupIntent}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-black text-white transition hover:bg-blue-500"
          >
            Retry
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/15"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded-[1.5rem] border border-yellow-500/40 bg-yellow-500/10 p-5 text-center">
        <p className="text-yellow-200">
          No payment setup is available.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={loadSetupIntent}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white hover:bg-white/15"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <Elements key={clientSecret} stripe={stripePromise}>
      <InnerCardForm
        user={user}
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}

function InnerCardForm({
  user,
  clientSecret,
  onSuccess,
  onCancel,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!stripe || !elements) {
      setError("The Stripe payment form is still loading.");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError("The card field is not ready. Please try again.");
      return;
    }

    if (!cardComplete) {
      setError("Please enter complete card information.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,

          billing_details: {
            name:
              user?.displayName ||
              user?.name ||
              user?.email ||
              "Customer",

            email: user?.email || "",
          },
        },
      });

      if (result.error) {
        throw new Error(
          result.error.message || "Stripe could not verify the card."
        );
      }

      const setupIntent = result.setupIntent;

      if (!setupIntent) {
        throw new Error("Stripe did not return a SetupIntent.");
      }

      if (setupIntent.status !== "succeeded") {
        throw new Error(
          `Card setup did not complete. Status: ${setupIntent.status}`
        );
      }

      const confirmResponse = await BotAPI.confirmCard({
        setup_intent_id: setupIntent.id,
      });

      const success =
        confirmResponse?.success === true ||
        confirmResponse?.data?.success === true;

      if (!success) {
        throw new Error(
          confirmResponse?.error ||
            confirmResponse?.data?.error ||
            "The card was verified but could not be saved."
        );
      }

      await onSuccess?.(setupIntent);
    } catch (err) {
      console.error("Card save error:", err);

      setError(getErrorMessage(err, "Failed to save the card."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
        <CardElement
          options={CARD_OPTIONS}
          onChange={(event) => {
            setCardComplete(event.complete);
            setCardError(event.error?.message || "");

            if (event.error) {
              setError("");
            }
          }}
        />
      </div>

      {cardError && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          ⚠️ {cardError}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={
            !stripe ||
            !elements ||
            busy ||
            !cardComplete ||
            Boolean(cardError)
          }
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 font-black text-white transition hover:from-emerald-500 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Card"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        🔒 Secure payment powered by Stripe
      </p>
    </form>
  );
}
