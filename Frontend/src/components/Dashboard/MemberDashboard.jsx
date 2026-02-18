// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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

/* ===================== CONSTANTS ===================== */
const TIER_ORDER = ["starter", "pro", "elite", "stock", "bundle"];
const POLL_INTERVAL = 60_000;
const RETRY_BASE_DELAY = 2000;
const MAX_RETRIES = 3;

/* ===================== TIER STYLES ===================== */
const TIER_STYLES = {
  starter: { color: "text-amber-600", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: "🎟️" },
  pro: { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", icon: "⭐" },
  elite: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", icon: "👑" },
  stock: { color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: "📈" },
  bundle: { color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: "🧩" },
};

/* ===================== HELPERS ===================== */
const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return TIER_ORDER.includes(t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) =>
  TIER_ORDER.indexOf(normalizeTier(userTier)) >= TIER_ORDER.indexOf(normalizeTier(requiredTier));

const normalizeExchange = (exchange) => {
  if (!exchange) return "DEX";
  const u = String(exchange).toUpperCase();
  if (u.includes("OKX")) return "OKX";
  if (u.includes("ALPACA")) return "ALPACA";
  if (u.includes("DEX")) return "DEX";
  if (u.includes("FUTURE")) return "FUTURES";
  return "DEX";
};

const formatMoney = (n) => {
  const val = Number(n) || 0;
  const sign = val >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(val).toFixed(2)}`;
};

const formatUsd = (n) => {
  const val = Number(n) || 0;
  return `$${val.toFixed(2)}`;
};

/* ===================== RATE-LIMITED FETCH ===================== */
const fetchWithRetry = async (url, retries = MAX_RETRIES, delay = RETRY_BASE_DELAY) => {
  try {
    const res = await api.get(url);
    return res;
  } catch (err) {
    if (retries > 0 && err?.response?.status === 429) {
      const retryAfter = parseInt(err.response.headers?.["retry-after"] || "0", 10) * 1000;
      const waitTime = Math.max(retryAfter, delay);
      await new Promise((r) => setTimeout(r, waitTime));
      return fetchWithRetry(url, retries - 1, delay * 2);
    }
    throw err;
  }
};

/* ===================== UI PRIMITIVES ===================== */
const Card = ({ className = "", children }) => (
  <div className={`bg-white/5 border border-white/10 rounded-2xl ${className}`}>{children}</div>
);

const CardHeader = ({ icon, title, right, subtitle }) => (
  <div className="flex items-start justify-between gap-3 p-3 sm:p-4">
    <div className="flex items-start gap-2 min-w-0">
      {icon ? <div className="text-lg sm:text-xl flex-shrink-0">{icon}</div> : null}
      <div className="min-w-0">
        <div className="font-semibold text-sm sm:text-base leading-tight truncate">{title}</div>
        {subtitle ? <div className="text-[11px] sm:text-xs text-white/50 mt-1">{subtitle}</div> : null}
      </div>
    </div>
    {right ? <div className="flex-shrink-0">{right}</div> : null}
  </div>
);

const CollapsibleSection = ({ title, icon, subtitle, defaultOpen = true, right, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <CardHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          right={
            <div className="flex items-center gap-2">
              {right}
              <span className="text-white/40 text-sm">{open ? "▾" : "▸"}</span>
            </div>
          }
        />
      </button>
      {open ? <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div> : null}
    </Card>
  );
};

/* ===================== PROGRESS RING ===================== */
const ProgressRing = ({ percent, size = 44, stroke = 3, color = "#10b981", children }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

/* ===================== MINI BAR CHART ===================== */
const MiniBarChart = ({ data, height = 56 }) => {
  if (!data || !data.length) {
    return (
      <div className="flex items-center justify-center text-xs text-white/30" style={{ height }}>
        No trades yet — start the bot 🤖
      </div>
    );
  }
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.slice(-24).map((d, i) => {
        const h = (Math.abs(d.value) / max) * height * 0.92;
        return (
          <div
            key={i}
            title={`${d.label}: ${formatMoney(d.value)}`}
            className={`rounded-t flex-1 min-w-[3px] max-w-[14px] transition-opacity hover:opacity-80 ${
              d.value >= 0 ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ height: Math.max(h, 2) }}
          />
        );
      })}
    </div>
  );
};

/* ===================== STAT CARD (COMPACT) ===================== */
const StatCard = ({ icon, label, value, subValue, color = "white" }) => {
  const valueColor =
    color === "green"
      ? "text-emerald-400"
      : color === "red"
      ? "text-red-400"
      : color === "blue"
      ? "text-blue-400"
      : color === "purple"
      ? "text-purple-400"
      : "text-white";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg flex-shrink-0">{icon}</span>
          <span className="text-[11px] sm:text-xs text-white/50 truncate">{label}</span>
        </div>
      </div>
      <div className={`mt-2 text-base sm:text-xl font-bold leading-tight ${valueColor} truncate`}>{value}</div>
      {subValue ? <div className="mt-1 text-[10px] sm:text-xs text-white/30 truncate">{subValue}</div> : null}
    </div>
  );
};

/* ===================== LEVEL BADGE ===================== */
const LevelBadge = ({ trades, winRate, pnl }) => {
  const level = useMemo(() => {
    let xp = 0;
    xp += Math.min(trades, 50) * 2;
    xp += Math.max(0, winRate - 40) * 1.5;
    xp += Math.max(0, pnl) * 0.1;

    if (xp >= 200) return { name: "🏆 Legend", color: "text-yellow-400", xp, next: 200 };
    if (xp >= 120) return { name: "💎 Diamond", color: "text-cyan-400", xp, next: 200 };
    if (xp >= 70) return { name: "🥇 Gold", color: "text-yellow-300", xp, next: 120 };
    if (xp >= 30) return { name: "🥈 Silver", color: "text-gray-200", xp, next: 70 };
    return { name: "🥉 Bronze", color: "text-amber-600", xp, next: 30 };
  }, [trades, winRate, pnl]);

  const progress = (level.xp / level.next) * 100;
  const toNext = Math.max(0, Math.ceil(level.next - level.xp));

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs text-white/55">Trader Level</div>
          <div className={`text-base sm:text-lg font-bold leading-tight ${level.color} truncate`}>{level.name}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] text-white/40">XP</div>
          <div className="text-sm sm:text-base font-bold">{Math.floor(level.xp)}</div>
        </div>
      </div>

      <div className="mt-3 w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="mt-1 text-[10px] sm:text-xs text-white/40">
        {Math.floor(level.xp)} / {level.next} XP — {toNext} to next
      </div>
    </Card>
  );
};

/* ===================== EXCHANGE CARD (COMPACT) ===================== */
const ExchangeCard = ({ name, connected, mode, trades, icon, color = "blue" }) => {
  const pnl = (trades || []).reduce((sum, t) => sum + (t.pnl_usd || 0), 0);

  const winRate = useMemo(() => {
    if (!trades || !trades.length) return "0.0";
    const wins = trades.filter((t) => (t.pnl_usd || 0) > 0).length;
    return ((wins / trades.length) * 100).toFixed(1);
  }, [trades]);

  const chartData = useMemo(
    () => (trades || []).slice(-15).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl_usd || 0 })),
    [trades]
  );

  const colorMap = {
    blue: "from-blue-600/15 to-blue-600/5 border-blue-500/25",
    emerald: "from-emerald-600/15 to-emerald-600/5 border-emerald-500/25",
    purple: "from-purple-600/15 to-purple-600/5 border-purple-500/25",
    amber: "from-amber-600/15 to-amber-600/5 border-amber-500/25",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} border rounded-2xl p-3 sm:p-4 overflow-hidden`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{name}</div>
            {connected ? (
              <span
                className={`inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full ${
                  mode === "live" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {mode || "paper"}
              </span>
            ) : (
              <span className="inline-flex mt-1 text-[10px] text-yellow-300">⚠️ Disconnected</span>
            )}
          </div>
        </div>

        <ProgressRing percent={Number(winRate)} size={40} stroke={3} color={Number(winRate) >= 50 ? "#10b981" : "#ef4444"}>
          <span className="text-[10px] font-bold">{winRate}%</span>
        </ProgressRing>
      </div>

      <div className="mt-3">
        <MiniBarChart data={chartData} height={28} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/40">Trades</div>
          <div className="text-sm font-bold">{(trades || []).length}</div>
        </div>
        <div className="bg-black/30 rounded-xl p-2 text-center">
          <div className="text-[10px] text-white/40">P&L</div>
          <div className={`text-sm font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(pnl)}</div>
        </div>
      </div>
    </div>
  );
};

/* ===================== UPGRADE CARD ===================== */
const UpgradeCard = ({ name, icon, description, features, colorKey, currentTier, requiredTier }) => {
  const nav = useNavigate();
  const unlocked = tierAtLeast(currentTier, requiredTier);
  const tierStyle = TIER_STYLES[requiredTier] || { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" };

  const gradMap = {
    blue: "from-blue-600/10 to-blue-600/5 border-blue-500/30",
    purple: "from-purple-600/10 to-purple-600/5 border-purple-500/30",
    emerald: "from-emerald-600/10 to-emerald-600/5 border-emerald-500/30",
    amber: "from-amber-600/10 to-amber-600/5 border-amber-500/30",
  };

  const unlockedClass = `bg-gradient-to-br ${gradMap[colorKey] || gradMap.blue}`;
  const lockedClass = "bg-white/5 border-white/10 opacity-80";

  return (
    <div className={`rounded-2xl p-3 sm:p-4 border transition-all overflow-hidden ${unlocked ? unlockedClass : lockedClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{name}</div>
            <div className={`text-[10px] mt-1 ${tierStyle.color}`}>{unlocked ? "✓ Active" : `🔒 ${requiredTier}`}</div>
          </div>
        </div>
        {!unlocked ? (
          <span className={`text-[10px] px-2 py-1 rounded-full ${tierStyle.bg} ${tierStyle.color} border ${tierStyle.border}`}>
            {requiredTier}
          </span>
        ) : null}
      </div>

      <p className="text-[11px] sm:text-xs text-white/55 mt-2">{description}</p>

      <ul className="mt-3 space-y-1">
        {(features || []).slice(0, 4).map((f, i) => (
          <li key={i} className="text-[11px] sm:text-xs text-white/45 flex items-start gap-2">
            <span className="text-emerald-400 mt-[2px]">✓</span>
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>

      {!unlocked ? (
        <button
          onClick={() => nav("/pricing")}
          className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Upgrade →
        </button>
      ) : null}
    </div>
  );
};

/* ===================== TRADE FEED ===================== */
const TradeFeed = ({ trades }) => {
  if (!trades || !trades.length) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        <div className="text-3xl mb-2">📋</div>
        Trades appear here when the bot starts
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
      {trades
        .slice(-20)
        .reverse()
        .map((t, i) => {
          const isLatest = i === 0;
          const isWin = (t.pnl_usd || 0) >= 0;

          return (
            <div
              key={t.id || i}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-all overflow-hidden ${
                isLatest ? "bg-white/10 border border-white/10" : "bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base flex-shrink-0">
                  {normalizeExchange(t.exchange) === "OKX" ? "🔷" : normalizeExchange(t.exchange) === "ALPACA" ? "📈" : "🦄"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm truncate">{t.symbol || "BTC"}</span>
                    <span className="text-[10px] text-white/40 hidden xs:inline">{normalizeExchange(t.exchange)}</span>
                  </div>
                  <div className="text-[10px] text-white/35 truncate hidden sm:block">{t.action || "Trade"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(t.pnl_usd || 0)}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
};

/* ===================== SETUP BANNER ===================== */
const SetupBanner = ({ billing, connections, trading, onCTA }) => {
  if (billing && connections && trading) return null;

  const steps = [
    { done: billing, label: "Billing", icon: "💳" },
    { done: connections, label: "Connect", icon: "🔌" },
    { done: trading, label: "Enable", icon: "⚡" },
  ];

  const currentStep = Math.max(0, steps.findIndex((s) => !s.done));
  const stepText = !billing ? "Add payment" : !connections ? "Connect services" : "Enable trading";

  return (
    <Card className="p-3 sm:p-4 bg-gradient-to-r from-blue-600/15 to-purple-600/15 border-blue-500/25">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl flex-shrink-0">🚀</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm sm:text-base leading-tight">Complete your setup</p>
            <p className="text-[11px] sm:text-xs text-white/50 mt-1">
              Step {currentStep + 1}/3 — {steps[currentStep]?.label}
            </p>
          </div>
        </div>

        <button
          onClick={onCTA}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-colors"
        >
          {stepText} →
        </button>
      </div>
    </Card>
  );
};

/* =====================================================================
   MAIN DASHBOARD COMPONENT
===================================================================== */
export default function MemberDashboard() {
  const nav = useNavigate();
  const { user: authUser, activation, setActivation, refreshActivation } = useAuth();

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchInFlight = useRef(false);
  const pollRef = useRef(null);

  /* ================ DERIVED STATE ================ */
  const normalizedTier = useMemo(() => normalizeTier(authUser?.tier), [authUser?.tier]);
  const tierStyle = TIER_STYLES[normalizedTier] || TIER_STYLES.starter;

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;

  const connectionsComplete = useMemo(() => {
    const needsOkx = ["starter", "pro", "bundle"].includes(normalizedTier);
    const needsAlpaca = ["starter", "bundle"].includes(normalizedTier);
    const needsWallet = ["elite", "stock", "bundle"].includes(normalizedTier);
    return (!needsOkx || okxConnected) && (!needsAlpaca || alpacaConnected) && (!needsWallet || walletConnected);
  }, [normalizedTier, okxConnected, alpacaConnected, walletConnected]);

  const activationComplete = billingComplete && connectionsComplete && tradingEnabled;

  /* ================ LOAD TRADES ================ */
  const loadTrades = useCallback(async () => {
    if (!activationComplete) {
      setTrades([]);
      setLoading(false);
      return;
    }
    if (fetchInFlight.current) return;

    fetchInFlight.current = true;
    try {
      const res = await fetchWithRetry("/api/sniper/trades");
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch (err) {
      if (err?.response?.status !== 429) console.warn("[Dashboard] Failed to load trades:", err?.message);
    } finally {
      fetchInFlight.current = false;
      setLoading(false);
    }
  }, [activationComplete]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (!activationComplete) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadTrades, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activationComplete, loadTrades]);

  /* ================ METRICS ================ */
  const totalPnL = useMemo(() => trades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [trades]);

  const winRate = useMemo(() => {
    if (!trades.length) return "0.0";
    const wins = trades.filter((t) => (t.pnl_usd || 0) > 0).length;
    return ((wins / trades.length) * 100).toFixed(1);
  }, [trades]);

  const confidence = useMemo(() => {
    let s = 40;
    if (Number(winRate) > 60) s += 20;
    if (trades.length > 20) s += 15;
    if (activationComplete) s += 15;
    return Math.min(s, 100);
  }, [winRate, trades.length, activationComplete]);

  const todayTrades = useMemo(() => {
    const today = new Date().toDateString();
    return trades.filter((t) => new Date(t.created_at || t.timestamp || Date.now()).toDateString() === today);
  }, [trades]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [todayTrades]);

  const chartData = useMemo(
    () => trades.slice(-24).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl_usd || 0 })),
    [trades]
  );

  /* ================ ACTIONS ================ */
  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await BotAPI.toggleTrading(enabled);

      if (refreshActivation) {
        await refreshActivation();
      } else {
        const res = await BotAPI.activationStatus();
        if (setActivation) setActivation(res?.status ?? res);
      }

      setBanner({ type: "success", message: enabled ? "✅ Trading enabled!" : "⏸ Trading paused." });
      if (enabled) await loadTrades();
    } catch (err) {
      setBanner({ type: "error", message: err?.response?.data?.message || "Couldn't update trading status" });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    if (!activationComplete) {
      setBanner({ type: "error", message: "Finish setup first" });
      return;
    }
    try {
      setBusy(true);
      const mode = activation?.okx_mode === "live" || activation?.alpaca_mode === "live" ? "live" : "paper";
      const res = await BotAPI.startBot({ mode });
      if (res?.started) {
        setBanner({ type: "success", message: `🤖 Bot started in ${mode} mode!` });
        setTimeout(loadTrades, 2500);
      } else {
        setBanner({ type: "error", message: "Bot didn't start" });
      }
    } catch {
      setBanner({ type: "error", message: "Bot didn't start" });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupCTA = () => {
    if (!billingComplete) nav("/billing");
    else nav("/activation");
  };

  /* ================ LOADING / AUTH ================ */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in to continue</p>
          <button onClick={() => nav("/login")} className="px-6 py-2 bg-emerald-600 rounded-xl font-semibold">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = authUser.email?.split("@")[0] || "Trader";

  /* ================ RENDER ================ */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-3 sm:space-y-5">
        {/* Banner */}
        {banner ? (
          <div
            className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-sm ${
              banner.type === "error"
                ? "bg-red-600/10 border-red-500/40 text-red-200"
                : "bg-emerald-600/10 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span className="min-w-0">{banner.message}</span>
            <button onClick={() => setBanner(null)} className="text-white/50 hover:text-white flex-shrink-0">
              ✕
            </button>
          </div>
        ) : null}

        <SetupBanner billing={billingComplete} connections={connectionsComplete} trading={tradingEnabled} onCTA={handleSetupCTA} />

        {/* Header */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight min-w-0 truncate">👋 Hey, {displayName}!</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold ${tierStyle.bg} ${tierStyle.color} border ${tierStyle.border}`}
                >
                  <span>{tierStyle.icon}</span>
                  <span className="capitalize">{normalizedTier}</span>
                </span>
                {activationComplete ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Active
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] sm:text-sm text-white/55 mt-1">Your trading dashboard</p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
              <button
                onClick={() => toggleTrading(!tradingEnabled)}
                disabled={busy || !activationComplete}
                className={`px-3 sm:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                  tradingEnabled ? "bg-red-600/80 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {busy ? "..." : tradingEnabled ? "⏸ Pause" : "▶ Enable"}
              </button>
              <button
                onClick={startBot}
                disabled={!tradingEnabled || busy || !activationComplete}
                className="px-3 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm disabled:opacity-50"
              >
                {busy ? "..." : "🚀 Start"}
              </button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          <StatCard icon="💰" label="Account" value={formatUsd(1000 + totalPnL)} subValue="Start $1k" />
          <StatCard icon="📈" label="Today" value={formatMoney(todayPnL)} color={todayPnL >= 0 ? "green" : "red"} />
          <StatCard icon="📊" label="Total" value={formatMoney(totalPnL)} color={totalPnL >= 0 ? "green" : "red"} />
          <StatCard icon="🎯" label="Win Rate" value={`${winRate}%`} subValue={`${trades.length} trades`} />
          <StatCard icon="🤖" label="Confidence" value={`${confidence}%`} />
        </div>

        {/* Level + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-1">
            <LevelBadge trades={trades.length} winRate={Number(winRate)} pnl={totalPnL} />
          </div>

          <CollapsibleSection icon="📊" title="Recent Results" subtitle={`${trades.length} total trades`} defaultOpen={true}>
            <MiniBarChart data={chartData} height={92} />
          </CollapsibleSection>
        </div>

        {/* Activated content */}
        {activationComplete ? (
          <>
            <CollapsibleSection icon="🔗" title="Your Services" subtitle="Status by exchange" defaultOpen={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <ExchangeCard
                  name="OKX"
                  icon="🔷"
                  color="blue"
                  connected={okxConnected}
                  mode={activation?.okx_mode}
                  trades={trades.filter((t) => normalizeExchange(t.exchange) === "OKX")}
                />

                <ExchangeCard
                  name="Alpaca"
                  icon="📈"
                  color="emerald"
                  connected={alpacaConnected}
                  mode={activation?.alpaca_mode}
                  trades={trades.filter((t) => normalizeExchange(t.exchange) === "ALPACA")}
                />

                {tierAtLeast(normalizedTier, "stock") ? (
                  <ExchangeCard
                    name="DEX"
                    icon="🦄"
                    color="purple"
                    connected={walletConnected}
                    mode={walletConnected ? "active" : null}
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "DEX")}
                  />
                ) : null}

                {tierAtLeast(normalizedTier, "elite") ? (
                  <ExchangeCard
                    name="Futures"
                    icon="📊"
                    color="amber"
                    connected={true}
                    mode="ready"
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "FUTURES")}
                  />
                ) : null}
              </div>
            </CollapsibleSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <CollapsibleSection
                icon="📋"
                title="Live Trades"
                subtitle={tradingEnabled ? "Live feed" : "Paused"}
                defaultOpen={true}
                right={
                  tradingEnabled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Live
                    </span>
                  ) : null
                }
              >
                <TradeFeed trades={trades} />
              </CollapsibleSection>

              <CollapsibleSection icon="⚡" title="Quick Stats" subtitle="Fast glance" defaultOpen={false}>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Best Streak</span>
                    <span className="font-bold">5 🔥</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Day Streak</span>
                    <span className="font-bold">3 📅</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Strategies</span>
                    <span className="font-bold">3/4 🧠</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/50">Avg Trade</span>
                    <span className="font-bold">$125</span>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <CollapsibleSection icon="⚡" title="Upgrades" subtitle="Unlock more modules" defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <UpgradeCard
                  name="Staking"
                  icon="🥩"
                  description="Earn passive rewards"
                  features={["Daily rewards", "No lock-up"]}
                  colorKey="purple"
                  currentTier={normalizedTier}
                  requiredTier="pro"
                />
                <UpgradeCard
                  name="DEX"
                  icon="🦄"
                  description="Trade on DEXes"
                  features={["Uniswap", "MEV protection"]}
                  colorKey="blue"
                  currentTier={normalizedTier}
                  requiredTier="stock"
                />
                <UpgradeCard
                  name="Yield"
                  icon="🌾"
                  description="Liquidity pools"
                  features={["Top pools", "Auto-harvest"]}
                  colorKey="emerald"
                  currentTier={normalizedTier}
                  requiredTier="elite"
                />
                <UpgradeCard
                  name="Futures"
                  icon="📊"
                  description="Leverage trading"
                  features={["Up to 20x", "Auto stop"]}
                  colorKey="amber"
                  currentTier={normalizedTier}
                  requiredTier="elite"
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection icon="🧩" title="Modules" subtitle="Balances, tiers, referrals, demo" defaultOpen={false}>
              <div className="space-y-3">
                <ImaliBalance />
                <TierStatus />
                <RecentTradesTable trades={trades} showExchange={true} tier={normalizedTier} />
                <ReferralSystem />

                {tierAtLeast(normalizedTier, "pro") ? <Staking /> : null}
                {tierAtLeast(normalizedTier, "elite") ? <YieldFarming /> : null}
                {tierAtLeast(normalizedTier, "elite") ? <Futures /> : null}

                <NFTPreview />

                {/* If your dashboard TradeDemo has the “Risk” duplication, this prop lets you hide the extra label there. */}
                <TradeDemo hideInlineRiskLabel={true} />
              </div>
            </CollapsibleSection>
          </>
        ) : (
          <Card className="p-5 sm:p-8 text-center">
            <div className="text-4xl sm:text-6xl mb-3">🤖</div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">Almost ready!</h2>
            <p className="text-[11px] sm:text-sm text-white/55 mb-4 max-w-md mx-auto">
              Complete setup to unlock your dashboard.
            </p>
            <button
              onClick={handleSetupCTA}
              className="px-6 sm:px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 text-sm font-semibold hover:opacity-95"
            >
              Finish Setup →
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
