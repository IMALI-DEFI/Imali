// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/BotAPI";
import BotAPI from "../../utils/BotAPI";
import { useWallet } from "../../context/WalletContext";

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
  const { account } = wallet;

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [activationStatus, setActivationStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  /* =========================
     INITIAL LOAD
  ========================= */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const me = await BotAPI.me();
        if (!mounted) return;

        const userObj = me?.user || me;
        setUser(userObj);

        const act = await BotAPI.activationStatus();
        if (!mounted) return;

        const status = act?.status || act || {};
        setActivationStatus(status);
        setTradingEnabled(Boolean(status.trading_enabled));
      } catch (err) {
        // 401 already handled globally
        setError("Unable to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================
     LOAD TRADES
  ========================= */
  useEffect(() => {
    if (!user) return;

    const loadTrades = async () => {
      try {
        const res = await api.get("/api/sniper/trades");
        setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
      } catch {
        // Trades not critical — fail silently
      }
    };

    loadTrades();
  }, [user]);

  /* =========================
     TRADING CONTROLS
  ========================= */

  const refreshActivation = async () => {
    const act = await BotAPI.activationStatus();
    const status = act?.status || act || {};
    setActivationStatus(status);
    setTradingEnabled(Boolean(status.trading_enabled));
  };

  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await api.post("/api/trading/enable", { enabled });
      await refreshActivation();
      alert(enabled ? "Trading enabled." : "Trading disabled.");
    } catch (err) {
      alert("Failed to update trading.");
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    if (!window.confirm("Start the trading bot?")) return;

    try {
      setBusy(true);
      const res = await api.post("/api/bot/start", { mode: "live" });
      alert(res.data?.started ? "Bot started." : "Bot may not have started.");
    } catch {
      alert("Failed to start bot.");
    } finally {
      setBusy(false);
    }
  };

  /* =========================
     STATES
  ========================= */

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

  const tier = (user?.tier || "starter").toLowerCase();
  const email = user?.email || "";
  const isActivationComplete = Boolean(
    activationStatus?.activation_complete
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {email}</h1>
            <p className="text-gray-400 text-sm">
              Tier: {tier.toUpperCase()}
            </p>
          </div>

          <div className="space-x-3">
            {tradingEnabled ? (
              <button
                onClick={() => toggleTrading(false)}
                disabled={busy}
                className="px-4 py-2 bg-red-600 rounded-lg"
              >
                Stop Trading
              </button>
            ) : (
              <button
                onClick={() => toggleTrading(true)}
                disabled={busy}
                className="px-4 py-2 bg-emerald-600 rounded-lg"
              >
                Enable Trading
              </button>
            )}

            <button
              onClick={startBot}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              Start Bot
            </button>
          </div>
        </div>

        {/* Feature Modules */}
        <ImaliBalance />
        <TierStatus />
        <RecentTradesTable trades={trades} />
        <ReferralSystem />

        {tierAtLeast(tier, "pro") && <Staking />}
        {tierAtLeast(tier, "elite") && <YieldFarming />}
        {tierAtLeast(tier, "elite") && <Futures />}
        <NFTPreview />
        <TradeDemo />

      </div>
    </div>
  );
}
