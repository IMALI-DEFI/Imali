// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ==============================================
// COMPONENTS
// ==============================================

const SuccessToast = ({ message, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-bold text-white">Complete!</p>
            <p className="text-xs text-green-100">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ done }) => (
  <span
    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
      done
        ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-500/30"
        : "bg-gray-800 text-gray-400 border border-gray-700"
    }`}
  >
    {done ? "✓ COMPLETE" : "⋯ PENDING"}
  </span>
);

const StepCard = ({ 
  number, 
  title, 
  description, 
  status, 
  children, 
  onComplete 
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatus = useRef(status);
  
  useEffect(() => {
    if (status === true && prevStatus.current === false) {
      setShowSuccess(true);
      onComplete?.();
    }
    prevStatus.current = status;
  }, [status, onComplete]);
  
  return (
    <div className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden
      ${status 
        ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5' 
        : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50'
      }
    `}>
      {showSuccess && <SuccessToast message="Step Complete!" onComplete={() => setShowSuccess(false)} />}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {number}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          </div>
          <StatusBadge done={status} />
        </div>
        
        {children}
      </div>
    </div>
  );
};

const ScreenshotGuide = ({ imagePath, alt, steps, link }) => (
  <div className="bg-black/40 rounded-xl p-4 border border-white/10">
    <div className="flex gap-4 flex-wrap">
      {imagePath && (
        <img 
          src={imagePath} 
          alt={alt}
          className="w-48 h-auto rounded-lg border border-white/20 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => window.open(imagePath, '_blank')}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      )}
      <div className="flex-1">
        <div className="text-sm text-gray-300 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-green-400">{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Need more help? →
          </a>
        )}
      </div>
    </div>
  </div>
);

const SimpleInput = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  helper,
  icon
}) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-400 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
    />
    {helper && <p className="text-xs text-gray-500">{helper}</p>}
  </div>
);

const ModeToggle = ({ isLive, onChange, disabled }) => (
  <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-white/10">
    <span className="text-sm text-gray-400">Mode:</span>
    <button
      type="button"
      onClick={() => onChange(false)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        !isLive
          ? "bg-gradient-to-r from-orange-500/30 to-orange-600/30 text-orange-300 border border-orange-500/50"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      Paper Trading
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isLive
          ? "bg-gradient-to-r from-green-500/30 to-emerald-600/30 text-green-300 border border-green-500/50"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      Live Trading
    </button>
  </div>
);

const ActionButton = ({
  onClick,
  disabled,
  loading,
  children,
  color = "blue",
  type = "button",
  icon
}) => {
  const colors = {
    blue: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600",
    green: "from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600",
    gray: "from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700",
    orange: "from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600",
    purple: "from-purple-600 to-pink-700 hover:from-purple-500 hover:to-pink-600",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r ${colors[color]} disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {children}
        </span>
      )}
    </button>
  );
};

const InfoBox = ({ type = "info", children, icon }) => {
  const styles = {
    info: "from-blue-500/10 to-blue-600/5 border-blue-500/30 text-blue-200",
    warning: "from-yellow-500/10 to-orange-600/5 border-yellow-500/30 text-yellow-200",
    tip: "from-purple-500/10 to-pink-600/5 border-purple-500/30 text-purple-200",
    success: "from-green-500/10 to-emerald-600/5 border-green-500/30 text-green-200",
  };
  
  const icons = {
    info: "💡",
    warning: "⚠️",
    tip: "📌",
    success: "✅"
  };

  return (
    <div className={`p-4 rounded-xl border bg-gradient-to-r ${styles[type]} text-sm backdrop-blur-sm`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon || icons[type]}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

// ==============================================
// MAIN ACTIVATION COMPONENT
// ==============================================

export default function Activation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, refreshActivation } = useAuth();
  
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const hasRedirected = useRef(false);

  const tier = useMemo(() => {
    const userTier = user?.tier?.toLowerCase();
    const stateTier = location.state?.tier;
    return userTier || stateTier || "starter";
  }, [location.state?.tier, user?.tier]);

  const [okx, setOkx] = useState({
    apiKey: "",
    apiSecret: "",
    passphrase: "",
    isLive: false,
  });

  const [alpaca, setAlpaca] = useState({
    apiKey: "",
    apiSecret: "",
    isLive: false,
  });

  const [wallet, setWallet] = useState("");

  const needs = useMemo(
    () => ({
      billing: true,
      okx: ["starter", "pro", "bundle"].includes(tier),
      alpaca: ["starter", "bundle"].includes(tier),
      wallet: ["elite", "bundle"].includes(tier),
    }),
    [tier]
  );

  const status = useMemo(() => ({
    billing: !!activation?.has_card_on_file || !!activation?.billing_complete,
    okx: !!activation?.okx_connected,
    alpaca: !!activation?.alpaca_connected,
    wallet: !!activation?.wallet_connected,
    trading: !!activation?.trading_enabled,
  }), [activation]);

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

  useEffect(() => {
    const loadData = async () => {
      if (refreshActivation) {
        await refreshActivation();
      }
    };
    loadData();
  }, [refreshActivation]);

  useEffect(() => {
    if (fullyActivated && !hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate]);

  const refreshAfterAction = useCallback(async () => {
    await refreshActivation?.();
  }, [refreshActivation]);

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

      setSuccess(`OKX connected (${okx.isLive ? "Live" : "Paper"} mode)`);
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX");
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

      setSuccess(`Alpaca connected (${alpaca.isLive ? "Live" : "Paper"} mode)`);
      setAlpaca({ apiKey: "", apiSecret: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca");
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
      setError("Wallet must start with 0x and be 42 characters");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr });
      setSuccess("Wallet connected successfully");
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
      setError("Complete billing and connections first");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      await refreshAfterAction();
      if (enabling) {
        setSuccess("Trading bot activated!");
      } else {
        setSuccess("Trading bot paused");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading status");
    } finally {
      setBusy("");
    }
  };

  const handleSkipToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const getPlanName = () => {
    switch (tier) {
      case "starter": return "Starter";
      case "pro": return "Pro";
      case "elite": return "Elite";
      case "stock": return "DeFi";
      case "bundle": return "Bundle";
      default: return "Starter";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Account Activation
          </h1>
          <p className="text-gray-400">
            {getPlanName()} Plan • Complete the steps below to start trading
          </p>
          {fullyActivated && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
              <p className="text-green-300 font-semibold">✓ All steps complete! Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">
            <span>⚠️ {error}</span>
          </div>
        )}

        {success && !fullyActivated && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200">
            <span>✓ {success}</span>
          </div>
        )}

        {/* Step 1: Billing */}
        <StepCard
          number="1"
          title="Payment Method"
          description="Add a payment method to continue"
          status={status.billing}
          onComplete={() => {}}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <InfoBox type="info">
                Your payment information is encrypted and securely stored.
              </InfoBox>
              <ActionButton onClick={() => navigate("/billing", { state: { tier } })} color="blue">
                Add Payment Method
              </ActionButton>
            </div>
          ) : (
            <div className="text-green-300 font-medium text-center py-2">
              ✓ Payment method on file
            </div>
          )}
        </StepCard>

        {/* Step 2: Connections */}
        <StepCard
          number="2"
          title="Connect Platforms"
          description="Link your trading accounts"
          status={connectionsDone}
          onComplete={() => {}}
        >
          <div className="space-y-6">
            {/* OKX */}
            {needs.okx && !status.okx && (
              <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5">
                <h3 className="text-lg font-semibold text-blue-300 mb-3">OKX Exchange</h3>
                
                <ScreenshotGuide
                  imagePath="/oxksignup.jpg"
                  alt="OKX API Setup"
                  steps={[
                    "Log into OKX",
                    "Go to API section",
                    "Create API key with trading permissions",
                    "Copy API Key, Secret, and Passphrase",
                    "Paste below to connect"
                  ]}
                  link="https://www.okx.com/support"
                />
                
                <form onSubmit={connectOKX} className="space-y-4 mt-4">
                  <ModeToggle
                    isLive={okx.isLive}
                    onChange={(isLive) => setOkx({ ...okx, isLive })}
                    disabled={busy === "okx"}
                  />
                  
                  <SimpleInput
                    label="API Key"
                    value={okx.apiKey}
                    onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                    placeholder="Enter API key"
                    disabled={busy === "okx"}
                  />
                  <SimpleInput
                    label="Secret Key"
                    type="password"
                    value={okx.apiSecret}
                    onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                    placeholder="Enter secret key"
                    disabled={busy === "okx"}
                  />
                  <SimpleInput
                    label="Passphrase"
                    type="password"
                    value={okx.passphrase}
                    onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                    placeholder="Enter passphrase"
                    disabled={busy === "okx"}
                  />
                  
                  <ActionButton type="submit" disabled={busy === "okx"} loading={busy === "okx"} color={okx.isLive ? "green" : "orange"}>
                    Connect OKX
                  </ActionButton>
                </form>
              </div>
            )}

            {/* Alpaca */}
            {needs.alpaca && !status.alpaca && (
              <div className="border border-green-500/30 rounded-xl p-4 bg-green-500/5">
                <h3 className="text-lg font-semibold text-green-300 mb-3">Alpaca Trading</h3>
                
                <ScreenshotGuide
                  imagePath="/alpacasignup.jpg"
                  alt="Alpaca API Setup"
                  steps={[
                    "Create Alpaca account",
                    "Go to Dashboard → API Keys",
                    "Generate API key pair",
                    "Copy Key ID and Secret",
                    "Paste below to connect"
                  ]}
                  link="https://alpaca.markets/learn/connect-to-alpaca/"
                />
                
                <form onSubmit={connectAlpaca} className="space-y-4 mt-4">
                  <ModeToggle
                    isLive={alpaca.isLive}
                    onChange={(isLive) => setAlpaca({ ...alpaca, isLive })}
                    disabled={busy === "alpaca"}
                  />
                  
                  <SimpleInput
                    label="API Key ID"
                    value={alpaca.apiKey}
                    onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                    placeholder="PK..."
                    disabled={busy === "alpaca"}
                  />
                  <SimpleInput
                    label="Secret Key"
                    type="password"
                    value={alpaca.apiSecret}
                    onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                    placeholder="Enter secret key"
                    disabled={busy === "alpaca"}
                  />
                  
                  <ActionButton type="submit" disabled={busy === "alpaca"} loading={busy === "alpaca"} color={alpaca.isLive ? "green" : "orange"}>
                    Connect Alpaca
                  </ActionButton>
                </form>
              </div>
            )}

            {/* Wallet */}
            {needs.wallet && !status.wallet && (
              <div className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">DeFi Wallet</h3>
                
                <InfoBox type="tip">
                  Use MetaMask or Trust Wallet for decentralized trading
                </InfoBox>
                
                <form onSubmit={connectWallet} className="space-y-4 mt-4">
                  <SimpleInput
                    label="Wallet Address"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder="0x..."
                    helper="Must start with 0x (42 characters)"
                    disabled={busy === "wallet"}
                  />
                  
                  <ActionButton type="submit" disabled={busy === "wallet"} loading={busy === "wallet"} color="purple">
                    Connect Wallet
                  </ActionButton>
                </form>
              </div>
            )}

            {/* Completed status */}
            {needs.okx && status.okx && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
                ✓ OKX connected
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
                ✓ Alpaca connected
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
                ✓ Wallet connected
              </div>
            )}
          </div>
        </StepCard>

        {/* Step 3: Activate Bot */}
        <StepCard
          number="3"
          title="Activate Trading"
          description="Turn on automated trading"
          status={status.trading}
          onComplete={() => {}}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <InfoBox type="warning">
                Complete steps 1 and 2 first
              </InfoBox>
            ) : (
              <>
                <InfoBox type="tip">
                  The bot analyzes markets and executes trades based on your strategy
                </InfoBox>

                {status.trading ? (
                  <div className="p-4 bg-green-500/20 border border-green-500 rounded-xl text-center">
                    <p className="text-green-300 font-semibold">✓ Trading bot is ACTIVE</p>
                  </div>
                ) : (
                  <ActionButton
                    onClick={toggleTrading}
                    disabled={busy === "trading"}
                    loading={busy === "trading"}
                    color="green"
                  >
                    Activate Trading Bot
                  </ActionButton>
                )}
              </>
            )}
          </div>
        </StepCard>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
          <div className="flex gap-4">
            <a
              href="https://imali-defi.com/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Getting Started Guide
            </a>
            <a
              href="mailto:support@imali-defi.com"
              className="text-blue-400 hover:text-blue-300"
            >
              Email Support
            </a>
          </div>
        </div>

        {/* Skip to Dashboard */}
        <div className="mt-6 text-center">
          <button 
            onClick={handleSkipToDashboard}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm underline"
          >
            Skip to Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
