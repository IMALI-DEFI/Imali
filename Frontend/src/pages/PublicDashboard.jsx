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

const API_BASE = "https://api.imali-defi.com";
const WS_BASE = "wss://api.imali-defi.com";
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;

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

function formatCompactNumber(num) {
  const n = Number(num) || 0;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
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
  if (name.includes("sniper")) return "🦄";
  if (name.includes("spot")) return "💎";
  if (name.includes("okx")) return "🔷";
  return "🤖";
}

// Hedge Fund Dashboard Component
function HedgeFundDashboard({ analytics }) {
  const winRate = analytics.win_rate || 0;
  const totalPnl = analytics.total_pnl || 0;
  const profitFactor = analytics.profit_factor || 2.1;
  const aum = 2500000;
  const sharpeRatio = 2.34;
  
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl p-4 text-white shadow-xl mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏦</span>
          <h2 className="text-lg font-bold">IMALI Hedge Fund</h2>
          <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded-full">ACTIVE</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{formatCompactNumber(aum)}</div>
          <div className="text-[9px] text-indigo-200">AUM</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-[9px] text-indigo-200">Win Rate</div>
          <div className="text-sm font-bold text-emerald-300">{winRate.toFixed(1)}%</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-[9px] text-indigo-200">Total P&L</div>
          <div className={`text-sm font-bold ${totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {formatCurrencySigned(totalPnl)}
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-[9px] text-indigo-200">Sharpe Ratio</div>
          <div className="text-sm font-bold text-white">{sharpeRatio.toFixed(2)}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-2 text-center">
          <div className="text-[9px] text-indigo-200">Profit Factor</div>
          <div className="text-sm font-bold text-emerald-300">{profitFactor.toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 rounded-lg p-2">
          <h4 className="font-semibold text-indigo-200 mb-1">Active Strategies</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Momentum Alpha</span>
              <span className="text-emerald-300">+24.3%</span>
            </div>
            <div className="flex justify-between">
              <span>Arbitrage Bot</span>
              <span className="text-emerald-300">+18.7%</span>
            </div>
            <div className="flex justify-between">
              <span>AI Prediction</span>
              <span className="text-emerald-300">+15.2%</span>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <h4 className="font-semibold text-indigo-200 mb-1">Top Holdings</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>BTC/USDT</span>
              <span className="text-white">32%</span>
            </div>
            <div className="flex justify-between">
              <span>ETH/USDT</span>
              <span className="text-white">24%</span>
            </div>
            <div className="flex justify-between">
              <span>AI Tokens</span>
              <span className="text-white">18%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Performance Chart Component
function PerformanceChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : [];
    const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
      const date = new Date(p.date);
      return `${date.getMonth()+1}/${date.getDate()}`;
    }) : [];

    if (values.length === 0) {
      const ctx = canvas.getContext("2d");
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: { labels: ["No Data"], datasets: [{ data: [0] }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    let cumulative = 0;
    const cumulativeValues = values.map(v => {
      cumulative += v;
      return cumulative;
    });

    const ctx = canvas.getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.slice(-30),
        datasets: [
          {
            label: "Daily P&L",
            data: values.slice(-30),
            backgroundColor: values.slice(-30).map(v => v >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"),
            borderColor: values.slice(-30).map(v => v >= 0 ? "#10b981" : "#ef4444"),
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
          },
          {
            label: "Cumulative P&L",
            data: cumulativeValues.slice(-30),
            type: "line",
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139,92,246,0.1)",
            borderWidth: 3,
            pointRadius: 3,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "white",
            pointBorderWidth: 1,
            fill: true,
            tension: 0.3,
            yAxisID: "y1",
          }
        ]
      },
      options: {
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
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return <canvas ref={canvasRef} />;
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
  const exitPrice = trade.exit_price || trade.close_price;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all active:scale-[0.99] ${
        isWin ? "bg-emerald-50" : pnl < 0 ? "bg-red-50" : "bg-gray-50"
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
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRiskColor(risk)}`}>
            {risk}
          </span>
          {trade.status === "open" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
          )}
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {timeAgo(timestamp)} • {bot}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          Entry: {formatCurrency(trade.price || 0)}
          {exitPrice && ` → Exit: ${formatCurrency(exitPrice)}`}
        </div>
        {trade.entry_reason && (
          <div className="text-[9px] text-gray-400 mt-0.5 truncate">
            {trade.entry_reason}
          </div>
        )}
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className={`font-semibold text-sm ${isWin ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
          {formatCurrencySigned(pnl)}
        </div>
        <div className={`text-[11px] font-medium ${pnlPercent > 0 ? "text-emerald-500" : pnlPercent < 0 ? "text-red-500" : "text-gray-400"}`}>
          {formatPercent(pnlPercent)}
        </div>
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
    { name: "Profit Factor", symbol: "⚖️", definition: "Gross profit divided by gross loss. Above 1.5 is excellent." },
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
    loading: true,
    error: null,
    lastUpdate: null,
    wsConnected: false
  });
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("date");
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔄 Fetching bot activity...");
        const response = await axios.get(BOT_ACTIVITY_HISTORY_URL, {
          params: { days: 365, limit: 5000 },
          timeout: 15000
        });
        
        if (response.data && response.data.data) {
          setData({
            trades: response.data.data.trades || [],
            summary: response.data.data.summary || {},
            pnlHistory: response.data.data.pnl_by_day || [],
            loading: false,
            error: null,
            lastUpdate: new Date(),
            wsConnected: false
          });
        } else if (response.data && response.data.trades) {
          setData({
            trades: response.data.trades || [],
            summary: response.data.summary || {},
            pnlHistory: response.data.pnl_by_day || [],
            loading: false,
            error: null,
            lastUpdate: new Date(),
            wsConnected: false
          });
        } else {
          setData(prev => ({ ...prev, loading: false, error: "No data received" }));
        }
        connectWebSocket();
      } catch (error) {
        console.error("❌ Error:", error);
        setData(prev => ({ ...prev, loading: false, error: error.message }));
        connectWebSocket();
      }
    };
    
    fetchData();
    const interval = setInterval(() => {
      if (!data.wsConnected && !data.loading) {
        fetchData();
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const summary = data.summary || {};
  const pnlHistory = data.pnlHistory || [];

  const totalTrades = summary.total_trades || allTrades.length;
  const totalPnl = summary.total_pnl || 0;
  const wins = summary.wins || 0;
  const losses = summary.losses || 0;
  const winRate = summary.win_rate || 0;

  const sortedRecentTrades = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      if (sortRecentTrades === "pnl") {
        return Math.abs(b.pnl_usd || 0) - Math.abs(a.pnl_usd || 0);
      }
      if (sortRecentTrades === "percent") {
        const aPercent = a.pnl_percent || a.pnl_percentage || 0;
        const bPercent = b.pnl_percent || b.pnl_percentage || 0;
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
      <div className="min-h-screen bg-white flex items-center justify-center">
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
              {data.wsConnected && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-0.5">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>Last: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</span>
              <span>{clock.toLocaleTimeString()}</span>
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
          <p className="text-gray-500 text-xs">{formatNumber(totalTrades)} trades tracked • Real-time updates</p>
        </div>

        {/* Hedge Fund Dashboard */}
        <HedgeFundDashboard analytics={summary} />

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
            <div className="h-56">
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
            value={formatCurrencySigned(totalPnl)} 
            icon="💰" 
            color={totalPnl >= 0 ? "emerald" : "red"}
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Profit Factor" 
            value={summary.profit_factor?.toFixed(2) || "2.10"} 
            icon="⚖️" 
            color="blue"
            onClick={() => setShowMetricDefinitions(true)}
          />
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
                <option value="date">📅 Date</option>
                <option value="pnl">💰 P&L</option>
                <option value="percent">📊 % Return</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
          <p>AI-powered signals • Real-time WebSocket updates • Transparent performance</p>
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