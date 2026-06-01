// src/components/Dashboard/MemberDashboard.jsx - FULLY CORRECTED
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  { id: "mean_reversion", name: "Conservative", emoji: "🛡️", risk: "Low", minTier: "starter", description: "Catches dips, targets safe rebounds" },
  { id: "ai_weighted", name: "Balanced", emoji: "⚖️", risk: "Medium", minTier: "starter", description: "AI-weighted blend of multiple signals" },
  { id: "momentum", name: "Momentum", emoji: "🔥", risk: "High", minTier: "starter", description: "Rides strong trend breakouts aggressively" },
  { id: "arbitrage", name: "Arbitrage", emoji: "🔄", risk: "Low", minTier: "rare", description: "Profits from price differences across venues" },
];

const TIERS = {
  starter: { label: "Starter", badge: "🌱", level: 0, canLiveTrade: false, canPaperTrade: true },
  common: { label: "Pro", badge: "⭐", level: 1, canLiveTrade: true, canPaperTrade: true },
  rare: { label: "Elite", badge: "👑", level: 2, canLiveTrade: true, canPaperTrade: true },
  epic: { label: "Elite+", badge: "💎", level: 3, canLiveTrade: true, canPaperTrade: true },
  legendary: { label: "Legendary", badge: "🏆", level: 4, canLiveTrade: true, canPaperTrade: true },
  enterprise: { label: "Enterprise", badge: "🏢", level: 5, canLiveTrade: true, canPaperTrade: true },
};

const EXCHANGES = [
  { id: "okx", name: "OKX", icon: "🟡", desc: "Crypto spot & futures", minTier: "starter" },
  { id: "alpaca", name: "Alpaca", icon: "🦙", desc: "US stocks & ETFs", minTier: "common" },
];

const UPGRADE_PLANS = [
  { tier: "common", name: "Pro", badge: "⭐", price: "$19", features: ["Live Trading", "Stocks", "Crypto"] },
  { tier: "rare", name: "Elite", badge: "👑", price: "$49", features: ["Everything in Pro", "DEX Trading", "Custom Indicators"] },
];

const usd = (n = 0) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${classes[tone] || classes.slate} ${className}`}>
      {children}
    </span>
  );
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
    <button onClick={onClick} disabled={disabled} className={`rounded-xl font-extrabold transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

function Toast({ message, type, onClose }) {
  if (!message) return null;
  const tone = type === "error" ? "border-red-300 bg-red-50 text-red-900" : type === "success" ? "border-green-300 bg-green-50 text-green-900" : "border-blue-300 bg-blue-50 text-blue-900";
  return (
    <div className={`fixed left-3 right-3 top-3 z-[60] rounded-2xl border p-4 text-sm font-bold shadow-xl sm:left-auto sm:right-4 sm:max-w-md ${tone}`}>
      <div className="flex justify-between gap-4"><span>{message}</span><button onClick={onClose} className="text-lg">×</button></div>
    </div>
  );
}

const EquityCurveChart = ({ data, color = "#6366f1" }) => {
  const chartData = useMemo(() => {
    const labels = data?.map((d, i) => d.date || `Day ${i + 1}`) || [];
    let running = PAPER_TRADING_BALANCE;
    const equity = data?.map(d => { running += Number(d.pnl || 0); return running; }) || [];
    return { labels, datasets: [{ data: equity, borderColor: color, borderWidth: 2, fill: true, backgroundColor: color + "20", pointRadius: 0 }] };
  }, [data, color]);
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  if (!data?.length) return <div className="flex h-full items-center justify-center text-center text-gray-500">No equity data yet</div>;
  return <Line data={chartData} options={options} />;
};

const WinRateMeter = ({ wins, losses, color = "#6366f1" }) => {
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${winRate * 2.827} 283`} />
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

const TradeVolumeChart = ({ data, color = "#6366f1" }) => {
  const chartData = useMemo(() => ({
    labels: data?.map((d, i) => d.date || `Day ${i + 1}`) || [],
    datasets: [{ data: data?.map(d => d.trades || 0) || [], backgroundColor: color, borderRadius: 8 }],
  }), [data, color]);
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  if (!data?.length) return <div className="flex h-full items-center justify-center text-center text-gray-500">No volume data yet</div>;
  return <Bar data={chartData} options={options} />;
};

function LiveConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <h3 className="text-xl font-bold">⚠️ Confirm Live Trading</h3>
        <p className="mt-2 text-sm text-gray-600">Live trading uses REAL money from your connected exchange accounts.</p>
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">You can lose money. Start small. You can stop anytime.</div>
        <div className="mt-5 flex gap-3"><Button variant="warning" onClick={onConfirm} disabled={busy}>{busy ? "Starting..." : "Yes, Start Live"}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>
      </div>
    </div>
  );
}

function UpgradeModal({ open, onClose, onUpgrade, currentTier }) {
  if (!open) return null;
  const levels = { starter: 0, common: 1, rare: 2, epic: 3, legendary: 4, enterprise: 5 };
  const availablePlans = UPGRADE_PLANS.filter(p => levels[p.tier] > levels[currentTier]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white">
        <div className="flex justify-between p-5 border-b"><h2 className="text-2xl font-bold">Upgrade Your Plan</h2><button onClick={onClose} className="text-3xl">×</button></div>
        <div className="p-5 grid gap-4 md:grid-cols-2">
          {availablePlans.map(plan => (
            <button key={plan.tier} onClick={() => onUpgrade(plan.tier)} className="text-left p-4 rounded-xl border-2 hover:border-indigo-500">
              <div className="flex items-center gap-3"><span className="text-3xl">{plan.badge}</span><div><h3 className="text-xl font-bold">{plan.name}</h3><div className="text-sm text-gray-500">{plan.price}/month</div><div className="flex flex-wrap gap-1 mt-2">{plan.features.map(f => <span key={f} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ {f}</span>)}</div></div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiModal({ open, onClose, exchange }) {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  
  const handleConnect = async () => {
    setLoading(true);
    try {
      const payload = { api_key: apiKey, secret_key: secretKey };
      if (exchange === "okx") payload.passphrase = passphrase;
      const result = exchange === "alpaca" ? await BotAPI.connectAlpaca?.(payload) : await BotAPI.connectOKX?.(payload);
      if (result?.success) { onClose(); window.location.reload(); } 
      else alert(result?.error || "Connection failed");
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5">
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Connect {exchange?.toUpperCase()}</h2><button onClick={onClose} className="text-3xl">×</button></div>
        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">💡 Create API key with <strong>trade permission only</strong> - no withdrawals</div>
        <input type="text" placeholder="API Key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full border rounded-lg p-2 mb-3" />
        <input type="password" placeholder="API Secret" value={secretKey} onChange={e => setSecretKey(e.target.value)} className="w-full border rounded-lg p-2 mb-3" />
        {exchange === "okx" && <input type="text" placeholder="Passphrase" value={passphrase} onChange={e => setPassphrase(e.target.value)} className="w-full border rounded-lg p-2 mb-3" />}
        <Button variant="primary" onClick={handleConnect} disabled={loading} className="w-full">{loading ? "Connecting..." : "Connect"}</Button>
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
  
  // Paper trading state
  const [paperStats, setPaperStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [paperSeries, setPaperSeries] = useState([]);
  
  // Live trading state
  const [liveStats, setLiveStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [liveSeries, setLiveSeries] = useState([]);
  const [liveTrades, setLiveTrades] = useState([]);
  
  // Exchange balances
  const [exchangeBalances, setExchangeBalances] = useState({ okx: 0, alpaca: 0, total: 0 });
  const [exchangeModes, setExchangeModes] = useState({ okx: "paper", alpaca: "paper" });
  const [exchangeConnected, setExchangeConnected] = useState({ okx: false, alpaca: false });
  const [maskedKeys, setMaskedKeys] = useState({ okx: null, alpaca: null });
  
  const [currentStrategy, setCurrentStrategy] = useState("ai_weighted");
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [liveTradingActive, setLiveTradingActive] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [showApiModal, setShowApiModal] = useState(null);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [paperTradeExecuting, setPaperTradeExecuting] = useState(false);
  const [trialData, setTrialData] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);
  const [switchingMode, setSwitchingMode] = useState(null);

  const userTier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user?.tier]);
  const tierConfig = useMemo(() => TIERS[userTier] || TIERS.starter, [userTier]);
  const accessibleStrategies = useMemo(() => STRATEGIES.filter(s => {
    const levels = { starter: 0, common: 1, rare: 2, epic: 3, legendary: 4, enterprise: 5 };
    return levels[s.minTier] <= levels[userTier];
  }), [userTier]);
  
  const activeStrategy = accessibleStrategies.find(s => s.id === currentStrategy) || accessibleStrategies[0];
  
  // FIXED: Define activeStats properly
  const activeStats = useMemo(() => {
    if (liveTradingActive) {
      return {
        total_pnl: liveStats.total_pnl,
        win_rate: liveStats.win_rate,
        total_trades: liveStats.total_trades,
        wins: liveStats.wins,
        losses: liveStats.losses,
        mode: "live",
        modeIcon: "💰",
        modeLabel: "Live Trading"
      };
    } else if (paperTradingEnabled || paperStats.total_trades > 0) {
      return {
        total_pnl: paperStats.total_pnl,
        win_rate: paperStats.win_rate,
        total_trades: paperStats.total_trades,
        wins: paperStats.wins,
        losses: paperStats.losses,
        mode: "paper",
        modeIcon: "🎮",
        modeLabel: "Paper Trading"
      };
    }
    return {
      total_pnl: 0,
      win_rate: 0,
      total_trades: 0,
      wins: 0,
      losses: 0,
      mode: "none",
      modeIcon: "📝",
      modeLabel: "Setup Required"
    };
  }, [liveTradingActive, liveStats, paperTradingEnabled, paperStats]);
  
  const activeSeries = liveTradingActive ? liveSeries : paperSeries;
  const activeBalance = liveTradingActive ? exchangeBalances.total : (PAPER_TRADING_BALANCE + paperStats.total_pnl);
  
  const trialSecondsLeft = trialData?.seconds_remaining ?? (userTier === "starter" ? 7 * 86400 : 0);
  const trialStatus = trialData?.trial_status ?? (userTier === "starter" ? "active" : null);
  const isTrialExpired = trialStatus === "expired" || trialSecondsLeft <= 0;
  const hasPaperHistory = (paperStats.total_trades || 0) > 0;
  const anyExchangeLive = exchangeModes.okx === "live" || exchangeModes.alpaca === "live";
  const anyExchangeConnected = exchangeConnected.okx || exchangeConnected.alpaca;

  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  const handleLogout = useCallback(() => { 
    if (BotAPI.clearToken) BotAPI.clearToken(); 
    if (BotAPI.clearApiKey) BotAPI.clearApiKey(); 
    nav("/login"); 
  }, [nav]);

  const loadExchangeBalances = useCallback(async () => {
    try {
      if (!BotAPI.getExchangeBalance) return;
      const response = await BotAPI.getExchangeBalance();
      if (response) {
        const okxBalance = Number(response.okx?.total) || Number(response.okx?.balance) || Number(response.okx) || 0;
        const alpacaBalance = Number(response.alpaca?.total) || Number(response.alpaca?.balance) || Number(response.alpaca) || 0;
        setExchangeBalances({
          okx: okxBalance,
          alpaca: alpacaBalance,
          total: okxBalance + alpacaBalance
        });
      }
    } catch (err) {
      console.error("Failed to load exchange balances:", err);
    }
  }, []);

  const loadLiveTradingStats = useCallback(async () => {
    if (!tierConfig.canLiveTrade || !BotAPI.getLiveTradingStats) return;
    try {
      const liveData = await BotAPI.getLiveTradingStats();
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
        if (liveData.recent_trades) setLiveTrades(liveData.recent_trades);
      }
    } catch (err) {
      console.error("Failed to load live trading stats:", err);
    }
  }, [tierConfig.canLiveTrade]);

  const loadIntegrationStatus = useCallback(async () => {
    try {
      if (!BotAPI.getIntegrationStatus) return;
      const status = await BotAPI.getIntegrationStatus();
      if (status) {
        setExchangeConnected({
          okx: status.okx_connected === true,
          alpaca: status.alpaca_connected === true,
        });
        setExchangeModes({
          okx: status.okx_mode || "paper",
          alpaca: status.alpaca_mode || "paper",
        });
        setMaskedKeys({
          okx: status.okx_api_key_masked || null,
          alpaca: status.alpaca_api_key_masked || null,
        });
      }
    } catch (err) {
      console.error("Failed to load integration status:", err);
    }
  }, []);

  const loadTrialStatus = useCallback(async () => {
    try { 
      if (!BotAPI.getTrialStatus) return;
      const trial = await BotAPI.getTrialStatus(true); 
      setTrialData(trial);
    } catch (err) { console.warn("Failed to load trial status:", err); }
  }, []);

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
      const me = BotAPI.getMe ? await BotAPI.getMe(true) : null;
      if (me && !me?.id) { handleLogout(); return; }
      if (!mountedRef.current) return;
      if (me) {
        setUser(me);
        setLiveTradingActive(me?.trading_enabled === true);
        setPaperTradingEnabled(me?.paper_trading_enabled === true);
      }

      const paperStatsPayload = BotAPI.getUserTradingStats ? await BotAPI.getUserTradingStats(30, true).catch(() => null) : null;
      const strategiesPayload = BotAPI.getTradingStrategies ? await BotAPI.getTradingStrategies(true).catch(() => null) : null;

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
      if (strategiesPayload?.current_strategy || me?.strategy) {
        setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || me?.strategy));
      }
      
      await Promise.all([
        loadIntegrationStatus(),
        loadExchangeBalances(),
        loadLiveTradingStats(),
        loadTrialStatus(),
      ]);
      
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleLogout, loadIntegrationStatus, loadExchangeBalances, loadLiveTradingStats, loadTrialStatus]);

  const handleDisconnect = async (exchange) => {
    if (!window.confirm(`Disconnect ${exchange.toUpperCase()}? This removes your API keys.`)) return;
    setDisconnecting(exchange);
    try {
      const result = exchange === 'okx' ? await BotAPI.disconnectOKX?.() : await BotAPI.disconnectAlpaca?.();
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} disconnected`, "success");
        await loadDashboard(true);
      }
    } catch (err) { notify(`Failed to disconnect ${exchange}`, "error"); }
    finally { setDisconnecting(null); }
  };

  const handleSwitchToLive = async (exchange) => {
    if (!tierConfig.canLiveTrade) { setShowUpgradeModal(true); return; }
    setSwitchingMode(exchange);
    try {
      const result = exchange === 'okx' ? await BotAPI.switchOKXToLive?.() : await BotAPI.switchAlpacaToLive?.();
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} switched to LIVE mode`, "success");
        await loadDashboard(true);
      }
    } catch (err) { notify(`Failed to switch ${exchange} to live`, "error"); }
    finally { setSwitchingMode(null); }
  };

  const handleToggleLiveTrading = async (enabled) => {
    if (togglingLive || !tierConfig.canLiveTrade) { if (!tierConfig.canLiveTrade) setShowUpgradeModal(true); return; }
    if (enabled && !anyExchangeLive) { 
      notify("Switch an exchange to LIVE mode first", "error"); 
      return; 
    }
    setTogglingLive(true);
    try {
      const result = await BotAPI.toggleTrading?.(enabled);
      if (result?.success !== false) {
        setLiveTradingActive(enabled);
        notify(enabled ? "Live trading started!" : "Live trading stopped.", "success");
        setShowLiveConfirm(false);
        await loadDashboard(true);
      }
    } catch (err) { notify("Failed to toggle live trading", "error"); }
    finally { setTogglingLive(false); }
  };

  const handleTogglePaperTrading = async (enabled) => {
    if (togglingPaper) return;
    setTogglingPaper(true);
    try {
      const result = await BotAPI.togglePaperTrading?.(enabled);
      if (result?.success !== false) {
        setPaperTradingEnabled(enabled);
        notify(enabled ? "Paper trading enabled" : "Paper trading disabled", "success");
        await loadDashboard(true);
      }
    } catch (err) { notify("Failed to update paper trading", "error"); }
    finally { setTogglingPaper(false); }
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
    } catch (err) { notify("Trade failed", "error"); }
    finally { setPaperTradeExecuting(false); }
  };

  const handleStrategyChange = async (strategy) => {
    if (strategy.id === currentStrategy || savingStrategy) return;
    setSavingStrategy(true);
    try {
      await BotAPI.updateUserStrategy(strategy.id);
      setCurrentStrategy(strategy.id);
      notify(`${strategy.name} strategy activated`, "success");
    } catch (err) { notify("Failed to update strategy", "error"); }
    finally { setSavingStrategy(false); }
  };

  const handleUpgrade = async (tier) => {
    setUpgrading(true);
    try {
      const result = await BotAPI.changePlan?.(tier);
      if (result?.redirecting) notify("Redirecting to checkout...", "success");
      else if (result?.success) { notify("Plan upgraded!", "success"); setTimeout(() => window.location.reload(), 1500); }
      else notify(result?.error || "Upgrade failed", "error");
    } catch (err) { notify("Upgrade failed", "error"); }
    finally { setUpgrading(false); setShowUpgradeModal(false); }
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

  const getModeCardStyles = () => {
    if (liveTradingActive) return "border-green-200 bg-green-50/50";
    if (paperTradingEnabled || hasPaperHistory) return "border-blue-200 bg-blue-50/50";
    return "border-slate-200 bg-gray-50/50";
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userTier} />
      <ApiModal open={showApiModal !== null} onClose={() => setShowApiModal(null)} exchange={showApiModal} />
      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleLiveTrading(true)} busy={togglingLive} />
      
      <div className="mx-auto max-w-7xl space-y-5">
        
        {/* Header */}
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome back {user?.email?.split('@')[0] || 'Trader'} 👋</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <StatusPill tone={liveTradingActive ? "green" : paperTradingEnabled ? "blue" : "slate"}>
                  {liveTradingActive ? "💰 Live Active" : paperTradingEnabled ? "🎮 Paper Active" : "📝 Inactive"}
                </StatusPill>
                <StatusPill tone={anyExchangeConnected ? "green" : "amber"}>🔌 {anyExchangeConnected ? "Exchange Connected" : "No Exchange"}</StatusPill>
                <StatusPill tone={anyExchangeLive ? "purple" : "slate"}>⚡ {anyExchangeLive ? "LIVE Mode Ready" : "Paper Mode"}</StatusPill>
                <StatusPill tone="blue">🎯 {activeStrategy?.name || "Balanced"}</StatusPill>
                <StatusPill tone={tierConfig.canLiveTrade ? "green" : "amber"}>{tierConfig.badge} {tierConfig.label}</StatusPill>
                {userTier === "starter" && !isTrialExpired && <StatusPill tone="green">⏱️ {formatTimeLeft(trialSecondsLeft)} left</StatusPill>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => loadDashboard(true)} disabled={refreshing}>Refresh</Button>
              <Button variant="secondary" onClick={() => setShowApiModal("okx")}>Add Keys</Button>
              <Button variant="danger" onClick={handleLogout}>Logout</Button>
            </div>
          </div>
          
          {/* ACTUAL BALANCE DISPLAY */}
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <div className="text-sm text-indigo-600 font-semibold">💰 ACTUAL EXCHANGE BALANCES</div>
            <div className="flex flex-wrap gap-4 mt-2">
              <div><span className="text-gray-500">OKX:</span> <span className="font-bold text-lg">{usd(exchangeBalances.okx)}</span></div>
              <div><span className="text-gray-500">Alpaca:</span> <span className="font-bold text-lg">{usd(exchangeBalances.alpaca)}</span></div>
              <div><span className="text-gray-500">Total:</span> <span className="font-bold text-xl text-green-600">{usd(exchangeBalances.total)}</span></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "paper", label: "🎮 Paper Trading" },
            { id: "live", label: "💰 Live Trading" },
            { id: "exchanges", label: "🔌 Exchanges" },
            { id: "strategies", label: "🎯 Strategies" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-xl font-bold ${activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <Card className={getModeCardStyles()}>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2"><span className="text-2xl">{activeStats.modeIcon}</span>
                  <h2 className="text-lg font-bold">Active Mode: {activeStats.modeLabel}</h2></div>
                  <p className="text-sm mt-1">{liveTradingActive ? `Real funds: ${usd(activeBalance)}` : paperTradingEnabled ? `Virtual balance: ${usd(activeBalance)}` : "Start trading to see performance"}</p>
                </div>
                <div className="flex gap-2">
                  {!liveTradingActive && !paperTradingEnabled && <Button variant="primary" onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>Start Paper Trading</Button>}
                  {!liveTradingActive && paperTradingEnabled && <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>Stop Paper</Button>}
                  {liveTradingActive && <Button variant="danger" onClick={() => handleToggleLiveTrading(false)} disabled={togglingLive}>Stop Live</Button>}
                  {!liveTradingActive && tierConfig.canLiveTrade && anyExchangeLive && <Button variant="warning" onClick={() => setShowLiveConfirm(true)}>Start Live Trading</Button>}
                  {!tierConfig.canLiveTrade && <Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade to Trade Live</Button>}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{usd(activeStats.total_pnl)}</div><div className="text-xs text-gray-500">Total P&L</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{pct(activeStats.win_rate)}</div><div className="text-xs text-gray-500">Win Rate</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{activeStats.total_trades}</div><div className="text-xs text-gray-500">Total Trades</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{activeStats.modeIcon}</div><div className="text-xs text-gray-500">{activeStats.modeLabel}</div></div>
            </div>

            <Card><SectionTitle>📈 Equity Curve</SectionTitle><div className="h-[300px]"><EquityCurveChart data={activeSeries} color={liveTradingActive ? "#22c55e" : "#6366f1"} /></div></Card>
            <Card><SectionTitle>🎯 Win Rate</SectionTitle><div className="h-[300px]"><WinRateMeter wins={activeStats.wins} losses={activeStats.losses} color={liveTradingActive ? "#22c55e" : "#6366f1"} /></div></Card>
          </div>
        )}

        {/* Paper Trading Tab */}
        {activeTab === "paper" && (
          <div className="space-y-5">
            <Card className="border-blue-200 bg-blue-50/30">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div><h2 className="text-lg font-bold text-blue-900">🎮 Paper Trading</h2><p className="text-sm text-blue-800 mt-1">Practice with $1,000 virtual funds — no real money involved</p></div>
                <div className="flex gap-2">
                  {paperTradingEnabled ? (
                    <><Button variant="secondary" onClick={handleManualPaperTrade} disabled={paperTradeExecuting}>{paperTradeExecuting ? "Trading..." : "Manual Trade"}</Button>
                      <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>Stop Paper</Button></>
                  ) : (<Button variant="primary" onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>Start Paper Trading</Button>)}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold text-indigo-600">{usd(PAPER_TRADING_BALANCE + paperStats.total_pnl)}</div><div className="text-xs text-gray-500">Virtual Balance</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{usd(paperStats.total_pnl)}</div><div className="text-xs text-gray-500">Paper P&L</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{paperStats.total_trades}</div><div className="text-xs text-gray-500">Total Trades</div></div>
              <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{pct(paperStats.win_rate)}</div><div className="text-xs text-gray-500">Win Rate</div></div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card><SectionTitle>📈 Paper Equity Curve</SectionTitle><div className="h-[300px]"><EquityCurveChart data={paperSeries} color="#6366f1" /></div></Card>
              <Card><SectionTitle>🎯 Win / Loss</SectionTitle><div className="h-[300px]"><WinRateMeter wins={paperStats.wins} losses={paperStats.losses} color="#6366f1" /></div></Card>
            </div>
          </div>
        )}

        {/* Live Trading Tab */}
        {activeTab === "live" && (
          !tierConfig.canLiveTrade ? (
            <Card className="text-center py-12"><div className="text-5xl mb-3">🔒</div><h3 className="text-xl font-bold mb-2">Live Trading Requires Pro or Elite</h3><p className="text-gray-500 mb-4">Connect real exchange accounts and trade with AI-powered strategies.</p><Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade Now →</Button></Card>
          ) : (
            <div className="space-y-5">
              <Card className={`border-green-200 ${liveTradingActive ? "bg-green-50/50" : ""}`}>
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div><h2 className="text-lg font-bold text-green-900">💰 Live Trading</h2><p className="text-sm text-green-800 mt-1">Real funds across connected exchanges in LIVE mode</p></div>
                  {liveTradingActive ? <Button variant="danger" onClick={() => handleToggleLiveTrading(false)} disabled={togglingLive}>Stop Live Trading</Button> : <Button variant="success" onClick={() => setShowLiveConfirm(true)} disabled={!anyExchangeLive}>Start Live Trading</Button>}
                </div>
                {!anyExchangeLive && <div className="mt-3 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm">⚠️ No exchanges in LIVE mode. Go to Exchanges tab and switch an exchange to LIVE mode.</div>}
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border">
                  <div className="text-sm text-gray-500">OKX Balance</div>
                  <div className="text-2xl font-bold text-green-600">{usd(exchangeBalances.okx)}</div>
                  <div className="text-xs text-gray-400 mt-1">Mode: <span className={exchangeModes.okx === "live" ? "text-purple-600 font-bold" : "text-blue-600"}>{exchangeModes.okx === "live" ? "LIVE" : "Paper"}</span></div>
                </div>
                <div className="bg-white rounded-xl p-4 border">
                  <div className="text-sm text-gray-500">Alpaca Balance</div>
                  <div className="text-2xl font-bold text-green-600">{usd(exchangeBalances.alpaca)}</div>
                  <div className="text-xs text-gray-400 mt-1">Mode: <span className={exchangeModes.alpaca === "live" ? "text-purple-600 font-bold" : "text-blue-600"}>{exchangeModes.alpaca === "live" ? "LIVE" : "Paper"}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold text-green-600">{usd(exchangeBalances.total)}</div><div className="text-xs text-gray-500">Total Balance</div></div>
                <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{usd(liveStats.total_pnl)}</div><div className="text-xs text-gray-500">Live P&L</div></div>
                <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{liveStats.total_trades}</div><div className="text-xs text-gray-500">Total Trades</div></div>
                <div className="bg-white rounded-xl p-4 text-center border"><div className="text-2xl font-bold">{pct(liveStats.win_rate)}</div><div className="text-xs text-gray-500">Win Rate</div></div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card><SectionTitle>📈 Live Equity Curve</SectionTitle><div className="h-[300px]"><EquityCurveChart data={liveSeries} color="#22c55e" /></div></Card>
                <Card><SectionTitle>🎯 Win / Loss</SectionTitle><div className="h-[300px]"><WinRateMeter wins={liveStats.wins} losses={liveStats.losses} color="#22c55e" /></div></Card>
              </div>

              {liveTrades.length > 0 && (
                <Card><SectionTitle>📋 Recent Live Trades</SectionTitle>
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {liveTrades.slice(0, 10).map((trade, i) => (
                      <div key={trade.id || i} className="flex justify-between items-center p-3 border-b">
                        <div><span className="font-bold">{trade.symbol}</span><StatusPill tone={trade.side === 'buy' ? "green" : "red"} className="ml-2 text-xs">{trade.side?.toUpperCase()}</StatusPill></div>
                        <div className={trade.pnl >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{usd(trade.pnl)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )
        )}

        {/* Exchanges Tab */}
        {activeTab === "exchanges" && (
          <div className="grid gap-5 md:grid-cols-2">
            {EXCHANGES.map(ex => {
              const levels = { starter: 0, common: 1, rare: 2, epic: 3, legendary: 4, enterprise: 5 };
              const canAccess = levels[userTier] >= levels[ex.minTier];
              const connected = ex.id === 'okx' ? exchangeConnected.okx : exchangeConnected.alpaca;
              const mode = ex.id === 'okx' ? exchangeModes.okx : exchangeModes.alpaca;
              const balance = ex.id === 'okx' ? exchangeBalances.okx : exchangeBalances.alpaca;
              const maskedKey = ex.id === 'okx' ? maskedKeys.okx : maskedKeys.alpaca;
              
              if (!canAccess) {
                return (
                  <Card key={ex.id} className="opacity-70">
                    <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{ex.icon}</span><h3 className="text-lg font-bold">{ex.name}</h3><StatusPill tone="amber">Locked</StatusPill></div>
                    <p className="text-sm text-gray-500 mb-3">{ex.desc}</p>
                    <div className="p-3 bg-gray-100 rounded-lg text-center text-sm text-gray-500">🔒 Requires {TIERS[ex.minTier]?.label || ex.minTier}</div>
                    <Button variant="warning" size="sm" className="mt-3 w-full" onClick={() => setShowUpgradeModal(true)}>Upgrade →</Button>
                  </Card>
                );
              }
              
              return (
                <Card key={ex.id} className={`border-${connected ? 'green' : 'gray'}-200`}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-2xl">{ex.icon}</span>
                    <h3 className="text-lg font-bold">{ex.name}</h3>
                    <StatusPill tone={connected ? "green" : "amber"}>{connected ? "Connected" : "Not Connected"}</StatusPill>
                    {connected && <StatusPill tone={mode === "live" ? "purple" : "blue"}>{mode === "live" ? "🔴 LIVE" : "📝 Paper"}</StatusPill>}
                  </div>
                  
                  {connected && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500">Balance</div>
                      <div className="text-xl font-bold">{usd(balance)}</div>
                      {maskedKey && <div className="text-xs text-gray-400 mt-1">Key: {maskedKey}</div>}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {!connected && <Button variant="secondary" size="sm" onClick={() => setShowApiModal(ex.id)}>Connect {ex.name}</Button>}
                    {connected && mode === "paper" && tierConfig.canLiveTrade && <Button variant="warning" size="sm" onClick={() => handleSwitchToLive(ex.id)} disabled={switchingMode === ex.id}>{switchingMode === ex.id ? "Switching..." : "Switch to LIVE"}</Button>}
                    {connected && <Button variant="danger" size="sm" onClick={() => handleDisconnect(ex.id)} disabled={disconnecting === ex.id}>{disconnecting === ex.id ? "..." : "Disconnect"}</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === "strategies" && (
          <Card>
            <SectionTitle>Choose Your Trading Strategy</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {accessibleStrategies.map(s => (
                <button key={s.id} onClick={() => handleStrategyChange(s)} disabled={savingStrategy} className={`rounded-xl border p-4 text-left transition ${currentStrategy === s.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-300"}`}>
                  <div className="flex items-center gap-2"><span className="text-2xl">{s.emoji}</span><span className="font-bold">{s.name}</span><StatusPill tone={s.risk === "Low" ? "green" : s.risk === "Medium" ? "amber" : "red"}>{s.risk}</StatusPill></div>
                  <p className="text-sm text-gray-600 mt-1">{s.description}</p>{currentStrategy === s.id && <div className="mt-2 text-xs font-bold text-indigo-600">✓ Active</div>}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Bottom Actions */}
        <div className="flex justify-center gap-3 pt-4">
          {!tierConfig.canLiveTrade && <Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro 💳</Button>}
        </div>
      </div>
    </div>
  );
}