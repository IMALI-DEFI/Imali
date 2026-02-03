// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ===================== CONSTANTS ===================== */

/**
 * Internals stay the same (values):
 * - mean_reversion, ai_weighted, momentum, volume_spike
 * But labels are now novice-first everywhere (dropdown + cards).
 */
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative" },
  { value: "ai_weighted", label: "Balanced" },
  { value: "momentum", label: "Growth" },
  { value: "volume_spike", label: "Aggressive" },
];

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
  { value: "stock", label: "Stocks" },
  { value: "bundle", label: "Bundle" },
];

/* ===================== NOVICE DISPLAY MAPS ===================== */
const STRATEGY_NOVICE = {
  mean_reversion: { title: "Conservative", sub: "Lower risk • slower trades" },
  ai_weighted: { title: "Balanced", sub: "Balanced risk • AI-assisted" },
  momentum: { title: "Growth", sub: "Trend-focused • moderate risk" },
  volume_spike: { title: "Aggressive", sub: "High risk • fast moves" },
};

const PLAN_NFT = {
  starter: { name: "Starter Pass NFT", icon: "🎟️" },
  pro: { name: "Pro Pass NFT", icon: "⭐" },
  elite: { name: "Elite Pass NFT", icon: "👑" },
  stock: { name: "Stock Access NFT", icon: "📈" },
  bundle: { name: "Bundle VIP NFT", icon: "🧩" },
};

/* ===================== HELPERS ===================== */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const usd = (n = 0) => `$${Number(n).toFixed(2)}`;

function safeLower(v) {
  return String(v || "").toLowerCase();
}

function pickAllowed(v, allowed, fallback) {
  const x = safeLower(v);
  return allowed.includes(x) ? x : fallback;
}

function sentenceCasePlan(v) {
  const s = String(v || "").toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ===================== COMPONENT ===================== */
export default function TradeDemo() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  /* ---- Plan + Strategy selections (public) ---- */
  const [plan, setPlan] = useState("starter");
  const [strategy, setStrategy] = useState("ai_weighted");

  /* ---- Trading simulation ---- */
  const [running, setRunning] = useState(false);
  const [equity, setEquity] = useState(1000);
  const [pnl, setPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  /* ---- Gamification ---- */
  const [streak, setStreak] = useState(0);
  const [lastTradeDay, setLastTradeDay] = useState(null);
  const [achievements, setAchievements] = useState([]);

  const tickerRef = useRef(null);

  /* ===================== INIT: Load saved selections + query params ===================== */
  useEffect(() => {
    // URL overrides (optional): /trade-demo?plan=pro&strategy=momentum
    const allowedPlans = PLANS.map((p) => p.value);
    const allowedStrats = STRATEGIES.map((s) => s.value);

    const planFromUrl = pickAllowed(params.get("plan") || params.get("tier"), allowedPlans, "");
    const stratFromUrl = pickAllowed(params.get("strategy"), allowedStrats, "");

    // localStorage fallbacks
    let planFromStore = "";
    let stratFromStore = "";
    try {
      planFromStore = localStorage.getItem("imali_plan") || "";
      stratFromStore = localStorage.getItem("imali_strategy") || "";
    } catch {
      // ignore
    }

    const nextPlan = planFromUrl || pickAllowed(planFromStore, allowedPlans, "starter");
    const nextStrat = stratFromUrl || pickAllowed(stratFromStore, allowedStrats, "ai_weighted");

    setPlan(nextPlan);
    setStrategy(nextStrat);
  }, [params]);

  /* Persist selections */
  useEffect(() => {
    try {
      localStorage.setItem("imali_plan", plan);
      localStorage.setItem("imali_strategy", strategy);
    } catch {
      // ignore
    }
  }, [plan, strategy]);

  /* ===================== CONFIDENCE (demo unlock) ===================== */
  const confidence = useMemo(() => {
    const total = wins + losses;
    let score = 0;
    if (total > 0) score += clamp((wins / total) * 40, 0, 40);
    score += clamp(total * 1.2, 0, 30);
    score += clamp(streak * 5, 0, 20);
    if (plan !== "starter") score += 10;
    return clamp(Math.round(score), 0, 100);
  }, [wins, losses, streak, plan]);

  /* ===================== ACHIEVEMENTS ===================== */
  useEffect(() => {
    const list = [];
    if (wins + losses > 0) list.push("🚀 First Trade");
    if (streak >= 7) list.push("🔥 7-Day Streak");
    if (pnl > 0) list.push("💰 Profitable Session");
    if (plan !== "starter") list.push("⭐ Paid Plan");
    setAchievements(list);
  }, [wins, losses, streak, pnl, plan]);

  /* ===================== SIMULATED TICKER ===================== */
  useEffect(() => {
    if (!running) return;

    tickerRef.current = setInterval(() => {
      const delta = (Math.random() - 0.45) * 25;

      setPnl((p) => p + delta);
      setEquity((e) => e + delta);

      if (delta > 0) setWins((w) => w + 1);
      else setLosses((l) => l + 1);

      // daily streak
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

      // broadcast for dashboard widgets
      window.dispatchEvent(
        new CustomEvent("trade-demo:update", {
          detail: {
            mode: "demo",
            plan,
            strategy,
            // keep event lightweight; overview gets real props below
            pnl: undefined,
            equity: undefined,
            wins: undefined,
            losses: undefined,
            running: true,
            ts: Date.now(),
          },
        })
      );
    }, 3500);

    return () => {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    };
  }, [running, plan, strategy]);

  /* ===================== NOVICE DISPLAY VALUES ===================== */
  const planPretty = sentenceCasePlan(plan);
  const planNft = PLAN_NFT[plan] || { name: "Membership NFT", icon: "🪪" };
  const stratMeta = STRATEGY_NOVICE[strategy] || STRATEGY_NOVICE.ai_weighted;

  /* ===================== ACTIONS ===================== */
  const goLive = () => {
    nav("/signup");
  };

  const resetDemo = () => {
    setRunning(false);
    setEquity(1000);
    setPnl(0);
    setWins(0);
    setLosses(0);
    setStreak(0);
    setLastTradeDay(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative">
      {/* Header */}
      <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Trade Demo</h1>
          <div className="text-xs text-white/60">
            Public demo — no login required. Live trading unlocks after signup + activation.
          </div>
        </div>

        {/* Membership + Trading Style + Go Live */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Membership */}
          <div className="flex flex-col gap-1">
            <select
              className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              title="Choose membership (demo only)"
            >
              {PLANS.map((p) => (
                <option key={p.value} value={p.value}>
                  Membership: {p.label}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-white/50 pl-1">
              {planNft.icon} NFT included: {planNft.name}
            </div>
          </div>

          {/* Trading Style */}
          <div className="flex flex-col gap-1">
            <select
              className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              title="Choose trading style (demo only)"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  Trading Style: {s.label}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-white/50 pl-1">{stratMeta.sub}</div>
          </div>

          <button
            onClick={goLive}
            className="px-4 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500"
          >
            Go Live (Signup)
          </button>
        </div>
      </div>

      {/* Stats (novice terminology) */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 px-4">
        <Stat label="Membership" value={planPretty} sub={`${planNft.icon} NFT: ${planNft.name}`} />
        <Stat label="Trading Style" value={stratMeta.title} sub={stratMeta.sub} />
        <Stat label="Account Value" value={usd(equity)} sub="Demo balance" />
        <Stat
          label="Today’s Gain/Loss"
          value={usd(pnl)}
          sub={pnl >= 0 ? "You’re up (demo)" : "You’re down (demo)"}
        />
        <Stat label="Bot Confidence" value={`${confidence}%`} sub="Higher = more reliable signals" />
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
        >
          {running ? "Stop Demo" : "Auto Run Demo"}
        </button>

        <button
          onClick={resetDemo}
          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
        >
          Reset
        </button>

        <button
          onClick={() => nav("/memberdashboard")}
          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
        >
          Member Dashboard
        </button>
      </div>

      {/* Chart / Overview */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <TradingOverview
          feed={{
            equity,
            pnl,
            wins,
            losses,
            running,
            mode: "demo",
            plan,
            strategy,
            ts: Date.now(),
          }}
        />
      </div>

      {/* Achievements */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-10">
        <h3 className="font-semibold mb-2">🏆 Achievements</h3>
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a}
              className="px-3 py-1 rounded-full bg-emerald-600/15 border border-emerald-400/50 text-xs"
            >
              {a}
            </span>
          ))}
          {achievements.length === 0 && (
            <span className="text-xs text-white/50">Trade in demo to unlock achievements.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== SMALL ===================== */
function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-bold leading-tight">{value}</div>
      {sub ? <div className="mt-1 text-xs text-white/50">{sub}</div> : null}
    </div>
  );
}
