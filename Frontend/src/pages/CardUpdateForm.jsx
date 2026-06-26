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
  const cardElementRef = useRef(null);

  // Initialize Stripe and create a new SetupIntent
  const initializeStripe = useCallback(async () => {
    setIsInitializing(true);
    setError("");
    setClientSecret(null);

    try {
      // 1. Get Stripe instance
      let stripeInstance = stripeRef.current;
      if (!stripeInstance) {
        if (window.Stripe) {
          stripeInstance = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
        } else {
          // Load script dynamically
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://js.stripe.com/v3/";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          stripeInstance = window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
        }
        stripeRef.current = stripeInstance;
      }

      if (!stripeInstance) throw new Error("Stripe failed to load.");

      // 2. Create SetupIntent via your backend
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier,
      });

      if (!response?.success) {
        throw new Error(response?.error || "Failed to initialize payment setup.");
      }

      const { client_secret } = response.data || {};
      if (!client_secret) throw new Error("No client secret received.");

      setClientSecret(client_secret);

      // 3. Mount Stripe Elements - wait for DOM to be ready
      const elementsInstance = stripeInstance.elements({ 
        clientSecret: client_secret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#6366f1',
            colorBackground: '#1a1a2e',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '12px',
          },
        },
      });
      
      const card = elementsInstance.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#e5e7eb",
            "::placeholder": { color: "#6b7280" },
            backgroundColor: "transparent",
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          invalid: {
            color: "#ef4444",
          },
        },
      });

      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        const container = document.getElementById("card-element");
        if (container) {
          card.mount("#card-element");
          cardElementRef.current = card;
          elementsRef.current = elementsInstance;
          setIsInitializing(false);
        } else {
          throw new Error("Card element container not found.");
        }
      }, 100);
      
    } catch (err) {
      console.error("Stripe init error:", err);
      setError(err.message || "Failed to initialize payment form.");
      setIsInitializing(false);
    }
  }, [user, tier]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
        cardElementRef.current = null;
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
    
    // ✅ Check if all required elements are ready
    if (!stripeRef.current) {
      setError("Stripe is not loaded. Please refresh and try again.");
      return;
    }
    
    if (!cardElementRef.current) {
      setError("Card form is not ready. Please wait a moment and try again.");
      return;
    }
    
    if (!clientSecret) {
      setError("Payment setup is not initialized. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: stripeError, setupIntent } = await stripeRef.current.confirmSetup({
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

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent.status === "succeeded") {
        // Confirm with your backend
        const confirmResponse = await BotAPI.confirmCard(setupIntent.id);
        if (!confirmResponse?.success) {
          throw new Error(confirmResponse?.error || "Failed to save card on our servers.");
        }
        // Success
        if (onSuccess) onSuccess();
      } else {
        throw new Error("Setup intent was not successful.");
      }
    } catch (err) {
      console.error("Card save error:", err);
      setError(err.message || "Failed to save card.");
    } finally {
      setLoading(false);
    }
  };

  // Retry initialization
  const handleRetry = () => {
    // Clean old card element
    if (cardElementRef.current) {
      cardElementRef.current.destroy();
      cardElementRef.current = null;
      elementsRef.current = null;
    }
    initializeStripe();
  };

  // Show retry if initialization failed and no clientSecret
  if (!isInitializing && !clientSecret && error) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto">
        <div className="text-center">
          <p className="text-red-400 mb-4">⚠️ {error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          {tier === "starter" ? "Add Payment Method" : "Update Payment Method"}
        </h3>
        <span className="text-xs text-gray-400">Secure • Stripe</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-black/40 rounded-xl p-4 border border-gray-700">
          <div id="card-element" className="py-2 text-white">
            {/* Stripe card input will be mounted here */}
          </div>
          {isInitializing && (
            <div className="flex items-center justify-center py-2">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-gray-400 text-sm">Loading secure form...</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span>🔒</span> Powered by Stripe
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || isInitializing || !clientSecret}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-bold transition disabled:opacity-50 shadow-lg"
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
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
