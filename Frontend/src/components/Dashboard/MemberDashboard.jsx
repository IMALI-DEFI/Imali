// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { useNavigate } from "react-router-dom";

import BotAPI from "../../utils/BotAPI";
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
import TradeDemo from "./TradeDemo";
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
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [activationStatus, setActivationStatus] = useState(null);

  /* ---------------- Load User + Activation ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await BotAPI.me();
        if (!mounted) return;

        if (!me || me.ok === false) {
          throw { status: 401 };
        }

        const userObj = me.user || me;
        setUser(userObj);

        const act = await BotAPI.activationStatus();
        if (!mounted) return;

        const status = act.status || act || {};
        setActivationStatus(status);
        setTradingEnabled(Boolean(status.trading_enabled));
      } catch (err) {
        console.error("Dashboard init error:", err);
        setError("Session expired. Please log in again.");
        setTimeout(() => nav("/login"), 1500);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [nav]);

  /* ---------------- Load Trades ---------------- */
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const data = await BotAPI.sniperTrades();
        setTrades(Array.isArray(data?.trades) ? data.trades : []);
      } catch (err) {
        console.warn("Trades unavailable:", err);
      }
    })();
  }, [user]);

  /* ---------------- Trading Controls ---------------- */
  const stopTrading = async () => {
    if (!window.confirm("Stop ALL trading immediately?")) return;

    try {
      setStopping(true);
      await BotAPI.tradingEnable(false);
      setTradingEnabled(false);

      const act = await BotAPI.activationStatus();
      setActivationStatus(act.status || act || {});
      alert("Trading stopped.");
    } catch (err) {
      alert(err?.message || "Failed to stop trading.");
    } finally {
      setStopping(false);
    }
  };

  const startTrading = async () => {
    try {
      setStopping(true);
      await BotAPI.tradingEnable(true);
      setTradingEnabled(true);

      const act = await BotAPI.activationStatus();
      setActivationStatus(act.status || act || {});
      alert("Trading enabled.");
    } catch (err) {
      alert(err?.message || "Failed to enable trading.");
    } finally {
      setStopping(false);
    }
  };

  const startBot = async () => {
    if (!window.confirm("Start the trading bot?")) return;

    try {
      setStopping(true);
      const res = await BotAPI.botStart({ mode: "live" });
      alert(res?.started ? "Bot started." : "Bot may not have started.");
    } catch (err) {
      alert(err?.message || "Failed to start bot.");
    } finally {
      setStopping(false);
    }
  };

  const tier = (user?.tier || "starter").toLowerCase();
  const email = user?.email || "";
  const isActivationComplete = Boolean(
    activationStatus?.activation_complete
  );

  /* ---------------- States ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl text-center">
          <p className="text-red-400 mb-4">{error || "Not authenticated"}</p>
          <button
            onClick={() => nav("/login")}
            className="px-6 py-3 bg-blue-600 rounded-xl"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Trading Dashboard</h1>
            <p className="text-gray-400">{email}</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className="px-3 py-1 bg-gray-800 rounded-full capitalize">
              {tier}
            </span>
            {user.is_admin && (
              <span className="px-3 py-1 bg-purple-600/30 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Activation Banner */}
        {!isActivationComplete && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            Complete activation to enable full trading.
            <button
              onClick={() => nav("/activation")}
              className="ml-2 underline"
            >
              Go to Activation
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <h3 className="font-bold mb-3">
              {tradingEnabled ? "Trading Active" : "Trading Disabled"}
            </h3>
            {tradingEnabled ? (
              <>
                <button
                  onClick={stopTrading}
                  disabled={stopping}
                  className="w-full bg-red-600 py-3 rounded-xl mb-2"
                >
                  Stop Trading
                </button>
                <button
                  onClick={startBot}
                  disabled={stopping}
                  className="w-full bg-blue-600 py-3 rounded-xl"
                >
                  Restart Bot
                </button>
              </>
            ) : (
              <button
                onClick={startTrading}
                disabled={stopping}
                className="w-full bg-emerald-600 py-3 rounded-xl"
              >
                Enable Trading
              </button>
            )}
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <h3 className="font-bold mb-3">Wallet</h3>
            {account ? (
              <>
                <p className="font-mono">{short(account)}</p>
                <button
                  onClick={disconnectWallet}
                  className="text-red-400 mt-2"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full bg-blue-600 py-3 rounded-xl"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <TierStatus user={user} activationStatus={activationStatus} />
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <Tabs selectedIndex={tab} onSelect={setTab}>
            <TabList className="flex border-b border-gray-800">
              {["Overview", "Extras", "Futures", "Analytics"].map((t) => (
                <Tab key={t} className="px-6 py-4 cursor-pointer">
                  {t}
                </Tab>
              ))}
            </TabList>

            <TabPanel className="p-6">
              <TradeDemo />
              <RecentTradesTable rows={trades} />
            </TabPanel>

            <TabPanel className="p-6">
              <ImaliBalance />
              {tierAtLeast(tier, "pro") && <Staking />}
              {tierAtLeast(tier, "elite") && <YieldFarming />}
              <NFTPreview />
              <ReferralSystem />
            </TabPanel>

            <TabPanel className="p-6">
              {tierAtLeast(tier, "elite") ? <Futures /> : "Upgrade required"}
            </TabPanel>

            <TabPanel className="p-6">
              Analytics coming soon.
            </TabPanel>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm text-gray-500 pt-6 border-t border-gray-800">
          <span>
            Status:{" "}
            <span className={isActivationComplete ? "text-emerald-400" : "text-amber-400"}>
              {isActivationComplete ? "Activated" : "Setup Required"}
            </span>
          </span>
          <div className="flex gap-4">
            <button onClick={() => nav("/activation")}>Activation</button>
            <button onClick={() => nav("/billing")}>Billing</button>
            <button onClick={() => { BotAPI.logout(); nav("/login"); }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
