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

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;

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

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencySigned(value) {
  const n = safeNumber(value);
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const bot = normalizeBotName(trade?.bot || trade?.bot_name || fallbackBot);
  return {
    id: trade?.id || `${bot}-${trade?.symbol || "unknown"}-${Date.now()}`,
    symbol: trade?.symbol || "Unknown",
    side: String(trade?.side || "buy").toLowerCase(),
    price: safeNumber(trade?.price),
    entry_price: safeNumber(trade?.entry_price ?? trade?.price),
    exit_price: trade?.exit_price ? safeNumber(trade.exit_price) : null,
    qty: safeNumber(trade?.qty, 0),
    pnl_usd: safeNumber(trade?.pnl_usd ?? trade?.pnl),
    pnl_percent: safeNumber(trade?.pnl_percent),
    created_at: trade?.created_at || trade?.timestamp || new Date().toISOString(),
    status: trade?.status || "closed",
    risk_level: trade?.risk_level || "medium",
    entry_reason: trade?.entry_reason || trade?.ai_analysis || "",
    exit_reason: trade?.exit_reason || "",
    bot,
  };
}

function sortTrades(trades, mode = "recent") {
  const items = [...trades];
  if (mode === "pnl") {
    return items.sort((a, b) => safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd));
  }
  if (mode === "percent") {
    return items.sort((a, b) => Math.abs(safeNumber(b.pnl_percent)) - Math.abs(safeNumber(a.pnl_percent)));
  }
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function buildChartSeries(trades) {
  const dailyData = {};
  trades.forEach(trade => {
    if (!trade?.created_at) return;
    const date = new Date(trade.created_at).toISOString().split('T')[0];
    dailyData[date] = (dailyData[date] || 0) + 1;
  });
  
  const sortedDates = Object.keys(dailyData).sort();
  return {
    labels: sortedDates.map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    values: sortedDates.map(d => dailyData[d]),
  };
}

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
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
      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">{trade.symbol}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {trade.side.toUpperCase()}
            </span>
            <span className="text-[10px] text-gray-400">{getBotIcon(trade.bot)} {getBotLabel(trade.bot)}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Entry {formatCurrency(trade.entry_price)}
            {trade.exit_price !== null ? ` • Exit ${formatCurrency(trade.exit_price)}` : ""}
          </div>
          <div className="mt-1 text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
            {formatCurrencySigned(pnl)}
          </div>
          <div className={`text-[11px] font-semibold ${pnlPct > 0 ? "text-emerald-500" : pnlPct < 0 ? "text-red-500" : "text-gray-500"}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Trade Details</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{trade.symbol}</span>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {trade.side.toUpperCase()}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                  {trade.status === "open" ? "Open" : "Closed"}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {timeAgo(trade.created_at)} • {getBotLabel(trade.bot)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-700"}`}>
                {formatCurrencySigned(pnl)}
              </div>
              <div className={`text-sm font-semibold ${pnlPct > 0 ? "text-emerald-500" : pnlPct < 0 ? "text-red-500" : "text-gray-500"}`}>
                {formatPercent(pnlPct)} return
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500">Quantity</div>
              <div className="text-lg font-semibold">{safeNumber(trade.qty).toFixed(6)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Entry Price</div>
              <div className="text-lg font-semibold">{formatCurrency(trade.entry_price)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Exit Price</div>
              <div className="text-lg font-semibold">{trade.exit_price ? formatCurrency(trade.exit_price) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Risk Level</div>
              <div className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {trade.risk_level.toUpperCase()}
              </div>
            </div>
          </div>
          
          {(trade.entry_reason || trade.exit_reason) && (
            <div className="bg-indigo-50 rounded-xl p-4 mt-2">
              <div className="font-semibold text-indigo-800 mb-2">🤖 AI Analysis</div>
              {trade.entry_reason && <p className="text-sm text-gray-700">{trade.entry_reason}</p>}
              {trade.exit_reason && (
                <div className="mt-3 pt-3 border-t border-indigo-200">
                  <div className="text-xs font-semibold text-amber-700">Exit Reason</div>
                  <p className="text-sm text-gray-700">{trade.exit_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboard() {
  const { isConnected, socket, subscribeToTrades } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ total_trades: 0, wins: 0, losses: 0, win_rate: 0 });
  const [allTrades, setAllTrades] = useState([]);
  const [bots, setBots] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [sortMode, setSortMode] = useState("recent");
  const [visibleCount, setVisibleCount] = useState(50);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, botRes] = await Promise.allSettled([
        axios.get(PUBLIC_STATS_URL, { timeout: 10000 }),
        axios.get(BOT_STATUS_URL, { timeout: 10000 }),
      ]);
      
      let liveData = null;
      if (statsRes.status === "fulfilled" && statsRes.value?.data?.success) {
        liveData = statsRes.value.data.data;
      }
      
      let botData = null;
      if (botRes.status === "fulfilled" && botRes.value?.data?.success) {
        botData = botRes.value.data.data;
      }
      
      const trades = Array.isArray(liveData?.recent_trades) 
        ? liveData.recent_trades.map(t => mapTrade(t))
        : [];
      
      const mergedBots = BOT_ORDER.map(botKey => {
        const botInfo = liveData?.bots?.find(b => normalizeBotName(b?.name) === botKey);
        return {
          key: botKey,
          name: getBotLabel(botKey),
          icon: getBotIcon(botKey),
          total_trades: safeNumber(botInfo?.total_trades),
          wins: safeNumber(botInfo?.wins),
          losses: safeNumber(botInfo?.losses),
        };
      }).filter(b => b.total_trades > 0);
      
      setSummary({
        total_trades: safeNumber(liveData?.summary?.total_trades, trades.length),
        wins: safeNumber(liveData?.summary?.wins),
        losses: safeNumber(liveData?.summary?.losses),
        win_rate: safeNumber(liveData?.summary?.win_rate),
      });
      
      setAllTrades(sortTrades(trades, sortMode));
      setBots(mergedBots);
      setLastUpdate(new Date());
      setError("");
    } catch (err) {
      console.error("[PublicDashboard] Fetch error:", err);
      setError("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [sortMode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!isConnected) return;
    subscribeToTrades?.();
  }, [isConnected, subscribeToTrades]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const unsubscribe = socket.onTrade?.((data) => {
      const trade = data?.trade || data;
      const mapped = mapTrade(trade);
      setAllTrades(prev => sortTrades([mapped, ...prev], sortMode));
      setLastUpdate(new Date());
    });
    return () => unsubscribe?.();
  }, [socket, isConnected, sortMode]);

  const chartSeries = useMemo(() => buildChartSeries(allTrades), [allTrades]);
  const chartData = {
    labels: chartSeries.labels,
    datasets: [{
      data: chartSeries.values,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.16)",
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBorderColor: "#10b981",
      pointBackgroundColor: "#ffffff",
      borderWidth: 3,
    }],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", titleColor: "#fff", bodyColor: "#d1fae5" } },
    scales: { x: { ticks: { color: "#9ca3af", font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: "#9ca3af", font: { size: 10 } }, grid: { color: "rgba(229,231,235,0.5)" } } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" /><p className="text-gray-500">Loading Trading Dashboard...</p></div>
      </div>
    );
  }

  const visibleTrades = allTrades.slice(0, visibleCount);
  const totalPnL = allTrades.reduce((sum, t) => sum + t.pnl_usd, 0);
  const winCount = allTrades.filter(t => t.pnl_usd > 0).length;
  const lossCount = allTrades.filter(t => t.pnl_usd < 0).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">IMALI</Link>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
            <span>{isConnected ? "Live" : "Polling"}</span>
            <Link to="/signup" className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-1 font-medium text-white">Join</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">⚠️ {error}</div>}
        
        <div className="text-center mb-5">
          <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-3xl font-extrabold text-transparent">Trading in Public</h1>
          <p className="mt-1 text-sm text-gray-500">Live trading activity across all bots</p>
          {lastUpdate && <p className="mt-1 text-[10px] text-gray-400">Last updated: {lastUpdate.toLocaleTimeString()}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard title="Total Trades" value={formatNumber(summary.total_trades)} valueClassName="text-purple-600" />
          <StatCard title="Total P&L" value={formatCurrencySigned(totalPnL)} valueClassName={totalPnL >= 0 ? "text-emerald-600" : "text-red-600"} />
          <StatCard title="Win Rate" value={`${safeNumber(summary.win_rate).toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${formatNumber(winCount)}W / ${formatNumber(lossCount)}L`} />
          <StatCard title="Active Bots" value={bots.length} valueClassName="text-indigo-600" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 mb-5">
          <Card className="p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Trading Activity</h2>
            <div className="h-64"><Line data={chartData} options={chartOptions} /></div>
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Active Bots</h2>
            <div className="space-y-2">
              {bots.map(bot => (
                <div key={bot.key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2"><span className="text-lg">{bot.icon}</span><div><div className="text-sm font-semibold">{bot.name}</div><div className="text-[10px] text-gray-500">{formatNumber(bot.total_trades)} trades</div></div></div>
                  <div className="text-right"><div className="text-sm font-semibold text-emerald-600">{bot.wins}W</div><div className="text-xs text-red-600">{bot.losses}L</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-900">Recent Trades</h2>
            <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Sort by:</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs">
                <option value="recent">Most Recent</option><option value="pnl">Highest $ P&L</option><option value="percent">Highest % Return</option>
              </select>
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {visibleTrades.map(trade => <TradeCard key={trade.id} trade={trade} onClick={setSelectedTrade} />)}
            {visibleTrades.length === 0 && <div className="p-8 text-center text-gray-400">No trades yet</div>}
          </div>
          {allTrades.length > visibleCount && (
            <div className="border-t border-gray-200 p-4 text-center">
              <button onClick={() => setVisibleCount(prev => prev + 50)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">Show More ({allTrades.length - visibleCount} remaining)</button>
            </div>
          )}
        </Card>
      </main>
      <TradeModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}
