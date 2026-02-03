// src/pages/Activation.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";

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

/* Local fallback for mode if backend doesn’t store it yet */
const MODE_KEY = "imali_activation_mode";

/* Paths (match your App.js) */
const PATHS = {
  billing: "/billing",
  dashboard: "/dashboard", // ✅ canonical MemberDashboard route
  admin: "/admin",
  pricing: "/pricing",
  metamaskGuide: "/wallet-metamask",

  // Your product pages (names shown beside choices)
  tradeDemo: "/trade-demo",
  supportedChains: "/supported-chains",
  fundingGuide: "/funding-guide",
};

/* External links (exact “where to get it”) */
const EXTERNAL = {
  metamaskDownload: "https://metamask.io/download/",
  okxApi: "https://www.okx.com/account/my-api",
  alpacaPaperDashboard: "https://app.alpaca.markets/paper/dashboard/overview",
};

/* =========================
   MODES (novice choices)
========================= */
const MODES = {
  new_crypto: {
    key: "new_crypto",
    title: "New Crypto",
    subtitle: "Sniper + early DEX pairs",
    pageName: "TradeDemo",
    pagePath: PATHS.tradeDemo,
    requires: { wallet: true, okx: false, alpaca: false },
    xp: 120,
    emoji: "🧨",
  },
  established_crypto: {
    key: "established_crypto",
    title: "Established Crypto",
    subtitle: "CEX automation (OKX)",
    pageName: "SupportedChains",
    pagePath: PATHS.supportedChains,
    requires: { wallet: false, okx: true, alpaca: false },
    xp: 120,
    emoji: "🏦",
  },
  stocks: {
    key: "stocks",
    title: "Stocks",
    subtitle: "Alpaca paper/live",
    pageName: "FundingGuide",
    pagePath: PATHS.fundingGuide,
    requires: { wallet: false, okx: false, alpaca: true },
    xp: 120,
    emoji: "📈",
  },
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
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center font-extrabold">
            {number}
          </div>
          <div>
            <div className="font-extrabold text-lg">{title}</div>
            {subtitle ? <div className="text-sm text-white/70 mt-0.5">{subtitle}</div> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {done ? <Pill>✅ Complete</Pill> : <Pill>⏳ In progress</Pill>}
              {xp ? <Pill>⚡ +{xp} XP</Pill> : null}
            </div>
          </div>
        </div>

        <div className="text-right">
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

/* =========================
   Deep link helper:
   - supports: /activation?next=/dashboard
   - supports: /activation?next=/trade-demo (etc)
========================= */
function safeNextPath(nextRaw) {
  if (!nextRaw) return "";
  try {
    const s = String(nextRaw);
    // allow only internal paths
    if (!s.startsWith("/")) return "";
    if (s.startsWith("//")) return "";
    return s;
  } catch {
    return "";
  }
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

  // Mode selection
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY) || "new_crypto";
    } catch {
      return "new_crypto";
    }
  });

  // Wallet display
  const [walletAddr, setWalletAddr] = useState("");

  // “mini wizard” step focus (optional UI)
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
    // 1) backend wallet list
    // 2) status.wallet_address
    const backendWallet =
      (Array.isArray(user?.wallet_addresses) && user.wallet_addresses[0]) ||
      (Array.isArray(user?.wallets) && user.wallets[0]) ||
      st?.wallet_address ||
      "";

    if (backendWallet) setWalletAddr(backendWallet);

    // Mode from backend if available, else local
    const backendMode = user?.mode || st?.mode || "";
    const chosen = backendMode || (localStorage.getItem(MODE_KEY) || mode);
    if (chosen && MODES[chosen]) setMode(chosen);
  }, [mode]);

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
     DERIVED FLAGS
  ========================= */
  const owner = useMemo(() => isOwner(me), [me]);
  const tier = useMemo(() => lower(me?.tier_active || me?.tier || "starter"), [me]);

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

  const inBillingGrace = !billingComplete && !!billingStartedAtMs && now() - billingStartedAtMs < BILLING_GRACE_MS;

  // Wallet
  const walletConnected =
    !!status?.wallet_connected ||
    (Array.isArray(me?.wallet_addresses) && me.wallet_addresses.length > 0) ||
    (Array.isArray(me?.wallets) && me.wallets.length > 0) ||
    !!walletAddr;

  // Integrations
  const okxConnected = !!status?.okx_connected || !!status?.okxConfigured;
  const alpacaConnected = !!status?.alpaca_connected || !!status?.alpacaConfigured;

  // Mode
  const selectedMode = MODES[mode] || MODES.new_crypto;
  const req = selectedMode.requires;

  const modeComplete = owner || (!!mode && !!MODES[mode]);

  // Requirements change based on selected mode
  const walletReqComplete = !req.wallet || walletConnected || owner;
  const okxReqComplete = !req.okx || okxConnected || owner;
  const alpacaReqComplete = !req.alpaca || alpacaConnected || owner;

  // Activation complete for this page:
  // Billing + Mode + required integration(s)
  const activationComplete =
    owner || (billingComplete && modeComplete && walletReqComplete && okxReqComplete && alpacaReqComplete);

  const readOnlyMode = !activationComplete && (billingComplete || inBillingGrace);

  // Wizard step focus (auto)
  useEffect(() => {
    if (activationComplete) return;
    if (!billingComplete && !owner) return setWizardStep(1);
    if (!modeComplete && !owner) return setWizardStep(2);

    // integrations step
    if (req.wallet && !walletConnected && !owner) return setWizardStep(3);
    if (req.okx && !okxConnected && !owner) return setWizardStep(3);
    if (req.alpaca && !alpacaConnected && !owner) return setWizardStep(3);

    setWizardStep(3);
  }, [activationComplete, billingComplete, owner, modeComplete, req.wallet, req.okx, req.alpaca, walletConnected, okxConnected, alpacaConnected]);

  // ✅ Redirect when activation completes (supports deep link)
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

  const saveMode = async (nextMode) => {
    setError("");
    setBusy(true);
    try {
      setMode(nextMode);
      try {
        localStorage.setItem(MODE_KEY, nextMode);
      } catch {}

      // Optional: persist mode on backend if supported
      try {
        await api.post("/me/mode", { mode: nextMode });
      } catch {
        // ignore if backend not ready
      }

      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to save choice.");
    } finally {
      setBusy(false);
    }
  };

  // ✅ MetaMask connect via getContractInstance (opens MetaMask when signer is requested)
  const connectWallet = async () => {
    setError("");
    setBusy(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is not installed. Install it to continue.");
      }

      // triggers MetaMask prompt and can switch network
      await getContractInstance("IMALI", POLYGON_MAINNET, { withSigner: true, autoSwitch: true });

      const signer = await getSigner(POLYGON_MAINNET);
      const address = await signer.getAddress();
      setWalletAddr(address);

      // Save to backend
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
     GAMIFICATION
  ========================= */
  const steps = useMemo(() => {
    const s = [];
    s.push({ key: "billing", done: owner || billingComplete, xp: 80 });
    s.push({ key: "mode", done: owner || modeComplete, xp: 120 });
    s.push({
      key: "integrations",
      done: owner || (walletReqComplete && okxReqComplete && alpacaReqComplete),
      xp: 160,
    });
    return s;
  }, [owner, billingComplete, modeComplete, walletReqComplete, okxReqComplete, alpacaReqComplete]);

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

  // Only show MetaMask warning if required and not connected
  const showMetaMaskWarning = !owner && req.wallet && !walletConnected && !hasMetaMask;

  return (
    <div ref={confettiRef} className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">🚀 Activation Quest</h1>
              <p className="text-white/70">Complete the steps. Unlock your dashboard.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill>🎯 Progress: {progressPct}%</Pill>
                <Pill>⚡ XP: {totalXp.earned}/{totalXp.max}</Pill>
                {owner && <Pill>👑 Owner Override</Pill>}
                {walletConnected && walletAddr && <Pill>🦊 Wallet: {short(walletAddr)}</Pill>}
                {readOnlyMode && !activationComplete ? <Pill>👀 Read-only</Pill> : null}
                <Pill>API: {API_BASE}</Pill>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => refresh().catch(() => {})}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10"
                disabled={busy}
              >
                {busy ? "Working…" : "Refresh"}
              </button>

              <div className="mt-2 text-xs text-white/50">
                Tip: This page will auto-send you to{" "}
                <span className="font-semibold">MemberDashboard</span> when complete.
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 w-full rounded-full bg-black/30 border border-white/10 overflow-hidden">
            <div className="h-full bg-white/30" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Mini wizard nudge */}
          <div className="mt-3 text-sm text-white/75">
            🧙 Wizard says:{" "}
            <span className="font-semibold">
              {wizardStep === 1
                ? "Step 1: Add your payment method."
                : wizardStep === 2
                ? "Step 2: Pick your trading path."
                : "Step 3: Connect what your path needs."}
            </span>
          </div>

          {/* MetaMask not installed */}
          {showMetaMaskWarning && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
              <div className="font-semibold">MetaMask not installed.</div>
              <div className="mt-1 text-sm text-amber-100/90">
                Install it here:{" "}
                <a href={EXTERNAL.metamaskDownload} target="_blank" rel="noreferrer" className="underline font-semibold">
                  MetaMask Download
                </a>{" "}
                • or follow{" "}
                <Link className="underline font-semibold" to={PATHS.metamaskGuide}>
                  the MetaMask guide
                </Link>
                .
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
          subtitle="One-time setup so we can run automation for your plan."
          done={owner || billingComplete}
          xp={80}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-white/75">
              {tier === "starter"
                ? "Starter needs a card on file."
                : "Paid tier active."}
              {inBillingGrace && !billingComplete ? (
                <div className="text-amber-200 mt-1">Billing grace active (you can retry).</div>
              ) : null}

              <div className="mt-2 text-xs text-white/60">
                Link: <Link className="underline" to={PATHS.billing}>{PATHS.billing}</Link>
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

        {/* STEP 2: Mode */}
        <div className="mt-4">
          <StepCard
            number={2}
            title="Pick Your Trading Path"
            subtitle="Choose what you want to trade first. You can add more later."
            done={owner || modeComplete}
            xp={120}
          >
            <div className="grid md:grid-cols-3 gap-3">
              {Object.values(MODES).map((m) => {
                const selected = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => saveMode(m.key)}
                    disabled={busy}
                    className={`text-left rounded-2xl border p-4 transition ${
                      selected
                        ? "border-emerald-400/40 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-extrabold text-lg">
                      {m.emoji} {m.title}
                    </div>
                    <div className="text-sm text-white/70">{m.subtitle}</div>

                    <div className="mt-2 text-xs text-white/70">
                      Page:{" "}
                      <Link className="underline font-semibold" to={m.pagePath}>
                        {m.pageName}
                      </Link>
                      <span className="text-white/50"> ({m.pagePath})</span>
                    </div>

                    {selected && (
                      <div className="mt-3 text-emerald-300 font-semibold text-sm">
                        Selected ✅
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-white/60">
              Pro tip: start with one path. You can connect the others from your dashboard later.
            </div>
          </StepCard>
        </div>

        {/* STEP 3: Integrations */}
        <div className="mt-4">
          <StepCard
            number={3}
            title="Connect What Your Path Needs"
            subtitle="Quick + basic. Click → approve → done."
            done={owner || (walletReqComplete && okxReqComplete && alpacaReqComplete)}
            xp={160}
          >
            <div className="text-white/75 mb-3">
              Selected path:{" "}
              <span className="font-semibold">{selectedMode.title}</span>{" "}
              <span className="text-white/50">(links included)</span>
            </div>

            <div className="space-y-3">
              {/* MetaMask */}
              {req.wallet && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="max-w-[75%]">
                      <div className="font-semibold">🦊 MetaMask Wallet</div>

                      <div className="text-xs text-white/60 mt-1">
                        Get it:{" "}
                        <a className="underline" href={EXTERNAL.metamaskDownload} target="_blank" rel="noreferrer">
                          MetaMask Download
                        </a>{" "}
                        • Guide:{" "}
                        <Link className="underline" to={PATHS.metamaskGuide}>
                          MetaMaskGuide
                        </Link>
                      </div>

                      {walletConnected && walletAddr ? (
                        <div className="mt-2 text-sm text-emerald-200">
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
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
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

              {/* OKX */}
              {req.okx && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="max-w-[75%]">
                      <div className="font-semibold">🔑 OKX API Keys</div>
                      <div className="text-xs text-white/60 mt-1">
                        Create keys:{" "}
                        <a className="underline" href={EXTERNAL.okxApi} target="_blank" rel="noreferrer">
                          OKX API Page
                        </a>
                      </div>
                      <div className="mt-2 text-sm text-white/70">
                        Open the page → create keys → paste here → save.
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        Tip: search less — use the link above (it’s the exact page).
                      </div>
                    </div>

                    {!okxConnected && !owner ? (
                      <button
                        onClick={() => setShowOkx(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
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

              {/* Alpaca */}
              {req.alpaca && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="max-w-[75%]">
                      <div className="font-semibold">🔑 Alpaca API Keys</div>
                      <div className="text-xs text-white/60 mt-1">
                        Get keys:{" "}
                        <a className="underline" href={EXTERNAL.alpacaPaperDashboard} target="_blank" rel="noreferrer">
                          Alpaca Dashboard (Paper)
                        </a>
                      </div>
                      <div className="mt-2 text-sm text-white/70">
                        Open the page → copy keys → paste here → save.
                      </div>
                      <div className="mt-2 text-xs text-white/50">
                        Tip: if you want live keys, switch to live inside Alpaca first.
                      </div>
                    </div>

                    {!alpacaConnected && !owner ? (
                      <button
                        onClick={() => setShowAlpaca(true)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
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

              {/* If the path needs nothing (owner or future modes) */}
              {!req.wallet && !req.okx && !req.alpaca ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/70">
                  No connections needed for this path right now.
                </div>
              ) : null}
            </div>

            <div className="mt-4 text-xs text-white/60">
              ✅ When Step 1–3 are complete, you’ll be sent to{" "}
              <span className="font-semibold">MemberDashboard</span>{" "}
              <span className="text-white/50">({PATHS.dashboard})</span>.
              {nextParam ? (
                <div className="mt-1">
                  Deep link active → after completion you’ll go to{" "}
                  <span className="font-semibold">{nextParam}</span>.
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
            <div className="text-white/80 font-semibold">🔒 Finish the steps to unlock</div>
          )}

          <div className="mt-2 text-xs text-white/60">
            Required: Payment + Path + Required Connection(s). Trading enable/disable happens on your dashboard.
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
            <button onClick={goAdmin} className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold">
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
                  mode,
                  selectedMode: selectedMode.key,
                  progressPct,
                  xp: totalXp,
                  billingComplete,
                  inBillingGrace,
                  walletConnected,
                  walletAddr,
                  okxConnected,
                  alpacaConnected,
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
              (Tip: create keys with trading permissions only if you intend to automate trading.)
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
              (If you want live keys, switch Alpaca to live first.)
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

/* ============================================================
   NOTE (API keys “without searching”):
   - We already deep-link users to the exact vendor pages above.
   - The ONLY “more automatic” options are:
     1) OAuth flows (best UX, more backend work)
        - OKX: their API access is typically key-based (OAuth is not common for trading keys)
        - Alpaca: supports OAuth for some apps, but many use keys
     2) In-app wizard overlays (screenshots + copy-paste guide)
   - If you want, add an in-app “Key Finder” page with:
        - exact links,
        - screenshots,
        - steps per device (desktop vs mobile),
        - a “copy this redirect link” button like:
          /activation?next=/dashboard
============================================================ */
