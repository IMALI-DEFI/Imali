import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI, { BOT_TYPES } from "../../utils/BotAPI";
import TradingOverview from "../../components/Dashboard/TradingOverview.jsx";
import useBotWebSocket from "../../hooks/useBotWebSocket";

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

const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return PLANS.some((p) => p.value === t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) => {
  const tierOrder = PLANS.map((p) => p.value);
  return tierOrder.indexOf(normalizeTier(userTier)) >= tierOrder.indexOf(normalizeTier(requiredTier));
};

const normalizeExchange = (exchange) => {
  if (!exchange) return "DEX";
  const u = String(exchange).toUpperCase();
  if (u.includes("OKX")) return "OKX";
  if (u.includes("ALPACA")) return "Alpaca";
  if (u.includes("DEX") || u.includes("UNI") || u.includes("SWAP")) return "DEX";
  if (u.includes("FUTURE")) return "Futures";
  if (u.includes("PAPER")) return "PAPER";
  return "DEX";
};

const getExchangeIcon = (exchange) => {
  switch(exchange) {
    case "OKX": return "🔷";
    case "Alpaca": return "📈";
    case "PAPER": return "🎮";
    case "Futures": return "📊";
    default: return "🦄";
  }
};

const riskLabel = (level) => {
  const labels = ["Low", "Medium", "High", "Extreme"];
  return labels[(level || 2) - 1] || "Medium";
};

const riskLabelColor = (level) => {
  if (level <= 1) return "text-emerald-400";
  if (level <= 2) return "text-yellow-400";
  if (level <= 3) return "text-orange-400";
  return "text-red-400";
};

/**
 * Compute trade statistics from trades array
 */
const computeTradeStats = (trades) => {
  let wins = 0;
  let losses = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  const tradingDays = new Set();
  const strategies = new Set();
  const exchanges = new Set();

  const sorted = [...trades].sort((a, b) => 
    new Date(a.created_at || a.timestamp || 0) - new Date(b.created_at || b.timestamp || 0)
  );

  sorted.forEach(t => {
    const pnl = Number(t.pnl_usd || t.pnl || 0);
    const isClose = t.side === 'sell' || t.type === 'exit' || t.status === 'closed';

    if (isClose) {
      if (pnl > 0) {
        wins++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (pnl < 0) {
        losses++;
        currentStreak = 0;
      }
    }

    const date = t.created_at || t.timestamp;
    if (date) tradingDays.add(new Date(date).toDateString());
    if (t.strategy) strategies.add(t.strategy);
    
    const ex = normalizeExchange(t.exchange || t.network);
    exchanges.add(ex);
  });

  return {
    wins,
    losses,
    currentWinStreak: currentStreak,
    bestWinStreak: bestStreak,
    dayStreak: tradingDays.size,
    strategiesUsed: strategies,
    chainsTraded: Math.max(1, exchanges.size)
  };
};

/**
 * Merge REST and WebSocket trades with deduplication
 */
const mergeTrades = (restTrades = [], wsTrades = []) => {
  const tradeMap = new Map();

  // Add REST trades
  restTrades.forEach(t => {
    const id = t.id || t._id || `rest-${t.symbol}-${t.created_at}`;
    tradeMap.set(id, { 
      ...t, 
      _id: id,
      pnl: Number(t.pnl_usd || t.pnl || 0),
      exchange: normalizeExchange(t.exchange || t.network),
      timestamp: t.created_at || t.timestamp || new Date().toISOString()
    });
  });

  // Add/override with WebSocket trades
  wsTrades.forEach(t => {
    const id = t.id || t._id || `ws-${t.symbol}-${t.opened_at}`;
    tradeMap.set(id, {
      ...t,
      _id: id,
      symbol: t.symbol || t.pair || "UNKNOWN",
      pnl: Number(t.pnl_usd || t.pnl || 0),
      exchange: normalizeExchange(t.exchange || t.network),
      timestamp: t.closed_at || t.opened_at || t.created_at || new Date().toISOString(),
      status: t.status || (t.closed_at ? 'closed' : 'open'),
      isLive: !t.closed_at && !t.status === 'closed'
    });
  });

  return Array.from(tradeMap.values()).sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
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

const MiniChart = ({ data = [], height = 40 }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-10 text-[10px] text-white/30">
        No data yet
      </div>
    );
  }

  const max = Math.max(...data.map(Math.abs), 1);
  
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.slice(-20).map((val, i) => {
        const height_px = (Math.abs(val) / max) * 32;
        return (
          <div
            key={i}
            className={`flex-1 min-w-[3px] rounded-t ${val >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ height: Math.max(2, height_px) }}
          />
        );
      })}
    </div>
  );
};

const QuickLinks = () => (
  <Card>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-white/40 mr-1">Quick Links:</span>
      <Link to="/billing" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition">💳 Billing</Link>
      <Link to="/activation" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition">⚡ Activation</Link>
      <Link to="/demo" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition">🎮 Demo</Link>
      <a href="mailto:support@imali-defi.com" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition">📧 Support</a>
    </div>
  </Card>
);

const SetupProgress = ({ billing, connections, trading, onCTAClick, warning }) => {
  const steps = [
    { done: billing, label: "Billing", icon: "💳" },
    { done: connections, label: "Connect", icon: "🔌" },
    { done: trading, label: "Enable", icon: "⚡" }
  ];
  
  const currentStep = steps.findIndex(s => !s.done);
  const allDone = currentStep === -1;

  if (allDone) return null;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="text-sm font-medium">Complete your setup</p>
            <p className="text-xs text-white/50">Step {currentStep + 1}/3 — {steps[currentStep].label}</p>
            <div className="flex items-center gap-2 mt-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    s.done ? 'bg-emerald-500/20 text-emerald-300' : 
                    i === currentStep ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-400' : 
                    'bg-white/10 text-white/30'
                  }`}>
                    {s.done ? '✓' : s.icon}
                  </div>
                  {i < 2 && <div className={`w-6 h-0.5 ${s.done ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={onCTAClick}
          className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition"
        >
          {!billing ? "Add Payment" : !connections ? "Connect Services" : "Enable Trading"} →
        </button>
      </div>
    </Card>
  );
};

const StatCard = ({ label, value, subvalue, icon, trend }) => (
  <Card className="text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-xl font-bold">{value}</div>
    <div className="text-xs text-white/50 mt-1">{label}</div>
    {subvalue && <div className="text-[10px] text-white/30 mt-1">{subvalue}</div>}
  </Card>
);

const ExchangeCard = ({ name, icon, trades = [], active, mode, isRunning, onClick, pairs, positions }) => {
  const totalTrades = trades.length;
  const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : "0.0";

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border transition-all cursor-pointer ${
        active 
          ? isRunning 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-white/5 border-white/15 hover:border-white/30'
          : 'bg-white/[0.03] border-white/10 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-medium text-sm">{name}</div>
            <div className="text-[10px] text-white/40">
              {active 
                ? isRunning 
                  ? <span className="text-green-400">● Running</span>
                  : mode === 'paper' ? '🎮 Paper' : '✅ Ready'
                : '🔒 Locked'}
            </div>
          </div>
        </div>
        {active && totalTrades > 0 && (
          <ProgressRing percent={Number(winRate)} size={36} strokeWidth={3} color={winRate >= 50 ? "#10b981" : "#ef4444"}>
            <span className="text-[9px] font-bold">{winRate}%</span>
          </ProgressRing>
        )}
      </div>

      {active && <MiniChart data={trades.slice(-15).map(t => t.pnl || 0)} />}

      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
        <div className="bg-black/30 rounded-lg p-2">
          <div className="text-white/40">Trades</div>
          <div className="font-bold">{totalTrades}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2">
          <div className="text-white/40">P&L</div>
          <div className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatUsd(pnl)}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-2">
          <div className="text-white/40">Positions</div>
          <div className="font-bold">{positions}</div>
        </div>
      </div>

      {!active && (
        <div className="mt-3 text-center text-[10px] text-blue-400">Click to upgrade →</div>
      )}
    </div>
  );
};

const TradeItem = ({ trade, isLatest }) => {
  const pnl = trade.pnl || 0;
  const exchange = normalizeExchange(trade.exchange);
  const isPaper = trade.mode === 'paper' || exchange === 'PAPER';
  const isLive = trade.isLive && !isPaper;
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl text-sm ${
      isLatest ? 'bg-white/10' : isLive ? 'bg-emerald-500/5' : 'bg-white/[0.03]'
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base">{getExchangeIcon(exchange)}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{trade.symbol}</span>
            <span className="text-[10px] text-white/40">{exchange}</span>
            {isPaper && <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">PAPER</span>}
            {isLive && <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded flex items-center gap-1">● LIVE</span>}
          </div>
          <div className="text-[10px] text-white/30">
            {new Date(trade.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div className={`font-bold text-sm ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatUsd(pnl)}
      </div>
    </div>
  );
};

const TradeFeed = ({ trades = [] }) => {
  if (!trades.length) {
    return (
      <div className="text-center py-8">
        <span className="text-3xl mb-2 block">📋</span>
        <p className="text-sm text-white/30">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {trades.slice(0, 30).map((trade, i) => (
        <TradeItem key={trade._id || i} trade={trade} isLatest={i === 0} />
      ))}
    </div>
  );
};

const StrategySelector = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
    {STRATEGIES.map(s => (
      <button
        key={s.value}
        onClick={() => onChange(s.value)}
        disabled={disabled}
        className={`p-3 rounded-xl border text-left transition ${
          value === s.value 
            ? 'bg-white/10 border-white/30' 
            : 'bg-white/5 border-white/10 hover:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="text-xl mb-1">{s.icon}</div>
        <div className="text-sm font-medium">{s.label}</div>
        <div className="text-xs text-white/50 mt-1">{s.description}</div>
        <div className="mt-2 flex gap-1">
          {[1,2,3,4].map(r => (
            <div key={r} className={`h-1 flex-1 rounded-full ${r <= s.risk ? 'bg-emerald-500' : 'bg-white/10'}`} />
          ))}
        </div>
      </button>
    ))}
  </div>
);

const LevelBadge = ({ trades = 0, winRate = 0, pnl = 0, chains = 1 }) => {
  const xp = useMemo(() => {
    return Math.min(trades, 100) * 2 + 
           Math.max(0, winRate - 40) * 1.5 + 
           Math.max(0, pnl) * 0.1 + 
           chains * 10;
  }, [trades, winRate, pnl, chains]);

  const level = LEVEL_THRESHOLDS.findLast(l => xp >= l.min) || LEVEL_THRESHOLDS[0];
  const nextLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.indexOf(level) + 1];
  const progress = nextLevel ? ((xp - level.min) / (nextLevel.min - level.min)) * 100 : 100;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-white/40 mb-1">Trader Level</div>
          <div className={`text-lg font-bold ${level.colorClass}`}>{level.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">XP</div>
          <div className="font-bold">{Math.floor(xp)}</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" 
             style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      {nextLevel && (
        <div className="mt-2 text-[10px] text-white/30">
          {Math.floor(nextLevel.min - xp)} XP to {nextLevel.name}
        </div>
      )}
    </Card>
  );
};

const Achievements = ({ unlocked = [] }) => (
  <CollapsibleSection title="Achievements" icon="🏆" defaultOpen={false}>
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {ACHIEVEMENTS.map(a => {
        const isUnlocked = unlocked.includes(a.id);
        return (
          <div key={a.id} title={a.desc} className={`p-2 text-center rounded-xl border ${
            isUnlocked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5 opacity-40'
          }`}>
            <div className="text-xl mb-1">{a.emoji}</div>
            <div className="text-[8px] font-medium">{a.label}</div>
          </div>
        );
      })}
    </div>
  </CollapsibleSection>
);

/* ===================== MAIN COMPONENT ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation } = useAuth();
  const { botData, connected: wsConnected, error: wsError, requestSnapshot } = useBotWebSocket();

  // State
  const [restTrades, setRestTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [strategy, setStrategy] = useState(user?.strategy || "ai_weighted");

  const mountedRef = useRef(true);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Sync strategy
  useEffect(() => {
    if (user?.strategy) setStrategy(user.strategy);
  }, [user?.strategy]);

  // Derived data
  const botRunning = botData?.state === "running";
  const botMode = botData?.mode || (botRunning ? "live" : null);
  
  const allTrades = useMemo(() => {
    const wsTrades = [
      ...(botData?.active_trades || []),
      ...(botData?.completed_trades || [])
    ].map(t => ({
      ...t,
      pnl: t.pnl_usd ?? t.pnl ?? 0,
      exchange: t.exchange || t.network,
      timestamp: t.closed_at || t.opened_at || t.created_at,
      isLive: !t.closed_at && !t.status === 'closed'
    }));
    return mergeTrades(restTrades, wsTrades);
  }, [restTrades, botData]);

  const stats = useMemo(() => computeTradeStats(allTrades), [allTrades]);
  
  const tradesByExchange = useMemo(() => {
    const map = { OKX: [], Alpaca: [], DEX: [], Futures: [], PAPER: [] };
    allTrades.forEach(t => {
      const ex = normalizeExchange(t.exchange);
      if (t.mode === 'paper' || ex === 'PAPER') map.PAPER.push(t);
      else if (map[ex]) map[ex].push(t);
      else map.DEX.push(t);
    });
    return map;
  }, [allTrades]);

  const todayPnL = useMemo(() => {
    const today = new Date().toDateString();
    return allTrades
      .filter(t => new Date(t.timestamp).toDateString() === today)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [allTrades]);

  const totalPnL = useMemo(() => {
    if (botData?.pnl_total) return botData.pnl_total;
    return allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [botData?.pnl_total, allTrades]);

  const chartData = useMemo(() => 
    allTrades.slice(0, 30).reverse().map(t => t.pnl || 0),
    [allTrades]
  );

  // Auth data
  const tier = normalizeTier(user?.tier);
  const plan = PLANS.find(p => p.value === tier) || PLANS[0];
  const currentStrat = STRATEGIES.find(s => s.value === strategy) || STRATEGIES[1];

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;

  const connectionsComplete = (() => {
    const needsOkx = ["starter", "pro", "bundle"].includes(tier);
    const needsAlpaca = ["starter", "bundle"].includes(tier);
    const needsWallet = ["elite", "stock", "bundle"].includes(tier);
    return (!needsOkx || okxConnected) && 
           (!needsAlpaca || alpacaConnected) && 
           (!needsWallet || walletConnected);
  })();

  const activationComplete = billingComplete && connectionsComplete && tradingEnabled;
  const baseBalance = activationComplete ? 1000 : 100000;
  const currentBalance = baseBalance + totalPnL;

  const winRate = allTrades.length ? ((stats.wins / allTrades.length) * 100).toFixed(1) : 0;

  const confidence = useMemo(() => {
    let score = 0;
    if (allTrades.length > 0) score += (stats.wins / allTrades.length) * 40;
    score += Math.min(allTrades.length * 0.1, 30);
    score += stats.dayStreak * 5;
    score += stats.chainsTraded * 5;
    if (tier !== "starter") score += 10;
    if (activationComplete) score += 15;
    if (botRunning) score += 5;
    return Math.min(100, Math.max(0, Math.round(score)));
  }, [allTrades.length, stats, tier, activationComplete, botRunning]);

  const unlockedAchievements = useMemo(() => {
    const data = {
      totalTrades: allTrades.length,
      wins: stats.wins,
      losses: stats.losses,
      pnl: totalPnL,
      currentWinStreak: stats.currentWinStreak,
      winRate,
      dayStreak: stats.dayStreak,
      plan: tier,
      strategiesUsed: stats.strategiesUsed.size,
      confidence,
      chainsTraded: stats.chainsTraded
    };
    return ACHIEVEMENTS.filter(a => a.check(data)).map(a => a.id);
  }, [allTrades.length, stats, totalPnL, winRate, tier, confidence]);

  const exchangePositions = useMemo(() => {
    const pos = { OKX: 0, Alpaca: 0, DEX: 0, Futures: 0 };
    (botData?.active_trades || []).forEach(t => {
      const ex = normalizeExchange(t.exchange || t.network);
      if (pos[ex] !== undefined) pos[ex]++;
    });
    return pos;
  }, [botData?.active_trades]);

  // Load trades
  const loadTrades = useCallback(async () => {
    if (!user) return;
    try {
      const result = await BotAPI.getTrades();
      if (mountedRef.current) {
        setRestTrades(Array.isArray(result?.trades) ? result.trades : []);
      }
    } catch (err) {
      console.warn("Failed to load trades:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Actions
  const startBot = async (mode = "paper", botType = null) => {
    setBusy(true);
    try {
      const res = await BotAPI.startBot({ 
        mode, 
        strategy, 
        bot_type: botType || (mode === "paper" ? "paper" : "live") 
      });
      
      if (res?.started || res?.success) {
        setBanner({ type: "success", message: `✅ ${mode === 'paper' ? 'Paper' : 'Live'} bot started!` });
        if (requestSnapshot) requestSnapshot();
        setTimeout(loadTrades, 2000);
      }
    } catch (err) {
      setBanner({ type: "error", message: "Failed to start bot" });
    } finally {
      setBusy(false);
    }
  };

  const toggleTrading = async (enabled) => {
    setBusy(true);
    try {
      await BotAPI.toggleTrading(enabled);
      if (refreshActivation) await refreshActivation();
      setBanner({ type: "success", message: enabled ? "✅ Trading enabled" : "⏸ Trading paused" });
    } catch (err) {
      setBanner({ type: "error", message: "Failed to update trading status" });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !user) {
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
        
        {/* Connection Status */}
        <div className="flex justify-end items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white/40">Real-time: {wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

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

        <QuickLinks />
        <SetupProgress 
          billing={billingComplete}
          connections={connectionsComplete}
          trading={tradingEnabled}
          onCTAClick={() => navigate(billingComplete ? '/activation' : '/billing')}
        />

        {/* Header */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">👋 Hey, {user.email?.split('@')[0]}</h1>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30">
                  {plan.icon} {tier}
                </span>
                {activationComplete && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs">✓ Active</span>
                )}
                {botRunning && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Bot Active
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50 mt-1">
                {allTrades.length} total trades · {formatUsd(totalPnL)} P&L
              </p>
            </div>

            <div className="flex gap-2">
              {activationComplete ? (
                <>
                  <button
                    onClick={() => toggleTrading(!tradingEnabled)}
                    disabled={busy}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      tradingEnabled ? 'bg-red-600/80 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {tradingEnabled ? '⏸ Pause' : '▶ Enable'}
                  </button>
                  <button
                    onClick={() => startBot('live')}
                    disabled={!tradingEnabled || busy}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition disabled:opacity-50"
                  >
                    🚀 Start Live
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startBot('paper')}
                    disabled={busy}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-medium transition"
                  >
                    🎮 Paper Trade
                  </button>
                  <button
                    onClick={() => navigate(billingComplete ? '/activation' : '/billing')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition"
                  >
                    ⚡ Setup Live
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Strategy */}
        <CollapsibleSection title="Strategy" icon="🧠" defaultOpen={false}>
          <StrategySelector value={strategy} onChange={setStrategy} disabled={botRunning} />
        </CollapsibleSection>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="💰" label="Balance" value={formatUsdPlain(currentBalance)} subvalue={activationComplete ? 'Live' : 'Paper'} />
          <StatCard icon="📈" label="Today" value={formatUsd(todayPnL)} subvalue={`${allTrades.length} trades`} />
          <StatCard icon="📊" label="Total Trades" value={formatNumber(allTrades.length)} subvalue={`${stats.wins}W / ${stats.losses}L`} />
          <StatCard icon="🎯" label="Positions" value={botData?.active_trade_count || 0} subvalue={`${stats.chainsTraded} chains`} />
          <StatCard icon="🤖" label="Confidence" value={`${confidence}%`}>
            <ProgressRing percent={confidence} size={48} strokeWidth={4}>
              <span className="text-xs font-bold">{confidence}%</span>
            </ProgressRing>
          </StatCard>
        </div>

        {/* Level & Mini Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <LevelBadge trades={allTrades.length} winRate={Number(winRate)} pnl={totalPnL} chains={stats.chainsTraded} />
          <Card title="Recent Results" icon="📊" action={`${allTrades.length} trades`} className="lg:col-span-2">
            <MiniChart data={chartData} height={60} />
          </Card>
        </div>

        {/* Exchanges */}
        <CollapsibleSection title="Connected Exchanges" icon="🔗">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ExchangeCard
              name="OKX" icon="🔷"
              trades={tradesByExchange.OKX}
              active={okxConnected}
              mode={activation?.okx_mode}
              isRunning={botRunning}
              onClick={() => navigate('/pricing')}
              pairs={162}
              positions={exchangePositions.OKX}
            />
            <ExchangeCard
              name="Alpaca" icon="📈"
              trades={tradesByExchange.Alpaca}
              active={alpacaConnected}
              mode={activation?.alpaca_mode}
              isRunning={botRunning}
              onClick={() => navigate('/pricing')}
              pairs={417}
              positions={exchangePositions.Alpaca}
            />
            <ExchangeCard
              name="DEX" icon="🦄"
              trades={tradesByExchange.DEX}
              active={walletConnected && tierAtLeast(tier, "stock")}
              isRunning={botRunning}
              onClick={() => navigate('/pricing')}
              pairs={162}
              positions={exchangePositions.DEX}
            />
            <ExchangeCard
              name="Futures" icon="📊"
              trades={tradesByExchange.Futures}
              active={tierAtLeast(tier, "elite")}
              isRunning={botRunning}
              onClick={() => navigate('/pricing')}
              pairs={199}
              positions={exchangePositions.Futures}
            />
          </div>
        </CollapsibleSection>

        {/* Trade Feed & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Live Trades" icon="📋" action={botRunning ? <span className="text-emerald-400">● Live</span> : `${allTrades.length} total`}>
            <TradeFeed trades={allTrades} />
          </Card>

          <Card title="Session Stats" icon="📊">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Status</span>
                <span className="font-medium">
                  {botRunning ? (botMode === 'paper' ? '🎮 Paper' : '💰 Live') : tradingEnabled ? '⏸ Paused' : '⚡ Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Win Rate</span>
                <span className="font-medium text-emerald-400">{winRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Best Streak</span>
                <span className="font-medium">{stats.bestWinStreak} 🔥</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Day Streak</span>
                <span className="font-medium">{stats.dayStreak} 📅</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Strategies</span>
                <span className="font-medium">{stats.strategiesUsed.size}/4 🧠</span>
              </div>
              <div className="pt-2 mt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/50">Plan</span>
                  <span className="font-medium">{plan.icon} {plan.label}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/50">Strategy</span>
                  <span className="font-medium">{currentStrat.icon} {currentStrat.label}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Advanced Chart & Achievements */}
        <CollapsibleSection title="Advanced Chart" icon="📉" defaultOpen={false}>
          <div className="bg-black/30 rounded-xl p-3">
            <TradingOverview
              feed={{
                equity: currentBalance,
                pnl: totalPnL,
                wins: stats.wins,
                losses: stats.losses,
                running: botRunning,
                mode: botMode || 'idle',
                plan: tier,
                strategy: strategy,
                ts: Date.now()
              }}
            />
          </div>
        </CollapsibleSection>

        <Achievements unlocked={unlockedAchievements} />

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
