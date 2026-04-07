// src/components/StripeElements.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import BotAPI from "../utils/BotAPI";

// ==============================================
// PAYMENT FORM COMPONENT
// ==============================================
function PaymentForm({
  onSuccess,
  onError,
  returnPath = "/activation",
  buttonLabel = "Add Payment Method",
  setupIntentId,
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("idle"); // idle, confirming, saving, success, error

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

  const confirmWithBackend = useCallback(async (setupIntentIdFromStripe) => {
    const intentId = setupIntentIdFromStripe || setupIntentId;
    
    if (!intentId) {
      console.warn("[StripeElements] No setup intent ID available for backend confirmation");
      // Still return success since Stripe confirmed the setup
      return { confirmed: true, demo: true };
    }

    const result = await BotAPI.confirmCard({ setup_intent_id: intentId });
    
    if (!result.success || !result.confirmed) {
      throw new Error(result.error || "Failed to confirm payment method with server");
    }
    
    return result;
  }, [setupIntentId]);

  const handleSubmit = async () => {
    if (!stripe || !elements || busy) return;

    setBusy(true);
    setError("");
    setStep("confirming");

    try {
      // Step 1: Confirm setup with Stripe
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${returnPath}`,
        },
        redirect: "if_required",
      });

      if (stripeError) {
        throw stripeError;
      }

      // Step 2: Verify setup intent succeeded
      if (!setupIntent || setupIntent.status !== 'succeeded') {
        throw new Error("Payment setup was not completed successfully");
      }

      setStep("saving");

      // Step 3: Confirm with backend
      const confirmResult = await confirmWithBackend(setupIntent.id);

      setStep("success");
      
      // Step 4: Call success callback
      if (onSuccess) {
        onSuccess({
          setupIntentId: setupIntent.id,
          confirmed: confirmResult.confirmed,
          ...confirmResult
        });
      }

      // Step 5: Redirect if returnPath is a full URL or handle navigation
      if (returnPath.startsWith('http')) {
        window.location.href = returnPath;
      } else if (returnPath !== "/activation" || confirmResult.redirect) {
        // Only redirect if not the default path or if backend requests redirect
        setTimeout(() => {
          window.location.href = returnPath;
        }, 1500);
      }

    } catch (err) {
      console.error("[StripeElements] Payment error:", err);

      let errorMessage = "Failed to save payment method";
      
      // User-friendly error messages
      if (err?.type === "card_error" || err?.code) {
        switch (err.code) {
          case "card_declined":
            errorMessage = "Your card was declined. Please try another card.";
            break;
          case "expired_card":
            errorMessage = "Your card has expired. Please use a different card.";
            break;
          case "incorrect_cvc":
            errorMessage = "Incorrect security code. Please try again.";
            break;
          case "processing_error":
            errorMessage = "An error occurred while processing your card. Please try again.";
            break;
          case "insufficient_funds":
            errorMessage = "Insufficient funds. Please try another card.";
            break;
          default:
            errorMessage = err.message || err?.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep("error");
      
      if (onError) {
        onError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span className="font-semibold">⚠️ Error:</span> {error}
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

// ==============================================
// MAIN STRIPE ELEMENTS COMPONENT
// ==============================================
export default function StripeElements({
  clientSecret,
  setupIntentId,
  onSuccess,
  onError,
  returnPath = "/activation",
  buttonLabel = "Add Payment Method",
  appearance = {},
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  const publishableKey = useMemo(
    () => process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",
    []
  );

  // Stripe appearance configuration
  const stripeAppearance = useMemo(() => ({
    theme: "night",
    variables: {
      colorPrimary: "#10b981",
      colorBackground: "#1f2937",
      colorText: "#ffffff",
      colorDanger: "#ef4444",
      colorTextSecondary: "#9ca3af",
      colorTextPlaceholder: "#6b7280",
      fontFamily: "system-ui, -apple-system, sans-serif",
      borderRadius: "8px",
      spacingUnit: "4px",
    },
    rules: {
      '.Input': {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
      },
      '.Input:focus': {
        borderColor: '#10b981',
        boxShadow: '0 0 0 1px #10b981',
      },
      '.Label': {
        color: '#9ca3af',
        fontSize: '12px',
        marginBottom: '4px',
      },
    },
    ...appearance,
  }), [appearance]);

  // Initialize Stripe
  useEffect(() => {
    let mounted = true;

    const initStripe = async () => {
      try {
        if (!publishableKey) {
          throw new Error("Missing Stripe publishable key. Please check your environment variables.");
        }

        if (publishableKey === "pk_test_default") {
          console.warn("[StripeElements] Using default test key. Replace with your actual Stripe publishable key.");
        }

        const stripe = await loadStripe(publishableKey);

        if (!mounted) return;
        
        if (!stripe) {
          throw new Error("Failed to initialize Stripe");
        }

        setStripePromise(stripe);
        setInitError(null);
      } catch (err) {
        console.error("[StripeElements] Failed to load Stripe:", err);
        if (mounted) {
          setInitError(err.message || "Failed to load payment system");
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

  // Handle loading state
  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="text-sm text-gray-400">Loading secure payment form...</p>
      </div>
    );
  }

  // Handle initialization error
  if (initError || !stripePromise) {
    return (
      <div className="py-8 text-center">
        <div className="mb-3 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
          ⚠️ {initError || "Failed to load payment system"}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Retry
        </button>
      </div>
    );
  }

  // Handle missing client secret
  if (!clientSecret) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
        <p className="text-sm text-gray-400">Preparing secure payment form...</p>
      </div>
    );
  }

  // Render Elements provider with payment form
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: stripeAppearance,
        loader: "auto",
      }}
    >
      <PaymentForm
        onSuccess={onSuccess}
        onError={onError}
        returnPath={returnPath}
        buttonLabel={buttonLabel}
        setupIntentId={setupIntentId}
      />
    </Elements>
  );
}
