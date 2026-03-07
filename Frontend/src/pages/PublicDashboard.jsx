// src/pages/PublicDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;

const DEFAULT_STATE = {
  futures: { 
    health: null, 
    stats: { total_symbols: 0, status: 'unknown', daily_realized: {} } 
  },
  stocks: { 
    health: null, 
    stats: { symbols: 0, mode: 'paper', running: false, lastRefresh: null } 
  },
  sniper: { 
    health: null, 
    discoveries: [], 
    stats: { status: 'idle', active_trades: 0, chains: [] } 
  },
  okx: { 
    health: null, 
    stats: { 
      positions_count: 0, 
      total_trades: 0, 
      total_pnl: 0, 
      mode: 'dry_run',
      scan_count: 0,
      last_scan_time: null,
      last_candidate_count: 0,
      last_signal_count: 0
    } 
  },
  recent_trades: [],
  historical: { daily: [], weekly: [], monthly: [] },
  loading: true,
  error: null,
  lastUpdate: null,
  lastSuccessAt: null,
  rateLimitedUntil: null,
};

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value, digits = 2) {
  const num = safeNumber(value);
  return num >= 0 ? `$${num.toFixed(digits)}` : `-$${Math.abs(num).toFixed(digits)}`;
}

function formatCurrencyWithSign(value, digits = 2) {
  const num = safeNumber(value);
  return `${num >= 0 ? "+" : "-"}$${Math.abs(num).toFixed(digits)}`;
}

function formatPercent(value, digits = 2) {
  const num = safeNumber(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(digits)}%`;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    if (diffMs < 0) return "just now";
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 30) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${day}d ago`;
  } catch {
    return "—";
  }
}

function formatClock(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return "—";
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return "—";
  }
}

function getTradeTimestamp(trade) {
  return trade?.created_at || trade?.timestamp || trade?.time || trade?.received_at || null;
}

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? 0;
}

function getTradePnlUsd(trade) {
  return trade?.pnl_usd ?? trade?.pnl ?? trade?.realized_pnl_eth ?? 0;
}

function getTradePnlPercent(trade) {
  return trade?.pnl_percentage ?? trade?.pnl_pct ?? trade?.return_percent ?? 0;
}

function getTradeSide(trade) {
  return String(trade?.side || trade?.action || "").toLowerCase();
}

function getTradeBot(trade) {
  return trade?.bot || trade?.source || trade?.exchange || "Unknown";
}

function getTradePrice(trade) {
  return trade?.price ?? trade?.entry_price ?? 0;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

/* =====================================================
   DATA MERGING - Properly maps API response to component state
===================================================== */

function mergeLiveStatsPayload(payload = {}) {
  console.log("API Payload:", payload); // Debug log
  
  // Extract data from payload
  const futures = payload?.futures || {};
  const stocks = payload?.stocks || {};
  const sniper = payload?.sniper || {};
  const okx = payload?.okx || {};
  const recentTrades = normalizeArray(payload?.recent_trades || []);

  // Process OKX data - positions is a number, not an array
  const okxStats = {
    positions_count: typeof okx?.positions === 'number' ? okx.positions : 0,
    total_trades: okx?.total_trades || 0,
    total_pnl: okx?.total_pnl || 0,
    mode: okx?.mode || 'dry_run',
    scan_count: okx?.scan_count || 0,
    last_scan_time: okx?.last_scan_time || null,
    last_candidate_count: okx?.last_candidate_count || 0,
    last_signal_count: okx?.last_signal_count || 0
  };

  // Process Futures data
  const futuresStats = {
    total_symbols: futures?.total_symbols || 199,
    status: futures?.status || 'running',
    daily_realized: futures?.daily_realized || {},
    cex_enabled: futures?.cex_enabled || false,
    dry_run: futures?.dry_run || false,
    db_connected: futures?.db_connected || false
  };

  // Process Stocks data
  const stocksStats = {
    symbols: stocks?.symbols || 500,
    mode: stocks?.mode || 'paper',
    running: stocks?.running || false,
    lastRefresh: stocks?.lastRefresh || null
  };

  // Process Sniper data
  const sniperStats = {
    status: sniper?.status || 'idle',
    active_trades: sniper?.active_trades || 0,
    bot_state: sniper?.bot_state || 'idle',
    last_heartbeat: sniper?.last_heartbeat || null
  };

  // Get discoveries (might be in different places)
  const discoveries = normalizeArray(
    sniper?.discoveries || 
    payload?.discoveries || 
    []
  );

  return {
    futures: {
      health: futures,
      stats: futuresStats
    },
    stocks: {
      health: stocks,
      stats: stocksStats
    },
    sniper: {
      health: sniper,
      discoveries: discoveries,
      stats: sniperStats
    },
    okx: {
      health: okx,
      stats: okxStats
    },
    recent_trades: recentTrades,
    historical: payload?.historical || { daily: [], weekly: [], monthly: [] }
  };
}

/* =====================================================
   HEARTBEAT COMPONENT
===================================================== */

function Heartbeat({ active = true }) {
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setBeat(true);
      setTimeout(() => setBeat(false), 300);
    }, 1400);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) {
    return (
      <svg viewBox="0 0 100 40" className="w-24 h-8 opacity-20" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="0,20 30,20 35,20 40,20 45,20 50,20 100,20"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 40"
      className={`w-24 h-8 transition-all duration-150 ${
        beat ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" : ""
      }`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="0,20 28,20 33,5 38,34 43,20 55,20 60,14 65,26 70,20 100,20"
        fill="none"
        stroke={beat ? "#34d399" : "#10b981"}
        strokeWidth={beat ? "2.5" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-150"
      />
      <circle
        cx={beat ? "43" : "70"}
        cy={beat ? "20" : "20"}
        r="3"
        fill={beat ? "#34d399" : "#10b981"}
        className="transition-all duration-300"
      />
    </svg>
  );
}

/* =====================================================
   STAT CARD COMPONENT
===================================================== */

function StatCard({ title, value, icon, subtext, color = "emerald", trend = null }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-white/50">{title}</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtext && (
            <p className="text-[10px] sm:text-xs text-white/30 mt-1 flex items-center gap-1">
              {trend && (
                <span className={trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-white/30"}>
                  {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}
                </span>
              )}
              {subtext}
            </p>
          )}
        </div>
        <div className="text-2xl sm:text-3xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

/* =====================================================
   BOT CARD COMPONENT
===================================================== */

function BotCard({ name, icon, health, stats, accent = "indigo" }) {
  const isOnline = !!health;

  const accentColors = {
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
  };

  const getDisplayStats = () => {
    if (name === "OKX Spot") {
      return [
        { label: "Positions", value: stats?.positions_count || 0, color: "text-emerald-400" },
        { label: "Total Trades", value: stats?.total_trades || 0, color: "text-blue-400" },
        { 
          label: "Total P&L", 
          value: formatCurrencyWithSign(stats?.total_pnl || 0), 
          color: (stats?.total_pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400" 
        },
        { label: "Mode", value: stats?.mode || 'dry_run', color: "text-yellow-400" },
        { label: "Scan Count", value: formatNumber(stats?.scan_count || 0), color: "text-white/70" }
      ];
    }
    if (name === "Futures Bot") {
      return [
        { label: "Pairs", value: stats?.total_symbols || 199, color: "text-indigo-400" },
        { label: "Status", value: stats?.status || 'running', color: stats?.status === 'running' ? "text-green-400" : "text-yellow-400" },
        { label: "CEX Enabled", value: stats?.cex_enabled ? "Yes" : "No", color: stats?.cex_enabled ? "text-green-400" : "text-white/50" },
        { label: "Dry Run", value: stats?.dry_run ? "Yes" : "No", color: stats?.dry_run ? "text-yellow-400" : "text-red-400" }
      ];
    }
    if (name === "Stock Bot") {
      return [
        { label: "Symbols", value: stats?.symbols || 500, color: "text-emerald-400" },
        { label: "Mode", value: stats?.mode || 'paper', color: stats?.mode === 'paper' ? "text-yellow-400" : "text-green-400" },
        { label: "Running", value: stats?.running ? "Yes" : "No", color: stats?.running ? "text-green-400" : "text-white/50" },
        { label: "Last Refresh", value: stats?.lastRefresh ? timeAgo(stats.lastRefresh) : "—", color: "text-white/70" }
      ];
    }
    if (name === "Sniper Bot") {
      return [
        { label: "Status", value: stats?.status || 'idle', color: stats?.status === 'OK' ? "text-green-400" : "text-yellow-400" },
        { label: "Active Trades", value: stats?.active_trades || 0, color: "text-purple-400" },
        { label: "Bot State", value: stats?.bot_state || 'idle', color: "text-white/70" }
      ];
    }
    return [];
  };

  return (
    <div className={`border rounded-xl p-3 sm:p-4 ${accentColors[accent]}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
            {isOnline ? "● Online" : "○ Offline"}
          </span>
        </div>
      </div>

      {isOnline ? (
        <div className="text-xs space-y-2">
          {getDisplayStats().map((stat, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-white/50">{stat.label}</span>
              <span className={`font-medium ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>
      )}
    </div>
  );
}

/* =====================================================
   SNIPER CARD COMPONENT
===================================================== */

function SniperCard({ health, discoveries, stats }) {
  const isOnline = !!health;
  const discCount = discoveries.length;
  const [pinged, setPinged] = useState(false);
  const prevDiscRef = useRef(discCount);

  useEffect(() => {
    if (discCount > prevDiscRef.current) {
      setPinged(true);
      const t = setTimeout(() => setPinged(false), 1200);
      prevDiscRef.current = discCount;
      return () => clearTimeout(t);
    }
    prevDiscRef.current = discCount;
  }, [discCount]);

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 border-purple-500/30 bg-purple-500/10 ${
        pinged ? "ring-2 ring-purple-400/60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🦄</span>
          <span className="font-semibold text-sm sm:text-base truncate">Sniper Bot</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>

      <div className="flex items-center justify-center mb-3">
        <Heartbeat active={isOnline} />
      </div>

      {isOnline ? (
        <div className="text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-white/50">Discoveries</span>
            <span className={`font-semibold ${discCount > 0 ? "text-purple-300" : "text-white/40"}`}>
              {discCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Active Trades</span>
            <span className={stats?.active_trades > 0 ? "text-green-300" : "text-white/40"}>
              {stats?.active_trades || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Status</span>
            <span className={stats?.status === 'OK' ? "text-green-400" : "text-yellow-400"}>
              {stats?.status || 'idle'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Bot State</span>
            <span className="text-white/70">{stats?.bot_state || 'idle'}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>
      )}

      {pinged && (
        <div className="mt-2 text-center text-[10px] text-purple-300 bg-purple-500/20 rounded-full py-0.5 animate-pulse">
          ✨ New discovery detected
        </div>
      )}
    </div>
  );
}

/* =====================================================
   TRADE ROW COMPONENT
===================================================== */

function TradeRow({ trade }) {
  const side = getTradeSide(trade);
  const pnlUsd = safeNumber(getTradePnlUsd(trade), 0);
  const pnlPercent = safeNumber(getTradePnlPercent(trade), 0);
  const qty = safeNumber(getTradeQty(trade), 0);
  const price = safeNumber(getTradePrice(trade), 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = getTradeBot(trade);
  const ts = getTradeTimestamp(trade);

  const isBuy = side === "buy" || side === "long";
  const isSell = side === "sell" || side === "short";
  const isClose = side === "close" || side === "exit";
  const isOpen = !isClose && trade?.status === "open" && pnlUsd === 0;

  let borderColor = "border-l-gray-500";
  let bgColor = "bg-white/[0.03]";
  let badgeColor = "bg-gray-500/20 text-gray-300";
  let badgeText = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-500/5";
    badgeColor = "bg-blue-500/20 text-blue-300";
    badgeText = "OPEN";
  } else if (isClose) {
    borderColor = "border-l-purple-500";
    bgColor = "bg-purple-500/5";
    badgeColor = "bg-purple-500/20 text-purple-300";
    badgeText = "CLOSED";
  } else if (isBuy) {
    borderColor = "border-l-green-500";
    bgColor = "bg-green-500/5";
    badgeColor = "bg-green-500/20 text-green-300";
    badgeText = "BUY";
  } else if (isSell) {
    borderColor = "border-l-red-500";
    bgColor = "bg-red-500/5";
    badgeColor = "bg-red-500/20 text-red-300";
    badgeText = "SELL";
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor} hover:bg-opacity-80 transition-all`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">📊</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
            <span className="text-[10px] text-white/35">{bot}</span>
          </div>
          <div className="text-[10px] text-white/35">
            {timeAgo(ts)} • {formatCurrency(price)} • {qty > 0 ? `${qty.toFixed(4)} units` : "—"}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-400">Open</div>
        ) : pnlUsd !== 0 ? (
          <div>
            <div className={`font-bold text-sm ${pnlUsd > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {pnlUsd > 0 ? "+" : ""}{formatCurrency(pnlUsd)}
            </div>
            <div className={`text-[10px] ${pnlPercent > 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
              {formatPercent(pnlPercent)}
            </div>
          </div>
        ) : (
          <div className="font-bold text-sm text-white">{formatCurrency(price)}</div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   DISCOVERY CARD COMPONENT
===================================================== */

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address || discovery?.token || "New token";
  const symbol = discovery?.symbol || pair.slice(0, 10) + "...";

  let scoreColor = "text-orange-400";
  let scoreBg = "bg-orange-500/20";
  if (score >= 0.7) {
    scoreColor = "text-green-400";
    scoreBg = "bg-green-500/20";
  } else if (score >= 0.5) {
    scoreColor = "text-yellow-400";
    scoreBg = "bg-yellow-500/20";
  }

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-all">
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <div className="min-w-0">
            <span className="font-medium capitalize block truncate">{chain}</span>
            <span className="text-white/30 text-[8px] font-mono truncate">{symbol}</span>
          </div>
        </div>
        <span className="text-white/40 text-[8px] shrink-0 whitespace-nowrap">{age} blocks</span>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-1">
          <span className="text-white/40 text-[8px]">AI</span>
          <span className={`text-[10px] font-bold ${scoreColor} px-1.5 py-0.5 rounded ${scoreBg}`}>
            {score.toFixed(2)}
          </span>
        </div>
        {score >= 0.7 && (
          <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
            Ready
          </span>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   HISTORICAL CHART COMPONENT
===================================================== */

function HistoricalChart({ data, type = "daily" }) {
  const chartData = data[type] || [];
  const maxValue = Math.max(...chartData.map((d) => Math.abs(d.pnl || 0)), 1);

  const getChartColor = (pnl) => {
    return pnl >= 0 ? "bg-emerald-500/50" : "bg-red-500/50";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            className={`px-3 py-1 rounded-lg capitalize transition-all ${
              type === period 
                ? "bg-indigo-600 text-white" 
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {period}
          </button>
        ))}
      </div>
      
      {chartData.length > 0 ? (
        <div className="h-32 flex items-end gap-1">
          {chartData.slice(-10).map((d, i) => {
            const height = (Math.abs(d.pnl || 0) / maxValue) * 100;
            const isPositive = (d.pnl || 0) >= 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div
                  className={`w-full rounded-t relative group-hover:opacity-80 transition-all ${
                    isPositive ? "bg-emerald-500/50" : "bg-red-500/50"
                  }`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                >
                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                    <div className="font-medium">{formatDate(d.date)}</div>
                    <div className={isPositive ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrencyWithSign(d.pnl)} ({formatPercent(d.pnlPercent)})
                    </div>
                  </div>
                </div>
                <span className="text-[8px] text-white/30 mt-1 rotate-45 origin-left">
                  {formatDate(d.date).slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-white/30 text-sm">
          No historical data available
        </div>
      )}
    </div>
  );
}

/* =====================================================
   DATA HOOK
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const backoffRef = useRef(30000);
  const retryCountRef = useRef(0);

  const fetchHistorical = async () => {
    try {
      const response = await axios.get(HISTORICAL_URL, { timeout: 5000 });
      return response.data;
    } catch (err) {
      console.warn("Historical data unavailable:", err.message);
      return { daily: [], weekly: [], monthly: [] };
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const clearPending = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };

    const scheduleNext = (ms) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchLiveStats, ms);
    };

    const fetchLiveStats = async () => {
      if (!mountedRef.current) return;
      if (document.hidden) {
        scheduleNext(Math.max(backoffRef.current, 30000));
        return;
      }

      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const [liveResponse, historicalData] = await Promise.allSettled([
          axios.get(LIVE_STATS_URL, {
            timeout: 10000,
            signal: abortRef.current.signal,
            headers: { "Cache-Control": "no-cache" },
          }),
          fetchHistorical(),
        ]);

        if (!mountedRef.current) return;

        let normalized = { ...DEFAULT_STATE };
        let historical = { daily: [], weekly: [], monthly: [] };
        let now = new Date();
        let hasError = false;

        if (liveResponse.status === 'fulfilled' && liveResponse.value) {
          normalized = mergeLiveStatsPayload(liveResponse.value.data);
          retryCountRef.current = 0;
        } else {
          hasError = true;
          console.warn("Live stats fetch failed:", liveResponse.reason);
        }

        if (historicalData && !historicalData.error) {
          historical = historicalData;
        }

        backoffRef.current = 30000;

        setData({
          ...normalized,
          historical,
          loading: false,
          error: hasError ? "Live data temporarily unavailable" : null,
          lastUpdate: now,
          lastSuccessAt: hasError ? data.lastSuccessAt : now,
          rateLimitedUntil: null,
        });

        scheduleNext(backoffRef.current);
      } catch (err) {
        if (!mountedRef.current) return;
        if (axios.isCancel(err)) return;

        console.error("Fetch error:", err);
        
        retryCountRef.current++;
        const nextDelay = Math.min(30000 * Math.pow(1.5, retryCountRef.current), 120000);
        
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Connection issue - retrying...",
          lastUpdate: new Date(),
        }));

        scheduleNext(nextDelay);
      }
    };

    timerRef.current = setTimeout(fetchLiveStats, 250);

    const onVisibility = () => {
      if (!document.hidden) {
        clearPending();
        retryCountRef.current = 0;
        backoffRef.current = 30000;
        timerRef.current = setTimeout(fetchLiveStats, 500);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      clearPending();
    };
  }, []);

  return data;
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());
  const [historicalType, setHistoricalType] = useState("daily");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate derived stats
  const hasConnection = !!(
    data.futures.health ||
    data.stocks.health ||
    data.sniper.health ||
    data.okx.health
  );

  const isStale = data.lastSuccessAt
    ? Math.floor((Date.now() - new Date(data.lastSuccessAt).getTime()) / 1000) > 90
    : false;

  // Process trades
  const allTrades = useMemo(() => {
    return data.recent_trades
      .sort((a, b) => {
        const tA = new Date(getTradeTimestamp(a) || 0).getTime();
        const tB = new Date(getTradeTimestamp(b) || 0).getTime();
        return tB - tA;
      })
      .slice(0, 50);
  }, [data.recent_trades]);

  // Trade filters
  const isOpenTrade = (t) => {
    const pnl = getTradePnlUsd(t);
    return t?.status === "open" || (pnl === 0 && t?.side && !t?.closed);
  };

  const isClosedTrade = (t) => {
    const pnl = getTradePnlUsd(t);
    return pnl !== 0 || t?.status === "closed" || t?.side === "close";
  };

  // Filter trades by tab
  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(isClosedTrade);
    return allTrades;
  }, [activeTab, allTrades]);

  // Tab counts
  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(isClosedTrade).length },
  ];

  // Aggregated stats
  const activeBots = [
    data.futures.health,
    data.stocks.health,
    data.sniper.health,
    data.okx.health,
  ].filter(Boolean).length;

  const totalPnL = useMemo(() => {
    let total = data.okx.stats?.total_pnl || 0;
    data.recent_trades.forEach((t) => {
      const pnl = getTradePnlUsd(t);
      if (pnl !== 0) total += pnl;
    });
    return total;
  }, [data.okx.stats?.total_pnl, data.recent_trades]);

  const totalPnLPercent = useMemo(() => {
    const totalInvested = 100000;
    return (totalPnL / totalInvested) * 100;
  }, [totalPnL]);

  const openPositionsCount = data.okx.stats?.positions_count || 0;

  const totalTradesCount = (data.okx.stats?.total_trades || 0) + allTrades.length;

  const winsCount = useMemo(
    () => allTrades.filter((t) => getTradePnlUsd(t) > 0).length,
    [allTrades]
  );

  const lossesCount = useMemo(
    () => allTrades.filter((t) => getTradePnlUsd(t) < 0).length,
    [allTrades]
  );

  // Loading state
  if (data.loading && !data.lastSuccessAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">Connecting to trading bots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent"
              >
                IMALI
              </Link>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  hasConnection
                    ? isStale
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}
              >
                {hasConnection ? (isStale ? "STALE" : "LIVE") : "CONNECTING"}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasConnection
                      ? isStale
                        ? "bg-amber-400"
                        : "bg-green-400 animate-pulse"
                      : "bg-yellow-400"
                  }`}
                />
                <span>
                  {data.rateLimitedUntil
                    ? `Backoff until ${formatClock(data.rateLimitedUntil)}`
                    : "Updates every 30s"}
                </span>
              </div>
              <div className="text-xs text-white/40">
                Last: {data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}
              </div>
              <div className="text-xs text-white/40">{clock.toLocaleTimeString()}</div>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs sm:text-sm font-semibold transition-all"
              >
                Sign Up Free →
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Error Banner */}
        {data.error && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Live Trading Dashboard
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch our AI-powered trading stack scan, discover opportunities, and execute trades in real-time across multiple markets.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard
            title="Active Bots"
            value={activeBots}
            icon="🤖"
            color="indigo"
            subtext={`${activeBots}/4 online`}
          />
          <StatCard
            title="Total Trades"
            value={totalTradesCount}
            icon="📊"
            color="purple"
            subtext={`${winsCount} wins · ${lossesCount} losses`}
          />
          <StatCard
            title="Total P&L"
            value={formatCurrencyWithSign(totalPnL)}
            icon="💰"
            color={totalPnL >= 0 ? "emerald" : "red"}
            subtext={formatPercent(totalPnLPercent)}
            trend={totalPnL}
          />
          <StatCard
            title="Open Positions"
            value={openPositionsCount}
            icon="📌"
            color="cyan"
            subtext="Across all bots"
          />
          <StatCard
            title="Discoveries"
            value={data.sniper.discoveries.length}
            icon="🦄"
            color="amber"
            subtext="New tokens found"
          />
        </div>

        {/* Historical Performance */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>📈</span>
            Historical Performance
          </h2>
          <HistoricalChart 
            data={data.historical} 
            type={historicalType}
          />
        </div>

        {/* Bot Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <BotCard
            name="Futures Bot"
            icon="📊"
            health={data.futures.health}
            stats={data.futures.stats}
            accent="indigo"
          />
          <BotCard
            name="Stock Bot"
            icon="📈"
            health={data.stocks.health}
            stats={data.stocks.stats}
            accent="emerald"
          />
          <SniperCard
            health={data.sniper.health}
            discoveries={data.sniper.discoveries}
            stats={data.sniper.stats}
          />
          <BotCard
            name="OKX Spot"
            icon="🔷"
            health={data.okx.health}
            stats={data.okx.stats}
            accent="amber"
          />
        </div>

        {/* Trade Feed and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trade Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                  <span className="text-xs text-white/30 ml-2">
                    {allTrades.length} trades
                  </span>
                </h2>
                <div className="flex gap-1 bg-black/30 rounded-lg p-1 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        activeTab === tab.id
                          ? "bg-emerald-600 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 && (
                        <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, i) => (
                    <TradeRow
                      key={`${getTradeTimestamp(trade)}-${trade?.symbol}-${i}`}
                      trade={trade}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-white/30">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">No trades match this filter</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* DEX Discoveries */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span>
                DEX Discoveries
                {data.sniper.discoveries.length > 0 && (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {data.sniper.discoveries.length} new
                  </span>
                )}
              </h2>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {data.sniper.discoveries.length > 0 ? (
                  data.sniper.discoveries
                    .slice(0, 10)
                    .map((d, i) => (
                      <DiscoveryCard key={d?.pair || d?.address || i} discovery={d} />
                    ))
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <div className="text-2xl mb-2">🔍</div>
                    Scanning for new tokens...
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>📡</span>
                System Status
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-white/50">API Endpoint</span>
                  <span className="text-white/40 font-mono text-[10px]">{API_BASE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Connection</span>
                  <span className={hasConnection ? "text-green-400" : "text-yellow-400"}>
                    {hasConnection ? (isStale ? "Stale" : "Live") : "Connecting"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Last Update</span>
                  <span>{data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Open Positions</span>
                  <span className="text-emerald-400">{openPositionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Total Trades</span>
                  <span>{totalTradesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Win/Loss</span>
                  <span className={winsCount >= lossesCount ? "text-green-400" : "text-red-400"}>
                    {winsCount}/{lossesCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">OKX Mode</span>
                  <span className={data.okx.stats?.mode === 'live' ? "text-green-400" : "text-yellow-400"}>
                    {data.okx.stats?.mode || 'dry_run'}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5 text-center">
              <h3 className="font-bold text-lg mb-2">Ready to Start?</h3>
              <p className="text-xs text-white/60 mb-4">
                Join thousands of traders using our AI-powered platform
              </p>
              <Link
                to="/signup"
                className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all"
              >
                Start Trading Free →
              </Link>
              <p className="text-[10px] text-white/30 mt-3">No credit card required • Cancel anytime</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Data updates every 30 seconds with adaptive rate-limiting.
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
            {" • "}
            <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy</Link>
            {" • "}
            <Link to="/terms" className="text-indigo-400 hover:underline">Terms</Link>
          </p>
        </div>
      </main>
    </div>
  );
}