// src/pages/CardUpdateForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

export default function CardUpdateForm({ tier, onSuccess, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Refs
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const containerRef = useRef(null);
  const isMountedRef = useRef(true); // Track if component is still mounted
  const idRef = useRef(Math.random().toString(36).substr(2, 9));

  const containerId = `payment-${idRef.current}`;

  // Initialize Stripe
  const initStripe = useCallback(async () => {
    // Don't init if component is unmounted
    if (!isMountedRef.current) return;

    setInitializing(true);
    setError("");
    setMounted(false);

    try {
      console.log("🔵 Loading Stripe.js...");

      // Load Stripe
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (!isMountedRef.current) return;

      // Create Stripe instance
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) throw new Error("Stripe failed to load");
      stripeRef.current = stripe;
      console.log("✅ Stripe loaded");

      // Get SetupIntent from backend
      console.log("📋 Getting SetupIntent from backend...");
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier || "pro",
      });

      if (!isMountedRef.current) return;

      if (!response?.success) {
        throw new Error(response?.error || "Backend error creating SetupIntent");
      }

      const clientSecret = response.data?.client_secret;
      if (!clientSecret) {
        throw new Error("No client_secret from backend");
      }

      console.log("✅ Got client_secret");

      // Create Elements
      console.log("🎨 Creating Stripe Elements...");
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
        },
      });

      elementsRef.current = elements;
      console.log("✅ Elements created");

      if (!isMountedRef.current) {
        // Clean up if unmounted
        elements.getElement("payment")?.destroy();
        return;
      }

      // Create Payment Element
      console.log("💳 Creating Payment Element...");
      const paymentElement = elements.create("payment", { layout: "tabs" });
      paymentElementRef.current = paymentElement;
      console.log("✅ Payment Element created");

      // Mount with safety checks
      console.log("🔍 Finding container...");
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts && isMountedRef.current) {
        const container = document.getElementById(containerId);

        if (container && container.offsetParent !== null) {
          console.log("🚀 Mounting Payment Element...");
          try {
            paymentElement.mount(`#${containerId}`);
            console.log("✅ Mounted successfully");
            setMounted(true);
            setInitializing(false);
            return;
          } catch (err) {
            console.error("Mount error:", err);
            throw err;
          }
        }

        await new Promise((r) => setTimeout(r, 100));
        attempts += 1;
      }

      if (!isMountedRef.current) return;

      throw new Error("Container not found for mounting");
    } catch (err) {
      console.error("Init error:", err);
      if (isMountedRef.current) {
        setError(err?.message || "Failed to load payment form");
        setInitializing(false);
      }
    }
  }, [containerId, tier, user]);

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;
    initStripe();

    return () => {
      isMountedRef.current = false;
    };
  }, [initStripe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up CardUpdateForm...");
      isMountedRef.current = false;

      // ⭐ CRITICAL: Safely destroy Payment Element
      if (paymentElementRef.current) {
        try {
          // Don't call destroy - let Stripe handle cleanup
          paymentElementRef.current = null;
        } catch (e) {
          console.warn("Cleanup warning:", e);
        }
      }

      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isMountedRef.current) return;

    if (!stripeRef.current || !elementsRef.current || !mounted) {
      setError("Payment form not ready");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("📤 Confirming setup...");

      const { error: confirmError, setupIntent } = 
        await stripeRef.current.confirmSetup({
          elements: elementsRef.current,
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

      if (!isMountedRef.current) return;

      if (confirmError) {
        throw new Error(confirmError.message || "Setup failed");
      }

      if (setupIntent?.status === "succeeded") {
        console.log("✅ Setup succeeded");

        const confirmRes = await BotAPI.confirmCard(setupIntent.id);

        if (!isMountedRef.current) return;

        if (!confirmRes?.success) {
          throw new Error(confirmRes?.error || "Failed to save card");
        }

        console.log("✅ Card saved");
        onSuccess?.();
      } else {
        throw new Error(`Setup failed: ${setupIntent?.status}`);
      }
    } catch (err) {
      console.error("Submit error:", err);
      if (isMountedRef.current) {
        setError(err?.message || "Failed to save card");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Error state
  if (!initializing && !mounted && error) {
    return (
      <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5">
        <h4 className="text-lg font-black text-red-300 mb-2">⚠️ Error</h4>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setError("");
              setInitializing(true);
              setMounted(false);
              initStripe();
            }}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition"
          >
            Retry
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black rounded-xl transition"
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
    <div className="space-y-4">
      <h4 className="text-lg font-black text-white">
        {tier === "starter" ? "Add Payment Method" : "Update Payment Method"}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment Element Container */}
        <div
          ref={containerRef}
          id={containerId}
          className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 overflow-hidden w-full"
          style={{ minHeight: initializing ? "250px" : "auto" }}
        >
          {initializing && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-sm">Loading secure payment form...</p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-red-200 text-sm flex gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || initializing || !mounted}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-emerald-600/50 disabled:to-emerald-700/50 text-white font-black rounded-xl transition shadow-lg disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : !mounted ? (
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
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-xs text-white/40 text-center">🔒 Secure payment powered by Stripe</p>
      </form>
    </div>
  );
}
