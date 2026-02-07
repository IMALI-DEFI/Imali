import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

/* ======================================================
   UI COMPONENTS
====================================================== */

function ProgressCircle({ percentage, size = 120 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{percentage}%</span>
        <span className="text-xs text-gray-400 mt-1">Complete</span>
      </div>
    </div>
  );
}

function StatusStep({ 
  number, 
  title, 
  description, 
  status = "pending", 
  actionLabel, 
  onAction, 
  disabled = false 
}) {
  const statusConfig = {
    complete: { icon: "✓", color: "emerald", bgColor: "emerald-500/20", textColor: "emerald-400" },
    active: { icon: "⟳", color: "blue", bgColor: "blue-500/20", textColor: "blue-400" },
    pending: { icon: "○", color: "gray", bgColor: "gray-800/50", textColor: "gray-400" },
    error: { icon: "!", color: "red", bgColor: "red-500/20", textColor: "red-400" }
  };

  const config = statusConfig[status];

  return (
    <div className="relative pl-14 py-4 group">
      {/* Connection line */}
      <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gray-800 group-last:hidden"></div>
      
      {/* Step number circle */}
      <div className={`absolute left-0 h-14 w-14 rounded-full border-2 border-${config.color}-500/30 bg-${config.bgColor} flex items-center justify-center`}>
        <span className={`text-${config.textColor} font-semibold text-lg`}>
          {status === "complete" ? config.icon : number}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-lg">{title}</h3>
          <span className={`text-sm px-3 py-1 rounded-full bg-${config.bgColor} text-${config.textColor}`}>
            {status === "complete" ? "Complete" : 
             status === "active" ? "In Progress" : 
             status === "error" ? "Error" : "Pending"}
          </span>
        </div>
        
        <p className="text-gray-400 text-sm">{description}</p>
        
        {actionLabel && status !== "complete" && (
          <button
            onClick={onAction}
            disabled={disabled}
            className={`mt-2 px-4 py-2 rounded-lg font-medium transition-all ${
              status === "error" 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  const tierConfig = {
    starter: { color: "blue", label: "Starter" },
    pro: { color: "purple", label: "Pro" },
    elite: { color: "amber", label: "Elite" }
  };

  const config = tierConfig[tier] || tierConfig.starter;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${config.color}-500/10 border border-${config.color}-500/30`}>
      <div className={`h-2 w-2 rounded-full bg-${config.color}-500`}></div>
      <span className={`text-sm font-medium text-${config.color}-400`}>{config.label} Tier</span>
    </div>
  );
}

/* ======================================================
   MODAL COMPONENTS
====================================================== */

function IntegrationModal({ isOpen, onClose, title, children, onSubmit, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="text-gray-400">✕</span>
            </button>
          </div>
          
          {children}
          
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OkxModal({ isOpen, onClose, onConnect }) {
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.api_key || !form.api_secret || !form.passphrase) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await onConnect(form);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to connect OKX. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IntegrationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect OKX Exchange"
      onSubmit={submit}
      loading={loading}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="text"
            value={form.api_key}
            onChange={(e) => setForm({...form, api_key: e.target.value})}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your API Key"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Secret
          </label>
          <input
            type="password"
            value={form.api_secret}
            onChange={(e) => setForm({...form, api_secret: e.target.value})}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your API Secret"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Passphrase
          </label>
          <input
            type="password"
            value={form.passphrase}
            onChange={(e) => setForm({...form, passphrase: e.target.value})}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your passphrase"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({...form, mode: "paper"})}
              className={`p-4 rounded-xl border text-center transition-all ${
                form.mode === "paper" 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="font-medium mb-1">Paper Trading</div>
              <div className="text-xs text-gray-400">Test with fake funds</div>
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, mode: "live"})}
              className={`p-4 rounded-xl border text-center transition-all ${
                form.mode === "live" 
                  ? "border-emerald-500 bg-emerald-500/10" 
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="font-medium mb-1">Live Trading</div>
              <div className="text-xs text-gray-400">Trade with real funds</div>
            </button>
          </div>
        </div>
        
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            🔒 Your API keys are encrypted and stored securely. We only request read/write trading permissions.
          </p>
        </div>
      </div>
    </IntegrationModal>
  );
}

function AlpacaModal({ isOpen, onClose, onConnect }) {
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    mode: "paper"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.api_key || !form.api_secret) {
      setError("API Key and Secret are required");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await onConnect(form);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to connect Alpaca. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IntegrationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Alpaca Brokerage"
      onSubmit={submit}
      loading={loading}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="text"
            value={form.api_key}
            onChange={(e) => setForm({...form, api_key: e.target.value})}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your API Key"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Secret
          </label>
          <input
            type="password"
            value={form.api_secret}
            onChange={(e) => setForm({...form, api_secret: e.target.value})}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            placeholder="Enter your API Secret"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({...form, mode: "paper"})}
              className={`p-4 rounded-xl border text-center transition-all ${
                form.mode === "paper" 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="font-medium mb-1">Paper Trading</div>
              <div className="text-xs text-gray-400">Test with fake funds</div>
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, mode: "live"})}
              className={`p-4 rounded-xl border text-center transition-all ${
                form.mode === "live" 
                  ? "border-emerald-500 bg-emerald-500/10" 
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="font-medium mb-1">Live Trading</div>
              <div className="text-xs text-gray-400">Trade with real funds</div>
            </button>
          </div>
        </div>
        
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            📚 Need help finding your API keys? <a href="https://docs.alpaca.markets/" target="_blank" rel="noopener noreferrer" className="underline">View Alpaca Documentation</a>
          </p>
        </div>
      </div>
    </IntegrationModal>
  );
}

function WalletModal({ isOpen, onClose, onConnect }) {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!wallet || wallet.length < 10) {
      setError("Please enter a valid wallet address");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await onConnect({ wallet });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to connect wallet. Please check the address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IntegrationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Ethereum Wallet"
      onSubmit={submit}
      loading={loading}
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Wallet Address
          </label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            placeholder="0x..."
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 mt-2">
            Enter your Ethereum wallet address. This will be used for DeFi trading.
          </p>
        </div>
        
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <p className="text-xs text-blue-400 font-medium mb-1">Why connect a wallet?</p>
              <p className="text-xs text-gray-400">
                Your wallet address is used to identify you for on-chain trading and fee calculations. 
                No private keys are required - only your public address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </IntegrationModal>
  );
}

/* ======================================================
   MAIN COMPONENT
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Modal states
  const [showOkxModal, setShowOkxModal] = useState(false);
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  /* ---------------- LOAD DATA ---------------- */
  const load = async () => {
    try {
      console.log("Loading activation data...");
      const [user, activation] = await Promise.all([
        BotAPI.me(),
        BotAPI.activationStatus(),
      ]);

      console.log("User data:", user);
      console.log("Activation status:", activation);
      
      setMe(user?.user || user || null);
      setStatus(activation?.status || activation || null);
      setError("");
    } catch (err) {
      console.error("Load error:", err);
      if (err.status === 401) {
        BotAPI.logout();
        navigate("/login");
      } else {
        setError(err.message || "Failed to load activation state.");
      }
    }
  };

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, []);

  /* ---------------- ACTION RUNNER ---------------- */
  const runAction = async (key, fn) => {
    setActionLoading(key);
    setError("");
    setSuccess("");
    
    try {
      await fn();
      await load();
      setSuccess(`${key} completed successfully!`);
    } catch (err) {
      console.error(`Action ${key} error:`, err);
      setError(err.message || `Failed to ${key}`);
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------------- DERIVED VALUES ---------------- */
  const tier = String(me?.tier || "starter").toLowerCase();
  const email = me?.email || "";

  const billing = !!status?.billing_complete || !!status?.has_card_on_file;
  const okx = !!status?.okx_connected;
  const alpaca = !!status?.alpaca_connected;
  const wallet = !!status?.wallet_connected;
  const trading = !!status?.trading_enabled;
  const activationComplete = !!status?.activation_complete;
  const isOwner = !!status?.is_owner;

  // Calculate progress percentage
  const steps = [
    { name: "billing", completed: billing },
    { name: "trading", completed: trading },
    { name: "okx", completed: tier === "starter" ? okx : true },
    { name: "alpaca", completed: tier === "starter" ? alpaca : true },
    { name: "wallet", completed: tier === "elite" ? wallet : true }
  ];
  
  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (!loading && activationComplete && trading) {
      console.log("Activation complete, redirecting to dashboard");
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, activationComplete, trading, navigate]);

  /* ---------------- ACTION HANDLERS ---------------- */
  const handleConnectOkx = async (formData) => {
    await runAction("connect_okx", () => BotAPI.connectOkx(formData));
  };

  const handleConnectAlpaca = async (formData) => {
    await runAction("connect_alpaca", () => BotAPI.connectAlpaca(formData));
  };

  const handleConnectWallet = async (formData) => {
    await runAction("connect_wallet", () => BotAPI.connectWallet(formData));
  };

  const handleEnableTrading = async () => {
    // Check requirements
    if (tier === "starter" && (!okx || !alpaca)) {
      setError("Starter tier requires both OKX and Alpaca connections");
      return;
    }
    
    if (tier === "elite" && !wallet) {
      setError("Elite tier requires wallet connection");
      return;
    }
    
    if (!billing) {
      setError("Payment method is required before enabling trading");
      return;
    }
    
    await runAction("enable_trading", () => BotAPI.tradingEnable(true));
  };

  const handleDisableTrading = async () => {
    await runAction("disable_trading", () => BotAPI.tradingEnable(false));
  };

  /* ---------------- RENDER ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-gray-800"></div>
            <div className="absolute inset-0 h-24 w-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <div>
            <p className="text-lg">Loading your activation status...</p>
            <p className="text-sm text-gray-500 mt-2">Preparing your trading environment</p>
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <h2 className="text-2xl font-bold">Session Expired</h2>
          <p className="text-gray-400">Please log in again to continue your activation</p>
          <div className="space-y-3">
            <Link 
              to="/login" 
              className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium transition-colors"
            >
              Go to Login
            </Link>
            <Link 
              to="/" 
              className="block w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-3xl md:text-4xl font-bold">Account Activation</h1>
                  <TierBadge tier={tier} />
                </div>
                <p className="text-gray-400 max-w-2xl">
                  Complete the setup steps below to activate automated trading for your account. 
                  {tier === "starter" && " Starter tier requires both OKX and Alpaca connections."}
                  {tier === "elite" && " Elite tier requires wallet connection."}
                </p>
                {email && (
                  <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Account: {email}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                <ProgressCircle percentage={progress} />
                <p className="text-sm text-gray-400 mt-4 text-center">
                  {completedSteps} of {totalSteps} steps completed
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="text-red-400 text-lg">⚠️</div>
                <div>
                  <p className="text-red-400 font-medium">Action Required</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="text-emerald-400 text-lg">✓</div>
                <div>
                  <p className="text-emerald-400 font-medium">Success</p>
                  <p className="text-emerald-300 text-sm mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Activation Complete Banner */}
          {activationComplete && trading && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl text-center animate-fadeIn">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mb-4">
                <span className="text-emerald-400 text-2xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Activation Complete!</h2>
              <p className="text-emerald-300 mb-6">Your account is fully activated and ready for trading.</p>
              <button
                onClick={() => navigate("/dashboard", { replace: true })}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl font-semibold transition-all transform hover:scale-105"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Steps Container */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="space-y-6">
              {/* Step 1: Payment Method */}
              <StatusStep
                number={1}
                title="Payment Method"
                description="Add a payment method for performance fees. Your card will only be charged when you make profitable trades."
                status={billing ? "complete" : "active"}
                actionLabel={billing ? "Update Payment" : "Add Payment Method"}
                onAction={() => navigate("/billing")}
                disabled={actionLoading}
              />

              {/* Step 2: Exchange Connections */}
              <StatusStep
                number={2}
                title="Exchange Connections"
                description={tier === "starter" 
                  ? "Connect both OKX and Alpaca exchanges for automated trading." 
                  : tier === "elite"
                  ? "Connect your Ethereum wallet for DeFi trading."
                  : "Connect at least one exchange or wallet for automated trading."}
                status={
                  (tier === "starter" && okx && alpaca) || 
                  (tier === "elite" && wallet) || 
                  (tier === "pro" && (okx || alpaca || wallet))
                    ? "complete" 
                    : "pending"
                }
                actionLabel="Connect Accounts"
                onAction={() => {
                  if (tier === "starter") setShowOkxModal(true);
                  else if (tier === "elite") setShowWalletModal(true);
                  else setShowOkxModal(true);
                }}
                disabled={actionLoading}
              />

              {/* Step 3: Enable Trading */}
              <StatusStep
                number={3}
                title="Enable Trading"
                description="Activate automated trading for your account. This will start your trading bot based on your strategy."
                status={trading ? "complete" : "pending"}
                actionLabel={trading ? "Disable Trading" : "Enable Trading"}
                onAction={trading ? handleDisableTrading : handleEnableTrading}
                disabled={actionLoading === "enable_trading" || actionLoading === "disable_trading"}
              />
            </div>

            {/* Requirements Note */}
            <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 mt-0.5">ℹ️</div>
                <div>
                  <p className="text-sm text-blue-400 font-medium mb-1">Tier Requirements</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {tier === "starter" && (
                      <>
                        <li>• Starter tier requires both OKX and Alpaca connections</li>
                        <li>• 30% performance fee on profits above 3% threshold</li>
                      </>
                    )}
                    {tier === "pro" && (
                      <>
                        <li>• Pro tier requires at least one exchange or wallet connection</li>
                        <li>• 5% flat performance fee on all profits</li>
                      </>
                    )}
                    {tier === "elite" && (
                      <>
                        <li>• Elite tier requires wallet connection</li>
                        <li>• 5% flat performance fee on all profits</li>
                        <li>• Includes advanced features and priority support</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/dashboard"
              className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-colors text-center"
            >
              <div className="text-gray-400 text-sm mb-1">Dashboard</div>
              <div className="font-medium">View Trading Dashboard</div>
            </Link>
            
            <Link
              to="/billing"
              className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-colors text-center"
            >
              <div className="text-blue-400 text-sm mb-1">Billing</div>
              <div className="font-medium">Manage Payment Methods</div>
            </Link>
            
            <Link
              to="/settings"
              className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-colors text-center"
            >
              <div className="text-gray-400 text-sm mb-1">Settings</div>
              <div className="font-medium">Account Settings</div>
            </Link>
          </div>

          {/* Owner Bypass (Development Only) */}
          {isOwner && process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-purple-400 font-medium mb-1">Owner Access</div>
                  <div className="text-sm text-gray-400">You have owner privileges</div>
                </div>
                <button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
              <details>
                <summary className="cursor-pointer text-sm text-gray-400 mb-2">Debug Info</summary>
                <div className="mt-2 text-xs text-gray-300 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500">Tier:</div>
                      <div className="font-mono">{tier}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Progress:</div>
                      <div className="font-mono">{progress}% ({completedSteps}/{totalSteps})</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className={`p-2 rounded ${billing ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
                      <div className="text-xs text-gray-500">Billing</div>
                      <div className