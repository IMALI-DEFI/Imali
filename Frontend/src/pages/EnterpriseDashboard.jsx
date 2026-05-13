// src/pages/EnterpriseDashboard.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEnterprise } from "../hooks/useEnterprise";
import BotAPI from "../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PAPER_TRADING_BALANCE = 10000;
const REFRESH_COOLDOWN_MS = 12000;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Institutional",
    short: "Safest",
    description: "Looks for dips and safer rebounds.",
    plainEnglish: "The bot waits for price drops, then looks for rebounds.",
    bullets: ["Lower risk", "Steady returns", "Best for testing"],
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most firms",
    short: "Default",
    description: "Uses a mix of multiple trading signals.",
    plainEnglish: "The bot analyzes several signals before deciding.",
    bullets: ["Balanced risk", "Signal based", "Consistent"],
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    bestFor: "Trending markets",
    short: "Aggressive",
    description: "Follows strong price moves.",
    plainEnglish: "The bot rides strong moves in fast markets.",
    bullets: ["Higher risk", "Trend following", "Fast execution"],
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    risk: "Low",
    bestFor: "Advanced firms",
    short: "Advanced",
    description: "Looks for price differences across venues.",
    plainEnglish: "The bot captures small price gaps between exchanges.",
    bullets: ["Advanced", "Price gaps", "Multi-exchange"],
  },
];

const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Team Trade", icon: "🚀" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥" },
  { id: "trades_100", label: "100 Team Trades", icon: "🏆" },
  { id: "profitable", label: "Profitable Month", icon: "💰" },
  { id: "team_full", label: "Full Team", icon: "👥" },
  { id: "api_ready", label: "API Ready", icon: "🔌" },
];

// Static color mappings for Tailwind (Fixes dynamic class issue)
const ACTION_STYLES = {
  indigo: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
  purple: "border-purple-200 bg-purple-50 hover:bg-purple-100",
  green: "border-green-200 bg-green-50 hover:bg-green-100",
  amber: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  pink: "border-pink-200 bg-pink-50 hover:bg-pink-100",
  blue: "border-blue-200 bg-blue-50 hover:bg-blue-100",
};

const STATUS_PILL_STYLES = {
  green: "border-green-300 bg-green-100 text-green-900",
  red: "border-red-300 bg-red-100 text-red-900",
  amber: "border-amber-300 bg-amber-100 text-amber-950",
  blue: "border-blue-300 bg-blue-100 text-blue-900",
  purple: "border-purple-300 bg-purple-100 text-purple-900",
  slate: "border-slate-300 bg-slate-100 text-slate-900",
};

const SETUP_CARD_STYLES = {
  setup: "border-amber-300 bg-amber-50",
  paper: "border-green-300 bg-green-50",
  live: "border-purple-300 bg-purple-50",
  default: "border-blue-300 bg-blue-50",
};

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const getNestedBool = (result, key, fallback) => {
  const direct = result?.[key];
  const nested = result?.data?.[key];
  if (direct === true || direct === false) return direct;
  if (nested === true || nested === false) return nested;
  return fallback;
};

const isAuthError = (err) => {
  const msg = String(err?.message || err?.error || "").toLowerCase();
  const status = Number(err?.status || err?.response?.status || 0);
  return status === 401 || status === 403 || msg.includes("invalid token") || msg.includes("expired token");
};

const isRateLimitError = (err) => {
  const msg = String(err?.message || err?.error || "").toLowerCase();
  const status = Number(err?.status || err?.response?.status || 0);
  return status === 429 || msg.includes("rate limit");
};

const formatTimeLeft = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "expired";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children, helper }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">{children}</h3>
      {helper && <p className="mt-1 text-sm font-semibold text-slate-600">{helper}</p>}
    </div>
  );
}

function StatusPill({ children, tone = "slate", className = "" }) {
  const style = STATUS_PILL_STYLES[tone] || STATUS_PILL_STYLES.slate;
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none sm:text-xs ${style} ${className}`}>
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary", className = "" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] rounded-xl px-4 py-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, helper }) {
  return (
    <Card className="min-h-[110px]">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-600 sm:text-sm">{label}</div>
      <div className="mt-2 break-words text-2xl font-extrabold text-slate-900 sm:text-3xl">{value}</div>
      {helper && <div className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{helper}</div>}
    </Card>
  );
}

function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  const tone = type === "error" 
    ? "border-red-300 bg-red-50 text-red-900" 
    : type === "success" 
      ? "border-green-300 bg-green-50 text-green-900" 
      : "border-blue-300 bg-blue-50 text-blue-900";
  return (
    <div className={`fixed left-3 right-3 top-3 z-[60] rounded-2xl border p-4 text-sm font-bold shadow-xl sm:left-auto sm:right-4 sm:max-w-md ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <span>{message}</span>
        <button type="button" onClick={onClose} className="text-lg leading-none text-slate-700 hover:text-slate-900">×</button>
      </div>
    </div>
  );
}

// Simple API Key Modal Component
function ApiKeyModal({ open, onClose, onConnect }) {
  const [mode, setMode] = useState("paper");
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Connect API Keys</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">Add OKX for crypto and Alpaca for stocks.</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-1 text-3xl font-extrabold text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          🔒 Security tip: Create restricted API keys. Trading permission is okay. Withdrawals should stay disabled.
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">📈 Alpaca — Stocks</h3>
            <div className="space-y-3">
              <select className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="paper">Paper Trading (Recommended)</option>
                <option value="live">Live Trading</option>
              </select>
              <p className="text-xs text-slate-600 text-center">Contact support for API key setup assistance.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">🔷 OKX — Crypto</h3>
            <div className="space-y-3">
              <select className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="paper">Paper Trading (Recommended)</option>
                <option value="live">Live Trading</option>
              </select>
              <p className="text-xs text-slate-600 text-center">Contact support for API key setup assistance.</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button onClick={onConnect} className="flex-1">Save Keys</Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// Live Trading Confirmation Modal
function LiveConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Confirm Live Trading</h3>
        <p className="mt-3 text-sm font-semibold text-slate-700">Live trading uses real money through your organization's connected exchange accounts.</p>
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="font-extrabold text-amber-900">Risk reminder</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-amber-800">
            <li>Your organization can lose money.</li>
            <li>Start with small position sizes.</li>
            <li>Live trading can be stopped anytime.</li>
            <li>Paper trading is safer for testing strategies.</li>
          </ul>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="warning" onClick={onConfirm} disabled={busy} className="w-full">
            {busy ? "Starting..." : "Enable Live Trading"}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EnterpriseDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { getOrganization, getAnalytics, loading: enterpriseLoading } = useEnterprise();
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const refreshTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [organization, setOrganization] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [integrations, setIntegrations] = useState({ alpaca_connected: false, okx_connected: false });
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  const loadDashboardData = useCallback(async ({ silent = false, force = false } = {}) => {
    if (loadingRef.current) return;
    const now = Date.now();

    if (!force && now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) {
      if (!silent) notify("Dashboard was just refreshed. Try again in a few seconds.", "info");
      return;
    }

    loadingRef.current = true;
    lastRefreshRef.current = now;
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const orgResult = await getOrganization();
      if (orgResult.success && mountedRef.current) {
        setOrganization(orgResult.data);
        setMembers(orgResult.data?.members || []);
      }

      const analyticsResult = await getAnalytics(30);
      if (analyticsResult.success && mountedRef.current) {
        setAnalytics(analyticsResult.data);
        setStats(analyticsResult.data?.summary || {});
        setMembers(analyticsResult.data?.members || members);
      }

      const me = await BotAPI.getMe?.(true);
      if (me && mountedRef.current) {
        setTradingEnabled(me?.trading_enabled === true);
        setPaperTradingEnabled(me?.paper_trading_enabled === true);
        setCurrentStrategy(me?.strategy || "mean_reversion");
      }

      const integrationsPayload = await BotAPI.getIntegrationStatus?.(true);
      if (integrationsPayload && mountedRef.current) {
        setIntegrations({
          alpaca_connected: integrationsPayload.alpaca_connected || false,
          okx_connected: integrationsPayload.okx_connected || false,
        });
      }

      if (analyticsResult.data?.members) {
        const dateMap = new Map();
        analyticsResult.data.members.forEach(member => {
          if (member.daily_performance) {
            member.daily_performance.forEach(day => {
              if (!dateMap.has(day.date)) {
                dateMap.set(day.date, { pnl: 0, trades: 0 });
              }
              const existing = dateMap.get(day.date);
              existing.pnl += day.pnl || 0;
              existing.trades += day.trades || 0;
            });
          }
        });
        const sortedDates = Array.from(dateMap.keys()).sort();
        setSeries(sortedDates.map(date => ({ date, pnl: dateMap.get(date).pnl, trades: dateMap.get(date).trades })));
      } else {
        setSeries([]);
      }
    } catch (err) {
      console.error("[EnterpriseDashboard] Failed to load:", err);
      if (isAuthError(err)) {
        nav("/login");
        return;
      }
      notify(isRateLimitError(err) ? "Too many requests. Please wait a moment." : "Failed to load dashboard data.", "error");
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [getOrganization, getAnalytics, nav, notify, members]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboardData({ silent: false, force: true });
    return () => {
      mountedRef.current = false;
      window.clearTimeout(refreshTimerRef.current);
    };
  }, [loadDashboardData]);

  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;
  const activeStrategy = STRATEGIES.find(s => s.id === currentStrategy) || STRATEGIES[0];
  const anyTradingActionBusy = togglingPaper || togglingTrading;

  // Determine setup card style
  const getSetupCardStyle = () => {
    if (!bothConnected) return SETUP_CARD_STYLES.setup;
    if (!paperTradingEnabled) return SETUP_CARD_STYLES.paper;
    if (!tradingEnabled) return SETUP_CARD_STYLES.paper;
    if (tradingEnabled) return SETUP_CARD_STYLES.live;
    return SETUP_CARD_STYLES.default;
  };

  const displayStats = useMemo(() => ({
    total_pnl: Number(stats.total_pnl || 0),
    win_rate: Number(stats.win_rate || 0),
    total_trades: Math.max(Number(stats.total_trades || 0), (paperTradingEnabled || tradingEnabled) ? 1 : 0),
    wins: Number(stats.winning_trades || 0),
    losses: Number(stats.losing_trades || 0),
    current_streak: Number(stats.current_streak || 0),
  }), [stats, paperTradingEnabled, tradingEnabled]);

  const readiness = useMemo(() => {
    let score = 0;
    if (alpacaConnected) score += 20;
    if (okxConnected) score += 20;
    if (paperTradingEnabled) score += 20;
    if (currentStrategy) score += 15;
    if (tradingEnabled) score += 15;
    if (members.length >= 3) score += 10;
    return Math.min(100, score);
  }, [alpacaConnected, okxConnected, paperTradingEnabled, currentStrategy, tradingEnabled, members.length]);

  const achievements = useMemo(() => {
    const unlocked = [];
    if (displayStats.total_trades > 0) unlocked.push("first_trade");
    if (displayStats.current_streak >= 7) unlocked.push("streak_7");
    if (displayStats.total_trades >= 100) unlocked.push("trades_100");
    if (displayStats.total_pnl > 0) unlocked.push("profitable");
    if (members.length >= 5) unlocked.push("team_full");
    if (bothConnected) unlocked.push("api_ready");
    return unlocked;
  }, [displayStats, members.length, bothConnected]);

  const lineData = useMemo(() => ({
    labels: series.map(p => p.date || "—"),
    datasets: [{ label: "Team P&L", data: series.map(p => Number(p.pnl || 0)), borderColor: "#4f46e5", backgroundColor: "rgba(79, 70, 229, 0.12)", fill: true, tension: 0.35 }],
  }), [series]);

  const doughnutData = useMemo(() => {
    const wins = Number(displayStats.wins || 0);
    const losses = Number(displayStats.losses || 0);
    return { labels: ["Wins", "Losses"], datasets: [{ data: wins + losses > 0 ? [wins, losses] : [1, 0], backgroundColor: ["#10b981", "#ef4444"], borderWidth: 0 }] };
  }, [displayStats]);

  const barData = useMemo(() => ({
    labels: series.slice(-7).map(p => p.date || "—"),
    datasets: [{ label: "Team Trades", data: series.slice(-7).map(p => Number(p.trades || 0)), backgroundColor: "#6366f1" }],
  }), [series]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: "top",
        labels: { color: "#1e293b", font: { weight: "bold", size: 11 } },
      },
      tooltip: { bodyColor: "#1e293b", titleColor: "#0f172a" }
    },
    scales: { 
      x: { ticks: { color: "#475569" }, grid: { color: "rgba(148, 163, 184, 0.25)" } }, 
      y: { ticks: { color: "#475569" }, grid: { color: "rgba(148, 163, 184, 0.25)" } } 
    },
  }), []);

  const handleConnectKeys = () => {
    setShowApiModal(false);
    notify("API key setup guide sent. Contact support@imali-defi.com for assistance.", "info");
  };

  const handleTogglePaperTrading = async (enabled) => {
    if (togglingPaper || togglingTrading) return;
    if (enabled && !bothConnected) {
      setShowApiModal(true);
      notify("Connect Alpaca and OKX before starting paper trading.", "error");
      return;
    }

    setTogglingPaper(true);
    const previousPaper = paperTradingEnabled;

    try {
      if (BotAPI.togglePaperTrading) {
        const result = await BotAPI.togglePaperTrading(enabled);
        if (result?.success === false) throw new Error(result?.error);
      } else if (BotAPI.updatePaperTrading) {
        await BotAPI.updatePaperTrading(enabled);
      }
      setPaperTradingEnabled(enabled);
      notify(enabled ? "Paper trading started for organization." : "Paper trading stopped.", "success");
    } catch (err) {
      console.error("[Enterprise] Paper toggle failed:", err);
      setPaperTradingEnabled(previousPaper);
      notify(err?.message || "Failed to update paper trading.", "error");
    } finally {
      setTogglingPaper(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    if (togglingTrading || togglingPaper) return;
    if (enabled && !bothConnected) {
      setShowApiModal(true);
      notify("Connect Alpaca and OKX before starting live trading.", "error");
      return;
    }

    setTogglingTrading(true);
    const previousLive = tradingEnabled;

    try {
      if (BotAPI.toggleTrading) {
        const result = await BotAPI.toggleTrading(enabled);
        if (result?.success === false) throw new Error(result?.error);
      } else if (BotAPI.updateLiveTrading) {
        await BotAPI.updateLiveTrading(enabled);
      }
      setTradingEnabled(enabled);
      setShowLiveConfirm(false);
      notify(enabled ? "Live trading started for organization." : "Live trading stopped.", "success");
    } catch (err) {
      console.error("[Enterprise] Live toggle failed:", err);
      setTradingEnabled(previousLive);
      notify(err?.message || "Failed to update live trading.", "error");
    } finally {
      setTogglingTrading(false);
    }
  };

  if (loading || enterpriseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <div className="text-xl font-extrabold text-slate-900 sm:text-2xl">Loading enterprise dashboard…</div>
          <div className="mt-2 text-sm font-semibold text-slate-600">Getting organization data, trades, and stats.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />

      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Welcome Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {organization?.name || "Enterprise"} Dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                Manage your organization's trading infrastructure, team, and strategies.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>API {bothConnected ? "Connected" : "Needs Keys"}</StatusPill>
                <StatusPill tone="blue">Strategy: {activeStrategy.name}</StatusPill>
                <StatusPill tone="purple">{members.length} Team Members</StatusPill>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex">
              <Button variant="secondary" onClick={() => loadDashboardData({ silent: false, force: false })} disabled={refreshing} className="w-full lg:w-auto">
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="secondary" onClick={() => setShowApiModal(true)} className="w-full lg:w-auto">
                Connect Keys
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Progress Card - Using static className */}
        <div className={`rounded-3xl border p-4 shadow-sm sm:p-6 ${getSetupCardStyle()}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {!bothConnected ? "Step 1: Connect API keys" : !paperTradingEnabled ? "Step 2: Start paper trading" : !tradingEnabled ? "Paper trading active" : "Live trading active"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-800 sm:text-base">
                {!bothConnected ? "Connect both Alpaca and OKX for your organization to start trading."
                  : !paperTradingEnabled ? "Your keys are connected. Start with virtual funds first."
                  : !tradingEnabled ? "Your organization is using virtual funds. Test before live trading."
                  : "Live trading is active. Monitor performance across your team."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={alpacaConnected ? "green" : "amber"}>Alpaca {alpacaConnected ? "✓" : "Needed"}</StatusPill>
                <StatusPill tone={okxConnected ? "green" : "amber"}>OKX {okxConnected ? "✓" : "Needed"}</StatusPill>
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-auto">
              {!bothConnected ? (
                <Button variant="warning" onClick={() => setShowApiModal(true)} className="w-full lg:w-auto">Connect API Keys</Button>
              ) : !paperTradingEnabled ? (
                <Button onClick={() => handleTogglePaperTrading(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  {togglingPaper ? "Starting..." : "Start Paper Trading"}
                </Button>
              ) : !tradingEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:flex">
                  <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    {togglingPaper ? "Stopping..." : "Stop Paper"}
                  </Button>
                  <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    Start Live Trading
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  {togglingTrading ? "Stopping..." : "Stop Live Trading"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat label="Team P&L" value={usd(displayStats.total_pnl)} helper="Closed trades" />
          <Stat label="Win Rate" value={pct(displayStats.win_rate)} helper="Team average" />
          <Stat label="Total Trades" value={displayStats.total_trades} helper={paperTradingEnabled || tradingEnabled ? "Trading active" : "Not active"} />
          <Stat label="Team Members" value={members.length} helper="Active members" />
        </div>

        {/* Quick Actions - Using static className mapping */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { title: "Team", path: "/enterprise/team", icon: "👥", color: "indigo" },
            { title: "Strategies", path: "/enterprise/strategies", icon: "📊", color: "purple" },
            { title: "Analytics", path: "/enterprise/analytics", icon: "📈", color: "green" },
            { title: "Audit", path: "/enterprise/audit", icon: "🔍", color: "amber" },
            { title: "Branding", path: "/enterprise/branding", icon: "🎨", color: "pink" },
            { title: "Bots", path: "/enterprise/bot-controls", icon: "🤖", color: "blue" },
          ].map((action) => (
            <Link 
              key={action.path} 
              to={action.path} 
              className={`rounded-xl p-3 text-center transition-all shadow-sm ${ACTION_STYLES[action.color]} hover:shadow-md`}
            >
              <div className="text-2xl">{action.icon}</div>
              <div className="mt-1 text-xs font-bold text-slate-800">{action.title}</div>
            </Link>
          ))}
        </div>

        {/* Trading Readiness */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle helper="This score helps track your organization's setup completeness.">Organization Readiness</SectionTitle>
            <div className="text-3xl font-extrabold text-slate-900">{readiness}%</div>
          </div>
          <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${readiness >= 80 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${readiness}%` }} />
          </div>
        </Card>

        {/* Charts */}
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <SectionTitle>Team Performance</SectionTitle>
            <div className="h-64 sm:h-72">
              <Line data={lineData} options={chartOptions} />
            </div>
          </Card>
          <Card>
            <SectionTitle>Win / Loss Ratio</SectionTitle>
            <div className="h-64 sm:h-72">
              <Doughnut data={doughnutData} options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { 
                    position: "top",
                    labels: { color: "#1e293b", font: { weight: "bold" } } 
                  } 
                } 
              }} />
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle>Team Trades — Last 7 Days</SectionTitle>
          <div className="h-64 sm:h-72">
            <Bar data={barData} options={chartOptions} />
          </div>
        </Card>

        {/* Team Members */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Team Members ({members.length})</SectionTitle>
            <Link to="/enterprise/team" className="text-sm text-indigo-600 font-bold hover:text-indigo-800">Manage →</Link>
          </div>
          <div className="space-y-2">
            {members.slice(0, 5).map((member, idx) => (
              <div key={member.user_id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 gap-3 sm:gap-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">{member.email?.[0]?.toUpperCase() || "U"}</div>
                  <div>
                    <div className="font-bold text-slate-900">{member.email || `Member ${idx + 1}`}</div>
                    <div className="text-xs text-slate-600 capitalize">{member.role || "member"}</div>
                  </div>
                </div>
                <StatusPill tone={member.role === "admin" ? "purple" : "slate"}>{member.role || "Member"}</StatusPill>
              </div>
            ))}
            {members.length === 0 && <p className="text-center text-slate-600 py-4">No team members yet. Invite your team to get started.</p>}
            {members.length > 5 && <div className="text-center text-sm text-slate-600 pt-2">+{members.length - 5} more members</div>}
          </div>
        </Card>

        {/* Achievements */}
        <Card>
          <SectionTitle>Organization Achievements</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = achievements.includes(achievement.id);
              return (
                <div key={achievement.id} className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${unlocked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {achievement.icon} {achievement.label}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Button onClick={() => nav("/enterprise/team")} className="w-full">Manage Team</Button>
          <Button onClick={() => nav("/enterprise/strategies")} className="w-full">Strategies</Button>
          <Button variant="warning" onClick={() => bothConnected ? setShowLiveConfirm(true) : setShowApiModal(true)} className="w-full">Start Live</Button>
          <Button variant="secondary" onClick={() => nav("/enterprise/audit")} className="w-full">Audit Logs</Button>
        </div>
      </div>

      {/* Modals */}
      <ApiKeyModal open={showApiModal} onClose={() => setShowApiModal(false)} onConnect={handleConnectKeys} />
      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleTrading(true)} busy={togglingTrading} />
    </div>
  );
}