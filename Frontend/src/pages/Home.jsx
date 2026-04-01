// src/pages/Home.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { usePromoStatus, usePromoClaim } from '../hooks/usePromo';
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

// Register ChartJS
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

// ============================================================
// CONSTANTS
// ============================================================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatCurrency = (value) => {
  const n = safeNumber(value);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value) => {
  const n = safeNumber(value);
  return n.toLocaleString();
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
  if (name === "stocks") return "Stock Bot";
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
  if (raw.includes("stock") || raw.includes("alpaca")) return "stock";
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

// ============================================================
// COMPONENTS
// ============================================================
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
    <span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-bold sm:text-xs ${classes[color] ?? classes.indigo}`}>
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

const PromoMeter = ({ claimed, limit, spotsLeft, loading, feePercent, durationDays, userCount }) => {
  const pct = limit > 0 ? (claimed / limit) * 100 : 0;
  const urgency = spotsLeft <= 10 ? "text-red-600" : spotsLeft <= 25 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-gray-500">{loading ? "Loading..." : `${claimed} of ${limit} spots claimed`}</span>
        <span className={`font-bold ${urgency}`}>{loading ? "…" : `${spotsLeft} left!`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      {!loading && (
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-500">Only {feePercent}% fee on profits over {durationDays} days</p>
          {userCount > 0 && <p className="text-[9px] text-gray-400">📊 {userCount} total users signed up</p>}
        </div>
      )}
    </div>
  );
};

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

// ============================================================
// LIVE ACTIVITY WIDGET
// ============================================================
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
        x: { display: true, grid: { display: false }, ticks: { color: "#9ca3af", font: { size: 10 } } },
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
          <span className={`h-2.5 w-2.5 rounded-full ${stats.online ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          Live Dashboard
        </h3>
        <Link to="/live" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Full Dashboard →</Link>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Bot Activity</p>
            <p className="text-sm text-gray-500">{stats.online ? `${stats.activeBots} bots active` : "Demo mode - data from recent activity"}</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${stats.online ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
            {stats.currentStatus}
          </div>
        </div>
        <div className="h-40"><Line data={chartData} options={chartOptions} /></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatMiniCard title="Total Trades" value={formatNumber(stats.totalTrades)} valueClassName="text-purple-600" />
        <StatMiniCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} valueClassName="text-emerald-600" subtext={`${stats.wins}W / ${stats.losses}L`} />
      </div>

      <div className="mb-4">
        <div className="mb-2 text-[10px] uppercase tracking-wide text-gray-500">Bot Status</div>
        <div className="grid grid-cols-2 gap-2">
          {stats.botStatuses.length > 0 ? (
            stats.botStatuses.map((bot) => (
              <div key={bot.label} className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-xs ${bot.live ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{getBotIcon(bot.label)}</span>
                  <span className={bot.live ? "font-semibold text-gray-800" : "text-gray-500"}>{bot.label}</span>
                </div>
                <span className={`h-1.5 w-1.5 rounded-full ${bot.live ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-gray-400 py-2">No bot data available</div>
          )}
        </div>
      </div>

      {activity.error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 py-3 text-center text-xs text-amber-700">⚠️ {activity.error}</div>
      )}

      <div className="space-y-2">
        <h4 className="mb-1 text-xs font-semibold text-gray-500">Recent Trades</h4>
        {activity.trades.length > 0 ? (
          activity.trades.slice(0, 4).map((trade, i) => {
            const side = String(trade?.side || "buy").toLowerCase();
            const isBuy = side === "buy" || side === "long";
            const pnlValue = trade?.pnl_usd ?? trade?.pnl ?? null;
            const botType = normalizeBotType(trade);
            const botDisplay = getBotDisplayName(botType);

            return (
              <div key={trade?.id || i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm">{getBotIcon(botDisplay)}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-800">{trade?.symbol || "Unknown"}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${isBuy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {side.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-500">{timeAgo(trade?.created_at || trade?.timestamp)}</span>
                    </div>
                  </div>
                </div>
                <div className={`shrink-0 font-semibold ${pnlValue === null || !Number.isFinite(Number(pnlValue)) ? "text-gray-500" : Number(pnlValue) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {pnlValue === null || !Number.isFinite(Number(pnlValue)) ? formatCurrency(trade?.price || 0) : formatCurrency(Number(pnlValue))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-2 text-center text-xs text-gray-400">No recent trades</div>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// MAIN HOME COMPONENT
// ============================================================
export default function Home() {
  const { user } = useAuth();
  const { isConnected, liveStats, announcements, socket } = useSocket();
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
    pnlHistory: [],
    loading: true,
    error: null,
  });
  const [isMuted, setIsMuted] = useState(true);
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState("starter");

  const videoId = "x6Dvj1ALs-w";

  // Listen for live trade updates from WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const unsubscribeTrade = socket.onTrade((trade) => {
      console.log("[Home] Live trade received:", trade);
      setActivity(prev => ({
        ...prev,
        trades: [trade, ...prev.trades].slice(0, 20),
        stats: {
          ...prev.stats,
          totalTrades: prev.stats.totalTrades + 1,
          wins: prev.stats.wins + ((trade.pnl || 0) > 0 ? 1 : 0),
          losses: prev.stats.losses + ((trade.pnl || 0) < 0 ? 1 : 0),
        }
      }));
    });
    
    return () => {
      if (unsubscribeTrade) unsubscribeTrade();
    };
  }, [socket, isConnected]);

  // Fetch initial data via REST (fallback)
  const fetchActivity = useCallback(async () => {
    try {
      const statsRes = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });
      if (statsRes.data?.success) {
        const data = statsRes.data.data;
        const trades = data.recent_trades || [];
        const summary = data.summary || {};
        
        const botStatuses = (data.bots || []).map(bot => ({
          label: getBotDisplayName(bot.name),
          live: (bot.total_trades || 0) > 0,
          details: bot,
        }));
        
        setActivity({
          trades: trades.slice(0, 20),
          stats: {
            currentStatus: botStatuses.some(b => b.live) ? "Live" : "Demo",
            activeBots: botStatuses.filter(b => b.live).length,
            totalTrades: summary.total_trades || trades.length,
            wins: summary.wins || 0,
            losses: summary.losses || 0,
            winRate: summary.win_rate || 0,
            online: botStatuses.some(b => b.live),
            botStatuses,
          },
          pnlHistory: data.daily_pnl || [],
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      setActivity(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* Connection Status Bar */}
      <div className="fixed top-0 right-4 z-50 flex items-center gap-2 text-xs bg-white/90 px-3 py-1 rounded-full shadow-sm mt-2">
        <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-gray-600">{isConnected ? 'Live' : 'Updates every 30s'}</span>
      </div>
      
      {/* Live Announcements Ticker */}
      {announcements && announcements.length > 0 && (
        <div className="bg-indigo-600 text-white py-2 px-4 text-center text-sm animate-pulse">
          📢 {announcements[0]?.title}: {announcements[0]?.content}
        </div>
      )}

      {/* YouTube Video Player */}
      <div className="relative w-full bg-black">
        <div className="relative pt-[56.25%]">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&showinfo=0&playsinline=1&playlist=${videoId}`}
            title="IMALI Trading AI Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-4 right-4 z-10 rounded-full bg-black/70 p-3 text-white backdrop-blur-sm transition-all hover:bg-black/90"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>

      {/* Promo Section */}
      <section className="mx-auto max-w-3xl px-3 py-10 sm:px-4 sm:py-12">
        <Card className="p-5 sm:p-6 shadow-xl">
          <div className="mb-4 flex items-start gap-3 sm:items-center">
            <span className="flex-shrink-0 text-3xl">🎁</span>
            <div>
              <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">Early Bird Special</h3>
              <p className="text-sm text-gray-500">First {promo.limit} users get a <b className="text-emerald-600">special deal</b></p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4">
            <FeatureRow icon="✅" label={`Only ${promo.feePercent}% fee on profits over ${promo.thresholdPercent}% (normally 30%)`} />
            <FeatureRow icon="✅" label={`Locked in for ${promo.durationDays} days`} />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow icon="✅" label="Referral program available for users who invite others" />
          </div>

          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
            loading={promo.loading}
            feePercent={promo.feePercent}
            durationDays={promo.durationDays}
            userCount={promo.userCount}
          />

          {!showForm && !promoClaim.state.success && promo.active && (
            <button onClick={() => setShowForm(true)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-4 text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500">
              🎉 Claim My Spot Now
            </button>
          )}

          {showForm && !promoClaim.state.success && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const ok = await promoClaim.claim(email, selectedTier);
              if (ok) setShowForm(false);
            }} className="mt-4 space-y-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" required autoFocus />
              <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-4 text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="starter">Starter - Free (30% performance fee)</option>
                <option value="pro">Pro - $19/mo + 5% fee</option>
                <option value="elite">Elite - $49/mo + 5% fee</option>
                <option value="stock">DeFi - $99/mo (DEX trading)</option>
                <option value="bundle">Bundle - $199/mo (All bots)</option>
              </select>
              {promoClaim.state.error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">⚠️ {promoClaim.state.error}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={promoClaim.state.loading} className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-500">
                  {promoClaim.state.loading ? "Claiming..." : "✅ Confirm My Spot"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); promoClaim.reset(); }} className="px-6 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="mb-2 text-3xl">🎉</div>
              <p className="text-lg font-bold text-emerald-700">You're in!</p>
              <p className="mt-1 text-sm text-gray-600">Check your email, then <Link to="/signup" className="text-emerald-600 underline">create your account</Link> to get started.</p>
            </div>
          )}
        </Card>
      </section>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 md:pt-24">
          <div className="mb-6 flex items-center justify-between gap-3">
            <LiveTicker />
            <Link to="/live" className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>LIVE DASHBOARD</span>
              <span>→</span>
            </Link>
          </div>

          {/* Pricing Banner */}
          <div className="mx-auto mb-8 max-w-3xl">
            <Link to="/pricing">
              <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-4 text-left shadow-sm hover:shadow-md transition-shadow sm:px-5 cursor-pointer">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-700">View Our Pricing Plans</p>
                    <h3 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">Choose the plan that fits your trading style</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-600">From free starter to full bundle - pick the plan that matches your needs.</p>
                  </div>
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-purple-500 px-5 py-3 font-bold text-white transition-all hover:bg-purple-400">View Pricing →</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Referral Banner */}
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left shadow-sm sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Referral Program Offer</p>
                  <h3 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">Invite friends and earn 20% of their fees in USDC</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-600">Share your referral link, bring in new members, and earn rewards as the IMALI ecosystem grows.</p>
                </div>
                <Link to="/referrals" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-amber-500 px-5 py-3 font-bold text-black transition-all hover:bg-amber-400">View Referral Offer</Link>
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
              Built to be simple for new users and powerful enough to grow with you. Follow live bot activity, recent trades, and performance in one clean dashboard.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 px-2 sm:mt-6 sm:gap-3">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="amber">🎁 Referral rewards available</Pill>
              <Pill color="purple">🦾 AI-powered trading bots</Pill>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/pricing" className="rounded-full bg-emerald-600 px-8 py-4 text-center font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-500">Get Started Now →</Link>
              <Link to="/trade-demo" className="rounded-full border border-gray-200 bg-white px-8 py-4 text-center font-bold text-gray-800 shadow-sm hover:bg-gray-50">Try Demo Mode →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live + Robots Section */}
      <section className="-mt-2 mx-auto mb-10 max-w-6xl px-3 sm:mb-12 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LiveActivityWidget activity={activity} />
          <Card className="p-5">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Your Trading Bots</h3>
            <p className="mb-4 text-sm text-gray-600">Choose a plan, connect your accounts, and let IMALI handle stock and crypto automation with a simpler user experience.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><span className="text-3xl block mb-2">📊</span><p className="text-xs font-semibold text-gray-700">Futures Bot</p></div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><span className="text-3xl block mb-2">📈</span><p className="text-xs font-semibold text-gray-700">Stock Bot</p></div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><span className="text-3xl block mb-2">🎯</span><p className="text-xs font-semibold text-gray-700">Sniper Bot</p></div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center"><span className="text-3xl block mb-2">🔷</span><p className="text-xs font-semibold text-gray-700">OKX Spot</p></div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="font-semibold text-amber-800">Partner perk: referral rewards</h4><p className="mt-1 text-sm text-gray-700">Invite new users, track your network, and earn 20% of their fees in USDC.</p></div>
            <div className="mt-4 text-center"><Link to="/trade-demo" className="inline-block text-sm text-emerald-600 hover:text-emerald-700 font-medium">🎮 Try the interactive demo →</Link></div>
          </Card>
        </div>
      </section>

      {/* Demo Link at Bottom */}
      <section className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Want to see IMALI in action?</h2>
          <p className="mt-3 text-gray-600">Test our trading bots with virtual money before committing to a plan.</p>
          <div className="mt-6"><Link to="/trade-demo" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 px-8 py-4 font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500 transition-all"><span>🎮</span> Launch Demo<span>→</span></Link></div>
          <p className="mt-4 text-xs text-gray-500">No signup required • Practice with $100,000 virtual balance • See real-time trading</p>
        </div>
      </section>
    </div>
  );
}
