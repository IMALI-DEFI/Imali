// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

// Axios (Bearer token)
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Validate Stripe client secret format (SetupIntent)
function isValidSetupIntentSecret(secret) {
  if (!secret || typeof secret !== "string") return false;
  // SetupIntent secrets: seti_..._secret_...
  return secret.startsWith("seti_") && secret.includes("_secret_") && secret.length > 20;
}

function BillingInner({ customerId }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    setErr("");
    if (!stripe || !elements) return;

    setBusy(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing`,
        },
        // avoids unnecessary full redirects; still redirects if required (3DS)
        redirect: "if_required",
      });

      if (error) throw error;

      // If confirmSetup completed without redirect, we can set default PM now
      const pmId = setupIntent?.payment_method;
      if (customerId && pmId) {
        try {
          await api.post("/billing/set-default-payment-method", {
            customer_id: customerId,
            payment_method_id: pmId,
          });
        } catch {
          // non-fatal: card may still be saved, default set can fail quietly
        }
      }

      nav("/activation", { replace: true });
    } catch (e) {
      setErr(e?.message || "Failed to save card.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {err && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <PaymentElement />

      <button
        onClick={handleSubmit}
        disabled={busy || !stripe || !elements}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold hover:bg-white/15 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save Card"}
      </button>

      <Link to="/activation" className="mt-3 block text-center text-xs text-white/70 underline hover:text-white">
        Continue without billing
      </Link>
    </div>
  );
}

export default function Billing() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");

  // Create Stripe promise once
  const stripePromise = useMemo(() => {
    if (!STRIPE_PUBLISHABLE_KEY) return null;
    return loadStripe(STRIPE_PUBLISHABLE_KEY);
  }, []);

  // If Stripe redirected back (3DS), finalize with setup_intent_client_secret
  useEffect(() => {
    const returnedSecret = params.get("setup_intent_client_secret");
    if (returnedSecret && isValidSetupIntentSecret(returnedSecret)) {
      setClientSecret(returnedSecret);
      setLoading(false);
    }
  }, [params]);

  // Normal flow: request SetupIntent from your backend
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      nav("/signup", { replace: true });
      return;
    }

    // If we already have a valid secret (from redirect handler), skip creating a new one
    if (clientSecret) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setFatal("");

      try {
        const tier = params.get("tier") || undefined;
        const strategy = params.get("strategy") || undefined;

        const r = await api.post("/billing/setup-intent", { tier, strategy });

        const secret = r?.data?.client_secret;
        const custId = r?.data?.customer_id || "";

        if (!isValidSetupIntentSecret(secret)) {
          // This is the exact bug you’re seeing (pi_demo_secret / wrong value)
          throw new Error("Invalid Stripe client secret returned from API.");
        }

        if (!alive) return;
        setClientSecret(secret);
        setCustomerId(custId);
      } catch (e) {
        if (!alive) return;
        setFatal(e?.message || "Billing unavailable.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav, params, clientSecret]);

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            Missing Stripe publishable key (REACT_APP_STRIPE_PUBLISHABLE_KEY).
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md">Stripe failed to initialize.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">Loading billing…</div>
        </div>
      </div>
    );
  }

  if (fatal || !clientSecret) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200">{fatal || "Billing unavailable."}</div>
            <Link to="/activation" className="mt-2 inline-block text-sm underline text-white/80 hover:text-white">
              Continue without billing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: { theme: "night" },
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-4">
          <h1 className="text-xl font-extrabold tracking-tight">Billing Setup</h1>
          <p className="text-sm text-white/70">Add a card for performance fees (Starter tier).</p>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <BillingInner customerId={customerId} />
        </Elements>
      </div>
    </div>
  );
}