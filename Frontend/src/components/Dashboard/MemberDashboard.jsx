// src/components/Dashboard/MemberDashboard.jsx - CORRECTLY ORDERED (No initialization errors)
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
    displayName: "Starter",
    price: "$0",
    period: "7-day trial",
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
    badge: "🌱",
    badgeColor: "green",
  },
  common: {
    label: "Pro",
    displayName: "Pro",
    price: "$19",
    period: "/month",
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
    badge: "⭐",
    badgeColor: "orange",
  },
  rare: {
    label: "Elite",
    displayName: "Elite",
    price: "$49",
    period: "/month",
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
    badge: "👑",
    badgeColor: "purple",
  },
  epic: {
    label: "Elite+",
    displayName: "Elite Plus",
    price: "$99",
    period: "/month",
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
    badge: "💎",
    badgeColor: "blue",
  },
  legendary: {
    label: "Legendary",
    displayName: "Legendary",
    price: "$199",
    period: "/month",
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
    badge: "🏆",
    badgeColor: "amber",
  },
  enterprise: {
    label: "Enterprise",
    displayName: "Enterprise",
    price: "Custom",
    period: "",
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
    badge: "🏢",
    badgeColor: "indigo",
  },
  pro: {
    label: "Pro",
    displayName: "Pro",
    price: "$19",
    period: "/month",
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
    badge: "⭐",
    badgeColor: "orange",
  },
  elite: {
    label: "Elite",
    displayName: "Elite",
    price: "$49",
    period: "/month",
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
    badge: "👑",
    badgeColor: "purple",
  },
  bundle: {
    label: "Bundle",
    displayName: "Bundle",
    price: "$199",
    period: "/month",
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
    badge: "📦",
    badgeColor: "blue",
  },
};

const UPGRADE_PLANS = [
  { dbTier: "common", displayName: "Pro", price: "$19", period: "/month", icon: "⭐", features: ["Live Trading", "Stocks", "Crypto", "Priority Support"] },
  { dbTier: "rare", displayName: "Elite", price: "$49", period: "/month", icon: "👑", features: ["Everything in Pro", "DEX Trading", "Custom Indicators", "24/7 Support"] },
  { dbTier: "enterprise", displayName: "Enterprise", price: "Custom", period: "", icon: "🏢", features: ["Everything in Elite", "Custom Branding", "Team Management", "Dedicated Support"] },
];

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
    purple: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
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

const TradeVolumeChart = ({ data, mode = "paper" }) => {
  const chartData = useMemo(() => ({
    labels: data?.map((d, i) => d.date || `Day ${i + 1}`) || [],
    datasets: [{ 
      label: mode === "live" ? "Live Trades" : "Paper Trades", 
      data: data?.map((d) => d.trades || d.volume || 0) || [], 
      backgroundColor: mode === "live" ? "#10b981" : "#6366f1", 
      borderRadius: 8 
    }],
  }), [data, mode]);
  
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-center"><div><div className="text-5xl mb-3">📊</div><p className="text-sm font-semibold text-gray-600">No volume data yet</p></div></div>;
  }
  
  return <Bar data={chartData} options={options} />;
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
        <h3 className="text-xl font-extrabold text-gray-900">Confirm Live Trading</h3>
        <p className="mt-2 text-sm text-gray-600">Live trading uses real money through your connected exchange accounts.</p>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"><strong className="text-amber-900">⚠️ Risk reminder:</strong> <span className="text-amber-800">You can lose money. Start small. You can stop anytime.</span></div>
        <div className="mt-5 flex gap-3"><Button variant="warning" onClick={onConfirm} disabled={busy} className="flex-1">{busy ? "Starting..." : "Enable Live"}</Button><Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button></div>
      </div>
    </div>
  );
}

function UpgradeModal({ open, onClose, onUpgrade, currentTier }) {
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

  // ========== STATE DECLARATIONS ==========
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [user, setUser] = useState(null);
  
  const [paperStats, setPaperStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  const [paperSeries, setPaperSeries] = useState([]);
  
  const [liveStats, setLiveStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, balance: 0 });
  const [liveSeries, setLiveSeries] = useState([]);
  const [liveTrades, setLiveTrades] = useState([]);
  const [liveExchangeBalance, setLiveExchangeBalance] = useState({ alpaca: 0, okx: 0, total: 0 });
  
  const [integrations, setIntegrations] = useState({ 
    wallet_connected: false, 
    alpaca_connected: false, 
    okx_connected: false,
    alpaca_api_key_masked: null,
    okx_api_key_masked: null,
    alpaca_mode: "paper",
    okx_mode: "paper",
    wallet_address_masked: null,
  });
  
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);
  const [switchingMode, setSwitchingMode] = useState(null);

  // ========== MEMOIZED VALUES ==========
  const userTier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user?.tier]);
  const access = useMemo(() => tierAccess[userTier] || tierAccess.starter, [userTier]);
  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;
  const activeStrategy = STRATEGIES.find((s) => s.id === currentStrategy) || STRATEGIES[0];
  
  const trialSecondsLeft = trialData?.seconds_remaining ?? (userTier === "starter" ? 7 * 86400 : 0);
  const trialStatus = trialData?.trial_status ?? (userTier === "starter" ? "active" : null);
  const isTrialExpired = trialStatus === "expired" || trialSecondsLeft <= 0;
  
  const hasPaperHistory = (paperStats.total_trades || 0) > 0;
  const hasActivePaperTrading = paperTradingEnabled;
  const isPaidTier = !["starter", "free"].includes(userTier);
  
  const activeStats = useMemo(() => {
    if (tradingEnabled) {
      return {
        total_pnl: liveStats.total_pnl,
        win_rate: liveStats.win_rate,
        total_trades: liveStats.total_trades,
        wins: liveStats.wins,
        losses: liveStats.losses,
        balance: liveStats.balance || liveExchangeBalance.total,
        mode: "live",
        modeLabel: "Live Trading",
        modeIcon: "💰",
        modeColor: "green"
      };
    } else if (paperTradingEnabled || hasPaperHistory) {
      return {
        total_pnl: paperStats.total_pnl,
        win_rate: paperStats.win_rate,
        total_trades: paperStats.total_trades,
        wins: paperStats.wins,
        losses: paperStats.losses,
        balance: PAPER_TRADING_BALANCE + paperStats.total_pnl,
        mode: "paper",
        modeLabel: "Paper Trading",
        modeIcon: "🎮",
        modeColor: "blue"
      };
    }
    return {
      total_pnl: 0,
      win_rate: 0,
      total_trades: 0,
      wins: 0,
      losses: 0,
      balance: 0,
      mode: "none",
      modeLabel: "No Active Trading",
      modeIcon: "📝",
      modeColor: "slate"
    };
  }, [tradingEnabled, paperTradingEnabled, hasPaperHistory, liveStats, paperStats, liveExchangeBalance]);

  // ========== HELPER FUNCTIONS (NO DEPENDENCIES) ==========
  const notify = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(window.__imaliToastTimer);
    window.__imaliToastTimer = window.setTimeout(() => setToast({ message: "", type: "info" }), 4500);
  }, []);

  // ========== API CALL FUNCTIONS (ORDER MATTERS!) ==========
  
  // 1. Basic auth/logout first
  const handleLogout = useCallback(() => { 
    BotAPI.clearToken?.(); 
    BotAPI.clearApiKey?.(); 
    nav("/login"); 
  }, [nav]);

  // 2. Simple data fetchers that don't depend on other callbacks
  const loadTrialStatus = useCallback(async () => {
    try {
      const trial = await BotAPI.getTrialStatus?.(true);
      setTrialData(trial);
    } catch (err) {
      console.warn("Failed to load trial status:", err);
    }
  }, []);

  const loadExchangeBalance = useCallback(async () => {
    try {
      const balance = await BotAPI.getExchangeBalance?.().catch(() => null);
      if (balance) {
        setLiveExchangeBalance({
          alpaca: balance.alpaca || 0,
          okx: balance.okx || 0,
          total: (balance.alpaca || 0) + (balance.okx || 0)
        });
      }
    } catch (err) {
      console.warn("Failed to load exchange balance:", err);
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
          balance: summary.current_balance || summary.balance || 0,
        });
        if (liveData.daily_performance) setLiveSeries(liveData.daily_performance);
        if (liveData.recent_trades) setLiveTrades(liveData.recent_trades);
      }
      await loadExchangeBalance();
    } catch (err) {
      console.warn("Failed to load live trading stats:", err);
    }
  }, [access.canLiveTrade, loadExchangeBalance]);

  // 3. MAIN loadDashboard function (depends on above)
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

      const [paperStatsPayload, integrationsPayload, strategiesPayload, tradesPayload] = await Promise.all([
        BotAPI.getUserTradingStats?.(30, true).catch(() => null),
        BotAPI.getIntegrationStatus?.(true).catch(() => null),
        BotAPI.getTradingStrategies?.(true).catch(() => null),
        BotAPI.getGlobalTrades?.({ limit: 10, skipCache: false }).catch(() => null),
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
      
      setIntegrations({
        wallet_connected: integrationsPayload?.wallet_connected || false,
        alpaca_connected: integrationsPayload?.alpaca_connected || false,
        okx_connected: integrationsPayload?.okx_connected || false,
        alpaca_api_key_masked: integrationsPayload?.alpaca_api_key_masked || null,
        okx_api_key_masked: integrationsPayload?.okx_api_key_masked || null,
        alpaca_mode: integrationsPayload?.alpaca_mode || "paper",
        okx_mode: integrationsPayload?.okx_mode || "paper",
        wallet_address_masked: integrationsPayload?.wallet_address_masked || null,
      });
      
      setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || me?.strategy || "ai_weighted"));
      if (tradesPayload?.trades?.length) setCommunityTrades(tradesPayload.trades);
      
      if (me?.trading_enabled === true || access.canLiveTrade) {
        await loadLiveTradingStats();
      }
      
      await loadTrialStatus();
    } catch (err) {
      console.error("[MemberDashboard] Failed to load:", err);
      if (isAuthError(err)) handleLogout();
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) { setRefreshing(false); setLoading(false); }
    }
  }, [handleLogout, loadTrialStatus, loadLiveTradingStats, access.canLiveTrade]);

  // 4. Action handlers that depend on loadDashboard
  const handleDisconnect = useCallback(async (exchange) => {
    if (disconnecting) return;
    if (!window.confirm(`Are you sure you want to disconnect ${exchange.toUpperCase()}? This will remove your API keys.`)) return;
    
    setDisconnecting(exchange);
    try {
      let result;
      if (exchange === 'alpaca') {
        result = await BotAPI.disconnectAlpaca?.();
      } else if (exchange === 'okx') {
        result = await BotAPI.disconnectOKX?.();
      }
      
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} disconnected successfully`, "success");
        await loadDashboard({ force: true });
      } else {
        throw new Error(result?.error || "Disconnect failed");
      }
    } catch (err) {
      notify(err?.message || `Failed to disconnect ${exchange}`, "error");
    } finally {
      setDisconnecting(null);
    }
  }, [notify, loadDashboard, disconnecting]);

  const handleSwitchToLive = useCallback(async (exchange) => {
    if (switchingMode) return;
    
    setSwitchingMode(exchange);
    try {
      let result;
      if (exchange === 'alpaca') {
        result = await BotAPI.switchAlpacaToLive?.();
      } else if (exchange === 'okx') {
        result = await BotAPI.switchOKXToLive?.();
      }
      
      if (result?.success !== false) {
        notify(`${exchange.toUpperCase()} switched to LIVE mode. Real trading active.`, "success");
        await loadDashboard({ force: true });
      } else {
        throw new Error(result?.error || "Switch failed");
      }
    } catch (err) {
      notify(err?.message || `Failed to switch ${exchange} to live mode`, "error");
    } finally {
      setSwitchingMode(null);
    }
  }, [notify, loadDashboard, switchingMode]);

  const handleUpgrade = useCallback(async (targetTier) => {
    setUpgrading(true);
    try {
      const result = await BotAPI.changePlan?.(targetTier);
      if (result?.success || result?.redirecting) {
        notify(`Upgrading to ${tierAccess[targetTier]?.label || targetTier} plan...`, "success");
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
      notify(enabled ? "Paper trading enabled! You can now execute manual trades." : "Paper trading disabled.", "success");
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

  // ========== EFFECTS ==========
  useEffect(() => {
    mountedRef.current = true;
    loadDashboard();
    pollingIntervalRef.current = setInterval(() => loadDashboard({ silent: true }), 30000);
    return () => {
      mountedRef.current = false;
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [loadDashboard]);

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center"><div className="text-xl font-extrabold text-gray-900">Loading your dashboard…</div><div className="mt-2 text-sm text-gray-600">Getting your trading status...</div></div>
      </div>
    );
  }

  // ========== RENDER HELPERS ==========
  const activeSeries = tradingEnabled ? liveSeries : paperSeries;
  const activeWinLoss = tradingEnabled ? liveStats : paperStats;

  const getModeCardStyles = () => {
    if (activeStats.modeColor === "green") {
      return "border-green-200 bg-green-50/50";
    } else if (activeStats.modeColor === "blue") {
      return "border-blue-200 bg-blue-50/50";
    }
    return "border-slate-200 bg-gray-50/50";
  };

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-4 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userTier} />
      
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        
        {/* HEADER */}
        <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Welcome back 👋</h1>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                {tradingEnabled 
                  ? `💰 Live trading active - Real funds through OKX/Alpaca | Balance: ${usd(liveExchangeBalance.total || liveStats.balance)}` 
                  : paperTradingEnabled 
                  ? "🎮 Paper trading active - practice with virtual funds" 
                  : hasPaperHistory 
                  ? "📊 View your paper trading history"
                  : "📝 Start paper trading to learn the platform safely"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={tradingEnabled ? "purple" : paperTradingEnabled ? "green" : "slate"}>
                  {tradingEnabled ? "💰 Live Active" : paperTradingEnabled ? "🎮 Paper Active" : "📝 Inactive"}
                </StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>🔌 API {bothConnected ? "Ready" : "Needed"}</StatusPill>
                <StatusPill tone="blue">🎯 Strategy: {activeStrategy.name}</StatusPill>
                <StatusPill tone={access.canLiveTrade ? "green" : "amber"}>{access.badge} {access.label}</StatusPill>
                {trialStatus && !isPaidTier && (
                  <StatusPill tone={isTrialExpired ? "red" : "green"}>
                    ⏱️ {isTrialExpired ? "Trial Expired" : `Trial: ${formatTimeLeft(trialSecondsLeft)} left`}
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
            <Card className={getModeCardStyles()}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{activeStats.modeIcon}</span>
                    <h2 className="text-lg font-extrabold text-gray-900">Active Mode: {activeStats.modeLabel}</h2>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {tradingEnabled 
                      ? `💰 Live trading with real funds. Current balance: ${usd(liveExchangeBalance.total || liveStats.balance)}`
                      : paperTradingEnabled 
                      ? `🎮 Paper trading with virtual funds: ${usd(PAPER_TRADING_BALANCE + paperStats.total_pnl)}`
                      : "No trading mode active. Select one below to begin."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!tradingEnabled && !paperTradingEnabled && (
                    <>
                      {access.canLiveTrade && bothConnected && (
                        <Button variant="warning" onClick={() => setShowLiveConfirm(true)}>Start Live Trading</Button>
                      )}
                      <Button variant="primary" onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>
                        {togglingPaper ? "Starting..." : "Start Paper"}
                      </Button>
                    </>
                  )}
                  {tradingEnabled && (
                    <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={togglingTrading}>
                      Stop Live Trading
                    </Button>
                  )}
                  {paperTradingEnabled && (
                    <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>
                      Stop Paper Trading
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {tradingEnabled && (
              <Card className="border-green-200 bg-green-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-green-900">💰 Live Trading Details</h2>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-semibold text-green-800">OKX Balance: {usd(liveExchangeBalance.okx)}</p>
                      <p className="text-sm font-semibold text-green-800">Alpaca Balance: {usd(liveExchangeBalance.alpaca)}</p>
                      <p className="text-sm font-bold text-green-900">Total Live Funds: {usd(liveExchangeBalance.total || liveStats.balance)}</p>
                      {liveStats.total_trades > 0 && (
                        <p className="text-sm text-green-700">Live P&L: <span className={liveStats.total_pnl >= 0 ? "text-green-700" : "text-red-600"}>{usd(liveStats.total_pnl)}</span></p>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setShowApiModal(true)}>Manage Exchange Keys</Button>
                </div>
              </Card>
            )}

            {!tradingEnabled && (
              <Card className="border-blue-200 bg-blue-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-blue-900">🎮 Paper Trading Controls</h2>
                    <p className="text-sm font-semibold text-blue-800">
                      {paperTradingEnabled
                        ? `Paper trading is ON. Virtual balance: ${usd(PAPER_TRADING_BALANCE + paperStats.total_pnl)}`
                        : hasPaperHistory
                        ? `You have ${paperStats.total_trades} historical paper trades with ${usd(paperStats.total_pnl)} total P&L.`
                        : "Paper trading is OFF. Start it to practice with virtual funds."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {paperTradingEnabled ? (
                      <>
                        <Button variant="secondary" onClick={handleManualPaperTrade} disabled={paperTradeExecuting}>
                          {paperTradeExecuting ? "Trading..." : "Manual Trade"}
                        </Button>
                        <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={togglingPaper}>Stop Paper</Button>
                      </>
                    ) : (
                      <Button onClick={() => handleTogglePaperTrading(true)} disabled={togglingPaper}>
                        {togglingPaper ? "Starting..." : "Start Paper"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {!access.canLiveTrade && !tradingEnabled && (
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50/80 to-indigo-50/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{access.badge || "🌱"}</span>
                      <h2 className="text-xl font-extrabold text-purple-900">Your Plan: {access.displayName || access.label}</h2>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-purple-800">
                      {isTrialExpired ? "⚠️ Your trial has expired. Upgrade to continue live trading." : `📝 Free trial: ${formatTimeLeft(trialSecondsLeft)} remaining.`}
                    </p>
                    <p className="mt-1 text-xs text-purple-600">✨ {UPGRADE_PLANS[0]?.displayName} includes: {UPGRADE_PLANS[0]?.features.join(", ")}</p>
                  </div>
                  <Button variant="warning" onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro → 💳</Button>
                </div>
              </Card>
            )}

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{usd(activeStats.total_pnl)}</div>
                <div className="text-xs text-gray-500 font-medium">Total P&L</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{pct(activeStats.win_rate)}</div>
                <div className="text-xs text-gray-500 font-medium">Win Rate</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{activeStats.total_trades}</div>
                <div className="text-xs text-gray-500 font-medium">Total Trades</div>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200 text-center">
                <div className="text-2xl font-extrabold text-gray-900">{activeStats.modeIcon}</div>
                <div className="text-xs text-gray-500 font-medium">{activeStats.modeLabel}</div>
              </div>
            </div>

            {/* EQUITY CURVE CHART */}
            <Card>
              <SectionTitle helper={tradingEnabled ? "Your live portfolio value over time" : "Your paper portfolio value over time"}>
                {tradingEnabled ? "💰 Live Equity Curve" : "📈 Paper Equity Curve"}
              </SectionTitle>
              <div className="h-[300px] w-full">
                <EquityCurveChart data={activeSeries} mode={tradingEnabled ? "live" : "paper"} />
              </div>
            </Card>

            {tradingEnabled && liveTrades.length > 0 && (
              <Card>
                <SectionTitle helper="Your recent live trades">🔄 Recent Live Trades</SectionTitle>
                <div className="space-y-2 max-h-80 overflow-auto">
                  {liveTrades.slice(0, 10).map((trade, i) => (
                    <div key={trade.id || i} className="flex justify-between items-center p-3 border-b border-gray-100">
                      <div>
                        <span className="font-bold text-gray-900">{trade.symbol}</span>
                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded ${trade.side === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {trade.side?.toUpperCase()}
                        </span>
                      </div>
                      <div className={Number(trade.pnl) >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {usd(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

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
                <SectionTitle helper={`${tradingEnabled ? "Live" : "Paper"} Win/Loss breakdown`}>
                  🎯 Win Rate {tradingEnabled && "💰"}
                </SectionTitle>
                <div className="h-[300px]"><WinRateMeter wins={activeWinLoss.wins} losses={activeWinLoss.losses} mode={tradingEnabled ? "live" : "paper"} /></div>
              </Card>
              <Card>
                <SectionTitle helper={`${tradingEnabled ? "Live" : "Paper"} daily trade volume`}>
                  📊 Trade Volume {tradingEnabled && "💰"}
                </SectionTitle>
                <div className="h-[300px]"><TradeVolumeChart data={activeSeries} mode={tradingEnabled ? "live" : "paper"} /></div>
              </Card>
            </div>

            {paperTradingEnabled && !tradingEnabled && (
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-extrabold text-gray-900">Execute Manual Paper Trade</h3>
                    <p className="text-sm text-gray-500">Test the system with a random paper trade</p>
                  </div>
                  <Button variant="primary" onClick={handleManualPaperTrade} disabled={paperTradeExecuting}>
                    {paperTradeExecuting ? "Executing..." : "Execute Random Trade"}
                  </Button>
                </div>
              </Card>
            )}

            {!paperTradingEnabled && !tradingEnabled && hasPaperHistory && (
              <Card>
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">📊</div>
                  <h3 className="font-extrabold text-gray-900">Paper Trading Paused</h3>
                  <p className="text-sm text-gray-500 mt-1">Click "Start Paper" in the Overview tab to resume trading</p>
                </div>
              </Card>
            )}

            {!paperTradingEnabled && !tradingEnabled && !hasPaperHistory && (
              <Card>
                <div className="text-center py-6">
                  <div className="text-5xl mb-3">🎮</div>
                  <h3 className="font-extrabold text-gray-900">No Trading Active</h3>
                  <p className="text-sm text-gray-500 mt-1">Click "Start Paper" or "Start Live" in the Overview tab to begin</p>
                </div>
              </Card>
            )}

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
                💡 <strong>{access.label} plan:</strong> {!access.canLiveTrade ? "Paper trading works without API keys! Upgrade to Pro for live trading." : "You're on a paid plan. Connect your exchange accounts to start live trading."}
              </div>
              <div className="space-y-4">
                {/* Alpaca Connection */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-gray-900">Alpaca</div>
                        <StatusPill tone={alpacaConnected ? "green" : "amber"}>{alpacaConnected ? "Connected" : "Not Connected"}</StatusPill>
                        {alpacaConnected && integrations.alpaca_mode && (
                          <StatusPill tone={integrations.alpaca_mode === "live" ? "purple" : "blue"}>
                            {integrations.alpaca_mode === "live" ? "🔴 LIVE Mode" : "📝 Paper Mode"}
                          </StatusPill>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Stock trading via Alpaca Markets</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alpacaConnected && access.canLiveTrade && (
                        <Button variant="secondary" size="sm" onClick={() => setShowApiModal(true)}>Connect Alpaca</Button>
                      )}
                      {!alpacaConnected && !access.canLiveTrade && (
                        <Button variant="warning" size="sm" onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro</Button>
                      )}
                      {alpacaConnected && (
                        <>
                          {integrations.alpaca_mode === "paper" && access.canLiveTrade && (
                            <Button variant="purple" size="sm" onClick={() => handleSwitchToLive("alpaca")} disabled={switchingMode === "alpaca"}>
                              {switchingMode === "alpaca" ? "Switching..." : "Switch to LIVE"}
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => handleDisconnect("alpaca")} disabled={disconnecting === "alpaca"}>
                            {disconnecting === "alpaca" ? "..." : "Disconnect"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {alpacaConnected && integrations.alpaca_api_key_masked && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">API Key:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{integrations.alpaca_api_key_masked}</code>
                        <button onClick={() => { navigator.clipboard.writeText(integrations.alpaca_api_key_masked); notify("API key copied", "success"); }} className="text-gray-400 hover:text-gray-600 text-xs">📋</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* OKX Connection */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-gray-900">OKX</div>
                        <StatusPill tone={okxConnected ? "green" : "amber"}>{okxConnected ? "Connected" : "Not Connected"}</StatusPill>
                        {okxConnected && integrations.okx_mode && (
                          <StatusPill tone={integrations.okx_mode === "live" ? "purple" : "blue"}>
                            {integrations.okx_mode === "live" ? "🔴 LIVE Mode" : "📝 Paper Mode"}
                          </StatusPill>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Crypto trading via OKX Exchange</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!okxConnected && access.canLiveTrade && (
                        <Button variant="secondary" size="sm" onClick={() => setShowApiModal(true)}>Connect OKX</Button>
                      )}
                      {!okxConnected && !access.canLiveTrade && (
                        <Button variant="warning" size="sm" onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro</Button>
                      )}
                      {okxConnected && (
                        <>
                          {integrations.okx_mode === "paper" && access.canLiveTrade && (
                            <Button variant="purple" size="sm" onClick={() => handleSwitchToLive("okx")} disabled={switchingMode === "okx"}>
                              {switchingMode === "okx" ? "Switching..." : "Switch to LIVE"}
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => handleDisconnect("okx")} disabled={disconnecting === "okx"}>
                            {disconnecting === "okx" ? "..." : "Disconnect"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {okxConnected && integrations.okx_api_key_masked && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">API Key:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{integrations.okx_api_key_masked}</code>
                        <button onClick={() => { navigator.clipboard.writeText(integrations.okx_api_key_masked); notify("API key copied", "success"); }} className="text-gray-400 hover:text-gray-600 text-xs">📋</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* MetaMask Wallet */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-gray-900">MetaMask</div>
                        <StatusPill tone={integrations.wallet_connected ? "green" : "amber"}>
                          {integrations.wallet_connected ? "Connected" : "Not Connected"}
                        </StatusPill>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">DeFi wallet connection (Elite+ required)</div>
                    </div>
                    <div>
                      {!integrations.wallet_connected && access.canUseDefi && (
                        <Button variant="secondary" size="sm" onClick={() => window.open("https://metamask.io/", "_blank")}>Connect Wallet</Button>
                      )}
                      {!access.canUseDefi && (
                        <Button variant="warning" size="sm" onClick={() => setShowUpgradeModal(true)}>Upgrade to Elite+</Button>
                      )}
                    </div>
                  </div>
                  {integrations.wallet_connected && integrations.wallet_address_masked && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Wallet:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{integrations.wallet_address_masked}</code>
                        <button onClick={() => { navigator.clipboard.writeText(user?.wallet_addresses?.[0] || ""); notify("Wallet address copied", "success"); }} className="text-gray-400 hover:text-gray-600 text-xs">📋</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* LEARN TAB */}
        {activeTab === "learn" && (
          <div className="space-y-5">
            <Card>
              <SectionTitle>📚 How {tradingEnabled ? "Live" : "Paper"} Trading Works</SectionTitle>
              <div className="prose prose-gray max-w-none">
                {tradingEnabled ? (
                  <>
                    <h3 className="text-gray-900">1. Live Trading Active</h3>
                    <p className="text-gray-600">Your connected exchange accounts (OKX and Alpaca) are being used for real trading.</p>
                    <h3 className="text-gray-900">2. Real Funds at Work</h3>
                    <p className="text-gray-600">The bot executes trades using your actual exchange balance.</p>
                    <h3 className="text-gray-900">3. Monitor Performance</h3>
                    <p className="text-gray-600">Watch your live equity curve and P&L update in real-time.</p>
                    <h3 className="text-gray-900">4. Risk Management</h3>
                    <p className="text-gray-600">You can stop live trading anytime. Start small and monitor closely.</p>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </Card>

            <Card>
              <SectionTitle>🏆 Achievements</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "live_active", label: "Live Trader", icon: "💰", unlocked: tradingEnabled },
                  { id: "paper_active", label: "Paper Trader", icon: "🎮", unlocked: paperTradingEnabled || hasPaperHistory },
                  { id: "first_trade", label: "First Trade", icon: "🚀", unlocked: activeStats.total_trades > 0 },
                  { id: "trades_10", label: "10 Trades", icon: "⭐", unlocked: activeStats.total_trades >= 10 },
                  { id: "trades_50", label: "50 Trades", icon: "🏆", unlocked: activeStats.total_trades >= 50 },
                  { id: "profitable", label: "Profitable", icon: "💰", unlocked: activeStats.total_pnl > 0 },
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
          <Button variant="secondary" onClick={() => setShowUpgradeModal(true)}>Upgrade Plan 💳</Button>
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {/* API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-extrabold text-gray-900">Connect API Keys</h2><button onClick={() => setShowApiModal(false)} className="text-3xl text-gray-500 hover:text-gray-700">×</button></div>
            
            <div className="mb-5 rounded-2xl border border-blue-300 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
              💡 <strong>{access.label} plan:</strong> {!access.canLiveTrade ? "You don't need API keys for paper trading. Upgrade to Pro to connect exchanges for live trading." : "Create API keys with trading permission only (no withdrawals)."}
            </div>
            
            <div className="space-y-4">
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">Alpaca (Stocks)</h3>
                <p className="text-sm text-gray-500 mb-2">Create API key with <strong>trading permission only</strong> - no withdrawals</p>
                <Button variant="secondary" size="sm" onClick={() => window.open("https://app.alpaca.markets/paper/dashboard/api-keys", "_blank")}>Create Alpaca Keys →</Button>
              </div>
              <div className="border rounded-xl p-4">
                <h3 className="font-bold text-gray-900">OKX (Crypto)</h3>
                <p className="text-sm text-gray-500 mb-2">Create API key with <strong>trade permission only</strong> - no withdrawals</p>
                <Button variant="secondary" size="sm" onClick={() => window.open("https://www.okx.com/account/my-api", "_blank")}>Create OKX Keys →</Button>
              </div>
            </div>
            
            <div className="mt-5 text-center text-xs text-gray-400">
              {!access.canLiveTrade && (
                <button onClick={() => setShowUpgradeModal(true)} className="text-blue-500 underline">Upgrade to Pro</button>
              )} to enable live trading.
            </div>
          </div>
        </div>
      )}

      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleTrading(true)} busy={togglingTrading} />
    </div>
  );
}
