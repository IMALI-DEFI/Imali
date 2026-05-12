// src/pages/EnterpriseDashboardDemo.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaServer,
  FaRobot,
  FaChartLine,
  FaExchangeAlt,
  FaShieldAlt,
  FaUsers,
  FaSyncAlt,
  FaPlay,
  FaPause,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDatabase,
  FaCloud,
  FaBolt,
} from "react-icons/fa";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const REFRESH_INTERVAL = 15000;

export default function EnterpriseDashboardDemo() {
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(true);

  const [marketData, setMarketData] = useState({});
  const [stats, setStats] = useState({});
  const [trades, setTrades] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  const [selectedStrategy, setSelectedStrategy] =
    useState("momentum");

  /* =========================================
     FETCH DASHBOARD
  ========================================= */

  const loadDashboard = useCallback(async () => {
    try {
      const [
        marketRes,
        statsRes,
        tradesRes,
        strategyRes,
        healthRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/public/market/prices`),
        fetch(`${API_BASE}/api/public/dashboard/stats`),
        fetch(`${API_BASE}/api/public/trades/recent`),
        fetch(`${API_BASE}/api/public/strategies`),
        fetch(`${API_BASE}/health`),
      ]);

      const marketJson = await marketRes.json();
      const statsJson = await statsRes.json();
      const tradesJson = await tradesRes.json();
      const strategyJson = await strategyRes.json();
      const healthJson = await healthRes.json();

      setMarketData(
        marketJson?.data || fallbackMarketData
      );

      setStats(statsJson?.data || fallbackStats);

      setTrades(tradesJson?.trades || fallbackTrades);

      setStrategies(
        strategyJson?.strategies || fallbackStrategies
      );

      setSystemHealth(healthJson || { status: "ok" });
    } catch (err) {
      console.error(err);

      setMarketData(fallbackMarketData);
      setStats(fallbackStats);
      setTrades(fallbackTrades);
      setStrategies(fallbackStrategies);
      setSystemHealth({ status: "fallback" });
    } finally {
      setLoading(false);
    }
  }, []);

  /* =========================================
     AUTO REFRESH
  ========================================= */

  useEffect(() => {
    loadDashboard();

    if (!liveMode) return;

    const interval = setInterval(() => {
      loadDashboard();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadDashboard, liveMode]);

  /* =========================================
     CHART
  ========================================= */

  const chartData = useMemo(() => {
    return {
      labels:
        stats.performance?.map((p) => p.day) || [],
      datasets: [
        {
          label: "PnL",
          data:
            stats.performance?.map((p) => p.pnl) || [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#ffffff",
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#94a3b8" },
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
      y: {
        ticks: { color: "#94a3b8" },
        grid: {
          color: "rgba(255,255,255,0.05)",
        },
      },
    },
  };

  const card =
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <FaSyncAlt className="animate-spin text-4xl mx-auto mb-4 text-emerald-400" />
          <div className="font-bold text-xl">
            Loading Enterprise Dashboard
          </div>
          <div className="text-slate-400 mt-2">
            Connecting to infrastructure...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* =========================================
          HEADER
      ========================================= */}

      <section className="max-w-7xl mx-auto px-4 pt-10 pb-6">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <div className="flex items-center gap-3">

              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <FaBolt className="text-emerald-400 text-xl" />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold">
                  IMALI Enterprise
                </h1>

                <p className="text-slate-400 text-sm">
                  White-Label Trading Infrastructure
                </p>
              </div>

            </div>

          </div>

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">

              {systemHealth?.status === "ok" ? (
                <>
                  <FaCheckCircle className="text-green-400" />
                  System Operational
                </>
              ) : (
                <>
                  <FaExclamationTriangle className="text-yellow-400" />
                  Demo Mode
                </>
              )}

            </div>

            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                liveMode
                  ? "bg-emerald-600"
                  : "bg-slate-700"
              }`}
            >
              {liveMode ? <FaPlay /> : <FaPause />}
              {liveMode ? "Live Refresh" : "Paused"}
            </button>

          </div>

        </div>

      </section>

      {/* =========================================
          METRICS
      ========================================= */}

      <section className="max-w-7xl mx-auto px-4 py-4">

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">

          <MetricCard
            title="24H Volume"
            value={`$${stats.volume_24h || "24.5M"}`}
            icon={<FaChartLine />}
            color="emerald"
          />

          <MetricCard
            title="Active Bots"
            value={stats.active_bots || 12}
            icon={<FaRobot />}
            color="blue"
          />

          <MetricCard
            title="Connected Exchanges"
            value={stats.connected_exchanges || 4}
            icon={<FaExchangeAlt />}
            color="yellow"
          />

          <MetricCard
            title="Win Rate"
            value={`${stats.win_rate || 68}%`}
            icon={<FaShieldAlt />}
            color="purple"
          />

        </div>

      </section>

      {/* =========================================
          MAIN GRID
      ========================================= */}

      <section className="max-w-7xl mx-auto px-4 py-6">

        <div className="grid xl:grid-cols-3 gap-6">

          {/* LEFT */}

          <div className="xl:col-span-2 space-y-6">

            {/* PERFORMANCE */}

            <div className={card}>

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-2xl font-bold">
                    Performance Analytics
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    Simulated enterprise performance
                  </p>
                </div>

                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  Live Analytics
                </div>

              </div>

              <div className="h-[350px]">
                <Line
                  data={chartData}
                  options={chartOptions}
                />
              </div>

            </div>

            {/* MARKET FEED */}

            <div className={card}>

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-2xl font-bold">
                    Market Feed
                  </h2>

                  <p className="text-slate-400 text-sm mt-1">
                    OKX + Alpaca pricing infrastructure
                  </p>
                </div>

                <div className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                  Refresh: 15s
                </div>

              </div>

              <div className="space-y-3">

                {Object.entries(marketData).map(
                  ([symbol, data]) => (
                    <div
                      key={symbol}
                      className="flex items-center justify-between rounded-2xl bg-black/30 p-4"
                    >

                      <div>
                        <div className="font-bold uppercase">
                          {symbol}
                        </div>

                        <div className="text-xs text-slate-400">
                          AI Confidence: {data.confidence}%
                        </div>
                      </div>

                      <div className="text-right">

                        <div className="font-bold text-lg">
                          $
                          {Number(
                            data.price || 0
                          ).toLocaleString()}
                        </div>

                        <div
                          className={`text-sm ${
                            data.change > 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {data.change > 0 ? "+" : ""}
                          {data.change}%
                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

          </div>

          {/* RIGHT */}

          <div className="space-y-6">

            {/* STRATEGY */}

            <div className={card}>

              <h2 className="text-2xl font-bold mb-4">
                Strategy Engine
              </h2>

              <div className="space-y-3">

                {strategies.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() =>
                      setSelectedStrategy(strategy.id)
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedStrategy === strategy.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="font-bold">
                          {strategy.name}
                        </div>

                        <div className="text-xs text-slate-400 mt-1">
                          {strategy.description}
                        </div>

                      </div>

                      <div className="text-sm text-emerald-300">
                        {strategy.risk}
                      </div>

                    </div>

                  </button>
                ))}

              </div>

            </div>

            {/* INFRASTRUCTURE */}

            <div className={card}>

              <h2 className="text-2xl font-bold mb-6">
                Infrastructure
              </h2>

              <div className="space-y-4">

                <InfraItem
                  icon={<FaServer />}
                  title="Backend"
                  value="Node.js + Python"
                />

                <InfraItem
                  icon={<FaDatabase />}
                  title="Database"
                  value="PostgreSQL"
                />

                <InfraItem
                  icon={<FaCloud />}
                  title="Deployment"
                  value="Cloud Ready"
                />

                <InfraItem
                  icon={<FaUsers />}
                  title="Multi-Tenant"
                  value="Enterprise RBAC"
                />

                <InfraItem
                  icon={<FaExchangeAlt />}
                  title="Exchange APIs"
                  value="OKX • Alpaca"
                />

              </div>

            </div>

            {/* CTA */}

            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-6">

              <h3 className="text-2xl font-bold">
                Enterprise Deployment
              </h3>

              <p className="text-slate-300 mt-3 leading-7">
                Launch a fully branded trading platform
                with enterprise infrastructure,
                analytics, and multi-bot automation.
              </p>

              <div className="grid gap-3 mt-6">

                <Link
                  to="/signup"
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-center font-bold py-3 transition"
                >
                  Request Enterprise Access
                </Link>

                <Link
                  to="/trade-demo"
                  className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-center font-bold py-3 transition"
                >
                  Launch Interactive Demo
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

/* =========================================
   COMPONENTS
========================================= */

function MetricCard({
  title,
  value,
  icon,
  color = "emerald",
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">

      <div className="flex items-center justify-between">

        <div>

          <div className="text-sm text-slate-400">
            {title}
          </div>

          <div className="text-3xl font-extrabold mt-2">
            {value}
          </div>

        </div>

        <div
          className={`text-3xl ${
            color === "emerald"
              ? "text-emerald-400"
              : color === "blue"
              ? "text-blue-400"
              : color === "yellow"
              ? "text-yellow-400"
              : "text-purple-400"
          }`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

function InfraItem({ icon, title, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/20 p-4">

      <div className="flex items-center gap-3">

        <div className="text-emerald-400">
          {icon}
        </div>

        <div>

          <div className="font-bold">
            {title}
          </div>

          <div className="text-xs text-slate-400">
            {value}
          </div>

        </div>

      </div>

      <FaCheckCircle className="text-green-400" />

    </div>
  );
}

/* =========================================
   FALLBACKS
========================================= */

const fallbackMarketData = {
  BTC: {
    price: 71234,
    change: 2.4,
    confidence: 87,
  },
  ETH: {
    price: 3821,
    change: 1.8,
    confidence: 72,
  },
  SOL: {
    price: 168,
    change: 5.2,
    confidence: 91,
  },
  TSLA: {
    price: 214,
    change: 1.2,
    confidence: 61,
  },
};

const fallbackStats = {
  volume_24h: "24.5M",
  active_bots: 12,
  connected_exchanges: 4,
  win_rate: 68,
  performance: [
    { day: "Mon", pnl: 4 },
    { day: "Tue", pnl: 6 },
    { day: "Wed", pnl: 8 },
    { day: "Thu", pnl: 7 },
    { day: "Fri", pnl: 11 },
    { day: "Sat", pnl: 9 },
    { day: "Sun", pnl: 13 },
  ],
};

const fallbackTrades = [
  {
    asset: "BTC",
    pnl: 8.2,
  },
];

const fallbackStrategies = [
  {
    id: "momentum",
    name: "Momentum",
    description: "Trend following strategy",
    risk: "High",
  },
  {
    id: "balanced",
    name: "Balanced AI",
    description: "Multi-signal AI execution",
    risk: "Medium",
  },
  {
    id: "mean_reversion",
    name: "Mean Reversion",
    description: "Lower volatility trading",
    risk: "Low",
  },
];