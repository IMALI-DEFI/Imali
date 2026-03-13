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

// Public endpoints (no auth required)
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const PUBLIC_TIERS_URL = `${API_BASE}/api/public/tiers`;
const PUBLIC_FAQ_URL = `${API_BASE}/api/public/faq`;
const PUBLIC_ROADMAP_URL = `${API_BASE}/api/public/roadmap`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;

// Auth-required endpoints (will be conditionally fetched)
const TRADING_PAIRS_URL = `${API_BASE}/api/trading/pairs`;
const TRADING_STRATEGIES_URL = `${API_BASE}/api/trading/strategies`;

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
      losses: 0,
      avg_win: 0,
      avg_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      sharpe_ratio: 0,
      max_drawdown_percent: 0
    }
  },
  pnlHistory: [],
  userStats: {
    total_users: 0,
    active_users: 0,
    total_trades_platform: 0,
    total_volume: 0,
    avg_trade_size: 0,
    growth_rate: 0,
    top_traders: []
  },
  tradingPairs: [],
  tradingStrategies: [],
  publicTiers: {},
  publicFaq: [],
  publicRoadmap: {},
  loading: true,
  error: null,
  lastUpdate: null,
  lastSuccessAt: null,
  isAuthenticated: false,
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
   ENHANCED DATA HOOK - Now with auth detection
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

      // Check if user is authenticated
      const token = localStorage.getItem('imali_token');
      const isAuthenticated = !!token;

      // Create auth headers if needed
      const authHeaders = isAuthenticated ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {};

      // Fetch public endpoints (always try)
      const [
        tradesRes, 
        discoveriesRes, 
        botsRes, 
        analyticsRes,
        userStatsRes,
        pnlHistoryRes,
        publicTiersRes,
        publicFaqRes,
        publicRoadmapRes
      ] = await Promise.allSettled([
        axios.get(TRADES_URL, { timeout: 5000, signal }),
        axios.get(DISCOVERIES_URL, { timeout: 5000, signal }),
        axios.get(BOT_STATUS_URL, { timeout: 5000, signal }),
        axios.get(ANALYTICS_URL, { timeout: 5000, signal }),
        axios.get(USER_STATS_URL, { timeout: 5000, signal }),
        axios.get(PNL_HISTORY_URL, { timeout: 5000, signal }),
        axios.get(PUBLIC_TIERS_URL, { timeout: 5000, signal }),
        axios.get(PUBLIC_FAQ_URL, { timeout: 5000, signal }),
        axios.get(PUBLIC_ROADMAP_URL, { timeout: 5000, signal })
      ]);

      // Only fetch auth-required endpoints if user is authenticated
      let tradingPairsRes = { status: "rejected", reason: "not authenticated" };
      let tradingStrategiesRes = { status: "rejected", reason: "not authenticated" };

      if (isAuthenticated) {
        [tradingPairsRes, tradingStrategiesRes] = await Promise.allSettled([
          axios.get(TRADING_PAIRS_URL, { timeout: 5000, signal, ...authHeaders }),
          axios.get(TRADING_STRATEGIES_URL, { timeout: 5000, signal, ...authHeaders })
        ]);
      }

      if (!mountedRef.current) return;

      const now = new Date();
      let newData = { ...DEFAULT_STATE, isAuthenticated };
      let hadError = false;

      // Process public endpoints
      if (tradesRes.status === "fulfilled") {
        newData.trades = tradesRes.value.data.trades || [];
      } else {
        hadError = true;
        console.warn("Trades fetch failed");
      }

      if (discoveriesRes.status === "fulfilled") {
        newData.discoveries = discoveriesRes.value.data.discoveries || [];
      } else {
        hadError = true;
        console.warn("Discoveries fetch failed");
      }

      if (botsRes.status === "fulfilled") {
        newData.bots = botsRes.value.data.bots || [];
      } else {
        hadError = true;
        console.warn("Bots fetch failed");
      }

      if (analyticsRes.status === "fulfilled") {
        newData.analytics = analyticsRes.value.data;
      } else {
        hadError = true;
        console.warn("Analytics fetch failed");
      }

      if (userStatsRes.status === "fulfilled") {
        newData.userStats = userStatsRes.value.data || DEFAULT_STATE.userStats;
      } else {
        console.warn("User stats fetch failed");
      }

      if (pnlHistoryRes.status === "fulfilled") {
        newData.pnlHistory = pnlHistoryRes.value.data.history || [];
      } else {
        console.warn("PNL history fetch failed");
      }

      if (publicTiersRes.status === "fulfilled") {
        newData.publicTiers = publicTiersRes.value.data || {};
      }

      if (publicFaqRes.status === "fulfilled") {
        newData.publicFaq = publicFaqRes.value.data.faqs || [];
      }

      if (publicRoadmapRes.status === "fulfilled") {
        newData.publicRoadmap = publicRoadmapRes.value.data || {};
      }

      // Process auth-required endpoints (only if authenticated)
      if (isAuthenticated) {
        if (tradingPairsRes.status === "fulfilled") {
          newData.tradingPairs = tradingPairsRes.value.data.pairs || [];
        } else {
          console.warn("Trading pairs fetch failed (requires auth)");
        }

        if (tradingStrategiesRes.status === "fulfilled") {
          newData.tradingStrategies = tradingStrategiesRes.value.data.strategies || [];
        } else {
          console.warn("Trading strategies fetch failed (requires auth)");
        }
      }

      setData({
        ...newData,
        loading: false,
        error: hadError ? "Some public data is currently unavailable" : null,
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
   JOURNEY TIMELINE CHART COMPONENT
===================================================== */

function JourneyTimelineChart({ totalTrades = 0 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const goalTrades = 500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
    gradient.addColorStop(0.6, "rgba(99, 102, 241, 0.1)");
    gradient.addColorStop(1, "rgba(139, 92, 246, 0.05)");

    const labels = ["Launch", "Week 1", "Week 2", "Week 3", "Week 4", "Month 2", "Month 3"];
    const projected = [0, 15, 35, 60, 100, 250, 500];
    
    const current = [];
    for (let i = 0; i < labels.length; i++) {
      const projectedValue = projected[i];
      if (totalTrades >= projectedValue) {
        current.push(projectedValue);
      } else if (i > 0 && totalTrades < projectedValue) {
        const prevValue = projected[i-1];
        const progress = (totalTrades - prevValue) / (projectedValue - prevValue);
        current.push(prevValue + (progress * (projectedValue - prevValue)));
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
            labels: { color: "#6b7280", usePointStyle: true },
          },
          tooltip: {
            backgroundColor: "rgba(255,255,255,0.95)",
            titleColor: "#111827",
            bodyColor: "#4b5563",
            borderColor: "rgba(16,185,129,0.3)",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { 
              color: "#6b7280",
              callback: (value) => `${value} trades`,
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280" },
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
      <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs border border-amber-200">
        🚀 {totalTrades} / 500 Trades
      </div>
    </div>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function StatCard({ title, value, icon, subtext, color = "emerald", badge }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all relative">
      {badge && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] px-2 py-1 rounded-full font-bold">
          {badge}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext ? <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtext}</p> : null}
        </div>
        <div className="text-2xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, valueClassName = "text-gray-900 font-medium" }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function BotCard({ bot }) {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning";

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">
            {bot?.name?.includes("Futures") && "📊"}
            {bot?.name?.includes("Stock") && "📈"}
            {bot?.name?.includes("Sniper") && "🦄"}
            {bot?.name?.includes("OKX") && "🔷"}
          </span>
          <span className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot?.name}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-emerald-600" : "text-red-600"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      
      {isOnline ? (
        <div className="text-xs space-y-2 text-gray-600">
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
              <MetricRow label="Discoveries" value={bot?.discoveries || 0} valueClassName="text-purple-600 font-medium" />
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
        <div className="text-xs text-gray-400 py-2 text-center">Waiting for connection...</div>
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

  let borderColor = "border-l-gray-300";
  let bgColor = "bg-gray-50";
  let badgeColor = "bg-gray-200 text-gray-700";
  let badgeText = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-50";
    badgeColor = "bg-blue-100 text-blue-700";
    badgeText = "OPEN";
  } else if (isBuy) {
    borderColor = "border-l-emerald-500";
    bgColor = "bg-emerald-50";
    badgeColor = "bg-emerald-100 text-emerald-700";
    badgeText = "BUY";
  } else if (isSell) {
    borderColor = "border-l-red-500";
    bgColor = "bg-red-50";
    badgeColor = "bg-red-100 text-red-700";
    badgeText = "SELL";
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">📊</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
            <span className="text-[10px] text-gray-400">{bot}</span>
          </div>
          <div className="text-[10px] text-gray-400">
            {timeAgo(ts)} • {formatCurrency(price)} • {qty > 0 ? `${qty.toFixed(4)} units` : "—"}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-600">Open</div>
        ) : pnlUsd !== 0 ? (
          <div>
            <div className={`font-bold text-sm ${pnlUsd > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrencySigned(pnlUsd)}
            </div>
            <div className={`text-[10px] ${pnlPercent > 0 ? "text-emerald-600/70" : "text-red-600/70"}`}>
              {formatPercent(pnlPercent)}
            </div>
          </div>
        ) : (
          <div className="font-bold text-sm text-gray-900">{formatCurrency(price)}</div>
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

  let scoreColor = "text-orange-600";
  if (score >= 0.7) scoreColor = "text-emerald-600";
  else if (score >= 0.5) scoreColor = "text-amber-600";

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs hover:shadow-md transition-colors">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-medium flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <span className="capitalize text-gray-900 truncate">{chain}</span>
        </span>
        <span className="text-gray-400 text-[10px] shrink-0">{age} blocks</span>
      </div>
      <div className="text-gray-600 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-gray-400">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 ? (
          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
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

  const infrastructureReadiness = (activeBots / 4) * 100;
  const tradingReadiness = Math.min(totalTrades > 0 ? 50 + (totalTrades / 10) : 25, 90);
  const discoveryReadiness = Math.min(data.discoveries.length * 5, 80);
  const overallReadiness = Math.round((infrastructureReadiness + tradingReadiness + discoveryReadiness) / 3);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 border border-indigo-200 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Building in Public</h2>
          <p className="text-xs text-gray-500 mt-1">Watch our trading infrastructure come to life, in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            🚀 Launch Phase
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            {overallReadiness}% Ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Infrastructure</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-gray-900">{Math.round(infrastructureReadiness)}%</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${infrastructureReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{activeBots}/4 bots online</div>
        </div>

        <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Trading Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-gray-900">{Math.round(tradingReadiness)}%</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${tradingReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{totalTrades} trades · {winRate}% win rate</div>
        </div>

        <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Discovery Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-gray-900">{Math.round(discoveryReadiness)}%</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${discoveryReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{data.discoveries.length} findings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
          <div className="text-gray-500 mb-2">Current Status</div>
          <div className="space-y-2">
            <MetricRow label="Active Bots" value={`${activeBots}/4`} />
            <MetricRow label="Total Trades" value={totalTrades} />
            <MetricRow label="Total P&L" value={formatCurrencySigned(totalPnL)} valueClassName={totalPnL >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"} />
            <MetricRow label="Win/Loss" value={`${wins}W / ${losses}L`} />
          </div>
        </div>

        <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
          <div className="text-gray-500 mb-2">Next Milestones</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="flex-1 text-gray-700">10 trades milestone</span>
              <span className="text-gray-400">{totalTrades >= 10 ? "✅" : `${10 - totalTrades} to go`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="flex-1 text-gray-700">50 trades milestone</span>
              <span className="text-gray-400">{totalTrades >= 50 ? "✅" : `${50 - totalTrades} to go`}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="flex-1 text-gray-700">100 trades milestone</span>
              <span className="text-gray-400">{totalTrades >= 100 ? "✅" : `${100 - totalTrades} to go`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopTraderCard({ trader }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">🏆</span>
        <span className="font-medium text-gray-900 truncate">{trader.username}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="text-emerald-600">{trader.trades} trades</div>
        <div className="text-[10px] text-amber-600">${trader.pnl.toLocaleString()}</div>
      </div>
    </div>
  );
}

function PairCard({ pair }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs hover:shadow-md transition-all">
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold text-gray-900">{pair.symbol}</span>
        <span className="text-emerald-600">{pair.name}</span>
      </div>
      <div className="flex justify-between text-gray-400 text-[10px]">
        <span>Min: ${pair.min_amount}</span>
        <span>Max: ${pair.max_amount}</span>
      </div>
    </div>
  );
}

function StrategyCard({ strategy }) {
  const riskColors = {
    low: "text-emerald-600",
    medium: "text-amber-600",
    high: "text-red-600"
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="font-semibold text-sm text-gray-900">{strategy.name}</h4>
          <p className="text-[10px] text-gray-500 mt-1">{strategy.description}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full ${riskColors[strategy.risk_level] || "text-gray-500"} bg-white/80`}>
          {strategy.risk_level} risk
        </span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-400">Min: ${strategy.min_investment}</span>
        <span className="text-emerald-600">{strategy.expected_apy}</span>
      </div>
    </div>
  );
}

function VolumeChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    const labels = pnlHistory.map((_, i) => `Day ${i+1}`);
    const values = pnlHistory.length > 0 ? pnlHistory : [0, 0, 0, 0, 0, 0, 0];

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Daily P&L",
          data: values,
          backgroundColor: values.map(v => v >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"),
          borderColor: values.map(v => v >= 0 ? "#10b981" : "#ef4444"),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#6b7280" },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280" },
          }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return (
    <div className="h-40">
      <canvas ref={canvasRef} />
    </div>
  );
}

/* =====================================================
   AUTH REQUIRED COMPONENT (Login prompt)
===================================================== */

function AuthRequiredCard({ children, message = "Log in to view this content" }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
      <div className="text-3xl mb-3">🔒</div>
      <h3 className="font-semibold text-blue-800 mb-2">Authentication Required</h3>
      <p className="text-sm text-blue-600 mb-4">{message}</p>
      <Link
        to="/login"
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Log In to Access
      </Link>
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const userStats = data.userStats || {};
  const pnlHistory = data.pnlHistory || [];
  const tradingPairs = data.tradingPairs || [];
  const tradingStrategies = data.tradingStrategies || [];
  const isAuthenticated = data.isAuthenticated || false;

  const totalPnL = analytics.total_pnl || 0;
  const totalTradesCount = analytics.total_trades || allTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;
  const winRate = analytics.win_rate || 0;
  const avgWin = analytics.avg_win || 0;
  const avgLoss = analytics.avg_loss || 0;
  const largestWin = analytics.largest_win || 0;
  const largestLoss = analytics.largest_loss || 0;
  const sharpeRatio = analytics.sharpe_ratio || 0;
  const maxDrawdown = analytics.max_drawdown_percent || 0;

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Connecting to trading bots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Real-time data</span>
              </div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white transition-all"
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all"
                >
                  Join the Journey →
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {data.error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-600 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            Building in Public
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
            Watch our multi-bot trading infrastructure come to life. Every trade, every discovery, every milestone — in real-time.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 text-center">
            <div className="text-xs text-indigo-600">Win Rate</div>
            <div className="text-lg font-bold text-indigo-700">{winRate}%</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
            <div className="text-xs text-emerald-600">Sharpe</div>
            <div className="text-lg font-bold text-emerald-700">{sharpeRatio}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center">
            <div className="text-xs text-amber-600">Max DD</div>
            <div className="text-lg font-bold text-amber-700">{maxDrawdown}%</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center">
            <div className="text-xs text-purple-600">Discoveries</div>
            <div className="text-lg font-bold text-purple-700">{discoveries.length}</div>
          </div>
        </div>

        {/* Hero Chart */}
        <div className="mb-6 bg-white border border-gray-200 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-xl flex items-center gap-2 text-gray-900">
              <span>🗺️</span>
              Our Journey to 500 Trades
            </h2>
            <div className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
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
            subtext={`Avg Win: ${formatCurrency(avgWin)} · Avg Loss: ${formatCurrency(avgLoss)}`}
          />
          <StatCard 
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="emerald" 
            subtext="systems online" 
          />
          <StatCard 
            title="Win / Loss" 
            value={`${winsCount} / ${lossesCount}`} 
            icon="⚔️" 
            color="amber" 
            subtext={`${winRate}% win rate`}
          />
        </div>

        {/* Investor Panel */}
        <div className="mb-6">
          <InvestorPanel data={data} />
        </div>

        {/* Top Traders */}
        {userStats.top_traders && userStats.top_traders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <span>🏆</span>
                Top Traders
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {userStats.top_traders.map((trader, i) => (
                <TopTraderCard key={i} trader={trader} />
              ))}
            </div>
          </div>
        )}

        {/* Bot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {bots.map((bot, index) => (
            <BotCard key={index} bot={bot} />
          ))}
        </div>

        {/* Toggle for advanced sections */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 text-sm hover:bg-gray-200 transition-all text-gray-700"
        >
          {showAdvanced ? "▼ Hide Advanced Stats" : "▶ Show Advanced Stats"}
        </button>

        {showAdvanced && (
          <>
            {/* Trading Pairs - Auth Required */}
            {isAuthenticated ? (
              tradingPairs.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-bold text-lg flex items-center gap-2 mb-3 text-gray-900">
                    <span>💱</span>
                    Available Trading Pairs
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {tradingPairs.map((pair, i) => (
                      <PairCard key={i} pair={pair} />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="mb-6">
                <AuthRequiredCard message="Log in to view available trading pairs" />
              </div>
            )}

            {/* Trading Strategies - Auth Required */}
            {isAuthenticated ? (
              tradingStrategies.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-bold text-lg flex items-center gap-2 mb-3 text-gray-900">
                    <span>🧠</span>
                    Trading Strategies
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {tradingStrategies.map((strategy, i) => (
                      <StrategyCard key={i} strategy={strategy} />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="mb-6">
                <AuthRequiredCard message="Log in to view trading strategies" />
              </div>
            )}

            {/* P&L History Chart - Always Public */}
            {pnlHistory.length > 0 && (
              <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4">
                <h2 className="font-bold text-lg mb-3 text-gray-900">Daily P&L History</h2>
                <VolumeChart pnlHistory={pnlHistory} />
              </div>
            )}

            {/* Detailed Analytics - Always Public */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-xs text-gray-500">Largest Win</div>
                <div className="text-lg font-bold text-emerald-600">{formatCurrency(largestWin)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-xs text-gray-500">Largest Loss</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(largestLoss)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-xs text-gray-500">Profit Factor</div>
                <div className="text-lg font-bold text-purple-600">{analytics.profit_factor || 0}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="text-xs text-gray-500">Avg Trade</div>
                <div className="text-lg font-bold text-amber-600">
                  {formatCurrency(totalTradesCount > 0 ? totalPnL / totalTradesCount : 0)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Two Column Layout - Trades and Discoveries (Always Public) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Trade Feed */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Trade Feed
              </h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id 
                        ? "bg-emerald-600 text-white" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="ml-1 text-[8px] bg-gray-200 text-gray-700 px-1.5 rounded-full">{tab.count}</span>
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
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No trades yet</p>
                </div>
              )}
            </div>
          </div>

          {/* DEX Discoveries - Always Public */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-900">
              <span>🦄</span>
              DEX Discoveries
              {discoveries.length > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
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
                <div className="text-center py-12 text-gray-400">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Scanning for new tokens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>
            Building in public • Real-time infrastructure • Every milestone visible
            <br />
            <Link to="/" className="text-indigo-600 hover:underline">Home</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-600 hover:underline">Pricing</Link>
            {" • "}
            <Link to="/referrals" className="text-amber-600 hover:underline">Referrals</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
