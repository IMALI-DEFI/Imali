// src/pages/PublicDashboard.jsx

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

const API_BASE = "https://api.imali-defi.com";
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;

function formatCurrency(value) {
  const n = Number(value) || 0;
  return `$${n.toFixed(2)}`;
}

function formatCurrencySigned(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
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

function PerformanceChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : [];
    const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
      const date = new Date(p.date);
      return `${date.getMonth()+1}/${date.getDate()}`;
    }) : [];

    if (values.length === 0) {
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

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.slice(-30),
        datasets: [
          {
            label: "Daily P&L",
            data: values.slice(-30),
            backgroundColor: values.slice(-30).map(v => v >= 0 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"),
            borderColor: values.slice(-30).map(v => v >= 0 ? "#10b981" : "#ef4444"),
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Cumulative P&L",
            data: cumulativeValues.slice(-30),
            type: "line",
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            borderWidth: 3,
            pointRadius: 3,
            pointBackgroundColor: "#6366f1",
            pointBorderColor: "white",
            pointBorderWidth: 2,
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
          legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.label === "Daily P&L") {
                  return `Daily: ${formatCurrencySigned(context.raw)}`;
                } else {
                  return `Cumulative: ${formatCurrencySigned(context.raw)}`;
                }
              }
            }
          }
        },
        scales: {
          y: {
            position: "left",
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { callback: (value) => formatCurrency(value) },
            title: { display: true, text: "Daily P&L", color: "#6b7280" }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { callback: (value) => formatCurrency(value), color: "#6366f1" },
            title: { display: true, text: "Cumulative P&L", color: "#6366f1" }
          },
          x: { grid: { display: false }, ticks: { color: "#6b7280", maxRotation: 45 } }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return <canvas ref={canvasRef} />;
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
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {title}
            <span className="text-gray-300 text-[10px]">ⓘ</span>
          </p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext && <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className="text-2xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function TradeRow({ trade, onClick }) {
  const pnl = trade.pnl_usd || 0;
  const isWin = pnl > 0;
  const side = trade.side || "buy";
  const bot = trade.bot || "unknown";
  const timestamp = trade.created_at;
  const risk = trade.risk_level || "medium";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isWin ? "bg-emerald-50 hover:bg-emerald-100" : pnl < 0 ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-gray-100"
      }`}
      onClick={() => onClick(trade)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {side.toUpperCase()}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRiskColor(risk)}`}>
            {risk}
          </span>
          <span className="text-[10px] text-gray-400">{bot}</span>
          {trade.status === "open" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
          )}
        </div>
        {score > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            Score: {score.toFixed(1)} • Conf: {confidence.toFixed(0)}%
          </div>
        )}
        <div className="text-xs text-gray-400">
          {timeAgo(timestamp)} • {formatCurrency(trade.price || 0)} • Qty: {trade.qty?.toFixed(4) || 0}
        </div>
        {trade.entry_reason && (
          <div className="text-[10px] text-gray-500 mt-1 truncate">
            {trade.entry_reason}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {trade.status !== "open" && pnl !== 0 ? (
          <>
            <div className={`font-semibold ${isWin ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrencySigned(pnl)}
            </div>
            <div className={`text-xs ${isWin ? "text-emerald-500" : "text-red-500"}`}>
              {pnl > 0 ? "+" : ""}{(trade.pnl_percent || 0).toFixed(1)}%
            </div>
          </>
        ) : trade.status === "open" ? (
          <div className="font-semibold text-blue-600">Open</div>
        ) : (
          <div className="font-semibold text-gray-600">{formatCurrency(trade.price || 0)}</div>
        )}
      </div>
    </div>
  );
}

function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || 0;
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = trade.bot || "unknown";
  const timestamp = trade.created_at;
  const price = trade.price || 0;
  const qty = trade.qty || 0;
  const status = trade.status === "open" ? "Open" : "Closed";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || "AI detected opportunity";
  const exitReason = trade.exit_reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-gray-900">{symbol}</div>
              <div className="text-sm text-gray-500 mt-1">
                {timeAgo(timestamp)} • {bot}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(price)}
              </div>
              {pnl !== 0 && (
                <div className={`text-sm ${pnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.abs(pnlPercent).toFixed(1)}% return
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
            <div>
              <div className="text-gray-500">Side</div>
              <div className={`font-semibold ${side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                {side.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{qty.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500">Price</div>
              <div className="font-semibold">{formatCurrency(price)}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-semibold">{status}</div>
            </div>
            {score > 0 && (
              <div>
                <div className="text-gray-500">AI Score</div>
                <div className="font-semibold">{score.toFixed(1)}</div>
              </div>
            )}
            {confidence > 0 && (
              <div>
                <div className="text-gray-500">Confidence</div>
                <div className="font-semibold">{confidence.toFixed(0)}%</div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(risk)}`}>
                {risk.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-gray-900">AI Analysis</span>
            </div>
            <p className="text-gray-700 text-sm">{entryReason}</p>
            {exitReason && (
              <div className="mt-2 pt-2 border-t border-indigo-200">
                <span className="text-xs text-gray-500">Exit Reason:</span>
                <p className="text-xs text-gray-600 mt-1">{exitReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricDefinitions({ isOpen, onClose }) {
  if (!isOpen) return null;

  const metrics = [
    { name: "Win Rate", symbol: "📈", definition: "Percentage of trades that were profitable." },
    { name: "Total Trades", symbol: "🔄", definition: "Total number of trades executed across all bots." },
    { name: "Profit Factor", symbol: "💰", definition: "Gross profit divided by gross loss. Above 1.5 is excellent." },
    { name: "Sharpe Ratio", symbol: "⚖️", definition: "Risk-adjusted return measure. Above 1.0 is good." },
    { name: "Max Drawdown", symbol: "📉", definition: "Largest peak-to-trough decline. Lower is better." },
    { name: "AI Score", symbol: "🤖", definition: "Machine learning score (0-100). Higher = stronger signal." },
    { name: "Confidence", symbol: "📊", definition: "AI confidence level in the signal." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">📊 Metric Definitions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{metric.symbol}</span>
                <span className="font-semibold text-gray-900">{metric.name}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-7">{metric.definition}</p>
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
    lastUpdate: null
  });
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔄 Fetching bot activity history...");
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
            lastUpdate: new Date()
          });
        } else if (response.data && response.data.trades) {
          setData({
            trades: response.data.trades || [],
            summary: response.data.summary || {},
            pnlHistory: response.data.pnl_by_day || [],
            loading: false,
            error: null,
            lastUpdate: new Date()
          });
        } else {
          setData(prev => ({
            ...prev,
            loading: false,
            error: "No data received"
          }));
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const allTrades = data.trades || [];
  const summary = data.summary || {};
  const pnlHistory = data.pnlHistory || [];

  const totalTrades = summary.total_trades || allTrades.length;
  const totalPnl = summary.total_pnl || 0;
  const wins = summary.wins || 0;
  const losses = summary.losses || 0;
  const winRate = summary.win_rate || 0;

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(t => t.status === "open");
    if (activeTab === "closed") return allTrades.filter(t => t.status === "closed");
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(t => t.status === "open").length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(t => t.status === "closed").length },
  ];

  if (data.loading && !data.lastUpdate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading trading dashboard...</p>
          <p className="text-xs text-gray-400 mt-2">Fetching {totalTrades} trades from history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                {totalTrades} Total Trades
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Real-time data</span>
              </div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all">
                Join the Journey →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {data.error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-amber-600 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            Live Trading Dashboard
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
            Complete trading history • {totalTrades} total trades tracked
          </p>
        </div>

        {/* Performance Chart */}
        {pnlHistory.length > 0 && (
          <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="font-bold text-xl text-gray-900">Performance History</h2>
                <p className="text-xs text-gray-400 mt-1">Daily P&L (bars) and Cumulative Performance (line)</p>
              </div>
              <button 
                onClick={() => setShowMetricDefinitions(true)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
              >
                📊 Understanding these metrics
              </button>
            </div>
            <div className="h-96">
              <PerformanceChart pnlHistory={pnlHistory} />
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-gray-800">Key Performance Metrics</h2>
            <button 
              onClick={() => setShowMetricDefinitions(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>ⓘ</span> What do these mean?
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard 
              title="Win Rate" 
              value={`${winRate.toFixed(1)}%`} 
              icon="📈" 
              color="emerald"
              subtext={`${wins}W / ${losses}L`}
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total Trades" 
              value={totalTrades} 
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
              title="Avg Trade" 
              value={formatCurrencySigned(totalTrades > 0 ? totalPnl / totalTrades : 0)} 
              icon="⚖️" 
              color="blue"
              onClick={() => setShowMetricDefinitions(true)}
            />
          </div>
        </div>

        {/* Trades Feed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Live Trade Feed
              <span className="text-xs font-normal text-gray-400">{totalTrades} total trades</span>
            </h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                    activeTab === tab.id ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="ml-1 text-[8px] bg-gray-200 text-gray-700 px-1.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTrades.length > 0 ? (
              filteredTrades.map((trade, i) => (
                <TradeRow key={trade.id || i} trade={trade} onClick={setSelectedTrade} />
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm">No trades found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>
            Complete trading history • AI-powered signals • Real-time updates
            <br />
            <Link to="/" className="text-indigo-600 hover:underline">Home</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-600 hover:underline">Pricing</Link>
            {" • "}
            <Link to="/referrals" className="text-amber-600 hover:underline">Referrals</Link>
          </p>
        </div>
      </main>

      {/* Metric Definitions Modal */}
      <MetricDefinitions 
        isOpen={showMetricDefinitions} 
        onClose={() => setShowMetricDefinitions(false)} 
      />

      {/* Trade Detail Modal */}
      <TradeDetailModal
        trade={selectedTrade}
        isOpen={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}
