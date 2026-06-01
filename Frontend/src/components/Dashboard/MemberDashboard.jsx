// src/components/Dashboard/MemberDashboard.jsx - SIMPLIFIED OKX FOCUSED VERSION
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
    description: "Looks for dips and safer rebounds.",
    radarData: [95, 30, 40, 90, 20, 45],
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    description: "Uses a mix of multiple trading signals.",
    radarData: [75, 65, 70, 80, 60, 85],
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    description: "Follows strong price moves.",
    radarData: [50, 95, 90, 45, 95, 70],
  },
];

const tierAccess = {
  starter: {
    label: "Starter",
    displayName: "Starter",
    price: "$0",
    period: "7-day trial",
    canPaperTrade: true,
    canLiveTrade: false,
    showCharts: true,
    badge: "🌱",
  },
  common: {
    label: "Pro",
    displayName: "Pro",
    price: "$19",
    period: "/month",
    canPaperTrade: true,
    canLiveTrade: true,
    showCharts: true,
    badge: "⭐",
  },
  rare: {
    label: "Elite",
    displayName: "Elite",
    price: "$49",
    period: "/month",
    canPaperTrade: true,
    canLiveTrade: true,
    showCharts: true,
    badge: "👑",
  },
};

const UPGRADE_PLANS = [
  { dbTier: "common", displayName: "Pro", price: "$19", period: "/month", icon: "⭐", features: ["Live Trading", "Crypto", "Priority Support"] },
  { dbTier: "rare", displayName: "Elite", price: "$49", period: "/month", icon: "👑", features: ["Everything in Pro", "Custom Indicators", "24/7 Support"] },
];

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = {
    conservative: "mean_reversion",
    balanced: "ai_weighted",
    ai: "ai_weighted",
    momentum: "momentum",
  };
  return aliases[v] || v || "ai_weighted";
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
    <div id={id} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
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

function Button({ children, onClick, disabled, variant = "primary", size = "md", className = "" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "min-h-[44px] px-4 py-3 text-sm sm:px-5",
    lg: "min-h-[52px] px-6 py-3 text-base",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
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

const EquityCurveChart = ({ data, mode = "paper" }) => {
  const chartData = useMemo(() => {
    const labels = data?.map((d, i) => d.date || `Day ${i + 1}`) || [];
    let runningBalance = mode === "live" ? 0 : PAPER_TRADING_BALANCE;
    const equity = data?.map((d) => {
      runningBalance += Number(d.pnl || 0);
      return runningBalance;
    }) || [];
    
    return {
      labels,
      datasets: [{
        label: mode === "live" ? "Live Portfolio Value" : "Paper Portfolio Value",
        data: equity,
        borderColor: mode === "live" ? "#10b981" : "#6366f1",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: mode === "live" ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
        pointRadius: 0,
        pointHoverRadius: 5,
      }],
    };
  }, [data, mode]);
  
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

const WinRateMeter = ({ wins, losses, mode = "paper" }) => {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const color = mode === "live" ? "#10b981" : "#6366f1";
  
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${winRate * 2.827} 283`} className="transition-all duration-1000" />
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

function LiveConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <h3 className="text-xl font-extrabold text-gray-900">⚠️ Confirm Live Trading</h3>
        <p className="mt-2 text-sm text-gray-600">Live trading uses REAL money from your OKX account.</p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <strong className="text-amber-900">Risk reminder:</strong>
          <span className="text-amber-800 block mt-1">You can lose money. Start with small amounts. You can stop anytime.</span>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="warning" onClick={onConfirm} disabled={busy} className="flex-1">{busy ? "Starting..." : "Yes, Start Live Trading"}</Button>
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function UpgradeModal({ open, onClose, onUpgrade }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-2xl font-extrabold text-gray-900">Upgrade Your Plan</h2>
          <button onClick={onClose} className="text-3xl text-gray-500 hover:text-gray-700">×</button>
        </div>
        
        <div className="p-5">
          <p className="text-gray-600 mb-4">Choose the plan that's right for you:</p>
          
          <div className="grid gap-4">
            {UPGRADE_PLANS.map((plan) => (
              <button
                key={plan.dbTier}
                onClick={() => onUpgrade(plan.dbTier)}
                className="text-left p-4 rounded-xl border-2 hover:border-indigo-500 transition-all hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{plan.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
                    <div className="text-sm text-gray-500">{plan.price}{plan.period}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {plan.features.map((feature, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ {feature}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-5 border-t bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">Upgrade anytime. Cancel within 30 days for a full refund.</p>
        </div>
      </div>
    </div>
  );
}

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
  
  const [paperStats, setPaperStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [paperSeries, setPaperSeries] = useState([]);
  
  const [liveStats, setLiveStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [liveSeries, setLiveSeries] = useState([]);
  
  // OKX Balance - shown prominently
  const [okxBalance, setOkxBalance] = useState(0);
  const [okxConnected, setOkxConnected] = useState(false);
  const [okxMode, setOkxMode] = useState("paper");
  const [okxApiKeyMasked, setOkxApiKeyMasked] = useState(null);
  
  const [currentStrategy, setCurrentStrategy] = useState("ai_weighted");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [paperTradeExecuting, setPaperTradeExecuting] = useState(false);
  const [trialData, setTrialData] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);

  const userTier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user?.tier]);
  const access = useMemo(() => tierAccess[userTier] || tierAccess.starter, [userTier]);
  const activeStrategy = STRATEGIES.find((s) => s.id === currentStrategy) || STRATEGIES[0];
  
  const trialSecondsLeft = trialData?.seconds_remaining ?? (userTier === "starter" ? 7 * 86400 : 0);
  const trialStatus = trialData?.trial_status ?? (userTier === "starter" ? "active" : null);
  const isTrialExpired = trialStatus === "expired" || trialSecondsLeft <= 0;
  
  const hasPaperHistory = (paperStats.total_trades || 0) > 0;
  const hasActivePaperTrading = paperTradingEnabled;
  const isPaidTier = !["starter", "free"].includes(userTier);
  
  // Can start live trading: OKX connected AND in live mode AND paid tier
  const canStartLiveTrading = access.canLiveTrade && okxConnected && okxMode === "live";

  const activeSeries = tradingEnabled ? liveSeries : paperSeries;
  const activeWinLoss = tradingEnabled ? liveStats : paperStats;

  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  const handleLogout = useCallback(() => { 
    BotAPI.clearToken?.(); 
    BotAPI.clearApiKey?.(); 
    nav("/login"); 
  }, [nav]);

  const loadOkxBalance = useCallback(async () => {
    try {
      const balance = await BotAPI.getExchangeBalance?.().catch(() => null);
      if (balance) {
        // Parse balance safely - handle different response formats
        const okxBal = Number(balance?.okx?.total) || 
                       Number(balance?.okx?.balance) || 
                       Number(balance?.okx) || 
                       Number(balance?.data?.okx) || 0;
        setOkxBalance(okxBal);
      }
    } catch (err) {
      console.warn("Failed to load OKX balance:", err);
    }
  }, []);

  const loadLiveTradingStats = useCallback(async () => {
    if (!access.canLiveTrade) return;
    
    try {
      const liveData = await BotAPI.getLiveTradingStats?.().catch(() => null);
      if (liveData) {
        const summary = liveData.summary || liveData;
        setLiveStats({
          total_pnl: summary.total_pnl || 0,
          win_rate: summary.win_rate || 0,
          total_trades: summary.total_trades || 0,
          wins: summary.wins || 0,
          losses: summary.losses || 0,
        });
        if (liveData.daily_performance) setLiveSeries(liveData.daily_performance);
      }
      await loadOkxBalance();
    } catch (err) {
      console.warn("Failed to load live trading stats:", err);
    }
  }, [access.canLiveTrade, loadOkxBalance]);

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

      const [paperStatsPayload, integrationStatus, strategiesPayload] = await Promise.all([
        BotAPI.getUserTradingStats?.(30, true).catch(() => null),
        BotAPI.getIntegrationStatus?.(true).catch(() => null),
        BotAPI.getTradingStrategies?.(true).catch(() => null),
      ]);

      if (!mountedRef.current) return;

      const paperSummary = paperStatsPayload?.summary || paperStatsPayload?.data?.summary || {};
      setPaperStats({
        total_pnl: paperSummary.total_pnl || 0,
        win_rate: paperSummary.win_rate || 0,
        total_trades: paperSummary.total_trades || 0,
        wins: paperSummary.wins || 0,
        losses: paperSummary.losses || 0,
      });
      
      const dailySeries = paperStatsPayload?.daily_performance || paperStatsPayload?.data?.daily_performance || [];
      if (dailySeries.length) setPaperSeries(dailySeries);
      
      // Set OKX connection status
      setOkxConnected(integrationStatus?.okx_connected === true);
      setOkxMode(integrationStatus?.okx_mode || "paper");
      setOkxApiKeyMasked(integrationStatus?.okx_api_key_masked || null);
      
      setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || me?.strategy || "ai_weighted"));
      
      if (me?.trading_enabled === true || access.canLiveTrade) {
        await loadLiveTradingStats();
      } else {
        await loadOkxBalance();
      }
      
      // Load trial status
      const trial = await BotAPI.getTrialStatus?.(true);
      setTrialData(trial);
    } catch (err) {
      console.error("[MemberDashboard] Failed to load:", err);
      if (isAuthError(err)) handleLogout();
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) { setRefreshing(false); setLoading(false); }
    }
  }, [handleLogout, loadLiveTradingStats, loadOkxBalance, access.canLiveTrade]);

  const handleDisconnectOKX = useCallback(async () => {
    if (disconnecting) return;
    if (!window.confirm("Are you sure you want to disconnect OKX? This will remove your API keys.")) return;
    
    setDisconnecting(true);
    try {
      const result = await BotAPI.disconnectOKX?.();
      if (result?.success !== false) {
        notify("OKX disconnected successfully", "success");
        await loadDashboard({ force: true });
      } else {
        throw new Error(result?.error || "Disconnect failed");
      }
    } catch (err) {
      notify(err?.message || "Failed to disconnect OKX", "error");
    } finally {
      setDisconnecting(false);
    }
  }, [notify, loadDashboard, disconnecting]);

  const handleSwitchToLive = useCallback(async () => {
    if (switchingMode) return;
    
    setSwitchingMode(true);
    try {
      const result = await BotAPI.switchOKXToLive?.();
      if (result?.success !== false) {
        notify("OKX switched to LIVE mode. Real trading active.", "success");
        await loadDashboard({ force: true });
      } else {
        throw new Error(result?.error || "Switch failed");
      }
    } catch (err) {
      notify(err?.message || "Failed to switch to live mode", "error");
    } finally {
      setSwitchingMode(false);
    }
  }, [notify, loadDashboard, switchingMode]);

  const handleUpgrade = useCallback(async (targetTier) => {
    setUpgrading(true);
    try {
      const result = await BotAPI.changePlan?.(targetTier);
      if (result?.success || result?.redirecting) {
        notify(`Upgrading to ${targetTier} plan...`, "success");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        notify(result?.error || "Upgrade failed. Please try again.", "error");
      }
    } catch (err) {
      notify(err?.message || "Upgrade failed. Please try again.", "error");
    } finally {
      setUpgrading(false);
      setShowUpgradeModal(false);
    }
  }, [notify]);

  const handleManualPaperTrade = async () => {
    if (paperTradeExecuting) return;
    if (!hasActivePaperTrading) {
      notify("Please enable paper trading first", "error");
      return;
    }
    
    setPaperTradeExecuting(true);
    try {
      const symbols = ["BTC/USD", "ETH/USD", "SOL/USD"];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const qty = Number((Math.random() * 0.5 + 0.1).toFixed(4));
      
      const result = await BotAPI.request?.("/api/trading/paper-trade", {
        method: "POST",
        data: { exchange: "paper", symbol, side, qty, strategy: currentStrategy }
      });
      
      if (result?.success !== false) {
        notify(`Paper trade executed on ${symbol}!`, "success");
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
      notify(enabled ? "Paper trading enabled!" : "Paper trading disabled.", "success");
      await loadDashboard({ silent: true, force: true });
    } catch (err) {
      notify(err?.message || "Failed to update paper trading.", "error");
    } finally {
      setTogglingPaper(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    if (togglingTrading || togglingPaper || !access.canLiveTrade) return;
    
    // Check if OKX is connected and in live mode
    if (enabled && !canStartLiveTrading) {
      if (!okxConnected) {
        setShowApiModal(true);
        notify("Connect OKX first.", "error");
      } else if (okxMode !== "live") {
        notify("Switch OKX to LIVE mode first.", "error");
      }
      return;
    }

    setTogglingTrading(true);
    try {
      const result = await BotAPI.toggleTrading?.(enabled);
      const success = result?.success !== false;
      if (!success) throw new Error(result?.error || "Failed");
      setTradingEnabled(enabled);
      notify(enabled ? "Live trading started!" : "Live trading stopped.", "success");
      setShowLiveConfirm(false);
      await loadDashboard({ silent: true, force: true });
    } catch (err) {
      notify(err?.message || "Failed to update.", "error");
    } finally { 
      setTogglingTrading(false);
    }
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
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900">Loading your dashboard…</div>
          <div className="mt-2 text-sm text-gray-600">Getting your trading status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-4 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} />
      
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        
        {/* HEADER */}
        <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Welcome back 👋</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={tradingEnabled ? "success" : paperTradingEnabled ? "blue" : "slate"}>
                  {tradingEnabled ? "💰 Live Active" : paperTradingEnabled ? "🎮 Paper Active" : "📝 Inactive"}
                </StatusPill>
                <StatusPill tone={okxConnected ? "green" : "amber"}>
                  🔌 OKX {okxConnected ? `Connected (${okxMode === "live" ? "LIVE" : "Paper"})` : "Not Connected"}
                </StatusPill>
                <StatusPill tone="blue">🎯 Strategy: {activeStrategy.name}</StatusPill>
                <StatusPill tone={access.canLiveTrade ? "success" : "amber"}>{access.badge} {access.label}</StatusPill>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => loadDashboard({ force: true })} disabled={refreshing} className="w-full sm:w-auto">{refreshing ? "..." : "Refresh"}</Button>
              <Button variant="secondary" onClick={() => setShowApiModal(true)} className="w-full sm:w-auto">Keys</Button>
            </div>
          </div>
        </div>

        {/* OKX LIVE TRADING SECTION - Prominent and clear */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl">💎</span>
              <h2 className="text-xl font-extrabold text-gray-900">OKX Live Trading</h2>
            </div>
            
            {/* OKX Balance - Always visible */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-500">Available Balance</p>
                  <p className="text-3xl font-bold text-gray-900">{usd(okxBalance)}</p>
                  <p className="text-xs text-gray-400 mt-1">Connected: {okxConnected ? "✅ Yes" : "❌ No"}</p>
                </div>
                <div>
                  <StatusPill tone={okxMode === "live" ? "purple" : "blue"} className="text-sm">
                    {okxMode === "live" ? "🔴 LIVE MODE" : "📝 PAPER MODE"}
                  </StatusPill>
                </div>
              </div>
            </div>
            
            {/* Connection Status & Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-2">🔑 API Connection</p>
                {okxConnected ? (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">✓ Connected</p>
                    {okxApiKeyMasked && (
                      <code className="block bg-gray-100 px-2 py-1 rounded text-xs">{okxApiKeyMasked}</code>
                    )}
                    <Button variant="danger" size="sm" onClick={handleDisconnectOKX} disabled={disconnecting} className="mt-2">
                      {disconnecting ? "Disconnecting..." : "Disconnect OKX"}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-amber-600 mb-2">⚠️ Not connected</p>
                    <Button variant="secondary" size="sm" onClick={() => setShowApiModal(true)}>
                      Connect OKX API Keys
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="font-bold text-gray-900 mb-2">🎮 Trading Mode</p>
                {okxConnected && okxMode === "paper" && (
                  <div className="space-y-2">
                    <p className="text-sm text-blue-600">Currently in PAPER trading mode</p>
                    <p className="text-xs text-gray-500">Paper trades use virtual funds for testing</p>
                    <Button variant="warning" size="sm" onClick={handleSwitchToLive} disabled={switchingMode}>
                      {switchingMode ? "Switching..." : "Switch to LIVE Mode →"}
                    </Button>
                  </div>
                )}
                {okxConnected && okxMode === "live" && (
                  <div className="space-y-2">
                    <p className="text-sm text-purple-600 font-bold">🔴 LIVE MODE ACTIVE</p>
                    <p className="text-xs text-gray-500">Real funds from your OKX account will be used</p>
                    {!tradingEnabled && canStartLiveTrading && (
                      <Button variant="success" size="sm" onClick={() => setShowLiveConfirm(true)}>
                        Start Live Trading
                      </Button>
                    )}
                    {tradingEnabled && (
                      <Button variant="danger" size="sm" onClick={() => handleToggleTrading(false)} disabled={togglingTrading}>
                        Stop Live Trading
                      </Button>
                    )}
                  </div>
                )}
                {!access.canLiveTrade && (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-600">Upgrade required for live trading</p>
                    <Button variant="warning" size="sm" onClick={() => setShowUpgradeModal(true)}>
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* PAPER TRADING SECTION */}
        <Card className="border-blue-200 bg-blue-50/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                <h2 className="text-lg font-extrabold text-blue-900">Paper Trading</h2>
              </div>
              <p className="text-sm text-blue-800 mt-1">
                {paperTradingEnabled
                  ? `Active. Virtual balance: ${usd(PAPER_TRADING_BALANCE + paperStats.total_pnl)}`
                  : hasPaperHistory
                  ? `${paperStats.total_trades} historical trades | P&L: ${usd(paperStats.total_pnl)}`
                  : "Practice with $1,000 virtual funds. No API keys needed."}
              </p>
            </div>
            <div className="flex gap-2">
              {paperTradingEnabled ? (
                <>
                  <Button variant="secondary" onClick={handleManualPaperTrade} disabled={paperTradeExecuting}>
                    {paperTradeExecuting ? "Trading..." : "Manual Trade"}
                  </Button>
                  <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>
                    Stop Paper
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>
                  {togglingPaper ? "Starting..." : "Start Paper Trading"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
            <div className="text-2xl font-extrabold text-gray-900">
              {tradingEnabled ? usd(liveStats.total_pnl) : usd(paperStats.total_pnl)}
            </div>
            <div className="text-xs text-gray-500 font-medium">Total P&L</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
            <div className="text-2xl font-extrabold text-gray-900">
              {pct(tradingEnabled ? liveStats.win_rate : paperStats.win_rate)}
            </div>
            <div className="text-xs text-gray-500 font-medium">Win Rate</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
            <div className="text-2xl font-extrabold text-gray-900">
              {tradingEnabled ? liveStats.total_trades : paperStats.total_trades}
            </div>
            <div className="text-xs text-gray-500 font-medium">Total Trades</div>
          </div>
          <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
            <div className="text-2xl font-extrabold text-gray-900">
              {tradingEnabled ? "💰 Live" : paperTradingEnabled ? "🎮 Paper" : "📝 Setup"}
            </div>
            <div className="text-xs text-gray-500 font-medium">Mode</div>
          </div>
        </div>

        {/* EQUITY CURVE */}
        <Card>
          <SectionTitle helper={tradingEnabled ? "Live portfolio value over time" : "Paper portfolio value over time"}>
            {tradingEnabled ? "💰 Live Equity Curve" : "📈 Paper Equity Curve"}
          </SectionTitle>
          <div className="h-[300px] w-full">
            <EquityCurveChart data={activeSeries} mode={tradingEnabled ? "live" : "paper"} />
          </div>
        </Card>

        {/* CHARTS SECTION */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionTitle helper="Win/Loss breakdown">🎯 Win Rate</SectionTitle>
            <div className="h-[280px]">
              <WinRateMeter 
                wins={activeWinLoss.wins} 
                losses={activeWinLoss.losses} 
                mode={tradingEnabled ? "live" : "paper"} 
              />
            </div>
          </Card>
          
          <Card>
            <SectionTitle helper="Pick your strategy">🎯 Active Strategy</SectionTitle>
            <div className="space-y-3">
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => handleStrategyChange(strategy)}
                  disabled={!!savingStrategy}
                  className={`w-full rounded-xl border p-3 text-left transition ${currentStrategy === strategy.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{strategy.emoji}</span>
                      <span className="font-extrabold text-gray-900">{strategy.name}</span>
                      <StatusPill tone={strategy.risk === "Low" ? "green" : "amber"}>{strategy.risk}</StatusPill>
                    </div>
                    {currentStrategy === strategy.id && <span className="text-indigo-600 text-sm font-bold">✓ Active</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{strategy.description}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Button variant="secondary" onClick={() => setShowApiModal(true)}>Manage API Keys</Button>
          {!access.canLiveTrade && (
            <Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade Plan 💳</Button>
          )}
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-extrabold text-gray-900">Connect OKX API Keys</h2>
              <button onClick={() => setShowApiModal(false)} className="text-3xl text-gray-500 hover:text-gray-700">×</button>
            </div>
            
            <div className="mb-5 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              💡 Create API keys with <strong>trade permission only</strong> - no withdrawals. Start with Paper mode first.
            </div>
            
            <div className="border rounded-xl p-4">
              <h3 className="font-bold text-gray-900">OKX (Crypto)</h3>
              <p className="text-sm text-gray-500 mb-2">Create API key with trade permission only - no withdrawals</p>
              <Button variant="secondary" size="sm" onClick={() => window.open("https://www.okx.com/account/my-api", "_blank")}>
                Create OKX Keys →
              </Button>
            </div>
            
            <div className="mt-5 text-center text-xs text-gray-400">
              After connecting, switch from Paper to Live mode when ready.
            </div>
          </div>
        </div>
      )}

      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleTrading(true)} busy={togglingTrading} />
    </div>
  );
}