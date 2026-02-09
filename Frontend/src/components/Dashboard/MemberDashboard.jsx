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
const tierAtLeast = (t, need) => ORDER.indexOf(t) >= ORDER.indexOf(need);

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

  /* ---------------- Load User + Activation (FIXED) ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ✅ FIX 1: do NOT call /me without a token
        if (!BotAPI.getToken()) {
          throw new Error("No auth token");
        }

        const me = await BotAPI.me();
        if (!mounted) return;

        const userObj = me?.user || me;
        if (!userObj) {
          throw new Error("Invalid user response");
        }

        setUser(userObj);

        const act = await BotAPI.activationStatus();
        if (!mounted) return;

        const status = act?.status || act || {};
        setActivationStatus(status);
        setTradingEnabled(Boolean(status.trading_enabled));
      } catch (err) {
        console.error("Dashboard init error:", err);
        setError("Session expired. Please log in again.");
        setTimeout(() => nav("/login", { replace: true }), 1200);
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
      setActivationStatus(act?.status || act || {});
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
      setActivationStatus(act?.status || act || {});
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

  /* ---------------- Render (UNCHANGED) ---------------- */
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* header, controls, tabs, footer unchanged */}
        {/* intentionally omitted here for brevity */}
      </div>
    </div>
  );
}
