// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ==============================================
// GAMIFIED COMPONENTS
// ==============================================

const XPToast = ({ xp, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-bounce">⭐</span>
          <div>
            <p className="font-bold text-white">+{xp} XP</p>
            <p className="text-xs text-yellow-100">Quest Complete!</p>
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
    {done ? "✓ QUEST COMPLETE!" : "🔒 LOCKED"}
  </span>
);

const QuestCard = ({ 
  number, 
  title, 
  description, 
  status, 
  children, 
  xpReward = 100,
  isBoss = false,
  onComplete
}) => {
  const [showXP, setShowXP] = useState(false);
  const prevStatus = useRef(status);
  
  useEffect(() => {
    if (status === true && prevStatus.current === false) {
      setShowXP(true);
      onComplete?.(xpReward);
    }
    prevStatus.current = status;
  }, [status, xpReward, onComplete]);
  
  return (
    <div className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden
      ${status 
        ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/5 shadow-lg shadow-green-500/20' 
        : isBoss
          ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/5'
          : 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5'
      }
      hover:scale-[1.02] transition-transform
    `}>
      {showXP && <XPToast xp={xpReward} onComplete={() => setShowXP(false)} />}
      
      {/* XP Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full text-xs border border-yellow-500/30">
          <span className="text-yellow-400">⭐</span>
          <span className="text-yellow-300 font-bold">{xpReward} XP</span>
        </div>
      </div>

      {/* Quest Number */}
      <div className="absolute top-4 left-4 z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
          {number}
        </div>
      </div>

      <div className="p-6 pt-16">
        <div className="flex items-start justify-between mb-4 ml-12">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
          <StatusBadge done={status} />
        </div>
        
        {children}
        
        {/* Quest Progress Bar */}
        {!status && (
          <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse" style={{ width: '30%' }} />
          </div>
        )}
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
            console.warn(`Image not found: ${imagePath}`);
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
            🔗 Need more help? Click here →
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
    <span className="text-sm text-gray-400">🎮 Mode:</span>
    <button
      type="button"
      onClick={() => onChange(false)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        !isLive
          ? "bg-gradient-to-r from-orange-500/30 to-orange-600/30 text-orange-300 border border-orange-500/50 shadow-lg"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      🎮 Paper Trading (Safe)
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        isLive
          ? "bg-gradient-to-r from-green-500/30 to-emerald-600/30 text-green-300 border border-green-500/50 shadow-lg"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      💰 Live Trading (Real Money)
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
      className={`px-6 py-3 rounded-lg font-bold transition-all bg-gradient-to-r ${colors[color]} disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl transform hover:scale-105`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Working...
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
    tip: "🎯",
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

  const [totalXP, setTotalXP] = useState(() => {
    try {
      return parseInt(localStorage.getItem('imali_xp') || '0');
    } catch {
      return 0;
    }
  });
  const [level, setLevel] = useState(() => {
    return Math.floor(totalXP / 500) + 1;
  });
  
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  
  const hasRedirected = useRef(false);

  const tier = useMemo(() => {
    const userTier = user?.tier?.toLowerCase();
    const stateTier = location.state?.tier;
    const savedTier = localStorage.getItem("IMALI_TIER");
    return userTier || stateTier || savedTier || "starter";
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

  // Quest requirements
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

  const addXP = useCallback((amount) => {
    const newXP = totalXP + amount;
    setTotalXP(newXP);
    try {
      localStorage.setItem('imali_xp', newXP.toString());
    } catch (e) {
      console.warn('Failed to save XP:', e);
    }
    const newLevel = Math.floor(newXP / 500) + 1;
    if (newLevel > level) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setLevel(newLevel);
  }, [totalXP, level]);

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
      addXP(500);
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate, addXP]);

  const refreshAfterAction = useCallback(async () => {
    await refreshActivation?.();
  }, [refreshActivation]);

  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    if (!okx.apiKey || !okx.apiSecret || !okx.passphrase) {
      setError("Please fill in all OKX fields!");
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

      setSuccess(`🎉 OKX connected successfully in ${okx.isLive ? "LIVE" : "PAPER"} mode! +100 XP`);
      addXP(100);
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX. Double-check your API keys!");
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
      setError("Please fill in both Alpaca fields!");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectAlpaca({
        api_key: alpaca.apiKey.trim(),
        api_secret: alpaca.apiSecret.trim(),
        mode: alpaca.isLive ? "live" : "paper",
      });

      setSuccess(`🎉 Alpaca connected successfully in ${alpaca.isLive ? "LIVE" : "PAPER"} mode! +100 XP`);
      addXP(100);
      setAlpaca({ apiKey: "", apiSecret: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca. Double-check your API keys!");
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
      setError("Please enter your wallet address!");
      setBusy("");
      return;
    }

    if (!addr.startsWith("0x") || addr.length !== 42) {
      setError("Wallet address must start with '0x' and be exactly 42 characters!");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr });
      setSuccess(`🎉 Wallet connected successfully! +100 XP`);
      addXP(100);
      setWallet("");
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect wallet!");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !status.trading) {
      setError("Complete all quests first before activating the trading bot!");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      await refreshAfterAction();
      if (enabling) {
        setSuccess("🎉 TRADING BOT ACTIVATED! +200 XP! Preparing your dashboard...");
        addXP(200);
      } else {
        setSuccess("Trading bot paused. Come back anytime to resume!");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading status!");
    } finally {
      setBusy("");
    }
  };

  const getPlanIcon = () => {
    switch (tier) {
      case "starter": return "🌱";
      case "pro": return "⭐";
      case "elite": return "👑";
      case "stock": return "📈";
      case "bundle": return "🧩";
      default: return "🎮";
    }
  };

  const getPlanName = () => {
    switch (tier) {
      case "starter": return "Starter (Free)";
      case "pro": return "Pro";
      case "elite": return "Elite";
      case "stock": return "DeFi";
      case "bundle": return "Bundle";
      default: return "Current Plan";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white">
      {/* Simple Confetti Effect using CSS only */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10px`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Level Up Banner */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <span className="font-bold text-white">Level {level}</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${(totalXP % 500) / 5}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{totalXP} / {level * 500} XP</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full">
              <span>{getPlanIcon()}</span>
              <span className="font-semibold text-sm">{getPlanName()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="text-7xl animate-bounce">🎮</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-3">
            Welcome, Hero!
          </h1>
          <p className="text-gray-400 text-lg">
            Complete these quests to unlock your trading bot and start earning rewards!
          </p>
          {fullyActivated && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl inline-block animate-pulse">
              <p className="text-green-300 font-bold">🎉 ALL QUESTS COMPLETE! Redirecting to dashboard... 🎉</p>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && !fullyActivated && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Quest 1: Billing */}
        <QuestCard
          number="1"
          title="💰 Payment Method Quest"
          description="Secure your billing to unlock premium features"
          status={status.billing}
          xpReward={100}
          onComplete={addXP}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <InfoBox type="info" icon="🔒">
                <strong>Why this quest?</strong> We need a payment method on file to ensure secure trading. Your card is encrypted and never stored on our servers!
              </InfoBox>
              <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton onClick={() => navigate("/billing", { state: { tier } })} color="blue" icon="💳">
                  Start Billing Quest
                </ActionButton>
                <a href="https://stripe.com/docs/payments" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                  🔗 Learn about secure payments
                </a>
              </div>
            </div>
          ) : (
            <div className="text-green-300 font-bold text-center py-4 animate-pulse">
              ✅ Quest Complete! +100 XP
            </div>
          )}
        </QuestCard>

        {/* Quest 2: Trading Connections */}
        <QuestCard
          number="2"
          title="🔗 Connect Trading Platforms"
          description="Link your exchange accounts to enable trading"
          status={connectionsDone}
          xpReward={300}
          onComplete={addXP}
        >
          <div className="space-y-6">
            {/* OKX Quest */}
            {needs.okx && !status.okx && (
              <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5">
                <h3 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                  <span>🔷</span> OKX Exchange Quest
                </h3>
                
                <div className="space-y-4">
                  {/* Screenshot Guide */}
                  <ScreenshotGuide
                    imagePath="/oxksignup.jpg"
                    alt="OKX API Setup Guide"
                    steps={[
                      "Log into your OKX account",
                      "Go to API section (usually under Profile)",
                      "Create a new API key with trading permissions",
                      "Copy your API Key, Secret Key, and Passphrase",
                      "Paste them below to complete the quest!"
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
                      label="🔑 API Key"
                      value={okx.apiKey}
                      onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                      placeholder="Enter your OKX API key"
                      disabled={busy === "okx"}
                      icon="🔐"
                    />
                    <SimpleInput
                      label="🤫 Secret Key"
                      type="password"
                      value={okx.apiSecret}
                      onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                      placeholder="Enter your OKX secret key"
                      disabled={busy === "okx"}
                      icon="🤫"
                    />
                    <SimpleInput
                      label="🔢 Passphrase"
                      type="password"
                      value={okx.passphrase}
                      onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                      placeholder="Enter your OKX passphrase"
                      disabled={busy === "okx"}
                      icon="🔢"
                    />
                    
                    <ActionButton type="submit" disabled={busy === "okx"} loading={busy === "okx"} color={okx.isLive ? "green" : "orange"} icon="🔗">
                      Complete OKX Quest!
                    </ActionButton>
                  </form>
                </div>
              </div>
            )}

            {/* Alpaca Quest */}
            {needs.alpaca && !status.alpaca && (
              <div className="border border-green-500/30 rounded-xl p-4 bg-green-500/5">
                <h3 className="text-lg font-bold text-green-300 mb-3 flex items-center gap-2">
                  <span>📈</span> Alpaca Trading Quest
                </h3>
                
                <div className="space-y-4">
                  <ScreenshotGuide
                    imagePath="/alpacasignup.jpg"
                    alt="Alpaca API Setup Guide"
                    steps={[
                      "Create an Alpaca account at alpaca.markets",
                      "Go to your Dashboard → API Keys",
                      "Generate a new API key pair",
                      "Copy your API Key ID and Secret Key",
                      "Paste them below to claim your reward!"
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
                      label="🔑 API Key ID"
                      value={alpaca.apiKey}
                      onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                      placeholder="PK..."
                      disabled={busy === "alpaca"}
                      icon="🔐"
                    />
                    <SimpleInput
                      label="🤫 Secret Key"
                      type="password"
                      value={alpaca.apiSecret}
                      onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                      placeholder="Enter your secret key"
                      disabled={busy === "alpaca"}
                      icon="🤫"
                    />
                    
                    <ActionButton type="submit" disabled={busy === "alpaca"} loading={busy === "alpaca"} color={alpaca.isLive ? "green" : "orange"} icon="🔗">
                      Complete Alpaca Quest!
                    </ActionButton>
                  </form>
                </div>
              </div>
            )}

            {/* Wallet Quest */}
            {needs.wallet && !status.wallet && (
              <div className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5">
                <h3 className="text-lg font-bold text-purple-300 mb-3 flex items-center gap-2">
                  <span>🦄</span> DeFi Wallet Quest
                </h3>
                
                <div className="space-y-4">
                  <InfoBox type="tip" icon="🦄">
                    <strong>What's a DeFi wallet?</strong> A crypto wallet like MetaMask or Trust Wallet for decentralized trading on Ethereum, BSC, and other chains.
                  </InfoBox>
                  
                  <form onSubmit={connectWallet} className="space-y-4">
                    <SimpleInput
                      label="💰 Wallet Address"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder="0x..."
                      helper="Must start with 0x and be exactly 42 characters long"
                      disabled={busy === "wallet"}
                      icon="🦄"
                    />
                    
                    <ActionButton type="submit" disabled={busy === "wallet"} loading={busy === "wallet"} color="purple" icon="🔗">
                      Connect Wallet & Claim XP!
                    </ActionButton>
                  </form>
                </div>
              </div>
            )}

            {/* Completed Connections */}
            {needs.okx && status.okx && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                <p className="text-green-300 font-bold">✅ OKX Quest Complete! +100 XP</p>
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                <p className="text-green-300 font-bold">✅ Alpaca Quest Complete! +100 XP</p>
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                <p className="text-green-300 font-bold">✅ Wallet Quest Complete! +100 XP</p>
              </div>
            )}
          </div>
        </QuestCard>

        {/* Quest 3: Boss Battle - Activate Bot */}
        <QuestCard
          number="3"
          title="👾 FINAL BOSS: Activate Trading Bot"
          description="Defeat the final boss by activating your automated trading bot"
          status={status.trading}
          xpReward={500}
          isBoss={true}
          onComplete={addXP}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <InfoBox type="warning" icon="⚔️">
                <strong>Boss is too strong!</strong> You need to complete Quests 1 and 2 first to unlock this battle!
              </InfoBox>
            ) : (
              <>
                <InfoBox type="tip" icon="🤖">
                  <strong>Ready for battle?</strong> Once activated, your bot will automatically analyze markets and execute trades based on your strategy. You can monitor everything from your dashboard!
                </InfoBox>

                {status.trading ? (
                  <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500 rounded-xl text-center">
                    <div className="text-4xl mb-3 animate-bounce">🏆</div>
                    <p className="text-green-300 font-bold text-lg mb-2">BOSS DEFEATED!</p>
                    <p className="text-sm text-gray-300">Your trading bot is ACTIVE and protecting your portfolio!</p>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-4xl animate-pulse">👾</div>
                      <div>
                        <p className="font-bold text-purple-300">Final Boss: The Trading Bot</p>
                        <p className="text-xs text-gray-400">Defeat it by clicking the button below!</p>
                      </div>
                    </div>
                    <ActionButton
                      onClick={toggleTrading}
                      disabled={busy === "trading"}
                      loading={busy === "trading"}
                      color="purple"
                      icon="⚔️"
                    >
                      {status.trading ? "Bot Already Active!" : "DEFEAT THE BOSS!"}
                    </ActionButton>
                  </div>
                )}
              </>
            )}
          </div>
        </QuestCard>

        {/* Help & Resources */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span>🎮</span> Need Help? Check These Power-Ups!
          </h3>
          <div className="grid gap-3">
            <a
              href="https://imali-defi.com/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-black/60 transition-all hover:scale-105"
            >
              <span className="text-2xl">📚</span>
              <div>
                <div className="font-medium text-white">Getting Started Guide</div>
                <div className="text-xs text-gray-400">Step-by-step walkthrough for beginners</div>
              </div>
            </a>
            <a
              href="mailto:support@imali-defi.com"
              className="flex items-center gap-3 p-3 bg-black/40 rounded-lg hover:bg-black/60 transition-all hover:scale-105"
            >
              <span className="text-2xl">📧</span>
              <div>
                <div className="font-medium text-white">Hero Support Team</div>
                <div className="text-xs text-gray-400">We're here 24/7 to help you!</div>
              </div>
            </a>
          </div>
        </div>

        {/* Skip Option */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate("/dashboard", { replace: true })} 
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm underline"
          >
            Skip to Dashboard (Not Recommended)
          </button>
        </div>
      </div>

      {/* CSS Animations - Added to ensure compatibility */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-bounce { animation: bounce 1s ease-in-out infinite; }
        .animate-pulse { animation: pulse 2s ease-in-out infinite; }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
