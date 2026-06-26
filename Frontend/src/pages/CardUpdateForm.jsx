// src/pages/CardUpdateForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

export default function CardUpdateForm({ tier, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);

  // Initialize Stripe and create a new SetupIntent
  const initializeStripe = useCallback(async () => {
    setIsInitializing(true);
    setError("");
    setClientSecret(null);

    try {
      // 1. Load Stripe if not already loaded
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // 2. Get or create Stripe instance
      let stripeInstance = stripeRef.current;
      if (!stripeInstance) {
        stripeInstance = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
        if (!stripeInstance) throw new Error("Failed to initialize Stripe.");
        stripeRef.current = stripeInstance;
      }

      // 3. Create SetupIntent via your backend
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier,
      });

      if (!response?.success) {
        throw new Error(response?.error || "Failed to initialize payment setup.");
      }

      const clientSecret_ = response.data?.client_secret;
      if (!clientSecret_) throw new Error("No client secret received from server.");

      setClientSecret(clientSecret_);

      // 4. Create Stripe Elements with the client secret
      const elementsInstance = stripeInstance.elements({
        clientSecret: clientSecret_,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#050816",
            colorText: "#ffffff",
            colorTextSecondary: "#9ca3af",
            colorDanger: "#ef4444",
            fontFamily: 'system-ui, -apple-system, -webkit-system-font, "Segoe UI", sans-serif',
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

      // 5. Create Payment Element (not Card Element)
      const paymentElement = elementsInstance.create("payment");
      paymentElementRef.current = paymentElement;
      elementsRef.current = elementsInstance;

      // 6. Mount to DOM when ready
      // Use small delay to ensure DOM is ready
      setTimeout(() => {
        const container = document.getElementById("payment-element");
        if (!container) {
          throw new Error("Payment element container not found in DOM.");
        }
        try {
          paymentElement.mount("#payment-element");
          setIsInitializing(false);
        } catch (mountErr) {
          console.error("Failed to mount payment element:", mountErr);
          throw new Error("Failed to mount payment form. Please refresh and try again.");
        }
      }, 100);

    } catch (err) {
      console.error("[CardUpdateForm] Stripe init error:", err);
      setError(err?.message || "Failed to initialize payment form.");
      setIsInitializing(false);
    }
  }, [user, tier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (paymentElementRef.current) {
        paymentElementRef.current.destroy();
        paymentElementRef.current = null;
        elementsRef.current = null;
      }
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeStripe();
  }, [initializeStripe]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripeRef.current) {
      setError("Stripe is not loaded. Please refresh and try again.");
      return;
    }

    if (!elementsRef.current) {
      setError("Payment form is not ready. Please refresh and try again.");
      return;
    }

    if (!clientSecret) {
      setError("Payment setup is not initialized. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Confirm the setup intent with Payment Element
      const { error: confirmError, setupIntent } = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        clientSecret: clientSecret,
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

      if (confirmError) {
        // Handle error as per Stripe documentation
        if (confirmError.type === "card_error" || confirmError.type === "validation_error") {
          throw new Error(confirmError.message);
        } else {
          throw new Error("An unexpected payment error occurred.");
        }
      }

      if (setupIntent?.status === "succeeded") {
        // ✅ Setup was successful, confirm with your backend
        const confirmResponse = await BotAPI.confirmCard(setupIntent.id);
        if (!confirmResponse?.success) {
          throw new Error(confirmResponse?.error || "Failed to save card on our servers.");
        }

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } else if (setupIntent?.status === "processing") {
        // Still processing
        throw new Error("Payment is still processing. Please wait a moment.");
      } else {
        throw new Error(`Setup intent status: ${setupIntent?.status || "unknown"}`);
      }
    } catch (err) {
      console.error("[CardUpdateForm] Submit error:", err);
      setError(err?.message || "Failed to save card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Retry initialization
  const handleRetry = () => {
    if (paymentElementRef.current) {
      try {
        paymentElementRef.current.destroy();
      } catch (e) {
        console.warn("Error destroying payment element:", e);
      }
      paymentElementRef.current = null;
      elementsRef.current = null;
    }
    initializeStripe();
  };

  // Show error state with retry
  if (!isInitializing && !clientSecret && error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 max-w-md mx-auto">
        <h3 className="text-lg font-bold text-red-300 mb-2">Payment Setup Error</h3>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition"
          >
            Retry
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 max-w-md mx-auto shadow-2xl">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-white">
          {tier === "starter" ? "Add Payment Method" : "Update Payment Method"}
        </h3>
        <p className="text-white/50 text-sm mt-1">Your card is secure and encrypted by Stripe</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Payment Element Container */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 overflow-hidden">
          {isInitializing && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-white/60 text-sm">Loading secure payment form...</span>
            </div>
          )}

          {/* This is where the Payment Element mounts */}
          <div id="payment-element" className={isInitializing ? "hidden" : ""}>
            {/* Stripe will mount the payment element here */}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-200 text-sm flex items-start gap-2">
              <span className="text-lg leading-none">⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || isInitializing || !clientSecret}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : isInitializing ? (
              "Loading..."
            ) : (
              "Save Card"
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl font-bold transition disabled:opacity-50"
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
