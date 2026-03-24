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
  Filler,
  RadialLinearScale
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

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
  Filler,
  RadialLinearScale
);

const API_BASE = "https://api.imali-defi.com";
const WS_BASE = "wss://api.imali-defi.com";
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;

// Animation helper
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function formatCurrency(value) {
  const n = Number(value) || 0;
  return `$${n.toFixed(2)}`;
}

function formatCurrencySigned(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

function formatPercent(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
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
  if (name.includes("momentum")) return "🚀";
  if (name.includes("arbitrage")) return "⚡";
  return "🤖";
}

// Enhanced Performance Chart with multiple visualizations
function EnhancedPerformanceChart({ pnlHistory = [] }) {
  const [activeView, setActiveView] = useState("bars");
  const [animatedData, setAnimatedData] = useState({ values: [], cumulativeValues: [] });
  const animationRef = useRef(null);

  useEffect(() => {
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : [];
    
    const targetValues = values;

    const animate = (startTime) => {
      const duration = 1000;
      const animateFrame = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);
        
        const currentValues = targetValues.map(v => v * eased);
        let currentCumulative = 0;
        const currentCumulativeValues = currentValues.map(v => {
          currentCumulative += v;
          return currentCumulative;
        });
        
        setAnimatedData({ values: currentValues, cumulativeValues: currentCumulativeValues });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateFrame);
        }
      };
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animateFrame);
    };

    animate(performance.now());

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [pnlHistory]);

  const values = animatedData.values.length ? animatedData.values : (pnlHistory.length > 0 ? pnlHistory.map(p => p.daily_pnl || p.pnl || 0) : []);
  const cumulativeValues = animatedData.cumulativeValues.length ? animatedData.cumulativeValues : (() => {
    let cum = 0;
    return values.map(v => { cum += v; return cum; });
  })();
  
  const labels = pnlHistory.length > 0 ? pnlHistory.map(p => {
    const date = new Date(p.date);
    return `${date.getMonth()+1}/${date.getDate()}`;
  }) : [];

  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const totalPnL = cumulativeValues[cumulativeValues.length - 1] || 0;
  const bestDay = Math.max(...values, 0);
  const worstDay = Math.min(...values, 0);

  const barChartData = {
    labels: labels.slice(-30),
    datasets: [
      {
        label: "Daily P&L",
        data: values.slice(-30),
        backgroundColor: values.slice(-30).map(v => 
          v >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"
        ),
        borderColor: values.slice(-30).map(v => v >= 0 ? "#10b981" : "#ef4444"),
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      }
    ]
  };

  const lineChartData = {
    labels: labels.slice(-30),
    datasets: [
      {
        label: "Cumulative P&L",
        data: cumulativeValues.slice(-30),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.1)",
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "white",
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const areaChartData = {
    labels: labels.slice(-30),
    datasets: [
      {
        label: "Daily P&L",
        data: values.slice(-30),
        borderColor: "#10b981",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(16,185,129,0.5)");
          gradient.addColorStop(1, "rgba(16,185,129,0.05)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#10b981",
      }
    ]
  };

  const getChartData = () => {
    switch(activeView) {
      case "bars": return barChartData;
      case "line": return lineChartData;
      case "area": return areaChartData;
      default: return barChartData;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 }, usePointStyle: true } },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#ddd",
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${formatCurrencySigned(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        position: "left",
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { 
          callback: (value) => formatCurrency(value),
        },
        title: { display: true, text: "P&L ($)", color: "#6b7280", font: { size: 12 } }
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: "#6b7280", maxRotation: 45, font: { size: 10 } } 
      }
    }
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        ...chartOptions.scales.y,
        title: { display: true, text: "Cumulative P&L ($)", color: "#8b5cf6", font: { size: 12 } }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("bars")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === "bars" 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📊 Bar Chart
          </button>
          <button
            onClick={() => setActiveView("line")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === "line" 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            📈 Cumulative Line
          </button>
          <button
            onClick={() => setActiveView("area")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === "area" 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🌊 Area Chart
          </button>
        </div>
        
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-500">Total P&L</div>
            <div className={`text-xl font-bold ${totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrencySigned(totalPnL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Best Day</div>
            <div className="text-xl font-bold text-emerald-600">+{formatCurrency(bestDay)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500">Worst Day</div>
            <div className="text-xl font-bold text-red-600">{formatCurrencySigned(worstDay)}</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        {activeView === "line" ? (
          <Line data={lineChartData} options={lineChartOptions} />
        ) : activeView === "area" ? (
          <Line data={areaChartData} options={chartOptions} />
        ) : (
          <Bar data={barChartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
}

// Enhanced Trade Detail Modal with all fields including percent return
function EnhancedTradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || trade.pnl_percentage || 0;
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const bot = trade.bot || "unknown";
  const timestamp = trade.created_at;
  const entryPrice = trade.price || 0;
  const exitPrice = trade.exit_price || null;
  const qty = trade.qty || 0;
  const status = trade.status === "open" ? "Open" : "Closed";
  const score = trade.overall_score || 0;
  const confidence = trade.confidence || 0;
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || "AI detected favorable market conditions";
  const exitReason = trade.exit_reason || (status === "Closed" ? "Take profit / Stop loss triggered" : "Position still active");
  const strategy = trade.strategy || trade.bot || "Momentum";
  const exchange = trade.exchange || "OKX";

  // Reasoning based on score and confidence
  const getReasoning = () => {
    if (score >= 70) {
      return "Based on strong technical analysis and positive market sentiment, the AI identified a high-probability entry with multiple confirming signals.";
    } else if (score >= 55) {
      return "Technical indicators aligned with favorable market conditions, suggesting a moderate probability of success with managed risk.";
    } else {
      return "AI detected a potential opportunity with acceptable risk-reward ratio based on recent price action and market structure.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Trade Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Header with Symbol and P&L */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{symbol}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {side.toUpperCase()}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${status === "Closed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600"}`}>
                  {status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {timeAgo(timestamp)} • {bot}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(entryPrice)}
              </div>
              {pnl !== 0 && (
                <div className={`text-sm font-semibold ${pnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatPercent(pnlPercent)} return
                </div>
              )}
            </div>
          </div>

          {/* Trade Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
            <div>
              <div className="text-gray-500">Side</div>
              <div className={`font-semibold ${side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                {side.toUpperCase()}
              </div>
            </div>
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
              <div className="text-gray-500">Bot / Strategy</div>
              <div className="font-semibold">{bot} • {strategy}</div>
            </div>
            <div>
              <div className="text-gray-500">Exchange</div>
              <div className="font-semibold">{exchange}</div>
            </div>
            <div>
              <div className="text-gray-500">Risk Level</div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(risk)}`}>
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

          {/* AI Analysis Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤖</span>
              <span className="font-bold text-gray-900">AI Decision Analysis</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Entry Reason</div>
                <p className="text-gray-700 text-sm mt-1">{entryReason}</p>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mt-3">Exit Reason</div>
                <p className="text-gray-700 text-sm mt-1">{exitReason}</p>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mt-3">Confidence Reasoning</div>
                <p className="text-gray-700 text-sm mt-1">{getReasoning()}</p>
              </div>
            </div>
          </div>

          {/* Metrics with Percent Return Highlighted */}
          <div className="grid grid-cols-4 gap-3 pt-2">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">P&L</div>
              <div className={`text-lg font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {formatCurrencySigned(pnl)}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Return %</div>
              <div className={`text-lg font-bold ${pnlPercent > 0 ? "text-emerald-600" : pnlPercent < 0 ? "text-red-600" : "text-gray-600"}`}>
                {formatPercent(pnlPercent)}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">AI Score</div>
              <div className="text-lg font-bold text-indigo-600">{score > 0 ? score.toFixed(1) : "N/A"}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Confidence</div>
              <div className="text-lg font-bold text-purple-600">{confidence > 0 ? `${confidence.toFixed(0)}%` : "N/A"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trade Row Component with Percent Return
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
              {formatPercent(pnlPercent)}
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

// Notable Trades by Bot with Sorting
function NotableTradesByBot({ trades, stockTrades, onTradeClick }) {
  const [sortBy, setSortBy] = useState("pnl");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedBot, setSelectedBot] = useState("all");
  
  const allTrades = [...trades, ...stockTrades];
  
  const closedTrades = allTrades.filter(trade => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return (trade?.status !== "open" && pnl !== 0) || (pnl !== 0 && trade?.created_at);
  });

  const tradesByBot = closedTrades.reduce((acc, trade) => {
    const botName = trade?.bot || trade?.source || "Other Bot";
    if (!acc[botName]) {
      acc[botName] = [];
    }
    acc[botName].push(trade);
    return acc;
  }, {});

  const botNames = ["all", ...Object.keys(tradesByBot)];
  
  const getSortedTrades = useCallback((botTrades) => {
    return [...botTrades].sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case "pnl":
          aVal = Math.abs(a.pnl_usd || a.pnl || 0);
          bVal = Math.abs(b.pnl_usd || b.pnl || 0);
          break;
        case "date":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "symbol":
          aVal = (a.symbol || "").toLowerCase();
          bVal = (b.symbol || "").toLowerCase();
          break;
        default:
          aVal = (a.pnl_usd || a.pnl || 0);
          bVal = (b.pnl_usd || b.pnl || 0);
      }
      if (sortOrder === "desc") return bVal - aVal;
      return aVal - bVal;
    });
  }, [sortBy, sortOrder]);

  const filteredBots = selectedBot === "all" 
    ? Object.entries(tradesByBot)
    : Object.entries(tradesByBot).filter(([name]) => name === selectedBot);

  if (closedTrades.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-sm">No notable trades yet</p>
        <p className="text-xs mt-2">Complete some trades to see top performers</p>
      </div>
    );
  }

  const sortOptions = [
    { value: "pnl", label: "💰 By P&L", icon: "💰" },
    { value: "date", label: "📅 By Date", icon: "📅" },
    { value: "symbol", label: "🔤 By Symbol", icon: "🔤" }
  ];

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <div className="flex gap-1">
            {sortOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  if (sortBy === option.value) {
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  } else {
                    setSortBy(option.value);
                    setSortOrder("desc");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  sortBy === option.value 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {sortBy === option.value && (
                  <span>{sortOrder === "desc" ? "↓" : "↑"}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Bot:</span>
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500"
          >
            {botNames.map(name => (
              <option key={name} value={name}>
                {name === "all" ? "All Bots" : name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredBots.map(([botName, botTrades]) => {
        const sortedTrades = getSortedTrades(botTrades);
        const totalPnL = botTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
        const wins = botTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
        const winRate = botTrades.length > 0 ? (wins / botTrades.length * 100) : 0;
        
        return (
          <div key={botName} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getBotIcon(botName)}</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{botName}</h3>
                  <p className="text-xs text-gray-500">
                    {botTrades.length} trades • {wins}W / {botTrades.length - wins}L • {winRate.toFixed(1)}% win rate
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrencySigned(totalPnL)}
                </div>
                <div className="text-xs text-gray-400">Total P&L</div>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">🏆 Notable Trades</h4>
              {sortedTrades.slice(0, 5).map((trade, idx) => {
                const pnl = trade.pnl_usd || trade.pnl || 0;
                const pnlPercent = trade.pnl_percent || trade.pnl_percentage || 0;
                const isWin = pnl > 0;
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                      isWin ? "bg-emerald-50 hover:bg-emerald-100" : "bg-red-50 hover:bg-red-100"
                    }`}
                    onClick={() => onTradeClick(trade)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{getBotIcon(botName)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{trade.symbol}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {trade.side?.toUpperCase()}
                          </span>
                          {trade.status === "open" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">OPEN</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {timeAgo(trade.created_at)} • {formatCurrency(trade.price)}
                        </div>
                        {trade.entry_reason && (
                          <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[200px]">
                            {trade.entry_reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className={`text-sm font-bold ${isWin ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrencySigned(pnl)}
                      </div>
                      <div className={`text-xs ${isWin ? "text-emerald-500" : "text-red-500"}`}>
                        {formatPercent(pnlPercent)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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

  // WebSocket connection with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/`);
      
      ws.onopen = () => {
        console.log("🔌 WebSocket connected for live updates");
        setData(prev => ({ ...prev, wsConnected: true }));
        
        ws.send(JSON.stringify({ 
          type: 'subscribe', 
          channel: 'trades',
          client: 'public-dashboard'
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'new_trade') {
            console.log("📊 New trade received:", message.trade);
            
            setData(prev => ({
              ...prev,
              trades: [message.trade, ...prev.trades],
              summary: message.summary || prev.summary,
              lastUpdate: new Date()
            }));
            
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce z-50';
            toast.innerHTML = `🔄 New ${message.trade?.side?.toUpperCase()} trade: ${message.trade?.symbol} ${formatCurrencySigned(message.trade?.pnl_usd)} (${formatPercent(message.trade?.pnl_percent || 0)})`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          }
          
          if (message.type === 'summary_update') {
            setData(prev => ({
              ...prev,
              summary: message.summary,
              lastUpdate: new Date()
            }));
          }
          
          if (message.type === 'pnl_update') {
            setData(prev => ({
              ...prev,
              pnlHistory: message.pnlHistory,
              lastUpdate: new Date()
            }));
          }
          
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setData(prev => ({ ...prev, wsConnected: false }));
      };
      
      ws.onclose = () => {
        console.log("WebSocket disconnected, attempting reconnect in 5 seconds...");
        setData(prev => ({ ...prev, wsConnected: false }));
        
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
      setData(prev => ({ ...prev, wsConnected: false }));
    }
  }, []);

  // Initial data fetch
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
          setData(prev => ({
            ...prev,
            loading: false,
            error: "No data received"
          }));
        }
        
        connectWebSocket();
        
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
        
        connectWebSocket();
      }
    };
    
    fetchData();
    
    const interval = setInterval(async () => {
      if (!data.wsConnected && !data.loading) {
        console.log("Fallback: Polling for updates...");
        try {
          const response = await axios.get(BOT_ACTIVITY_HISTORY_URL, {
            params: { days: 365, limit: 100 },
            timeout: 10000
          });
          if (response.data && response.data.trades) {
            setData(prev => ({
              ...prev,
              trades: response.data.trades,
              summary: response.data.summary,
              lastUpdate: new Date()
            }));
          }
        } catch (err) {
          console.error("Polling failed:", err);
        }
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

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
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [allTrades, sortRecentTrades]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return sortedRecentTrades.filter(t => t.status === "open");
    if (activeTab === "closed") return sortedRecentTrades.filter(t => t.status === "closed");
    return sortedRecentTrades;
  }, [activeTab, sortedRecentTrades]);

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
          <p className="text-gray-500">Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
                {totalTrades.toLocaleString()} Trades
              </span>
              {data.wsConnected && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
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
          <h1 className="text-4xl sm:text-6xl font-bold mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            Trading in Public
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
            Complete trading history • {totalTrades.toLocaleString()} total trades tracked • Real-time WebSocket updates
          </p>
        </div>

        {/* Performance Chart - Enhanced */}
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
              <EnhancedPerformanceChart pnlHistory={pnlHistory} />
            </div>
            <div className="mt-3 text-center text-[10px] text-gray-400">
              Multiple chart views • Animated transitions • Real-time updates
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
              value={totalTrades.toLocaleString()} 
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

        {/* Notable Trades by Bot */}
        <div className="mb-8">
          <h2 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-900">
            <span>🤖</span>
            Bot Performance & Notable Trades
            <span className="text-xs font-normal text-gray-400 ml-2">
              Sort and filter by bot
            </span>
          </h2>
          <NotableTradesByBot 
            trades={allTrades} 
            stockTrades={[]}
            onTradeClick={setSelectedTrade}
          />
        </div>

        {/* Recent Trades Feed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Recent Trades
              <span className="text-xs font-normal text-gray-400">{totalTrades.toLocaleString()} total trades</span>
              {data.wsConnected && (
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  🔌 Live
                </span>
              )}
            </h2>
            <div className="flex gap-2">
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
              <select
                value={sortRecentTrades}
                onChange={(e) => setSortRecentTrades(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 border-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="date">📅 Sort by Date</option>
                <option value="pnl">💰 Sort by P&L</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTrades.length > 0 ? (
              filteredTrades.slice(0, 100).map((trade, i) => (
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
            Complete trading history • AI-powered signals • Real-time WebSocket updates • Transparent performance
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

      {/* Enhanced Trade Detail Modal */}
      <EnhancedTradeDetailModal
        trade={selectedTrade}
        isOpen={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}
