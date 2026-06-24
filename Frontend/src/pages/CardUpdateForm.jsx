// imali/Frontend/src/pages/CardUpdateForm.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const STRIPE_SCRIPT_ID = "stripe-js-v3";

function loadStripeScript() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe);
      return;
    }

    const existingScript = document.getElementById(STRIPE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Stripe));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = STRIPE_SCRIPT_ID;
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve(window.Stripe);
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

export default function CardUpdateForm({ onSuccess, onCancel, tier }) {
  const { user } = useAuth();

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const cardElementRef = useRef(null);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const currentTier = String(tier || user?.tier || "pro").toLowerCase();

  const destroyCardElement = useCallback(() => {
    try {
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
      }
    } catch (_) {
      // Ignore Stripe cleanup errors.
    }

    cardElementRef.current = null;
    elementsRef.current = null;
  }, []);

  const initializeStripeCard = useCallback(async () => {
    setLoading(true);
    setError("");
    destroyCardElement();

    try {
      const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        throw new Error("Stripe publishable key is missing.");
      }

      const Stripe = await loadStripeScript();

      if (!Stripe) {
        throw new Error("Stripe failed to load.");
      }

      stripeRef.current = Stripe(publishableKey);

      const response = await fetch("/api/billing/setup-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: user?.email,
          tier: currentTier === "starter" ? "pro" : currentTier,
          update_card: true,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to initialize secure card form."
        );
      }

      const secret =
        result?.data?.client_secret ||
        result?.client_secret ||
        result?.clientSecret ||
        "";

      if (!secret) {
        throw new Error("Missing Stripe client secret.");
      }

      setClientSecret(secret);

      const elements = stripeRef.current.elements();
      const cardElement = elements.create("card", {
        hidePostalCode: false,
        style: {
          base: {
            fontSize: "16px",
            color: "#e5e7eb",
            iconColor: "#10b981",
            "::placeholder": {
              color: "#6b7280",
            },
          },
          invalid: {
            color: "#f87171",
            iconColor: "#f87171",
          },
        },
      });

      cardElement.mount("#card-element");
      cardElementRef.current = cardElement;
      elementsRef.current = elements;
    } catch (err) {
      console.error("[CardUpdateForm] initialize failed:", err);
      setError(err?.message || "Failed to initialize payment form.");
    } finally {
      setLoading(false);
    }
  }, [currentTier, destroyCardElement, user?.email]);

  useEffect(() => {
    mountedRef.current = true;
    initializeStripeCard();

    return () => {
      mountedRef.current = false;
      destroyCardElement();
    };
  }, [initializeStripeCard, destroyCardElement]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading) return;

    if (!stripeRef.current || !cardElementRef.current || !clientSecret) {
      setError("Payment system is not ready yet.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: stripeError, setupIntent } =
        await stripeRef.current.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElementRef.current,
            billing_details: {
              email: user?.email || undefined,
              name: user?.displayName || user?.name || undefined,
            },
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message || "Card setup failed.");
      }

      if (setupIntent?.status !== "succeeded") {
        throw new Error("Card was not saved. Please try again.");
      }

      const confirmResponse = await fetch("/api/billing/confirm-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          setup_intent_id: setupIntent.id,
          payment_method_id: setupIntent.payment_method,
          tier: currentTier === "starter" ? "pro" : currentTier,
        }),
      });

      const confirmResult = await confirmResponse.json().catch(() => ({}));

      if (!confirmResponse.ok || confirmResult?.success === false) {
        throw new Error(
          confirmResult?.error ||
            confirmResult?.message ||
            "Card saved in Stripe, but failed to update IMALI billing."
        );
      }

      if (onSuccess) {
        await onSuccess(confirmResult?.data || confirmResult);
      }
    } catch (err) {
      console.error("[CardUpdateForm] save failed:", err);
      setError(err?.message || "Failed to save card.");
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto">
      <h3 className="text-xl font-semibold text-white mb-2">
        Update Payment Method
      </h3>

      <p className="text-sm text-gray-400 mb-4">
        Add or replace the card used for your IMALI subscription.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          {loading && (
            <div className="py-3 text-sm text-gray-400">
              Loading secure payment form...
            </div>
          )}

          <div id="card-element" className="py-2 text-white" />

          <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
            <span>🔒</span>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || saving || !clientSecret}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-lg"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Card"
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
