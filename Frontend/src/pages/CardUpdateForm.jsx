// src/pages/CardUpdateForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

export default function CardUpdateForm({
  tier,
  onSuccess,
  onCancel,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Store all Stripe references
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);
  const componentIdRef = useRef(Math.random().toString(36).substr(2, 9)); // Unique ID for this form

  const containerId = `payment-element-${componentIdRef.current}`;

  // Initialize Stripe
  const initStripe = useCallback(async () => {
    if (initializing) return; // Prevent multiple inits
    setInitializing(true);
    setError("");
    setMounted(false);

    try {
      console.log("🔵 Starting Stripe initialization...");

      // 1. Load Stripe.js if needed
      if (!window.Stripe) {
        console.log("📦 Loading Stripe.js...");
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.stripe.com/v3/";
          script.async = true;
          script.onload = () => {
            console.log("✅ Stripe.js loaded");
            resolve();
          };
          script.onerror = () => {
            console.error("❌ Failed to load Stripe.js");
            reject(new Error("Failed to load Stripe.js"));
          };
          document.head.appendChild(script);
        });
      } else {
        console.log("ℹ️ Stripe.js already loaded");
      }

      // 2. Create Stripe instance
      console.log("🔑 Creating Stripe instance...");
      const stripe = window.Stripe(
        process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
      );

      if (!stripe) {
        throw new Error("Failed to initialize Stripe");
      }

      stripeRef.current = stripe;
      console.log("✅ Stripe instance created");

      // 3. Create SetupIntent
      console.log("📋 Creating SetupIntent...");
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier || "pro",
      });

      console.log("SetupIntent response:", response);

      if (!response?.success) {
        throw new Error(
          response?.error || "Failed to create payment setup"
        );
      }

      const clientSecret = response.data?.client_secret;
      if (!clientSecret) {
        throw new Error("No client secret received from server");
      }

      console.log("✅ SetupIntent created with client secret");

      // 4. Destroy any existing elements first
      if (elementsRef.current) {
        console.log("🗑️ Destroying existing elements...");
        try {
          elementsRef.current = null;
        } catch (e) {
          console.warn("Error destroying old elements:", e);
        }
      }

      if (paymentElementRef.current) {
        console.log("🗑️ Destroying existing payment element...");
        try {
          paymentElementRef.current.destroy();
          paymentElementRef.current = null;
        } catch (e) {
          console.warn("Error destroying old payment element:", e);
        }
      }

      // 5. Create new Stripe Elements
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
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", sans-serif',
            spacingUnit: "4px",
            borderRadius: "12px",
          },
        },
      });

      elementsRef.current = elements;
      console.log("✅ Elements instance created");

      // 6. Create Payment Element (NOT Card Element)
      console.log("💳 Creating Payment Element...");
      const paymentElement = elements.create("payment", {
        layout: "tabs",
      });

      paymentElementRef.current = paymentElement;
      console.log("✅ Payment Element created");

      // 7. Wait for container and mount
      console.log(`🔍 Looking for container: #${containerId}`);

      let mounted = false;
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds with 100ms intervals

      while (attempts < maxAttempts && !mounted) {
        const container = document.getElementById(containerId);

        if (container) {
          // Check if container is actually visible
          const rect = container.getBoundingClientRect();
          const isVisible =
            container.offsetParent !== null && rect.height > 0;

          console.log(`Attempt ${attempts + 1}: Container found`, {
            visible: isVisible,
            height: rect.height,
            offsetParent: !!container.offsetParent,
          });

          if (isVisible) {
            try {
              console.log("🚀 Mounting Payment Element...");
              paymentElement.mount(`#${containerId}`);
              mounted = true;
              console.log("✅ Payment Element mounted successfully!");
              setMounted(true);
              setInitializing(false);
              return; // SUCCESS!
            } catch (err) {
              console.error("❌ Mount error:", err);
              throw err;
            }
          }
        } else {
          console.log(`Attempt ${attempts + 1}: Container not found yet`);
        }

        await new Promise((r) => setTimeout(r, 100));
        attempts += 1;
      }

      if (!mounted) {
        throw new Error(
          `Failed to mount payment element after ${maxAttempts} attempts. Container ID: ${containerId}`
        );
      }
    } catch (err) {
      console.error("❌ Initialization error:", err);
      setError(err?.message || "Failed to load payment form");
      setInitializing(false);
      setMounted(false);
    }
  }, [containerId, tier, user, initializing]);

  // Initialize on mount
  useEffect(() => {
    initStripe();
  }, [initStripe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up CardUpdateForm...");

      // Destroy payment element
      if (paymentElementRef.current) {
        try {
          paymentElementRef.current.destroy();
          paymentElementRef.current = null;
        } catch (e) {
          console.warn("Cleanup error (payment element):", e);
        }
      }

      // Clear other refs
      elementsRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("📤 Form submitted", {
      hasStripe: !!stripeRef.current,
      hasElements: !!elementsRef.current,
      hasPaymentElement: !!paymentElementRef.current,
      isMounted: mounted,
      loading,
      initializing,
    });

    // Validation
    if (!stripeRef.current) {
      setError("Stripe failed to load. Please refresh the page.");
      return;
    }

    if (!elementsRef.current) {
      setError("Payment form failed to initialize. Please refresh the page.");
      return;
    }

    if (!paymentElementRef.current) {
      setError("Payment element failed to create. Please refresh the page.");
      return;
    }

    if (!mounted) {
      setError(
        "Payment form is not ready. Please wait for it to load completely."
      );
      return;
    }

    if (initializing) {
      setError("Payment form is still loading. Please wait.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔒 Confirming setup with Stripe...");

      const { error: stripeError, setupIntent } =
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

      console.log("Stripe response:", {
        error: stripeError,
        setupIntent,
      });

      if (stripeError) {
        console.error("❌ Stripe error:", stripeError);
        throw new Error(
          stripeError.message ||
            "Card setup failed. Please check your card details."
        );
      }

      if (setupIntent?.status === "succeeded") {
        console.log("✅ Setup intent succeeded");
        console.log("💾 Confirming with backend...");

        // Confirm with backend
        const confirmRes = await BotAPI.confirmCard(setupIntent.id);

        console.log("Backend response:", confirmRes);

        if (!confirmRes?.success) {
          throw new Error(
            confirmRes?.error || "Failed to save card on our servers"
          );
        }

        console.log("✅ Card saved successfully!");
        setError("");
        onSuccess?.();
      } else {
        throw new Error(
          `Setup failed with status: ${setupIntent?.status || "unknown"}`
        );
      }
    } catch (err) {
      console.error("❌ Payment error:", err);
      setError(
        err?.message ||
          "Failed to save card. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Retry handler
  const handleRetry = () => {
    console.log("🔄 Retrying initialization...");

    // Reset all refs
    if (paymentElementRef.current) {
      try {
        paymentElementRef.current.destroy();
      } catch (e) {
        console.warn("Error destroying element on retry:", e);
      }
    }

    paymentElementRef.current = null;
    elementsRef.current = null;
    stripeRef.current = null;

    // Reset state and reinit
    setMounted(false);
    setError("");
    setInitializing(true);

    // Small delay then retry
    setTimeout(() => {
      initStripe();
    }, 100);
  };

  // Error state
  if (!initializing && !mounted && error) {
    return (
      <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5">
        <h4 className="text-lg font-black text-red-300 mb-2">
          ⚠️ Payment Setup Error
        </h4>
        <p className="text-red-200 text-sm mb-4">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3">
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
        {/* Payment Element Container - UNIQUE ID */}
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
          {/* Stripe mounts here */}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-red-200 text-sm flex gap-2">
              <span className="flex-shrink-0">⚠️</span>
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

        {/* Security badge */}
        <p className="text-xs text-white/40 text-center">
          🔒 Secure payment powered by Stripe
        </p>
      </form>
    </div>
  );
}
