// src/components/Dashboard/MemberDashboard.jsx - PRODUCTION READY VERSION
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay,
  FaPause,
  FaRedo,
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaBrain,
  FaWallet,
  FaExchangeAlt,
  FaLock,
  FaCheckCircle,
  FaCrown,
  FaPlug,
  FaUniversity,
  FaCoins,
  FaVoteYea,
  FaGift,
  FaWater,
  FaRocket,
  FaCircle,
} from "react-icons/fa";

const START_BALANCE = 1000;
const BALANCE_REFRESH_INTERVAL = 15000; // 15 seconds
const TRADE_FETCH_INTERVAL = 30000; // 30 seconds

// TIER ALIASES - Handles all database tier names
const TIER_ALIASES = {
  starter: 0,
  free: 0,
  trial: 0,
  pro: 1,
  common: 1,
  elite: 2,
  rare: 2,
  epic: 3,
  elite_plus: 3,
  legendary: 4,
  bundle: 4,
  all_access: 4,
  enterprise: 5,
};

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slower trades focused on consistency.",
    color: "emerald",
    winRate: 0.62,
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between growth and protection.",
    color: "blue",
    winRate: 0.56,
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Faster opportunities with larger swings.",
    color: "orange",
    winRate: 0.52,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "Extreme Risk",
    description: "High volatility with larger upside potential.",
    color: "red",
    winRate: 0.48,
  },
];

const FEATURE_CARDS = [
  {
    title: "Paper Trading",
    icon: <FaShieldAlt />,
    tier: "starter",
    description: "Practice with virtual funds before using real money.",
    path: "/dashboard",
  },
  {
    title: "Live Stock Trading",
    icon: <FaChartLine />,
    tier: "pro",
    description: "Connect Alpaca and allow IMALI to assist with stock trades.",
    path: "/trading/stocks",
  },
  {
    title: "Live Crypto Trading",
    icon: <FaExchangeAlt />,
    tier: "pro",
    description: "Connect OKX and trade supported crypto markets.",
    path: "/trading/crypto",
  },
  {
    title: "Advanced AI Strategies",
    icon: <FaBrain />,
    tier: "pro",
    description: "Use smarter strategy logic, risk checks, and trade analysis.",
    path: "/strategies",
  },
  {
    title: "DEX Sniper",
    icon: <FaRocket />,
    tier: "elite",
    description: "Use wallet-based DeFi trading tools for supported tokens.",
    path: "/dex",
  },
  {
    title: "Futures Trading",
    icon: <FaChartLine />,
    tier: "elite",
    description: "Access advanced futures tools when enabled.",
    path: "/futures",
  },
  {
    title: "IMALI Staking",
    icon: <FaCoins />,
    tier: "elite",
    description: "Stake IMALI tokens and view reward activity.",
    path: "/staking",
  },
  {
    title: "Lending",
    icon: <FaUniversity />,
    tier: "elite",
    description: "Access lending and borrowing features when available.",
    path: "/lending",
  },
  {
    title: "NFT Membership",
    icon: <FaCrown />,
    tier: "elite",
    description: "Unlock NFT-based membership benefits.",
    path: "/nft",
  },
  {
    title: "Referral Rewards",
    icon: <FaGift />,
    tier: "elite",
    description: "Earn rewards for inviting new users.",
    path: "/referrals",
  },
  {
    title: "DAO Voting",
    icon: <FaVoteYea />,
    tier: "bundle",
    description: "Vote on platform decisions and future IMALI features.",
    path: "/dao",
  },
  {
    title: "Liquidity Tools",
    icon: <FaWater />,
    tier: "bundle",
    description: "Access liquidity, buyback, airdrop, and treasury modules.",
    path: "/liquidity",
  },
];

const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5";

// Helper functions
function tierValue(tier) {
  const normalizedTier = String(tier || "starter").toLowerCase();
  return TIER_ALIASES[normalizedTier] ?? 0;
}

function canAccess(userTier, requiredTier) {
  const requiredNormalized = requiredTier === "pro" ? "pro" : 
                             requiredTier === "elite" ? "elite" : 
                             requiredTier === "bundle" ? "bundle" : "starter";
  return tierValue(userTier) >= tierValue(requiredNormalized);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

// Safer balance parser - handles multiple response formats
function parseBalance(balanceData) {
  if (!balanceData) return 0;
  if (typeof balanceData === 'number') return balanceData;
  if (typeof balanceData === 'string') {
    const parsed = parseFloat(balanceData);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof balanceData === 'object') {
    return Number(balanceData.total) || 
           Number(balanceData.balance) || 
           Number(balanceData.available) ||
           Number(balanceData.equity) || 0;
  }
  return 0;
}

function FeatureGate({ userTier, requiredTier, children, lockedText, path }) {
  const unlocked = canAccess(userTier, requiredTier);
  const navigate = useNavigate();

  if (unlocked) return children;

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 opacity-90">
      <div className="flex items-center gap-3 text-amber-300">
        <FaLock />
        <span className="font-bold">Locked</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        {lockedText || `Available on ${requiredTier} and higher.`}
      </p>
      <button
        onClick={() => navigate("/pricing")}
        className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
      >
        Upgrade to Unlock
      </button>
    </div>
  );
}

function SetupStep({ done, icon, title, description, action }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start gap-4">
        <div className={done ? "text-emerald-400" : "text-cyan-300"}>
          {done ? <FaCheckCircle size={24} /> : icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

// Live Status Badge Component
function LiveStatusBadge({ mode, running, hasLiveConnections }) {
  let color, text, icon;
  
  if (running && mode === "live" && hasLiveConnections) {
    color = "bg-red-500";
    text = "LIVE TRADING";
    icon = <FaCircle className="h-2 w-2 animate-pulse" />;
  } else if (running && mode === "paper") {
    color = "bg-emerald-500";
    text = "PAPER MODE";
    icon = <FaCircle className="h-2 w-2" />;
  } else if (mode === "live" && !hasLiveConnections) {
    color = "bg-amber-500";
    text = "LIVE (NO CONNECTION)";
    icon = <FaCircle className="h-2 w-2" />;
  } else {
    color = "bg-slate-500";
    text = "PAUSED";
    icon = <FaCircle className="h-2 w-2" />;
  }
  
  return (
    <div className={`inline-flex items-center gap-2 rounded-full ${color} px-3 py-1 text-xs font-bold text-white`}>
      {icon}
      {text}
    </div>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();

  const intervalRef = useRef(null);
  const balanceIntervalRef = useRef(null);
  const tradeIntervalRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("paper");
  const [strategy, setStrategy] = useState(STRATEGIES[1]);

  // Paper trading state
  const [paperBalance, setPaperBalance] = useState(START_BALANCE);
  const [paperProfit, setPaperProfit] = useState(0);
  const [paperWins, setPaperWins] = useState(0);
  const [paperLosses, setPaperLosses] = useState(0);
  const [paperFeed, setPaperFeed] = useState([]);
  
  // Live trading state
  const [liveStats, setLiveStats] = useState({
    pnl: 0,
    winRate: 0,
    trades: 0,
    wins: 0,
    losses: 0,
  });
  const [liveFeed, setLiveFeed] = useState([]);
  const [isBotActive, setIsBotActive] = useState(false);

  const [wallet, setWallet] = useState("");
  const [showApiBox, setShowApiBox] = useState(false);
  
  // IMALI token balance
  const [imaliBalance, setImaliBalance] = useState(0);
  
  // Real exchange balances
  const [realBalances, setRealBalances] = useState({ okx: 0, alpaca: 0, total: 0 });
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const [okx, setOkx] = useState({
    api_key: "",
    api_secret: "",
    passphrase: "",
    mode: "paper",
  });

  const [alpaca, setAlpaca] = useState({
    api_key: "",
    api_secret: "",
    mode: "paper",
  });

  const userTier = user?.tier || "starter";
  
  // Normalize tier for display
  const displayTier = useMemo(() => {
    const tier = userTier.toLowerCase();
    if (tier === 'common') return 'Pro';
    if (tier === 'rare') return 'Elite';
    if (tier === 'epic') return 'Elite+';
    if (tier === 'legendary') return 'Legendary';
    if (tier === 'enterprise') return 'Enterprise';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }, [userTier]);

  const canUseLiveMode = canAccess(userTier, "pro");
  
  // Check if any live exchange is connected
  const hasLiveConnections = useMemo(() => {
    return (activation?.okx_connected && activation?.okx_mode === "live") ||
           (activation?.alpaca_connected && activation?.alpaca_mode === "live");
  }, [activation]);

  // Combined live balance - NO fallback to paper balance
  const combinedLiveBalance = useMemo(() => {
    return realBalances.okx + realBalances.alpaca;
  }, [realBalances]);

  // Display balance based on mode - NO fallback
  const displayBalance = mode === "live" ? combinedLiveBalance : paperBalance;
  const displayProfit = mode === "live" ? liveStats.pnl : paperProfit;
  const displayTrades = mode === "live" ? liveStats.trades : (paperWins + paperLosses);
  const displayWins = mode === "live" ? liveStats.wins : paperWins;
  const displayLosses = mode === "live" ? liveStats.losses : paperLosses;
  const displayFeed = mode === "live" ? liveFeed : paperFeed;
  
  const totalTrades = displayWins + displayLosses;
  const winRate = useMemo(() => {
    if (!totalTrades) return "0.0";
    return ((displayWins / totalTrades) * 100).toFixed(1);
  }, [displayWins, totalTrades]);

  const setupScore = useMemo(() => {
    let score = 25;
    if (wallet) score += 20;
    if (activation?.okx_connected) score += 25;
    if (activation?.alpaca_connected) score += 25;
    if (canUseLiveMode) score += 5;
    return Math.min(score, 100);
  }, [wallet, activation, canUseLiveMode]);

  // Fetch real exchange balances
  const fetchRealBalances = useCallback(async () => {
    if (!activation?.okx_connected && !activation?.alpaca_connected) return;
    
    setIsLoadingBalances(true);
    try {
      const response = await BotAPI.getExchangeBalance?.();
      if (response) {
        const okxBalance = parseBalance(response.okx) || parseBalance(response.data?.okx) || 0;
        const alpacaBalance = parseBalance(response.alpaca) || parseBalance(response.data?.alpaca) || 0;
        
        setRealBalances({
          okx: okxBalance,
          alpaca: alpacaBalance,
          total: okxBalance + alpacaBalance,
        });
      }
    } catch (err) {
      console.error("Failed to fetch exchange balances:", err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [activation]);

  // Fetch live trading stats
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
    } catch (err) {
      console.error("Failed to fetch live stats:", err);
    }
  }, [canUseLiveMode]);

  // Fetch live trade feed
  const fetchLiveTrades = useCallback(async () => {
    if (!canUseLiveMode || !hasLiveConnections) return;
    try {
      const trades = await BotAPI.getLiveTradeHistory?.(20);
      if (trades?.trades) {
        setLiveFeed(trades.trades.slice(0, 25).map(t => ({
          id: t.id,
          symbol: t.symbol,
          pnl: t.pnl || t.pnl_usd || 0,
          type: t.pnl >= 0 ? "Take Profit" : "Stop Loss",
          mode: "live",
          time: new Date(t.created_at).toLocaleTimeString(),
        })));
      }
    } catch (err) {
      console.error("Failed to fetch live trades:", err);
    }
  }, [canUseLiveMode, hasLiveConnections]);

  // Fetch IMALI token balance
  const fetchImaliBalance = useCallback(async () => {
    try {
      const balance = await BotAPI.getImaliBalance?.();
      setImaliBalance(balance?.balance || balance || 0);
    } catch (err) {
      console.error("Failed to fetch IMALI balance:", err);
    }
  }, []);

  // Load wallet from backend on mount
  const loadWalletStatus = useCallback(async () => {
    try {
      const status = await BotAPI.getIntegrationStatus?.();
      if (status?.wallet_address_masked) {
        setWallet(status.wallet_address_masked);
      } else if (status?.wallet_address) {
        setWallet(status.wallet_address);
      }
    } catch (err) {
      console.error("Failed to load wallet status:", err);
    }
  }, []);

  // Generate paper trade (simulated)
  const generatePaperTrade = useCallback(() => {
    const assets = ["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA"];
    const symbol = assets[Math.floor(Math.random() * assets.length)];
    const won = Math.random() < strategy.winRate;
    const amount = Number(((Math.random() * 25 + 5) * (strategy.id === "aggressive" ? 1.8 : 1)).toFixed(2));
    const pnl = won ? amount : -amount * 0.7;

    const trade = {
      id: Date.now(),
      symbol,
      pnl,
      type: won ? "Take Profit" : "Stop Loss",
      mode: "paper",
      time: new Date().toLocaleTimeString(),
    };

    setPaperFeed((prev) => [trade, ...prev.slice(0, 49)]);
    setPaperBalance((prev) => prev + pnl);
    setPaperProfit((prev) => prev + pnl);

    if (won) setPaperWins((prev) => prev + 1);
    else setPaperLosses((prev) => prev + 1);
  }, [strategy]);

  // Start/stop paper simulation
  useEffect(() => {
    if (!running || mode !== "paper") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(generatePaperTrade, 2200);
    return () => clearInterval(intervalRef.current);
  }, [running, mode, generatePaperTrade]);

  // Auto-refresh balances
  useEffect(() => {
    if (mode === "live" && hasLiveConnections) {
      balanceIntervalRef.current = setInterval(fetchRealBalances, BALANCE_REFRESH_INTERVAL);
      tradeIntervalRef.current = setInterval(fetchLiveTrades, TRADE_FETCH_INTERVAL);
    }
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (tradeIntervalRef.current) clearInterval(tradeIntervalRef.current);
    };
  }, [mode, hasLiveConnections, fetchRealBalances, fetchLiveTrades]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        loadWalletStatus(),
        fetchRealBalances(),
        fetchLiveStats(),
        fetchLiveTrades(),
        fetchImaliBalance(),
      ]);
    };
    loadInitialData();
  }, [loadWalletStatus, fetchRealBalances, fetchLiveStats, fetchLiveTrades, fetchImaliBalance]);

  // Refresh data when activation changes
  useEffect(() => {
    if (activation?.okx_connected || activation?.alpaca_connected) {
      fetchRealBalances();
      fetchLiveStats();
      fetchLiveTrades();
    }
  }, [activation, fetchRealBalances, fetchLiveStats, fetchLiveTrades]);

  const resetPaperDashboard = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPaperBalance(START_BALANCE);
    setPaperProfit(0);
    setPaperWins(0);
    setPaperLosses(0);
    setPaperFeed([]);
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask was not detected. Please install MetaMask first.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];
      
      const result = await BotAPI.connectWallet?.({ wallet: walletAddress });
      if (result?.success) {
        await loadWalletStatus();
        alert("Wallet connected successfully!");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  const saveOKX = async () => {
    if (!okx.api_key || !okx.api_secret || !okx.passphrase) {
      alert("Please enter your OKX API key, secret, and passphrase.");
      return;
    }

    const result = await BotAPI.connectOKX?.(okx);

    if (result?.success) {
      alert("OKX connected successfully!");
      await refreshActivation?.(true);
      await fetchRealBalances();
      setOkx({ api_key: "", api_secret: "", passphrase: "", mode: "paper" });
    } else {
      alert(result?.error || "Could not connect OKX. Please check your credentials.");
    }
  };

  const saveAlpaca = async () => {
    if (!alpaca.api_key || !alpaca.api_secret) {
      alert("Please enter your Alpaca API key and secret.");
      return;
    }

    const result = await BotAPI.connectAlpaca?.(alpaca);

    if (result?.success) {
      alert("Alpaca connected successfully!");
      await refreshActivation?.(true);
      await fetchRealBalances();
      setAlpaca({ api_key: "", api_secret: "", mode: "paper" });
    } else {
      alert(result?.error || "Could not connect Alpaca. Please check your credentials.");
    }
  };

  const startStopBot = async () => {
    const newRunningState = !running;
    
    if (mode === "live") {
      // Live mode - call backend API
      if (newRunningState && !hasLiveConnections) {
        alert("Cannot start live trading. No exchange is in LIVE mode. Please switch an exchange to LIVE mode first.");
        return;
      }
      
      const result = await BotAPI.toggleTrading?.(newRunningState);
      if (result?.success !== false) {
        setRunning(newRunningState);
        setIsBotActive(newRunningState);
        alert(newRunningState ? "Live trading started!" : "Live trading stopped.");
        if (newRunningState) {
          await fetchLiveStats();
          await fetchLiveTrades();
        }
      } else {
        alert(result?.error || "Failed to toggle live trading.");
      }
    } else {
      // Paper mode - local simulation
      setRunning(newRunningState);
      if (!newRunningState && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const handleModeChange = (newMode) => {
    if (newMode === "live" && !canUseLiveMode) {
      alert("Live trading requires Pro plan or higher. Please upgrade.");
      navigate("/pricing");
      return;
    }
    
    // Stop any running bot when switching modes
    if (running) {
      if (mode === "live") {
        BotAPI.toggleTrading?.(false);
      }
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    
    setMode(newMode);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold">Please log in first</h1>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 font-bold"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="text-sm font-bold">Member Dashboard</p>
              <p className="text-xs text-white/90">
                Practice first. Connect when ready. Go live in minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LiveStatusBadge mode={mode} running={running} hasLiveConnections={hasLiveConnections} />
            <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              Plan: {displayTier}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Setup Path */}
        <div className={`${card} border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-indigo-500/5`}>
          <h2 className="mb-4 text-2xl font-bold">Your Simple Setup Path</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <SetupStep
              done={true}
              icon={<FaShieldAlt size={24} />}
              title="1. Practice"
              description="Use paper trading first with virtual funds."
            />

            <SetupStep
              done={activation?.okx_connected || activation?.alpaca_connected}
              icon={<FaPlug size={24} />}
              title="2. Connect API"
              description="Connect OKX for crypto or Alpaca for stocks."
              action={
                <button
                  onClick={() => setShowApiBox((prev) => !prev)}
                  className="mt-3 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500"
                >
                  Connect API
                </button>
              }
            />

            <SetupStep
              done={!!wallet}
              icon={<FaWallet size={24} />}
              title="3. Connect Wallet"
              description="Connect MetaMask for DeFi features."
              action={
                <button
                  onClick={connectWallet}
                  className="mt-3 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-500"
                >
                  {wallet ? "Wallet Connected" : "Connect MetaMask"}
                </button>
              }
            />

            <SetupStep
              done={setupScore >= 75}
              icon={<FaRocket size={24} />}
              title="4. Go Live"
              description="Switch from paper to live when ready."
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-white/60">
              <span>Trading Readiness</span>
              <span>{setupScore}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{ width: `${setupScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* API Connection Box */}
        {showApiBox && (
          <div className={`${card} grid gap-5 lg:grid-cols-2`}>
            <div>
              <h3 className="mb-3 text-xl font-bold">Connect OKX</h3>

              <select
                value={okx.mode}
                onChange={(e) => setOkx({ ...okx, mode: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              >
                <option value="paper">Paper OKX</option>
                <option value="live">Live OKX</option>
              </select>

              <input
                placeholder="OKX API Key"
                value={okx.api_key}
                onChange={(e) => setOkx({ ...okx, api_key: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="OKX Secret"
                type="password"
                value={okx.api_secret}
                onChange={(e) => setOkx({ ...okx, api_secret: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="OKX Passphrase"
                type="password"
                value={okx.passphrase}
                onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />

              <button onClick={saveOKX} className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold">
                Save OKX Keys
              </button>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold">Connect Alpaca</h3>

              <select
                value={alpaca.mode}
                onChange={(e) => setAlpaca({ ...alpaca, mode: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              >
                <option value="paper">Paper Alpaca</option>
                <option value="live">Live Alpaca</option>
              </select>

              <input
                placeholder="Alpaca API Key"
                value={alpaca.api_key}
                onChange={(e) => setAlpaca({ ...alpaca, api_key: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />
              <input
                placeholder="Alpaca Secret"
                type="password"
                value={alpaca.api_secret}
                onChange={(e) => setAlpaca({ ...alpaca, api_secret: e.target.value })}
                className="mb-3 w-full rounded-xl bg-black/40 p-3 text-white"
              />

              <button onClick={saveAlpaca} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold">
                Save Alpaca Keys
              </button>
            </div>
          </div>
        )}

        {/* Main Trading Card */}
        <div className={`${card} overflow-hidden`}>
          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">
                <FaRobot />
                IMALI Trading Control Center
              </div>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
                Move From Demo to Live Trading Without a Learning Curve
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Use the same simple dashboard from demo mode, then connect OKX,
                Alpaca, or MetaMask when you are ready.
                <span className="mt-2 block text-emerald-400">
                  Paper mode is for practice. Live mode uses connected accounts.
                </span>
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={startStopBot}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-bold transition ${
                    running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {running ? <FaPause /> : <FaPlay />}
                  {running ? "Pause Bot" : mode === "live" ? "Start Live Bot" : "Start Paper Bot"}
                </button>

                {mode === "paper" && (
                  <button
                    onClick={resetPaperDashboard}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-3 font-bold hover:bg-white/20"
                  >
                    <FaRedo />
                    Reset Paper
                  </button>
                )}

                <select
                  value={mode}
                  onChange={(e) => handleModeChange(e.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/40 px-6 py-3 font-bold text-white"
                >
                  <option value="paper">Paper Trading</option>
                  <option value="live" disabled={!canUseLiveMode}>
                    Live Trading {!canUseLiveMode && "(Pro Required)"}
                  </option>
                </select>
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <FaShieldAlt className="text-emerald-400" />
                Beginner tip: test in paper mode before switching to live mode.
              </p>
              
              {mode === "live" && !hasLiveConnections && (
                <p className="mt-2 flex items-center gap-2 text-sm text-amber-400">
                  <span>⚠️</span>
                  No exchange in LIVE mode. Go to Connections and switch an exchange to LIVE mode.
                </p>
              )}
            </div>

            <div className="w-full max-w-sm">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                <div className="text-sm text-white/50">
                  {mode === "live" ? "Combined Live Balance" : "Paper Account Balance"}
                </div>

                <div
                  className={`mt-2 text-5xl font-extrabold ${
                    displayBalance >= START_BALANCE ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatMoney(displayBalance)}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-white/50">P&L</span>
                  <span className={`font-bold ${displayProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {displayProfit >= 0 ? "+" : ""}
                    {formatMoney(displayProfit)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-white/50">Trades</div>
                    <div className="text-xl font-bold">{displayTrades}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-white/50">Win Rate</div>
                    <div className="text-xl font-bold">{winRate}%</div>
                  </div>
                </div>

                {/* Connected Exchange Balances */}
                {(activation?.okx_connected || activation?.alpaca_connected) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-white/40 mb-2">Connected Exchange Balances</div>
                    {activation?.okx_connected && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-cyan-400">🟢</span>
                          <span>OKX:</span>
                        </div>
                        <span className="font-bold text-cyan-300">
                          {isLoadingBalances ? "Loading..." : formatMoney(realBalances.okx)}
                        </span>
                      </div>
                    )}
                    {activation?.alpaca_connected && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-blue-400">🟢</span>
                          <span>Alpaca:</span>
                        </div>
                        <span className="font-bold text-blue-300">
                          {isLoadingBalances ? "Loading..." : formatMoney(realBalances.alpaca)}
                        </span>
                      </div>
                    )}
                    {(activation?.okx_connected || activation?.alpaca_connected) && (
                      <div className="flex justify-between text-sm pt-2 mt-1 border-t border-white/5">
                        <span>Total Live:</span>
                        <span className="font-bold text-emerald-300">
                          {isLoadingBalances ? "Loading..." : formatMoney(combinedLiveBalance)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* IMALI Token Balance */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <FaCoins className="text-yellow-400" />
                      <span>IMALI Balance:</span>
                    </div>
                    <span className="font-bold text-yellow-400">
                      {formatNumber(imaliBalance)} IMALI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className={card}>
          <div className="mb-5 flex items-center gap-3">
            <FaBrain className="text-cyan-300" />
            <h2 className="text-2xl font-bold">Select A Strategy</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STRATEGIES.map((item) => {
              const active = strategy.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => !running && setStrategy(item)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } ${running ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div className="text-4xl">{item.icon}</div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <span className="text-xs text-white/50">{item.risk}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trade Feed & Connections */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className={card}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaChartLine className="text-emerald-300" />
                  <h2 className="text-2xl font-bold">Trade Feed</h2>
                  <span className="text-xs text-white/40">({mode === "live" ? "Live" : "Paper"} Mode)</span>
                </div>

                {running && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Bot Running
                  </div>
                )}
              </div>

              {!displayFeed.length ? (
                <div className="py-20 text-center text-white/30">
                  <div className="mb-4 text-6xl">🤖</div>
                  <p>Start the bot to see trading activity here.</p>
                  {mode === "live" && !hasLiveConnections && (
                    <p className="mt-2 text-sm text-amber-400">Connect and switch an exchange to LIVE mode first.</p>
                  )}
                </div>
              ) : (
                <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                  {displayFeed.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div>
                        <div className="font-bold">{trade.symbol}</div>
                        <div className="text-xs text-white/40">
                          {trade.type} • {trade.mode.toUpperCase()} • {trade.time}
                        </div>
                      </div>

                      <div className={`text-lg font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}
                        {formatMoney(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={card}>
              <div className="mb-4 flex items-center gap-2">
                <FaShieldAlt className="text-emerald-300" />
                <h2 className="text-xl font-bold">Beginner Safety</h2>
              </div>

              <ul className="space-y-3 text-sm leading-7 text-slate-300">
                <li>✅ Start with paper trading</li>
                <li>✅ Connect API only when ready</li>
                <li>✅ Switch live mode on manually</li>
                <li>✅ Use strategy controls</li>
                <li>✅ Connect wallet for DeFi tools</li>
              </ul>
            </div>

            <div className={card}>
              <h2 className="mb-4 text-xl font-bold">Connections</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">🟡</span>
                    <span>OKX</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activation?.okx_connected && activation?.okx_mode === "live" && (
                      <span className="text-xs text-purple-400">LIVE</span>
                    )}
                    <span className={activation?.okx_connected ? "text-emerald-400" : "text-white/50"}>
                      {activation?.okx_connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">🦙</span>
                    <span>Alpaca</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activation?.alpaca_connected && activation?.alpaca_mode === "live" && (
                      <span className="text-xs text-purple-400">LIVE</span>
                    )}
                    <span className={activation?.alpaca_connected ? "text-emerald-400" : "text-white/50"}>
                      {activation?.alpaca_connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between rounded-2xl bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">🦊</span>
                    <span>MetaMask</span>
                  </div>
                  <span className={wallet ? "text-emerald-400" : "text-white/50"}>
                    {wallet ? "Connected" : "Not Connected"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowApiBox(true)}
                className="mt-5 w-full rounded-2xl bg-cyan-600 px-5 py-3 font-bold hover:bg-cyan-500"
              >
                Manage Connections
              </button>
            </div>
          </div>
        </div>

        {/* IMALI Features Grid */}
        <div className={card}>
          <div className="mb-5 flex items-center gap-3">
            <FaCrown className="text-yellow-300" />
            <h2 className="text-2xl font-bold">IMALI Features</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURE_CARDS.map((feature) => {
              const unlocked = canAccess(userTier, feature.tier);

              return (
                <button
                  key={feature.title}
                  onClick={() => unlocked && navigate(feature.path)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    unlocked 
                      ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer" 
                      : "border-white/10 bg-black/20 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={unlocked ? "text-emerald-300" : "text-white/50"}>
                      {feature.icon}
                    </div>
                    {!unlocked && <FaLock className="text-amber-300" />}
                  </div>

                  <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>

                  <div className="mt-4 text-xs font-bold uppercase text-white/50">
                    {unlocked ? "Click to Open" : `${feature.tier}+ Required`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Staking & Lending */}
        <div className="grid gap-5 lg:grid-cols-2">
          <FeatureGate
            userTier={userTier}
            requiredTier="elite"
            lockedText="Staking is available on Elite and higher."
          >
            <button
              onClick={() => navigate("/staking")}
              className={`${card} text-left hover:border-emerald-500/50 transition cursor-pointer`}
            >
              <div className="flex items-center gap-3 mb-3">
                <FaCoins className="text-yellow-400 text-2xl" />
                <h2 className="text-2xl font-bold">IMALI Staking</h2>
              </div>
              <p className="text-sm text-slate-300">
                Stake IMALI tokens and track rewards from your dashboard.
              </p>
              <div className="mt-4 text-emerald-400 text-sm font-bold">→ Open Staking</div>
            </button>
          </FeatureGate>

          <FeatureGate
            userTier={userTier}
            requiredTier="elite"
            lockedText="Lending is available on Elite and higher."
          >
            <button
              onClick={() => navigate("/lending")}
              className={`${card} text-left hover:border-blue-500/50 transition cursor-pointer`}
            >
              <div className="flex items-center gap-3 mb-3">
                <FaUniversity className="text-blue-400 text-2xl" />
                <h2 className="text-2xl font-bold">Lending</h2>
              </div>
              <p className="text-sm text-slate-300">
                Access lending and borrowing tools when enabled.
              </p>
              <div className="mt-4 text-blue-400 text-sm font-bold">→ Open Lending</div>
            </button>
          </FeatureGate>
        </div>

        {/* Upgrade CTA */}
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-8 text-center">
          <div className="mb-4 text-5xl">🚀</div>
          <h2 className="text-3xl font-extrabold">Ready to unlock more?</h2>
          <p className="mx-auto mt-4 max-w-3xl leading-8 text-slate-300">
                Upgrade when you are ready for live trading, advanced automation,
                wallet tools, staking, lending, and premium IMALI features.
              </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/pricing")}
              className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold transition hover:bg-emerald-500"
            >
              View Pricing →
            </button>

            <button
              onClick={() => navigate("/support")}
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold transition hover:bg-white/10"
            >
              Need Help?
            </button>
          </div>
        </div>

        <div className="pb-4 text-center text-xs text-white/30">
          Paper trading uses simulated funds. Live trading requires connected accounts and carries risk.
        </div>
      </div>
    </div>
  );
}