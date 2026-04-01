// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
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

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatCurrency = (value) => {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCurrencySigned = (value) => {
  const n = safeNumber(value);
  const absValue = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n >= 0 ? "+" : "-"}$${absValue}`;
};

const formatPercent = (value) => {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
};

const formatNumber = (value) => {
  const n = safeNumber(value);
  return n.toLocaleString();
};

const formatCompact = (n) => {
  const num = safeNumber(n);
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
};

const timeAgo = (timestamp) => {
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
};

const getRiskColor = (risk) => {
  const riskLower = (risk || "").toLowerCase();
  if (riskLower.includes("low")) return "text-emerald-600 bg-emerald-50";
  if (riskLower.includes("medium")) return "text-amber-600 bg-amber-50";
  if (riskLower.includes("medium-high")) return "text-orange-600 bg-orange-50";
  if (riskLower.includes("high")) return "text-red-600 bg-red-50";
  return "text-gray-600 bg-gray-50";
};

const getBotIcon = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("okx")) return "🔷";
  return "🤖";
};

const getBotDisplayName = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name === "okx") return "OKX Spot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks") return "Stock Bot";
  if (name === "sniper") return "Sniper Bot";
  return botName || "Bot";
};

// Mock data for when API is not available
const MOCK_TRADES = [
  {
    id: "1",
    symbol: "BTC/USD",
    side: "buy",
    price: 45230.50,
    qty: 0.1,
    pnl_usd: 452.30,
    pnl_percent: 1.2,
    status: "closed",
    created_at: new Date().toISOString(),
    bot: "okx",
    risk_level: "medium",
    entry_reason: "AI detected bullish momentum"
  },
  {
    id: "2",
    symbol: "ETH/USD",
    side: "sell",
    price: 2850.75,
    qty: 1.5,
    pnl_usd: -125.30,
    pnl_percent: -2.8,
    status: "closed",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    bot: "futures",
    risk_level: "high",
    entry_reason: "Resistance level detected"
  },
  {
    id: "3",
    symbol: "SOL/USD",
    side: "buy",
    price: 125.50,
    qty: 10,
    pnl_usd: 85.30,
    pnl_percent: 6.8,
    status: "closed",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    bot: "stocks",
    risk_level: "low",
    entry_reason: "Support level bounce"
  },
  {
    id: "4",
    symbol: "AVAX/USD",
    side: "buy",
    price: 45.20,
    qty: 20,
    pnl_usd: 0,
    pnl_percent: 0,
    status: "open",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    bot: "sniper",
    risk_level: "medium",
    entry_reason: "Breakout pattern detected"
  }
];

const MOCK_SUMMARY = {
  total_trades: 23757,
  total_pnl: 2199.15,
  win_rate: 68.5,
  wins: 1160,
  losses: 394
};

const MOCK_BOTS = [
  { name: "okx", total_trades: 20951, wins: 1100, losses: 3, active: true },
  { name: "futures", total_trades: 1402, wins: 50, losses: 2, active: true },
  { name: "stocks", total_trades: 887, wins: 8, losses: 1, active: true },
  { name: "sniper", total_trades: 246, wins: 2, losses: 0, active: true }
];

// ============================================================
// CHART COMPONENT
// ============================================================
function DailyActivityChart({ trades = [] }) {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const dailyCount = {};
    
    trades.forEach(trade => {
      if (!trade.created_at) return;
      const date = new Date(trade.created_at).toISOString().split('T')[0];
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    });

    const dates = Object.keys(dailyCount).sort();
    const activityData = dates.map(date => dailyCount[date]);

    setChartData({
      labels: dates.map(d => {
        const date = new Date(d);
        return `${date.getMonth()+1}/${date.getDate()}`;
      }),
      datasets: [
        {
          label: "Daily Trades",
          data: activityData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.18)",
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#10b981",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    });
  }, [trades]);

  const options = {
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
        callbacks: {
          label: (context) => `Trades: ${context.raw}`,
        }
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: "#9ca3af", font: { size: 10 }, maxRotation: 45 },
      },
      y: {
        display: true,
        grid: { color: "rgba(229,231,235,0.5)" },
        ticks: { color: "#9ca3af", font: { size: 10 } },
        title: { display: true, text: "Number of Trades", color: "#9ca3af", font: { size: 10 } },
      },
    },
  };

  const hasData = chartData.datasets[0]?.data?.length > 0;

  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p className="text-sm">No activity data available</p>
      </div>
    );
  }

  return <Line data={chartData} options={options} />;
}

// ============================================================
// UI COMPONENTS
// ============================================================
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const StatMiniCard = ({ title, value, valueClassName = "text-gray-900", subtext }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
    <div className={`text-lg font-bold ${valueClassName}`}>{value}</div>
    <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{title}</div>
    {subtext && <div className="text-[9px] text-gray-400 mt-0.5">{subtext}</div>}
  </div>
);

const TradeRow = ({ trade, onClick, isNotable = false }) => {
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
        <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(timestamp)}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">Entry: {formatCurrency(trade.price || 0)}</div>
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
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PublicDashboard() {
  const { isConnected, socket } = useSocket();
  const [data, setData] = useState({
    trades: MOCK_TRADES, // Start with mock data
    summary: MOCK_SUMMARY,
    botStats: {},
    bots: MOCK_BOTS,
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("recent");

  // Calculate activeBots
  const activeBots = useMemo(() => {
    return data.bots?.filter(b => b.active !== false).length || 4;
  }, [data.bots]);

  const fetchData = useCallback(async () => {
    try {
      console.log("[PublicDashboard] Fetching live stats...");
      const response = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });
      if (response.data?.success) {
        const apiData = response.data.data;
        const trades = apiData.recent_trades || MOCK_TRADES;
        const summary = apiData.summary || MOCK_SUMMARY;
        const bots = apiData.bots || MOCK_BOTS;
        
        // Process bot stats
        const botStats = {};
        bots.forEach(bot => {
          const totalTrades = safeNumber(bot.total_trades);
          if (totalTrades === 0) return;
          
          const wins = safeNumber(bot.wins);
          const losses = safeNumber(bot.losses);
          const closedTrades = wins + losses;
          
          botStats[bot.name] = {
            total_trades: totalTrades,
            wins, losses,
            win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
          };
        });
        
        setData({
          trades: trades.length > 0 ? trades : MOCK_TRADES,
          summary,
          botStats,
          bots,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
      } else {
        setData(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("[PublicDashboard] Error fetching data:", error.message);
      setData(prev => ({ ...prev, loading: false, error: "Using demo data" }));
    }
  }, []);

  // Listen for live trades via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const unsubscribe = socket.onTrade((trade) => {
      console.log("[PublicDashboard] Live trade received:", trade);
      setData(prev => ({
        ...prev,
        trades: [trade, ...prev.trades].slice(0, 200),
        lastUpdate: new Date()
      }));
    });
    
    return unsubscribe;
  }, [socket, isConnected]);

  // Initial fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter and sort trades
  const allTrades = data.trades || MOCK_TRADES;
  const totalTrades = data.summary?.total_trades || MOCK_SUMMARY.total_trades;
  const wins = data.summary?.wins || MOCK_SUMMARY.wins;
  const losses = data.summary?.losses || MOCK_SUMMARY.losses;
  const winRate = data.summary?.win_rate || MOCK_SUMMARY.win_rate;
  const totalPnl = data.summary?.total_pnl || MOCK_SUMMARY.total_pnl;

  const isOpenTrade = (trade) => trade?.status === "open";
  const isClosedTrade = (trade) => trade?.status === "closed" || (trade?.pnl_usd !== 0 && trade?.pnl_usd !== undefined);

  const sortedTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return safeNumber(b.pnl_usd) - safeNumber(a.pnl_usd);
      }
      if (sortRecentTrades === "percent") {
        return Math.abs(safeNumber(b.pnl_percent)) - Math.abs(safeNumber(a.pnl_percent));
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [allTrades, sortRecentTrades]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return sortedTrades.filter(isOpenTrade);
    if (activeTab === "closed") return sortedTrades.filter(isClosedTrade);
    return sortedTrades;
  }, [activeTab, sortedTrades]);

  const tabs = [
    { id: "all", label: "All", count: allTrades.length },
    { id: "open", label: "Open", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", count: allTrades.filter(isClosedTrade).length },
  ];

  // Show loading only on first load
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
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span>{isConnected ? 'Live' : 'Polling'}</span>
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
          {data.lastUpdate && (
            <p className="text-gray-400 text-[9px] mt-1">Last updated: {data.lastUpdate.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatMiniCard
            title="Total Trades"
            value={formatNumber(totalTrades)}
            valueClassName="text-purple-600"
          />
          <StatMiniCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            valueClassName="text-emerald-600"
            subtext={`${formatNumber(wins)}W / ${formatNumber(losses)}L`}
          />
        </div>

        {/* Bot Status Section */}
        <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Bots</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.bots.map((bot) => (
              <div key={bot.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getBotIcon(bot.name)}</span>
                  <span className="text-xs font-medium text-gray-700">{getBotDisplayName(bot.name)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{bot.total_trades} trades</span>
                  <span className={`w-2 h-2 rounded-full ${bot.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
              </div>
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
          {data.lastUpdate ? `Last updated: ${data.lastUpdate.toLocaleTimeString()}` : "Waiting for data..."} • Data refreshes every 30 seconds
        </div>
      </main>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTrade(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900">Trade Details</h3>
              <button onClick={() => setSelectedTrade(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xl font-bold text-gray-900">{selectedTrade.symbol || "Unknown"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedTrade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {selectedTrade.side?.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedTrade.status === "closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                      {selectedTrade.status === "open" ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {timeAgo(selectedTrade.created_at)} • {getBotDisplayName(selectedTrade.bot)}
                  </div>
                </div>
                {selectedTrade.pnl_usd !== 0 && (
                  <div className="text-right">
                    <div className={`text-xl font-bold ${selectedTrade.pnl_usd > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrencySigned(selectedTrade.pnl_usd)}
                    </div>
                    <div className={`text-xs font-semibold ${selectedTrade.pnl_percent > 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatPercent(selectedTrade.pnl_percent)} return
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-100 pt-3">
                <div>
                  <div className="text-gray-500">Quantity</div>
                  <div className="font-semibold">{safeNumber(selectedTrade.qty).toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Entry Price</div>
                  <div className="font-semibold">{formatCurrency(selectedTrade.price || 0)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Exit Price</div>
                  <div className="font-semibold">{selectedTrade.exit_price ? formatCurrency(selectedTrade.exit_price) : "—"}</div>
                </div>
                <div>
                  <div className="text-gray-500">Risk Level</div>
                  <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRiskColor(selectedTrade.risk_level)}`}>
                    {(selectedTrade.risk_level || "medium").toUpperCase()}
                  </div>
                </div>
              </div>

              {selectedTrade.entry_reason && (
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-lg">🤖</span>
                    <span className="font-semibold text-sm text-gray-900">AI Analysis</span>
                  </div>
                  <p className="text-xs text-gray-700">{selectedTrade.entry_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
