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

/*
  Important:
  - Poll less aggressively on public endpoints.
  - Do NOT append Date.now() to every request.
  - Let CDN / browser caching help you instead of causing 429s.
*/
const LIVE_INTERVAL = 60_000;
const HISTORICAL_INTERVAL = 15 * 60_000;
const MAX_BACKOFF = 5 * 60_000;

/* =====================================================
   DEFAULTS
===================================================== */

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
   AXIOS
===================================================== */

const http = axios.create({
  timeout: 12000,
  withCredentials: false,
});

/* =====================================================
   HELPERS
===================================================== */

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArr(value) {
  return Array.isArray(value) ? value : [];
}

function safeObj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function hasKeys(value) {
  return !!safeObj(value) && Object.keys(value).length > 0;
}

function fmtCurrency(value, digits = 2) {
  return "$" + safeNum(value).toFixed(digits);
}

function fmtSigned(value, digits = 2) {
  const n = safeNum(value);
  return (n >= 0 ? "+" : "-") + "$" + Math.abs(n).toFixed(digits);
}

function fmtPct(value, digits = 2) {
  const n = safeNum(value);
  return (n >= 0 ? "+" : "") + n.toFixed(digits) + "%";
}

function fmtCompact(value) {
  return safeNum(value).toLocaleString();
}

function fmtClock(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "—";
  }
}

function fmtDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return "—";
  }
}

function timeAgo(ts) {
  if (!ts) return "—";
  try {
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (seconds < 0) return "just now";
    if (seconds < 30) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  } catch {
    return "—";
  }
}

function tradeTs(t) {
  return t?.created_at || t?.timestamp || t?.time || t?.received_at || null;
}
function tradeQty(t) {
  return t?.qty ?? t?.quantity ?? 0;
}
function tradePnl(t) {
  return t?.pnl_usd ?? t?.pnl ?? 0;
}
function tradePnlPct(t) {
  return t?.pnl_percentage ?? t?.pnl_pct ?? t?.return_percent ?? 0;
}
function tradeSide(t) {
  return String(t?.side || t?.action || "").toLowerCase();
}
function tradeBot(t) {
  return t?.bot || t?.source || t?.exchange || t?.chain || "Unknown";
}
function tradePrice(t) {
  return t?.price ?? t?.entry_price ?? t?.exit_price ?? 0;
}

function dedupe(trades) {
  const seen = new Set();
  const out = [];

  for (const t of safeArr(trades)) {
    const key = [
      t?.id || "",
      t?.symbol || "",
      tradeSide(t),
      tradeTs(t) || "",
      tradePrice(t),
      tradeQty(t),
      tradeBot(t),
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }

  return out;
}

function normalizeHistorical(raw) {
  if (!safeObj(raw)) return DEFAULT_HISTORICAL;
  return {
    daily: safeArr(raw.daily),
    weekly: safeArr(raw.weekly),
    monthly: safeArr(raw.monthly),
  };
}

function hasHistoricalData(hist) {
  return (
    safeArr(hist?.daily).length > 0 ||
    safeArr(hist?.weekly).length > 0 ||
    safeArr(hist?.monthly).length > 0
  );
}

/* =====================================================
   NORMALIZER
===================================================== */

function normalizePayload(raw = {}, previous = DEFAULT_STATE) {
  const futuresRaw = safeObj(raw?.futures);
  const stocksRaw = safeObj(raw?.stocks);
  const sniperRaw = safeObj(raw?.sniper);
  const okxRaw = safeObj(raw?.okx);

  const historicalRaw = normalizeHistorical(raw?.historical);
  const historical = hasHistoricalData(historicalRaw)
    ? historicalRaw
    : previous.historical || DEFAULT_HISTORICAL;

  const recentTrades = dedupe(
    safeArr(raw?.recent_trades).length > 0
      ? raw.recent_trades
      : previous.recent_trades
  );

  const discoveries =
    safeArr(sniperRaw?.discoveries).length > 0
      ? sniperRaw.discoveries
      : safeArr(raw?.discoveries).length > 0
      ? raw.discoveries
      : previous.sniper?.discoveries || [];

  return {
    futures: {
      health: futuresRaw || previous.futures.health,
      stats: {
        total_symbols: safeNum(
          futuresRaw?.total_symbols,
          previous.futures.stats.total_symbols
        ),
        status: futuresRaw?.status || previous.futures.stats.status || "unknown",
        daily_realized:
          safeObj(futuresRaw?.daily_realized) ||
          previous.futures.stats.daily_realized ||
          {},
        cex_enabled:
          typeof futuresRaw?.cex_enabled === "boolean"
            ? futuresRaw.cex_enabled
            : previous.futures.stats.cex_enabled,
        dry_run:
          typeof futuresRaw?.dry_run === "boolean"
            ? futuresRaw.dry_run
            : previous.futures.stats.dry_run,
        db_connected:
          typeof futuresRaw?.db_connected === "boolean"
            ? futuresRaw.db_connected
            : previous.futures.stats.db_connected,
        positions: safeNum(futuresRaw?.positions, previous.futures.stats.positions),
      },
    },

    stocks: {
      health: stocksRaw || previous.stocks.health,
      stats: {
        symbols: safeNum(stocksRaw?.symbols, previous.stocks.stats.symbols),
        mode: stocksRaw?.mode || previous.stocks.stats.mode || "paper",
        running:
          typeof stocksRaw?.running === "boolean"
            ? stocksRaw.running
            : previous.stocks.stats.running,
        lastRefresh: stocksRaw?.lastRefresh || previous.stocks.stats.lastRefresh || null,
      },
    },

    sniper: {
      health: sniperRaw || previous.sniper.health,
      discoveries,
      stats: {
        status: sniperRaw?.status || previous.sniper.stats.status || "idle",
        active_trades: safeNum(
          sniperRaw?.active_trades,
          previous.sniper.stats.active_trades
        ),
        bot_state: sniperRaw?.bot_state || previous.sniper.stats.bot_state || "idle",
        last_heartbeat:
          sniperRaw?.last_heartbeat ||
          sniperRaw?.timestamp ||
          previous.sniper.stats.last_heartbeat ||
          null,
        active_networks:
          safeArr(sniperRaw?.active_networks).length > 0
            ? sniperRaw.active_networks
            : previous.sniper.stats.active_networks || [],
      },
    },

    okx: {
      health: okxRaw || previous.okx.health,
      stats: {
        positions_count: safeNum(
          okxRaw?.positions ?? okxRaw?.positions_count,
          previous.okx.stats.positions_count
        ),
        total_trades: safeNum(okxRaw?.total_trades, previous.okx.stats.total_trades),
        total_pnl: safeNum(okxRaw?.total_pnl, previous.okx.stats.total_pnl),
        mode: okxRaw?.mode || previous.okx.stats.mode || "dry_run",
        scan_count: safeNum(okxRaw?.scan_count, previous.okx.stats.scan_count),
        last_scan_time:
          okxRaw?.last_scan_time || previous.okx.stats.last_scan_time || null,
        last_candidate_count: safeNum(
          okxRaw?.last_candidate_count,
          previous.okx.stats.last_candidate_count
        ),
        last_signal_count: safeNum(
          okxRaw?.last_signal_count,
          previous.okx.stats.last_signal_count
        ),
        symbols_loaded: safeNum(
          okxRaw?.symbols_loaded,
          previous.okx.stats.symbols_loaded
        ),
        max_positions: safeNum(okxRaw?.max_positions, previous.okx.stats.max_positions),
        min_ai_score: safeNum(okxRaw?.min_ai_score, previous.okx.stats.min_ai_score),
      },
    },

    recent_trades: recentTrades,
    historical,
  };
}

/* =====================================================
   DATA HOOK
===================================================== */

function useLiveData() {
  const [state, setState] = useState(DEFAULT_STATE);

  const mountedRef = useRef(false);
  const liveTimerRef = useRef(null);
  const histTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const controllerRef = useRef(null);
  const lastGoodStateRef = useRef(DEFAULT_STATE);

  const clearLiveTimer = () => {
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  };

  const clearHistTimer = () => {
    if (histTimerRef.current) {
      clearInterval(histTimerRef.current);
      histTimerRef.current = null;
    }
  };

  const cancelCurrentRequest = () => {
    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch (_) {}
      controllerRef.current = null;
    }
  };

  const getRetryDelay = useCallback((retries, retryAfterHeader) => {
    if (retryAfterHeader) {
      const retrySeconds = parseInt(retryAfterHeader, 10);
      if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
        return Math.min(retrySeconds * 1000, MAX_BACKOFF);
      }
    }

    const delay = LIVE_INTERVAL * Math.pow(2, Math.min(retries, 3));
    return Math.min(delay, MAX_BACKOFF);
  }, []);

  const fetchHistorical = useCallback(async () => {
    try {
      const res = await http.get(HISTORICAL_URL);
      if (!mountedRef.current) return;

      const hist = normalizeHistorical(res.data);
      if (!hasHistoricalData(hist)) return;

      setState((prev) => {
        const next = { ...prev, historical: hist };
        lastGoodStateRef.current = next;
        return next;
      });
    } catch (_) {
      // historical is optional
    }
  }, []);

  const fetchLive = useCallback(async () => {
    if (!mountedRef.current) return;

    if (typeof document !== "undefined" && document.hidden) {
      clearLiveTimer();
      liveTimerRef.current = setTimeout(fetchLive, LIVE_INTERVAL);
      return;
    }

    cancelCurrentRequest();
    controllerRef.current = new AbortController();

    try {
      const res = await http.get(LIVE_STATS_URL, {
        signal: controllerRef.current.signal,
      });

      if (!mountedRef.current) return;

      retryCountRef.current = 0;

      setState((prev) => {
        const normalized = normalizePayload(res.data, prev);
        const next = {
          ...prev,
          ...normalized,
          loading: false,
          error: null,
          lastUpdate: new Date(),
          lastSuccessAt: new Date(),
          rateLimitedUntil: null,
        };
        lastGoodStateRef.current = next;
        return next;
      });

      clearLiveTimer();
      liveTimerRef.current = setTimeout(fetchLive, LIVE_INTERVAL);
    } catch (err) {
      if (!mountedRef.current) return;
      if (axios.isCancel(err)) return;

      const status = err?.response?.status;
      const retryAfter = err?.response?.headers?.["retry-after"];

      retryCountRef.current += 1;
      const delay = getRetryDelay(retryCountRef.current, retryAfter);

      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          status === 429
            ? `Rate limited — retrying in ${Math.ceil(delay / 1000)}s`
            : `Connection issue — retrying in ${Math.ceil(delay / 1000)}s`,
        rateLimitedUntil: new Date(Date.now() + delay),
      }));

      clearLiveTimer();
      liveTimerRef.current = setTimeout(fetchLive, delay);
    }
  }, [fetchHistorical, getRetryDelay]);

  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        const [liveRes, histRes] = await Promise.allSettled([
          http.get(LIVE_STATS_URL),
          http.get(HISTORICAL_URL),
        ]);

        if (!mountedRef.current) return;

        setState((prev) => {
          let next = { ...prev, loading: false };

          if (liveRes.status === "fulfilled") {
            next = {
              ...next,
              ...normalizePayload(liveRes.value.data, next),
              lastUpdate: new Date(),
              lastSuccessAt: new Date(),
              error: null,
              rateLimitedUntil: null,
            };
          }

          if (histRes.status === "fulfilled") {
            const hist = normalizeHistorical(histRes.value.data);
            if (hasHistoricalData(hist)) {
              next.historical = hist;
            }
          }

          if (!next.lastSuccessAt && !hasHistoricalData(next.historical)) {
            next.error = "Waiting for data source";
          }

          lastGoodStateRef.current = next;
          return next;
        });
      } catch (_) {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Unable to load dashboard data",
        }));
      }

      clearLiveTimer();
      liveTimerRef.current = setTimeout(fetchLive, LIVE_INTERVAL);
      clearHistTimer();
      histTimerRef.current = setInterval(fetchHistorical, HISTORICAL_INTERVAL);
    };

    bootstrap();

    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        clearLiveTimer();
        liveTimerRef.current = setTimeout(fetchLive, 1500);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      mountedRef.current = false;
      clearLiveTimer();
      clearHistTimer();
      cancelCurrentRequest();

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [fetchHistorical, fetchLive]);

  return state;
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function Heartbeat({ active = true }) {
  const [beat, setBeat] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setBeat(true);
      setTimeout(() => setBeat(false), 300);
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  if (!active) {
    return (
      <svg viewBox="0 0 100 40" className="w-24 h-8 opacity-20" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="0,20 100,20"
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
      xmlns="http://www.w3.org/2000/svg"
      className={`w-24 h-8 transition-all duration-150 ${
        beat ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" : ""
      }`}
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
  const colors = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/[0.08] transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider">{title}</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 ${colors[color] || colors.emerald}`}>
            {value}
          </p>
          {subtext ? <p className="text-[10px] sm:text-xs text-white/30 mt-1">{subtext}</p> : null}
        </div>
        <div className="text-2xl sm:text-3xl opacity-50 group-hover:opacity-80 transition-opacity shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BotCard({ name, icon, health, stats, accent = "indigo" }) {
  const isOnline = hasKeys(health);

  const borders = {
    indigo: "border-indigo-500/20 bg-indigo-500/10 hover:border-indigo-500/40",
    emerald: "border-emerald-500/20 bg-emerald-500/10 hover:border-emerald-500/40",
    amber: "border-amber-500/20 bg-amber-500/10 hover:border-amber-500/40",
    cyan: "border-cyan-500/20 bg-cyan-500/10 hover:border-cyan-500/40",
  };

  const rows = useMemo(() => {
    if (name === "Futures Bot") {
      return [
        ["Pairs", stats?.total_symbols ?? 0],
        ["Status", stats?.status || "—"],
        ["Positions", stats?.positions ?? 0],
        ["DB", stats?.db_connected ? "✓ connected" : "✗ off"],
      ];
    }

    if (name === "Stock Bot") {
      return [
        ["Symbols", stats?.symbols ?? 0],
        ["Mode", stats?.mode || "paper"],
        ["Running", stats?.running ? "Yes" : "No"],
        ["Refresh", stats?.lastRefresh ? timeAgo(stats.lastRefresh) : "—"],
      ];
    }

    if (name === "OKX Spot") {
      return [
        ["Positions", stats?.positions_count ?? 0],
        ["Trades", stats?.total_trades ?? 0],
        ["P&L", fmtSigned(stats?.total_pnl ?? 0)],
        ["Mode", stats?.mode || "dry_run"],
        ["Candidates", stats?.last_candidate_count ?? 0],
      ];
    }

    return [];
  }, [name, stats]);

  return (
    <div className={`border rounded-xl p-3 sm:p-4 transition-all ${borders[accent] || borders.indigo}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          }`}
        >
          {isOnline ? "● LIVE" : "○ OFFLINE"}
        </span>
      </div>

      {isOnline ? (
        <div className="space-y-1.5">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between items-center text-xs">
              <span className="text-white/45">{label}</span>
              <span className="text-white font-medium">{val}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/30 py-2 text-center">Waiting for connection…</p>
      )}
    </div>
  );
}

function SniperCard({ health, discoveries, stats }) {
  const isOnline = hasKeys(health);
  const discCount = safeArr(discoveries).length;
  const prevRef = useRef(discCount);
  const [pinged, setPinged] = useState(false);

  useEffect(() => {
    if (discCount > prevRef.current) {
      setPinged(true);
      const t = setTimeout(() => setPinged(false), 1200);
      prevRef.current = discCount;
      return () => clearTimeout(t);
    }
    prevRef.current = discCount;
  }, [discCount]);

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 transition-all duration-300 border-purple-500/30 bg-purple-500/10 hover:border-purple-500/50 ${
        pinged ? "ring-2 ring-purple-400/60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">🦄</span>
          <span className="font-semibold text-sm sm:text-base truncate">Sniper Bot</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          }`}
        >
          {isOnline ? "● LIVE" : "○ OFFLINE"}
        </span>
      </div>

      <div className="flex items-center justify-center mb-3">
        <Heartbeat active={isOnline} />
      </div>

      {isOnline ? (
        <div className="space-y-1.5">
          {[
            ["Discoveries", discCount],
            ["Status", stats?.status || "idle"],
            ["Active Trades", stats?.active_trades ?? 0],
            ["Networks", `${stats?.active_networks?.length ?? 0} active`],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center text-xs">
              <span className="text-white/45">{label}</span>
              <span
                className={`font-medium ${
                  label === "Discoveries" && discCount > 0 ? "text-purple-300 text-base" : "text-white"
                }`}
              >
                {val}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/30 py-2 text-center">Waiting for connection…</p>
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
  const side = tradeSide(trade);
  const pnl = safeNum(tradePnl(trade), 0);
  const pnlPct = safeNum(tradePnlPct(trade), 0);
  const qty = safeNum(tradeQty(trade), 0);
  const price = safeNum(tradePrice(trade), 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = tradeBot(trade);
  const ts = tradeTs(trade);

  const isBuy = side === "buy" || side === "long";
  const isSell = side === "sell" || side === "short";
  const isClose = side === "close" || side === "exit";
  const isOpen = !isClose && trade?.status === "open" && pnl === 0;

  let border = "border-l-gray-500";
  let bg = "bg-white/[0.03]";
  let badge = "bg-gray-500/20 text-gray-300";
  let label = side ? side.toUpperCase() : "UNKNOWN";

  if (isOpen) {
    border = "border-l-blue-500";
    bg = "bg-blue-500/5";
    badge = "bg-blue-500/20 text-blue-300";
    label = "OPEN";
  } else if (isClose) {
    border = "border-l-purple-500";
    bg = "bg-purple-500/5";
    badge = "bg-purple-500/20 text-purple-300";
    label = "CLOSED";
  } else if (isBuy) {
    border = "border-l-green-500";
    bg = "bg-green-500/5";
    badge = "bg-green-500/20 text-green-300";
    label = "BUY";
  } else if (isSell) {
    border = "border-l-red-500";
    bg = "bg-red-500/5";
    badge = "bg-red-500/20 text-red-300";
    label = "SELL";
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${border} ${bg}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">📊</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge}`}>{label}</span>
            <span className="text-[10px] text-white/35">{bot}</span>
          </div>
          <div className="text-[10px] text-white/35">
            {timeAgo(ts)} · {fmtCurrency(price)} · {qty > 0 ? `${qty.toFixed(4)} units` : "—"}
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        {isOpen ? (
          <span className="font-bold text-sm text-blue-400">Open</span>
        ) : pnl !== 0 ? (
          <>
            <div className={`font-bold text-sm ${pnl > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtSigned(pnl)}
            </div>
            <div className={`text-[10px] ${pnlPct > 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
              {fmtPct(pnlPct)}
            </div>
          </>
        ) : (
          <span className="font-bold text-sm text-white">{fmtCurrency(price)}</span>
        )}
      </div>
    </div>
  );
}

function DiscoveryCard({ discovery }) {
  const score = safeNum(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address || discovery?.token || "New token";

  const scoreColor =
    score >= 0.7 ? "text-green-400" : score >= 0.5 ? "text-yellow-400" : "text-orange-400";

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-colors">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="flex items-center gap-1 font-medium min-w-0">
          <span className="shrink-0">🦄</span>
          <span className="capitalize truncate">{chain}</span>
        </span>
        <span className="text-white/40 shrink-0">{age} blocks</span>
      </div>
      <div className="text-white/60 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <span className="text-white/40">
          AI Score
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </span>
        {score >= 0.7 ? (
          <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Ready</span>
        ) : null}
      </div>
    </div>
  );
}

function HistoricalChart({ data, type, onChangeType }) {
  const PERIODS = ["daily", "weekly", "monthly"];
  const rows = safeArr(data?.[type]);

  const getVal = (d) => safeNum(d?.pnl || d?.value || d?.pnl_usd, 0);
  const getDate = (d) => d?.date || d?.timestamp || d?.day || "";

  const maxAbs = useMemo(() => {
    let m = 1;
    for (const d of rows) {
      const v = Math.abs(getVal(d));
      if (v > m) m = v;
    }
    return m;
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChangeType(p)}
            className={`px-3 py-1 rounded-lg capitalize transition-all ${
              type === p ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-white/30 text-sm">
          No historical data yet
        </div>
      ) : (
        <div className="h-32 flex items-end gap-1">
          {rows.slice(-12).map((d, i) => {
            const val = getVal(d);
            const pct = (Math.abs(val) / maxAbs) * 100;
            const pos = val >= 0;
            const date = getDate(d);

            return (
              <div key={date || i} className="flex-1 flex flex-col items-center group relative">
                <div
                  className={`w-full rounded-t transition-all group-hover:opacity-70 ${
                    pos ? "bg-emerald-500/50" : "bg-red-500/50"
                  }`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                >
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-medium">{date ? fmtDate(date) : "—"}</div>
                    <div className={pos ? "text-emerald-400" : "text-red-400"}>{fmtSigned(val)}</div>
                  </div>
                </div>
                <span className="text-[8px] text-white/25 mt-1 truncate w-full text-center">
                  {date ? fmtDate(date).slice(0, 5) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InvestorPanel({ data, totalPnL, totalTrades, activeBots, discCount }) {
  const wins = useMemo(
    () => safeArr(data.recent_trades).filter((t) => tradePnl(t) > 0).length,
    [data.recent_trades]
  );

  const total = safeArr(data.recent_trades).length;
  const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

  const coverage =
    safeNum(data.futures.stats?.total_symbols) +
    safeNum(data.stocks.stats?.symbols) +
    safeNum(data.okx.stats?.symbols_loaded);

  const bots = [
    { label: "Futures Bot", online: hasKeys(data.futures.health) },
    { label: "Stock Bot", online: hasKeys(data.stocks.health) },
    { label: "Sniper Bot", online: hasKeys(data.sniper.health) },
    { label: "OKX Spot", online: hasKeys(data.okx.health) },
  ];

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Investment Dashboard
          </h2>
          <p className="text-xs text-white/40 mt-1">Real-time performance · Institutional-grade monitoring</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-white/40">Composite P&amp;L</div>
            <div className={`text-lg font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtSigned(totalPnL)}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div className="text-right">
            <div className="text-[10px] text-white/40">Win Rate</div>
            <div className="text-lg font-bold text-emerald-400">{wr}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          ["Active Strategies", `${activeBots}/4`, "Systems online"],
          ["Total Trades", fmtCompact(totalTrades), "Lifetime trades"],
          ["Market Coverage", fmtCompact(coverage), "Symbols tracked"],
          ["Discovery Engine", fmtCompact(discCount), "Opportunities"],
        ].map(([title, val, sub]) => (
          <div key={title} className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[10px] text-white/40 mb-1">{title}</div>
            <div className="text-xl font-bold">{val}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
        <div className="lg:col-span-2 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/40 text-xs mb-3">Investment Thesis</div>
          <p className="text-white/75 text-sm leading-relaxed">
            IMALI operates diversified multi-bot infrastructure across centralized exchanges,
            equities, futures, and DEX discovery — providing institutional-grade market coverage
            and transparent risk distribution.
          </p>
          <div className="flex flex-wrap gap-4 text-xs mt-3 text-white/60">
            <span><span className="text-emerald-400">●</span> Live Proof-of-Execution</span>
            <span><span className="text-indigo-400">●</span> Transparent Performance</span>
            <span><span className="text-purple-400">●</span> Real-time Risk Monitoring</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-white/40 text-xs mb-3">Operational Status</div>
          <div className="space-y-2">
            {bots.map(({ label, online }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-white/50">{label}</span>
                <span className={online ? "text-emerald-400" : "text-white/30"}>
                  {online ? "Operational" : "Standby"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();

  const [activeTab, setActiveTab] = useState("all");
  const [historicalType, setHistoricalType] = useState("daily");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasConnection = !!(
    hasKeys(data.futures.health) ||
    hasKeys(data.stocks.health) ||
    hasKeys(data.sniper.health) ||
    hasKeys(data.okx.health)
  );

  const hasAnyUsefulData =
    hasConnection ||
    hasHistoricalData(data.historical) ||
    safeArr(data.recent_trades).length > 0;

  const isStale = data.lastSuccessAt
    ? (Date.now() - new Date(data.lastSuccessAt).getTime()) / 1000 > 180
    : false;

  const allTrades = useMemo(
    () =>
      dedupe(data.recent_trades)
        .sort(
          (a, b) =>
            new Date(tradeTs(b) || 0).getTime() - new Date(tradeTs(a) || 0).getTime()
        )
        .slice(0, 50),
    [data.recent_trades]
  );

  const isOpenFn = (t) =>
    t?.status === "open" || (tradePnl(t) === 0 && !t?.closed);
  const isClosedFn = (t) =>
    tradePnl(t) !== 0 || t?.status === "closed" || tradeSide(t) === "close";

  const filtered = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenFn);
    if (activeTab === "closed") return allTrades.filter(isClosedFn);
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", icon: "🌐", label: "All", count: allTrades.length },
    { id: "open", icon: "🟢", label: "Open", count: allTrades.filter(isOpenFn).length },
    { id: "closed", icon: "✅", label: "Closed", count: allTrades.filter(isClosedFn).length },
  ];

  const activeBots = [
    data.futures.health,
    data.stocks.health,
    data.sniper.health,
    data.okx.health,
  ].filter(hasKeys).length;

  const totalPnL = safeNum(data.okx.stats?.total_pnl, 0);
  const totalTrades = Math.max(safeNum(data.okx.stats?.total_trades), allTrades.length);
  const discCount = safeArr(data.sniper.discoveries).length;

  const openPos =
    safeNum(data.okx.stats?.positions_count) +
    safeNum(data.futures.stats?.positions) +
    safeNum(data.sniper.stats?.active_trades);

  const wins = useMemo(() => allTrades.filter((t) => tradePnl(t) > 0).length, [allTrades]);
  const losses = useMemo(() => allTrades.filter((t) => tradePnl(t) < 0).length, [allTrades]);

  const [badgeClass, badgeText] = hasConnection
    ? isStale
      ? ["bg-amber-500/20 text-amber-300", "STALE"]
      : ["bg-emerald-500/20 text-emerald-300", "LIVE"]
    : hasHistoricalData(data.historical)
    ? ["bg-blue-500/20 text-blue-300", "HISTORICAL"]
    : ["bg-yellow-500/20 text-yellow-300", "CONNECTING"];

  if (data.loading && !hasAnyUsefulData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white/60">Initialising trading dashboard…</p>
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
              <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>{badgeText}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs text-white/40">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasConnection
                      ? isStale
                        ? "bg-amber-400"
                        : "bg-green-400 animate-pulse"
                      : "bg-yellow-400"
                  }`}
                />
                {data.rateLimitedUntil
                  ? `Rate limited until ${fmtClock(data.rateLimitedUntil)}`
                  : hasConnection
                  ? "Real-time"
                  : "Connecting…"}
              </div>

              <span>{data.lastSuccessAt ? `Last: ${fmtClock(data.lastSuccessAt)}` : "No data yet"}</span>
              <span>{clock.toLocaleTimeString()}</span>

              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white transition-all"
              >
                Access Premium →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {data.error ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
            <p className="text-[10px] text-white/30 mt-1">Showing last available data where possible</p>
          </div>
        ) : null}

        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent mb-3">
            Institutional Trading Infrastructure
          </h1>
          <p className="text-white/55 max-w-2xl mx-auto text-sm sm:text-base">
            Live multi-bot execution · Transparent performance · Real-time discovery
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext={`${activeBots}/4 online`} />
          <StatCard title="Total Trades" value={fmtCompact(totalTrades)} icon="📊" color="purple" subtext={`${wins} wins · ${losses} losses`} />
          <StatCard
            title="Total P&L"
            value={fmtSigned(totalPnL)}
            icon="💰"
            color={totalPnL >= 0 ? "emerald" : "red"}
            subtext={totalPnL >= 0 ? "Net profit" : "Net loss"}
          />
          <StatCard title="Open Positions" value={fmtCompact(openPos)} icon="📌" color="cyan" subtext="Current exposure" />
          <StatCard title="Discoveries" value={fmtCompact(discCount)} icon="🦄" color="amber" subtext="DEX opportunities" />
        </div>

        <InvestorPanel
          data={data}
          totalPnL={totalPnL}
          totalTrades={totalTrades}
          activeBots={activeBots}
          discCount={discCount}
        />

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span>📈</span> Historical Performance
            </h2>
            <span className="text-xs text-white/30">
              {data.historical.daily.length > 0 ? `${data.historical.daily.length} data points` : "No data yet"}
            </span>
          </div>

          <HistoricalChart
            data={data.historical}
            type={historicalType}
            onChangeType={setHistoricalType}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BotCard name="Futures Bot" icon="📊" health={data.futures.health} stats={data.futures.stats} accent="indigo" />
          <BotCard name="Stock Bot" icon="📈" health={data.stocks.health} stats={data.stocks.stats} accent="emerald" />
          <SniperCard health={data.sniper.health} discoveries={data.sniper.discoveries} stats={data.sniper.stats} />
          <BotCard name="OKX Spot" icon="🔷" health={data.okx.health} stats={data.okx.stats} accent="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Execution Feed
                <span className="text-xs text-white/30">{allTrades.length} trades</span>
              </h2>

              <div className="flex gap-1 bg-black/30 rounded-lg p-1">
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
              {filtered.length > 0 ? (
                filtered.map((t, i) => (
                  <TradeRow
                    key={`${tradeTs(t) || ""}-${t?.symbol || ""}-${i}`}
                    trade={t}
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

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span> DEX Discovery Engine
                {discCount > 0 ? (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {discCount} new
                  </span>
                ) : null}
              </h2>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {discCount > 0 ? (
                  safeArr(data.sniper.discoveries)
                    .slice(0, 10)
                    .map((d, i) => <DiscoveryCard key={d?.pair || d?.address || i} discovery={d} />)
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <div className="text-2xl mb-2">🔍</div>
                    Scanning for new opportunities…
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>📡</span> System Status
              </h2>
              <div className="space-y-2.5 text-sm">
                {[
                  ["API", hasConnection ? "● Connected" : "○ Limited", hasConnection ? "text-emerald-400" : "text-yellow-400"],
                  ["Last Update", data.lastSuccessAt ? timeAgo(data.lastSuccessAt) : "—", ""],
                  ["Open Positions", openPos, ""],
                  [
                    "Win / Loss",
                    losses > 0 ? (wins / losses).toFixed(2) : wins > 0 ? "∞" : "0.00",
                    wins >= losses ? "text-emerald-400" : "text-red-400",
                  ],
                  ["OKX Mode", data.okx.stats?.mode || "dry_run", "capitalize"],
                ].map(([lbl, val, cls]) => (
                  <div key={lbl} className="flex justify-between items-center">
                    <span className="text-white/50">{lbl}</span>
                    <span className={`font-medium ${cls}`}>{val}</span>
                  </div>
                ))}

                {data.rateLimitedUntil ? (
                  <div className="flex justify-between items-center text-amber-400 text-xs">
                    <span className="text-white/50">Rate Limited</span>
                    <span>{`Until ${fmtClock(data.rateLimitedUntil)}`}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5">
              <h3 className="font-bold text-lg mb-2">Institutional Access</h3>
              <p className="text-sm text-white/55 mb-4">
                Full API · Real-time signals · Priority support
              </p>
              <div className="space-y-1.5 text-sm text-white/65 mb-4">
                {["WebSocket feeds", "Historical exports", "White-label options"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm text-center transition-all"
              >
                Schedule Demo →
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-white/25 border-t border-white/10 pt-6 pb-2">
          Institutional trading infrastructure · Real-time monitoring · Transparent execution
          <br />
          <Link to="/" className="text-indigo-400 hover:underline mx-2">Home</Link>
          <Link to="/dashboard" className="text-indigo-400 hover:underline mx-2">Member Dashboard</Link>
          <Link to="/pricing" className="text-indigo-400 hover:underline mx-2">Pricing</Link>
        </div>
      </main>
    </div>
  );
}