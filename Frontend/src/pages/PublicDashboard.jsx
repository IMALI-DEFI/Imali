// src/pages/PublicDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
 "http://129.213.90.84:8001";

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;
const CONTROL_URL = `${API_BASE}/api/public/control`;

const DEFAULT_STATE = {
  futures: { health: null, positions: [], trades: [], stats: null },
  stocks:  { health: null, positions: [], trades: [], stats: null },
  sniper:  { health: null, discoveries: [], stats: null, positions: [] },
  okx:     { health: null, positions: [], trades: [], stats: null },
  recent_trades:   [],
  recent_activity: [],
  historical:      { daily: [], weekly: [], monthly: [] },
  loading:          true,
  error:            null,
  lastUpdate:       null,
  lastSuccessAt:    null,
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
    const hr  = Math.floor(min / 60);
    const day = Math.floor(hr  / 24);
    if (sec < 30)  return "just now";
    if (sec < 60)  return `${sec}s ago`;
    if (min < 60)  return `${min}m ago`;
    if (hr  < 24)  return `${hr}h ago`;
    return `${day}d ago`;
  } catch {
    return "—";
  }
}

function formatClock(timestamp) {
  if (!timestamp) return "—";
  try { return new Date(timestamp).toLocaleTimeString(); }
  catch { return "—"; }
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  try { return new Date(timestamp).toLocaleDateString(); }
  catch { return "—"; }
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

function mergeLiveStatsPayload(payload = {}) {
  const futures = payload?.futures || {};
  const stocks = payload?.stocks || {};
  const sniper = payload?.sniper || {};
  const okx = payload?.okx || {};
  
  return {
    futures: {
      health:    futures?.health || null,
      positions: normalizeArray(futures?.positions),
      trades:    normalizeArray(futures?.trades),
      stats:     futures?.stats || null,
    },
    stocks: {
      health:    stocks?.health || null,
      positions: normalizeArray(stocks?.positions),
      trades:    normalizeArray(stocks?.trades),
      stats:     stocks?.stats || null,
    },
    sniper: {
      health:      sniper?.health || null,
      discoveries: normalizeArray(sniper?.discoveries || payload?.discoveries),
      stats:       sniper?.stats || null,
      positions:   normalizeArray(sniper?.positions || []),
    },
    okx: {
      health:    okx?.health || null,
      positions: normalizeArray(okx?.positions),
      trades:    normalizeArray(okx?.trades),
      stats:     okx?.stats || null,
    },
    recent_trades:   normalizeArray(payload?.recent_trades),
    recent_activity: normalizeArray(payload?.recent_activity),
    historical:      payload?.historical || { daily: [], weekly: [], monthly: [] },
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
        <polyline points="0,20 30,20 35,20 40,20 45,20 50,20 100,20" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 40" className={`w-24 h-8 transition-all duration-150 ${beat ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" : ""}`} xmlns="http://www.w3.org/2000/svg">
      <polyline points="0,20 28,20 33,5 38,34 43,20 55,20 60,14 65,26 70,20 100,20" fill="none" stroke={beat ? "#34d399" : "#10b981"} strokeWidth={beat ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-150" />
      <circle cx={beat ? "43" : "70"} cy={beat ? "20" : "20"} r="3" fill={beat ? "#34d399" : "#10b981"} className="transition-all duration-300" />
    </svg>
  );
}

/* =====================================================
   UI PIECES
===================================================== */

function StatCard({ title, value, icon, subtext, color = "emerald" }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo:  "text-indigo-400",
    purple:  "text-purple-400",
    amber:   "text-amber-400",
    red:     "text-red-400",
    cyan:    "text-cyan-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
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

function BotCard({ name, icon, health, positions = [], trades = [], onControl, accent = "indigo" }) {
  const isOnline = !!health;
  const [showControls, setShowControls] = useState(false);

  const borderMap = {
    indigo:  "border-indigo-500/20  bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    purple:  "border-purple-500/20  bg-purple-500/10",
    amber:   "border-amber-500/20   bg-amber-500/10",
    cyan:    "border-cyan-500/20    bg-cyan-500/10",
  };

  return (
    <div className={`border rounded-xl p-3 sm:p-4 ${borderMap[accent] ?? borderMap.indigo} relative`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
            {isOnline ? "● Online" : "○ Offline"}
          </span>
          <button onClick={() => setShowControls(!showControls)} className="text-xs text-white/40 hover:text-white/60">
            ⚙️
          </button>
        </div>
      </div>

      {showControls && onControl && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-10 p-2">
          <button onClick={() => onControl('restart')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">🔄 Restart</button>
          <button onClick={() => onControl('stop')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">⏹️ Stop</button>
          <button onClick={() => onControl('start')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">▶️ Start</button>
          <button onClick={() => onControl('dry-run')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">🧪 Toggle Dry Run</button>
        </div>
      )}

      {isOnline ? (
        <div className="text-xs space-y-1 text-white/65">
          <div className="flex justify-between">
            <span>Positions</span>
            <span className="text-white">{positions.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Trades</span>
            <span className="text-white">{trades.length}</span>
          </div>
          {health?.mode && (
            <div className="flex justify-between">
              <span>Mode</span>
              <span className={health.mode === 'live' ? 'text-green-400' : 'text-yellow-400'}>{health.mode}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-1">Waiting for connection...</div>
      )}
    </div>
  );
}

function SniperCard({ health, discoveries, positions, onControl }) {
  const isOnline   = !!health;
  const discCount  = normalizeArray(discoveries).length;
  const posCount   = normalizeArray(positions).length;
  const chains     = health?.chains ? (Array.isArray(health.chains) ? health.chains.join(", ") : health.chains) : "—";
  const isDryRun   = health?.dry_run;
  const [showControls, setShowControls] = useState(false);

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
  }, [discCount]);

  return (
    <div className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 border-purple-500/30 bg-purple-500/10 ${pinged ? "ring-2 ring-purple-400/60" : ""} relative`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🦄</span>
          <span className="font-semibold text-sm sm:text-base truncate">Sniper Bot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs shrink-0 ${isOnline ? "text-green-400" : "text-red-400"}`}>
            {isOnline ? "● Online" : "○ Offline"}
          </span>
          <button onClick={() => setShowControls(!showControls)} className="text-xs text-white/40 hover:text-white/60">
            ⚙️
          </button>
        </div>
      </div>

      {showControls && onControl && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-10 p-2">
          <button onClick={() => onControl('restart')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">🔄 Restart</button>
          <button onClick={() => onControl('stop')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">⏹️ Stop</button>
          <button onClick={() => onControl('start')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">▶️ Start</button>
          <button onClick={() => onControl('dry-run')} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 rounded-lg">🧪 Toggle Dry Run</button>
        </div>
      )}

      <div className="flex items-center justify-center mb-3">
        <Heartbeat active={isOnline} />
      </div>

      {isOnline ? (
        <div className="text-xs space-y-1 text-white/65">
          <div className="flex justify-between">
            <span>Discoveries</span>
            <span className={discCount > 0 ? "text-purple-300 font-semibold" : "text-white/40"}>{discCount}</span>
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

      {pinged && (
        <div className="mt-2 text-center text-[10px] text-purple-300 bg-purple-500/20 rounded-full py-0.5 animate-pulse">
          ✨ New discovery detected
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade }) {
  const side       = getTradeSide(trade);
  const pnlUsd     = safeNumber(getTradePnlUsd(trade), 0);
  const pnlPercent = safeNumber(getTradePnlPercent(trade), 0);
  const qty        = safeNumber(getTradeQty(trade), 0);
  const price      = safeNumber(getTradePrice(trade), 0);
  const symbol     = trade?.symbol || "Unknown";
  const bot        = getTradeBot(trade);
  const ts         = getTradeTimestamp(trade);

  const isBuy   = side === "buy"  || side === "long";
  const isSell  = side === "sell" || side === "short";
  const isClose = side === "close" || side === "exit";
  const isOpen  = !isClose && trade?.status === "open" && pnlUsd === 0;

  let borderColor = "border-l-gray-500";
  let bgColor     = "bg-white/[0.03]";
  let badgeColor  = "bg-gray-500/20 text-gray-300";
  let badgeText   = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor     = "bg-blue-500/5";
    badgeColor  = "bg-blue-500/20 text-blue-300";
    badgeText   = "OPEN";
  } else if (isClose) {
    borderColor = "border-l-purple-500";
    bgColor     = "bg-purple-500/5";
    badgeColor  = "bg-purple-500/20 text-purple-300";
    badgeText   = "CLOSED";
  } else if (isBuy) {
    borderColor = "border-l-green-500";
    bgColor     = "bg-green-500/5";
    badgeColor  = "bg-green-500/20 text-green-300";
    badgeText   = "BUY";
  } else if (isSell) {
    borderColor = "border-l-red-500";
    bgColor     = "bg-red-500/5";
    badgeColor  = "bg-red-500/20 text-red-300";
    badgeText   = "SELL";
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

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age   = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair  = discovery?.pair || discovery?.address || discovery?.token || "New token";

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
        {score >= 0.7 ? <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Ready</span> : null}
      </div>
    </div>
  );
}

function HistoricalChart({ data, type = "daily" }) {
  const chartData = data[type] || [];
  const maxValue = Math.max(...chartData.map(d => Math.abs(d.pnl || 0)), 1);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        {['daily', 'weekly', 'monthly'].map(period => (
          <button key={period} className={`px-2 py-1 rounded ${type === period ? 'bg-indigo-600' : 'bg-white/5'}`}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>
      <div className="h-32 flex items-end gap-1">
        {chartData.slice(-10).map((d, i) => {
          const height = (Math.abs(d.pnl || 0) / maxValue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="w-full bg-white/5 rounded-t relative group-hover:bg-white/10 transition-all" style={{ height: `${Math.max(height, 5)}%` }}>
                <div className={`absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10`}>
                  {formatCurrency(d.pnl)} ({formatPercent(d.pnlPercent)})
                </div>
              </div>
              <span className="text-[8px] text-white/30 mt-1">{formatDate(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================
   DATA HOOK
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef    = useRef(null);
  const abortRef    = useRef(null);
  const mountedRef  = useRef(true);
  const backoffRef  = useRef(30000);
  const lastGoodRef = useRef(DEFAULT_STATE);

  const fetchHistorical = async () => {
    try {
      const response = await axios.get(HISTORICAL_URL, { timeout: 5000 });
      return response.data;
    } catch (err) {
      console.warn("Failed to fetch historical data:", err);
      return { daily: [], weekly: [], monthly: [] };
    }
  };

  const sendControl = async (bot, action) => {
    try {
      await axios.post(CONTROL_URL, { bot, action }, { timeout: 5000 });
      // Refresh data after control action
      setTimeout(fetchLiveStats, 1000);
    } catch (err) {
      console.error("Control action failed:", err);
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

        const [liveResponse, historicalData] = await Promise.all([
          axios.get(LIVE_STATS_URL, { timeout: 10000, signal: abortRef.current.signal, headers: { "Cache-Control": "no-cache" } }),
          fetchHistorical()
        ]);

        if (!mountedRef.current) return;

        const normalized = mergeLiveStatsPayload(liveResponse.data);
        const now = new Date();

        backoffRef.current = 30000;

        const nextState = {
          ...lastGoodRef.current,
          ...normalized,
          historical: historicalData,
          loading: false,
          error: null,
          lastUpdate: now,
          lastSuccessAt: now,
          rateLimitedUntil: null,
        };

        lastGoodRef.current = nextState;
        setData(nextState);
        scheduleNext(backoffRef.current);
      } catch (err) {
        if (!mountedRef.current) return;
        if (axios.isCancel(err)) return;

        const status = err?.response?.status;
        const retryAfterHeader = err?.response?.headers?.["retry-after"];
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;

        if (status === 429) {
          const nextDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : Math.min(backoffRef.current * 2, 120000);

          backoffRef.current = nextDelay;

          setData((prev) => ({
            ...lastGoodRef.current,
            loading: false,
            error: `Rate limited. Retrying in ${Math.ceil(nextDelay / 1000)}s...`,
            rateLimitedUntil: new Date(Date.now() + nextDelay),
            lastUpdate: prev.lastUpdate || lastGoodRef.current.lastUpdate,
          }));

          scheduleNext(nextDelay);
          return;
        }

        setData((prev) => ({
          ...lastGoodRef.current,
          loading: false,
          error: "Live data unavailable",
          lastUpdate: prev.lastUpdate || lastGoodRef.current.lastUpdate,
        }));

        backoffRef.current = Math.min(backoffRef.current + 10000, 120000);
        scheduleNext(backoffRef.current);
      }
    };

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
  }, []);

  return { data, sendControl };
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const { data, sendControl } = useLiveData();
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
    const merged = [
      ...normalizeArray(data.recent_trades),
      ...normalizeArray(data.futures.trades),
      ...normalizeArray(data.stocks.trades),
      ...normalizeArray(data.okx.trades),
    ];

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
  }, [data]);

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
    return bot.includes("okx") || bot.includes("stock") || bot.includes("futures") || bot.includes("spot");
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
    data.futures.trades.forEach(t => { const pnl = getTradePnlUsd(t); if (pnl !== 0) total += pnl; });
    data.stocks.trades.forEach(t => { const pnl = getTradePnlUsd(t); if (pnl !== 0) total += pnl; });
    data.okx.trades.forEach(t => { const pnl = getTradePnlUsd(t); if (pnl !== 0) total += pnl; });
    data.recent_trades.forEach(t => { const pnl = getTradePnlUsd(t); if (pnl !== 0 && !t?.id?.includes('dry_')) total += pnl; });
    return total;
  }, [data]);

  const totalPnLPercent = useMemo(() => {
    const totalInvested = 100000; // Starting capital - you can make this dynamic
    return (totalPnL / totalInvested) * 100;
  }, [totalPnL]);

  const openPositionsCount = 
    normalizeArray(data.futures.positions).length +
    normalizeArray(data.stocks.positions).length +
    normalizeArray(data.okx.positions).length +
    normalizeArray(data.sniper.positions).length;

  const totalTradesCount = allTrades.length;

  const winsCount = useMemo(() => allTrades.filter(t => getTradePnlUsd(t) > 0).length, [allTrades]);
  const lossesCount = useMemo(() => allTrades.filter(t => getTradePnlUsd(t) < 0).length, [allTrades]);

  const handleBotControl = (bot, action) => {
    sendControl(bot, action);
  };

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
              <span className={`text-xs px-2 py-1 rounded-full ${
                hasConnection ? (isStale ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300") : "bg-yellow-500/20 text-yellow-300"
              }`}>
                {hasConnection ? (isStale ? "STALE" : "LIVE") : "CONNECTING"}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className={`w-2 h-2 rounded-full ${
                  hasConnection ? (isStale ? "bg-amber-400" : "bg-green-400 animate-pulse") : "bg-yellow-400"
                }`} />
                <span>{data.rateLimitedUntil ? `Backoff until ${formatClock(data.rateLimitedUntil)}` : "Adaptive refresh"}</span>
              </div>
              <div className="text-xs text-white/40">Last good: {data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}</div>
              <div className="text-xs text-white/40">{clock.toLocaleTimeString()}</div>
              <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs sm:text-sm font-semibold transition-all">
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Live Trading Dashboard 🚀</h1>
          <p className="text-white/60 max-w-2xl mx-auto">Watch our trading stack scan, discover, and execute in real time.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext="Online" />
          <StatCard title="Total Trades" value={totalTradesCount} icon="📊" color="purple" subtext={`${winsCount} wins · ${lossesCount} losses`} />
          <StatCard title="Total P&L" value={`${totalPnL >= 0 ? "+" : ""}${formatCurrency(Math.abs(totalPnL))}`} icon="💰" color={totalPnL >= 0 ? "emerald" : "red"} subtext={formatPercent(totalPnLPercent)} />
          <StatCard title="Open Positions" value={openPositionsCount} icon="📌" color="cyan" subtext="Across all bots" />
          <StatCard title="Discoveries" value={normalizeArray(data.sniper.discoveries).length} icon="🦄" color="amber" subtext="New tokens found" />
        </div>

        {/* Historical Performance */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">📈 Historical Performance</h2>
          <HistoricalChart data={data.historical} type={historicalType} />
        </div>

        {/* Bot Cards with Controls */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <BotCard
            name="Futures Bot"
            icon="📊"
            health={data.futures.health}
            positions={data.futures.positions}
            trades={data.futures.trades}
            onControl={(action) => handleBotControl('futures', action)}
            accent="indigo"
          />
          <BotCard
            name="Stock Bot"
            icon="📈"
            health={data.stocks.health}
            positions={data.stocks.positions}
            trades={data.stocks.trades}
            onControl={(action) => handleBotControl('stocks', action)}
            accent="emerald"
          />
          <SniperCard
            health={data.sniper.health}
            discoveries={data.sniper.discoveries}
            positions={data.sniper.positions}
            onControl={(action) => handleBotControl('sniper', action)}
          />
          <BotCard
            name="OKX Spot"
            icon="🔷"
            health={data.okx.health}
            positions={data.okx.positions}
            trades={data.okx.trades}
            onControl={(action) => handleBotControl('okx', action)}
            accent="amber"
          />
        </div>

        {/* Trade Feed + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                </h2>
                <div className="flex gap-1 bg-black/30 rounded-lg p-1 flex-wrap">
                  {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${activeTab === tab.id ? "bg-emerald-600 text-white" : "text-white/40 hover:text-white/60"}`}>
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 ? <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span> : null}
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
                {normalizeArray(data.sniper.discoveries).length > 0 ? (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {normalizeArray(data.sniper.discoveries).length} new
                  </span>
                ) : null}
              </h2>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {normalizeArray(data.sniper.discoveries).length > 0 ? (
                  normalizeArray(data.sniper.discoveries).slice(0, 10).map((d, i) => (
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

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>📡</span>
                System Snapshot
              </h2>
              <div className="space-y-2 text-xs text-white/65">
                <div className="flex justify-between gap-3"><span>API</span><span className="text-white/40 truncate">{API_BASE}</span></div>
                <div className="flex justify-between gap-3"><span>Connection</span><span className={hasConnection ? "text-green-400" : "text-yellow-400"}>{hasConnection ? (isStale ? "Stale" : "Live") : "Connecting"}</span></div>
                <div className="flex justify-between gap-3"><span>Last good update</span><span>{data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}</span></div>
                <div className="flex justify-between gap-3"><span>Open positions</span><span>{openPositionsCount}</span></div>
                <div className="flex justify-between gap-3"><span>Total trades</span><span>{totalTradesCount}</span></div>
                <div className="flex justify-between gap-3"><span>Win/Loss</span><span className={winsCount >= lossesCount ? "text-green-400" : "text-red-400"}>{winsCount}/{lossesCount}</span></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
              <Link to="/signup" className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all">
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
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
