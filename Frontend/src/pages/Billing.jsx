import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/* ------------------------------------------------------------------ */
/* Config */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = "imali_token";

// IMPORTANT: use ONE base consistently
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

// Stripe publishable key (test or live)
const STRIPE_PUBLISHABLE_KEY =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

// Create Stripe promise ONCE
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

// Axios instance
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function isValidStripeSecret(secret) {
  return (
    typeof secret === "string" &&
    (secret.startsWith("seti_") || secret.startsWith("pi_")) &&
    secret.includes("_secret_")
  );
}

/* ------------------------------------------------------------------ */
/* Inner Form */
/* ------------------------------------------------------------------ */

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setError("");

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/activation`,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Stripe confirmSetup error:", err);
      setError(err?.message || "Failed to save payment method.");
      setBusy(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <PaymentElement />

      <button
        onClick={submit}
        disabled={busy || !stripe || !elements}
        className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-black hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save Card"}
      </button>

      <Link
        to="/activation"
        className="mt-4 block text-center text-xs text-slate-400 underline"
      >
        Skip for now
      </Link>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page */
/* ------------------------------------------------------------------ */

export default function Billing() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  /* -------------------------------------------------------------- */
  /* Guard: must be logged in */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate("/signup", { replace: true });
    }
  }, [navigate]);

  /* -------------------------------------------------------------- */
  /* Load SetupIntent */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function loadSetupIntent() {
      try {
        setLoading(true);
        setFatalError("");

        const res = await api.post("/billing/setup-intent", {
          tier: params.get("tier"),
          strategy: params.get("strategy"),
        });

        const secret = res?.data?.client_secret;

        console.log("[Billing] API_BASE:", API_BASE);
        console.log("[Billing] client_secret:", secret);

        if (!isValidStripeSecret(secret)) {
          throw new Error(
            "Invalid Stripe client secret returned from API."
          );
        }

        if (mounted) setClientSecret(secret);
      } catch (err) {
        console.error("Failed to load billing setup:", err);

        if (mounted) {
          setFatalError(
            err?.response?.data?.message ||
              err?.message ||
              "Billing is currently unavailable."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSetupIntent();
    return () => {
      mounted = false;
    };
  }, [params]);

  /* -------------------------------------------------------------- */
  /* Render states */
  /* -------------------------------------------------------------- */

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          Stripe is not configured (missing publishable key).
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md text-center text-slate-300">
          Loading billing…
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mx-auto max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {fatalError}
          <div className="mt-4 text-center">
            <Link to="/activation" className="underline">
              Continue without billing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /* Happy path */
  /* -------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-xl font-bold">Billing Setup</h1>

        <Elements
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <BillingInner />
        </Elements>
      </div>
    </div>
  );
}