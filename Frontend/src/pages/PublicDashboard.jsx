// src/pages/PublicDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

// NEW: Use all our available endpoints
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;

const DEFAULT_STATE = {
  bots: [],
  trades: [],
  discoveries: [],
  analytics: {
    summary: {
      total_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      total_pnl: 0,
      wins: 0,
      losses: 0
    }
  },
  loading: true,
  error: null,
  lastUpdate: null,
  lastSuccessAt: null,
};

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatCurrency(value, digits = 2) {
  return `$${safeNumber(value).toFixed(digits)}`;
}

function formatCurrencySigned(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(digits)}`;
}

function formatPercent(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function formatCompact(value) {
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

function formatShortDate(timestamp) {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "—";
  }
}

function getTradeTimestamp(trade) {
  return trade?.created_at || trade?.timestamp || trade?.time || null;
}

function getTradePnlUsd(trade) {
  return trade?.pnl_usd ?? trade?.pnl ?? 0;
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

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? trade?.size ?? 0;
}

/* =====================================================
   DATA HOOK - UPDATED TO USE ALL ENDPOINTS
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const backoffRef = useRef(30000);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      // Fetch from all our endpoints
      const [tradesRes, discoveriesRes, botsRes, analyticsRes] = await Promise.allSettled([
        axios.get(TRADES_URL, { timeout: 5000, signal }),
        axios.get(DISCOVERIES_URL, { timeout: 5000, signal }),
        axios.get(BOT_STATUS_URL, { timeout: 5000, signal }),
        axios.get(ANALYTICS_URL, { timeout: 5000, signal })
      ]);

      if (!mountedRef.current) return;

      const now = new Date();
      let newData = { ...DEFAULT_STATE };
      let hadError = false;

      // Process trades
      if (tradesRes.status === "fulfilled") {
        newData.trades = tradesRes.value.data.trades || [];
      } else {
        hadError = true;
        console.warn("Trades fetch failed");
      }

      // Process discoveries
      if (discoveriesRes.status === "fulfilled") {
        newData.discoveries = discoveriesRes.value.data.discoveries || [];
      } else {
        hadError = true;
        console.warn("Discoveries fetch failed");
      }

      // Process bots
      if (botsRes.status === "fulfilled") {
        newData.bots = botsRes.value.data.bots || [];
      } else {
        hadError = true;
        console.warn("Bots fetch failed");
      }

      // Process analytics
      if (analyticsRes.status === "fulfilled") {
        newData.analytics = analyticsRes.value.data;
      } else {
        hadError = true;
        console.warn("Analytics fetch failed");
      }

      setData({
        ...newData,
        loading: false,
        error: hadError ? "Some data is currently unavailable" : null,
        lastUpdate: now,
        lastSuccessAt: now,
      });

      backoffRef.current = 30000; // Reset backoff on success

    } catch (err) {
      if (!mountedRef.current || axios.isCancel(err)) return;
      
      console.error("Data fetch error:", err);
      backoffRef.current = Math.min(backoffRef.current * 1.5, 120000);
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: `Connection issue. Retrying in ${Math.ceil(backoffRef.current / 1000)}s...`,
        lastUpdate: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchAllData();

    // Set up polling
    const poll = () => {
      if (!mountedRef.current) return;
      fetchAllData();
      timerRef.current = setTimeout(poll, backoffRef.current);
    };
    
    timerRef.current = setTimeout(poll, backoffRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchAllData]);

  return data;
}

/* =====================================================
   CREATIVE CHART COMPONENTS
===================================================== */

function JourneyTimelineChart({ totalTrades = 0 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const goalTrades = 500;
  const percentComplete = Math.min((totalTrades / goalTrades) * 100, 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
    gradient.addColorStop(0.6, "rgba(99, 102, 241, 0.1)");
    gradient.addColorStop(1, "rgba(139, 92, 246, 0.05)");

    // Generate realistic projection data
    const labels = ["Launch", "Week 1", "Week 2", "Week 3", "Week 4", "Month 2", "Month 3"];
    const projected = [0, 15, 35, 60, 100, 250, 500];
    
    // Current progress - interpolate based on actual trades
    const current = [];
    for (let i = 0; i < labels.length; i++) {
      const projectedValue = projected[i];
      if (totalTrades >= projectedValue) {
        current.push(projectedValue);
      } else if (i > 0 && totalTrades < projectedValue) {
        // Partial progress for current milestone
        const prevValue = projected[i-1];
        const progress = (totalTrades - prevValue) / (projectedValue - prevValue);
        current.push(prevValue + (progress * (projectedValue - prevValue)));
        // Fill rest with null
        for (let j = i + 1; j < labels.length; j++) {
          current.push(null);
        }
        break;
      } else {
        current.push(null);
      }
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Projected Journey",
            data: projected,
            borderColor: "#10b981",
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 6,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "white",
            pointBorderWidth: 2,
          },
          {
            label: "Current Progress",
            data: current,
            borderColor: "#f59e0b",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 8,
            pointBackgroundColor: "#f59e0b",
            pointBorderColor: "white",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { color: "#9ca3af", usePointStyle: true },
          },
          tooltip: {
            backgroundColor: "rgba(17,24,39,0.95)",
            titleColor: "#fff",
            bodyColor: "#9ca3af",
            borderColor: "rgba(16,185,129,0.3)",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { 
              color: "#9ca3af",
              callback: (value) => `${value} trades`,
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#9ca3af" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [totalTrades]);

  return (
    <div className="relative">
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
      <div className="absolute top-2 right-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs border border-amber-500/30">
        🚀 {totalTrades} / 500 Trades
      </div>
    </div>
  );
}

function ReadinessMeter({ percentage, label, color = "emerald" }) {
  const colorClasses = {
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MilestoneCard({ icon, title, description, eta, status = "upcoming" }) {
  const statusColors = {
    completed: "border-emerald-500/30 bg-emerald-500/10",
    in_progress: "border-amber-500/30 bg-amber-500/10",
    upcoming: "border-white/10 bg-white/5",
  };

  const statusText = {
    completed: "✅ Completed",
    in_progress: "🔄 In Progress",
    upcoming: "⏳ Upcoming",
  };

  return (
    <div className={`border rounded-xl p-4 ${statusColors[status]}`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{title}</h3>
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/10">
              {statusText[status]}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">{description}</p>
          {eta && <p className="text-[10px] text-white/40 mt-2">ETA: {eta}</p>}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   UI COMPONENTS
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
      className={`w-24 h-8 transition-all duration-150 ${beat ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" : ""}`}
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
      <circle cx={beat ? "43" : "70"} cy="20" r="3" fill={beat ? "#34d399" : "#10b981"} />
    </svg>
  );
}

function StatCard({ title, value, icon, subtext, color = "emerald", badge }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
    blue: "text-blue-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all relative">
      {badge && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[8px] px-2 py-1 rounded-full font-bold">
          {badge}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/50">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext ? <p className="text-[10px] sm:text-xs text-white/30 mt-1">{subtext}</p> : null}
        </div>
        <div className="text-2xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, valueClassName = "text-white font-medium" }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-white/50">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function BotCard({ bot }) {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning";

  return (
    <div className="border border-white/10 bg-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">
            {bot?.name?.includes("Futures") && "📊"}
            {bot?.name?.includes("Stock") && "📈"}
            {bot?.name?.includes("Sniper") && "🦄"}
            {bot?.name?.includes("OKX") && "🔷"}
          </span>
          <span className="font-semibold text-sm sm:text-base truncate">{bot?.name}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      
      {isOnline ? (
        <div className="text-xs space-y-2">
          {bot?.name?.includes("Futures") && (
            <>
              <MetricRow label="Pairs" value={bot?.metrics?.pairs || 150} />
              <MetricRow label="Positions" value={bot?.positions || 0} />
              <MetricRow label="Uptime" value={`${bot?.uptime || 99.8}%`} />
            </>
          )}
          {bot?.name?.includes("Stock") && (
            <>
              <MetricRow label="Symbols" value={bot?.symbols || 500} />
              <MetricRow label="Mode" value={bot?.mode || "paper"} />
              <MetricRow label="Uptime" value={`${bot?.uptime || 99.9}%`} />
            </>
          )}
          {bot?.name?.includes("Sniper") && (
            <>
              <MetricRow label="Discoveries" value={bot?.discoveries || 0} valueClassName="text-purple-400" />
              <MetricRow label="Networks" value={bot?.active_networks?.join(", ") || "—"} />
              <MetricRow label="Avg Score" value={bot?.metrics?.avg_score || 0} />
            </>
          )}
          {bot?.name?.includes("OKX") && (
            <>
              <MetricRow label="Positions" value={bot?.positions || 0} />
              <MetricRow label="Trades" value={bot?.total_trades || 0} />
              <MetricRow label="Mode" value={bot?.metrics?.mode || "live"} />
            </>
          )}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>
      )}
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
  const isOpen = trade?.status === "open" && pnlUsd === 0;

  let borderColor = "border-l-gray-500";
  let bgColor = "bg-white/[0.03]";
  let badgeColor = "bg-gray-500/20 text-gray-300";
  let badgeText = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-500/5";
    badgeColor = "bg-blue-500/20 text-blue-300";
    badgeText = "OPEN";
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
    <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
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
              {formatCurrencySigned(pnlUsd)}
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
  const pair = discovery?.pair || discovery?.address || "New token";

  let scoreColor = "text-orange-400";
  if (score >= 0.7) scoreColor = "text-green-400";
  else if (score >= 0.5) scoreColor = "text-yellow-400";

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-colors">
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

function InvestorPanel({ data }) {
  const totalTrades = data.analytics?.summary?.total_trades || 0;
  const totalPnL = data.analytics?.summary?.total_pnl || 0;
  const wins = data.analytics?.summary?.wins || 0;
  const losses = data.analytics?.summary?.losses || 0;
  const winRate = data.analytics?.summary?.win_rate || 0;
  const activeBots = data.bots.length;

  // Calculate readiness scores
  const infrastructureReadiness = (activeBots / 4) * 100;
  const tradingReadiness = Math.min(totalTrades > 0 ? 50 + (totalTrades / 10) : 25, 90);
  const discoveryReadiness = Math.min(data.discoveries.length * 5, 80);
  const overallReadiness = Math.round((infrastructureReadiness + tradingReadiness + discoveryReadiness) / 3);

  return (
    <div className="bg-gradient-to-br from-indigo-600/15 to-emerald-600/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-bold text-lg">Building in Public</h2>
          <p className="text-xs text-white/50 mt-1">Watch our trading infrastructure come to life, in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            🚀 Launch Phase
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
            {overallReadiness}% Ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Infrastructure</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">{Math.round(infrastructureReadiness)}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${infrastructureReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">{activeBots}/4 bots online</div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Trading Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">{Math.round(tradingReadiness)}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${tradingReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">{totalTrades} trades · {winRate}% win rate</div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Discovery Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">{Math.round(discoveryReadiness)}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400" style={{ width: `${discoveryReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">{data.discoveries.length} findings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Current Status</div>
          <div className="space-y-2">
            <MetricRow label="Active Bots" value={`${activeBots}/4`} />
            <MetricRow label="Total Trades" value={totalTrades} />
            <MetricRow label="Total P&L" value={formatCurrencySigned(totalPnL)} valueClassName={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />
            <MetricRow label="Win/Loss" value={`${wins}W / ${losses}L`} />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Next Milestones</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="flex-1">10 trades milestone</span>
              <span className="text-white/40">{totalTrades >= 10 ? "✅" : `${10 - totalTrades} to go`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="flex-1">50 trades milestone</span>
              <span className="text-white/40">{totalTrades >= 50 ? "✅" : `${50 - totalTrades} to go`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="flex-1">100 trades milestone</span>
              <span className="text-white/40">{totalTrades >= 100 ? "✅" : `${100 - totalTrades} to go`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};

  const totalPnL = analytics.total_pnl || 0;
  const totalTradesCount = analytics.total_trades || allTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;

  const isOpenTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
    return trade?.status === "open" || (pnl === 0 && !trade?.pnl);
  };

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(t => !isOpenTrade(t));
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(t => !isOpenTrade(t)).length },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-[#0d1324] to-indigo-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Real-time data</span>
              </div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all"
              >
                Join the Journey →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {data.error && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Building in Public
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
            Watch our multi-bot trading infrastructure come to life. Every trade, every discovery, every milestone — in real-time.
          </p>
        </div>

        {/* Hero Chart */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <span>🗺️</span>
              Our Journey to 500 Trades
            </h2>
            <div className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              {totalTradesCount} / 500 Trades
            </div>
          </div>
          <JourneyTimelineChart totalTrades={totalTradesCount} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard 
            title="Total Trades" 
            value={totalTradesCount} 
            icon="📊" 
            color="purple" 
            subtext={`${winsCount} wins · ${lossesCount} losses`} 
          />
          <StatCard 
            title="Total P&L" 
            value={formatCurrencySigned(totalPnL)} 
            icon="💰" 
            color={totalPnL >= 0 ? "emerald" : "red"} 
          />
          <StatCard 
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="emerald" 
            subtext="systems online" 
          />
          <StatCard 
            title="Discoveries" 
            value={discoveries.length} 
            icon="🦄" 
            color="amber" 
            subtext="new tokens" 
          />
        </div>

        {/* Investor Panel */}
        <div className="mb-6">
          <InvestorPanel data={data} />
        </div>

        {/* Bot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {bots.map((bot, index) => (
            <BotCard key={index} bot={bot} />
          ))}
        </div>

        {/* Two Column Layout - Trades and Discoveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Trade Feed */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Trade Feed
              </h2>
              <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id ? "bg-emerald-600 text-white" : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade, i) => (
                  <TradeRow key={i} trade={trade} />
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No trades yet</p>
                </div>
              )}
            </div>
          </div>

          {/* DEX Discoveries */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <span>🦄</span>
              DEX Discoveries
              {discoveries.length > 0 && (
                <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                  {discoveries.length} new
                </span>
              )}
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {discoveries.length > 0 ? (
                discoveries.map((d, i) => (
                  <DiscoveryCard key={i} discovery={d} />
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Scanning for new tokens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Building in public • Real-time infrastructure • Every milestone visible
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-400 hover:underline">Pricing</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
