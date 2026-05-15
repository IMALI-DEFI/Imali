// src/components/Dashboard/MemberDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../../utils/BotAPI";
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

// Register ChartJS components
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

const PAPER_TRADING_BALANCE = 1000;
const REFRESH_COOLDOWN_MS = 12000;
const AUTO_TRADE_INTERVAL_MS = 30000;

// Generate realistic demo chart data
const generateRealisticChartData = () => {
  const dates = [];
  const pnlValues = [];
  const tradeCounts = [];
  let cumulativePnl = 0;
  let trend = Math.random() > 0.5 ? 1 : -1;
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    const volatility = 80 + Math.random() * 60;
    const drift = trend * 15;
    const randomWalk = (Math.random() - 0.5) * volatility;
    const dailyPnl = randomWalk + drift;
    cumulativePnl += dailyPnl;
    pnlValues.push(Math.round(cumulativePnl * 100) / 100);
    tradeCounts.push(Math.floor(Math.random() * 12) + 3 + Math.abs(Math.floor(dailyPnl / 20)));
  }
  
  return { dates, pnlValues, tradeCounts };
};

// Generate realistic win/loss distribution
const generateRealisticWinLoss = () => {
  const wins = Math.floor(Math.random() * 35) + 25;
  const losses = Math.floor(Math.random() * 20) + 10;
  const winRate = (wins / (wins + losses)) * 100;
  return { wins, losses, winRate };
};

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    risk: "Low",
    bestFor: "Beginners",
    short: "Safest start",
    description: "Looks for dips and safer rebounds.",
    plainEnglish: "The bot waits for a price drop, then looks for a rebound.",
    bullets: ["Lower risk", "Beginner friendly", "Best for testing"],
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    risk: "Medium",
    bestFor: "Most users",
    short: "Best default",
    description: "Uses a mix of multiple trading signals.",
    plainEnglish: "The bot checks several signals before making a decision.",
    bullets: ["Balanced risk", "Good default", "Signal based"],
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    risk: "High",
    bestFor: "Trending markets",
    short: "More aggressive",
    description: "Follows strong price moves.",
    plainEnglish: "The bot tries to ride strong moves when the market is moving fast.",
    bullets: ["Higher risk", "Trend following", "Fast markets"],
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    risk: "Low",
    bestFor: "Advanced users",
    short: "Advanced",
    description: "Looks for price differences across venues.",
    plainEnglish: "The bot looks for small price differences between markets.",
    bullets: ["Advanced", "Price gaps", "Exchange based"],
  },
];

const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥" },
  { id: "trades_50", label: "50 Trades", icon: "🏆" },
  { id: "profitable", label: "Profitable Day", icon: "💰" },
  { id: "api_ready", label: "API Ready", icon: "🔌" },
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

const riskTone = (risk) => {
  const r = String(risk || "").toLowerCase();
  if (r === "low") return "green";
  if (r === "high") return "red";
  return "amber";
};

const extractSummary = (payload) => payload?.summary || payload?.data?.summary || {};

const extractDailySeries = (payload) => {
  if (Array.isArray(payload?.daily_performance)) return payload.daily_performance;
  if (Array.isArray(payload?.data?.daily_performance)) return payload.data.daily_performance;
  return [];
};

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
  return status === 401 || status === 403 || msg.includes("invalid token") || msg.includes("expired token") || msg.includes("unauthorized");
};

const isRateLimitError = (err) => {
  const msg = String(err?.message || err?.error || "").toLowerCase();
  const status = Number(err?.status || err?.response?.status || 0);
  return status === 429 || msg.includes("rate limit") || msg.includes("too many requests");
};

const getStrategyFromResult = (result, fallbackId) =>
  normalizeStrategyId(
    result?.strategy ||
      result?.current_strategy ||
      result?.data?.strategy ||
      result?.data?.current_strategy ||
      fallbackId
  );

const formatTimeLeft = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "expired";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

const anonymizeEmail = (email, index = 0) => {
  if (!email) return `member_${1000 + index}`;
  const raw = String(email).toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 10000;
  }
  return `member_${String(hash).padStart(4, "0")}`;
};

async function safeCall(fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    console.warn("[MemberDashboard] API call failed:", err);
    return fallback;
  }
}

async function togglePaperTradingApi(enabled) {
  if (typeof BotAPI.togglePaperTrading === "function") return BotAPI.togglePaperTrading(enabled);
  if (typeof BotAPI.updatePaperTrading === "function") return BotAPI.updatePaperTrading(enabled);
  if (typeof BotAPI.request === "function") {
    return BotAPI.request("/api/user/paper-trading", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  }
  throw new Error("Missing BotAPI.togglePaperTrading(enabled). Add this method to BotAPI.js.");
}

async function toggleLiveTradingApi(enabled) {
  if (typeof BotAPI.toggleTrading === "function") return BotAPI.toggleTrading(enabled);
  if (typeof BotAPI.updateLiveTrading === "function") return BotAPI.updateLiveTrading(enabled);
  if (typeof BotAPI.request === "function") {
    return BotAPI.request("/api/user/trading", {
      method: "PATCH",
      body: JSON.stringify({ enabled, confirmed: enabled === true }),
    });
  }
  throw new Error("Missing BotAPI.toggleTrading(enabled). Add this method to BotAPI.js.");
}

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
  const classes = {
    green: "border-green-300 bg-green-100 text-green-900",
    red: "border-red-300 bg-red-100 text-red-900",
    amber: "border-amber-300 bg-amber-100 text-amber-950",
    blue: "border-blue-300 bg-blue-100 text-blue-900",
    purple: "border-purple-300 bg-purple-100 text-purple-900",
    slate: "border-slate-300 bg-slate-100 text-slate-900",
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

function KeyBox({ title, fields, button, loading, onSave }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-sm font-extrabold text-slate-900">{title}</div>
      <div className="space-y-3">
        {fields.map((field) => (
          <input
            key={field.placeholder}
            type={field.type || "text"}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            autoComplete="off"
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        ))}
        <Button onClick={onSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : button}
        </Button>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, active, saving, disabled, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(strategy)}
      disabled={disabled}
      aria-pressed={active}
      className={`group flex h-full min-h-[230px] w-full flex-col rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70 sm:p-5 ${
        active
          ? "border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${active ? "bg-white" : "bg-slate-100"}`}>
            {strategy.emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-slate-900">{strategy.name}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">{strategy.short}</div>
          </div>
        </div>
        <StatusPill tone={riskTone(strategy.risk)} className="shrink-0">{strategy.risk}</StatusPill>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Best for</div>
        <div className="mt-1 text-sm font-extrabold text-slate-900">{strategy.bestFor}</div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{strategy.description}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{strategy.plainEnglish}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {strategy.bullets.map((bullet) => (
          <span key={bullet} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-700">{bullet}</span>
        ))}
      </div>
      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          <StatusPill tone={active ? "purple" : "slate"}>
            {active ? (saving ? "Updating..." : "Active") : "Tap to use"}
          </StatusPill>
          {active && <span className="text-lg">✅</span>}
        </div>
      </div>
    </button>
  );
}

function ApiKeysModal({ open, onClose, onSaved, notify }) {
  const [saving, setSaving] = useState("");
  const [alpacaPaper, setAlpacaPaper] = useState({ apiKey: "", secret: "" });
  const [alpacaLive, setAlpacaLive] = useState({ apiKey: "", secret: "" });
  const [okxPaper, setOkxPaper] = useState({ apiKey: "", secret: "", passphrase: "" });
  const [okxLive, setOkxLive] = useState({ apiKey: "", secret: "", passphrase: "" });

  if (!open) return null;

  const saveAlpaca = async (mode) => {
    const payload = mode === "paper" ? alpacaPaper : alpacaLive;
    if (!payload.apiKey || !payload.secret) {
      notify("Please fill in both Alpaca fields.", "error");
      return;
    }
    setSaving(`alpaca-${mode}`);
    try {
      const result = await BotAPI.connectAlpaca({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        mode,
      });
      if (result?.success === false) throw new Error(result?.error || "Failed to save Alpaca keys.");
      notify(`Alpaca ${mode} keys saved.`, "success");
      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });
      if (onSaved) await onSaved();
      setTimeout(() => { if (onSaved) onSaved(); }, 500);
    } catch (err) {
      notify(err?.message || "Failed to save Alpaca keys.", "error");
    } finally {
      setSaving("");
    }
  };

  const saveOKX = async (mode) => {
    const payload = mode === "paper" ? okxPaper : okxLive;
    if (!payload.apiKey || !payload.secret || !payload.passphrase) {
      notify("Please fill in all OKX fields.", "error");
      return;
    }
    setSaving(`okx-${mode}`);
    try {
      const result = await BotAPI.connectOKX({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        passphrase: payload.passphrase.trim(),
        mode,
      });
      if (result?.success === false) throw new Error(result?.error || "Failed to save OKX keys.");
      notify(`OKX ${mode} keys saved.`, "success");
      if (mode === "paper") setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      if (mode === "live") setOkxLive({ apiKey: "", secret: "", passphrase: "" });
      if (onSaved) await onSaved();
      setTimeout(() => { if (onSaved) onSaved(); }, 500);
    } catch (err) {
      notify(err?.message || "Failed to save OKX keys.", "error");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-6xl sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Connect API Keys</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">Add OKX for crypto and Alpaca for stocks. Use paper keys first.</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-1 text-3xl font-extrabold text-slate-500 hover:bg-slate-100 hover:text-slate-900">×</button>
        </div>
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          🔒 Security tip: create restricted API keys. Trading permission is okay. Withdrawals should stay disabled.
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">📈 Alpaca — Stocks</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox title="Paper Keys" fields={[
                { placeholder: "API Key", value: alpacaPaper.apiKey, onChange: (v) => setAlpacaPaper((p) => ({ ...p, apiKey: v })) },
                { placeholder: "Secret Key", value: alpacaPaper.secret, type: "password", onChange: (v) => setAlpacaPaper((p) => ({ ...p, secret: v })) },
              ]} button="Save Paper Keys" loading={saving === "alpaca-paper"} onSave={() => saveAlpaca("paper")} />
              <KeyBox title="Live Keys" fields={[
                { placeholder: "API Key", value: alpacaLive.apiKey, onChange: (v) => setAlpacaLive((p) => ({ ...p, apiKey: v })) },
                { placeholder: "Secret Key", value: alpacaLive.secret, type: "password", onChange: (v) => setAlpacaLive((p) => ({ ...p, secret: v })) },
              ]} button="Save Live Keys" loading={saving === "alpaca-live"} onSave={() => saveAlpaca("live")} />
            </div>
          </Card>
          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">🔷 OKX — Crypto</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox title="Paper Keys" fields={[
                { placeholder: "API Key", value: okxPaper.apiKey, onChange: (v) => setOkxPaper((p) => ({ ...p, apiKey: v })) },
                { placeholder: "Secret Key", value: okxPaper.secret, type: "password", onChange: (v) => setOkxPaper((p) => ({ ...p, secret: v })) },
                { placeholder: "Passphrase", value: okxPaper.passphrase, type: "password", onChange: (v) => setOkxPaper((p) => ({ ...p, passphrase: v })) },
              ]} button="Save Paper Keys" loading={saving === "okx-paper"} onSave={() => saveOKX("paper")} />
              <KeyBox title="Live Keys" fields={[
                { placeholder: "API Key", value: okxLive.apiKey, onChange: (v) => setOkxLive((p) => ({ ...p, apiKey: v })) },
                { placeholder: "Secret Key", value: okxLive.secret, type: "password", onChange: (v) => setOkxLive((p) => ({ ...p, secret: v })) },
                { placeholder: "Passphrase", value: okxLive.passphrase, type: "password", onChange: (v) => setOkxLive((p) => ({ ...p, passphrase: v })) },
              ]} button="Save Live Keys" loading={saving === "okx-live"} onSave={() => saveOKX("live")} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LiveConfirmModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
        <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Confirm Live Trading</h3>
        <p className="mt-3 text-sm font-semibold text-slate-700">Live trading uses real money through your connected exchange accounts.</p>
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <div className="font-extrabold text-amber-900">Risk reminder</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold text-amber-800">
            <li>You can lose money.</li>
            <li>Start small.</li>
            <li>You can stop live trading anytime.</li>
            <li>Paper trading is safer for testing.</li>
          </ul>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="warning" onClick={onConfirm} disabled={busy} className="w-full">{busy ? "Starting..." : "Enable Live"}</Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="w-full">Cancel</Button>
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
  const refreshTimerRef = useRef(null);
  const autoTradeIntervalRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0 });
  
  const demoChartData = useMemo(() => generateRealisticChartData(), []);
  const [chartLabels, setChartLabels] = useState(demoChartData.dates);
  const [pnlSeries, setPnlSeries] = useState(demoChartData.pnlValues);
  const [tradeSeries, setTradeSeries] = useState(demoChartData.tradeCounts);
  
  const [integrations, setIntegrations] = useState({ wallet_connected: false, alpaca_connected: false, okx_connected: false });
  const [trial, setTrial] = useState(null);
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");
  const [communityTrades, setCommunityTrades] = useState([]);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [demoWinLoss, setDemoWinLoss] = useState(generateRealisticWinLoss());

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

  const refreshDemoChartData = useCallback(() => {
    const newData = generateRealisticChartData();
    setChartLabels(newData.dates);
    setPnlSeries(newData.pnlValues);
    setTradeSeries(newData.tradeCounts);
    const newWinLoss = generateRealisticWinLoss();
    setDemoWinLoss(newWinLoss);
    setStats(prev => ({
      ...prev,
      win_rate: newWinLoss.winRate,
      wins: newWinLoss.wins,
      losses: newWinLoss.losses,
      total_trades: newWinLoss.wins + newWinLoss.losses,
      total_pnl: newData.pnlValues[newData.pnlValues.length - 1] || 0,
    }));
  }, []);

  const executePaperTrade = useCallback(async () => {
    if (!paperTradingEnabled) return false;
    setExecutingTrade(true);
    try {
      const token = localStorage.getItem("imali_token");
      const assets = ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "ARB/USD"];
      const exchanges = ["alpaca", "okx"];
      const sides = ["buy", "sell"];
      const strategiesList = ["momentum", "mean_reversion", "ai_weighted"];
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const randomExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const randomSide = sides[Math.floor(Math.random() * sides.length)];
      const randomStrategy = strategiesList[Math.floor(Math.random() * strategiesList.length)];
      const qty = randomAsset === "BTC/USD" ? 0.01 : randomAsset === "ETH/USD" ? 0.1 : 1;
      
      const response = await fetch("https://api.imali-defi.com/api/trading/paper-trade", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ exchange: randomExchange, symbol: randomAsset, side: randomSide, qty: qty, strategy: randomStrategy })
      });
      const data = await response.json();
      if (data.success && data.data) {
        refreshDemoChartData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Trade execution error:", err);
      return false;
    } finally {
      setExecutingTrade(false);
    }
  }, [paperTradingEnabled, refreshDemoChartData]);

  const startAutoTrading = useCallback(() => {
    if (autoTradeIntervalRef.current) return;
    setAutoTradingEnabled(true);
    notify("Auto-trading started! Trades will execute every 30 seconds.", "success");
    executePaperTrade();
    const chartInterval = setInterval(() => {
      if (paperTradingEnabled && mountedRef.current) refreshDemoChartData();
    }, 5000);
    autoTradeIntervalRef.current = setInterval(async () => {
      if (paperTradingEnabled && mountedRef.current) {
        await executePaperTrade();
        loadDashboard({ silent: true, force: true });
      }
    }, AUTO_TRADE_INTERVAL_MS);
    window.__chartInterval = chartInterval;
  }, [executePaperTrade, paperTradingEnabled, notify, refreshDemoChartData]);

  const stopAutoTrading = useCallback(() => {
    if (autoTradeIntervalRef.current) {
      clearInterval(autoTradeIntervalRef.current);
      autoTradeIntervalRef.current = null;
    }
    if (window.__chartInterval) {
      clearInterval(window.__chartInterval);
      window.__chartInterval = null;
    }
    setAutoTradingEnabled(false);
    notify("Auto-trading stopped.", "info");
  }, [notify]);

  // ========== MISSING HANDLERS - ADDED HERE ==========
  
  const handleTogglePaperTrading = async (enabled) => {
    if (togglingPaper || togglingTrading) return;

    if (enabled && !bothConnected) {
      setShowApiModal(true);
      notify("Connect Alpaca and OKX before starting paper trading.", "error");
      return;
    }

    setTogglingPaper(true);
    const previousPaper = paperTradingEnabled;
    const previousUser = user;
    
    setPaperTradingEnabled(enabled);
    setUser((prev) => (prev ? { ...prev, paper_trading_enabled: enabled } : prev));

    try {
      const result = await togglePaperTradingApi(enabled);
      if (result?.success === false) throw new Error(result?.error || "Failed to update paper trading.");

      const nextPaper = getNestedBool(result, "paper_trading_enabled", enabled);
      setPaperTradingEnabled(nextPaper);
      setUser((prev) => (prev ? { ...prev, paper_trading_enabled: nextPaper } : prev));
      notify(nextPaper ? "Paper trading started." : "Paper trading stopped.", "success");
      
      if (nextPaper) {
        startAutoTrading();
      } else {
        stopAutoTrading();
      }
      
      await loadDashboard({ silent: true, force: true });
    } catch (err) {
      console.error("[MemberDashboard] Paper toggle failed:", err);
      setPaperTradingEnabled(previousPaper);
      setUser(previousUser);
      if (isRateLimitError(err)) notify("Too many button presses. Wait a few seconds and try again.", "error");
      else if (isAuthError(err)) handleLogout();
      else notify(err?.message || "Failed to update paper trading.", "error");
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
    const previousUser = user;
    
    setTradingEnabled(enabled);
    setUser((prev) => (prev ? { ...prev
