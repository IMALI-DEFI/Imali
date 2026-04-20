// src/pages/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* ================= CONFIG ================= */
const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const TOKEN_KEY = "imali_token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ================= NFT TIERS ================= */
const NFT_TIERS = {
  none: {
    rank: 0,
    key: "none",
    name: "No Membership",
    color: "border-slate-300",
    glow: "",
    perks: ["Standard fees", "Basic strategies"],
  },
  common: {
    rank: 1,
    key: "common",
    name: "Common",
    color: "border-emerald-400",
    glow: "shadow-emerald-200",
    perks: ["Lower fees", "Priority execution", "Live trading"],
  },
  rare: {
    rank: 2,
    key: "rare",
    name: "Rare",
    color: "border-sky-400",
    glow: "shadow-sky-200",
    perks: ["Even lower fees", "Advanced bots", "Strategy unlocks"],
  },
  epic: {
    rank: 3,
    key: "epic",
    name: "Epic",
    color: "border-purple-400",
    glow: "shadow-purple-200",
    perks: ["Best fees", "All bots", "Faster routing", "Futures access"],
  },
  legendary: {
    rank: 4,
    key: "legendary",
    name: "Legendary",
    color: "border-yellow-400",
    glow: "shadow-yellow-200",
    perks: ["Lowest fees", "Alpha access", "VIP support", "Premium signals"],
  },
};

const FEATURE_GATES = {
  live_trading: {
    title: "Go Live",
    minTier: "common",
    description: "Trade with real capital.",
  },
  advanced_bots: {
    title: "Advanced Bots",
    minTier: "rare",
    description: "Unlock stronger automation and premium execution logic.",
  },
  strategy_unlocks: {
    title: "Pro Strategies",
    minTier: "rare",
    description: "Use more advanced trading styles and premium allocation logic.",
  },
  futures: {
    title: "Futures Trading",
    minTier: "epic",
    description: "Access leveraged futures trading tools.",
  },
  alpha_signals: {
    title: "Alpha Signals",
    minTier: "legendary",
    description: "Premium signals, early access, and VIP-level features.",
  },
};

const STRATEGIES = [
  { id: "basic", name: "Basic Strategy", minTier: "none", description: "Starter-friendly trading logic." },
  { id: "balanced", name: "Balanced AI", minTier: "common", description: "Smarter balancing and improved execution." },
  { id: "arbitrage", name: "Arbitrage", minTier: "rare", description: "Profit from price differences across venues." },
  { id: "futures", name: "Futures Engine", minTier: "epic", description: "Higher-speed futures execution." },
  { id: "alpha", name: "Alpha Sniper", minTier: "legendary", description: "Top-tier premium entries and signals." },
];

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

const normalizeUser = (data) => data?.data?.user || data?.user || data?.data || data || null;
const normalizeStats = (data) => data?.summary || data?.data?.summary || {};
const normalizeSeries = (data) => {
  const raw =
    data?.daily_performance ||
    data?.series ||
    data?.data?.daily_performance ||
    data?.data?.series ||
    [];

  return Array.isArray(raw)
    ? raw.map((p) => ({
        x: p?.date || p?.x || "",
        y: Number(p?.pnl ?? p?.y ?? 0),
      }))
    : [];
};

const tierRank = (tierKey) => (NFT_TIERS[tierKey]?.rank ?? 0);
const hasTierAccess = (userTierKey, requiredTierKey) => tierRank(userTierKey) >= tierRank(requiredTierKey);

/* ================= COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await API.get("/api/me");
        const currentUser = normalizeUser(meRes.data);

        if (!currentUser?.email && !currentUser?.id) {
          nav("/login");
          return;
        }

        setUser(currentUser);

        const statsRes = await API.get("/api/user/trading-stats?days=30");
        const statsData = statsRes.data || {};

        const summary = normalizeStats(statsData);
        const performanceSeries = normalizeSeries(statsData);

        setStats(summary);
        setSeries(performanceSeries);
        setStreak(Number(summary?.current_streak || 0));
      } catch (err) {
        if (err?.response?.status === 401) {
          nav("/login");
          return;
        }

        console.error("Failed to load member dashboard:", err);
        setStats({});
        setSeries([]);
        setStreak(0);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [nav]);

  const nftKey = String(user?.nft_tier || "none").toLowerCase();
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;

  const confidence = useMemo(() => {
    let score = 0;
    score += Math.min(30, Number(stats.win_rate || 0) * 0.3);
    score += Math.min(30, Number(stats.total_trades || 0) * 0.3);
    score += Math.min(20, Number(streak || 0) * 2);
    score += nftKey !== "none" ? 20 : 0;
    return Math.min(100, Math.round(score));
  }, [stats, streak, nftKey]);

  const unlockedAchievements = useMemo(() => {
    const list = [];
    if (Number(stats.total_trades || 0) > 0) list.push("first_trade");
    if (Number(streak || 0) >= 7) list.push("streak_7");
    if (Number(stats.total_trades || 0) >= 50) list.push("trades_50");
    if (Number(stats.total_pnl || 0) > 0) list.push("profitable");
    if (nftKey !== "none") list.push("nft_holder");
    return list;
  }, [stats, streak, nftKey]);

  const lockedCount = useMemo(() => {
    return Object.values(FEATURE_GATES).filter((feature) => !hasTierAccess(nftKey, feature.minTier)).length;
  }, [nftKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Welcome back 👋</h1>
            <p className="mt-1 text-sm text-gray-600">
              Your membership controls which premium trading tools you can unlock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => nav("/BillingDashboard")}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Billing Dashboard
            </button>

            <button
              onClick={() => nav("/pricing")}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* NFT CARD */}
        <div className={`rounded-2xl border ${nft.color} ${nft.glow} bg-gray-50 p-5 shadow-sm`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">🧬 Membership NFT — {nft.name}</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                {nft.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Locked features</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{lockedCount}</div>
            </div>
          </div>

          {nftKey === "none" && (
            <button
              onClick={() => nav("/nft")}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade Membership
            </button>
          )}
        </div>

        {/* CONFIDENCE METER */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">📊 Trading Confidence</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${confidence >= 70 ? "bg-emerald-500" : "bg-yellow-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Confidence is built from win rate, consistency, and experience.
          </p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total Profit" value={usd(stats.total_pnl)} />
          <Stat label="Win Rate" value={pct(stats.win_rate)} />
          <Stat label="Trades" value={Number(stats.total_trades || 0)} />
          <Stat label="Daily Streak" value={`🔥 ${streak}`} />
        </div>

        {/* FEATURE GATES */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">🔒 Membership Locked Features</h3>
            <button
              onClick={() => nav("/pricing")}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Unlock More
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(FEATURE_GATES).map(([key, feature]) => {
              const unlocked = hasTierAccess(nftKey, feature.minTier);
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${
                    unlocked
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{feature.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{feature.description}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        unlocked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {unlocked ? "Unlocked" : `${NFT_TIERS[feature.minTier].name}+`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STRATEGY ACCESS */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">🧠 Strategy Access</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {STRATEGIES.map((strategy) => {
              const unlocked = hasTierAccess(nftKey, strategy.minTier);
              return (
                <div
                  key={strategy.id}
                  className={`rounded-xl border p-4 ${
                    unlocked ? "border-sky-300 bg-sky-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">{strategy.name}</div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        unlocked ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {unlocked ? "Available" : `${NFT_TIERS[strategy.minTier].name}+`}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">{strategy.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACHIEVEMENTS */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">🏆 Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border px-3 py-2 ${
                  unlockedAchievements.includes(achievement.id)
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {achievement.icon} {achievement.label}
              </div>
            ))}
          </div>
        </div>

        {/* SIMPLE RECENT PERFORMANCE */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">📈 Last 30 Days</h3>

          {series.length === 0 ? (
            <div className="text-sm text-gray-500">No performance data yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-10">
              {series.slice(-10).map((point, idx) => {
                const positive = Number(point.y || 0) >= 0;

                return (
                  <div
                    key={`${point.x}-${idx}`}
                    className={`rounded-lg border p-3 text-center ${
                      positive
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="text-xs text-gray-500">{point.x || "—"}</div>
                    <div
                      className={`mt-1 text-sm font-bold ${
                        positive ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {usd(point.y)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="grid gap-4 md:grid-cols-4">
          <CTA title="Trade Demo" onClick={() => nav("/trade-demo")} />

          <TierCTA
            title="Go Live"
            unlocked={hasTierAccess(nftKey, "common")}
            lockedText="Common+ required"
            onClick={() => nav("/trade-demo?mode=live")}
            onLockedClick={() => nav("/pricing")}
          />

          <TierCTA
            title="Advanced Bots"
            unlocked={hasTierAccess(nftKey, "rare")}
            lockedText="Rare+ required"
            onClick={() => nav("/bots")}
            onLockedClick={() => nav("/pricing")}
          />

          <TierCTA
            title="Futures"
            unlocked={hasTierAccess(nftKey, "epic")}
            lockedText="Epic+ required"
            onClick={() => nav("/futures")}
            onLockedClick={() => nav("/pricing")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TierCTA
            title="Alpha Signals"
            unlocked={hasTierAccess(nftKey, "legendary")}
            lockedText="Legendary required"
            onClick={() => nav("/signals")}
            onLockedClick={() => nav("/pricing")}
          />

          <CTA title="Billing" onClick={() => nav("/BillingDashboard")} />
          <CTA title="Learn" onClick={() => nav("/help")} />
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL ================= */
const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-bold text-gray-900">{value}</div>
  </div>
);

const CTA = ({ title, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
  >
    {title}
  </button>
);

const TierCTA = ({ title, unlocked, lockedText, onClick, onLockedClick }) => {
  if (unlocked) {
    return (
      <button
        onClick={onClick}
        className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
      >
        {title}
      </button>
    );
  }

  return (
    <button
      onClick={onLockedClick}
      className="rounded-xl border border-amber-300 bg-amber-50 py-3 font-semibold text-amber-800 hover:bg-amber-100"
    >
      🔒 {title} — {lockedText}
    </button>
  );
};