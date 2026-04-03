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
// API ENDPOINTS
// ============================================================================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;
const NOTABLE_TRADES_URL = `${API_BASE}/api/notable-trades`;

const REFRESH_INTERVAL = 30000;

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
  // Handle both 'price' and 'entry_price' fields from API
  const entryPrice = trade.entry_price || trade.price || 0;
  
  return {
    ...trade,
    id: trade?.id || `${trade?.symbol || "unknown"}-${trade?.created_at || trade?.timestamp || Date.now()}`,
    bot: normalizeBotName(trade?.bot || trade?.bot_name || trade?.source),
    qty: trade?.qty !== undefined ? safeNumber(trade.qty) : 0,
    exit_price: trade?.exit_price !== undefined ? trade.exit_price : null,
    price: safeNumber(entryPrice, 0),
    pnl_usd: safeNumber(trade?.pnl_usd ?? trade?.pnl, 0),
    pnl_percent: safeNumber(trade?.pnl_percent, 0),
    status: trade?.status || (trade?.exit_price ? "closed" : "open"),
    symbol: trade?.symbol || "Unknown",
    side: trade?.side || trade?.position_side || "buy",
    created_at: trade?.created_at || trade?.timestamp,
  };
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];
  
  const dayMap = {
    Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
  };
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  trades.slice(0, 100).forEach((trade) => {
    if (trade.created_at) {
      const date = new Date(trade.created_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (dayMap[dayName]) {
        const pnl = Math.abs(trade.pnl_usd || 0);
        dayMap[dayName].push(pnl);
      }
    }
  });
  
  return dayOrder.map(day => {
    const pnls = dayMap[day];
    if (pnls.length === 0) return 5;
    const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    return Math.max(3, Math.min(15, avg / 50 + 3));
  });
}

function BotActivityChart({ trades = [] }) {
  const series = buildActivitySeries(trades);
  
  const chartData = useMemo(() => ({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: 'Trading Activity',
      data: series,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.1)",
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: "#10b981",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      borderWidth: 2,
    }],
  }), [series]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Activity: ${context.raw.toFixed(1)}`,
        },
        backgroundColor: "#1f2937",
        titleColor: "#ffffff",
        bodyColor: "#d1fae5",
        padding: 8,
      },
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 11, weight: '500' } },
      },
      y: { 
        display: false,
        min: 0,
        max: 16,
      },
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
  
  const botNotableTrades = Array.isArray(notableTrades?.[bot]) 
    ? notableTrades[bot].slice(0, 5)
    : [];

  if (!hasTrades) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="cursor-pointer p-4 transition-colors hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getBotIcon(bot)}</span>
            <h3 className="font-bold text-gray-900">{getBotDisplayName(bot)}</h3>
            <span className={`h-2 w-2 rounded-full ${totalTrades > 0 ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
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
              <div className="text-lg font-bold text-blue-600">{totalTrades.toLocaleString()}</div>
              <div className="text-[9px] text-gray-500">Total Trades</div>
            </div>
          </div>

          {botNotableTrades.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>🏆</span> Notable Trades (Top {botNotableTrades.length} by % Return)
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                {botNotableTrades.map((trade, idx) => (
                  <div 
                    key={trade.id || idx} 
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 transition-colors hover:from-green-100 hover:to-emerald-100" 
                    onClick={(e) => { e.stopPropagation(); onTradeClick(trade); }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900">{trade.symbol}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${trade.side === "buy" || trade.side === "long" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                          {trade.side?.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">#{idx + 1}</span>
                      </div>
                      <div className="mt-0.5 text-[9px] text-gray-500">
                        {timeAgo(trade.created_at)} • Entry: {formatCurrency(trade.price)}
                        {trade.exit_price && ` → Exit: ${formatCurrency(trade.exit_price)}`}
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <div className="text-base font-bold text-green-600">
                        {formatPercent(trade.pnl_percent)}
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {formatCurrencySigned(trade.pnl_usd)}
                      </div>
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

function TradeRow({ trade, onClick }) {
  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const isOpen = trade.status === "open";

  return (
    <div 
      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all hover:shadow-md ${
        !isOpen && pnl > 0 ? "bg-emerald-50 hover:bg-emerald-100" : 
        !isOpen && pnl < 0 ? "bg-red-50 hover:bg-red-100" : 
        isOpen ? "bg-blue-50 hover:bg-blue-100" : "bg-gray-50 hover:bg-gray-100"
      }`} 
      onClick={() => onClick(trade)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-sm font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${side === "buy" || side === "long" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {side.toUpperCase()}
          </span>
          <span className="text-[9px] text-gray-400">{getBotIcon(bot)} {bot}</span>
          {isOpen && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] text-blue-700">OPEN</span>}
        </div>
        <div className="mt-0.5 text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span>Entry: {formatCurrency(trade.price || 0)}</span>
          {!isOpen && trade.exit_price && <span>Exit: {formatCurrency(trade.exit_price)}</span>}
          {trade.qty > 0 && <span>Qty: {safeNumber(trade.qty).toFixed(6)}</span>}
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
  const status = trade.status === "open" ? "Open" : "Closed";
  const exitPrice = trade.exit_price ? safeNumber(trade.exit_price) : null;
  const entryPrice = safeNumber(trade.price);

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
                <span className="text-xl font-bold text-gray-900">{trade.symbol}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${trade.side === "buy" || trade.side === "long" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {trade.side?.toUpperCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                  {status}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{timeAgo(trade.created_at)} • {getBotDisplayName(trade.bot)}</div>
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
              <div className="font-semibold">{trade.qty > 0 ? safeNumber(trade.qty).toFixed(6) : "—"}</div>
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
                  <div className={`font-semibold ${trade.pnl_percent > 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatPercent(trade.pnl_percent)}
                  </div>
                </div>
              </>
            )}
            {status === "Open" && (
              <div className="col-span-2">
                <div className="text-gray-500">Current Status</div>
                <div className="font-semibold text-blue-600">Active Position</div>
              </div>
            )}
            <div>
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRiskColor(trade.risk_level || "medium")}`}>
                {(trade.risk_level || "MEDIUM").toUpperCase()}
              </div>
            </div>
            {trade.entry_reason && (
              <div className="col-span-2">
                <div className="text-gray-500">Entry Reason</div>
                <div className="text-xs text-gray-700">{trade.entry_reason}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
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

  const fetchData = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;

    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 15000 && lastFetchTimeRef.current) {
      return;
    }

    isFetchingRef.current = true;

    try {
      lastFetchTimeRef.current = now;

      const [statsResponse, notableResponse] = await Promise.all([
        axios.get(PUBLIC_STATS_URL, { timeout: 15000 }),
        axios.get(NOTABLE_TRADES_URL, { timeout: 15000, params: { limit: 20 } }),
      ]);

      if (statsResponse.data?.success) {
        const apiData = statsResponse.data.data || {};
        const trades = (apiData.recent_trades || []).map(normalizeTrade);
        const summary = apiData.summary || {};

        // Build bot stats - ensure futures bot gets wins/losses from the API
        const botStats = {};
        const mainBots = ["okx", "futures", "stocks", "sniper"];

        (apiData.bots || []).forEach((bot) => {
          const botName = normalizeBotName(bot.name);
          if (!mainBots.includes(botName)) return;

          const totalTrades = safeNumber(bot.total_trades);
          if (totalTrades === 0) return;

          // Use the wins/losses directly from the API response
          const wins = safeNumber(bot.wins);
          const losses = safeNumber(bot.losses);
          const closedTrades = wins + losses;

          botStats[botName] = {
            total_trades: totalTrades,
            wins: wins,
            losses: losses,
            win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
          };
        });

        // Process notable trades - ensure entry price is shown
        const nextNotableTrades = {};
        if (notableResponse.data?.success) {
          const notableData = notableResponse.data.data || {};
          Object.entries(notableData).forEach(([bot, tradesList]) => {
            if (Array.isArray(tradesList)) {
              nextNotableTrades[normalizeBotName(bot)] = tradesList.map(trade => normalizeTrade(trade));
            }
          });
        }

        console.log("📊 Bot Stats:", botStats);
        console.log("🏆 Notable Trades by Bot:", Object.keys(nextNotableTrades));
        console.log("🔍 Futures Bot Details:", botStats.futures);

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
      } else {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: statsResponse.data?.error || "No data received from server",
        }));
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || error.message || "Failed to fetch trading data.",
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

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
              <Link to="/" className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">IMALI</Link>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">UPDATING</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>{formatNumber(totalTrades)} trades tracked</span>
              <span>•</span>
              <span>Polling every 30s</span>
              <span>•</span>
              <span>{activeBots} active bots</span>
              <Link to="/signup" className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-1 text-[10px] font-medium text-white">Join</Link>
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
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-2xl font-bold text-transparent">Trading in Public</h1>
          <p className="text-xs text-gray-500">
            {formatNumber(totalTrades)} total trades • {activeBots} active bots • Updating every 30 seconds
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-900">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
              Bot Activity (Last 7 Days)
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Weekly Activity</span>
          </div>
          <div className="h-64">
            <BotActivityChart trades={allTrades} />
          </div>
          <p className="mt-2 text-center text-[9px] text-gray-400">Relative trading activity based on P&L volume</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatMiniCard title="Total Trades" value={formatNumber(totalTrades)} valueClassName="text-purple-600" />
          <StatMiniCard title="Win Rate" value={`${winRate.toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${formatNumber(wins)}W / ${formatNumber(losses)}L`} />
        </div>

        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
            <span>🏆</span> Notable Trades by Bot
            <span className="ml-1 text-[10px] font-normal text-gray-400">Top winning trades by percentage return</span>
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {bots.map((bot) => (
              <BotPerformanceCard 
                key={bot} 
                bot={bot} 
                stats={botStats[bot]} 
                notableTrades={notableTrades} 
                onTradeClick={setSelectedTrade} 
              />
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
          🟡 Polling every 30 seconds • Last update: {data.lastUpdate?.toLocaleTimeString() || "—"}
        </div>
      </main>

      <TradeDetailModal trade={selectedTrade} isOpen={!!selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}
