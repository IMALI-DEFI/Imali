// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ===================== CONSTANTS ===================== */
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative", icon: "🛡️", risk: 1 },
  { value: "ai_weighted", label: "Balanced", icon: "🤖", risk: 2 },
  { value: "momentum", label: "Growth", icon: "📈", risk: 3 },
  { value: "volume_spike", label: "Aggressive", icon: "🔥", risk: 4 },
];

const PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", exchanges: ["OKX", "Alpaca"] },
  { value: "pro", label: "Pro", icon: "⭐", exchanges: ["OKX", "Alpaca", "Staking"] },
  { value: "elite", label: "Elite", icon: "👑", exchanges: ["OKX", "Alpaca", "DEX", "Futures"] },
  { value: "stock", label: "Stocks", icon: "📈", exchanges: ["Alpaca", "DEX"] },
  { value: "bundle", label: "Bundle", icon: "🧩", exchanges: ["OKX", "Alpaca", "DEX", "Futures", "Staking"] },
];

const DEMO_TOKENS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", exchange: "OKX" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", exchange: "OKX" },
  { symbol: "SOL", name: "Solana", icon: "◎", exchange: "OKX" },
  { symbol: "AAPL", name: "Apple", icon: "🍎", exchange: "Alpaca" },
  { symbol: "TSLA", name: "Tesla", icon: "⚡", exchange: "Alpaca" },
  { symbol: "NVDA", name: "Nvidia", icon: "💚", exchange: "Alpaca" },
  { symbol: "UNI", name: "Uniswap", icon: "🦄", exchange: "DEX" },
  { symbol: "BTC-PERP", name: "BTC Futures", icon: "📊", exchange: "Futures" },
];

const LEVEL_THRESHOLDS = [
  { name: "🥉 Bronze", min: 0, colorClass: "text-amber-600" },
  { name: "🥈 Silver", min: 30, colorClass: "text-gray-300" },
  { name: "🥇 Gold", min: 70, colorClass: "text-yellow-300" },
  { name: "💎 Diamond", min: 120, colorClass: "text-cyan-400" },
  { name: "🏆 Legend", min: 200, colorClass: "text-yellow-400" },
];

const ALL_ACHIEVEMENTS = [
  { id: "first_trade", emoji: "🚀", label: "First Trade", desc: "Complete your first trade", check: (s) => s.totalTrades > 0 },
  { id: "ten_trades", emoji: "📊", label: "10 Trades", desc: "Complete 10 trades", check: (s) => s.totalTrades >= 10 },
  { id: "fifty_trades", emoji: "💯", label: "50 Trades", desc: "Complete 50 trades", check: (s) => s.totalTrades >= 50 },
  { id: "profitable", emoji: "💰", label: "In The Green", desc: "Have positive P&L", check: (s) => s.pnl > 0 },
  { id: "hundred_profit", emoji: "💵", label: "\$100 Profit", desc: "Earn \$100 in demo", check: (s) => s.pnl >= 100 },
  { id: "win_streak_3", emoji: "🔥", label: "Hot Streak", desc: "Win 3 in a row", check: (s) => s.currentWinStreak >= 3 },
  { id: "win_streak_5", emoji: "⚡", label: "On Fire!", desc: "Win 5 in a row", check: (s) => s.currentWinStreak >= 5 },
  { id: "high_wr", emoji: "🎯", label: "Sharpshooter", desc: "Win rate above 60%", check: (s) => s.winRate > 60 },
  { id: "day_streak", emoji: "📅", label: "Daily Player", desc: "Trade 3+ days", check: (s) => s.dayStreak >= 3 },
  { id: "upgraded", emoji: "⭐", label: "Plan Explorer", desc: "Try a paid plan", check: (s) => s.plan !== "starter" },
  { id: "all_strats", emoji: "🧠", label: "Strategist", desc: "Try all 4 strategies", check: (s) => s.strategiesUsed >= 4 },
  { id: "confidence_80", emoji: "🤖", label: "Bot Master", desc: "Reach 80% confidence", check: (s) => s.confidence >= 80 },
];

/* ===================== HELPERS ===================== */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const usd = (n = 0) => {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}
$$
{Math.abs(n).toFixed(2)}`;
};

const usdPlain = (n = 0) => `
$$
{Number(n).toFixed(2)}`;

function pickAllowed(v, allowed, fallback) {
  const x = String(v || "").toLowerCase();
  return allowed.includes(x) ? x : fallback;
}

/* ===================== PROGRESS RING ===================== */
function ProgressRing({ percent, size = 80, stroke = 6, color = "#10b981", children }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ===================== MINI BAR CHART ===================== */
function MiniBarChart({ data, height = 60 }) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-xs text-white/30"
        style={{ height }}
      >
        Press Start to see trades here! 🤖
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.slice(-30).map((d, i) => {
        const h = (Math.abs(d.value) / max) * height * 0.9;
        const isPositive = d.value >= 0;

        return (
          <div
            key={i}
            title={`${d.label}: ${usd(d.value)}`}
            className={
              "rounded-t flex-1 min-w-[3px] max-w-[14px] transition-all duration-300 cursor-pointer hover:opacity-70 " +
              (isPositive ? "bg-emerald-500" : "bg-red-500")
            }
            style={{ height: Math.max(h, 2) }}
          />
        );
      })}
    </div>
  );
}

/* ===================== EQUITY CURVE ===================== */
function EquityCurve({ data, height = 120 }) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-white/20"
        style={{ height }}
      >
        Equity curve appears after a few trades
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 400;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = height - ((v - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const up = lastVal >= firstVal;
  const strokeColor = up ? "#10b981" : "#ef4444";
  const fillId = up ? "eqGradUp" : "eqGradDown";

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="eqGradUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqGradDown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#${fillId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ===================== RISK METER ===================== */
function RiskMeter({ level }) {
  const labels = ["Low", "Medium", "High", "Extreme"];
  const label = labels[level - 1] || "Medium";

  let labelColor = "text-yellow-400";
  if (level <= 1) labelColor = "text-emerald-400";
  else if (level <= 2) labelColor = "text-yellow-400";
  else if (level <= 3) labelColor = "text-orange-400";
  else labelColor = "text-red-400";

  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">Risk</span>
        <span className={"font-medium " + labelColor}>{label}</span>
      </div>
      <div className="flex gap-1">
        <div className={"flex-1 h-2 rounded-full transition-all duration-300 " + (level >= 1 ? "bg-emerald-500" : "bg-white/10")} />
        <div className={"flex-1 h-2 rounded-full transition-all duration-300 " + (level >= 2 ? "bg-yellow-500" : "bg-white/10")} />
        <div className={"flex-1 h-2 rounded-full transition-all duration-300 " + (level >= 3 ? "bg-orange-500" : "bg-white/10")} />
        <div className={"flex-1 h-2 rounded-full transition-all duration-300 " + (level >= 4 ? "bg-red-500" : "bg-white/10")} />
      </div>
    </div>
  );
}

/* ===================== TRADE FEED ===================== */
function TradeFeed({ trades }) {
  if (!trades.length) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <div className="text-3xl mb-2">📋</div>
        Trades appear here when the bot starts
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
      {trades
        .slice(-20)
        .reverse()
        .map((t, i) => {
          const isLatest = i === 0;
          const isWin = t.pnl >= 0;

          return (
            <div
              key={t.id}
              className={
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all " +
                (isLatest
                  ? "bg-white/10 border border-white/10"
                  : "bg-white/[0.03]")
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{t.icon}</span>
                <div>
                  <span className="font-medium">{t.symbol}</span>
                  <span className="text-xs text-white/40 ml-2">{t.exchange}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40">{t.action}</span>
                <span
                  className={
                    "font-bold text-sm " +
                    (isWin ? "text-emerald-400" : "text-red-400")
                  }
                >
                  {usd(t.pnl)}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ===================== EXCHANGE CARD ===================== */
function DemoExchangeCard({ name, icon, trades, active }) {
  const pnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const total = trades.length;
  const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const wrNum = Number(wr);

  const chartData = trades
    .slice(-15)
    .map((t, i) => ({ label: `#${i}`, value: t.pnl }));

  return (
    <div
      className={
        "bg-white/5 border rounded-xl p-4 transition-all " +
        (active
          ? "border-white/20 hover:border-white/30"
          : "border-white/10 opacity-40 pointer-events-none")
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm">{name}</h3>
            {active ? (
              <span className="text-xs text-emerald-400">✅ Active</span>
            ) : (
              <span className="text-xs text-white/30">🔒 Upgrade to unlock</span>
            )}
          </div>
        </div>

        {active && total > 0 && (
          <ProgressRing
            percent={wrNum}
            size={40}
            stroke={3}
            color={wrNum >= 50 ? "#10b981" : "#ef4444"}
          >
            <span className="text-[10px] font-bold">{wr}%</span>
          </ProgressRing>
        )}
      </div>

      {/* Chart */}
      {active && <MiniBarChart data={chartData} height={32} />}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/40">Trades</div>
          <div className="font-bold text-sm">{total}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/40">P&L</div>
          <div
            className={
              "font-bold text-sm " +
              (pnl >= 0 ? "text-emerald-400" : "text-red-400")
            }
          >
            {usd(pnl)}
          </div>
        </div>
      </div>

      {/* Win rate bar */}
      {active && total > 0 && (
        <div className="mt-2">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={
                "h-full rounded-full transition-all duration-500 " +
                (wrNum >= 50 ? "bg-emerald-500" : "bg-red-500")
              }
              style={{ width: `${wr}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>{wins}W</span>
            <span>{total - wins}L</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== LEVEL BADGE ===================== */
function LevelBadge({ xp }) {
  const level = useMemo(() => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].min) {
        const next =
          LEVEL_THRESHOLDS[i + 1]?.min || LEVEL_THRESHOLDS[i].min * 1.5;
        return { ...LEVEL_THRESHOLDS[i], xp, next, index: i };
      }
    }
    return { ...LEVEL_THRESHOLDS[0], xp, next: 30, index: 0 };
  }, [xp]);

  const progress = level.next > 0 ? (xp / level.next) * 100 : 0;
  const xpToNext = Math.max(0, Math.floor(level.next - xp));
  const isMax = level.index >= LEVEL_THRESHOLDS.length - 1;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm text-white/60">Your Trader Level</h3>
          <span className={"text-xl font-bold " + level.colorClass}>
            {level.name}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">XP</div>
          <div className="text-lg font-bold">{Math.floor(xp)}</div>
        </div>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-white/40 mt-1">
        {Math.floor(xp)} / {Math.floor(level.next)} XP —{" "}
        {isMax ? "Max level reached! 🏆" : `${xpToNext} XP to next level!`}
      </p>
    </div>
  );
}

/* ===================== ACHIEVEMENTS ===================== */
function AchievementsPanel({ unlocked, total }) {
  const pct = total > 0 ? ((unlocked.length / total) * 100).toFixed(0) : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h3 className="font-semibold">Achievements</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {unlocked.length}/{total}
          </span>
          <div className="w-20 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {ALL_ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.includes(a.id);

          return (
            <div
              key={a.id}
              title={a.desc}
              className={
                "rounded-xl p-3 text-center transition-all border " +
                (isUnlocked
                  ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
                  : "bg-black/20 border-white/5 opacity-40")
              }
            >
              <div className="text-2xl mb-1">{a.emoji}</div>
              <div className="text-[11px] font-medium text-white/80 leading-tight">
                {a.label}
              </div>
              <div className="text-[9px] text-white/30 mt-1">
                {isUnlocked ? "✅ Unlocked" : "🔒 " + a.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== STRATEGY SELECTOR ===================== */
function StrategySelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {STRATEGIES.map((s) => {
        const isActive = value === s.value;

        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            disabled={disabled}
            className={
              "p-4 rounded-xl text-center transition-all border " +
              (isActive
                ? "bg-white/10 border-white/30 shadow-lg shadow-white/5"
                : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20") +
              " disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-sm font-semibold">{s.label}</div>
            <div className="mt-2">
              <RiskMeter level={s.risk} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== PLAN SELECTOR ===================== */
function PlanSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLANS.map((p) => {
        const isActive = value === p.value;

        return (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={
              "px-4 py-2.5 rounded-xl text-sm font-medium transition-all border " +
              (isActive
                ? "bg-white/10 border-white/30 shadow-lg shadow-white/5"
                : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20")
            }
          >
            <span className="mr-1">{p.icon}</span>
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ===================== SESSION STATS ===================== */
function SessionStats({
  wins,
  losses,
  bestWinStreak,
  dayStreak,
  strategiesUsed,
  xp,
  currentPlan,
  currentStrat,
}) {
  const total = wins + losses;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-semibold">Session Stats</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">Total Trades</span>
          <span className="font-bold">{total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Wins / Losses</span>
          <span>
            <span className="text-emerald-400 font-bold">{wins}</span>
            {" / "}
            <span className="text-red-400 font-bold">{losses}</span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Best Streak</span>
          <span className="font-bold">{bestWinStreak} 🔥</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Day Streak</span>
          <span className="font-bold">{dayStreak} 📅</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Strategies Tried</span>
          <span className="font-bold">{strategiesUsed}/4 🧠</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">XP Earned</span>
          <span className="font-bold">{Math.floor(xp)} ⭐</span>
        </div>

        <div className="pt-3 mt-1 border-t border-white/10 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/50">Plan</span>
            <span>
              {currentPlan.icon} {currentPlan.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Strategy</span>
            <span>
              {currentStrat.icon} {currentStrat.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Exchanges</span>
            <span className="text-xs text-white/60">
              {currentPlan.exchanges.join(", ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN COMPONENT
===================================================================== */
export default function TradeDemo() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const tickerRef = useRef(null);

  /* ── State ── */
  const [plan, setPlan] = useState("starter");
  const [strategy, setStrategy] = useState("ai_weighted");
  const [running, setRunning] = useState(false);
  const [equity, setEquity] = useState(1000);
  const [pnl, setPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [lastTradeDay, setLastTradeDay] = useState(null);
  const [tradeLog, setTradeLog] = useState([]);
  const [equityHistory, setEquityHistory] = useState([{ value: 1000 }]);
  const [currentWinStreak, setCurrentWinStreak] = useState(0);
  const [bestWinStreak, setBestWinStreak] = useState(0);
  const [strategiesUsed, setStrategiesUsed] = useState(new Set(["ai_weighted"]));
  const [speed, setSpeed] = useState(3000);

  /* ── Derived ── */
  const currentPlan = useMemo(
    () => PLANS.find((p) => p.value === plan) || PLANS[0],
    [plan]
  );
  const currentStrat = useMemo(
    () => STRATEGIES.find((s) => s.value === strategy) || STRATEGIES[1],
    [strategy]
  );

  const winRate = useMemo(() => {
    const t = wins + losses;
    return t > 0 ? ((wins / t) * 100).toFixed(1) : "0.0";
  }, [wins, losses]);

  const xp = useMemo(() => {
    let total = 0;
    total += Math.min(wins + losses, 50) * 2;
    const wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    total += Math.max(0, wr - 40) * 1.5;
    total += Math.max(0, pnl) * 0.1;
    total += currentWinStreak * 3;
    total += dayStreak * 5;
    if (plan !== "starter") total += 15;
    return total;
  }, [wins, losses, pnl, currentWinStreak, dayStreak, plan]);

  const confidence = useMemo(() => {
    const t = wins + losses;
    let s = 0;
    if (t > 0) s += clamp((wins / t) * 40, 0, 40);
    s += clamp(t * 1.2, 0, 30);
    s += clamp(dayStreak * 5, 0, 20);
    if (plan !== "starter") s += 10;
    return clamp(Math.round(s), 0, 100);
  }, [wins, losses, dayStreak, plan]);

  const tradesByExchange = useMemo(() => {
    const r = { OKX: [], Alpaca: [], DEX: [], Futures: [] };
    tradeLog.forEach((t) => {
      if (r[t.exchange]) r[t.exchange].push(t);
    });
    return r;
  }, [tradeLog]);

  const unlockedAchievements = useMemo(() => {
    const stats = {
      totalTrades: wins + losses,
      wins,
      losses,
      pnl,
      currentWinStreak,
      winRate: Number(winRate),
      dayStreak,
      plan,
      strategiesUsed: strategiesUsed.size,
      confidence,
    };
    return ALL_ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.id);
  }, [wins, losses, pnl, currentWinStreak, winRate, dayStreak, plan, strategiesUsed, confidence]);

  const pnlChartData = useMemo(
    () =>
      tradeLog.slice(-30).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl })),
    [tradeLog]
  );

  /* ── Init from URL / localStorage ── */
  useEffect(() => {
    const ap = PLANS.map((p) => p.value);
    const as = STRATEGIES.map((s) => s.value);

    const pu = pickAllowed(params.get("plan") || params.get("tier"), ap, "");
    const su = pickAllowed(params.get("strategy"), as, "");

    let ps = "";
    let ss = "";
    try {
      ps = localStorage.getItem("imali_plan") || "";
      ss = localStorage.getItem("imali_strategy") || "";
    } catch {
      /* ignore */
    }

    setPlan(pu || pickAllowed(ps, ap, "starter"));
    setStrategy(su || pickAllowed(ss, as, "ai_weighted"));
  }, [params]);

  /* ── Persist ── */
  useEffect(() => {
    try {
      localStorage.setItem("imali_plan", plan);
      localStorage.setItem("imali_strategy", strategy);
    } catch {
      /* ignore */
    }
  }, [plan, strategy]);

  /* ── Track strategies used ── */
  useEffect(() => {
    setStrategiesUsed((prev) => new Set([...prev, strategy]));
  }, [strategy]);

  /* ── Simulation tick ── */
  useEffect(() => {
    if (!running) return;

    tickerRef.current = setInterval(() => {
      const available = DEMO_TOKENS.filter((t) =>
        currentPlan.exchanges.includes(t.exchange)
      );
      const token =
        available[Math.floor(Math.random() * available.length)] ||
        DEMO_TOKENS[0];

      const riskMult = 0.5 + currentStrat.risk * 0.4;
      const winBias =
        strategy === "mean_reversion"
          ? 0.52
          : strategy === "ai_weighted"
          ? 0.55
          : strategy === "momentum"
          ? 0.5
          : 0.48;

      const isWin = Math.random() < winBias;
      const magnitude = (Math.random() * 20 + 5) * riskMult;
      const delta = isWin ? magnitude : -magnitude * 0.7;

      const trade = {
        id: Date.now() + Math.random(),
        symbol: token.symbol,
        icon: token.icon,
        exchange: token.exchange,
        action: isWin ? "Sold ↑" : "Stopped ↓",
        pnl: Number(delta.toFixed(2)),
        timestamp: new Date().toLocaleTimeString(),
      };

      setTradeLog((prev) => [...prev.slice(-100), trade]);
      setPnl((p) => p + delta);
      setEquity((e) => {
        const next = e + delta;
        setEquityHistory((h) => [...h.slice(-60), { value: next }]);
        return next;
      });

      if (isWin) {
        setWins((w) => w + 1);
        setCurrentWinStreak((s) => {
          const next = s + 1;
          setBestWinStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setLosses((l) => l + 1);
        setCurrentWinStreak(0);
      }

      const today = new Date().toDateString();
      setLastTradeDay((prev) => {
        if (!prev || prev !== today) {
          setDayStreak((s) => s + 1);
          return today;
        }
        return prev;
      });

      window.dispatchEvent(
        new CustomEvent("trade-demo:update", {
          detail: { mode: "demo", plan, strategy, running: true, ts: Date.now() },
        })
      );
    }, speed);

    return () => {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    };
  }, [running, plan, strategy, speed, currentPlan, currentStrat]);

  /* ── Reset ── */
  const resetDemo = useCallback(() => {
    setRunning(false);
    setEquity(1000);
    setPnl(0);
    setWins(0);
    setLosses(0);
    setDayStreak(0);
    setLastTradeDay(null);
    setTradeLog([]);
    setEquityHistory([{ value: 1000 }]);
    setCurrentWinStreak(0);
    setBestWinStreak(0);
    setStrategiesUsed(new Set([strategy]));
  }, [strategy]);

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">🎮 Trading Simulator</h1>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30">
                DEMO MODE
              </span>
            </div>
            <p className="text-sm text-white/50 mt-1">
              Practice with fake money — no risk, no signup needed!
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className={
                "px-6 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] " +
                (running
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20")
              }
            >
              {running ? "⏸ Stop Bot" : "▶️ Start Bot"}
            </button>
            <button
              onClick={resetDemo}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-medium transition-colors"
            >
              🔄 Reset
            </button>
            <button
              onClick={() => nav("/signup")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              🚀 Go Live
            </button>
          </div>
        </div>

        {/* ── Speed Control ── */}
        {running && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-wrap">
            <span className="text-sm text-white/60">Bot Speed:</span>
            {[
              { label: "🐌 Slow", ms: 5000 },
              { label: "🚶 Normal", ms: 3000 },
              { label: "🏃 Fast", ms: 1500 },
              { label: "⚡ Turbo", ms: 700 },
            ].map((s) => (
              <button
                key={s.ms}
                onClick={() => setSpeed(s.ms)}
                className={
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border " +
                  (speed === s.ms
                    ? "bg-white/15 border-white/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10")
                }
              >
                {s.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Bot Running
            </div>
          </div>
        )}

        {/* ── Plan Selector ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💳</span>
            <h3 className="font-semibold">Choose Your Plan</h3>
            <span className="text-xs text-white/40 ml-1">
              (demo — try them all!)
            </span>
          </div>
          <PlanSelector value={plan} onChange={setPlan} />
          <p className="text-xs text-white/40 mt-3">
            {currentPlan.icon} <b>{currentPlan.label}</b> includes:{" "}
            {currentPlan.exchanges.join(", ")}
          </p>
        </div>

        {/* ── Strategy Selector ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <h3 className="font-semibold">Trading Strategy</h3>
            </div>
          </div>
          <StrategySelector
            value={strategy}
            onChange={setStrategy}
            disabled={running}
          />
          {running && (
            <p className="text-xs text-yellow-400/70 mt-3">
              ⚠️ Stop the bot first to change strategy
            </p>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">💰 Account</div>
            <div
              className={
                "text-xl font-bold mt-1 " +
                (equity >= 1000 ? "text-emerald-400" : "text-red-400")
              }
            >
              {usdPlain(equity)}
            </div>
            <div className="text-xs text-white/30 mt-1">Started at \$1,000</div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">📊 Total P&L</div>
            <div
              className={
                "text-xl font-bold mt-1 " +
                (pnl >= 0 ? "text-emerald-400" : "text-red-400")
              }
            >
              {usd(pnl)}
            </div>
            <div className="text-xs text-white/30 mt-1">
              {wins + losses} trades
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">🎯 Win Rate</div>
            <div className="text-xl font-bold mt-1">{winRate}%</div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={
                  "h-full rounded-full transition-all duration-500 " +
                  (Number(winRate) >= 50 ? "bg-emerald-500" : "bg-red-500")
                }
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">🔥 Win Streak</div>
            <div className="text-xl font-bold mt-1">{currentWinStreak}</div>
            <div className="text-xs text-white/30 mt-1">
              Best: {bestWinStreak}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">🤖 Confidence</div>
            <div className="flex items-center gap-2 mt-1">
              <ProgressRing percent={confidence} size={40} stroke={3}>
                <span className="text-[10px] font-bold">{confidence}%</span>
              </ProgressRing>
              <span className="text-xs text-white/50">
                {confidence >= 80
                  ? "🔥 Excellent!"
                  : confidence >= 60
                  ? "👍 Good"
                  : "📈 Building..."}
              </span>
            </div>
          </div>
        </div>

        {/* ── Level ── */}
        <LevelBadge xp={xp} />

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">📈 Equity Curve</h3>
              <span
                className={
                  "text-sm font-bold " +
                  (equity >= 1000 ? "text-emerald-400" : "text-red-400")
                }
              >
                {usdPlain(equity)}
              </span>
            </div>
            <EquityCurve data={equityHistory} height={130} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">📊 Trade Results</h3>
              <span className="text-xs text-white/40">
                {tradeLog.length} total
              </span>
            </div>
            <MiniBarChart data={pnlChartData} height={130} />
            <div className="flex justify-between mt-2 text-[10px] text-white/20">
              <span>← Older</span>
              <span>Newer →</span>
            </div>
          </div>
        </div>

        {/* ── Exchange Cards ── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">🔗 Exchanges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DemoExchangeCard
              name="OKX Crypto"
              icon="🔷"
              trades={tradesByExchange.OKX}
              active={currentPlan.exchanges.includes("OKX")}
            />
            <DemoExchangeCard
              name="Alpaca Stocks"
              icon="📈"
              trades={tradesByExchange.Alpaca}
              active={currentPlan.exchanges.includes("Alpaca")}
            />
            <DemoExchangeCard
              name="DEX Trading"
              icon="🦄"
              trades={tradesByExchange.DEX}
              active={currentPlan.exchanges.includes("DEX")}
            />
            <DemoExchangeCard
              name="Futures"
              icon="📊"
              trades={tradesByExchange.Futures}
              active={currentPlan.exchanges.includes("Futures")}
            />
          </div>
        </div>

        {/* ── Trade Feed + Session Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="font-semibold">Live Trades</h3>
              </div>
              {running && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <TradeFeed trades={tradeLog} />
          </div>

          <SessionStats
            wins={wins}
            losses={losses}
            bestWinStreak={bestWinStreak}
            dayStreak={dayStreak}
            strategiesUsed={strategiesUsed.size}
            xp={xp}
            currentPlan={currentPlan}
            currentStrat={currentStrat}
          />
        </div>

        {/* ── TradingOverview ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="font-semibold mb-3">📉 Advanced Chart</h3>
          <TradingOverview
            feed={{
              equity,
              pnl,
              wins,
              losses,
              running,
              mode: "demo",
              plan,
              strategy,
              ts: Date.now(),
            }}
          />
        </div>

        {/* ── Achievements ── */}
        <AchievementsPanel
          unlocked={unlockedAchievements}
          total={ALL_ACHIEVEMENTS.length}
        />

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">🚀</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            Ready to Trade for Real?
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-6">
            Everything here works with real money too. Sign up in 2 minutes and
            let the bot earn for you 24/7!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => nav("/signup")}
              className="px-10 py-4 rounded-full font-bold text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
            >
              🚀 Create Free Account
            </button>
            <button
              onClick={() => nav("/pricing")}
              className="px-10 py-4 rounded-full font-bold text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
            >
              📋 See All Plans
            </button>
          </div>
          <p className="text-xs text-white/30 mt-4">
            No credit card to sign up • Only pay when you profit • Cancel
            anytime
          </p>
        </div>
      </div>
    </div>
  );
}
