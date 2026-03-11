// src/pages/PublicDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Chart from "chart.js/auto";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE =
  process.env.REACT_APP_API_BASE?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

// ENHANCED: Added more endpoints
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const PNL_HISTORY_URL = `${API_BASE}/api/pnl/history`;
const PUBLIC_TIERS_URL = `${API_BASE}/api/public/tiers`;
const PUBLIC_FAQ_URL = `${API_BASE}/api/public/faq`;
const PUBLIC_ROADMAP_URL = `${API_BASE}/api/public/roadmap`;
const TRADING_PAIRS_URL = `${API_BASE}/api/trading/pairs`;
const TRADING_STRATEGIES_URL = `${API_BASE}/api/trading/strategies`;
const USER_STATS_URL = `${API_BASE}/api/user/stats`;

const DEFAULT_STATE = {
  bots: [],
  trades: [],
  discoveries: [],
  analytics: {
    summary: {
      total_trades: 0,
      win_rate: 0,
      profit_factor: 0,
      total_pnl: 0,
      wins: 0,
      losses: 0,
      avg_win: 0,
      avg_loss: 0,
      largest_win: 0,
      largest_loss: 0,
      sharpe_ratio: 0,
      max_drawdown_percent: 0
    }
  },
  pnlHistory: [],
  userStats: {
    total_users: 0,
    active_users: 0,
    total_trades_platform: 0,
    total_volume: 0,
    avg_trade_size: 0,
    growth_rate: 0,
    top_traders: []
  },
  tradingPairs: [],
  tradingStrategies: [],
  publicTiers: {},
  publicFaq: [],
  publicRoadmap: {},
  loading: true,
  error: null,
  lastUpdate: null,
  lastSuccessAt: null,
};

/* =====================================================
   HELPERS (unchanged - keep all existing helpers)
===================================================== */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

function formatCompact(value) {
  return safeNumber(value).toLocaleString();
}

function timeAgo(timestamp) {
  if (!timestamp) return "—";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    if (diffMs < 0) return "just now";

    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (sec < 30) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${day}d ago`;
  } catch {
    return "—";
  }
}

function formatClock(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return "—";
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch {
    return "—";
  }
}

function formatShortDate(timestamp) {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "—";
  }
}

function getTradeTimestamp(trade) {
  return trade?.created_at || trade?.timestamp || trade?.time || null;
}

function getTradePnlUsd(trade) {
  return trade?.pnl_usd ?? trade?.pnl ?? 0;
}

function getTradePnlPercent(trade) {
  return trade?.pnl_percentage ?? trade?.pnl_pct ?? trade?.return_percent ?? 0;
}

function getTradeSide(trade) {
  return String(trade?.side || trade?.action || "").toLowerCase();
}

function getTradeBot(trade) {
  return trade?.bot || trade?.source || trade?.exchange || "Unknown";
}

function getTradePrice(trade) {
  return trade?.price ?? trade?.entry_price ?? 0;
}

function getTradeQty(trade) {
  return trade?.qty ?? trade?.quantity ?? trade?.size ?? 0;
}

/* =====================================================
   ENHANCED DATA HOOK - Now fetches more data
===================================================== */

function useLiveData() {
  const [data, setData] = useState(DEFAULT_STATE);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const backoffRef = useRef(30000);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      // Fetch from all our endpoints - expanded list
      const [
        tradesRes, 
        discoveriesRes, 
        botsRes, 
        analyticsRes,
        userStatsRes,
        pnlHistoryRes,
        tradingPairsRes,
        tradingStrategiesRes
      ] = await Promise.allSettled([
        axios.get(TRADES_URL, { timeout: 5000, signal }),
        axios.get(DISCOVERIES_URL, { timeout: 5000, signal }),
        axios.get(BOT_STATUS_URL, { timeout: 5000, signal }),
        axios.get(ANALYTICS_URL, { timeout: 5000, signal }),
        axios.get(USER_STATS_URL, { timeout: 5000, signal }),
        axios.get(PNL_HISTORY_URL, { timeout: 5000, signal }),
        axios.get(TRADING_PAIRS_URL, { timeout: 5000, signal }),
        axios.get(TRADING_STRATEGIES_URL, { timeout: 5000, signal })
      ]);

      if (!mountedRef.current) return;

      const now = new Date();
      let newData = { ...DEFAULT_STATE };
      let hadError = false;

      // Process trades
      if (tradesRes.status === "fulfilled") {
        newData.trades = tradesRes.value.data.trades || [];
      } else {
        hadError = true;
        console.warn("Trades fetch failed");
      }

      // Process discoveries
      if (discoveriesRes.status === "fulfilled") {
        newData.discoveries = discoveriesRes.value.data.discoveries || [];
      } else {
        hadError = true;
        console.warn("Discoveries fetch failed");
      }

      // Process bots
      if (botsRes.status === "fulfilled") {
        newData.bots = botsRes.value.data.bots || [];
      } else {
        hadError = true;
        console.warn("Bots fetch failed");
      }

      // Process analytics
      if (analyticsRes.status === "fulfilled") {
        newData.analytics = analyticsRes.value.data;
      } else {
        hadError = true;
        console.warn("Analytics fetch failed");
      }

      // ENHANCED: Process user stats
      if (userStatsRes.status === "fulfilled") {
        newData.userStats = userStatsRes.value.data || DEFAULT_STATE.userStats;
      } else {
        console.warn("User stats fetch failed");
      }

      // ENHANCED: Process P&L history
      if (pnlHistoryRes.status === "fulfilled") {
        newData.pnlHistory = pnlHistoryRes.value.data.history || [];
      } else {
        console.warn("PNL history fetch failed");
      }

      // ENHANCED: Process trading pairs
      if (tradingPairsRes.status === "fulfilled") {
        newData.tradingPairs = tradingPairsRes.value.data.pairs || [];
      } else {
        console.warn("Trading pairs fetch failed");
      }

      // ENHANCED: Process trading strategies
      if (tradingStrategiesRes.status === "fulfilled") {
        newData.tradingStrategies = tradingStrategiesRes.value.data.strategies || [];
      } else {
        console.warn("Trading strategies fetch failed");
      }

      setData({
        ...newData,
        loading: false,
        error: hadError ? "Some data is currently unavailable" : null,
        lastUpdate: now,
        lastSuccessAt: now,
      });

      backoffRef.current = 30000; // Reset backoff on success

    } catch (err) {
      if (!mountedRef.current || axios.isCancel(err)) return;
      
      console.error("Data fetch error:", err);
      backoffRef.current = Math.min(backoffRef.current * 1.5, 120000);
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: `Connection issue. Retrying in ${Math.ceil(backoffRef.current / 1000)}s...`,
        lastUpdate: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchAllData();

    // Set up polling
    const poll = () => {
      if (!mountedRef.current) return;
      fetchAllData();
      timerRef.current = setTimeout(poll, backoffRef.current);
    };
    
    timerRef.current = setTimeout(poll, backoffRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchAllData]);

  return data;
}

/* =====================================================
   ENHANCED: New components for additional data
===================================================== */

function TopTraderCard({ trader }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">🏆</span>
        <span className="font-medium truncate">{trader.username}</span>
      </div>
      <div className="text-right shrink-0">
        <div className="text-emerald-400">{trader.trades} trades</div>
        <div className="text-[10px] text-amber-400">${trader.pnl.toLocaleString()}</div>
      </div>
    </div>
  );
}

function PairCard({ pair }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs hover:bg-white/10 transition-all">
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold">{pair.symbol}</span>
        <span className="text-emerald-400">{pair.name}</span>
      </div>
      <div className="flex justify-between text-white/40 text-[10px]">
        <span>Min: ${pair.min_amount}</span>
        <span>Max: ${pair.max_amount}</span>
      </div>
    </div>
  );
}

function StrategyCard({ strategy }) {
  const riskColors = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400"
  };

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="font-semibold text-sm">{strategy.name}</h4>
          <p className="text-[10px] text-white/40 mt-1">{strategy.description}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full ${riskColors[strategy.risk_level] || "text-white/40"} bg-white/5`}>
          {strategy.risk_level} risk
        </span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">Min: ${strategy.min_investment}</span>
        <span className="text-emerald-400">{strategy.expected_apy}</span>
      </div>
    </div>
  );
}

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
    
    const labels = pnlHistory.map((_, i) => `Day ${i+1}`);
    const values = pnlHistory.length > 0 ? pnlHistory : [0, 0, 0, 0, 0, 0, 0];

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Daily P&L",
          data: values,
          backgroundColor: values.map(v => v >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"),
          borderColor: values.map(v => v >= 0 ? "#10b981" : "#ef4444"),
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#9ca3af" },
          },
          x: {
            grid: { display: false },
            ticks: { color: "#9ca3af" },
          }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [pnlHistory]);

  return (
    <div className="h-40">
      <canvas ref={canvasRef} />
    </div>
  );
}

/* =====================================================
   EXISTING COMPONENTS (keep all your existing components)
   - Heartbeat
   - StatCard
   - MetricRow
   - BotCard
   - TradeRow
   - DiscoveryCard
   - InvestorPanel
   - JourneyTimelineChart
   - ReadinessMeter
   - MilestoneCard
===================================================== */

// [Keep all your existing component definitions here exactly as they were]

/* =====================================================
   MAIN COMPONENT - ENHANCED
===================================================== */

export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState("all");
  const [clock, setClock] = useState(new Date());
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allTrades = data.trades || [];
  const discoveries = data.discoveries || [];
  const bots = data.bots || [];
  const analytics = data.analytics?.summary || {};
  const userStats = data.userStats || {};
  const pnlHistory = data.pnlHistory || [];
  const tradingPairs = data.tradingPairs || [];
  const tradingStrategies = data.tradingStrategies || [];

  const totalPnL = analytics.total_pnl || 0;
  const totalTradesCount = analytics.total_trades || allTrades.length;
  const winsCount = analytics.wins || 0;
  const lossesCount = analytics.losses || 0;
  const winRate = analytics.win_rate || 0;
  const avgWin = analytics.avg_win || 0;
  const avgLoss = analytics.avg_loss || 0;
  const largestWin = analytics.largest_win || 0;
  const largestLoss = analytics.largest_loss || 0;
  const sharpeRatio = analytics.sharpe_ratio || 0;
  const maxDrawdown = analytics.max_drawdown_percent || 0;

  const isOpenTrade = (trade) => {
    const pnl = getTradePnlUsd(trade);
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

  if (data.loading && !data.lastSuccessAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">Connecting to trading bots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-[#0d1324] to-indigo-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300">
                LIVE
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
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
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Building in Public
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
            Watch our multi-bot trading infrastructure come to life. Every trade, every discovery, every milestone — in real-time.
          </p>
        </div>

        {/* ENHANCED: Quick Stats Banner */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2 text-center">
            <div className="text-xs text-indigo-300">Win Rate</div>
            <div className="text-lg font-bold text-indigo-400">{winRate}%</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
            <div className="text-xs text-emerald-300">Sharpe</div>
            <div className="text-lg font-bold text-emerald-400">{sharpeRatio}</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
            <div className="text-xs text-amber-300">Max DD</div>
            <div className="text-lg font-bold text-amber-400">{maxDrawdown}%</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
            <div className="text-xs text-purple-300">Users</div>
            <div className="text-lg font-bold text-purple-400">{userStats.total_users || 0}</div>
          </div>
        </div>

        {/* Hero Chart */}
        <div className="mb-6 bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <span>🗺️</span>
              Our Journey to 500 Trades
            </h2>
            <div className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              {totalTradesCount} / 500 Trades
            </div>
          </div>
          <JourneyTimelineChart totalTrades={totalTradesCount} />
        </div>

        {/* Stats Cards - ENHANCED with more metrics */}
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
            subtext={`Avg Win: ${formatCurrency(avgWin)} · Avg Loss: ${formatCurrency(avgLoss)}`}
          />
          <StatCard 
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="emerald" 
            subtext="systems online" 
          />
          <StatCard 
            title="Discoveries" 
            value={discoveries.length} 
            icon="🦄" 
            color="amber" 
            subtext="new tokens" 
          />
        </div>

        {/* ENHANCED: Platform Stats */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard 
            title="Platform Users" 
            value={userStats.total_users || 0} 
            icon="👥" 
            color="indigo" 
            subtext={`${userStats.active_users || 0} active`}
          />
          <StatCard 
            title="Total Volume" 
            value={formatCurrency(userStats.total_volume || 0)} 
            icon="📈" 
            color="emerald" 
          />
          <StatCard 
            title="Avg Trade" 
            value={formatCurrency(userStats.avg_trade_size || 0)} 
            icon="📊" 
            color="purple" 
          />
          <StatCard 
            title="Growth" 
            value={`${userStats.growth_rate || 0}%`} 
            icon="📈" 
            color="amber" 
            subtext="month over month"
          />
        </div>

        {/* Investor Panel */}
        <div className="mb-6">
          <InvestorPanel data={data} />
        </div>

        {/* ENHANCED: Top Traders */}
        {userStats.top_traders && userStats.top_traders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>🏆</span>
                Top Traders
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {userStats.top_traders.map((trader, i) => (
                <TopTraderCard key={i} trader={trader} />
              ))}
            </div>
          </div>
        )}

        {/* Bot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {bots.map((bot, index) => (
            <BotCard key={index} bot={bot} />
          ))}
        </div>

        {/* ENHANCED: Toggle for advanced sections */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
        >
          {showAdvanced ? "▼ Hide Advanced Stats" : "▶ Show Advanced Stats"}
        </button>

        {showAdvanced && (
          <>
            {/* ENHANCED: Trading Pairs */}
            {tradingPairs.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <span>💱</span>
                  Available Trading Pairs
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {tradingPairs.map((pair, i) => (
                    <PairCard key={i} pair={pair} />
                  ))}
                </div>
              </div>
            )}

            {/* ENHANCED: Trading Strategies */}
            {tradingStrategies.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                  <span>🧠</span>
                  Trading Strategies
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {tradingStrategies.map((strategy, i) => (
                    <StrategyCard key={i} strategy={strategy} />
                  ))}
                </div>
              </div>
            )}

            {/* ENHANCED: P&L History Chart */}
            {pnlHistory.length > 0 && (
              <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
                <h2 className="font-bold text-lg mb-3">Daily P&L History</h2>
                <VolumeChart pnlHistory={pnlHistory} />
              </div>
            )}

            {/* ENHANCED: Detailed Analytics */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-white/40">Largest Win</div>
                <div className="text-lg font-bold text-emerald-400">{formatCurrency(largestWin)}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-white/40">Largest Loss</div>
                <div className="text-lg font-bold text-red-400">{formatCurrency(largestLoss)}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-white/40">Profit Factor</div>
                <div className="text-lg font-bold text-purple-400">{analytics.profit_factor || 0}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="text-xs text-white/40">Avg Trade</div>
                <div className="text-lg font-bold text-amber-400">
                  {formatCurrency(totalTradesCount > 0 ? totalPnL / totalTradesCount : 0)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Two Column Layout - Trades and Discoveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Trade Feed */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Trade Feed
              </h2>
              <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      activeTab === tab.id ? "bg-emerald-600 text-white" : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade, i) => (
                  <TradeRow key={i} trade={trade} />
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No trades yet</p>
                </div>
              )}
            </div>
          </div>

          {/* DEX Discoveries */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <span>🦄</span>
              DEX Discoveries
              {discoveries.length > 0 && (
                <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                  {discoveries.length} new
                </span>
              )}
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {discoveries.length > 0 ? (
                discoveries.map((d, i) => (
                  <DiscoveryCard key={i} discovery={d} />
                ))
              ) : (
                <div className="text-center py-12 text-white/30">
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="text-sm">Scanning for new tokens...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>
            Building in public • Real-time infrastructure • Every milestone visible
            <br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link>
            {" • "}
            <Link to="/pricing" className="text-indigo-400 hover:underline">Pricing</Link>
            {" • "}
            <Link to="/referrals" className="text-amber-400 hover:underline">Referrals</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
