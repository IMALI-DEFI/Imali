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

const DEFAULT_STATE = {
  futures: {
    health: null,
    positions: [],
    trades: [],
    stats: null,
  },
  stocks: {
    health: null,
    positions: [],
    trades: [],
    stats: null,
  },
  sniper: {
    health: null,
    discoveries: [],
    stats: null,
  },
  okx: {
    health: null,
    positions: [],
    trades: [],
    stats: null,
  },
  dex: {
    health: null,
    positions: [],
    trades: [],
    stats: null,
  },
  recent_trades: [],
  recent_activity: [],
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

function formatPct(value, digits = 2) {
  return `${safeNumber(value).toFixed(digits)}%`;
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
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

function getTradeTimestamp(trade) {
  return trade?.created_at || trade?.timestamp || trade?.time || null;
}

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? 0;
}

function getTradePnlUsd(trade) {
  return trade?.pnl_usd ?? trade?.pnl ?? 0;
}

function getTradeSide(trade) {
  return String(trade?.side || trade?.action || "").toLowerCase();
}

function getTradeBot(trade) {
  return trade?.bot || trade?.source || trade?.exchange || "Unknown";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mergeLiveStatsPayload(payload = {}) {
  return {
    futures: {
      health: payload?.futures || null,
      positions: normalizeArray(payload?.futures?.positions),
      trades: normalizeArray(payload?.futures?.trades),
      stats: payload?.futures?.stats || null,
    },
    stocks: {
      health: payload?.stocks || null,
      positions: normalizeArray(payload?.stocks?.positions),
      trades: normalizeArray(payload?.stocks?.trades),
      stats: payload?.stocks?.stats || null,
    },
    sniper: {
      health: payload?.sniper || null,
      discoveries: normalizeArray(payload?.discoveries || payload?.sniper?.discoveries),
      stats: payload?.sniper?.stats || null,
    },
    okx: {
      health: payload?.okx || null,
      positions: normalizeArray(payload?.okx?.positions),
      trades: normalizeArray(payload?.okx?.trades),
      stats: payload?.okx?.stats || null,
    },
    dex: {
      health: payload?.dex || null,
      positions: normalizeArray(payload?.dex?.positions),
      trades: normalizeArray(payload?.dex?.trades),
      stats: payload?.dex?.stats || null,
    },
    recent_trades: normalizeArray(payload?.recent_trades),
    recent_activity: normalizeArray(payload?.recent_activity),
  };
}

/* =====================================================
   UI PIECES
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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-white/50">{title}</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtext ? (
            <p className="text-[10px] sm:text-xs text-white/30 mt-1">{subtext}</p>
          ) : null}
        </div>
        <div className="text-2xl sm:text-3xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function BotCard({ name, icon, health, lines = [], accent = "indigo" }) {
  const isOnline = !!health;
  const statusColor = isOnline ? "text-green-400" : "text-red-400";
  const statusText = isOnline ? "● Online" : "○ Offline";

  const borderMap = {
    indigo: "border-indigo-500/20 bg-indigo-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    cyan: "border-cyan-500/20 bg-cyan-500/10",
  };

  return (
    <div className={`border rounded-xl p-3 sm:p-4 ${borderMap[accent] || borderMap.indigo}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl sm:text-2xl shrink-0">{icon}</span>
          <span className="font-semibold text-sm sm:text-base truncate">{name}</span>
        </div>
        <span className={`text-xs shrink-0 ${statusColor}`}>{statusText}</span>
      </div>

      {isOnline ? (
        <div className="text-xs space-y-1 text-white/65">
          {lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/30 py-1">Waiting for connection...</div>
      )}
    </div>
  );
}

function TradeRow({ trade }) {
  const side = getTradeSide(trade);
  const pnlUsd = safeNumber(getTradePnlUsd(trade), 0);
  const qty = safeNumber(getTradeQty(trade), 0);
  const price = safeNumber(trade?.price, 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = getTradeBot(trade);
  const ts = getTradeTimestamp(trade);

  const isBuy = side === "buy" || side === "long";
  const isSell = side === "sell" || side === "short";
  const isClose = side === "close";
  const isOpen = !isClose && !trade?.closed && trade?.status !== "closed" && trade?.pnl_usd == null && trade?.pnl == null;

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
        ) : trade?.pnl_usd != null || trade?.pnl != null ? (
          <div className={`font-bold text-sm ${pnlUsd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pnlUsd >= 0 ? "+" : ""}
            {pnlUsd.toFixed(2)} USD
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

/* =====================================================
   HOOK
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const backoffRef = useRef(30000);
  const lastGoodRef = useRef(DEFAULT_STATE);

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

        const response = await axios.get(LIVE_STATS_URL, {
          timeout: 10000,
          signal: abortRef.current.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!mountedRef.current) return;

        const normalized = mergeLiveStatsPayload(response.data);
        const now = new Date();

        backoffRef.current = 30000;

        const nextState = {
          ...lastGoodRef.current,
          ...normalized,
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

          const until = new Date(Date.now() + nextDelay);

          setData((prev) => ({
            ...lastGoodRef.current,
            loading: false,
            error: `Rate limited. Retrying in ${Math.ceil(nextDelay / 1000)}s...`,
            rateLimitedUntil: until,
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

  return data;
}

/* =====================================================
   MAIN
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hasConnection = !!(
    data.futures.health ||
    data.stocks.health ||
    data.sniper.health ||
    data.okx.health ||
    data.dex.health
  );

  const allTrades = useMemo(() => {
    const merged = [
      ...normalizeArray(data.recent_trades),
      ...normalizeArray(data.futures.trades),
      ...normalizeArray(data.stocks.trades),
      ...normalizeArray(data.okx.trades),
      ...normalizeArray(data.dex.trades),
    ];

    const unique = [];
    const seen = new Set();

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
        const timeA = new Date(getTradeTimestamp(a) || 0).getTime();
        const timeB = new Date(getTradeTimestamp(b) || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 50);
  }, [data]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "all") return allTrades;

    if (activeTab === "open") {
      return allTrades.filter(
        (t) => !t?.pnl && t?.pnl_usd == null && t?.status !== "closed" && getTradeSide(t) !== "close"
      );
    }

    if (activeTab === "closed") {
      return allTrades.filter(
        (t) => t?.pnl || t?.pnl_usd != null || t?.status === "closed" || getTradeSide(t) === "close"
      );
    }

    if (activeTab === "dex") {
      return allTrades.filter((t) => String(getTradeBot(t)).toLowerCase().includes("dex"));
    }

    if (activeTab === "cex") {
      return allTrades.filter((t) => {
        const bot = String(getTradeBot(t)).toLowerCase();
        return bot.includes("okx") || bot.includes("stock") || bot.includes("futures");
      });
    }

    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    {
      id: "open",
      label: "Open",
      icon: "🟢",
      count: allTrades.filter(
        (t) => !t?.pnl && t?.pnl_usd == null && t?.status !== "closed" && getTradeSide(t) !== "close"
      ).length,
    },
    {
      id: "closed",
      label: "Closed",
      icon: "✅",
      count: allTrades.filter(
        (t) => t?.pnl || t?.pnl_usd != null || t?.status === "closed" || getTradeSide(t) === "close"
      ).length,
    },
    {
      id: "dex",
      label: "DEX",
      icon: "🦄",
      count: allTrades.filter((t) => String(getTradeBot(t)).toLowerCase().includes("dex")).length,
    },
    {
      id: "cex",
      label: "CEX",
      icon: "🏦",
      count: allTrades.filter((t) => {
        const bot = String(getTradeBot(t)).toLowerCase();
        return bot.includes("okx") || bot.includes("stock") || bot.includes("futures");
      }).length,
    },
  ];

  const activeBots = [
    data.futures.health,
    data.stocks.health,
    data.sniper.health,
    data.okx.health,
    data.dex.health,
  ].filter(Boolean).length;

  const totalPnL = allTrades.reduce((sum, trade) => sum + safeNumber(getTradePnlUsd(trade), 0), 0);

  const openPositionsCount =
    normalizeArray(data.futures.positions).length +
    normalizeArray(data.stocks.positions).length +
    normalizeArray(data.okx.positions).length +
    normalizeArray(data.dex.positions).length;

  const staleSeconds = data.lastSuccessAt
    ? Math.floor((Date.now() - new Date(data.lastSuccessAt).getTime()) / 1000)
    : null;

  const isStale = staleSeconds != null && staleSeconds > 90;

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
                Last good update: {data.lastSuccessAt ? formatClock(data.lastSuccessAt) : "—"}
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Live Trading Dashboard 🚀</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch our trading stack scan, discover, and execute in real time.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext="Online" />
          <StatCard title="Recent Trades" value={allTrades.length} icon="📊" color="purple" subtext="Visible feed" />
          <StatCard
            title="Total P&L"
            value={`${totalPnL >= 0 ? "+" : "-"}$${Math.abs(totalPnL).toFixed(2)}`}
            icon="💰"
            color={totalPnL >= 0 ? "emerald" : "red"}
            subtext={totalPnL >= 0 ? "Profit" : "Loss"}
          />
          <StatCard title="Open Positions" value={openPositionsCount} icon="📌" color="cyan" subtext="All bots" />
          <StatCard
            title="Discoveries"
            value={normalizeArray(data.sniper.discoveries).length}
            icon="🦄"
            color="amber"
            subtext="New tokens"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <BotCard
            name="Futures Bot"
            icon="📊"
            health={data.futures.health}
            accent="indigo"
            lines={[
              `Pairs: ${data.futures.health?.total_symbols || 0}`,
              `Positions: ${normalizeArray(data.futures.positions).length}`,
              `Trades: ${normalizeArray(data.futures.trades).length || normalizeArray(data.recent_trades).length}`,
            ]}
          />

          <BotCard
            name="Stock Bot"
            icon="📈"
            health={data.stocks.health}
            accent="emerald"
            lines={[
              `Symbols: ${data.stocks.health?.symbols || data.stocks.health?.total || 0}`,
              `Mode: ${data.stocks.health?.mode || "paper"}`,
              `Positions: ${normalizeArray(data.stocks.positions).length}`,
            ]}
          />

          <BotCard
            name="Sniper Bot"
            icon="🦄"
            health={data.sniper.health}
            accent="purple"
            lines={[
              `Discoveries: ${normalizeArray(data.sniper.discoveries).length}`,
              `Dry Run: ${data.sniper.health?.dry_run ? "Yes" : "No"}`,
              `Chains: ${Array.isArray(data.sniper.health?.chains) ? data.sniper.health.chains.join(", ") : "—"}`,
            ]}
          />

          <BotCard
            name="OKX Bot"
            icon="🔷"
            health={data.okx.health}
            accent="amber"
            lines={[
              `Positions: ${normalizeArray(data.okx.positions).length}`,
              `Trades: ${normalizeArray(data.okx.trades).length}`,
              `Status: ${data.okx.health ? "Ready" : "Waiting"}`,
            ]}
          />

          <BotCard
            name="DEX Bot"
            icon="⚡"
            health={data.dex.health || data.sniper.health}
            accent="cyan"
            lines={[
              `Positions: ${normalizeArray(data.dex.positions).length}`,
              `Trades: ${normalizeArray(data.dex.trades).length}`,
              `Discoveries: ${normalizeArray(data.sniper.discoveries).length}`,
            ]}
          />
        </div>

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
                      {tab.count > 0 ? (
                        <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, i) => <TradeRow key={`${getTradeTimestamp(trade)}-${trade?.symbol}-${i}`} trade={trade} />)
                ) : (
                  <div className="text-center py-12 text-white/30">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">No trades match filter</p>
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
                  normalizeArray(data.sniper.discoveries)
                    .slice(0, 10)
                    .map((d, i) => <DiscoveryCard key={`${d?.pair || d?.address || i}`} discovery={d} />)
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
                  <span>Visible trades</span>
                  <span>{allTrades.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
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
            </Link>{" "}
            •{" "}
            <Link to="/dashboard" className="text-indigo-400 hover:underline">
              Member Dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
