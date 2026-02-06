// src/pages/Activation.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

// If you use these helpers elsewhere, keep them. If not, you can remove wallet section.
import { getContractInstance, getSigner, POLYGON_MAINNET } from "../getContractInstance";

/* ======================================================
   CONFIG
====================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API = String(API_BASE).replace(/\/+$/, "");
const TOKEN_KEY = "imali_token";

// Persisted progress key
const PROGRESS_KEY = "imali_activation_progress_v2";

/**
 * Stripe webhook guard
 * - If true, we ONLY treat billing as complete when webhook is confirmed.
 * - If false, any "has_card_on_file" etc can pass.
 *
 * For production: keep TRUE.
 * For debugging: you can temporarily set to false.
 */
const REQUIRE_WEBHOOK_CONFIRMATION = true;

// “billing still processing” grace window (optional UI)
const BILLING_GRACE_MS = 24 * 60 * 60 * 1000;

const EXTERNAL = {
  metamaskDownload: "https://metamask.io/download/",
  okxApi: "https://www.okx.com/account/my-api",
  alpacaPaperDashboard: "https://app.alpaca.markets/paper/dashboard/overview",
};

/* ======================================================
   API CLIENT
====================================================== */

const api = axios.create({
  baseURL: `${API}/api`,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return cfg;
});

/* ======================================================
   SMALL HELPERS
====================================================== */

const lower = (v) => String(v || "").trim().toLowerCase();
const now = () => Date.now();

function safeNextPath(nextRaw) {
  if (!nextRaw) return "";
  try {
    const s = String(nextRaw);
    if (!s.startsWith("/")) return "";
    if (s.startsWith("//")) return "";
    return s;
  } catch {
    return "";
  }
}

function ProgressBar({ pct }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Step({ title, done, children, right }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-white break-words">{title}</div>
        </div>
        <div className="shrink-0 text-xs">
          {done ? (
            <span className="text-emerald-300">✔ Complete</span>
          ) : (
            <span className="text-amber-300">Pending</span>
          )}
          {right ? <div className="mt-2">{right}</div> : null}
        </div>
      </div>
      <div className="text-sm text-white/70">{children}</div>
    </div>
  );
}

function Modal({ open, title, children, onClose, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={() => (!busy ? onClose() : null)} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-lg font-bold text-white break-words">{title}</div>
          <button
            onClick={() => (!busy ? onClose() : null)}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
            disabled={busy}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ======================================================
   MAIN
====================================================== */

export default function Activation() {
  const nav = useNavigate();
  const loc = useLocation();
  const confettiRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  // Modals
  const [showOkx, setShowOkx] = useState(false);
  const [showAlpaca, setShowAlpaca] = useState(false);

  // OKX inputs
  const [okxKey, setOkxKey] = useState("");
  const [okxSecret, setOkxSecret] = useState("");
  const [okxPass, setOkxPass] = useState("");
  const [okxMode, setOkxMode] = useState("paper");

  // Alpaca inputs
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [alpacaMode, setAlpacaMode] = useState("paper");

  // Wallet
  const [walletAddr, setWalletAddr] = useState("");

  // Next destination after completion (supports /activation?next=/dashboard)
  const nextParam = useMemo(() => {
    const qs = new URLSearchParams(loc.search);
    return safeNextPath(qs.get("next"));
  }, [loc.search]);

  const hasMetaMask = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.ethereum;
  }, []);

  /* ---------------- HARD AUTH GUARD ---------------- */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) nav("/login", { replace: true });
  }, [nav]);

  /* ---------------- LOAD / REFRESH ---------------- */
  const refresh = useCallback(async () => {
    setError("");
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setMe(null);
      setStatus(null);
      return;
    }

    const [meRes, statusRes] = await Promise.all([api.get("/me"), api.get("/me/activation-status")]);

    const user = meRes.data?.user || null;
    const st = statusRes.data?.status ?? statusRes.data ?? null;

    setMe(user);
    setStatus(st);

    // Wallet display priority
    const backendWallet =
      (Array.isArray(user?.wallet_addresses) && user.wallet_addresses[0]) ||
      (Array.isArray(user?.wallets) && user.wallets[0]) ||
      st?.wallet_address ||
      "";

    if (backendWallet) setWalletAddr(backendWallet);
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
          e?.message ||
          "Unable to load activation status.";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  // Live update on wallet changes
  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccounts = (accounts) => {
      const addr = accounts?.[0] || "";
      if (addr) setWalletAddr(addr);
    };
    window.ethereum.on("accountsChanged", onAccounts);
    return () => window.ethereum.removeListener?.("accountsChanged", onAccounts);
  }, []);

  /* ======================================================
     DERIVED FLAGS
  ====================================================== */

  const tier = useMemo(() => {
    const t = lower(me?.tier_active || me?.tier || "starter");
    if (t.includes("elite")) return "elite";
    if (t.includes("pro")) return "pro";
    return "starter";
  }, [me]);

  const requiresOkx = tier === "pro" || tier === "elite";
  const requiresAlpaca = tier === "elite";
  const requiresWallet = tier === "elite";

  // Billing flags (webhook-guarded)
  const billingSignals =
    !!status?.billing_complete ||
    !!status?.has_card_on_file ||
    !!status?.payment_confirmed ||
    !!status?.paid;

  const webhookConfirmed =
    !!status?.stripe_webhook_confirmed || !!status?.stripe_confirmed || !!status?.webhook_confirmed;

  const billingComplete = REQUIRE_WEBHOOK_CONFIRMATION ? webhookConfirmed : billingSignals;

  // Optional “processing” grace
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

  // Integrations
  const okxConnected = !!status?.okx_connected || !!status?.okxConfigured;
  const alpacaConnected = !!status?.alpaca_connected || !!status?.alpacaConfigured;

  const walletConnected =
    !!status?.wallet_connected ||
    (Array.isArray(me?.wallet_addresses) && me.wallet_addresses.length > 0) ||
    (Array.isArray(me?.wallets) && me.wallets.length > 0) ||
    !!walletAddr;

  const okxReady = !requiresOkx ? true : okxConnected;
  const alpacaReady = !requiresAlpaca ? true : alpacaConnected;
  const walletReady = !requiresWallet ? true : walletConnected;

  const activationComplete = billingComplete && okxReady && alpacaReady && walletReady;

  // “Incomplete → demo-only dashboard”
  const demoOnly = !activationComplete;

  /* ======================================================
     PROGRESS (PERSIST ACROSS REFRESH)
  ====================================================== */

  const stepFlags = useMemo(
    () => ({
      billing: billingComplete,
      okx: okxReady,
      alpaca: alpacaReady,
      wallet: walletReady,
    }),
    [billingComplete, okxReady, alpacaReady, walletReady]
  );

  const progressPct = useMemo(() => {
    const vals = Object.values(stepFlags);
    const done = vals.filter(Boolean).length;
    return Math.round((done / vals.length) * 100);
  }, [stepFlags]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          progressPct,
          stepFlags,
          activationComplete,
          updatedAt: Date.now(),
        })
      );
    } catch {}
  }, [progressPct, stepFlags, activationComplete]);

  const persisted = useMemo(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /* ======================================================
     AUTO-REDIRECT (ONLY WHEN COMPLETE)
  ====================================================== */

  useEffect(() => {
    if (!loading && activationComplete) {
      const dest = nextParam || "/dashboard";
      nav(dest, { replace: true });
    }
  }, [loading, activationComplete, nextParam, nav]);

  /* ======================================================
     ACTIONS
  ====================================================== */

  const goBilling = () => nav("/billing");
  const goDemoDashboard = () => nav("/dashboard?mode=demo", { replace: false });

  const connectWallet = async () => {
    setError("");
    setBusy(true);
    try {
      if (!window.ethereum) throw new Error("MetaMask is not installed.");

      // Ensure chain + signer
      await getContractInstance("IMALI", POLYGON_MAINNET, { withSigner: true, autoSwitch: true });
      const signer = await getSigner(POLYGON_MAINNET);
      const address = await signer.getAddress();
      setWalletAddr(address);

      await api.post("/integrations/wallet", { wallet: address, chain: POLYGON_MAINNET });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveOkx = async () => {
    setError("");
    setBusy(true);
    try {
      if (!okxKey.trim() || !okxSecret.trim() || !okxPass.trim()) {
        throw new Error("Enter OKX Key, Secret, and Passphrase.");
      }

      await api.post("/integrations/okx", {
        api_key: okxKey.trim(),
        api_secret: okxSecret.trim(),
        passphrase: okxPass.trim(),
        mode: okxMode,
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
        throw new Error("Enter Alpaca Key and Secret.");
      }

      await api.post("/integrations/alpaca", {
        api_key: alpacaKey.trim(),
        api_secret: alpacaSecret.trim(),
        mode: alpacaMode,
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

  /* ======================================================
     RENDER
  ====================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading setup…
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div>{error || "Session expired."}</div>
        <Link to="/login" className="underline">
          Log in again
        </Link>
      </div>
    );
  }

  const showMetaMaskWarning = requiresWallet && !walletConnected && !hasMetaMask;

  return (
    <div ref={confettiRef} className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold">🚀 Account Setup</h1>
          <p className="text-white/75">
            Finish these steps to enable <span className="font-semibold">live trading</span>.
          </p>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">Plan: {tier.toUpperCase()}</span>
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">Progress: {progressPct}%</span>
            {persisted?.updatedAt ? (
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                Saved ✔
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <ProgressBar pct={progressPct} />
            <div className="text-xs text-white/60">
              {billingComplete
                ? "Billing confirmed."
                : inBillingGrace
                ? "Billing is still processing (Stripe webhook pending)."
                : REQUIRE_WEBHOOK_CONFIRMATION
                ? "Waiting for Stripe webhook confirmation."
                : "Billing not complete yet."}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => refresh().catch(() => {})}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
              disabled={busy}
            >
              {busy ? "Working…" : "Refresh"}
            </button>

            {demoOnly && (
              <button
                onClick={goDemoDashboard}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30"
                disabled={busy}
              >
                Go to demo dashboard
              </button>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
              {error}
            </div>
          ) : null}
        </div>

        {/* Step 1: Billing */}
        <Step
          title="1) Add payment method"
          done={billingComplete}
          right={
            !billingComplete ? (
              <button
                onClick={goBilling}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={busy}
              >
                Go to billing
              </button>
            ) : null
          }
        >
          {REQUIRE_WEBHOOK_CONFIRMATION ? (
            <div className="space-y-2">
              <div>
                This step completes when Stripe sends a <span className="font-semibold">webhook confirmation</span>.
              </div>
              {!billingComplete ? (
                <div className="text-white/60 text-xs">
                  If you just finished checkout, hit <span className="font-semibold">Refresh</span> in ~10–30 seconds.
                </div>
              ) : null}
            </div>
          ) : (
            <div>Billing is required to run automation safely.</div>
          )}
        </Step>

        {/* MetaMask warning */}
        {showMetaMaskWarning && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100 text-sm">
            <div className="font-semibold">MetaMask not installed.</div>
            <div className="mt-1">
              Install here:{" "}
              <a className="underline font-semibold" href={EXTERNAL.metamaskDownload} target="_blank" rel="noreferrer">
                MetaMask Download
              </a>
            </div>
          </div>
        )}

        {/* Step 2: OKX */}
        <Step
          title="2) Connect OKX (crypto trading)"
          done={okxReady}
          right={
            requiresOkx && !okxConnected ? (
              <button
                onClick={() => setShowOkx(true)}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500"
                disabled={busy}
              >
                Add keys
              </button>
            ) : null
          }
        >
          {requiresOkx ? (
            <div className="space-y-2">
              <div>Required for <span className="font-semibold">Pro</span> and <span className="font-semibold">Elite</span>.</div>
              <div className="text-xs text-white/60">
                Create keys here:{" "}
                <a className="underline" href={EXTERNAL.okxApi} target="_blank" rel="noreferrer">
                  OKX API Page
                </a>
              </div>
              {okxConnected ? <div className="text-emerald-200 text-sm">Connected ✅</div> : null}
            </div>
          ) : (
            <div className="text-white/70">Not required for Starter. You can connect later.</div>
          )}
        </Step>

        {/* Step 3: Alpaca */}
        <Step
          title="3) Connect Alpaca (stocks trading)"
          done={alpacaReady}
          right={
            requiresAlpaca && !alpacaConnected ? (
              <button
                onClick={() => setShowAlpaca(true)}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500"
                disabled={busy}
              >
                Add keys
              </button>
            ) : null
          }
        >
          {requiresAlpaca ? (
            <div className="space-y-2">
              <div>Required for <span className="font-semibold">Elite</span>.</div>
              <div className="text-xs text-white/60">
                Get keys here:{" "}
                <a className="underline" href={EXTERNAL.alpacaPaperDashboard} target="_blank" rel="noreferrer">
                  Alpaca Dashboard (Paper)
                </a>
              </div>
              {alpacaConnected ? <div className="text-emerald-200 text-sm">Connected ✅</div> : null}
            </div>
          ) : (
            <div className="text-white/70">Not required for Starter/Pro. You can connect later.</div>
          )}
        </Step>

        {/* Step 4: Wallet */}
        <Step
          title="4) Connect wallet (MetaMask)"
          done={walletReady}
          right={
            requiresWallet && !walletConnected ? (
              <button
                onClick={connectWallet}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500"
                disabled={busy || !hasMetaMask}
                title={!hasMetaMask ? "Install MetaMask first" : "Connect wallet"}
              >
                {busy ? "Connecting…" : "Connect"}
              </button>
            ) : null
          }
        >
          {requiresWallet ? (
            <div className="space-y-2">
              <div>Required for <span className="font-semibold">Elite</span>.</div>
              {walletConnected ? (
                <div className="text-emerald-200 text-sm break-words">Connected ✅ {walletAddr}</div>
              ) : (
                <div className="text-white/70">Click connect and approve the MetaMask popup.</div>
              )}
            </div>
          ) : (
            <div className="text-white/70">Not required for Starter/Pro.</div>
          )}
        </Step>

        {/* Bottom status */}
        {activationComplete ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            ✅ Setup complete — sending you to the dashboard…
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
            <div className="font-semibold">Demo mode active</div>
            <div className="text-sm text-amber-100/90 mt-1">
              Live trading unlocks automatically when setup is complete. Until then, the dashboard should run in demo-only mode.
            </div>
          </div>
        )}

        <div className="text-xs text-white/50 text-center pt-2">
          Trading involves risk. Never trade money you can’t afford to lose.
        </div>

        {/* Debug (optional) */}
        <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm text-white/70">Debug</summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap text-white/70 overflow-auto">
            {JSON.stringify(
              {
                tier,
                status,
                guards: { REQUIRE_WEBHOOK_CONFIRMATION },
                derived: {
                  billingSignals,
                  webhookConfirmed,
                  billingComplete,
                  okxConnected,
                  alpacaConnected,
                  walletConnected,
                  activationComplete,
                  demoOnly,
                  nextParam,
                },
                progress: { progressPct, stepFlags },
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>

      {/* OKX MODAL */}
      <Modal open={showOkx} title="Add OKX API Keys" onClose={() => setShowOkx(false)} busy={busy}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Create keys here:{" "}
            <a className="underline font-semibold" href={EXTERNAL.okxApi} target="_blank" rel="noreferrer">
              OKX API Page
            </a>
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
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ALPACA MODAL */}
      <Modal open={showAlpaca} title="Add Alpaca API Keys" onClose={() => setShowAlpaca(false)} busy={busy}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Get keys here:{" "}
            <a className="underline font-semibold" href={EXTERNAL.alpacaPaperDashboard} target="_blank" rel="noreferrer">
              Alpaca Dashboard (Paper)
            </a>
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
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}