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

/* ============================
LIVE DATA HOOK
============================ */

function useLiveActivity() {
  const [state, setState] = useState({
    trades: [],
    bots: [],
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
          ["futures", "stocks", "dex", "okx", "sniper"].includes(k)
        );

        setState({
          trades,
          bots,
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
        data: trades.map((t) => safeNumber(t.pnl, Math.random() * 5)),
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

        <h3 className="font-bold">Live Trading</h3>

        <Link
          to="/live"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          dashboard →
        </Link>

      </div>

      <ActivityChart trades={activity.trades} />

      <div className="flex flex-wrap gap-1 mt-3">
        {activity.bots.map((b) => (
          <span
            key={b}
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          >
            {b}
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
        <span>{claimed} of {limit} claimed</span>
        <span className="text-emerald-400 font-bold">
          {spotsLeft} left
        </span>
      </div>

      <div className="h-3 bg-white/10 rounded-full overflow-hidden">

        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          style={{ width: `${pct}%` }}
        />

      </div>

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
    } catch {}
  };

  return (

    <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">

      {/* HERO */}

      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">

        <img
          src={StarterNFT}
          className="absolute left-10 top-16 w-40 opacity-20"
          alt=""
        />

        <img
          src={ProNFT}
          className="absolute right-10 top-32 w-44 opacity-20"
          alt=""
        />

        <img
          src={EliteNFT}
          className="absolute left-[40%] bottom-0 w-48 opacity-20"
          alt=""
        />

        <h1 className="text-4xl md:text-6xl font-extrabold">

          Your AI Trading Robot

        </h1>

        <p className="text-white/70 mt-4 max-w-xl mx-auto">

          Connect your accounts and let automated trading
          bots execute strategies across crypto, stocks,
          and DeFi markets.

        </p>

        <div className="mt-6">

          <Link
            to="/signup"
            className="px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 font-bold"
          >
            Create Free Account
          </Link>

        </div>

      </section>

      {/* LIVE SECTION */}

      <section className="max-w-6xl mx-auto px-6 mb-16 grid md:grid-cols-2 gap-6">

        <LiveActivityWidget activity={activity} />

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="font-bold text-lg mb-3">

            Trading Robots

          </h3>

          <div className="grid grid-cols-3 gap-3">

            <img src={StarterNFT} className="rounded-xl bg-black/30 p-2"/>
            <img src={ProNFT} className="rounded-xl bg-black/30 p-2"/>
            <img src={EliteNFT} className="rounded-xl bg-black/30 p-2"/>

          </div>

          <p className="text-sm text-white/60 mt-3">

            Each robot specializes in different markets
            including crypto, stocks, and DeFi.

          </p>

        </div>

      </section>

      {/* PROMO */}

      <section className="max-w-3xl mx-auto px-6 pb-20">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

          <h3 className="font-bold text-xl mb-2">

            Early Access

          </h3>

          <PromoMeter
            claimed={promo.claimed}
            limit={promo.limit}
            spotsLeft={promo.spotsLeft}
          />

          {!success && (

            <form
              onSubmit={claimSpot}
              className="mt-4 flex gap-2"
            >

              <input
                type="email"
                required
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="email"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2"
              />

              <button
                className="px-4 py-2 bg-emerald-600 rounded-lg"
              >
                Claim
              </button>

            </form>

          )}

          {success && (

            <div className="text-emerald-400 mt-3">

              Spot reserved. Check your email.

            </div>

          )}

        </div>

      </section>

    </div>
  );
}
