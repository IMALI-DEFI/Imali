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
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
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
   REAL DATA HOOK
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
        initial_balance: 10000,
        current_balance: 0,
        total_return_percent: 0,
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

        // Process trades
        if (tradesRes.status === "fulfilled" && tradesRes.value.data?.trades) {
          newData.trades = tradesRes.value.data.trades;
        } else if (tradesRes.status === "fulfilled" && tradesRes.value.data) {
          newData.trades = tradesRes.value.data;
        }

        // Process discoveries
        if (discoveriesRes.status === "fulfilled" && discoveriesRes.value.data?.discoveries) {
          newData.discoveries = discoveriesRes.value.data.discoveries;
        }

        // Process bots
        if (botsRes.status === "fulfilled" && botsRes.value.data?.bots) {
          newData.bots = botsRes.value.data.bots;
        }

        // Process analytics - Enhanced with cumulative P&L
        let analyticsData = { summary: {} };
        if (analyticsRes.status === "fulfilled" && analyticsRes.value.data?.summary) {
          analyticsData = analyticsRes.value.data;
        }
        
        // Calculate cumulative P&L and returns
        const trades = newData.trades;
        let cumulativePnl = 0;
        let initialBalance = 10000; // Starting balance
        let currentBalance = initialBalance;
        
        // Sort trades by date to calculate cumulative correctly
        const sortedTrades = [...trades].sort((a, b) => {
          const dateA = new Date(a?.created_at || a?.timestamp || 0);
          const dateB = new Date(b?.created_at || b?.timestamp || 0);
          return dateA - dateB;
        });
        
        sortedTrades.forEach(trade => {
          const pnl = trade?.pnl_usd || trade?.pnl || 0;
          if (trade?.status !== "open") {
            cumulativePnl += pnl;
            currentBalance += pnl;
          }
        });
        
        const totalReturnPercent = initialBalance > 0 ? (cumulativePnl / initialBalance) * 100 : 0;
        
        analyticsData.summary = {
          ...analyticsData.summary,
          cumulative_pnl: cumulativePnl,
          initial_balance: initialBalance,
          current_balance: currentBalance,
          total_return_percent: totalReturnPercent,
        };

        // Process bot history for cumulative data
        let botHistory = {};
        if (botHistoryRes.status === "fulfilled" && botHistoryRes.value.data) {
          botHistory = botHistoryRes.value.data;
          // If bot history has cumulative data, use it
          if (botHistory.summary?.cumulative_pnl) {
            analyticsData.summary.cumulative_pnl = botHistory.summary.cumulative_pnl;
            analyticsData.summary.current_balance = initialBalance + botHistory.summary.cumulative_pnl;
            analyticsData.summary.total_return_percent = (botHistory.summary.cumulative_pnl / initialBalance) * 100;
          }
        }

        // Process PNL history
        if (pnlHistoryRes.status === "fulfilled" && pnlHistoryRes.value.data?.history) {
          newData.pnlHistory = pnlHistoryRes.value.data.history;
        } else if (botHistory.pnl_by_day) {
          newData.pnlHistory = botHistory.pnl_by_day;
        }

        // Process user stats
        if (userStatsRes.status === "fulfilled" && userStatsRes.value.data) {
          newData.userStats = userStatsRes.value.data;
        }

        setData({
          ...newData,
          analytics: analyticsData,
          botHistory,
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
   NOTABLE TRADES COMPONENT
===================================================== */

function NotableTrades({ trades }) {
  // Filter out open trades and get only closed trades with non-zero P&L
  const closedTrades = trades.filter(trade => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return (trade?.status !== "open" && pnl !== 0) || (pnl !== 0 && trade?.created_at);
  });

  // Get top 5 winners (highest P&L)
  const topWinners = [...closedTrades]
    .sort((a, b) => {
      const pnlA = a?.pnl_usd || a?.pnl || 0;
      const pnlB = b?.pnl_usd || b?.pnl || 0;
      return pnlB - pnlA;
    })
    .slice(0, 5);

  // Get top 5 losers (lowest P&L)
  const topLosers = [...closedTrades]
    .sort((a, b) => {
      const pnlA = a?.pnl_usd || a?.pnl || 0;
      const pnlB = b?.pnl_usd || b?.pnl || 0;
      return pnlA - pnlB;
    })
    .slice(0, 5);

  if (topWinners.length === 0 && topLosers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-sm">No notable trades yet</p>
        <p className="text-xs mt-2">Complete some trades to see top performers</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Best Performers */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span>
          <h3 className="font-bold text-lg text-gray-900">Best Performers</h3>
          <span className="ml-auto text-xs text-emerald-600 bg-emerald-200 px-2 py-1 rounded-full">
            Top {topWinners.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {topWinners.map((trade, idx) => {
            const pnl = trade?.pnl_usd || trade?.pnl || 0;
            const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
            const symbol = trade?.symbol || "Unknown";
            const side = trade?.side || "buy";
            const bot = trade?.bot || trade?.source || "Unknown";
            const timestamp = trade?.created_at || trade?.timestamp;
            const qty = trade?.qty || trade?.quantity || 0;
            const price = trade?.price || 0;
            
            return (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-gray-900">{symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {side.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{bot}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">P&L:</span>
                        <span className="ml-1 font-semibold text-emerald-600">
                          +${pnl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Return:</span>
                        <span className="ml-1 font-semibold text-emerald-600">
                          +{Math.abs(pnlPercent).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Qty:</span>
                        <span className="ml-1 font-medium">
                          {qty.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {timeAgo(timestamp)} • Price: ${price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      +${pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">
                      #{idx + 1} Top Trade
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {topWinners.length === 5 && (
          <div className="mt-3 text-center text-xs text-emerald-600">
            🎉 These are your most profitable trades so far!
          </div>
        )}
      </div>

      {/* Worst Performers */}
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📉</span>
          <h3 className="font-bold text-lg text-gray-900">Worst Performers</h3>
          <span className="ml-auto text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full">
            Top {topLosers.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {topLosers.map((trade, idx) => {
            const pnl = trade?.pnl_usd || trade?.pnl || 0;
            const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || (pnl / 1000 * 100);
            const symbol = trade?.symbol || "Unknown";
            const side = trade?.side || "buy";
            const bot = trade?.bot || trade?.source || "Unknown";
            const timestamp = trade?.created_at || trade?.timestamp;
            const qty = trade?.qty || trade?.quantity || 0;
            const price = trade?.price || 0;
            
            return (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg text-gray-900">{symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {side.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{bot}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">P&L:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          ${pnl.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Return:</span>
                        <span className="ml-1 font-semibold text-red-600">
                          {pnlPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Qty:</span>
                        <span className="ml-1 font-medium">
                          {qty.toFixed(4)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {timeAgo(timestamp)} • Price: ${price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      ${pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      #{idx + 1} Loss
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {topLosers.length === 5 && (
          <div className="mt-3 text-center text-xs text-red-600">
            📊 Learning opportunities - review these trades for insights
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   CHART COMPONENTS
===================================================== */

function VolumeChart({ pnlHistory = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvas.getContext("2d");
    
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.pnl || p) : [0, 0, 0, 0, 0, 0, 0];
    
    // Calculate cumulative for overlay
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
          },
          {
            label: "Cumulative P&L",
            data: cumulativeValues,
            type: "line",
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#6366f1",
            fill: true,
            tension: 0.4,
            yAxisID: "y1",
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.label === "Daily P&L") {
                  return formatCurrencySigned(context.raw);
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
              color: "#6b7280",
              callback: (value) => formatCurrency(value)
            },
            title: {
              display: true,
              text: "Daily P&L",
              color: "#6b7280"
            }
          },
          y1: {
            position: "right",
            grid: { display: false },
            ticks: { 
              color: "#6366f1",
              callback: (value) => formatCurrency(value)
            },
            title: {
              display: true,
              text: "Cumulative P&L",
              color: "#6366f1"
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: "#6b7280" }
          }
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
   UI COMPONENTS
===================================================== */

function StatCard({ title, value, icon, subtext, color = "emerald" }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    purple: "text-purple-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{title}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
          {subtext ? <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtext}</p> : null}
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
          {bot.active_networks && <div>Networks: {bot.active_networks.join(", ")}</div>}
        </div>
      )}
    </div>
  );
}

function TradeRow({ trade }) {
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
    <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
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
          <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
            Ready
          </span>
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

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const pnlHistory = data.pnlHistory || [];

  const totalPnL = analytics.total_pnl || 0;
  const cumulativePnl = analytics.cumulative_pnl || totalPnL;
  const initialBalance = analytics.initial_balance || 10000;
  const currentBalance = analytics.current_balance || (initialBalance + cumulativePnl);
  const totalReturnPercent = analytics.total_return_percent || (cumulativePnl / initialBalance * 100);
  const totalTradesCount = analytics.total_trades || allTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;
  const winRate = analytics.win_rate || (totalTradesCount > 0 ? (winsCount / totalTradesCount * 100) : 0);

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
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>Real-time data</span>
              </div>
              <div>Last update: {data.lastUpdate ? timeAgo(data.lastUpdate) : "—"}</div>
              <div>{clock.toLocaleTimeString()}</div>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all"
              >
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

        {/* Performance Overview Cards */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <div className="text-xs text-indigo-600">Win Rate</div>
            <div className="text-xl font-bold text-indigo-700">{Math.round(winRate)}%</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-xs text-emerald-600">Total P&L</div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrencySigned(totalPnL)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <div className="text-xs text-purple-600">Cumulative P&L</div>
            <div className="text-xl font-bold text-purple-700">{formatCurrencySigned(cumulativePnl)}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-xs text-blue-600">Total Return</div>
            <div className={`text-xl font-bold ${totalReturnPercent >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {totalReturnPercent >= 0 ? "+" : ""}{totalReturnPercent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-xs text-amber-600">Active Bots</div>
            <div className="text-xl font-bold text-amber-700">{bots.length}</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard 
            title="Total Trades" 
            value={totalTradesCount} 
            icon="📊" 
            color="purple" 
            subtext={`${winsCount} wins · ${lossesCount} losses`} 
          />
          <StatCard 
            title="Total P&L" 
            value={formatCurrencySigned(totalPnL)} 
            icon="💰" 
            color={totalPnL >= 0 ? "emerald" : "red"} 
            subtext={`Win Rate: ${Math.round(winRate)}%`}
          />
          <StatCard 
            title="Cumulative P&L" 
            value={formatCurrencySigned(cumulativePnl)} 
            icon="📈" 
            color={cumulativePnl >= 0 ? "emerald" : "red"} 
            subtext={`From ${formatCurrency(initialBalance)} start`}
          />
          <StatCard 
            title="Current Balance" 
            value={formatCurrency(currentBalance)} 
            icon="💵" 
            color="blue" 
            subtext={`${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}% return`}
          />
        </div>

        {/* Bot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {bots.length > 0 ? (
            bots.map((bot, index) => (
              <BotCard key={index} bot={bot} />
            ))
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-400">
              No bot data available
            </div>
          )}
        </div>

        {/* Notable Trades Section */}
        <div className="mb-6">
          <h2 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-900">
            <span>🏆</span>
            Most Notable Trades
            <span className="text-xs font-normal text-gray-400 ml-2">
              Top winners and losers from all time
            </span>
          </h2>
          <NotableTrades trades={allTrades} />
        </div>

        {/* P&L History Chart */}
        {pnlHistory.length > 0 && (
          <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-3 text-gray-900">
              P&L History
              <span className="text-xs font-normal text-gray-400 ml-2">
                Daily performance with cumulative trend
              </span>
            </h2>
            <div className="h-80">
              <VolumeChart pnlHistory={pnlHistory} />
            </div>
          </div>
        )}

        {/* Two Column Layout - Trades and Discoveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Trade Feed */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Trade Feed
                <span className="text-xs font-normal text-gray-400">
                  {allTrades.length} total trades
                </span>
              </h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id 
                        ? "bg-emerald-600 text-white" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
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
                  <TradeRow key={trade.id || i} trade={trade} />
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
              <span>🦄</span>
              DEX Discoveries
              {discoveries.length > 0 && (
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {discoveries.length} new
                </span>
              )}
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {discoveries.length > 0 ? (
                discoveries.map((d, i) => (
                  <DiscoveryCard key={d.id || i} discovery={d} />
                ))
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
    </div>
  );
}
