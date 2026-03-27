// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

// Safe number formatting functions
function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

function formatCurrency(value) {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencySigned(value) {
  const n = safeNumber(value);
  const absValue = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n >= 0 ? "+" : "-"}$${absValue}`;
}

function formatPercent(value) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatNumber(value) {
  const n = safeNumber(value);
  return n.toLocaleString();
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
  if (riskLower.includes("medium")) return "text-amber-600 bg-amber-50";
  if (riskLower.includes("medium-high")) return "text-orange-600 bg-orange-50";
  if (riskLower.includes("high")) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

function getBotIcon(botName) {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("okx") || name.includes("spot")) return "🔷";
  return "🤖";
}

function getBotDisplayName(botName) {
  const name = (botName || "").toLowerCase();
  if (name === "okx") return "OKX Crypto";
  if (name === "spot") return "Spot Trading";
  if (name === "sniper") return "Sniper Bot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks") return "Stock Bot";
  return botName || "Bot";
}

// Cumulative Win/Loss Chart Component
function WinLossChart({ trades = [] }) {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    // Group trades by date and calculate cumulative wins and losses
    const dailyData = {};
    
    trades.forEach(trade => {
      if (!trade.created_at) return;
      const date = new Date(trade.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { wins: 0, losses: 0 };
      }
      const pnl = safeNumber(trade.pnl_usd);
      if (pnl > 0) {
        dailyData[date].wins++;
      } else if (pnl < 0) {
        dailyData[date].losses++;
      }
    });

    const dates = Object.keys(dailyData).sort();
    
    let cumulativeWins = 0;
    let cumulativeLosses = 0;
    
    const winData = [];
    const lossData = [];
    
    dates.forEach(date => {
      cumulativeWins += dailyData[date].wins;
      cumulativeLosses += dailyData[date].losses;
      winData.push(cumulativeWins);
      lossData.push(cumulativeLosses);
    });

    setChartData({
      labels: dates.map(d => {
        const date = new Date(d);
        return `${date.getMonth()+1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: "Cumulative Wins",
          data: winData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "white",
          pointBorderWidth: 2,
          fill: true,
          tension: 0.3,
        },
        {
          label: "Cumulative Losses",
          data: lossData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "#ef4444",
          pointBorderColor: "white",
          pointBorderWidth: 2,
          fill: true,
          tension: 0.3,
        }
      ]
    });
  }, [trades]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 } } },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 10 } },
        title: { display: true, text: "Number of Trades", font: { size: 10 } }
      },
      x: {
        ticks: { font: { size: 9 }, maxRotation: 45 }
      }
    }
  };

  const hasData = chartData.datasets[0]?.data?.length > 0;

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p className="text-sm">No win/loss data available</p>
      </div>
    );
  }

  return <Line data={chartData} options={options} />;
}

// Bot Performance Card Component
function BotPerformanceCard({ bot, stats, onTradeClick }) {
  const hasTrades = stats && (stats.total_trades > 0);
  const winRate = safeNumber(stats?.win_rate);
  const totalTrades = safeNumber(stats?.total_trades);
  const bestReturn = safeNumber(stats?.best_return);
  const wins = safeNumber(stats?.wins);
  const losses = safeNumber(stats?.losses);

  // Skip bots with 0 trades
  if (!hasTrades) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getBotIcon(bot)}</span>
          <h3 className="font-bold text-gray-900">{getBotDisplayName(bot)}</h3>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <span className="text-xs text-gray-500">{totalTrades.toLocaleString()} trades</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">{winRate.toFixed(1)}%</div>
          <div className="text-[10px] text-gray-500">Win Rate</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-600">{wins.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">Wins</div>
        </div>
      </div>

      {bestReturn > 0 && (
        <div className="text-center pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">Best Trade</div>
          <div className="text-sm font-bold text-green-600">{formatPercent(bestReturn)}</div>
        </div>
      )}
    </div>
  );
}

// Trade Row Component
function TradeRow({ trade, onClick, isNotable = false }) {
  const pnl = safeNumber(trade.pnl_usd);
  const pnlPercent = safeNumber(trade.pnl_percent);
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const isOpen = trade.status === "open";
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isNotable ? "border-2 border-amber-300 bg-amber-50/30" :
        !isOpen && pnl > 0 ? "bg-emerald-50 hover:bg-emerald-100" : 
        !isOpen && pnl < 0 ? "bg-red-50 hover:bg-red-100" : 
        isOpen ? "bg-blue-50 hover:bg-blue-100" : 
        "bg-gray-50 hover:bg-gray-100"
      }`}
      onClick={() => onClick(trade)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {isNotable && <span className="text-amber-500 text-xs">🏆</span>}
          <span className="font-semibold text-sm text-gray-900">{trade.symbol || "Unknown"}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {side.toUpperCase()}
          </span>
          <span className="text-[9px] text-gray-400">{getBotIcon(bot)} {bot}</span>
          {isOpen && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
          )}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {timeAgo(timestamp)}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Entry: {formatCurrency(trade.price || 0)}
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        {!isOpen ? (
          <>
            <div className={`font-semibold text-sm ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
              {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(trade.price || 0)}
            </div>
            {pnlPercent !== 0 && (
              <div className={`text-[11px] font-medium ${pnlPercent > 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatPercent(pnlPercent)}
              </div>
            )}
          </>
        ) : (
          <div className="font-semibold text-sm text-blue-600">Open Position</div>
        )}
      </div>
    </div>
  );
}

// Trade Detail Modal
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xl font-bold text-gray-900">{symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {side.toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                  {status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {timeAgo(timestamp)} • {bot}
              </div>
            </div>
            {pnl > 0 && (
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">{formatCurrencySigned(pnl)}</div>
                <div className="text-xs font-semibold text-green-600">{formatPercent(pnlPercent)} return</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-100 pt-3">
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{qty.toFixed(6)}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Price</div>
              <div className="font-semibold">{formatCurrency(entryPrice)}</div>
            </div>
            <div>
              <div className="text-gray-500">Exit Price</div>
              <div className="font-semibold">{exitPrice ? formatCurrency(exitPrice) : "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRiskColor(risk)}`}>
                {risk.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-sm text-gray-900">AI Analysis</span>
            </div>
            <p className="text-xs text-gray-700">{entryReason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, subtext, color = "emerald", onClick }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  const displayValue = typeof value === 'number' ? value : safeNumber(value);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500">{title}</p>
          <p className={`text-base sm:text-lg font-bold mt-0.5 ${colorClasses[color]}`}>
            {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
          </p>
          {subtext && <p className="text-[9px] text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        <div className="text-xl opacity-60">{icon}</div>
      </div>
    </div>
  );
}

function MetricDefinitions({ isOpen, onClose }) {
  if (!isOpen) return null;

  const metrics = [
    { name: "Win/Loss", symbol: "📊", definition: "Cumulative winning trades vs losing trades over time." },
    { name: "Total Trades", symbol: "🔄", definition: "Total number of trades executed across all bots." },
    { name: "Notable Trades", symbol: "🏆", definition: "Top performing trades with highest percentage returns, ranked by bot." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">📊 Metric Definitions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{metric.symbol}</span>
                <span className="font-semibold text-sm text-gray-900">{metric.name}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 ml-7">{metric.definition}</p>
            </div>
          ))}
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
    notableTrades: [],
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("percent");

  const fetchData = useCallback(async () => {
    try {
      console.log("🔄 Fetching public dashboard data...");
      
      const response = await axios.get(PUBLIC_STATS_URL, {
        timeout: 15000
      });

      if (response.data && response.data.success) {
        const apiData = response.data.data;
        const trades = apiData.recent_trades || [];
        const summary = apiData.summary || {};
        
        // Get all trades - the API returns recent trades only
        const allTrades = [...trades];
        
        console.log(`📊 Total trades: ${summary.total_trades || allTrades.length}`);
        
        // Process bot stats
        const botStats = {};
        const mainBots = ["okx", "futures", "stocks", "spot", "sniper"];
        
        (apiData.bots || []).forEach(bot => {
          if (!mainBots.includes(bot.name)) return;
          const totalTrades = safeNumber(bot.total_trades);
          if (totalTrades === 0) return;
          
          const wins = safeNumber(bot.wins);
          const losses = safeNumber(bot.losses);
          const closedTrades = wins + losses;
          const totalPnL = safeNumber(bot.total_pnl);
          
          // Find best trade for this bot from recent trades
          let bestReturn = 0;
          (apiData.recent_trades || []).forEach(trade => {
            if (trade.bot === bot.name) {
              const pnlPercent = safeNumber(trade.pnl_percent);
              if (pnlPercent > bestReturn) bestReturn = pnlPercent;
            }
          });
          
          botStats[bot.name] = {
            total_trades: totalTrades,
            wins: wins,
            losses: losses,
            win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
            best_return: bestReturn,
            avg_return: totalTrades > 0 ? totalPnL / totalTrades : 0,
            top_trades: []
          };
        });
        
        // Create notable trades by bot with highest percent returns
        const notableByBot = {};
        allTrades.forEach(trade => {
          const pnlPercent = safeNumber(trade.pnl_percent);
          if (pnlPercent > 0 && trade.bot && mainBots.includes(trade.bot)) {
            if (!notableByBot[trade.bot]) notableByBot[trade.bot] = [];
            notableByBot[trade.bot].push({ ...trade, pnl_percent: pnlPercent });
          }
        });
        
        // Take top 5 from each bot for better display
        const allNotable = [];
        Object.keys(notableByBot).forEach(bot => {
          const topTrades = notableByBot[bot]
            .sort((a, b) => safeNumber(b.pnl_percent) - safeNumber(a.pnl_percent))
            .slice(0, 5);
          topTrades.forEach(trade => {
            allNotable.push({
              ...trade,
              bot_display: getBotDisplayName(bot),
              bot_icon: getBotIcon(bot)
            });
          });
        });
        
        // Sort all notable trades by percent return
        allNotable.sort((a, b) => safeNumber(b.pnl_percent) - safeNumber(a.pnl_percent));
        
        console.log("✅ Dashboard data loaded:", {
          totalTrades: summary.total_trades,
          bots: Object.keys(botStats).length,
          notableTrades: allNotable.length,
          tradesCount: allTrades.length
        });
        
        setData({
          trades: allTrades,
          summary: summary,
          botStats: botStats,
          notableTrades: allNotable,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
      } else {
        setData(prev => ({ ...prev, loading: false, error: "No data received from server" }));
      }
      
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || error.message || "Failed to fetch trading data" 
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const allTrades = data.trades || [];
  const botStats = data.botStats || {};
  const notableTrades = data.notableTrades || [];

  const totalTrades = safeNumber(data.summary.total_trades || allTrades.length);
  const wins = safeNumber(data.summary.wins);
  const losses = safeNumber(data.summary.losses);
  const totalPnL = safeNumber(data.summary.total_pnl);

  const activeBots = Object.keys(botStats).length;

  // Sort trades by percent for recent trades
  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd);
      }
      if (sortRecentTrades === "percent") {
        const aPercent = Math.abs(safeNumber(a.pnl_percent));
        const bPercent = Math.abs(safeNumber(b.pnl_percent));
        return bPercent - aPercent;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [allTrades, sortRecentTrades]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return sortedRecentTrades.filter(t => t.status === "open");
    if (activeTab === "closed") return sortedRecentTrades.filter(t => t.status === "closed");
    return sortedRecentTrades;
  }, [activeTab, sortedRecentTrades]);

  const tabs = [
    { id: "all", label: "All", count: allTrades.length },
    { id: "open", label: "Open", count: allTrades.filter(t => t.status === "open").length },
    { id: "closed", label: "Closed", count: allTrades.filter(t => t.status === "closed").length },
  ];

  const bots = ["okx", "futures", "stocks", "spot", "sniper"].filter(bot => botStats[bot]?.total_trades > 0);

  if (data.loading && !data.lastUpdate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>{formatNumber(totalTrades)} trades tracked</span>
              <span>•</span>
              <span>Live updates every 30s</span>
              <span>•</span>
              <span>{activeBots} active bots</span>
              <Link to="/signup" className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-medium">
                Join
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-4">
        {data.error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-600 text-xs">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            Trading in Public
          </h1>
          <p className="text-gray-500 text-xs">{formatNumber(totalTrades)} total trades • {activeBots} active bots • Real-time updates</p>
        </div>

        {/* Win/Loss Chart */}
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm text-gray-900">Win/Loss Over Time</h2>
            <button 
              onClick={() => setShowMetricDefinitions(true)}
              className="text-[10px] text-indigo-600"
            >
              ⓘ
            </button>
          </div>
          <div className="h-64">
            <WinLossChart trades={allTrades} />
          </div>
          <p className="text-center text-[9px] text-gray-400 mt-2">Cumulative winning trades vs losing trades</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <MetricCard 
            title="Total Trades" 
            value={formatNumber(totalTrades)} 
            icon="🔄" 
            color="purple"
            subtext={`${formatNumber(allTrades.filter(t => t.status === "closed").length)} closed`}
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Total P&L" 
            value={formatCurrency(totalPnL)} 
            icon="💰" 
            color={totalPnL >= 0 ? "emerald" : "red"}
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* Notable Trades Section - Organized by Bot */}
        {notableTrades.length > 0 && (
          <div className="mb-5">
            <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
              <span>🏆</span>
              Notable Trades by Bot
              <span className="text-[10px] font-normal text-gray-400 ml-1">
                Top 5 highest percentage returns per bot
              </span>
            </h2>
            
            {/* Group notable trades by bot */}
            {bots.map(bot => {
              const botNotables = notableTrades.filter(t => t.bot === bot);
              if (botNotables.length === 0) return null;
              
              return (
                <div key={bot} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getBotIcon(bot)}</span>
                    <h3 className="font-semibold text-gray-800">{getBotDisplayName(bot)}</h3>
                    <span className="text-xs text-gray-400">Top {botNotables.length} trades</span>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                    <div className="space-y-2">
                      {botNotables.map((trade, idx) => (
                        <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} isNotable={true} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bot Performance Section */}
        <div className="mb-5">
          <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
            <span>🤖</span>
            Active Bots Performance
            <span className="text-[10px] font-normal text-gray-400 ml-1">
              Win rate and best trades
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <BotPerformanceCard
                key={bot}
                bot={bot}
                stats={botStats[bot]}
                onTradeClick={setSelectedTrade}
              />
            ))}
          </div>
        </div>

        {/* Recent Trades Section */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-gray-900">Recent Trades</h2>
                <div className="flex gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                        activeTab === tab.id
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Sort by:</span>
                <select
                  value={sortRecentTrades}
                  onChange={(e) => setSortRecentTrades(e.target.value)}
                  className="text-[10px] border border-gray-300 rounded-md px-2 py-0.5 bg-white"
                >
                  <option value="recent">Most Recent</option>
                  <option value="percent">Highest % Return</option>
                  <option value="pnl">Highest $ P&L</option>
                </select>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade, idx) => (
                <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} />
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No trades found</p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-[9px] text-gray-400 mt-4 pb-4">
          Last updated: {data.lastUpdate?.toLocaleTimeString() || "—"} • Data refreshes every 30 seconds
        </div>
      </main>

      {/* Modals */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />
      <MetricDefinitions
        isOpen={showMetricDefinitions}
        onClose={() => setShowMetricDefinitions(false)}
      />
    </div>
  );
}
