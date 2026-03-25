// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
const WS_BASE = "wss://api.imali-defi.com";
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

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
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("spot")) return "💎";
  if (name.includes("okx")) return "🔷";
  if (name.includes("momentum")) return "🚀";
  if (name.includes("arbitrage")) return "⚡";
  return "🤖";
}

// Performance Chart Component
function PerformanceChart({ pnlHistory = [] }) {
  const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : [];
  const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
    const date = new Date(p.date);
    return `${date.getMonth()+1}/${date.getDate()}`;
  }) : [];

  if (values.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p className="text-sm">Loading chart data...</p>
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
      legend: { position: "top", labels: { boxWidth: 10, font: { size: 10 } } },
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
        ticks: { callback: (value) => formatCurrency(value), font: { size: 10 } },
        title: { display: false }
      },
      y1: {
        position: "right",
        grid: { display: false },
        ticks: { callback: (value) => formatCurrency(value), font: { size: 10 }, color: "#8b5cf6" },
        title: { display: false }
      },
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } }
    }
  };

  return <Bar data={chartData} options={options} />;
}

// Bot Performance Card Component
function BotPerformanceCard({ bot, stats, onTradeClick }) {
  const hasTrades = stats && (stats.total_trades > 0 || (stats.trades && stats.trades.length > 0));
  const totalPnL = stats?.total_pnl || 0;
  const winRate = stats?.win_rate || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const totalTrades = stats?.total_trades || 0;
  const closedTrades = stats?.closed_trades || 0;
  const openTrades = stats?.open_trades || 0;
  const bestReturn = stats?.best_return || 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getBotIcon(bot)}</span>
          <h3 className="font-bold text-gray-900">{bot}</h3>
          {stats?.status === "active" && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        {hasTrades ? (
          <span className="text-xs text-gray-500">{totalTrades.toLocaleString()} total trades</span>
        ) : (
          <span className="text-xs text-gray-400">Waiting for data</span>
        )}
      </div>

      {hasTrades ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrencySigned(totalPnL)}
              </div>
              <div className="text-[10px] text-gray-500">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{winRate.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{closedTrades.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Closed</div>
            </div>
          </div>
          
          {bestReturn > 0 && (
            <div className="text-center mb-2">
              <div className="text-xs text-gray-500">Best Return</div>
              <div className="text-sm font-bold text-green-600">{formatPercent(bestReturn)}</div>
            </div>
          )}

          {stats?.top_trades && stats.top_trades.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="text-xs font-semibold text-gray-600">🏆 Top Returns</div>
              {stats.top_trades.slice(0, 3).map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => onTradeClick(trade)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">{trade.symbol}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ${trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {trade.side?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      {timeAgo(trade.created_at)} • Entry: {formatCurrency(trade.price)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">{formatPercent(trade.pnl_percent)}</div>
                    <div className="text-[10px] text-gray-500">{formatCurrencySigned(trade.pnl_usd)}</div>
                  </div>
                </div>
              ))}
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
function TradeRow({ trade, onClick }) {
  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || trade.pnl_percentage || 0;
  const isWin = pnl > 0;
  const side = trade.side || "buy";
  const bot = trade.bot || "unknown";
  const timestamp = trade.created_at;
  const risk = trade.risk_level || "medium";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
  const isOpen = trade.status === "open";
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        !isOpen && pnl > 0 ? "bg-emerald-50 hover:bg-emerald-100" : 
        !isOpen && pnl < 0 ? "bg-red-50 hover:bg-red-100" : 
        "bg-gray-50 hover:bg-gray-100"
      }`}
      onClick={() => onClick(trade)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
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
            <div className={`text-[11px] font-medium ${pnlPercent > 0 ? "text-emerald-500" : pnlPercent < 0 ? "text-red-500" : "text-gray-400"}`}>
              {formatPercent(pnlPercent)}
            </div>
          </>
        ) : (
          <div className="font-semibold text-sm text-blue-600">Open</div>
        )}
      </div>
    </div>
  );
}

// Trade Detail Modal
function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || trade.pnl_percentage || 0;
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = trade.bot || "unknown";
  const timestamp = trade.created_at;
  const entryPrice = trade.price || 0;
  const exitPrice = trade.exit_price || trade.close_price;
  const qty = trade.qty || 0;
  const status = trade.status === "open" ? "Open" : "Closed";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || "AI detected favorable market conditions";
  const exitReason = trade.exit_reason || (status === "Closed" ? "Take profit / Stop loss triggered" : "Position still active");
  const strategy = trade.strategy || trade.bot || "Momentum";

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
            <div className="text-right">
              <div className={`text-xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(entryPrice)}
              </div>
              {pnl !== 0 && (
                <div className={`text-xs font-semibold ${pnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatPercent(pnlPercent)} return
                </div>
              )}
            </div>
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
              <div className="text-gray-500">Return %</div>
              <div className={`font-semibold ${pnlPercent > 0 ? "text-emerald-600" : pnlPercent < 0 ? "text-red-600" : "text-gray-600"}`}>
                {formatPercent(pnlPercent)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Strategy</div>
              <div className="font-semibold">{strategy}</div>
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
            {exitReason && (
              <div className="mt-2 pt-2 border-t border-indigo-200">
                <span className="text-[10px] text-gray-500">Exit Reason:</span>
                <p className="text-xs text-gray-600 mt-0.5">{exitReason}</p>
              </div>
            )}
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
    { name: "Total P&L", symbol: "💰", definition: "Total profit and loss across all trades." },
    { name: "Profit Factor", symbol: "⚖️", definition: "Gross profit divided by gross loss. Above 1.0 is profitable." },
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
    loading: true,
    error: null,
    lastUpdate: null,
    wsConnected: false
  });
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("percent");
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/`);
      
      ws.onopen = () => {
        console.log("🔌 WebSocket connected");
        setData(prev => ({ ...prev, wsConnected: true }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'trades' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'new_trade') {
            setData(prev => ({
              ...prev,
              trades: [message.trade, ...prev.trades],
              summary: message.summary || prev.summary,
              lastUpdate: new Date()
            }));
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };
      
      ws.onerror = (error) => console.error("WebSocket error:", error);
      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setData(prev => ({ ...prev, wsConnected: false }));
        reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket connection failed:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      console.log("🔄 Fetching bot activity...");
      
      // Fetch all data in parallel
      const [historyRes, botStatusRes, liveStatsRes] = await Promise.allSettled([
        axios.get(BOT_ACTIVITY_HISTORY_URL, { params: { days: 30, limit: 5000 }, timeout: 15000 }),
        axios.get(BOT_STATUS_URL, { timeout: 8000 }),
        axios.get(LIVE_STATS_URL, { timeout: 8000 })
      ]);

      let allTrades = [];
      let summary = {};
      let pnlHistory = [];
      let botStats = {};

      // Process history data
      if (historyRes.status === "fulfilled" && historyRes.value.data) {
        const historyData = historyRes.value.data;
        if (historyData.data) {
          allTrades = historyData.data.trades || [];
          summary = historyData.data.summary || {};
          pnlHistory = historyData.data.pnl_by_day || [];
        } else if (historyData.trades) {
          allTrades = historyData.trades || [];
          summary = historyData.summary || {};
          pnlHistory = historyData.pnl_by_day || [];
        }
      }

      // Process bot status from live-stats
      if (liveStatsRes.status === "fulfilled" && liveStatsRes.value.data) {
        const liveStats = liveStatsRes.value.data;
        
        // Extract bot stats from live stats
        const bots = ['Futures', 'Stocks', 'Sniper', 'OKX'];
        bots.forEach(bot => {
          const botKey = bot.toLowerCase();
          let botData = null;
          
          if (bot === 'Futures' && liveStats.futures) botData = liveStats.futures;
          else if (bot === 'Stocks' && liveStats.stocks) botData = liveStats.stocks;
          else if (bot === 'Sniper' && liveStats.sniper) botData = liveStats.sniper;
          else if (bot === 'OKX' && liveStats.okx) botData = liveStats.okx;
          
          if (botData) {
            // Calculate bot-specific stats from trades
            const botTrades = allTrades.filter(t => 
              (t.bot || t.source || "").toLowerCase().includes(botKey)
            );
            
            const botTotalPnL = botTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
            const botWins = botTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
            const botLosses = botTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).length;
            const botWinRate = botTrades.length > 0 ? (botWins / botTrades.length) * 100 : 0;
            
            // Get top trades by percent return
            const topTrades = [...botTrades]
              .filter(t => t.status !== "open" && (t.pnl_percent || t.pnl_percentage || 0) > 0)
              .sort((a, b) => (b.pnl_percent || b.pnl_percentage || 0) - (a.pnl_percent || a.pnl_percentage || 0))
              .slice(0, 5);
            
            const bestReturn = topTrades[0]?.pnl_percent || topTrades[0]?.pnl_percentage || 0;
            
            botStats[bot] = {
              total_trades: botTrades.length,
              total_pnl: botTotalPnL,
              wins: botWins,
              losses: botLosses,
              win_rate: botWinRate,
              closed_trades: botTrades.filter(t => t.status === "closed").length,
              open_trades: botTrades.filter(t => t.status === "open").length,
              best_return: bestReturn,
              top_trades: topTrades,
              status: botData.status === "operational" ? "active" : "inactive"
            };
          } else {
            // Fallback bot stats
            botStats[bot] = {
              total_trades: 0,
              total_pnl: 0,
              wins: 0,
              losses: 0,
              win_rate: 0,
              closed_trades: 0,
              open_trades: 0,
              best_return: 0,
              top_trades: [],
              status: "inactive"
            };
          }
        });
      }

      setData({
        trades: allTrades,
        summary: summary,
        pnlHistory: pnlHistory,
        botStats: botStats,
        loading: false,
        error: null,
        lastUpdate: new Date(),
        wsConnected: false
      });
      
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    connectWebSocket();
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchData, connectWebSocket]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const summary = data.summary || {};
  const pnlHistory = data.pnlHistory || [];
  const botStats = data.botStats || {};

  const totalTrades = summary.total_trades || allTrades.length;
  const totalPnL = summary.total_pnl || allTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
  const wins = summary.wins || allTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
  const losses = summary.losses || allTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const profitFactor = summary.profit_factor || (() => {
    const grossProfit = allTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
    const grossLoss = Math.abs(allTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0));
    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  })();

  const activeBots = Object.values(botStats).filter(bot => bot.total_trades > 0).length;

  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return Math.abs(b.pnl_usd || 0) - Math.abs(a.pnl_usd || 0);
      }
      if (sortRecentTrades === "percent") {
        const aPercent = Math.abs(a.pnl_percent || a.pnl_percentage || 0);
        const bPercent = Math.abs(b.pnl_percent || b.pnl_percentage || 0);
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

  const bots = ['Futures', 'Stocks', 'Sniper', 'OKX'];

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
              {data.wsConnected && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
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
          <p className="text-gray-500 text-xs">{formatNumber(totalTrades)} trades tracked • Real-time updates • {activeBots} active bots</p>
        </div>

        {/* Performance Chart */}
        {pnlHistory.length > 0 && (
          <div className="mb-5 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-900">Performance History</h2>
              <button 
                onClick={() => setShowMetricDefinitions(true)}
                className="text-[10px] text-indigo-600"
              >
                ⓘ
              </button>
            </div>
            <div className="h-64">
              <PerformanceChart pnlHistory={pnlHistory} />
            </div>
            <p className="text-center text-[9px] text-gray-400 mt-2">Daily P&L (bars) and Cumulative (line)</p>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
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
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Total P&L" 
            value={formatCurrencySigned(totalPnL)} 
            icon="💰" 
            color={totalPnL >= 0 ? "emerald" : "red"}
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Profit Factor" 
            value={profitFactor.toFixed(2)} 
            icon="⚖️" 
            color="blue"
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* Bot Performance Section */}
        <div className="mb-5">
          <h2 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900">
            <span>🤖</span>
            All {activeBots} Bots Performance
            <span className="text-[10px] font-normal text-gray-400 ml-1">
              Live trading data • {activeBots} active bots • Highest returns shown
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Recent Trades Feed */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Recent Trades
            </h2>
            <div className="flex gap-1">
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      activeTab === tab.id ? "bg-emerald-600 text-white" : "text-gray-500"
                    }`}
                  >
                    {tab.label} ({formatNumber(tab.count)})
                  </button>
                ))}
              </div>
              <select
                value={sortRecentTrades}
                onChange={(e) => setSortRecentTrades(e.target.value)}
                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-100 border-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="percent">📊 Highest % Return</option>
                <option value="date">📅 Date</option>
                <option value="pnl">💰 P&L</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredTrades.length > 0 ? (
              filteredTrades.slice(0, 50).map((trade, i) => (
                <TradeRow key={trade.id || i} trade={trade} onClick={setSelectedTrade} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-2xl mb-1">📭</div>
                <p className="text-xs">No trades found</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-3">
          <p>AI-powered signals • Live PostgreSQL-backed trade data • {activeBots} active bots • Transparent performance</p>
          <div className="flex justify-center gap-3 mt-1">
            <Link to="/" className="text-indigo-600">Home</Link>
            <Link to="/pricing" className="text-indigo-600">Pricing</Link>
            <Link to="/referrals" className="text-amber-600">Referrals</Link>
          </div>
        </div>
      </main>

      <MetricDefinitions isOpen={showMetricDefinitions} onClose={() => setShowMetricDefinitions(false)} />
      <TradeDetailModal trade={selectedTrade} isOpen={selectedTrade !== null} onClose={() => setSelectedTrade(null)} />
    </div>
  );
}
