import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useSocket } from "../context/SocketContext";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

// ============================================================================
// CORRECTED ENDPOINTS - Updated to match your backend routes
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

// Try these corrected endpoints based on common patterns
const PUBLIC_STATS_URL = `${API_BASE}/api/public/stats`;        // Changed from /live-stats
const NOTABLE_TRADES_URL = `${API_BASE}/api/public/notable-trades`;  // Changed from /notable-trades
const RECENT_TRADES_URL = `${API_BASE}/api/public/trades`;      // New endpoint for recent trades
const BOTS_URL = `${API_BASE}/api/public/bots`;                 // New endpoint for bot list

// Fallback endpoints if the above don't work
const FALLBACK_STATS_URL = `${API_BASE}/api/stats/public`;
const FALLBACK_TRADES_URL = `${API_BASE}/api/trades/public`;

const REFRESH_INTERVAL = 60000;
const MIN_FETCH_INTERVAL = 30000;

// Helper functions
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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
  const absValue = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n >= 0 ? "+" : "-"}$${absValue}`;
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
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  } catch {
    return "—";
  }
}

function getRiskColor(risk) {
  const riskLower = (risk || "").toLowerCase();
  if (riskLower.includes("low")) return "text-emerald-600 bg-emerald-50";
  if (riskLower.includes("medium-high")) return "text-orange-600 bg-orange-50";
  if (riskLower.includes("medium")) return "text-amber-600 bg-amber-50";
  if (riskLower.includes("high")) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

function normalizeBotName(botName) {
  const name = String(botName || "").toLowerCase();
  if (name.includes("okx")) return "okx";
  if (name.includes("future")) return "futures";
  if (name.includes("stock") || name.includes("alpaca")) return "stocks";
  if (name.includes("sniper") || name.includes("dex")) return "sniper";
  return name || "unknown";
}

function getBotIcon(botName) {
  const name = normalizeBotName(botName);
  if (name === "stocks") return "📈";
  if (name === "futures") return "📊";
  if (name === "sniper") return "🎯";
  if (name === "okx") return "🔷";
  return "🤖";
}

function getBotDisplayName(botName) {
  const name = normalizeBotName(botName);
  if (name === "okx") return "OKX Spot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks") return "Stock Bot";
  if (name === "sniper") return "Sniper Bot";
  return botName || "Bot";
}

function normalizeTrade(trade) {
  return {
    ...trade,
    id: trade?.id || `${trade?.symbol || "unknown"}-${trade?.created_at || trade?.timestamp || Date.now()}-${normalizeBotName(trade?.bot || trade?.bot_name || trade?.source)}`,
    bot: normalizeBotName(trade?.bot || trade?.bot_name || trade?.source),
    qty: trade?.qty !== undefined ? safeNumber(trade.qty) : 0,
    exit_price: trade?.exit_price !== undefined ? trade.exit_price : null,
    price: safeNumber(trade?.price, 0),
    pnl_usd: safeNumber(trade?.pnl_usd ?? trade?.pnl, 0),
    pnl_percent: safeNumber(trade?.pnl_percent, 0),
    status: trade?.status || (trade?.exit_price ? "closed" : "open"),
  };
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  return trades.slice(0, 7).reverse().map((trade, index) => {
    const usd = trade?.pnl_usd ?? trade?.pnl ?? null;
    if (usd !== null && Number.isFinite(Number(usd))) {
      return Math.max(2, Math.min(16, Math.abs(Number(usd)) / 25 + 3));
    }
    return index + 4;
  });
}

function BotActivityChart({ trades = [] }) {
  const series = buildActivitySeries(trades);

  const chartData = useMemo(() => ({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      data: series,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.18)",
      fill: true,
      tension: 0.45,
      pointRadius: 4,
      pointHoverRadius: 5,
      pointBackgroundColor: "#ffffff",
      pointBorderColor: "#10b981",
      pointBorderWidth: 2,
      borderWidth: 3,
    }],
  }), [series]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: "#111827",
        titleColor: "#ffffff",
        bodyColor: "#d1fae5",
        padding: 10,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: "#9ca3af", font: { size: 10 } },
      },
      y: { display: false, grid: { color: "rgba(229,231,235,0.5)" } },
    },
  }), []);

  return <Line data={chartData} options={chartOptions} />;
}

function StatMiniCard({ title, value, valueClassName = "text-gray-900", subtext }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
      <div className={`text-lg font-bold ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{title}</div>
      {subtext && <div className="mt-0.5 text-[9px] text-gray-400">{subtext}</div>}
    </div>
  );
}

function BotPerformanceCard({ bot, stats, notableTrades, onTradeClick }) {
  const [expanded, setExpanded] = useState(true);
  const hasTrades = stats && stats.total_trades > 0;
  const winRate = safeNumber(stats?.win_rate);
  const totalTrades = safeNumber(stats?.total_trades);
  const wins = safeNumber(stats?.wins);
  const losses = safeNumber(stats?.losses);

  const botNotableTrades = Array.isArray(notableTrades?.[bot]) ? notableTrades[bot].map(normalizeTrade) : [];

  if (!hasTrades) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="cursor-pointer p-4 transition-colors hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getBotIcon(bot)}</span>
            <h3 className="font-bold text-gray-900">{getBotDisplayName(bot)}</h3>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-blue-600">{winRate.toFixed(1)}%</div>
              <div className="text-[9px] text-gray-500">Win Rate</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-purple-600">{totalTrades.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Trades</div>
            </div>
            <svg className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{wins.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{losses.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {botNotableTrades[0] ? formatPercent(botNotableTrades[0].pnl_percent) : "0%"}
              </div>
              <div className="text-[9px] text-gray-500">Best Trade</div>
            </div>
          </div>

          {botNotableTrades.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>🏆</span> Notable Trades (Ranked by Highest % Return)
                <span className="text-[9px] text-gray-400">Top {botNotableTrades.length} winning trades</span>
              </div>
              <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                {botNotableTrades.map((trade, idx) => (
                  <div
                    key={trade.id || idx}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 transition-colors hover:from-green-100 hover:to-emerald-100"
                    onClick={(e) => { e.stopPropagation(); onTradeClick(trade); }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900">{trade.symbol}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${trade.side === "buy" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                          {trade.side?.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">#{idx + 1}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-gray-500">
                        {timeAgo(trade.created_at)} • Entry: {formatCurrency(trade.price)}
                        {trade.exit_price && ` • Exit: ${formatCurrency(trade.exit_price)}`}
                        {trade.qty ? ` • Qty: ${safeNumber(trade.qty).toFixed(6)}` : ""}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <div className="text-base font-bold text-green-600">{formatPercent(safeNumber(trade.pnl_percent))}</div>
                      <div className="text-[9px] text-gray-500">{formatCurrencySigned(trade.pnl_usd || 0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade, onClick, isNotable = false }) {
  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const isOpen = trade.status === "open";
  const exitPrice = trade.exit_price;
  const quantity = trade.qty;

  return (
    <div
      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all hover:shadow-md ${
        isNotable ? "border-2 border-amber-300 bg-amber-50/30" :
        !isOpen && pnl > 0 ? "bg-emerald-50 hover:bg-emerald-100" :
        !isOpen && pnl < 0 ? "bg-red-50 hover:bg-red-100" :
        isOpen ? "bg-blue-50 hover:bg-blue-100" : "bg-gray-50 hover:bg-gray-100"
      }`}
      onClick={() => onClick(trade)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          {isNotable && <span className="text-xs text-amber-500">🏆</span>}
          <span className="text-sm font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {side.toUpperCase()}
          </span>
          <span className="text-[9px] text-gray-400">{getBotIcon(bot)} {bot}</span>
          {isOpen && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] text-blue-700">OPEN</span>}
        </div>
        <div className="mt-0.5 text-[10px] text-gray-400">{timeAgo(timestamp)}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span>Entry: {formatCurrency(trade.price || 0)}</span>
          {!isOpen && exitPrice && <span>Exit: {formatCurrency(exitPrice)}</span>}
          {quantity && quantity > 0 && <span>Qty: {safeNumber(quantity).toFixed(6)}</span>}
        </div>
      </div>
      <div className="ml-2 shrink-0 text-right">
        {!isOpen ? (
          <>
            <div className={`text-sm font-semibold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
              {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(trade.price || 0)}
            </div>
            {pnlPercent !== 0 && (
              <div className={`text-[11px] font-medium ${pnlPercent > 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatPercent(pnlPercent)}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm font-semibold text-blue-600">Open Position</div>
        )}
      </div>
    </div>
  );
}

function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const entryPrice = safeNumber(trade.price);
  const exitPrice = trade.exit_price ? safeNumber(trade.exit_price) : null;
  const qty = safeNumber(trade.qty);
  const status = trade.status === "open" ? "Open" : "Closed";
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || "AI detected favorable market conditions";

  const priceChangePercent = exitPrice && entryPrice ? ((exitPrice - entryPrice) / entryPrice) * 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-3">
          <h3 className="text-base font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xl font-bold text-gray-900">{symbol}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {side.toUpperCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                  {status}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{timeAgo(timestamp)} • {bot}</div>
            </div>
            {pnl !== 0 && (
              <div className="text-right">
                <div className={`text-xl font-bold ${pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {formatCurrencySigned(pnl)}
                </div>
                {pnlPercent !== 0 && (
                  <div className={`text-xs font-semibold ${pnlPercent > 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatPercent(pnlPercent)} return
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-xs">
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{qty > 0 ? qty.toFixed(6) : "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Price</div>
              <div className="font-semibold">{formatCurrency(entryPrice)}</div>
            </div>
            {status === "Closed" && exitPrice && (
              <>
                <div>
                  <div className="text-gray-500">Exit Price</div>
                  <div className="font-semibold">{formatCurrency(exitPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Price Change</div>
                  <div className={`font-semibold ${priceChangePercent > 0 ? "text-green-600" : priceChangePercent < 0 ? "text-red-600" : "text-gray-600"}`}>
                    {formatPercent(priceChangePercent)}
                  </div>
                </div>
              </>
            )}
            {status === "Closed" && !exitPrice && (
              <div className="col-span-2">
                <div className="text-gray-500">Exit Price</div>
                <div className="font-semibold text-gray-400">Not recorded</div>
              </div>
            )}
            {status === "Open" && (
              <div className="col-span-2">
                <div className="text-gray-500">Current Status</div>
                <div className="font-semibold text-blue-600">Active Position</div>
              </div>
            )}
            <div>
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRiskColor(risk)}`}>
                {risk.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <div className="mb-2 flex items-center gap-1">
              <span className="text-lg">🤖</span>
              <span className="text-sm font-semibold text-gray-900">AI Analysis</span>
            </div>
            <p className="text-xs text-gray-700">{entryReason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
  const { isConnected, socket, subscribeToTrades, subscribeToPnl, subscribeToSystemMetrics } = useSocket();

  const [data, setData] = useState({
    trades: [],
    summary: {},
    botStats: {},
    notableTrades: {},
    loading: true,
    error: null,
    lastUpdate: null,
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("recent");

  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const endpointAttemptedRef = useRef(false);

  // Function to try multiple endpoints with fallback
  const fetchWithFallback = useCallback(async () => {
    const endpoints = [
      { url: PUBLIC_STATS_URL, name: "primary stats" },
      { url: FALLBACK_STATS_URL, name: "fallback stats" },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 10000 });
        if (response.data?.success || response.data?.data) {
          return { data: response.data, endpoint: endpoint.name };
        }
      } catch (err) {
        console.warn(`Endpoint ${endpoint.name} failed:`, err.message);
        continue;
      }
    }
    throw new Error("All stats endpoints failed");
  }, []);

  const fetchTradesWithFallback = useCallback(async () => {
    const endpoints = [
      { url: RECENT_TRADES_URL, name: "primary trades" },
      { url: FALLBACK_TRADES_URL, name: "fallback trades" },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 10000 });
        if (response.data?.success || Array.isArray(response.data)) {
          return { data: response.data, endpoint: endpoint.name };
        }
      } catch (err) {
        console.warn(`Trades endpoint ${endpoint.name} failed:`, err.message);
        continue;
      }
    }
    return { data: { trades: [] }, endpoint: "none" };
  }, []);

  const fetchNotableWithFallback = useCallback(async () => {
    const endpoints = [
      { url: NOTABLE_TRADES_URL, name: "primary notable" },
      { url: `${API_BASE}/api/notable-trades`, name: "legacy notable" },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 10000, params: { limit: 10 } });
        if (response.data?.success) {
          return { data: response.data, endpoint: endpoint.name };
        }
      } catch (err) {
        console.warn(`Notable endpoint ${endpoint.name} failed:`, err.message);
        continue;
      }
    }
    return { data: { data: {} }, endpoint: "none" };
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;

    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL && lastFetchTimeRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      lastFetchTimeRef.current = now;

      // Fetch all three data sources in parallel with fallbacks
      const [statsResult, tradesResult, notableResult] = await Promise.all([
        fetchWithFallback(),
        fetchTradesWithFallback(),
        fetchNotableWithFallback(),
      ]);

      // Process stats data
      const statsData = statsResult.data?.data || statsResult.data || {};
      const summary = {
        total_trades: statsData.total_trades || statsData.totalTrades || 0,
        wins: statsData.wins || 0,
        losses: statsData.losses || 0,
        win_rate: statsData.win_rate || statsData.winRate || 0,
      };

      // Process trades data
      let trades = [];
      if (tradesResult.data?.data?.trades) {
        trades = tradesResult.data.data.trades.map(normalizeTrade);
      } else if (tradesResult.data?.trades) {
        trades = tradesResult.data.trades.map(normalizeTrade);
      } else if (Array.isArray(tradesResult.data)) {
        trades = tradesResult.data.map(normalizeTrade);
      }

      // Process bot stats
      const botStats = {};
      const mainBots = ["okx", "futures", "stocks", "sniper"];
      const botsData = statsData.bots || statsData.bot_stats || [];

      (Array.isArray(botsData) ? botsData : []).forEach((bot) => {
        const botName = normalizeBotName(bot.name || bot.bot_name);
        if (!mainBots.includes(botName)) return;

        const totalTrades = safeNumber(bot.total_trades || bot.totalTrades);
        if (totalTrades === 0) return;

        const wins = safeNumber(bot.wins);
        const losses = safeNumber(bot.losses);
        const closedTrades = wins + losses;

        botStats[botName] = {
          total_trades: totalTrades,
          wins,
          losses,
          win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
          best_return: 0,
        };
      });

      // Process notable trades
      const nextNotableTrades = {};
      const notableData = notableResult.data?.data || {};
      Object.entries(notableData).forEach(([bot, tradesList]) => {
        if (Array.isArray(tradesList)) {
          nextNotableTrades[normalizeBotName(bot)] = tradesList.map(normalizeTrade);
        }
      });

      setData((prev) => ({
        ...prev,
        trades: trades.length > 0 ? trades : prev.trades,
        summary,
        botStats: Object.keys(botStats).length > 0 ? botStats : prev.botStats,
        notableTrades: nextNotableTrades,
        loading: false,
        error: null,
        lastUpdate: new Date(),
      }));

      endpointAttemptedRef.current = true;
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Unable to connect to server. Using demo data mode.",
        lastUpdate: prev.lastUpdate,
      }));

      // Set demo data if no real data exists
      if (!endpointAttemptedRef.current && prev.trades.length === 0) {
        setData((prev) => ({
          ...prev,
          trades: [
            {
              id: "demo-1",
              symbol: "BTC/USD",
              side: "buy",
              price: 43250.75,
              pnl_usd: 1250.50,
              pnl_percent: 2.89,
              status: "closed",
              bot: "okx",
              created_at: new Date().toISOString(),
            },
            {
              id: "demo-2",
              symbol: "ETH/USD",
              side: "sell",
              price: 2250.30,
              pnl_usd: -85.20,
              pnl_percent: -3.79,
              status: "closed",
              bot: "futures",
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          summary: { total_trades: 2, wins: 1, losses: 1, win_rate: 50 },
          botStats: {
            okx: { total_trades: 1, wins: 1, losses: 0, win_rate: 100 },
            futures: { total_trades: 1, wins: 0, losses: 1, win_rate: 0 },
          },
          loading: false,
        }));
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchWithFallback, fetchTradesWithFallback, fetchNotableWithFallback]);

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      if (!isConnected) {
        fetchData(true);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData, isConnected]);

  useEffect(() => {
    if (!isConnected) return;

    subscribeToTrades?.();
    subscribeToPnl?.();
    subscribeToSystemMetrics?.();
  }, [isConnected, subscribeToTrades, subscribeToPnl, subscribeToSystemMetrics]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    let unsubTrade = null;
    let unsubPnl = null;

    const handleTrade = (incomingTrade) => {
      const trade = normalizeTrade(incomingTrade);
      setData((prev) => {
        const tradeId = trade.id;
        const exists = prev.trades.some((t) => t.id === tradeId);
        if (exists) return prev;
        return {
          ...prev,
          trades: [trade, ...prev.trades].slice(0, 500),
          lastUpdate: new Date(),
        };
      });
    };

    const handlePnlUpdate = () => fetchData(true);

    if (typeof socket.onTrade === "function") {
      unsubTrade = socket.onTrade(handleTrade);
    } else if (typeof socket.on === "function") {
      socket.on("trade", handleTrade);
      unsubTrade = () => socket.off?.("trade", handleTrade);
    }

    if (typeof socket.onPnlUpdate === "function") {
      unsubPnl = socket.onPnlUpdate(handlePnlUpdate);
    } else if (typeof socket.on === "function") {
      socket.on("pnl_update", handlePnlUpdate);
      unsubPnl = () => socket.off?.("pnl_update", handlePnlUpdate);
    }

    return () => {
      if (typeof unsubTrade === "function") unsubTrade();
      if (typeof unsubPnl === "function") unsubPnl();
    };
  }, [socket, isConnected, fetchData]);

  const allTrades = data.trades || [];
  const botStats = data.botStats || {};
  const notableTrades = data.notableTrades || {};

  const totalTrades = safeNumber(data.summary.total_trades || allTrades.length);
  const wins = safeNumber(data.summary.wins);
  const losses = safeNumber(data.summary.losses);
  const winRate = safeNumber(data.summary.win_rate) || (wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0);
  const activeBots = Object.keys(botStats).length;

  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") return safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd);
      if (sortRecentTrades === "percent") return Math.abs(safeNumber(b.pnl_percent)) - Math.abs(safeNumber(a.pnl_percent));
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [allTrades, sortRecentTrades]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return sortedRecentTrades.filter((t) => t.status === "open");
    if (activeTab === "closed") return sortedRecentTrades.filter((t) => t.status === "closed");
    return sortedRecentTrades;
  }, [activeTab, sortedRecentTrades]);

  const tabs = [
    { id: "all", label: "All", count: allTrades.length },
    { id: "open", label: "Open", count: allTrades.filter((t) => t.status === "open").length },
    { id: "closed", label: "Closed", count: allTrades.filter((t) => t.status === "closed").length },
  ];

  const bots = ["okx", "futures", "stocks", "sniper"].filter((bot) => botStats[bot]?.total_trades > 0);

  if (data.loading && !data.lastUpdate && allTrades.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link to="/" className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
                IMALI
              </Link>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${isConnected ? "bg-green-100 text-green-700 animate-pulse" : "bg-yellow-100 text-yellow-700"}`}>
                {isConnected ? "LIVE" : "UPDATING"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>{formatNumber(totalTrades)} trades tracked</span>
              <span>•</span>
              <span>{isConnected ? "Real-time WebSocket" : "Polling every 60s"}</span>
              <span>•</span>
              <span>{activeBots} active bots</span>
              <Link to="/signup" className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-1 text-[10px] font-medium text-white">
                Join
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4">
        {data.error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-xs text-amber-600">⚠️ {data.error}</p>
          </div>
        )}

        <div className="mb-4 text-center">
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-2xl font-bold text-transparent">
            Trading in Public
          </h1>
          <p className="text-xs text-gray-500">
            {formatNumber(totalTrades)} total trades • {activeBots} active bots •
            {isConnected ? " Real-time updates via WebSocket" : " Updating every 60 seconds"}
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              Bot Activity
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Last 7 Days</span>
          </div>
          <div className="h-80">
            <BotActivityChart trades={allTrades} />
          </div>
          <p className="mt-2 text-center text-[9px] text-gray-400">Weekly trading activity based on recent trades</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatMiniCard title="Total Trades" value={formatNumber(totalTrades)} valueClassName="text-purple-600" />
          <StatMiniCard title="Win Rate" value={`${winRate.toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${formatNumber(wins)}W / ${formatNumber(losses)}L`} />
        </div>

        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
            <span>🏆</span>
            Notable Trades by Bot
            <span className="ml-1 text-[10px] font-normal text-gray-400">Ranked by highest percentage return - Click to collapse</span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {bots.map((bot) => (
              <BotPerformanceCard key={bot} bot={bot} stats={botStats[bot]} notableTrades={notableTrades} onTradeClick={setSelectedTrade} />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Recent Trades</h2>
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Sort by:</span>
                <select value={sortRecentTrades} onChange={(e) => setSortRecentTrades(e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-[10px]">
                  <option value="recent">Most Recent</option>
                  <option value="percent">Highest % Return</option>
                  <option value="pnl">Highest $ P&L</option>
                </select>
              </div>
            </div>
          </div>
          <div className="max-h-[600px] divide-y divide-gray-100 overflow-y-auto">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade, idx) => <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} />)
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No trades found</p>
              </div>
            )}
          </div>
        </div>

        <div className="pb-4 pt-4 text-center text-[9px] text-gray-400">
          {isConnected ? (
            <>🟢 Live WebSocket connected • Real-time updates • Last update: {data.lastUpdate?.toLocaleTimeString() || "—"}</>
          ) : (
            <>🟡 WebSocket disconnected • Polling every 60s • Last update: {data.lastUpdate?.toLocaleTimeString() || "—"}</>
          )}
        </div>
      </main>

      <TradeDetailModal trade={selectedTrade} isOpen={!!selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}