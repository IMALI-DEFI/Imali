// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/BotAPI";
import BotAPI from "../../utils/BotAPI";

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

/* ===================== HELPERS ===================== */

const ORDER = ["starter", "pro", "elite", "bundle"];
const tierAtLeast = (t, need) => ORDER.indexOf(t) >= ORDER.indexOf(need);
const usd = (n = 0) => `$${Number(n).toFixed(2)}`;

/* ===================== COMPONENT ===================== */

export default function MemberDashboard() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [activationStatus, setActivationStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  /* =====================
     LOAD USER + STATUS
  ===================== */

  const loadDashboard = useCallback(async () => {
    try {
      const me = await BotAPI.me();
      const userObj = me?.user || me;
      setUser(userObj);

      const act = await BotAPI.activationStatus();
      const status = act?.status || act || {};
      setActivationStatus(status);

      const res = await api.get("/api/sniper/trades");
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch (err) {
      setBanner({
        type: "error",
        message: "Unable to load dashboard. Please refresh.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* Auto refresh trades (safe interval) */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get("/api/sniper/trades");
        setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
      } catch {
        /* silent fail */
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  /* =====================
     COMPUTED METRICS
  ===================== */

  const totalPnL = useMemo(
    () => trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0),
    [trades]
  );

  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    const wins = trades.filter((t) => (t.pnl_usd || 0) > 0).length;
    return ((wins / trades.length) * 100).toFixed(1);
  }, [trades]);

  const confidence = useMemo(() => {
    let score = 40;
    if (winRate > 60) score += 20;
    if (trades.length > 20) score += 15;
    if (activationStatus?.activation_complete) score += 15;
    return Math.min(score, 100);
  }, [winRate, trades.length, activationStatus]);

  /* =====================
     TRADING CONTROL
  ===================== */

  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await api.post("/api/trading/enable", { enabled });

      setBanner({
        type: "success",
        message: enabled
          ? "Trading has been enabled."
          : "Trading has been disabled.",
      });

      await loadDashboard();
    } catch {
      setBanner({
        type: "error",
        message: "Unable to update trading status.",
      });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    try {
      setBusy(true);
      const res = await api.post("/api/bot/start", { mode: "live" });

      if (res.data?.started) {
        setBanner({
          type: "success",
          message: "Bot started successfully.",
        });
      } else {
        throw new Error();
      }
    } catch {
      setBanner({
        type: "error",
        message: "Bot failed to start.",
      });
    } finally {
      setBusy(false);
    }
  };

  /* =====================
     STATES
  ===================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading your dashboard...
      </div>
    );
  }

  if (!user) {
    nav("/login");
    return null;
  }

  const tier = (user?.tier || "starter").toLowerCase();
  const tradingEnabled = Boolean(activationStatus?.trading_enabled);

  /* =====================
     RENDER
  ===================== */

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Banner */}
        {banner && (
          <div
            className={`p-4 rounded-xl border ${
              banner.type === "error"
                ? "bg-red-600/10 border-red-500/40"
                : "bg-emerald-600/10 border-emerald-500/40"
            }`}
          >
            {banner.message}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {user.email}
            </h1>
            <div className="text-sm text-white/60">
              Membership: {tier.toUpperCase()}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleTrading(!tradingEnabled)}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
            >
              {tradingEnabled ? "Disable Trading" : "Enable Trading"}
            </button>

            <button
              onClick={startBot}
              disabled={!tradingEnabled || busy}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500"
            >
              Start Bot
            </button>
          </div>
        </div>

        {/* Stats Row (matches demo language) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Account Value" value={usd(1000 + totalPnL)} />
          <Stat label="Today’s Gain/Loss" value={usd(totalPnL)} />
          <Stat label="Win Rate" value={`${winRate}%`} />
          <Stat label="Bot Confidence" value={`${confidence}%`} />
        </div>

        {/* Core Modules */}
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

/* ===================== SMALL ===================== */
function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
