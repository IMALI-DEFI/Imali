// src/pages/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI"; // NOTE: adjust path if needed
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ================= NFT TIERS ================= */
const NFT_TIERS = {
  none: { name: "No Membership", color: "border-slate-600", glow: "", perks: ["Standard fees", "Basic strategies"] },
  common: { name: "Common", color: "border-emerald-400", glow: "shadow-emerald-500/40", perks: ["Lower fees", "Priority execution"] },
  rare: { name: "Rare", color: "border-sky-400", glow: "shadow-sky-500/40", perks: ["Even lower fees", "Advanced bots"] },
  epic: { name: "Epic", color: "border-purple-400", glow: "shadow-purple-500/40", perks: ["Best fees", "All bots", "Faster routing"] },
  legendary: { name: "Legendary", color: "border-yellow-400", glow: "shadow-yellow-500/50", perks: ["Lowest fees", "Alpha access", "VIP support"] },
};

/* ================= ACHIEVEMENTS ================= */
const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥" },
  { id: "trades_50", label: "50 Trades", icon: "🏆" },
  { id: "profitable", label: "Profitable Month", icon: "💰" },
  { id: "nft_holder", label: "NFT Holder", icon: "🎟️" },
];

/* ================= HELPERS ================= */
const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

function safeLower(v) {
  return String(v || "").trim().toLowerCase();
}

function isEliteOrBundle(tier) {
  const t = safeLower(tier);
  return t === "elite" || t === "bundle";
}

function planPretty(v) {
  const s = safeLower(v);
  if (!s) return "Starter";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ================= COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [user, setUser] = useState(null);

  // analytics
  const [stats, setStats] = useState({
    total_pnl: 0,
    total_trades: 0,
    win_rate: 0,
    cumulative_pnl: 0,
  });
  const [series, setSeries] = useState([]);
  const [winloss, setWinloss] = useState(null);

  // UI state
  const [period, setPeriod] = useState("30d"); // demo alignment
  const [interval, setInterval] = useState("daily");

  // trading / bot
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [startingBot, setStartingBot] = useState(false);
  const [startingFutures, setStartingFutures] = useState(false);

  // demo-like feed (for TradingOverview)
  const feed = useMemo(() => {
    const wins = Number(winloss?.winning_trades || 0);
    const losses = Number(winloss?.losing_trades || 0);
    const equity = 1000 + Number(stats?.cumulative_pnl || stats?.total_pnl || 0);

    return {
      mode: "live",
      plan: safeLower(user?.tier || "starter"),
      strategy: safeLower(user?.strategy || "ai_weighted"),
      equity,
      pnl: Number(stats?.total_pnl || 0),
      wins,
      losses,
      running: !!tradingEnabled,
      ts: Date.now(),
    };
  }, [user, stats, winloss, tradingEnabled]);

  /* ================= LOAD ME + ANALYTICS ================= */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setErr("");

        const me = await BotAPI.me();
        if (!mounted) return;

        if (!me?.success || !me?.user) {
          nav("/login");
          return;
        }

        setUser(me.user);
        setTradingEnabled(!!me.user?.tradingEnabled);

        // Pull pnl series + winloss so it mirrors demo depth
        const [pnlRes, wlRes] = await Promise.all([
          BotAPI.analyticsPnlSeries({ period, interval, chart_type: "cumulative" }),
          BotAPI.analyticsWinLoss({ period }),
        ]);

        if (!mounted) return;

        setStats(pnlRes?.summary || {});
        setSeries(
          (pnlRes?.series || []).map((p) => ({
            x: p.x,
            y: p.y,
            trades: p.trades,
            interval_pnl: p.interval_pnl,
            cumulative_pnl: p.cumulative_pnl,
          }))
        );

        setWinloss(wlRes?.win_loss || null);
      } catch (e) {
        const status = e?.status || e?.response?.status;
        if (status === 401) {
          nav("/login");
          return;
        }
        setErr(e?.message || "Failed to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav, period, interval]);

  /* ================= CONFIDENCE (same spirit as demo) ================= */
  const confidence = useMemo(() => {
    const win = Number(stats.win_rate || 0);
    const trades = Number(stats.total_trades || 0);
    const pnl = Number(stats.total_pnl || 0);

    let score = 0;
    score += Math.min(40, win * 0.4);
    score += Math.min(30, trades * 0.6);
    score += pnl > 0 ? 10 : 0;
    score += safeLower(user?.tier) !== "starter" ? 10 : 0;
    score += safeLower(user?.strategy) ? 10 : 0;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [stats, user]);

  /* ================= ACHIEVEMENTS ================= */
  const unlockedAchievements = useMemo(() => {
    const list = [];
    if ((stats.total_trades || 0) > 0) list.push("first_trade");
    if ((stats.total_trades || 0) >= 50) list.push("trades_50");
    if ((stats.total_pnl || 0) > 0) list.push("profitable");
    // streak is not currently in backend summary; keep “7-day streak” locked unless you add it later
    if (safeLower(user?.nft_tier || "none") !== "none") list.push("nft_holder");
    return list;
  }, [stats, user]);

  /* ================= ACTIONS ================= */
  const onToggleTrading = async () => {
    try {
      setErr("");
      const next = !tradingEnabled;
      setTradingEnabled(next); // optimistic
      await BotAPI.tradingEnable(next);
    } catch (e) {
      setTradingEnabled((v) => !v); // revert
      setErr(e?.message || "Failed to update trading setting.");
    }
  };

  const onStartBot = async () => {
    try {
      setErr("");
      setStartingBot(true);

      // backend expects { mode } but safely ignores extra fields
      await BotAPI.botStart({
        mode: "live",
        bot_type: "crypto_spot",
        label: "IMALI Live Bot",
      });

      // keep trading enabled on start
      if (!tradingEnabled) {
        setTradingEnabled(true);
        await BotAPI.tradingEnable(true);
      }
    } catch (e) {
      setErr(e?.message || "Failed to start bot.");
    } finally {
      setStartingBot(false);
    }
  };

  const onStartOkxFutures = async () => {
    try {
      setErr("");
      setStartingFutures(true);

      // Your current backend /api/bot/start is generic.
      // We still pass futures metadata so the bot-service (if configured) can route it.
      await BotAPI.botStart({
        mode: "live",
        bot_type: "okx_futures",
        market: "futures",
        exchange: "okx",
        label: "OKX Futures Bot",
      });

      if (!tradingEnabled) {
        setTradingEnabled(true);
        await BotAPI.tradingEnable(true);
      }
    } catch (e) {
      setErr(e?.message || "Failed to start OKX Futures.");
    } finally {
      setStartingFutures(false);
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const tier = safeLower(user?.tier || "starter");
  const canFutures = isEliteOrBundle(tier);

  const nftKey = safeLower(user?.nft_tier || "none");
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;

  const wins = Number(winloss?.winning_trades || 0);
  const losses = Number(winloss?.losing_trades || 0);
  const total = wins + losses;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header (demo-like) */}
      <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Member Dashboard</h1>
          <div className="text-xs text-white/60">
            Real analytics + bot controls. Your demo and dashboard now match.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            title="Choose time range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <select
            className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            title="Choose aggregation"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="hourly">Hourly</option>
          </select>

          <button
            onClick={() => nav("/trade-demo")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
          >
            Open Demo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-10 space-y-4">
        {err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {err}
          </div>
        ) : null}

        {/* Top stats (demo-aligned cards) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Membership" value={planPretty(user?.tier)} sub={`Strategy: ${planPretty(user?.strategy)}`} />
          <Stat label="Account Value" value={usd(feed.equity)} sub="Estimated (base + cumulative)" />
          <Stat
            label="Gain/Loss"
            value={usd(stats.total_pnl)}
            sub={Number(stats.total_pnl || 0) >= 0 ? "You’re up" : "You’re down"}
          />
          <Stat label="Win Rate" value={pct(stats.win_rate)} sub={`${wins}/${total} wins`} />
          <Stat label="Bot Confidence" value={`${confidence}%`} sub={tradingEnabled ? "Execution enabled" : "Execution off"} />
        </div>

        {/* Membership NFT card */}
        <div className={`rounded-2xl border ${nft.color} ${nft.glow} bg-white/5 p-5`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">🧬 Membership NFT — {nft.name}</h2>
              <ul className="mt-2 text-sm text-white/70 list-disc pl-5">
                {nft.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={onToggleTrading}
                className={`px-4 py-2 rounded-xl font-semibold ${
                  tradingEnabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-white/10 hover:bg-white/15 border border-white/10"
                }`}
              >
                {tradingEnabled ? "✅ Trading Enabled" : "Enable Trading"}
              </button>

              <button
                onClick={onStartBot}
                disabled={startingBot}
                className="px-4 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
              >
                {startingBot ? "Starting…" : "Start Live Bot"}
              </button>
            </div>
          </div>
        </div>

        {/* OKX Futures (Elite + Bundle only) */}
        <div className="rounded-2xl bg-white/5 p-5 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">⚡ OKX Futures</h3>
              <div className="text-sm text-white/60">
                Elite + Bundle unlock. Runs higher-risk futures execution through your OKX futures bot flow.
              </div>
            </div>

            {!canFutures ? (
              <button
                onClick={() => nav("/pricing")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
              >
                Upgrade to Elite/Bundle
              </button>
            ) : (
              <button
                onClick={onStartOkxFutures}
                disabled={startingFutures}
                className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
              >
                {startingFutures ? "Starting…" : "Start OKX Futures Bot"}
              </button>
            )}
          </div>

          <div className="mt-3 text-xs text-white/50">
            Note: your current `/api/bot/start` is generic. We pass futures metadata; the bot-service (if configured) can route it.
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <h3 className="font-semibold mb-3">🏆 Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                className={`px-3 py-2 rounded-lg border ${
                  unlockedAchievements.includes(a.id)
                    ? "border-emerald-400 bg-emerald-500/20"
                    : "border-white/10 bg-white/5 opacity-40"
                }`}
              >
                {a.icon} {a.label}
              </div>
            ))}
          </div>
        </div>

        {/* Trading overview (same component used by demo) */}
        <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">📈 Trading Overview</h3>
            <div className="text-xs text-white/50">{period} • {interval}</div>
          </div>

          <TradingOverview
            feed={feed}
            // If your TradingOverview supports a series prop, you can pass it too:
            // series={series}
          />

          {/* small raw series view (optional, safe) */}
          {series?.length ? (
            <div className="mt-3 text-xs text-white/50">
              Loaded {series.length} points from /api/analytics/pnl/series
            </div>
          ) : null}
        </div>

        {/* CTA row */}
        <div className="grid md:grid-cols-3 gap-4">
          <CTA title="Trade Demo" onClick={() => nav("/trade-demo")} />
          <CTA title="Activation / Setup" onClick={() => nav("/activation")} />
          <CTA title="Help" onClick={() => nav("/help")} />
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL ================= */
function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/50">{sub}</div> : null}
    </div>
  );
}

function CTA({ title, onClick }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-indigo-600 py-3 font-semibold hover:bg-indigo-500">
      {title}
    </button>
  );
}
