// src/pages/Activation.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getContractInstance, getSigner, POLYGON_MAINNET } from "../getContractInstance";

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
const TOKEN_KEY = "imali_token";

/* OWNER OVERRIDE */
const OWNER_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

/* 24h billing grace */
const BILLING_GRACE_MS = 24 * 60 * 60 * 1000;

/* Paths (match your App.js) */
const PATHS = {
  billing: "/billing",
  dashboard: "/dashboard",
  admin: "/admin",
  pricing: "/pricing",
  metamaskGuide: "/wallet-metamask",
};

/* External links (exact “where to get it”) */
const EXTERNAL = {
  metamaskDownload: "https://metamask.io/download/",
  okxApi: "https://www.okx.com/account/my-api",
  alpacaPaperDashboard: "https://app.alpaca.markets/paper/dashboard/overview",
};

/* =========================
   Axios instance
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
   Utils
========================= */
const now = () => Date.now();
const lower = (v) => String(v || "").trim().toLowerCase();
const isOwner = (me) => OWNER_EMAILS.includes(lower(me?.email));
const short = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");

/* =========================
   Deep link helper:
   - supports: /activation?next=/dashboard
========================= */
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

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function StepCard({ number, title, done, xp, children, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center font-extrabold">
            {number}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-lg leading-snug break-words">{title}</div>
            {subtitle ? (
              <div className="text-sm text-white/70 mt-0.5 leading-snug break-words">{subtitle}</div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {done ? <Pill>✅ Complete</Pill> : <Pill>⏳ In progress</Pill>}
              {xp ? <Pill>⚡ +{xp} XP</Pill> : null}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {done ? (
            <div className="text-emerald-300 font-semibold">Done</div>
          ) : (
            <div className="text-white/60">Next</div>
          )}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} role="button" tabIndex={0} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gray-950 p-5">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="text-lg font-bold break-words">{title}</div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-white/10 shrink-0">
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
  const location = useLocation();
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
  const [okxMode, setOkxMode] = useState("paper");

  // Alpaca inputs
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [alpacaMode, setAlpacaMode] = useState("paper");

  // Wallet display
  const [walletAddr, setWalletAddr] = useState("");

  // “mini wizard” step focus
  const [wizardStep, setWizardStep] = useState(1);

  const hasMetaMask = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.ethereum;
  }, []);

  // Deep link (redirect after completion)
  const nextParam = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return safeNextPath(qs.get("next"));
  }, [location.search]);

  const refresh = useCallback(async () => {
    setError("");

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

    const user = meRes.data?.user || null;
    const st = statusRes.data?.status ?? statusRes.data ?? null;

    setMe(user);
    setStatus(st);

    // Wallet display priority:
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

  /* =========================
     DERIVED FLAGS (tier-based)
     - No “Pick Your Path” here.
     - Path/upgrades happen in dashboard.
     - Steps are always: 1) Payment 2) OKX 3) Alpaca
     - MetaMask is required only for Elite.
  ========================= */
  const owner = useMemo(() => isOwner(me), [me]);

  const tier = useMemo(() => {
    const t = lower(me?.tier_active || me?.tier || "starter");
    // normalize common values
    if (t.includes("elite")) return "elite";
    if (t.includes("pro")) return "pro";
    if (t.includes("starter")) return "starter";
    return t || "starter";
  }, [me]);

  const requiresOkx = useMemo(() => tier === "pro" || tier === "elite", [tier]);
  const requiresAlpaca = useMemo(() => tier === "elite", [tier]);
  const requiresWallet = useMemo(() => tier === "elite", [tier]);

  // Billing
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

  // Integrations
  const okxConnected = !!status?.okx_connected || !!status?.okxConfigured;
  const alpacaConnected = !!status?.alpaca_connected || !!status?.alpacaConfigured;

  // Wallet
  const walletConnected =
    !!status?.wallet_connected ||
    (Array.isArray(me?.wallet_addresses) && me.wallet_addresses.length > 0) ||
    (Array.isArray(me?.wallets) && me.wallets.length > 0) ||
    !!walletAddr;

  const okxReqComplete = owner || !requiresOkx || okxConnected;
  const alpacaReqComplete = owner || !requiresAlpaca || alpacaConnected;
  const walletReqComplete = owner || !requiresWallet || walletConnected;

  const activationComplete =
    owner || (billingComplete && okxReqComplete && alpacaReqComplete && walletReqComplete);

  const readOnlyMode = !activationComplete && (billingComplete || inBillingGrace);

  // Wizard step focus
  useEffect(() => {
    if (activationComplete) return;
    if (!billingComplete && !owner) return setWizardStep(1);
    if (requiresOkx && !okxConnected && !owner) return setWizardStep(2);
    if ((requiresAlpaca && !alpacaConnected && !owner) || (requiresWallet && !walletConnected && !owner))
      return setWizardStep(3);
    setWizardStep(3);
  }, [
    activationComplete,
    billingComplete,
    owner,
    requiresOkx,
    okxConnected,
    requiresAlpaca,
    alpacaConnected,
    requiresWallet,
    walletConnected,
  ]);

  // Redirect when activation completes (supports deep link)
  useEffect(() => {
    if (!loading && activationComplete) {
      const dest = nextParam || PATHS.dashboard;
      navigate(dest, { replace: true });
    }
  }, [loading, activationComplete, navigate, nextParam]);

  /* =========================
     ACTIONS
  ========================= */
  const goBilling = () => navigate(PATHS.billing);
  const goDashboard = () => navigate(PATHS.dashboard);
  const goAdmin = () => navigate(PATHS.admin);

  const connectWallet = async () => {
    setError("");
    setBusy(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is not installed. Install it to continue.");
      }

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

  /* =========================
     GAMIFICATION / PROGRESS
     Steps are fixed:
       1) Payment
       2) OKX
       3) Alpaca (and MetaMask inside for Elite)
  ========================= */
  const steps = useMemo(() => {
    return [
      { key: "billing", label: "billing", done: owner || billingComplete, xp: 80 },
      { key: "okx", label: "okx", done: owner || okxReqComplete, xp: 120 },
      { key: "alpaca", label: "alpaca", done: owner || alpacaReqComplete, xp: 120 },
    ];
  }, [owner, billingComplete, okxReqComplete, alpacaReqComplete]);

  const progressPct = useMemo(() => {
    const total = steps.length;
    const done = steps.filter((x) => x.done).length;
    return Math.round((done / total) * 100);
  }, [steps]);

  const totalXp = useMemo(() => {
    const earned = steps.reduce((sum, s) => sum + (s.done ? s.xp : 0), 0);
    const max = steps.reduce((sum, s) => sum + s.xp, 0);
    return { earned, max };
  }, [steps]);

  /* =========================
     RENDER
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
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

  const showMetaMaskWarning = !owner && requiresWallet && !walletConnected && !hasMetaMask;

  return (
    <div
      ref={confettiRef}
      className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold break-words">🚀 Activation</h1>
              <p className="text-white/70 break-words">
                Complete your setup for the <span className="font-semibold capitalize">{tier}</span> plan.
                Upgrades and trading paths are handled in your dashboard.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>🎯 Progress: {progressPct}%</Pill>
                <Pill>
                  ⚡ XP: {totalXp.earned}/{totalXp.max}
                </Pill>
                <Pill>Plan: {tier.toUpperCase()}</Pill>
                {owner && <Pill>👑 Owner Override</Pill>}
                {requiresWallet && walletAddr ? <Pill>🦊 Wallet: {short(walletAddr)}</Pill> : null}
                {readOnlyMode && !activationComplete ? <Pill>👀 Read-only</Pill> : null}
              </div>
            </div>

            <div className="text-right shrink-0">
              <button
                onClick={() => refresh().catch(() => {})}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
                disabled={busy}
              >
                {busy ? "Working…" : "Refresh"}
              </button>

              <div className="mt-2 text-xs text-white/50">
                This page auto-sends you to <span className="font-semibold">MemberDashboard</span> when complete.
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 w-full rounded-full bg-black/30 border border-white/10 overflow-hidden">
            <div className="h-full bg-white/30" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Mini wizard nudge */}
          <div className="mt-3 text-sm text-white/75">
            🧙 Next:{" "}
            <span className="font-semibold">
              {wizardStep === 1
                ? "Step 1 — Add your payment method."
                : wizardStep === 2
                ? "Step 2 — Connect OKX."
                : "Step 3 — Connect Alpaca (and MetaMask for Elite)."}
            </span>
          </div>

          {/* MetaMask not installed */}
          {showMetaMaskWarning && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
              <div className="font-semibold">MetaMask not installed.</div>
              <div className="mt-1 text-sm text-amber-100/90">
                Install:{" "}
                <a
                  href={EXTERNAL.metamaskDownload}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  MetaMask Download
                </a>{" "}
                • Guide:{" "}
                <Link className="underline font-semibold" to={PATHS.metamaskGuide}>
                  MetaMask setup
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ERRORS */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* STEP 1: Billing */}
        <StepCard
          number={1}
          title="Add Payment Method"
          subtitle="Required for all plans."
          done={owner || billingComplete}
          xp={80}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-white/75">
              {billingComplete || owner ? (
                <div>Payment method is on file.</div>
              ) : (
                <div>Add a card so automation can run when you enable features.</div>
              )}

              {inBillingGrace && !billingComplete ? (
                <div className="text-amber-200 mt-2">
                  Billing grace is active. If Stripe is still processing, try Refresh in a moment.
                </div>
              ) : null}

              <div className="mt-2 text-xs text-white/60">
                Link:{" "}
                <Link className="underline" to={PATHS.billing}>
                  {PATHS.billing}
                </Link>
              </div>
            </div>

            {!billingComplete && !owner ? (
              <button
                onClick={goBilling}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                disabled={busy}
              >
                Go to Billing
              </button>
            ) : (
              <Link
                to={PATHS.billing}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold text-center"
              >
                View Billing
              </Link>
            )}
          </div>
        </StepCard>

        {/* STEP 2: OKX */}
        <div className="mt-4">
          <StepCard
            number={2}
            title="Connect OKX API"
            subtitle={
              requiresOkx
                ? "Required for Pro & Elite (CEX automation)."
                : "Not required for Starter (you can add later in the dashboard)."
            }
            done={owner || okxReqComplete}
            xp={120}
          >
            {!requiresOkx && !owner ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/75">
                Your current plan does not require OKX. You can upgrade anytime in the dashboard.
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">🔑 OKX API Keys</div>
                    <div className="text-xs text-white/60 mt-1 break-words">
                      Create keys here:{" "}
                      <a className="underline" href={EXTERNAL.okxApi} target="_blank" rel="noreferrer">
                        OKX API Page
                      </a>
                    </div>

                    {okxConnected || owner ? (
                      <div className="mt-2 text-sm text-emerald-200">Connected ✅</div>
                    ) : (
                      <div className="mt-2 text-sm text-white/70">
                        Open the OKX link → create keys → paste here → save.
                      </div>
                    )}
                  </div>

                  {!okxConnected && !owner ? (
                    <button
                      onClick={() => setShowOkx(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold shrink-0"
                      disabled={busy}
                    >
                      {busy ? "Working…" : "Add Keys"}
                    </button>
                  ) : (
                    <Pill>✅ Complete</Pill>
                  )}
                </div>
              </div>
            )}
          </StepCard>
        </div>

        {/* STEP 3: Alpaca (and MetaMask for Elite) */}
        <div className="mt-4">
          <StepCard
            number={3}
            title="Connect Alpaca API"
            subtitle={
              requiresAlpaca
                ? "Required for Elite (stocks automation)."
                : "Not required for Starter/Pro (you can add later in the dashboard)."
            }
            done={owner || alpacaReqComplete}
            xp={120}
          >
            <div className="space-y-3">
              {!requiresAlpaca && !owner ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/75">
                  Your current plan does not require Alpaca. You can upgrade anytime in the dashboard.
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">🔑 Alpaca API Keys</div>
                      <div className="text-xs text-white/60 mt-1 break-words">
                        Get keys here:{" "}
                        <a
                          className="underline"
                          href={EXTERNAL.alpacaPaperDashboard}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Alpaca Dashboard (Paper)
                        </a>
                      </div>

                      {alpacaConnected || owner ? (
                        <div className="mt-2 text-sm text-emerald-200">Connected ✅</div>
                      ) : (
                        <div className="mt-2 text-sm text-white/70">
                          Open the Alpaca link → copy keys → paste here → save.
                        </div>
                      )}
                    </div>

                    {!alpacaConnected && !owner ? (
                      <button
                        onClick={() => setShowAlpaca(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold shrink-0"
                        disabled={busy}
                      >
                        {busy ? "Working…" : "Add Keys"}
                      </button>
                    ) : (
                      <Pill>✅ Complete</Pill>
                    )}
                  </div>
                </div>
              )}

              {/* MetaMask requirement is Elite-only (per your rules) */}
              {requiresWallet && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">🦊 MetaMask Wallet (Elite)</div>
                      <div className="text-xs text-white/60 mt-1 break-words">
                        Install:{" "}
                        <a className="underline" href={EXTERNAL.metamaskDownload} target="_blank" rel="noreferrer">
                          MetaMask Download
                        </a>{" "}
                        • Guide:{" "}
                        <Link className="underline" to={PATHS.metamaskGuide}>
                          MetaMask setup
                        </Link>
                      </div>

                      {walletConnected && walletAddr ? (
                        <div className="mt-2 text-sm text-emerald-200 break-words">
                          Connected: <span className="font-semibold">{walletAddr}</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-white/70">
                          Click connect, approve the popup, done.
                        </div>
                      )}
                    </div>

                    {!walletConnected && !owner ? (
                      <button
                        onClick={connectWallet}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold shrink-0"
                        disabled={busy}
                        title={!hasMetaMask ? "Install MetaMask first" : "Connect wallet"}
                      >
                        {busy ? "Connecting…" : "Connect"}
                      </button>
                    ) : (
                      <Pill>✅ Complete</Pill>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-white/60">
              ✅ When the required steps for your plan are complete, you’ll be sent to{" "}
              <span className="font-semibold">MemberDashboard</span>{" "}
              <span className="text-white/50">({PATHS.dashboard})</span>.
              {nextParam ? (
                <div className="mt-1">
                  Deep link active → after completion you’ll go to{" "}
                  <span className="font-semibold break-words">{nextParam}</span>.
                </div>
              ) : null}
            </div>
          </StepCard>
        </div>

        {/* UNLOCK PANEL */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          {activationComplete ? (
            <div className="text-emerald-300 font-semibold">✅ Complete — redirecting…</div>
          ) : readOnlyMode ? (
            <div className="text-amber-200 font-semibold">👀 Read-only access available</div>
          ) : (
            <div className="text-white/80 font-semibold">🔒 Finish the required steps to unlock</div>
          )}

          <div className="mt-2 text-xs text-white/60">
            Requirements are plan-based (not path-based). Enable/disable trading features in your dashboard.
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
            Go to MemberDashboard
          </button>

          {owner && (
            <button
              onClick={goAdmin}
              className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold"
            >
              Admin Panel
            </button>
          )}

          <Link
            to={PATHS.pricing}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
          >
            Pricing
          </Link>
        </div>

        {/* DEBUG */}
        <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm text-white/70">Debug</summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap text-white/70 overflow-auto">
            {JSON.stringify(
              {
                me,
                status,
                derived: {
                  tier,
                  requiresOkx,
                  requiresAlpaca,
                  requiresWallet,
                  billingComplete,
                  inBillingGrace,
                  okxConnected,
                  alpacaConnected,
                  walletConnected,
                  walletAddr,
                  activationComplete,
                  readOnlyMode,
                  nextParam,
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
      <Modal open={showOkx} title="Add OKX API Keys" onClose={() => (!busy ? setShowOkx(false) : null)}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Get keys here:{" "}
            <a className="underline font-semibold" href={EXTERNAL.okxApi} target="_blank" rel="noreferrer">
              OKX API Page
            </a>
            <div className="mt-1 text-xs text-white/50">
              Tip: create keys with the permissions you need (start minimal).
            </div>
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
      <Modal open={showAlpaca} title="Add Alpaca API Keys" onClose={() => (!busy ? setShowAlpaca(false) : null)}>
        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Get keys here:{" "}
            <a className="underline font-semibold" href={EXTERNAL.alpacaPaperDashboard} target="_blank" rel="noreferrer">
              Alpaca Dashboard (Paper)
            </a>
            <div className="mt-1 text-xs text-white/50">
              Tip: if you want live keys, switch Alpaca to live first.
            </div>
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
