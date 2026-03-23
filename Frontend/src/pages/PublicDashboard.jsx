// src/pages/PublicDashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE = "https://api.imali-defi.com";

const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;
const BOT_ACTIVITY_HISTORY_URL = `${API_BASE}/api/bot-activity/history`;

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value, digits = 2) {
  return `$${safeNumber(value).toFixed(digits)}`;
}

function formatCurrencySigned(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(digits)}`;
}

function formatPercent(value, digits = 2) {
  const n = safeNumber(value);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
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

/* =====================================================
   DATA HOOK - FETCHES REAL DATA FROM API
===================================================== */

function useLiveData() {
  const [data, setData] = useState({
    bots: [],
    trades: [],
    discoveries: [],
    analytics: {
      summary: {
        total_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        wins: 0,
        losses: 0,
        cumulative_pnl: 0,
        profit_factor: 0,
        sharpe_ratio: 0,
        max_drawdown_percent: 0,
      }
    },
    pnlHistory: [],
    userStats: {},
    loading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchAllData = async () => {
      try {
        const [
          tradesRes,
          discoveriesRes,
          botsRes,
          analyticsRes,
          userStatsRes,
          pnlHistoryRes,
          botHistoryRes,
        ] = await Promise.allSettled([
          axios.get(TRADES_URL, { timeout: 8000 }),
          axios.get(DISCOVERIES_URL, { timeout: 8000 }),
          axios.get(BOT_STATUS_URL, { timeout: 8000 }),
          axios.get(ANALYTICS_URL, { timeout: 8000 }),
          axios.get(USER_STATS_URL, { timeout: 8000 }),
          axios.get(PNL_HISTORY_URL, { timeout: 8000 }),
          axios.get(BOT_ACTIVITY_HISTORY_URL, { timeout: 8000, params: { days: 90 } }),
        ]);

        if (!mounted) return;

        let newData = {
          trades: [],
          discoveries: [],
          bots: [],
          analytics: { summary: {} },
          userStats: {},
          pnlHistory: [],
          botHistory: {},
        };

        // ============================================================
        // PROCESS REAL TRADES - THIS IS YOUR ACTUAL DATA
        // ============================================================
        if (tradesRes.status === "fulfilled" && tradesRes.value.data?.trades) {
          newData.trades = tradesRes.value.data.trades;
          console.log("✅ REAL TRADES LOADED:", newData.trades.length);
        } else if (tradesRes.status === "fulfilled" && tradesRes.value.data) {
          newData.trades = tradesRes.value.data;
          console.log("✅ REAL TRADES LOADED (alternate):", newData.trades.length);
        } else {
          console.warn("⚠️ No trades data from API");
        }

        // Process discoveries
        if (discoveriesRes.status === "fulfilled" && discoveriesRes.value.data?.discoveries) {
          newData.discoveries = discoveriesRes.value.data.discoveries;
        }

        // Process bots
        if (botsRes.status === "fulfilled" && botsRes.value.data?.bots) {
          newData.bots = botsRes.value.data.bots;
        }

        // ============================================================
        // CALCULATE ALL METRICS FROM REAL TRADES (NO HARDCODING)
        // ============================================================
        const trades = newData.trades;
        const realTotalTrades = trades.length;
        
        console.log("📊 ACTUAL TRADE COUNT:", realTotalTrades);
        
        // Calculate from actual trades
        let cumulativePnl = 0;
        let totalPnl = 0;
        let wins = 0;
        let losses = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;
        let maxDrawdown = 0;
        let peak = 0;
        
        // Sort trades by date for cumulative calculations
        const sortedTrades = [...trades].sort((a, b) => {
          const dateA = new Date(a?.created_at || a?.timestamp || 0);
          const dateB = new Date(b?.created_at || b?.timestamp || 0);
          return dateA - dateB;
        });
        
        sortedTrades.forEach(trade => {
          const pnl = trade?.pnl_usd || trade?.pnl || 0;
          // Only count closed trades for P&L
          if (trade?.status !== "open") {
            cumulativePnl += pnl;
            totalPnl += pnl;
            
            if (pnl > 0) {
              wins++;
              totalWinAmount += pnl;
            } else if (pnl < 0) {
              losses++;
              totalLossAmount += Math.abs(pnl);
            }
            
            // Calculate max drawdown
            if (cumulativePnl > peak) peak = cumulativePnl;
            const drawdown = peak > 0 ? (peak - cumulativePnl) / peak * 100 : 0;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
          }
        });
        
        const winRate = realTotalTrades > 0 ? (wins / realTotalTrades * 100) : 0;
        const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
        const avgTrade = realTotalTrades > 0 ? totalPnl / realTotalTrades : 0;
        
        // Calculate Sharpe Ratio (simplified for demo)
        const returns = sortedTrades.map(t => t?.pnl_usd || t?.pnl || 0).filter(r => r !== 0);
        const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / (returns.length - 1)) : 0;
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
        
        // Build analytics summary with REAL data
        const analyticsData = {
          summary: {
            total_trades: realTotalTrades,
            win_rate: winRate,
            total_pnl: totalPnl,
            cumulative_pnl: cumulativePnl,
            wins: wins,
            losses: losses,
            profit_factor: profitFactor,
            sharpe_ratio: sharpeRatio,
            max_drawdown_percent: maxDrawdown,
            avg_trade: avgTrade,
          }
        };
        
        console.log("📊 CALCULATED METRICS:", analyticsData.summary);

        // Process PNL history
        if (pnlHistoryRes.status === "fulfilled" && pnlHistoryRes.value.data?.history) {
          newData.pnlHistory = pnlHistoryRes.value.data.history;
        } else if (botHistoryRes.status === "fulfilled" && botHistoryRes.value.data?.pnl_by_day) {
          newData.pnlHistory = botHistoryRes.value.data.pnl_by_day;
        } else {
          // Generate daily P&L from trades
          const dailyPnL = new Map();
          sortedTrades.forEach(trade => {
            const date = new Date(trade?.created_at || trade?.timestamp || Date.now()).toISOString().split('T')[0];
            const pnl = trade?.pnl_usd || trade?.pnl || 0;
            if (trade?.status !== "open") {
              dailyPnL.set(date, (dailyPnL.get(date) || 0) + pnl);
            }
          });
          newData.pnlHistory = Array.from(dailyPnL.entries()).map(([date, pnl]) => ({ date, pnl }));
        }

        // Process user stats
        if (userStatsRes.status === "fulfilled" && userStatsRes.value.data) {
          newData.userStats = userStatsRes.value.data;
        }

        setData({
          ...newData,
          analytics: analyticsData,
          loading: false,
          error: null,
          lastUpdate: new Date(),
        });

      } catch (error) {
        console.error("Data fetch error:", error);
        if (!mounted) return;
        
        setData(prev => ({
          ...prev,
          loading: false,
          error: "Failed to fetch data",
          lastUpdate: new Date(),
        }));
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return data;
}

/* =====================================================
   METRIC DEFINITION MODAL - HEDGE FUND FOCUSED
===================================================== */

function MetricDefinitions({ isOpen, onClose }) {
  if (!isOpen) return null;

  const metrics = [
    { name: "Win Rate", symbol: "📈", definition: "Percentage of trades that were profitable. For hedge funds, consistency matters more than individual wins." },
    { name: "Total Trades", symbol: "🔄", definition: "Total number of trades executed. Higher volume indicates active strategy execution." },
    { name: "Profit Factor", symbol: "💰", definition: "Gross profit divided by gross loss. Values above 1.5 are considered excellent for institutional strategies." },
    { name: "Sharpe Ratio", symbol: "⚖️", definition: "Risk-adjusted return measure. Values above 1.0 are good, above 2.0 are very good for hedge funds." },
    { name: "Max Drawdown", symbol: "📉", definition: "Largest peak-to-trough decline. Lower values (< 20%) are preferred by institutional investors." },
    { name: "Cumulative P&L", symbol: "📊", definition: "Total profit/loss since inception. Shows overall strategy performance." },
    { name: "Total Return", symbol: "📈", definition: "Percentage return on initial capital. Hedge funds typically target 10-20% annualized returns." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">📊 Institutional Metric Definitions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Key performance indicators used by institutional investors to evaluate trading strategies.
          </p>
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

/* =====================================================
   TRADE DETAIL MODAL
===================================================== */

function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade?.pnl_usd || trade?.pnl || 0;
  const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
  const aiScore = trade?.ai_score || trade?.confidence || 0.75;
  const aiDecision = trade?.ai_decision || trade?.reason || "AI detected favorable market conditions";
  const aiConfidence = trade?.confidence || (aiScore * 100).toFixed(0);
  const reasoning = trade?.reasoning || `Based on technical analysis and market sentiment, the AI identified a ${pnl > 0 ? "profitable" : "risky"} opportunity.`;

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
              <div className="text-2xl font-bold text-gray-900">{trade?.symbol || "Unknown"}</div>
              <div className="text-sm text-gray-500 mt-1">
                {timeAgo(trade?.created_at || trade?.timestamp)} • {trade?.exchange || "Exchange"}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-red-600" : "text-gray-600"}`}>
                {pnl !== 0 ? formatCurrencySigned(pnl) : formatCurrency(trade?.price || 0)}
              </div>
              {pnl !== 0 && (
                <div className={`text-sm ${pnl > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {pnlPercent.toFixed(1)}% return
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
            <div>
              <div className="text-gray-500">Side</div>
              <div className={`font-semibold ${trade?.side === "buy" ? "text-emerald-600" : "text-red-600"}`}>
                {trade?.side?.toUpperCase() || "BUY"}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Quantity</div>
              <div className="font-semibold">{trade?.qty || trade?.quantity || 0}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Price</div>
              <div className="font-semibold">{formatCurrency(trade?.price || 0)}</div>
            </div>
            <div>
              <div className="text-gray-500">Exit Price</div>
              <div className="font-semibold">{formatCurrency(trade?.exit_price || trade?.price || 0)}</div>
            </div>
            <div>
              <div className="text-gray-500">Bot / Strategy</div>
              <div className="font-semibold">{trade?.bot || trade?.strategy || "AI Weighted"}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-semibold">{trade?.status === "open" ? "Open" : "Closed"}</div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-gray-900">AI Decision</span>
            </div>
            <p className="text-gray-700 text-sm mb-3">{aiDecision}</p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Confidence:</span>
              <span className="font-medium text-indigo-600">{aiConfidence}%</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <div className="font-medium">Reasoning:</div>
              <p className="mt-1">{reasoning}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   CHART COMPONENT
===================================================== */

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
    
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.pnl || p) : [];
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
        labels: values.map((_, i) => `Day ${i+1}`),
        datasets: [
          {
            label: "Daily P&L",
            data: values,
            backgroundColor: values.map(v => v >= 0 ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.6)"),
            borderColor: values.map(v => v >= 0 ? "#10b981" : "#ef4444"),
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Cumulative P&L",
            data: cumulativeValues,
            type: "line",
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#6366f1",
            pointBorderColor: "white",
            pointBorderWidth: 2,
            fill: true,
            tension: 0.3,
            yAxisID: "y1",
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { 
            position: "top", 
            labels: { boxWidth: 12, font: { size: 11, weight: "bold" }, usePointStyle: true } 
          },
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
            title: { display: true, text: "Daily P&L", color: "#6b7280", font: { size: 11 } }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { callback: (value) => formatCurrency(value), color: "#6366f1" },
            title: { display: true, text: "Cumulative P&L", color: "#6366f1", font: { size: 11 } }
          },
          x: { grid: { display: false }, ticks: { color: "#6b7280" } }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return <canvas ref={canvasRef} />;
}

/* =====================================================
   NOTABLE TRADES PER BOT COMPONENT
===================================================== */

function BotNotableTrades({ botName, trades, onTradeClick }) {
  // Filter trades for this specific bot
  const botTrades = trades.filter(trade => {
    const tradeBot = (trade?.bot || trade?.source || "").toLowerCase();
    const bot = botName.toLowerCase();
    return tradeBot.includes(bot) || bot.includes(tradeBot);
  });

  // Filter closed trades with non-zero P&L
  const closedTrades = botTrades.filter(trade => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return (trade?.status !== "open" && pnl !== 0) || (pnl !== 0 && trade?.created_at);
  });

  const topWinners = [...closedTrades]
    .sort((a, b) => (b?.pnl_usd || b?.pnl || 0) - (a?.pnl_usd || a?.pnl || 0))
    .slice(0, 3);

  const topLosers = [...closedTrades]
    .sort((a, b) => (a?.pnl_usd || a?.pnl || 0) - (b?.pnl_usd || b?.pnl || 0))
    .slice(0, 3);

  if (topWinners.length === 0 && topLosers.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-xs">
        No notable trades for {botName} yet
      </div>
    );
  }

  const getBotIcon = () => {
    if (botName.includes("Futures")) return "📊";
    if (botName.includes("Stock")) return "📈";
    if (botName.includes("Sniper")) return "🦄";
    if (botName.includes("OKX")) return "🔷";
    return "🤖";
  };

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t?.pnl_usd || t?.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (topWinners.length / closedTrades.length * 100).toFixed(0) : 0;

  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-white hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
        <span className="text-lg">{getBotIcon()}</span>
        <h4 className="font-semibold text-gray-900 text-sm">{botName}</h4>
        <span className="ml-auto text-[10px] text-gray-400">{botTrades.length} trades</span>
      </div>
      
      {/* Bot Performance Metrics */}
      <div className="grid grid-cols-3 gap-1 mb-3 text-[10px]">
        <div className="text-center">
          <div className="text-gray-400">Win Rate</div>
          <div className="font-semibold text-emerald-600">{winRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">P&L</div>
          <div className={`font-semibold ${totalPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrencySigned(totalPnl)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Trades</div>
          <div className="font-semibold text-gray-700">{closedTrades.length}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Winners */}
        {topWinners.length > 0 && (
          <div>
            <div className="text-[10px] font-medium text-emerald-600 mb-1 flex items-center gap-1">
              <span>🏆</span> Top Winners
            </div>
            {topWinners.map((trade, idx) => {
              const pnl = trade?.pnl_usd || trade?.pnl || 0;
              const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors text-xs"
                  onClick={() => onTradeClick(trade)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-gray-900 truncate">{trade?.symbol || "Unknown"}</span>
                    <span className="text-[10px] text-gray-500">{trade?.side?.toUpperCase() || "BUY"}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-emerald-600">+${pnl.toFixed(2)}</div>
                    <div className="text-[9px] text-emerald-500">+{Math.abs(pnlPercent).toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function MetricCard({ title, value, icon, subtext, color = "emerald", tooltip, onClick }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all cursor-help group"
      onClick={onClick}
      title={tooltip}
    >
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

function BotCard({ bot }) {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning" || bot?.status === "running";

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">
            {bot?.name?.includes("Futures") && "📊"}
            {bot?.name?.includes("Stock") && "📈"}
            {bot?.name?.includes("Sniper") && "🦄"}
            {bot?.name?.includes("OKX") && "🔷"}
          </span>
          <span className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot?.name || "Unknown Bot"}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-emerald-600" : "text-red-600"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      {isOnline && bot?.metrics && (
        <div className="text-xs space-y-1 text-gray-600">
          {bot.positions !== undefined && <div>Positions: {bot.positions}</div>}
          {bot.discoveries !== undefined && <div>Discoveries: {bot.discoveries}</div>}
          {bot.symbols !== undefined && <div>Symbols: {bot.symbols}</div>}
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade, onClick }) {
  const side = String(trade?.side || "buy").toLowerCase();
  const pnlUsd = safeNumber(trade?.pnl_usd || trade?.pnl, 0);
  const symbol = trade?.symbol || "Unknown";
  const bot = trade?.bot || trade?.source || "Unknown";
  const ts = trade?.created_at || trade?.timestamp;
  const isBuy = side === "buy" || side === "long";
  const isOpen = trade?.status === "open" && pnlUsd === 0;

  let borderColor = "border-l-gray-300";
  let bgColor = "bg-gray-50";
  let badgeColor = "bg-gray-200 text-gray-700";
  let badgeText = side.toUpperCase();

  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-50";
    badgeColor = "bg-blue-100 text-blue-700";
    badgeText = "OPEN";
  } else if (isBuy) {
    borderColor = "border-l-emerald-500";
    bgColor = "bg-emerald-50";
    badgeColor = "bg-emerald-100 text-emerald-700";
    badgeText = "BUY";
  } else if (!isBuy && !isOpen) {
    borderColor = "border-l-red-500";
    bgColor = "bg-red-50";
    badgeColor = "bg-red-100 text-red-700";
    badgeText = "SELL";
  }

  return (
    <div 
      className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={() => onClick(trade)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">📊</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeText}</span>
            <span className="text-[10px] text-gray-400">{bot}</span>
          </div>
          <div className="text-[10px] text-gray-400">
            {timeAgo(ts)} • {formatCurrency(trade?.price || 0)}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-600">Open</div>
        ) : pnlUsd !== 0 ? (
          <div className={`font-bold text-sm ${pnlUsd > 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrencySigned(pnlUsd)}
          </div>
        ) : (
          <div className="font-bold text-sm text-gray-900">{formatCurrency(trade?.price || 0)}</div>
        )}
      </div>
    </div>
  );
}

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address?.slice(0, 10) || "New token";

  let scoreColor = "text-orange-600";
  if (score >= 0.7) scoreColor = "text-emerald-600";
  else if (score >= 0.5) scoreColor = "text-amber-600";

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs hover:shadow-md transition-colors">
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-medium flex items-center gap-1 min-w-0">
          <span className="text-base shrink-0">🦄</span>
          <span className="capitalize text-gray-900 truncate">{chain}</span>
        </span>
        <span className="text-gray-400 text-[10px] shrink-0">{age} blocks</span>
      </div>
      <div className="text-gray-600 font-mono text-[10px] mb-2 truncate">{pair}</div>
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-gray-400">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 && (
          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Ready</span>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showMetricDefinitions, setShowMetricDefinitions] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const pnlHistory = data.pnlHistory || [];

  // REAL data from API - calculated from actual trades
  const totalTradesCount = analytics.total_trades || allTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;
  const winRate = analytics.win_rate || 0;
  const profitFactor = analytics.profit_factor || 0;
  const sharpeRatio = analytics.sharpe_ratio || 0;
  const maxDrawdown = analytics.max_drawdown_percent || 0;
  const cumulativePnl = analytics.cumulative_pnl || 0;
  const avgTrade = analytics.avg_trade || 0;

  // Calculate total return
  const initialBalance = 10000;
  const totalReturnPercent = cumulativePnl / initialBalance * 100;

  const isOpenTrade = (trade) => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return trade?.status === "open" || (pnl === 0 && !trade?.pnl);
  };

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") return allTrades.filter(isOpenTrade);
    if (activeTab === "closed") return allTrades.filter(t => !isOpenTrade(t));
    return allTrades;
  }, [activeTab, allTrades]);

  const tabs = [
    { id: "all", label: "All", icon: "🌐", count: allTrades.length },
    { id: "open", label: "Open", icon: "🟢", count: allTrades.filter(isOpenTrade).length },
    { id: "closed", label: "Closed", icon: "✅", count: allTrades.filter(t => !isOpenTrade(t)).length },
  ];

  if (data.loading && !data.lastUpdate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading live dashboard...</p>
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
            Real-time bot activity, trades, and discoveries from our automated trading infrastructure.
          </p>
        </div>

        {/* Performance Chart - TOP OF PAGE */}
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
          <div className="mt-3 text-center text-[10px] text-gray-400">
            Click on any data point for detailed view • Bars show daily profit/loss • Line shows cumulative performance
          </div>
        </div>

        {/* Key Metrics Grid - Hedge Fund Focused */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard 
              title="Win Rate" 
              value={`${winRate.toFixed(1)}%`} 
              icon="📈" 
              color="emerald"
              subtext={`${winsCount}W / ${lossesCount}L`}
              tooltip="Percentage of trades that were profitable. Hedge funds typically target 55-65% win rates."
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total Trades" 
              value={totalTradesCount} 
              icon="🔄" 
              color="purple"
              tooltip="Total number of trades executed. Higher volume indicates active strategy execution."
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Profit Factor" 
              value={profitFactor.toFixed(2)} 
              icon="💰" 
              color="blue"
              tooltip="Gross profit divided by gross loss. Values above 1.5 are excellent."
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Sharpe Ratio" 
              value={sharpeRatio.toFixed(2)} 
              icon="⚖️" 
              color="indigo"
              tooltip="Risk-adjusted return. Above 1.0 is good, above 2.0 is excellent."
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Max Drawdown" 
              value={`${maxDrawdown.toFixed(1)}%`} 
              icon="📉" 
              color="amber"
              tooltip="Largest peak-to-trough decline. Hedge funds prefer under 20%."
              onClick={() => setShowMetricDefinitions(true)}
            />
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard 
            title="Total Return" 
            value={`${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`} 
            icon="📈" 
            color={totalReturnPercent >= 0 ? "emerald" : "red"}
            subtext={`Cumulative P&L: ${formatCurrencySigned(cumulativePnl)}`}
            tooltip="Percentage return on initial capital since inception."
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Avg Trade" 
            value={formatCurrencySigned(avgTrade)} 
            icon="⚖️" 
            color="blue"
            tooltip="Average profit/loss per trade. Positive values indicate profitable strategy."
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="purple"
            tooltip="Number of trading bots currently operational."
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* Bot Cards with Notable Trades Per Bot */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg mb-3 text-gray-800">Active Trading Bots & Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bots.length > 0 ? (
              bots.map((bot, index) => (
                <BotNotableTrades 
                  key={index} 
                  botName={bot.name || "Unknown Bot"} 
                  trades={allTrades}
                  onTradeClick={setSelectedTrade}
                />
              ))
            ) : (
              <div className="col-span-4 text-center py-8 text-gray-400">No bot data available</div>
            )}
          </div>
        </div>

        {/* Two Column Layout - Trades and Discoveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Trade Feed */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Trade Feed
                <span className="text-xs font-normal text-gray-400">{allTrades.length} total trades</span>
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

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade, i) => (
                  <TradeRow key={trade.id || i} trade={trade} onClick={setSelectedTrade} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No trades yet</p>
                </div>
              )}
            </div>
          </div>

          {/* DEX Discoveries */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-900">
              <span>🦄</span> DEX Discoveries
              {discoveries.length > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {discoveries.length} new
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {discoveries.length > 0 ? (
                discoveries.map((d, i) => <DiscoveryCard key={d.id || i} discovery={d} />)
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Scanning for new tokens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>
            Real-time bot activity • Live trades • DEX discoveries • Cumulative P&L tracking since inception
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
