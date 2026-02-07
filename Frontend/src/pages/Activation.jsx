import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI";

/* ======================================================
   UI HELPERS
====================================================== */

function Step({ title, done, required, loading, actionLabel, onAction, children }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ${
              done
                ? "bg-emerald-500/20 text-emerald-400"
                : loading
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {done ? "✓" : loading ? "…" : "•"}
          </div>

          <div>
            <div className="font-semibold text-white">
              {title}
              {required && !done && (
                <span className="ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
            </div>

            {!done && actionLabel && (
              <button
                onClick={onAction}
                disabled={loading}
                className="text-sm text-blue-400 underline mt-1"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm">
          {done ? (
            <span className="text-emerald-400">Complete</span>
          ) : loading ? (
            <span className="text-blue-400">Working…</span>
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
    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ======================================================
   Integration Modals
====================================================== */

function OkxModal({ isOpen, onClose, onConnect }) {
  const [form, setForm] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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
      setError(err.message || "Failed to connect OKX");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
        <h3 className="text-xl font-semibold mb-4">Connect OKX</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="text"
              value={form.api_key}
              onChange={(e) => setForm({...form, api_key: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter API Key"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Secret</label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({...form, api_secret: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter API Secret"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Passphrase</label>
            <input
              type="password"
              value={form.passphrase}
              onChange={(e) => setForm({...form, passphrase: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter Passphrase"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({...form, mode: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="paper">Paper Trading</option>
              <option value="live">Live Trading</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
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

  if (!isOpen) return null;

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
      setError(err.message || "Failed to connect Alpaca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
        <h3 className="text-xl font-semibold mb-4">Connect Alpaca</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="text"
              value={form.api_key}
              onChange={(e) => setForm({...form, api_key: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter API Key"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Secret</label>
            <input
              type="password"
              value={form.api_secret}
              onChange={(e) => setForm({...form, api_secret: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter API Secret"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({...form, mode: e.target.value})}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="paper">Paper Trading</option>
              <option value="live">Live Trading</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletModal({ isOpen, onClose, onConnect }) {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md p-6">
        <h3 className="text-xl font-semibold mb-4">Connect Wallet</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Wallet Address</label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="0x..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Ethereum wallet address (0x...)
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
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
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  
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
  const run = async (key, fn) => {
    setUpdating(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      console.error(`Action ${key} error:`, err);
      setError(err.message || `Failed to ${key}`);
    } finally {
      setUpdating(null);
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

  // Calculate progress percentage
  const requiredSteps = [
    billing, // Always required
    trading, // Always required
    tier === "starter" ? okx : true, // OKX required for starter
    tier === "starter" ? alpaca : true, // Alpaca required for starter
    tier === "elite" ? wallet : true, // Wallet required for elite
  ];
  
  const completedSteps = requiredSteps.filter(Boolean).length;
  const totalRequiredSteps = requiredSteps.length;
  const progress = Math.round((completedSteps / totalRequiredSteps) * 100);

  /* ---------------- AUTO REDIRECT ---------------- */
  useEffect(() => {
    if (!loading && activationComplete && trading) {
      console.log("Activation complete, redirecting to dashboard");
      const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, activationComplete, trading, navigate]);

  /* ---------------- ACTION HANDLERS ---------------- */
  const handleConnectOkx = async (formData) => {
    await BotAPI.connectOkx(formData);
  };

  const handleConnectAlpaca = async (formData) => {
    await BotAPI.connectAlpaca(formData);
  };

  const handleConnectWallet = async (formData) => {
    await BotAPI.connectWallet(formData);
  };

  const handleEnableTrading = async () => {
    // Check if all requirements are met
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
    
    await run("trading", () => BotAPI.tradingEnable(true));
  };

  /* ---------------- RENDER ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Session Expired</h2>
          <p className="text-gray-400 mb-6">Please log in again to continue</p>
          <Link 
            to="/login" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Activation</h1>
          <p className="text-gray-400 mb-1">
            Complete setup to enable trading for your <span className="text-blue-400 capitalize">{tier}</span> account
          </p>
          {email && (
            <p className="text-sm text-gray-500">Account: {email}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Activation Progress</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <ProgressBar pct={progress} />
          <p className="text-xs text-gray-500 mt-2">
            {completedSteps} of {totalRequiredSteps} steps completed
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Steps */}
        <div className="grid gap-4">
          {/* Billing Step */}
          <Step
            title="Payment Method"
            done={billing}
            required={true}
            loading={updating === "billing"}
            actionLabel={!billing ? "Add payment method" : "Update payment"}
            onAction={() => navigate("/billing")}
          >
            Required for performance fee payments. Your card will only be charged when you make profitable trades.
          </Step>

          {/* OKX Step - Required for Starter tier */}
          {(tier === "starter") && (
            <Step
              title="OKX Connection"
              done={okx}
              required={true}
              loading={updating === "okx"}
              actionLabel={!okx ? "Connect OKX" : "Reconnect"}
              onAction={() => setShowOkxModal(true)}
            >
              Connect your OKX exchange account for automated trading.
              {okx && status?.okx_mode && (
                <span className="text-emerald-400 ml-2">({status.okx_mode} mode)</span>
              )}
            </Step>
          )}

          {/* Alpaca Step - Required for Starter tier */}
          {(tier === "starter") && (
            <Step
              title="Alpaca Connection"
              done={alpaca}
              required={true}
              loading={updating === "alpaca"}
              actionLabel={!alpaca ? "Connect Alpaca" : "Reconnect"}
              onAction={() => setShowAlpacaModal(true)}
            >
              Connect your Alpaca brokerage account for automated trading.
              {alpaca && status?.alpaca_mode && (
                <span className="text-emerald-400 ml-2">({status.alpaca_mode} mode)</span>
              )}
            </Step>
          )}

          {/* Wallet Step - Required for Elite tier */}
          {(tier === "elite") && (
            <Step
              title="Wallet Connection"
              done={wallet}
              required={true}
              loading={updating === "wallet"}
              actionLabel={!wallet ? "Connect Wallet" : "Reconnect"}
              onAction={() => setShowWalletModal(true)}
            >
              Connect your Ethereum wallet for DeFi trading.
              {wallet && status?.wallet && (
                <span className="text-emerald-400 ml-2">({status.wallet.substring(0, 8)}...)</span>
              )}
            </Step>
          )}

          {/* Trading Enable Step */}
          <Step
            title="Enable Trading"
            done={trading}
            required={true}
            loading={updating === "trading"}
            actionLabel={!trading ? "Enable Trading" : "Disable Trading"}
            onAction={handleEnableTrading}
          >
            Enable automated trading for your account.
            {trading && (
              <span className="text-emerald-400 ml-2">Active</span>
            )}
          </Step>
        </div>

        {/* Activation Complete Message */}
        {activationComplete && trading && (
          <div className="mt-8 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <h2 className="text-xl text-emerald-400 font-semibold mb-2">
              🎉 Activation Complete!
            </h2>
            <p className="text-emerald-300 mb-4">
              Your account is fully activated and ready for trading.
            </p>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
            <details>
              <summary className="cursor-pointer text-sm text-gray-400 mb-2">Debug Info</summary>
              <pre className="text-xs mt-2 text-gray-300 whitespace-pre-wrap overflow-auto max-h-60">
                {JSON.stringify({
                  tier,
                  email,
                  billing,
                  okx,
                  alpaca,
                  wallet,
                  trading,
                  activationComplete,
                  progress,
                  status
                }, null, 2)}
              </pre>
              <button
                onClick={load}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                Refresh Data
              </button>
            </details>
          </div>
        )}
      </div>

      {/* Modals */}
      <OkxModal
        isOpen={showOkxModal}
        onClose={() => setShowOkxModal(false)}
        onConnect={handleConnectOkx}
      />
      
      <AlpacaModal
        isOpen={showAlpacaModal}
        onClose={() => setShowAlpacaModal(false)}
        onConnect={handleConnectAlpaca}
      />
      
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleConnectWallet}
      />
    </>
  );
}
