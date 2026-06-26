// src/pages/CardUpdateForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

export default function CardUpdateForm({ tier, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const elementRef = useRef(null);

  // Initialize Stripe
  const initStripe = useCallback(async () => {
    setInitializing(true);
    setError("");

    try {
      // 1. Load Stripe script
      if (!window.Stripe) {
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // 2. Create Stripe instance
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY, {
        apiVersion: "2023-10-16",
      });
      if (!stripe) throw new Error("Stripe initialization failed");
      stripeRef.current = stripe;

      // 3. Create SetupIntent
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier || "pro",
      });

      if (!response?.success) {
        throw new Error(response?.error || "Failed to create payment setup");
      }

      const clientSecret = response.data?.client_secret;
      if (!clientSecret) throw new Error("No client secret from server");

      // 4. Create Elements
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#050816",
            colorText: "#ffffff",
            colorTextSecondary: "#9ca3af",
            colorDanger: "#ef4444",
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            spacingUnit: "4px",
            borderRadius: "12px",
          },
          rules: {
            ".Input": {
              border: "1px solid #374151",
              boxShadow: "0 0 0 1px #374151",
            },
            ".Input:focus": {
              border: "1px solid #10b981",
              boxShadow: "0 0 0 1px #10b981",
            },
          },
        },
      });

      elementsRef.current = { stripe, elements, clientSecret };

      // 5. Create Payment Element
      const paymentElement = elements.create("payment");
      elementRef.current = paymentElement;

      // Mount with proper timing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const container = document.getElementById("stripe-payment-element");
      if (!container) throw new Error("Payment element container not found");

      paymentElement.mount("#stripe-payment-element");
      setInitializing(false);
    } catch (err) {
      console.error("Stripe init error:", err);
      setError(err?.message || "Failed to load payment form");
      setInitializing(false);
    }
  }, [user, tier]);

  // Initialize on mount
  useEffect(() => {
    initStripe();
  }, [initStripe]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        try {
          elementRef.current.destroy();
        } catch (e) {
          console.warn("Cleanup error:", e);
        }
      }
    };
  }, []);

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!elementsRef.current || loading || initializing) return;

    setLoading(true);
    setError("");

    try {
      const { stripe, elements, clientSecret } = elementsRef.current;

      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/billing?setup_success=true`,
          payment_method_data: {
            billing_details: {
              name: user?.displayName || user?.email || "Customer",
              email: user?.email || "",
            },
          },
        },
        redirect: "if_required",
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.status === "succeeded") {
        const confirmRes = await BotAPI.confirmCard(setupIntent.id);
        if (!confirmRes?.success) {
          throw new Error(confirmRes?.error || "Failed to save card");
        }
        onSuccess?.();
      } else {
        throw new Error(`Setup failed: ${setupIntent?.status}`);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Error state
  if (!initializing && !elementsRef.current && error) {
    return (
      <div className="rounded-[2rem] border border-red-500/40 bg-red-500/10 p-5 md:p-6 max-w-md mx-auto">
        <h3 className="text-lg font-bold text-red-300 mb-2">⚠️ Payment Setup Error</h3>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => initStripe()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
          >
            Retry
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold rounded-xl transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-xl max-w-md mx-auto">
      <div className="mb-5">
        <h3 className="text-xl font-black text-white">
          {tier === "starter" ? "Add Payment Method" : "Update Payment Method"}
        </h3>
        <p className="text-white/50 text-sm mt-1">
          🔒 Your card is secure and encrypted by Stripe
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Payment Element */}
        <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 overflow-hidden">
          {initializing ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-white/60 text-sm">
                Loading secure payment form...
              </span>
            </div>
          ) : (
            <div
              id="stripe-payment-element"
              className="w-full"
              style={{ minHeight: "200px" }}
            />
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-red-200 text-sm flex items-start gap-2">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || initializing}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-emerald-600/50 disabled:to-emerald-700/50 text-white font-black rounded-2xl transition shadow-lg disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Save Card"
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black rounded-2xl transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1 text-xs text-white/50 pt-2">
          <span>🔒</span>
          <span>Secure payment powered by Stripe</span>
        </div>
      </form>
    </div>
  );
}