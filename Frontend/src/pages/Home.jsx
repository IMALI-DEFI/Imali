// src/pages/Home.jsx

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

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

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

function countPositions(data = {}) {
  const asCount = (val) => {
    if (Array.isArray(val)) return val.length;
    return safeNumber(val, 0);
  };

  return (
    asCount(data?.futures?.positions) +
    asCount(data?.stocks?.positions) +
    asCount(data?.okx?.positions) +
    asCount(data?.dex?.positions)
  );
}

function getOnlineBots(data = {}) {
  const candidates = [
    { key: "futures", label: "Futures" },
    { key: "stocks", label: "Stocks" },
    { key: "sniper", label: "Sniper" },
    { key: "okx", label: "OKX" },
    { key: "dex", label: "DEX" },
  ];

  return candidates
    .filter(({ key }) => {
      const v = data[key];
      return v !== null && v !== undefined && typeof v === "object";
    })
    .map(({ label }) => label);
}

function collectRecentTrades(data = {}, limit = 8) {
  const combined = [
    ...normalizeArray(data?.recent_trades),
    ...normalizeArray(data?.futures?.trades),
    ...normalizeArray(data?.stocks?.trades),
    ...normalizeArray(data?.okx?.trades),
    ...normalizeArray(data?.dex?.trades),
  ];

  const seen = new Set();
  const unique = [];

  for (const t of combined) {
    const key =
      t?.id ||
      [t?.symbol, t?.side, t?.created_at || t?.timestamp, t?.price].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }

  return unique
    .sort((a, b) => {
      const tA = new Date(a?.created_at || a?.timestamp || 0).getTime();
      const tB = new Date(b?.created_at || b?.timestamp || 0).getTime();
      return tB - tA;
    })
    .slice(0, limit);
}

function buildActivitySeries(trades = []) {
  if (!trades.length) {
    return [2, 4, 3, 5, 4, 6, 5];
  }

  const recent = [...trades].slice(0, 7).reverse();

  return recent.map((trade, index) => {
    const pnl =
      safeNumber(trade?.pnl, null) ??
      safeNumber(trade?.profit, null) ??
      safeNumber(trade?.amount, null);

    if (pnl !== null && pnl !== undefined && Number.isFinite(Number(pnl))) {
      return Math.max(0, Math.abs(Number(pnl)));
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
        const res = await axios.get(`${API_BASE}/api/promo/status`, {
          timeout: 6000,
        });

        const limit = safeNumber(res.data?.limit, 50);
        const claimed = safeNumber(res.data?.claimed, 0);

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
        `${API_BASE}/api/promo/claim`,
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
      activePositions: 0,
      activeBots: 0,
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
        const response = await axios.get(LIVE_STATS_URL, { timeout: 8000 });
        if (!mounted) return;

        const data = response.data || {};
        const onlineBots = getOnlineBots(data);
        const activePositions = countPositions(data);
        const recentTrades = collectRecentTrades(data, 8);

        setActivity({
          trades: recentTrades,
          stats: {
            activePositions,
            activeBots: onlineBots.length,
            online: onlineBots.length > 0,
            bots: onlineBots,
          },
          loading: false,
          error: null,
        });
      } catch {
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
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
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

function GlowCard({ children, className = "" }) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500" />
      <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-all">
        {children}
      </div>
    </div>
  );
}

function StepCard({ number, emoji, title, description }) {
  return (
    <div className="flex gap-3 sm:gap-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-base sm:text-lg font-bold shadow-lg shadow-indigo-500/20">
        {number}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-base sm:text-lg">
          {emoji} {title}
        </h3>
        <p className="text-white/60 text-sm mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, label }) {
  return (
    <div className="flex items-start gap-2 text-sm text-white/80">
      <span className="text-emerald-400 flex-shrink-0 mt-0.5">{icon}</span>
      <span className="leading-snug">{label}</span>
    </div>
  );
}

function LiveTicker() {
  const TICKER_MESSAGES = [
    "🟢 New users are joining IMALI today",
    "🟢 Live trading bots are scanning markets",
    "🟢 Referral partners can earn USDC and IMALI rewards",
    "🟢 DEX and stock activity updates every 30 seconds",
    "🟢 Early members can claim limited promo access",
  ];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TICKER_MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 sm:px-4 py-2 inline-flex items-center gap-2 text-xs sm:text-sm max-w-full overflow-hidden">
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
      <span
        className={`transition-opacity duration-300 truncate ${
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
      ? "text-red-400"
      : spotsLeft <= 25
      ? "text-yellow-400"
      : "text-emerald-400";

  const barColor =
    spotsLeft <= 10
      ? "bg-gradient-to-r from-red-500 to-orange-500"
      : "bg-gradient-to-r from-emerald-500 to-cyan-500";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-white/60">
          {loading ? "Loading..." : `${claimed} of ${limit} spots claimed`}
        </span>
        <span className={`font-bold ${urgency}`}>
          {loading ? "…" : `${spotsLeft} left!`}
        </span>
      </div>

      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
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
        borderColor: "#34d399",
        backgroundColor: "rgba(52,211,153,0.16)",
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
        backgroundColor: "rgba(3,7,18,0.95)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#a7f3d0",
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      line: {
        capBezierPoints: true,
      },
    },
  };

  if (activity.loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-center gap-2 text-white/40">
          <div className="animate-spin h-4 w-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
          <span className="text-sm">Loading live activity...</span>
        </div>
      </div>
    );
  }

  const { trades, stats } = activity;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              stats.online ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          Daily Activity
        </h3>

        <Link
          to="/live"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          <span>👁️</span> Full Dashboard
        </Link>
      </div>

      <div className="h-24 sm:h-28 mb-4 rounded-xl bg-black/30 border border-white/5 p-2">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-400">
            {stats.activeBots}
          </div>
          <div className="text-[10px] text-white/40">Active Bots</div>
        </div>

        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-indigo-400">
            {stats.activePositions}
          </div>
          <div className="text-[10px] text-white/40">Open Positions</div>
        </div>
      </div>

      {stats.bots.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {stats.bots.map((bot) => (
            <span
              key={bot}
              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            >
              ● {bot}
            </span>
          ))}
        </div>
      )}

      {activity.error ? (
        <div className="text-center py-3 text-amber-400 text-xs">
          ⚠️ {activity.error}
        </div>
      ) : (
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
          {trades.length > 0 ? (
            trades.slice(0, 4).map((trade, i) => {
              const side = String(trade?.side || "buy").toLowerCase();
              const isBuy = side === "buy" || side === "long";

              return (
                <div
                  key={trade?.id || i}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-black/30 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>📊</span>
                    <span className="font-medium truncate">
                      {trade?.symbol || "Unknown"}
                    </span>
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded ${
                        isBuy
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {side.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-right text-white/50 shrink-0">
                    {formatTime(trade?.created_at || trade?.timestamp)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-3 text-white/30 text-xs">
              <div className="text-xl mb-1">📭</div>
              No recent trades
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white overflow-x-hidden">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <img
            src={StarterNFT}
            alt=""
            className="absolute left-[4%] top-20 w-24 sm:w-32 md:w-40 opacity-15 sm:opacity-20"
            draggable="false"
          />
          <img
            src={ProNFT}
            alt=""
            className="absolute right-[5%] top-24 sm:top-32 w-24 sm:w-36 md:w-44 opacity-15 sm:opacity-20"
            draggable="false"
          />
          <img
            src={EliteNFT}
            alt=""
            className="absolute left-1/2 bottom-0 w-28 sm:w-40 md:w-48 -translate-x-1/2 opacity-10 sm:opacity-20"
            draggable="false"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16">
          <div className="flex justify-between items-center mb-6 gap-3">
            <LiveTicker />

            <Link
              to="/live"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs sm:text-sm font-medium transition-all group whitespace-nowrap"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>LIVE DASHBOARD</span>
              <span className="group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="font-extrabold leading-tight">
              <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white/90">
                Your Money-Making Robot 🤖
              </span>
              <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-7xl bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mt-2">
                Is Ready to Trade
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-white/70 leading-relaxed px-2">
              Automated trading for crypto, stocks, and DeFi — built to be
              simple for new users and powerful enough to grow with you.
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5 sm:mt-6 px-2">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="amber">🎁 Referral rewards available</Pill>
              <Pill color="purple">🦾 AI-powered trading bots</Pill>
            </div>

            {/* referral offer banner */}
            <div className="mt-6 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-pink-500/10 px-4 sm:px-5 py-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-amber-300 font-bold">
                      Referral Program Offer
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold mt-1">
                      Invite friends and earn rewards in USDC or IMALI
                    </h3>
                    <p className="text-sm text-white/70 mt-1 max-w-2xl">
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
                className="px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 sm:hover:scale-105 text-center"
              >
                Create Free Account
              </Link>

              <Link
                to="/referrals"
                className="px-8 py-4 rounded-full font-bold border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all text-center"
              >
                Explore Referral Program
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE + ROBOTS */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 mb-10 sm:mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LiveActivityWidget activity={activity} />

          <GlowCard>
            <h3 className="font-bold text-lg mb-2">🤖 Your Trading Robots</h3>
            <p className="text-sm text-white/60 mb-4">
              Each robot is tied to a different part of the IMALI ecosystem and
              can grow with your chosen plan.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <img
                  src={StarterNFT}
                  alt="Starter bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-white/70">
                  Starter
                </p>
              </div>

              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <img
                  src={ProNFT}
                  alt="Pro bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-white/70">Pro</p>
              </div>

              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <img
                  src={EliteNFT}
                  alt="Elite bot"
                  className="w-full h-24 sm:h-28 object-contain"
                />
                <p className="text-xs text-center mt-2 text-white/70">Elite</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
              <h4 className="font-semibold text-amber-200">
                Partner perk: referral rewards
              </h4>
              <p className="text-sm text-white/75 mt-1">
                Users who invite friends can unlock extra value through the
                IMALI referral program, including signup rewards, partner perks,
                and future ecosystem bonuses.
              </p>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            How Does It Work? 🤔
          </h2>
          <p className="text-white/60 mt-2 sm:mt-3 max-w-xl mx-auto text-sm sm:text-base px-2">
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
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
          <StepCard
            number="2"
            emoji="🔗"
            title="Connect Your Accounts"
            description="Link your supported exchange or trading account and access your dashboard, bots, and partner tools."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
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
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 sm:hover:scale-105 text-center"
          >
            Let&apos;s Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* PROMO */}
      <section className="max-w-3xl mx-auto px-3 sm:px-4 py-10 sm:py-12">
        <GlowCard>
          <div className="flex items-start sm:items-center gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">
                Early Bird Special
              </h3>
              <p className="text-xs sm:text-sm text-white/60">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-400">special deal</b>
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-3 sm:p-4 mb-4 space-y-2">
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
            <p className="text-xs text-yellow-400 mt-2">⚠ {promo.error}</p>
          )}

          {!showForm && !promoClaim.state.success && promo.active && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 w-full py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] sm:hover:scale-[1.02]"
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
                className="w-full rounded-xl bg-black/40 border border-emerald-500/50 px-4 py-3.5 sm:py-4 text-white text-sm sm:text-base placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                required
                autoFocus
              />

              {promoClaim.state.error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  ⚠️ {promoClaim.state.error}
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={promoClaim.state.loading}
                  className="flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {promoClaim.state.loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Claiming...
                    </span>
                  ) : (
                    "✅ Confirm My Spot"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    promoClaim.reset();
                  }}
                  className="px-4 sm:px-6 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-white/30 text-center">
                🔒 We&apos;ll never spam you. Unsubscribe anytime.
              </p>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-300 font-bold text-base sm:text-lg">
                You&apos;re in!
              </p>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Check your email, then{" "}
                <Link to="/signup" className="text-emerald-400 underline">
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}

          {!promo.active && !promoClaim.state.success && (
            <div className="mt-4 text-center py-4">
              <p className="text-white/50 text-sm">
                😅 Promo is full! But you can still{" "}
                <Link to="/signup" className="text-indigo-400 underline">
                  sign up at regular pricing
                </Link>
              </p>
            </div>
          )}
        </GlowCard>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            What&apos;s Inside Your Dashboard ✨
          </h2>
          <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base">
            Trading tools, plan upgrades, and referral rewards in one place
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <GlowCard key={title}>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
              <h3 className="font-bold text-base sm:text-lg">{title}</h3>
              <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">
                {desc}
              </p>
              <div className="mt-3">
                <Pill color={pill}>{plan}</Pill>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* REFERRAL CTA */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-12">
        <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-bold">
                Referral Program Offer
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mt-2">
                Turn your network into an extra reward stream
              </h2>
              <p className="text-white/70 mt-3 text-sm sm:text-base leading-relaxed">
                Share your IMALI link, invite new users, and qualify for rewards
                in USDC or IMALI. Perfect for early users, creators, group
                owners, and anyone helping grow the platform.
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
                className="px-6 py-3 rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/5 font-semibold text-center"
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
          <h2 className="text-2xl sm:text-3xl font-bold">Common Questions 💬</h2>
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
              className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/5 transition-colors text-sm sm:text-base">
                <span className="font-medium pr-4">{item.q}</span>
                <span className="text-white/40 group-open:rotate-45 transition-transform text-lg sm:text-xl flex-shrink-0">
                  +
                </span>
              </summary>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-white/60 text-xs sm:text-sm leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚀</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Trade and Earn More?
          </h2>
          <p className="text-white/60 mb-6 sm:mb-8 text-base sm:text-lg px-2">
            Start with automated trading, then grow further with referral
            rewards and partner perks.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
            <Link
              to="/signup"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 transition-all active:scale-95 sm:hover:scale-105 text-center"
            >
              🚀 Create Free Account
            </Link>

            <Link
              to="/referrals"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg border-2 border-amber-400/30 text-amber-200 hover:border-amber-300 hover:bg-amber-500/10 transition-all active:scale-95 text-center"
            >
              🎁 Referral Program
            </Link>
          </div>

          <p className="text-[11px] sm:text-xs text-white/30 mt-5 sm:mt-6">
            No credit card required • Cancel anytime • Referral rewards available
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <section className="border-t border-white/10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-6 text-xs sm:text-sm text-white/40">
          <Link
            to="/how-it-works"
            className="hover:text-white transition-colors py-1"
          >
            How It Works
          </Link>
          <Link
            to="/pricing"
            className="hover:text-white transition-colors py-1"
          >
            Pricing
          </Link>
          <Link
            to="/referrals"
            className="text-amber-300 hover:text-amber-200 transition-colors py-1"
          >
            Referrals
          </Link>
          <Link
            to="/support"
            className="hover:text-white transition-colors py-1"
          >
            Support
          </Link>
          <Link
            to="/privacy"
            className="hover:text-white transition-colors py-1"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="hover:text-white transition-colors py-1"
          >
            Terms
          </Link>
          <Link
            to="/live"
            className="text-emerald-400 hover:text-emerald-300 transition-colors py-1"
          >
            Live
          </Link>
        </div>
      </section>
    </div>
  );
}