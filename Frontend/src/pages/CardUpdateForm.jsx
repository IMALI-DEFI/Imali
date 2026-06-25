// src/pages/CardUpdateForm.jsx
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

const STRIPE_SCRIPT_ID = "stripe-js-v3";

function loadStripeScript() {
  return new Promise((resolve, reject) => {
    if (window.Stripe) return resolve(window.Stripe);

    const existing = document.getElementById(STRIPE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Stripe));
      existing.addEventListener("error", reject);
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
  const navigate = useNavigate();
  const stripeMountId = `card-element-${useId().replace(/:/g, "")}`;

  const stripeRef = useRef(null);
  const cardElementRef = useRef(null);
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const getTier = useCallback(() => {
    const value =
      tier ||
      localStorage.getItem("IMALI_SELECTED_TIER") ||
      user?.tier ||
      "pro";

    const clean = String(value || "pro").toLowerCase().trim();
    return clean === "starter" ? "pro" : clean;
  }, [tier, user?.tier]);

  const destroyCardElement = useCallback(() => {
    try {
      cardElementRef.current?.destroy?.();
    } catch (_) {}
    cardElementRef.current = null;
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");
    setClientSecret("");
    destroyCardElement();

    try {
      if (!BotAPI.isAuthenticated()) {
        throw new Error("Please log in again before updating your card.");
      }

      const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error("Stripe publishable key is missing.");
      }

      const Stripe = await loadStripeScript();
      stripeRef.current = Stripe(publishableKey);

      const tierForBilling = getTier();
      localStorage.setItem("IMALI_SELECTED_TIER", tierForBilling);

      const result = await BotAPI.createSetupIntent({
        email: user?.email,
        tier: tierForBilling,
        update_card: true,
      });

      const data = result?.data || result;
      const secret =
        data?.client_secret ||
        data?.clientSecret ||
        data?.setup_intent_client_secret ||
        "";

      if (!secret) {
        throw new Error("Missing Stripe client secret.");
      }

      setClientSecret(secret);

      const elements = stripeRef.current.elements({ clientSecret: secret });
      const cardElement = elements.create("card", {
        hidePostalCode: false,
        style: {
          base: {
            fontSize: "16px",
            color: "#e5e7eb",
            iconColor: "#10b981",
            "::placeholder": { color: "#6b7280" },
          },
          invalid: {
            color: "#f87171",
            iconColor: "#f87171",
          },
        },
      });

      setTimeout(() => {
        const mountNode = document.getElementById(stripeMountId);
        if (mountNode && mountedRef.current) {
          cardElement.mount(`#${stripeMountId}`);
          cardElementRef.current = cardElement;
        }
      }, 0);
    } catch (err) {
      setError(err?.message || "Failed to initialize payment form.");
    } finally {
      setLoading(false);
    }
  }, [destroyCardElement, getTier, stripeMountId, user?.email]);

  useEffect(() => {
    mountedRef.current = true;
    initialize();

    return () => {
      mountedRef.current = false;
      destroyCardElement();
    };
  }, [initialize, destroyCardElement]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading) return;

    if (!stripeRef.current || !cardElementRef.current || !clientSecret) {
      setError("Payment form is not ready yet.");
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

      const tierForBilling = getTier();

      await BotAPI.confirmCard({
        setup_intent_id: setupIntent.id,
        payment_method_id: setupIntent.payment_method,
        tier: tierForBilling,
      });

      localStorage.setItem("IMALI_SELECTED_TIER", tierForBilling);
      localStorage.setItem("IMALI_BILLING_COMPLETE", "true");

      await refreshUser?.();
      await onSuccess?.();
    } catch (err) {
      setError(err?.message || "Failed to save card.");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const tierDisplay = getTier();
  const tierName =
    tierDisplay === "elite"
      ? "Elite"
      : tierDisplay === "enterprise"
      ? "Enterprise"
      : "Pro";

  const tierPrice =
    tierDisplay === "elite"
      ? "$49/mo"
      : tierDisplay === "pro"
      ? "$19/mo"
      : "Custom";

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-5 md:p-6 shadow-xl">
        <div className="mb-5">
          <p className="text-sm text-emerald-300 font-black tracking-wide">
            SECURE STRIPE PAYMENT
          </p>
          <h3 className="text-2xl font-black text-white mt-1">
            Update Payment Method
          </h3>
          <p className="text-sm text-white/50 mt-2">
            Add or replace the card used for your {tierName} subscription.
          </p>
        </div>

        <div className="mb-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 text-blue-200">
          <span className="font-black">Plan:</span> {tierName}
          <span className="ml-2 text-white/50">• {tierPrice}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl bg-black/40 border border-white/10 p-4">
            {loading && (
              <div className="py-3 text-sm text-white/50 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                Loading secure payment form...
              </div>
            )}

            <div id={stripeMountId} className="py-3 min-h-[44px] text-white" />

            <div className="text-xs text-white/40 mt-3 flex items-center gap-2">
              <span>🔒</span>
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 font-semibold">
              ⚠️ {error}
              {error.toLowerCase().includes("log in") && (
                <button
                  type="button"
                  onClick={() => navigate("/login", { state: { from: "/billing" } })}
                  className="block mt-3 px-4 py-2 rounded-xl bg-red-600 text-white font-bold"
                >
                  Log In Again
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={loading || saving || !clientSecret}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Card"}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-4 font-black text-white disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
