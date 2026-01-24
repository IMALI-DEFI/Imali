// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

/* -------------------------- API base resolver (CRA + Vite) -------------------------- */
const RAW_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com"; // production-safe

const API_BASE = String(RAW_BASE || "").replace(/\/+$/, "");
const API_PREFIX = "/api";

function apiUrl(path) {
  const p = String(path || "").trim();
  if (!p) return `${API_BASE}${API_PREFIX}`;

  const withSlash = p.startsWith("/") ? p : `/${p}`;
  // If already includes /api, keep it; otherwise prefix /api
  if (withSlash.startsWith("/api/") || withSlash === "/api") {
    return `${API_BASE}${withSlash}`;
  }
  return `${API_BASE}${API_PREFIX}${withSlash}`;
}

/* -------------------------- Help Links -------------------------- */
const LINKS = {
  pricing: "/pricing",
  dashboard: "/MemberDashboard",
  login: "/login",
  okxApiGuide: "/support/okx-api-keys",
  okxFunding: "/support/funding#okx",
  metamaskInstall: "https://metamask.io/download/",
  walletFunding: "/support/funding#wallet",
};

/* -------------------------- Tier rules -------------------------- */
const TIER_RULES = {
  starter: {
    label: "STARTER",
    lockMode: "auto",
    allowManual: false,
    allowStocks: true,
    allowOkx: true,
    allowDex: false,
    require: { stocks: false, okx: false, wallet: false },
  },
  pro: {
    label: "PRO",
    lockMode: null,
    allowManual: true,
    allowStocks: true,
    allowOkx: true,
    allowDex: false,
    require: { stocks: false, okx: true, wallet: false },
  },
  elite: {
    label: "ELITE",
    lockMode: null,
    allowManual: true,
    allowStocks: true,
    allowOkx: true,
    allowDex: true,
    require: { stocks: false, okx: true, wallet: true },
  },
};

function safeTier(me) {
  const t = String(me?.tier || "").toLowerCase();
  if (t.includes("elite")) return "elite";
  if (t.includes("pro")) return "pro";
  if (t.includes("starter") || t.includes("free")) return "starter";
  return "starter";
}

const shortAddr = (a) =>
  a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Check({ ok }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
      ✅ <span>Done</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-white/40">
      ⬜ <span>Pending</span>
    </span>
  );
}

function LockBadge() {
  return (
    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">
      🔒 Locked
    </span>
  );
}

export default function Activation() {
  /* -------------------------- Wallet context (safe) -------------------------- */
  const wallet = typeof useWallet === "function" ? useWallet() : null;

  const connect = wallet?.connect;
  const disconnect = wallet?.disconnect;
  const address = wallet?.address;
  const chainId = wallet?.chainId;

  const walletReady = !!wallet && typeof connect === "function";
  const walletConnected = !!address;

  /* -------------------------- Tabs -------------------------- */
  const [tab, setTab] = useState("overview"); // overview | stocks | cex | dex

  /* -------------------------- Me -------------------------- */
  const [me, setMe] = useState(null);
  const [meErr, setMeErr] = useState("");
  const [meLoading, setMeLoading] = useState(true);

  /* -------------------------- Execution mode -------------------------- */
  const [execMode, setExecMode] = useState("auto");
  const [execSaving, setExecSaving] = useState(false);
  const [execMsg, setExecMsg] = useState("");

  /* -------------------------- Stocks -------------------------- */
  const [stockBroker, setStockBroker] = useState("paper");
  const [sApiKey, setSApiKey] = useState("");
  const [sApiSecret, setSApiSecret] = useState("");
  const [sPassphrase, setSPassphrase] = useState("");
  const [sSaving, setSSaving] = useState(false);
  const [sErr, setSErr] = useState("");
  const [sOk, setSOk] = useState("");

  const [mode, setMode] = useState("fixed");
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);
  const [minPrice, setMinPrice] = useState(5);
  const [minDollarVol, setMinDollarVol] = useState(5_000_000);
  const [blacklist, setBlacklist] = useState("OTC");
  const [uSaving, setUSaving] = useState(false);
  const [uMsg, setUMsg] = useState("");

  /* -------------------------- OKX -------------------------- */
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [subaccount, setSubaccount] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cErr, setCErr] = useState("");
  const [cOk, setCOk] = useState("");

  /* -------------------------- Wallet save -------------------------- */
  const [wSaving, setWSaving] = useState(false);
  const [wErr, setWErr] = useState("");
  const [wOk, setWOk] = useState("");

  /* -------------------------- Email getter -------------------------- */
  const getEmail = () => {
    try {
      const v =
        (typeof window !== "undefined" &&
          (localStorage.getItem("imali_email") || localStorage.getItem("email"))) ||
        "";
      return String(v || "").trim().toLowerCase();
    } catch {
      return "";
    }
  };

  /* -------------------------- axios instance + header injection -------------------------- */
  const AX = useMemo(() => {
    const ax = axios.create({
      withCredentials: true,
      timeout: 20_000,
      headers: { "Content-Type": "application/json" },
    });

    ax.interceptors.request.use((config) => {
      const email = (me?.email || getEmail() || "").trim().toLowerCase();
      if (email) config.headers["X-Imali-Email"] = email;
      return config;
    });

    return ax;
    // IMPORTANT: don't depend on `me` here (would recreate AX too often)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireEmailOrFail = () => {
    const email = (me?.email || getEmail() || "").trim().toLowerCase();
    if (!email) {
      setMeErr("Email missing. Please log in or sign up again so we can load your account.");
      return "";
    }
    return email;
  };

  const normalizeMe = (data) => (data?.user ? data.user : data);

  const loadMe = async () => {
    setMeLoading(true);
    setMeErr("");

    const email = requireEmailOrFail();
    if (!email) {
      setMeLoading(false);
      return;
    }

    try {
      const { data } = await AX.get(apiUrl("/me"));
      const meObj = normalizeMe(data);
      setMe(meObj || null);

      const t = safeTier(meObj);
      const rules = TIER_RULES[t] || TIER_RULES.starter;
      const serverMode = meObj?.execution_mode || "auto";

      if (rules.lockMode === "auto") setExecMode("auto");
      else setExecMode(serverMode === "manual" ? "manual" : "auto");
    } catch (e) {
      setMeErr(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load account."
      );
    } finally {
      setMeLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------- Prefill stock setup -------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const email = requireEmailOrFail();
      if (!email) return;

      try {
        const { data } = await AX.get(apiUrl("/activation/stock-setup"), {
          params: { email }, // optional on backend
        });
        if (!mounted || !data) return;

        if (data.mode) setMode(data.mode);
        if (Array.isArray(data.symbols)) setSymbols(data.symbols.join(","));
        if (Number.isFinite(Number(data.autoCount))) setAutoCount(Number(data.autoCount));
        if (Number.isFinite(Number(data.minPrice))) setMinPrice(Number(data.minPrice));
        if (Number.isFinite(Number(data.minDollarVol))) setMinDollarVol(Number(data.minDollarVol));
        if (Array.isArray(data.blacklist)) setBlacklist(data.blacklist.join(","));
      } catch {
        // optional endpoint
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [AX]);

  /* -------------------------- Tier/entitlements -------------------------- */
  const tierKey = useMemo(() => safeTier(me), [me]);
  const rules = useMemo(() => TIER_RULES[tierKey] || TIER_RULES.starter, [tierKey]);
  const tierLabel = rules.label;

  const activation = me?.activation || {};
  const okxVerified = !!(activation.okx_verified || me?.okx_verified || me?.okxConnected);
  const brokerVerified = !!(activation.broker_verified || me?.broker_verified);
  const brokerConnected = !!(activation.broker_connected || me?.broker_connected || brokerVerified);
  const walletSaved = !!(activation.wallet_saved || me?.wallet_saved || me?.walletAddress);

  const walletStepOk = walletConnected && walletSaved;
  const execOk =
    rules.lockMode === "auto" ? execMode === "auto" : execMode === "manual" || execMode === "auto";

  const stocksOk = !rules.require.stocks || brokerConnected;
  const okxOk = !rules.require.okx || okxVerified;
  const dexOk = !rules.require.wallet || walletStepOk;

  const activationComplete = execOk && stocksOk && okxOk && dexOk;

  /* -------------------------- tab gating -------------------------- */
  const canOpenDex = rules.allowDex;
  const canOpenOkx = rules.allowOkx;
  const canOpenStocks = rules.allowStocks;

  const [gateMsg, setGateMsg] = useState("");
  const gatedSetTab = (id) => {
    setGateMsg("");
    if (id === "dex" && !canOpenDex) {
      setGateMsg("DEX trading is locked on your tier. Upgrade to unlock Wallet/DEX features.");
      setTab("overview");
      return;
    }
    if (id === "cex" && !canOpenOkx) {
      setGateMsg("Established Crypto (OKX) is not available on your tier.");
      setTab("overview");
      return;
    }
    if (id === "stocks" && !canOpenStocks) {
      setGateMsg("Stocks are not available on your tier.");
      setTab("overview");
      return;
    }
    setTab(id);
  };

  /* -------------------------- Actions -------------------------- */
  const saveExecutionMode = async () => {
    setExecSaving(true);
    setExecMsg("");

    const email = requireEmailOrFail();
    if (!email) {
      setExecSaving(false);
      return;
    }

    try {
      const desired = rules.lockMode === "auto" ? "auto" : execMode;
      await AX.post(apiUrl("/me/execution-mode"), { execution_mode: desired, email });
      setExecMsg("Saved ✓");
      setTimeout(() => setExecMsg(""), 1500);
      await loadMe();
    } catch (e) {
      setExecMsg(
        e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Save failed"
      );
    } finally {
      setExecSaving(false);
    }
  };

  const stopAllTrading = async () => {
    if (!window.confirm("Stop all trading now?")) return;

    const email = requireEmailOrFail();
    if (!email) return;

    try {
      await AX.post(apiUrl("/me/trading/stop"), { email });
      alert("Trading stopped.");
    } catch (e) {
      alert(e?.response?.data?.detail || e?.response?.data?.error || "Stop failed");
    }
  };

  const connectStock = async (e) => {
    e.preventDefault();
    setSSaving(true);
    setSErr("");
    setSOk("");

    const email = requireEmailOrFail();
    if (!email) {
      setSSaving(false);
      return;
    }

    try {
      if (stockBroker === "paper") {
        await AX.post(apiUrl("/broker/connect"), { broker: "paper", email });
        setSOk("✅ Paper mode saved for Stocks.");
      } else {
        if (!sApiKey.trim() || !sApiSecret.trim()) throw new Error("API Key & Secret required.");

        // If you're only supporting Alpaca for now, force it:
        await AX.post(apiUrl("/broker/connect"), {
          broker: "alpaca",
          api_key: sApiKey.trim(),
          api_secret: sApiSecret.trim(),
          passphrase: sPassphrase.trim() || null,
          email,
        });

        const { data } = await AX.post(apiUrl("/broker/test"), { broker: "alpaca", email });
        setSOk(data?.ok ? "✅ Alpaca connected and verified." : "⚠️ Saved. Verification pending.");
        setSApiSecret("");
      }
      await loadMe();
    } catch (e2) {
      setSErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to connect broker."
      );
    } finally {
      setSSaving(false);
    }
  };

  const saveUniverse = async () => {
    setUSaving(true);
    setUMsg("");

    const email = requireEmailOrFail();
    if (!email) {
      setUSaving(false);
      return;
    }

    try {
      await AX.post(apiUrl("/activation/stock-setup"), {
        email,
        mode,
        symbols:
          mode === "fixed"
            ? symbols
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
            : [],
        autoCount: Number(autoCount),
        minPrice: Number(minPrice),
        minDollarVol: Number(minDollarVol),
        blacklist: blacklist
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      });

      setUMsg("Saved ✓");
      setTimeout(() => setUMsg(""), 1500);
    } catch (e2) {
      setUMsg(
        e2?.response?.data?.detail || e2?.response?.data?.error || e2?.message || "Save failed"
      );
    } finally {
      setUSaving(false);
    }
  };

  const connectOKX = async (e) => {
    e.preventDefault();
    setCSaving(true);
    setCErr("");
    setCOk("");

    const email = requireEmailOrFail();
    if (!email) {
      setCSaving(false);
      return;
    }

    try {
      if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
        throw new Error("API Key, Secret, and Passphrase are required.");
      }

      await AX.post(apiUrl("/exchange/connect"), {
        exchange: "okx",
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        passphrase: passphrase.trim(),
        subaccount: subaccount.trim() || null,
        email,
      });

      const { data } = await AX.post(apiUrl("/exchange/test"), { exchange: "okx", email });
      setCOk(data?.ok ? "✅ OKX connected and verified." : "⚠️ OKX saved. Verification pending.");
      setApiSecret("");

      await loadMe();
    } catch (e2) {
      setCErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to connect OKX."
      );
    } finally {
      setCSaving(false);
    }
  };

  const saveWallet = async () => {
    setWSaving(true);
    setWErr("");
    setWOk("");

    const email = requireEmailOrFail();
    if (!email) {
      setWSaving(false);
      return;
    }

    try {
      if (!walletReady) throw new Error("Wallet system not loaded. Check WalletProvider.");
      if (!address) throw new Error("Please connect your wallet first.");

      await AX.post(apiUrl("/me/wallet"), {
        email,
        address,
        chainId: Number(chainId) || null,
      });

      setWOk("Saved ✓");
      setTimeout(() => setWOk(""), 1500);
      await loadMe();
    } catch (e2) {
      setWErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to save wallet."
      );
    } finally {
      setWSaving(false);
    }
  };

  /* -------------------------- UI bits -------------------------- */
  const TabBtn = ({ id, label, disabled }) => (
    <button
      type="button"
      onClick={() => (disabled ? gatedSetTab("overview") : gatedSetTab(id))}
      disabled={!!disabled}
      className={cx(
        "px-3 py-2 rounded-xl border transition",
        tab === id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
      )}
      title={disabled ? "Locked by tier" : ""}
    >
      {label}
      {disabled ? <LockBadge /> : null}
    </button>
  );

  const WalletBanner = () =>
    walletReady ? null : (
      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-200 text-sm">
        Wallet system isn’t loaded. You can still activate Stocks/OKX, but Wallet/DEX won’t work until it’s fixed.
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activation</h1>
          <p className="text-sm text-gray-300">
            Connect what you want to trade. Starter is <b>Auto-only</b>. Your dashboard unlocks after required steps.
          </p>
          <div className="mt-2 text-xs text-white/50">
            API Base: <span className="font-mono">{apiUrl("")}</span>
          </div>
        </div>

        {activationComplete && (
          <button
            type="button"
            onClick={stopAllTrading}
            className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-500 font-extrabold"
            title="Emergency stop"
          >
            🛑 STOP TRADING
          </button>
        )}
      </div>

      <WalletBanner />

      {/* Account status */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        {meLoading ? (
          <div className="text-sm text-gray-300">Loading your account…</div>
        ) : meErr ? (
          <div className="text-sm text-red-300">
            {meErr}
            <div className="mt-2">
              <Link className="underline text-emerald-300" to={LINKS.login}>
                Log in
              </Link>
              <span className="mx-2 text-white/40">•</span>
              <button type="button" onClick={loadMe} className="underline text-indigo-300">
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="text-white/90">
                Signed in as <span className="font-mono">{me?.email || getEmail() || "—"}</span>
              </div>
              <div className="text-white/70">
                Tier: <b>{tierLabel}</b> • Status: <b>{me?.is_active ? "Active" : "Pending"}</b>
              </div>
              <div className="mt-2 text-xs text-white/60">
                Activation:{" "}
                <span className={activationComplete ? "text-emerald-300 font-semibold" : "text-amber-200"}>
                  {activationComplete ? "Complete ✓" : "Incomplete"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={loadMe}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Execution mode */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold mb-1">How should IMALI run?</h2>
            <p className="text-sm text-white/70">
              <b>Manual</b> = alerts only (you click Buy/Sell). <b>Auto</b> = IMALI can place trades for you.
            </p>
            {rules.lockMode === "auto" ? (
              <div className="mt-2 text-xs text-amber-200/90">
                Starter tier is <b>Auto-only</b>.
              </div>
            ) : null}
          </div>
          <div className="text-sm">
            <Check ok={execOk} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            disabled={!rules.allowManual}
            onClick={() => setExecMode("manual")}
            className={cx(
              "px-3 py-2 rounded-xl border",
              execMode === "manual" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10",
              !rules.allowManual ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
            )}
          >
            ✅ Manual (alerts)
          </button>

          <button
            type="button"
            onClick={() => setExecMode("auto")}
            className={cx(
              "px-3 py-2 rounded-xl border",
              execMode === "auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10",
              "hover:bg-white/10"
            )}
          >
            ⚡ Auto
          </button>

          <button
            type="button"
            disabled={execSaving}
            onClick={saveExecutionMode}
            className="ml-auto px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-60"
          >
            {execSaving ? "Saving…" : "Save"}
          </button>
        </div>

        {execMsg ? <div className="mt-2 text-sm text-white/80">{execMsg}</div> : null}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 flex-wrap">
        <TabBtn id="overview" label="Overview" />
        <TabBtn id="stocks" label="Stocks" disabled={!canOpenStocks} />
        <TabBtn id="cex" label="Established Crypto (OKX)" disabled={!canOpenOkx} />
        <TabBtn id="dex" label="New Crypto (Wallet / DEX)" disabled={!canOpenDex} />
      </div>

      {gateMsg ? (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-200 text-sm">
          {gateMsg}{" "}
          <Link className="underline text-emerald-300" to={LINKS.pricing}>
            View plans
          </Link>
        </div>
      ) : null}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-bold mb-3">Activation checklist</h3>

          <div className="space-y-3 text-sm text-white/85">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">1) Run mode</div>
                <div className="text-white/60">Starter is Auto-only. Other tiers can use alerts or auto-trading.</div>
              </div>
              <Check ok={execOk} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">2) Stocks (optional unless required by tier)</div>
                <div className="text-white/60">Paper simulator is fine to start.</div>
              </div>
              <Check ok={stocksOk} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">3) Established Crypto (OKX)</div>
                <div className="text-white/60">Add keys + verify. Shows a green check when verified.</div>
              </div>
              <Check ok={okxOk} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">4) New Crypto (Wallet / DEX)</div>
                <div className="text-white/60">Connect wallet + save it (required only on DEX-enabled tiers).</div>
              </div>
              <Check ok={dexOk} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={activationComplete ? LINKS.dashboard : "#"}
              onClick={(e) => {
                if (!activationComplete) e.preventDefault();
              }}
              className={cx(
                "px-4 py-2 rounded-2xl font-bold",
                activationComplete
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-white/10 border border-white/10 text-white/50 cursor-not-allowed"
              )}
              title={activationComplete ? "Open dashboard" : "Complete activation steps to unlock dashboard"}
            >
              Go to Dashboard
            </Link>

            <Link
              to={LINKS.pricing}
              className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold"
            >
              View Plans
            </Link>

            {!activationComplete ? (
              <span className="self-center text-xs text-amber-200/90">
                Dashboard is locked until required steps are complete.
              </span>
            ) : (
              <span className="self-center text-xs text-emerald-300/90">
                Activation complete — you’re good to go.
              </span>
            )}
          </div>
        </div>
      )}

      {/* STOCKS */}
      {tab === "stocks" && (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold mb-1">Stocks: pick Paper or connect Alpaca</h2>
                <p className="text-sm text-white/70">Paper = simulator (recommended first). Alpaca = live broker keys.</p>
              </div>
              <Check ok={brokerConnected} />
            </div>

            <form onSubmit={connectStock} className="space-y-4 mt-4">
              <label className="block">
                <span className="text-sm">Broker</span>
                <select
                  value={stockBroker}
                  onChange={(e) => {
                    setStockBroker(e.target.value);
                    setSErr("");
                    setSOk("");
                  }}
                  className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                >
                  <option value="paper">Paper (Simulator)</option>
                  <option value="alpaca">Alpaca</option>
                </select>
              </label>

              {stockBroker !== "paper" && (
                <>
                  <label className="block">
                    <span className="text-sm">API Key</span>
                    <input
                      value={sApiKey}
                      onChange={(e) => setSApiKey(e.target.value)}
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm">API Secret</span>
                    <input
                      value={sApiSecret}
                      onChange={(e) => setSApiSecret(e.target.value)}
                      type="password"
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm">Passphrase (optional)</span>
                    <input
                      value={sPassphrase}
                      onChange={(e) => setSPassphrase(e.target.value)}
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      placeholder="Leave blank if not used"
                    />
                  </label>
                </>
              )}

              <button
                disabled={sSaving}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60"
              >
                {sSaving ? "Saving..." : stockBroker === "paper" ? "Save Paper Mode" : "Save & Verify"}
              </button>

              {sErr && <div className="text-red-300 text-sm">{sErr}</div>}
              {sOk && <div className="text-emerald-300 text-sm">{sOk}</div>}
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-2">Stocks: choose symbols (or auto-pick)</h2>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("fixed")}
                className={cx(
                  "px-3 py-2 rounded-xl border",
                  mode === "fixed" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                )}
              >
                Pick symbols
              </button>

              <button
                type="button"
                onClick={() => setMode("auto")}
                className={cx(
                  "px-3 py-2 rounded-xl border",
                  mode === "auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                )}
              >
                Auto-pick top movers
              </button>
            </div>

            {mode === "fixed" ? (
              <label className="block">
                <span className="text-sm">Symbols (comma separated)</span>
                <input
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  placeholder="SPY,QQQ,AAPL"
                  className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm">Top N</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={autoCount}
                    onChange={(e) => setAutoCount(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm">Min price ($)</span>
                  <input
                    type="number"
                    min={1}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm">Min dollar volume</span>
                  <input
                    type="number"
                    step={100000}
                    value={minDollarVol}
                    onChange={(e) => setMinDollarVol(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm">Blacklist</span>
                  <input
                    value={blacklist}
                    onChange={(e) => setBlacklist(e.target.value)}
                    placeholder="OTC,LOWFLOAT"
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={uSaving}
                onClick={saveUniverse}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold disabled:opacity-60"
              >
                {uSaving ? "Saving…" : "Save"}
              </button>
              {uMsg && <span className="text-sm">{uMsg}</span>}
            </div>
          </div>
        </>
      )}

      {/* CEX */}
      {tab === "cex" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold mb-1">Established Crypto: connect OKX</h2>
              <p className="text-sm text-white/70">
                Add keys and verify. You’ll see a green check when OKX is correctly connected.
              </p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <Link className="underline text-emerald-300" to={LINKS.okxApiGuide}>
                  How to create OKX API keys
                </Link>
                <Link className="underline text-emerald-300" to={LINKS.okxFunding}>
                  Funding guide
                </Link>
              </div>
            </div>
            <Check ok={okxVerified} />
          </div>

          <form onSubmit={connectOKX} className="space-y-4 mt-4">
            <label className="block">
              <span className="text-sm">API Key</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                autoComplete="off"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">API Secret</span>
              <input
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                type="password"
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">Passphrase</span>
              <input
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">Subaccount (optional)</span>
              <input
                value={subaccount}
                onChange={(e) => setSubaccount(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                placeholder="Leave blank if not used"
              />
            </label>

            <button
              disabled={cSaving}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60"
            >
              {cSaving ? "Saving..." : "Save & Verify"}
            </button>

            {cErr && <div className="text-red-300 text-sm">{cErr}</div>}
            {cOk && <div className="text-emerald-300 text-sm">{cOk}</div>}
          </form>
        </div>
      )}

      {/* DEX */}
      {tab === "dex" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold mb-1">New Crypto: connect your wallet (DEX)</h2>
              <p className="text-sm text-white/70">
                DEX tokens can be very new and risky. This step connects your wallet for DEX features.
              </p>

              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <a className="underline text-emerald-300" href={LINKS.metamaskInstall} target="_blank" rel="noreferrer">
                  Get MetaMask
                </a>
                <Link className="underline text-emerald-300" to={LINKS.walletFunding}>
                  Funding guide
                </Link>
              </div>
            </div>
            <Check ok={walletStepOk} />
          </div>

          {!walletReady ? (
            <div className="mt-4 text-sm text-amber-200">
              Wallet system isn’t available. Fix WalletContext/WalletProvider first so{" "}
              <code className="bg-black/30 px-1 rounded">useWallet()</code> works.
            </div>
          ) : walletConnected ? (
            <>
              <div className="mt-4 text-sm">
                Connected: <span className="font-mono">{shortAddr(address)}</span>
                {chainId ? <span className="text-white/60"> (chain {chainId})</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={disconnect} className="px-4 py-2 rounded-2xl bg-gray-700 hover:bg-gray-600">
                  Disconnect
                </button>

                <button
                  type="button"
                  disabled={wSaving}
                  onClick={saveWallet}
                  className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {wSaving ? "Saving…" : walletSaved ? "Saved ✓" : "Save Wallet"}
                </button>
              </div>

              {wErr && <div className="text-red-300 text-sm mt-2">{wErr}</div>}
              {wOk && <div className="text-emerald-300 text-sm mt-2">{wOk}</div>}
            </>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={connect} className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500">
                  Connect Wallet
                </button>
              </div>

              <div className="text-xs text-gray-400 mt-2">No API keys required for this step.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}