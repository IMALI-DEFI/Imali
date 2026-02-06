// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

/* ======================================================
   CONFIG
====================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const TOKEN_KEY = "imali_token";

/* ======================================================
   API CLIENT
====================================================== */

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/* ======================================================
   UI COMPONENTS
====================================================== */

function Step({
  title,
  done,
  required,
  loading,
  actionLabel,
  onAction,
  children,
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              done
                ? "bg-emerald-500/20 border border-emerald-500/30"
                : loading
                ? "bg-blue-500/20 border border-blue-500/30"
                : "bg-gray-800 border border-gray-700"
            }`}
          >
            {done ? (
              <span className="text-emerald-400 text-sm">✓</span>
            ) : loading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            ) : (
              <span className="text-gray-400 text-sm">●</span>
            )}
          </div>

          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {title}
              {required && !done && (
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
            </div>

            {!done && actionLabel && (
              <button
                onClick={onAction}
                disabled={loading}
                className="text-sm mt-1 text-blue-400 hover:text-blue-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLabel} →
              </button>
            )}
          </div>
        </div>

        <div className="text-sm">
          {done ? (
            <span className="text-emerald-400 font-medium">Complete</span>
          ) : loading ? (
            <span className="text-blue-400">Updating...</span>
          ) : (
            <span className="text-amber-400">Pending</span>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400 pl-11">{children}</div>
    </div>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="relative">
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="absolute -top-2 right-0 text-xs text-gray-400">{pct}%</div>
    </div>
  );
}

/* ======================================================
   MODALS
====================================================== */

function OkxModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper",
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connect OKX</h3>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Key"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              API Secret
            </label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({ ...form, api_secret: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Secret"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Passphrase
            </label>
            <input
              type="password"
              value={form.passphrase}
              onChange={(e) => setForm({ ...form, passphrase: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter Passphrase"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Trading Mode
            </label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="paper">Paper Trading</option>
              <option value="live">Live Trading</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect OKX"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AlpacaModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    mode: "paper",
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Connect Alpaca
        </h3>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Key"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              API Secret
            </label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({ ...form, api_secret: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Secret"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Trading Mode
            </label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="paper">Paper Trading</option>
              <option value="live">Live Trading</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect Alpaca"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WalletModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!wallet.trim()) return;
    setLoading(true);
    try {
      await onSubmit(wallet.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Connect Wallet
        </h3>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Wallet Address
            </label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
              placeholder="0x..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Ethereum wallet address (0x...)
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !wallet.trim()}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================================================
   MAIN
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const [showOkxModal, setShowOkxModal] = useState(false);
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [updatingStep, setUpdatingStep] = useState(null);

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  /* ---------------- LOAD DATA ---------------- */
  const loadActivationData = async () => {
    const [meRes, statusRes] = await Promise.all([
      api.get("/me"),
      api.get("/me/activation-status"),
    ]);

    setMe(meRes.data?.user || null);
    const statusObj = statusRes.data?.status || null;
    setStatus(statusObj);
    setError("");
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (mounted) setLoading(true);
        await loadActivationData();
      } catch (e) {
        console.error("Failed to load activation data:", e);
        setError(
          e?.response?.data?.message ||
            "Unable to load activation status. Please try again."
        );
        if (e?.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /* ---------------- API ACTIONS ---------------- */
  const runStep = async (stepKey, fn) => {
    setUpdatingStep(stepKey);
    try {
      await fn();
      await loadActivationData();
    } catch (e) {
      console.error(`[activation] step failed: ${stepKey}`, e);
      throw e;
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleOkxConnect = (credentials) =>
    runStep("okx", () => api.post("/integrations/okx", credentials));

  const handleAlpacaConnect = (credentials) =>
    runStep("alpaca", () => api.post("/integrations/alpaca", credentials));

  const handleWalletConnect = (walletAddress) =>
    runStep("wallet", () =>
      api.post("/integrations/wallet", { wallet: walletAddress })
    );

  const handleEnableTrading = () =>
    runStep("trading", () => api.post("/trading/enable", { enabled: true }));

  const handleStartBot = () => runStep("bot", () => api.post("/bot/start"));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadActivationData();
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- DERIVED STATE ---------------- */

  const tier = useMemo(() => {
    const raw = String(me?.tier || status?.tier || "starter").toLowerCase();
    if (raw.includes("elite")) return "elite";
    if (raw.includes("pro")) return "pro";
    return "starter";
  }, [me, status]);

  const billingConfirmed = !!status?.billing_complete || !!status?.has_card_on_file;
  const okxConnected = !!status?.okx_connected;
  const alpacaConnected = !!status?.alpaca_connected;
  const walletConnected = !!status?.wallet_connected;
  const tradingEnabled = !!status?.trading_enabled;
  const botExecuted = !!status?.bot_executed;

  // Use backend's activation_complete flag directly
  const activationComplete = !!status?.activation_complete;

  // ✅ CORRECTED: Tier-specific requirements matching backend
  const getTierRequirements = () => {
    switch (tier) {
      case "starter":
        return {
          okxRequired: true,     // Starter needs OKX
          alpacaRequired: true,  // Starter needs Alpaca  
          walletRequired: false, // Starter doesn't need wallet
          description: "Requires Alpaca & OKX (both)",
        };
      case "elite":
        return {
          okxRequired: false,    // Elite doesn't need OKX
          alpacaRequired: false, // Elite doesn't need Alpaca
          walletRequired: true,  // Elite needs wallet
          description: "Requires wallet connection",
        };
      case "pro":
        return {
          okxRequired: false,    // Pro doesn't need specific integrations
          alpacaRequired: false, // Pro doesn't need specific integrations
          walletRequired: false, // Pro doesn't need specific integrations
          description: "Requires any integration",
        };
      default:
        return {
          okxRequired: false,
          alpacaRequired: false,
          walletRequired: false,
          description: "Check requirements",
        };
    }
  };

  const tierReqs = getTierRequirements();

  // For Pro tier, they need at least one integration
  const proTierMet = tier === "pro" && (okxConnected || alpacaConnected || walletConnected);

  // Check if tier-specific requirements are met
  const tierRequirementsMet = tier === "starter" 
    ? (okxConnected && alpacaConnected)
    : tier === "elite"
    ? walletConnected
    : tier === "pro"
    ? proTierMet
    : false;

  // Required steps for progress calculation
  const requiredSteps = [
    { key: "billing", done: billingConfirmed, required: true },
    { key: "okx", done: okxConnected, required: tierReqs.okxRequired },
    { key: "alpaca", done: alpacaConnected, required: tierReqs.alpacaRequired },
    { key: "wallet", done: walletConnected, required: tierReqs.walletRequired },
    { key: "trading", done: tradingEnabled, required: true },
  ];

  const requiredStepsOnly = requiredSteps.filter((s) => s.required);
  const completedRequired = requiredStepsOnly.filter((s) => s.done).length;
  const progressPct = requiredStepsOnly.length
    ? Math.round((completedRequired / requiredStepsOnly.length) * 100)
    : 100;

  // For Pro tier, we need special progress calculation
  const proProgressPct = tier === "pro"
    ? billingConfirmed && tradingEnabled && proTierMet ? 100 : 
      billingConfirmed && tradingEnabled ? 67 : 
      billingConfirmed ? 33 : 0
    : progressPct;

  // Final display progress
  const displayProgressPct = tier === "pro" ? proProgressPct : progressPct;

  // persist minimal progress
  useEffect(() => {
    if (!me?.id) return;
    localStorage.setItem(
      `imali_activation_${me.id}`,
      JSON.stringify({
        progressPct: displayProgressPct,
        activationComplete,
        lastUpdated: Date.now(),
      })
    );
  }, [me, displayProgressPct, activationComplete]);

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (loading) return;
    // Redirect when backend says activation complete AND trading enabled
    if (activationComplete && tradingEnabled) {
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, activationComplete, tradingEnabled, navigate]);

  /* ---------------- RENDER: LOADING ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-400">Loading your setup...</p>
        </div>
      </div>
    );
  }

  /* ---------------- RENDER: ERROR / NO ME ---------------- */
  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-red-400 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Session Expired</h2>
          <p className="text-gray-400">
            {error || "Your session has expired. Please log in again."}
          </p>
          <div className="pt-4 space-y-3">
            <Link
              to="/login"
              className="block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Log In Again
            </Link>
            <Link
              to="/"
              className="block w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium"
            >
              Return Home
            </Link>
          </div>
          <div className="text-xs text-gray-600 pt-2">
            API: {API_BASE}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- RENDER MAIN ---------------- */
  return (
    <>
      {/* Modals */}
      <OkxModal
        isOpen={showOkxModal}
        onClose={() => setShowOkxModal(false)}
        onSubmit={handleOkxConnect}
      />
      <AlpacaModal
        isOpen={showAlpacaModal}
        onClose={() => setShowAlpacaModal(false)}
        onSubmit={handleAlpacaConnect}
      />
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSubmit={handleWalletConnect}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Account Activation
                </h1>
                <p className="text-gray-400 mt-2">
                  Complete your setup to unlock full trading capabilities.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh Status"}
                </button>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium"
                >
                  Dashboard
                </Link>
              </div>
            </div>

            {/* User Info Card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tier === "elite"
                          ? "bg-purple-500/20 text-purple-300"
                          : tier === "pro"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {tier.toUpperCase()} Plan
                    </div>
                    <div className="text-gray-300">{me.email}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    User ID: {me.id?.substring(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    {tierReqs.description}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold">{displayProgressPct}%</div>
                  <div className="text-sm text-gray-400">Required Complete</div>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar pct={displayProgressPct} />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>
                    {tier === "pro" 
                      ? `${tierRequirementsMet ? "Requirements met" : "Complete billing + trading + any integration"}`
                      : `${completedRequired}/${requiredStepsOnly.length} required steps done`
                    }
                  </span>
                  <span>API: {API_BASE}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="grid gap-4">
            {/* Billing */}
            <Step
              title="Payment Method"
              done={billingConfirmed}
              required={true}
              loading={updatingStep === "billing"}
              actionLabel={billingConfirmed ? "" : "Add Payment"}
              onAction={() => navigate("/billing")}
            >
              {billingConfirmed ? (
                <div className="space-y-2">
                  <p>✅ Payment method confirmed</p>
                  {status?.stripe_customer_id && (
                    <p className="text-xs text-gray-500">
                      Customer ID: {String(status.stripe_customer_id).substring(0, 10)}...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Required to save a card for billing / performance fees.</p>
                  <div className="text-xs text-gray-500">
                    No subscription needed unless your plan requires it.
                  </div>
                </div>
              )}
            </Step>

            {/* OKX - For Starter (required) and optional for others */}
            <Step
              title="OKX Exchange"
              done={okxConnected}
              required={tierReqs.okxRequired}
              loading={updatingStep === "okx"}
              actionLabel={okxConnected ? "" : "Connect OKX"}
              onAction={() => setShowOkxModal(true)}
            >
              {okxConnected ? (
                <div className="space-y-2">
                  <p>✅ OKX connected</p>
                  {status?.okx_mode && (
                    <p className="text-xs text-gray-500">Mode: {status.okx_mode}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    {tierReqs.okxRequired
                      ? "Required for Starter crypto trading."
                      : "Optional on your current plan."}
                  </p>
                  <div className="text-xs text-gray-500">
                    Add OKX API keys to enable automated crypto trading.
                  </div>
                </div>
              )}
            </Step>

            {/* Alpaca - For Starter (required) and optional for others */}
            <Step
              title="Alpaca Markets"
              done={alpacaConnected}
              required={tierReqs.alpacaRequired}
              loading={updatingStep === "alpaca"}
              actionLabel={alpacaConnected ? "" : "Connect Alpaca"}
              onAction={() => setShowAlpacaModal(true)}
            >
              {alpacaConnected ? (
                <div className="space-y-2">
                  <p>✅ Alpaca connected</p>
                  {status?.alpaca_mode && (
                    <p className="text-xs text-gray-500">Mode: {status.alpaca_mode}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    {tierReqs.alpacaRequired
                      ? "Required for Starter stock trading."
                      : "Optional on your current plan."}
                  </p>
                  <div className="text-xs text-gray-500">
                    Add Alpaca keys to enable automated stock trading.
                  </div>
                </div>
              )}
            </Step>

            {/* Wallet - For Elite (required) and optional for others */}
            <Step
              title="Wallet Connection"
              done={walletConnected}
              required={tierReqs.walletRequired}
              loading={updatingStep === "wallet"}
              actionLabel={walletConnected ? "" : "Connect Wallet"}
              onAction={() => setShowWalletModal(true)}
            >
              {walletConnected ? (
                <div className="space-y-2">
                  <p>✅ Wallet connected</p>
                  {Array.isArray(me?.wallets) && (
                    <p className="text-xs text-gray-500">
                      {me.wallets.length} wallet(s) connected
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    {tierReqs.walletRequired
                      ? "Required for Elite DeFi trading."
                      : "Optional on your current plan."}
                  </p>
                  <div className="text-xs text-gray-500">
                    Connect a wallet to enable on-chain DeFi actions.
                  </div>
                </div>
              )}
            </Step>

            {/* Trading Enable (required for completion) */}
            <Step
              title="Enable Trading"
              done={tradingEnabled}
              required={true}
              loading={updatingStep === "trading"}
              actionLabel={tradingEnabled ? "" : "Enable Trading"}
              onAction={handleEnableTrading}
            >
              {tradingEnabled ? (
                <div className="space-y-2">
                  <p>✅ Trading enabled</p>
                  <p className="text-xs text-gray-500">
                    You can start the bot whenever you're ready.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Turn on trading after you've connected what you need.</p>
                  <p className="text-xs text-gray-500">
                    You can keep using demo mode until then.
                  </p>
                </div>
              )}
            </Step>

            {/* Bot start (optional/next step) */}
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 font-medium"
              >
                Go to Dashboard
              </button>

              <button
                onClick={handleStartBot}
                disabled={!tradingEnabled || updatingStep === "bot"}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title={!tradingEnabled ? "Enable trading first" : "Start the bot"}
              >
                {updatingStep === "bot" ? "Starting..." : botExecuted ? "Restart Bot" : "Start Trading Bot"}
              </button>
            </div>

            {/* Status banner */}
            {activationComplete && tradingEnabled ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <div className="text-emerald-400 text-4xl mb-3">🎉</div>
                <h3 className="text-xl font-semibold text-emerald-300 mb-2">
                  Activation Complete!
                </h3>
                <p className="text-emerald-200">
                  Your account is ready. Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  Setup In Progress
                </h3>
                <p className="text-blue-200">
                  {!tierRequirementsMet 
                    ? `Complete ${tierReqs.description} to unlock full live trading.` 
                    : "Complete all required steps above to unlock full live trading."}
                </p>
                <p className="text-sm text-blue-300/80 mt-2">
                  You can still explore in demo mode.
                </p>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="mt-4 px-6 py-2 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 font-medium border border-blue-500/30"
                >
                  Explore Demo Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="text-center text-sm text-gray-500">
              <p className="mb-2">Need help? Contact support@imali-defi.com</p>
              <p className="text-xs">
                Trading involves risk. Never trade money you can't afford to lose.
                Past performance is not indicative of future results.
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <span>API: {API_BASE}</span>
                <span>•</span>
                <span>User: {me.email}</span>
                <span>•</span>
                <span>
                  Last updated:{" "}
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
