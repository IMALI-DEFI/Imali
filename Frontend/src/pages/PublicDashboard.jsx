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
        ] = await Promise.allSettled([
          axios.get(TRADES_URL, { timeout: 8000 }),
          axios.get(DISCOVERIES_URL, { timeout: 8000 }),
          axios.get(BOT_STATUS_URL, { timeout: 8000 }),
          axios.get(ANALYTICS_URL, { timeout: 8000 }),
          axios.get(USER_STATS_URL, { timeout: 8000 }),
          axios.get(PNL_HISTORY_URL, { timeout: 8000 }),
        ]);

        if (!mounted) return;

        let newData = {
          trades: [],
          discoveries: [],
          bots: [],
          analytics: { summary: {} },
          userStats: {},
          pnlHistory: [],
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

        // Process analytics
        if (analyticsRes.status === "fulfilled" && analyticsRes.value.data?.summary) {
          newData.analytics = analyticsRes.value.data;
        }

        // Process user stats
        if (userStatsRes.status === "fulfilled" && userStatsRes.value.data) {
          newData.userStats = userStatsRes.value.data;
        }

        // Process PNL history
        if (pnlHistoryRes.status === "fulfilled" && pnlHistoryRes.value.data?.history) {
          newData.pnlHistory = pnlHistoryRes.value.data.history;
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

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: values.map((_, i) => `Day ${i+1}`),
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
          tooltip: {
            callbacks: {
              label: (context) => formatCurrencySigned(context.raw)
            }
          }
        },
        scales: {
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { 
              color: "#6b7280",
              callback: (value) => formatCurrency(value)
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
  const userStats = data.userStats || {};
  const pnlHistory = data.pnlHistory || [];

  const totalPnL = analytics.total_pnl || 0;
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

        {/* Quick Stats Banner */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 text-center">
            <div className="text-xs text-indigo-600">Win Rate</div>
            <div className="text-lg font-bold text-indigo-700">{Math.round(winRate)}%</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
            <div className="text-xs text-emerald-600">Total P&L</div>
            <div className="text-lg font-bold text-emerald-700">{formatCurrencySigned(totalPnL)}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center">
            <div className="text-xs text-purple-600">Active Bots</div>
            <div className="text-lg font-bold text-purple-700">{bots.length}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center">
            <div className="text-xs text-amber-600">Discoveries</div>
            <div className="text-lg font-bold text-amber-700">{discoveries.length}</div>
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
            title="Active Bots" 
            value={bots.length} 
            icon="🤖" 
            color="emerald" 
            subtext="systems online" 
          />
          <StatCard 
            title="Win / Loss" 
            value={`${winsCount} / ${lossesCount}`} 
            icon="⚔️" 
            color="amber" 
            subtext={`${Math.round(winRate)}% win rate`}
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

        {/* P&L History Chart */}
        {pnlHistory.length > 0 && (
          <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-3 text-gray-900">Daily P&L History</h2>
            <div className="h-64">
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
            Real-time bot activity • Live trades • DEX discoveries
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
