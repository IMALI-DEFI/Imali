// src/pages/Billing.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

/* =========================
   API BASE RESOLVER (CRA)
========================= */
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 15000,
});

const allowedTiers = ["starter", "pro", "elite", "stock", "bundle"];
const allowedStrategies = ["momentum", "mean_reversion", "ai_weighted", "volume_spike"];

function clampChoice(v, allowed, fallback) {
  const x = String(v || "").toLowerCase();
  return allowed.includes(x) ? x : fallback;
}

export default function Billing() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const tier = useMemo(
    () => clampChoice(params.get("tier"), allowedTiers, "starter"),
    [params]
  );
  const strategy = useMemo(
    () => clampChoice(params.get("strategy"), allowedStrategies, "ai_weighted"),
    [params]
  );

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Load session user
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await api.get("/me");
        if (!mounted) return;
        setMe(res.data?.user || null);
      } catch (e) {
        setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  const startCheckout = async () => {
    if (busy) return;
    setErr("");
    setBusy(true);

    try {
      const execution_mode = tier === "starter" ? "auto" : "manual";

      const res = await api.post("/billing/create-checkout", {
        email: me?.email, // backend can ignore and use session, but it's fine to pass
        tier,
        strategy,
        execution_mode,
      });

      const checkoutUrl =
        res.data?.checkoutUrl || res.data?.checkout_url || res.data?.url;

      if (!checkoutUrl) throw new Error("No checkout URL returned.");

      window.location.href = checkoutUrl;
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Unable to start billing."
      );
      setBusy(false);
    }
  };

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
        <div>Session expired. Please log in to continue billing.</div>
        <Link to="/login" className="underline">
          Log in
        </Link>
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

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
          <div className="text-sm text-white/70">
            <div>
              <span className="text-white/90 font-semibold">Email:</span>{" "}
              {me.email}
            </div>
            <div>
              <span className="text-white/90 font-semibold">Tier:</span>{" "}
              {tier}
            </div>
            <div>
              <span className="text-white/90 font-semibold">Strategy:</span>{" "}
              {strategy}
            </div>
          </div>

          <button
            onClick={startCheckout}
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 font-bold disabled:opacity-60"
          >
            {busy ? "Redirecting to Stripe…" : "Continue to Stripe"}
          </button>

          <div className="text-xs text-white/50">
            After payment, you’ll return to Activation to complete setup.
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate(`/activation`)}
              className="btn"
            >
              Back to Activation
            </button>
            <Link to="/pricing" className="btn">
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
