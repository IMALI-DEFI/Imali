// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ===================== CONSTANTS ===================== */
var STRATEGIES = [
  { value: "mean_reversion", label: "Conservative", icon: "🛡️", risk: 1, description: "Mean reversion, low risk", color: "blue" },
  { value: "ai_weighted", label: "Balanced", icon: "🤖", risk: 2, description: "AI-weighted, medium risk", color: "purple" },
  { value: "momentum", label: "Growth", icon: "📈", risk: 3, description: "Momentum following", color: "amber" },
  { value: "volume_spike", label: "Aggressive", icon: "🔥", risk: 4, description: "Volume spike detection", color: "red" },
];

var PLANS = [
  { value: "starter", label: "Starter", icon: "🎟️", exchanges: ["OKX", "Alpaca"] },
  { value: "pro", label: "Pro", icon: "⭐", exchanges: ["OKX", "Alpaca", "Staking"] },
  { value: "elite", label: "Elite", icon: "👑", exchanges: ["OKX", "Alpaca", "DEX", "Futures"] },
  { value: "stock", label: "Stocks", icon: "📈", exchanges: ["Alpaca", "DEX"] },
  { value: "bundle", label: "Bundle", icon: "🧩", exchanges: ["OKX", "Alpaca", "DEX", "Futures", "Staking"] },
];

var DEMO_TOKENS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", exchange: "OKX" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", exchange: "OKX" },
  { symbol: "SOL", name: "Solana", icon: "◎", exchange: "OKX" },
  { symbol: "AAPL", name: "Apple", icon: "🍎", exchange: "Alpaca" },
  { symbol: "TSLA", name: "Tesla", icon: "⚡", exchange: "Alpaca" },
  { symbol: "NVDA", name: "Nvidia", icon: "💚", exchange: "Alpaca" },
  { symbol: "UNI", name: "Uniswap", icon: "🦄", exchange: "DEX" },
  { symbol: "BTC-PERP", name: "BTC Futures", icon: "📊", exchange: "Futures" },
];

var LEVEL_THRESHOLDS = [
  { name: "🥉 Bronze", min: 0, colorClass: "text-amber-600" },
  { name: "🥈 Silver", min: 30, colorClass: "text-gray-300" },
  { name: "🥇 Gold", min: 70, colorClass: "text-yellow-300" },
  { name: "💎 Diamond", min: 120, colorClass: "text-cyan-400" },
  { name: "🏆 Legend", min: 200, colorClass: "text-yellow-400" },
];

var ALL_ACHIEVEMENTS = [
  {
    id: "first_trade",
    emoji: "🚀",
    label: "First Trade",
    desc: "Complete your first trade",
    check: function (s) {
      return s.totalTrades > 0;
    },
  },
  {
    id: "ten_trades",
    emoji: "📊",
    label: "10 Trades",
    desc: "Complete 10 trades",
    check: function (s) {
      return s.totalTrades >= 10;
    },
  },
  {
    id: "fifty_trades",
    emoji: "💯",
    label: "50 Trades",
    desc: "Complete 50 trades",
    check: function (s) {
      return s.totalTrades >= 50;
    },
  },
  {
    id: "profitable",
    emoji: "💰",
    label: "In The Green",
    desc: "Have positive P&L",
    check: function (s) {
      return s.pnl > 0;
    },
  },
  {
    id: "hundred_profit",
    emoji: "💵",
    label: "100 Profit",
    desc: "Earn 100 in demo",
    check: function (s) {
      return s.pnl >= 100;
    },
  },
  {
    id: "win_streak_3",
    emoji: "🔥",
    label: "Hot Streak",
    desc: "Win 3 in a row",
    check: function (s) {
      return s.currentWinStreak >= 3;
    },
  },
  {
    id: "win_streak_5",
    emoji: "⚡",
    label: "On Fire!",
    desc: "Win 5 in a row",
    check: function (s) {
      return s.currentWinStreak >= 5;
    },
  },
  {
    id: "high_wr",
    emoji: "🎯",
    label: "Sharpshooter",
    desc: "Win rate above 60%",
    check: function (s) {
      return s.winRate > 60;
    },
  },
  {
    id: "day_streak",
    emoji: "📅",
    label: "Daily Player",
    desc: "Trade 3+ days",
    check: function (s) {
      return s.dayStreak >= 3;
    },
  },
  {
    id: "upgraded",
    emoji: "⭐",
    label: "Plan Explorer",
    desc: "Try a paid plan",
    check: function (s) {
      return s.plan !== "starter";
    },
  },
  {
    id: "all_strats",
    emoji: "🧠",
    label: "Strategist",
    desc: "Try all 4 strategies",
    check: function (s) {
      return s.strategiesUsed >= 4;
    },
  },
  {
    id: "confidence_80",
    emoji: "🤖",
    label: "Bot Master",
    desc: "Reach 80% confidence",
    check: function (s) {
      return s.confidence >= 80;
    },
  },
];

/* ===================== HELPERS ===================== */
function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function formatUsd(n) {
  var num = Number(n) || 0;
  var sign = num >= 0 ? "+" : "-";
  var abs = Math.abs(num).toFixed(2);
  return sign + "$" + abs;
}

function formatUsdPlain(n) {
  var num = Number(n) || 0;
  return "$" + num.toFixed(2);
}

function pickAllowed(v, allowed, fallback) {
  var x = String(v || "").toLowerCase();
  return allowed.includes(x) ? x : fallback;
}

/* ===================== PROGRESS RING ===================== */
function ProgressRing(props) {
  var percent = props.percent || 0;
  var size = props.size || 80;
  var stroke = props.stroke || 6;
  var color = props.color || "#10b981";
  var children = props.children;

  var radius = (size - stroke) / 2;
  var circ = 2 * Math.PI * radius;
  var offset = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
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
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ===================== MINI BAR CHART ===================== */
function MiniBarChart(props) {
  var data = props.data || [];
  var height = props.height || 60;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-xs text-white/30"
        style={{ height: height }}
      >
        Press Start to see trades here! 🤖
      </div>
    );
  }

  var absValues = data.map(function (d) {
    return Math.abs(d.value);
  });
  var max = Math.max.apply(null, absValues.concat([1]));

  return (
    <div className="flex items-end gap-[2px]" style={{ height: height }}>
      {data.slice(-30).map(function (d, i) {
        var h = (Math.abs(d.value) / max) * height * 0.9;
        var isPositive = d.value >= 0;
        var barClass =
          "rounded-t flex-1 min-w-[3px] max-w-[14px] transition-all duration-300 cursor-pointer hover:opacity-70 " +
          (isPositive ? "bg-emerald-500" : "bg-red-500");

        return (
          <div
            key={i}
            title={d.label + ": " + formatUsd(d.value)}
            className={barClass}
            style={{ height: Math.max(h, 2) }}
          />
        );
      })}
    </div>
  );
}

/* ===================== EQUITY CURVE ===================== */
function EquityCurve(props) {
  var data = props.data || [];
  var height = props.height || 120;

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-white/20"
        style={{ height: height }}
      >
        Equity curve appears after a few trades
      </div>
    );
  }

  var values = data.map(function (d) {
    return d.value;
  });
  var min = Math.min.apply(null, values);
  var max = Math.max.apply(null, values);
  var range = max - min || 1;
  var w = 400;

  var points = values
    .map(function (v, i) {
      var x = (i / (values.length - 1)) * w;
      var y = height - ((v - min) / range) * (height - 10) - 5;
      return x + "," + y;
    })
    .join(" ");

  var lastVal = values[values.length - 1];
  var firstVal = values[0];
  var up = lastVal >= firstVal;
  var strokeColor = up ? "#10b981" : "#ef4444";
  var fillId = up ? "eqGradUp" : "eqGradDown";

  return (
    <svg
      viewBox={"0 0 " + w + " " + height}
      className="w-full"
      style={{ height: height }}
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
        points={"0," + height + " " + points + " " + w + "," + height}
        fill={"url(#" + fillId + ")"}
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
function RiskMeter(props) {
  var level = props.level || 1;
  var labels = ["Low", "Medium", "High", "Extreme"];
  var label = labels[level - 1] || "Medium";

  var labelColor = "text-yellow-400";
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
        <div
          className={
            "flex-1 h-2 rounded-full transition-all duration-300 " +
            (level >= 1 ? "bg-emerald-500" : "bg-white/10")
          }
        />
        <div
          className={
            "flex-1 h-2 rounded-full transition-all duration-300 " +
            (level >= 2 ? "bg-yellow-500" : "bg-white/10")
          }
        />
        <div
          className={
            "flex-1 h-2 rounded-full transition-all duration-300 " +
            (level >= 3 ? "bg-orange-500" : "bg-white/10")
          }
        />
        <div
          className={
            "flex-1 h-2 rounded-full transition-all duration-300 " +
            (level >= 4 ? "bg-red-500" : "bg-white/10")
          }
        />
      </div>
    </div>
  );
}

/* ===================== TRADE FEED ===================== */
function TradeFeed(props) {
  var trades = props.trades || [];

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
        .map(function (t, i) {
          var isLatest = i === 0;
          var isWin = t.pnl >= 0;
          var rowClass =
            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all " +
            (isLatest
              ? "bg-white/10 border border-white/10"
              : "bg-white/[0.03]");
          var pnlClass =
            "font-bold text-sm " +
            (isWin ? "text-emerald-400" : "text-red-400");

          return (
            <div key={t.id} className={rowClass}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base flex-shrink-0">{t.icon}</span>
                <div className="truncate">
                  <span className="font-medium text-sm">{t.symbol}</span>
                  <span className="text-xs text-white/40 ml-1 hidden xs:inline">
                    {t.exchange}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-white/40 hidden sm:inline">{t.action}</span>
                <span className={pnlClass + " text-sm"}>{formatUsd(t.pnl)}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ===================== EXCHANGE CARD ===================== */
function DemoExchangeCard(props) {
  var name = props.name;
  var icon = props.icon;
  var trades = props.trades || [];
  var active = props.active;

  var pnl = 0;
  var wins = 0;
  for (var i = 0; i < trades.length; i++) {
    pnl += trades[i].pnl;
    if (trades[i].pnl > 0) wins++;
  }
  var total = trades.length;
  var wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  var wrNum = Number(wr);

  var chartData = trades.slice(-15).map(function (t, idx) {
    return { label: "#" + idx, value: t.pnl };
  });

  var cardClass =
    "bg-white/5 border rounded-xl p-4 transition-all " +
    (active
      ? "border-white/20 hover:border-white/30"
      : "border-white/10 opacity-40 pointer-events-none");

  var pnlClass =
    "font-bold text-sm " + (pnl >= 0 ? "text-emerald-400" : "text-red-400");

  var wrBarClass =
    "h-full rounded-full transition-all duration-500 " +
    (wrNum >= 50 ? "bg-emerald-500" : "bg-red-500");

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm">{name}</h3>
            {active ? (
              <span className="text-xs text-emerald-400">✅ Active</span>
            ) : (
              <span className="text-xs text-white/30">
                🔒 Upgrade
              </span>
            )}
          </div>
        </div>
        {active && total > 0 && (
          <ProgressRing
            percent={wrNum}
            size={36}
            stroke={3}
            color={wrNum >= 50 ? "#10b981" : "#ef4444"}
          >
            <span className="text-[9px] font-bold">{wr}%</span>
          </ProgressRing>
        )}
      </div>

      {active && <MiniBarChart data={chartData} height={28} />}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-[9px] text-white/40">Trades</div>
          <div className="font-bold text-sm">{total}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-[9px] text-white/40">P&amp;L</div>
          <div className={pnlClass + " text-sm"}>{formatUsd(pnl)}</div>
        </div>
      </div>

      {active && total > 0 && (
        <div className="mt-2">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div className={wrBarClass} style={{ width: wr + "%" }} />
          </div>
          <div className="flex justify-between text-[9px] text-white/30 mt-1">
            <span>{wins}W</span>
            <span>{total - wins}L</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== LEVEL BADGE ===================== */
function LevelBadge(props) {
  var xp = props.xp || 0;

  var level = useMemo(
    function () {
      for (var i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i].min) {
          var next = LEVEL_THRESHOLDS[i + 1]
            ? LEVEL_THRESHOLDS[i + 1].min
            : LEVEL_THRESHOLDS[i].min * 1.5;
          return {
            name: LEVEL_THRESHOLDS[i].name,
            colorClass: LEVEL_THRESHOLDS[i].colorClass,
            min: LEVEL_THRESHOLDS[i].min,
            xp: xp,
            next: next,
            index: i,
          };
        }
      }
      return {
        name: LEVEL_THRESHOLDS[0].name,
        colorClass: LEVEL_THRESHOLDS[0].colorClass,
        min: 0,
        xp: xp,
        next: 30,
        index: 0,
      };
    },
    [xp]
  );

  var progress = level.next > 0 ? (xp / level.next) * 100 : 0;
  var xpToNext = Math.max(0, Math.floor(level.next - xp));
  var isMax = level.index >= LEVEL_THRESHOLDS.length - 1;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-xs sm:text-sm text-white/60">Your Trader Level</h3>
          <span className={"text-lg sm:text-xl font-bold " + level.colorClass}>
            {level.name}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/40">XP</div>
          <div className="text-base sm:text-lg font-bold">{Math.floor(xp)}</div>
        </div>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 sm:h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: Math.min(progress, 100) + "%" }}
        />
      </div>
      <p className="text-[10px] sm:text-xs text-white/40 mt-1">
        {Math.floor(xp)} / {Math.floor(level.next)} XP —{" "}
        {isMax
          ? "Max level reached! 🏆"
          : xpToNext + " XP to next level!"}
      </p>
    </div>
  );
}

/* ===================== ACHIEVEMENTS ===================== */
function AchievementsPanel(props) {
  var unlocked = props.unlocked || [];
  var total = props.total || 0;
  var pct = total > 0 ? ((unlocked.length / total) * 100).toFixed(0) : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h3 className="font-semibold text-sm sm:text-base">Achievements</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">
            {unlocked.length}/{total}
          </span>
          <div className="w-16 sm:w-20 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: pct + "%" }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {ALL_ACHIEVEMENTS.map(function (a) {
          var isUnlocked = unlocked.includes(a.id);
          var tileClass =
            "rounded-xl p-2 sm:p-3 text-center transition-all border " +
            (isUnlocked
              ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50"
              : "bg-black/20 border-white/5 opacity-40");

          return (
            <div key={a.id} title={a.desc} className={tileClass}>
              <div className="text-xl sm:text-2xl mb-1">{a.emoji}</div>
              <div className="text-[9px] sm:text-[11px] font-medium text-white/80 leading-tight">
                {a.label}
              </div>
              <div className="text-[7px] sm:text-[9px] text-white/30 mt-1 hidden xs:block">
                {isUnlocked ? "✅ Unlocked" : "🔒"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== STRATEGY SELECTOR (COMPACT & ORGANIZED) ===================== */
function StrategySelector(props) {
  var value = props.value;
  var onChange = props.onChange;
  var disabled = props.disabled;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STRATEGIES.map(function (s) {
        var isActive = value === s.value;
        var colorClasses = {
          blue: isActive ? "bg-blue-500/20 border-blue-500/40" : "hover:bg-blue-500/10",
          purple: isActive ? "bg-purple-500/20 border-purple-500/40" : "hover:bg-purple-500/10",
          amber: isActive ? "bg-amber-500/20 border-amber-500/40" : "hover:bg-amber-500/10",
          red: isActive ? "bg-red-500/20 border-red-500/40" : "hover:bg-red-500/10",
        }[s.color] || "";

        var btnClass =
          `p-3 rounded-xl text-center transition-all border ${
            isActive
              ? `${colorClasses} border-white/30 shadow-lg shadow-white/5`
              : `bg-white/[0.03] border-white/10 ${colorClasses}`
          }` + (disabled ? " opacity-50 cursor-not-allowed" : "");

        return (
          <button
            key={s.value}
            onClick={function () {
              onChange(s.value);
            }}
            disabled={disabled}
            className={btnClass}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-sm font-semibold">{s.label}</span>
            </div>
            <p className="text-[10px] text-white/40 mb-2 truncate">{s.description}</p>
            <RiskMeter level={s.risk} />
          </button>
        );
      })}
    </div>
  );
}

/* ===================== PLAN SELECTOR ===================== */
function PlanSelector(props) {
  var value = props.value;
  var onChange = props.onChange;

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      {PLANS.map(function (p) {
        var isActive = value === p.value;
        var btnClass =
          "px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border " +
          (isActive
            ? "bg-white/10 border-white/30 shadow-lg shadow-white/5"
            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20");

        return (
          <button
            key={p.value}
            onClick={function () {
              onChange(p.value);
            }}
            className={btnClass}
          >
            <span className="mr-1">{p.icon}</span>
            <span className="hidden xs:inline">{p.label}</span>
            <span className="xs:hidden">{p.label.substring(0, 3)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== SESSION STATS ===================== */
function SessionStats(props) {
  var wins = props.wins || 0;
  var losses = props.losses || 0;
  var bestWinStreak = props.bestWinStreak || 0;
  var dayStreak = props.dayStreak || 0;
  var strategiesUsed = props.strategiesUsed || 0;
  var xp = props.xp || 0;
  var currentPlan = props.currentPlan || PLANS[0];
  var currentStrat = props.currentStrat || STRATEGIES[1];
  var total = wins + losses;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-semibold text-sm sm:text-base">Session Stats</h3>
      </div>

      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
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
          <span className="text-white/50">Strategies</span>
          <span className="font-bold">{strategiesUsed}/4 🧠</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">XP Earned</span>
          <span className="font-bold">{Math.floor(xp)} ⭐</span>
        </div>

        <div className="pt-3 mt-1 border-t border-white/10 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/50">Plan</span>
            <span className="text-xs sm:text-sm">
              {currentPlan.icon} <span className="hidden xs:inline">{currentPlan.label}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Strategy</span>
            <span className="text-xs sm:text-sm">
              {currentStrat.icon} <span className="hidden xs:inline">{currentStrat.label}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Exchanges</span>
            <span className="text-[10px] sm:text-xs text-white/60 text-right">
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
  var nav = useNavigate();
  var searchParams = useSearchParams();
  var params = searchParams[0];
  var tickerRef = useRef(null);

  var stateEquity = useState(1000);
  var equity = stateEquity[0];
  var setEquity = stateEquity[1];

  var statePnl = useState(0);
  var pnl = statePnl[0];
  var setPnl = statePnl[1];

  var stateWins = useState(0);
  var wins = stateWins[0];
  var setWins = stateWins[1];

  var stateLosses = useState(0);
  var losses = stateLosses[0];
  var setLosses = stateLosses[1];

  var statePlan = useState("starter");
  var plan = statePlan[0];
  var setPlan = statePlan[1];

  var stateStrategy = useState("ai_weighted");
  var strategy = stateStrategy[0];
  var setStrategy = stateStrategy[1];

  var stateRunning = useState(false);
  var running = stateRunning[0];
  var setRunning = stateRunning[1];

  var stateDayStreak = useState(0);
  var dayStreak = stateDayStreak[0];
  var setDayStreak = stateDayStreak[1];

  var stateLastTradeDay = useState(null);
  var lastTradeDay = stateLastTradeDay[0];
  var setLastTradeDay = stateLastTradeDay[1];

  var stateTradeLog = useState([]);
  var tradeLog = stateTradeLog[0];
  var setTradeLog = stateTradeLog[1];

  var stateEquityHistory = useState([{ value: 1000 }]);
  var equityHistory = stateEquityHistory[0];
  var setEquityHistory = stateEquityHistory[1];

  var stateCurrentWinStreak = useState(0);
  var currentWinStreak = stateCurrentWinStreak[0];
  var setCurrentWinStreak = stateCurrentWinStreak[1];

  var stateBestWinStreak = useState(0);
  var bestWinStreak = stateBestWinStreak[0];
  var setBestWinStreak = stateBestWinStreak[1];

  var stateStrategiesUsed = useState(new Set(["ai_weighted"]));
  var strategiesUsed = stateStrategiesUsed[0];
  var setStrategiesUsed = stateStrategiesUsed[1];

  var stateSpeed = useState(3000);
  var speed = stateSpeed[0];
  var setSpeed = stateSpeed[1];

  /* ── Derived ── */
  var currentPlan = useMemo(
    function () {
      return (
        PLANS.find(function (p) {
          return p.value === plan;
        }) || PLANS[0]
      );
    },
    [plan]
  );

  var currentStrat = useMemo(
    function () {
      return (
        STRATEGIES.find(function (s) {
          return s.value === strategy;
        }) || STRATEGIES[1]
      );
    },
    [strategy]
  );

  var winRate = useMemo(
    function () {
      var t = wins + losses;
      return t > 0 ? ((wins / t) * 100).toFixed(1) : "0.0";
    },
    [wins, losses]
  );

  var xp = useMemo(
    function () {
      var total = 0;
      total += Math.min(wins + losses, 50) * 2;
      var wr = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
      total += Math.max(0, wr - 40) * 1.5;
      total += Math.max(0, pnl) * 0.1;
      total += currentWinStreak * 3;
      total += dayStreak * 5;
      if (plan !== "starter") total += 15;
      return total;
    },
    [wins, losses, pnl, currentWinStreak, dayStreak, plan]
  );

  var confidence = useMemo(
    function () {
      var t = wins + losses;
      var s = 0;
      if (t > 0) s += clamp((wins / t) * 40, 0, 40);
      s += clamp(t * 1.2, 0, 30);
      s += clamp(dayStreak * 5, 0, 20);
      if (plan !== "starter") s += 10;
      return clamp(Math.round(s), 0, 100);
    },
    [wins, losses, dayStreak, plan]
  );

  var tradesByExchange = useMemo(
    function () {
      var r = { OKX: [], Alpaca: [], DEX: [], Futures: [] };
      tradeLog.forEach(function (t) {
        if (r[t.exchange]) r[t.exchange].push(t);
      });
      return r;
    },
    [tradeLog]
  );

  var unlockedAchievements = useMemo(
    function () {
      var stats = {
        totalTrades: wins + losses,
        wins: wins,
        losses: losses,
        pnl: pnl,
        currentWinStreak: currentWinStreak,
        winRate: Number(winRate),
        dayStreak: dayStreak,
        plan: plan,
        strategiesUsed: strategiesUsed.size,
        confidence: confidence,
      };
      return ALL_ACHIEVEMENTS.filter(function (a) {
        return a.check(stats);
      }).map(function (a) {
        return a.id;
      });
    },
    [
      wins,
      losses,
      pnl,
      currentWinStreak,
      winRate,
      dayStreak,
      plan,
      strategiesUsed,
      confidence,
    ]
  );

  var pnlChartData = useMemo(
    function () {
      return tradeLog.slice(-30).map(function (t, i) {
        return { label: "#" + (i + 1), value: t.pnl };
      });
    },
    [tradeLog]
  );

  /* ── Init from URL / localStorage ── */
  useEffect(
    function () {
      var ap = PLANS.map(function (p) {
        return p.value;
      });
      var as2 = STRATEGIES.map(function (s) {
        return s.value;
      });

      var pu = pickAllowed(
        params.get("plan") || params.get("tier"),
        ap,
        ""
      );
      var su = pickAllowed(params.get("strategy"), as2, "");

      var ps = "";
      var ss = "";
      try {
        ps = localStorage.getItem("imali_plan") || "";
        ss = localStorage.getItem("imali_strategy") || "";
      } catch (e) {
        /* ignore */
      }

      setPlan(pu || pickAllowed(ps, ap, "starter"));
      setStrategy(su || pickAllowed(ss, as2, "ai_weighted"));
    },
    [params]
  );

  /* ── Persist ── */
  useEffect(
    function () {
      try {
        localStorage.setItem("imali_plan", plan);
        localStorage.setItem("imali_strategy", strategy);
      } catch (e) {
        /* ignore */
      }
    },
    [plan, strategy]
  );

  /* ── Track strategies used ── */
  useEffect(
    function () {
      setStrategiesUsed(function (prev) {
        return new Set([].concat(Array.from(prev), [strategy]));
      });
    },
    [strategy]
  );

  /* ── Simulation tick ── */
  useEffect(
    function () {
      if (!running) return;

      tickerRef.current = setInterval(function () {
        var available = DEMO_TOKENS.filter(function (t) {
          return currentPlan.exchanges.includes(t.exchange);
        });
        var token =
          available[Math.floor(Math.random() * available.length)] ||
          DEMO_TOKENS[0];

        var riskMult = 0.5 + currentStrat.risk * 0.4;
        var winBias =
          strategy === "mean_reversion"
            ? 0.52
            : strategy === "ai_weighted"
            ? 0.55
            : strategy === "momentum"
            ? 0.5
            : 0.48;

        var isWin = Math.random() < winBias;
        var magnitude = (Math.random() * 20 + 5) * riskMult;
        var delta = isWin ? magnitude : -magnitude * 0.7;

        var trade = {
          id: Date.now() + Math.random(),
          symbol: token.symbol,
          icon: token.icon,
          exchange: token.exchange,
          action: isWin ? "Sold ↑" : "Stopped ↓",
          pnl: Number(delta.toFixed(2)),
          timestamp: new Date().toLocaleTimeString(),
        };

        setTradeLog(function (prev) {
          return prev.slice(-100).concat([trade]);
        });
        setPnl(function (p) {
          return p + delta;
        });
        setEquity(function (e) {
          var next = e + delta;
          setEquityHistory(function (h) {
            return h.slice(-60).concat([{ value: next }]);
          });
          return next;
        });

        if (isWin) {
          setWins(function (w) {
            return w + 1;
          });
          setCurrentWinStreak(function (s) {
            var next = s + 1;
            setBestWinStreak(function (b) {
              return Math.max(b, next);
            });
            return next;
          });
        } else {
          setLosses(function (l) {
            return l + 1;
          });
          setCurrentWinStreak(0);
        }

        var today = new Date().toDateString();
        setLastTradeDay(function (prev) {
          if (!prev || prev !== today) {
            setDayStreak(function (s) {
              return s + 1;
            });
            return today;
          }
          return prev;
        });
      }, speed);

      return function () {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      };
    },
    [running, plan, strategy, speed, currentPlan, currentStrat]
  );

  /* ── Reset ── */
  var resetDemo = useCallback(
    function () {
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
    },
    [strategy]
  );

  /* ===================== RENDER ===================== */
  var startBtnClass =
    "px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all hover:scale-[1.02] text-sm sm:text-base " +
    (running
      ? "bg-red-600 hover:bg-red-500"
      : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20");

  var equityColorClass = equity >= 1000 ? "text-emerald-400" : "text-red-400";
  var pnlColorClass = pnl >= 0 ? "text-emerald-400" : "text-red-400";
  var wrBarClass =
    "h-full rounded-full transition-all duration-500 " +
    (Number(winRate) >= 50 ? "bg-emerald-500" : "bg-red-500");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">🎮 Trading Sim</h1>
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] sm:text-xs font-bold border border-blue-500/30">
                DEMO
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              Practice with fake money — no risk!
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={function () {
                setRunning(function (r) {
                  return !r;
                });
              }}
              className={startBtnClass}
            >
              {running ? "⏸ Stop" : "▶️ Start"}
            </button>
            <button
              onClick={resetDemo}
              className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-medium text-sm sm:text-base transition-colors"
            >
              🔄
            </button>
            <button
              onClick={function () {
                nav("/signup");
              }}
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-sm sm:text-base hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              🚀 Live
            </button>
          </div>
        </div>

        {/* ── Speed Control ── */}
        {running && (
          <div className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-3">
            <span className="text-xs sm:text-sm text-white/60">Speed:</span>
            {[
              { label: "🐌", ms: 5000 },
              { label: "🚶", ms: 3000 },
              { label: "🏃", ms: 1500 },
              { label: "⚡", ms: 700 },
            ].map(function (s) {
              var cls =
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all border " +
                (speed === s.ms
                  ? "bg-white/15 border-white/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10");
              return (
                <button
                  key={s.ms}
                  onClick={function () {
                    setSpeed(s.ms);
                  }}
                  className={cls}
                >
                  {s.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1 sm:gap-2 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="hidden xs:inline">Running</span>
            </div>
          </div>
        )}

        {/* ── Plan Selector ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="text-base sm:text-lg">💳</span>
            <h3 className="font-semibold text-sm sm:text-base">Plan</h3>
            <span className="text-[10px] sm:text-xs text-white/40 ml-1">
              (try all!)
            </span>
          </div>
          <PlanSelector value={plan} onChange={setPlan} />
          <p className="text-[10px] sm:text-xs text-white/40 mt-2 sm:mt-3 truncate">
            {currentPlan.icon} <b className="text-xs sm:text-sm">{currentPlan.label}</b>: {currentPlan.exchanges.join(", ")}
          </p>
        </div>

        {/* ── Strategy Selector (Compact & Organized) ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">🧠</span>
              <h3 className="font-semibold text-sm sm:text-base">Trading Strategy</h3>
            </div>
            {running && (
              <span className="text-[10px] text-yellow-400/70 px-2 py-1 rounded-full border border-yellow-400/30">
                ⚠️ Stop to change
              </span>
            )}
          </div>
          <StrategySelector
            value={strategy}
            onChange={setStrategy}
            disabled={running}
          />
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="rounded-xl bg-white/5 p-3 sm:p-4 border border-white/10">
            <div className="text-[10px] sm:text-xs text-white/50">💰</div>
            <div className={"text-base sm:text-xl font-bold mt-1 " + equityColorClass}>
              {formatUsdPlain(equity)}
            </div>
            <div className="text-[8px] sm:text-xs text-white/30 mt-1">
              Start $1k
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 sm:p-4 border border-white/10">
            <div className="text-[10px] sm:text-xs text-white/50">📊 P&L</div>
            <div className={"text-base sm:text-xl font-bold mt-1 " + pnlColorClass}>
              {formatUsd(pnl)}
            </div>
            <div className="text-[8px] sm:text-xs text-white/30 mt-1">
              {wins + losses} trades
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 sm:p-4 border border-white/10">
            <div className="text-[10px] sm:text-xs text-white/50">🎯 WR</div>
            <div className="text-base sm:text-xl font-bold mt-1">{winRate}%</div>
            <div className="w-full bg-white/10 rounded-full h-1 mt-2 overflow-hidden">
              <div className={wrBarClass} style={{ width: winRate + "%" }} />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 sm:p-4 border border-white/10">
            <div className="text-[10px] sm:text-xs text-white/50">🔥 Streak</div>
            <div className="text-base sm:text-xl font-bold mt-1">{currentWinStreak}</div>
            <div className="text-[8px] sm:text-xs text-white/30 mt-1">
              Best: {bestWinStreak}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 sm:p-4 border border-white/10 col-span-2 sm:col-span-1">
            <div className="text-[10px] sm:text-xs text-white/50">🤖 Conf</div>
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <ProgressRing percent={confidence} size={32} stroke={2.5}>
                <span className="text-[8px] font-bold">{confidence}%</span>
              </ProgressRing>
              <span className="text-[8px] sm:text-xs text-white/50">
                {confidence >= 80 ? "🔥" : confidence >= 60 ? "👍" : "📈"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Level ── */}
        <LevelBadge xp={xp} />

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="font-semibold text-sm">📈 Equity</h3>
              <span className={"text-xs sm:text-sm font-bold " + equityColorClass}>
                {formatUsdPlain(equity)}
              </span>
            </div>
            <EquityCurve data={equityHistory} height={100} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="font-semibold text-sm">📊 Results</h3>
              <span className="text-[10px] sm:text-xs text-white/40">
                {tradeLog.length}
              </span>
            </div>
            <MiniBarChart data={pnlChartData} height={100} />
          </div>
        </div>

        {/* ── Exchange Cards ── */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🔗 Exchanges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <DemoExchangeCard
              name="OKX"
              icon="🔷"
              trades={tradesByExchange.OKX}
              active={currentPlan.exchanges.includes("OKX")}
            />
            <DemoExchangeCard
              name="Alpaca"
              icon="📈"
              trades={tradesByExchange.Alpaca}
              active={currentPlan.exchanges.includes("Alpaca")}
            />
            <DemoExchangeCard
              name="DEX"
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">📋</span>
                <h3 className="font-semibold text-sm">Trades</h3>
              </div>
              {running && (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
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
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
          <h3 className="font-semibold text-sm mb-2 sm:mb-3">📉 Advanced Chart</h3>
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

        {/* ── Achievements ── */}
        <AchievementsPanel
          unlocked={unlockedAchievements}
          total={ALL_ACHIEVEMENTS.length}
        />

        {/* ── CTA ── */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center">
          <div className="text-3xl sm:text-5xl mb-2 sm:mb-3">🚀</div>
          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-2">
            Ready for Real?
          </h2>
          <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto mb-4 sm:mb-6 px-2">
            Everything works with real money too.
          </p>
          <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-4">
            <button
              onClick={function () {
                nav("/signup");
              }}
              className="px-4 sm:px-8 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-bold text-sm sm:text-base hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              🚀 Sign Up
            </button>
            <button
              onClick={function () {
                nav("/pricing");
              }}
              className="px-4 sm:px-8 py-2 sm:py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-sm sm:text-base transition-colors"
            >
              💳 Plans
            </button>
          </div>
        </div>

        {/* ── Footer Note ── */}
        <div className="text-center py-4 sm:py-6">
          <p className="text-[8px] sm:text-xs text-white/20">
            🎮 Demo simulator. No real money used.
          </p>
        </div>
      </div>
    </div>
  );
}
