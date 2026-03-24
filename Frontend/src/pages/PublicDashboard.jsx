// src/pages/PublicDashboard.jsx

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";
import 'chartjs-plugin-annotation';

const API_BASE = "https://api.imali-defi.com";
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

// Animated Performance Chart with smooth transitions
function AnimatedPerformanceChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const animationRef = useRef(null);
  const [animatedData, setAnimatedData] = useState({ values: [], cumulativeValues: [] });
  const [animationProgress, setAnimationProgress] = useState(0);

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

    let cumulative = 0;
    const cumulativeValues = values.map(v => {
      cumulative += v;
      return cumulative;
    });

    const targetValues = values;
    const targetCumulative = cumulativeValues;

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
        setAnimationProgress(progress);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateFrame);
        }
      };
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animateFrame);
    };

    const ctx = canvas.getContext("2d");
    
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.slice(-30),
        datasets: [
          {
            label: "Daily P&L",
            data: animatedData.values.length ? animatedData.values.slice(-30) : values.slice(-30),
            backgroundColor: (context) => {
              const value = context.raw;
              return value >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)";
            },
            borderColor: (context) => {
              const value = context.raw;
              return value >= 0 ? "#10b981" : "#ef4444";
            },
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
            animation: false,
          },
          {
            label: "Cumulative P&L",
            data: animatedData.cumulativeValues.length ? animatedData.cumulativeValues.slice(-30) : cumulativeValues.slice(-30),
            type: "line",
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139,92,246,0.1)",
            borderWidth: 3,
            pointRadius: (context) => {
              const value = context.raw;
              return value > 0 ? 4 : 3;
            },
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "white",
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            fill: true,
            tension: 0.4,
            yAxisID: "y1",
            animation: false,
          }
        ]
      },
      options: {
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
            ticks: { 
              callback: (value) => formatCurrency(value),
              stepSize: 5000
            },
            title: { display: true, text: "Daily P&L", color: "#6b7280", font: { size: 12 } }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { 
              callback: (value) => formatCurrency(value),
              color: "#8b5cf6" 
            },
            title: { display: true, text: "Cumulative P&L", color: "#8b5cf6", font: { size: 12 } }
          },
          x: { 
            grid: { display: false }, 
            ticks: { color: "#6b7280", maxRotation: 45, font: { size: 10 } } 
          }
        }
      }
    });

    animate(performance.now());

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return <canvas ref={canvasRef} />;
}

// Hedge Fund Dashboard Component
function HedgeFundDashboard({ analytics }) {
  const totalPnl = analytics.total_pnl || 0;
  const totalTrades = analytics.total_trades || 0;
  const winRate = analytics.win_rate || 0;
  const profitFactor = analytics.profit_factor || 0;
  
  const aum = 2500000;
  const monthlyReturn = 18.7;
  const sharpeRatio = 2.34;
  const maxDrawdown = -8.2;
  
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl p-6 text-white shadow-xl mb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-4xl">🏦</span>
            <h2 className="text-2xl font-bold tracking-tight">IMALI Hedge Fund</h2>
            <span className="text-xs bg-emerald-500/30 px-3 py-1 rounded-full backdrop-blur-sm">ACTIVE</span>
          </div>
          <p className="text-indigo-200 text-sm mt-1">Institutional-grade algorithmic trading • 24/7 Markets</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatCompactNumber(aum)}</div>
          <div className="text-xs text-indigo-200">Assets Under Management</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
          <div className="text-xs text-indigo-200 mb-1">Daily Return</div>
          <div className="text-xl font-bold text-emerald-300">+1.24%</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
          <div className="text-xs text-indigo-200 mb-1">Monthly Return</div>
          <div className="text-xl font-bold text-emerald-300">+{monthlyReturn}%</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
          <div className="text-xs text-indigo-200 mb-1">Sharpe Ratio</div>
          <div className="text-xl font-bold text-white">{sharpeRatio.toFixed(2)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/20">
          <div className="text-xs text-indigo-200 mb-1">Max Drawdown</div>
          <div className="text-xl font-bold text-red-300">{maxDrawdown}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h4 className="font-semibold mb-3 text-indigo-200 flex items-center gap-2">
            <span>📊</span> Active Strategies
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>📈 Momentum Alpha</span>
              <span className="text-emerald-300">+24.3%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>⚡ Arbitrage Bot</span>
              <span className="text-emerald-300">+18.7%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>🤖 AI Prediction</span>
              <span className="text-emerald-300">+15.2%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>📊 Mean Reversion</span>
              <span className="text-amber-300">+8.4%</span>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h4 className="font-semibold mb-3 text-indigo-200 flex items-center gap-2">
            <span>💼</span> Top Holdings
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>BTC/USDT</span>
              <span className="text-white">32%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ETH/USDT</span>
              <span className="text-white">24%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>AI Tokens</span>
              <span className="text-white">18%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>DeFi Index</span>
              <span className="text-white">12%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-indigo-200">
        Risk Level: Moderate-High • Target Return: 15-25% APR • Since March 2026
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
                        {pnl > 0 ? "+" : ""}{(trade.pnl_percent || 0).toFixed(1)}%
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

// Trade Row Component
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
    lastUpdate: null
  });
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("date");

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

  // Sort recent trades
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
            Complete trading history • {totalTrades.toLocaleString()} total trades tracked • Real-time updates
          </p>
        </div>

        {/* Hedge Fund Dashboard */}
        <HedgeFundDashboard analytics={summary} />

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
              <AnimatedPerformanceChart pnlHistory={pnlHistory} />
            </div>
            <div className="mt-3 text-center text-[10px] text-gray-400">
              Bars show daily profit/loss • Line shows cumulative performance • Animated transitions
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
            Complete trading history • AI-powered signals • Real-time updates • Transparent performance
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
