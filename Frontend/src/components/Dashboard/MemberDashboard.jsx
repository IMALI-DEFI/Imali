import React, { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

import { BotAPI } from "../../utils/BotAPI";
import { useWallet } from "../../context/WalletContext";
import { short } from "../../getContractInstance";

/* Feature modules */
import ImaliBalance from "./ImaliBalance";
import Staking from "./Staking";
import YieldFarming from "./YieldFarming";
import NFTPreview from "./NFTPreview";
import TierStatus from "./TierStatus";
import RecentTradesTable from "./RecentTradesTable";
import ReferralSystem from "./ReferralSystem";
import TradeDemo from "../../pages/TradeDemo";
import Futures from "./Futures";

/* Tier helpers */
const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) =>
  ORDER.indexOf(t) >= ORDER.indexOf(need);

export default function MemberDashboard() {
  const nav = useNavigate();
  const wallet = useWallet?.() ?? {};
  const { account, connectWallet, disconnectWallet } = wallet;

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [stopping, setStopping] = useState(false);

  /* ---------------- Load User ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await BotAPI.me();
        if (!mounted) return;
        setUser(data?.user || null);
        setTradingEnabled(data?.user?.tradingEnabled !== false);
      } catch {
        setError("Session expired. Please log in again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Load Trades ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const data = await BotAPI.rawGet("/sniper/trades");
        setTrades(Array.isArray(data) ? data : []);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const tier = (user?.tier || "starter").toLowerCase();

  /* ---------------- STOP TRADING ---------------- */
  const stopTrading = async () => {
    if (!window.confirm("⛔ Stop ALL trading immediately?")) return;

    try {
      setStopping(true);
      await BotAPI.tradingEnable(false);
      setTradingEnabled(false);
      alert("Trading stopped.");
    } catch {
      alert("Failed to stop trading.");
    } finally {
      setStopping(false);
    }
  };

  /* ---------------- States ---------------- */
  if (loading) {
    return <div className="min-h-screen bg-gray-950 p-6">Loading…</div>;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || "Not authenticated"}</p>
          <button
            onClick={() => nav("/login")}
            className="px-6 py-2 rounded-lg bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

        <h1 className="text-2xl font-bold">🚀 Dashboard</h1>

        {/* Trading status */}
        <div
          className={`rounded-xl p-4 font-semibold ${
            tradingEnabled
              ? "bg-emerald-600/10 border border-emerald-500/40 text-emerald-300"
              : "bg-red-600/10 border border-red-500/40 text-red-300"
          }`}
        >
          {tradingEnabled ? "🟢 Trading ACTIVE" : "⛔ Trading STOPPED"}
        </div>

        {tradingEnabled && (
          <button
            onClick={stopTrading}
            disabled={stopping}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold"
          >
            ⛔ STOP ALL TRADING
          </button>
        )}

        {/* Wallet */}
        {account ? (
          <div className="flex justify-between text-xs bg-gray-900 p-3 rounded-lg">
            <span>{short(account)}</span>
            <button onClick={disconnectWallet}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connectWallet} className="bg-blue-600 px-4 py-2 rounded-lg">
            Connect Wallet
          </button>
        )}

        <TierStatus />

        {/* Tabs */}
        <div className="bg-gray-900/60 rounded-xl border border-gray-800">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800">
              {["Overview", "Extras", "Futures"].map((t, i) => (
                <Tab
                  key={t}
                  className={`px-4 py-3 cursor-pointer ${
                    tab === i ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"
                  }`}
                >
                  {t}
                </Tab>
              ))}
            </TabList>

            <TabPanel className="p-4 space-y-4">
              <TradeDemo />
              <RecentTradesTable rows={trades} />
            </TabPanel>

            <TabPanel className="p-4 space-y-4">
              <ImaliBalance />
              {tierAtLeast(tier, "pro") ? <Staking /> : <p>Upgrade to Pro</p>}
              {tierAtLeast(tier, "elite") ? <YieldFarming /> : <p>Elite required</p>}
              <NFTPreview />
              <ReferralSystem />
            </TabPanel>

            <TabPanel className="p-4">
              {tierAtLeast(tier, "elite") ? <Futures /> : <p>Elite required</p>}
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
