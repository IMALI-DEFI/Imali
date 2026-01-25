import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Link, useNavigate } from "react-router-dom";

import { BotAPI } from "../../utils/api";
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

// Components
import TradingOverview from "./TradingOverview";
import TradeDemo from "../../pages/TradeDemo";
import ImaliBalance from "./ImaliBalance";
import Staking from "./Staking";
import Lending from "./Lending";
import YieldFarming from "./YieldFarming";
import LPLottery from "./LPLottery";
import NFTPreview from "./NFTPreview";
import ReferralSystem from "../ReferralSystem";
import RecentTradesTable from "./RecentTradesTable";

/* ---------------- ENV ---------------- */
const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

/* ---------------- HELPERS ---------------- */
async function fetchMe() {
  try {
    const res = await axios.get(`${API_BASE}/api/me`, {
      withCredentials: true,
    });
    return res.data?.user || null;
  } catch {
    return null;
  }
}

async function fetchActivation() {
  try {
    const res = await axios.get(`${API_BASE}/api/me/activation-status`, {
      withCredentials: true,
    });
    return res.data?.status || null;
  } catch {
    return null;
  }
}

/* ---------------- LOCKED VIEW ---------------- */
function LockedDashboard({ status }) {
  const stripe = !!status?.stripe_active;
  const api = !!status?.api_connected;
  const bot = !!status?.bot_selected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white flex items-center justify-center">
      <div className="max-w-md p-6 rounded-2xl border border-white/10 bg-white/5 text-center">
        <h2 className="text-2xl font-bold mb-3">Dashboard Locked 🔒</h2>
        <p className="text-white/70 mb-5">
          Complete activation to access trading.
        </p>

        <div className="space-y-2 text-sm text-left mb-6">
          <StatusRow label="Payment Method" ok={stripe} />
          <StatusRow label="API Connected" ok={api} />
          <StatusRow label="Bot Selected" ok={bot} />
        </div>

        <div className="flex gap-2 justify-center">
          <Link
            to="/activation"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Complete Activation
          </Link>
          <Link
            to="/pricing"
            className="px-6 py-3 rounded-xl bg-emerald-700/40 border border-emerald-300/30 hover:bg-emerald-700/55 font-semibold"
          >
            View Plans
          </Link>
        </div>

        <div className="mt-4 text-xs text-white/50">
          Starter requires a card (30% fee over 3%). All tiers must connect API + bot.
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? "text-emerald-300" : "text-amber-300"}>
        {ok ? "✅ Complete" : "⏳ Pending"}
      </span>
    </div>
  );
}

/* ---------------- MAIN ---------------- */
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { account, chainId, connect, disconnect } = useWallet();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [activation, setActivation] = useState(null);

  const [stats, setStats] = useState({});
  const [trades, setTrades] = useState([]);

  const [tab, setTab] = useState(0);

  /* ---------- BOOTSTRAP ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const [u, a] = await Promise.all([fetchMe(), fetchActivation()]);
      if (!mounted) return;

      if (!u) {
        navigate("/login", { replace: true });
        return;
      }

      setMe(u);
      setActivation(a);
      setLoading(false);
    })();

    return () => (mounted = false);
  }, [navigate]);

  /* ---------- DATA FEED ---------- */
  useEffect(() => {
    if (!activation?.complete) return;

    let cancel = false;

    async function load() {
      try {
        const [pnl, recent] = await Promise.all([
          BotAPI.getPnLSummary({ wallet: account || "" }),
          BotAPI.getRecentTrades({ wallet: account || "", limit: 50 }),
        ]);

        if (cancel) return;

        setStats(pnl || {});
        setTrades(recent?.trades || recent || []);
      } catch {}
    }

    load();
    const id = setInterval(load, 30000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [account, activation]);

  /* ---------- GUARDS ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading dashboard…
      </div>
    );
  }

  if (!activation?.complete) {
    return <LockedDashboard status={activation || {}} />;
  }

  const tier = (me?.tier_active || "starter").toLowerCase();
  const isStarter = tier === "starter";

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold">🎮 Member Dashboard</h1>

          <div className="flex items-center gap-2">
            {account ? (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-black/30 border border-white/20">
                  {short(account)} {chainId && `• ${chainId}`}
                </span>
                <button onClick={disconnect} className="btn">
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={connect} className="btn btn-primary">
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* OVERVIEW STRIP */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <TradingOverview feed={stats} />

          <div className="card">
            <div className="flex justify-between items-center">
              <span className="text-sm">Tier</span>
              <span className="badge">
                {tier.toUpperCase()} • {isStarter ? "30%" : "5%"} fee
              </span>
            </div>
            <div className="mt-2 text-xs text-white/70">
              {isStarter
                ? "Starter requires card. 30% fee on profits over 3%."
                : "Paid tier: 5% fee on profits over 3%."}
            </div>
          </div>

          <div className="card text-sm text-white/80">
            1) Select bot<br />
            2) Connect API<br />
            3) Start trading
          </div>
        </div>

        {/* TABS */}
        <Tabs selectedIndex={tab} onSelect={setTab}>
          <TabList>
            <Tab>Trading</Tab>
            <Tab>Extras</Tab>
          </TabList>

          <TabPanel>
            <div className="space-y-4">
              <div className="card">
                <TradeDemo />
              </div>

              <div className="card">
                <RecentTradesTable rows={trades} />
              </div>
            </div>
          </TabPanel>

          <TabPanel>
            <div className="space-y-4">
              <Staking />
              <YieldFarming />
              <Lending />
              <ReferralSystem />
              <LPLottery />
              <NFTPreview />
              <ImaliBalance />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
