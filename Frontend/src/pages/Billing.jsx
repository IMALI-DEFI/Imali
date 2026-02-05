// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

/* =========================
   CONFIG (match Activation.jsx)
========================= */
const TOKEN_KEY = "imali_token";

const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API_BASE = String(API_ORIGIN).replace(/\/+$/, "");

// Stripe publishable key (front-end only) — must match test vs live mode
const STRIPE_PUBLISHABLE_KEY =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  process.env.REACT_APP_STRIPE_PUB_KEY ||
  "";

/* =========================
   Axios (Bearer token)
========================= */
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch {}
  return cfg;
});

/* =========================
   Helpers
========================= */
function isValidSetupIntentSecret(secret) {
  if (!secret || typeof secret !== "string") return false;
  // SetupIntent client secrets look like: seti_..._secret_...
  return secret.startsWith("seti_") && secret.includes("_secret_") && secret.length > 30;
}

function modeFromKey(pk) {
  // pk_test_... or pk_live_...
  if (!pk) return "unknown";
  if (pk.startsWith("pk_test_")) return "test";
  if (pk.startsWith("pk_live_")) return "live";
  return "unknown";
}

function BillingInner({ customerId, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async () => {
    setErr("");

    if (!stripe || !elements) {
      setErr("Stripe not ready. Please refresh the page.");
      return;
    }

    setBusy(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) throw error;

      // If completed without redirect, mark default PM (optional)
      const pmId = setupIntent?.payment_method;
      if (customerId && pmId) {
        try {
          await api.post("/billing/set-default-payment-method", {
            customer_id: customerId,
            payment_method_id: pmId,
          });
        } catch {
          // non-fatal
        }
      }

      nav("/activation", { replace: true });
    } catch (e) {
      setErr(e?.message || "Failed to save card. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Add Payment Method</h2>
        <p className="text-sm text-white/70 mt-1">
          Your card may be charged only when applicable fees are due.
        </p>
      </div>

      {err ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <div className="font-medium">Error</div>
          <div className="mt-1">{err}</div>
        </div>
      ) : null}

      <div className="mb-4">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={busy || !stripe || !elements}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Processing…" : "Save Card"}
        </button>

        <Link
          to="/activation"
          className="block text-center text-sm text-white/70 underline hover:text-white"
        >
          Continue without adding card
        </Link>
      </div>
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

  const stripePromise = useMemo(() => {
    if (!STRIPE_PUBLISHABLE_KEY) return null;
    try {
      return loadStripe(STRIPE_PUBLISHABLE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Helps avoid “wrong key mode” confusion
  const stripeMode = useMemo(() => modeFromKey(STRIPE_PUBLISHABLE_KEY), []);

  // Return URL for 3DS redirect
  const returnUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.pathname = "/billing";
    // keep query params if you want
    return url.toString();
  }, []);

  // Stripe redirect back (3DS)
  useEffect(() => {
    const returnedSecret = params.get("setup_intent_client_secret");
    if (returnedSecret && isValidSetupIntentSecret(returnedSecret)) {
      setClientSecret(returnedSecret);
      setLoading(false);
    }
  }, [params]);

  // Fetch SetupIntent from backend
  useEffect(() => {
    // auth check
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!token) {
      nav("/signup", { replace: true });
      return;
    }

    // already have valid secret
    if (clientSecret && isValidSetupIntentSecret(clientSecret)) return;

    let mounted = true;

    (async () => {
      setLoading(true);
      setFatal("");

      try {
        const tier = params.get("tier") || undefined;
        const strategy = params.get("strategy") || undefined;

        const res = await api.post("/billing/setup-intent", { tier, strategy });

        const secret = res?.data?.client_secret;
        const custId = res?.data?.customer_id || "";

        if (!mounted) return;

        if (!isValidSetupIntentSecret(secret)) {
          // This is the most common “stripe key” confusion:
          // backend returns PaymentIntent (pi_) or empty string
          const got = String(secret || "");
          throw new Error(
            got.startsWith("pi_")
              ? "Server returned a PaymentIntent secret (pi_...). Billing page requires a SetupIntent (seti_...). Update backend /billing/setup-intent to create a SetupIntent."
              : "Invalid Stripe client secret from server. Please retry."
          );
        }

        setClientSecret(secret);
        setCustomerId(custId);
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Unable to load billing. Please try again.";
        if (mounted) setFatal(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav, params, clientSecret]);

  /* =========================
     UI STATES
========================= */
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Configuration Error</div>
            <p className="text-sm text-red-100/80">
              Missing Stripe publishable key (REACT_APP_STRIPE_PUBLISHABLE_KEY).
            </p>
            <p className="text-xs text-red-100/60 mt-2">
              Mode detected: <span className="font-semibold">{stripeMode}</span>
            </p>
            <Link to="/" className="mt-3 inline-block text-sm underline text-white/80 hover:text-white">
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Stripe Error</div>
            <p className="text-sm text-red-100/80">
              Failed to initialize Stripe. Confirm your publishable key is valid.
            </p>
            <p className="text-xs text-red-100/60 mt-2">
              Key starts with: <span className="font-semibold">{STRIPE_PUBLISHABLE_KEY.slice(0, 8)}…</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Loading billing form...</span>
            </div>
            <div className="mt-3 text-xs text-white/50 break-words">
              API: {API_BASE}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Error</div>
            <p className="text-sm text-red-100/80 mb-4">{fatal}</p>
            <div className="text-xs text-white/60 break-words">
              API: {API_BASE}
              <br />
              Stripe mode: {stripeMode}
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium"
              >
                Retry
              </button>
              <Link
                to="/activation"
                className="block w-full text-center px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium"
              >
                Continue without billing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !isValidSetupIntentSecret(clientSecret)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="font-semibold text-red-200 mb-2">Invalid Setup</div>
            <p className="text-sm text-red-100/80">
              Unable to initialize payment form. Please retry.
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium"
              >
                Retry
              </button>
              <Link
                to="/activation"
                className="block w-full text-center px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium"
              >
                Skip billing setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#3b82f6",
        colorBackground: "#111827",
        colorText: "#f3f4f6",
        colorDanger: "#ef4444",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "12px",
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-white/70 hover:text-white mb-4">
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold">Billing Setup</h1>
          <p className="text-gray-400 mt-2">
            Add a payment method to your account. You’ll only be charged when applicable fees are due.
          </p>

          <div className="mt-2 text-xs text-white/50 break-words">
            API: {API_BASE} • Stripe: {stripeMode}
          </div>
        </div>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <BillingInner customerId={customerId} returnUrl={returnUrl} />
        </Elements>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Powered by Stripe. Your payment information is encrypted and secure.</p>
          <p className="mt-1">Need help? Contact support@imali-defi.com</p>
        </div>
      </div>
    </div>
  );
}
