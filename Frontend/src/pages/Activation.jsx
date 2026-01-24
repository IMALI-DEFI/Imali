// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

/* -------------------------- API base resolver -------------------------- */
const RAW_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const API_BASE = String(RAW_BASE || "").replace(/\/+$/, "");

function apiUrl(path) {
  const p = String(path || "").trim();
  if (!p) return `${API_BASE}/api`;
  
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  // Always prefix with /api if not already there
  if (withSlash.startsWith("/api/") || withSlash === "/api") {
    return `${API_BASE}${withSlash}`;
  }
  return `${API_BASE}/api${withSlash}`;
}

/* -------------------------- Help Links -------------------------- */
const LINKS = {
  pricing: "/pricing",
  dashboard: "/MemberDashboard",
  login: "/login",
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
  const t = String(me?.tier_active || me?.tier_selected || "").toLowerCase();
  if (t.includes("elite")) return "elite";
  if (t.includes("pro")) return "pro";
  if (t.includes("starter") || t.includes("free")) return "starter";
  return "starter";
}

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
  const navigate = useNavigate();
  
  /* -------------------------- Tabs -------------------------- */
  const [tab, setTab] = useState("overview");

  /* -------------------------- Me -------------------------- */
  const [me, setMe] = useState(null);
  const [meErr, setMeErr] = useState("");
  const [meLoading, setMeLoading] = useState(true);

  /* -------------------------- Execution mode -------------------------- */
  const [execMode, setExecMode] = useState("auto");
  const [execSaving, setExecSaving] = useState(false);
  const [execMsg, setExecMsg] = useState("");

  /* -------------------------- Email getter -------------------------- */
  const getEmail = () => {
    try {
      const v = localStorage.getItem("IMALI_EMAIL") || "";
      return String(v || "").trim().toLowerCase();
    } catch {
      return "";
    }
  };

  /* -------------------------- axios instance -------------------------- */
  const AX = useMemo(() => {
    const ax = axios.create({
      withCredentials: true,
      timeout: 15_000,
      headers: { "Content-Type": "application/json" },
    });

    return ax;
  }, []);

  const requireEmailOrFail = () => {
    const email = getEmail();
    if (!email) {
      setMeErr("Email missing. Please log in or sign up again.");
      navigate("/login");
      return "";
    }
    return email;
  };

  const loadMe = async () => {
    setMeLoading(true);
    setMeErr("");

    const email = requireEmailOrFail();
    if (!email) {
      setMeLoading(false);
      return;
    }

    try {
      const { data } = await AX.get(apiUrl(`/me?email=${encodeURIComponent(email)}`));
      
      if (!data.ok) {
        throw new Error(data.detail || "Failed to load user");
      }
      
      setMe(data.user || null);

      // Set execution mode
      const userExecMode = data.user?.execution_mode || "auto";
      const tierKey = safeTier(data.user);
      const rules = TIER_RULES[tierKey] || TIER_RULES.starter;
      
      if (rules.lockMode === "auto") {
        setExecMode("auto");
      } else {
        setExecMode(userExecMode === "manual" ? "manual" : "auto");
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setMeErr(
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load account. Please try logging in again."
      );
    } finally {
      setMeLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------- Tier/entitlements -------------------------- */
  const tierKey = useMemo(() => safeTier(me), [me]);
  const rules = useMemo(() => TIER_RULES[tierKey] || TIER_RULES.starter, [tierKey]);
  const tierLabel = rules.label;

  // Simplified status - using only what we can get from /api/me
  const execOk = rules.lockMode === "auto" ? execMode === "auto" : execMode === "manual" || execMode === "auto";
  const stocksOk = !rules.require.stocks || false; // We don't have broker connection status
  const okxOk = !rules.require.okx || false; // We don't have OKX connection status
  const dexOk = !rules.require.wallet || false; // We don't have wallet connection status

  const activationComplete = execOk && stocksOk && okxOk && dexOk;

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
      
      // Note: Our current API doesn't have an endpoint to update execution_mode
      // We need to update this once the backend supports it
      setExecMsg("Execution mode update coming soon. For now, use dashboard settings.");
      
      // Temporary: Just show success message
      setTimeout(() => setExecMsg(""), 3000);
    } catch (error) {
      setExecMsg(
        error?.response?.data?.detail || 
        error?.response?.data?.error || 
        error?.message || 
        "Save failed"
      );
    } finally {
      setExecSaving(false);
    }
  };

  const goToDashboard = () => {
    navigate("/MemberDashboard");
  };

  /* -------------------------- UI components -------------------------- */
  const TabBtn = ({ id, label, disabled }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      disabled={disabled}
      className={cx(
        "px-3 py-2 rounded-xl border transition",
        tab === id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
      )}
      title={disabled ? "Coming soon" : ""}
    >
      {label}
      {disabled ? <LockBadge /> : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Activation Dashboard</h1>
            <p className="text-sm text-gray-300 mt-2">
              Welcome to IMALI! Complete your setup to start trading.
              {tierKey === "starter" && " Starter tier is Auto-only."}
            </p>
            <div className="mt-1 text-xs text-white/50">
              API: <span className="font-mono">{apiUrl("")}</span>
            </div>
          </div>
        </div>

        {/* Account status */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          {meLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-emerald-400 rounded-full mx-auto"></div>
              <p className="text-sm text-gray-300 mt-2">Loading your account...</p>
            </div>
          ) : meErr ? (
            <div className="text-sm text-red-300">
              {meErr}
              <div className="mt-3 flex gap-3">
                <Link className="underline text-emerald-300" to={LINKS.login}>
                  Log in
                </Link>
                <button type="button" onClick={loadMe} className="underline text-indigo-300">
                  Retry
                </button>
              </div>
            </div>
          ) : me ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-xl font-semibold">
                    {me.email}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${tierKey === 'starter' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {tierLabel} Tier
                  </div>
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  Strategy: <span className="font-medium">{me.strategy || 'Growth'}</span> • 
                  Status: <span className={me.is_active ? "text-emerald-300" : "text-amber-300"}>
                    {me.is_active ? " Active" : " Pending"}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={goToDashboard}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-300">No account found</p>
              <Link to="/signup" className="text-emerald-300 underline mt-2 inline-block">
                Sign up here
              </Link>
            </div>
          )}
        </div>

        {/* Execution mode */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Trading Mode</h2>
              <p className="text-sm text-gray-300">
                Choose how IMALI should execute trades for you.
              </p>
              {rules.lockMode === "auto" && (
                <div className="mt-2 text-sm text-amber-200">
                  ⚠️ Starter tier is Auto-only (no manual alerts).
                </div>
              )}
            </div>
            <Check ok={execOk} />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              disabled={!rules.allowManual}
              onClick={() => setExecMode("manual")}
              className={cx(
                "px-4 py-3 rounded-xl border transition-all",
                execMode === "manual" 
                  ? "bg-white/10 border-white/30 ring-2 ring-white/20" 
                  : "bg-white/5 border-white/10",
                !rules.allowManual 
                  ? "opacity-40 cursor-not-allowed" 
                  : "hover:bg-white/10"
              )}
            >
              <div className="font-semibold">Manual (Alerts)</div>
              <div className="text-xs text-gray-300 mt-1">
                Get alerts, you execute trades
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExecMode("auto")}
              className={cx(
                "px-4 py-3 rounded-xl border transition-all",
                execMode === "auto" 
                  ? "bg-white/10 border-white/30 ring-2 ring-white/20" 
                  : "bg-white/5 border-white/10",
                "hover:bg-white/10"
              )}
            >
              <div className="font-semibold">Auto Trading</div>
              <div className="text-xs text-gray-300 mt-1">
                IMALI executes trades for you
              </div>
            </button>

            <button
              type="button"
              onClick={saveExecutionMode}
              disabled={execSaving}
              className="ml-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-60"
            >
              {execSaving ? "Saving..." : "Save Mode"}
            </button>
          </div>
          
          {execMsg && (
            <div className="mt-4 text-sm p-3 rounded-lg bg-white/5 border border-white/10">
              {execMsg}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap mb-4">
            <TabBtn id="overview" label="Overview" />
            <TabBtn id="stocks" label="Stocks" disabled={!rules.allowStocks} />
            <TabBtn id="cex" label="Established Crypto" disabled={!rules.allowOkx} />
            <TabBtn id="dex" label="New Crypto (DEX)" disabled={!rules.allowDex} />
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Setup Checklist</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="font-semibold">Trading Mode</div>
                    <div className="text-sm text-gray-300">Set your preferred execution method</div>
                  </div>
                  <Check ok={execOk} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="font-semibold">Stocks Connection</div>
                    <div className="text-sm text-gray-300">
                      Connect your broker or use paper trading
                    </div>
                  </div>
                  <Check ok={stocksOk} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="font-semibold">Crypto (CEX)</div>
                    <div className="text-sm text-gray-300">Connect OKX for established crypto</div>
                  </div>
                  <Check ok={okxOk} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="font-semibold">Crypto (DEX)</div>
                    <div className="text-sm text-gray-300">Connect wallet for DEX trading</div>
                  </div>
                  <Check ok={dexOk} />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">Ready to start?</h4>
                    <p className="text-sm text-gray-300">
                      {activationComplete 
                        ? "All setup complete! You can start trading." 
                        : "Complete the required steps above to unlock full trading."}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={goToDashboard}
                    disabled={!activationComplete}
                    className={cx(
                      "px-6 py-3 rounded-xl font-semibold",
                      activationComplete
                        ? "bg-indigo-600 hover:bg-indigo-500"
                        : "bg-white/10 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    Launch Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stocks Tab */}
          {tab === "stocks" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Stocks Setup</h3>
              <p className="text-gray-300 mb-4">
                Stock trading features are being developed. You'll be able to connect 
                your broker or use paper trading here.
              </p>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <p className="text-sm">
                  Coming soon! For now, you can use the dashboard to explore available features.
                </p>
              </div>
            </div>
          )}

          {/* CEX Tab */}
          {tab === "cex" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Established Crypto (OKX)</h3>
              <p className="text-gray-300 mb-4">
                Connect your OKX exchange account for automated crypto trading.
              </p>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <p className="text-sm">
                  Exchange integration coming soon! Check back later to connect your OKX account.
                </p>
              </div>
            </div>
          )}

          {/* DEX Tab */}
          {tab === "dex" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">New Crypto (DEX)</h3>
              <p className="text-gray-300 mb-4">
                Connect your wallet for decentralized exchange trading.
              </p>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                <p className="text-sm">
                  Wallet connection coming soon! This feature will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="text-center text-sm text-gray-400 mt-8">
          <p>
            Need help?{" "}
            <Link to="/support" className="text-emerald-300 hover:underline">
              Contact Support
            </Link>
          </p>
          <p className="mt-1 text-xs">
            Remember: Trading involves risk. Only trade what you can afford to lose.
          </p>
        </div>
      </div>
    </div>
  );
}
