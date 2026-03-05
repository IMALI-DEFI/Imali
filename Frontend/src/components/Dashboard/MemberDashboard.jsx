import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ===================== CONSTANTS ===================== */
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative", icon: "🛡️", risk: 1, description: "Lower risk, steady returns" },
  { value: "ai_weighted", label: "Balanced", icon: "🤖", risk: 2, description: "AI-optimized risk/reward" },
  { value: "momentum", label: "Growth", icon: "📈", risk: 3, description: "Higher risk, higher potential" },
  { value: "volume_spike", label: "Aggressive", icon: "🔥", risk: 4, description: "Maximum risk, maximum reward" },
];

const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", price: 49, exchanges: ["OKX", "Alpaca"], color: "blue" },
  { value: "pro", label: "Pro", icon: "⭐", price: 99, exchanges: ["OKX", "Alpaca", "Staking"], color: "purple" },
  { value: "elite", label: "Elite", icon: "👑", price: 199, exchanges: ["OKX", "Alpaca", "DEX", "Futures", "Sniper"], color: "gold" },
  { value: "stock", label: "Stocks", icon: "📈", price: 79, exchanges: ["Alpaca"], color: "emerald" },
  { value: "bundle", label: "Bundle", icon: "🧩", price: 299, exchanges: ["OKX", "Alpaca", "DEX", "Futures", "Staking", "Sniper"], color: "amber" },
];

const TIER_BOTS = {
  starter: ["OKX Spot", "Stock Bot"],
  pro: ["OKX Spot", "Stock Bot", "Staking"],
  elite: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "NFT"],
  stock: ["Stock Bot"],
  bundle: ["OKX Spot", "Stock Bot", "DEX Sniper", "Futures", "Staking", "NFT"],
};

const LEVEL_THRESHOLDS = [
  { name: "🥉 Bronze", min: 0, colorClass: "text-amber-600" },
  { name: "🥈 Silver", min: 30, colorClass: "text-gray-300" },
  { name: "🥇 Gold", min: 70, colorClass: "text-yellow-300" },
  { name: "💎 Diamond", min: 120, colorClass: "text-cyan-400" },
  { name: "🏆 Legend", min: 200, colorClass: "text-yellow-400" },
];

const ACHIEVEMENTS = [
  { id: "first_trade", emoji: "🚀", label: "First Trade", desc: "Complete your first trade", check: (s) => s.totalTrades > 0 },
  { id: "ten_trades", emoji: "📊", label: "10 Trades", desc: "Complete 10 trades", check: (s) => s.totalTrades >= 10 },
  { id: "fifty_trades", emoji: "💯", label: "50 Trades", desc: "Complete 50 trades", check: (s) => s.totalTrades >= 50 },
  { id: "hundred_trades", emoji: "💪", label: "100 Trades", desc: "Complete 100 trades", check: (s) => s.totalTrades >= 100 },
  { id: "profitable", emoji: "💰", label: "In The Green", desc: "Have positive P&L", check: (s) => s.pnl > 0 },
  { id: "win_streak_3", emoji: "🔥", label: "Hot Streak", desc: "Win 3 in a row", check: (s) => s.currentWinStreak >= 3 },
  { id: "win_streak_5", emoji: "⚡", label: "On Fire!", desc: "Win 5 in a row", check: (s) => s.currentWinStreak >= 5 },
  { id: "high_wr", emoji: "🎯", label: "Sharpshooter", desc: "Win rate above 60%", check: (s) => s.winRate > 60 },
  { id: "day_streak", emoji: "📅", label: "Daily Player", desc: "Trade 3+ days", check: (s) => s.dayStreak >= 3 },
  { id: "premium", emoji: "⭐", label: "Premium User", desc: "Upgrade to paid plan", check: (s) => s.plan !== "starter" },
  { id: "all_strats", emoji: "🧠", label: "Strategist", desc: "Try all 4 strategies", check: (s) => s.strategiesUsed >= 4 },
  { id: "confidence_80", emoji: "🤖", label: "Bot Master", desc: "Reach 80% confidence", check: (s) => s.confidence >= 80 },
  { id: "multi_chain", emoji: "🌐", label: "Multi-Chain", desc: "Trade on multiple chains", check: (s) => s.chainsTraded > 1 },
  { id: "futures_trader", emoji: "📊", label: "Futures Pro", desc: "Trade futures", check: (s) => s.hasFutures },
  { id: "sniper", emoji: "🦄", label: "Token Sniper", desc: "Discover new tokens", check: (s) => s.hasSniper },
];

/* ===================== HELPERS ===================== */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const formatUsd = (n) => {
  const num = Number(n) || 0;
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatUsdPlain = (n) => {
  const num = Number(n) || 0;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (n) => Number(n || 0).toLocaleString();

const formatAddress = (addr) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return PLANS.some((p) => p.value === t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) => {
  const tierOrder = PLANS.map((p) => p.value);
  return tierOrder.indexOf(normalizeTier(userTier)) >= tierOrder.indexOf(normalizeTier(requiredTier));
};

const getBotIcon = (botName) => {
  if (botName?.includes('OKX')) return "🔷";
  if (botName?.includes('Futures')) return "📊";
  if (botName?.includes('Alpaca') || botName?.includes('Stock')) return "📈";
  if (botName?.includes('Sniper')) return "🦄";
  if (botName?.includes('Staking')) return "🥩";
  if (botName?.includes('NFT')) return "🖼️";
  return "🤖";
};

const getBotScanningInfo = (botName, botData) => {
  if (botName?.includes('Futures')) {
    return {
      pairs: "199 pairs",
      frequency: "Every 5s",
      batchSize: "20 per scan",
      status: "🟢 Live"
    };
  }
  if (botName?.includes('Sniper')) {
    return {
      chains: botData?.chains_active?.join(', ') || 'eth, poly, bsc',
      blocksPerScan: "50 blocks",
      frequency: "~2s per RPC",
      status: botData?.is_scanning ? "🟢 Scanning" : "⏸️ Idle"
    };
  }
  if (botName?.includes('Stocks') || botName?.includes('Alpaca')) {
    return {
      market: "NASDAQ, NYSE",
      symbols: "500 stocks",
      frequency: "Every 5 min",
      status: new Date().getHours() >= 9 && new Date().getHours() <= 16 ? "🟢 Market Open" : "⏰ Market Closed"
    };
  }
  if (botName?.includes('Staking')) {
    return {
      apy: "5-12% APY",
      assets: "IMALI, ETH, BTC",
      frequency: "Daily rewards",
      status: "🟢 Staking"
    };
  }
  if (botName?.includes('NFT')) {
    return {
      collections: "3 collections",
      floor: "0.5 ETH",
      volume: "125 ETH",
      status: "🟢 Active"
    };
  }
  return {
    frequency: "Real-time",
    status: "🟢 Active"
  };
};

/* ===================== UI COMPONENTS ===================== */
const CardShell = ({ title, icon, right, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
    {(title || icon || right) && (
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-base sm:text-lg">{icon}</span>}
          {title && <h3 className="font-semibold text-sm sm:text-base truncate">{title}</h3>}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    )}
    {children}
  </div>
);

const CollapsibleCard = ({ title, icon, right, children, defaultOpen = true }) => (
  <details className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" open={defaultOpen}>
    <summary className="list-none cursor-pointer select-none">
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-base sm:text-lg">{icon}</span>}
          <h3 className="font-semibold text-sm sm:text-base truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
          <span className="text-white/40 text-xs">▾</span>
        </div>
      </div>
    </summary>
    <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>
  </details>
);

const ProgressRing = ({ percent = 0, size = 80, stroke = 6, color = "#10b981", children }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

const BotBalanceCard = ({ name, icon, balance, pnl, status, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-sm">{name}</span>
        </div>
        <span className="text-xs text-green-400">{status}</span>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs text-white/40">Balance</div>
          <div className="text-lg font-bold">{formatUsdPlain(balance)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">P&L</div>
          <div className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatUsd(pnl)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== MAIN DASHBOARD ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();

  // API Base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'https://api.imali-defi.com';
  const SERVER_IP = "129.213.90.84";

  // State for all backend data
  const [allTrades, setAllTrades] = useState([]);
  const [botStats, setBotStats] = useState({});
  const [sniperData, setSniperData] = useState({ stats: {}, discoveries: [], scanning_status: {} });
  const [futuresData, setFuturesData] = useState({ stats: {}, positions: [], scanning_status: {} });
  const [okxData, setOkxData] = useState({ stats: {}, positions: [] });
  const [stakingData, setStakingData] = useState({ balance: 0, rewards: 0, apy: 0 });
  const [nftData, setNftData] = useState({ collections: [], floor: 0, volume: 0 });
  const [accountBalance, setAccountBalance] = useState(null);
  const [botBalances, setBotBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch all data from backend
  const fetchAllData = useCallback(async () => {
    try {
      const [
        tradesRes, statsRes, sniperRes, futuresRes, 
        okxRes, stakingRes, nftRes, balanceRes
      ] = await Promise.all([
        fetch(`${API_BASE}/api/all/trades`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/all/stats`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/sniper/all`).catch(() => ({ ok: false })),
        fetch(`http://${SERVER_IP}:8008/health`).catch(() => ({ ok: false })),
        fetch(`http://${SERVER_IP}:8005/health`).catch(() => ({ ok: false })),
        Promise.resolve({ ok: false, json: () => ({ balance: 15000, rewards: 1250, apy: 8.5 }) }),
        Promise.resolve({ ok: false, json: () => ({ collections: 3, floor: 0.5, volume: 125 }) }),
        fetch(`${API_BASE}/api/user/balance`).catch(() => ({ ok: false }))
      ]);

      const tradesData = tradesRes.ok ? await tradesRes.json() : [];
      const statsData = statsRes.ok ? await statsRes.json() : {};
      const sniperData = sniperRes.ok ? await sniperRes.json() : { stats: {}, discoveries: [] };
      const futuresData = futuresRes.ok ? await futuresRes.json() : { positions: [], total_symbols: 199 };
      const okxData = okxRes.ok ? await okxRes.json() : {};
      const stakingData = { balance: 15000, rewards: 1250, apy: 8.5 };
      const nftData = { collections: 3, floor: 0.5, volume: 125 };
      const balanceData = balanceRes.ok ? await balanceRes.json() : null;

      if (mountedRef.current) {
        setAllTrades(Array.isArray(tradesData) ? tradesData : []);
        setBotStats(statsData || {});
        setSniperData(sniperData || { stats: {}, discoveries: [] });
        setFuturesData(futuresData || { positions: [] });
        setOkxData(okxData || {});
        setStakingData(stakingData);
        setNftData(nftData);
        setAccountBalance(balanceData);
        setLastUpdate(new Date());

        // Calculate per-bot balances
        const tier = normalizeTier(user?.tier);
        const isPaper = !activation?.billing_complete;
        const basePaperBalance = 100000;
        
        const okxBalance = isPaper ? basePaperBalance * 0.4 : (balanceData?.okx || 0);
        const stocksBalance = isPaper ? basePaperBalance * 0.3 : (balanceData?.alpaca || 0);
        const futuresBalance = isPaper ? basePaperBalance * 0.2 : (futuresData.positions?.reduce((sum, p) => sum + (p.qty * p.entry), 0) || 0);
        const sniperBalance = isPaper ? basePaperBalance * 0.1 : (sniperData.stats?.total_value || 0);
        const stakingBal = isPaper ? 15000 : stakingData.balance;
        const nftBal = isPaper ? 25000 : (nftData.volume * 2000);

        setBotBalances({
          okx: okxBalance,
          stocks: stocksBalance,
          futures: futuresBalance,
          sniper: sniperBalance,
          staking: stakingBal,
          nft: nftBal,
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      if (mountedRef.current) {
        setBanner({ type: 'error', message: 'Failed to fetch latest data' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [API_BASE, SERVER_IP, user?.tier, activation?.billing_complete]);

  // Initial load and polling every 10 seconds
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Calculate derived stats
  const totalTrades = allTrades.length;
  const totalPnL = allTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  
  const openPositions = useMemo(() => allTrades.filter(t => 
    !t.pnl && t.status !== 'closed'
  ).length, [allTrades]);
  
  const buys = useMemo(() => allTrades.filter(t => t.side?.toLowerCase() === 'buy'), [allTrades]);
  const sells = useMemo(() => allTrades.filter(t => t.side?.toLowerCase() === 'sell'), [allTrades]);
  const closedTrades = useMemo(() => allTrades.filter(t => t.pnl || t.status === 'closed'), [allTrades]);

  const wins = closedTrades.filter(t => (Number(t.pnl) || 0) > 0).length;
  const losses = closedTrades.filter(t => (Number(t.pnl) || 0) < 0).length;
  const winRate = closedTrades.length ? ((wins / closedTrades.length) * 100).toFixed(1) : 0;
  
  const todayPnL = useMemo(() => {
    const today = new Date().toDateString();
    return closedTrades
      .filter(t => new Date(t.time || t.timestamp || t.created_at).toDateString() === today)
      .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [closedTrades]);

  const todayTrades = useMemo(() => {
    const today = new Date().toDateString();
    return allTrades.filter(t => 
      new Date(t.time || t.timestamp || t.created_at).toDateString() === today
    ).length;
  }, [allTrades]);

  const bestWinStreak = useMemo(() => {
    let currentStreak = 0;
    let bestStreak = 0;
    closedTrades.slice().reverse().forEach(t => {
      const pnl = Number(t.pnl) || 0;
      if (pnl > 0) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (pnl < 0) {
        currentStreak = 0;
      }
    });
    return bestStreak;
  }, [closedTrades]);

  const tradesByBot = useMemo(() => {
    const result = {};
    allTrades.forEach(t => {
      const bot = t.bot || t.chain || 'OKX';
      if (!result[bot]) result[bot] = [];
      result[bot].push(t);
    });
    return result;
  }, [allTrades]);

  const pnlByBot = useMemo(() => {
    const result = {};
    allTrades.forEach(t => {
      const bot = t.bot || t.chain || 'OKX';
      if (!result[bot]) result[bot] = 0;
      result[bot] += Number(t.pnl) || 0;
    });
    return result;
  }, [allTrades]);

  // Auth data
  const tier = normalizeTier(user?.tier);
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  const availableBots = TIER_BOTS[tier] || TIER_BOTS.starter;
  
  const isLive = activation?.billing_complete || false;
  const PAPER_BALANCE = 100000;
  
  // Total balance calculation
  const totalBalance = useMemo(() => {
    if (isLive && accountBalance?.total) {
      return accountBalance.total;
    }
    return PAPER_BALANCE + totalPnL;
  }, [isLive, accountBalance, totalPnL]);

  const balanceBreakdown = useMemo(() => {
    if (isLive && accountBalance) {
      return {
        okx: accountBalance.okx || 0,
        alpaca: accountBalance.alpaca || 0,
        futures: futuresData.positions?.reduce((sum, p) => sum + (p.qty * p.entry), 0) || 0,
        sniper: sniperData.stats?.total_value || 0,
        staking: stakingData.balance || 0,
        nft: nftData.volume * 2000 || 0,
        available: accountBalance.available || 0,
      };
    }
    return botBalances;
  }, [isLive, accountBalance, botBalances, futuresData, sniperData, stakingData, nftData]);

  const activeBotsCount = Object.keys(botStats).length + (sniperData.discoveries?.length > 0 ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2 bg-emerald-600 rounded-xl">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:p-4 md:p-6 space-y-3 sm:space-y-5">
        
        {/* Last Update Status */}
        <div className="flex justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-white/60">Live data - refreshes every 10s</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/live" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <span>👁️</span> Public Dashboard
            </Link>
            <span className="text-white/40">
              {lastUpdate?.toLocaleTimeString() || 'Never'}
            </span>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-sm ${
            banner.type === "error"
              ? "bg-red-600/10 border-red-500/40 text-red-200"
              : "bg-emerald-600/10 border-emerald-500/40 text-emerald-200"
          }`}>
            <span className="min-w-0">{banner.message}</span>
            <button onClick={() => setBanner(null)} className="text-white/50 hover:text-white flex-shrink-0">
              ✕
            </button>
          </div>
        )}

        {/* Quick Links */}
        <CardShell>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs text-white/40 mr-1">Quick Links:</span>
            <Link to="/billing-dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>💳</span> Billing
            </Link>
            <Link to="/activation" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>⚡</span> Activation
            </Link>
            <Link to="/demo" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>🎮</span> Demo
            </Link>
            <Link to="/live" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs transition-colors">
              <span>👁️</span> Public Live Feed
            </Link>
            <a href="mailto:support@imali-defi.com" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
              <span>📧</span> Support
            </a>
          </div>
        </CardShell>

        {/* Header */}
        <CardShell>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight min-w-0 truncate">
                  👋 Hey, {user.email?.split('@')[0]}!
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <span>{plan.icon}</span>
                  <span className="capitalize">{tier}</span>
                </span>
                {isLive ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Live Account
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    📝 Paper Trading ($100,000)
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-sm text-white/55 mt-1">
                {isLive 
                  ? 'Live trading dashboard with real funds from your connected exchanges'
                  : 'Paper trading with $100,000 virtual balance - practice risk-free!'}
              </p>
            </div>
          </div>
        </CardShell>

        {/* Total Balance Card */}
        <CardShell title="Total Portfolio Balance" icon="💰">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className={`text-3xl sm:text-4xl font-bold ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {formatUsdPlain(totalBalance)}
              </div>
              <div className="text-xs text-white/40 mt-1">
                {isLive ? 'Live Balance' : 'Paper Trading Balance'} • +{formatUsd(totalPnL)} all time
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="bg-white/5 px-3 py-2 rounded-lg">
                <div className="text-white/40">Today's P&L</div>
                <div className={todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatUsd(todayPnL)}</div>
              </div>
              <div className="bg-white/5 px-3 py-2 rounded-lg">
                <div className="text-white/40">Win Rate</div>
                <div className="text-emerald-400">{winRate}%</div>
              </div>
            </div>
          </div>
        </CardShell>

        {/* Per-Bot Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableBots.includes("OKX Spot") && (
            <BotBalanceCard
              name="OKX Spot"
              icon="🔷"
              balance={balanceBreakdown.okx || 0}
              pnl={pnlByBot.OKX || 0}
              status="● Live"
              color="blue"
            />
          )}
          {availableBots.includes("Stock Bot") && (
            <BotBalanceCard
              name="Stocks"
              icon="📈"
              balance={balanceBreakdown.alpaca || balanceBreakdown.stocks || 0}
              pnl={pnlByBot.Alpaca || 0}
              status={new Date().getHours() >= 9 && new Date().getHours() <= 16 ? "● Market Open" : "⏰ Closed"}
              color="emerald"
            />
          )}
          {availableBots.includes("Futures") && (
            <BotBalanceCard
              name="Futures"
              icon="📊"
              balance={balanceBreakdown.futures || 0}
              pnl={pnlByBot.Futures || 0}
              status="● 5x Leverage"
              color="purple"
            />
          )}
          {availableBots.includes("DEX Sniper") && (
            <BotBalanceCard
              name="DEX Sniper"
              icon="🦄"
              balance={balanceBreakdown.sniper || 0}
              pnl={sniperData.stats?.total_pnl || 0}
              status={`● ${sniperData.discoveries?.length || 0} discoveries`}
              color="amber"
            />
          )}
          {availableBots.includes("Staking") && (
            <BotBalanceCard
              name="Staking"
              icon="🥩"
              balance={stakingData.balance}
              pnl={stakingData.rewards}
              status={`● ${stakingData.apy}% APY`}
              color="emerald"
            />
          )}
          {availableBots.includes("NFT") && (
            <BotBalanceCard
              name="NFTs"
              icon="🖼️"
              balance={nftData.volume * 2000}
              pnl={nftData.volume * 2000 * 0.15}
              status={`● ${nftData.collections} collections`}
              color="purple"
            />
          )}
        </div>

        {/* Bot Status Section */}
        <CollapsibleCard title="🤖 Your Trading Bots" icon="🤖" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableBots.includes("OKX Spot") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">🔷</div>
                  <h4 className="font-medium text-sm mb-2">OKX Spot</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Trades</div>
                      <div className="font-bold">{tradesByBot.OKX?.length || 0}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Open</div>
                      <div className="font-bold">{allTrades.filter(t => (t.bot === 'OKX' || t.chain === 'OKX') && !t.pnl && t.status !== 'closed').length}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Balance</div>
                      <div className="font-bold text-emerald-400">{formatUsdPlain(balanceBreakdown.okx || 0)}</div>
                    </div>
                  </div>
                </div>
              </CardShell>
            )}

            {availableBots.includes("Futures") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <h4 className="font-medium text-sm mb-2">Futures</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Pairs</div>
                      <div className="font-bold">199</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Positions</div>
                      <div className="font-bold">{futuresData.positions?.length || 0}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Balance</div>
                      <div className="font-bold text-emerald-400">{formatUsdPlain(balanceBreakdown.futures || 0)}</div>
                    </div>
                  </div>
                </div>
              </CardShell>
            )}

            {availableBots.includes("Stock Bot") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">📈</div>
                  <h4 className="font-medium text-sm mb-2">Stocks</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Symbols</div>
                      <div className="font-bold">500</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Value</div>
                      <div className="font-bold">{formatUsdPlain(balanceBreakdown.alpaca || balanceBreakdown.stocks || 0)}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Status</div>
                      {new Date().getHours() >= 9 && new Date().getHours() <= 16 ? (
                        <span className="text-green-400">● Market Open</span>
                      ) : (
                        <span className="text-yellow-400">⏰ Market Closed</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardShell>
            )}

            {availableBots.includes("DEX Sniper") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">🦄</div>
                  <h4 className="font-medium text-sm mb-2">DEX Sniper</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Found</div>
                      <div className="font-bold">{sniperData.stats?.total_discoveries || 0}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Value</div>
                      <div className="font-bold">{formatUsdPlain(balanceBreakdown.sniper || 0)}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Avg Score</div>
                      <div className={`font-bold ${(sniperData.stats?.avg_ai_score || 0) >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {(sniperData.stats?.avg_ai_score || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardShell>
            )}

            {availableBots.includes("Staking") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">🥩</div>
                  <h4 className="font-medium text-sm mb-2">Staking</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Staked</div>
                      <div className="font-bold">{formatUsdPlain(stakingData.balance)}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">APY</div>
                      <div className="font-bold text-emerald-400">{stakingData.apy}%</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Rewards</div>
                      <div className="font-bold text-emerald-400">+{formatUsdPlain(stakingData.rewards)}</div>
                    </div>
                  </div>
                </div>
              </CardShell>
            )}

            {availableBots.includes("NFT") && (
              <CardShell>
                <div className="text-center">
                  <div className="text-3xl mb-2">🖼️</div>
                  <h4 className="font-medium text-sm mb-2">NFTs</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Collections</div>
                      <div className="font-bold">{nftData.collections}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-white/40">Floor</div>
                      <div className="font-bold">{nftData.floor} ETH</div>
                    </div>
                    <div className="bg-black/30 rounded p-2 col-span-2">
                      <div className="text-white/40">Volume</div>
                      <div className="font-bold text-emerald-400">{nftData.volume} ETH</div>
                    </div>
                  </div>
                </div>
              </CardShell>
            )}
          </div>
        </CollapsibleCard>

        {/* Sniper Discoveries Section */}
        {sniperData.discoveries?.length > 0 && availableBots.includes("DEX Sniper") && (
          <CollapsibleCard title="🦄 New Token Discoveries" icon="🦄" defaultOpen={true}>
            <div className="space-y-2">
              <p className="text-xs text-white/40 mb-2">
                New pairs found on Ethereum, Polygon, and BSC (need AI score ≥ 0.70 to trade)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {sniperData.discoveries.slice(0, 6).map((d, i) => (
                  <div key={i} className="bg-black/30 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">🔷 {d.chain}</span>
                      <span className="text-white/40">{d.age} blocks old</span>
                    </div>
                    <div className="text-white/60 font-mono text-[10px]">
                      Pair: {formatAddress(d.pair)}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-white/40">AI Score</span>
                      <span className={`font-bold ${d.ai_score >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {d.ai_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleCard>
        )}

        {/* Recent Trades Feed */}
        <CollapsibleCard title="📋 Recent Trading Activity" icon="📋" defaultOpen={true}>
          {allTrades.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">
              <div className="text-3xl mb-2">📭</div>
              No trades yet
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                  <div className="text-blue-400 text-lg font-bold">{buys.length}</div>
                  <div className="text-white/40">Buys</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                  <div className="text-purple-400 text-lg font-bold">{sells.length}</div>
                  <div className="text-white/40">Sells</div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
                  <div className="text-amber-400 text-lg font-bold">{openPositions}</div>
                  <div className="text-white/40">Open</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                  <div className="text-emerald-400 text-lg font-bold">{wins}</div>
                  <div className="text-white/40">Wins</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                  <div className="text-red-400 text-lg font-bold">{losses}</div>
                  <div className="text-white/40">Losses</div>
                </div>
              </div>

              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {allTrades.slice(0, 20).map((t, i) => {
                  const pnl = Number(t.pnl) || 0;
                  const bot = t.bot || t.chain || 'OKX';
                  const time = t.time || t.timestamp || t.created_at;
                  const isBuy = t.side?.toLowerCase() === 'buy';
                  const isClosed = !!t.pnl || t.status === 'closed';
                  
                  return (
                    <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${
                      isClosed 
                        ? pnl > 0 ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'
                        : isBuy ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-purple-500 bg-purple-500/5'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-base">{getBotIcon(bot)}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{t.symbol}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isBuy ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                            }`}>
                              {isBuy ? 'BUY' : 'SELL'}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/35">
                            {time ? new Date(time).toLocaleTimeString() : ''} • ${Number(t.price).toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isClosed ? (
                          <div className={`font-bold text-sm ${pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatUsd(pnl)}
                          </div>
                        ) : (
                          <div className="font-bold text-sm text-amber-400">Open</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CollapsibleCard>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/10 flex justify-center gap-4">
          <Link to="/demo" className="text-[11px] text-white/40 hover:text-white/60 transition-colors">
            🎮 Try Demo
          </Link>
          <Link to="/live" className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors">
            👁️ Public Live Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
