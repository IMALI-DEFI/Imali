// src/pages/Activation.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

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

// Must match what you store after login
const TOKEN_KEY = "IMALI_AUTH_TOKEN";

/* OWNER OVERRIDE */
const OWNER_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

/* 24h billing grace */
const BILLING_GRACE_MS = 24 * 60 * 60 * 1000;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach token automatically
api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch {
    // ignore
  }
  return cfg;
});

const now = () => Date.now();

const isOwner = (me) =>
  OWNER_EMAILS.includes(String(me?.email || "").toLowerCase());

function Status({ ok, grace }) {
  if (ok) return <span className="text-emerald-300">✅ Complete</span>;
  if (grace) return <span className="text-amber-300">⏳ Grace</span>;
  return <span className="text-white/40">⬜ Pending</span>;
}

function Row({ label, ok, grace, action, note }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-semibold">{label}</div>
        {note && <div className="text-xs text-white/50">{note}</div>}
      </div>
      <div className="flex items-center gap-3">
        <Status ok={ok} grace={grace} />
        {action}
      </div>
    </div>
  );
}

export default function Activation() {
  const navigate = useNavigate();
  const confettiRef = useRef(null);

  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load user + activation status
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      // If no token, send them to login
      let token = "";
      try {
        token = localStorage.getItem(TOKEN_KEY) || "";
      } catch {}
      if (!token) {
        if (mounted) {
          setLoading(false);
          setMe(null);
          setError("You are not logged in.");
        }
        return;
      }

      try {
        const [meRes, statusRes] = await Promise.all([
          api.get("/me"),
          api.get("/me/activation-status"),
        ]);

        if (!mounted) return;

        setMe(meRes.data?.user || null);
        setStatus(statusRes.data?.status || null);
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Unable to load activation status. Please log in again.";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  const owner = useMemo(() => isOwner(me), [me]);
  const tier = String(me?.tier_active || me?.tier || "starter").toLowerCase();

  // ---- Align to backend status keys (from your api_main.py) ----
  const billingComplete = !!status?.billing_complete;
  const billingRequired = !!status?.billing_required;
  const hasCardOnFile = !!status?.has_card_on_file;
  const stripeCustomerId = status?.stripe_customer_id || "";

  // Stripe created timestamps are usually seconds; handle both seconds + ms
  const rawBillingStarted = status?.billing_started_at;
  const billingStartedAtMs =
    typeof rawBillingStarted === "number"
      ? rawBillingStarted < 2_000_000_000
        ? rawBillingStarted * 1000
        : rawBillingStarted
      : null;

  const inBillingGrace =
    !billingComplete &&
    !!billingStartedAtMs &&
    now() - billingStartedAtMs < BILLING_GRACE_MS;

  const apiConnected = !!status?.api_connected;
  const botExecuted = !!status?.bot_executed || !!status?.has_trades; // either is “connected enough”
  const tradingEnabled = !!status?.trading_enabled;

  const activationComplete = owner || (billingComplete && tradingEnabled);

  const readOnlyMode =
    !activationComplete && (billingComplete || inBillingGrace);

  // Optional: analytics ping (safe). Only if your backend actually has this endpoint.
  useEffect(() => {
    if (!status) return;
    api
      .post("/analytics/activation", {
        billing_required: billingRequired,
        billing_complete: billingComplete,
        has_card_on_file: hasCardOnFile,
        api_connected: apiConnected,
        bot_executed: botExecuted,
        trading_enabled: tradingEnabled,
        tier,
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const goBilling = () => navigate("/billing");
  const goDashboard = () => navigate("/MemberDashboard");
  const goAdmin = () => navigate("/admin");

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading activation…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col gap-3 items-center justify-center p-6 text-center">
        <div>{error || "Session expired."}</div>
        <Link to="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={confettiRef}
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Activation</h1>
          <p className="text-white/70">Complete setup to unlock live trading</p>

          {owner && (
            <div className="mt-2 text-xs text-emerald-300">
              👑 Owner override active
            </div>
          )}
          <div className="mt-2 text-xs text-white/40">API: {API_BASE}</div>
        </div>

        {/* STEPS */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <Row
            label="Payment (Stripe)"
            ok={billingComplete || owner}
            grace={inBillingGrace}
            action={
              !billingComplete && !owner ? (
                <button onClick={goBilling} className="btn-primary">
                  {inBillingGrace ? "Retry Billing" : "Add Card"}
                </button>
              ) : null
            }
            note={
              tier === "starter"
                ? "Starter: 30% fee on profits over 3% (card on file required)"
                : "Paid tier: 5% fee on profits over 3%"
            }
          />

          <Row
            label="Trading Enabled"
            ok={tradingEnabled || owner}
            note={
              tradingEnabled
                ? "Live trading enabled"
                : "Execution disabled until enabled"
            }
          />

          <Row
            label="Bot Activity"
            ok={botExecuted || owner}
            note={
              botExecuted
                ? "Bot has executed or trades exist"
                : "No bot executions/trades recorded yet"
            }
          />
        </div>

        {/* MODE */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          {activationComplete ? (
            <div className="text-emerald-300 font-semibold">
              ✅ Live trading enabled
            </div>
          ) : readOnlyMode ? (
            <div className="text-amber-300 font-semibold">
              👀 Read-only mode — execution disabled
            </div>
          ) : (
            <div className="text-white/60">🔒 Locked — complete steps</div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={goDashboard}
            disabled={!activationComplete && !readOnlyMode}
            className={`px-6 py-3 rounded-xl font-semibold ${
              activationComplete
                ? "bg-indigo-600 hover:bg-indigo-500"
                : readOnlyMode
                ? "bg-white/20"
                : "bg-white/10 opacity-40 cursor-not-allowed"
            }`}
          >
            Go to Dashboard
          </button>

          {owner && (
            <button
              onClick={goAdmin}
              className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold"
            >
              Open Admin Panel
            </button>
          )}

          <Link to="/pricing" className="btn">
            View Pricing
          </Link>
        </div>

        <div className="mt-8 text-xs text-white/50">
          Trading involves risk. Never trade money you can’t afford to lose.
        </div>
      </div>
    </div>
  );
}
