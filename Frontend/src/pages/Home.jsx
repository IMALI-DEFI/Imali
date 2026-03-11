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

function countActiveBots(data = {}) {
  let count = 0;

  if (data?.futures?.status === "operational") count += 1;
  if (data?.stocks?.running === true) count += 1;
  if (data?.sniper?.status === "scanning" || data?.sniper?.status === "monitoring") count += 1;
  if (data?.okx?.status === "running" || data?.okx?.positions_count > 0 || data?.okx?.total_trades > 0) count += 1;

  return count;
}

function collectRecentTrades(data = {}, limit = 20) {
  let trades = normalizeArray(data?.recent_trades);

  if (!trades.length) trades = normalizeArray(data?.sniper?.trades);
  if (!trades.length) trades = normalizeArray(data?.okx?.recent_trades);
  if (!trades.length) trades = normalizeArray(data?.futures?.recent_trades);
  if (!trades.length) trades = normalizeArray(data?.stocks?.recent_trades);

  if (!trades.length) {
    const now = Date.now();
    trades = [
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
    ];
  }

  return trades.slice(0, limit);
}

function calculateWinRateLast20(trades = []) {
  const recent20 = trades.slice(0, 20);
  if (!recent20.length) return 0;

  const wins = recent20.filter((trade) => {
    const pct = trade?.pnl_percent;
    const usd = trade?.pnl_usd ?? trade?.pnl;
    if (pct !== undefined && pct !== null && Number.isFinite(Number(pct))) {
      return Number(pct) > 0;
    }
    return safeNumber(usd, 0) > 0;
  }).length;

  return Math.round((wins / recent20.length) * 100);
}

function calculatePnlPercent(trades = []) {
  const recent20 = trades.slice(0, 20);
  if (!recent20.length) return 0;

  const withPct = recent20.filter((t) =>
    t?.pnl_percent !== undefined &&
    t?.pnl_percent !== null &&
    Number.isFinite(Number(t?.pnl_percent))
  );

  if (withPct.length) {
    const total = withPct.reduce((sum, t) => sum + Number(t.pnl_percent), 0);
    return total / withPct.length;
  }

  const usdValues = recent20.map((t) => safeNumber(t?.pnl_usd ?? t?.pnl, 0));
  const nonZero = usdValues.filter((n) => n !== 0);

  if (!nonZero.length) return 0;

  const total = nonZero.reduce((sum, n) => sum + n, 0);
  const avg = total / nonZero.length;

  return avg / 100;
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [3, 4, 5, 4, 6, 5, 7];

  return trades
    .slice(0, 7)
    .reverse()
    .map((trade, index) => {
      const pct = trade?.pnl_percent;
      const usd = trade?.pnl_usd ?? trade?.pnl;

      if (pct !== undefined && pct !== null && Number.isFinite(Number(pct))) {
        return Math.max(1.5, Math.min(10, Math.abs(Number(pct)) * 1.8 + 2));
      }

      if (usd !== undefined && usd !== null && Number.isFinite(Number(usd))) {
        return Math.max(1.5, Math.min(10, Math.abs(Number(usd)) / 80 + 2));
      }

      return index + 2;
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
      activeBots: 0,
      winRate20: 0,
      recentTrades: 0,
      pnlPercent: 0,
      online: false,
      bots: [],
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        const liveResponse = await axios.get(LIVE_STATS_URL, { timeout: 8000 });

        let summaryData = { summary: {} };
        try {
          const summaryResponse = await axios.get(ANALYTICS_SUMMARY_URL, {
            timeout: 5000,
          });
          summaryData = summaryResponse.data || { summary: {} };
        } catch {
          // fallback silently
        }

        if (!mounted) return;

        const data = liveResponse.data || {};
        const trades = collectRecentTrades(data, 20);

        const bots = [];
        if (data?.futures?.status === "operational") bots.push("Futures");
        if (data?.stocks?.running === true) bots.push("Stocks");
        if (data?.sniper?.status === "scanning" || data?.sniper?.status === "monitoring") bots.push("Sniper");
        if (data?.okx?.status === "running" || data?.okx?.positions_count > 0 || data?.okx?.total_trades > 0) {
          bots.push("OKX");
        }

        const summaryWinRate = safeNumber(summaryData?.summary?.win_rate, null);
        const computedWinRate = calculateWinRateLast20(trades);

        setActivity({
          trades,
          stats: {
            activeBots: countActiveBots(data),
            winRate20: Number.isFinite(summaryWinRate) ? Math.round(summaryWinRate) : computedWinRate,
            recentTrades: trades.length,
            pnlPercent: calculatePnlPercent(trades),
            online: bots.length > 0,
            bots,
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
      labels: ["1", "2", "3", "4", "5", "6", "7"],
      datasets: [
        {
          data: series,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.12)",
          fill: true,
          tension: 0.42,
          pointRadius: 0,
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
        },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { display: false, grid: { display: false } },
      },
      elements: {
        line: { capBezierPoints: true },
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
  const pnlPositive = Number(stats.pnlPercent) >= 0;
  const pnlText = `${pnlPositive ? "+" : ""}${Number(stats.pnlPercent).toFixed(1)}%`;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-gray-900">
          <span
            className={`h-2 w-2 rounded-full ${
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

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Live Snapshot
            </p>
            <p className="text-sm text-gray-500">Bot activity from recent trades</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
            {stats.bots.length ? stats.bots.join(" • ") : "Waiting for activity"}
          </div>
        </div>

        <div className="h-32">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatMiniCard
          title="Active Bots"
          value={stats.activeBots}
          valueClassName="text-emerald-600"
        />
        <StatMiniCard
          title="Win Rate (Last 20)"
          value={`${stats.winRate20}%`}
          valueClassName="text-indigo-600"
        />
        <StatMiniCard
          title="Recent Trades"
          value={stats.recentTrades}
          valueClassName="text-purple-600"
        />
        <StatMiniCard
          title="P&L Percent"
          value={pnlText}
          valueClassName={pnlPositive ? "text-emerald-600" : "text-red-600"}
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
              const pctValue =
                trade?.pnl_percent !== undefined && trade?.pnl_percent !== null
                  ? Number(trade?.pnl_percent)
                  : null;

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
                      pctValue === null
                        ? "text-gray-500"
                        : pctValue >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {pctValue === null
                      ? "—"
                      : `${pctValue >= 0 ? "+" : ""}${pctValue.toFixed(1)}%`}
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
      {/* HERO */}
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

          <div className="text-center">
            <h1 className="font-extrabold leading-tight">
              <span className="mt-2 block bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-3xl text-transparent sm:text-4xl md:text-5xl lg:text-7xl">
                📈 Automated Trading for Stock and Crypto
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

            <div className="mx-auto mt-6 max-w-3xl">
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

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500"
              >
                Create Free Account
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
              🤖 Your Trading Bots
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
            emoji="📈"
            title="Track Live Activity"
            description="Monitor active bots, recent trades, current win rate, and P&L performance from one place."
          />
        </div>

        <div className="mt-8 px-4 text-center sm:mt-10 sm:px-0">
          <Link
            to="/signup"
            className="inline-block w-full rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 sm:w-auto"
          >
            Let&apos;s Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* PROMO */}
      <section className="mx-auto max-w-3xl px-3 py-10 sm:px-4 sm:py-12">
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="flex-shrink-0 text-2xl">🎁</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                Early Bird Special
              </h3>
              <p className="text-xs text-gray-500 sm:text-sm">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-600">special deal</b>
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:p-4">
            <FeatureRow
              icon="✅"
              label="Only 5% fee on profits over 3% (normally 30%)"
            />
            <FeatureRow icon="✅" label="Locked in for 90 days" />
            <FeatureRow icon="✅" label="Full access to bot features" />
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
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3.5 text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500 sm:py-4 sm:text-lg"
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
                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:py-4 sm:text-base"
                required
                autoFocus
              />

              {promoClaim.state.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  ⚠️ {promoClaim.state.error}
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={promoClaim.state.loading}
                  className="flex-1 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-500 sm:py-4 sm:text-base"
                >
                  {promoClaim.state.loading ? "Claiming..." : "✅ Confirm My Spot"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    promoClaim.reset();
                  }}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700 sm:px-6"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="mb-2 text-3xl">🎉</div>
              <p className="text-base font-bold text-emerald-700 sm:text-lg">
                You&apos;re in!
              </p>
              <p className="mt-1 text-xs text-gray-600 sm:text-sm">
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

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-3 py-12 sm:px-4 md:px-6 sm:py-16">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
            What&apos;s Inside Your Dashboard ✨
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
              desc: "Track active bots, current win rate from the last 20 trades, recent trade count, and P&L percent.",
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
                to="/signup"
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-center font-semibold hover:bg-gray-50"
              >
                Start Free
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
              a: "You can track active bots, win rate from recent trades, recent trade count, and P&L percent from the home dashboard preview and the full live dashboard.",
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
              to="/signup"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl hover:from-indigo-500 hover:to-purple-500 sm:px-12 sm:py-5 sm:text-lg"
            >
              🚀 Create Free Account
            </Link>

            <Link
              to="/referrals"
              className="rounded-full border-2 border-amber-200 bg-white px-8 py-4 text-base font-bold text-amber-700 transition-all hover:bg-amber-50 sm:px-12 sm:py-5 sm:text-lg"
            >
              🎁 Referral Program
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
} src/pages/Home.jsx

import React, { useEffect, useState } from "react";
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

// CORRECT ENDPOINTS
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;
const HEALTH_URL = `${API_BASE}/api/health`;
const PROMO_STATUS_URL = `${API_BASE}/api/promo/status`;
const PROMO_CLAIM_URL = `${API_BASE}/api/promo/claim`;
const TRADES_RECENT_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_RECENT_URL = `${API_BASE}/api/discoveries/recent`;
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

function countActiveBots(data = {}) {
  let count = 0;
  
  // Check futures bot
  if (data?.futures?.status === "operational") count++;
  // Check stocks bot
  if (data?.stocks?.running === true) count++;
  // Check sniper bot
  if (data?.sniper?.status === "scanning" || data?.sniper?.status === "monitoring") count++;
  // Check OKX bot
  if (data?.okx?.positions_count > 0 || data?.okx?.total_trades > 0) count++;
  
  return count;
}

function calculateTotalPnl(trades = []) {
  return trades.reduce((sum, trade) => sum + safeNumber(trade?.pnl_usd || trade?.pnl, 0), 0);
}

function calculateWinRate(trades = []) {
  const total = trades.length;
  if (total === 0) return 0;
  
  const wins = trades.filter(t => safeNumber(t?.pnl_usd || t?.pnl, 0) > 0).length;
  return Math.round((wins / total) * 100);
}

function collectRecentTrades(data = {}, limit = 8) {
  // First try to get from recent_trades in live-stats
  let trades = normalizeArray(data?.recent_trades);
  
  // If none, try from sniper trades
  if (trades.length === 0) {
    trades = normalizeArray(data?.sniper?.trades);
  }
  
  // If still none, use sample data for demo
  if (trades.length === 0) {
    trades = [
      {
        id: "sample1",
        symbol: "BTC/USD",
        side: "buy",
        price: 42500,
        pnl_usd: 1250.50,
        created_at: new Date(Date.now() - 10 * 60000).toISOString()
      },
      {
        id: "sample2",
        symbol: "ETH/USD",
        side: "sell",
        price: 2250,
        pnl_usd: -320.75,
        created_at: new Date(Date.now() - 25 * 60000).toISOString()
      },
      {
        id: "sample3",
        symbol: "SOL/USD",
        side: "buy",
        price: 98.50,
        pnl_usd: 0,
        created_at: new Date(Date.now() - 45 * 60000).toISOString()
      }
    ];
  }
  
  return trades.slice(0, limit);
}

function collectDiscoveries(data = {}, limit = 4) {
  // Try to get from sniper discoveries
  let discoveries = normalizeArray(data?.sniper?.discoveries);
  
  // If none, return empty array
  return discoveries.slice(0, limit);
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [2, 4, 3, 5, 4, 6, 5];

  const recent = [...trades].slice(0, 7).reverse();

  return recent.map((trade, index) => {
    const pnl = safeNumber(trade?.pnl_usd || trade?.pnl, null);
    
    if (pnl !== null && pnl !== undefined && Number.isFinite(Number(pnl))) {
      return Math.max(1, Math.min(10, Math.abs(Number(pnl)) / 200 + 2));
    }
    
    return index + 2;
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
        const res = await axios.get(PROMO_STATUS_URL, {
          timeout: 6000,
        });

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
    discoveries: [],
    stats: {
      activePositions: 0,
      activeBots: 0,
      totalTrades: 0,
      totalPnl: 0,
      winRate: 0,
      online: false,
      bots: [],
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        // Fetch live stats
        const liveResponse = await axios.get(LIVE_STATS_URL, { timeout: 8000 });
        
        // Fetch analytics summary for win rate
        let summaryData = { summary: {} };
        try {
          const summaryResponse = await axios.get(ANALYTICS_SUMMARY_URL, { timeout: 5000 });
          summaryData = summaryResponse.data;
        } catch {
          // Silently fail, we'll use defaults
        }
        
        if (!mounted) return;

        const data = liveResponse.data || {};
        
        // Get bots that are online
        const bots = [];
        if (data?.futures?.status === "operational") bots.push("Futures");
        if (data?.stocks?.running === true) bots.push("Stocks");
        if (data?.sniper?.status === "scanning" || data?.sniper?.status === "monitoring") bots.push("Sniper");
        if (data?.okx?.positions_count > 0 || data?.okx?.total_trades > 0) bots.push("OKX");
        
        const recentTrades = collectRecentTrades(data, 8);
        const recentDiscoveries = collectDiscoveries(data, 4);
        
        // Calculate stats
        const totalTrades = data?.okx?.total_trades || recentTrades.length;
        const totalPnl = calculateTotalPnl(recentTrades);
        const winRate = summaryData?.summary?.win_rate || calculateWinRate(recentTrades);
        
        // Count active positions
        const activePositions = 
          (data?.futures?.positions || 0) + 
          (data?.sniper?.active_trades || 0) + 
          (data?.okx?.positions_count || 0);

        setActivity({
          trades: recentTrades,
          discoveries: recentDiscoveries,
          stats: {
            activePositions,
            activeBots: bots.length,
            totalTrades,
            totalPnl,
            winRate,
            online: bots.length > 0,
            bots,
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
    pink: "bg-pink-50 text-pink-700 border-pink-200",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border ${
        classes[color] ?? classes.indigo
      }`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function StepCard({ number, emoji, title, description }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md">
        {number}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg">
          {emoji} {title}
        </h3>
        <p className="text-gray-600 text-sm mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, label }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <span className="text-emerald-600 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="leading-snug">{label}</span>
    </div>
  );
}

function LiveTicker() {
  const TICKER_MESSAGES = [
    "Live bots are scanning markets now",
    "Referral rewards are available for eligible users",
    "Daily activity updates every 30 seconds",
    "IMALI supports crypto, stocks, and DeFi workflows",
    "Early members can still claim limited promo access",
  ];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 250);
    }, 3500);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 inline-flex items-center gap-2 text-xs sm:text-sm text-emerald-700 max-w-full overflow-hidden">
      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
      <span
        className={`truncate transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {TICKER_MESSAGES[index]}
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

      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-emerald-500 to-cyan-500"
          style={{ width: `${pct}%` }}
        />
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

  const chartData = {
    labels: ["1", "2", "3", "4", "5", "6", "7"],
    datasets: [
      {
        data: series,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.10)",
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  if (activity.loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
          <span className="text-sm">Loading live activity...</span>
        </div>
      </Card>
    );
  }

  const { trades, stats, discoveries } = activity;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              stats.online ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          Live Dashboard
        </h3>

        <Link
          to="/live"
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Full Dashboard →
        </Link>
      </div>

      <div className="h-28 mb-4 rounded-xl bg-gray-50 border border-gray-100 p-2">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
          <div className="text-lg font-bold text-emerald-600">
            {stats.activeBots}
          </div>
          <div className="text-[10px] text-gray-500">Active Bots</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
          <div className="text-lg font-bold text-indigo-600">
            {stats.totalTrades}
          </div>
          <div className="text-[10px] text-gray-500">Total Trades</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
          <div className="text-lg font-bold text-purple-600">
            ${Math.abs(stats.totalPnl).toFixed(0)}
          </div>
          <div className="text-[10px] text-gray-500">P&L</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          Win Rate: {stats.winRate}%
        </span>
        {stats.bots.map((bot) => (
          <span
            key={bot}
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
          >
            ● {bot}
          </span>
        ))}
      </div>

      {activity.error ? (
        <div className="text-center py-3 text-amber-600 text-xs">
          ⚠️ {activity.error}
        </div>
      ) : (
        <>
          {/* Recent Trades */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 mb-3">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">Recent Trades</h4>
            {trades.length > 0 ? (
              trades.slice(0, 3).map((trade, i) => {
                const side = String(trade?.side || "buy").toLowerCase();
                const isBuy = side === "buy" || side === "long";

                return (
                  <div
                    key={trade?.id || i}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>📊</span>
                      <span className="font-medium truncate text-gray-800">
                        {trade?.symbol || "Unknown"}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded ${
                          isBuy
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {side.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-right text-gray-500 shrink-0">
                      {formatTime(trade?.created_at || trade?.timestamp)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-2 text-gray-400 text-xs">
                No recent trades
              </div>
            )}
          </div>

          {/* DEX Discoveries */}
          {discoveries.length > 0 && (
            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
              <h4 className="text-xs font-semibold text-gray-500 mb-1">New Discoveries</h4>
              {discoveries.slice(0, 2).map((disc, i) => (
                <div
                  key={disc?.id || i}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>🔍</span>
                    <span className="font-medium truncate text-gray-800">
                      {disc?.pair || "Unknown"}
                    </span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-purple-200 text-purple-800">
                      {disc?.chain || "eth"}
                    </span>
                  </div>
                  <div className="text-right text-purple-600 shrink-0 font-mono">
                    {(disc?.ai_score || 0) * 100}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
        <div className="absolute inset-0 pointer-events-none select-none">
          <img
            src={StarterNFT}
            alt=""
            className="absolute left-[4%] top-20 w-24 sm:w-32 md:w-40 opacity-10"
            draggable="false"
          />
          <img
            src={ProNFT}
            alt=""
            className="absolute right-[5%] top-24 sm:top-32 w-24 sm:w-36 md:w-44 opacity-10"
            draggable="false"
          />
          <img
            src={EliteNFT}
            alt=""
            className="absolute left-1/2 bottom-0 w-28 sm:w-40 md:w-48 -translate-x-1/2 opacity-10"
            draggable="false"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 md:pt-24 pb-14 sm:pb-16">
          <div className="flex justify-between items-center mb-6 gap-3">
            <LiveTicker />

            <Link
              to="/live"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm font-medium shadow-sm whitespace-nowrap"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>LIVE DASHBOARD</span>
              <span>→</span>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="font-extrabold leading-tight">
              <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gray-800">
                Your Money-Making Robot 🤖
              </span>
              <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-7xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent mt-2">
                Is Ready to Trade
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed px-2">
              Automated trading for crypto, stocks, and DeFi — built to be
              simple for new users and powerful enough to grow with you.
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5 sm:mt-6 px-2">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="amber">🎁 Referral rewards available</Pill>
              <Pill color="purple">🦾 AI-powered trading bots</Pill>
            </div>

            <div className="mt-6 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 sm:px-5 py-4 text-left shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">
                      Referral Program Offer
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold mt-1 text-gray-900">
                      Invite friends and earn rewards in USDC or IMALI
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                      Share your referral link, bring in new members, and earn
                      partner rewards as the IMALI ecosystem grows.
                    </p>
                  </div>

                  <Link
                    to="/referrals"
                    className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all whitespace-nowrap"
                  >
                    View Referral Offer
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                to="/signup"
                className="px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-200 transition-all text-center"
              >
                Create Free Account
              </Link>

              <Link
                to="/referrals"
                className="px-8 py-4 rounded-full font-bold border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 shadow-sm text-center"
              >
                Explore Referral Program
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE + ROBOTS */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 mb-10 sm:mb-12 -mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LiveActivityWidget activity={activity} />

          <Card className="p-5">
            <h3 className="font-bold text-lg mb-2 text-gray-900">
              🤖 Your Trading Robots
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Each robot is tied to a different part of the IMALI ecosystem and
              can grow with your chosen plan.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <img
                  src={StarterNFT}
                  alt="Starter bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-gray-600">
                  Starter
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <img
                  src={ProNFT}
                  alt="Pro bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-gray-600">Pro</p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <img
                  src={EliteNFT}
                  alt="Elite bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-gray-600">Elite</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800">
                Partner perk: referral rewards
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                Users who invite friends can unlock extra value through the
                IMALI referral program, including signup rewards, partner perks,
                and future ecosystem bonuses.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            How Does It Work? 🤔
          </h2>
          <p className="text-gray-600 mt-2 sm:mt-3 max-w-xl mx-auto text-sm sm:text-base px-2">
            Simple setup, live bot activity, and optional referral rewards.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
          <StepCard
            number="1"
            emoji="📝"
            title="Sign Up"
            description="Create your account and choose the plan that fits your goals. No advanced trading knowledge required."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-gray-200 h-4 sm:h-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link your supported exchange or trading account and access your dashboard, bots, and partner tools."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-gray-200 h-4 sm:h-6" />
          <StepCard
            number="3"
            emoji="🎁"
            title="Trade and Refer"
            description="Let the bots work, then share your referral link with friends to earn extra rewards as IMALI grows."
          />
        </div>

        <div className="text-center mt-8 sm:mt-10 px-4 sm:px-0">
          <Link
            to="/signup"
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-200 text-center"
          >
            Let&apos;s Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* PROMO */}
      <section className="max-w-3xl mx-auto px-3 sm:px-4 py-10 sm:py-12">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start sm:items-center gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Early Bird Special
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-600">special deal</b>
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 space-y-2 border border-gray-100">
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
            <p className="text-xs text-amber-600 mt-2">⚠ {promo.error}</p>
          )}

          {!showForm && !promoClaim.state.success && promo.active && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg"
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
                className="w-full rounded-xl bg-white border border-emerald-200 px-4 py-3.5 sm:py-4 text-gray-900 text-sm sm:text-base placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                autoFocus
              />

              {promoClaim.state.error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  ⚠️ {promoClaim.state.error}
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={promoClaim.state.loading}
                  className="flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  {promoClaim.state.loading ? "Claiming..." : "✅ Confirm My Spot"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    promoClaim.reset();
                  }}
                  className="px-4 sm:px-6 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-700 font-bold text-base sm:text-lg">
                You&apos;re in!
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
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

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            What&apos;s Inside Your Dashboard ✨
          </h2>
          <p className="text-gray-600 mt-2 sm:mt-3 text-sm sm:text-base">
            Trading tools, plan upgrades, and referral rewards in one place
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: "🤖",
              title: "AI Trading Bot",
              pill: "emerald",
              plan: "All Plans",
              desc: "Automated bots monitor markets and execute trades across supported strategies.",
            },
            {
              icon: "📊",
              title: "Live Charts & Stats",
              pill: "indigo",
              plan: "All Plans",
              desc: "Track live activity, open positions, and recent bot decisions in a cleaner dashboard view.",
            },
            {
              icon: "🎁",
              title: "Referral Rewards",
              pill: "amber",
              plan: "Eligible Users",
              desc: "Invite friends, earn rewards, and unlock additional partner perks as your network grows.",
            },
            {
              icon: "📈",
              title: "Stock Trading",
              pill: "indigo",
              plan: "Starter+",
              desc: "Access stock bot features and account integrations for supported brokerage flows.",
            },
            {
              icon: "🦄",
              title: "DEX Trading",
              pill: "purple",
              plan: "Elite+",
              desc: "Explore DeFi trading routes and early crypto opportunities through advanced plans.",
            },
            {
              icon: "🏅",
              title: "Partner Growth",
              pill: "pink",
              plan: "Referral Program",
              desc: "Build your referral network and position yourself for future program bonuses and ecosystem perks.",
            },
          ].map(({ icon, title, pill, plan, desc }) => (
            <Card key={title} className="p-5">
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
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
      <section className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-12">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-pink-50 to-purple-50 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-700 font-bold">
                Referral Program Offer
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mt-2 text-gray-900">
                Turn your network into an extra reward stream
              </h2>
              <p className="text-gray-600 mt-3 text-sm sm:text-base leading-relaxed">
                Share your IMALI link, invite new users, and qualify for rewards
                in USDC or IMALI. Great for early users, creators, group owners,
                and community builders.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/referrals"
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-center"
              >
                View Referral Program
              </Link>

              <Link
                to="/signup"
                className="px-6 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-center"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Common Questions 💬
          </h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {[
            {
              q: "Do I need to know how to trade?",
              a: "No. IMALI is designed to be beginner friendly, with automation and a simpler user experience.",
            },
            {
              q: "Can I earn by inviting friends?",
              a: "Yes. The referral program offer lets eligible users share their link and earn rewards when referred users join and activate.",
            },
            {
              q: "Where do referral rewards show up?",
              a: "Referral details and partner tracking can be viewed from the referral section of the platform.",
            },
            {
              q: "Can I stop anytime?",
              a: "Yes. You can pause or stop participating at any time depending on your connected services and plan setup.",
            },
            {
              q: "Is my money safe?",
              a: "Funds remain in your own connected account. IMALI is built around account connection and automation rather than custody.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
            >
              <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base">
                <span className="font-medium pr-4 text-gray-900">{item.q}</span>
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg sm:text-xl flex-shrink-0">
                  +
                </span>
              </summary>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-gray-600 text-xs sm:text-sm leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-14 sm:py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚀</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">
            Ready to Trade and Earn More?
          </h2>
          <p className="text-gray-600 mb-6 sm:mb-8 text-base sm:text-lg px-2">
            Start with automated trading, then grow further with referral
            rewards and partner perks.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
            <Link
              to="/signup"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl"
            >
              🚀 Create Free Account
            </Link>

            <Link
              to="/referrals"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg border-2 border-amber-200 text-amber-700 bg-white hover:bg-amber-50 transition-all"
            >
              🎁 Referral Program
            </Link>
          </div>

          <p className="text-[11px] sm:text-xs text-gray-500 mt-5 sm:mt-6">
            No credit card required • Cancel anytime • Referral rewards available
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <section className="border-t border-gray-200 py-6 sm:py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-6 text-xs sm:text-sm text-gray-500">
          <Link to="/how-it-works" className="hover:text-gray-900 transition-colors py-1">
            How It Works
          </Link>
          <Link to="/pricing" className="hover:text-gray-900 transition-colors py-1">
            Pricing
          </Link>
          <Link to="/referrals" className="text-amber-700 hover:text-amber-800 transition-colors py-1">
            Referrals
          </Link>
          <Link to="/support" className="hover:text-gray-900 transition-colors py-1">
            Support
          </Link>
          <Link to="/privacy" className="hover:text-gray-900 transition-colors py-1">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-gray-900 transition-colors py-1">
            Terms
          </Link>
          <Link to="/live" className="text-emerald-600 hover:text-emerald-700 transition-colors py-1">
            Live
          </Link>
        </div>
      </section>
    </div>
  );
}
