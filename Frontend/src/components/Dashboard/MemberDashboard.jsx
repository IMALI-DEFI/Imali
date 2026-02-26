// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import TradingOverview from "../../components/Dashboard/TradingOverview.jsx";

const POLL_INTERVAL = 60000; // 60s stable polling

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, activation } = useAuth();

  const [trades, setTrades] = useState([]);
  const [activeBots, setActiveBots] = useState({});
  const [botMode, setBotMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  /* ================= LIFECYCLE ================= */

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ================= FETCH BOT STATUS ================= */

  const fetchBotStatuses = useCallback(async () => {
    try {
      const res = await BotAPI.getBotsStatus();
      if (!mountedRef.current) return;

      setActiveBots(res);

      const anyActive = Object.values(res || {}).some(Boolean);
      if (anyActive) {
        if (res.paper) setBotMode("paper");
        else setBotMode("live");
      } else {
        setBotMode(null);
      }
    } catch (err) {
      console.warn("Bot status error:", err?.response?.status);
    }
  }, []);

  /* ================= FETCH TRADES ================= */

  const loadTrades = useCallback(async () => {
    if (!user) return;

    try {
      const res = await BotAPI.getTrades();
      const data = Array.isArray(res?.trades) ? res.trades : res || [];
      if (mountedRef.current) setTrades(data);
    } catch (err) {
      if (err?.response?.status !== 429) {
        console.warn("Trades error:", err?.response?.status);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (!user) return;
    fetchBotStatuses();
    loadTrades();
  }, [user, fetchBotStatuses, loadTrades]);

  /* ================= STABLE POLLING ================= */

  useEffect(() => {
    const anyBotActive = Object.values(activeBots || {}).some(Boolean);
    if (!anyBotActive) return;

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(() => {
      loadTrades();
      fetchBotStatuses();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeBots, loadTrades, fetchBotStatuses]);

  /* ================= START BOT ================= */

  const startBot = async (mode = "paper") => {
    try {
      setBusy(true);

      const res = await BotAPI.startBot({
        mode,
        strategy: "ai_weighted",
        bot_type: mode === "paper" ? "paper" : "live",
      });

      if (res?.success || res?.started) {
        setBanner({
          type: "success",
          message:
            mode === "paper"
              ? "🎮 Paper bot started"
              : "🚀 Live bot started",
        });

        await fetchBotStatuses();
        await loadTrades();
      } else {
        setBanner({ type: "error", message: "Bot failed to start" });
      }
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Start failed",
      });
    } finally {
      setBusy(false);
    }
  };

  /* ================= DERIVED STATS ================= */

  const totalPnL = useMemo(
    () => trades.reduce((s, t) => s + (t.pnl_usd || t.pnl || 0), 0),
    [trades]
  );

  const wins = useMemo(
    () => trades.filter((t) => (t.pnl_usd || t.pnl || 0) > 0).length,
    [trades]
  );

  const totalTrades = trades.length;
  const winRate = totalTrades
    ? ((wins / totalTrades) * 100).toFixed(1)
    : "0.0";

  /* ================= UI ================= */

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Please log in
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {banner && (
          <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-500/40">
            {banner.message}
          </div>
        )}

        {/* Header */}
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">👋 Dashboard</h1>
            <p className="text-sm text-white/50">
              Mode: {botMode || "idle"}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => startBot("paper")}
              disabled={busy}
              className="px-4 py-2 bg-orange-600 rounded-xl"
            >
              🎮 Paper
            </button>
            <button
              onClick={() => startBot("live")}
              disabled={busy || !activation?.trading_enabled}
              className="px-4 py-2 bg-emerald-600 rounded-xl"
            >
              🚀 Live
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-sm text-white/40">Trades</p>
            <p className="text-xl font-bold">{totalTrades}</p>
          </div>

          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-sm text-white/40">P&L</p>
            <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-sm text-white/40">Win Rate</p>
            <p className="text-xl font-bold">{winRate}%</p>
          </div>
        </div>

        {/* Trades Feed */}
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h3 className="font-semibold mb-4">Recent Trades</h3>

          {loading ? (
            <p className="text-white/40">Loading trades...</p>
          ) : trades.length === 0 ? (
            <p className="text-white/40">No trades yet</p>
          ) : (
            <div className="space-y-2">
              {trades.slice(-20).reverse().map((t, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-black/30 px-3 py-2 rounded-xl"
                >
                  <span>{t.symbol || "BTC"}</span>
                  <span
                    className={
                      (t.pnl_usd || t.pnl || 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    ${(t.pnl_usd || t.pnl || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Chart */}
        <div className="bg-black/20 border border-white/10 rounded-2xl p-4">
          <TradingOverview
            feed={{
              equity: 1000 + totalPnL,
              pnl: totalPnL,
              wins,
              losses: totalTrades - wins,
              running: !!botMode,
              mode: botMode || "idle",
              ts: Date.now(),
            }}
          />
        </div>

      </div>
    </div>
  );
}
