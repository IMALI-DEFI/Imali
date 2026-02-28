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
  { value: "elite", label: "Elite", icon: "👑", price: 199, exchanges: ["OKX", "Alpaca", "DEX", "Futures"], color: "gold" },
  { value: "stock", label: "Stocks", icon: "📈", price: 79, exchanges: ["Alpaca", "DEX"], color: "emerald" },
  { value: "bundle", label: "Bundle", icon: "🧩", price: 299, exchanges: ["OKX", "Alpaca", "DEX", "Futures", "Staking"], color: "amber" },
];

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
  if (botName?.includes('Alpaca')) return "📈";
  if (botName?.includes('Sniper')) return "🦄";
  return "🤖";
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

/* ===================== MAIN DASHBOARD ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();

  // API Base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'https://api.imali-defi.com';

  // State for all backend data
  const [allTrades, setAllTrades] = useState([]);
  const [botStats, setBotStats] = useState({});
  const [sniperData, setSniperData] = useState({ stats: {}, discoveries: [] });
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
      const [tradesRes, statsRes, sniperRes] = await Promise.all([
        fetch(`${API_BASE}/api/all/trades`),
        fetch(`${API_BASE}/api/all/stats`),
        fetch(`${API_BASE}/api/sniper/all`)
      ]);

      if (!tradesRes.ok || !statsRes.ok || !sniperRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const tradesData = await tradesRes.json();
      const statsData = await statsRes.json();
      const sniperData = await sniperRes.json();

      if (mountedRef.current) {
        setAllTrades(Array.isArray(tradesData) ? tradesData : []);
        setBotStats(statsData || {});
        setSniperData(sniperData || { stats: {}, discoveries: [] });
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      if (mountedRef.current) {
        setBanner({ type: 'error', message: 'Failed to fetch latest data' });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [API_BASE]);

  // Initial load and polling every 10 seconds
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Calculate derived stats
  const totalTrades = allTrades.length;
  const totalPnL = allTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  const openPositions = allTrades.filter(t => !t.pnl && t.status !== 'closed').length;
  
  const todayPnL = useMemo(() => {
    const today = new Date().toDateString();
    return allTrades
      .filter(t => new Date(t.time || t.timestamp || t.created_at).toDateString() === today)
      .reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
  }, [allTrades]);

  // Calculate today's trades count
  const todayTrades = useMemo(() => {
    const today = new Date().toDateString();
    return allTrades.filter(t => 
      new Date(t.time || t.timestamp || t.created_at).toDateString() === today
    ).length;
  }, [allTrades]);

  // Win/Loss calculations
  const wins = allTrades.filter(t => (Number(t.pnl) || 0) > 0).length;
  const losses = allTrades.filter(t => (Number(t.pnl) || 0) < 0).length;
  const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : 0;

  // Calculate best win streak
  const bestWinStreak = useMemo(() => {
    let currentStreak = 0;
    let bestStreak = 0;
    
    allTrades.slice().reverse().forEach(t => {
      const pnl = Number(t.pnl) || 0;
      if (pnl > 0) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (pnl < 0) {
        currentStreak = 0;
      }
    });
    
    return bestStreak;
  }, [allTrades]);

  // Group trades by bot/exchange
  const tradesByBot = useMemo(() => {
    const result = {};
    allTrades.forEach(t => {
      const bot = t.bot || t.chain || 'OKX';
      if (!result[bot]) result[bot] = [];
      result[bot].push(t);
    });
    return result;
  }, [allTrades]);

  // Calculate P&L by bot
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
  const baseBalance = activation?.billing_complete ? 1000 : 100000;
  const currentBalance = baseBalance + totalPnL;

  // Active bots count
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
        <div className="flex justify-end items-center gap-2 text-xs">
          <span className="text-white/40">
            Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
          </span>
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
                {activation?.billing_complete && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-sm text-white/55 mt-1">
                Your trading dashboard with real-time updates
              </p>
            </div>
          </div>
        </CardShell>

        {/* Stats Cards - Your Money Overview */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <CardShell title="Balance" icon="💰">
            <div className="text-xl font-bold leading-tight text-emerald-400">
              {formatUsdPlain(currentBalance)}
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              {activation?.billing_complete ? 'Live Account' : 'Paper Account'}
            </div>
          </CardShell>

          <CardShell title="Today's P&L" icon="📈">
            <div className={`text-xl font-bold leading-tight ${todayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatUsd(todayPnL)}
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              {todayTrades} trades today
            </div>
          </CardShell>

          <CardShell title="Total Trades" icon="📊">
            <div className="text-xl font-bold leading-tight text-white">
              {totalTrades}
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              {wins} wins · {losses} losses
            </div>
          </CardShell>

          <CardShell title="Open Positions" icon="🎯">
            <div className="text-xl font-bold leading-tight text-white">
              {openPositions}
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              {activeBotsCount} active bots
            </div>
          </CardShell>

          <CardShell title="Win Rate" icon="📊">
            <div className="text-xl font-bold leading-tight text-emerald-400">
              {winRate}%
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              Best streak: {bestWinStreak} 🔥
            </div>
          </CardShell>
        </div>

        {/* Bot Status Section */}
        <CollapsibleCard title="🤖 Your Trading Bots" icon="🤖" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* OKX Spot Bot */}
            <CardShell>
              <div className="text-center">
                <div className="text-3xl mb-2">🔷</div>
                <h4 className="font-medium text-sm mb-2">OKX Spot</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Trades</div>
                    <div className="font-bold">{tradesByBot.OKX?.length || 0}</div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Open</div>
                    <div className="font-bold">{allTrades.filter(t => (t.bot === 'OKX' || t.chain === 'OKX') && !t.pnl).length}</div>
                  </div>
                  <div className="bg-black/30 rounded p-2 col-span-2">
                    <div className="text-white/40">P&L</div>
                    <div className={`font-bold ${(pnlByBot.OKX || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatUsd(pnlByBot.OKX || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </CardShell>

            {/* Futures Bot */}
            <CardShell>
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-medium text-sm mb-2">Futures</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Pairs</div>
                    <div className="font-bold">199</div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Positions</div>
                    <div className="font-bold">{tradesByBot.Futures?.length || 0}</div>
                  </div>
                  <div className="bg-black/30 rounded p-2 col-span-2">
                    <div className="text-white/40">Status</div>
                    <div className="font-bold text-green-400">● Scanning</div>
                  </div>
                </div>
              </div>
            </CardShell>

            {/* Stock Bot */}
            <CardShell>
              <div className="text-center">
                <div className="text-3xl mb-2">📈</div>
                <h4 className="font-medium text-sm mb-2">Stocks</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Market</div>
                    <div className="font-bold">Closed</div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Opens</div>
                    <div className="font-bold">Mon 9:30</div>
                  </div>
                  <div className="bg-black/30 rounded p-2 col-span-2">
                    <div className="text-white/40">Status</div>
                    <div className="font-bold text-yellow-400">⏰ Waiting</div>
                  </div>
                </div>
              </div>
            </CardShell>

            {/* DEX Sniper */}
            <CardShell>
              <div className="text-center">
                <div className="text-3xl mb-2">🦄</div>
                <h4 className="font-medium text-sm mb-2">DEX Sniper</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Found</div>
                    <div className="font-bold">{sniperData.stats?.total_discoveries || 0}</div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-white/40">Avg Score</div>
                    <div className={`font-bold ${(sniperData.stats?.avg_ai_score || 0) >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {sniperData.stats?.avg_ai_score?.toFixed(2) || 0}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded p-2 col-span-2">
                    <div className="text-white/40">Chains</div>
                    <div className="font-bold text-xs truncate">
                      {sniperData.stats?.chains_active?.join(', ') || 'eth, poly, bsc'}
                    </div>
                  </div>
                </div>
              </div>
            </CardShell>
          </div>
        </CollapsibleCard>

        {/* Sniper Discoveries Section */}
        {sniperData.discoveries?.length > 0 && (
          <CollapsibleCard title="🦄 New Token Discoveries" icon="🦄" defaultOpen={true}>
            <div className="space-y-2">
              <p className="text-xs text-white/40 mb-2">
                New pairs found on Ethereum (need AI score ≥ 0.70 to trade)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {sniperData.discoveries.slice(0, 6).map((d, i) => (
                  <div key={i} className="bg-black/30 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">🔷 {d.chain}</span>
                      <span className="text-white/40">{d.age} blocks</span>
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
                    {d.ai_score < 0.7 && (
                      <div className="text-[8px] text-white/30">
                        Need {((0.7 - d.ai_score) * 100).toFixed(0)}% higher to trade
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {sniperData.discoveries.length > 6 && (
                <div className="text-center text-[10px] text-white/30 mt-2">
                  +{sniperData.discoveries.length - 6} more discoveries
                </div>
              )}
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
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              {allTrades.slice(0, 20).map((t, i) => {
                const pnl = Number(t.pnl) || 0;
                const bot = t.bot || t.chain || 'OKX';
                const time = t.time || t.timestamp || t.created_at;
                const isBuy = t.side?.toLowerCase() === 'buy' || !t.side;
                const pnlPercent = t.pnl_percentage ? Number(t.pnl_percentage).toFixed(2) : null;
                
                return (
                  <div key={i} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm ${
                    i === 0 ? 'bg-white/10' : 'bg-white/[0.03]'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base">
                        {getBotIcon(bot)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{t.symbol}</span>
                          <span className="text-[10px] text-white/40">{bot}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isBuy ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
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
                      <div className={`font-bold text-sm ${pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-white/40'}`}>
                        {pnl ? formatUsd(pnl) : 'Open'}
                      </div>
                      {pnlPercent && (
                        <div className={`text-[10px] ${pnl > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                          {pnl > 0 ? '+' : ''}{pnlPercent}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleCard>

        {/* Bot Statistics */}
        <CollapsibleCard title="📊 Bot Statistics" icon="📊" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* OKX Stats */}
            <div className="bg-black/30 rounded-xl p-3">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span>🔷 OKX Spot</span>
                <span className="text-green-400 text-[10px]">● Active</span>
              </div>
              <div className="space-y-1 text-white/60">
                <div className="flex justify-between">
                  <span>Total Trades:</span>
                  <span className="text-white">{tradesByBot.OKX?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Open Positions:</span>
                  <span className="text-white">{allTrades.filter(t => (t.bot === 'OKX' || t.chain === 'OKX') && !t.pnl).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total P&L:</span>
                  <span className={`${(pnlByBot.OKX || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatUsd(pnlByBot.OKX || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span className="text-white">
                    {tradesByBot.OKX?.length ? ((tradesByBot.OKX.filter(t => (t.pnl || 0) > 0).length / tradesByBot.OKX.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Sniper Stats */}
            <div className="bg-black/30 rounded-xl p-3">
              <div className="font-medium mb-2 flex items-center gap-2">
                <span>🦄 DEX Sniper</span>
                <span className="text-green-400 text-[10px]">● Scanning</span>
              </div>
              <div className="space-y-1 text-white/60">
                <div className="flex justify-between">
                  <span>Total Discoveries:</span>
                  <span className="text-white">{sniperData.stats?.total_discoveries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg AI Score:</span>
                  <span className="text-white">{sniperData.stats?.avg_ai_score?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>By Chain:</span>
                  <span className="text-white">
                    Eth:{sniperData.stats?.by_chain?.ethereum || 0} · 
                    Poly:{sniperData.stats?.by_chain?.polygon || 0} · 
                    Bsc:{sniperData.stats?.by_chain?.bsc || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Threshold:</span>
                  <span className="text-white">{sniperData.stats?.threshold || 0.7}</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleCard>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/10">
          <Link to="/demo" className="text-[11px] text-white/40 hover:text-white/60 transition-colors">
            🎮 Try the Demo Simulator →
          </Link>
        </div>
      </div>
    </div>
  );
}
