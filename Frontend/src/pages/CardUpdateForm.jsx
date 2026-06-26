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

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const containerIdRef = useRef(`stripe-${Math.random().toString(36).substr(2, 9)}`);

  const containerId = containerIdRef.current;

  // Initialize Stripe and Payment Element
  const initStripe = useCallback(async () => {
    setInitializing(true);
    setError("");
    setMounted(false);

    try {
      console.log("🟦 Step 1: Load Stripe.js");

      // 1. Load Stripe if needed
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        console.log("✅ Stripe.js loaded");
      } else {
        console.log("ℹ️ Stripe.js already loaded");
      }

      console.log("🟦 Step 2: Create Stripe instance");

      // 2. Create Stripe instance
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) throw new Error("Stripe initialization failed");
      stripeRef.current = stripe;
      console.log("✅ Stripe instance created");

      console.log("🟦 Step 3: Call backend to create SetupIntent");

      // 3. Call backend to get SetupIntent client_secret
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier || "pro",
      });

      console.log("Backend response:", response);

      if (!response?.success) {
        throw new Error(response?.error || "Backend failed to create SetupIntent");
      }

      const clientSecret = response.data?.client_secret;
      if (!clientSecret || !clientSecret.includes("_secret_")) {
        throw new Error(`Invalid client_secret: ${clientSecret}`);
      }

      console.log("✅ Valid client_secret received:", clientSecret.substring(0, 20) + "...");

      console.log("🟦 Step 4: Create Stripe Elements");

      // 4. Create Elements with client_secret
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

      console.log("🟦 Step 5: Create Payment Element");

      // 5. Create Payment Element
      const paymentElement = elements.create("payment", { layout: "tabs" });
      paymentElementRef.current = paymentElement;
      console.log("✅ Payment Element created");

      console.log("🟦 Step 6: Mount to DOM");

      // 6. Mount Payment Element to container
      let mountAttempts = 0;
      const maxAttempts = 20; // 2 seconds with 100ms intervals

      while (mountAttempts < maxAttempts) {
        const container = document.getElementById(containerId);

        if (container && container.offsetParent !== null) {
          console.log("🎯 Container found and visible, mounting...");
          paymentElement.mount(`#${containerId}`);
          setMounted(true);
          setInitializing(false);
          console.log("✅ Payment Element mounted successfully!");
          return;
        }

        await new Promise((r) => setTimeout(r, 100));
        mountAttempts += 1;
      }

      throw new Error(`Container not found after ${maxAttempts} attempts`);
    } catch (err) {
      console.error("❌ Initialization failed:", err.message);
      setError(err.message || "Failed to load payment form");
      setInitializing(false);
    }
  }, [containerId, tier, user]);

  // Initialize on mount
  useEffect(() => {
    initStripe();
  }, [initStripe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up Payment Element");
      if (paymentElementRef.current) {
        try {
          paymentElementRef.current.destroy();
          paymentElementRef.current = null;
        } catch (e) {
          console.warn("Cleanup warning:", e.message);
        }
      }
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!stripeRef.current) {
      setError("Stripe not loaded");
      return;
    }
    if (!elementsRef.current) {
      setError("Payment form not initialized");
      return;
    }
    if (!mounted) {
      setError("Payment form not mounted");
      return;
    }
    if (initializing) {
      setError("Payment form still loading");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("📤 Confirming setup with Stripe...");

      const { error: confirmError, setupIntent } = await stripeRef.current.confirmSetup({
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

      if (confirmError) {
        console.error("❌ Stripe error:", confirmError);
        throw new Error(confirmError.message || "Card setup failed");
      }

      if (setupIntent?.status === "succeeded") {
        console.log("✅ Setup intent succeeded");
        console.log("💾 Confirming with backend...");

        // Confirm with backend
        const confirmRes = await BotAPI.confirmCard(setupIntent.id);

        if (!confirmRes?.success) {
          throw new Error(confirmRes?.error || "Failed to save card on backend");
        }

        console.log("✅ Card saved successfully!");
        setError("");
        onSuccess?.();
      } else {
        throw new Error(`Setup failed: ${setupIntent?.status}`);
      }
    } catch (err) {
      console.error("❌ Submit error:", err.message);
      setError(err.message || "Failed to save card");
    } finally {
      setLoading(false);
    }
  };

  // Retry handler
  const handleRetry = () => {
    console.log("🔄 Retrying...");
    setInitializing(true);
    setError("");
    setMounted(false);
    initStripe();
  };

  // Error state
  if (!initializing && !mounted && error) {
    return (
      <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5">
        <h4 className="text-lg font-black text-red-300 mb-2">⚠️ Error</h4>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
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

        {/* Action buttons */}
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
