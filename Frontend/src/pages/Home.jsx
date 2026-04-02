import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
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

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatCurrency = (value) => {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (value) => {
  return safeNumber(value).toLocaleString();
};

const timeAgo = (timestamp) => {
  if (!timestamp) return "";
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  } catch {
    return "";
  }
};

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

const normalizeBotType = (trade) => {
  const raw = (trade?.bot || trade?.source || trade?.bot_name || "").toLowerCase();
  if (raw.includes("futures") || raw.includes("perp")) return "futures";
  if (raw.includes("stock") || raw.includes("alpaca")) return "stocks";
  if (raw.includes("sniper") || raw.includes("dex") || raw.includes("uniswap")) return "sniper";
  if (raw.includes("okx") || raw.includes("spot") || raw.includes("crypto")) return "okx";
  return raw || "unknown";
};

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];
  return trades.slice(0, 7).reverse().map((trade, index) => {
    const usd = trade?.pnl_usd ?? trade?.pnl ?? null;
    if (usd !== null && Number.isFinite(Number(usd))) {
      return Math.max(2, Math.min(16, Math.abs(Number(usd)) / 25 + 3));
    }
    return index + 4;
  });
}

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
    {children}
  </div>
);

const Pill = ({ children, color = "indigo" }) => {
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
};

const FeatureRow = ({ icon, label }) => (
  <div className="flex items-start gap-2 text-sm text-gray-700">
    <span className="mt-0.5 flex-shrink-0 text-emerald-600">{icon}</span>
    <span className="leading-snug">{label}</span>
  </div>
);

const StatMiniCard = ({ title, value, valueClassName = "text-gray-900", subtext }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
    <div className={`text-lg font-bold ${valueClassName}`}>{value}</div>
    <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">{title}</div>
    {subtext && <div className="text-[9px] text-gray-400 mt-0.5">{subtext}</div>}
  </div>
);

function PromoMeter({ promo }) {
  const pct = promo.limit > 0 ? (promo.claimed / promo.limit) * 100 : 0;
  const urgency =
    promo.spotsLeft <= 10 ? "text-red-600" : promo.spotsLeft <= 25 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-gray-500">
          {promo.loading ? "Loading..." : `${promo.claimed} of ${promo.limit} spots claimed`}
        </span>
        <span className={`font-bold ${urgency}`}>
          {promo.loading ? "…" : `${promo.spotsLeft} left!`}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!promo.loading && (
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-500">
            Only {promo.feePercent}% fee on profits over {promo.thresholdPercent}% for {promo.durationDays} days
          </p>
          {promo.userCount > 0 && (
            <p className="text-[9px] text-gray-400">📊 {promo.userCount} total users signed up</p>
          )}
        </div>
      )}
    </div>
  );
}

const LiveTicker = () => {
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
          ticks: { color: "#9ca3af", font: { size: 10 } },
        },
        y: { display: false, grid: { color: "rgba(229,231,235,0.5)" } },
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
        <Link to="/live" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
          Full Dashboard →
        </Link>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Bot Activity
            </p>
            <p className="text-sm text-gray-500">
              {stats.online ? `${stats.activeBots} bots active` : "Demo mode - data from recent activity"}
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
        <StatMiniCard title="Total Trades" value={formatNumber(stats.totalTrades)} valueClassName="text-purple-600" />
        <StatMiniCard title="Win Rate" value={`${safeNumber(stats.winRate).toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${stats.wins}W / ${stats.losses}L`} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.botStatuses.length > 0 ? (
          stats.botStatuses.map((bot) => (
            <div
              key={bot.label}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-xs ${
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
  useAuth(); // keep auth subscription active for future personalization
  const {
    isConnected,
    liveStats,
    announcements,
    trades: socketTrades,
    botStatuses: socketBotStatuses,
    subscribeToTrades,
    subscribeToPnl,
    subscribeToAnnouncements,
    subscribeToLeaderboard,
    subscribeToSystemMetrics,
  } = useSocket();

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
  const [showForm, setShowForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState("starter");
  const videoId = "x6Dvj1ALs-w";

  const fetchActivity = useCallback(async () => {
    try {
      const statsRes = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });
      if (statsRes.data?.success) {
        const data = statsRes.data.data || {};
        const trades = Array.isArray(data?.recent_trades) ? data.recent_trades : [];
        const summary = data?.summary || {};
        const botStatuses = Array.isArray(data?.bots)
          ? data.bots.map((bot) => ({
              label: getBotDisplayName(bot?.name),
              live: safeNumber(bot?.total_trades) > 0 || safeNumber(bot?.open_positions) > 0,
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

  useEffect(() => {
    if (!isConnected) return;
    subscribeToTrades?.();
    subscribeToPnl?.();
    subscribeToAnnouncements?.();
    subscribeToLeaderboard?.();
    subscribeToSystemMetrics?.();
  }, [
    isConnected,
    subscribeToTrades,
    subscribeToPnl,
    subscribeToAnnouncements,
    subscribeToLeaderboard,
    subscribeToSystemMetrics,
  ]);

  useEffect(() => {
    const mappedStatuses = Array.isArray(socketBotStatuses)
      ? socketBotStatuses.map((bot) => ({
          label: getBotDisplayName(bot?.name || bot?.label),
          live: bot?.live ?? bot?.is_active ?? bot?.online ?? safeNumber(bot?.total_trades) > 0,
          details: bot,
        }))
      : [];

    const hasLiveData =
      (Array.isArray(socketTrades) && socketTrades.length > 0) ||
      (liveStats && Object.values(liveStats).some((v) => Number(v) > 0)) ||
      mappedStatuses.length > 0;

    if (!hasLiveData) return;

    setActivity((prev) => ({
      ...prev,
      trades: Array.isArray(socketTrades) && socketTrades.length > 0 ? socketTrades.slice(0, 20) : prev.trades,
      stats: {
        ...prev.stats,
        currentStatus: isConnected ? "Live" : prev.stats.currentStatus,
        activeBots: safeNumber(liveStats?.activeBots, mappedStatuses.filter((b) => b.live).length),
        totalTrades: safeNumber(liveStats?.totalTrades, prev.stats.totalTrades),
        wins: safeNumber(liveStats?.wins, prev.stats.wins),
        losses: safeNumber(liveStats?.losses, prev.stats.losses),
        winRate: safeNumber(liveStats?.winRate, prev.stats.winRate),
        online: !!isConnected,
        botStatuses: mappedStatuses.length > 0 ? mappedStatuses : prev.stats.botStatuses,
      },
      loading: false,
      error: null,
    }));
  }, [socketTrades, liveStats, socketBotStatuses, isConnected]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      <div className="fixed right-4 top-0 z-50 mt-2 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs shadow-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
          }`}
        />
        <span className="text-gray-600">{isConnected ? "Live" : "Updates every 30s"}</span>
      </div>

      {announcements && announcements.length > 0 && (
        <div className="bg-indigo-600 px-4 py-2 text-center text-sm text-white animate-pulse">
          📢 {announcements[0]?.title}: {announcements[0]?.content}
        </div>
      )}

      <div className="relative w-full bg-black">
        <div className="relative pt-[56.25%]">
          <iframe
            className="absolute left-0 top-0 h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&playsinline=1&playlist=${videoId}`}
            title="IMALI Trading AI Demo"
            frameBorder="0"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <button
          onClick={() => setIsMuted((prev) => !prev)}
          className="absolute bottom-4 right-4 z-10 rounded-full bg-black/70 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/90"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      <section className="mx-auto max-w-3xl px-3 py-10 sm:px-4 sm:py-12">
        <Card className="p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="flex-shrink-0 text-3xl">🎁</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">Early Bird Special</h3>
              <p className="text-sm text-gray-500">
                Same live promo data as Pricing
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <FeatureRow icon="✅" label={`Only ${promo.feePercent}% fee on profits over ${promo.thresholdPercent}%`} />
            <FeatureRow icon="✅" label={`Locked in for ${promo.durationDays} days`} />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow icon="✅" label="Referral program available for users who invite others" />
          </div>

          <PromoMeter promo={promo} />

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
                const ok = await promoClaim.claim(email, selectedTier);
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
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="starter">Starter - Free</option>
                <option value="pro">Pro - $19/mo</option>
                <option value="elite">Elite - $49/mo</option>
                <option value="stock">DeFi - $99/mo</option>
                <option value="bundle">Bundle - $199/mo</option>
              </select>

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
                <Link to={`/signup?tier=${selectedTier}`} className="text-emerald-600 underline">
                  create your account
                </Link>{" "}
                to get started.
              </p>
            </div>
          )}
        </Card>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
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

          <div className="mx-auto mb-8 max-w-3xl">
            <Link to="/pricing">
              <div className="cursor-pointer rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-4 text-left shadow-sm transition-shadow hover:shadow-md sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                      View Our Pricing Plans
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                      Same live promo data as this page
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-600">
                      Pricing and Home now read the same promo source instead of separate counters.
                    </p>
                  </div>
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-purple-500 px-5 py-3 font-bold text-white transition-all hover:bg-purple-400">
                    View Pricing →
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center">
            <h1 className="font-extrabold leading-tight">
              <span className="mx-auto block max-w-5xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-center text-3xl text-transparent sm:text-4xl md:text-5xl lg:text-7xl">
                Automated Trading for Stock and Crypto
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-2 text-base leading-relaxed text-gray-600 sm:mt-6 sm:text-lg md:text-xl">
              Built to be simple for new users and powerful enough to grow with you. Follow live bot activity, recent trades, and performance in one clean dashboard.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 px-2 sm:mt-6 sm:gap-3">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="amber">🎁 Live promo spots</Pill>
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
                to="/trade-demo"
                className="rounded-full border border-gray-200 bg-white px-8 py-4 text-center font-bold text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Try Demo Mode →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-2 mx-auto mb-10 max-w-6xl px-3 sm:mb-12 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveActivityWidget activity={activity} />
          <Card className="p-5">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Your Trading Bots</h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose a plan, connect your accounts, and let IMALI handle stock and crypto automation with a simpler user experience.
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <span className="mb-2 block text-3xl">📊</span>
                <p className="text-xs font-semibold text-gray-700">Futures Bot</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <span className="mb-2 block text-3xl">📈</span>
                <p className="text-xs font-semibold text-gray-700">Stock Bot</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <span className="mb-2 block text-3xl">🎯</span>
                <p className="text-xs font-semibold text-gray-700">Sniper Bot</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <span className="mb-2 block text-3xl">🔷</span>
                <p className="text-xs font-semibold text-gray-700">OKX Spot</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-800">Partner perk: referral rewards</h4>
              <p className="mt-1 text-sm text-gray-700">
                Invite new users, track your network, and earn rewards as the IMALI ecosystem grows.
              </p>
            </div>
            <div className="mt-4 text-center">
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
    </div>
  );
}
