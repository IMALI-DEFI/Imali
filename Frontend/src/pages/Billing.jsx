// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

function BillingInner() {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/activation`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <>
      {err && <div className="text-red-400 mb-3">{err}</div>}
      <PaymentElement />
      <button onClick={submit} disabled={busy} className="btn w-full mt-4">
        {busy ? "Saving…" : "Save Card"}
      </button>
      <Link to="/activation" className="block mt-3 text-xs underline text-center">
        Skip for now
      </Link>
    </>
  );
}

export default function Billing() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      nav("/signup");
      return;
    }

    api.post("/billing/setup-intent", {
      tier: params.get("tier"),
      strategy: params.get("strategy"),
    })
      .then(r => setClientSecret(r.data.client_secret))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params, nav]);

  if (!stripeKey) return <div className="p-6">Missing Stripe key.</div>;
  if (loading) return <div className="p-6">Loading billing…</div>;
  if (!clientSecret) return <div className="p-6">Billing unavailable.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Billing Setup</h1>
        <Elements stripe={loadStripe(stripeKey)} options={{ clientSecret }}>
          <BillingInner />
        </Elements>
      </div>
    </div>
  );
}
