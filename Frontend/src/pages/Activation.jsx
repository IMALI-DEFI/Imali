import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

/* =====================================================
   ENV / CONFIG
===================================================== */
const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

/* OWNER / ADMIN OVERRIDE */
const OWNER_EMAILS = [
  "wayne@imali-defi.com",
  "admin@imali-defi.com",
];

/* 24h billing grace */
const BILLING_GRACE_MS = 24 * 60 * 60 * 1000;

/* =====================================================
   API
===================================================== */
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 15000,
});

/* =====================================================
   HELPERS
===================================================== */
const now = () => Date.now();

const isOwner = (me) =>
  OWNER_EMAILS.includes(String(me?.email || "").toLowerCase());

function Status({ ok, grace }) {
  if (ok) return <span className="text-emerald-300">✅ Complete</span>;
  if (grace) return <span className="text-amber-300">⏳ Grace</span>;
  return <span className="text-white/40">⬜ Pending</span>;
}

/* =====================================================
   MAIN
===================================================== */
export default function Activation() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     LOAD USER + ACTIVATION STATUS
  ===================================================== */
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [meRes, statusRes] = await Promise.all([
          api.get("/me"),
          api.get("/me/activation-status"),
        ]);

        if (!mounted) return;

        setMe(meRes.data?.user || null);
        setStatus(statusRes.data?.status || null);
      } catch (e) {
        setError("Unable to load activation status.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  /* =====================================================
     DERIVED STATE (BACKEND IS SOURCE OF TRUTH)
  ===================================================== */
  const owner = isOwner(me);

  const tier = String(me?.tier_active || "starter").toLowerCase();

  const stripeWebhookConfirmed = !!status?.stripe_webhook_confirmed;
  const billingStartedAt = status?.billing_started_at
    ? new Date(status.billing_started_at).getTime()
    : null;

  const inBillingGrace =
    !stripeWebhookConfirmed &&
    billingStartedAt &&
    now() - billingStartedAt < BILLING_GRACE_MS;

  const apiConnected = !!status?.api_connected;
  const botSelected = !!status?.bot_selected;

  const paperTrading = !!status?.paper_trading_enabled;
  const liveTrading = !!status?.live_trading_enabled;

  const activationComplete =
    owner ||
    (stripeWebhookConfirmed && apiConnected && botSelected && liveTrading);

  const readOnlyMode =
    !activationComplete && (stripeWebhookConfirmed || inBillingGrace);

  /* =====================================================
     ANALYTICS (SAFE)
  ===================================================== */
  useEffect(() => {
    if (!status) return;

    api.post("/analytics/activation", {
      billing_started: !!status.billing_started_at,
      billing_confirmed: stripeWebhookConfirmed,
      api_connected: apiConnected,
      bot_selected: botSelected,
      paper_trading: paperTrading,
      live_trading: liveTrading,
    }).catch(() => {});
  }, [status]);

  /* =====================================================
     NAV ACTIONS
  ===================================================== */
  const goStripe = () => navigate("/billing");
  const goAPI = () => navigate("/activation?step=api");
  const goBot = () => navigate("/activation?step=bot");
  const goDashboard = () => navigate("/MemberDashboard");
  const goAdmin = () => navigate("/admin");

  /* =====================================================
     GUARDS
  ===================================================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading activation…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Session expired.{" "}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account Activation</h1>
          <p className="text-white/70">
            Complete setup to unlock live trading
          </p>

          {owner && (
            <div className="mt-2 text-xs text-emerald-300">
              👑 Owner override active
            </div>
          )}
        </div>

        {/* ACTIVATION STEPS */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">

          <Row
            label="Payment (Stripe)"
            ok={stripeWebhookConfirmed}
            grace={inBillingGrace}
            action={
              !stripeWebhookConfirmed && (
                <button onClick={goStripe} className="btn-primary">
                  {inBillingGrace ? "Retry Billing" : "Add Card"}
                </button>
              )
            }
            note={
              tier === "starter"
                ? "Starter: 30% fee on profits over 3%"
                : "Paid tier: 5% fee on profits over 3%"
            }
          />

          <Row
            label="API Connected"
            ok={apiConnected}
            action={
              !apiConnected && (
                <button onClick={goAPI} className="btn-primary">
                  Connect API
                </button>
              )
            }
          />

          <Row
            label="Bot Selected"
            ok={botSelected}
            action={
              !botSelected && (
                <button onClick={goBot} className="btn-primary">
                  Select Bot
                </button>
              )
            }
          />

          <Row
            label="Trading Mode"
            ok={liveTrading}
            note={
              paperTrading
                ? "Paper trading enabled (safe mode)"
                : "Live trading disabled"
            }
          />
        </div>

        {/* MODE STATUS */}
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
            <div className="text-white/60">
              🔒 Locked — complete activation steps
            </div>
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

        {/* FOOTER */}
        <div className="mt-8 text-xs text-white/50">
          Trading involves risk. Never trade money you can’t afford to lose.
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */
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
