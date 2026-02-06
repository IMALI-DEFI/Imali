import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

/* ======================================================
   CONFIG
====================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === "localhost"
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

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  children 
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            done ? "bg-emerald-500/20 border border-emerald-500/30" : 
            loading ? "bg-blue-500/20 border border-blue-500/30" : 
            "bg-gray-800 border border-gray-700"
          }`}>
            {done ? (
              <span className="text-emerald-400 text-sm">✓</span>
            ) : loading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
            ) : (
              <span className="text-gray-400 text-sm">●</span>
            )}
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {title}
              {required && !done && (
                <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">Required</span>
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
      <div className="absolute -top-2 right-0 text-xs text-gray-400">
        {pct}%
      </div>
    </div>
  );
}

/* ======================================================
   MODAL COMPONENTS FOR API INPUTS
====================================================== */

function OkxModal({ isOpen, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error("OKX connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connect OKX</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({...form, api_key: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Key"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Secret</label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({...form, api_secret: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Secret"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Passphrase</label>
            <input
              type="password"
              value={form.passphrase}
              onChange={(e) => setForm({...form, passphrase: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter Passphrase"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Trading Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({...form, mode: e.target.value})}
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
    mode: "paper"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error("Alpaca connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connect Alpaca</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={form.api_key}
              onChange={(e) => setForm({...form, api_key: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Key"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Secret</label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({...form, api_secret: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Enter API Secret"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Trading Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({...form, mode: e.target.value})}
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(wallet);
      onClose();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connect Wallet</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
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
   MAIN COMPONENT
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  
  // Modal states
  const [showOkxModal, setShowOkxModal] = useState(false);
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [updatingStep, setUpdatingStep] = useState(null);

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  /* ---------------- LOAD ACTIVATION DATA ---------------- */
  const loadActivationData = async () => {
    try {
      const [meRes, statusRes] = await Promise.all([
        api.get("/me"),
        api.get("/me/activation-status"),
      ]);

      setMe(meRes.data?.user || null);
      setStatus(statusRes.data || null);
      setError("");
    } catch (e) {
      console.error("Failed to load activation data:", e);
      setError(
        e?.response?.data?.message ||
        "Unable to load activation status. Please try again."
      );
      if (e.response?.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        navigate("/login", { replace: true });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (mounted) setLoading(true);
      await loadActivationData();
      if (mounted) setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  /* ---------------- API ACTIONS ---------------- */
  
  const handleOkxConnect = async (credentials) => {
    setUpdatingStep("okx");
    try {
      await api.post("/integrations/okx", credentials);
      await loadActivationData();
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleAlpacaConnect = async (credentials) => {
    setUpdatingStep("alpaca");
    try {
      await api.post("/integrations/alpaca", credentials);
      await loadActivationData();
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleWalletConnect = async (walletAddress) => {
    setUpdatingStep("wallet");
    try {
      await api.post("/integrations/wallet", { wallet: walletAddress });
      await loadActivationData();
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleEnableTrading = async () => {
    setUpdatingStep("trading");
    try {
      await api.post("/trading/enable", { enabled: true });
      await loadActivationData();
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleStartBot = async () => {
    setUpdatingStep("bot");
    try {
      await api.post("/bot/start");
      await loadActivationData();
    } finally {
      setUpdatingStep(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivationData();
    setRefreshing(false);
  };

  /* ---------------- DERIVED STATE ---------------- */
  
  const tier = useMemo(() => {
    const t = String(me?.tier || "starter").toLowerCase();
    if (t.includes("elite")) return "elite";
    if (t.includes("pro")) return "pro";
    return "starter";
  }, [me]);

  const billingConfirmed = !!status?.billing_complete || 
                          !!status?.stripe_confirmed || 
                          !!status?.has_card_on_file;
  
  const okxReady = tier === "starter" ? true : !!status?.okx_connected;
  const alpacaReady = tier !== "elite" ? true : !!status?.alpaca_connected;
  const walletReady = tier !== "elite" ? true : !!status?.wallet_connected;
  const tradingEnabled = !!status?.trading_enabled;
  const botExecuted = !!status?.bot_executed;

  const activationComplete = billingConfirmed && okxReady && alpacaReady && walletReady;

  // Calculate progress
  const steps = [billingConfirmed, okxReady, alpacaReady, walletReady];
  const completedSteps = steps.filter(Boolean).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);

  // Save progress to localStorage
  useEffect(() => {
    if (me?.id) {
      localStorage.setItem(
        `imali_activation_${me.id}`,
        JSON.stringify({
          progressPct,
          activationComplete,
          lastUpdated: Date.now()
        })
      );
    }
  }, [me, progressPct, activationComplete]);

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (!loading && activationComplete && tradingEnabled) {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, activationComplete, tradingEnabled, navigate]);

  /* ---------------- RENDER LOADING ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-400">Loading your setup...</p>
        </div>
      </div>
    );
  }

  /* ---------------- RENDER ERROR ---------------- */
  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-red-400 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Session Expired</h2>
          <p className="text-gray-400">{error || "Your session has expired. Please log in again."}</p>
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
        </div>
      </div>
    );
  }

  /* ---------------- RENDER MAIN UI ---------------- */
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
                  Complete these steps to unlock full trading capabilities
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
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      tier === "elite" ? "bg-purple-500/20 text-purple-300" :
                      tier === "pro" ? "bg-blue-500/20 text-blue-300" :
                      "bg-emerald-500/20 text-emerald-300"
                    }`}>
                      {tier.toUpperCase()} Plan
                    </div>
                    <div className="text-gray-300">{me.email}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    User ID: {me.id?.substring(0, 8)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{progressPct}%</div>
                  <div className="text-sm text-gray-400">Complete</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <ProgressBar pct={progressPct} />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Step 1 of 4</span>
                  <span>{completedSteps}/4 completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid gap-4">
            {/* Step 1: Billing */}
            <Step
              title="Payment Method"
              done={billingConfirmed}
              required={tier === "starter"}
              loading={updatingStep === "billing"}
              actionLabel={billingConfirmed ? "" : "Add Payment"}
              onAction={() => navigate("/billing")}
            >
              {billingConfirmed ? (
                <div className="space-y-2">
                  <p>✅ Payment method confirmed</p>
                  {status?.stripe_customer_id && (
                    <p className="text-xs text-gray-500">
                      Customer ID: {status.stripe_customer_id.substring(0, 10)}...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Required for Starter plan to charge performance fees</p>
                  <div className="text-xs text-gray-500">
                    No subscription needed — card saved for future fee charges only
                  </div>
                </div>
              )}
            </Step>

            {/* Step 2: OKX */}
            <Step
              title="OKX Exchange"
              done={okxReady}
              required={tier === "pro" || tier === "elite"}
              loading={updatingStep === "okx"}
              actionLabel={okxReady ? "" : "Connect OKX"}
              onAction={() => setShowOkxModal(true)}
            >
              {okxReady ? (
                <div className="space-y-2">
                  <p>✅ OKX connected</p>
                  {status?.okx_mode && (
                    <p className="text-xs text-gray-500">
                      Mode: {status.okx_mode}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>{tier === "starter" 
                    ? "Optional for Starter plan" 
                    : "Required for Pro/Elite crypto trading"}</p>
                  {tier !== "starter" && (
                    <div className="text-xs text-gray-500">
                      Connect your OKX API keys for automated crypto trading
                    </div>
                  )}
                </div>
              )}
            </Step>

            {/* Step 3: Alpaca */}
            <Step
              title="Alpaca Markets"
              done={alpacaReady}
              required={tier === "elite"}
              loading={updatingStep === "alpaca"}
              actionLabel={alpacaReady ? "" : "Connect Alpaca"}
              onAction={() => setShowAlpacaModal(true)}
            >
              {alpacaReady ? (
                <div className="space-y-2">
                  <p>✅ Alpaca connected</p>
                  {status?.alpaca_mode && (
                    <p className="text-xs text-gray-500">
                      Mode: {status.alpaca_mode}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>{tier !== "elite" 
                    ? "Optional for Starter/Pro plans" 
                    : "Required for Elite stock trading"}</p>
                  {tier === "elite" && (
                    <div className="text-xs text-gray-500">
                      Connect your Alpaca API keys for automated stock trading
                    </div>
                  )}
                </div>
              )}
            </Step>

            {/* Step 4: Wallet */}
            <Step
              title="Wallet Connection"
              done={walletReady}
              required={tier === "elite"}
              loading={updatingStep === "wallet"}
              actionLabel={walletReady ? "" : "Connect Wallet"}
              onAction={() => setShowWalletModal(true)}
            >
              {walletReady ? (
                <div className="space-y-2">
                  <p>✅ Wallet connected</p>
                  {me?.wallets?.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {me.wallets.length} wallet(s) connected
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p>{tier !== "elite" 
                    ? "Optional for Starter/Pro plans" 
                    : "Required for Elite DeFi trading"}</p>
                  {tier === "elite" && (
                    <div className="text-xs text-gray-500">
                      Connect your wallet for on-chain DeFi trading
                    </div>
                  )}
                </div>
              )}
            </Step>

            {/* Additional Controls */}
            {activationComplete && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {!tradingEnabled && (
                  <button
                    onClick={handleEnableTrading}
                    disabled={updatingStep === "trading"}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 font-medium disabled:opacity-50"
                  >
                    {updatingStep === "trading" ? "Enabling..." : "Enable Live Trading"}
                  </button>
                )}
                
                {tradingEnabled && !botExecuted && (
                  <button
                    onClick={handleStartBot}
                    disabled={updatingStep === "bot"}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-medium disabled:opacity-50"
                  >
                    {updatingStep === "bot" ? "Starting..." : "Start Trading Bot"}
                  </button>
                )}
                
                {tradingEnabled && (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 font-medium"
                  >
                    Go to Trading Dashboard
                  </button>
                )}
              </div>
            )}

            {/* Status Messages */}
            {activationComplete && tradingEnabled ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <div className="text-emerald-400 text-4xl mb-3">🎉</div>
                <h3 className="text-xl font-semibold text-emerald-300 mb-2">
                  Activation Complete!
                </h3>
                <p className="text-emerald-200">
                  Your account is fully activated. Redirecting to dashboard...
                </p>
                <div className="mt-4">
                  <div className="inline-block h-1 w-12 bg-emerald-400 animate-pulse"></div>
                </div>
              </div>
            ) : activationComplete && !tradingEnabled ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
                <h3 className="text-lg font-semibold text-amber-300 mb-2">
                  Ready for Live Trading
                </h3>
                <p className="text-amber-200">
                  All requirements are met! Enable live trading to start.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  Demo Mode Active
                </h3>
                <p className="text-blue-200">
                  Complete all required steps above to unlock live trading features.
                  You can still explore the dashboard in demo mode.
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
                <span>Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
