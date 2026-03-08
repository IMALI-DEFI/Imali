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

// Use the same endpoints as the live dashboard
const TRADES_URL = `${API_BASE}/api/trades/recent`;
const DISCOVERIES_URL = `${API_BASE}/api/discoveries`;
const BOT_STATUS_URL = `${API_BASE}/api/bot/status`;
const ANALYTICS_URL = `${API_BASE}/api/analytics/summary`;
const HISTORICAL_URL = `${API_BASE}/api/public/historical`;
const PROMO_URL = `${API_BASE}/api/promo/status`;

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

const formatCurrencySigned = (value) => {
  const num = safeNumber(value);
  return `${num >= 0 ? '+' : '-'}$${Math.abs(num).toFixed(0)}`;
};

const formatCompactNumber = (value) => {
  const num = safeNumber(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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

/* ============================
LIVE DATA HOOK - Using all dashboard endpoints
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
      losses: 0
    },
    historicalData: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [tradesRes, discoveriesRes, botsRes, analyticsRes, historicalRes] = await Promise.allSettled([
          axios.get(TRADES_URL, { timeout: 5000 }),
          axios.get(DISCOVERIES_URL, { timeout: 5000 }),
          axios.get(BOT_STATUS_URL, { timeout: 5000 }),
          axios.get(ANALYTICS_URL, { timeout: 5000 }),
          axios.get(HISTORICAL_URL, { timeout: 5000 })
        ]);

        if (!mounted) return;

        // Process trades
        let trades = [];
        if (tradesRes.status === "fulfilled") {
          trades = tradesRes.value.data.trades || [];
        }

        // Process discoveries
        let discoveries = [];
        if (discoveriesRes.status === "fulfilled") {
          discoveries = discoveriesRes.value.data.discoveries || [];
        }

        // Process bots
        let bots = [];
        if (botsRes.status === "fulfilled") {
          bots = botsRes.value.data.bots || [];
        }

        // Process analytics
        let analytics = {
          total_trades: 0,
          total_pnl: 0,
          win_rate: 0,
          wins: 0,
          losses: 0
        };
        if (analyticsRes.status === "fulfilled") {
          analytics = analyticsRes.value.data.summary || analytics;
        }

        // Process historical data
        let historicalData = [];
        if (historicalRes.status === "fulfilled") {
          historicalData = normalizeArray(historicalRes.value.data.daily || []).slice(-14);
        }

        setState({
          trades: trades.slice(0, 5), // Show last 5 trades
          discoveries: discoveries.slice(0, 5), // Show last 5 discoveries
          bots,
          analytics,
          historicalData,
          loading: false,
          error: null
        });
      } catch (err) {
        if (!mounted) return;
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Live data unavailable"
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
    loading: true
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(PROMO_URL);
        const limit = safeNumber(res.data.limit, 50);
        const claimed = safeNumber(res.data.claimed, 0);
        setPromo({
          limit,
          claimed,
          spotsLeft: Math.max(0, limit - claimed),
          loading: false
        });
      } catch {
        setPromo(p => ({ ...p, loading: false }));
      }
    };
    load();
  }, []);

  return promo;
}

/* ============================
MINI HISTORICAL CHART
============================ */

function MiniHistoricalChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-24 bg-white/5 rounded-xl flex items-center justify-center text-white/30 text-xs">
        No historical data
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        data: data.map(d => safeNumber(d.pnl, 0)),
        borderColor: "#34d399",
        backgroundColor: "rgba(52,211,153,0.1)",
        tension: 0.3,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#9ca3af',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (context) => `P&L: ${formatCurrencySigned(context.raw)}`
        }
      }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  return (
    <div className="h-24">
      <Line data={chartData} options={options} />
    </div>
  );
}

/* ============================
STAT CARD
============================ */

function StatCard({ label, value, subtext, color = "white" }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    white: "text-white"
  };

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="text-sm text-white/50">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClasses[color] || colorClasses.white}`}>{value}</div>
      {subtext && <div className="text-xs text-white/40 mt-1">{subtext}</div>}
    </div>
  );
}

/* ============================
TRADE ROW (Mini version)
============================ */

function MiniTradeRow({ trade }) {
  const side = trade?.side || "buy";
  const pnl = safeNumber(trade?.pnl_usd || trade?.pnl, 0);
  const symbol = trade?.symbol || "Unknown";
  const isBuy = side === "buy" || side === "long";
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
          {isBuy ? '▲' : '▼'}
        </span>
        <span className="text-sm font-medium">{symbol}</span>
      </div>
      <span className={`text-xs font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {pnl >= 0 ? '+' : ''}{formatCurrencySigned(pnl)}
      </span>
    </div>
  );
}

/* ============================
DISCOVERY ROW (Mini version)
============================ */

function MiniDiscoveryRow({ discovery }) {
  const score = safeNumber(discovery?.ai_score, 0);
  const chain = discovery?.chain || "ethereum";
  const pair = discovery?.pair || "New token";
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-purple-400">🦄</span>
        <span className="text-sm font-medium truncate max-w-[100px]">{pair}</span>
      </div>
      <span className={`text-xs font-medium ${score >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

/* ============================
LIVE WIDGET - Shows real dashboard data
============================ */

function LiveActivityWidget({ data }) {
  const { trades, discoveries, bots, analytics, historicalData, loading, error } = data;
  
  const activeBots = bots.filter(b => b.status === "operational" || b.status === "scanning").length;
  const totalTrades = analytics.total_trades || trades.length;
  const totalPnl = analytics.total_pnl || 0;
  const winRate = analytics.win_rate || 0;
  const discoveriesCount = discoveries.length;

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-white/60">Loading live data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">Live Trading Dashboard</h3>
        <Link
          to="/live"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          View Full Dashboard →
        </Link>
      </div>

      {/* Mini Chart */}
      <MiniHistoricalChart data={historicalData} />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <StatCard 
          label="Active Bots" 
          value={activeBots} 
          subtext={`${bots.length} total`}
          color="emerald"
        />
        <StatCard 
          label="Total Trades" 
          value={formatCompactNumber(totalTrades)} 
          subtext={`${winRate}% win rate`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard 
          label="Total P&L" 
          value={formatCurrencySigned(totalPnl)} 
          subtext={totalPnl >= 0 ? 'Profitable' : 'Loss'}
          color={totalPnl >= 0 ? "emerald" : "amber"}
        />
        <StatCard 
          label="Discoveries" 
          value={discoveriesCount} 
          subtext="new tokens"
          color="purple"
        />
      </div>

      {/* Recent Activity Feed */}
      <div className="mt-4 space-y-3">
        {trades.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-white/40 mb-2">📊 Recent Trades</h4>
            <div className="bg-black/30 rounded-lg p-2">
              {trades.map((trade, i) => (
                <MiniTradeRow key={i} trade={trade} />
              ))}
            </div>
          </div>
        )}

        {discoveries.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-white/40 mb-2">🦄 New Discoveries</h4>
            <div className="bg-black/30 rounded-lg p-2">
              {discoveries.map((disc, i) => (
                <MiniDiscoveryRow key={i} discovery={disc} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bot Status Tags */}
      <div className="flex flex-wrap gap-1 mt-4">
        {bots.slice(0, 4).map((bot, i) => (
          <span
            key={i}
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              bot.status === "operational" || bot.status === "scanning"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
            }`}
          >
            {bot.status === "operational" || bot.status === "scanning" ? '●' : '○'} {bot.name}
          </span>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-2">{error}</div>
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
  const liveData = useLiveData();
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
          Automated Trading Robots
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
            to="/demo"
            className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 font-bold text-lg transition-all border border-white/10"
          >
            Try Demo →
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

      {/* MAIN CONTENT GRID */}
      <section className="max-w-6xl mx-auto px-6 mb-16 grid lg:grid-cols-2 gap-6">
        {/* Live Activity Widget - Now with REAL data */}
        <div>
          <LiveActivityWidget data={liveData} />
        </div>

        {/* NFT Showcase */}
        <div>
          <NFTShowcase />
        </div>
      </section>

      {/* PROMO SECTION */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-3">Early Access Promo</h2>
          <p className="text-white/60 mb-6 max-w-xl mx-auto">
            Be among the first 50 traders to get reduced fees for 90 days.
          </p>

          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
          />

          {!success && (
            <form onSubmit={claimSpot} className="mt-6 flex max-w-md mx-auto gap-2">
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
            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
              ✅ Spot reserved! Check your email for confirmation.
            </div>
          )}
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
          <Link to="/demo" className="hover:text-white/50">Demo</Link>
          <Link to="/live" className="hover:text-emerald-400">Live Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
