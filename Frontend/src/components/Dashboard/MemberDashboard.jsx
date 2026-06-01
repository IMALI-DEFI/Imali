// src/components/Dashboard/MemberDashboard.jsx - CLEAN VERSION (OKX + Alpaca, no cross-requirements)
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
import { Line, Bar } from "react-chartjs-2";

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
  { id: "mean_reversion", name: "Conservative", emoji: "🛡️", risk: "Low", description: "Looks for dips and safer rebounds." },
  { id: "ai_weighted", name: "Balanced", emoji: "⚖️", risk: "Medium", description: "Uses a mix of multiple trading signals." },
  { id: "momentum", name: "Momentum", emoji: "🔥", risk: "High", description: "Follows strong price moves." },
  { id: "arbitrage", name: "Arbitrage", emoji: "🔄", risk: "Low", description: "Looks for price differences across venues." },
];

const tierAccess = {
  starter: { label: "Starter", canPaperTrade: true, canLiveTrade: false, badge: "🌱" },
  common: { label: "Pro", canPaperTrade: true, canLiveTrade: true, badge: "⭐" },
  rare: { label: "Elite", canPaperTrade: true, canLiveTrade: true, badge: "👑" },
  epic: { label: "Elite+", canPaperTrade: true, canLiveTrade: true, badge: "💎" },
  legendary: { label: "Legendary", canPaperTrade: true, canLiveTrade: true, badge: "🏆" },
  enterprise: { label: "Enterprise", canPaperTrade: true, canLiveTrade: true, badge: "🏢" },
};

const UPGRADE_PLANS = [
  { dbTier: "common", displayName: "Pro", price: "$19", icon: "⭐", features: ["Live Trading", "Stocks", "Crypto"] },
  { dbTier: "rare", displayName: "Elite", price: "$49", icon: "👑", features: ["Everything in Pro", "DEX Trading"] },
];

const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = { conservative: "mean_reversion", balanced: "ai_weighted", ai: "ai_weighted" };
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
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
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
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${classes[tone] || classes.slate} ${className}`}>{children}</span>;
}

function Button({ children, onClick, disabled, variant = "primary", size = "md", className = "" }) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };
  const sizes = { sm: "px-3 py-2 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-extrabold transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function Toast({ message, type, onClose }) {
  if (!message) return null;
  const tone = type === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-green-300 bg-green-50 text-green-900";
  return (
    <div className={`fixed left-3 right-3 top-3 z-[60] rounded-2xl border p-4 text-sm font-bold shadow-xl sm:left-auto sm:right-4 sm:max-w-md ${tone}`}>
      <div className="flex justify-between gap-4">
        <span>{message}</span>
        <button onClick={onClose} className="text-lg">×</button>
      </div>
    </div>
  );
}

const EquityCurveChart = ({ data }) => {
  const chartData = useMemo(() => {
    const labels = data?.map((d, i) => d.date || `Day ${i + 1}`) || [];
    let running = 1000;
    const equity = data?.map(d => { running += Number(d.pnl || 0); return running; }) || [];
    return { labels, datasets: [{ data: equity, borderColor: "#6366f1", borderWidth: 2, fill: true, backgroundColor: "rgba(99,102,241,0.1)" }] };
  }, [data]);
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  if (!data?.length) return <div className="flex h-full items-center justify-center text-center text-gray-500">No equity data yet</div>;
  return <Line data={chartData} options={options} />;
};

const WinRateMeter = ({ wins, losses }) => {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={`${winRate * 2.827} 283`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{winRate.toFixed(0)}%</span>
          <span className="text-xs text-gray-500">Win Rate</span>
        </div>
      </div>
      <div className="mt-4 flex gap-6 text-center">
        <div><div className="text-xl font-bold text-green-600">{wins}</div><div className="text-xs text-gray-500">Wins</div></div>
        <div><div className="text-xl font-bold text-red-600">{losses}</div><div className="text-xs text-gray-500">Losses</div></div>
      </div>
    </div>
  );
};

function LiveConfirmModal({ open, onCancel, onConfirm, busy, exchange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <h3 className="text-xl font-bold">⚠️ Confirm Live Trading</h3>
        <p className="mt-2 text-sm text-gray-600">Live trading uses REAL money from your {exchange?.toUpperCase()} account.</p>
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">You can lose money. Start small.</div>
        <div className="mt-5 flex gap-3">
          <Button variant="warning" onClick={onConfirm} disabled={busy}>{busy ? "Starting..." : "Yes, Start Live"}</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function UpgradeModal({ open, onClose, onUpgrade }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white">
        <div className="flex justify-between p-5 border-b">
          <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
          <button onClick={onClose} className="text-3xl">×</button>
        </div>
        <div className="p-5 grid gap-4">
          {UPGRADE_PLANS.map(plan => (
            <button key={plan.dbTier} onClick={() => onUpgrade(plan.dbTier)} className="text-left p-4 rounded-xl border-2 hover:border-indigo-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{plan.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{plan.displayName}</h3>
                  <div className="text-sm text-gray-500">{plan.price}/month</div>
                  <div className="flex gap-1 mt-1">{plan.features.map(f => <span key={f} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ {f}</span>)}</div>
                </div>
              </div>
            </button>
          ))}
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
  const pollingRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [user, setUser] = useState(null);
  
  // Stats
  const [paperStats, setPaperStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [paperSeries, setPaperSeries] = useState([]);
  const [liveStats, setLiveStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [liveSeries, setLiveSeries] = useState([]);
  
  // Exchange connections
  const [okx, setOkx] = useState({ connected: false, mode: "paper", apiKeyMasked: null, balance: 0 });
  const [alpaca, setAlpaca] = useState({ connected: false, mode: "paper", apiKeyMasked: null, balance: 0 });
  
  const [currentStrategy, setCurrentStrategy] = useState("ai_weighted");
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [paperTradeExecuting, setPaperTradeExecuting] = useState(false);
  const [toggling, setToggling] = useState({ paper: false, okx: false, alpaca: false });
  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState({ open: false, exchange: null });
  const [activeTab, setActiveTab] = useState("overview");
  const [trialData, setTrialData] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const userTier = user?.tier?.toLowerCase() || "starter";
  const access = tierAccess[userTier] || tierAccess.starter;
  const trialSecondsLeft = trialData?.seconds_remaining ?? (userTier === "starter" ? 7 * 86400 : 0);
  const isTrialExpired = trialSecondsLeft <= 0;
  const hasPaperHistory = paperStats.total_trades > 0;
  
  const activeStats = { total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 };
  const activeSeries = [];

  const notify = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  };

  const handleLogout = () => { BotAPI.clearToken?.(); BotAPI.clearApiKey?.(); nav("/login"); };

  const loadDashboard = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;
    loadingRef.current = true;
    lastRefreshRef.current = now;
    setLoading(true);
    setRefreshing(true);
    try {
      if (BotAPI.refreshActivation) await BotAPI.refreshActivation(true);
      const me = await BotAPI.getMe?.(true);
      if (!me?.id) { handleLogout(); return; }
      if (!mountedRef.current) return;
      setUser(me);
      setPaperTradingEnabled(me?.paper_trading_enabled === true);

      const [paperStatsPayload, integrationStatus, strategiesPayload, balanceData] = await Promise.all([
        BotAPI.getUserTradingStats?.(30, true).catch(() => null),
        BotAPI.getIntegrationStatus?.(true).catch(() => null),
        BotAPI.getTradingStrategies?.(true).catch(() => null),
        BotAPI.getExchangeBalance?.().catch(() => null),
      ]);

      if (!mountedRef.current) return;

      const paperSummary = paperStatsPayload?.summary || {};
      setPaperStats({
        total_pnl: paperSummary.total_pnl || 0,
        win_rate: paperSummary.win_rate || 0,
        total_trades: paperSummary.total_trades || 0,
        wins: paperSummary.wins || 0,
        losses: paperSummary.losses || 0,
      });
      setPaperSeries(paperStatsPayload?.daily_performance || []);
      
      // Update OKX
      setOkx({
        connected: integrationStatus?.okx_connected === true,
        mode: integrationStatus?.okx_mode || "paper",
        apiKeyMasked: integrationStatus?.okx_api_key_masked || null,
        balance: Number(balanceData?.okx?.total) || Number(balanceData?.okx) || 0,
      });
      
      // Update Alpaca
      setAlpaca({
        connected: integrationStatus?.alpaca_connected === true,
        mode: integrationStatus?.alpaca_mode || "paper",
        apiKeyMasked: integrationStatus?.alpaca_api_key_masked || null,
        balance: Number(balanceData?.alpaca?.total) || Number(balanceData?.alpaca) || 0,
      });
      
      setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || me?.strategy));
      
      const trial = await BotAPI.getTrialStatus?.(true);
      setTrialData(trial);
    } catch (err) {
      console.error(err);
      if (isAuthError(err)) handleLogout();
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDisconnect = async (exchange) => {
    if (!confirm(`Disconnect ${exchange.toUpperCase()}? This removes your API keys.`)) return;
    setToggling(prev => ({ ...prev, [exchange]: true }));
    try {
      const result = exchange === 'okx' ? await BotAPI.disconnectOKX?.() : await BotAPI.disconnectAlpaca?.();
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} disconnected`, "success");
        await loadDashboard(true);
      }
    } catch (err) {
      notify(`Failed to disconnect ${exchange}`, "error");
    } finally {
      setToggling(prev => ({ ...prev, [exchange]: false }));
    }
  };

  const handleSwitchToLive = async (exchange) => {
    setToggling(prev => ({ ...prev, [exchange]: true }));
    try {
      const result = exchange === 'okx' ? await BotAPI.switchOKXToLive?.() : await BotAPI.switchAlpacaToLive?.();
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} switched to LIVE mode`, "success");
        await loadDashboard(true);
      }
    } catch (err) {
      notify(`Failed to switch ${exchange} to live`, "error");
    } finally {
      setToggling(prev => ({ ...prev, [exchange]: false }));
    }
  };

  const handleToggleLiveTrading = async (exchange, enabled) => {
    if (!access.canLiveTrade) { setShowUpgradeModal(true); return; }
    const exchangeData = exchange === 'okx' ? okx : alpaca;
    if (enabled && (!exchangeData.connected || exchangeData.mode !== 'live')) {
      notify(`Connect ${exchange.toUpperCase()} and switch to LIVE mode first`, "error");
      return;
    }
    setToggling(prev => ({ ...prev, [exchange]: true }));
    try {
      const result = await BotAPI.toggleTrading?.(enabled);
      if (result?.success !== false) {
        notify(enabled ? `${exchange.toUpperCase()} live trading started!` : "Live trading stopped", "success");
        await loadDashboard(true);
      }
    } catch (err) {
      notify("Failed to toggle live trading", "error");
    } finally {
      setToggling(prev => ({ ...prev, [exchange]: false }));
      setShowLiveConfirm({ open: false, exchange: null });
    }
  };

  const handleTogglePaperTrading = async (enabled) => {
    if (!access.canPaperTrade) return;
    setToggling(prev => ({ ...prev, paper: true }));
    try {
      const result = await BotAPI.togglePaperTrading?.(enabled);
      if (result?.success !== false) {
        setPaperTradingEnabled(enabled);
        notify(enabled ? "Paper trading enabled" : "Paper trading disabled", "success");
        await loadDashboard(true);
      }
    } catch (err) {
      notify("Failed to update paper trading", "error");
    } finally {
      setToggling(prev => ({ ...prev, paper: false }));
    }
  };

  const handleManualPaperTrade = async () => {
    if (paperTradeExecuting || !paperTradingEnabled) return;
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
        await loadDashboard(true);
      }
    } catch (err) {
      notify("Trade failed", "error");
    } finally {
      setPaperTradeExecuting(false);
    }
  };

  const handleStrategyChange = async (strategy) => {
    if (strategy.id === currentStrategy || savingStrategy) return;
    setSavingStrategy(true);
    try {
      await BotAPI.updateUserStrategy(strategy.id);
      setCurrentStrategy(strategy.id);
      notify(`${strategy.name} strategy activated`, "success");
    } catch (err) {
      notify("Failed to update strategy", "error");
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleUpgrade = async (tier) => {
    const result = await BotAPI.changePlan?.(tier);
    if (result?.redirecting) notify("Redirecting to checkout...", "success");
    else if (result?.success) { notify("Plan upgraded!", "success"); setTimeout(() => window.location.reload(), 1500); }
    else notify(result?.error || "Upgrade failed", "error");
    setShowUpgradeModal(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard();
    pollingRef.current = setInterval(() => loadDashboard(), 30000);
    return () => { mountedRef.current = false; if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-center"><div className="text-xl font-bold">Loading dashboard…</div></div></div>;
  }

  const ExchangeCard = ({ name, icon, data, onConnect, onDisconnect, onSwitchToLive, onStartLive, isLiveTradingActive }) => (
    <Card className="border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-gray-900">{name}</h3>
        <StatusPill tone={data.connected ? "green" : "amber"}>{data.connected ? "Connected" : "Not Connected"}</StatusPill>
        {data.connected && <StatusPill tone={data.mode === "live" ? "purple" : "blue"}>{data.mode === "live" ? "🔴 LIVE" : "📝 Paper"}</StatusPill>}
      </div>
      
      {data.connected && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-xl font-bold text-gray-900">{usd(data.balance)}</div>
          {data.apiKeyMasked && <div className="text-xs text-gray-400 mt-1">Key: {data.apiKeyMasked}</div>}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {!data.connected ? (
          <Button variant="secondary" size="sm" onClick={onConnect}>Connect {name}</Button>
        ) : (
          <>
            {data.mode === "paper" && access.canLiveTrade && (
              <Button variant="warning" size="sm" onClick={onSwitchToLive} disabled={toggling[name.toLowerCase()]}>
                Switch to LIVE
              </Button>
            )}
            {data.mode === "live" && !isLiveTradingActive && (
              <Button variant="success" size="sm" onClick={onStartLive} disabled={toggling[name.toLowerCase()]}>
                Start Live Trading
              </Button>
            )}
            {isLiveTradingActive && (
              <Button variant="danger" size="sm" onClick={() => handleToggleLiveTrading(name.toLowerCase(), false)} disabled={toggling[name.toLowerCase()]}>
                Stop Live
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={onDisconnect} disabled={toggling[name.toLowerCase()]}>
              Disconnect
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} />
      <LiveConfirmModal 
        open={showLiveConfirm.open} 
        exchange={showLiveConfirm.exchange}
        onCancel={() => setShowLiveConfirm({ open: false, exchange: null })} 
        onConfirm={() => handleToggleLiveTrading(showLiveConfirm.exchange, true)} 
        busy={toggling[showLiveConfirm.exchange || '']} 
      />
      
      <div className="mx-auto max-w-7xl space-y-5">
        
        {/* Header */}
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome back 👋</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>🎮 Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={okx.mode === "live" ? "purple" : "slate"}>💰 OKX {okx.mode === "live" ? "Live" : "Paper"}</StatusPill>
                <StatusPill tone={alpaca.mode === "live" ? "purple" : "slate"}>📈 Alpaca {alpaca.mode === "live" ? "Live" : "Paper"}</StatusPill>
                <StatusPill tone={access.canLiveTrade ? "green" : "amber"}>{access.badge} {access.label}</StatusPill>
                {userTier === "starter" && !isTrialExpired && <StatusPill tone="green">⏱️ {formatTimeLeft(trialSecondsLeft)} left</StatusPill>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => loadDashboard(true)} disabled={refreshing}>Refresh</Button>
              <Button variant="secondary" onClick={() => setShowApiModal(true)}>Add Keys</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          {["overview", "exchanges", "strategies"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-bold ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border"}`}>
              {tab === "overview" && "📊 Overview"}
              {tab === "exchanges" && "🔌 Exchanges"}
              {tab === "strategies" && "🎯 Strategies"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Paper Trading Card */}
            <Card className="border-blue-200 bg-blue-50/30">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2"><span className="text-2xl">🎮</span><h2 className="text-lg font-bold text-blue-900">Paper Trading</h2></div>
                  <p className="text-sm text-blue-800 mt-1">{paperTradingEnabled ? `Active | Balance: ${usd(PAPER_TRADING_BALANCE + paperStats.total_pnl)}` : hasPaperHistory ? `${paperStats.total_trades} trades | P&L: ${usd(paperStats.total_pnl)}` : "Practice with $1,000 virtual funds"}</p>
                </div>
                <div className="flex gap-2">
                  {paperTradingEnabled ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={handleManualPaperTrade} disabled={paperTradeExecuting}>Manual Trade</Button>
                      <Button variant="danger" size="sm" onClick={() => handleTogglePaperTrading(false)} disabled={toggling.paper}>Stop</Button>
                    </>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => handleTogglePaperTrading(true)} disabled={toggling.paper}>Start Paper Trading</Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{usd(paperStats.total_pnl)}</div><div className="text-xs text-gray-500">Paper P&L</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{pct(paperStats.win_rate)}</div><div className="text-xs text-gray-500">Paper Win Rate</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{paperStats.total_trades}</div><div className="text-xs text-gray-500">Paper Trades</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">🎮</div><div className="text-xs text-gray-500">Paper Mode</div></div>
            </div>

            {/* Equity Chart */}
            <Card><SectionTitle>📈 Equity Curve</SectionTitle><div className="h-[300px]"><EquityCurveChart data={paperSeries} /></div></Card>

            {/* Win Rate Chart */}
            <Card><SectionTitle>🎯 Win Rate</SectionTitle><div className="h-[300px]"><WinRateMeter wins={paperStats.wins} losses={paperStats.losses} /></div></Card>
          </div>
        )}

        {/* Exchanges Tab - Where you add API keys */}
        {activeTab === "exchanges" && (
          <div className="grid gap-5 md:grid-cols-2">
            <ExchangeCard 
              name="OKX" icon="💎" data={okx}
              onConnect={() => setShowApiModal(true)}
              onDisconnect={() => handleDisconnect("okx")}
              onSwitchToLive={() => handleSwitchToLive("okx")}
              onStartLive={() => setShowLiveConfirm({ open: true, exchange: "okx" })}
              isLiveTradingActive={false}
            />
            <ExchangeCard 
              name="Alpaca" icon="📈" data={alpaca}
              onConnect={() => setShowApiModal(true)}
              onDisconnect={() => handleDisconnect("alpaca")}
              onSwitchToLive={() => handleSwitchToLive("alpaca")}
              onStartLive={() => setShowLiveConfirm({ open: true, exchange: "alpaca" })}
              isLiveTradingActive={false}
            />
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === "strategies" && (
          <Card>
            <SectionTitle>Choose Your Trading Strategy</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {STRATEGIES.map(s => (
                <button key={s.id} onClick={() => handleStrategyChange(s)} disabled={savingStrategy} className={`rounded-xl border p-4 text-left transition ${currentStrategy === s.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                  <div className="flex items-center gap-2"><span className="text-2xl">{s.emoji}</span><span className="font-bold">{s.name}</span><StatusPill tone={s.risk === "Low" ? "green" : "amber"}>{s.risk}</StatusPill></div>
                  <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                  {currentStrategy === s.id && <div className="mt-2 text-xs font-bold text-indigo-600">✓ Active</div>}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-center gap-3 pt-4">
          {!access.canLiveTrade && <Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro 💳</Button>}
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* API Modal - Add your keys here */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Connect API Keys</h2><button onClick={() => setShowApiModal(false)} className="text-3xl">×</button></div>
            <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">💡 Create API keys with <strong>trade permission only</strong> (no withdrawals). Start with Paper mode first.</div>
            
            <div className="space-y-4">
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">📈 Alpaca (Stocks)</h3>
                <p className="text-sm text-gray-500 mb-2">Get API keys from Alpaca dashboard</p>
                <Button variant="secondary" size="sm" onClick={() => window.open("https://app.alpaca.markets/paper/dashboard/api-keys", "_blank")}>Create Alpaca Keys →</Button>
                <div className="mt-2 text-xs text-gray-400">After getting keys, contact support to add them securely.</div>
              </div>
              
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">💎 OKX (Crypto)</h3>
                <p className="text-sm text-gray-500 mb-2">Create API key with trade permission only</p>
                <Button variant="secondary" size="sm" onClick={() => window.open("https://www.okx.com/account/my-api", "_blank")}>Create OKX Keys →</Button>
                <div className="mt-2 text-xs text-gray-400">After getting keys, contact support to add them securely.</div>
              </div>
            </div>
            
            <div className="mt-5 text-center text-xs text-gray-500">
              For security, API keys are added by admin. Contact support@imali-defi.com to add your keys.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}