// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI, { BOT_TYPES, EXCHANGE_TO_BOT_TYPE, BOT_TYPE_TO_LABEL } from "../../utils/BotAPI";
import TradingOverview from "../../components/Dashboard/TradingOverview.jsx";

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

const ALL_ACHIEVEMENTS = [
  { id: "first_trade", emoji: "🚀", label: "First Trade", desc: "Complete your first trade", check: (s) => s.totalTrades > 0 },
  { id: "ten_trades", emoji: "📊", label: "10 Trades", desc: "Complete 10 trades", check: (s) => s.totalTrades >= 10 },
  { id: "fifty_trades", emoji: "💯", label: "50 Trades", desc: "Complete 50 trades", check: (s) => s.totalTrades >= 50 },
  { id: "hundred_trades", emoji: "💪", label: "100 Trades", desc: "Complete 100 trades", check: (s) => s.totalTrades >= 100 },
  { id: "thousand_trades", emoji: "🚀", label: "1K Trades", desc: "Complete 1,000 trades", check: (s) => s.totalTrades >= 1000 },
  { id: "ten_thousand_trades", emoji: "💎", label: "10K Trades", desc: "Complete 10,000 trades", check: (s) => s.totalTrades >= 10000 },
  { id: "thirty_thousand_trades", emoji: "🏆", label: "30K Trades", desc: "Complete 30,000 trades", check: (s) => s.totalTrades >= 30000 },
  { id: "profitable", emoji: "💰", label: "In The Green", desc: "Have positive P&L", check: (s) => s.pnl > 0 },
  { id: "hundred_profit", emoji: "💵", label: "100 Profit", desc: "Earn $100 profit", check: (s) => s.pnl >= 100 },
  { id: "thousand_profit", emoji: "💰", label: "1K Profit", desc: "Earn $1,000 profit", check: (s) => s.pnl >= 1000 },
  { id: "ten_thousand_profit", emoji: "💎", label: "10K Profit", desc: "Earn $10,000 profit", check: (s) => s.pnl >= 10000 },
  { id: "win_streak_3", emoji: "🔥", label: "Hot Streak", desc: "Win 3 in a row", check: (s) => s.currentWinStreak >= 3 },
  { id: "win_streak_5", emoji: "⚡", label: "On Fire!", desc: "Win 5 in a row", check: (s) => s.currentWinStreak >= 5 },
  { id: "high_wr", emoji: "🎯", label: "Sharpshooter", desc: "Win rate above 60%", check: (s) => s.winRate > 60 },
  { id: "day_streak", emoji: "📅", label: "Daily Player", desc: "Trade 3+ days", check: (s) => s.dayStreak >= 3 },
  { id: "premium", emoji: "⭐", label: "Premium User", desc: "Upgrade to paid plan", check: (s) => s.plan !== "starter" },
  { id: "all_strats", emoji: "🧠", label: "Strategist", desc: "Try all 4 strategies", check: (s) => s.strategiesUsed >= 4 },
  { id: "confidence_80", emoji: "🤖", label: "Bot Master", desc: "Reach 80% confidence", check: (s) => s.confidence >= 80 },
  { id: "multi_chain", emoji: "🌐", label: "Multi-Chain", desc: "Trade on multiple chains", check: (s) => s.chainsTraded > 1 },
];

// POLLING INTERVAL
const POLL_INTERVAL = 60000; // 1 minute
const INITIAL_LOAD_DELAY = 2000;

// Maximum number of consecutive rate limit errors before backing off
const MAX_RATE_LIMIT_BACKOFF = 3;

/* ===================== GLOBAL FETCH SINGLETON ===================== */
const tradesFetchState = {
  lastFetchTime: 0,
  lastResult: null,
  inFlight: null,
  MIN_GAP: 10000, // 10 seconds minimum between fetches
};

const fetchTradesSingleton = async () => {
  const now = Date.now();
  const elapsed = now - tradesFetchState.lastFetchTime;

  if (elapsed < tradesFetchState.MIN_GAP && tradesFetchState.lastResult !== null) {
    console.log(`[Dashboard] Using cached trades (${Math.round(elapsed / 1000)}s old)`);
    return tradesFetchState.lastResult;
  }

  if (tradesFetchState.inFlight) {
    console.log("[Dashboard] Joining in-flight trades request");
    return tradesFetchState.inFlight;
  }

  console.log("[Dashboard] Fetching fresh trades");
  tradesFetchState.inFlight = BotAPI.getTrades()
    .then((res) => {
      tradesFetchState.lastResult = res;
      tradesFetchState.lastFetchTime = Date.now();
      tradesFetchState.inFlight = null;
      return res;
    })
    .catch((err) => {
      tradesFetchState.inFlight = null;

      if (err?.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers?.["retry-after"] || "30", 10);
        tradesFetchState.lastFetchTime = Date.now() + retryAfter * 1000;
        console.warn(`[Dashboard] 429 — backing off ${retryAfter}s`);

        if (tradesFetchState.lastResult !== null) {
          return tradesFetchState.lastResult;
        }
      }
      throw err;
    });

  return tradesFetchState.inFlight;
};

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

const formatNumber = (n) => {
  return Number(n || 0).toLocaleString();
};

const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return PLANS.some(p => p.value === t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) => {
  const tierOrder = PLANS.map(p => p.value);
  return tierOrder.indexOf(normalizeTier(userTier)) >= tierOrder.indexOf(normalizeTier(requiredTier));
};

const normalizeExchange = (exchange) => {
  if (!exchange) return "DEX";
  const u = String(exchange).toUpperCase();
  if (u.includes("OKX")) return "OKX";
  if (u.includes("ALPACA")) return "ALPACA";
  if (u.includes("DEX")) return "DEX";
  if (u.includes("FUTURE")) return "FUTURES";
  if (u.includes("PAPER")) return "PAPER";
  return "DEX";
};

const getBotTypeFromExchange = (exchange) => {
  const map = {
    "OKX": BOT_TYPES.CEX,
    "Alpaca": BOT_TYPES.STOCKS,
    "DEX": BOT_TYPES.DEX,
    "Futures": BOT_TYPES.FUTURES
  };
  return map[exchange];
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
        No trades yet — bots are scanning 🤖
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
const TradeFeed = ({ trades = [], isPaper = false }) => {
  if (!trades.length) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        <div className="text-3xl mb-2">{isPaper ? "🎮" : "📋"}</div>
        {isPaper
          ? "Paper trades will appear here after starting the bot"
          : "Live trades appear here when the bot starts"}
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
      {trades.slice(-30).reverse().map((t, i) => {
        const isLatest = i === 0;
        const isWin = (t.pnl_usd || 0) >= 0;
        const exchange = normalizeExchange(t.exchange);
        const isPaperTrade = t.mode === "paper" || exchange === "PAPER";
        const pnlValue = t.pnl_usd || 0;
        
        const rowClass = `flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
          isLatest ? "bg-white/10 border border-white/10" : "bg-white/[0.03]"
        }`;
        const pnlClass = `font-bold text-sm ${isWin ? "text-emerald-400" : "text-red-400"}`;

        return (
          <div key={t.id || i} className={rowClass}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base flex-shrink-0">
                {exchange === "OKX" ? "🔷" : exchange === "ALPACA" ? "📈" : exchange === "PAPER" ? "🎮" : "🦄"}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-semibold text-sm truncate">{t.symbol || "BTC"}</span>
                  <span className="text-[10px] text-white/40 hidden xs:inline">{exchange}</span>
                  {isPaperTrade && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                      PAPER
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/35 truncate hidden sm:block">
                  {t.action || "Trade"} • {t.timestamp || new Date(t.created_at || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div className={`flex-shrink-0 ${pnlClass}`}>{formatUsd(pnlValue)}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ===================== EXCHANGE CARD ===================== */
const ExchangeCard = ({ name, icon, trades = [], active, mode, onClick, isRunning, pairs, positions }) => {
  const pnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const wins = trades.filter((t) => (t.pnl_usd || 0) > 0).length;
  const total = trades.length;
  const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const wrNum = Number(wr);

  const chartData = trades.slice(-15).map((t, idx) => ({ 
    label: `#${idx}`, 
    value: t.pnl_usd || 0 
  }));

  const cardClass = `rounded-2xl p-3 border transition-all cursor-pointer ${
    active 
      ? isRunning
        ? "bg-green-500/10 border-green-500/30 hover:border-green-500/50" 
        : "bg-white/5 border-white/15 hover:border-white/25"
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
                isRunning ? (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Running
                  </span>
                ) : mode ? (
                  <span className={`inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                    mode === "live"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : mode === "paper"
                      ? "bg-orange-500/20 text-orange-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}>
                    {mode === "paper" ? "🎮 paper" : mode || "active"}
                  </span>
                ) : (
                  <span className="text-emerald-400">✅ Ready</span>
                )
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

      <div className="grid grid-cols-3 gap-1 mt-3">
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/45">Trades</div>
          <div className="font-bold text-sm">{total}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/45">Positions</div>
          <div className="font-bold text-sm">{positions || 0}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/45">Pairs</div>
          <div className="font-bold text-sm">{pairs || 0}</div>
        </div>
      </div>

      {!active ? (
        <div className="mt-2 text-center text-[10px] text-blue-400 hover:text-blue-300">
          Click to upgrade →
        </div>
      ) : !isRunning && (
        <div className="mt-2 text-center text-[10px] text-emerald-400 hover:text-emerald-300">
          Click to start bot →
        </div>
      )}
    </div>
  );
};

/* ===================== LEVEL BADGE ===================== */
const LevelBadge = ({ trades = 0, winRate = 0, pnl = 0, chainsTraded = 1 }) => {
  const xp = useMemo(() => {
    let total = 0;
    total += Math.min(trades, 100) * 2;
    total += Math.max(0, winRate - 40) * 1.5;
    total += Math.max(0, pnl) * 0.1;
    total += chainsTraded * 10;
    return total;
  }, [trades, winRate, pnl, chainsTraded]);

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
      title="Trader Level"
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

/* ===================== PAPER TRADING CARD ===================== */
const PaperTradingCard = ({ onStart, busy, isRunning, trades = [] }) => {
  const paperPnl = useMemo(
    () => trades.filter((t) => t.mode === "paper" || normalizeExchange(t.exchange) === "PAPER")
      .reduce((s, t) => s + (t.pnl_usd || 0), 0),
    [trades]
  );
  const paperCount = useMemo(
    () => trades.filter((t) => t.mode === "paper" || normalizeExchange(t.exchange) === "PAPER").length,
    [trades]
  );

  return (
    <CardShell>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🎮</span>
          <div>
            <h3 className="font-semibold text-base">Paper Trading</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Practice with virtual money — no risk, real market data
            </p>
          </div>
        </div>

        {isRunning && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
            Running
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
        <div className="bg-black/30 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-white/40">Virtual Balance</div>
          <div className="text-sm font-bold text-white">$100,000</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-white/40">Paper Trades</div>
          <div className="text-sm font-bold">{paperCount}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2.5 text-center">
          <div className="text-[10px] text-white/40">Paper P&L</div>
          <div className={`text-sm font-bold ${paperPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatUsd(paperPnl)}
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
        <p className="text-xs text-blue-200">
          💡 <strong>How it works:</strong> Paper trading simulates real trades
          using live market data but with virtual money. Perfect for testing
          strategies before going live.
        </p>
      </div>

      <button
        onClick={() => onStart("paper")}
        disabled={busy || isRunning}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          isRunning
            ? "bg-orange-600/50 cursor-default"
            : "bg-orange-600 hover:bg-orange-500"
        } disabled:opacity-50`}
      >
        {busy ? "Starting..." : isRunning ? "🎮 Paper Bot Running" : "🎮 Start Paper Trading"}
      </button>

      {!isRunning && (
        <p className="text-[10px] text-white/30 text-center mt-2">
          No API keys required • No real money used • Uses live market prices
        </p>
      )}
    </CardShell>
  );
};

/* ===================== QUICK LINKS BAR ===================== */
const QuickLinksBar = () => (
  <CardShell>
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-xs text-white/40 mr-1">Quick Links:</span>

      <Link
        to="/billing-dashboard"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors"
      >
        <span>💳</span> Billing Dashboard
      </Link>

      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors"
      >
        <span>💰</span> Add Payment
      </Link>

      <Link
        to="/activation"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors"
      >
        <span>⚡</span> Activation
      </Link>

      <Link
        to="/demo"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors"
      >
        <span>🎮</span> Demo
      </Link>

      <a
        href="mailto:support@imali-defi.com"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors"
      >
        <span>📧</span> Support
      </a>
    </div>
  </CardShell>
);

/* ===================== SETUP BANNER ===================== */
const SetupBanner = ({ billing, connections, trading, onCTA, authError }) => {
  const steps = [
    { done: billing, label: "Billing", icon: "💳" },
    { done: connections, label: "Connect", icon: "🔌" },
    { done: trading, label: "Enable", icon: "⚡" },
  ];

  const allDone = billing && connections && trading;
  const currentStep = Math.max(0, steps.findIndex((s) => !s.done));
  const stepText = !billing ? "Add payment" : !connections ? "Connect services" : "Enable trading";

  return (
    <div className="space-y-3">
      {authError && (
        <CardShell>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚙️</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-200">Configuration Notice</p>
              <p className="text-xs text-orange-200/70 mt-1">{authError}</p>
              <p className="text-[10px] text-orange-200/50 mt-2">
                You can still use paper trading while this is being resolved.
              </p>
            </div>
          </div>
        </CardShell>
      )}

      {!allDone && (
        <CardShell>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-2xl sm:text-3xl flex-shrink-0">🚀</span>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm sm:text-base leading-tight">Complete your setup</p>
                <p className="text-[11px] sm:text-xs text-white/50 mt-1">
                  Step {currentStep + 1}/3 — {steps[currentStep]?.label}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                          s.done
                            ? "bg-emerald-500/30 text-emerald-300"
                            : i === currentStep
                            ? "bg-blue-500/30 text-blue-300 ring-1 ring-blue-400/50"
                            : "bg-white/10 text-white/30"
                        }`}
                      >
                        {s.done ? "✓" : s.icon}
                      </span>
                      {i < steps.length - 1 && (
                        <div className={`w-6 h-0.5 ${s.done ? "bg-emerald-500/40" : "bg-white/10"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onCTA}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-colors"
            >
              {stepText} →
            </button>
          </div>
        </CardShell>
      )}
    </div>
  );
};

/* ===================== SESSION STATS ===================== */
const SessionStats = ({ 
  wins = 0, 
  losses = 0, 
  bestWinStreak = 0, 
  dayStreak = 0, 
  strategiesUsed = 0, 
  xp = 0, 
  currentPlan,
  currentStrat,
  botRunning,
  botMode,
  tradingEnabled,
  activeBots,
  totalTrades = 0,
  chainsTraded = 1,
  totalVolume = 0
}) => {
  const total = wins + losses;
  const activeBotCount = Object.values(activeBots || {}).filter(Boolean).length;

  return (
    <CardShell title="Session Stats" icon="📊">
      <div className="space-y-2 text-[12px] sm:text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Status</span>
          <span className="font-bold">
            {activeBotCount > 0
              ? `${activeBotCount} bot${activeBotCount > 1 ? 's' : ''} active`
              : botRunning
              ? botMode === "paper"
                ? "🎮 Paper Trading"
                : "💰 Live Trading"
              : tradingEnabled
              ? "⏸ Paused"
              : "⚡ Ready"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Total Trades</span>
          <span className="font-bold">{formatNumber(totalTrades)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Total Volume</span>
          <span className="font-bold">${formatNumber(totalVolume)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-white/50">Chains</span>
          <span className="font-bold">{chainsTraded} 🌐</span>
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

/* ===================== UPGRADE CARD ===================== */
const UpgradeCard = ({ name, icon, description, features, colorKey, currentTier, requiredTier }) => {
  const navigate = useNavigate();
  const unlocked = tierAtLeast(currentTier, requiredTier);
  
  const colorMap = {
    blue: "from-blue-600/10 to-blue-600/5 border-blue-500/30",
    purple: "from-purple-600/10 to-purple-600/5 border-purple-500/30",
    emerald: "from-emerald-600/10 to-emerald-600/5 border-emerald-500/30",
    amber: "from-amber-600/10 to-amber-600/5 border-amber-500/30",
    gold: "from-yellow-600/10 to-yellow-600/5 border-yellow-500/30",
  };

  const unlockedClass = `bg-gradient-to-br ${colorMap[colorKey] || colorMap.blue}`;
  const lockedClass = "bg-white/5 border-white/10 opacity-80";

  return (
    <div className={`rounded-2xl p-3 sm:p-4 border transition-all overflow-hidden ${unlocked ? unlockedClass : lockedClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{name}</div>
            <div className={`text-[10px] mt-1 ${unlocked ? "text-emerald-400" : "text-white/35"}`}>
              {unlocked ? "✓ Active" : `🔒 ${requiredTier}`}
            </div>
          </div>
        </div>
        {!unlocked && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {requiredTier}
          </span>
        )}
      </div>

      <p className="text-[11px] sm:text-xs text-white/55 mt-2">{description}</p>

      <ul className="mt-3 space-y-1">
        {(features || []).slice(0, 4).map((f, i) => (
          <li key={i} className="text-[11px] sm:text-xs text-white/45 flex items-start gap-2">
            <span className="text-emerald-400 mt-[2px]">✓</span>
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>

      {!unlocked && (
        <button
          onClick={() => navigate("/pricing")}
          className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Upgrade →
        </button>
      )}
    </div>
  );
};

/* ===================== MAIN DASHBOARD COMPONENT ===================== */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const {
    user,
    activation,
    refreshUser,
    refreshActivation,
    authError,
  } = useAuth();

  // State
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    total_trades: 0,
    buy_trades: 0,
    sell_trades: 0,
    spot_trades: 0,
    futures_trades: 0,
    stock_trades: 0,
    sniper_trades: 0,
    spot_positions: 0,
    futures_positions: false,
    stock_positions: false,
    sniper_positions: 0,
    today_trades: 0,
    total_volume: 0,
    active_positions: 0
  });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [botMode, setBotMode] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [activeBots, setActiveBots] = useState({
    paper: false,
    cex: false,
    stocks: false,
    dex: false,
    futures: false
  });
  const [strategy, setStrategy] = useState("ai_weighted");
  const [dayStreak, setDayStreak] = useState(0);
  const [lastTradeDay, setLastTradeDay] = useState(null);
  const [currentWinStreak, setCurrentWinStreak] = useState(0);
  const [bestWinStreak, setBestWinStreak] = useState(0);
  const [strategiesUsed, setStrategiesUsed] = useState(new Set(["ai_weighted"]));
  const [chainsTraded, setChainsTraded] = useState(0);
  
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const [pollInterval, setPollInterval] = useState(POLL_INTERVAL);

  const fetchLock = useRef(false);
  const pollRef = useRef(null);
  const mountedRef = useRef(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchBotStatuses = useCallback(async () => {
    try {
      const statuses = await BotAPI.getBotsStatus();
      if (mountedRef.current) {
        setActiveBots(statuses);
        const anyRunning = Object.values(statuses).some(Boolean);
        setBotRunning(anyRunning);
        if (anyRunning) {
          if (statuses.paper) setBotMode("paper");
          else if (statuses.cex || statuses.stocks || statuses.dex || statuses.futures) setBotMode("live");
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Failed to fetch bot statuses:", err);
    }
  }, []);

  useEffect(() => {
    fetchBotStatuses();
    const interval = setInterval(fetchBotStatuses, 30000);
    return () => clearInterval(interval);
  }, [fetchBotStatuses]);

  const normalizedTier = useMemo(() => normalizeTier(user?.tier), [user?.tier]);
  const currentPlan = useMemo(() => PLANS.find((p) => p.value === normalizedTier) || PLANS[0], [normalizedTier]);
  const currentStrat = useMemo(() => STRATEGIES.find((s) => s.value === strategy) || STRATEGIES[1], [strategy]);

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;
  const hasActivationError = !!activation?._error;

  const connectionsComplete = useMemo(() => {
    const needsOkx = ["starter", "pro", "bundle"].includes(normalizedTier);
    const needsAlpaca = ["starter", "bundle"].includes(normalizedTier);
    const needsWallet = ["elite", "stock", "bundle"].includes(normalizedTier);
    return (!needsOkx || okxConnected) && (!needsAlpaca || alpacaConnected) && (!needsWallet || walletConnected);
  }, [normalizedTier, okxConnected, alpacaConnected, walletConnected]);

  const activationComplete = billingComplete && connectionsComplete && tradingEnabled;

  const canPaperTrade = !!user;
  const canLiveTrade = activationComplete;

  const totalPnL = useMemo(() => trades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [trades]);
  const wins = useMemo(() => trades.filter((t) => (t.pnl_usd || 0) > 0).length, [trades]);
  const losses = useMemo(() => trades.filter((t) => (t.pnl_usd || 0) < 0).length, [trades]);
  const totalTrades = trades.length;

  const winRate = useMemo(() => {
    if (!totalTrades) return "0.0";
    return ((wins / totalTrades) * 100).toFixed(1);
  }, [wins, totalTrades]);

  const xp = useMemo(() => {
    let total = 0;
    total += Math.min(stats.total_trades, 100) * 2;
    total += Math.max(0, Number(winRate) - 40) * 1.5;
    total += Math.max(0, totalPnL) * 0.1;
    total += currentWinStreak * 3;
    total += dayStreak * 5;
    total += chainsTraded * 10;
    if (normalizedTier !== "starter") total += 15;
    return total;
  }, [stats.total_trades, winRate, totalPnL, currentWinStreak, dayStreak, chainsTraded, normalizedTier]);

  const confidence = useMemo(() => {
    let s = 0;
    if (stats.total_trades > 0) s += clamp((wins / stats.total_trades) * 40, 0, 40);
    s += clamp(stats.total_trades * 0.1, 0, 30);
    s += clamp(dayStreak * 5, 0, 20);
    s += chainsTraded * 5;
    if (normalizedTier !== "starter") s += 10;
    if (activationComplete) s += 15;
    if (botRunning) s += 5;
    return clamp(Math.round(s), 0, 100);
  }, [wins, stats.total_trades, dayStreak, chainsTraded, normalizedTier, activationComplete, botRunning]);

  const todayTrades = useMemo(() => {
    const today = new Date().toDateString();
    return trades.filter((t) => {
      const date = t.timestamp || t.created_at || Date.now();
      return new Date(date).toDateString() === today;
    });
  }, [trades]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [todayTrades]);

  const chartData = useMemo(
    () => trades.slice(-24).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl_usd || 0 })),
    [trades]
  );

  const equityHistory = useMemo(() => {
    let balance = activationComplete ? 1000 : 100000;
    return trades.map((t) => {
      balance += (t.pnl_usd || 0);
      return { value: balance };
    });
  }, [trades, activationComplete]);

  const tradesByExchange = useMemo(() => {
    const result = { OKX: [], Alpaca: [], DEX: [], Futures: [], PAPER: [] };
    trades.forEach((t) => {
      const exchange = normalizeExchange(t.exchange);
      if (t.mode === "paper" || t.bot_type === "paper") {
        result.PAPER.push(t);
      } else if (result[exchange]) {
        result[exchange].push(t);
      }
    });
    return result;
  }, [trades]);

  const unlockedAchievements = useMemo(() => {
    const statsData = {
      totalTrades: stats.total_trades,
      wins,
      losses,
      pnl: totalPnL,
      currentWinStreak,
      winRate: Number(winRate),
      dayStreak,
      plan: normalizedTier,
      strategiesUsed: strategiesUsed.size,
      confidence,
      chainsTraded
    };
    return ALL_ACHIEVEMENTS.filter((a) => a.check(statsData)).map((a) => a.id);
  }, [stats.total_trades, wins, losses, totalPnL, currentWinStreak, winRate, dayStreak, normalizedTier, strategiesUsed, confidence, chainsTraded]);

  const loadTrades = useCallback(async () => {
    if (fetchLock.current) return;
    if (!user) return;

    fetchLock.current = true;
    try {
      const result = await fetchTradesSingleton();
      
      if (rateLimitCount > 0) {
        setRateLimitCount(0);
        setPollInterval(prev => Math.max(POLL_INTERVAL, Math.floor(prev * 0.8)));
      }
      
      if (mountedRef.current) {
        setTrades(result.trades || []);
        setStats(result.stats || {
          total_trades: 0,
          buy_trades: 0,
          sell_trades: 0,
          spot_trades: 0,
          futures_trades: 0,
          stock_trades: 0,
          sniper_trades: 0,
          spot_positions: 0,
          futures_positions: false,
          stock_positions: false,
          sniper_positions: 0,
          today_trades: 0,
          total_volume: 0,
          active_positions: 0
        });
        
        // Calculate chains traded
        const chains = new Set();
        result.trades?.forEach(t => {
          if (t.chain) chains.add(t.chain);
        });
        setChainsTraded(chains.size);
        
        if (result.trades && result.trades.length > 0) {
          let streak = 0;
          let best = 0;
          for (let i = result.trades.length - 1; i >= 0; i--) {
            const pnl = result.trades[i].pnl_usd || 0;
            if (pnl > 0) {
              streak++;
              best = Math.max(best, streak);
            } else if (pnl < 0) {
              streak = 0;
            }
          }
          setCurrentWinStreak(streak);
          setBestWinStreak((prev) => Math.max(prev, best));
        }
      }
    } catch (err) {
      if (err?.response?.status === 429) {
        setRateLimitCount(prev => {
          const newCount = prev + 1;
          const backoffMultiplier = Math.min(Math.pow(2, newCount), 10);
          setPollInterval(Math.min(300000, POLL_INTERVAL * backoffMultiplier));
          return newCount;
        });
      } else if (err?.response?.status !== 403) {
        console.warn("[Dashboard] loadTrades failed:", err?.response?.status, err?.message);
      }
    } finally {
      fetchLock.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [user, rateLimitCount, pollInterval]);

  useEffect(() => {
    if (hasLoadedOnce.current) return;
    hasLoadedOnce.current = true;

    const timer = setTimeout(() => {
      loadTrades();
    }, INITIAL_LOAD_DELAY);

    return () => clearTimeout(timer);
  }, [loadTrades]);

  useEffect(() => {
    if (!botRunning && !tradingEnabled) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(loadTrades, pollInterval);
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [botRunning, tradingEnabled, loadTrades, pollInterval]);

  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await BotAPI.tradingEnable(enabled);

      if (refreshActivation) {
        await refreshActivation();
      } else if (refreshUser) {
        await refreshUser();
      }

      setBanner({ type: "success", message: enabled ? "✅ Trading enabled!" : "⏸ Trading paused." });
      if (enabled) setTimeout(loadTrades, 2000);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Couldn't update trading status",
      });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async (mode = "paper", botType = null) => {
    try {
      setBusy(true);
      
      const actualBotType = botType || (mode === "paper" ? "paper" : "live");
      
      const payload = {
        mode,
        strategy: strategy,
        bot_type: actualBotType
      };
      
      const res = await BotAPI.startBot(payload);
      
      if (res?.started || res?.success) {
        setActiveBots(prev => ({ ...prev, [actualBotType]: true }));
        setBotRunning(true);
        if (actualBotType === "paper") {
          setBotMode("paper");
        } else {
          setBotMode("live");
        }
        
        const messages = {
          paper: "🎮 Paper trading bot started! Virtual trades will appear shortly.",
          cex: "🤖 CEX (OKX) trading bot started!",
          stocks: "📈 Stocks (Alpaca) trading bot started!",
          dex: "🦄 DEX trading bot started!",
          futures: "📊 Futures trading bot started!"
        };
        
        setBanner({
          type: "success",
          message: messages[actualBotType] || messages[mode] || "Bot started!"
        });
        
        setTimeout(loadTrades, 3000);
        setTimeout(loadTrades, 8000);
        setTimeout(loadTrades, 15000);
        setTimeout(fetchBotStatuses, 2000);
      } else {
        setBanner({
          type: "error",
          message: res?.message || "Bot didn't start — try again",
        });
      }
    } catch (err) {
      console.error("[Dashboard] Start bot error:", err);
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Bot failed to start. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupCTA = () => {
    if (!billingComplete) navigate("/billing");
    else navigate("/activation");
  };

  const handleExchangeClick = (exchangeName) => {
    if (!currentPlan.exchanges.includes(exchangeName)) {
      navigate("/pricing");
      return;
    }
    
    const botType = getBotTypeFromExchange(exchangeName);
    
    if (activeBots[botType]) {
      setBanner({
        type: "info",
        message: `${exchangeName} bot is already running`
      });
    } else {
      startBot("live", botType);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in to continue</p>
          <button onClick={() => navigate("/login")} className="px-6 py-2 bg-emerald-600 rounded-xl font-semibold">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = user.email?.split("@")[0] || "Trader";

  const equityColorClass = (activationComplete ? 1000 + totalPnL : 100000 + totalPnL) >= (activationComplete ? 1000 : 100000) 
    ? "text-emerald-400" : "text-red-400";
  const pnlColorClass = totalPnL >= 0 ? "text-emerald-400" : "text-red-400";
  const wrBarClass = `h-full rounded-full transition-all duration-500 ${
    Number(winRate) >= 50 ? "bg-emerald-500" : "bg-red-500"
  }`;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:p-4 md:p-6 space-y-3 sm:space-y-5">
        {banner && (
          <div
            className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-sm ${
              banner.type === "error"
                ? "bg-red-600/10 border-red-500/40 text-red-200"
                : "bg-emerald-600/10 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span className="min-w-0">{banner.message}</span>
            <button onClick={() => setBanner(null)} className="text-white/50 hover:text-white flex-shrink-0">
              ✕
            </button>
          </div>
        )}

        <QuickLinksBar />

        <SetupBanner
          billing={billingComplete}
          connections={connectionsComplete}
          trading={tradingEnabled}
          onCTA={handleSetupCTA}
          authError={authError}
        />

        <CardShell>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight min-w-0 truncate">
                  👋 Hey, {displayName}!
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30`}
                >
                  <span>{currentPlan.icon}</span>
                  <span className="capitalize">{normalizedTier}</span>
                </span>
                {activationComplete && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Active
                  </span>
                )}
                {Object.values(activeBots).some(Boolean) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    {Object.values(activeBots).filter(Boolean).length} Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-sm text-white/55 mt-1">
                {stats.total_trades > 0 
                  ? `${formatNumber(stats.total_trades)} total trades` 
                  : "Your trading dashboard"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
              {canLiveTrade ? (
                <>
                  <button
                    onClick={() => toggleTrading(!tradingEnabled)}
                    disabled={busy}
                    className={`px-3 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                      tradingEnabled ? "bg-red-600/80 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-500"
                    }`}
                  >
                    {busy ? "..." : tradingEnabled ? "⏸ Pause" : "▶ Enable"}
                  </button>
                  <button
                    onClick={() => startBot("live")}
                    disabled={!tradingEnabled || busy}
                    className="px-3 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm disabled:opacity-50"
                  >
                    {busy ? "..." : "🚀 Start Live"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startBot("paper")}
                    disabled={busy || activeBots.paper}
                    className="px-3 sm:px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 font-semibold text-sm disabled:opacity-50"
                  >
                    {busy ? "..." : activeBots.paper ? "🎮 Running" : "🎮 Paper Trade"}
                  </button>
                  <button
                    onClick={handleSetupCTA}
                    className="px-3 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm"
                  >
                    ⚡ Setup Live
                  </button>
                </>
              )}
            </div>
          </div>
        </CardShell>

        <CollapsibleCard
          title="Strategy"
          icon="🧠"
          defaultOpen={false}
          right={botRunning ? <span className="text-[11px] text-yellow-300/80">Stop to change</span> : null}
        >
          <StrategySelector value={strategy} onChange={setStrategy} disabled={botRunning} />
        </CollapsibleCard>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <CardShell title="Balance" icon="💰">
            <div className={`text-xl font-bold leading-tight ${equityColorClass}`}>
              {formatUsdPlain(activationComplete ? 1000 + totalPnL : 100000 + totalPnL)}
            </div>
            <div className="text-[11px] text-white/35 mt-1">
              {activationComplete ? "Live • Start $1k" : "Paper • $100k virtual"}
            </div>
          </CardShell>

          <CardShell title="Today" icon="📈">
            <div className={`text-xl font-bold leading-tight ${todayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatUsd(todayPnL)}
            </div>
            <div className="text-[11px] text-white/35 mt-1">{todayTrades.length} trades</div>
          </CardShell>

          <CardShell title="Total Trades" icon="📊">
            <div className="text-xl font-bold leading-tight text-white">{formatNumber(stats.total_trades)}</div>
            <div className="text-[11px] text-white/35 mt-1">{stats.spot_trades} spot · {stats.futures_trades} futures</div>
          </CardShell>

          <CardShell title="Active Positions" icon="🎯">
            <div className="text-xl font-bold leading-tight text-white">{stats.active_positions}</div>
            <div className="text-[11px] text-white/35 mt-1">Across {chainsTraded} chains</div>
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

        {!activationComplete && (
          <PaperTradingCard
            onStart={startBot}
            busy={busy}
            isRunning={activeBots.paper}
            trades={trades}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-1">
            <LevelBadge 
              trades={stats.total_trades} 
              winRate={Number(winRate)} 
              pnl={totalPnL} 
              chainsTraded={chainsTraded}
            />
          </div>

          <div className="lg:col-span-2">
            <CollapsibleCard icon="📊" title="Recent Results" defaultOpen={true} right={`${stats.total_trades} total trades`}>
              <MiniBarChart data={chartData} height={92} />
            </CollapsibleCard>
          </div>
        </div>

        <CollapsibleCard icon="🔗" title="Connected Exchanges" defaultOpen={true} right="click to manage">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {activeBots.paper && (
              <ExchangeCard
                name="Paper Trading"
                icon="🎮"
                trades={tradesByExchange.PAPER}
                active={true}
                mode="paper"
                isRunning={activeBots.paper}
                onClick={() => navigate("/demo")}
                pairs={0}
                positions={0}
              />
            )}

            <ExchangeCard
              name="OKX"
              icon="🔷"
              trades={tradesByExchange.OKX}
              active={okxConnected}
              mode={activation?.okx_mode}
              isRunning={activeBots.cex}
              onClick={() => handleExchangeClick("OKX")}
              pairs={162}
              positions={stats.spot_positions}
            />

            <ExchangeCard
              name="Alpaca"
              icon="📈"
              trades={tradesByExchange.Alpaca}
              active={alpacaConnected}
              mode={activation?.alpaca_mode}
              isRunning={activeBots.stocks}
              onClick={() => handleExchangeClick("Alpaca")}
              pairs={417}
              positions={stats.stock_positions ? 1 : 0}
            />

            <ExchangeCard
              name="DEX"
              icon="🦄"
              trades={tradesByExchange.DEX}
              active={walletConnected && tierAtLeast(normalizedTier, "stock")}
              isRunning={activeBots.dex}
              onClick={() => handleExchangeClick("DEX")}
              pairs={162}
              positions={0}
            />

            <ExchangeCard
              name="Futures"
              icon="📊"
              trades={tradesByExchange.Futures}
              active={tierAtLeast(normalizedTier, "elite")}
              isRunning={activeBots.futures}
              onClick={() => handleExchangeClick("Futures")}
              pairs={199}
              positions={stats.futures_positions ? 1 : 0}
            />
          </div>
        </CollapsibleCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <CardShell
            title={activeBots.paper ? "Paper Trades" : "Live Trades"}
            icon="📋"
            right={
              Object.values(activeBots).some(Boolean) ? (
                <span className="flex items-center gap-2 text-[11px] text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  {activeBots.paper ? "Paper" : "Live"}
                </span>
              ) : null
            }
          >
            <TradeFeed trades={trades} isPaper={activeBots.paper} />
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
            botRunning={botRunning}
            botMode={botMode}
            tradingEnabled={tradingEnabled}
            activeBots={activeBots}
            totalTrades={stats.total_trades}
            chainsTraded={chainsTraded}
            totalVolume={stats.total_volume}
          />
        </div>

        <CollapsibleCard title="Advanced Chart" icon="📉" defaultOpen={false} right="overview">
          <div className="bg-black/20 border border-white/10 rounded-2xl p-2 sm:p-3">
            <TradingOverview
              feed={{
                equity: activationComplete ? 1000 + totalPnL : 100000 + totalPnL,
                pnl: totalPnL,
                wins: wins,
                losses: losses,
                running: botRunning,
                mode: botMode || "idle",
                plan: normalizedTier,
                strategy: strategy,
                ts: Date.now(),
              }}
            />
          </div>
        </CollapsibleCard>

        <AchievementsPanel unlocked={unlockedAchievements} total={ALL_ACHIEVEMENTS.length} />

        {activationComplete && (
          <CollapsibleCard icon="⚡" title="Upgrades" defaultOpen={false} right="unlock more">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <UpgradeCard
                name="Staking"
                icon="🥩"
                description="Earn passive rewards"
                features={["Daily rewards", "No lock-up", "Auto-compound"]}
                colorKey="purple"
                currentTier={normalizedTier}
                requiredTier="pro"
              />
              <UpgradeCard
                name="DEX Trading"
                icon="🦄"
                description="Trade on DEXes"
                features={["Uniswap", "MEV protection", "Slippage control"]}
                colorKey="blue"
                currentTier={normalizedTier}
                requiredTier="stock"
              />
              <UpgradeCard
                name="Yield Farming"
                icon="🌾"
                description="Liquidity pools"
                features={["Top pools", "Auto-harvest", "Impermanent loss protection"]}
                colorKey="emerald"
                currentTier={normalizedTier}
                requiredTier="elite"
              />
              <UpgradeCard
                name="Futures"
                icon="📊"
                description="Leverage trading"
                features={["Up to 20x", "Auto stop-loss", "Funding rate optimizer"]}
                colorKey="amber"
                currentTier={normalizedTier}
                requiredTier="elite"
              />
            </div>
          </CollapsibleCard>
        )}

        {!activationComplete && !Object.values(activeBots).some(Boolean) && (
          <CardShell>
            <div className="text-center py-4">
              <div className="text-4xl sm:text-6xl mb-3">🤖</div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Almost ready for live trading!</h2>
              <p className="text-[11px] sm:text-sm text-white/55 mb-4 max-w-md mx-auto">
                Complete setup to unlock live trading, or try paper trading above to practice risk-free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleSetupCTA}
                  className="px-6 sm:px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-sm font-semibold hover:opacity-95"
                >
                  Finish Setup →
                </button>
                <button
                  onClick={() => startBot("paper")}
                  disabled={busy}
                  className="px-6 sm:px-8 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-sm font-semibold disabled:opacity-50"
                >
                  🎮 Try Paper Trading
                </button>
              </div>
            </div>
          </CardShell>
        )}

        <div className="text-center py-3">
          <Link to="/demo" className="text-[11px] text-white/40 hover:text-white/60 transition-colors">
            🎮 Try the Demo Simulator →
          </Link>
        </div>

        <div className="pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-3 justify-center text-xs text-white/40">
            <Link to="/billing-dashboard" className="hover:text-white transition-colors">
              💳 Billing Dashboard
            </Link>
            <span>•</span>
            <Link to="/activation" className="hover:text-white transition-colors">
              ⚡ Activation
            </Link>
            <span>•</span>
            <Link to="/billing" className="hover:text-white transition-colors">
              💰 Payment Methods
            </Link>
            <span>•</span>
            <Link to="/demo" className="hover:text-white transition-colors">
              🎮 Demo
            </Link>
            <span>•</span>
            <a href="mailto:support@imali-defi.com" className="hover:text-white transition-colors">
              📧 Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
