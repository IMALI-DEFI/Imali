// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ────────────────────────────────────────────────────────────
// Presentational Components
// ────────────────────────────────────────────────────────────

const StatusBadge = ({ done }) => (
  <span
    className={`px-3 py-1 rounded-full text-sm font-medium ${
      done
        ? "bg-green-500/20 text-green-300 border border-green-500/30"
        : "bg-gray-800 text-gray-400 border border-gray-700"
    }`}
  >
    {done ? "✓ DONE" : "⋯ PENDING"}
  </span>
);

const SectionCard = ({ number, title, description, status, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
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

const SimpleInput = ({ label, type = "text", value, onChange, placeholder, disabled, helper }) => (
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
    {helper && <p className="text-xs text-gray-500">{helper}</p>}
  </div>
);

const ModeToggle = ({ isLive, onChange, disabled }) => (
  <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
    <span className="text-sm text-gray-400">Mode:</span>
    <button
      type="button"
      onClick={() => onChange(false)}
      disabled={disabled}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        !isLive 
          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" 
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      🎮 Paper Trading
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      disabled={disabled}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        isLive 
          ? "bg-green-500/20 text-green-300 border border-green-500/30" 
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      💰 Live Trading
    </button>
  </div>
);

const ActionButton = ({ onClick, disabled, loading, children, color = "blue", type = "button" }) => {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    gray: "bg-gray-700 hover:bg-gray-600",
    orange: "bg-orange-600 hover:bg-orange-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-medium transition-all ${colors[color]} disabled:opacity-50 disabled:cursor-not-allowed text-white`}
    >
      {loading ? "Working..." : children}
    </button>
  );
};

const InfoBox = ({ type = "info", children }) => {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-200",
    tip: "bg-purple-500/10 border-purple-500/30 text-purple-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type]} text-sm`}>
      {children}
    </div>
  );
};

const HelpLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
  >
    {children}
  </a>
);

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export default function Activation() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation, setActivation } = useAuth();
  const hasRedirected = useRef(false);
  const initialLoadDone = useRef(false);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [okx, setOkx] = useState({ 
    apiKey: "", 
    apiSecret: "", 
    passphrase: "",
    isLive: false // Start with paper trading for safety
  });
  const [alpaca, setAlpaca] = useState({ 
    apiKey: "", 
    apiSecret: "",
    isLive: false // Start with paper trading for safety
  });
  const [wallet, setWallet] = useState("");

  // Derived state
  const tier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user]);

  const needs = useMemo(
    () => ({
      okx: ["starter", "pro", "bundle"].includes(tier),
      alpaca: ["starter", "bundle"].includes(tier),
      wallet: ["elite", "bundle"].includes(tier),
    }),
    [tier]
  );

  const status = useMemo(
    () => ({
      billing: !!activation?.billing_complete,
      okx: !!activation?.okx_connected,
      alpaca: !!activation?.alpaca_connected,
      wallet: !!activation?.wallet_connected,
      trading: !!activation?.trading_enabled,
    }),
    [activation]
  );

  const connectionsDone = useMemo(
    () =>
      (!needs.okx || status.okx) &&
      (!needs.alpaca || status.alpaca) &&
      (!needs.wallet || status.wallet),
    [needs, status]
  );

  const canEnableTrading = useMemo(
    () => status.billing && connectionsDone,
    [status.billing, connectionsDone]
  );

  const fullyActivated = useMemo(
    () => status.billing && connectionsDone && status.trading,
    [status.billing, connectionsDone, status.trading]
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;
      
      try {
        if (!activation && refreshActivation) {
          console.log("[Activation] Loading initial activation data");
          await refreshActivation();
        }
      } catch (err) {
        console.warn("[Activation] Initial load failed:", err);
      }
    };

    loadInitialData();
  }, [activation, refreshActivation]);

  // Redirect when fully activated
  useEffect(() => {
    if (fullyActivated && !hasRedirected.current) {
      console.log("[Activation] ✅ Fully activated — redirecting to /dashboard");
      hasRedirected.current = true;

      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate]);

  // Refresh helper
  const refreshAfterAction = useCallback(async () => {
    try {
      if (refreshActivation) {
        await refreshActivation();
      } else {
        const res = await BotAPI.activationStatus();
        const fresh = res?.status ?? res?.data?.status ?? res;
        if (setActivation) setActivation(fresh);
      }
    } catch (err) {
      console.error("[Activation] Refresh after action failed:", err);
    }
  }, [refreshActivation, setActivation]);

  // Connection handlers
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
        mode: okx.isLive ? "live" : "paper",
      });
      setSuccess(`✅ OKX connected successfully in ${okx.isLive ? "LIVE" : "PAPER"} mode!`);
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX. Please double-check your API keys.");
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
        mode: alpaca.isLive ? "live" : "paper",
      });
      setSuccess(`✅ Alpaca connected successfully in ${alpaca.isLive ? "LIVE" : "PAPER"} mode!`);
      setAlpaca({ apiKey: "", apiSecret: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca. Please double-check your API keys.");
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
      setError("Wallet address must start with '0x' and be exactly 42 characters long");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr, address: addr });
      setSuccess("✅ Wallet connected successfully!");
      setWallet("");
      await refreshAfterAction();
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
      setError("Please complete billing and connect your accounts first");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      setSuccess(enabling ? "✅ Trading enabled! Redirecting to your dashboard…" : "Trading has been turned off");
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading status");
    } finally {
      setBusy("");
    }
  };

  const handleSkipToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  // Render
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to IMALI! 🚀</h1>
          <p className="text-gray-400 mb-4">
            Let's set up your automated trading bot. Don't worry - we'll guide you through each step!
          </p>
          <InfoBox type="tip">
            💡 <strong>New to trading?</strong> Start with paper trading (practice mode) to learn without risk. 
            You can switch to live trading anytime once you're comfortable.
          </InfoBox>
        </div>

        {/* Fully-activated banner */}
        {fullyActivated && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center justify-between">
            <span>🎉 Your account is fully activated! Redirecting to your dashboard…</span>
            <button
              onClick={handleSkipToDashboard}
              className="underline hover:text-white transition-colors"
            >
              Go now →
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
            ⚠️ {error}
          </div>
        )}
        {success && !fullyActivated && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-200">
            {success}
          </div>
        )}

        {/* Step 1: Billing */}
        <SectionCard
          number="1"
          title="Add Payment Method"
          description="Set up billing for when you start making profits"
          status={status.billing}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <InfoBox type="info">
                📌 <strong>How billing works:</strong><br />
                • No upfront costs or monthly fees<br />
                • We only charge 30% of your profits (performance fee)<br />
                • If you don't make money, you don't pay anything<br />
                • Your card is securely stored with Stripe (we never see your card details)
              </InfoBox>
              <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton onClick={() => navigate("/billing")} color="blue">
                  Add Credit Card
                </ActionButton>
                <HelpLink href="https://imali-defi.com/faq#billing">
                  Learn more about billing →
                </HelpLink>
              </div>
            </div>
          ) : (
            <div className="text-green-300">✅ Payment method saved successfully</div>
          )}
        </SectionCard>

        {/* Step 2: Connect Accounts */}
        <SectionCard
          number="2"
          title="Connect Your Trading Accounts"
          description="Link the platforms where you want the bot to trade"
          status={connectionsDone}
        >
          <div className="space-y-6">

            {/* OKX */}
            {needs.okx && !status.okx && (
              <form onSubmit={connectOKX} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-blue-300">🔷 OKX Exchange (Cryptocurrency)</h3>
                
                <InfoBox type="info">
                  <strong>What is OKX?</strong> A cryptocurrency exchange where you can trade Bitcoin, Ethereum, and other digital assets.<br />
                  <strong>Getting started:</strong>
                  <ol className="mt-2 ml-4 list-decimal">
                    <li>Create an account at <HelpLink href="https://www.okx.com">OKX.com</HelpLink></li>
                    <li>Complete identity verification (KYC)</li>
                    <li>Go to Account → API → Create API Key</li>
                    <li>Enable "Trading" permission (keep "Withdrawal" disabled for security)</li>
                    <li>Save your API credentials and enter them below</li>
                  </ol>
                </InfoBox>

                <ModeToggle 
                  isLive={okx.isLive} 
                  onChange={(isLive) => setOkx({ ...okx, isLive })}
                  disabled={busy === "okx"}
                />

                {okx.isLive && (
                  <InfoBox type="warning">
                    ⚠️ <strong>Live Mode:</strong> The bot will trade with real money. Make sure you understand the risks.
                  </InfoBox>
                )}

                <SimpleInput
                  label="API Key"
                  value={okx.apiKey}
                  onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                  placeholder="Enter your OKX API key"
                  helper="This usually starts with random letters and numbers"
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={okx.apiSecret}
                  onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                  placeholder="Enter your OKX secret key"
                  helper="Keep this private - never share it with anyone"
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Passphrase"
                  type="password"
                  value={okx.passphrase}
                  onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                  placeholder="Enter the passphrase you set"
                  helper="The passphrase you created when generating the API key"
                  disabled={busy === "okx"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "okx"}
                    loading={busy === "okx"}
                    color={okx.isLive ? "green" : "orange"}
                  >
                    Connect OKX ({okx.isLive ? "Live" : "Paper"})
                  </ActionButton>
                  <HelpLink href="https://www.okx.com/docs/en/#overview">
                    OKX API Documentation →
                  </HelpLink>
                </div>
              </form>
            )}

            {/* Alpaca */}
            {needs.alpaca && !status.alpaca && (
              <form onSubmit={connectAlpaca} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-green-300">📈 Alpaca (US Stocks)</h3>
                
                <InfoBox type="info">
                  <strong>What is Alpaca?</strong> A commission-free stock trading platform for US markets.<br />
                  <strong>Getting started:</strong>
                  <ol className="mt-2 ml-4 list-decimal">
                    <li>Sign up at <HelpLink href="https://alpaca.markets">Alpaca Markets</HelpLink></li>
                    <li>Complete account verification</li>
                    <li>Go to your dashboard → API Keys</li>
                    <li>Generate new API keys (paper or live)</li>
                    <li>Copy and paste them below</li>
                  </ol>
                </InfoBox>

                <ModeToggle 
                  isLive={alpaca.isLive} 
                  onChange={(isLive) => setAlpaca({ ...alpaca, isLive })}
                  disabled={busy === "alpaca"}
                />

                {!alpaca.isLive && (
                  <InfoBox type="tip">
                    🎮 <strong>Paper Trading:</strong> Alpaca provides free paper trading with \$100,000 in virtual money. 
                    Perfect for testing strategies risk-free!
                  </InfoBox>
                )}

                <SimpleInput
                  label="API Key ID"
                  value={alpaca.apiKey}
                  onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                  placeholder="PK..."
                  helper={alpaca.isLive ? "Use your LIVE API key" : "Use your PAPER API key"}
                  disabled={busy === "alpaca"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={alpaca.apiSecret}
                  onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                  placeholder="Enter your secret key"
                  helper="Keep this private - it's like a password for your account"
                  disabled={busy === "alpaca"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "alpaca"}
                    loading={busy === "alpaca"}
                    color={alpaca.isLive ? "green" : "orange"}
                  >
                    Connect Alpaca ({alpaca.isLive ? "Live" : "Paper"})
                  </ActionButton>
                  <HelpLink href="https://alpaca.markets/learn/api-documentation/">
                    Alpaca Setup Guide →
                  </HelpLink>
                </div>
              </form>
            )}

            {/* Wallet */}
            {needs.wallet && !status.wallet && (
              <form onSubmit={connectWallet} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-purple-300">🦄 DeFi Wallet (Advanced)</h3>
                
                <InfoBox type="info">
                  <strong>What is a DeFi wallet?</strong> A cryptocurrency wallet for decentralized finance trading.<br />
                  <strong>Popular wallets:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    <li><HelpLink href="https://metamask.io">MetaMask</HelpLink> (recommended for beginners)</li>
                    <li><HelpLink href="https://trustwallet.com">Trust Wallet</HelpLink></li>
                    <li><HelpLink href="https://www.coinbase.com/wallet">Coinbase Wallet</HelpLink></li>
                  </ul>
                  <strong className="text-yellow-300">Important:</strong> Never share your private key or seed phrase!
                </InfoBox>

                <SimpleInput
                  label="Ethereum Wallet Address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  helper="Your public wallet address (42 characters starting with 0x)"
                  disabled={busy === "wallet"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "wallet"}
                    loading={busy === "wallet"}
                    color="blue"
                  >
                    Connect Wallet
                  </ActionButton>
                  <HelpLink href="https://metamask.io/faqs/">
                    How to find my wallet address →
                  </HelpLink>
                </div>
              </form>
            )}

            {/* Connected indicators */}
            {needs.okx && status.okx && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ OKX exchange connected successfully
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Alpaca trading connected successfully
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ DeFi wallet connected successfully
              </div>
            )}
          </div>
        </SectionCard>

        {/* Step 3: Start Trading */}
        <SectionCard
          number="3"
          title="Activate Trading Bot"
          description="Turn on automated trading when you're ready"
          status={status.trading}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <InfoBox type="warning">
                ⏳ Please complete steps 1 and 2 first before activating the trading bot.
              </InfoBox>
            ) : (
              <div className="space-y-4">
                <InfoBox type="info">
                  🤖 <strong>How the bot works:</strong><br />
                  • Analyzes market conditions 24/7<br />
                  • Executes trades based on proven strategies<br />
                  • Manages risk automatically<br />
                  • You can monitor everything from your dashboard
                </InfoBox>
                
                {status.trading && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-300 font-medium mb-2">🟢 Trading bot is currently ACTIVE</p>
                    <p className="text-sm text-gray-400">Your bot is running and looking for trading opportunities.</p>
                  </div>
                )}

                <ActionButton
                  onClick={toggleTrading}
                  disabled={busy === "trading" || (!canEnableTrading && !status.trading)}
                  loading={busy === "trading"}
                  color={status.trading ? "gray" : "green"}
                >
                  {status.trading ? "⏸ Pause Trading Bot" : "▶️ Start Trading Bot"}
                </ActionButton>

                <HelpLink href="https://imali-defi.com/how-it-works">
                  Learn more about our trading strategies →
                </HelpLink>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Need Help? 🤝</h3>
          <div className="grid gap-3">
            <a
              href="https://imali-defi.com/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>📚</span>
              <div>
                <div className="font-medium">Getting Started Guide</div>
                <div className="text-xs text-gray-400">Step-by-step walkthrough for beginners</div>
              </div>
            </a>
            
            <a
              href="https://imali-defi.com/funding-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>💰</span>
              <div>
                <div className="font-medium">Funding Your Account</div>
                <div className="text-xs text-gray-400">How to deposit money for trading</div>
              </div>
            </a>
            
            <a
              href="https://imali-defi.com/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>❓</span>
              <div>
                <div className="font-medium">Frequently Asked Questions</div>
                <div className="text-xs text-gray-400">Common questions and answers</div>
              </div>
            </a>
            
            <a
              href="mailto:support@imali-defi.com"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>📧</span>
              <div>
                <div className="font-medium">Email Support</div>
                <div className="text-xs text-gray-400">Get help from our team</div>
              </div>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm">
          <button onClick={handleSkipToDashboard} className="text-gray-400 hover:text-white">
            Skip to Dashboard →
          </button>
          <span className="text-gray-600">•</span>
          <a href="/docs" className="text-gray-400 hover:text-white">
            Documentation
          </a>
          <span className="text-gray-600">•</span>
          <a href="/status" className="text-gray-400 hover:text-white">
            System Status
          </a>
        </div>
      </div>
    </div>
  );
}
