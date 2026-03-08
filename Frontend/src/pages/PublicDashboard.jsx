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

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;

const DEFAULT_HISTORICAL = {
  daily: [],
  weekly: [],
  monthly: [],
};

const DEFAULT_STATE = {
  futures: {
    health: null,
    stats: {
      total_symbols: 0,
      status: "unknown",
      daily_realized: {},
      cex_enabled: false,
      dry_run: true,
      db_connected: false,
      positions: 0,
    },
  },
  stocks: {
    health: null,
    stats: {
      symbols: 0,
      mode: "paper",
      running: false,
      lastRefresh: null,
    },
  },
  sniper: {
    health: null,
    discoveries: [],
    stats: {
      status: "idle",
      active_trades: 0,
      bot_state: "idle",
      last_heartbeat: null,
      active_networks: [],
    },
  },
  okx: {
    health: null,
    stats: {
      positions_count: 0,
      total_trades: 0,
      total_pnl: 0,
      mode: "dry_run",
      scan_count: 0,
      last_scan_time: null,
      last_candidate_count: 0,
      last_signal_count: 0,
      symbols_loaded: 0,
      max_positions: 0,
      min_ai_score: 0,
    },
  },
  recent_trades: [],
  historical: DEFAULT_HISTORICAL,
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

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasObjectData(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
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
  return (
    trade?.created_at ||
    trade?.timestamp ||
    trade?.time ||
    trade?.received_at ||
    trade?.closed_at ||
    null
  );
}

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? trade?.size ?? 0;
}

function getTradePnlUsd(trade) {
  return trade?.pnl_usd ?? trade?.pnl ?? 0;
}

function getTradePnlPercent(trade) {
  return trade?.pnl_percentage ?? trade?.pnl_pct ?? trade?.return_percent ?? 0;
}

function getTradeSide(trade) {
  return String(trade?.side || trade?.action || trade?.type || "").toLowerCase();
}

function getTradeBot(trade) {
  return trade?.bot || trade?.source || trade?.exchange || trade?.chain || "Unknown";
}

function getTradePrice(trade) {
  return trade?.price ?? trade?.entry_price ?? trade?.exit_price ?? 0;
}

function normalizeHistoricalShape(value) {
  if (!value || typeof value !== "object") return DEFAULT_HISTORICAL;
  return {
    daily: safeArray(value.daily),
    weekly: safeArray(value.weekly),
    monthly: safeArray(value.monthly),
  };
}

function dedupeTrades(trades) {
  const seen = new Set();
  const unique = [];

  for (const trade of safeArray(trades)) {
    const key = [
      trade?.id || "",
      trade?.symbol || "",
      getTradeSide(trade),
      getTradeTimestamp(trade) || "",
      getTradePrice(trade),
      getTradeQty(trade),
      getTradeBot(trade),
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(trade);
    }
  }

  return unique;
}

function sumNumericObjectValues(obj) {
  if (!obj || typeof obj !== "object") return 0;
  return Object.values(obj).reduce((sum, value) => sum + safeNumber(value), 0);
}

/* =====================================================
   PAYLOAD NORMALIZATION
===================================================== */

function mergeLiveStatsPayload(payload = {}, existingHistorical = DEFAULT_HISTORICAL) {
  const futures = hasObjectData(payload?.futures) ? payload.futures : {};
  const stocks = hasObjectData(payload?.stocks) ? payload.stocks : {};
  const sniper = hasObjectData(payload?.sniper) ? payload.sniper : {};
  const okx = hasObjectData(payload?.okx) ? payload.okx : {};

  const incomingRecentTrades = Array.isArray(payload?.recent_trades) ? payload.recent_trades : [];
  const discoveries = safeArray(sniper?.discoveries || payload?.discoveries);

  const incomingHistorical = normalizeHistoricalShape(payload?.historical);
  const hasIncomingHistorical =
    incomingHistorical.daily.length > 0 ||
    incomingHistorical.weekly.length > 0 ||
    incomingHistorical.monthly.length > 0;

  return {
    futures: {
      health: hasObjectData(futures) ? futures : null,
      stats: {
        total_symbols: safeNumber(futures?.total_symbols, 0),
        status: futures?.status || "unknown",
        daily_realized: futures?.daily_realized || {},
        cex_enabled: !!futures?.cex_enabled,
        dry_run: !!futures?.dry_run,
        db_connected: !!futures?.db_connected,
        positions: safeNumber(futures?.positions, 0),
      },
    },

    stocks: {
      health: hasObjectData(stocks) ? stocks : null,
      stats: {
        symbols: safeNumber(stocks?.symbols, 0),
        mode: stocks?.mode || "paper",
        running: !!stocks?.running,
        lastRefresh: stocks?.lastRefresh || null,
      },
    },

    sniper: {
      health: hasObjectData(sniper) ? sniper : null,
      discoveries,
      stats: {
        status: sniper?.status || "idle",
        active_trades: safeNumber(sniper?.active_trades, 0),
        bot_state: sniper?.bot_state || "idle",
        last_heartbeat: sniper?.last_heartbeat || sniper?.timestamp || null,
        active_networks: safeArray(sniper?.active_networks),
      },
    },

    okx: {
      health: hasObjectData(okx) ? okx : null,
      stats: {
        positions_count:
          typeof okx?.positions === "number"
            ? okx.positions
            : safeNumber(okx?.positions_count, 0),
        total_trades: safeNumber(okx?.total_trades, 0),
        total_pnl: safeNumber(okx?.total_pnl, 0),
        mode: okx?.mode || "dry_run",
        scan_count: safeNumber(okx?.scan_count, 0),
        last_scan_time: okx?.last_scan_time || null,
        last_candidate_count: safeNumber(okx?.last_candidate_count, 0),
        last_signal_count: safeNumber(okx?.last_signal_count, 0),
        symbols_loaded: safeNumber(okx?.symbols_loaded, 0),
        max_positions: safeNumber(okx?.max_positions, 0),
        min_ai_score: safeNumber(okx?.min_ai_score, 0),
      },
    },

    recent_trades: dedupeTrades(incomingRecentTrades),
    historical: hasIncomingHistorical ? incomingHistorical : existingHistorical,
  };
}

/* =====================================================
   DATA HOOK
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const stateRef = useRef(DEFAULT_STATE);
  const backoffRef = useRef(30000);

  useEffect(() => {
    stateRef.current = data;
  }, [data]);

  const fetchHistorical = useCallback(async () => {
    try {
      const response = await axios.get(HISTORICAL_URL, {
        timeout: 6000,
        headers: { "Cache-Control": "no-cache" },
      });

      const normalized = normalizeHistoricalShape(response.data);
      const hasAny =
        normalized.daily.length > 0 ||
        normalized.weekly.length > 0 ||
        normalized.monthly.length > 0;

      return hasAny ? normalized : null;
    } catch (err) {
      console.warn("Historical fetch failed:", err?.message || err);
      return null;
    }
  }, []);

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

        const [liveResponse, historicalResponse] = await Promise.allSettled([
          axios.get(LIVE_STATS_URL, {
            timeout: 10000,
            signal: abortRef.current.signal,
            headers: { "Cache-Control": "no-cache" },
          }),
          fetchHistorical(),
        ]);

        if (!mountedRef.current) return;

        const now = new Date();
        const previous = stateRef.current;
        let nextState = { ...previous };
        let hadLiveError = false;

        if (liveResponse.status === "fulfilled") {
          nextState = {
            ...previous,
            ...mergeLiveStatsPayload(liveResponse.value.data, previous.historical),
          };
          backoffRef.current = 30000;
        } else {
          hadLiveError = true;
          const status = liveResponse.reason?.response?.status;

          if (status === 429) {
            const retryAfterHeader = liveResponse.reason?.response?.headers?.["retry-after"];
            const retryAfterSeconds = Number(retryAfterHeader);

            backoffRef.current =
              Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                ? retryAfterSeconds * 1000
                : Math.min(backoffRef.current * 2, 120000);
          } else {
            backoffRef.current = Math.min(backoffRef.current + 10000, 120000);
          }
        }

        if (historicalResponse.status === "fulfilled" && historicalResponse.value) {
          nextState.historical = historicalResponse.value;
        }

        setData({
          ...nextState,
          loading: false,
          error: hadLiveError
            ? `Live data unavailable. Retrying in ${Math.ceil(backoffRef.current / 1000)}s...`
            : null,
          lastUpdate: now,
          lastSuccessAt: hadLiveError ? previous.lastSuccessAt : now,
          rateLimitedUntil: hadLiveError ? new Date(Date.now() + backoffRef.current) : null,
        });

        scheduleNext(backoffRef.current);
      } catch (err) {
        if (!mountedRef.current) return;
        if (axios.isCancel(err)) return;

        backoffRef.current = Math.min(backoffRef.current + 10000, 120000);

        setData((prev) => ({
          ...prev,
          loading: false,
          error: `Connection issue. Retrying in ${Math.ceil(backoffRef.current / 1000)}s...`,
          lastUpdate: new Date(),
          rateLimitedUntil: new Date(Date.now() + backoffRef.current),
        }));

        scheduleNext(backoffRef.current);
      }
    };

    timerRef.current = setTimeout(fetchLiveStats, 250);

    const handleVisibility = () => {
      if (!document.hidden) {
        clearPending();
        backoffRef.current = 30000;
        timerRef.current = setTimeout(fetchLiveStats, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      clearPending();
    };
  }, [fetchHistorical]);

  return data;
}

/* =====================================================
   CREATIVE CHART COMPONENTS
===================================================== */

function JourneyTimelineChart() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

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

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Launch", "Week 1", "Week 2", "Week 3", "Week 4", "Month 2", "Month 3"],
        datasets: [
          {
            label: "Projected Journey",
            data: [0, 15, 35, 60, 100, 250, 500],
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
            data: [0, 0, 0, 0, 0, null, null],
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
  }, []);

  return (
    <div className="relative">
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
      <div className="absolute top-2 right-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs border border-amber-500/30">
        🚀 You Are Here
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

function EndpointStatus({ name, path, status = "missing", description }) {
  const statusColors = {
    live: "text-emerald-400",
    missing: "text-amber-400",
    planned: "text-blue-400",
  };

  const statusDots = {
    live: "🟢",
    missing: "🟡",
    planned: "🔵",
  };

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="text-lg">{statusDots[status]}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-black/30 px-2 py-1 rounded font-mono">{path}</code>
          <span className={`text-[10px] ${statusColors[status]}`}>{status.toUpperCase()}</span>
        </div>
        <p className="text-xs text-white/50 mt-1">{description}</p>
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

function BotCard({ name, icon, health, stats, accent = "indigo", readiness = 75 }) {
  const isOnline = hasObjectData(health);

  const accentMap = {
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
  };

  let content = null;

  if (name === "Futures Bot") {
    const dailyRealized = sumNumericObjectValues(stats?.daily_realized);
    content = (
      <div className="text-xs space-y-2">
        <MetricRow label="Pairs" value={formatCompact(stats?.total_symbols || 0)} />
        <MetricRow label="Status" value={stats?.status || "unknown"} />
        <MetricRow label="Readiness" value={`${readiness}%`} valueClassName="text-amber-400" />
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-amber-400" style={{ width: `${readiness}%` }} />
        </div>
      </div>
    );
  } else if (name === "Stock Bot") {
    content = (
      <div className="text-xs space-y-2">
        <MetricRow label="Symbols" value={formatCompact(stats?.symbols || 0)} />
        <MetricRow label="Mode" value={stats?.mode || "paper"} />
        <MetricRow label="Readiness" value={`${readiness}%`} valueClassName="text-amber-400" />
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-amber-400" style={{ width: `${readiness}%` }} />
        </div>
      </div>
    );
  } else if (name === "OKX Spot") {
    const pnl = safeNumber(stats?.total_pnl);
    content = (
      <div className="text-xs space-y-2">
        <MetricRow label="Positions" value={formatCompact(stats?.positions_count || 0)} />
        <MetricRow label="Scan Count" value={formatCompact(stats?.scan_count || 0)} />
        <MetricRow label="Readiness" value={`${readiness}%`} valueClassName="text-amber-400" />
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-amber-400" style={{ width: `${readiness}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-4 ${accentMap[accent] || accentMap.indigo}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      {isOnline ? content : <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>}
    </div>
  );
}

function SniperCard({ health, discoveries, stats }) {
  const isOnline = hasObjectData(health);
  const discoveryCount = safeArray(discoveries).length;
  const networks = safeArray(stats?.active_networks);
  const [pinged, setPinged] = useState(false);
  const prevRef = useRef(discoveryCount);

  useEffect(() => {
    if (discoveryCount > prevRef.current) {
      setPinged(true);
      const t = setTimeout(() => setPinged(false), 1200);
      prevRef.current = discoveryCount;
      return () => clearTimeout(t);
    }
    prevRef.current = discoveryCount;
  }, [discoveryCount]);

  const readiness = Math.min(40 + discoveryCount * 5, 85);

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-300 border-purple-500/30 bg-purple-500/10 ${
        pinged ? "ring-2 ring-purple-400/60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">🦄</span>
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
          <MetricRow label="Discoveries" value={formatCompact(discoveryCount)} valueClassName="text-purple-300 font-semibold" />
          <MetricRow label="Status" value={stats?.status || "idle"} />
          <MetricRow label="Networks" value={networks.length ? networks.join(", ") : "—"} />
          <MetricRow label="Readiness" value={`${readiness}%`} valueClassName="text-amber-400" />
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-amber-400" style={{ width: `${readiness}%` }} />
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>
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
  const pair = discovery?.pair || discovery?.address || discovery?.token || "New token";

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

function HistoricalChart({ data, type, onChangeType }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const chartData = useMemo(() => {
    return safeArray(data?.[type]).map((item, index) => ({
      index,
      date: item?.date || item?.label || `${type}-${index + 1}`,
      pnl: safeNumber(item?.pnl, 0),
      pnlPercent: safeNumber(item?.pnlPercent, 0),
    }));
  }, [data, type]);

  const selectedPoint =
    selectedIndex !== null && chartData[selectedIndex]
      ? chartData[selectedIndex]
      : chartData.length
      ? chartData[chartData.length - 1]
      : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!chartData.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, "rgba(99,102,241,0.35)");
    gradient.addColorStop(0.55, "rgba(99,102,241,0.10)");
    gradient.addColorStop(1, "rgba(99,102,241,0.02)");

    const pointColors = chartData.map((point) =>
      point.pnl >= 0 ? "rgba(45,212,191,1)" : "rgba(248,113,113,1)"
    );

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.map((item) => formatShortDate(item.date)),
        datasets: [
          {
            label: "PnL",
            data: chartData.map((item) => item.pnl),
            borderColor: "rgba(99,102,241,1)",
            backgroundColor: gradient,
            fill: true,
            tension: 0.38,
            borderWidth: 4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointBorderWidth: 0,
            pointHitRadius: 18,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: "easeOutQuart",
        },
        layout: {
          padding: {
            top: 12,
            right: 10,
            bottom: 6,
            left: 6,
          },
        },
        interaction: {
          mode: "nearest",
          intersect: false,
        },
        onClick: (_, elements) => {
          if (elements?.length) {
            setSelectedIndex(elements[0].index);
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            displayColors: false,
            backgroundColor: "rgba(15,23,42,0.96)",
            borderColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            titleColor: "#ffffff",
            bodyColor: "#cbd5e1",
            padding: 12,
            callbacks: {
              title: (items) => {
                const idx = items?.[0]?.dataIndex ?? 0;
                return formatDate(chartData[idx]?.date);
              },
              label: (item) => {
                const point = chartData[item.dataIndex];
                return `${formatCurrencySigned(point?.pnl)} (${formatPercent(point?.pnlPercent)})`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: "rgba(255,255,255,0.42)",
              font: {
                size: 10,
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
          },
          y: {
            grid: {
              color: "rgba(255,255,255,0.08)",
              drawBorder: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: "rgba(255,255,255,0.42)",
              font: {
                size: 10,
              },
              callback: (value) => {
                const num = safeNumber(value);
                return `${num >= 0 ? "+" : "-"}$${Math.abs(num).toFixed(0)}`;
              },
              maxTicksLimit: 5,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onChangeType(period)}
              className={`px-4 py-2 rounded-xl text-sm capitalize transition-all ${
                type === period
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/55 border border-white/10"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <div className="h-[280px] sm:h-[320px] rounded-3xl border border-white/10 bg-black/20 flex items-center justify-center text-white/30 text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <p>Historical data coming soon</p>
            <p className="text-xs text-white/20 mt-2">First trades expected within days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => {
              setSelectedIndex(null);
              onChangeType(period);
            }}
            className={`px-4 py-2 rounded-xl text-sm capitalize transition-all ${
              type === period
                ? "bg-indigo-600 text-white shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                : "bg-white/5 text-white/55 border border-white/10 hover:bg-white/10"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#12182b] to-[#1a1f38] p-3 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="h-[280px] sm:h-[340px]">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {selectedPoint ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="text-sm text-white/45 mb-2">Selected point</div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {formatDate(selectedPoint.date)}
          </div>
          <div
            className={`text-3xl sm:text-4xl font-bold mb-2 ${
              selectedPoint.pnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrencySigned(selectedPoint.pnl)}
          </div>
          <div className="text-sm text-white/60">
            Return: {formatPercent(selectedPoint.pnlPercent)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvestorPanel({ data, totalPnL, totalTradesCount, activeBots, discoveryCount }) {
  const marketCoverage =
    safeNumber(data.futures.stats?.total_symbols) +
    safeNumber(data.stocks.stats?.symbols) +
    safeNumber(data.okx.stats?.symbols_loaded);

  const stackModes = [
    `OKX: ${data.okx.stats?.mode || "dry_run"}`,
    `Stocks: ${data.stocks.stats?.mode || "paper"}`,
    `Futures: ${data.futures.stats?.dry_run ? "dry_run" : "live-ready"}`,
  ];

  // Calculate readiness scores
  const infrastructureReadiness = activeBots * 25; // 4 bots = 100%
  const tradingReadiness = Math.min(totalTradesCount > 0 ? 50 + (totalTradesCount / 10) : 25, 90);
  const discoveryReadiness = Math.min(discoveryCount * 10, 80);
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
            <div className="text-xl font-bold text-white">{infrastructureReadiness}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${infrastructureReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">4/4 bots online</div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Trading Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">{tradingReadiness}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${tradingReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">{totalTradesCount} trades ready</div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-xs text-white/40 mb-1">Discovery Engine</div>
          <div className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">{discoveryReadiness}%</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400" style={{ width: `${discoveryReadiness}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-white/30 mt-1">{discoveryCount} findings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Current Status</div>
          <div className="space-y-2">
            <MetricRow label="Bots Online" value={`${activeBots}/4`} valueClassName={activeBots === 4 ? "text-green-400" : "text-amber-400"} />
            <MetricRow label="Market Coverage" value={formatCompact(marketCoverage)} />
            <MetricRow label="OKX Scans" value={formatCompact(data.okx.stats?.scan_count || 0)} />
            <MetricRow label="Signal Flow" value={`${data.okx.stats?.last_signal_count || 0} / scan`} />
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Next Milestones</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="flex-1">First live trade</span>
              <span className="text-white/40">⏳ Any day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="flex-1">10 trades milestone</span>
              <span className="text-white/40">📅 Week 2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="flex-1">First profitable week</span>
              <span className="text-white/40">📅 Week 3-4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-white/35">Stack modes: {stackModes.join(" • ")}</div>
    </div>
  );
}

/* =====================================================
   MISSING ENDPOINTS LIST
===================================================== */

function MissingEndpoints() {
  const endpoints = [
    {
      name: "Trading History",
      path: "/api/trades",
      status: "missing",
      description: "Real trade data will appear here once our bots start executing",
    },
    {
      name: "P&L History",
      path: "/api/pnl/history",
      status: "missing",
      description: "Profit and loss tracking across all strategies",
    },
    {
      name: "Discovery Feed",
      path: "/api/discoveries",
      status: "planned",
      description: "Real-time DEX token discoveries with AI scores",
    },
    {
      name: "Performance Analytics",
      path: "/api/analytics",
      status: "planned",
      description: "Sharpe ratio, win rate, and advanced metrics",
    },
    {
      name: "User Dashboard",
      path: "/api/user/stats",
      status: "planned",
      description: "Personalized trading statistics",
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-bold text-lg">🔮 Coming Soon</h3>
        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-300">
          In Development
        </span>
      </div>
      <p className="text-xs text-white/50 mb-4">
        We're building these endpoints right now. Follow our progress in real-time.
      </p>
      <div className="space-y-1">
        {endpoints.map((ep, i) => (
          <EndpointStatus key={i} {...ep} />
        ))}
      </div>
      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-white/30">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          <span>First endpoint live in: ~3 days</span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   ROADMAP SECTION
===================================================== */

function RoadmapSection() {
  const milestones = [
    {
      icon: "🚀",
      title: "Launch Day",
      description: "All bots online, infrastructure ready, waiting for first signals",
      eta: "NOW",
      status: "in_progress",
    },
    {
      icon: "📊",
      title: "First 10 Trades",
      description: "Initial trading data appears on dashboard",
      eta: "Week 1-2",
      status: "upcoming",
    },
    {
      icon: "💰",
      title: "First Profitable Week",
      description: "Positive P&L for 7 consecutive days",
      eta: "Week 3-4",
      status: "upcoming",
    },
    {
      icon: "🦄",
      title: "DEX Discovery Live",
      description: "Real-time token scanning with AI scores",
      eta: "Week 4-5",
      status: "upcoming",
    },
    {
      icon: "📈",
      title: "Analytics Suite",
      description: "Sharpe ratio, drawdown, win rate metrics",
      eta: "Month 2",
      status: "upcoming",
    },
    {
      icon: "🎯",
      title: "100 Trades Milestone",
      description: "Statistical significance achieved",
      eta: "Month 2-3",
      status: "upcoming",
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="font-bold text-lg">🗺️ Public Roadmap</h3>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
          Live Updates
        </span>
      </div>
      <p className="text-xs text-white/50 mb-4">
        We're building in public. Every milestone is tracked here in real-time.
      </p>
      <div className="space-y-3">
        {milestones.map((m, i) => (
          <MilestoneCard key={i} {...m} />
        ))}
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
    return dedupeTrades(data.recent_trades)
      .sort((a, b) => {
        const tA = new Date(getTradeTimestamp(a) || 0).getTime();
        const tB = new Date(getTradeTimestamp(b) || 0).getTime();
        return tB - tA;
      })
      .slice(0, 50);
  }, [data.recent_trades]);

  const isOpenTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
    return trade?.status === "open" || (pnl === 0 && getTradeSide(trade) && !trade?.closed);
  };

  const isClosedTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
    return pnl !== 0 || trade?.status === "closed" || getTradeSide(trade) === "close";
  };

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(isClosedTrade);
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(isClosedTrade).length },
  ];

  const activeBots = [
    data.futures.health,
    data.stocks.health,
    data.sniper.health,
    data.okx.health,
  ].filter(Boolean).length;

  const totalPnL = useMemo(() => safeNumber(data.okx.stats?.total_pnl, 0), [data.okx.stats?.total_pnl]);

  const totalPnLPercent = useMemo(() => {
    const baseline = 100000;
    return (safeNumber(totalPnL) / baseline) * 100;
  }, [totalPnL]);

  const openPositionsCount =
    safeNumber(data.okx.stats?.positions_count, 0) +
    safeNumber(data.futures.stats?.positions, 0) +
    safeNumber(data.sniper.stats?.active_trades, 0);

  const totalTradesCount = Math.max(
    safeNumber(data.okx.stats?.total_trades, 0),
    allTrades.length
  );

  const winsCount = useMemo(() => allTrades.filter((t) => getTradePnlUsd(t) > 0).length, [allTrades]);
  const lossesCount = useMemo(() => allTrades.filter((t) => getTradePnlUsd(t) < 0).length, [allTrades]);

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
              <span
                className={`text-xs px-3 py-1.5 rounded-full ${
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

            <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
              <div className="flex items-center gap-2">
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
                    : "Building in public"}
                </span>
              </div>
              <div>Last good: {data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}</div>
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
        {data.error ? (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        ) : null}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Building in Public
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
            Watch our multi-bot trading infrastructure come to life. Every trade, every discovery, every milestone — in real-time.
          </p>
        </div>

        {/* Hero Chart - The Journey Timeline */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <span>🗺️</span>
              Our Journey to 500 Trades
            </h2>
            <div className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              Day 1 of Public Launch
            </div>
          </div>
          <JourneyTimelineChart />
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-emerald-400 font-bold">0</div>
              <div className="text-white/40">Trades Today</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-amber-400 font-bold">500</div>
              <div className="text-white/40">Goal</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-purple-400 font-bold">0%</div>
              <div className="text-white/40">Complete</div>
            </div>
          </div>
        </div>

        {/* Readiness Meters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <ReadinessMeter percentage={activeBots * 25} label="Infrastructure Ready" color="emerald" />
            <p className="text-[10px] text-white/30 mt-2">4/4 bots online</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <ReadinessMeter percentage={Math.min(totalTradesCount * 2, 40)} label="Trading Data" color="amber" />
            <p className="text-[10px] text-white/30 mt-2">Waiting for first trade</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <ReadinessMeter percentage={Math.min(data.sniper.discoveries.length * 5, 30)} label="Discovery Engine" color="purple" />
            <p className="text-[10px] text-white/30 mt-2">Scanning for tokens</p>
          </div>
        </div>

        {/* Stats Cards - Reframed */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard 
            title="Infrastructure" 
            value={`${activeBots}/4`} 
            icon="🤖" 
            color="emerald" 
            subtext="bots online" 
            badge="LIVE"
          />
          <StatCard 
            title="Trades" 
            value={totalTradesCount} 
            icon="📊" 
            color={totalTradesCount > 0 ? "purple" : "amber"} 
            subtext={totalTradesCount > 0 ? `${winsCount} wins · ${lossesCount} losses` : "awaiting first trade"} 
          />
          <StatCard 
            title="P&L" 
            value={formatCurrencySigned(totalPnL)} 
            icon="💰" 
            color={totalPnL >= 0 ? "emerald" : "red"} 
            subtext={totalPnL !== 0 ? formatPercent(totalPnLPercent) : "tracking starts soon"} 
          />
          <StatCard 
            title="Positions" 
            value={openPositionsCount} 
            icon="📌" 
            color="cyan" 
            subtext="open across bots" 
          />
          <StatCard 
            title="Discoveries" 
            value={data.sniper.discoveries.length || "🔍"} 
            icon="🦄" 
            color="amber" 
            subtext={data.sniper.discoveries.length ? "new tokens" : "scanning..."} 
          />
        </div>

        {/* Investor Panel - Reframed as "Building in Public" */}
        <div className="mb-6">
          <InvestorPanel
            data={data}
            totalPnL={totalPnL}
            totalTradesCount={totalTradesCount}
            activeBots={activeBots}
            discoveryCount={data.sniper.discoveries.length}
          />
        </div>

        {/* Bot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <BotCard
            name="Futures Bot"
            icon="📊"
            health={data.futures.health}
            stats={data.futures.stats}
            accent="indigo"
            readiness={85}
          />
          <BotCard
            name="Stock Bot"
            icon="📈"
            health={data.stocks.health}
            stats={data.stocks.stats}
            accent="emerald"
            readiness={90}
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
            readiness={75}
          />
        </div>

        {/* Three Column Layout - Trades, Roadmap, Coming Soon */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Trade Feed */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 h-full">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                </h2>
                <div className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                  {allTrades.length} total
                </div>
              </div>

              <div className="flex gap-1 bg-black/30 rounded-lg p-1 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id ? "bg-emerald-600 text-white" : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 ? (
                      <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, i) => (
                    <TradeRow key={`${getTradeTimestamp(trade)}-${trade?.symbol}-${i}`} trade={trade} />
                  ))
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-sm">Waiting for first trade</p>
                    <p className="text-xs text-white/20 mt-2">Bots are scanning markets now</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div className="lg:col-span-1">
            <RoadmapSection />
          </div>

          {/* Coming Soon Endpoints */}
          <div className="lg:col-span-1">
            <MissingEndpoints />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Building in public • Real-time infrastructure • Every milestone visible
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-400 hover:underline">Pricing</Link>
            {" • "}
            <span className="text-amber-400">Next milestone: First trade</span>
          </p>
        </div>
      </main>
    </div>
  );
}
