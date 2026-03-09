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

/* ============================
CONFIG
============================ */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;
const PROMO_URL = `${API_BASE}/api/promo/status`;
const ANNOUNCEMENTS_URL = `${API_BASE}/api/announcements/public`;

/* ============================
HELPERS
============================ */

const safeNumber = (v, f = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
};

const normalizeArray = (v) => (Array.isArray(v) ? v : []);

const formatCurrency = (value) => {
  const num = safeNumber(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatCurrencySigned = (value) => {
  const num = safeNumber(value);
  const abs = Math.abs(num).toFixed(0);
  return `${num >= 0 ? "+" : "-"}$${abs}`;
};

const formatCompactNumber = (value) => {
  const num = safeNumber(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
};

const formatShortDate = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "—";
  }
};

const formatFullDate = (timestamp) => {
  if (!timestamp) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "—";
  }
};

/* ============================
LIVE DATA HOOK
============================ */

function useLiveData() {
  const [state, setState] = useState({
    trades: [],
    discoveries: [],
    bots: [],
    analytics: {
      total_trades: 0,
      total_pnl: 0,
      win_rate: 0,
      wins: 0,
      losses: 0,
    },
    historicalData: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [tradesRes, discoveriesRes, botsRes, analyticsRes, historicalRes] =
          await Promise.allSettled([
            axios.get(TRADES_URL, { timeout: 5000 }),
            axios.get(DISCOVERIES_URL, { timeout: 5000 }),
            axios.get(BOT_STATUS_URL, { timeout: 5000 }),
            axios.get(ANALYTICS_URL, { timeout: 5000 }),
            axios.get(HISTORICAL_URL, { timeout: 5000 }),
          ]);

        if (!mounted) return;

        let trades = [];
        if (tradesRes.status === "fulfilled") {
          trades = tradesRes.value?.data?.trades || [];
        }

        let discoveries = [];
        if (discoveriesRes.status === "fulfilled") {
          discoveries = discoveriesRes.value?.data?.discoveries || [];
        }

        let bots = [];
        if (botsRes.status === "fulfilled") {
          bots = botsRes.value?.data?.bots || [];
        }

        let analytics = {
          total_trades: 0,
          total_pnl: 0,
          win_rate: 0,
          wins: 0,
          losses: 0,
        };
        if (analyticsRes.status === "fulfilled") {
          analytics = analyticsRes.value?.data?.summary || analytics;
        }

        let historicalData = [];
        if (historicalRes.status === "fulfilled") {
          historicalData = normalizeArray(historicalRes.value?.data?.daily || []).slice(-14);
        }

        setState({
          trades: trades.slice(0, 5),
          discoveries: discoveries.slice(0, 5),
          bots,
          analytics,
          historicalData,
          loading: false,
          error: null,
        });
      } catch {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Live data unavailable",
        }));
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}

/* ============================
PROMO HOOK
============================ */

function usePromoStatus() {
  const [promo, setPromo] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    loading: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(PROMO_URL);
        const limit = safeNumber(res.data?.limit, 50);
        const claimed = safeNumber(res.data?.claimed, 0);

        setPromo({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          loading: false,
        });
      } catch {
        setPromo((prev) => ({ ...prev, loading: false }));
      }
    };

    load();
  }, []);

  return promo;
}

/* ============================
ANNOUNCEMENTS HOOK
============================ */

function useAnnouncements() {
  const [state, setState] = useState({
    items: [],
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(ANNOUNCEMENTS_URL, { timeout: 5000 });
        if (!mounted) return;

        const items = normalizeArray(
          res.data?.announcements || res.data?.items || res.data || []
        ).slice(0, 3);

        setState({
          items,
          loading: false,
        });
      } catch {
        if (!mounted) return;

        setState({
          items: [
            {
              title: "Telegram trade alerts available",
              body: "Get faster updates and trading notifications directly on Telegram.",
              created_at: new Date().toISOString(),
            },
            {
              title: "Live dashboard is active",
              body: "Track recent trades, discoveries, and bot status in one place.",
              created_at: new Date().toISOString(),
            },
          ],
          loading: false,
        });
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/* ============================
CHART
============================ */

function MiniHistoricalChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
        No historical data yet
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => formatShortDate(d.date)),
    datasets: [
      {
        data: data.map((d) => safeNumber(d.pnl, 0)),
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.12)",
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        titleColor: "#ffffff",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(16, 185, 129, 0.25)",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => `P&L: ${formatCurrencySigned(context.raw)}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return (
    <div className="h-28">
      <Line data={chartData} options={options} />
    </div>
  );
}

/* ============================
UI PIECES
============================ */

function StatCard({ label, value, subtext, color = "slate" }) {
  const colorClasses = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    purple: "text-violet-600",
    slate: "text-slate-900",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colorClasses[color] || colorClasses.slate}`}>
        {value}
      </div>
      {subtext ? <div className="mt-1 text-xs text-slate-400">{subtext}</div> : null}
    </div>
  );
}

function MiniTradeRow({ trade }) {
  const side = trade?.side || "buy";
  const pnl = safeNumber(trade?.pnl_usd || trade?.pnl, 0);
  const symbol = trade?.symbol || "Unknown";
  const isBuy = side === "buy" || side === "long";

  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isBuy ? "text-emerald-500" : "text-red-500"}`}>
          {isBuy ? "▲" : "▼"}
        </span>
        <span className="text-sm font-medium text-slate-800">{symbol}</span>
      </div>
      <span className={`text-xs font-semibold ${pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {formatCurrencySigned(pnl)}
      </span>
    </div>
  );
}

function MiniDiscoveryRow({ discovery }) {
  const score = safeNumber(discovery?.ai_score, 0);
  const pair = discovery?.pair || "New token";

  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-violet-500">🦄</span>
        <span className="max-w-[130px] truncate text-sm font-medium text-slate-800">
          {pair}
        </span>
      </div>
      <span className={`text-xs font-semibold ${score >= 0.7 ? "text-emerald-600" : "text-amber-600"}`}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function AnnouncementCard({ item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">
          {item?.title || "Announcement"}
        </h4>
        <span className="text-[11px] text-slate-400">
          {formatFullDate(item?.created_at || item?.date)}
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">
        {item?.body || item?.message || "New update available."}
      </p>
    </div>
  );
}

function PromoMeter({ claimed, limit, spotsLeft }) {
  const safeLimit = Math.max(1, safeNumber(limit, 50));
  const pct = Math.min(100, (safeNumber(claimed, 0) / safeLimit) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {claimed} of {limit} spots claimed
        </span>
        <span className="font-bold text-emerald-600">{spotsLeft} remaining</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-slate-500">
        First 50 customers get a 5% performance fee for 90 days.
      </p>
    </div>
  );
}

function NFTShowcase() {
  const tiers = [
    {
      name: "Starter",
      img: StarterNFT,
      color: "from-sky-50 to-indigo-100",
      price: "Free",
    },
    {
      name: "Pro",
      img: ProNFT,
      color: "from-fuchsia-50 to-violet-100",
      price: "$19/mo",
    },
    {
      name: "Elite",
      img: EliteNFT,
      color: "from-amber-50 to-orange-100",
      price: "$49/mo",
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900">Trading Robots</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose the level that matches your trading goals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div key={tier.name} className="text-center">
            <div className={`mb-3 rounded-2xl bg-gradient-to-br ${tier.color} p-4`}>
              <img
                src={tier.img}
                alt={tier.name}
                className="mx-auto h-28 w-full object-contain"
              />
            </div>
            <div className="text-sm font-semibold text-slate-900">{tier.name}</div>
            <div className="text-xs text-slate-500">{tier.price}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        Each robot supports different markets such as crypto, stocks, and DeFi.
      </p>

      <Link
        to="/pricing"
        className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-500"
      >
        View pricing and features →
      </Link>
    </div>
  );
}

function LiveActivityWidget({ data }) {
  const { trades, discoveries, bots, analytics, historicalData, loading, error } = data;

  const activeBots = bots.filter(
    (b) => b.status === "operational" || b.status === "scanning"
  ).length;

  const totalTrades = analytics.total_trades || trades.length;
  const totalPnl = analytics.total_pnl || 0;
  const winRate = analytics.win_rate || 0;
  const discoveriesCount = discoveries.length;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-slate-500">Loading live data...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Live Trading Dashboard</h3>
          <p className="text-sm text-slate-500">
            Real activity pulled from your public dashboard endpoints.
          </p>
        </div>
        <Link
          to="/live"
          className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          View full dashboard →
        </Link>
      </div>

      <MiniHistoricalChart data={historicalData} />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Active Bots"
          value={activeBots}
          subtext={`${bots.length} total bots`}
          color="emerald"
        />
        <StatCard
          label="Total Trades"
          value={formatCompactNumber(totalTrades)}
          subtext={`${winRate}% win rate`}
          color="purple"
        />
        <StatCard
          label="Total P&L"
          value={formatCurrencySigned(totalPnl)}
          subtext={totalPnl >= 0 ? "Profitable" : "Currently negative"}
          color={totalPnl >= 0 ? "emerald" : "amber"}
        />
        <StatCard
          label="Discoveries"
          value={discoveriesCount}
          subtext="recent token discoveries"
          color="purple"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Recent Trades
          </h4>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {trades.length > 0 ? (
              trades.map((trade, i) => <MiniTradeRow key={i} trade={trade} />)
            ) : (
              <div className="text-sm text-slate-400">No recent trades</div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            New Discoveries
          </h4>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {discoveries.length > 0 ? (
              discoveries.map((disc, i) => (
                <MiniDiscoveryRow key={i} discovery={disc} />
              ))
            ) : (
              <div className="text-sm text-slate-400">No recent discoveries</div>
            )}
          </div>
        </div>
      </div>

      {bots.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {bots.slice(0, 5).map((bot, i) => {
            const live = bot.status === "operational" || bot.status === "scanning";
            return (
              <span
                key={i}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  live
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {live ? "●" : "○"} {bot.name}
              </span>
            );
          })}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-xs text-red-500">{error}</div> : null}
    </div>
  );
}

function AnnouncementSection({ items, loading }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900">Announcements</h3>
        <p className="mt-1 text-sm text-slate-500">
          Important updates, new features, and platform notices.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading announcements...</div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <AnnouncementCard key={index} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400">No announcements yet.</div>
      )}
    </div>
  );
}

function TelegramPrompt() {
  return (
    <div className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-emerald-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
            Telegram Trade Alerts
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            Start on Telegram for faster alerts
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Get trade alerts, updates, and account notifications in a more direct way.
            Telegram is one of the easiest places to start if you want signals quickly.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Start Free
          </Link>
          <Link
            to="/support"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Get Telegram Help
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================
PAGE
============================ */

export default function Home() {
  const liveData = useLiveData();
  const promo = usePromoStatus();
  const announcements = useAnnouncements();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const promoText = useMemo(() => {
    if (promo.loading) return "Loading promo status...";
    if (promo.spotsLeft > 0) return `${promo.spotsLeft} promo spots left`;
    return "Promo spots are currently full";
  }, [promo]);

  const claimSpot = async (e) => {
    e.preventDefault();
    try {
      setClaiming(true);
      await axios.post(`${API_BASE}/api/promo/claim`, { email });
      setSuccess(true);
      setEmail("");
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-[-80px] h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="absolute right-[-60px] top-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-200/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Automated crypto, stock, and DeFi trading
              </div>

              <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
                Automated Trading Robots for{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-violet-600 bg-clip-text text-transparent">
                  real-time market action
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Connect your accounts and let IMALI monitor opportunities across
                crypto, stocks, and DeFi. You stay in control while the system helps
                automate decisions, tracking, and alerts.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="rounded-xl bg-emerald-600 px-7 py-4 text-center text-base font-bold text-white transition hover:bg-emerald-500"
                >
                  Start Trading Free
                </Link>
                <Link
                  to="/demo"
                  className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-center text-base font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  Try Demo
                </Link>
                <Link
                  to="/live"
                  className="rounded-xl border border-cyan-200 bg-cyan-50 px-7 py-4 text-center text-base font-bold text-cyan-700 transition hover:bg-cyan-100"
                >
                  View Live Dashboard
                </Link>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-emerald-600">$0</div>
                  <div className="mt-1 text-xs text-slate-500">Starting Cost</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-violet-600">4+</div>
                  <div className="mt-1 text-xs text-slate-500">Active Strategies</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-cyan-600">24/7</div>
                  <div className="mt-1 text-xs text-slate-500">Automation</div>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl lg:ml-auto lg:mr-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Early Access Promo</div>
                    <div className="text-xs text-slate-500">{promoText}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Limited
                  </span>
                </div>

                <PromoMeter
                  claimed={promo.claimed}
                  limit={promo.limit}
                  spotsLeft={promo.spotsLeft}
                />

                {!success ? (
                  <form onSubmit={claimSpot} className="mt-5 space-y-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      disabled={claiming}
                      className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {claiming ? "Claiming..." : "Claim Promo Spot"}
                    </button>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    ✅ Spot reserved. Check your email for confirmation.
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="text-sm font-semibold text-cyan-800">
                    Want faster trade alerts?
                  </div>
                  <p className="mt-1 text-sm leading-6 text-cyan-700">
                    Start on Telegram to receive trading updates and notifications more directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TELEGRAM PROMPT */}
      <section className="mx-auto mb-8 max-w-6xl px-6">
        <TelegramPrompt />
      </section>

      {/* ANNOUNCEMENTS */}
      <section className="mx-auto mb-8 max-w-6xl px-6">
        <AnnouncementSection
          items={announcements.items}
          loading={announcements.loading}
        />
      </section>

      {/* MAIN CONTENT */}
      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <LiveActivityWidget data={liveData} />
          <NFTShowcase />
        </div>
      </section>

      {/* SIMPLE WHY IMALI SECTION */}
      <section className="mx-auto mb-16 max-w-6xl px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">🧠</div>
            <h3 className="text-lg font-bold text-slate-900">Built for clarity</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A simpler way to understand automated trading without needing to be an expert.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">📡</div>
            <h3 className="text-lg font-bold text-slate-900">Live monitoring</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Watch discoveries, bot activity, recent trades, and performance from one place.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">📲</div>
            <h3 className="text-lg font-bold text-slate-900">Telegram-friendly</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Get alerts where you are already active so you can react faster and stay informed.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center">
          <p className="text-xs leading-6 text-slate-500">
            © 2026 IMALI. All rights reserved. Trading involves risk. Past performance does not guarantee future results.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <Link to="/terms" className="hover:text-slate-800">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link to="/pricing" className="hover:text-slate-800">
              Pricing
            </Link>
            <Link to="/demo" className="hover:text-slate-800">
              Demo
            </Link>
            <Link to="/live" className="font-medium text-emerald-600 hover:text-emerald-500">
              Live Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
