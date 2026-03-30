// src/components/StripeElements.jsx
import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// This component handles the actual Stripe payment form
function PaymentForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("idle");

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setStep("confirming");
    setError("");

    try {
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/activation`,
        },
        redirect: "if_required",
      });

      if (stripeError) throw stripeError;

      setStep("saving");
      
      // Confirm with backend
      const confirmResult = await BotAPI.confirmCard();
      
      if (!confirmResult) throw new Error("No response from server");

      setStep("success");
      onSuccess();

    } catch (err) {
      console.error("Payment error:", err);
      
      let errorMessage = "Failed to save payment method";
      if (err.message?.includes("card_declined")) {
        errorMessage = "Your card was declined. Please try another card.";
      } else if (err.message?.includes("insufficient_funds")) {
        errorMessage = "Insufficient funds. Please try another card.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      onError(err);
      setStep("error");
    } finally {
      setBusy(false);
    }
  };

  const getButtonText = () => {
    switch (step) {
      case "confirming": return "Confirming with Stripe...";
      case "saving": return "Saving to account...";
      case "success": return "✓ Payment Method Added!";
      default: return "Add Payment Method";
    }
  };

  const isDisabled = busy || !stripe || !elements || step === "success";

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-black/30 rounded-lg p-4">
        <PaymentElement />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            {getButtonText()}
          </span>
        ) : (
          getButtonText()
        )}
      </button>

      <div className="text-xs text-center text-gray-500 space-y-1">
        <p>🔒 Your payment information is encrypted and secure</p>
        <p>💳 We never store your full card details</p>
        <p>💰 You'll only be charged 30% of trading profits</p>
      </div>
    </div>
  );
}

// Main StripeElements component that lazy loads Stripe
export default function StripeElements({ clientSecret, onSuccess, onError }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStripeAsync = async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
        setStripePromise(() => stripe);
      } catch (err) {
        console.error("Failed to load Stripe:", err);
        onError?.(new Error("Failed to load payment system"));
      } finally {
        setLoading(false);
      }
    };
    
    loadStripeAsync();
  }, [onError]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading payment form...</p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">Failed to load payment system</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Retry
        </button>
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
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
