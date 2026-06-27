// src/pages/CardUpdateForm.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default function CardUpdateForm({ tier = "pro", onSuccess, onCancel }) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSetupIntent() {
      setLoading(true);
      setError("");
      setClientSecret("");

      try {
        // ✅ FIX: Remove 'fresh: true' - backend only expects email and tier
        const res = await BotAPI.createSetupIntent({
          email: user?.email,
          tier: tier || user?.tier || "pro",
        });

        const secret =
          res?.data?.client_secret ||
          res?.client_secret ||
          res?.data?.clientSecret ||
          res?.clientSecret;

        if (!secret || !String(secret).includes("_secret_")) {
          throw new Error("Invalid Stripe setup secret returned from server.");
        }

        if (alive) setClientSecret(secret);
      } catch (err) {
        if (alive) setError(err?.message || "Failed to load payment form.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSetupIntent();

    return () => {
      alive = false;
    };
  }, [tier, user?.email, user?.tier]);

  const appearance = useMemo(
    () => ({
      theme: "night",
      variables: {
        colorPrimary: "#10b981",
        colorBackground: "#050816",
        colorText: "#ffffff",
        colorTextSecondary: "#9ca3af",
        colorDanger: "#ef4444",
        borderRadius: "14px",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      },
    }),
    []
  );

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6 text-center">
        <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-white/60">Loading secure payment form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-500/40 bg-red-500/10 p-5">
        <p className="mb-4 text-sm text-red-200">⚠️ {error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setClientSecret("");
              // Reload the component by re-running the effect
              const load = async () => {
                try {
                  // ✅ FIX: Remove 'fresh: true' here too
                  const res = await BotAPI.createSetupIntent({
                    email: user?.email,
                    tier: tier || user?.tier || "pro",
                  });
                  const secret = res?.data?.client_secret || res?.client_secret;
                  if (secret && String(secret).includes("_secret_")) {
                    setClientSecret(secret);
                    setLoading(false);
                  } else {
                    throw new Error("Invalid secret");
                  }
                } catch (err) {
                  setError(err?.message || "Failed to load payment form.");
                  setLoading(false);
                }
              };
              load();
            }}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white hover:bg-white/15"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded-[1.5rem] border border-yellow-500/40 bg-yellow-500/10 p-5 text-center">
        <p className="text-yellow-200">No payment setup available. Please try again.</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white hover:bg-white/15"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <InnerCardForm user={user} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

function InnerCardForm({ user, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || !elements || busy) return;

    setBusy(true);
    setError("");

    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/billing?setup_success=true`,
          payment_method_data: {
            billing_details: {
              name: user?.displayName || user?.name || user?.email || "Customer",
              email: user?.email || "",
            },
          },
        },
      });

      if (setupError) throw new Error(setupError.message);

      if (setupIntent?.status !== "succeeded") {
        throw new Error(`Setup failed: ${setupIntent?.status || "unknown"}`);
      }

      const confirmRes = await BotAPI.confirmCard(setupIntent.id);

      if (!confirmRes?.success) {
        throw new Error(confirmRes?.error || "Failed to save card.");
      }

      await onSuccess?.();
    } catch (err) {
      setError(err?.message || "Failed to save card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || !elements || busy}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 font-black text-white hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Saving..." : "Save Card"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white hover:bg-white/15 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        🔒 Secure payment powered by Stripe
      </p>
    </form>
  );
}
