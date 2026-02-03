// src/pages/Activation.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// MUST MATCH BotAPI.js token storage key
const TOKEN_KEY = "imali_token";

/* OWNER OVERRIDE */
const OWNER_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

/* 24h billing grace */
const BILLING_GRACE_MS = 24 * 60 * 60 * 1000;

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 20000,
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
const lower = (v) => String(v || "").trim().toLowerCase();
const isOwner = (me) => OWNER_EMAILS.includes(lower(me?.email));

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

/* =========================
   SIMPLE MODAL
========================= */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold">{title}</div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-white/10">
            ✕
          </button>
        </div>
        {children}
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showOkx, setShowOkx] = useState(false);
  const [showAlpaca, setShowAlpaca] = useState(false);

  // OKX inputs
  const [okxKey, setOkxKey] = useState("");
  const [okxSecret, setOkxSecret] = useState("");
  const [okxPass, setOkxPass] = useState("");
  const [okxMode, setOkxMode] = useState("paper"); // paper | live

  // Alpaca inputs
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [alpacaMode, setAlpacaMode] = useState("paper"); // paper | live

  /* =========================
     LOAD / REFRESH
  ========================= */
  const refresh = useCallback(async () => {
    setError("");

    // If no token, force login
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!token) {
      setMe(null);
      setStatus(null);
      setError("You are not logged in.");
      return;
    }

    const [meRes, statusRes] = await Promise.all([api.get("/me"), api.get("/me/activation-status")]);

    setMe(meRes.data?.user || null);

    // backend might return {success:true,status:{...}} OR {success:true,...}
    const st = statusRes.data?.status ?? statusRes.data ?? null;
    setStatus(st);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.response?.data?.detail ||
          e?.message ||
          "Unable to load activation status. Please log in again.";
        if (mounted) setError(msg);
        if (mounted) setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  /* =========================
     DERIVED FLAGS
  ========================= */
  const owner = useMemo(() => isOwner(me), [me]);
  const tier = useMemo(() => lower(me?.tier_active || me?.tier || "starter"), [me]);

  // Billing completion (backend already gives billing_complete + has_card_on_file)
  const billingComplete =
    !!status?.billing_complete ||
    !!status?.has_card_on_file ||
    !!status?.stripe_webhook_confirmed ||
    !!status?.payment_confirmed ||
    !!status?.paid;

  const rawBillingStarted = status?.billing_started_at ?? status?.billingStartedAt ?? null;

  const billingStartedAtMs =
    typeof rawBillingStarted === "number"
      ? rawBillingStarted < 2_000_000_000
        ? rawBillingStarted * 1000
        : rawBillingStarted
      : typeof rawBillingStarted === "string"
      ? Date.parse(rawBillingStarted) || null
      : null;

  const inBillingGrace =
    !billingComplete && !!billingStartedAtMs && now() - billingStartedAtMs < BILLING_GRACE_MS;

  // Trading enabled (backend flag + user doc)
  const tradingEnabled =
    !!status?.trading_enabled ||
    !!status?.live_trading_enabled ||
    !!status?.execution_enabled ||
    !!me?.tradingEnabled;

  // Bot / API connected (backend gives api_connected + bot_executed)
  const apiConnected = !!status?.api_connected;
  const botExecuted = !!status?.bot_executed || !!status?.has_trades;

  // Integrations (these keys may or may not exist yet depending on your backend)
  const walletConnected =
    !!status?.wallet_connected ||
    (Array.isArray(me?.wallet_addresses) && me.wallet_addresses.length > 0) ||
    (Array.isArray(me?.wallets) && me.wallets.length > 0);

  const okxConnected = !!status?.okx_connected || !!status?.okxConfigured;
  const alpacaConnected = !!status?.alpaca_connected || !!status?.alpacaConfigured;

  // What “complete” means:
  // - Owner: always complete
  // - Everyone else: billing complete + trading enabled
  const activationComplete = owner || (billingComplete && tradingEnabled);

  const readOnlyMode = !activationComplete && (billingComplete || inBillingGrace);

  // ✅ Auto-redirect when activation completes
  useEffect(() => {
    if (!loading && activationComplete) {
      navigate("/member-dashboard", { replace: true });
    }
  }, [loading, activationComplete, navigate]);

  /* =========================
     ACTIONS
  ========================= */
  const goBilling = () => navigate("/billing");
  const goDashboard = () => navigate("/member-dashboard");
  const goAdmin = () => navigate("/admin");

  const connectWallet = async () => {
    setError("");
    setBusy(true);
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected. Install MetaMask first.");

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) throw new Error("No wallet selected.");

      // ✅ Save to backend (you need to add this endpoint on backend)
      // Suggested endpoint: POST /api/integrations/wallet  { wallet: "0x..." }
      await api.post("/integrations/wallet", { wallet: address });

      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet connect failed.");
    } finally {
      setBusy(false);
    }
  };

  const enableTrading = async () => {
    setError("");
    setBusy(true);
    try {
      // ✅ You need a backend endpoint for this.
      // Suggested endpoint: POST /api/trading/enable { enabled: true }
      await api.post("/trading/enable", { enabled: true });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to enable trading.");
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    setError("");
    setBusy(true);
    try {
      // ✅ You need a backend endpoint for this.
      // Suggested endpoint: POST /api/bot/start  (or /api/bots/start)
      await api.post("/bot/start", { mode: "live" });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to start bot.");
    } finally {
      setBusy(false);
    }
  };

  const saveOkx = async () => {
    setError("");
    setBusy(true);
    try {
      if (!okxKey.trim() || !okxSecret.trim() || !okxPass.trim()) {
        throw new Error("Please enter OKX API Key, Secret, and Passphrase.");
      }

      // ✅ You need a backend endpoint for this.
      // Suggested endpoint: POST /api/integrations/okx
      await api.post("/integrations/okx", {
        api_key: okxKey.trim(),
        api_secret: okxSecret.trim(),
        passphrase: okxPass.trim(),
        mode: okxMode, // paper | live
      });

      setShowOkx(false);
      setOkxKey("");
      setOkxSecret("");
      setOkxPass("");

      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save OKX keys.");
    } finally {
      setBusy(false);
    }
  };

  const saveAlpaca = async () => {
    setError("");
    setBusy(true);
    try {
      if (!alpacaKey.trim() || !alpacaSecret.trim()) {
        throw new Error("Please enter Alpaca API Key and Secret.");
      }

      // ✅ You need a backend endpoint for this.
      // Suggested endpoint: POST /api/integrations/alpaca
      await api.post("/integrations/alpaca", {
        api_key: alpacaKey.trim(),
        api_secret: alpacaSecret.trim(),
        mode: alpacaMode, // paper | live
      });

      setShowAlpaca(false);
      setAlpacaKey("");
      setAlpacaSecret("");

      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save Alpaca keys.");
    } finally {
      setBusy(false);
    }
  };

  /* =========================
     RENDER
  ========================= */
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
          <p className="text-white/70">
            Connect billing + wallet + exchanges to unlock your dashboard and automation.
          </p>

          {owner && <div className="mt-2 text-xs text-emerald-300">👑 Owner override active</div>}
          <div className="mt-2 text-xs text-white/40">API: {API_BASE}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => refresh().catch(() => {})}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
              disabled={busy}
            >
              {busy ? "Working…" : "Refresh Status"}
            </button>
          </div>
        </div>

        {/* ERRORS */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* STEPS */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          {/* Billing */}
          <Row
            label="Payment (Stripe)"
            ok={billingComplete || owner}
            grace={inBillingGrace}
            action={
              !billingComplete && !owner ? (
                <button
                  onClick={goBilling}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                  disabled={busy}
                >
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

          {/* Wallet */}
          <Row
            label="Wallet (MetaMask)"
            ok={walletConnected || owner}
            action={
              !walletConnected && !owner ? (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                  disabled={busy}
                >
                  Connect Wallet
                </button>
              ) : null
            }
            note="Connect your wallet so IMALI can track on-chain activity and eligibility."
          />

          {/* OKX */}
          <Row
            label="CEX (OKX)"
            ok={okxConnected || owner}
            action={
              !okxConnected && !owner ? (
                <button
                  onClick={() => setShowOkx(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                  disabled={busy}
                >
                  Connect OKX
                </button>
              ) : null
            }
            note="Optional for automated OKX trading. Keys are saved on the server (not in the browser)."
          />

          {/* Alpaca */}
          <Row
            label="Stocks (Alpaca)"
            ok={alpacaConnected || owner}
            action={
              !alpacaConnected && !owner ? (
                <button
                  onClick={() => setShowAlpaca(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                  disabled={busy}
                >
                  Connect Alpaca
                </button>
              ) : null
            }
            note="Optional for automated stock trading. Keys are saved on the server (not in the browser)."
          />

          {/* Trading Enabled */}
          <Row
            label="Trading Enabled"
            ok={tradingEnabled || owner}
            action={
              !tradingEnabled && !owner ? (
                <button
                  onClick={enableTrading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold"
                  disabled={busy}
                >
                  Enable Trading
                </button>
              ) : null
            }
            note={tradingEnabled ? "Execution enabled" : "Execution disabled until enabled"}
          />

          {/* Bot Activity */}
          <Row
            label="Bot Activity"
            ok={botExecuted || owner}
            action={
              !botExecuted && !owner ? (
                <button
                  onClick={startBot}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
                  disabled={busy}
                >
                  Start Bot
                </button>
              ) : null
            }
            note={
              botExecuted
                ? "Bot activity detected"
                : apiConnected
                ? "API connected — start bot to generate activity"
                : "No bot activity recorded yet"
            }
          />
        </div>

        {/* MODE */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          {activationComplete ? (
            <div className="text-emerald-300 font-semibold">✅ Live trading enabled</div>
          ) : readOnlyMode ? (
            <div className="text-amber-300 font-semibold">👀 Read-only mode — execution disabled</div>
          ) : (
            <div className="text-white/60">🔒 Locked — complete required steps</div>
          )}

          <div className="mt-2 text-xs text-white/50">
            Required to unlock dashboard: Billing + Trading Enabled. (Wallet/OKX/Alpaca are optional
            based on your plan.)
          </div>
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

          <Link to="/pricing" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold">
            View Pricing
          </Link>
        </div>

        {/* DEBUG */}
        <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm text-white/70">Debug status payload</summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap text-white/70 overflow-auto">
            {JSON.stringify(
              {
                me,
                status,
                derived: {
                  tier,
                  billingComplete,
                  inBillingGrace,
                  walletConnected,
                  okxConnected,
                  alpacaConnected,
                  tradingEnabled,
                  apiConnected,
                  botExecuted,
                  activationComplete,
                  readOnlyMode,
                },
              },
              null,
              2
            )}
          </pre>
        </details>

        <div className="mt-8 text-xs text-white/50">
          Trading involves risk. Never trade money you can’t afford to lose.
        </div>
      </div>

      {/* OKX MODAL */}
      <Modal open={showOkx} title="Connect OKX" onClose={() => (!busy ? setShowOkx(false) : null)}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Your keys are sent to your server and should be stored securely (recommended: encrypted at rest).
          </div>

          <label className="block text-xs text-white/60">Mode</label>
          <select
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            value={okxMode}
            onChange={(e) => setOkxMode(e.target.value)}
            disabled={busy}
          >
            <option value="paper">Paper</option>
            <option value="live">Live</option>
          </select>

          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            placeholder="OKX API Key"
            value={okxKey}
            onChange={(e) => setOkxKey(e.target.value)}
            disabled={busy}
          />
          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            placeholder="OKX API Secret"
            value={okxSecret}
            onChange={(e) => setOkxSecret(e.target.value)}
            disabled={busy}
          />
          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            placeholder="OKX Passphrase"
            value={okxPass}
            onChange={(e) => setOkxPass(e.target.value)}
            disabled={busy}
          />

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowOkx(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={saveOkx}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save OKX Keys"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ALPACA MODAL */}
      <Modal open={showAlpaca} title="Connect Alpaca" onClose={() => (!busy ? setShowAlpaca(false) : null)}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Alpaca keys enable automated stock trading. Keys should never be stored in the browser.
          </div>

          <label className="block text-xs text-white/60">Mode</label>
          <select
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            value={alpacaMode}
            onChange={(e) => setAlpacaMode(e.target.value)}
            disabled={busy}
          >
            <option value="paper">Paper</option>
            <option value="live">Live</option>
          </select>

          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            placeholder="Alpaca API Key"
            value={alpacaKey}
            onChange={(e) => setAlpacaKey(e.target.value)}
            disabled={busy}
          />
          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 p-3"
            placeholder="Alpaca API Secret"
            value={alpacaSecret}
            onChange={(e) => setAlpacaSecret(e.target.value)}
            disabled={busy}
          />

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowAlpaca(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={saveAlpaca}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save Alpaca Keys"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
