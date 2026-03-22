// src/pages/Home.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

/* ============================================================
   CONFIG
============================================================ */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const PROMO_STATUS_URL = `${API_BASE}/api/promo/status`;
const PROMO_CLAIM_URL = `${API_BASE}/api/promo/claim`;
const ANALYTICS_SUMMARY_URL = `${API_BASE}/api/analytics/summary`;

/* ============================================================
   HELPERS
============================================================ */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectRecentTrades(data = {}, limit = 20) {
  const combined = [
    ...normalizeArray(data?.recent_trades),
    ...normalizeArray(data?.sniper?.trades),
    ...normalizeArray(data?.okx?.recent_trades),
    ...normalizeArray(data?.futures?.recent_trades),
    ...normalizeArray(data?.stocks?.recent_trades),
    ...normalizeArray(data?.okx?.trades),
    ...normalizeArray(data?.futures?.trades),
    ...normalizeArray(data?.stocks?.trades),
  ];

  const seen = new Set();
  const unique = [];

  for (const trade of combined) {
    const key =
      trade?.id ||
      [
        trade?.symbol,
        trade?.side,
        trade?.created_at || trade?.timestamp,
        trade?.pnl_usd || trade?.pnl || trade?.price,
      ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(trade);
    }
  }

  if (!unique.length) {
    const now = Date.now();
    return [
      {
        id: "demo-1",
        symbol: "BTC/USD",
        side: "buy",
        pnl_percent: 2.4,
        pnl_usd: 180.22,
        created_at: new Date(now - 8 * 60000).toISOString(),
      },
      {
        id: "demo-2",
        symbol: "ETH/USD",
        side: "sell",
        pnl_percent: -1.1,
        pnl_usd: -72.14,
        created_at: new Date(now - 22 * 60000).toISOString(),
      },
      {
        id: "demo-3",
        symbol: "SOL/USD",
        side: "buy",
        pnl_percent: 3.8,
        pnl_usd: 205.41,
        created_at: new Date(now - 39 * 60000).toISOString(),
      },
      {
        id: "demo-4",
        symbol: "AAPL",
        side: "buy",
        pnl_percent: 1.2,
        pnl_usd: 34.88,
        created_at: new Date(now - 75 * 60000).toISOString(),
      },
      {
        id: "demo-5",
        symbol: "TSLA",
        side: "sell",
        pnl_percent: -0.7,
        pnl_usd: -18.64,
        created_at: new Date(now - 110 * 60000).toISOString(),
      },
    ].slice(0, limit);
  }

  return unique
    .sort((a, b) => {
      const tA = new Date(a?.created_at || a?.timestamp || 0).getTime();
      const tB = new Date(b?.created_at || b?.timestamp || 0).getTime();
      return tB - tA;
    })
    .slice(0, limit);
}

function getBotStatuses(data = {}) {
  return [
    {
      label: "Futures",
      live:
        data?.futures?.status === "operational" ||
        data?.futures?.status === "running" ||
        safeNumber(data?.futures?.positions_count, 0) > 0 ||
        normalizeArray(data?.futures?.trades).length > 0,
    },
    {
      label: "Stocks",
      live:
        data?.stocks?.running === true ||
        data?.stocks?.status === "operational" ||
        safeNumber(data?.stocks?.positions_count, 0) > 0 ||
        normalizeArray(data?.stocks?.trades).length > 0,
    },
    {
      label: "Sniper",
      live:
        data?.sniper?.status === "scanning" ||
        data?.sniper?.status === "monitoring" ||
        data?.sniper?.status === "running" ||
        normalizeArray(data?.sniper?.trades).length > 0,
    },
    {
      label: "OKX",
      live:
        data?.okx?.status === "running" ||
        safeNumber(data?.okx?.positions_count, 0) > 0 ||
        safeNumber(data?.okx?.total_trades, 0) > 0 ||
        normalizeArray(data?.okx?.trades).length > 0,
    },
  ];
}

function calculateTradeMetrics(trades = []) {
  let wins = 0;
  let losses = 0;
  let totalPnL = 0;

  for (const trade of trades) {
    const pnl =
      trade?.pnl_usd ??
      trade?.pnl ??
      trade?.profit ??
      trade?.realized_pnl ??
      null;

    if (pnl !== null && pnl !== undefined && Number.isFinite(Number(pnl))) {
      const n = Number(pnl);
      totalPnL += n;
      if (n > 0) wins += 1;
      if (n < 0) losses += 1;
    } else {
      const pct = trade?.pnl_percent;
      if (pct !== null && pct !== undefined && Number.isFinite(Number(pct))) {
        const n = Number(pct);
        if (n > 0) wins += 1;
        if (n < 0) losses += 1;
      }
    }
  }

  return {
    totalTrades: trades.length,
    totalPnL,
    wins,
    losses,
  };
}

function formatCurrency(value) {
  const n = safeNumber(value, 0);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  return trades
    .slice(0, 7)
    .reverse()
    .map((trade, index) => {
      const usd = trade?.pnl_usd ?? trade?.pnl ?? trade?.profit ?? null;
      const pct = trade?.pnl_percent ?? null;

      if (usd !== null && usd !== undefined && Number.isFinite(Number(usd))) {
        return Math.max(2, Math.min(16, Math.abs(Number(usd)) / 25 + 3));
      }

      if (pct !== null && pct !== undefined && Number.isFinite(Number(pct))) {
        return Math.max(2, Math.min(16, Math.abs(Number(pct)) * 2 + 3));
      }

      return index + 4;
    });
}

/* ============================================================
   HOOKS
============================================================ */

function usePromoStatus() {
  const [state, setState] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(PROMO_STATUS_URL, { timeout: 6000 });
        const data = res.data || {};
        const limit = safeNumber(data.limit, 50);
        const claimed = safeNumber(data.claimed, 0);

        if (!mounted) return;

        setState({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          active: claimed < limit,
          loading: false,
          error: null,
        });
      } catch {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Promo unavailable",
        }));
      }
    };

    load();
    const id = setInterval(load, 60000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return state;
}

function usePromoClaim() {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error: null,
    data: null,
  });

  const claim = async (email) => {
    if (!email) return false;

    setState({
      loading: true,
      success: false,
      error: null,
      data: null,
    });

    try {
      const res = await axios.post(
        PROMO_CLAIM_URL,
        { email, tier: "starter" },
        { timeout: 8000 }
      );

      setState({
        loading: false,
        success: true,
        error: null,
        data: res.data,
      });

      return true;
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Spot already taken or promo full";

      setState({
        loading: false,
        success: false,
        error: msg,
        data: null,
      });

      return false;
    }
  };

  const reset = () =>
    setState({
      loading: false,
      success: false,
      error: null,
      data: null,
    });

  return { state, claim, reset };
}

function useLiveActivity() {
  const [activity, setActivity] = useState({
    trades: [],
    stats: {
      currentStatus: "Offline",
      activeBots: 0,
      totalTrades: 0,
      totalPnL: 0,
      wins: 0,
      losses: 0,
      online: false,
      botStatuses: [
        { label: "Futures", live: false },
        { label: "Stocks", live: false },
        { label: "Sniper", live: false },
        { label: "OKX", live: false },
      ],
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        const liveResponse = await axios.get(LIVE_STATS_URL, { timeout: 8000 });

        let summaryData = {};
        try {
          const summaryResponse = await axios.get(ANALYTICS_SUMMARY_URL, {
            timeout: 5000,
          });
          summaryData = summaryResponse.data || {};
        } catch {
          // fallback silently
        }

        if (!mounted) return;

        const data = liveResponse.data || {};
        const trades = collectRecentTrades(data, 20);
        const botStatuses = getBotStatuses(data);
        const activeBots = botStatuses.filter((b) => b.live).length;
        const online = activeBots > 0;

        const computedMetrics = calculateTradeMetrics(trades);

        const summary = summaryData?.summary || summaryData || {};

        const totalTrades = safeNumber(summary?.total_trades, NaN);
        const totalPnL = safeNumber(summary?.total_pnl, NaN);
        const wins = safeNumber(summary?.wins, NaN);
        const losses = safeNumber(summary?.losses, NaN);

        setActivity({
          trades,
          stats: {
            currentStatus: online ? "Live" : "Offline",
            activeBots,
            totalTrades: Number.isFinite(totalTrades)
              ? totalTrades
              : computedMetrics.totalTrades,
            totalPnL: Number.isFinite(totalPnL)
              ? totalPnL
              : computedMetrics.totalPnL,
            wins: Number.isFinite(wins) ? wins : computedMetrics.wins,
            losses: Number.isFinite(losses) ? losses : computedMetrics.losses,
            online,
            botStatuses,
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Live activity fetch error:", error);

        if (!mounted) return;

        setActivity((prev) => ({
          ...prev,
          loading: false,
          error: "Live data temporarily unavailable",
        }));
      }
    };

    fetchActivity();
    const id = setInterval(fetchActivity, 30000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return activity;
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function Pill({ children, color = "indigo" }) {
  const classes = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-[11px] font-bold sm:text-xs ${
        classes[color] ?? classes.indigo
      }`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StepCard({ number, emoji, title, description }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 font-bold text-white shadow-md">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          {emoji} {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, label }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <span className="mt-0.5 flex-shrink-0 text-emerald-600">{icon}</span>
      <span className="leading-snug">{label}</span>
    </div>
  );
}

function LiveTicker() {
  const messages = [
    "Daily activity updates every 30 seconds",
    "Live bots are scanning markets now",
    "Referral rewards are available for eligible users",
    "Trade stats update from active bot activity",
    "IMALI supports stock and crypto automation",
  ];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 220);
    }, 3500);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 sm:text-sm">
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500 animate-pulse" />
      <span className={`truncate transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        {messages[index]}
      </span>
    </div>
  );
}

function PromoMeter({ claimed, limit, spotsLeft, loading }) {
  const pct = limit > 0 ? (claimed / limit) * 100 : 0;
  const urgency =
    spotsLeft <= 10
      ? "text-red-600"
      : spotsLeft <= 25
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-gray-500">
          {loading ? "Loading..." : `${claimed} of ${limit} spots claimed`}
        </span>
        <span className={`font-bold ${urgency}`}>
          {loading ? "…" : `${spotsLeft} left!`}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatMiniCard({ title, value, valueClassName = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
      <div className={`text-lg font-bold ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">
        {title}
      </div>
    </div>
  );
}

/* ============================================================
   LIVE ACTIVITY WIDGET
============================================================ */

function LiveActivityWidget({ activity }) {
  const formatTime = (ts) => {
    if (!ts) return "";
    try {
      const diffMs = Date.now() - new Date(ts).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / 1440)}d ago`;
    } catch {
      return "";
    }
  };

  const series = buildActivitySeries(activity.trades);

  const chartData = useMemo(
    () => ({
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: series,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.18)",
          fill: true,
          tension: 0.45,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#10b981",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    }),
    [series]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#111827",
          titleColor: "#ffffff",
          bodyColor: "#d1fae5",
          padding: 10,
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: false },
          ticks: {
            color: "#9ca3af",
            font: { size: 10 },
          },
        },
        y: {
          display: false,
          grid: { color: "rgba(229,231,235,0.5)" },
        },
      },
    }),
    []
  );

  if (activity.loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm">Loading live dashboard...</span>
        </div>
      </Card>
    );
  }

  const { trades, stats } = activity;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              stats.online ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          Live Dashboard
        </h3>

        <Link
          to="/live"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          Full Dashboard →
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Dashboard Snapshot
            </p>
            <p className="text-sm text-gray-500">Live activity and recent performance</p>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
              stats.online
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {stats.currentStatus}
          </div>
        </div>

        <div className="h-40">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatMiniCard
          title="Current Status"
          value={stats.currentStatus}
          valueClassName={stats.online ? "text-emerald-600" : "text-gray-600"}
        />
        <StatMiniCard
          title="Active Bots"
          value={stats.activeBots}
          valueClassName="text-indigo-600"
        />
        <StatMiniCard
          title="Total Trades"
          value={stats.totalTrades}
          valueClassName="text-purple-600"
        />
        <StatMiniCard
          title="Total P&L"
          value={formatCurrency(stats.totalPnL)}
          valueClassName={stats.totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}
        />
      </div>

      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-gray-500">
          Win/Loss
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-600">
            Wins: {stats.wins}
          </span>
          <span className="text-sm font-semibold text-red-600">
            Losses: {stats.losses}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-gray-500">
          Bot Status
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.botStatuses.map((bot) => (
            <div
              key={bot.label}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  bot.live ? "bg-emerald-500" : "bg-gray-300"
                }`}
              />
              <span className={bot.live ? "text-gray-800" : "text-gray-500"}>
                {bot.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activity.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 py-3 text-center text-xs text-amber-700">
          ⚠️ {activity.error}
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="mb-1 text-xs font-semibold text-gray-500">Recent Trades</h4>

          {trades.length > 0 ? (
            trades.slice(0, 4).map((trade, i) => {
              const side = String(trade?.side || "buy").toLowerCase();
              const isBuy = side === "buy" || side === "long";
              const pnlValue = trade?.pnl_usd ?? trade?.pnl ?? trade?.profit ?? null;

              return (
                <div
                  key={trade?.id || i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span>📊</span>

                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-800">
                        {trade?.symbol || "Unknown"}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            isBuy
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {side.toUpperCase()}
                        </span>

                        <span className="text-[10px] text-gray-500">
                          {formatTime(trade?.created_at || trade?.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 font-semibold ${
                      pnlValue === null || !Number.isFinite(Number(pnlValue))
                        ? "text-gray-500"
                        : Number(pnlValue) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {pnlValue === null || !Number.isFinite(Number(pnlValue))
                      ? "—"
                      : formatCurrency(Number(pnlValue))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-2 text-center text-xs text-gray-400">
              No recent trades
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   HOME PAGE
============================================================ */

export default function Home() {
  const promo = usePromoStatus();
  const promoClaim = usePromoClaim();
  const activity = useLiveActivity();

  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* VIDEO PLAYER AT TOP */}
      <div className="relative w-full bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto max-h-[70vh] object-cover"
          poster="/api/placeholder/1920/1080"
        >
          <source src="/public/video/imali-defi.mp4" type="video/mp4" />
          <img src="/api/placeholder/1920/1080" alt="IMALI Trading" className="w-full" />
        </video>
        
        {/* Optional overlay text */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="text-center text-white px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Watch AI Trade in Real-Time
            </h2>
            <p className="text-sm sm:text-base text-gray-200">
              See how our bots analyze and execute trades automatically
            </p>
          </div>
        </div>
      </div>

      {/* PROMO SECTION - RIGHT AFTER VIDEO */}
      <section className="mx-auto max-w-3xl px-3 py-10 sm:px-4 sm:py-12">
        <Card className="p-5 sm:p-6 shadow-xl">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="flex-shrink-0 text-3xl">🎁</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Early Bird Special
              </h3>
              <p className="text-sm text-gray-500">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-600">special deal</b>
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <FeatureRow
              icon="✅"
              label="Only 5% fee on profits over 3% (normally 30%)"
            />
            <FeatureRow icon="✅" label="Locked in for 90 days" />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow
              icon="✅"
              label="Referral program available for users who invite others"
            />
          </div>

          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
            loading={promo.loading}
          />

          {promo.error && (
            <p className="mt-2 text-xs text-amber-600">⚠ {promo.error}</p>
          )}

          {!showForm && !promoClaim.state.success && promo.active && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-4 text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500"
            >
              🎉 Claim My Spot Now
            </button>
          )}

          {showForm && !promoClaim.state.success && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await promoClaim.claim(email);
                if (ok) setShowForm(false);
              }}
              className="mt-4 space-y-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                autoFocus
              />

              {promoClaim.state.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  ⚠️ {promoClaim.state.error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={promoClaim.state.loading}
                  className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-500"
                >
                  {promoClaim.state.loading ? "Claiming..." : "✅ Confirm My Spot"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    promoClaim.reset();
                  }}
                  className="px-6 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="mb-2 text-3xl">🎉</div>
              <p className="text-lg font-bold text-emerald-700">You're in!</p>
              <p className="mt-1 text-sm text-gray-600">
                Check your email, then{" "}
                <Link to="/signup" className="text-emerald-600 underline">
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
        <div className="pointer-events-none absolute inset-0 select-none">
          <img
            src={StarterNFT}
            alt=""
            className="absolute left-[4%] top-20 w-24 opacity-10 sm:w-32 md:w-40"
            draggable="false"
          />
          <img
            src={ProNFT}
            alt=""
            className="absolute right-[5%] top-24 w-24 opacity-10 sm:top-32 sm:w-36 md:w-44"
            draggable="false"
          />
          <img
            src={EliteNFT}
            alt=""
            className="absolute bottom-0 left-1/2 w-28 -translate-x-1/2 opacity-10 sm:w-40 md:w-48"
            draggable="false"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 md:pt-24">
          <div className="mb-6 flex items-center justify-between gap-3">
            <LiveTicker />

            <Link
              to="/live"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 sm:text-sm"
            >
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>LIVE DASHBOARD</span>
              <span>→</span>
            </Link>
          </div>

          {/* Referral Banner */}
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left shadow-sm sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Referral Program Offer
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                    Invite friends and earn rewards in USDC or IMALI
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-600">
                    Share your referral link, bring in new members, and earn
                    partner rewards as the IMALI ecosystem grows.
                  </p>
                </div>

                <Link
                  to="/referrals"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-amber-500 px-5 py-3 font-bold text-black transition-all hover:bg-amber-400"
                >
                  View Referral Offer
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="font-extrabold leading-tight">
              <span className="mx-auto block max-w-5xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-center text-3xl text-transparent sm:text-4xl md:text-5xl lg:text-7xl">
                Automated Trading for Stock and Crypto
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl px-2 text-base leading-relaxed text-gray-600 sm:mt-6 sm:text-lg md:text-xl">
              Built to be simple for new users and powerful enough to grow with you.
              Follow live bot activity, recent trades, and performance in one clean dashboard.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 px-2 sm:mt-6 sm:gap-3">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="amber">🎁 Referral rewards available</Pill>
              <Pill color="purple">🦾 AI-powered trading bots</Pill>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/pricing"
                className="rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500"
              >
                Get Started Now →
              </Link>

              <Link
                to="/referrals"
                className="rounded-full border border-gray-200 bg-white px-8 py-4 text-center font-bold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Explore Referral Program
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE + ROBOTS */}
      <section className="-mt-2 mx-auto mb-10 max-w-6xl px-3 sm:mb-12 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveActivityWidget activity={activity} />

          <Card className="p-5">
            <h3 className="mb-2 text-lg font-bold text-gray-900">
              Your Trading Bots
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose a plan, connect your accounts, and let IMALI handle stock
              and crypto automation with a simpler user experience.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <img
                  src={StarterNFT}
                  alt="Starter bot"
                  className="h-24 w-full object-contain sm:h-28"
                />
                <p className="mt-2 text-center text-xs text-gray-600">Starter</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <img
                  src={ProNFT}
                  alt="Pro bot"
                  className="h-24 w-full object-contain sm:h-28"
                />
                <p className="mt-2 text-center text-xs text-gray-600">Pro</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <img
                  src={EliteNFT}
                  alt="Elite bot"
                  className="h-24 w-full object-contain sm:h-28"
                />
                <p className="mt-2 text-center text-xs text-gray-600">Elite</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800">
                Partner perk: referral rewards
              </h4>
              <p className="mt-1 text-sm text-gray-700">
                Invite new users, track your network, and unlock extra value as
                the IMALI ecosystem grows.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            How Does It Work? 🤔
          </h2>
          <p className="mx-auto mt-2 max-w-xl px-2 text-sm text-gray-600 sm:mt-3 sm:text-base">
            Simple setup, live dashboard tracking, and optional referral rewards.
          </p>
        </div>

        <div className="space-y-6 px-1 sm:space-y-8 sm:px-0">
          <StepCard
            number="1"
            emoji="📝"
            title="Sign Up"
            description="Create your account and choose the plan that fits your goals. No advanced trading knowledge required."
          />
          <div className="ml-5 h-4 border-l-2 border-gray-200 sm:ml-6 sm:h-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link your supported exchange or brokerage account and unlock your dashboard, trading tools, and automation."
          />
          <div className="ml-5 h-4 border-l-2 border-gray-200 sm:ml-6 sm:h-6" />
          <StepCard
            number="3"
            emoji="📊"
            title="Track Live Activity"
            description="Monitor current status, active bots, total trades, total P&L, and win/loss performance from one place."
          />
        </div>

        <div className="mt-8 px-4 text-center sm:mt-10 sm:px-0">
          <Link
            to="/pricing"
            className="inline-block w-full rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 sm:w-auto"
          >
            Let's Go! View Plans →
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 md:px-6 sm:py-16">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            What's Inside Your Dashboard ✨
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:mt-3 sm:text-base">
            Live stats, trade activity, automation tools, and referral rewards in one place
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🤖",
              title: "Automated Trading Bot",
              pill: "emerald",
              plan: "All Plans",
              desc: "Bots monitor supported stock and crypto markets and react using active strategies.",
            },
            {
              icon: "📊",
              title: "Live Dashboard Stats",
              pill: "indigo",
              plan: "All Plans",
              desc: "Track current status, active bots, total trades, total P&L, and win/loss performance.",
            },
            {
              icon: "🎁",
              title: "Referral Rewards",
              pill: "amber",
              plan: "Eligible Users",
              desc: "Invite friends, earn rewards, and unlock partner perks as your network grows.",
            },
            {
              icon: "📈",
              title: "Stock Trading Support",
              pill: "indigo",
              plan: "Starter+",
              desc: "Connect supported brokerage flows and bring stock automation into your plan.",
            },
            {
              icon: "₿",
              title: "Crypto Trading Support",
              pill: "purple",
              plan: "Starter+",
              desc: "Access crypto-focused automation and strategy expansion as your plan grows.",
            },
            {
              icon: "🏅",
              title: "Partner Growth Tools",
              pill: "amber",
              plan: "Referral Program",
              desc: "Build your referral network and position yourself for future ecosystem bonuses.",
            },
          ].map(({ icon, title, pill, plan, desc }) => (
            <Card key={title} className="p-5">
              <div className="mb-2 text-2xl sm:mb-3 sm:text-3xl">{icon}</div>
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600 sm:text-sm">
                {desc}
              </p>
              <div className="mt-3">
                <Pill color={pill}>{plan}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* REFERRAL CTA */}
      <section className="mx-auto max-w-5xl px-3 py-10 sm:px-4 md:px-6 sm:py-12">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-700">
                Referral Program Offer
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                Turn your network into an extra reward stream
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                Share your IMALI link, invite new users, and qualify for rewards
                in USDC or IMALI. Great for early users, creators, group owners,
                and community builders.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/referrals"
                className="rounded-xl bg-amber-500 px-6 py-3 text-center font-bold text-black hover:bg-amber-400"
              >
                View Referral Program
              </Link>

              <Link
                to="/pricing"
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-center font-semibold hover:bg-gray-50"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-3 py-12 sm:px-4 md:px-6 sm:py-16">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Common Questions 💬
          </h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {[
            {
              q: "Do I need to know how to trade?",
              a: "No. IMALI is designed to be beginner friendly, with automation and a cleaner dashboard experience.",
            },
            {
              q: "What will I see on the dashboard?",
              a: "You can track current status, active bots, total trades, total P&L, and win/loss performance from the home dashboard preview and the full live dashboard.",
            },
            {
              q: "Can I earn by inviting friends?",
              a: "Yes. The referral program lets eligible users share their link and earn rewards when referred users join and activate.",
            },
            {
              q: "Can I stop anytime?",
              a: "Yes. You can pause or stop participating depending on your connected services and plan setup.",
            },
            {
              q: "Is IMALI custodying my funds?",
              a: "No. Funds remain in your own connected account. IMALI is built around connection and automation rather than custody.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between p-4 text-sm transition-colors hover:bg-gray-50 sm:p-5 sm:text-base">
                <span className="pr-4 font-medium text-gray-900">{item.q}</span>
                <span className="flex-shrink-0 text-lg text-gray-400 transition-transform group-open:rotate-45 sm:text-xl">
                  +
                </span>
              </summary>
              <div className="px-4 pb-4 text-xs leading-relaxed text-gray-600 sm:px-5 sm:pb-5 sm:text-sm">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-b from-white to-gray-50 px-4 py-14 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 text-4xl sm:mb-4 sm:text-5xl">🚀</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl md:text-4xl">
            Ready to Trade and Earn More?
          </h2>
          <p className="mb-6 px-2 text-base text-gray-600 sm:mb-8 sm:text-lg">
            Start with automated trading for stock and crypto, then grow with
            live dashboard tracking and referral rewards.
          </p>

          <div className="flex flex-col justify-center gap-3 px-2 sm:flex-row sm:gap-4 sm:px-0">
            <Link
              to="/pricing"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl hover:from-indigo-500 hover:to-purple-500 sm:px-12 sm:py-5 sm:text-lg"
            >
              View Plans & Pricing
            </Link>

            <Link
              to="/referrals"
              className="rounded-full border-2 border-amber-200 bg-white px-8 py-4 text-base font-bold text-amber-700 transition-all hover:bg-amber-50 sm:px-12 sm:py-5 sm:text-lg"
            >
              Referral Program
            </Link>
          </div>

          <p className="mt-5 text-[11px] text-gray-500 sm:mt-6 sm:text-xs">
            No credit card required • Cancel anytime • Referral rewards available
          </p>
        </div>
      </section>

      {/* FOOTER LINKS */}
      <section className="border-t border-gray-200 bg-white py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-2 px-4 text-xs text-gray-500 sm:gap-6 sm:text-sm">
          <Link to="/how-it-works" className="py-1 transition-colors hover:text-gray-900">
            How It Works
          </Link>
          <Link to="/pricing" className="py-1 transition-colors hover:text-gray-900">
            Pricing
          </Link>
          <Link to="/referrals" className="py-1 text-amber-700 transition-colors hover:text-amber-800">
            Referrals
          </Link>
          <Link to="/support" className="py-1 transition-colors hover:text-gray-900">
            Support
          </Link>
          <Link to="/privacy" className="py-1 transition-colors hover:text-gray-900">
            Privacy
          </Link>
          <Link to="/terms" className="py-1 transition-colors hover:text-gray-900">
            Terms
          </Link>
          <Link to="/live" className="py-1 text-emerald-600 transition-colors hover:text-emerald-700">
            Live
          </Link>
        </div>
      </section>
    </div>
  );
}
