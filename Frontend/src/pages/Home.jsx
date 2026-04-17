import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePromoStatus, usePromoClaim } from "../hooks/usePromo";
import axios from "axios";
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
import { FaShareAlt } from "react-icons/fa";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatNumber = (value) => safeNumber(value).toLocaleString();

const getBotDisplayName = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name === "okx") return "OKX Spot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks" || name === "stock") return "Stock Bot";
  if (name === "sniper") return "Sniper Bot";
  return botName || "Bot";
};

const getBotIcon = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("okx")) return "🔷";
  return "🤖";
};

function normalizeBotName(botName) {
  const name = String(botName || "").toLowerCase();
  if (name.includes("okx")) return "okx";
  if (name.includes("future")) return "futures";
  if (name.includes("stock") || name.includes("alpaca")) return "stocks";
  if (name.includes("sniper") || name.includes("dex")) return "sniper";
  return name || "unknown";
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  const dayMap = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  trades.slice(0, 100).forEach((trade) => {
    if (trade.created_at) {
      const date = new Date(trade.created_at);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      if (dayMap[dayName]) {
        const pnl = Math.abs(trade.pnl_usd || trade.pnl || 0);
        dayMap[dayName].push(pnl);
      }
    }
  });

  return dayOrder.map((day) => {
    const activities = dayMap[day];
    if (activities.length === 0) return 5;
    const avg = activities.reduce((a, b) => a + b, 0) / activities.length;
    return Math.max(3, Math.min(15, avg / 50 + 3));
  });
}

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-3xl border border-gray-200 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

const Pill = ({ children, color = "default" }) => {
  const classes = {
    default: "bg-white text-gray-700 border-gray-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`inline-block rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${
        classes[color] || classes.default
      }`}
    >
      {children}
    </span>
  );
};

const FeatureRow = ({ icon, label }) => (
  <div className="flex items-start gap-3 text-sm text-gray-700">
    <span className="mt-0.5 text-emerald-600">{icon}</span>
    <span>{label}</span>
  </div>
);

const StatMiniCard = ({ title, value, subtext, valueClassName = "text-gray-900" }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
    <div className={`text-xl font-bold ${valueClassName}`}>{value}</div>
    <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
      {title}
    </div>
    {subtext && <div className="mt-1 text-[10px] text-gray-400">{subtext}</div>}
  </div>
);

const StepCard = ({ num, title, text }) => (
  <Card className="p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
      {num}
    </div>
    <h3 className="mt-5 text-2xl font-bold text-gray-900">{title}</h3>
    <p className="mt-3 leading-relaxed text-gray-600">{text}</p>
  </Card>
);

function PromoMeter({ promo }) {
  const pct = promo.limit > 0 ? (promo.claimed / promo.limit) * 100 : 0;
  const urgency =
    promo.spotsLeft <= 10
      ? "text-red-600"
      : promo.spotsLeft <= 25
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">
          {promo.loading ? "Loading..." : `${promo.claimed} of ${promo.limit} spots claimed`}
        </span>
        <span className={`font-bold ${urgency}`}>
          {promo.loading ? "..." : `${promo.spotsLeft} left`}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      {!promo.loading && (
        <p className="text-center text-xs text-gray-500">
          Only {promo.feePercent}% fee on profits over {promo.thresholdPercent}% for{" "}
          {promo.durationDays} days
        </p>
      )}
    </div>
  );
}

const LiveTicker = () => {
  const messages = [
    "Start with paper trading before going live",
    "Live bots are scanning markets now",
    "Connect Alpaca, OKX, and MetaMask",
    "Trade stocks and crypto with automation",
    "Cancel any time",
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
};

function LiveActivityWidget({ activity }) {
  const series = buildActivitySeries(activity.trades);
  const { stats } = activity;

  const chartData = useMemo(
    () => ({
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: series,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.10)",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2,
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
          callbacks: {
            label: (context) => `Activity: ${context.raw.toFixed(1)}`,
          },
          backgroundColor: "#1f2937",
          titleColor: "#ffffff",
          bodyColor: "#d1fae5",
          padding: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#6b7280", font: { size: 11, weight: "500" } },
        },
        y: {
          display: false,
          min: 0,
          max: 16,
        },
      },
    }),
    []
  );

  if (activity.loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-sm">Loading live dashboard...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              stats.online ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          Live Dashboard
        </h3>
        <Link to="/live" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          View Full Dashboard →
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Bot Activity
            </p>
            <p className="text-sm text-gray-500">
              {stats.online ? `${stats.activeBots} bots active` : "Demo mode - based on recent activity"}
            </p>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
              stats.online ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
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
          title="Total Trades"
          value={formatNumber(stats.totalTrades)}
          valueClassName="text-purple-600"
        />
        <StatMiniCard
          title="Win Rate"
          value={`${safeNumber(stats.winRate).toFixed(1)}%`}
          valueClassName="text-emerald-600"
          subtext={`${stats.wins}W / ${stats.losses}L`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.botStatuses.length > 0 ? (
          stats.botStatuses.map((bot) => (
            <div
              key={bot.label}
              className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                bot.live ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{getBotIcon(bot.label)}</span>
                <span className={bot.live ? "font-semibold text-gray-800" : "text-gray-500"}>
                  {bot.label}
                </span>
              </div>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  bot.live ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`}
              />
            </div>
          ))
        ) : (
          <div className="col-span-2 py-2 text-center text-xs text-gray-400">
            No bot data available
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Home() {
  const { user } = useAuth();
  const promo = usePromoStatus();
  const promoClaim = usePromoClaim();

  const [activity, setActivity] = useState({
    trades: [],
    stats: {
      currentStatus: "Loading...",
      activeBots: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      online: false,
      botStatuses: [],
    },
    loading: true,
    error: null,
  });

  const [isMuted, setIsMuted] = useState(true);
  const [email, setEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState("starter");
  const [showForm, setShowForm] = useState(false);
  const videoId = "x6Dvj1ALs-w";

  const userReferralLink = useMemo(() => {
    if (!user?.referral_code) return null;
    return `${window.location.origin}/signup?ref=${user.referral_code}`;
  }, [user]);

  const fetchActivity = useCallback(async () => {
    try {
      const statsRes = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });

      if (statsRes.data?.success) {
        const data = statsRes.data.data || {};
        const trades = Array.isArray(data?.recent_trades) ? data.recent_trades : [];
        const summary = data?.summary || {};

        const mainBots = ["okx", "futures", "stocks", "sniper"];
        const botStatuses = Array.isArray(data?.bots)
          ? data.bots
              .filter((bot) => mainBots.includes(normalizeBotName(bot?.name)))
              .map((bot) => ({
                label: getBotDisplayName(bot?.name),
                live:
                  safeNumber(bot?.total_trades) > 0 ||
                  safeNumber(bot?.open_positions) > 0,
                details: bot,
              }))
          : [];

        setActivity({
          trades: trades.slice(0, 20),
          stats: {
            currentStatus: botStatuses.some((b) => b.live) ? "Live" : "Demo",
            activeBots: botStatuses.filter((b) => b.live).length,
            totalTrades: safeNumber(summary?.total_trades, trades.length),
            wins: safeNumber(summary?.wins, 0),
            losses: safeNumber(summary?.losses, 0),
            winRate: safeNumber(summary?.win_rate, 0),
            online: botStatuses.some((b) => b.live),
            botStatuses,
          },
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      setActivity((prev) => ({
        ...prev,
        loading: false,
        error: "Could not refresh live stats",
      }));
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white text-gray-900">
      {/* TOP BAR MOVED UNDER TAGLINE AREA, so removed fixed top-right bar */}

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {/* PROMO */}
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-8 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            🎁 Early Bird Promotion
          </h2>
          <p className="mt-3 text-lg opacity-95">
            Start with paper trading first. Move to live automated trading when you are ready.
          </p>
        </div>

        {/* HEADLINE */}
        <div className="mt-14 text-center">
          <h1 className="mx-auto max-w-6xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-4xl font-extrabold text-transparent sm:text-6xl lg:text-7xl">
            Automated Trading for Stock and Crypto
          </h1>

          <p className="mx-auto mt-8 max-w-4xl text-xl leading-relaxed text-gray-700 sm:text-2xl">
            <span className="font-bold text-emerald-600">
              Take profits automatically and reducing loses trading stock and crypto.
            </span>
          </p>

          {/* TOP LINE MOVED UNDER TAGLINE */}
          <p className="mx-auto mt-4 max-w-4xl text-lg text-gray-600">
            Start with paper trading (fake money real auto trading) move to live auto trading.
            Cancel any time.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Pill color="emerald">✅ Beginner Friendly</Pill>
            <Pill color="purple">📈 Stocks + Crypto</Pill>
            <Pill color="amber">💸 Cancel Any Time</Pill>
            <Pill color="default">🤖 AI Automation</Pill>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/pricing"
              className="rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white shadow-xl transition hover:bg-emerald-500"
            >
              Start Now →
            </Link>

            <Link
              to="/trade-demo"
              className="rounded-full border border-gray-300 bg-white px-10 py-4 text-lg font-bold text-gray-800 hover:bg-gray-50"
            >
              Try Demo →
            </Link>
          </div>
        </div>

        {/* VIDEO */}
        <div className="relative mx-auto mt-16 max-w-6xl overflow-hidden rounded-3xl bg-black shadow-2xl">
          <div className="relative pt-[56.25%]">
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&mute=${
                isMuted ? 1 : 0
              }&controls=1&modestbranding=1&rel=0&playsinline=1&playlist=${videoId}`}
              title="IMALI Trading Demo"
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="absolute bottom-6 right-6 rounded-full bg-black/70 px-4 py-3 text-white backdrop-blur-sm"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900">
            Start in 3 Easy Steps
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Built for beginners. Start with fake money first, then switch to live trading when ready.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <StepCard
            num="1"
            title="Connect Accounts"
            text="Connect your stock broker and crypto wallet: Alpaca, OKX, and MetaMask."
          />
          <StepCard
            num="2"
            title="Select a Strategy"
            text="Choose the trading strategy that fits your goals and comfort level."
          />
          <StepCard
            num="3"
            title="Begin Trading"
            text="Start with paper trading, then move to live automated trading when you are ready."
          />
        </div>
      </section>

      {/* PROMO + CLAIM FORM */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <Card className="p-6 shadow-xl sm:p-8">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="text-3xl">🎁</span>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Claim Your Promotion</h3>
              <p className="text-sm text-gray-500">
                Limited spots available for new users.
              </p>
            </div>
          </div>

          <div className="mb-5 space-y-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <FeatureRow
              icon="✅"
              label={`Only ${promo.feePercent}% fee on profits over ${promo.thresholdPercent}%`}
            />
            <FeatureRow icon="✅" label={`Locked in for ${promo.durationDays} days`} />
            <FeatureRow icon="✅" label="Start with paper trading, then go live when ready" />
            <FeatureRow icon="✅" label="Cancel any time" />
          </div>

          <PromoMeter promo={promo} />

          {!showForm && !promoClaim.state.success && promo.active && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-4 text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500"
            >
              🎉 Claim My Spot Now
            </button>
          )}

          {showForm && !promoClaim.state.success && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await promoClaim.claim(email, selectedTier);
                if (ok) setShowForm(false);
              }}
              className="mt-5 space-y-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                autoFocus
              />

              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="starter">Starter - Free</option>
                <option value="pro">Pro - $19/mo</option>
                <option value="elite">Elite - $49/mo</option>
                <option value="stock">DeFi - $99/mo</option>
                <option value="bundle">Bundle - $199/mo</option>
              </select>

              {promoClaim.state.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  ⚠️ {promoClaim.state.error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={promoClaim.state.loading}
                  className="flex-1 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-500"
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
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="mb-2 text-3xl">🎉</div>
              <p className="text-lg font-bold text-emerald-700">You're in!</p>
              <p className="mt-1 text-sm text-gray-600">
                Check your email, then{" "}
                <Link to={`/signup?tier=${selectedTier}`} className="text-emerald-600 underline">
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* LIVE DASHBOARD + REFERRAL */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
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

        {/* REFERRAL LINK */}
        {userReferralLink && (
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Your Referral Link
                  </p>
                  <h3 className="text-lg font-bold text-gray-900">
                    Invite friends and earn rewards
                  </h3>
                  <code className="mt-2 block break-all text-xs text-emerald-600">
                    {userReferralLink}
                  </code>
                </div>

                <Link
                  to="/referrals"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-500"
                >
                  <FaShareAlt className="mr-2" /> Go to Referral Hub →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LiveActivityWidget activity={activity} />

          <Card className="p-6">
            <h3 className="mb-3 text-lg font-bold text-gray-900">Your Trading Bots</h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose a plan, connect your accounts, and let IMALI help automate stock and crypto trading with a simpler beginner-friendly experience.
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {activity.stats.botStatuses.length > 0 ? (
                activity.stats.botStatuses.map((bot) => (
                  <div
                    key={bot.label}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center"
                  >
                    <span className="mb-2 block text-3xl">{getBotIcon(bot.label)}</span>
                    <p className="text-xs font-semibold text-gray-700">{bot.label}</p>
                    {bot.live && (
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <span className="mb-2 block text-3xl">📊</span>
                    <p className="text-xs font-semibold text-gray-700">Futures Bot</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <span className="mb-2 block text-3xl">📈</span>
                    <p className="text-xs font-semibold text-gray-700">Stock Bot</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <span className="mb-2 block text-3xl">🎯</span>
                    <p className="text-xs font-semibold text-gray-700">Sniper Bot</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <span className="mb-2 block text-3xl">🔷</span>
                    <p className="text-xs font-semibold text-gray-700">OKX Spot</p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800">Referral rewards</h4>
              <p className="mt-1 text-sm text-gray-700">
                Invite new users, track your network, and earn rewards as the IMALI ecosystem grows.
              </p>
              <Link
                to="/referrals"
                className="mt-3 inline-block text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                View your referral dashboard →
              </Link>
            </div>

            <div className="mt-5 text-center">
              <Link
                to="/trade-demo"
                className="inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                🎮 Try the interactive demo →
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-gradient-to-r from-emerald-600 to-cyan-600 py-20 text-center text-white">
        <h2 className="text-4xl font-extrabold">Ready to Begin?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-xl opacity-95">
          Start with paper trading. Move to live automated trading when ready. Cancel any time.
        </p>

        <Link
          to="/pricing"
          className="mt-8 inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-emerald-700 shadow-xl"
        >
          Get Started →
        </Link>
      </section>
    </div>
  );
}