// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

/* =========================
   CONFIG
========================= */

const TOKEN_KEY = "imali_token";

const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API_BASE = API_ORIGIN.replace(/\/+$/, "");

const STRIPE_PUBLISHABLE_KEY =
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  process.env.REACT_APP_STRIPE_PUB_KEY ||
  "";

/* =========================
   TOKEN HELPER (🔥 FIX)
========================= */

function getAuthToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  return raw.startsWith("jwt:") ? raw.slice(4) : raw;
}

/* =========================
   AXIOS CLIENT
========================= */

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const token = getAuthToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/* =========================
   HELPERS
========================= */

function isValidSetupIntentSecret(secret) {
  return (
    typeof secret === "string" &&
    secret.startsWith("seti_") &&
    secret.includes("_secret_")
  );
}

function stripeModeFromKey(pk) {
  if (pk.startsWith("pk_test_")) return "test";
  if (pk.startsWith("pk_live_")) return "live";
  return "unknown";
}

/* =========================
   INNER STRIPE FORM
========================= */

function BillingInner({ customerId, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;

    setBusy(true);
    setErr("");

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) throw error;

      const pm = setupIntent?.payment_method;
      if (customerId && pm) {
        try {
          await api.post("/billing/set-default-payment-method", {
            customer_id: customerId,
            payment_method_id: pm,
          });
        } catch {
          /* non-fatal */
        }
      }

      navigate("/activation", { replace: true });
    } catch (e) {
      setErr(e?.message || "Failed to save card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h2 className="text-lg font-semibold mb-2">Add Payment Method</h2>
      <p className="text-sm text-white/70 mb-4">
        You’ll only be charged when fees apply.
      </p>

      {err && (
        <div className="mb-3 rounded bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <PaymentElement />

      <div className="mt-4 space-y-3">
        <button
          disabled={busy || !stripe}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save Card"}
        </button>

        <Link
          to="/activation"
          className="block text-center text-sm underline text-white/60"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}

/* =========================
   MAIN
========================= */

export default function Billing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [customerId, setCustomerId] = useState("");

  const stripePromise = useMemo(
    () => (STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null),
    []
  );

  const stripeMode = stripeModeFromKey(STRIPE_PUBLISHABLE_KEY);

  const returnUrl = useMemo(() => {
    const u = new URL(window.location.href);
    u.pathname = "/billing";
    return u.toString();
  }, []);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    if (!getAuthToken()) navigate("/signup", { replace: true });
  }, [navigate]);

  /* ---------------- LOAD SETUP INTENT ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setFatal("");

        const tier = params.get("tier");
        const strategy = params.get("strategy");

        const res = await api.post("/billing/setup-intent", {
          tier,
          strategy,
        });

        if (!mounted) return;

        const secret = res?.data?.client_secret;
        if (!isValidSetupIntentSecret(secret)) {
          throw new Error("Invalid Stripe SetupIntent from server");
        }

        setClientSecret(secret);
        setCustomerId(res?.data?.customer_id || "");
      } catch (e) {
        setFatal(
          e?.response?.data?.message ||
            e?.message ||
            "Unable to load billing"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params]);

  /* =========================
     UI STATES
========================= */

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Stripe key missing or invalid
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading billing…
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="max-w-md text-center">
          <p className="text-red-400 mb-4">{fatal}</p>
          <Link to="/activation" className="underline">
            Continue without billing
          </Link>
        </div>
      </div>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: { theme: "night" },
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Billing Setup</h1>
        <p className="text-sm text-white/60 mb-4">
          Stripe ({stripeMode})
        </p>

        <Elements stripe={stripePromise} options={elementsOptions}>
          <BillingInner customerId={customerId} returnUrl={returnUrl} />
        </Elements>
      </div>
    </div>
  );
}
