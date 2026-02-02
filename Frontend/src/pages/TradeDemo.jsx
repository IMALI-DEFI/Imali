// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ===================== CONFIG ===================== */
const CONFIDENCE_REQUIRED = 70;

/* ===================== HELPERS ===================== */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const usd = (n = 0) => `$${Number(n).toFixed(2)}`;

/* ===================== COMPONENT ===================== */
export default function TradeDemo({
  userImaliBalance = 0,
  hasNFT = false,
  defaultMode = "demo",
}) {
  /* ---------- Mode ---------- */
  const [mode, setMode] = useState(defaultMode); // demo | live
  const [transitioning, setTransitioning] = useState(false);

  /* ---------- Trading state ---------- */
  const [running, setRunning] = useState(false);
  const [equity, setEquity] = useState(1000);
  const [pnl, setPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  /* ---------- Gamification ---------- */
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastTradeDay, setLastTradeDay] = useState(null);
  const [achievements, setAchievements] = useState([]);

  /* ---------- Confidence ---------- */
  const confidence = useMemo(() => {
    let score = 0;
    const total = wins + losses;

    if (total > 0) score += clamp((wins / total) * 40, 0, 40);
    score += clamp(total * 1.2, 0, 30);
    score += clamp(streak * 5, 0, 20);
    if (hasNFT) score += 20;

    return clamp(Math.round(score), 0, 100);
  }, [wins, losses, streak, hasNFT]);

  const canGoLive = hasNFT || confidence >= CONFIDENCE_REQUIRED;

  /* ---------- Achievements ---------- */
  useEffect(() => {
    const list = [];
    if (wins + losses > 0) list.push("🚀 First Trade");
    if (streak >= 7) list.push("🔥 7-Day Streak");
    if (pnl > 0) list.push("💰 Profitable Session");
    if (hasNFT) list.push("🎟 NFT Holder");
    setAchievements(list);
  }, [wins, losses, streak, pnl, hasNFT]);

  /* ---------- Ticking ---------- */
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      const delta = (Math.random() - 0.45) * 25;

      setPnl((p) => p + delta);
      setEquity((e) => e + delta);

      if (delta > 0) {
        setWins((w) => w + 1);
        setXp((x) => x + Math.round(delta));
        setCoins((c) => c + 1);
      } else {
        setLosses((l) => l + 1);
      }

      /* Daily streak */
      const today = new Date().toDateString();
      setLastTradeDay((prev) => {
        if (!prev) {
          setStreak(1);
          return today;
        }
        if (prev !== today) {
          setStreak((s) => s + 1);
          return today;
        }
        return prev;
      });

      /* Broadcast for dashboard */
      window.dispatchEvent(
        new CustomEvent("trade-demo:update", {
          detail: {
            mode,
            pnl,
            equity,
            wins,
            losses,
            running: true,
            ts: Date.now(),
          },
        })
      );
    }, 4000);

    return () => clearInterval(timer);
  }, [running, mode, pnl, equity, wins, losses]);

  /* ---------- Mode Switch ---------- */
  const switchToLive = () => {
    if (!canGoLive) return;
    setTransitioning(true);

    setTimeout(() => {
      setMode("live");
      setTransitioning(false);
    }, 2800);
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-slate-950 text-white relative">
      {/* Transition Overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="text-center space-y-3 animate-pulse">
            <div className="text-2xl font-bold">Switching to LIVE</div>
            <div className="text-sm text-white/70">
              Same engine. Same strategy. Real execution.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">
            Trade {mode === "demo" ? "Demo" : "Live"}
          </h1>
          {hasNFT && (
            <span className="text-xs text-yellow-400">NFT VIP ACCESS</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs">
            Confidence:{" "}
            <span
              className={
                confidence >= CONFIDENCE_REQUIRED
                  ? "text-emerald-400"
                  : "text-yellow-400"
              }
            >
              {confidence}%
            </span>
          </div>

          <button
            disabled={mode === "live" || !canGoLive}
            onClick={switchToLive}
            className={`px-4 py-2 rounded-lg font-semibold ${
              canGoLive
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-slate-700 cursor-not-allowed"
            }`}
          >
            Go Live
          </button>
        </div>
      </div>

      {/* Confidence Warning */}
      {!canGoLive && !hasNFT && (
        <div className="max-w-7xl mx-auto px-4 mb-3">
          <div className="rounded-lg bg-yellow-600/20 border border-yellow-500 p-3 text-sm">
            🔒 Live trading unlocks at {CONFIDENCE_REQUIRED}% confidence.  
            Trade consistently in demo or hold an NFT to bypass.
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
        <Stat label="Equity" value={usd(equity)} />
        <Stat label="P&L" value={usd(pnl)} />
        <Stat label="Wins / Losses" value={`${wins} / ${losses}`} />
        <Stat label="Streak" value={`🔥 ${streak}`} />
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 mt-4 flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-4 py-3 rounded-xl bg-indigo-600 font-semibold"
        >
          {running ? "Stop" : "Auto Run"}
        </button>
      </div>

      {/* Chart */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <TradingOverview
          feed={{
            equity,
            pnl,
            wins,
            losses,
            running,
            mode,
            ts: Date.now(),
          }}
        />
      </div>

      {/* Achievements */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <h3 className="font-semibold mb-2">🏆 Achievements</h3>
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a}
              className="px-3 py-1 rounded-full bg-emerald-600/20 border border-emerald-400 text-xs"
            >
              {a}
            </span>
          ))}
        </div>
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
