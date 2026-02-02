// src/pages/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line, Doughnut } from "react-chartjs-2";

/* ================= CONFIG ================= */
const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "https://api.imali-defi.com",
  withCredentials: true,
});

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
const usd = (n = 0) => `$${Number(n).toFixed(2)}`;
const pct = (n = 0) => `${Number(n).toFixed(1)}%`;

/* ================= COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [streak, setStreak] = useState(0);

  /* -------- Fetch -------- */
  useEffect(() => {
    (async () => {
      try {
        const me = await API.post("/api/me");
        if (!me.data?.success) return nav("/login");
        setUser(me.data.user);

        const pnl = await API.post("/api/analytics/pnl/series", {
          period: "30d",
          interval: "daily",
        });

        setStats(pnl.data.summary || {});
        setSeries(
          (pnl.data.series || []).map((p) => ({
            x: p.x,
            y: p.y,
          }))
        );

        setStreak(pnl.data.summary?.current_streak || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  /* -------- Derived -------- */
  const nftKey = user?.nft_tier || "none";
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;

  const confidence = useMemo(() => {
    let score = 0;
    score += Math.min(30, (stats.win_rate || 0) * 0.3);
    score += Math.min(30, (stats.total_trades || 0) * 0.3);
    score += Math.min(20, streak * 2);
    score += nftKey !== "none" ? 20 : 0;
    return Math.min(100, Math.round(score));
  }, [stats, streak, nftKey]);

  const unlockedAchievements = useMemo(() => {
    const list = [];
    if (stats.total_trades > 0) list.push("first_trade");
    if (streak >= 7) list.push("streak_7");
    if (stats.total_trades >= 50) list.push("trades_50");
    if (stats.total_pnl > 0) list.push("profitable");
    if (nftKey !== "none") list.push("nft_holder");
    return list;
  }, [stats, streak, nftKey]);

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <h1 className="text-3xl font-bold">Welcome back 👋</h1>

        {/* NFT CARD */}
        <div className={`rounded-2xl border ${nft.color} ${nft.glow} bg-white/5 p-5`}>
          <h2 className="text-xl font-semibold">🧬 Membership NFT — {nft.name}</h2>
          <ul className="mt-2 text-sm text-white/70 list-disc pl-5">
            {nft.perks.map((p) => <li key={p}>{p}</li>)}
          </ul>
          {nftKey === "none" && (
            <button onClick={() => nav("/nft")} className="mt-3 px-4 py-2 bg-indigo-600 rounded-lg">
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
          <Stat label="Trades" value={stats.total_trades} />
          <Stat label="Daily Streak" value={`🔥 ${streak}`} />
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
