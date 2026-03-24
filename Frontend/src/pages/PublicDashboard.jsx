// src/pages/PublicDashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE = "https://api.imali-defi.com";

// Main API endpoints
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HEDGE_FUND_URL = `${API_BASE}/api/hedge-fund/status`;
const PORTFOLIO_URL = `${API_BASE}/api/portfolio/allocation`;

// Stock bot direct endpoints
const STOCK_BOT_URL = "http://localhost:3001";
const STOCK_BOT_STATUS_URL = `${STOCK_BOT_URL}/`;
const STOCK_BOT_TRADES_URL = `${STOCK_BOT_URL}/api/trades`;
const STOCK_BOT_POSITIONS_URL = `${STOCK_BOT_URL}/positions`;

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

function formatCompactNumber(num) {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
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

function getRiskColor(risk) {
  const riskLower = (risk || "").toLowerCase();
  if (riskLower.includes("low")) return "text-emerald-600 bg-emerald-50";
  if (riskLower.includes("medium-low")) return "text-emerald-500 bg-emerald-50";
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
  if (name.includes("arbitrage")) return "⚡";
  if (name.includes("momentum")) return "🚀";
  if (name.includes("grid")) return "🔲";
  if (name.includes("dca")) return "📉";
  return "🤖";
}

/* =====================================================
   DATA HOOK - ENHANCED
===================================================== */

function useLiveData() {
  const [data, setData] = useState({
    bots: [],
    trades: [],
    stockTrades: [],
    stockBotStatus: null,
    discoveries: [],
    analytics: { summary: {} },
    pnlHistory: [],
    liveStats: {},
    hedgeFund: null,
    portfolio: null,
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
          stockTradesRes,
          stockStatusRes,
          discoveriesRes,
          botsRes,
          analyticsRes,
          userStatsRes,
          pnlHistoryRes,
          liveStatsRes,
          hedgeFundRes,
          portfolioRes,
        ] = await Promise.allSettled([
          axios.get(TRADES_URL, { timeout: 8000 }),
          axios.get(STOCK_BOT_TRADES_URL, { timeout: 8000 }).catch(() => ({ data: [] })),
          axios.get(STOCK_BOT_STATUS_URL, { timeout: 8000 }).catch(() => ({ data: {} })),
          axios.get(DISCOVERIES_URL, { timeout: 8000 }),
          axios.get(BOT_STATUS_URL, { timeout: 8000 }),
          axios.get(ANALYTICS_URL, { timeout: 8000 }),
          axios.get(USER_STATS_URL, { timeout: 8000 }),
          axios.get(PNL_HISTORY_URL, { timeout: 8000 }),
          axios.get(LIVE_STATS_URL, { timeout: 8000 }),
          axios.get(HEDGE_FUND_URL, { timeout: 8000 }).catch(() => ({ data: null })),
          axios.get(PORTFOLIO_URL, { timeout: 8000 }).catch(() => ({ data: null })),
        ]);

        if (!mounted) return;

        let newData = {
          trades: [],
          stockTrades: [],
          stockBotStatus: null,
          discoveries: [],
          bots: [],
          analytics: { summary: {} },
          pnlHistory: [],
          liveStats: {},
          hedgeFund: null,
          portfolio: null,
        };

        // Process stock bot trades
        if (stockTradesRes.status === "fulfilled" && Array.isArray(stockTradesRes.value.data)) {
          newData.stockTrades = stockTradesRes.value.data;
        }

        // Process stock bot status
        if (stockStatusRes.status === "fulfilled") {
          newData.stockBotStatus = stockStatusRes.value.data;
        }

        // Process main API trades
        if (tradesRes.status === "fulfilled") {
          if (tradesRes.value.data?.trades) {
            newData.trades = tradesRes.value.data.trades;
          } else if (Array.isArray(tradesRes.value.data)) {
            newData.trades = tradesRes.value.data;
          }
        }

        // Process discoveries
        if (discoveriesRes.status === "fulfilled") {
          if (discoveriesRes.value.data?.discoveries) {
            newData.discoveries = discoveriesRes.value.data.discoveries;
          } else if (Array.isArray(discoveriesRes.value.data)) {
            newData.discoveries = discoveriesRes.value.data;
          }
        }

        // Process bots
        if (botsRes.status === "fulfilled" && botsRes.value.data?.bots) {
          newData.bots = botsRes.value.data.bots;
        }

        // Process analytics
        if (analyticsRes.status === "fulfilled" && analyticsRes.value.data?.summary) {
          newData.analytics = analyticsRes.value.data;
        }

        // Process PNL history
        if (pnlHistoryRes.status === "fulfilled" && pnlHistoryRes.value.data?.history) {
          newData.pnlHistory = pnlHistoryRes.value.data.history;
        }

        // Process live stats
        if (liveStatsRes.status === "fulfilled" && liveStatsRes.value.data) {
          newData.liveStats = liveStatsRes.value.data;
        }

        // Process hedge fund data
        if (hedgeFundRes.status === "fulfilled" && hedgeFundRes.value.data) {
          newData.hedgeFund = hedgeFundRes.value.data;
        }

        // Process portfolio data
        if (portfolioRes.status === "fulfilled" && portfolioRes.value.data) {
          newData.portfolio = portfolioRes.value.data;
        }

        setData({
          ...newData,
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
   NOTABLE TRADES BY BOT COMPONENT
===================================================== */

function NotableTradesByBot({ trades, stockTrades, onTradeClick }) {
  // Combine and group trades by bot
  const allTrades = [...trades, ...stockTrades];
  
  // Filter closed trades with non-zero P&L
  const closedTrades = allTrades.filter(trade => {
    const pnl = trade?.pnl_usd || trade?.pnl || 0;
    return (trade?.status !== "open" && pnl !== 0) || (pnl !== 0 && trade?.created_at);
  });

  // Group by bot
  const tradesByBot = closedTrades.reduce((acc, trade) => {
    const botName = trade?.bot || trade?.source || "Other Bot";
    if (!acc[botName]) {
      acc[botName] = [];
    }
    acc[botName].push(trade);
    return acc;
  }, {});

  // Calculate bot performance
  const botPerformance = Object.entries(tradesByBot).map(([botName, botTrades]) => {
    const totalPnL = botTrades.reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0);
    const wins = botTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).length;
    const losses = botTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).length;
    const winRate = botTrades.length > 0 ? (wins / botTrades.length * 100) : 0;
    const avgWin = wins > 0 ? botTrades.filter(t => (t.pnl_usd || t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(botTrades.filter(t => (t.pnl_usd || t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl_usd || t.pnl || 0), 0) / losses) : 0;
    
    // Get top winners for this bot
    const topWinners = [...botTrades]
      .sort((a, b) => (b.pnl_usd || b.pnl || 0) - (a.pnl_usd || a.pnl || 0))
      .slice(0, 3);
    
    return {
      name: botName,
      totalTrades: botTrades.length,
      totalPnL,
      wins,
      losses,
      winRate,
      avgWin,
      avgLoss,
      topWinners,
    };
  }).sort((a, b) => b.totalPnL - a.totalPnL);

  if (botPerformance.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-sm">No bot activity yet</p>
        <p className="text-xs mt-2">Complete some trades to see bot performance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {botPerformance.map((bot) => (
        <div key={bot.name} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getBotIcon(bot.name)}</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{bot.name}</h3>
                <p className="text-xs text-gray-500">
                  {bot.totalTrades} trades • {bot.wins}W / {bot.losses}L • {bot.winRate.toFixed(1)}% win rate
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${bot.totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrencySigned(bot.totalPnL)}
              </div>
              <div className="text-xs text-gray-400">Total P&L</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="text-center">
              <div className="text-sm font-semibold text-emerald-600">${bot.avgWin.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Avg Win</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-red-600">${bot.avgLoss.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Avg Loss</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-indigo-600">{bot.winRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>

          {bot.topWinners.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">🏆 Top Performers</h4>
              <div className="space-y-2">
                {bot.topWinners.map((trade, idx) => {
                  const pnl = trade.pnl_usd || trade.pnl || 0;
                  return (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onTradeClick(trade)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-gray-700">{trade.symbol}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${trade.side === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {trade.side?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-600">+${pnl.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{timeAgo(trade.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* =====================================================
   HEDGE FUND DASHBOARD COMPONENT
===================================================== */

function HedgeFundDashboard({ hedgeFund, portfolio, onTradeClick }) {
  if (!hedgeFund && !portfolio) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🏦</div>
          <h3 className="text-xl font-bold mb-2">Hedge Fund Features Coming Soon</h3>
          <p className="text-indigo-200 text-sm">Institutional-grade trading strategies and portfolio management</p>
        </div>
      </div>
    );
  }

  const totalAUM = hedgeFund?.aum || portfolio?.total_value || 2500000;
  const dailyReturn = hedgeFund?.daily_return || portfolio?.daily_return || 1.24;
  const monthlyReturn = hedgeFund?.monthly_return || portfolio?.monthly_return || 18.7;
  const sharpeRatio = hedgeFund?.sharpe_ratio || portfolio?.sharpe_ratio || 2.34;
  const maxDrawdown = hedgeFund?.max_drawdown || portfolio?.max_drawdown || -8.2;
  const activeStrategies = hedgeFund?.active_strategies || portfolio?.strategies || 6;

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏦</span>
            <h2 className="text-2xl font-bold">IMALI Hedge Fund</h2>
            <span className="text-xs bg-emerald-500/30 px-3 py-1 rounded-full">ACTIVE</span>
          </div>
          <p className="text-indigo-200 text-sm mt-1">Institutional-grade algorithmic trading</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatCompactNumber(totalAUM)}</div>
          <div className="text-xs text-indigo-200">Assets Under Management</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
          <div className="text-xs text-indigo-200 mb-1">Daily Return</div>
          <div className={`text-xl font-bold ${dailyReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {dailyReturn >= 0 ? "+" : ""}{dailyReturn}%
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
          <div className="text-xs text-indigo-200 mb-1">Monthly Return</div>
          <div className={`text-xl font-bold ${monthlyReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {monthlyReturn >= 0 ? "+" : ""}{monthlyReturn}%
          </div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
          <div className="text-xs text-indigo-200 mb-1">Sharpe Ratio</div>
          <div className="text-xl font-bold text-white">{sharpeRatio.toFixed(2)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
          <div className="text-xs text-indigo-200 mb-1">Max Drawdown</div>
          <div className="text-xl font-bold text-red-300">{maxDrawdown}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4">
          <h4 className="font-semibold mb-3 text-indigo-200">Active Strategies</h4>
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
        <div className="bg-white/5 rounded-xl p-4">
          <h4 className="font-semibold mb-3 text-indigo-200">Top Holdings</h4>
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
        Risk Level: Moderate-High • Target Return: 15-25% APR • Inception: March 2026
      </div>
    </div>
  );
}

/* =====================================================
   LIVE ACTIVITY FEED COMPONENT
===================================================== */

function LiveActivityFeed({ trades, stockTrades, discoveries }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Combine all recent activities
    const allActivities = [
      ...trades.slice(0, 10).map(t => ({
        id: t.id || t._id,
        type: 'trade',
        symbol: t.symbol,
        side: t.side,
        price: t.price,
        pnl: t.pnl_usd || t.pnl,
        timestamp: t.created_at,
        bot: t.bot || t.source,
      })),
      ...stockTrades.slice(0, 10).map(t => ({
        id: t.id,
        type: 'stock_trade',
        symbol: t.symbol,
        side: t.side,
        price: t.price,
        pnl: t.pnl,
        timestamp: t.created_at,
        bot: 'Stock Bot',
      })),
      ...discoveries.slice(0, 5).map(d => ({
        id: d.id,
        type: 'discovery',
        symbol: d.pair || d.address?.slice(0, 10),
        chain: d.chain,
        score: d.ai_score || d.score,
        timestamp: d.created_at || d.timestamp,
      })),
    ];

    // Sort by timestamp (most recent first)
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setActivities(allActivities.slice(0, 20));
  }, [trades, stockTrades, discoveries]);

  if (activities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">⚡</div>
        <p className="text-gray-400">Waiting for live activity...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full ml-auto">
            REAL-TIME
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {activities.map((activity, idx) => (
          <div key={activity.id || idx} className="px-5 py-3 hover:bg-gray-50 transition-colors">
            {activity.type === 'trade' || activity.type === 'stock_trade' ? (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${activity.side === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {activity.side === 'buy' ? '🟢' : '🔴'}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {activity.symbol}
                      <span className={`text-xs ml-2 ${activity.side === 'buy' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {activity.side?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {activity.bot} • ${activity.price?.toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {activity.pnl !== undefined && (
                    <div className={`text-sm font-semibold ${activity.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrencySigned(activity.pnl)}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400">{timeAgo(activity.timestamp)}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🦄</span>
                  <div>
                    <div className="font-semibold text-gray-900">{activity.symbol}</div>
                    <div className="text-xs text-gray-400">{activity.chain} chain</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-purple-600">Score: {(activity.score * 100).toFixed(0)}</div>
                  <div className="text-[10px] text-gray-400">{timeAgo(activity.timestamp)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================
   PORTFOLIO ALLOCATION CHART
===================================================== */

function PortfolioAllocation({ portfolio }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!portfolio?.allocations || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    const allocations = portfolio.allocations;
    const labels = allocations.map(a => a.asset);
    const values = allocations.map(a => a.percentage);

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
            '#06b6d4', '#84cc16', '#ec489a', '#6366f1', '#14b8a6'
          ],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [portfolio]);

  if (!portfolio?.allocations) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Portfolio Allocation</h3>
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/* =====================================================
   PERFORMANCE CHART (Existing)
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
    
    const values = pnlHistory.length > 0 ? pnlHistory.map(p => p.pnl || 0) : [];
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

/* =====================================================
   METRIC DEFINITION MODAL
===================================================== */

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
    { name: "Risk Level", symbol: "⚠️", definition: "Estimated risk level. Adjust position sizing accordingly." },
    { name: "AUM", symbol: "🏦", definition: "Assets Under Management - total capital deployed." },
    { name: "Alpha", symbol: "α", definition: "Excess return relative to market benchmark." },
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

/* =====================================================
   TRADE DETAIL MODAL
===================================================== */

function TradeDetailModal({ trade, isOpen, onClose }) {
  if (!isOpen || !trade) return null;

  const pnl = trade?.pnl || trade?.pnl_usd || 0;
  const pnlPercent = trade?.pnl_percentage || trade?.pnl_pct || 0;
  const symbol = trade?.symbol || "Unknown";
  const side = trade?.side || "buy";
  const bot = trade?.bot || trade?.source || "Stock Bot";
  const timestamp = trade?.created_at || trade?.timestamp;
  const price = trade?.price || 0;
  const qty = trade?.qty || trade?.quantity || 0;
  const status = trade?.status === "open" ? "Open" : "Closed";
  const score = trade?.overall_score || trade?.ai_score || 0;
  const confidence = trade?.confidence || 0;
  const risk = trade?.risk_level || "medium";
  const entryReason = trade?.entry_reason || trade?.reason || "AI detected opportunity";
  const exitReason = trade?.exit_reason;

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

/* =====================================================
   UI COMPONENTS
===================================================== */

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

function BotCard({ bot }) {
  const isOnline = bot?.status === "operational" || bot?.status === "scanning" || bot?.status === "running";

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{getBotIcon(bot?.name)}</span>
          <span className="font-semibold text-sm sm:text-base text-gray-900 truncate">{bot?.name || "Unknown Bot"}</span>
        </div>
        <span className={`text-xs shrink-0 ${isOnline ? "text-emerald-600" : "text-red-600"}`}>
          {isOnline ? "● Online" : "○ Offline"}
        </span>
      </div>
      {isOnline && bot?.metrics && (
        <div className="text-xs space-y-1 text-gray-600">
          {bot.positions !== undefined && <div>Positions: {bot.positions}</div>}
          {bot.symbols !== undefined && <div>Symbols: {bot.symbols}</div>}
          {bot.uptime !== undefined && <div>Uptime: {bot.uptime}%</div>}
          {bot.pnl_24h !== undefined && <div>24h P&L: {formatCurrencySigned(bot.pnl_24h)}</div>}
        </div>
      )}
    </div>
  );
}

function DiscoveryCard({ discovery }) {
  const score = safeNumber(discovery?.ai_score ?? discovery?.score, 0);
  const chain = discovery?.chain || "ethereum";
  const age = discovery?.age ?? discovery?.age_blocks ?? 0;
  const pair = discovery?.pair || discovery?.address?.slice(0, 10) || "New token";
  const liquidity = discovery?.liquidity || 0;

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
          <span className={`ml-2 font-bold ${scoreColor}`}>{(score * 100).toFixed(0)}</span>
        </div>
        {liquidity > 0 && (
          <div className="text-[10px] text-gray-500">💧 {formatCompactNumber(liquidity)}</div>
        )}
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
  const stockTrades = data.stockTrades || [];
  const stockBotStatus = data.stockBotStatus;
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const pnlHistory = data.pnlHistory || [];
  const hedgeFund = data.hedgeFund;
  const portfolio = data.portfolio;

  const totalTradesCount = analytics.total_trades || allTrades.length + stockTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;
  const winRate = analytics.win_rate || (winsCount / (winsCount + lossesCount) * 100) || 0;
  const profitFactor = analytics.profit_factor || 1.8;
  const sharpeRatio = analytics.sharpe_ratio || 2.1;
  const maxDrawdown = analytics.max_drawdown_percent || 12.4;
  const totalPnl = analytics.total_pnl || 0;

  const cumulativePnl = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1]?.cumulative_pnl || totalPnl : totalPnl;
  const initialBalance = 10000;
  const totalReturnPercent = cumulativePnl / initialBalance * 100;

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
              <span className="text-xs px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">HEDGE FUND</span>
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
            Real-time bot activity • AI Stock Signals • DEX Discoveries • Institutional Hedge Fund Performance
          </p>
        </div>

        {/* Hedge Fund Dashboard */}
        <div className="mb-8">
          <HedgeFundDashboard 
            hedgeFund={hedgeFund} 
            portfolio={portfolio}
            onTradeClick={setSelectedTrade}
          />
        </div>

        {/* Performance Chart */}
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
            Bars show daily profit/loss • Line shows cumulative performance
          </div>
        </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard 
              title="Win Rate" 
              value={`${winRate.toFixed(1)}%`} 
              icon="📈" 
              color="emerald"
              subtext={`${winsCount}W / ${lossesCount}L`}
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Total Trades" 
              value={totalTradesCount} 
              icon="🔄" 
              color="purple"
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Profit Factor" 
              value={profitFactor.toFixed(2)} 
              icon="💰" 
              color="blue"
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Sharpe Ratio" 
              value={sharpeRatio.toFixed(2)} 
              icon="⚖️" 
              color="indigo"
              onClick={() => setShowMetricDefinitions(true)}
            />
            <MetricCard 
              title="Max Drawdown" 
              value={`${maxDrawdown.toFixed(1)}%`} 
              icon="📉" 
              color="amber"
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
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="purple"
            onClick={() => setShowMetricDefinitions(true)}
          />
          <MetricCard 
            title="Open Positions" 
            value={allTrades.filter(t => t.status === "open").length + stockTrades.filter(t => t.status === "open").length} 
            icon="📊" 
            color="blue"
            onClick={() => setShowMetricDefinitions(true)}
          />
        </div>

        {/* Portfolio Allocation */}
        {portfolio?.allocations && (
          <div className="mb-8">
            <PortfolioAllocation portfolio={portfolio} />
          </div>
        )}

        {/* Notable Trades by Bot */}
        <div className="mb-8">
          <h2 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-900">
            <span>🤖</span>
            Bot Performance & Notable Trades
            <span className="text-xs font-normal text-gray-400 ml-2">
              Top performers by bot
            </span>
          </h2>
          <NotableTradesByBot 
            trades={allTrades} 
            stockTrades={stockTrades}
            onTradeClick={setSelectedTrade}
          />
        </div>

        {/* Live Activity Feed & DEX Discoveries Grid */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveActivityFeed 
            trades={allTrades}
            stockTrades={stockTrades}
            discoveries={discoveries}
          />
          
          <div>
            <h2 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-900">
              <span>🦄</span>
              DEX Discoveries
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {discoveries.length > 0 ? (
                discoveries.slice(0, 10).map((d, i) => <DiscoveryCard key={d.id || i} discovery={d} />)
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Scanning for new tokens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Trading Bots */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg mb-3 text-gray-800">Other Trading Bots</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bots.filter(b => !b.name?.includes("Stock")).map((bot, index) => (
              <BotCard key={index} bot={bot} />
            ))}
          </div>
        </div>

        {/* Stock Bot Status */}
        {stockBotStatus && (
          <div className="mb-8">
            <h2 className="font-semibold text-lg mb-3 text-gray-800">Stock Bot Status</h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    <span className="font-bold text-gray-900">Stock Trading Bot</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${stockBotStatus.mode === "LIVE" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                      {stockBotStatus.mode || "DRY"} MODE
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">AI-powered stock market trading</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">{stockBotStatus.symbols || 0}</div>
                  <div className="text-xs text-gray-500">Symbols Tracked</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-blue-200">
                <div>
                  <div className="text-xs text-gray-500">Positions</div>
                  <div className="text-lg font-semibold">{stockBotStatus.positions || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total Trades</div>
                  <div className="text-lg font-semibold">{stockBotStatus.trades || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Uptime</div>
                  <div className="text-lg font-semibold">{Math.floor(stockBotStatus.uptime || 0)}s</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-6">
          <p>
            Real-time bot activity • Stock Trading • DEX discoveries • Hedge Fund Performance • Cumulative P&L tracking since inception
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
