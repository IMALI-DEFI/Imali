// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* ===================== API BASE (CRA) ===================== */
const API_ORIGIN =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://api.imali-defi.com");

const API_BASE = String(API_ORIGIN || "").replace(/\/+$/, "");
const TOKEN_KEY = "imali_token"; // must match BotAPI.js

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach token if present (TradeDemo must work WITHOUT token)
api.interceptors.request.use((cfg) => {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  } catch {
    // ignore
  }
  return cfg;
});

/* ===================== CONSTANTS ===================== */
const STRATEGIES = [
  { value: "momentum", label: "Growth (Momentum)" },
  { value: "mean_reversion", label: "Conservative (Mean Reversion)" },
  { value: "ai_weighted", label: "Balanced (AI Weighted)" },
  { value: "volume_spike", label: "Aggressive (Volume Spike)" },
];

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
  { value: "stock", label: "Stocks" },
  { value: "bundle", label: "Bundle" },
];

// Owner override (optional)
const OWNER_EMAILS = ["wayne@imali-defi.com", "admin@imali-defi.com"];

/* ===================== HELPERS ===================== */
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;

function safeLower(v) {
  return String(v || "").toLowerCase();
}
function pickAllowed(v, allowed, fallback) {
  const x = safeLower(v);
  return allowed.includes(x) ? x : fallback;
}
function isOwner(me) {
  return OWNER_EMAILS.includes(safeLower(me?.email));
}
function hasToken() {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

/* ===================== COMPONENT ===================== */
export default function TradeDemo() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  /* ---- Auth/session (optional for demo) ---- */
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState(null);
  const [activation, setActivation] = useState(null);
  const [authHint, setAuthHint] = useState(""); // non-blocking messaging

  /* ---- Plan + Strategy selections ---- */
  const [plan, setPlan] = useState("starter");
  const [strategy, setStrategy] = useState("ai_weighted");

  /* ---- Mode ---- */
  const [mode, setMode] = useState("demo"); // demo | live
  const [transitioning, setTransitioning] = useState(false);

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

  /* ===================== INIT: Load selections + query params ===================== */
  useEffect(() => {
    // URL overrides: /trade-demo?plan=pro&strategy=momentum&mode=live
    const planFromUrl = pickAllowed(
      params.get("plan") || params.get("tier"),
      PLANS.map((p) => p.value),
      ""
    );
    const stratFromUrl = pickAllowed(
      params.get("strategy"),
      STRATEGIES.map((s) => s.value),
      ""
    );
    const modeFromUrl = pickAllowed(params.get("mode"), ["demo", "live"], "");

    // localStorage fallbacks
    let planFromStore = "";
    let stratFromStore = "";
    try {
      planFromStore = localStorage.getItem("imali_plan") || "";
      stratFromStore = localStorage.getItem("imali_strategy") || "";
    } catch {
      // ignore
    }

    const nextPlan =
      planFromUrl || pickAllowed(planFromStore, PLANS.map((p) => p.value), "starter");
    const nextStrat =
      stratFromUrl ||
      pickAllowed(stratFromStore, STRATEGIES.map((s) => s.value), "ai_weighted");

    setPlan(nextPlan);
    setStrategy(nextStrat);

    // IMPORTANT: TradeDemo should be usable without login.
    // If someone links /trade-demo?mode=live, we’ll show a gated prompt, not block the page.
    if (modeFromUrl) setMode(modeFromUrl);
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

  /* ===================== OPTIONAL: Load /me if token exists ===================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setAuthHint("");
      const tokenPresent = hasToken();

      if (!tokenPresent) {
        if (!mounted) return;
        setMe(null);
        setActivation(null);
        setAuthChecked(true);
        return;
      }

      try {
        const [meRes, actRes] = await Promise.all([
          api.get("/me"),
          api.get("/me/activation-status"),
        ]);
        if (!mounted) return;

        setMe(meRes.data?.user || null);
        setActivation(actRes.data?.status || null);
      } catch (e) {
        if (!mounted) return;

        // If token is stale/bad, don’t block demo—just show hint
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Could not load your account.";
        setAuthHint(msg);
        setMe(null);
        setActivation(null);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const owner = useMemo(() => isOwner(me), [me]);

  // Activation flags (only meaningful when logged in)
  const tradingEnabled = !!activation?.trading_enabled;
  const billingComplete = !!activation?.billing_complete;

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

  // Live is allowed ONLY if logged in AND backend says trading is enabled, OR owner override.
  const tokenPresent = hasToken();
  const canGoLive = owner || (tokenPresent && tradingEnabled);

  /* ===================== ACHIEVEMENTS ===================== */
  useEffect(() => {
    const list = [];
    if (wins + losses > 0) list.push("🚀 First Trade");
    if (streak >= 7) list.push("🔥 7-Day Streak");
    if (pnl > 0) list.push("💰 Profitable Session");
    if (plan !== "starter") list.push("⭐ Paid Plan");
    if (owner) list.push("👑 Owner");
    setAchievements(list);
  }, [wins, losses, streak, pnl, plan, owner]);

  /* ===================== SIMULATED TICKER ===================== */
  useEffect(() => {
    if (!running || mode !== "demo") return;

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

      // broadcast for dashboard widgets (demo)
      window.dispatchEvent(
        new CustomEvent("trade-demo:update", {
          detail: {
            mode,
            plan,
            strategy,
            pnl,
            equity,
            wins,
            losses,
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
  }, [running, mode, plan, strategy, pnl, equity, wins, losses]);

  /* ===================== LIVE SWITCH ===================== */
  const switchToLive = async () => {
    if (mode === "live") return;

    // TradeDemo is public. Live is gated.
    if (!hasToken()) {
      // No login gate on TradeDemo — we just route to Signup when they choose Live.
      nav("/signup");
      return;
    }

    try {
      setTransitioning(true);

      // Re-check activation right before switching
      const actRes = await api.get("/me/activation-status");
      const fresh = actRes.data?.status || null;
      setActivation(fresh);

      const liveOk = owner || !!fresh?.trading_enabled;
      if (!liveOk) {
        setTransitioning(false);
        nav("/activation"); // user finishes billing / enabling trading
        return;
      }

      // Stop demo loop and switch
      setRunning(false);
      setTimeout(() => {
        setMode("live");
        setTransitioning(false);

        window.dispatchEvent(
          new CustomEvent("trade-demo:update", {
            detail: {
              mode: "live",
              plan,
              strategy,
              pnl,
              equity,
              wins,
              losses,
              running: false,
              ts: Date.now(),
            },
          })
        );
      }, 900);
    } catch {
      setTransitioning(false);
      nav("/activation");
    }
  };

  const goToDashboard = () => {
    // Dashboard is the ONLY place that should require auth.
    if (!hasToken()) {
      nav("/signup");
      return;
    }
    // Use whatever route you actually configured (common: /dashboard)
    nav("/dashboard");
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-slate-950 text-white relative">
      {/* Transition overlay */}
      {transitioning && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="text-center space-y-2 animate-pulse">
            <div className="text-2xl font-bold">Switching to LIVE</div>
            <div className="text-sm text-white/70">Checking activation status…</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Trade {mode === "demo" ? "Demo" : "Live"}</h1>

          <div className="text-xs text-white/60">
            {mode === "demo" ? (
              <span className="text-emerald-300">✅ Public demo (no login required)</span>
            ) : owner ? (
              <span className="text-emerald-300">👑 Owner override</span>
            ) : canGoLive ? (
              <span className="text-emerald-300">✅ Live enabled</span>
            ) : (
              <span className="text-amber-300">
                🔒 Live gated — complete signup + activation
              </span>
            )}
          </div>

          <div className="text-xs text-white/40 mt-1">API: {API_BASE}</div>

          {/* Non-blocking auth hint (only shows if token exists but is broken) */}
          {!!authHint && (
            <div className="mt-2 text-xs text-amber-200/80">
              Account check: {authHint}
            </div>
          )}
        </div>

        {/* Plan + Strategy + Live button */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            disabled={mode === "live"}
            title={mode === "live" ? "Stop live to change plan" : "Choose plan"}
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                Plan: {p.label}
              </option>
            ))}
          </select>

          <select
            className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            disabled={mode === "live"}
            title={mode === "live" ? "Stop live to change strategy" : "Choose strategy"}
          >
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value}>
                Strategy: {s.label}
              </option>
            ))}
          </select>

          <button
            disabled={mode === "live"}
            onClick={switchToLive}
            className={`px-4 py-2 rounded-xl font-semibold ${
              mode === "live"
                ? "bg-slate-700 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
            title={
              hasToken()
                ? "Go live (requires activation)"
                : "Go live (requires signup first)"
            }
          >
            Go Live
          </button>

          {/* Only show activation button when token exists but live is not enabled */}
          {hasToken() && !owner && authChecked && !tradingEnabled && (
            <button
              onClick={() => nav("/activation")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Activation
            </button>
          )}

          {/* If no token, give a clean CTA (NOT login) */}
          {!hasToken() && (
            <button
              onClick={() => nav("/signup")}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
            >
              Signup to Go Live
            </button>
          )}
        </div>
      </div>

      {/* Banner: only meaningful if user is logged in */}
      {hasToken() && !owner && authChecked && !canGoLive && (
        <div className="max-w-7xl mx-auto px-4 mb-3">
          <div className="rounded-lg bg-amber-600/15 border border-amber-500/40 p-3 text-sm text-white/80">
            Live trading is disabled for your account.
            <span className="text-white/60">
              {" "}
              (billing_complete={String(!!billingComplete)} · trading_enabled=
              {String(!!tradingEnabled)})
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 px-4">
        <Stat label="Plan" value={plan} />
        <Stat label="Strategy" value={strategy} />
        <Stat label="Equity" value={usd(equity)} />
        <Stat label="P&L" value={usd(pnl)} />
        <Stat label="Confidence" value={`${confidence}%`} />
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 mt-4 flex flex-wrap gap-3">
        {mode === "demo" ? (
          <button
            onClick={() => setRunning((r) => !r)}
            className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            {running ? "Stop Demo" : "Auto Run Demo"}
          </button>
        ) : (
          <button
            onClick={() => {
              alert("Live mode UI is enabled. Next: wire your real bot start/stop endpoints.");
            }}
            className="px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold"
          >
            Start Live Bot (placeholder)
          </button>
        )}

        <button
          onClick={() => {
            setMode("demo");
            setRunning(false);
          }}
          disabled={mode === "demo"}
          className={`px-4 py-3 rounded-xl font-semibold ${
            mode === "demo"
              ? "bg-slate-700 opacity-60 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/15 border border-white/10"
          }`}
        >
          Back to Demo
        </button>

        <button
          onClick={goToDashboard}
          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
          title={hasToken() ? "Open Member Dashboard" : "Signup required"}
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
            mode,
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

        {/* Small CTA block (only if not signed up) */}
        {!hasToken() && (
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/80">
            Demo is free. When you’re ready to go live, create a quick account and finish activation.
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => nav("/signup")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold"
              >
                Signup to Go Live
              </button>
              <button
                onClick={() => nav("/pricing")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"
              >
                View Plans
              </button>
            </div>
          </div>
        )}
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
