// src/components/Dashboard/MemberDashboard.jsx - REWRITTEN FOR user-api.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

const PAPER_TRADING_BALANCE = 1000;
const REFRESH_COOLDOWN_MS = 12000;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Beginners",
    short: "Safest start",
    description: "Looks for dips and safer rebounds.",
    radarData: [95, 30, 40, 90, 20, 45],
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most users",
    short: "Best default",
    description: "Uses a mix of multiple trading signals.",
    radarData: [75, 65, 70, 80, 60, 85],
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    bestFor: "Trending markets",
    short: "More aggressive",
    description: "Follows strong price moves.",
    radarData: [50, 95, 90, 45, 95, 70],
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    risk: "Low",
    bestFor: "Advanced users",
    short: "Advanced",
    description: "Looks for price differences across venues.",
    radarData: [80, 70, 85, 75, 65, 90],
  },
];

const tierAccess = {
  starter: {
    label: "Starter",
    canPaperTrade: true,
    canLiveTrade: false,
    canUseStocks: false,
    canUseCrypto: false,
    canUseDefi: false,
    showCharts: true,
    showCommunityTrades: false,
    showAchievements: true,
    showStrategyRadar: true,
    upgradeMessage: "Upgrade to Pro for live trading with real funds.",
  },
  pro: {
    label: "Pro",
    canPaperTrade: true,
    canLiveTrade: true,
    canUseStocks: true,
    canUseCrypto: true,
    canUseDefi: false,
    showCharts: true,
    showCommunityTrades: true,
    showAchievements: false,
    showStrategyRadar: false,
    upgradeMessage: null,
  },
  elite: {
    label: "Elite",
    canPaperTrade: true,
    canLiveTrade: true,
    canUseStocks: true,
    canUseCrypto: true,
    canUseDefi: true,
    showCharts: true,
    showCommunityTrades: true,
    showAchievements: false,
    showStrategyRadar: false,
    upgradeMessage: null,
  },
  bundle: {
    label: "Bundle",
    canPaperTrade: true,
    canLiveTrade: true,
    canUseStocks: true,
    canUseCrypto: true,
    canUseDefi: true,
    showCharts: true,
    showCommunityTrades: true,
    showAchievements: false,
    showStrategyRadar: false,
    upgradeMessage: null,
  },
};

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = {
    conservative: "mean_reversion",
    "mean reversion": "mean_reversion",
    balanced: "ai_weighted",
    "ai weighted": "ai_weighted",
    ai: "ai_weighted",
    momentum: "momentum",
    arbitrage: "arbitrage",
  };
  return aliases[v] || v || "mean_reversion";
};

const isAuthError = (err) => {
  const msg = String(err?.message || err?.error || "").toLowerCase();
  const status = Number(err?.status || err?.response?.status || 0);
  return status === 401 || status === 403 || msg.includes("invalid token") || msg.includes("expired token");
};

const formatTimeLeft = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "expired";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

function Card({ children, className = "", id }) {
  return (
    <div
      id={id}
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, helper }) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-extrabold text-gray-900 sm:text-lg">{children}</h3>
      {helper && <p className="mt-1 text-sm font-semibold text-gray-600">{helper}</p>}
    </div>
  );
}

function StatusPill({ children, tone = "slate", className = "" }) {
  const classes = {
    green: "border-green-300 bg-green-100 text-green-900",
    red: "border-red-300 bg-red-100 text-red-900",
    amber: "border-amber-300 bg-amber-100 text-amber-900",
    blue: "border-blue-300 bg-blue-100 text-blue-900",
    purple: "border-purple-300 bg-purple-100 text-purple-900",
    slate: "border-gray-300 bg-gray-100 text-gray-900",
  };
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none sm:text-xs ${classes[tone] || classes.slate} ${className}`}>
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary", className = "" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    purple: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
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
        <button type="button" onClick={onClose} className="text-lg leading-none text-gray-700 hover:text-gray-900">×</button>
      </div>
    </div>
  );
}

// ==============================================
// SIMPLE CHARTS
// ==============================================

const EquityCurveChart = ({ data }) => {
  const chartData = useMemo(() => {
    const labels = data?.map((d, i) => d.date || `Day ${i + 1}`) || [];
    let runningBalance = PAPER_TRADING_BALANCE;
    const equity = data?.map((d) => {
      runningBalance += Number(d.pnl || 0);
      return runningBalance;
    }) || [];
    
    return {
      labels,
      datasets: [{
        label: "Portfolio Value",
        data: equity,
        borderColor: "#6366f1",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: "rgba(99,102,241,0.1)",
        pointRadius: 0,
        pointHoverRadius: 5,
      }],
    };
  }, [data]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `$${ctx.parsed.y.toFixed(2)}` } } },
    scales: { y: { ticks: { callback: (v) => `$${v}` } } },
  };
  
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-center"><div><div className="text-5xl mb-3">📈</div><p className="text-sm font-semibold text-gray-600">No equity data yet</p><p className="text-xs text-gray-400 mt-1">Start trading to see growth</p></div></div>;
  }
  
  return <Line data={chartData} options={options} />;
};

const TradeVolumeChart = ({ data }) => {
  const chartData = useMemo(() => ({
    labels: data?.map((d, i) => d.date || `Day ${i + 1}`) || [],
    datasets: [{ label: "Trades", data: data?.map((d) => d.trades || 0) || [], backgroundColor: "#6366f1", borderRadius: 8 }],
  }), [data]);
  
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-center"><div><div className="text-5xl mb-3">📊</div><p className="text-sm font-semibold text-gray-600">No volume data yet</p></div></div>;
  }
  
  return <Bar data={chartData} options={options} />;
};

const WinRateMeter = ({ wins, losses }) => {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={`${winRate * 2.827} 283`} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-900">{winRate.toFixed(0)}%</span>
          <span className="text-xs text-gray-500">Win Rate</span>
        </div>
      </div>
      <div className="mt-4 flex gap-6">
        <div className="text-center"><div className="text-xl font-extrabold text-emerald-600">{wins}</div><div className="text-xs text-gray-500">Wins</div></div>
        <div className="text-center"><div className="text-xl font-extrabold text-red-600">{losses}</div><div className="text-xs text-gray-500">Losses</div></div>
      </div>
    </div>
  );
};

const StrategyRadarChart = ({ data }) => {
  const chartData = {
    labels: ["Safety", "Speed", "Profitability", "Stability", "Aggression", "AI"],
    datasets: [{ data: data, backgroundColor: "rgba(99,102,241,0.2)", borderColor: "#6366f1", borderWidth: 2, pointBackgroundColor: "#6366f1" }],
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { ticks: { display: false }, min: 0, max: 100 } } };
  return <Radar data={chartData} options={options} />;
};

// ==============================================
// MAIN DASHBOARD COMPONENT
// ==============================================

export default function MemberDashboard() {
  const nav = useNavigate();
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [series, setSeries] = useState([]);
  const [integrations, setIntegrations] = useState({ wallet_connected: false, alpaca_connected: false, okx_connected: false });
  const [currentStrategy, setCurrentStrategy] = useState("ai_weighted");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [communityTrades, setCommunityTrades] = useState([]);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [paperTradeExecuting, setPaperTradeExecuting] = useState(false);
  const [trialData, setTrialData] = useState(null);

  const userTier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user?.tier]);
  const access = useMemo(() => tierAccess[userTier] || tierAccess.starter, [userTier]);
  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;
  const activeStrategy = STRATEGIES.find((s) => s.id === currentStrategy) || STRATEGIES[0];
  
  // FIX: Use seconds_remaining from trial-status endpoint (not trial_seconds_left)
  const trialSecondsLeft = trialData?.seconds_remaining ?? (userTier === "starter" ? 7 * 86400 : 0);
  const trialStatus = trialData?.trial_status ?? (userTier === "starter" ? "active" : null);
  const isTrialExpired = trialStatus === "expired" || trialSecondsLeft <= 0;
  
  // Separate paper history from paper active status
  const hasPaperHistory = (stats.total_trades || 0) > 0;
  const hasActivePaperTrading = paperTradingEnabled;
  
  const isNewUser = !hasActivePaperTrading && !tradingEnabled && !hasPaperHistory;

  const displayStats = useMemo(() => ({
    total_pnl: Number(stats.total_pnl || 0),
    win_rate: Number(stats.win_rate || 0),
    total_trades: Math.max(Number(stats.total_trades || 0), hasActivePaperTrading ? 1 : 0),
    wins: Number(stats.wins || 0),
    losses: Number(stats.losses || 0),
  }), [stats, hasActivePaperTrading]);

  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  const handleUpgrade = useCallback(() => {
    nav("/billing");
  }, [nav]);

  const handleLogout = useCallback(() => { BotAPI.clearToken?.(); BotAPI.clearApiKey?.(); nav("/login"); }, [nav]);

  // Manual paper trade execution (uses your API's paper-trade endpoint)
  const handleManualTrade = async () => {
    if (paperTradeExecuting) return;
    if (!hasActivePaperTrading) {
      notify("Please enable paper trading first", "error");
      return;
    }
    
    setPaperTradeExecuting(true);
    try {
      // Random trade parameters
      const symbols = ["BTC/USD", "ETH/USD", "SOL/USD"];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const qty = Number((Math.random() * 0.5 + 0.1).toFixed(4));
      
      // Call your API's paper-trade endpoint
      const result = await BotAPI.request?.("/api/trading/paper-trade", {
        method: "POST",
        data: { exchange: "paper", symbol, side, qty, strategy: currentStrategy }
      });
      
      if (result?.success !== false) {
        notify(`Trade executed on ${symbol}!`, "success");
        await loadDashboard({ force: true });
      } else {
        throw new Error(result?.error || "Trade failed");
      }
    } catch (err) {
      console.error("Manual trade error:", err);
      notify(err?.message || "Trade failed. Make sure paper trading is enabled.", "error");
    } finally {
      setPaperTradeExecuting(false);
    }
  };

  const handleTogglePaperTrading = async (enabled) => {
    if (togglingPaper || togglingTrading || !access.canPaperTrade) return;
    
    setTogglingPaper(true);
    
    try {
      const result = await BotAPI.togglePaperTrading?.(enabled);
      const success = result?.success !== false;
      
      if (!success) throw new Error(result?.error || "Failed");
      
      setPaperTradingEnabled(enabled);
      
      if (enabled) {
        notify("Paper trading enabled! You can now execute manual trades.", "success");
        // Try a test trade automatically
        setTimeout(() => handleManualTrade(), 2000);
      } else {
        notify("Paper trading disabled.", "success");
      }
      
      await loadDashboard({ silent: true, force: true });
    } catch (err) {
      notify(err?.message || "Failed to update paper trading.", "error");
    } finally {
      setTogglingPaper(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    if (togglingTrading || togglingPaper || !access.canLiveTrade) return;
    if (enabled && !bothConnected) { setShowApiModal(true); notify("Connect Alpaca and OKX first.", "error"); return; }

    setTogglingTrading(true);
    setTradingEnabled(enabled);
    try {
      const result = await BotAPI.toggleTrading?.(enabled);
      const success = result?.success !== false;
      if (!success) throw new Error(result?.error || "Failed");
      notify(enabled ? "Live trading started!" : "Live trading stopped.", "success");
      setShowLiveConfirm(false);
      await loadDashboard({ silent: true, force: true });
    } catch (err) {
      setTradingEnabled(!enabled);
      notify(err?.message || "Failed to update.", "error");
    } finally { setTogglingTrading(false); }
  };

  const handleStrategyChange = async (strategy) => {
    if (strategy.id === currentStrategy || savingStrategy) return;
    setSavingStrategy(strategy.id);
    setCurrentStrategy(strategy.id);
    try {
      await BotAPI.updateUserStrategy(strategy.id);
      notify(`${strategy.name} strategy activated.`, "success");
      await loadDashboard({ silent: true });
    } catch (err) {
      setCurrentStrategy(currentStrategy);
      notify(err?.message || "Failed to update strategy.", "error");
    } finally { setSavingStrategy(""); }
  };

  const loadTrialStatus = useCallback(async () => {
    try {
      const trial = await BotAPI.getTrialStatus?.(true);
      setTrialData(trial);
    } catch (err) {
      console.warn("Failed to load trial status:", err);
    }
  }, []);

  const loadDashboard = useCallback(async ({ silent = false, force = false } = {}) => {
    if (loadingRef.current) return;
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;

    loadingRef.current = true;
    lastRefreshRef.current = now;
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      if (BotAPI.refreshActivation) await BotAPI.refreshActivation(true);
      const me = await BotAPI.getMe?.(true);
      if (!me?.id && !me?.email) { handleLogout(); return; }
      if (!mountedRef.current) return;

      setUser(me);
      setTradingEnabled(me?.trading_enabled === true);
      setPaperTradingEnabled(me?.paper_trading_enabled === true);

      const [statsPayload, integrationsPayload, strategiesPayload, tradesPayload] = await Promise.all([
        BotAPI.getUserTradingStats?.(30, true).catch(() => null),
        BotAPI.getIntegrationStatus?.(true).catch(() => null),
        BotAPI.getTradingStrategies?.(true).catch(() => null),
        BotAPI.getGlobalTrades?.({ limit: 10, skipCache: false }).catch(() => null),
      ]);

      if (!mountedRef.current) return;

      const summary = statsPayload?.summary || statsPayload?.data?.summary || {};
      setStats({
        total_pnl: summary.total_pnl || 0,
        win_rate: summary.win_rate || 0,
        total_trades: summary.total_trades || 0,
        wins: summary.wins || 0,
        losses: summary.losses || 0,
      });
      
      const dailySeries = statsPayload?.daily_performance || statsPayload?.data?.daily_performance || [];
      if (dailySeries.length) setSeries(dailySeries);
      
      setIntegrations(integrationsPayload || {});
      setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || me?.strategy || "ai_weighted"));
      if (tradesPayload?.trades?.length) setCommunityTrades(tradesPayload.trades);
      
      // Load trial status separately
      await loadTrialStatus();
    } catch (err) {
      console.error("[MemberDashboard] Failed to load:", err);
      if (isAuthError(err)) handleLogout();
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) { setRefreshing(false); setLoading(false); }
    }
  }, [handleLogout, loadTrialStatus]);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard();
    pollingIntervalRef.current = setInterval(() => loadDashboard({ silent: true }), 30000);
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center"><div className="text-xl font-extrabold text-gray-900">Loading your dashboard…</div><div className="mt-2 text-sm text-gray-600">Getting your trading status...</div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-4 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        
        {/* HEADER */}
        <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Welcome back 👋</h1>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                {hasActivePaperTrading ? "🎮 Paper trading active - practice with virtual funds" : 
                 tradingEnabled ? "💰 Live trading active - real funds at work" :
                 hasPaperHistory ? "📊 View your paper trading history" :
                 "📝 Start paper trading to learn the platform safely"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={hasActivePaperTrading ? "green" : hasPaperHistory ? "blue" : "slate"}>
                  Paper {hasActivePaperTrading ? "Active" : hasPaperHistory ? "History" : "Off"}
                </StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>API {bothConnected ? "Ready" : "Needed"}</StatusPill>
                <StatusPill tone="blue">Strategy: {activeStrategy.name}</StatusPill>
                <StatusPill tone={access.canLiveTrade ? "green" : "amber"}>{access.label}</StatusPill>
                {trialStatus && (
                  <StatusPill tone={isTrialExpired ? "red" : trialStatus === "active" ? "green" : "amber"}>
                    {isTrialExpired ? "Trial Expired" : `Trial: ${formatTimeLeft(trialSecondsLeft)} left`}
                  </StatusPill>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => loadDashboard({ force: true })} disabled={refreshing} className="w-full sm:w-auto">{refreshing ? "..." : "Refresh"}</Button>
              <Button variant="secondary" onClick={() => setShowApiModal(true)} className="w-full sm:w-auto">Keys</Button>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {[
            { id: "overview", label: "Overview", emoji: "📊" },
            { id: "trading", label: "Trading", emoji: "🎯" },
            { id: "strategies", label: "Strategies", emoji: "🎛️" },
            { id: "connections", label: "Connections", emoji: "🔌" },
            { id: "learn", label: "Learn", emoji: "📚" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            
            {/* PAPER TRADING CONTROLS CARD */}
            <Card className="border-blue-200 bg-blue-50/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-blue-900">🎮 Paper Trading Controls</h2>
                  <p className="text-sm font-semibold text-blue-800">
                    {hasActivePaperTrading
                      ? "Paper trading is ON. Execute manual trades below."
                      : "Paper trading is OFF. Start it to practice trading with virtual funds."}
                  </p>
                  {hasPaperHistory && !hasActivePaperTrading && (
                    <p className="text-xs text-blue-700 mt-1">📊 You have {stats.total_trades} historical paper trades.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!hasActivePaperTrading ? (
                    <Button onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>
                      {togglingPaper ? "Starting..." : "Start Paper"}
                    </Button>
                  ) : (
                    <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>
                      {togglingPaper ? "Stopping..." : "Stop Paper"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handleManualTrade}
                    disabled={!hasActivePaperTrading || paperTradeExecuting}
                  >
                    {paperTradeExecuting ? "Trading..." : "Manual Trade"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* LIVE TRADING CONTROLS CARD */}
            <Card className="border-purple-200 bg-purple-50/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-purple-900">💰 Live Trading Controls</h2>
                  <p className="text-sm font-semibold text-purple-800">
                    {!access.canLiveTrade
                      ? "Upgrade to Pro to unlock live trading."
                      : tradingEnabled
                      ? "Live trading is ON with real funds."
                      : "Live trading is OFF."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!access.canLiveTrade ? (
                    <Button variant="warning" onClick={handleUpgrade}>Upgrade to Pro</Button>
                  ) : !tradingEnabled ? (
                    <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={!bothConnected}>
                      Start Live
                    </Button>
                  ) : (
                    <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={togglingTrading}>
                      Stop Live
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* QUICK START CARD for new users */}
            {isNewUser && (
              <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-indigo-900">🚀 Get Started</h3>
                    <p className="mt-1 text-sm font-semibold text-indigo-800">
                      Click "Start Paper" above to begin trading with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.
                      No API keys needed!
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* PLAN CARD */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50/80 to-indigo-50/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-purple-900">Your Plan: {access.label}</h2>
                  <p className="mt-1 text-sm font-semibold text-purple-800">
                    {isTrialExpired && userTier === "starter" ? "⚠️ Your trial has expired. Upgrade to continue." :
                     access.canLiveTrade ? "✅ Live trading ready. Connect your exchange accounts to start." : 
                     "📝 Free paper trading with virtual funds. No API keys needed! Upgrade for live trading."}
                  </p>
                </div>
                {((!access.canLiveTrade && !hasActivePaperTrading) || (isTrialExpired && userTier === "starter")) && (
                  <Button variant="warning" onClick={handleUpgrade}>
                    Upgrade to Pro → 💳
                  </Button>
                )}
              </div>
            </Card>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{usd(displayStats.total_pnl)}</div>
                <div className="text-xs text-gray-500 font-medium">Total P&L</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{pct(displayStats.win_rate)}</div>
                <div className="text-xs text-gray-500 font-medium">Win Rate</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{displayStats.total_trades}</div>
                <div className="text-xs text-gray-500 font-medium">Total Trades</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{hasActivePaperTrading ? "Paper" : tradingEnabled ? "Live" : hasPaperHistory ? "Paper" : "Setup"}</div>
                <div className="text-xs text-gray-500 font-medium">Mode</div>
              </div>
            </div>

            {/* PAPER TRADING INFO CARD */}
            <Card className="border-blue-200 bg-blue-50/50">
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-blue-900 sm:text-xl">📊 About Paper Trading</h2>
                  <p className="mt-1 text-sm font-bold text-blue-800">
                    {hasActivePaperTrading 
                      ? `Active with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds. Click "Manual Trade" to execute trades.` 
                      : hasPaperHistory
                      ? `You have ${stats.total_trades} completed paper trades with ${usd(displayStats.total_pnl)} total profit/loss.`
                      : `Available with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds. No real money. No API keys needed!`}
                  </p>
                </div>
              </div>
            </Card>

            {/* EQUITY CURVE CHART */}
            <Card>
              <SectionTitle helper="Your portfolio value over time">📈 Equity Curve</SectionTitle>
              <div className="h-[300px] w-full"><EquityCurveChart data={series} /></div>
            </Card>

            {/* HELPFUL RESOURCES */}
            <Card>
              <SectionTitle>📚 Helpful Resources</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "📚 Trading Guide", desc: "Learn how Imali trades", url: "/how-it-works" },
                  { title: "🔧 API Setup", desc: "Connect OKX and Alpaca for live trading", url: "/funding-guide" },
                  { title: "❓ FAQ", desc: "Common beginner questions", url: "/support" },
                  { title: "💬 Support", desc: "Get help", url: "/support" },
                ].map((resource) => (
                  <Link key={resource.title} to={resource.url} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
                    <div className="font-extrabold text-gray-900">{resource.title}</div>
                    <div className="mt-1 text-sm font-medium text-gray-500">{resource.desc}</div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TRADING TAB */}
        {activeTab === "trading" && (
          <div className="space-y-5">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <SectionTitle helper="Win/Loss breakdown">🎯 Win Rate</SectionTitle>
                <div className="h-[300px]"><WinRateMeter wins={displayStats.wins} losses={displayStats.losses} /></div>
              </Card>
              <Card>
                <SectionTitle helper="Daily trade volume">📊 Trade Volume</SectionTitle>
                <div className="h-[300px]"><TradeVolumeChart data={series} /></div>
              </Card>
            </div>

            {/* Manual Trade Section */}
            {hasActivePaperTrading && (
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-extrabold text-gray-900">Execute Manual Paper Trade</h3>
                    <p className="text-sm text-gray-500">Test the system with a random paper trade</p>
                  </div>
                  <Button variant="primary" onClick={handleManualTrade} disabled={paperTradeExecuting}>
                    {paperTradeExecuting ? "Executing..." : "Execute Random Trade"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Info when paper trading is off but has history */}
            {!hasActivePaperTrading && hasPaperHistory && (
              <Card>
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">📊</div>
                  <h3 className="font-extrabold text-gray-900">Paper Trading Paused</h3>
                  <p className="text-sm text-gray-500 mt-1">Click "Start Paper" in the Overview tab to resume trading</p>
                </div>
              </Card>
            )}

            {/* Info when no trading at all */}
            {!hasActivePaperTrading && !hasPaperHistory && !tradingEnabled && (
              <Card>
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎮</div>
                  <h3 className="font-extrabold text-gray-900">No Trading Active</h3>
                  <p className="text-sm text-gray-500 mt-1">Click "Start Paper" in the Overview tab to begin</p>
                </div>
              </Card>
            )}

            {/* Community Trades */}
            {access.showCommunityTrades && communityTrades.length > 0 && (
              <Card>
                <SectionTitle>🌍 Community Activity</SectionTitle>
                <div className="space-y-2 max-h-80 overflow-auto">
                  {communityTrades.slice(0, 10).map((trade, i) => (
                    <div key={trade.id || i} className="flex justify-between items-center p-3 border-b border-gray-100">
                      <div><span className="font-bold text-gray-900">{trade.symbol}</span><span className="text-xs text-gray-400 ml-2">{trade.bot}</span></div>
                      <div className={Number(trade.pnl_usd) >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{usd(trade.pnl_usd)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* STRATEGIES TAB */}
        {activeTab === "strategies" && (
          <div className="space-y-5">
            <Card id="strategies-section">
              <SectionTitle helper="Pick one strategy. You can change it later.">🎯 Choose Your Strategy</SectionTitle>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {STRATEGIES.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => handleStrategyChange(strategy)}
                    disabled={!!savingStrategy}
                    className={`rounded-2xl border p-4 text-left transition ${currentStrategy === strategy.id ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-200 bg-white hover:border-indigo-300"}`}
                  >
                    <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{strategy.emoji}</span><span className="font-extrabold text-gray-900">{strategy.name}</span><StatusPill tone={strategy.risk === "Low" ? "green" : strategy.risk === "High" ? "red" : "amber"}>{strategy.risk}</StatusPill></div>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                    {currentStrategy === strategy.id && <div className="mt-3 text-xs font-bold text-indigo-600">✓ Active</div>}
                  </button>
                ))}
              </div>
            </Card>

            {/* Strategy Radar */}
            {access.showStrategyRadar && (
              <Card>
                <SectionTitle helper="Strategy behavior analysis">🧠 Strategy Analysis</SectionTitle>
                <div className="h-[300px]"><StrategyRadarChart data={activeStrategy.radarData} /></div>
                <div className="mt-3 text-center text-sm text-gray-500">Current: <span className="font-bold text-indigo-600">{activeStrategy.name}</span></div>
              </Card>
            )}
          </div>
        )}

        {/* CONNECTIONS TAB */}
        {activeTab === "connections" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle>🔌 Exchange Connections</SectionTitle>
              <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                💡 <strong>Starter plan:</strong> Paper trading works without any API keys! Only connect keys when you upgrade to Pro for live trading.
              </div>
              <div className="space-y-3">
                {[
                  { title: "Alpaca", desc: "Stock trading", connected: alpacaConnected, needed: "Required for Live Trading" },
                  { title: "OKX", desc: "Crypto trading", connected: okxConnected, needed: "Required for Live Trading" },
                  { title: "MetaMask", desc: "DeFi (Elite only)", connected: integrations.wallet_connected, needed: access.canUseDefi ? "Optional" : "Elite+" },
                ].map((item) => (
                  <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="font-extrabold text-gray-900">{item.title}</div><div className="text-sm text-gray-500">{item.desc}</div></div>
                    <div className="flex items-center gap-3">
                      <StatusPill tone={item.connected ? "green" : "amber"}>{item.connected ? "Connected" : item.needed}</StatusPill>
                      {!item.connected && access.canLiveTrade && (item.title === "Alpaca" || item.title === "OKX") && 
                        <Button variant="secondary" onClick={() => setShowApiModal(true)}>Connect</Button>
                      }
                      {!access.canLiveTrade && (item.title === "Alpaca" || item.title === "OKX") && 
                        <StatusPill tone="blue">Upgrade to Pro</StatusPill>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* LEARN TAB */}
        {activeTab === "learn" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle>📚 How Paper Trading Works</SectionTitle>
              <div className="prose prose-gray max-w-none">
                <h3 className="text-gray-900">1. Start Paper Trading</h3>
                <p className="text-gray-600">Click "Start Paper" - no API keys needed. The bot starts with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.</p>
                <h3 className="text-gray-900">2. Execute Manual Trades</h3>
                <p className="text-gray-600">Click "Manual Trade" to practice trading. Each trade is recorded with realistic P&L.</p>
                <h3 className="text-gray-900">3. Monitor Performance</h3>
                <p className="text-gray-600">Watch your equity curve grow. The win rate and trade volume charts update automatically.</p>
                <h3 className="text-gray-900">4. Switch Strategies Anytime</h3>
                <p className="text-gray-600">Not happy with performance? Change your strategy - future trades will use it.</p>
                <h3 className="text-gray-900">5. Upgrade When Ready</h3>
                <p className="text-gray-600">Once confident, upgrade to Pro for live trading with real funds through your exchange accounts.</p>
              </div>
            </Card>

            <Card>
              <SectionTitle>🏆 Achievements</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "paper_active", label: "Paper Trader", icon: "🎮", unlocked: hasActivePaperTrading || hasPaperHistory },
                  { id: "first_trade", label: "First Trade", icon: "🚀", unlocked: displayStats.total_trades > 0 },
                  { id: "trades_10", label: "10 Trades", icon: "⭐", unlocked: displayStats.total_trades >= 10 },
                  { id: "trades_50", label: "50 Trades", icon: "🏆", unlocked: displayStats.total_trades >= 50 },
                  { id: "profitable", label: "Profitable", icon: "💰", unlocked: displayStats.total_pnl > 0 },
                ].map((achievement) => (
                  <div key={achievement.id} className={`rounded-2xl border px-4 py-2 text-sm font-extrabold ${achievement.unlocked ? "border-green-300 bg-green-50 text-green-800" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                    {achievement.icon} {achievement.label}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Button variant="secondary" onClick={() => nav("/activation")}>Account Settings</Button>
          <Button variant="secondary" onClick={handleUpgrade}>Upgrade Plan 💳</Button>
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-extrabold text-gray-900">Connect API Keys</h2><button onClick={() => setShowApiModal(false)} className="text-3xl text-gray-500 hover:text-gray-700">×</button></div>
            
            <div className="mb-5 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              💡 <strong>Starter plan:</strong> You don't need API keys for paper trading. Only connect when upgrading to Pro for live trading.
            </div>
            
            <div className="space-y-4">
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">Alpaca (Stocks)</h3>
                <p className="text-sm text-gray-500 mb-2">Create API key with <strong>trading permission only</strong> - no withdrawals</p>
                <Button variant="secondary" onClick={() => window.open("https://app.alpaca.markets/paper/dashboard/api-keys", "_blank")}>Create Alpaca Keys →</Button>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">OKX (Crypto)</h3>
                <p className="text-sm text-gray-500 mb-2">Create API key with <strong>trade permission only</strong> - no withdrawals</p>
                <Button variant="secondary" onClick={() => window.open("https://www.okx.com/account/my-api", "_blank")}>Create OKX Keys →</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleTrading(true)} busy={togglingTrading} />
    </div>
  );
}

function LiveConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <h3 className="text-xl font-extrabold text-gray-900">Confirm Live Trading</h3>
        <p className="mt-2 text-sm text-gray-600">Live trading uses real money through your connected exchange accounts.</p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"><strong className="text-amber-900">⚠️ Risk reminder:</strong> <span className="text-amber-800">You can lose money. Start small. You can stop anytime.</span></div>
        <div className="mt-5 flex gap-3"><Button variant="warning" onClick={onConfirm} disabled={busy} className="flex-1">{busy ? "Starting..." : "Enable Live"}</Button><Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button></div>
      </div>
    </div>
  );
}