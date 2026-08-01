// src/components/StripeElements.jsx - REWRITTEN (Improved error handling & UX)
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
  tier = "pro",
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
    
    // Show tier-specific button text
    if (tier === "starter") return "Start Free Trial";
    if (tier === "pro") return "Start Pro - $19/month";
    if (tier === "elite") return "Start Elite - $49/month";
    
    return buttonLabel;
  };

  const confirmWithBackend = useCallback(async (setupIntentIdFromStripe) => {
    const intentId = setupIntentIdFromStripe || setupIntentId;
    
    if (!intentId) {
      console.warn("[StripeElements] No setup intent ID available for backend confirmation");
      return { confirmed: true, demoMode: true };
    }

    // Try confirmCard first
    if (BotAPI.confirmCard && typeof BotAPI.confirmCard === "function") {
      const result = await BotAPI.confirmCard({ setup_intent_id: intentId });
      if (result.success) return result;
    }
    
    // Fallback: try refreshActivation
    if (BotAPI.refreshActivation && typeof BotAPI.refreshActivation === "function") {
      await BotAPI.refreshActivation(true);
      return { confirmed: true, success: true };
    }
    
    return { confirmed: true, demoMode: true };
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
      if (!setupIntent || (setupIntent.status !== 'succeeded' && setupIntent.status !== 'processing')) {
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
          confirmed: confirmResult.confirmed || confirmResult.success,
          demoMode: confirmResult.demoMode,
          ...confirmResult
        });
      }

      // Step 5: Show success message briefly before redirect
      setTimeout(() => {
        if (returnPath.startsWith('http')) {
          window.location.href = returnPath;
        } else if (returnPath === "/activation") {
          // Stay on activation page, let parent component handle redirect
          console.log("[StripeElements] Payment successful, staying on activation page");
        } else {
          window.location.href = returnPath;
        }
      }, 1500);

    } catch (err) {
      console.error("[StripeElements] Payment error:", err);

      let errorMessage = "Failed to save payment method";
      
      // User-friendly error messages based on Stripe error codes
      if (err?.type === "card_error" || err?.code) {
        switch (err.code) {
          case "card_declined":
            errorMessage = "Your card was declined. Please use a different card or contact your bank.";
            break;
          case "expired_card":
            errorMessage = "Your card has expired. Please use a different card.";
            break;
          case "incorrect_cvc":
            errorMessage = "The security code is incorrect. Please try again.";
            break;
          case "processing_error":
            errorMessage = "An error occurred while processing your card. Please try again.";
            break;
          case "insufficient_funds":
            errorMessage = "Insufficient funds. Please use a different card.";
            break;
          case "invalid_number":
            errorMessage = "The card number is invalid. Please check and try again.";
            break;
          case "invalid_expiry_month":
          case "invalid_expiry_year":
            errorMessage = "The card expiry date is invalid. Please check and try again.";
            break;
          default:
            errorMessage = err.message || err?.message || "Card was declined. Please try again.";
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Payment Error</p>
              <p className="text-red-200/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <PaymentElement />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-bold text-white transition-all hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {getButtonText()}
          </span>
        ) : (
          getButtonText()
        )}
      </button>

      <div className="space-y-2 text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">🔒</span>
          <span>Your payment information is encrypted and secure</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">💳</span>
          <span>We never store your full card details</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">💰</span>
          <span>Billing handled securely through Stripe</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">🔄</span>
          <span>Cancel anytime • No hidden fees</span>
        </div>
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
  tier = "pro",
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Get publishable key from environment
  const publishableKey = useMemo(
    () => process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",
    []
  );

  // Stripe appearance configuration (dark theme matching dashboard)
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
      borderRadius: "12px",
      spacingUnit: "4px",
      gridRowSpacing: "16px",
    },
    rules: {
      '.Input': {
        backgroundColor: '#374151',
        borderColor: '#4b5563',
        borderRadius: '8px',
        padding: '12px',
      },
      '.Input:focus': {
        borderColor: '#10b981',
        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
      },
      '.Label': {
        color: '#9ca3af',
        fontSize: '12px',
        marginBottom: '6px',
        fontWeight: '500',
      },
      '.Tab': {
        backgroundColor: '#374151',
        borderRadius: '8px',
      },
      '.Tab:hover': {
        backgroundColor: '#4b5563',
      },
      '.Tab--selected': {
        backgroundColor: '#10b981',
        color: '#ffffff',
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
          if (onError) onError(err);
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
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Loading secure payment form...</p>
      </div>
    );
  }

  // Handle initialization error
  if (initError || !stripePromise) {
    return (
      <div className="py-8 text-center">
        <div className="mb-3 rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <span className="font-semibold">Payment System Unavailable</span>
          </div>
          <p>{initError || "Failed to load payment system"}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Handle missing client secret - show loading
  if (!clientSecret) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
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
        tier={tier}
      />
    </Elements>
  );
}
