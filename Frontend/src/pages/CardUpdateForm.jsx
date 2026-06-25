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

  // Load Stripe.js script once
  const loadStripeScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Stripe.js"));
      document.head.appendChild(script);
    });
  };

  const initializeStripe = useCallback(async () => {
    setIsInitializing(true);
    setError("");
    setClientSecret(null);

    try {
      // Ensure Stripe is loaded
      await loadStripeScript();

      const stripeInstance =
        stripeRef.current ||
        window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

      if (!stripeInstance) throw new Error("Stripe failed to initialize.");

      stripeRef.current = stripeInstance;

      // Create SetupIntent
      const response = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tier || user?.tier,
      });

      if (!response?.success) {
        throw new Error(response?.error || "Failed to initialize payment setup.");
      }

      const { client_secret, setup_intent_id } = response.data || {};
      if (!client_secret) throw new Error("No client secret received from server.");

      setClientSecret(client_secret);

      // Create and mount Stripe Elements
      const elements = stripeInstance.elements({ clientSecret: client_secret });
      const card = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#e5e7eb",
            "::placeholder": { color: "#6b7280" },
            backgroundColor: "transparent",
          },
        },
      });

      const container = document.getElementById("card-element");
      if (!container) throw new Error("Card element container not found.");

      card.mount("#card-element");
      cardElementRef.current = card;
      elementsRef.current = elements;

    } catch (err) {
      console.error("Stripe initialization error:", err);
      setError(err.message || "Failed to initialize payment form.");
    } finally {
      setIsInitializing(false);
    }
  }, [user, tier]);

  // Cleanup Stripe element on unmount
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripeRef.current || !cardElementRef.current || !clientSecret) {
      setError("Payment system is not ready. Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: stripeError, setupIntent } =
        await stripeRef.current.confirmSetup({
          elements: elementsRef.current,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/billing?setup_success=true`,
          },
          redirect: "if_required",
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.status === "succeeded") {
        const confirmResponse = await BotAPI.confirmCard(setupIntent.id);
        if (!confirmResponse?.success) {
          throw new Error(confirmResponse?.error || "Failed to save card.");
        }
        onSuccess?.();
      } else {
        throw new Error("Payment setup was not completed successfully.");
      }
    } catch (err) {
      console.error("Card save error:", err);
      setError(err.message || "Failed to save card.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (cardElementRef.current) {
      cardElementRef.current.destroy();
      cardElementRef.current = null;
      elementsRef.current = null;
    }
    initializeStripe();
  };

  // Show retry screen if initialization failed
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
          <div id="card-element" className="py-2 text-white" />

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