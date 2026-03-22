// src/pages/Home.jsx

import React, { useEffect, useMemo, useState, useRef } from "react";
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
    ...normalizeArray(data?.sniper?.discoveries || []),
    ...normalizeArray(data?.okx?.recent_trades),
    ...normalizeArray(data?.futures?.recent_trades),
    ...normalizeArray(data?.stocks?.recent_trades),
  ];

  const seen = new Set();
  const unique = [];

  for (const trade of combined) {
    const key = trade?.id || `${trade?.symbol}-${trade?.side}-${trade?.timestamp}`;
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
        bot: "futures",
      },
      {
        id: "demo-2",
        symbol: "ETH/USD",
        side: "sell",
        pnl_percent: -1.1,
        pnl_usd: -72.14,
        created_at: new Date(now - 22 * 60000).toISOString(),
        bot: "okx",
      },
      {
        id: "demo-3",
        symbol: "SOL/USD",
        side: "buy",
        pnl_percent: 3.8,
        pnl_usd: 205.41,
        created_at: new Date(now - 39 * 60000).toISOString(),
        bot: "sniper",
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
        safeNumber(data?.futures?.positions, 0) > 0 ||
        normalizeArray(data?.futures?.trades).length > 0,
    },
    {
      label: "Stocks",
      live:
        data?.stocks?.running === true ||
        data?.stocks?.status === "operational" ||
        safeNumber(data?.stocks?.positions, 0) > 0 ||
        normalizeArray(data?.stocks?.trades).length > 0,
    },
    {
      label: "Sniper",
      live:
        data?.sniper?.status === "scanning" ||
        data?.sniper?.status === "monitoring" ||
        data?.sniper?.status === "running" ||
        normalizeArray(data?.sniper?.discoveries).length > 0,
    },
    {
      label: "OKX",
      live:
        data?.okx?.status === "running" ||
        safeNumber(data?.okx?.positions, 0) > 0 ||
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
    const pnl = trade?.pnl_usd ?? trade?.pnl ?? trade?.profit ?? null;

    if (pnl !== null && pnl !== undefined && Number.isFinite(Number(pnl))) {
      const n = Number(pnl);
      totalPnL += n;
      if (n > 0) wins += 1;
      if (n < 0) losses += 1;
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

function formatNumber(value) {
  const n = safeNumber(value, 0);
  return n.toLocaleString();
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  return trades
    .slice(0, 7)
    .reverse()
    .map((trade, index) => {
      const usd = trade?.pnl_usd ?? trade?.pnl ?? null;
      if (usd !== null && Number.isFinite(Number(usd))) {
        return Math.max(2, Math.min(16, Math.abs(Number(usd)) / 25 + 3));
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
      const msg = err?.response?.data?.message || "Spot already taken or promo full";

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
      botStatuses: [],
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

        // Use summary data if available, otherwise use computed metrics
        const totalTrades = summaryData?.summary?.total_trades ?? computedMetrics.totalTrades;
        const totalPnL = summaryData?.summary?.total_pnl ?? computedMetrics.totalPnL;
        const wins = summaryData?.summary?.wins ?? computedMetrics.wins;
        const losses = summaryData?.summary?.losses ?? computedMetrics.losses;

        setActivity({
          trades,
          stats: {
            currentStatus: online ? "Live" : "Offline",
            activeBots,
            totalTrades,
            totalPnL,
            wins,
            losses,
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
          title="Active Bots"
          value={stats.activeBots}
          valueClassName="text-indigo-600"
        />
        <StatMiniCard
          title="Total Trades"
          value={formatNumber(stats.totalTrades)}
          valueClassName="text-purple-600"
        />
        <StatMiniCard
          title="Total P&L"
          value={formatCurrency(stats.totalPnL)}
          valueClassName={stats.totalPnL >= 0 ? "text-emerald-600" : "text-red-600"}
        />
        <StatMiniCard
          title="Win Rate"
          value={stats.totalTrades > 0 ? `${((stats.wins / stats.totalTrades) * 100).toFixed(1)}%` : "0%"}
          valueClassName="text-emerald-600"
        />
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
              const pnlValue = trade?.pnl_usd ?? trade?.pnl ?? null;

              return (
                <div
                  key={trade?.id || i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm">
                      {trade?.bot === "futures" && "📈"}
                      {trade?.bot === "okx" && "🔷"}
                      {trade?.bot === "sniper" && "🎯"}
                      {trade?.bot === "stocks" && "📊"}
                    </span>

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
  const videoRef = useRef(null);

  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* VIDEO HERO SECTION - MOVED TO TOP */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
        {/* Background Video */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover opacity-50"
            poster="/api/placeholder/1920/1080"
          >
            <source src="/videos/imali-defi.MP4" type="video/mp4" />
            {/* Fallback image if video doesn't load */}
            <img src="/api/placeholder/1920/1080" alt="IMALI Trading" className="h-full w-full object-cover" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 md:py-32">
          {/* Logo and QR Code Section */}
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <div className="mb-4 flex items-center justify-center gap-3 sm:justify-start">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500"></div>
                <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
                  IMALI
                </h1>
              </div>
              <p className="text-lg text-gray-300 sm:text-xl">
                AI-Powered Trading for Everyone
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Pill color="emerald">📱 Scan QR Code</Pill>
                <Pill color="purple">🤖 AI Trading Bots</Pill>
                <Pill color="amber">🎁 Referral Rewards</Pill>
              </div>
            </div>

            {/* QR Code */}
            <div className="rounded-2xl bg-white p-3 shadow-xl">
              <img
                src="/api/placeholder/120/120"
                alt="Scan QR Code"
                className="h-24 w-24 sm:h-28 sm:w-28"
              />
              <p className="mt-2 text-center text-xs text-gray-600">
                Scan to join
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/signup"
              className="inline-block rounded-full bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-emerald-500 sm:px-10 sm:py-5"
            >
              🚀 Get Started Now
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* PROMO SECTION - MOVED UP */}
      <section className="relative -mt-8 mx-auto max-w-3xl px-3">
        <Card className="p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="flex-shrink-0 text-3xl">🎁</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Early Bird Special
              </h3>
              <p className="text-sm text-gray-500">
                First {promo.limit} users get an exclusive deal
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <FeatureRow icon="✅" label="Only 5% fee on profits over 3% (normally 30%)" />
            <FeatureRow icon="✅" label="Locked in for 90 days" />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow icon="✅" label="Priority support and early access" />
          </div>

          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
            loading={promo.loading}
          />

          {promo.error && <p className="mt-2 text-xs text-amber-600">⚠ {promo.error}</p>}

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

      {/* LIVE DASHBOARD PREVIEW */}
      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            Live Trading Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Watch our bots trade in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveActivityWidget activity={activity} />

          <Card className="p-5">
            <h3 className="mb-2 text-lg font-bold text-gray-900">
              Your Trading Bots
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose a plan, connect your accounts, and let IMALI handle the trading
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <img
                  src={StarterNFT}
                  alt="Starter bot"
                  className="h-24 w-full object-contain"
                />
                <p className="mt-2 text-xs font-medium text-gray-700">Starter</p>
                <p className="text-xs text-gray-500">Free</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <img
                  src={ProNFT}
                  alt="Pro bot"
                  className="h-24 w-full object-contain"
                />
                <p className="mt-2 text-xs font-medium text-gray-700">Pro</p>
                <p className="text-xs text-gray-500">$19/mo</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <img
                  src={EliteNFT}
                  alt="Elite bot"
                  className="h-24 w-full object-contain"
                />
                <p className="mt-2 text-xs font-medium text-gray-700">Elite</p>
                <p className="text-xs text-gray-500">$49/mo</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800">🎁 Partner Perk</h4>
              <p className="mt-1 text-sm text-gray-700">
                Invite friends and earn referral rewards as they join IMALI
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
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
            Simple setup, live dashboard, and optional referral rewards
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <StepCard
            number="1"
            emoji="📝"
            title="Sign Up"
            description="Create your free account in seconds. No credit card required."
          />
          <div className="ml-5 h-4 border-l-2 border-gray-200 sm:ml-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link OKX, Alpaca, or your wallet. The bot handles the rest."
          />
          <div className="ml-5 h-4 border-l-2 border-gray-200 sm:ml-6" />
          <StepCard
            number="3"
            emoji="🤖"
            title="Watch It Trade"
            description="Sit back while AI analyzes markets and executes trades for you."
          />
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/signup"
            className="inline-block w-full rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg hover:bg-emerald-500 sm:w-auto"
          >
            Let's Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            What's Inside Your Dashboard ✨
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: "🤖", title: "Automated Trading", desc: "Bots monitor markets and trade automatically", plan: "All Plans" },
            { icon: "📊", title: "Live Dashboard", desc: "Track P&L, win rate, and active positions", plan: "All Plans" },
            { icon: "🎁", title: "Referral Rewards", desc: "Earn rewards when friends join", plan: "Eligible Users" },
            { icon: "📈", title: "Stock Trading", desc: "Trade US stocks via Alpaca", plan: "Starter+" },
            { icon: "₿", title: "Crypto Trading", desc: "Trade crypto via OKX", plan: "Starter+" },
            { icon: "🦄", title: "DEX Trading", desc: "Discover new tokens early", plan: "DeFi+" },
          ].map(({ icon, title, desc, plan }) => (
            <Card key={title} className="p-5">
              <div className="mb-2 text-2xl">{icon}</div>
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-xs text-gray-600">{desc}</p>
              <div className="mt-3">
                <Pill color="indigo">{plan}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* REFERRAL CTA */}
      <section className="mx-auto max-w-5xl px-3 py-10 sm:px-4 sm:py-12">
        <div className="rounded-3xl bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Referral Program
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Earn Rewards by Inviting Friends
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                Share your link, bring in new users, and earn rewards in USDC or IMALI
              </p>
            </div>

            <Link
              to="/referrals"
              className="rounded-xl bg-amber-500 px-6 py-3 text-center font-bold text-black hover:bg-amber-400"
            >
              View Referral Program
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-3 py-12 sm:px-4 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Common Questions 💬</h2>
        </div>

        <div className="space-y-3">
          {[
            { q: "Do I need trading experience?", a: "No. IMALI is designed for beginners. The bots handle the trading for you." },
            { q: "What can I see on the dashboard?", a: "Track live trades, P&L, win rate, active positions, and bot status." },
            { q: "How do referral rewards work?", a: "Share your unique link. When friends sign up and activate, you earn rewards." },
            { q: "Can I stop anytime?", a: "Yes. You can pause or cancel your subscription anytime." },
            { q: "Is my money safe?", a: "We never hold your funds. Your money stays in your connected exchange account." },
          ].map((item, i) => (
            <details key={i} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between p-4 text-sm transition-colors hover:bg-gray-50">
                <span className="pr-4 font-medium text-gray-900">{item.q}</span>
                <span className="flex-shrink-0 text-lg text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-b from-white to-gray-50 px-4 py-14 text-center sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 text-4xl">🚀</div>
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Ready to Start Trading?
          </h2>
          <p className="mb-6 text-base text-gray-600">
            Join thousands of traders using AI to automate their trading
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl hover:from-indigo-500 hover:to-purple-500"
            >
              Create Free Account
            </Link>

            <Link
              to="/referrals"
              className="rounded-full border-2 border-amber-200 bg-white px-8 py-4 text-base font-bold text-amber-700 hover:bg-amber-50"
            >
              Referral Program
            </Link>
          </div>

          <p className="mt-5 text-xs text-gray-500">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
