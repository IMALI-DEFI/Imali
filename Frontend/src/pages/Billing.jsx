// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

/* =========================
   API BASE RESOLVER
========================= */
const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API_BASE = String(API_ORIGIN).replace(/\/+$/, "");

// MUST match your BotAPI token key
const TOKEN_KEY = "imali_token";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// attach bearer token
api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch {}
  return cfg;
});

const allowedTiers = ["starter", "pro", "elite", "stock", "bundle"];
const allowedStrategies = ["momentum", "mean_reversion", "ai_weighted", "volume_spike"];

function clampChoice(v, allowed, fallback) {
  const x = String(v || "").toLowerCase();
  return allowed.includes(x) ? x : fallback;
}

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");

function BillingInner({ tier, strategy, me }) {
  const nav = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitCard = async () => {
    if (!stripe || !elements || busy) return;
    setErr("");
    setBusy(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          // after saving card, go back to activation
          return_url: `${window.location.origin}/activation`,
        },
      });

      if (error) throw new Error(error.message || "Stripe setup failed");
      // On success, Stripe will redirect to return_url automatically.
    } catch (e) {
      setErr(e?.message || "Unable to save card.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
      <div className="text-sm text-white/70">
        <div>
          <span className="text-white/90 font-semibold">Email:</span> {me?.email}
        </div>
        <div>
          <span className="text-white/90 font-semibold">Tier:</span> {tier}
        </div>
        <div>
          <span className="text-white/90 font-semibold">Strategy:</span> {strategy}
        </div>
      </div>

      {err && (
        <div className="rounded bg-red-500/10 border border-red-500/30 p-3 text-red-200">
          {err}
        </div>
      )}

      <div className="rounded-xl bg-black/20 border border-white/10 p-4">
        <PaymentElement />
      </div>

      <button
        onClick={submitCard}
        disabled={busy || !stripe || !elements}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 font-bold disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save Card"}
      </button>

      <div className="text-xs text-white/50">
        This saves a card for performance fees and paid tiers.
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => nav("/activation")} className="btn">
          Back to Activation
        </button>
        <Link to="/pricing" className="btn">
          View Pricing
        </Link>
      </div>
    </div>
  );
}

export default function Billing() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tier = useMemo(() => clampChoice(params.get("tier"), allowedTiers, "starter"), [params]);
  const strategy = useMemo(
    () => clampChoice(params.get("strategy"), allowedStrategies, "ai_weighted"),
    [params]
  );

  const [me, setMe] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");

    // must have token
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!token) {
      setLoading(false);
      setMe(null);
      return;
    }

    try {
      // load user
      const meRes = await api.get("/me");
      const user = meRes.data?.user || null;
      setMe(user);

      // create setup intent
      const execution_mode = tier === "starter" ? "auto" : "manual";

      const si = await api.post("/billing/setup-intent", {
        email: user?.email,
        tier,
        strategy,
        execution_mode,
      });

      const cs =
        si.data?.client_secret ||
        si.data?.setup_intent_client_secret ||
        si.data?.clientSecret ||
        "";

      if (!cs) throw new Error("Backend did not return a Stripe client_secret.");

      setClientSecret(cs);
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Unable to start billing."
      );
      setMe(null);
      setClientSecret("");
    } finally {
      setLoading(false);
    }
  }, [tier, strategy]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading billing…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col gap-3 items-center justify-center p-6 text-center">
        <div>Not logged in. Please log in first.</div>
        <Link to="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col gap-3 items-center justify-center p-6 text-center">
        <div>Missing REACT_APP_STRIPE_PUBLISHABLE_KEY.</div>
        <div className="text-xs text-white/50">Add it to Netlify + rebuild.</div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col gap-3 items-center justify-center p-6 text-center">
        <div>{err || "No client secret returned."}</div>
        <button onClick={() => navigate("/activation")} className="btn">
          Back to Activation
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold mb-2">Billing Setup</h1>
        <p className="text-white/70 mb-6">
          Add a card for performance fees and (if applicable) your monthly plan.
        </p>

        <div className="text-xs text-white/40 mb-4">API: {API_BASE}</div>

        {err && (
          <div className="mb-4 rounded bg-red-500/10 border border-red-500/30 p-3 text-red-200">
            {err}
          </div>
        )}

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <BillingInner tier={tier} strategy={strategy} me={me} />
        </Elements>
      </div>
    </div>
  );
}
