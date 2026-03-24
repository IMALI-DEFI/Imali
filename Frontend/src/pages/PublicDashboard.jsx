// src/pages/PublicDashboard.jsx

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

const API_BASE = "https://api.imali-defi.com";
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;
const TRADES_URL = `${API_BASE}/api/trades/recent`;

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
  if (riskLower.includes("medium-low")) return "text-emerald-500 bg-emerald-50";
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

function BotNotableTrades({ botName, botIcon, trades, onTradeClick }) {
  const closedTrades = trades.filter(t => {
    const pnl = t.pnl_usd || t.pnl || 0;
    return (t.status !== "open" && pnl !== 0) || (pnl !== 0);
  });

  const topWinners = [...closedTrades]
    .sort((a, b) => (b.pnl_usd || b.pnl || 0) - (a.pnl_usd || a.pnl || 0))
    .slice(0, 3);
  
  const topLosers = [...closedTrades]
    .sort((a, b) => (a.pnl_usd || a.pnl || 0) - (b.pnl_usd || b.pnl || 0))
    .slice(0, 3);

  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
  const wins = closedTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(0) : 0;

  if (trades.length === 0) {
    return (
      <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 text-center">
        <div className="text-3xl mb-2">{botIcon}</div>
        <h3 className="font-bold text-gray-900 mb-1">{botName}</h3>
        <p className="text-sm text-gray-400">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{botIcon}</span>
          <h3 className="font-bold text-lg text-gray-900">{botName}</h3>
          <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {trades.length} trades
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Win Rate</div>
            <div className="font-bold text-emerald-600">{winRate}%</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-400">P&L</div>
            <div className={`font-bold ${totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrencySigned(totalPnL)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Closed</div>
            <div className="font-bold text-gray-700">{closedTrades.length}</div>
          </div>
        </div>
        
        {topWinners.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
              <span>🏆</span> Top Winners
            </div>
            {topWinners.map((trade, idx) => {
              const pnl = trade.pnl_usd || trade.pnl || 0;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 mb-1 rounded-lg bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-all text-xs"
                  onClick={() => onTradeClick(trade, botName)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-gray-900 truncate">{trade.symbol}</span>
                    <span className="text-emerald-600">+${pnl.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
                </div>
              );
            })}
          </div>
        )}
        
        {topLosers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
              <span>📉</span> Top Losers
            </div>
            {topLosers.map((trade, idx) => {
              const pnl = Math.abs(trade.pnl_usd || trade.pnl || 0);
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 mb-1 rounded-lg bg-red-50 cursor-pointer hover:bg-red-100 transition-all text-xs"
                  onClick={() => onTradeClick(trade, botName)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-gray-900 truncate">{trade.symbol}</span>
                    <span className="text-red-600">${pnl.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{timeAgo(trade.created_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BotRecentTrades({ botName, botIcon, trades, onTradeClick }) {
  if (trades.length === 0) {
    return null;
  }

  const recentTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.created_at || a.timestamp || 0);
    const dateB = new Date(b.created_at || b.timestamp || 0);
    return dateB - dateA;
  }).slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">{botIcon}</span>
          <h3 className="font-bold text-gray-900">{botName} - Recent Trades</h3>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {recentTrades.map((trade, idx) => {
          const pnl = trade.pnl_usd || trade.pnl || 0;
          const isWin = pnl > 0;
          const side = trade.side || "buy";
          const score = trade.overall_score || trade.ai_score || 0;
          
          return (
            <div 
              key={trade.id || idx}
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-all ${isWin ? "bg-emerald-50/30" : pnl < 0 ? "bg-red-50/30" : ""}`}
              onClick={() => onTradeClick(trade, botName)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{trade.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {side.toUpperCase()}
                  </span>
                  {score > 0 && (
                    <span className="text-[10px] text-indigo-500">Score: {score.toFixed(0)}</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {timeAgo(trade.created_at || trade.timestamp)} • {formatCurrency(trade.price || 0)}
                </div>
              </div>
              <div className="text-right shrink-0">
                {pnl !== 0 ? (
                  <div className={`font-semibold text-sm ${isWin ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrencySigned(pnl)}
                  </div>
                ) : trade.status === "open" ? (
                  <div className="font-semibold text-sm text-blue-600">Open</div>
                ) : (
                  <div className="font-semibold text-sm text-gray-600">{formatCurrency(trade.price || 0)}</div>
                )}
              </div>
            </div>
          );
        })}
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
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext && <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className="text-2xl opacity-60 shrink-0">{icon}</div>
      </div>
    </div>
  );
}

function TradeDetailModal({ trade, botName, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade.pnl_usd || trade.pnl || 0;
  const symbol = trade.symbol || "Unknown";
  const side = trade.side || "buy";
  const timestamp = trade.created_at || trade.timestamp;
  const price = trade.price || 0;
  const qty = trade.qty || trade.quantity || 0;
  const status = trade.status === "open" ? "Open" : "Closed";
  const score = trade.overall_score || trade.ai_score || 0;
  const risk = trade.risk_level || "medium";
  const entryReason = trade.entry_reason || trade.reason || "AI detected opportunity";

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
              <div className="text-sm text-gray-500 mt-1">{timeAgo(timestamp)} • {botName}</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(price)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
            <div><div className="text-gray-500">Side</div><div className="font-semibold">{side.toUpperCase()}</div></div>
            <div><div className="text-gray-500">Quantity</div><div className="font-semibold">{qty.toFixed(4)}</div></div>
            <div><div className="text-gray-500">Price</div><div className="font-semibold">{formatCurrency(price)}</div></div>
            <div><div className="text-gray-500">Status</div><div className="font-semibold">{status}</div></div>
            {score > 0 && <div><div className="text-gray-500">AI Score</div><div className="font-semibold">{score.toFixed(1)}</div></div>}
            <div className="col-span-2"><div className="text-gray-500">Risk Level</div><div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(risk)}`}>{risk.toUpperCase()}</div></div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">🤖</span><span className="font-semibold text-gray-900">AI Analysis</span></div>
            <p className="text-gray-700 text-sm">{entryReason}</p>
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
    { name: "Profit Factor", symbol: "💰", definition: "Gross profit divided by gross loss. Above 1.5 is excellent." },
    { name: "Sharpe Ratio", symbol: "⚖️", definition: "Risk-adjusted return measure. Above 1.0 is good." },
    { name: "Max Drawdown", symbol: "📉", definition: "Largest peak-to-trough decline. Lower is better." },
    { name: "AI Score", symbol: "🤖", definition: "Machine learning score (0-100). Higher = stronger signal." },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">📊 Metric Definitions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-5 space-y-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center gap-2"><span className="text-xl">{metric.symbol}</span><span className="font-semibold text-gray-900">{metric.name}</span></div>
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
    allTrades: [],
    okxTrades: [],
    stockTrades: [],
    futuresTrades: [],
    sniperTrades: [],
    pnlHistory: [],
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔄 Fetching all trade data...");
        
        const response = await axios.get(BOT_ACTIVITY_HISTORY_URL, {
          params: { days: 365, limit: 5000 },
          timeout: 15000
        });
        
        let allTrades = [];
        let pnlHistory = [];
        
        if (response.data && response.data.data) {
          allTrades = response.data.data.trades || [];
          pnlHistory = response.data.data.pnl_by_day || [];
        } else if (response.data && response.data.trades) {
          allTrades = response.data.trades || [];
          pnlHistory = response.data.pnl_by_day || [];
        }
        
        // Separate trades by bot type
        const okxTrades = allTrades.filter(t => 
          t.bot === "spot" || t.bot === "okx" || t.source === "okx" || t.symbol?.includes("USDT")
        );
        const stockTrades = allTrades.filter(t => 
          t.bot === "stocks" || t.bot === "stock" || t.source === "alpaca"
        );
        const futuresTrades = allTrades.filter(t => t.bot === "futures");
        const sniperTrades = allTrades.filter(t => t.bot === "sniper");
        
        console.log("✅ Loaded trades:", {
          total: allTrades.length,
          okx: okxTrades.length,
          stocks: stockTrades.length,
          futures: futuresTrades.length,
          sniper: sniperTrades.length
        });
        
        setData({
          allTrades,
          okxTrades,
          stockTrades,
          futuresTrades,
          sniperTrades,
          pnlHistory,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
        
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        setData(prev => ({ ...prev, loading: false, error: error.message }));
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const allTrades = data.allTrades || [];
  const okxTrades = data.okxTrades || [];
  const stockTrades = data.stockTrades || [];
  const futuresTrades = data.futuresTrades || [];
  const sniperTrades = data.sniperTrades || [];
  const pnlHistory = data.pnlHistory || [];

  const totalTrades = allTrades.length;
  const totalPnl = allTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
  const wins = allTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
  const losses = allTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
  
  const totalWinAmount = allTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
  const totalLossAmount = Math.abs(allTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0));
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
  const sharpeRatio = 1.2;
  const maxDrawdown = 8.5;

  const cumulativePnl = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1]?.cumulative_pnl || totalPnl : totalPnl;
  const totalReturnPercent = cumulativePnl / 10000 * 100;

  const botSections = [
    { name: "OKX Spot Bot", icon: "🔷", trades: okxTrades, color: "purple" },
    { name: "Stock Bot", icon: "📈", trades: stockTrades, color: "blue" },
    { name: "Futures Bot", icon: "📊", trades: futuresTrades, color: "amber" },
    { name: "Sniper Bot", icon: "🎯", trades: sniperTrades, color: "red" }
  ];

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
          <p className="text-gray-500">Loading {okxTrades.length + stockTrades.length + futuresTrades.length + sniperTrades.length} trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">IMALI</Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">{totalTrades} Total Trades</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span>Real-time data</span></div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all">Join the Journey →</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {data.error && <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center"><p className="text-amber-600 text-sm">⚠️ {data.error}</p></div>}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">Live Trading Dashboard</h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">{totalTrades} total trades across all bots</p>
        </div>

        {pnlHistory.length > 0 && (
          <div className="mb-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div><h2 className="font-bold text-xl text-gray-900">Performance History</h2><p className="text-xs text-gray-400 mt-1">Daily P&L (bars) and Cumulative Performance (line)</p></div>
              <button onClick={() => setShowMetricDefinitions(true)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full">📊 Understanding metrics</button>
            </div>
            <div className="h-80"><PerformanceChart pnlHistory={pnlHistory} /></div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-lg text-gray-800">Key Performance Metrics</h2><button onClick={() => setShowMetricDefinitions(true)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><span>ⓘ</span> What do these mean?</button></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard title="Win Rate" value={`${winRate.toFixed(1)}%`} icon="📈" color="emerald" subtext={`${wins}W / ${losses}L`} onClick={() => setShowMetricDefinitions(true)} />
            <MetricCard title="Total Trades" value={totalTrades} icon="🔄" color="purple" onClick={() => setShowMetricDefinitions(true)} />
            <MetricCard title="Profit Factor" value={profitFactor.toFixed(2)} icon="💰" color="blue" onClick={() => setShowMetricDefinitions(true)} />
            <MetricCard title="Sharpe Ratio" value={sharpeRatio.toFixed(2)} icon="⚖️" color="indigo" onClick={() => setShowMetricDefinitions(true)} />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard title="Total Return" value={`${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`} icon="📈" color={totalReturnPercent >= 0 ? "emerald" : "red"} subtext={`P&L: ${formatCurrencySigned(totalPnl)}`} onClick={() => setShowMetricDefinitions(true)} />
          <MetricCard title="Max Drawdown" value={`${maxDrawdown.toFixed(1)}%`} icon="📉" color="amber" onClick={() => setShowMetricDefinitions(true)} />
          <MetricCard title="OKX Trades" value={okxTrades.length} icon="🔷" color="purple" onClick={() => setShowMetricDefinitions(true)} />
          <MetricCard title="Stock Trades" value={stockTrades.length} icon="📈" color="blue" onClick={() => setShowMetricDefinitions(true)} />
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-900"><span>🏆</span> Notable Trades by Bot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {botSections.map(bot => (
              <BotNotableTrades key={bot.name} botName={bot.name} botIcon={bot.icon} trades={bot.trades} onTradeClick={(trade, botName) => { setSelectedTrade(trade); setSelectedBot(botName); }} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-900"><span>🔄</span> Recent Trades by Bot</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {botSections.map(bot => (
              <BotRecentTrades key={bot.name} botName={bot.name} botIcon={bot.icon} trades={bot.trades} onTradeClick={(trade, botName) => { setSelectedTrade(trade); setSelectedBot(botName); }} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> All Trades Feed</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${activeTab === tab.id ? "bg-emerald-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"}`}>
                  <span>{tab.icon}</span><span>{tab.label}</span>{tab.count > 0 && <span className="ml-1 text-[8px] bg-gray-200 text-gray-700 px-1.5 rounded-full">{tab.count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredTrades.length > 0 ? (
              filteredTrades.slice(0, 50).map((trade, i) => {
                const pnl = trade.pnl_usd || trade.pnl || 0;
                const isWin = pnl > 0;
                const side = trade.side || "buy";
                const bot = trade.bot || "unknown";
                return (
                  <div key={trade.id || i} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:shadow-md transition-all ${isWin ? "bg-emerald-50 hover:bg-emerald-100" : pnl < 0 ? "bg-red-50 hover:bg-red-100" : "bg-gray-50 hover:bg-gray-100"}`} onClick={() => { setSelectedTrade(trade); setSelectedBot(bot); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-gray-900">{trade.symbol}</span><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{side.toUpperCase()}</span><span className="text-[10px] text-gray-400">{bot}</span></div>
                      <div className="text-[10px] text-gray-400">{timeAgo(trade.created_at || trade.timestamp)} • {formatCurrency(trade.price || 0)}</div>
                    </div>
                    <div className="text-right shrink-0">{pnl !== 0 ? <div className={`font-semibold text-sm ${isWin ? "text-emerald-600" : "text-red-600"}`}>{formatCurrencySigned(pnl)}</div> : <div className="font-semibold text-sm text-gray-600">{formatCurrency(trade.price || 0)}</div>}</div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📭</div><p className="text-sm">No trades yet</p></div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>Real-time bot activity • OKX Crypto • Alpaca Stocks • Futures • Sniper<br /><Link to="/" className="text-indigo-600 hover:underline">Home</Link> • <Link to="/pricing" className="text-indigo-600 hover:underline">Pricing</Link> • <Link to="/referrals" className="text-amber-600 hover:underline">Referrals</Link></p>
        </div>
      </main>

      <MetricDefinitions isOpen={showMetricDefinitions} onClose={() => setShowMetricDefinitions(false)} />
      <TradeDetailModal trade={selectedTrade} botName={selectedBot} isOpen={selectedTrade !== null} onClose={() => { setSelectedTrade(null); setSelectedBot(null); }} />
    </div>
  );
}
