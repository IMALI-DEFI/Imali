// imali/Frontend/src/pages/CardUpdateForm.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://api.imali-defi.com";

const STRIPE_SCRIPT_ID = "stripe-js-v3";

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("imali_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("IMALI_TOKEN") ||
    ""
  );
}

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error || result?.message || `Request failed: ${endpoint}`
    );
  }

  return result?.data || result;
}

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
  const { user, refreshUser } = useAuth();

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const cardElementRef = useRef(null);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const getCurrentTier = useCallback(() => {
    const tierValue =
      tier ||
      localStorage.getItem("IMALI_SELECTED_TIER") ||
      user?.tier ||
      "pro";

    const cleanTier = String(tierValue || "pro").toLowerCase().trim();

    return cleanTier === "starter" ? "pro" : cleanTier;
  }, [tier, user?.tier]);

  useEffect(() => {
    const tierValue = getCurrentTier();
    if (tierValue) {
      localStorage.setItem("IMALI_SELECTED_TIER", tierValue);
    }
  }, [getCurrentTier]);

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
    setClientSecret("");
    destroyCardElement();

    try {
      const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        throw new Error("Stripe publishable key is missing.");
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error("No login token found. Please log in again.");
      }

      const Stripe = await loadStripeScript();

      if (!Stripe) {
        throw new Error("Stripe failed to load.");
      }

      stripeRef.current = Stripe(publishableKey);

      const tierForBilling = getCurrentTier();
      localStorage.setItem("IMALI_SELECTED_TIER", tierForBilling);

      const result = await apiFetch("/api/billing/setup-intent", {
        method: "POST",
        body: JSON.stringify({
          email: user?.email,
          tier: tierForBilling,
          update_card: true,
        }),
      });

      const secret =
        result?.client_secret ||
        result?.clientSecret ||
        result?.setup_intent_client_secret ||
        "";

      if (!secret) {
        throw new Error("Missing Stripe client secret.");
      }

      setClientSecret(secret);

      const elements = stripeRef.current.elements({
        clientSecret: secret,
      });

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
  }, [destroyCardElement, getCurrentTier, user?.email]);

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

      const tierForBilling = getCurrentTier();

      const confirmResult = await apiFetch("/api/billing/confirm-card", {
        method: "POST",
        body: JSON.stringify({
          setup_intent_id: setupIntent.id,
          payment_method_id: setupIntent.payment_method,
          tier: tierForBilling,
        }),
      });

      await refreshUser?.();

      localStorage.setItem("IMALI_SELECTED_TIER", tierForBilling);
      localStorage.setItem("IMALI_BILLING_COMPLETE", "true");

      if (onSuccess) {
        await onSuccess(confirmResult);
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

  const tierDisplay = getCurrentTier();

  const tierName =
    tierDisplay === "elite"
      ? "Elite"
      : tierDisplay === "enterprise"
      ? "Enterprise"
      : tierDisplay === "pro"
      ? "Pro"
      : tierDisplay.charAt(0).toUpperCase() + tierDisplay.slice(1);

  const tierPrice =
    tierDisplay === "elite"
      ? "$49/mo"
      : tierDisplay === "pro"
      ? "$19/mo"
      : tierDisplay === "enterprise"
      ? "Custom"
      : "";

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-6 max-w-md mx-auto">
      <h3 className="text-xl font-semibold text-white mb-2">
        {tierDisplay === "pro" ? "Add Payment Method" : "Update Payment Method"}
      </h3>

      <p className="text-sm text-gray-400 mb-4">
        Add or replace the card used for your {tierName} subscription.
      </p>

      <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <span className="font-medium">Plan:</span> {tierName}
        {tierPrice && <span className="ml-2 text-gray-400">• {tierPrice}</span>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          {loading && (
            <div className="py-3 text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
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

      {tierDisplay === "pro" && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
          💡 Pro unlocks live trading, AI strategies, and priority support.
        </div>
      )}
    </div>
  );
}
