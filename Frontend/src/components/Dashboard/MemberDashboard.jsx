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
const Card = ({ title, icon, action, children, className = "" }) => (
  <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${className}`}>
    {(title || icon || action) && (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {title && <h3 className="font-semibold text-sm text-white/90">{title}</h3>}
        </div>
        {action && <div className="text-xs text-white/40">{action}</div>}
      </div>
    )}
    {children}
  </div>
);

const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => (
  <details className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl" open={defaultOpen}>
    <summary className="list-none cursor-pointer p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="font-semibold text-sm text-white/90">{title}</h3>
        </div>
        <span className="text-white/40 text-xs">▾</span>
      </div>
    </summary>
    <div className="px-4 pb-4">{children}</div>
  </details>
);

const ProgressRing = ({ percent = 0, size = 48, strokeWidth = 4, color = "#10b981", children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {children}
      </div>
    </div>
  );
};

/* ===================== BOT STATUS CARDS ===================== */
const BotStatusCard = ({ name, icon, stats, isActive }) => (
  <Card className="text-center">
    <div className="text-3xl mb-2">{icon}</div>
    <h4 className="font-medium text-sm mb-2">{name}</h4>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="bg-black/30 rounded p-2">
        <div className="text-white/40">Trades</div>
        <div className="font-bold">{stats?.total_trades || stats?.trade_count || 0}</div>
      </div>
      <div className="bg-black/30 rounded p-2">
        <div className="text-white/40">Open</div>
        <div className="font-bold">{stats?.open_positions || 0}</div>
      </div>
      <div className="bg-black/30 rounded p-2 col-span-2">
        <div className="text-white/40">P&L</div>
        <div className={`font-bold ${(stats?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatUsd(stats?.total_pnl || 0)}
        </div>
      </div>
    </div>
    <div className="mt-2 text-[10px] text-white/30">
      {isActive ? '● Active' : '○ Idle'}
    </div>
  </Card>
);

/* ===================== SNIPER DISCOVERIES ===================== */
const SniperDiscoveryCard = ({ discovery }) => (
  <div className="bg-black/30 rounded-xl p-3 text-xs space-y-1">
    <div className="flex justify-between items-center">
      <span className="font-medium">{discovery.chain} 🦄</span>
      <span className="text-white/40">{discovery.age} blocks ago</span>
    </div>
    <div className="text-white/60 font-mono text-[10px]">
      Pair: {formatAddress(discovery.pair)}
    </div>
    <div className="flex justify-between items-center mt-1">
      <span className="text-white/40">AI Score</span>
      <span className={`font-bold ${discovery.ai_score >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
        {discovery.ai_score}
      </span>
    </div>
    {discovery.ai_score < 0.7 && (
      <div className="text-[8px] text-white/30 mt-1">
        Need {((0.7 - discovery.ai_score) * 100).toFixed(0)}% higher to trade
      </div>
    )}
  </div>
);

/* ===================== MAIN DASHBOARD ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation } = useAuth();

  // State for all data
  const [trades, setTrades] = useState([]);
  const [botStats, setBotStats] = useState({});
  const [sniperData, setSniperData] = useState({ stats: {}, discoveries: [] });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const API_BASE = 'http://129.213.90.84'; 

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      const [tradesRes, statsRes, sniperRes] = await Promise.all([
        fetch(`${API_BASE}/api/all/trades`),
        fetch(`${API_BASE}/api/all/stats`),
        fetch(`${API_BASE}/api/sniper/all`)
      ]);

      const tradesData = await tradesRes.json();
      const statsData = await statsRes.json();
      const sniperData = await sniperRes.json();

      setTrades(Array.isArray(tradesData) ? tradesData : []);
      setBotStats(statsData || {});
      setSniperData(sniperData || { stats: {}, discoveries: [] });
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setBanner({ type: 'error', message: 'Failed to fetch latest data' });
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Initial load and polling
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Derived stats
  const totalTrades = trades.length;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const openPositions = trades.filter(t => !t.pnl && t.status !== 'closed').length;
  
  const todayPnL = useMemo(() => {
    const today = new Date().toDateString();
    return trades
      .filter(t => new Date(t.timestamp || t.time).toDateString() === today)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [trades]);

  // Auth data
  const tier = normalizeTier(user?.tier);
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  const baseBalance = activation?.billing_complete ? 1000 : 100000;
  const currentBalance = baseBalance + totalPnL;

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
      <div className="max-w-7xl mx-auto px-3 py-4 space-y-4">
        
        {/* Header */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">📊 Your Trading Dashboard</h1>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                  {plan.icon} {tier} Plan
                </span>
                {lastUpdate && (
                  <span className="text-[10px] text-white/30">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50 mt-1">
                Welcome back, {user.email?.split('@')[0]}! Here's what your bots are doing.
              </p>
            </div>
          </div>
        </Card>

        {/* Banner */}
        {banner && (
          <div className={`p-3 rounded-xl border ${
            banner.type === 'error' 
              ? 'bg-red-500/10 border-red-500/30 text-red-200' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            {banner.message}
          </div>
        )}

        {/* Quick Stats - Your Money Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xl font-bold">{formatUsdPlain(currentBalance)}</div>
            <div className="text-xs text-white/50">Your Balance</div>
            <div className="text-[10px] text-white/30">{baseBalance === 1000 ? 'Live' : 'Paper'} Account</div>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">📈</div>
            <div className={`text-xl font-bold ${todayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatUsd(todayPnL)}
            </div>
            <div className="text-xs text-white/50">Today's Profit/Loss</div>
            <div className="text-[10px] text-white/30">{trades.filter(t => {
              const d = new Date(t.timestamp || t.time);
              return d.toDateString() === new Date().toDateString();
            }).length} trades today</div>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xl font-bold">{totalTrades}</div>
            <div className="text-xs text-white/50">Total Trades</div>
            <div className="text-[10px] text-white/30">{openPositions} open positions</div>
          </Card>

          <Card className="text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xl font-bold">{openPositions}</div>
            <div className="text-xs text-white/50">Active Positions</div>
            <div className="text-[10px] text-white/30">Waiting to sell</div>
          </Card>
        </div>

        {/* Your Trading Bots Section */}
        <CollapsibleSection title="🤖 Your Trading Bots" icon="🤖" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* OKX Spot Bot */}
            <BotStatusCard
              name="OKX Spot Trader"
              icon="🔷"
              stats={botStats.OKX}
              isActive={true}
            />

            {/* OKX Futures Bot */}
            <BotStatusCard
              name="Futures Trader"
              icon="📊"
              stats={{
                total_trades: 0,
                open_positions: 0,
                total_pnl: 0
              }}
              isActive={true}
            />

            {/* Stock Bot */}
            <BotStatusCard
              name="Stock Trader"
              icon="📈"
              stats={{
                total_trades: 0,
                open_positions: 0,
                total_pnl: 0
              }}
              isActive={true}
            />

            {/* Sniper Bot */}
            <Card className="text-center">
              <div className="text-3xl mb-2">🦄</div>
              <h4 className="font-medium text-sm mb-2">DEX Sniper</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/30 rounded p-2">
                  <div className="text-white/40">Found</div>
                  <div className="font-bold">{sniperData.stats?.total_discoveries || 0}</div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-white/40">Avg Score</div>
                  <div className="font-bold">{sniperData.stats?.avg_ai_score?.toFixed(2) || 0}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-white/30">
                Scanning: {sniperData.stats?.chains_active?.join(', ') || 'ethereum, polygon, bsc'}
              </div>
            </Card>
          </div>
        </CollapsibleSection>

        {/* What's Being Found Section (Sniper Discoveries) */}
        {sniperData.discoveries?.length > 0 && (
          <CollapsibleSection title="🦄 New Tokens Being Discovered" icon="🦄" defaultOpen={true}>
            <div className="space-y-2">
              <p className="text-xs text-white/40 mb-2">
                These are new tokens your sniper bot found. They need an AI score of 0.70 or higher to trade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {sniperData.discoveries.slice(0, 6).map((d, i) => (
                  <SniperDiscoveryCard key={i} discovery={d} />
                ))}
              </div>
              {sniperData.discoveries.length > 6 && (
                <div className="text-center text-[10px] text-white/30 mt-2">
                  +{sniperData.discoveries.length - 6} more discoveries
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Recent Activity - All Trades */}
        <CollapsibleSection title="📋 Recent Trading Activity" icon="📋" defaultOpen={true}>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <span className="text-3xl mb-2 block">📭</span>
              <p className="text-sm">No trades yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-white/40 mb-2">
                Showing your {Math.min(10, trades.length)} most recent trades
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {trades.slice(0, 10).map((trade, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getBotIcon(trade.bot)}</span>
                      <div>
                        <div className="font-medium">{trade.symbol}</div>
                        <div className="text-[10px] text-white/40">
                          {trade.side || 'Buy'} • {new Date(trade.time || trade.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">${Number(trade.price).toFixed(4)}</div>
                      <div className={`text-[10px] ${(trade.pnl || 0) > 0 ? 'text-green-400' : (trade.pnl || 0) < 0 ? 'text-red-400' : 'text-white/30'}`}>
                        {trade.pnl ? formatUsd(trade.pnl) : 'Open'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* Bot Status Overview */}
        <CollapsibleSection title="⚙️ Bot Status" icon="⚙️" defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 rounded-xl p-3">
              <div className="font-medium mb-2">🔷 OKX Spot Bot</div>
              <div className="space-y-1 text-white/60">
                <div className="flex justify-between">
                  <span>Trades:</span>
                  <span className="text-white">{botStats.OKX?.total_trades || 49}</span>
                </div>
                <div className="flex justify-between">
                  <span>Open Positions:</span>
                  <span className="text-white">{botStats.OKX?.open_positions || 49}</span>
                </div>
                <div className="flex justify-between">
              <span>Win Rate:</span>
                  <span className="text-white">{botStats.OKX?.win_rate?.toFixed(1) || 0}%</span>
                </div>
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-3">
              <div className="font-medium mb-2">🦄 DEX Sniper</div>
              <div className="space-y-1 text-white/60">
                <div className="flex justify-between">
                  <span>Discoveries:</span>
                  <span className="text-white">{sniperData.stats?.total_discoveries || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg AI Score:</span>
                  <span className="text-white">{sniperData.stats?.avg_ai_score?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Threshold:</span>
                  <span className="text-white">{sniperData.stats?.threshold || 0.7}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chains:</span>
                  <span className="text-white">{sniperData.stats?.chains_active?.join(', ') || 'eth, poly, bsc'}</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/10">
          <Link to="/demo" className="text-xs text-white/30 hover:text-white/50">
            🎮 Try Demo Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
