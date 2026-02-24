// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

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
  { id: "hundred_profit", emoji: "💵", label: "100 Profit", desc: "Earn 100 in demo", check: (s) => s.pnl >= 100 },
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

const formatUsd = (n) => {
  const num = Number(n) || 0;
  const sign = num >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(num).toFixed(2)}`;
};

const formatUsdPlain = (n) => {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
};

const pickAllowed = (v, allowed, fallback) => {
  const x = String(v || "").toLowerCase();
  return allowed.includes(x) ? x : fallback;
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

/* ===================== UI PRIMITIVES ===================== */
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

/* ===================== PROGRESS RING ===================== */
const ProgressRing = ({ percent = 0, size = 80, stroke = 6, color = "#10b981", children }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/* ===================== MINI BAR CHART ===================== */
const MiniBarChart = ({ data = [], height = 60 }) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-[11px] text-white/30" style={{ height }}>
        Press Start to see trades here 🤖
      </div>
    );
  }

  const absValues = data.map((d) => Math.abs(d.value));
  const max = Math.max(...absValues, 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.slice(-30).map((d, i) => {
        const h = (Math.abs(d.value) / max) * height * 0.9;
        const barClass = `rounded-t flex-1 min-w-[3px] max-w-[14px] transition-all duration-300 cursor-pointer hover:opacity-70 ${
          d.value >= 0 ? "bg-emerald-500" : "bg-red-500"
        }`;

        return (
          <div
            key={i}
            title={`${d.label}: ${formatUsd(d.value)}`}
            className={barClass}
            style={{ height: Math.max(h, 2) }}
          />
        );
      })}
    </div>
  );
};

/* ===================== EQUITY CURVE ===================== */
const EquityCurve = ({ data = [], height = 120 }) => {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-[11px] text-white/20" style={{ height }}>
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
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="eqGradUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqGradDown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#${fillId})`} />
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

/* ===================== RISK METER ===================== */
const RiskMeter = ({ level = 1 }) => (
  <div className="w-full">
    <div className="flex gap-1">
      <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${level >= 1 ? "bg-emerald-500" : "bg-white/10"}`} />
      <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${level >= 2 ? "bg-yellow-500" : "bg-white/10"}`} />
      <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${level >= 3 ? "bg-orange-500" : "bg-white/10"}`} />
      <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${level >= 4 ? "bg-red-500" : "bg-white/10"}`} />
    </div>
  </div>
);

/* ===================== TRADE FEED ===================== */
const TradeFeed = ({ trades = [] }) => {
  if (!trades.length) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        <div className="text-3xl mb-2">📋</div>
        Trades appear here when the bot starts
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
      {trades.slice(-30).reverse().map((t, i) => {
        const isLatest = i === 0;
        const isWin = t.pnl >= 0;
        const rowClass = `flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
          isLatest ? "bg-white/10 border border-white/10" : "bg-white/[0.03]"
        }`;
        const pnlClass = `font-bold text-sm ${isWin ? "text-emerald-400" : "text-red-400"}`;

        return (
          <div key={t.id || i} className={rowClass}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base flex-shrink-0">{t.icon}</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-semibold text-sm truncate">{t.symbol}</span>
                  <span className="text-[11px] text-white/40 truncate">{t.exchange}</span>
                </div>
                <div className="text-[10px] text-white/35 truncate">
                  {t.action} • {t.timestamp}
                </div>
              </div>
            </div>
            <div className={`flex-shrink-0 ${pnlClass}`}>{formatUsd(t.pnl)}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ===================== EXCHANGE CARD ===================== */
const DemoExchangeCard = ({ name, icon, trades = [], active, onClick }) => {
  const pnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const total = trades.length;
  const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const wrNum = Number(wr);

  const chartData = trades.slice(-15).map((t, idx) => ({ label: `#${idx}`, value: t.pnl }));

  const cardClass = `rounded-2xl p-3 border transition-all cursor-pointer ${
    active 
      ? "bg-white/5 border-white/15 hover:border-white/25" 
      : "bg-white/[0.03] border-white/10 opacity-60 hover:opacity-80"
  }`;

  const pnlClass = `font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`;

  return (
    <div className={cardClass} onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{name}</div>
            <div className="text-[11px] leading-tight">
              {active ? (
                <span className="text-emerald-400">✅ Active</span>
              ) : (
                <span className="text-white/35">🔒 {active === false ? "Upgrade Required" : "Coming Soon"}</span>
              )}
            </div>
          </div>
        </div>

        {active && total > 0 && (
          <ProgressRing percent={wrNum} size={34} stroke={3} color={wrNum >= 50 ? "#10b981" : "#ef4444"}>
            <span className="text-[9px] font-bold">{wr}%</span>
          </ProgressRing>
        )}
      </div>

      {active && <MiniBarChart data={chartData} height={26} />}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/45">Trades</div>
          <div className="font-bold text-sm">{total}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/45">P&L</div>
          <div className={`${pnlClass} text-sm`}>{formatUsd(pnl)}</div>
        </div>
      </div>

      {!active && (
        <div className="mt-2 text-center text-[10px] text-blue-400 hover:text-blue-300">
          Click to upgrade →
        </div>
      )}
    </div>
  );
};

/* ===================== LEVEL BADGE ===================== */
const LevelBadge = ({ xp = 0 }) => {
  const level = useMemo(() => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].min) {
        const next = LEVEL_THRESHOLDS[i + 1] ? LEVEL_THRESHOLDS[i + 1].min : LEVEL_THRESHOLDS[i].min * 1.5;
        return {
          name: LEVEL_THRESHOLDS[i].name,
          colorClass: LEVEL_THRESHOLDS[i].colorClass,
          min: LEVEL_THRESHOLDS[i].min,
          xp,
          next,
          index: i,
        };
      }
    }
    return { 
      name: LEVEL_THRESHOLDS[0].name, 
      colorClass: LEVEL_THRESHOLDS[0].colorClass, 
      min: 0, 
      xp, 
      next: 30, 
      index: 0 
    };
  }, [xp]);

  const progress = level.next > 0 ? (xp / level.next) * 100 : 0;
  const xpToNext = Math.max(0, Math.floor(level.next - xp));
  const isMax = level.index >= LEVEL_THRESHOLDS.length - 1;

  return (
    <CardShell
      title="Your Trader Level"
      icon="🏅"
      right={<span className="text-[11px] text-white/45">XP: <b className="text-white">{Math.floor(xp)}</b></span>}
    >
      <div className={`text-lg font-bold leading-tight ${level.colorClass}`}>{level.name}</div>
      <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-[11px] text-white/45 mt-1">
        {Math.floor(xp)} / {Math.floor(level.next)} XP —{" "}
        {isMax ? "Max level reached 🏆" : `${xpToNext} XP to next level`}
      </p>
    </CardShell>
  );
};

/* ===================== ACHIEVEMENTS PANEL ===================== */
const AchievementsPanel = ({ unlocked = [], total = 0 }) => {
  const pct = total > 0 ? ((unlocked.length / total) * 100).toFixed(0) : 0;

  return (
    <CollapsibleCard
      title="Achievements"
      icon="🏆"
      defaultOpen={false}
      right={
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/45">
            {unlocked.length}/{total}
          </span>
          <div className="w-16 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 gap-2">
        {ALL_ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.includes(a.id);
          const tileClass = `rounded-2xl p-2 text-center transition-all border ${
            isUnlocked
              ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
              : "bg-black/20 border-white/5 opacity-45"
          }`;

          return (
            <div key={a.id} title={a.desc} className={tileClass}>
              <div className="text-2xl mb-1">{a.emoji}</div>
              <div className="text-[10px] font-semibold text-white/85 leading-tight">{a.label}</div>
              <div className="text-[9px] text-white/35 mt-1">{isUnlocked ? "✅" : "🔒"}</div>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
};

/* ===================== STRATEGY SELECTOR ===================== */
const StrategySelector = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
    {STRATEGIES.map((s) => {
      const isActive = value === s.value;
      const btnClass = `rounded-2xl text-left transition-all border p-3 sm:p-4 ${
        isActive
          ? "bg-white/10 border-white/30 shadow-lg shadow-white/5"
          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

      return (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          disabled={disabled}
          className={btnClass}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xl leading-none">{s.icon}</div>
              <div className="mt-1 font-semibold text-[13px] sm:text-sm leading-tight truncate">{s.label}</div>
              <div className="text-[10px] text-white/35 mt-1">{s.description}</div>
            </div>

            <div className={`text-[10px] font-semibold ${riskLabelColor(s.risk)}`}>
              {riskLabel(s.risk)}
            </div>
          </div>

          <div className="mt-2">
            <RiskMeter level={s.risk} />
          </div>
        </button>
      );
    })}
  </div>
);

/* ===================== PLAN SELECTOR ===================== */
const PlanSelector = ({ value, onChange, disabled }) => (
  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
    {PLANS.map((p) => {
      const isActive = value === p.value;
      const btnClass = `rounded-2xl text-left transition-all border px-3 py-2.5 sm:px-4 sm:py-2.5 ${
        isActive
          ? "bg-white/10 border-white/30 shadow-lg shadow-white/5"
          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

      return (
        <button key={p.value} onClick={() => onChange(p.value)} disabled={disabled} className={btnClass}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{p.icon}</span>
            <span className="font-semibold text-[13px] sm:text-sm truncate">{p.label}</span>
          </div>
          <div className="text-[10px] text-white/35 mt-1">${p.price}/mo</div>
        </button>
      );
    })}
  </div>
);

/* ===================== SESSION STATS ===================== */
const SessionStats = ({ 
  wins = 0, 
  losses = 0, 
  bestWinStreak = 0, 
  dayStreak = 0, 
  strategiesUsed = 0, 
  xp = 0, 
  currentPlan,
  currentStrat 
}) => {
  const total = wins + losses;

  return (
    <CardShell title="Session Stats" icon="📊">
      <div className="space-y-2 text-[12px] sm:text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Total Trades</span>
          <span className="font-bold">{total}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Wins / Losses</span>
          <span>
            <span className="text-emerald-400 font-bold">{wins}</span> /{" "}
            <span className="text-red-400 font-bold">{losses}</span>
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Best Streak</span>
          <span className="font-bold">{bestWinStreak} 🔥</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Day Streak</span>
          <span className="font-bold">{dayStreak} 📅</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Strategies</span>
          <span className="font-bold">{strategiesUsed}/4 🧠</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">XP Earned</span>
          <span className="font-bold">{Math.floor(xp)} ⭐</span>
        </div>

        <div className="pt-3 mt-1 border-t border-white/10 space-y-2">
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Plan</span>
            <span className="text-[12px] sm:text-sm font-semibold">
              {currentPlan?.icon} {currentPlan?.label}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Strategy</span>
            <span className="text-[12px] sm:text-sm font-semibold">
              {currentStrat?.icon} {currentStrat?.label}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-white/50">Exchanges</span>
            <span className="text-[11px] text-white/60 text-right leading-snug">
              {currentPlan?.exchanges.join(", ")}
            </span>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

/* ===================== UPGRADE BANNER ===================== */
const UpgradeBanner = ({ currentPlan, onUpgrade }) => {
  const isStarter = currentPlan?.value === "starter";
  
  if (!isStarter) return null;
  
  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🚀</span>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">Upgrade to unlock more exchanges</h3>
            <p className="text-xs text-white/60 mt-1">
              Starter: OKX + Alpaca • Pro: + Staking • Elite: + DEX + Futures
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-sm hover:from-blue-500 hover:to-purple-500 transition-all whitespace-nowrap"
        >
          View Plans →
        </button>
      </div>
    </div>
  );
};

/* ===================== MAIN COMPONENT ===================== */
export default function TradeDemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tickerRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  // Demo state
  const [equity, setEquity] = useState(1000);
  const [pnl, setPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [plan, setPlan] = useState("starter");
  const [strategy, setStrategy] = useState("ai_weighted");
  const [running, setRunning] = useState(false);
  const [dayStreak, setDayStreak] = useState(0);
  const [lastTradeDay, setLastTradeDay] = useState(null);
  const [tradeLog, setTradeLog] = useState([]);
  const [equityHistory, setEquityHistory] = useState([{ value: 1000 }]);
  const [currentWinStreak, setCurrentWinStreak] = useState(0);
  const [bestWinStreak, setBestWinStreak] = useState(0);
  const [strategiesUsed, setStrategiesUsed] = useState(new Set(["ai_weighted"]));
  const [speed, setSpeed] = useState(3000);

  // Derived values
  const currentPlan = useMemo(() => PLANS.find((p) => p.value === plan) || PLANS[0], [plan]);
  const currentStrat = useMemo(() => STRATEGIES.find((s) => s.value === strategy) || STRATEGIES[1], [strategy]);
  
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
    const result = { OKX: [], Alpaca: [], DEX: [], Futures: [] };
    tradeLog.forEach((t) => {
      if (result[t.exchange]) result[t.exchange].push(t);
    });
    return result;
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

  const pnlChartData = useMemo(() => {
    return tradeLog.slice(-30).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl }));
  }, [tradeLog]);

  // Init from URL params
  useEffect(() => {
    const planValues = PLANS.map((p) => p.value);
    const strategyValues = STRATEGIES.map((s) => s.value);

    const urlPlan = pickAllowed(searchParams.get("plan") || searchParams.get("tier"), planValues, "");
    const urlStrategy = pickAllowed(searchParams.get("strategy"), strategyValues, "");

    // Try localStorage
    let savedPlan = "";
    let savedStrategy = "";
    try {
      savedPlan = localStorage.getItem("imali_demo_plan") || "";
      savedStrategy = localStorage.getItem("imali_demo_strategy") || "";
    } catch (e) {}

    setPlan(urlPlan || pickAllowed(savedPlan, planValues, "starter"));
    setStrategy(urlStrategy || pickAllowed(savedStrategy, strategyValues, "ai_weighted"));
  }, [searchParams]);

  // Persist selections
  useEffect(() => {
    try {
      localStorage.setItem("imali_demo_plan", plan);
      localStorage.setItem("imali_demo_strategy", strategy);
    } catch (e) {}
  }, [plan, strategy]);

  // Track strategies used
  useEffect(() => {
    setStrategiesUsed((prev) => new Set([...Array.from(prev), strategy]));
  }, [strategy]);

  // Simulation tick
  useEffect(() => {
    if (!running) return;

    tickerRef.current = setInterval(() => {
      const available = DEMO_TOKENS.filter((t) => currentPlan.exchanges.includes(t.exchange));
      const token = available[Math.floor(Math.random() * available.length)] || DEMO_TOKENS[0];

      const riskMult = 0.5 + currentStrat.risk * 0.4;
      const winBias = 
        strategy === "mean_reversion" ? 0.52 :
        strategy === "ai_weighted" ? 0.55 :
        strategy === "momentum" ? 0.5 : 0.48;

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
    }, speed);

    return () => {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    };
  }, [running, strategy, speed, currentPlan, currentStrat]);

  // Reset demo
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

  // Handlers
  const handleUpgrade = () => {
    if (isAuthenticated) {
      navigate("/pricing");
    } else {
      sessionStorage.setItem("redirectAfterLogin", "/pricing");
      navigate("/signup");
    }
  };

  const handleExchangeClick = (exchangeName) => {
    if (!currentPlan.exchanges.includes(exchangeName)) {
      handleUpgrade();
    }
  };

  const handleGoLive = () => {
    if (isAuthenticated) {
      if (user?.tier_active === "starter") {
        navigate("/activation");
      } else {
        navigate("/dashboard");
      }
    } else {
      sessionStorage.setItem("redirectAfterLogin", "/dashboard");
      navigate("/signup");
    }
  };

  // Render
  const startBtnClass = `px-4 py-2.5 rounded-2xl font-bold transition-all text-sm ${
    running
      ? "bg-red-600 hover:bg-red-500"
      : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20"
  }`;

  const equityColorClass = equity >= 1000 ? "text-emerald-400" : "text-red-400";
  const pnlColorClass = pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const wrBarClass = `h-full rounded-full transition-all duration-500 ${
    Number(winRate) >= 50 ? "bg-emerald-500" : "bg-red-500"
  }`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:p-4 md:p-6 space-y-3 sm:space-y-5">
        {/* Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold truncate">🎮 Trading Simulator</h1>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold border border-blue-500/30">
                  DEMO
                </span>
                {isAuthenticated && user && (
                  <Link 
                    to="/dashboard"
                    className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                  >
                    Go to Live Dashboard →
                  </Link>
                )}
              </div>
              <p className="text-[12px] sm:text-sm text-white/50 mt-1 leading-snug">
                Practice with fake money — no risk. Select a plan to see available exchanges.
              </p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setRunning((r) => !r)} className={startBtnClass}>
                {running ? "⏸ Stop" : "▶️ Start"}
              </button>
              <button
                onClick={resetDemo}
                className="px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-medium text-sm transition-colors"
                title="Reset"
              >
                🔄
              </button>
              <button
                onClick={handleGoLive}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-sm hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 transition-all"
              >
                {isAuthenticated ? "🚀 Go Live" : "🚀 Sign Up"}
              </button>
            </div>
          </div>

          {/* Speed control - only when running */}
          {running && (
            <div className="mt-3 flex flex-wrap items-center gap-2 bg-black/25 border border-white/10 rounded-2xl px-3 py-2">
              <span className="text-[11px] text-white/60">Speed:</span>
              {[
                { label: "🐌", ms: 5000 },
                { label: "🚶", ms: 3000 },
                { label: "🏃", ms: 1500 },
                { label: "⚡", ms: 700 },
              ].map((s) => {
                const cls = `px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
                  speed === s.ms ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"
                }`;
                return (
                  <button key={s.ms} onClick={() => setSpeed(s.ms)} className={cls}>
                    {s.label}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2 text-[11px] text-emerald-400">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Running
              </div>
            </div>
          )}
        </div>

        {/* Plan selector - gated by demo status */}
        <CollapsibleCard title="Select Plan" icon="💳" defaultOpen={true} right={<span className="text-[11px] text-white/45">affects available exchanges</span>}>
          <PlanSelector value={plan} onChange={setPlan} disabled={running} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
            {PLANS.map((p) => (
              <div
                key={p.value}
                className={`text-[11px] p-2 rounded-xl ${
                  plan === p.value ? "bg-white/10 border border-white/20" : "bg-black/20"
                }`}
              >
                <span className="font-semibold block">{p.icon} {p.label}</span>
                <span className="text-white/50">${p.price}/mo</span>
              </div>
            ))}
          </div>
        </CollapsibleCard>

        {/* Strategy selector */}
        <CollapsibleCard
          title="Strategy"
          icon="🧠"
          defaultOpen={true}
          right={running ? <span className="text-[11px] text-yellow-300/80">Stop to change</span> : null}
        >
          <StrategySelector value={strategy} onChange={setStrategy} disabled={running} />
        </CollapsibleCard>

        {/* Upgrade banner for starter plan users */}
        <UpgradeBanner currentPlan={currentPlan} onUpgrade={handleUpgrade} />

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <CardShell title="Equity" icon="💰">
            <div className={`text-xl font-bold leading-tight ${equityColorClass}`}>{formatUsdPlain(equity)}</div>
            <div className="text-[11px] text-white/35 mt-1">Start $1k</div>
          </CardShell>

          <CardShell title="P&L" icon="📊">
            <div className={`text-xl font-bold leading-tight ${pnlColorClass}`}>{formatUsd(pnl)}</div>
            <div className="text-[11px] text-white/35 mt-1">{wins + losses} trades</div>
          </CardShell>

          <CardShell title="Win Rate" icon="🎯">
            <div className="text-xl font-bold leading-tight">{winRate}%</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
              <div className={wrBarClass} style={{ width: `${winRate}%` }} />
            </div>
          </CardShell>

          <CardShell title="Streak" icon="🔥">
            <div className="text-xl font-bold leading-tight">{currentWinStreak}</div>
            <div className="text-[11px] text-white/35 mt-1">Best: {bestWinStreak}</div>
          </CardShell>

          <CardShell title="Confidence" icon="🤖" right={<span className="text-[11px] text-white/45">{confidence}%</span>}>
            <div className="flex items-center gap-2">
              <ProgressRing percent={confidence} size={42} stroke={3}>
                <span className="text-[10px] font-bold">{confidence}%</span>
              </ProgressRing>
              <div className="text-[11px] text-white/50 leading-snug">
                {confidence >= 80 ? "🔥 Very strong" : confidence >= 60 ? "👍 Improving" : "📈 Warming up"}
              </div>
            </div>
          </CardShell>
        </div>

        <LevelBadge xp={xp} />

        {/* Charts */}
        <CollapsibleCard title="Charts" icon="📈" defaultOpen={false} right={<span className="text-[11px] text-white/45">Equity + Results</span>}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CardShell title="Equity" icon="📈" right={<span className={`text-[12px] font-bold ${equityColorClass}`}>{formatUsdPlain(equity)}</span>}>
              <EquityCurve data={equityHistory} height={110} />
            </CardShell>

            <CardShell title="Results" icon="📊" right={<span className="text-[11px] text-white/45">{tradeLog.length} trades</span>}>
              <MiniBarChart data={pnlChartData} height={110} />
            </CardShell>
          </div>
        </CollapsibleCard>

        {/* Exchanges - with gating */}
        <CollapsibleCard title="Exchanges" icon="🔗" defaultOpen={true} right={<span className="text-[11px] text-white/45">click to upgrade</span>}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <DemoExchangeCard
              name="OKX"
              icon="🔷"
              trades={tradesByExchange.OKX}
              active={currentPlan.exchanges.includes("OKX")}
              onClick={() => handleExchangeClick("OKX")}
            />
            <DemoExchangeCard
              name="Alpaca"
              icon="📈"
              trades={tradesByExchange.Alpaca}
              active={currentPlan.exchanges.includes("Alpaca")}
              onClick={() => handleExchangeClick("Alpaca")}
            />
            <DemoExchangeCard
              name="DEX"
              icon="🦄"
              trades={tradesByExchange.DEX}
              active={currentPlan.exchanges.includes("DEX")}
              onClick={() => handleExchangeClick("DEX")}
            />
            <DemoExchangeCard
              name="Futures"
              icon="📊"
              trades={tradesByExchange.Futures}
              active={currentPlan.exchanges.includes("Futures")}
              onClick={() => handleExchangeClick("Futures")}
            />
          </div>
        </CollapsibleCard>

        {/* Trades + Session Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CardShell
            title="Trade Feed"
            icon="📋"
            right={
              running ? (
                <span className="flex items-center gap-2 text-[11px] text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="text-[11px] text-white/45">Feed</span>
              )
            }
          >
            <TradeFeed trades={tradeLog} />
          </CardShell>

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

        {/* Advanced Chart */}
        <CollapsibleCard title="Advanced Chart" icon="📉" defaultOpen={false} right={<span className="text-[11px] text-white/45">overview</span>}>
          <div className="bg-black/20 border border-white/10 rounded-2xl p-2 sm:p-3">
            <TradingOverview
              feed={{
                equity: equity,
                pnl: pnl,
                wins: wins,
                losses: losses,
                running: running,
                mode: "demo",
                plan: plan,
                strategy: strategy,
                ts: Date.now(),
              }}
            />
          </div>
        </CollapsibleCard>

        <AchievementsPanel unlocked={unlockedAchievements} total={ALL_ACHIEVEMENTS.length} />

        {/* CTA */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-4 sm:p-7 text-center">
          <div className="text-4xl sm:text-5xl mb-2">🚀</div>
          <h2 className="text-lg sm:text-2xl font-bold mb-2">Ready for Real?</h2>
          <p className="text-[12px] sm:text-sm text-white/60 max-w-lg mx-auto mb-4">
            Everything works with real money too. {isAuthenticated ? "Go live now!" : "Sign up to start trading live."}
          </p>
          <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={handleGoLive}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-bold text-sm hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all"
            >
              {isAuthenticated ? "🚀 Go to Dashboard" : "🚀 Sign Up"}
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-sm transition-colors"
            >
              💳 View Plans
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-3">
          <p className="text-[10px] text-white/25">🎮 Demo simulator. No real money used. Practice only.</p>
        </div>
      </div>
    </div>
  );
}
