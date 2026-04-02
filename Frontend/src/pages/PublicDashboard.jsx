import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;
const NOTABLE_TRADES_URL = `${API_BASE}/api/notable-trades`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const BOT_HISTORY_URL = `${API_BASE}/api/bot-activity/history?days=30&limit=500`;

const BOT_ORDER = ["okx", "futures", "stocks", "sniper"];
const BOT_LABELS = {
  okx: "OKX Spot",
  futures: "Futures Bot",
  stocks: "Stock Bot",
  sniper: "Sniper Bot",
};

const BOT_ICONS = {
  okx: "🔷",
  futures: "📊",
  stocks: "📈",
  sniper: "🎯",
};

const FALLBACK_NOTABLE = {
  okx: [],
  futures: [],
  stocks: [],
  sniper: [],
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCurrencySigned(value) {
  const n = safeNumber(value);
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n >= 0 ? "+" : "-"}$${abs}`;
}

function formatPercent(value) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  } catch {
    return "—";
  }
}

function normalizeBotName(value) {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("okx")) return "okx";
  if (raw.includes("future")) return "futures";
  if (raw.includes("stock") || raw.includes("alpaca")) return "stocks";
  if (raw.includes("sniper") || raw.includes("dex")) return "sniper";
  return "unknown";
}

function getBotLabel(botKey) {
  return BOT_LABELS[botKey] || botKey || "Bot";
}

function getBotIcon(botKey) {
  return BOT_ICONS[botKey] || "🤖";
}

function mapTrade(trade, fallbackBot = "unknown") {
  const bot = normalizeBotName(trade?.bot || fallbackBot);
  return {
    id:
      trade?.id ||
      `${bot}-${trade?.symbol || "unknown"}-${trade?.created_at || Date.now()}`,
    symbol: trade?.symbol || "Unknown",
    side: String(trade?.side || "buy").toLowerCase(),
    price: safeNumber(trade?.price),
    entry_price: safeNumber(trade?.entry_price ?? trade?.price),
    exit_price:
      trade?.exit_price === null || trade?.exit_price === undefined
        ? null
        : safeNumber(trade?.exit_price),
    qty: safeNumber(trade?.qty, 0),
    pnl_usd: safeNumber(trade?.pnl_usd),
    pnl_percent: safeNumber(trade?.pnl_percent),
    created_at: trade?.created_at || null,
    status: trade?.status || "closed",
    risk_level: trade?.risk_level || "medium",
    entry_reason: trade?.entry_reason || "",
    exit_reason: trade?.exit_reason || "",
    bot,
  };
}

function sortTrades(trades, mode) {
  const items = [...trades];
  if (mode === "pnl") {
    return items.sort((a, b) => safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd));
  }
  if (mode === "percent") {
    return items.sort(
      (a, b) => Math.abs(safeNumber(b.pnl_percent)) - Math.abs(safeNumber(a.pnl_percent))
    );
  }
  return items.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

function buildGroupedNotables(notableData, fallbackTrades, sortMode) {
  const grouped = { ...FALLBACK_NOTABLE };

  BOT_ORDER.forEach((bot) => {
    const apiTrades = Array.isArray(notableData?.[bot]) ? notableData[bot] : [];
    const mappedFromApi = apiTrades.map((trade) => mapTrade(trade, bot));

    const fallbackFromRecent = fallbackTrades
      .filter((trade) => normalizeBotName(trade?.bot) === bot && trade?.status !== "open")
      .map((trade) => mapTrade(trade, bot));

    const source = mappedFromApi.length > 0 ? mappedFromApi : fallbackFromRecent;
    grouped[bot] = sortTrades(source, sortMode).slice(0, 6);
  });

  return grouped;
}

function buildChartSeries(trades) {
  const bucket = {};
  trades.forEach((trade) => {
    if (!trade?.created_at) return;
    const key = new Date(trade.created_at).toISOString().slice(0, 10);
    bucket[key] = (bucket[key] || 0) + 1;
  });

  const labels = Object.keys(bucket).sort();
  return {
    labels: labels.map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    values: labels.map((d) => bucket[d]),
  };
}

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, valueClassName = "text-gray-900" }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
    <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
    <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{title}</div>
    {subtext && <div className="mt-1 text-[10px] text-gray-400">{subtext}</div>}
  </div>
);

function TradeCard({ trade, onClick }) {
  const pnl = safeNumber(trade.pnl_usd);
  const pnlPct = safeNumber(trade.pnl_percent);

  return (
    <button
      type="button"
      onClick={() => onClick(trade)}
      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:shadow-md hover:border-emerald-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{trade.symbol}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                trade.side === "buy"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {trade.side.toUpperCase()}
            </span>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
              NOTABLE
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Entry {formatCurrency(trade.entry_price)}
            {trade.exit_price !== null ? ` • Exit ${formatCurrency(trade.exit_price)}` : ""}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
        </div>

        <div className="shrink-0 text-right">
          <div
            className={`text-sm font-bold ${
              pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"
            }`}
          >
            {formatCurrencySigned(pnl)}
          </div>
          <div
            className={`text-[11px] font-semibold ${
              pnlPct > 0 ? "text-emerald-500" : pnlPct < 0 ? "text-red-500" : "text-gray-500"
            }`}
          >
            {formatPercent(pnlPct)}
          </div>
        </div>
      </div>
    </button>
  );
}

function TradeModal({ trade, onClose }) {
  if (!trade) return null;

  const pnl = safeNumber(trade.pnl_usd);
  const pnlPct = safeNumber(trade.pnl_percent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <div className="text-lg font-bold text-gray-900">{trade.symbol}</div>
            <div className="text-xs text-gray-500">
              {getBotIcon(trade.bot)} {getBotLabel(trade.bot)} • {timeAgo(trade.created_at)}
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  trade.side === "buy"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {trade.side.toUpperCase()}
              </span>
              <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-xs font-semibold">
                {trade.status === "open" ? "OPEN" : "CLOSED"}
              </span>
            </div>

            <div className="text-right">
              <div
                className={`text-xl font-bold ${
                  pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-700"
                }`}
              >
                {formatCurrencySigned(pnl)}
              </div>
              <div
                className={`text-sm font-semibold ${
                  pnlPct > 0 ? "text-emerald-500" : pnlPct < 0 ? "text-red-500" : "text-gray-500"
                }`}
              >
                {formatPercent(pnlPct)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-gray-500 text-xs">Entry</div>
              <div className="font-semibold text-gray-900">
                {formatCurrency(trade.entry_price)}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-gray-500 text-xs">Exit</div>
              <div className="font-semibold text-gray-900">
                {trade.exit_price !== null ? formatCurrency(trade.exit_price) : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-gray-500 text-xs">Quantity</div>
              <div className="font-semibold text-gray-900">{trade.qty || "—"}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-gray-500 text-xs">Risk</div>
              <div className="font-semibold text-gray-900">
                {(trade.risk_level || "medium").toUpperCase()}
              </div>
            </div>
          </div>

          {trade.entry_reason && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <div className="text-xs font-semibold text-indigo-700 mb-1">Entry reason</div>
              <div className="text-sm text-gray-700">{trade.entry_reason}</div>
            </div>
          )}

          {trade.exit_reason && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="text-xs font-semibold text-amber-700 mb-1">Exit reason</div>
              <div className="text-sm text-gray-700">{trade.exit_reason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
  const {
    isConnected,
    socket,
    subscribeToTrades,
    subscribeToPnl,
    subscribeToSystemMetrics,
  } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState("pnl");
  const [selectedTrade, setSelectedTrade] = useState(null);

  const [summary, setSummary] = useState({
    total_trades: 0,
    total_pnl: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
  });

  const [recentTrades, setRecentTrades] = useState([]);
  const [bots, setBots] = useState([]);
  const [notableByBot, setNotableByBot] = useState(FALLBACK_NOTABLE);
  const [historyTrades, setHistoryTrades] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    setError("");

    try {
      const [liveRes, notableRes, statusRes, historyRes] = await Promise.allSettled([
        axios.get(PUBLIC_STATS_URL, { timeout: 10000 }),
        axios.get(NOTABLE_TRADES_URL, { timeout: 10000 }),
        axios.get(BOT_STATUS_URL, { timeout: 10000 }),
        axios.get(BOT_HISTORY_URL, { timeout: 10000 }),
      ]);

      let liveData = null;
      let notableData = null;
      let statusData = null;
      let historyData = null;

      if (liveRes.status === "fulfilled" && liveRes.value?.data?.success) {
        liveData = liveRes.value.data.data || {};
      }
      if (notableRes.status === "fulfilled" && notableRes.value?.data?.success) {
        notableData = notableRes.value.data.data || {};
      }
      if (statusRes.status === "fulfilled" && statusRes.value?.data?.success) {
        statusData = statusRes.value.data.data || {};
      }
      if (historyRes.status === "fulfilled" && historyRes.value?.data?.success) {
        historyData = historyRes.value.data.data || {};
      }

      const nextRecentTrades = Array.isArray(liveData?.recent_trades)
        ? liveData.recent_trades.map((trade) => mapTrade(trade))
        : [];

      const nextSummary = liveData?.summary || {};
      const nextBotsFromLive = Array.isArray(liveData?.bots) ? liveData.bots : [];
      const nextBotsFromStatus = Array.isArray(statusData?.bots) ? statusData.bots : [];

      const mergedBots = BOT_ORDER.map((botKey) => {
        const fromLive = nextBotsFromLive.find((b) => normalizeBotName(b?.name) === botKey);
        const fromStatus = nextBotsFromStatus.find(
          (b) => normalizeBotName(b?.name) === botKey || normalizeBotName(b?.display_name) === botKey
        );

        return {
          key: botKey,
          name: getBotLabel(botKey),
          icon: getBotIcon(botKey),
          total_trades: safeNumber(fromLive?.total_trades ?? fromStatus?.total_trades),
          wins: safeNumber(fromLive?.wins),
          losses: safeNumber(fromLive?.losses),
          open_positions: safeNumber(fromLive?.open_positions),
          active:
            safeNumber(fromStatus?.recent_trades) > 0 ||
            safeNumber(fromLive?.open_positions) > 0 ||
            fromStatus?.status === "operational",
          last_activity: fromStatus?.last_activity || fromLive?.last_activity || null,
        };
      });

      const nextHistoryTrades = Array.isArray(historyData?.trades)
        ? historyData.trades.map((trade) => mapTrade(trade))
        : nextRecentTrades;

      const grouped = buildGroupedNotables(notableData, nextRecentTrades, sortMode);

      setSummary({
        total_trades: safeNumber(nextSummary?.total_trades),
        total_pnl: safeNumber(nextSummary?.total_pnl),
        wins: safeNumber(nextSummary?.wins),
        losses: safeNumber(nextSummary?.losses),
        win_rate: safeNumber(nextSummary?.win_rate),
      });
      setRecentTrades(nextRecentTrades);
      setBots(mergedBots);
      setHistoryTrades(nextHistoryTrades);
      setNotableByBot(grouped);
      setLastUpdate(new Date());

      if (!liveData && !notableData && !statusData) {
        setError("Could not load live dashboard data.");
      }
    } catch (err) {
      console.error("[PublicDashboard] fetch failed:", err);
      setError("Could not load live dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [sortMode]);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  useEffect(() => {
    if (!isConnected) return;
    subscribeToTrades?.();
    subscribeToPnl?.();
    subscribeToSystemMetrics?.();
  }, [isConnected, subscribeToPnl, subscribeToSystemMetrics, subscribeToTrades]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const unsubscribe = typeof socket.onTrade === "function"
      ? socket.onTrade((trade) => {
          const mapped = mapTrade(trade);
          setRecentTrades((prev) => [mapped, ...prev].slice(0, 200));
          setLastUpdate(new Date());
        })
      : null;

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [socket, isConnected]);

  useEffect(() => {
    setNotableByBot((prev) => buildGroupedNotables(prev, recentTrades, sortMode));
  }, [recentTrades, sortMode]);

  const chartSeries = useMemo(() => buildChartSeries(historyTrades), [historyTrades]);
  const activeBots = useMemo(() => bots.filter((b) => b.active).length, [bots]);

  const chartData = useMemo(
    () => ({
      labels: chartSeries.labels,
      datasets: [
        {
          data: chartSeries.values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.16)",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 4,
          pointBorderWidth: 2,
          pointBorderColor: "#10b981",
          pointBackgroundColor: "#ffffff",
          borderWidth: 3,
        },
      ],
    }),
    [chartSeries]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#111827",
          titleColor: "#ffffff",
          bodyColor: "#d1fae5",
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#9ca3af", font: { size: 10 } },
          grid: { color: "rgba(229,231,235,0.5)" },
        },
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent"
            >
              IMALI
            </Link>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              PUBLIC LIVE
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              }`}
            />
            <span>{isConnected ? "Live" : "Polling"}</span>
            <span>•</span>
            <span>{activeBots} active bots</span>
            <Link
              to="/signup"
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-1 font-medium text-white"
            >
              Join
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
            ⚠️ {error}
          </div>
        )}

        <div className="mb-5 text-center">
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-3xl font-extrabold text-transparent">
            Trading in Public
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Four live bots, notable trades by bot, and a clickable performance showcase for marketing.
          </p>
          {lastUpdate && (
            <p className="mt-1 text-[10px] text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard title="Total Trades" value={formatNumber(summary.total_trades)} valueClassName="text-purple-600" />
          <StatCard title="Win Rate" value={`${safeNumber(summary.win_rate).toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${formatNumber(summary.wins)}W / ${formatNumber(summary.losses)}L`} />
          <StatCard title="Total P&L" value={formatCurrency(summary.total_pnl)} valueClassName={summary.total_pnl >= 0 ? "text-emerald-600" : "text-red-600"} />
          <StatCard title="Active Bots" value={String(activeBots)} valueClassName="text-indigo-600" subtext="Fixed at 4 tracked bots" />
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">30-Day Activity</h2>
                <p className="text-[11px] text-gray-500">Trade count trend from public history</p>
              </div>
            </div>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Bot Status</h2>
            <div className="grid gap-2">
              {bots.map((bot) => (
                <div
                  key={bot.key}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{bot.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{bot.name}</div>
                      <div className="text-[10px] text-gray-500">
                        {formatNumber(bot.total_trades)} trades
                        {bot.last_activity ? ` • ${timeAgo(bot.last_activity)}` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      bot.active ? "bg-green-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mb-5 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Notable Trades by Bot</h2>
              <p className="text-sm text-gray-500">
                Top clickable trade examples grouped into the four live bot categories.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort notable trades by:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
              >
                <option value="pnl">Highest $ P&L</option>
                <option value="percent">Highest % Return</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {BOT_ORDER.map((botKey) => (
              <div key={botKey} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getBotIcon(botKey)}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{getBotLabel(botKey)}</div>
                      <div className="text-[11px] text-gray-500">
                        {notableByBot[botKey]?.length || 0} notable trades shown
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {notableByBot[botKey]?.length ? (
                    notableByBot[botKey].map((trade) => (
                      <TradeCard key={trade.id} trade={trade} onClick={setSelectedTrade} />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-400">
                      No notable trades available for this bot yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Latest Trade Feed</h2>
            <p className="text-[11px] text-gray-500">
              Recent closed and open trades from the public stream.
            </p>
          </div>
          <div className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto">
            {sortTrades(recentTrades, "recent").slice(0, 40).map((trade) => (
              <button
                key={trade.id}
                type="button"
                onClick={() => setSelectedTrade(trade)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{trade.symbol}</span>
                    <span className="text-[10px] text-gray-400">
                      {getBotIcon(trade.bot)} {getBotLabel(trade.bot)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        trade.side === "buy"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Entry {formatCurrency(trade.entry_price)}
                    {trade.exit_price !== null ? ` • Exit ${formatCurrency(trade.exit_price)}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`text-sm font-semibold ${
                      trade.pnl_usd > 0
                        ? "text-emerald-600"
                        : trade.pnl_usd < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {formatCurrencySigned(trade.pnl_usd)}
                  </div>
                  <div className="text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </main>

      <TradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}
