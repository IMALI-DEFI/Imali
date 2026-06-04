// src/components/Dashboard/MemberDashboard.jsx - WITH LIVE TRADE FIXES
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay, FaPause, FaRobot, FaChartLine, FaShieldAlt, FaBrain,
  FaWallet, FaExchangeAlt, FaLock, FaCheckCircle, FaCrown, FaPlug,
  FaUniversity, FaCoins, FaVoteYea, FaGift, FaWater, FaRocket, FaCircle,
  FaInfoCircle, FaTimes, FaSpinner, FaSignOutAlt,
} from "react-icons/fa";

const START_BALANCE = 1000;
const BALANCE_REFRESH_INTERVAL = 15000;
const BOT_STATUS_INTERVAL = 5000;

const TIER_ALIASES = {
  starter: 0, free: 0, trial: 0,
  pro: 1, common: 1,
  elite: 2, rare: 2,
  epic: 3, elite_plus: 3,
  legendary: 4, bundle: 4, all_access: 4,
  enterprise: 5,
};

const TIER_NAMES = {
  0: "Starter", 1: "Pro", 2: "Elite", 3: "Elite+", 4: "Legendary", 5: "Enterprise",
};

const STRATEGIES = [
  { id: "mean_reversion", name: "Conservative", icon: "🛡️", risk: "Low", minTier: "starter", description: "Slow, steady trades focused on consistency. Best for beginners." },
  { id: "ai_weighted", name: "Balanced AI", icon: "🤖", risk: "Medium", minTier: "starter", description: "AI-assisted balance between growth and protection. Recommended default." },
  { id: "momentum", name: "Growth", icon: "📈", risk: "Higher", minTier: "starter", description: "Faster opportunities with larger swings. For moderate risk tolerance." },
  { id: "aggressive", name: "Aggressive", icon: "🔥", risk: "High", minTier: "pro", description: "High volatility with larger upside potential. For experienced traders." },
];

const FEATURE_CATEGORIES = {
  trading: [
    { id: "paper_trading", title: "Demo Mode", icon: <FaShieldAlt />, tier: "starter", description: "Practice with $1,000 virtual funds.", action: "switch_to_paper" },
    { id: "live_crypto", title: "Live Crypto", icon: <FaExchangeAlt />, tier: "pro", description: "Real money crypto trading via OKX.", action: "connect_okx" },
    { id: "live_stocks", title: "Live Stocks", icon: <FaChartLine />, tier: "pro", description: "Real money stock trading via Alpaca.", action: "connect_alpaca" },
  ],
  defi: [
    { id: "staking", title: "Staking", icon: <FaCoins />, tier: "elite", description: "Earn up to 12% APY on IMALI.", route: "/staking" },
    { id: "lending", title: "Lending", icon: <FaUniversity />, tier: "elite", description: "Lend assets and earn yield.", route: "/lending" },
    { id: "nft", title: "NFT Membership", icon: <FaCrown />, tier: "elite", description: "Exclusive NFTs with benefits.", route: "/nft" },
  ],
  advanced: [
    { id: "dex_sniper", title: "DEX Sniper", icon: <FaRocket />, tier: "elite", description: "Early entries on new tokens.", route: "/dex" },
    { id: "futures", title: "Futures", icon: <FaChartLine />, tier: "elite", description: "Leverage trading on futures.", route: "/futures" },
    { id: "referrals", title: "Referrals", icon: <FaGift />, tier: "elite", description: "Earn 20% of referral fees.", route: "/referrals" },
  ],
  governance: [
    { id: "dao", title: "DAO Voting", icon: <FaVoteYea />, tier: "bundle", description: "Vote on platform decisions.", route: "/dao" },
    { id: "liquidity", title: "Liquidity Tools", icon: <FaWater />, tier: "bundle", description: "Buyback, airdrop, treasury.", route: "/liquidity" },
  ],
};

const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5";

function tierValue(tier) { return TIER_ALIASES[String(tier || "starter").toLowerCase()] ?? 0; }
function canAccess(userTier, requiredTier) { return tierValue(userTier) >= tierValue(requiredTier); }
function formatMoney(n) { return `$${Number(n || 0).toFixed(2)}`; }
function formatNumber(n) { return Number(n || 0).toLocaleString(); }

function InfoModal({ isOpen, onClose, title, message, actionLabel, onAction }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-white/10 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><FaTimes /></button>
        </div>
        <p className="text-gray-300 leading-relaxed">{message}</p>
        {actionLabel && onAction && (
          <button onClick={onAction} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500">
            {actionLabel}
          </button>
        )}
        <button onClick={onClose} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white">Close</button>
      </div>
    </div>
  );
}

function UpgradeModal({ isOpen, onClose, onUpgrade, requiredTier }) {
  if (!isOpen) return null;
  const plans = {
    pro: { name: "Pro", price: "$19/mo", features: ["Live Crypto Trading", "Live Stock Trading", "Aggressive Strategy", "AI Analytics"] },
    elite: { name: "Elite", price: "$49/mo", features: ["Staking", "Lending", "NFT Membership", "DEX Sniper", "Futures", "Referrals"] },
    bundle: { name: "Bundle", price: "Custom", features: ["DAO Voting", "Liquidity Tools", "Treasury Access", "Buybacks", "Airdrops"] },
  };
  const plan = plans[requiredTier] || plans.pro;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-white/10 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Upgrade to {plan.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><FaTimes /></button>
        </div>
        <div className="text-center py-2">
          <div className="text-4xl mb-2">{plan.price}</div>
          <div className="text-left mt-4 space-y-2">
            {plan.features.map(f => <div key={f} className="text-sm text-gray-300">✓ {f}</div>)}
          </div>
        </div>
        <button onClick={onUpgrade} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500">Upgrade Now →</button>
        <button onClick={onClose} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white">Maybe Later</button>
      </div>
    </div>
  );
}

function SetupStep({ done, icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-4">
        <div className={done ? "text-emerald-400" : "text-cyan-300"}>{done ? <FaCheckCircle size={24} /> : icon}</div>
        <div className="flex-1"><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-sm text-slate-300">{description}</p>{action}</div>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation, logout } = useAuth();

  const intervalRef = useRef(null);
  const balanceIntervalRef = useRef(null);
  const botStatusIntervalRef = useRef(null);

  // UI State
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("paper");
  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]);
  const [showApiBox, setShowApiBox] = useState(false);
  const [isBotStarting, setIsBotStarting] = useState(false);
  
  // Modal States
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: "", message: "", actionLabel: null, onAction: null });
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, requiredTier: "" });
  
  // Integration State
  const [integrationStatus, setIntegrationStatus] = useState({
    okx_connected: false, okx_mode: "paper", okx_api_key_masked: null, okx_balance: 0,
    alpaca_connected: false, alpaca_mode: "paper", alpaca_api_key_masked: null, alpaca_balance: 0,
    wallet_connected: false, wallet_address_masked: null,
  });
  
  // Bot Status State
  const [botStatus, setBotStatus] = useState(null);
  
  // Paper Trading State
  const [paperBalance, setPaperBalance] = useState(START_BALANCE);
  const [paperProfit, setPaperProfit] = useState(0);
  const [paperWins, setPaperWins] = useState(0);
  const [paperLosses, setPaperLosses] = useState(0);
  const [paperFeed, setPaperFeed] = useState([]);
  
  // Live Trading State
  const [liveStats, setLiveStats] = useState({ pnl: 0, winRate: 0, trades: 0, wins: 0, losses: 0 });
  const [liveFeed, setLiveFeed] = useState([]);
  const [imaliBalance, setImaliBalance] = useState(0);
  
  // API Form State - Simplified (no mode dropdown, always connects as paper)
  const [okxForm, setOkxForm] = useState({ api_key: "", api_secret: "", passphrase: "", region: "us" });
  const [alpacaForm, setAlpacaForm] = useState({ api_key: "", api_secret: "" });

  const userTier = user?.tier || "starter";
  const userTierLevel = tierValue(userTier);
  const canUseLiveMode = canAccess(userTier, "pro");
  
  const hasLiveConnection = useMemo(() => {
    return (integrationStatus.okx_connected && integrationStatus.okx_mode === "live") ||
           (integrationStatus.alpaca_connected && integrationStatus.alpaca_mode === "live");
  }, [integrationStatus]);
  
  // Main button label logic
  const getMainActionLabel = () => {
    if (running) return "Pause Trading";
    if (mode === "paper") return "Start Demo Trading";
    if (!canUseLiveMode) return "Upgrade to Live Trading";
    if (!integrationStatus.okx_connected && !integrationStatus.alpaca_connected) {
      return "Connect Exchange First";
    }
    if (mode === "live" && !hasLiveConnection) {
      return "Enable Live Trading";
    }
    return "Start Live Trading";
  };
  
  const displayTier = TIER_NAMES[userTierLevel] || "Starter";
  const liveTotalBalance = (integrationStatus.okx_balance || 0) + (integrationStatus.alpaca_balance || 0);
  
  const paperWinRate = (paperWins + paperLosses) > 0 ? ((paperWins / (paperWins + paperLosses)) * 100).toFixed(1) : "0.0";
  const liveWinRate = (liveStats.wins + liveStats.losses) > 0 ? ((liveStats.wins / (liveStats.wins + liveStats.losses)) * 100).toFixed(1) : "0.0";
  
  const setupScore = useMemo(() => {
    let score = 25;
    if (integrationStatus.wallet_connected) score += 20;
    if (integrationStatus.okx_connected) score += 25;
    if (integrationStatus.alpaca_connected) score += 25;
    if (canUseLiveMode) score += 5;
    return Math.min(score, 100);
  }, [integrationStatus, canUseLiveMode]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout?.();
      localStorage.removeItem("IMALI_EMAIL");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      sessionStorage.clear();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.clear();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const status = await BotAPI.getIntegrationStatus?.();
      if (status) {
        setIntegrationStatus(prev => ({
          ...prev,
          okx_connected: status.okx_connected || false,
          okx_mode: status.okx_mode || "paper",
          okx_api_key_masked: status.okx_api_key_masked || null,
          alpaca_connected: status.alpaca_connected || false,
          alpaca_mode: status.alpaca_mode || "paper",
          alpaca_api_key_masked: status.alpaca_api_key_masked || null,
          wallet_connected: status.wallet_connected || false,
          wallet_address_masked: status.wallet_address_masked || null,
        }));
      }
    } catch (err) { console.error("Failed to fetch integration status:", err); }
  }, []);

  const fetchExchangeBalances = useCallback(async () => {
    try {
      const balances = await BotAPI.getExchangeBalance?.();
      if (balances) {
        setIntegrationStatus(prev => ({
          ...prev,
          okx_balance: Number(balances.okx) || Number(balances.okx?.total) || 0,
          alpaca_balance: Number(balances.alpaca) || Number(balances.alpaca?.total) || 0,
        }));
      }
    } catch (err) { console.error("Failed to fetch exchange balances:", err); }
  }, []);

  const fetchLiveStats = useCallback(async () => {
    if (!canUseLiveMode) return;
    try {
      const stats = await BotAPI.getLiveTradingStats?.();
      if (stats) {
        setLiveStats({
          pnl: stats.total_pnl || stats.pnl || 0,
          winRate: stats.win_rate || stats.winRate || 0,
          trades: stats.total_trades || stats.trades || 0,
          wins: stats.wins || 0,
          losses: stats.losses || 0,
        });
      }
    } catch (err) { console.error("Failed to fetch live stats:", err); }
  }, [canUseLiveMode]);

  // FIX 1: Updated fetchLiveTrades to handle open positions correctly
  const fetchLiveTrades = useCallback(async () => {
    if (!canUseLiveMode || !hasLiveConnection) return;
    try {
      const response = await BotAPI.getLiveTradeHistory?.(20);
      const trades = response?.trades || response?.data?.trades || [];
      setLiveFeed(
        trades.slice(0, 25).map((t) => {
          const isOpen = t.status === "open";
          const pnl = Number(t.pnl ?? t.pnl_usd ?? 0);
          return {
            id: t.id,
            symbol: t.symbol,
            pnl,
            status: t.status,
            type: isOpen ? "Live Position" : t.label || (pnl >= 0 ? "Take Profit" : "Stop Loss"),
            mode: "live",
            time: new Date(t.closed_at || t.created_at).toLocaleTimeString(),
          };
        })
      );
    } catch (err) {
      console.error("Failed to fetch live trades:", err);
    }
  }, [canUseLiveMode, hasLiveConnection]);

  const fetchImaliBalance = useCallback(async () => {
    try {
      const balance = await BotAPI.getImaliBalance?.();
      setImaliBalance(balance?.balance || balance || 0);
    } catch (err) { console.error("Failed to fetch IMALI balance:", err); }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    try {
      const status = await BotAPI.getTradingBotStatus?.();
      if (status?.success && status.data) {
        const activeBot = status.data.find(b => 
          (b.exchange === 'okx' && integrationStatus.okx_mode === 'live') ||
          (b.exchange === 'alpaca' && integrationStatus.alpaca_mode === 'live')
        );
        if (activeBot) {
          setBotStatus(activeBot);
          if (activeBot.isRunning !== running) {
            setRunning(activeBot.isRunning);
          }
        }
      }
    } catch (err) { console.error("Failed to fetch bot status:", err); }
  }, [running, integrationStatus.okx_mode, integrationStatus.alpaca_mode]);

  const generatePaperTrade = useCallback(() => {
    const assets = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA"];
    const symbol = assets[Math.floor(Math.random() * assets.length)];
    const winProb = currentStrategy.id === "aggressive" ? 0.48 : 0.55;
    const won = Math.random() < winProb;
    const amount = Number(((Math.random() * 25 + 5) * (currentStrategy.id === "aggressive" ? 1.8 : 1)).toFixed(2));
    const pnl = won ? amount : -amount * 0.7;
    const trade = { id: Date.now(), symbol, pnl, type: won ? "Take Profit" : "Stop Loss", mode: "paper", time: new Date().toLocaleTimeString() };
    setPaperFeed(prev => [trade, ...prev.slice(0, 49)]);
    setPaperBalance(prev => prev + pnl);
    setPaperProfit(prev => prev + pnl);
    if (won) setPaperWins(prev => prev + 1);
    else setPaperLosses(prev => prev + 1);
  }, [currentStrategy]);

  // Paper trading interval
  useEffect(() => {
    if (!running || mode !== "paper") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(generatePaperTrade, 2200);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, generatePaperTrade]);

  // FIX 2: Updated live refresh useEffect with proper polling
  useEffect(() => {
    if (mode === "live" && hasLiveConnection) {
      fetchExchangeBalances();
      fetchBotStatus();
      fetchLiveStats();
      fetchLiveTrades();
      balanceIntervalRef.current = setInterval(() => {
        fetchExchangeBalances();
        fetchLiveStats();
        fetchLiveTrades();
      }, BALANCE_REFRESH_INTERVAL);
      botStatusIntervalRef.current = setInterval(fetchBotStatus, BOT_STATUS_INTERVAL);
    }
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (botStatusIntervalRef.current) clearInterval(botStatusIntervalRef.current);
    };
  }, [
    mode,
    hasLiveConnection,
    fetchExchangeBalances,
    fetchBotStatus,
    fetchLiveStats,
    fetchLiveTrades,
  ]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchIntegrationStatus();
      await fetchExchangeBalances();
      await fetchLiveStats();
      await fetchLiveTrades();
      await fetchImaliBalance();
      await fetchBotStatus();
    };
    loadInitialData();
  }, []);

  // Refresh when activation changes
  useEffect(() => {
    if (activation) {
      fetchIntegrationStatus();
      fetchExchangeBalances();
    }
  }, [activation, fetchIntegrationStatus, fetchExchangeBalances]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask first.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const result = await BotAPI.connectWallet?.({ wallet: accounts[0] });
      if (result?.success) {
        await fetchIntegrationStatus();
        alert("Wallet connected successfully!");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      alert("Failed to connect wallet.");
    }
  };

  // Connect OKX (always as paper first)
  const saveOKX = async () => {
    if (!okxForm.api_key || !okxForm.api_secret || !okxForm.passphrase) {
      alert("Please enter all OKX credentials.");
      return;
    }
    
    const result = await BotAPI.connectOKX?.({ 
      api_key: okxForm.api_key, 
      secret_key: okxForm.api_secret, 
      passphrase: okxForm.passphrase,
      mode: "paper",
      region: okxForm.region 
    });
    
    if (result?.success) {
      alert("OKX connected successfully! Your API keys are now in PAPER (demo) mode.");
      await refreshActivation?.(true);
      await fetchIntegrationStatus();
      await fetchExchangeBalances();
      setOkxForm({ api_key: "", api_secret: "", passphrase: "", region: "us" });
      setShowApiBox(false);
    } else {
      alert(result?.error || "Failed to connect OKX.");
    }
  };

  const saveAlpaca = async () => {
    if (!alpacaForm.api_key || !alpacaForm.api_secret) {
      alert("Please enter all Alpaca credentials.");
      return;
    }
    const result = await BotAPI.connectAlpaca?.({ 
      api_key: alpacaForm.api_key, 
      secret_key: alpacaForm.api_secret, 
      mode: "paper" 
    });
    if (result?.success) {
      alert("Alpaca connected successfully!");
      await refreshActivation?.(true);
      await fetchIntegrationStatus();
      await fetchExchangeBalances();
      setAlpacaForm({ api_key: "", api_secret: "" });
      setShowApiBox(false);
    } else {
      alert(result?.error || "Failed to connect Alpaca.");
    }
  };

  // Enable live mode for an exchange
  const enableLiveMode = async (exchange) => {
    if (!canUseLiveMode) {
      setUpgradeModal({ isOpen: true, requiredTier: "pro" });
      return;
    }
    try {
      const result = exchange === 'okx' ? await BotAPI.switchOKXToLive?.() : await BotAPI.switchAlpacaToLive?.();
      if (result?.success) {
        await fetchIntegrationStatus();
        alert(`${exchange.toUpperCase()} is now in LIVE mode. Click "Start Live Trading" to begin.`);
      } else {
        alert(result?.error || `Failed to switch ${exchange} to live mode.`);
      }
    } catch (err) {
      alert(`Error switching ${exchange} to live mode.`);
    }
  };

  const startLiveBot = async () => {
    if (!hasLiveConnection) {
      alert("❌ Cannot start live trading.\n\nNo exchange is in LIVE mode.\n\nEnable LIVE mode on an exchange first.");
      return;
    }
    
    let activeExchange = null;
    if (integrationStatus.okx_connected && integrationStatus.okx_mode === "live") {
      activeExchange = "okx";
    } else if (integrationStatus.alpaca_connected && integrationStatus.alpaca_mode === "live") {
      activeExchange = "alpaca";
    }
    
    if (!activeExchange) {
      alert("No exchange available for live trading");
      return;
    }
    
    const confirmed = window.confirm(
      `⚠️ LIVE TRADING WARNING\n\n` +
      `You are about to start an automated trading bot on ${activeExchange.toUpperCase()}.\n\n` +
      `The bot will:\n` +
      `• Analyze market conditions in real-time\n` +
      `• Execute trades based on ${currentStrategy.name} strategy\n` +
      `• Use STOP LOSS at ~1.5% and TAKE PROFIT at ~1%\n` +
      `• Trade with a percentage of your balance per trade\n\n` +
      `❗ Real money will be used. You can stop the bot anytime.\n\n` +
      `Do you want to proceed?`
    );
    
    if (!confirmed) return;
    
    setIsBotStarting(true);
    try {
      const result = await BotAPI.startTradingBot?.(activeExchange, currentStrategy.id, "live");
      if (result?.success) {
        setRunning(true);
        alert(`✅ Live trading bot started on ${activeExchange.toUpperCase()} with ${currentStrategy.name} strategy!\n\nThe bot is now monitoring the market and will execute trades automatically.`);
        await fetchBotStatus();
        await fetchLiveStats();
        await fetchLiveTrades();
        await fetchExchangeBalances();
      } else {
        alert(result?.error || "Failed to start live trading bot");
      }
    } catch (err) {
      alert("Failed to start bot: " + err.message);
    } finally {
      setIsBotStarting(false);
    }
  };

  const stopLiveBot = async () => {
    const activeExchange = integrationStatus.okx_mode === "live" ? "okx" : 
                          (integrationStatus.alpaca_mode === "live" ? "alpaca" : null);
    if (!activeExchange) {
      alert("No active exchange found");
      return;
    }
    
    try {
      const result = await BotAPI.stopTradingBot?.(activeExchange);
      if (result?.success) {
        setRunning(false);
        alert(`✅ Trading bot stopped on ${activeExchange.toUpperCase()}`);
        await fetchBotStatus();
      } else {
        alert(result?.error || "Failed to stop bot");
      }
    } catch (err) {
      alert("Failed to stop bot: " + err.message);
    }
  };

  // One main button handler
  const startStopBot = async () => {
    if (running) {
      if (mode === "live") {
        await stopLiveBot();
      } else {
        setRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        alert("Demo trading stopped.");
      }
      return;
    }
    
    if (mode === "paper") {
      setRunning(true);
      alert("Demo trading started! The bot will simulate trades for practice.");
      return;
    }
    
    if (!canUseLiveMode) {
      setUpgradeModal({ isOpen: true, requiredTier: "pro" });
      return;
    }
    
    if (!hasLiveConnection) {
      setShowApiBox(true);
      alert("Connect OKX or Alpaca and enable LIVE mode first.\n\nClick 'Enable Live Trading' on your connected exchange.");
      return;
    }
    
    await startLiveBot();
  };

  const handleModeChange = (newMode) => {
    if (newMode === "live" && !canUseLiveMode) {
      setUpgradeModal({ isOpen: true, requiredTier: "pro" });
      return;
    }
    if (running) {
      if (mode === "live") {
        stopLiveBot();
      }
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    setMode(newMode);
  };

  const handleFeatureClick = (feature) => {
    const unlocked = canAccess(userTier, feature.tier);
    
    if (!unlocked) {
      setUpgradeModal({ isOpen: true, requiredTier: feature.tier });
      return;
    }
    
    if (feature.route) {
      navigate(feature.route);
      return;
    }
    
    if (feature.action === "switch_to_paper") {
      handleModeChange("paper");
    } else if (feature.action === "connect_okx") {
      setShowApiBox(true);
      setTimeout(() => document.getElementById("okx-section")?.scrollIntoView({ behavior: "smooth" }), 100);
    } else if (feature.action === "connect_alpaca") {
      setShowApiBox(true);
      setTimeout(() => document.getElementById("alpaca-section")?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Please log in first</h1>
          <button onClick={() => navigate("/login")} className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-bold">Log In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <InfoModal isOpen={infoModal.isOpen} onClose={() => setInfoModal({ isOpen: false, title: "", message: "", actionLabel: null, onAction: null })} title={infoModal.title} message={infoModal.message} actionLabel={infoModal.actionLabel} onAction={infoModal.onAction} />
      <UpgradeModal isOpen={upgradeModal.isOpen} onClose={() => setUpgradeModal({ isOpen: false, requiredTier: "" })} onUpgrade={() => navigate("/pricing")} requiredTier={upgradeModal.requiredTier} />

      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div><p className="text-sm font-bold">IMALI Trading Dashboard</p><p className="text-xs text-white/90">{displayTier} Plan</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white ${
              mode === "live" && hasLiveConnection && running ? "bg-red-500" : 
              mode === "live" && hasLiveConnection ? "bg-yellow-500" : 
              running ? "bg-emerald-500" : "bg-slate-500"
            }`}>
              <FaCircle className={`h-2 w-2 ${running ? "animate-pulse" : ""}`} />
              {mode === "live" && hasLiveConnection && running ? "LIVE ACTIVE" : 
               mode === "live" && hasLiveConnection ? "LIVE READY" : 
               mode === "live" ? "LIVE (NO EXCHANGE)" : 
               running ? "DEMO ACTIVE" : "PAUSED"}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/pricing")}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
              >
                Upgrade
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
              >
                <FaSignOutAlt size={12} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* TOP ROW: Demo Trading vs Live Trading Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${card} ${mode === "paper" ? "border-emerald-500/50" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📝 Demo Trading</h2>
              <button onClick={() => handleModeChange("paper")} className={`text-xs px-3 py-1 rounded-full ${mode === "paper" ? "bg-emerald-600" : "bg-white/10"}`}>Select</button>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{formatMoney(paperBalance)}</div>
            <div className="text-sm text-white/50 mt-1">P&L: <span className={paperProfit >= 0 ? "text-emerald-400" : "text-red-400"}>{paperProfit >= 0 ? "+" : ""}{formatMoney(paperProfit)}</span></div>
            <div className="mt-3 text-xs text-white/40">Win Rate: {paperWinRate}% • Trades: {paperWins + paperLosses}</div>
          </div>

          <div className={`${card} ${mode === "live" ? "border-emerald-500/50" : ""}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">💰 Live Trading</h2>
              <button onClick={() => handleModeChange("live")} className={`text-xs px-3 py-1 rounded-full ${mode === "live" ? "bg-emerald-600" : "bg-white/10"} ${!canUseLiveMode ? "opacity-50" : ""}`} disabled={!canUseLiveMode}>
                {canUseLiveMode ? "Select" : "Upgrade"}
              </button>
            </div>
            <div className="text-3xl font-bold text-cyan-400">{formatMoney(liveTotalBalance)}</div>
            <div className="text-sm text-white/50 mt-1">P&L: <span className={liveStats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>{liveStats.pnl >= 0 ? "+" : ""}{formatMoney(liveStats.pnl)}</span></div>
            <div className="mt-3 text-xs text-white/40">Win Rate: {liveWinRate}% • Trades: {liveStats.trades}</div>
          </div>
        </div>

        {/* Setup Progress */}
        <div className={`${card} border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5`}>
          <h2 className="mb-4 text-2xl font-bold">Your Setup Progress</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <SetupStep done={true} icon={<FaShieldAlt size={24} />} title="1. Demo Trading" description="Start here. Virtual $1,000." />
            <SetupStep done={integrationStatus.okx_connected || integrationStatus.alpaca_connected} icon={<FaPlug size={24} />} title="2. Connect API" description="Add OKX or Alpaca keys." action={
              <button onClick={() => setShowApiBox(true)} className="mt-3 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500">Connect API</button>
            } />
            <SetupStep done={integrationStatus.wallet_connected} icon={<FaWallet size={24} />} title="3. Connect Wallet" description="MetaMask for DeFi." action={
              <button onClick={connectWallet} className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-500">
                {integrationStatus.wallet_connected ? "Wallet Connected" : "Connect MetaMask"}
              </button>
            } />
            <SetupStep done={hasLiveConnection && canUseLiveMode} icon={<FaRocket size={24} />} title="4. Go Live" description="Enable LIVE mode when ready." />
          </div>
          <div className="mt-5"><div className="mb-2 flex justify-between text-xs text-white/60"><span>Ready to Trade Live</span><span>{setupScore}%</span></div><div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${setupScore}%` }} /></div></div>
        </div>

        {/* Step 1: Choose Strategy */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-4"><FaBrain className="text-cyan-300" /><h2 className="text-xl font-bold">Step 1: Choose Your Strategy</h2></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STRATEGIES.map((item) => {
              const unlocked = canAccess(userTier, item.minTier);
              const active = currentStrategy.id === item.id;
              return (
                <button key={item.id} onClick={() => unlocked && !running && setCurrentStrategy(item)} disabled={!unlocked || running}
                  className={`rounded-2xl border p-4 text-left transition ${active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"} ${(!unlocked || running) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                  <div className="text-3xl">{item.icon}</div>
                  <div className="mt-2 font-bold">{item.name}</div>
                  <div className="text-xs text-white/50">{item.risk} Risk</div>
                  <p className="mt-2 text-xs text-slate-400">{item.description}</p>
                  {!unlocked && <div className="mt-2 text-xs text-amber-400">🔒 Requires {TIER_NAMES[tierValue(item.minTier)]}</div>}
                  {active && <div className="mt-2 text-xs text-cyan-400">✓ Active</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Connect Exchange */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-4"><FaPlug className="text-cyan-300" /><h2 className="text-xl font-bold">Step 2: Connect Exchange</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-2xl">🟡</span><span className="font-bold">OKX</span></div>
                <div className="flex items-center gap-2">
                  {integrationStatus.okx_connected && (
                    <span className={`text-xs px-2 py-1 rounded-full ${integrationStatus.okx_mode === "live" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {integrationStatus.okx_mode === "live" ? "LIVE" : "Demo"}
                    </span>
                  )}
                  <span className={`text-sm ${integrationStatus.okx_connected ? "text-emerald-400" : "text-white/50"}`}>
                    {integrationStatus.okx_connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>
              {integrationStatus.okx_connected && (
                <div className="text-2xl font-bold text-cyan-400">{formatMoney(integrationStatus.okx_balance)}</div>
              )}
              {/* OKX Connection Status Display */}
              {integrationStatus.okx_connected && (
                <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  ✅ OKX API connected
                  {integrationStatus.okx_api_key_masked && (
                    <div className="mt-1 text-white/50">
                      Key: {integrationStatus.okx_api_key_masked}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {!integrationStatus.okx_connected && (
                  <button onClick={() => setShowApiBox(true)} className="text-sm bg-cyan-600 px-3 py-1 rounded-lg hover:bg-cyan-500">Connect</button>
                )}
                {integrationStatus.okx_connected && integrationStatus.okx_mode === "paper" && canUseLiveMode && (
                  <button onClick={() => enableLiveMode("okx")} className="text-sm bg-amber-600 px-3 py-1 rounded-lg hover:bg-amber-500">Enable Live Trading</button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-2xl">🦙</span><span className="font-bold">Alpaca</span></div>
                <div className="flex items-center gap-2">
                  {integrationStatus.alpaca_connected && (
                    <span className={`text-xs px-2 py-1 rounded-full ${integrationStatus.alpaca_mode === "live" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {integrationStatus.alpaca_mode === "live" ? "LIVE" : "Demo"}
                    </span>
                  )}
                  <span className={`text-sm ${integrationStatus.alpaca_connected ? "text-emerald-400" : "text-white/50"}`}>
                    {integrationStatus.alpaca_connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>
              {integrationStatus.alpaca_connected && (
                <div className="text-2xl font-bold text-blue-400">{formatMoney(integrationStatus.alpaca_balance)}</div>
              )}
              {/* Alpaca Connection Status Display */}
              {integrationStatus.alpaca_connected && (
                <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  ✅ Alpaca API connected
                  {integrationStatus.alpaca_api_key_masked && (
                    <div className="mt-1 text-white/50">
                      Key: {integrationStatus.alpaca_api_key_masked}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {!integrationStatus.alpaca_connected && (
                  <button onClick={() => setShowApiBox(true)} className="text-sm bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-500">Connect</button>
                )}
                {integrationStatus.alpaca_connected && integrationStatus.alpaca_mode === "paper" && canUseLiveMode && (
                  <button onClick={() => enableLiveMode("alpaca")} className="text-sm bg-amber-600 px-3 py-1 rounded-lg hover:bg-amber-500">Enable Live Trading</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* API Connection Box - Simplified (no mode dropdown) */}
        {showApiBox && (
          <div className={`${card} grid gap-5 lg:grid-cols-2`}>
            <div id="okx-section">
              <h3 className="mb-3 text-lg font-bold flex items-center gap-2"><FaExchangeAlt /> Connect OKX</h3>
              <p className="text-xs text-white/50 mb-2">⚠️ US users must select United States region</p>
              <select 
                value={okxForm.region} 
                onChange={(e) => setOkxForm({ ...okxForm, region: e.target.value })}
                className="w-full rounded-xl bg-black/40 p-3 text-white border border-white/10 mb-2"
              >
                <option value="us">🇺🇸 United States</option>
                <option value="international">🌍 International</option>
                <option value="eea">🇪🇺 European Economic Area</option>
              </select>
              <input 
                placeholder="API Key" 
                value={okxForm.api_key} 
                onChange={(e) => setOkxForm({ ...okxForm, api_key: e.target.value })} 
                className="mb-2 w-full rounded-xl bg-black/40 p-3 text-white" 
              />
              <input 
                placeholder="Secret Key" 
                type="password" 
                value={okxForm.api_secret} 
                onChange={(e) => setOkxForm({ ...okxForm, api_secret: e.target.value })} 
                className="mb-2 w-full rounded-xl bg-black/40 p-3 text-white" 
              />
              <input 
                placeholder="Passphrase" 
                type="password" 
                value={okxForm.passphrase} 
                onChange={(e) => setOkxForm({ ...okxForm, passphrase: e.target.value })} 
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white" 
              />
              <button onClick={saveOKX} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold">Connect OKX (Demo Mode)</button>
              <p className="text-xs text-white/40 mt-2">Your API keys will start in DEMO mode. You can enable LIVE mode later.</p>
            </div>
            
            <div id="alpaca-section">
              <h3 className="mb-3 text-lg font-bold flex items-center gap-2"><FaChartLine /> Connect Alpaca</h3>
              <p className="text-xs text-white/50 mb-2">Alpaca paper trading account recommended first</p>
              <input placeholder="API Key" value={alpacaForm.api_key} onChange={(e) => setAlpacaForm({ ...alpacaForm, api_key: e.target.value })} className="mb-2 w-full rounded-xl bg-black/40 p-3 text-white" />
              <input placeholder="Secret Key" type="password" value={alpacaForm.api_secret} onChange={(e) => setAlpacaForm({ ...alpacaForm, api_secret: e.target.value })} className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white" />
              <button onClick={saveAlpaca} className="rounded-xl bg-blue-600 px-4 py-2 font-bold">Connect Alpaca (Demo Mode)</button>
              <p className="text-xs text-white/40 mt-2">Your API keys will start in DEMO mode. You can enable LIVE mode later.</p>
            </div>
          </div>
        )}

        {/* Step 4: Start Trading - Giant Button */}
        <div className="text-center">
          <button
            onClick={startStopBot}
            disabled={isBotStarting}
            className={`text-2xl font-bold px-12 py-6 rounded-2xl transition transform hover:scale-105 ${
              isBotStarting ? "bg-gray-600 cursor-not-allowed" :
              running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isBotStarting ? <FaSpinner className="inline mr-3 animate-spin" /> : (running ? <FaPause className="inline mr-3" /> : <FaPlay className="inline mr-3" />)}
            {getMainActionLabel()}
          </button>
          {mode === "live" && !hasLiveConnection && (
            <p className="mt-3 text-sm text-amber-400"><FaInfoCircle className="inline mr-1" /> Connect and enable LIVE mode on an exchange first</p>
          )}
          {mode === "live" && botStatus && botStatus.isRunning && (
            <p className="mt-2 text-xs text-green-400">Bot is actively monitoring the market</p>
          )}
        </div>

        {/* Trade Feed */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className={card}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Trade Feed</h2>
                {running && <div className="flex items-center gap-2 text-sm text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Bot Running</div>}
              </div>
              {!paperFeed.length && !liveFeed.length ? (
                <div className="py-16 text-center text-white/30"><div className="mb-3 text-5xl">🤖</div><p>Start trading to see activity here</p></div>
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                  {(mode === "live" ? liveFeed : paperFeed).slice(0, 15).map((trade) => (
                    <div key={trade.id} className="flex justify-between items-center p-3 rounded-xl border border-white/10 bg-black/20">
                      <div><span className="font-bold">{trade.symbol}</span><div className="text-xs text-white/40">{trade.type} • {trade.time}</div></div>
                      {/* FIX 3: Updated trade display for open positions */}
                      <div className={`font-bold ${
                        trade.status === "open"
                          ? "text-cyan-400"
                          : trade.pnl >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}>
                        {trade.status === "open"
                          ? "OPEN"
                          : `${trade.pnl >= 0 ? "+" : ""}${formatMoney(trade.pnl)}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={card}>
              <h2 className="text-xl font-bold mb-3">Connection Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-black/20 rounded-xl"><span>🟡 OKX</span><span className={integrationStatus.okx_connected ? "text-emerald-400" : "text-white/50"}>{integrationStatus.okx_connected ? `Connected (${integrationStatus.okx_mode === "live" ? "LIVE" : "Demo"})` : "Not Connected"}</span></div>
                <div className="flex justify-between p-3 bg-black/20 rounded-xl"><span>🦙 Alpaca</span><span className={integrationStatus.alpaca_connected ? "text-emerald-400" : "text-white/50"}>{integrationStatus.alpaca_connected ? `Connected (${integrationStatus.alpaca_mode === "live" ? "LIVE" : "Demo"})` : "Not Connected"}</span></div>
                <div className="flex justify-between p-3 bg-black/20 rounded-xl"><span>🦊 MetaMask</span><span className={integrationStatus.wallet_connected ? "text-emerald-400" : "text-white/50"}>{integrationStatus.wallet_connected ? "Connected" : "Not Connected"}</span></div>
              </div>
              <button onClick={() => setShowApiBox(true)} className="mt-4 w-full rounded-xl bg-cyan-600 py-2 font-bold hover:bg-cyan-500">Manage Connections</button>
            </div>
            <div className={card}>
              <h2 className="text-xl font-bold mb-3">IMALI Balance</h2>
              <div className="text-3xl font-bold text-yellow-400">{formatNumber(imaliBalance)} IMALI</div>
              <button onClick={() => navigate("/buy-imali")} className="mt-3 w-full rounded-xl bg-purple-600 py-2 font-bold text-sm hover:bg-purple-500">Buy IMALI</button>
            </div>
          </div>
        </div>

        {/* Step 5: Feature Hub */}
        <div className={card}>
          <h2 className="text-2xl font-bold mb-6">Step 4: Explore Features</h2>
          
          <div className="mb-8">
            <h3 className="text-lg font-bold text-emerald-400 mb-3">📊 Trading</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {FEATURE_CATEGORIES.trading.map(feature => {
                const unlocked = canAccess(userTier, feature.tier);
                return (
                  <button key={feature.id} onClick={() => handleFeatureClick(feature)}
                    className={`p-4 rounded-xl text-left transition ${unlocked ? "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20" : "bg-black/20 border border-white/10 opacity-70"}`}>
                    <div className="flex items-center gap-2 mb-2"><div className="text-xl">{feature.icon}</div><div className="font-bold">{feature.title}</div>{!unlocked && <FaLock size={12} className="text-amber-400 ml-auto" />}</div>
                    <div className="text-xs text-slate-400">{feature.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-purple-400 mb-3">🔗 DeFi</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {FEATURE_CATEGORIES.defi.map(feature => {
                const unlocked = canAccess(userTier, feature.tier);
                return (
                  <button key={feature.id} onClick={() => handleFeatureClick(feature)}
                    className={`p-4 rounded-xl text-left transition ${unlocked ? "bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20" : "bg-black/20 border border-white/10 opacity-70"}`}>
                    <div className="flex items-center gap-2 mb-2"><div className="text-xl">{feature.icon}</div><div className="font-bold">{feature.title}</div>{!unlocked && <FaLock size={12} className="text-amber-400 ml-auto" />}</div>
                    <div className="text-xs text-slate-400">{feature.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-orange-400 mb-3">⚡ Advanced</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {FEATURE_CATEGORIES.advanced.map(feature => {
                const unlocked = canAccess(userTier, feature.tier);
                return (
                  <button key={feature.id} onClick={() => handleFeatureClick(feature)}
                    className={`p-4 rounded-xl text-left transition ${unlocked ? "bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20" : "bg-black/20 border border-white/10 opacity-70"}`}>
                    <div className="flex items-center gap-2 mb-2"><div className="text-xl">{feature.icon}</div><div className="font-bold">{feature.title}</div>{!unlocked && <FaLock size={12} className="text-amber-400 ml-auto" />}</div>
                    <div className="text-xs text-slate-400">{feature.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-3">🏛️ Governance</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {FEATURE_CATEGORIES.governance.map(feature => {
                const unlocked = canAccess(userTier, feature.tier);
                return (
                  <button key={feature.id} onClick={() => handleFeatureClick(feature)}
                    className={`p-4 rounded-xl text-left transition ${unlocked ? "bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20" : "bg-black/20 border border-white/10 opacity-70"}`}>
                    <div className="flex items-center gap-2 mb-2"><div className="text-xl">{feature.icon}</div><div className="font-bold">{feature.title}</div>{!unlocked && <FaLock size={12} className="text-amber-400 ml-auto" />}</div>
                    <div className="text-xs text-slate-400">{feature.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pb-4 text-center text-xs text-white/30">
          Demo trading uses simulated funds. Live trading requires connected accounts and carries risk.
        </div>
      </div>
    </div>
  );
}
