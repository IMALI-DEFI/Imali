// src/pages/PublicDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;
const CONTROL_URL = `${API_BASE}/api/public/control`;

const EMPTY_HISTORICAL = { daily: [], weekly: [], monthly: [] };

const DEFAULT_STATE = {
  futures: { health: null, positions: [], trades: [], stats: null },
  stocks: { health: null, positions: [], trades: [], stats: null },
  sniper: { health: null, discoveries: [], stats: null, positions: [] },
  okx: {
    health: null,
    positions: [],
    trades: [],
    stats: {
      total_trades: 0,
      total_pnl: 0,
      positions_count: 0,
      mode: "unknown",
      scan_count: 0,
      last_scan_time: null,
    },
  },
  recent_trades: [],
  recent_activity: [],
  historical: EMPTY_HISTORICAL,
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
  return `$${safeNumber(value).toFixed(digits)}`;
}

function formatPercent(value, digits = 2) {
  const num = safeNumber(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(digits)}%`;
}

function formatCompactNumber(value) {
  const num = safeNumber(value);
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeHistorical(value) {
  if (!value || typeof value !== "object") return EMPTY_HISTORICAL;
  return {
    daily: normalizeArray(value.daily),
    weekly: normalizeArray(value.weekly),
    monthly: normalizeArray(value.monthly),
  };
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

// Helper function to get week number
Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/* =====================================================
   DATA MERGING
===================================================== */

function mergeLiveStatsPayload(payload = {}) {
  const futures = payload?.futures || {};
  const stocks = payload?.stocks || {};
  const sniper = payload?.sniper || {};
  const okx = payload?.okx || {};

  const positionsCount = typeof okx?.positions === "number" ? okx.positions : 0;
  const okxPositions = Array.from({ length: positionsCount }, (_, i) => ({
    id: `okx-pos-${i}`,
    placeholder: true,
  }));

  const recentTrades =
    Array.isArray(payload?.recent_trades) ? payload.recent_trades : [];

  return {
    futures: {
      health: futures,
      positions: normalizeArray(futures?.positions),
      trades: normalizeArray(futures?.trades),
      stats: futures,
    },
    stocks: {
      health: stocks,
      positions: normalizeArray(stocks?.positions),
      trades: normalizeArray(stocks?.trades),
      stats: stocks,
    },
    sniper: {
      health: sniper,
      discoveries: normalizeArray(sniper?.discoveries || payload?.discoveries),
      stats: sniper,
      positions: normalizeArray(sniper?.positions),
    },
    okx: {
      health: okx,
      positions: okxPositions,
      trades: normalizeArray(okx?.trades),
      stats: {
        total_trades: safeNumber(okx?.total_trades, 0),
        total_pnl: safeNumber(okx?.total_pnl, 0),
        positions_count: positionsCount,
        mode: okx?.mode || "dry_run",
        scan_count: safeNumber(okx?.scan_count, 0),
        last_scan_time: okx?.last_scan_time || null,
      },
    },
    recent_trades: recentTrades,
    recent_activity: normalizeArray(payload?.recent_activity),
    historical: normalizeHistorical(payload?.historical),
  };
}

/* =====================================================
   HEARTBEAT
===================================================== */

function Heartbeat({ active = true }) {
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

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
      />
      <circle
        cx={beat ? "43" : "70"}
        cy="20"
        r="3"
        fill={beat ? "#34d399" : "#10b981"}
        className="transition-all duration-300"
      />
    </svg>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function StatCard({ title, value, icon, subtext, color = "emerald" }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-white/50">{title}</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtext ? <p className="text-[10px] sm:text-xs text-white/30 mt-1">{subtext}</p> : null}
        </div>
        <div className="text-2xl sm:text-3xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function BotCard({ name, icon, health, stats, accent = "indigo" }) {
  const isOnline = !!health;

  const borderMap = {
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
  };

  const getDisplayStats = () => {
    if (name === "OKX Spot") {
      return [
        `Positions: ${stats?.positions_count || 0}`,
        `Trades: ${stats?.total_trades || 0}`,
        `Mode: ${stats?.mode || "dry_run"}`,
      ];
    }
    return [`Status: ${isOnline ? "Online" : "Offline"}`];
  };

  return (
    <div className={`border rounded-xl p-3 sm:p-4 backdrop-blur-sm ${borderMap[accent] ?? borderMap.indigo}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>

      {isOnline ? (
        <div className="text-xs space-y-1 text-white/65">
          {getDisplayStats().map((line, idx) => {
            const parts = line.split(":");
            return (
              <div key={idx} className="flex justify-between gap-2">
                <span>{parts[0]}:</span>
                <span className="text-white">{parts.slice(1).join(":").trim()}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-1">Waiting for connection...</div>
      )}
    </div>
  );
}

function SniperCard({ health, discoveries, positions }) {
  const isOnline = !!health;
  const discCount = normalizeArray(discoveries).length;
  const posCount = normalizeArray(positions).length;
  const chains = health?.chains
    ? Array.isArray(health.chains)
      ? health.chains.join(", ")
      : health.chains
    : "—";
  const isDryRun = health?.dry_run;

  const prevDiscRef = useRef(discCount);
  const [pinged, setPinged] = useState(false);

  useEffect(() => {
    if (discCount > prevDiscRef.current) {
      setPinged(true);
      const t = setTimeout(() => setPinged(false), 1200);
      prevDiscRef.current = discCount;
      return () => clearTimeout(t);
    }
    prevDiscRef.current = discCount;
    return undefined;
  }, [discCount]);

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 border-purple-500/30 bg-purple-500/10 backdrop-blur-sm ${
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
        <div className="text-xs space-y-1 text-white/65">
          <div className="flex justify-between">
            <span>Discoveries</span>
            <span className={discCount > 0 ? "text-purple-300 font-semibold" : "text-white/40"}>
              {discCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Positions</span>
            <span className={posCount > 0 ? "text-green-300" : "text-white/40"}>{posCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Dry Run</span>
            <span>{isDryRun ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0">Chains</span>
            <span className="text-right truncate text-white/50">{chains}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/30 py-1 text-center">Waiting for connection...</div>
      )}

      {pinged ? (
        <div className="mt-2 text-center text-[10px] text-purple-300 bg-purple-500/20 rounded-full py-0.5 animate-pulse">
          ✨ New discovery detected
        </div>
      ) : null}
    </div>
  );
}

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
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor} hover:bg-white/5 transition-all`}
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
              {pnlUsd > 0 ? "+" : ""}
              {formatCurrency(pnlUsd)}
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

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address || discovery?.token || "New token";

  let scoreColor = "text-orange-400";
  if (score >= 0.7) scoreColor = "text-green-400";
  else if (score >= 0.5) scoreColor = "text-yellow-400";

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-colors backdrop-blur-sm">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-medium flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <span className="capitalize truncate">{chain}</span>
        </span>
        <span className="text-white/40 text-[10px] shrink-0">{age} blocks</span>
      </div>
      <div className="text-white/60 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-white/40">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 ? (
          <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
            Ready
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* =====================================================
   ENHANCED HISTORICAL CHART with Chart.js
===================================================== */

function EnhancedHistoricalChart({ data, type = "daily", onTypeChange }) {
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('30d');
  const chartData = normalizeArray(data?.[type] || []);
  
  // Custom tooltip styling
  const tooltipOptions = {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    titleColor: '#f3f4f6',
    bodyColor: '#9ca3af',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    padding: 12,
    caretSize: 6,
    cornerRadius: 8,
    displayColors: true,
    usePointStyle: true,
  };

  // Process data for different time ranges
  const getFilteredData = () => {
    if (chartData.length === 0) return [];
    
    const now = Date.now();
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    
    const msRange = ranges[timeRange] || ranges['30d'];
    
    return chartData.filter(d => {
      const date = new Date(d?.date || d?.timestamp || 0).getTime();
      return now - date <= msRange;
    });
  };

  const filteredData = getFilteredData();
  
  // Calculate summary statistics
  const totalPnl = filteredData.reduce((sum, d) => sum + safeNumber(d?.pnl, 0), 0);
  const avgPnl = filteredData.length > 0 ? totalPnl / filteredData.length : 0;
  const winningDays = filteredData.filter(d => safeNumber(d?.pnl, 0) > 0).length;
  const losingDays = filteredData.filter(d => safeNumber(d?.pnl, 0) < 0).length;
  const winRate = filteredData.length > 0 ? (winningDays / filteredData.length) * 100 : 0;
  const bestDay = Math.max(...filteredData.map(d => safeNumber(d?.pnl, 0)), 0);
  const worstDay = Math.min(...filteredData.map(d => safeNumber(d?.pnl, 0)), 0);
  
  // Calculate cumulative PnL
  const cumulativeData = [];
  let cumulative = 0;
  filteredData.forEach(d => {
    cumulative += safeNumber(d?.pnl, 0);
    cumulativeData.push(cumulative);
  });

  // Prepare chart data
  const labels = filteredData.map(d => {
    const date = new Date(d?.date || d?.timestamp || 0);
    if (type === 'daily') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (type === 'weekly') return `Week ${date.getWeek()}`;
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  // Line/Bar chart data
  const mainChartData = {
    labels,
    datasets: [
      {
        label: 'Daily P&L',
        data: filteredData.map(d => safeNumber(d?.pnl, 0)),
        borderColor: '#10b981',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: (context) => {
          const value = context.raw;
          return value >= 0 ? '#10b981' : '#ef4444';
        },
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        borderWidth: 2,
      },
      {
        label: 'Cumulative P&L',
        data: cumulativeData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        yAxisID: 'y1',
      }
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: `Trading Performance - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        color: '#f3f4f6',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 30 }
      },
      tooltip: tooltipOptions,
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.2)', display: true },
        ticks: { color: '#9ca3af', maxRotation: 45, minRotation: 45 }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: {
          color: '#9ca3af',
          callback: (value) => `$${formatCompactNumber(value)}`
        },
        title: {
          display: true,
          text: 'Daily P&L ($)',
          color: '#9ca3af'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#8b5cf6',
          callback: (value) => `$${formatCompactNumber(value)}`
        },
        title: {
          display: true,
          text: 'Cumulative ($)',
          color: '#8b5cf6'
        }
      }
    },
  };

  // Win/Loss doughnut chart data
  const doughnutData = {
    labels: ['Winning Days', 'Losing Days', 'Breakeven'],
    datasets: [{
      data: [
        winningDays,
        losingDays,
        filteredData.length - winningDays - losingDays
      ],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.5)',
      ],
      borderColor: [
        '#10b981',
        '#ef4444',
        '#6b7280',
      ],
      borderWidth: 2,
    }]
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onTypeChange(period)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                type === period 
                  ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {["7d", "30d", "90d", "all"].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {range === 'all' ? 'All' : range}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'line' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
            title="Line Chart"
          >
            📈
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'bar' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
            title="Bar Chart"
          >
            📊
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-xs text-emerald-400/70">Total P&L</p>
          <p className={`text-xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </p>
          <p className="text-[10px] text-white/30">{filteredData.length} periods</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-xs text-indigo-400/70">Win Rate</p>
          <p className="text-xl font-bold text-indigo-400">{winRate.toFixed(1)}%</p>
          <p className="text-[10px] text-white/30">{winningDays} wins / {losingDays} losses</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-xs text-purple-400/70">Avg Daily</p>
          <p className={`text-xl font-bold ${avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {avgPnl >= 0 ? '+' : ''}{formatCurrency(avgPnl)}
          </p>
          <p className="text-[10px] text-white/30">per trading day</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-xs text-amber-400/70">Best / Worst</p>
          <p className="text-sm font-bold">
            <span className="text-emerald-400">+{formatCurrency(bestDay)}</span>
            {' / '}
            <span className="text-red-400">{formatCurrency(worstDay)}</span>
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
        <div className="h-80">
          {filteredData.length > 0 ? (
            chartType === 'line' ? (
              <Line data={mainChartData} options={chartOptions} />
            ) : (
              <Bar 
                data={{
                  ...mainChartData,
                  datasets: [{
                    ...mainChartData.datasets[0],
                    backgroundColor: mainChartData.datasets[0].data.map(v => 
                      v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
                    ),
                    borderColor: mainChartData.datasets[0].data.map(v => 
                      v >= 0 ? '#10b981' : '#ef4444'
                    ),
                  }]
                }} 
                options={chartOptions} 
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-white/40">No historical data for this period</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Charts Row */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Win/Loss Distribution */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white/70 mb-3">Win/Loss Distribution</h3>
            <div className="h-40">
              <Doughnut 
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: tooltipOptions,
                  },
                  cutout: '65%',
                }}
              />
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-white/50">Wins {winningDays}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-white/50">Losses {losingDays}</span>
              </div>
            </div>
          </div>

          {/* Monthly Performance Sparkline */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white/70 mb-3">Recent Trend</h3>
            <div className="h-20 flex items-end gap-1">
              {filteredData.slice(-7).map((d, i) => {
                const pnl = safeNumber(d?.pnl, 0);
                const maxAbs = Math.max(Math.abs(bestDay), Math.abs(worstDay));
                const height = maxAbs > 0 ? (Math.abs(pnl) / maxAbs) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 group-hover:opacity-80 ${
                          pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(pnl)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-white/30">
              <span>{(totalPnl / 1000).toFixed(1)}k</span>
              <span>Current</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white/70 mb-2">Quick Stats</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Sharpe Ratio</span>
                <span className="text-emerald-400">{(winRate / 20).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Max Drawdown</span>
                <span className="text-red-400">
                  {Math.abs(worstDay / Math.max(...cumulativeData, 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Profit Factor</span>
                <span className="text-emerald-400">
                  {(winningDays / Math.max(losingDays, 1)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Avg Win/Loss</span>
                <span className="text-emerald-400">
                  {(Math.abs(bestDay) / Math.max(Math.abs(worstDay), 1)).toFixed(1)}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Consistency</span>
                <span className={winRate > 50 ? "text-emerald-400" : "text-amber-400"}>
                  {winRate > 50 ? 'Good' : 'Needs Work'}
                </span>
              </div>
            </div>
          </div>
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
  const fetchRef = useRef(null);

  const fetchHistorical = useCallback(async () => {
    try {
      const response = await axios.get(HISTORICAL_URL, {
        timeout: 5000,
        headers: { "Cache-Control": "no-cache" },
      });
      return normalizeHistorical(response.data);
    } catch (err) {
      console.warn("Failed to fetch historical data:", err);
      return EMPTY_HISTORICAL;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const clearPending = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };

    const scheduleNext = (ms) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (fetchRef.current) fetchRef.current();
      }, ms);
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

        const [liveResponse, historicalData] = await Promise.all([
          axios.get(LIVE_STATS_URL, {
            timeout: 10000,
            signal: abortRef.current.signal,
            headers: { "Cache-Control": "no-cache" },
          }),
          fetchHistorical(),
        ]);

        if (!mountedRef.current) return;

        const normalized = mergeLiveStatsPayload(liveResponse.data);
        const now = new Date();

        backoffRef.current = 30000;

        setData({
          ...normalized,
          historical: historicalData,
          loading: false,
          error: null,
          lastUpdate: now,
          lastSuccessAt: now,
          rateLimitedUntil: null,
        });

        scheduleNext(backoffRef.current);
      } catch (err) {
        if (!mountedRef.current) return;
        if (axios.isCancel(err)) return;

        const status = err?.response?.status;
        const retryAfterHeader = err?.response?.headers?.["retry-after"];
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;

        if (status === 429) {
          const nextDelay =
            Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
              ? retryAfterSeconds * 1000
              : Math.min(backoffRef.current * 2, 120000);

          backoffRef.current = nextDelay;

          setData((prev) => ({
            ...prev,
            loading: false,
            error: `Rate limited. Retrying in ${Math.ceil(nextDelay / 1000)}s...`,
            rateLimitedUntil: new Date(Date.now() + nextDelay),
          }));

          scheduleNext(nextDelay);
          return;
        }

        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Live data unavailable",
        }));

        backoffRef.current = Math.min(backoffRef.current + 10000, 120000);
        scheduleNext(backoffRef.current);
      }
    };

    fetchRef.current = fetchLiveStats;
    timerRef.current = setTimeout(fetchLiveStats, 250);

    const onVisibility = () => {
      if (!document.hidden) {
        clearPending();
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
  }, [fetchHistorical]);

  const sendControl = useCallback(async (bot, action) => {
    try {
      await axios.post(CONTROL_URL, { bot, action }, { timeout: 5000 });
      if (fetchRef.current) {
        setTimeout(() => fetchRef.current(), 1000);
      }
    } catch (err) {
      console.error("Control action failed:", err);
    }
  }, []);

  return { data, sendControl };
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const { data } = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());
  const [historicalType, setHistoricalType] = useState("daily");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hasConnection = !!(
    data.futures.health ||
    data.stocks.health ||
    data.sniper.health ||
    data.okx.health
  );

  const isStale = data.lastSuccessAt
    ? Math.floor((Date.now() - new Date(data.lastSuccessAt).getTime()) / 1000) > 90
    : false;

  const allTrades = useMemo(() => {
    const merged = [...normalizeArray(data.recent_trades)];

    const seen = new Set();
    const unique = [];

    for (const trade of merged) {
      const key = [
        trade?.id || "",
        trade?.symbol || "",
        trade?.side || "",
        getTradeTimestamp(trade) || "",
        trade?.price || "",
        getTradeQty(trade) || "",
        getTradeBot(trade) || "",
      ].join("|");

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(trade);
      }
    }

    return unique
      .sort((a, b) => {
        const tA = new Date(getTradeTimestamp(a) || 0).getTime();
        const tB = new Date(getTradeTimestamp(b) || 0).getTime();
        return tB - tA;
      })
      .slice(0, 50);
  }, [data.recent_trades]);

  const isOpenTrade = (t) => {
    const pnl = getTradePnlUsd(t);
    return t?.status === "open" || (pnl === 0 && t?.side && !t?.closed);
  };

  const isClosedTrade = (t) => {
    const pnl = getTradePnlUsd(t);
    return pnl !== 0 || t?.status === "closed" || t?.side === "close";
  };

  const isDexTrade = (t) => {
    const bot = String(getTradeBot(t)).toLowerCase();
    return bot.includes("sniper") || bot.includes("dex") || bot.includes("🦄");
  };

  const isCexTrade = (t) => {
    const bot = String(getTradeBot(t)).toLowerCase();
    return (
      bot.includes("okx") ||
      bot.includes("stock") ||
      bot.includes("futures") ||
      bot.includes("spot")
    );
  };

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(isClosedTrade);
    if (activeTab === "dex") return allTrades.filter(isDexTrade);
    if (activeTab === "cex") return allTrades.filter(isCexTrade);
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(isClosedTrade).length },
    { id: "dex", label: "DEX", icon: "🦄", count: allTrades.filter(isDexTrade).length },
    { id: "cex", label: "CEX", icon: "🏦", count: allTrades.filter(isCexTrade).length },
  ];

  const activeBots = [
    data.futures.health,
    data.stocks.health,
    data.sniper.health,
    data.okx.health,
  ].filter(Boolean).length;

  const totalPnL = useMemo(() => {
    let total = 0;

    if (data.okx.stats?.total_pnl) {
      total += safeNumber(data.okx.stats.total_pnl, 0);
    }

    normalizeArray(data.recent_trades).forEach((t) => {
      const pnl = getTradePnlUsd(t);
      if (pnl !== 0 && !String(t?.id || "").includes("dry_")) {
        total += safeNumber(pnl, 0);
      }
    });

    return total;
  }, [data.okx.stats, data.recent_trades]);

  const totalPnLPercent = useMemo(() => {
    const totalInvested = 100000;
    return (totalPnL / totalInvested) * 100;
  }, [totalPnL]);

  const openPositionsCount =
    safeNumber(data.okx.stats?.positions_count, 0) +
    normalizeArray(data.sniper.positions).length;

  const totalTradesCount =
    safeNumber(data.okx.stats?.total_trades, 0) + allTrades.length;

  const winsCount = useMemo(
    () => allTrades.filter((t) => getTradePnlUsd(t) > 0).length,
    [allTrades]
  );
  const lossesCount = useMemo(
    () => allTrades.filter((t) => getTradePnlUsd(t) < 0).length,
    [allTrades]
  );

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
                    : "Adaptive refresh"}
                </span>
              </div>

              <div className="text-xs text-white/40">
                Last good: {data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {data.error ? (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        ) : null}

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            Live Trading Dashboard 🚀
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch our trading stack scan, discover, and execute in real time.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext="Online" />
          <StatCard
            title="Total Trades"
            value={totalTradesCount}
            icon="📊"
            color="purple"
            subtext={`${winsCount} wins · ${lossesCount} losses`}
          />
          <StatCard
            title="Total P&L"
            value={`${totalPnL >= 0 ? "+" : ""}${formatCurrency(Math.abs(totalPnL))}`}
            icon="💰"
            color={totalPnL >= 0 ? "emerald" : "red"}
            subtext={formatPercent(totalPnLPercent)}
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
            value={normalizeArray(data.sniper.discoveries).length}
            icon="🦄"
            color="amber"
            subtext="New tokens found"
          />
        </div>

        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">📈 Historical Performance</h2>
          <EnhancedHistoricalChart
            data={data.historical}
            type={historicalType}
            onTypeChange={setHistoricalType}
          />
        </div>

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
            positions={data.sniper.positions}
          />
          <BotCard
            name="OKX Spot"
            icon="🔷"
            health={data.okx.health}
            stats={data.okx.stats}
            accent="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                </h2>

                <div className="flex gap-1 bg-black/30 rounded-lg p-1 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        activeTab === tab.id
                          ? "bg-emerald-600 text-white"
                          : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 ? (
                        <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
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

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span>
                DEX Discoveries
                {normalizeArray(data.sniper.discoveries).length > 0 ? (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {normalizeArray(data.sniper.discoveries).length} new
                  </span>
                ) : null}
              </h2>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {normalizeArray(data.sniper.discoveries).length > 0 ? (
                  normalizeArray(data.sniper.discoveries)
                    .slice(0, 10)
                    .map((d, i) => (
                      <DiscoveryCard
                        key={d?.pair || d?.address || d?.token || i}
                        discovery={d}
                      />
                    ))
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <div className="text-2xl mb-2">🔍</div>
                    Scanning for new tokens...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>📡</span>
                System Snapshot
              </h2>

              <div className="space-y-2 text-xs text-white/65">
                <div className="flex justify-between gap-3">
                  <span>API</span>
                  <span className="text-white/40 truncate">{API_BASE}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Connection</span>
                  <span className={hasConnection ? "text-green-400" : "text-yellow-400"}>
                    {hasConnection ? (isStale ? "Stale" : "Live") : "Connecting"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Last good update</span>
                  <span>{data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Open positions</span>
                  <span>{openPositionsCount}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Total trades</span>
                  <span>{totalTradesCount}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Win/Loss</span>
                  <span className={winsCount >= lossesCount ? "text-green-400" : "text-red-400"}>
                    {winsCount}/{lossesCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center backdrop-blur-sm">
              <Link
                to="/signup"
                className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all"
              >
                Start Trading Free →
              </Link>
              <p className="text-[10px] text-white/30 mt-2">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Adaptive polling with rate-limit backoff.
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">
              Home
            </Link>
            {" • "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">
              Member Dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
