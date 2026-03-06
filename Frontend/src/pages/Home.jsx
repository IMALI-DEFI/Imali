// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

/* ============================================================
   CONFIG
============================================================ */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://api.imali-defi.com";

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

/* ============================================================
   HELPERS (shared)
============================================================ */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Given the raw live-stats payload, count open positions across all bots.
 * Each bot stores positions as an array OR as a plain number.
 */
function countPositions(data = {}) {
  const asCount = (val) => {
    if (Array.isArray(val)) return val.length;
    return safeNumber(val, 0);
  };

  return (
    asCount(data?.futures?.positions) +
    asCount(data?.stocks?.positions)  +
    asCount(data?.okx?.positions)     +
    asCount(data?.dex?.positions)
  );
}

/**
 * Determine which bots are online from the payload.
 * A bot is "online" if its key exists and is a non-null object.
 */
function getOnlineBots(data = {}) {
  const candidates = [
    { key: "futures", label: "Futures" },
    { key: "stocks",  label: "Stocks"  },
    { key: "sniper",  label: "Sniper"  },
    { key: "okx",     label: "OKX"     },
    { key: "dex",     label: "DEX"     },
  ];

  return candidates
    .filter(({ key }) => {
      const v = data[key];
      return v !== null && v !== undefined && typeof v === "object";
    })
    .map(({ label }) => label);
}

/**
 * Collect the most recent trades from all available sources in the payload.
 */
function collectRecentTrades(data = {}, limit = 5) {
  const combined = [
    ...normalizeArray(data?.recent_trades),
    ...normalizeArray(data?.futures?.trades),
    ...normalizeArray(data?.stocks?.trades),
    ...normalizeArray(data?.okx?.trades),
    ...normalizeArray(data?.dex?.trades),
  ];

  // deduplicate by id or fallback composite key
  const seen = new Set();
  const unique = [];

  for (const t of combined) {
    const key = t?.id || [t?.symbol, t?.side, t?.created_at || t?.timestamp, t?.price].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(t);
    }
  }

  // sort newest first
  return unique
    .sort((a, b) => {
      const tA = new Date(a?.created_at || a?.timestamp || 0).getTime();
      const tB = new Date(b?.created_at || b?.timestamp || 0).getTime();
      return tB - tA;
    })
    .slice(0, limit);
}

/**
 * Collect sniper / DEX discoveries from the payload.
 */
function collectDiscoveries(data = {}, limit = 3) {
  const combined = [
    ...normalizeArray(data?.discoveries),
    ...normalizeArray(data?.sniper?.discoveries),
    ...normalizeArray(data?.dex?.discoveries),
  ];

  const seen  = new Set();
  const unique = [];

  for (const d of combined) {
    const key = d?.pair || d?.address || d?.token || JSON.stringify(d);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(d);
    }
  }

  return unique.slice(0, limit);
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
        const res = await axios.get(`${API_BASE}/api/promo/status`, { timeout: 6000 });
        const limit   = safeNumber(res.data?.limit,   50);
        const claimed = safeNumber(res.data?.claimed,  0);

        if (!mounted) return;

        const next = {
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          active:    claimed < limit,
          loading:   false,
          error:     null,
        };

        setState(next);
        localStorage.setItem(
          "imali_promo_cache",
          JSON.stringify({ limit, claimed, ts: Date.now() })
        );
      } catch {
        const cached = JSON.parse(localStorage.getItem("imali_promo_cache") || "{}");

        if (mounted) {
          if (cached.limit != null) {
            setState({
              limit:     cached.limit,
              claimed:   cached.claimed,
              spotsLeft: Math.max(0, cached.limit - cached.claimed),
              active:    cached.claimed < cached.limit,
              loading:   false,
              error:     "Using cached data",
            });
          } else {
            setState(prev => ({ ...prev, loading: false, error: "Promo unavailable" }));
          }
        }
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return state;
}

/* ---------------------------------------- */

function usePromoClaim() {
  const [state, setState] = useState({
    loading: false,
    success: false,
    error:   null,
    data:    null,
  });

  const claim = async (email) => {
    if (!email) return false;
    setState({ loading: true, success: false, error: null, data: null });

    try {
      const res = await axios.post(
        `${API_BASE}/api/promo/claim`,
        { email, tier: "starter" },
        { timeout: 8000 }
      );
      setState({ loading: false, success: true, error: null, data: res.data });
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || "Spot already taken or promo full";
      setState({ loading: false, success: false, error: msg, data: null });
      return false;
    }
  };

  const reset = () => setState({ loading: false, success: false, error: null, data: null });

  return { state, claim, reset };
}

/* ---------------------------------------- */

function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch_ = async () => {
      try {
        const res  = await axios.get(`${API_BASE}/api/announcements`, { timeout: 5000 });
        const data = res.data?.announcements || res.data || [];
        if (mounted) {
          setAnnouncements(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch {
        if (mounted) { setAnnouncements([]); setLoading(false); }
      }
    };

    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return { announcements, loading };
}

/* ---------------------------------------- */

function useLiveActivity() {
  const [activity, setActivity] = useState({
    trades:      [],
    discoveries: [],
    stats: {
      activePositions: 0,
      activeBots:      0,
      online:          false,
      bots:            [],
    },
    loading: true,
    error:   null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchActivity = async () => {
      try {
        const response = await axios.get(LIVE_STATS_URL, { timeout: 8000 });
        if (!mounted) return;

        const data = response.data || {};

        // ── bot detection ──────────────────────────────────────────
        const onlineBots      = getOnlineBots(data);
        const activePositions = countPositions(data);
        const recentTrades    = collectRecentTrades(data, 5);
        const discoveries     = collectDiscoveries(data, 3);

        setActivity({
          trades:      recentTrades,
          discoveries,
          stats: {
            activePositions,
            activeBots: onlineBots.length,
            online:     onlineBots.length > 0,
            bots:       onlineBots,
          },
          loading: false,
          error:   null,
        });
      } catch (err) {
        if (!mounted) return;
        // keep stale data, just surface the error message
        setActivity(prev => ({
          ...prev,
          loading: false,
          error:   "Live data temporarily unavailable",
        }));
      }
    };

    fetchActivity();
    const id = setInterval(fetchActivity, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return activity;
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function Pill({ children, color = "indigo" }) {
  const classes = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    indigo:  "bg-indigo-500/20  text-indigo-300  border-indigo-500/30",
    purple:  "bg-purple-500/20  text-purple-300  border-purple-500/30",
    amber:   "bg-amber-500/20   text-amber-300   border-amber-500/30",
    red:     "bg-red-500/20     text-red-300     border-red-500/30",
  };

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-[11px] sm:text-xs
        font-bold border ${classes[color] ?? classes.indigo}`}
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
        <h3 className="font-bold text-base sm:text-lg">{emoji} {title}</h3>
        <p className="text-white/60 text-sm mt-1 leading-relaxed">{description}</p>
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

/* ============================================================
   ANNOUNCEMENT BANNER
============================================================ */

function AnnouncementBanner({ announcements }) {
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (announcements.length <= 1) return;

    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % announcements.length);
        setVisible(true);
      }, 300);
    }, 5000);

    return () => clearInterval(id);
  }, [announcements.length]);

  if (!announcements?.length) return null;

  const a  = announcements[idx];
  const bg = {
    high:   "bg-red-600/20 border-red-500/30",
    medium: "bg-amber-600/20 border-amber-500/30",
    low:    "bg-indigo-600/20 border-indigo-500/30",
  }[a?.priority ?? "low"] ?? "bg-indigo-600/20 border-indigo-500/30";

  return (
    <div className={`w-full mb-6 rounded-xl border p-3 sm:p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl sm:text-2xl flex-shrink-0">{a?.emoji || "📢"}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm sm:text-base mb-1">{a?.title || "Announcement"}</h4>
          <p className="text-xs sm:text-sm text-white/80">{a?.content || a?.message}</p>
        </div>
        {announcements.length > 1 && (
          <span className="text-xs text-white/40 flex-shrink-0">
            {idx + 1}/{announcements.length}
          </span>
        )}
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
      const diffMs   = Date.now() - new Date(ts).getTime();
      const diffMins = Math.floor(diffMs / 60_000);
      if (diffMins < 1)    return "just now";
      if (diffMins < 60)   return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / 1440)}d ago`;
    } catch { return ""; }
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

  const { trades, discoveries, stats } = activity;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              stats.online ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          />
          Live Trading Activity
        </h3>
        <Link
          to="/live"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          <span>👁️</span> Full Dashboard
        </Link>
      </div>

      {/* counters */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-400">{stats.activeBots}</div>
          <div className="text-[10px] text-white/40">Active Bots</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-indigo-400">{stats.activePositions}</div>
          <div className="text-[10px] text-white/40">Positions</div>
        </div>
      </div>

      {/* online bot pills */}
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
        <div className="text-center py-3 text-amber-400 text-xs">⚠️ {activity.error}</div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {/* trades */}
          {trades.length > 0 ? (
            trades.map((trade, i) => {
              const side = String(trade?.side || "buy").toLowerCase();
              const isBuy =
                side === "buy" || side === "long";

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
                    {trade?.bot && (
                      <span className="text-[10px] text-white/30 hidden sm:inline truncate">
                        {trade.bot}
                      </span>
                    )}
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

          {/* discoveries divider */}
          {discoveries.length > 0 && (
            <>
              <div className="border-t border-white/10 my-2" />
              {discoveries.map((d, i) => (
                <div
                  key={d?.pair || d?.address || i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-purple-500/5 text-xs"
                >
                  <span>🦄</span>
                  <span className="text-white/60 truncate">
                    New on {d?.chain || "unknown chain"}
                  </span>
                  <span
                    className={`ml-auto text-[10px] shrink-0 ${
                      safeNumber(d?.ai_score ?? d?.score, 0) >= 0.7
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {safeNumber(d?.ai_score ?? d?.score, 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   LIVE TICKER
============================================================ */

const TICKER_MESSAGES = [
  "🟢 Alex from NY just earned +\$47.20 on BTC",
  "🟢 Sarah started her first bot today!",
  "🟢 James hit Gold trader level 🥇",
  "🟢 Maria earned +\$124.50 on AAPL",
  "🟢 New user from London joined 🇬🇧",
  "🟢 Kevin's bot made 12 winning trades today",
  "🟢 Lisa upgraded to Pro tier ⚡",
  "🟢 Ahmed earned +\$89.30 on ETH",
  "🟢 Bot confidence hit 92% today 🤖",
  "🟢 Emma claimed a promo spot!",
];

function LiveTicker() {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % TICKER_MESSAGES.length);
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

/* ============================================================
   PROMO METER
============================================================ */

function PromoMeter({ claimed, limit, spotsLeft, loading }) {
  const pct      = limit > 0 ? (claimed / limit) * 100 : 0;
  const urgency  = spotsLeft <= 10 ? "text-red-400" : spotsLeft <= 25 ? "text-yellow-400" : "text-emerald-400";
  const barColor = spotsLeft <= 10
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

      {spotsLeft <= 10 && spotsLeft > 0 && (
        <p className="text-xs text-red-400 animate-pulse font-medium">
          ⚡ Almost full — grab your spot before it's gone!
        </p>
      )}
    </div>
  );
}

/* ============================================================
   HOME PAGE
============================================================ */

export default function Home() {
  const navigate = useNavigate();

  const promo       = usePromoStatus();
  const promoClaim  = usePromoClaim();
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const activity    = useLiveActivity();

  const [email, setEmail]       = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white overflow-x-hidden">

      {/* Announcements */}
      {!announcementsLoading && announcements.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <AnnouncementBanner announcements={announcements} />
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] sm:opacity-10 pointer-events-none select-none">
          <img
            src={tradeLoss}
            alt=""
            className="absolute left-1/2 top-8 sm:top-16 w-[95vw] sm:w-[80vw] max-w-[700px] -translate-x-1/2 -rotate-2"
            draggable="false"
          />
          <img
            src={tradeWin}
            alt=""
            className="absolute left-1/2 top-[35%] sm:top-[40%] w-[95vw] sm:w-[80vw] max-w-[700px] -translate-x-1/2 rotate-2"
            draggable="false"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16">
          <div className="flex justify-between items-center mb-6">
            <LiveTicker />
            <Link
              to="/live"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs sm:text-sm font-medium transition-all group"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>LIVE DASHBOARD</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
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
              Our AI bot buys and sells <b>stocks &amp; crypto</b> for you — automatically.
              You don't need to know anything about trading.{" "}
              <span className="text-emerald-400 font-medium">
                Just press start and watch it work.
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-5 sm:mt-6 px-2">
              <Pill color="emerald">✅ No experience needed</Pill>
              <Pill color="indigo">🤖 Fully automated</Pill>
              <Pill color="purple">💰 Only pay when you profit</Pill>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats + Live Activity ── */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 -mt-2 sm:-mt-4 mb-10 sm:mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* stat cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-emerald-400">
                \$3.28M
              </div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">Total Profits Earned</div>
              <div className="text-[11px] sm:text-xs text-emerald-400/60 mt-1">📈 and growing</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-indigo-400">
                24,189
              </div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">Happy Traders</div>
              <div className="text-[11px] sm:text-xs text-indigo-400/60 mt-1">👥 join them today</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-purple-400">
                78%
              </div>
              <div className="text-xs sm:text-sm text-white/50 mt-1">Average Win Rate</div>
              <div className="text-[11px] sm:text-xs text-purple-400/60 mt-1">🎯 that's really good</div>
            </div>
          </div>

          {/* live widget */}
          <div className="lg:col-span-1">
            <LiveActivityWidget activity={activity} />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">How Does It Work? 🤔</h2>
          <p className="text-white/60 mt-2 sm:mt-3 max-w-xl mx-auto text-sm sm:text-base px-2">
            It's as easy as 1-2-3. Seriously — even if you've never traded before.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
          <StepCard
            number="1" emoji="📝"
            title="Sign Up (takes 2 minutes)"
            description="Create your free account and pick a plan. No trading knowledge required — we handle everything."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
          <StepCard
            number="2" emoji="🔗"
            title="Connect Your Accounts"
            description="Link your OKX (crypto) or Alpaca (stocks) account. We'll walk you through every step with a simple guide."
          />
          <div className="ml-5 sm:ml-6 border-l-2 border-white/10 h-4 sm:h-6" />
          <StepCard
            number="3" emoji="🚀"
            title="Press Start & Relax"
            description="Hit the big green button and our AI bot starts trading for you 24/7. Watch your profits grow on your dashboard!"
          />
        </div>

        <div className="text-center mt-8 sm:mt-10 px-4 sm:px-0">
          <Link
            to="/signup"
            className="inline-block w-full sm:w-auto px-8 py-4 rounded-full font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 sm:hover:scale-105 text-center"
          >
            Let's Go! Create My Account →
          </Link>
        </div>
      </section>

      {/* ── Promo ── */}
      <section className="max-w-3xl mx-auto px-3 sm:px-4 py-10 sm:py-12">
        <GlowCard>
          <div className="flex items-start sm:items-center gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Early Bird Special</h3>
              <p className="text-xs sm:text-sm text-white/60">
                First {promo.limit} users get a{" "}
                <b className="text-emerald-400">special deal</b>
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-3 sm:p-4 mb-4 space-y-2">
            <FeatureRow icon="✅" label="Only 5% fee on profits over 3% (normally 30%)" />
            <FeatureRow icon="✅" label="Locked in for 90 days" />
            <FeatureRow icon="✅" label="Full access to all bot features" />
            <FeatureRow icon="✅" label="Cancel anytime — no risk" />
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
                  onClick={() => { setShowForm(false); promoClaim.reset(); }}
                  className="px-4 sm:px-6 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-white/30 text-center">
                🔒 We'll never spam you. Unsubscribe anytime.
              </p>
            </form>
          )}

          {promoClaim.state.success && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-300 font-bold text-base sm:text-lg">You're in!</p>
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

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            What's Inside Your Dashboard ✨
          </h2>
          <p className="text-white/60 mt-2 sm:mt-3 text-sm sm:text-base">
            Everything you need — all in one place
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: "🤖", title: "AI Trading Bot",       pill: "emerald", plan: "All Plans",  desc: "Our smart bot watches the market 24/7 and makes trades for you. It learns and gets better over time!" },
            { icon: "📊", title: "Live Charts & Stats",  pill: "emerald", plan: "All Plans",  desc: "See your profits, win rate, and trade history in colorful easy-to-read charts. Watch your money grow!" },
            { icon: "🏆", title: "Trader Levels",        pill: "emerald", plan: "All Plans",  desc: "Earn XP with every trade! Level up from Bronze to Legend. Compete and show off your rank." },
            { icon: "📈", title: "Stock Trading",        pill: "indigo",  plan: "Starter+",   desc: "Trade real stocks like Apple, Tesla, and Amazon through Alpaca. The bot picks the best ones!" },
            { icon: "🦄", title: "DEX Trading",          pill: "purple",  plan: "Elite+",     desc: "Trade on decentralized exchanges for even more crypto opportunities. Advanced but powerful!" },
            { icon: "📊", title: "Futures & Leverage",   pill: "purple",  plan: "Elite+",     desc: "Multiply your gains with futures trading. The bot manages risk automatically so you don't have to." },
          ].map(({ icon, title, pill, plan, desc }) => (
            <GlowCard key={title}>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{icon}</div>
              <h3 className="font-bold text-base sm:text-lg">{title}</h3>
              <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">{desc}</p>
              <div className="mt-3">
                <Pill color={pill}>{plan}</Pill>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-10 sm:py-12">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Not Sure Yet? Try It Free! 🎮</h2>
          <p className="text-white/60 mt-2 text-sm sm:text-base">
            Play with our demo — no signup, no risk, just fun
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border border-indigo-500/20 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="text-2xl sm:text-3xl">🔷</span>
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wide text-indigo-300">Crypto Bot</div>
                <h3 className="text-lg sm:text-xl font-bold">Try Crypto Trading</h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-4 leading-relaxed">
              Watch the bot trade Bitcoin, Ethereum, and more. See how it finds the best moments to buy and sell.
            </p>
            <Link
              to="/demo"
              className="block w-full text-center py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-all active:scale-[0.98] sm:hover:scale-[1.02] text-sm sm:text-base"
            >
              🎮 Play Crypto Demo
            </Link>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/20 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <span className="text-2xl sm:text-3xl">📈</span>
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-300">Stock Bot</div>
                <h3 className="text-lg sm:text-xl font-bold">Try Stock Trading</h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-4 leading-relaxed">
              See how the bot picks winning stocks like Apple and Tesla. It's like having a Wall Street pro working for you!
            </p>
            <Link
              to="/demo?venue=stocks"
              className="block w-full text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all active:scale-[0.98] sm:hover:scale-[1.02] text-sm sm:text-base"
            >
              🎮 Play Stock Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">Common Questions 💬</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {[
            {
              q: "Do I need to know how to trade?",
              a: "Nope! The bot does everything. You just press Start and it handles buying, selling, and risk management automatically.",
            },
            {
              q: "How much money do I need to start?",
              a: "You can start with as little as \$50 in your exchange account. The bot works with whatever amount you have.",
            },
            {
              q: "When do I get charged?",
              a: "Only when you make money! We take a small percentage of your profits. If the bot doesn't make money, you don't pay anything.",
            },
            {
              q: "Can I stop anytime?",
              a: "Yes! You can pause or stop the bot with one click. There are no contracts or lock-in periods.",
            },
            {
              q: "Is my money safe?",
              a: "Your money stays in YOUR exchange account (OKX or Alpaca). We never hold your funds. The bot only has permission to trade — never withdraw.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/5 transition-colors text-sm sm:text-base">
                <span className="font-medium pr-4">{item.q}</span>
                <span className="text-white/40 group-open:rotate-45 transition-transform text-lg sm:text-xl flex-shrink-0">+</span>
              </summary>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-white/60 text-xs sm:text-sm leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="text-center py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚀</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Let Your Bot Make Money?
          </h2>
          <p className="text-white/60 mb-6 sm:mb-8 text-base sm:text-lg px-2">
            Join thousands of people who are already earning while they sleep.
            No experience needed. Start in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
            <Link
              to="/signup"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-500/25 transition-all active:scale-95 sm:hover:scale-105 text-center"
            >
              🚀 Create Free Account
            </Link>
            <Link
              to="/dashboard"
              className="px-8 sm:px-12 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all active:scale-95 text-center"
            >
              📊 Go to Dashboard
            </Link>
          </div>
          <p className="text-[11px] sm:text-xs text-white/30 mt-5 sm:mt-6">
            No credit card required • Cancel anytime • Your money stays in your account
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <section className="border-t border-white/10 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-6 text-xs sm:text-sm text-white/40">
          <Link to="/how-it-works"   className="hover:text-white transition-colors py-1">How It Works</Link>
          <Link to="/pricing"        className="hover:text-white transition-colors py-1">Pricing</Link>
          <Link to="/funding-guide"  className="hover:text-white transition-colors py-1">Funding Guide</Link>
          <Link to="/support"        className="hover:text-white transition-colors py-1">Support</Link>
          <Link to="/privacy"        className="hover:text-white transition-colors py-1">Privacy</Link>
          <Link to="/terms"          className="hover:text-white transition-colors py-1">Terms</Link>
          <Link to="/live"           className="text-emerald-400 hover:text-emerald-300 transition-colors py-1">Live</Link>
        </div>
      </section>
    </div>
  );
}
