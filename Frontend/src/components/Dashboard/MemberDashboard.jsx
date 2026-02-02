// src/pages/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BotAPI } from "../utils/BotAPI"; // ✅ use shared client (adds Bearer token)

/* ================= NFT TIERS ================= */
const NFT_TIERS = {
  none: {
    name: "No Membership",
    color: "border-slate-600",
    glow: "",
    perks: ["Standard fees", "Basic strategies"],
  },
  common: {
    name: "Common",
    color: "border-emerald-400",
    glow: "shadow-emerald-500/40",
    perks: ["Lower fees", "Priority execution"],
  },
  rare: {
    name: "Rare",
    color: "border-sky-400",
    glow: "shadow-sky-500/40",
    perks: ["Even lower fees", "Advanced bots"],
  },
  epic: {
    name: "Epic",
    color: "border-purple-400",
    glow: "shadow-purple-500/40",
    perks: ["Best fees", "All bots", "Faster routing"],
  },
  legendary: {
    name: "Legendary",
    color: "border-yellow-400",
    glow: "shadow-yellow-500/50",
    perks: ["Lowest fees", "Alpha access", "VIP support"],
  },
};

/* ================= ACHIEVEMENTS ================= */
const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥" },
  { id: "trades_50", label: "50 Trades", icon: "🏆" },
  { id: "profitable", label: "Profitable Day", icon: "💰" },
  { id: "nft_holder", label: "NFT Holder", icon: "🎟️" },
];

/* ================= HELPERS ================= */
const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

/* ================= COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [streak, setStreak] = useState(0);

  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setErr("");

        // ✅ backend route is GET /api/me
        const me = await BotAPI.me();
        if (!mounted) return;

        if (!me?.success || !me?.user) {
          nav("/login");
          return;
        }
        setUser(me.user);

        // ✅ backend route is POST /api/analytics/pnl/series
        const pnl = await BotAPI.tryApi
          ? await BotAPI.tryApi(() => {}) // (noop; in case you extended BotAPI)
          : null;

        // Since BotAPI doesn't include analytics yet, call via axios inside BotAPI base:
        // Easiest: add this one method to BotAPI (recommended) OR do a small local axios here.
        // We'll do the clean way: add an "analyticsPnlSeries" method in BotAPI.
        //
        // For now, we’ll assume you add BotAPI.analyticsPnlSeries below (see snippet).
        const pnlRes = await BotAPI.analyticsPnlSeries({
          period: "30d",
          interval: "daily",
        });

        if (!mounted) return;

        setStats(pnlRes?.summary || {});
        setSeries(
          (pnlRes?.series || []).map((p) => ({
            x: p.x,
            y: p.y,
          }))
        );
        setStreak(pnlRes?.summary?.current_streak || 0);
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
  }, [nav]);

  const nftKey = user?.nft_tier || "none";
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;

  const confidence = useMemo(() => {
    const win = Number(stats.win_rate || 0);
    const trades = Number(stats.total_trades || 0);
    const pnl = Number(stats.total_pnl || 0);

    let score = 0;
    score += Math.min(30, win * 0.3);
    score += Math.min(30, trades * 0.3);
    score += Math.min(20, Number(streak || 0) * 2);
    score += nftKey !== "none" ? 20 : 0;

    // tiny bump if profitable, tiny penalty if losing
    if (pnl > 0) score += 3;
    if (pnl < 0) score -= 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [stats, streak, nftKey]);

  const unlockedAchievements = useMemo(() => {
    const list = [];
    if ((stats.total_trades || 0) > 0) list.push("first_trade");
    if ((streak || 0) >= 7) list.push("streak_7");
    if ((stats.total_trades || 0) >= 50) list.push("trades_50");
    if ((stats.total_pnl || 0) > 0) list.push("profitable");
    if (nftKey !== "none") list.push("nft_holder");
    return list;
  }, [stats, streak, nftKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Welcome back 👋</h1>

        {err && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {err}
          </div>
        )}

        {/* NFT CARD */}
        <div className={`rounded-2xl border ${nft.color} ${nft.glow} bg-white/5 p-5`}>
          <h2 className="text-xl font-semibold">🧬 Membership NFT — {nft.name}</h2>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5">
            {nft.perks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {nftKey === "none" && (
            <button
              onClick={() => nav("/nft")}
              className="mt-3 px-4 py-2 bg-indigo-600 rounded-lg"
            >
              Upgrade Membership
            </button>
          )}
        </div>

        {/* CONFIDENCE METER */}
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <h3 className="font-semibold mb-2">📊 Trading Confidence</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full ${confidence >= 70 ? "bg-emerald-500" : "bg-yellow-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1">
            Confidence is built from win rate, consistency, and experience.
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total Profit" value={usd(stats.total_pnl)} />
          <Stat label="Win Rate" value={pct(stats.win_rate)} />
          <Stat label="Trades" value={stats.total_trades ?? 0} />
          <Stat label="Daily Streak" value={`🔥 ${streak || 0}`} />
        </div>

        {/* ACHIEVEMENTS */}
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

        {/* CTA */}
        <div className="grid md:grid-cols-3 gap-4">
          <CTA title="Trade Demo" onClick={() => nav("/trade-demo")} />
          <CTA title="Go Live" onClick={() => nav("/trade-demo?mode=live")} />
          <CTA title="Learn" onClick={() => nav("/help")} />
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL ================= */
const Stat = ({ label, value }) => (
  <div className="rounded-xl bg-white/5 p-4 border border-white/10">
    <div className="text-xs text-white/60">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

const CTA = ({ title, onClick }) => (
  <button onClick={onClick} className="rounded-xl bg-indigo-600 py-3 font-semibold">
    {title}
  </button>
);
