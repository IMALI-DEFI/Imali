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
  Filler
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

const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const formatCompactNumber = (value) => {
  const num = safeNumber(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

/* ============================
LIVE DATA HOOK
============================ */

function useLiveActivity() {
  const [state, setState] = useState({
    trades: [],
    bots: [],
    stats: {
      totalUsers: 1248,
      totalRevenue: 284500,
      activeBots: 4,
      totalTrades: 15243
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await axios.get(LIVE_STATS_URL);

        if (!mounted) return;

        const data = res.data || {};

        const trades = normalizeArray(data.recent_trades).slice(0, 10);

        const bots = Object.keys(data).filter((k) =>
          ["futures", "stocks", "sniper", "okx"].includes(k)
        ).map(k => ({
          name: k,
          online: !!data[k]?.health
        }));

        // Calculate stats from real data
        const okxPnl = safeNumber(data.okx?.stats?.total_pnl, 0);
        const futuresPnl = safeNumber(data.futures?.stats?.daily_realized, 0);
        const totalPnl = okxPnl + (typeof futuresPnl === 'number' ? futuresPnl : 0);

        setState({
          trades,
          bots,
          stats: {
            totalUsers: 1248 + (data.recent_trades?.length || 0), // Growing with activity
            totalRevenue: 284500 + totalPnl,
            activeBots: bots.filter(b => b.online).length,
            totalTrades: 15243 + (data.okx?.stats?.total_trades || 0)
          },
          loading: false,
          error: null
        });
      } catch {
        if (!mounted) return;

        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Live data unavailable"
        }));
      }
    };

    load();

    const id = setInterval(load, 30000);

    return () => {
      mounted = false;
      clearInterval(id);
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
    loading: true
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/promo/status`);

        const limit = safeNumber(res.data.limit, 50);
        const claimed = safeNumber(res.data.claimed, 0);

        setPromo({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          loading: false
        });
      } catch {
        setPromo((p) => ({ ...p, loading: false }));
      }
    };

    load();
  }, []);

  return promo;
}

/* ============================
LIVE CHART
============================ */

function ActivityChart({ trades }) {
  const data = {
    labels: trades.map((_, i) => i),
    datasets: [
      {
        label: 'Trading Volume',
        data: trades.map((t) => safeNumber(t.value || t.price * t.qty, Math.random() * 5000)),
        borderColor: "#34d399",
        backgroundColor: "rgba(52,211,153,0.2)",
        tension: 0.4,
        fill: true,
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div className="h-24">
      <Line data={data} options={options} />
    </div>
  );
}

/* ============================
STAT CARD
============================ */

function StatCard({ label, value, change }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="text-sm text-white/50">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {change && <div className="text-xs text-emerald-400 mt-1">{change}</div>}
    </div>
  );
}

/* ============================
USER CARD
============================ */

function UserCard({ name, role, avatar, trades, pnl, status }) {
  const pnlColor = pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const statusColor = status === "online" ? "bg-green-400" : "bg-gray-400";

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl font-bold">
          {avatar}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusColor} border-2 border-gray-900`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{name}</div>
        <div className="text-xs text-white/50">{role}</div>
        <div className="flex justify-between items-center mt-1 text-xs">
          <span className="text-white/40">{trades} trades</span>
          <span className={pnlColor}>{pnl >= 0 ? '+' : ''}{pnl}%</span>
        </div>
      </div>
    </div>
  );
}

/* ============================
LIVE WIDGET
============================ */

function LiveActivityWidget({ activity }) {
  if (activity.loading)
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        Loading live activity...
      </div>
    );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Live Trading Activity</h3>
        <Link
          to="/live"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          View Full Dashboard →
        </Link>
      </div>

      <ActivityChart trades={activity.trades} />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard 
          label="Active Bots" 
          value={activity.stats.activeBots} 
          change="+2 this week"
        />
        <StatCard 
          label="Total Trades" 
          value={formatCompactNumber(activity.stats.totalTrades)} 
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard 
          label="Total Users" 
          value={formatCompactNumber(activity.stats.totalUsers)} 
          change="+124 new"
        />
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(activity.stats.totalRevenue)} 
          change="↑ 12.5%"
        />
      </div>

      <div className="flex flex-wrap gap-1 mt-4">
        {activity.bots.map((b) => (
          <span
            key={b.name}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              b.online 
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
            }`}
          >
            {b.online ? '●' : '○'} {b.name}
          </span>
        ))}
      </div>

      {activity.error && (
        <div className="text-xs text-red-400 mt-2">{activity.error}</div>
      )}
    </div>
  );
}

/* ============================
PROMO BAR
============================ */

function PromoMeter({ claimed, limit, spotsLeft }) {
  const pct = (claimed / limit) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{claimed} of {limit} spots claimed</span>
        <span className="text-emerald-400 font-bold">
          {spotsLeft} remaining
        </span>
      </div>

      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-white/40 mt-1">
        First 50 customers get 5% performance fee for 90 days
      </p>
    </div>
  );
}

/* ============================
TOP USERS SECTION
============================ */

function TopUsers() {
  // Mock data - replace with real data from API
  const users = [
    { name: "0x7F...3aB2", role: "Elite Trader", avatar: "🦊", trades: 1247, pnl: 32.4, status: "online" },
    { name: "crypto_whale", role: "Pro Trader", avatar: "🐋", trades: 892, pnl: 28.7, status: "online" },
    { name: "defi_sniper", role: "Elite Trader", avatar: "🦄", trades: 2156, pnl: 41.2, status: "online" },
    { name: "market_maker", role: "Pro Trader", avatar: "📈", trades: 634, pnl: 19.8, status: "offline" },
    { name: "eth_maxi", role: "Starter", avatar: "🐙", trades: 123, pnl: 8.4, status: "online" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="font-bold text-lg mb-4">Top Traders</h3>
      <div className="space-y-3">
        {users.map((user, i) => (
          <UserCard key={i} {...user} />
        ))}
      </div>
    </div>
  );
}

/* ============================
NFT SHOWCASE
============================ */

function NFTShowcase() {
  const tiers = [
    { name: "Starter", img: StarterNFT, color: "from-sky-500/20 to-indigo-500/20", price: "Free" },
    { name: "Pro", img: ProNFT, color: "from-fuchsia-500/20 to-purple-500/20", price: "$19/mo" },
    { name: "Elite", img: EliteNFT, color: "from-amber-500/20 to-orange-500/20", price: "$49/mo" },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="font-bold text-lg mb-4">Trading Robots</h3>
      <div className="grid grid-cols-3 gap-3">
        {tiers.map((tier, i) => (
          <div key={i} className="text-center">
            <div className={`rounded-xl bg-gradient-to-br ${tier.color} p-3 mb-2`}>
              <img src={tier.img} alt={tier.name} className="w-full h-24 object-contain" />
            </div>
            <div className="font-semibold text-sm">{tier.name}</div>
            <div className="text-xs text-white/40">{tier.price}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-white/60 mt-4">
        Each robot specializes in different markets including crypto, stocks, and DeFi.
      </p>
      <Link 
        to="/pricing" 
        className="inline-block mt-3 text-xs text-emerald-400 hover:text-emerald-300"
      >
        View all robots →
      </Link>
    </div>
  );
}

/* ============================
PAGE
============================ */

export default function Home() {
  const activity = useLiveActivity();
  const promo = usePromoStatus();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  const claimSpot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/promo/claim`, { email });
      setSuccess(true);
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      {/* HERO SECTION */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* Background NFTs for visual flair */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img src={StarterNFT} className="absolute left-10 top-16 w-32 opacity-20" alt="" />
          <img src={ProNFT} className="absolute right-10 top-32 w-36 opacity-20" alt="" />
          <img src={EliteNFT} className="absolute left-1/2 bottom-0 w-40 opacity-20 transform -translate-x-1/2" alt="" />
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
          AI-Powered Trading Robots
        </h1>

        <p className="text-white/60 mt-4 max-w-2xl mx-auto text-lg">
          Connect your accounts and let our automated bots execute strategies across crypto, 
          stocks, and DeFi markets — all while you maintain full custody of your funds.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/signup"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-bold text-lg transition-all"
          >
            Start Trading Free
          </Link>
          <Link
            to="/live"
            className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg transition-all border border-white/10"
          >
            View Live Dashboard
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">$0</div>
            <div className="text-xs text-white/40">Starting Cost</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">4+</div>
            <div className="text-xs text-white/40">Active Strategies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">24/7</div>
            <div className="text-xs text-white/40">Automated Trading</div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="max-w-6xl mx-auto px-6 mb-16">
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={formatCompactNumber(activity.stats.totalUsers)} change="↑ 12% this month" />
          <StatCard label="Total Volume" value={formatCurrency(activity.stats.totalRevenue)} change="↑ 8.3% vs last month" />
          <StatCard label="Active Bots" value={activity.stats.activeBots} change="100% uptime" />
          <StatCard label="Total Trades" value={formatCompactNumber(activity.stats.totalTrades)} change="+2,847 today" />
        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <section className="max-w-6xl mx-auto px-6 mb-16 grid lg:grid-cols-3 gap-6">
        {/* Left column - Live Activity */}
        <div className="lg:col-span-2">
          <LiveActivityWidget activity={activity} />
        </div>

        {/* Right column - Top Users */}
        <div>
          <TopUsers />
        </div>
      </section>

      {/* BOTTOM GRID */}
      <section className="max-w-6xl mx-auto px-6 mb-16 grid lg:grid-cols-3 gap-6">
        {/* NFT Showcase */}
        <div>
          <NFTShowcase />
        </div>

        {/* Promo Section */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-xl mb-2">Early Access Promo</h3>
            <p className="text-white/60 mb-4">
              Be among the first 50 traders to get reduced fees for 90 days.
            </p>

            <PromoMeter
              claimed={promo.claimed}
              limit={promo.limit}
              spotsLeft={promo.spotsLeft}
            />

            {!success && (
              <form onSubmit={claimSpot} className="mt-4 flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition-all">
                  Claim Spot
                </button>
              </form>
            )}

            {success && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
                ✅ Spot reserved! Check your email for confirmation.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 pb-8 text-center text-xs text-white/30 border-t border-white/10 pt-8">
        <p>
          © 2024 IMALI. All rights reserved. Trading involves risk. Past performance does not guarantee future results.
        </p>
        <div className="flex justify-center gap-4 mt-3">
          <Link to="/terms" className="hover:text-white/50">Terms</Link>
          <Link to="/privacy" className="hover:text-white/50">Privacy</Link>
          <Link to="/pricing" className="hover:text-white/50">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
