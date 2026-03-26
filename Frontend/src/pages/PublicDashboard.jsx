// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TRADES_URL = `${API_BASE}/api/trades/postgres`;

function formatCurrency(value) {
  const n = Number(value) || 0;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencySigned(value) {
  const n = Number(value) || 0;
  const absValue = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n >= 0 ? "+" : "-"}$${absValue}`;
}

function formatPercent(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatNumber(value) {
  const n = Number(value) || 0;
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
  if (name.includes("stock") || name.includes("equity")) return "📈";
  if (name.includes("futures") || name.includes("future") || name.includes("perp")) return "📊";
  if (name.includes("sniper") || name.includes("snip") || name.includes("dex")) return "🎯";
  if (name.includes("okx") || name.includes("spot")) return "🔷";
  return "🤖";
}

function getBotDisplayName(botName) {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock") || name.includes("equity")) return "Stock Bot";
  if (name.includes("futures") || name.includes("future") || name.includes("perp")) return "Futures Bot";
  if (name.includes("sniper") || name.includes("snip") || name.includes("dex")) return "Sniper Bot";
  if (name.includes("okx") || name.includes("spot")) return "OKX Spot";
  return botName || "Unknown Bot";
}

// Performance Chart Component
function PerformanceChart({ pnlHistory = [], botName = "All Bots" }) {
  const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : [];
  const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
    const date = new Date(p.date);
    return `${date.getMonth()+1}/${date.getDate()}`;
  }) : [];

  if (values.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        <p className="text-xs">No historical data for {botName}</p>
      </div>
    );
  }

  let cumulative = 0;
  const cumulativeValues = values.map(v => {
    cumulative += v;
    return cumulative;
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "Daily P&L",
        data: values,
        type: 'bar',
        backgroundColor: values.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
        borderColor: values.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
        yAxisID: "y",
        order: 2,
      },
      {
        label: "Cumulative P&L",
        data: cumulativeValues,
        type: 'line',
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "white",
        pointBorderWidth: 1,
        fill: true,
        tension: 0.3,
        yAxisID: "y1",
        order: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", labels: { boxWidth: 10, font: { size: 9 } } },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.label === "Daily P&L") {
              return `Daily: ${formatCurrencySigned(context.raw)}`;
            }
            return `Cumulative: ${formatCurrencySigned(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        position: "left",
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { callback: (value) => formatCurrency(value), font: { size: 8 } },
        title: { display: false }
      },
      y1: {
        position: "right",
        grid: { display: false },
        ticks: { callback: (value) => formatCurrency(value), font: { size: 8 }, color: "#8b5cf6" },
        title: { display: false }
      },
      x: { grid: { display: false }, ticks: { font: { size: 8 }, maxRotation: 45 } }
    }
  };

  return <Bar data={chartData} options={options} />;
}

// Bot Performance Card Component with Historical Chart
function BotPerformanceCard({ bot, stats, onTradeClick }) {
  const [expanded, setExpanded] = useState(false);
  const hasTrades = stats && (stats.total_trades > 0);
  const winRate = stats?.win_rate || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const totalTrades = stats?.total_trades || 0;
  const closedTrades = stats?.closed_trades || 0;
  const openTrades = stats?.open_trades || 0;
  const bestReturn = stats?.best_return || 0;
  const showBestReturn = bestReturn > 0;
  const pnlHistory = stats?.pnl_history || [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getBotIcon(bot)}</span>
          <h3 className="font-bold text-gray-900">{bot}</h3>
          {hasTrades && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasTrades && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              {expanded ? "▼ Less" : "▶ Details"}
            </button>
          )}
          <span className="text-xs text-gray-500">{totalTrades.toLocaleString()} trades</span>
        </div>
      </div>

      {hasTrades ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{winRate.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{closedTrades.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Closed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{openTrades.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Open</div>
            </div>
          </div>
          
          {showBestReturn && (
            <div className="text-center mb-2">
              <div className="text-xs text-gray-500">Best Return</div>
              <div className="text-sm font-bold text-green-600">{formatPercent(bestReturn)}</div>
            </div>
          )}

          {expanded && pnlHistory.length > 0 && (
            <div className="mt-3 mb-3 pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-600 mb-2">📊 Historical Performance</div>
              <div className="h-40">
                <PerformanceChart pnlHistory={pnlHistory} botName={bot} />
              </div>
            </div>
          )}

          {stats?.top_trades && stats.top_trades.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="text-xs font-semibold text-gray-600">🏆 Top Returns</div>
              {stats.top_trades.slice(0, expanded ? 5 : 3).map((trade, idx) => {
                const pnlPercent = trade.pnl_percent || 0;
                if (pnlPercent <= 0) return null;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100"
                    onClick={() => onTradeClick(trade)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">{trade.symbol}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded-full ${trade.side === "buy" ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                          {trade.side?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5">
                        {timeAgo(trade.created_at)} • Entry: {formatCurrency(trade.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">{formatPercent(pnlPercent)}</div>
                      <div className="text-[10px] text-gray-500">{formatCurrencySigned(trade.pnl_usd || 0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="py-6 text-center">
          <div className="text-3xl mb-2 opacity-50">🤖</div>
          <p className="text-xs text-gray-400">Waiting for first trade...</p>
        </div>
      )}
    </div>
  );
}

// Trade Row Component
function TradeRow({ trade, onClick, isNotable = false }) {
  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || 0;
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
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
        {(score > 0 || confidence > 0) && (
          <div className="text-[9px] text-gray-400 mt-0.5">
            Score: {score.toFixed(1)} • Conf: {confidence.toFixed(0)}%
          </div>
        )}
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

  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || 0;
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = getBotDisplayName(trade.bot);
  const timestamp = trade.created_at;
  const entryPrice = trade.price || 0;
  const exitPrice = trade.exit_price;
  const qty = trade.qty || 0;
  const status = trade.status === "open" ? "Open" : "Closed";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
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
            {score > 0 && (
              <div>
                <div className="text-gray-500">AI Score</div>
                <div className="font-semibold text-indigo-600">{score.toFixed(1)} / 100</div>
              </div>
            )}
            {confidence > 0 && (
              <div>
                <div className="text-gray-500">Confidence</div>
                <div className="font-semibold text-purple-600">{confidence.toFixed(0)}%</div>
              </div>
            )}
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500">{title}</p>
          <p className={`text-base sm:text-lg font-bold mt-0.5 ${colorClasses[color]}`}>{value}</p>
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
    { name: "Win Rate", symbol: "📈", definition: "Percentage of trades that were profitable." },
    { name: "Total Trades", symbol: "🔄", definition: "Total number of trades executed." },
    { name: "Notable Trades", symbol: "🏆", definition: "Top performing trades with highest percentage returns." },
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
    pnlHistory: [],
    botStats: {},
    notableTrades: [],
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("recent");

  const fetchData = useCallback(async () => {
    try {
      console.log("🔄 Fetching trades from PostgreSQL...");
      
      const response = await axios.get(TRADES_URL, {
        params: { limit: 5000 },
        timeout: 15000
      });

      if (response.data && response.data.success) {
        const trades = response.data.trades || [];
        const summary = response.data.summary || {};
        
        // Log actual bot names for debugging
        const uniqueBotNames = [...new Set(trades.map(t => t.bot).filter(Boolean))];
        console.log("🤖 Unique bot names in data:", uniqueBotNames);
        console.log("📊 Total trades:", trades.length);
        
        // Calculate overall daily P&L for chart
        const overallDailyPnL = {};
        trades.forEach(trade => {
          if (trade.created_at && trade.pnl_usd) {
            const date = new Date(trade.created_at).toISOString().split('T')[0];
            overallDailyPnL[date] = (overallDailyPnL[date] || 0) + (trade.pnl_usd || 0);
          }
        });
        
        const overallPnlHistory = Object.entries(overallDailyPnL).map(([date, daily_pnl]) => ({
          date,
          daily_pnl,
          pnl: daily_pnl
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Group trades by bot dynamically
        const tradesByBot = {};
        
        trades.forEach(trade => {
          const botRaw = trade.bot || "unknown";
          const botDisplay = getBotDisplayName(botRaw);
          
          if (!tradesByBot[botDisplay]) {
            tradesByBot[botDisplay] = [];
          }
          tradesByBot[botDisplay].push(trade);
        });
        
        console.log("📊 Trades by bot:", Object.keys(tradesByBot).map(bot => ({
          bot,
          count: tradesByBot[bot].length
        })));
        
        // Calculate stats for each bot with historical data
        const botStats = {};
        
        Object.entries(tradesByBot).forEach(([botName, botTrades]) => {
          const closedTrades = botTrades.filter(t => t.status === "closed");
          const openTrades = botTrades.filter(t => t.status === "open");
          const wins = closedTrades.filter(t => (t.pnl_usd || 0) > 0);
          const losses = closedTrades.filter(t => (t.pnl_usd || 0) < 0);
          const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
          
          // Calculate bot-specific daily P&L
          const botDailyPnL = {};
          botTrades.forEach(trade => {
            if (trade.created_at && trade.pnl_usd && trade.status === "closed") {
              const date = new Date(trade.created_at).toISOString().split('T')[0];
              botDailyPnL[date] = (botDailyPnL[date] || 0) + (trade.pnl_usd || 0);
            }
          });
          
          const botPnlHistory = Object.entries(botDailyPnL).map(([date, daily_pnl]) => ({
            date,
            daily_pnl,
            pnl: daily_pnl
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Get top trades by percent return
          const topTrades = [...closedTrades]
            .filter(t => (t.pnl_percent || 0) > 0)
            .sort((a, b) => (b.pnl_percent || 0) - (a.pnl_percent || 0))
            .slice(0, 10);
          
          botStats[botName] = {
            total_trades: botTrades.length,
            wins: wins.length,
            losses: losses.length,
            win_rate: winRate,
            closed_trades: closedTrades.length,
            open_trades: openTrades.length,
            best_return: topTrades[0]?.pnl_percent || 0,
            top_trades: topTrades,
            pnl_history: botPnlHistory,
            status: botTrades.length > 0 ? "active" : "inactive"
          };
        });
        
        // Calculate notable trades (top 10 across all bots)
        const allClosedTrades = trades.filter(t => t.status === "closed" && (t.pnl_percent || 0) > 0);
        const notableTrades = [...allClosedTrades]
          .sort((a, b) => (b.pnl_percent || 0) - (a.pnl_percent || 0))
          .slice(0, 10);
        
        console.log("✅ Bot stats calculated:", Object.keys(botStats).length, "bots");
        console.log("🏆 Notable trades found:", notableTrades.length);
        
        setData({
          trades: trades,
          summary: summary,
          botStats: botStats,
          pnlHistory: overallPnlHistory,
          notableTrades: notableTrades,
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
  const pnlHistory = data.pnlHistory || [];
  const botStats = data.botStats || {};
  const notableTrades = data.notableTrades || [];

  const totalTrades = allTrades.length;
  const closedTradesOnly = allTrades.filter(t => t.status === "closed");
  const wins = closedTradesOnly.filter(t => (t.pnl_usd || 0) > 0).length;
  const losses = closedTradesOnly.filter(t => (t.pnl_usd || 0) < 0).length;
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

  const activeBots = Object.keys(botStats).length;

  // Sort trades
  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return (b.pnl_usd || 0) - (a.pnl_usd || 0);
      }
      if (sortRecentTrades === "percent") {
        const aPercent = Math.abs(a.pnl_percent || 0);
        const bPercent = Math.abs(b.pnl_percent || 0);
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

  const bots = ['Futures Bot', 'Stock Bot', 'Sniper Bot', 'OKX Spot'];

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
            Live Trading Dashboard
          </h1>
          <p className="text-gray-500 text-xs">{formatNumber(totalTrades)} total trades • {activeBots} active bots • Real-time updates</p>
        </div>

        {/* Performance Chart */}
        {pnlHistory.length > 0 ? (
          <div className="mb-5 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-900">Overall Performance History</h2>
              <button 
                onClick={() => setShowMetricDefinitions(true)}
                className="text-[10px] text-indigo-600"
              >
                ⓘ
              </button>
            </div>
            <div className="h-64">
              <PerformanceChart pnlHistory={pnlHistory} botName="All Bots" />
            </div>
            <p className="text-center text-[9px] text-gray-400 mt-2">Daily P&L (bars) and Cumulative (line)</p>
          </div>
        ) : (
          <div className="mb-5 bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm">Loading historical performance data...</p>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <MetricCard 
            title="Win Rate" 
            value={`${winRate.toFixed(1)}%`} 
            icon="📈" 
            color="emerald"
            subtext={`${formatNumber(wins)}W / ${formatNumber(losses)}L`}
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Total Trades" 
            value={formatNumber(totalTrades)} 
            icon="🔄" 
            color="purple"
            subtext={`${formatNumber(closedTradesOnly.length)} closed`}
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* Notable Trades Section */}
        {notableTrades.length > 0 && (
          <div className="mb-5">
            <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
              <span>🏆</span>
              Notable Trades
              <span className="text-[10px] font-normal text-gray-400 ml-1">
                Top {notableTrades.length} highest percentage returns
              </span>
            </h2>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-sm">
              <div className="space-y-2">
                {notableTrades.slice(0, 5).map((trade, idx) => (
                  <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} isNotable={true} />
                ))}
              </div>
              {notableTrades.length > 5 && (
                <details className="mt-3">
                  <summary className="text-xs text-amber-600 cursor-pointer hover:text-amber-700 text-center">
                    Show {notableTrades.length - 5} more notable trades...
                  </summary>
                  <div className="mt-2 space-y-2">
                    {notableTrades.slice(5).map((trade, idx) => (
                      <TradeRow key={trade.id || idx} trade={trade} onClick={setSelectedTrade} isNotable={true} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Bot Performance Section */}
        <div className="mb-5">
          <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
            <span>🤖</span>
            All {activeBots} Bots Performance
            <span className="text-[10px] font-normal text-gray-400 ml-1">
              Click "Details" to see historical charts • Top returns shown
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bots.map((bot) => (
              <BotPerformanceCard
                key={bot}
                bot={bot}
                stats={botStats[bot] || {
                  total_trades: 0,
                  wins: 0,
                  losses: 0,
                  win_rate: 0,
                  closed_trades: 0,
                  open_trades: 0,
                  best_return: 0,
                  top_trades: [],
                  pnl_history: []
                }}
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