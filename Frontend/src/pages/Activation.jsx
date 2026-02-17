// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// Simple status badges
const StatusBadge = ({ done }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
    done 
      ? "bg-green-500/20 text-green-300 border border-green-500/30" 
      : "bg-gray-800 text-gray-400 border border-gray-700"
  }`}>
    {done ? "✓ DONE" : "⋯ PENDING"}
  </span>
);

// Section card
const SectionCard = ({ number, title, description, status, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 font-bold text-lg">
          {number}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <StatusBadge done={status} />
    </div>
    {children}
  </div>
);

// Simple input
const SimpleInput = ({ label, type = "text", value, onChange, placeholder, disabled }) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-400">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
    />
  </div>
);

// Simple button
const ActionButton = ({ onClick, disabled, loading, children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    gray: "bg-gray-700 hover:bg-gray-600"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-medium transition-all ${colors[color]} disabled:opacity-50 disabled:cursor-not-allowed text-white`}
    >
      {loading ? "Working..." : children}
    </button>
  );
};

// Help link
const HelpLink = () => (
  <a 
    href="https://imali-defi.com/funding-guide" 
    target="_blank" 
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
  >
    <span>📘</span>
    Need help? Read our funding guide
  </a>
);

export default function Activation() {
  const navigate = useNavigate();
  const { user, activation, refreshUser } = useAuth();
  const navigationInProgress = useRef(false);
  
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [okx, setOkx] = useState({ apiKey: "", apiSecret: "", passphrase: "" });
  const [alpaca, setAlpaca] = useState({ apiKey: "", apiSecret: "" });
  const [wallet, setWallet] = useState("");

  // Get user tier
  const tier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user]);

  // What connections do we need?
  const needs = {
    okx: ["starter", "pro", "bundle"].includes(tier),
    alpaca: ["starter", "bundle"].includes(tier),
    wallet: ["elite", "bundle"].includes(tier)
  };

  // Current status from backend
  const status = {
    billing: !!activation?.billing_complete,
    okx: !!activation?.okx_connected,
    alpaca: !!activation?.alpaca_connected,
    wallet: !!activation?.wallet_connected,
    trading: !!activation?.trading_enabled
  };

  // Are connections done?
  const connectionsDone = 
    (!needs.okx || status.okx) &&
    (!needs.alpaca || status.alpaca) &&
    (!needs.wallet || status.wallet);

  // Can we enable trading?
  const canEnableTrading = status.billing && connectionsDone;

  // Auto-redirect when fully activated - with navigation guard
  useEffect(() => {
    // Don't redirect if we're already navigating
    if (navigationInProgress.current) return;
    
    // Only redirect if fully activated
    if (status.billing && connectionsDone && status.trading) {
      // Set navigation flag to prevent multiple redirects
      navigationInProgress.current = true;
      
      // Small delay to ensure state is stable
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
        // Reset flag after navigation (will be unmounted anyway, but for safety)
        setTimeout(() => {
          navigationInProgress.current = false;
        }, 1000);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [status.billing, connectionsDone, status.trading, navigate]);

  // Connection functions
  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    if (!okx.apiKey || !okx.apiSecret || !okx.passphrase) {
      setError("Please fill in all OKX fields");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectOKX({
        api_key: okx.apiKey.trim(),
        api_secret: okx.apiSecret.trim(),
        passphrase: okx.passphrase.trim(),
        mode: "live" // Always live mode for real trading
      });

      setSuccess("✅ OKX connected successfully!");
      setOkx({ apiKey: "", apiSecret: "", passphrase: "" });
      await refreshUser();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX. Check your keys.");
    } finally {
      setBusy("");
    }
  };

  const connectAlpaca = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("alpaca");

    if (!alpaca.apiKey || !alpaca.apiSecret) {
      setError("Please fill in both Alpaca fields");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectAlpaca({
        api_key: alpaca.apiKey.trim(),
        api_secret: alpaca.apiSecret.trim(),
        mode: "live" // Always live mode
      });

      setSuccess("✅ Alpaca connected successfully!");
      setAlpaca({ apiKey: "", apiSecret: "" });
      await refreshUser();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca. Check your keys.");
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("wallet");

    const addr = wallet.trim();

    if (!addr) {
      setError("Please enter your wallet address");
      setBusy("");
      return;
    }
    
    if (!addr.startsWith("0x") || addr.length !== 42) {
      setError("Wallet address must start with 0x and be 42 characters long");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr, address: addr });
      setSuccess("✅ Wallet connected successfully!");
      setWallet("");
      await refreshUser();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect wallet");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !status.trading) {
      setError("Please finish billing and connections first");
      setBusy("");
      return;
    }

    try {
      await BotAPI.toggleTrading(!status.trading);
      setSuccess(status.trading ? "Trading turned off" : "✅ Trading turned on!");
      await refreshUser();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading");
    } finally {
      setBusy("");
    }
  };

  // Manual navigation to dashboard with guard
  const handleSkipToDashboard = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    navigate("/dashboard");
    setTimeout(() => {
      navigationInProgress.current = false;
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to IMALI! 🚀</h1>
          <p className="text-gray-400 mb-4">
            Let's get your account ready to trade. Just 3 simple steps:
          </p>
          <HelpLink />
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-200">
            ✅ {success}
          </div>
        )}

        {/* Step 1: Billing */}
        <SectionCard 
          number="1" 
          title="Add Payment Method" 
          description="We need a card on file to charge performance fees (30% on profits)"
          status={status.billing}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Your card will be securely saved with Stripe. We only charge when you make money.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton onClick={() => navigate("/billing")} color="blue">
                  Add Credit Card
                </ActionButton>
                <HelpLink />
              </div>
            </div>
          ) : (
            <div className="text-green-300">✅ Payment method saved</div>
          )}
        </SectionCard>

        {/* Step 2: Connect Accounts */}
        <SectionCard 
          number="2" 
          title="Connect Your Accounts" 
          description="Link the accounts you want to trade with"
          status={connectionsDone}
        >
          <div className="space-y-6">
            
            {/* OKX */}
            {needs.okx && !status.okx && (
              <form onSubmit={connectOKX} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-blue-300">🔷 OKX Exchange</h3>
                <p className="text-sm text-gray-400">
                  Get your API keys from OKX (enable trading, disable withdrawals)
                </p>
                
                <SimpleInput
                  label="API Key"
                  value={okx.apiKey}
                  onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                  placeholder="okx-..."
                  disabled={busy === "okx"}
                />
                
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={okx.apiSecret}
                  onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                  placeholder="••••••••"
                  disabled={busy === "okx"}
                />
                
                <SimpleInput
                  label="Passphrase"
                  type="password"
                  value={okx.passphrase}
                  onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                  placeholder="your passphrase"
                  disabled={busy === "okx"}
                />
                
                <ActionButton 
                  onClick={connectOKX} 
                  disabled={busy === "okx"} 
                  loading={busy === "okx"}
                  color="blue"
                >
                  Connect OKX
                </ActionButton>
              </form>
            )}

            {/* Alpaca */}
            {needs.alpaca && !status.alpaca && (
              <form onSubmit={connectAlpaca} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-green-300">📈 Alpaca Trading</h3>
                <p className="text-sm text-gray-400">
                  Get your API keys from Alpaca (enable trading)
                </p>
                
                <SimpleInput
                  label="API Key"
                  value={alpaca.apiKey}
                  onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                  placeholder="AK..."
                  disabled={busy === "alpaca"}
                />
                
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={alpaca.apiSecret}
                  onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                  placeholder="••••••••"
                  disabled={busy === "alpaca"}
                />
                
                <ActionButton 
                  onClick={connectAlpaca} 
                  disabled={busy === "alpaca"} 
                  loading={busy === "alpaca"}
                  color="green"
                >
                  Connect Alpaca
                </ActionButton>
              </form>
            )}

            {/* Wallet */}
            {needs.wallet && !status.wallet && (
              <form onSubmit={connectWallet} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-purple-300">🦄 Crypto Wallet</h3>
                <p className="text-sm text-gray-400">
                  Enter your Ethereum wallet address (starts with 0x)
                </p>
                
                <SimpleInput
                  label="Wallet Address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  disabled={busy === "wallet"}
                />
                
                <ActionButton 
                  onClick={connectWallet} 
                  disabled={busy === "wallet"} 
                  loading={busy === "wallet"}
                  color="blue"
                >
                  Connect Wallet
                </ActionButton>
              </form>
            )}

            {/* Show connected status */}
            {needs.okx && status.okx && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ OKX connected
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Alpaca connected
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Wallet connected
              </div>
            )}
          </div>
        </SectionCard>

        {/* Step 3: Start Trading */}
        <SectionCard 
          number="3" 
          title="Start Trading" 
          description="Turn on trading and let the bot work for you"
          status={status.trading}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <p className="text-yellow-500/80 text-sm">
                ⏳ Finish steps 1 and 2 first
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  When you're ready, flip the switch to start trading
                </p>
                <ActionButton 
                  onClick={toggleTrading} 
                  disabled={busy === "trading" || (!canEnableTrading && !status.trading)}
                  loading={busy === "trading"}
                  color={status.trading ? "gray" : "green"}
                >
                  {status.trading ? "Turn Trading OFF" : "Turn Trading ON"}
                </ActionButton>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm">
          <a 
            href="https://imali-defi.com/funding-guide" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            📘 Funding Guide
          </a>
          <span className="text-gray-600">•</span>
          <button 
            onClick={handleSkipToDashboard}
            className="text-gray-400 hover:text-white"
          >
            Skip to Dashboard
          </button>
          <span className="text-gray-600">•</span>
          <a 
            href="mailto:support@imali-defi.com"
            className="text-gray-400 hover:text-white"
          >
            Need Help?
          </a>
        </div>
      </div>
    </div>
  );
}
