// src/components/StripeElements.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import BotAPI from "../utils/BotAPI";

function PaymentForm({
  onSuccess,
  onError,
  returnPath = "/activation",
  buttonLabel = "Add Payment Method",
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("idle");

  const isDisabled = busy || !stripe || !elements || step === "success";

  const getButtonText = () => {
    if (busy) {
      switch (step) {
        case "confirming":
          return "Confirming with Stripe...";
        case "saving":
          return "Saving to account...";
        default:
          return "Processing...";
      }
    }

    if (step === "success") return "✓ Payment Method Added!";
    return buttonLabel;
  };

  const handleSubmit = async () => {
    if (!stripe || !elements || busy) return;

    setBusy(true);
    setError("");
    setStep("confirming");

    try {
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${returnPath}`,
        },
        redirect: "if_required",
      });

      if (stripeError) {
        throw stripeError;
      }

      setStep("saving");

      const confirmResult = await BotAPI.confirmCard();
      if (!confirmResult) {
        throw new Error("No response from server");
      }

      setStep("success");
      onSuccess?.(confirmResult);
    } catch (err) {
      console.error("[StripeElements] Payment error:", err);

      let errorMessage = "Failed to save payment method";
      if (err?.message?.includes("card_declined")) {
        errorMessage = "Your card was declined. Please try another card.";
      } else if (err?.message?.includes("insufficient_funds")) {
        errorMessage = "Insufficient funds. Please try another card.";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep("error");
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="rounded-lg bg-black/30 p-4">
        <PaymentElement />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {getButtonText()}
          </span>
        ) : (
          getButtonText()
        )}
      </button>

      <div className="space-y-1 text-center text-xs text-gray-500">
        <p>🔒 Your payment information is encrypted and secure</p>
        <p>💳 We never store your full card details</p>
        <p>💰 Your billing is handled securely through Stripe</p>
      </div>
    </div>
  );
}

export default function StripeElements({
  clientSecret,
  onSuccess,
  onError,
  returnPath = "/activation",
  buttonLabel = "Add Payment Method",
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);

  const publishableKey = useMemo(
    () => process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",
    []
  );

  useEffect(() => {
    let mounted = true;

    const initStripe = async () => {
      try {
        if (!publishableKey) {
          throw new Error("Missing Stripe publishable key");
        }

        const stripe = await loadStripe(publishableKey);

        if (!mounted) return;
        setStripePromise(stripe);
      } catch (err) {
        console.error("[StripeElements] Failed to load Stripe:", err);
        if (mounted) {
          setStripePromise(null);
          onError?.(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initStripe();

    return () => {
      mounted = false;
    };
  }, [publishableKey, onError]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="text-sm text-gray-400">Loading payment form...</p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-red-400">Failed to load payment system</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="text-sm text-gray-400">Preparing secure payment form...</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#1f2937",
            colorText: "#ffffff",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, -apple-system, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
    >
      <PaymentForm
        onSuccess={onSuccess}
        onError={onError}
        returnPath={returnPath}
        buttonLabel={buttonLabel}
      />
    </Elements>
  );
}