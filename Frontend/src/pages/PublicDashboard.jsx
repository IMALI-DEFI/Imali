// src/pages/PublicDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const DEFAULT_HISTORICAL = { daily: [], weekly: [], monthly: [] };

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
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
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

function getTradeTimestamp(trade) {
  return trade?.created_at || trade?.timestamp || trade?.time || trade?.received_at || null;
}

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? 0;
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

/* =====================================================
   PAYLOAD NORMALIZATION
===================================================== */

function mergeLiveStatsPayload(payload = {}, existingHistorical = DEFAULT_HISTORICAL) {
  const futures = hasObjectData(payload?.futures) ? payload.futures : {};
  const stocks = hasObjectData(payload?.stocks) ? payload.stocks : {};
  const sniper = hasObjectData(payload?.sniper) ? payload.sniper : {};
  const okx = hasObjectData(payload?.okx) ? payload.okx : {};

  const recentTrades = safeArray(payload?.recent_trades);
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
        total_symbols: safeNumber(futures?.total_symbols, 199),
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
        positions_count: typeof okx?.positions === "number" ? okx.positions : safeNumber(okx?.positions_count, 0),
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
    recent_trades: dedupeTrades(recentTrades),
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
          rateLimitedUntil: hadLiveError
            ? new Date(Date.now() + backoffRef.current)
            : null,
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/10 transition-all">
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
  const isOnline = hasObjectData(health);

  const accentMap = {
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
  };

  let lines = [];

  if (name === "Futures Bot") {
    lines = [
      ["Pairs", stats?.total_symbols || 0],
      ["Status", stats?.status || "unknown"],
      ["DB", stats?.db_connected ? "connected" : "disconnected"],
    ];
  } else if (name === "Stock Bot") {
    lines = [
      ["Symbols", stats?.symbols || 0],
      ["Mode", stats?.mode || "paper"],
      ["Refresh", stats?.lastRefresh ? timeAgo(stats.lastRefresh) : "—"],
    ];
  } else if (name === "OKX Spot") {
    lines = [
      ["Positions", stats?.positions_count || 0],
      ["Trades", stats?.total_trades || 0],
      ["Mode", stats?.mode || "dry_run"],
      ["Candidates", stats?.last_candidate_count || 0],
    ];
  }

  return (
    <div className={`border rounded-xl p-3 sm:p-4 ${accentMap[accent] || accentMap.indigo}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>

      {isOnline ? (
        <div className="text-xs space-y-2">
          {lines.map(([label, value], idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-white/50">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-2 text-center">Waiting for connection...</div>
      )}
    </div>
  );
}

function SniperCard({ health, discoveries, stats }) {
  const isOnline = hasObjectData(health);
  const discoveryCount = safeArray(discoveries).length;
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
            <span className="text-purple-300 font-semibold">{discoveryCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Status</span>
            <span className="text-white">{stats?.status || "idle"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">State</span>
            <span className="text-white">{stats?.bot_state || "idle"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/50">Heartbeat</span>
            <span className="text-white truncate">{stats?.last_heartbeat ? timeAgo(stats.last_heartbeat) : "—"}</span>
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
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
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
  const chartData = safeArray(data?.[type]);
  const maxValue = Math.max(...chartData.map((d) => Math.abs(safeNumber(d?.pnl))), 1);

  if (!chartData.length) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 text-xs">
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onChangeType(period)}
              className={`px-3 py-1 rounded-lg capitalize transition-all ${
                type === period ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
        <div className="h-32 flex items-center justify-center text-white/30 text-sm">
          No historical data yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onChangeType(period)}
            className={`px-3 py-1 rounded-lg capitalize transition-all ${
              type === period ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      <div className="h-32 flex items-end gap-1">
        {chartData.slice(-10).map((d, i) => {
          const pnl = safeNumber(d?.pnl);
          const pnlPercent = safeNumber(d?.pnlPercent);
          const height = (Math.abs(pnl) / maxValue) * 100;
          const positive = pnl >= 0;

          return (
            <div key={`${d?.date || i}`} className="flex-1 flex flex-col items-center group relative">
              <div
                className={`w-full rounded-t relative group-hover:opacity-80 transition-all ${
                  positive ? "bg-emerald-500/50" : "bg-red-500/50"
                }`}
                style={{ height: `${Math.max(height, 5)}%` }}
              >
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/10">
                  <div className="font-medium">{formatDate(d?.date)}</div>
                  <div className={positive ? "text-emerald-400" : "text-red-400"}>
                    {formatCurrencySigned(pnl)} ({formatPercent(pnlPercent)})
                  </div>
                </div>
              </div>
              <span className="text-[8px] text-white/30 mt-1">{formatDate(d?.date).slice(0, 5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvestorPanel({ data, totalPnL, totalTradesCount, activeBots, discoveryCount }) {
  const marketCoverage =
    safeNumber(data.futures.stats?.total_symbols) +
    safeNumber(data.stocks.stats?.symbols) +
    safeNumber(data.okx.stats?.symbols_loaded);

  const stackMode = [
    data.okx.stats?.mode || "dry_run",
    data.stocks.stats?.mode || "paper",
    data.futures.stats?.dry_run ? "dry_run" : "live-ready",
  ];

  const headline = totalPnL >= 0 ? "Revenue-oriented bot infrastructure" : "Multi-bot live monitoring stack";

  return (
    <div className="bg-gradient-to-br from-indigo-600/15 to-emerald-600/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-bold text-lg">Investor Snapshot</h2>
          <p className="text-xs text-white/50 mt-1">{headline}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
          Public-facing metrics
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40">Bot Coverage</div>
          <div className="text-white font-semibold mt-1">{activeBots}/4 active</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40">Tracked Trades</div>
          <div className="text-white font-semibold mt-1">{formatCompact(totalTradesCount)}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40">Aggregate P&amp;L</div>
          <div className={`font-semibold mt-1 ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrencySigned(totalPnL)}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40">Discovery Engine</div>
          <div className="text-white font-semibold mt-1">{discoveryCount} findings</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Operational profile</div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Tracked universe</span><span>{formatCompact(marketCoverage)}</span></div>
            <div className="flex justify-between"><span>OKX scan count</span><span>{formatCompact(data.okx.stats?.scan_count || 0)}</span></div>
            <div className="flex justify-between"><span>Candidate flow</span><span>{data.okx.stats?.last_candidate_count || 0} / scan</span></div>
            <div className="flex justify-between"><span>Signal flow</span><span>{data.okx.stats?.last_signal_count || 0} / scan</span></div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-white/40 mb-2">Commercial positioning</div>
          <div className="space-y-2 text-white/70">
            <div>• public live dashboard for trust and conversion</div>
            <div>• multi-bot architecture across CEX, stocks, futures, and DEX discovery</div>
            <div>• investor-ready visibility into uptime, scanning cadence, and signal production</div>
            <div>• clear path to premium tiers, managed signals, and execution subscriptions</div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-white/35">
        Stack modes: {stackMode.join(" • ")}
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

  const totalPnL = useMemo(() => {
    return safeNumber(data.okx.stats?.total_pnl, 0);
  }, [data.okx.stats?.total_pnl]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Live Trading Dashboard
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch IMALI’s multi-bot stack scan markets, surface opportunities, and show live operational proof.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext={`${activeBots}/4 online`} />
          <StatCard title="Total Trades" value={formatCompact(totalTradesCount)} icon="📊" color="purple" subtext={`${winsCount} wins · ${lossesCount} losses`} />
          <StatCard title="Total P&L" value={formatCurrencySigned(totalPnL)} icon="💰" color={totalPnL >= 0 ? "emerald" : "red"} subtext={formatPercent(totalPnLPercent)} />
          <StatCard title="Open Positions" value={formatCompact(openPositionsCount)} icon="📌" color="cyan" subtext="Across all systems" />
          <StatCard title="Discoveries" value={formatCompact(data.sniper.discoveries.length)} icon="🦄" color="amber" subtext="DEX opportunities found" />
        </div>

        <div className="mb-6">
          <InvestorPanel
            data={data}
            totalPnL={totalPnL}
            totalTradesCount={totalTradesCount}
            activeBots={activeBots}
            discoveryCount={data.sniper.discoveries.length}
          />
        </div>

        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>📈</span>
            Historical Performance
          </h2>
          <HistoricalChart
            data={data.historical}
            type={historicalType}
            onChangeType={setHistoricalType}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                  <span className="text-xs text-white/30 ml-2">{allTrades.length} rows</span>
                </h2>

                <div className="flex gap-1 bg-black/30 rounded-lg p-1 flex-wrap">
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
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 ? (
                        <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, i) => (
                    <TradeRow key={`${getTradeTimestamp(trade)}-${trade?.symbol}-${i}`} trade={trade} />
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
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span>
                DEX Discoveries
                {data.sniper.discoveries.length > 0 ? (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {data.sniper.discoveries.length} new
                  </span>
                ) : null}
              </h2>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {data.sniper.discoveries.length > 0 ? (
                  data.sniper.discoveries
                    .slice(0, 10)
                    .map((d, i) => <DiscoveryCard key={d?.pair || d?.address || i} discovery={d} />)
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <div className="text-2xl mb-2">🔍</div>
                    Scanning for new tokens...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>📡</span>
                System Status
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
                <div className="flex justify-between gap-3">
                  <span>OKX mode</span>
                  <span>{data.okx.stats?.mode || "dry_run"}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5">
              <h3 className="font-bold text-lg mb-2">For investors and partners</h3>
              <p className="text-xs text-white/60 mb-4">
                IMALI combines public live proof, multi-bot operations, and a clear subscription path for retail and premium users.
              </p>
              <div className="space-y-2 text-xs text-white/70 mb-4">
                <div>• live dashboard credibility</div>
                <div>• modular bot architecture</div>
                <div>• CEX + stocks + futures + DEX discovery</div>
                <div>• monetizable signal and managed-access tiers</div>
              </div>
              <Link
                to="/signup"
                className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all text-center"
              >
                Start Trading Free →
              </Link>
              <p className="text-[10px] text-white/30 mt-3">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Adaptive polling with preserved historical state and rate-limit backoff.
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-400 hover:underline">Pricing</Link>
          </p>
        </div>
      </main>
    </div>
  );
}