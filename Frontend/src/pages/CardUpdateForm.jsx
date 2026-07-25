// src/pages/CardUpdateForm.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

let stripePromise = null;

export default function CardUpdateForm({ tier = "pro", onSuccess, onCancel }) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const stripeRef = useRef(null);

  useEffect(() => {
    if (!stripePromise) {
      stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
    }
    stripePromise.then((s) => {
      stripeRef.current = s;
    });
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSetupIntent() {
      setLoading(true);
      setError("");

      try {
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
            onClick={() => window.location.reload()}
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
    <InnerCardForm
      user={user}
      clientSecret={clientSecret}
      stripe={stripeRef.current}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}

function InnerCardForm({ user, clientSecret, stripe, onSuccess, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!stripe || busy) return;

    setBusy(true);
    setError("");

    try {
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: stripe.elements().getElement(CardElement),
            billing_details: {
              name:
                user?.displayName ||
                user?.name ||
                user?.email ||
                "Customer",
              email: user?.email || "",
            },
          },
        }
      );

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (setupIntent?.status !== "succeeded") {
        throw new Error(`Setup failed: ${setupIntent?.status || "unknown"}`);
      }

      const confirmRes = await BotAPI.confirmCard(setupIntent.id);

      if (!confirmRes?.success) {
        throw new Error(confirmRes?.error || "Failed to save card.");
      }

      onSuccess?.();
    } catch (err) {
      setError(err?.message || "Failed to save card.");
    } finally {
      setBusy(false);
    }
  }

  const cardStyle = {
    style: {
      base: {
        color: "#ffffff",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "16px",
        "::placeholder": {
          color: "#6b7280",
        },
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
        <CardElement
          options={cardStyle}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || busy || !cardComplete}
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
