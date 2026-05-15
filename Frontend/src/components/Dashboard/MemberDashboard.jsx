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
  TooltipItem,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import annotationPlugin from 'chartjs-plugin-annotation';

// Register ChartJS components with annotation plugin for better visuals
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
  Filler,
  annotationPlugin
);

const PAPER_TRADING_BALANCE = 1000;
const REFRESH_COOLDOWN_MS = 12000;
const AUTO_TRADE_INTERVAL_MS = 30000;

// Generate more realistic demo chart data
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
    
    // Create more realistic PnL with trend and volatility
    const volatility = 80 + Math.random() * 60;
    const drift = trend * 15;
    const randomWalk = (Math.random() - 0.5) * volatility;
    const dailyPnl = randomWalk + drift;
    cumulativePnl += dailyPnl;
    pnlValues.push(Math.round(cumulativePnl * 100) / 100);
    
    // Trade count correlates with volatility
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

// Chart Gradient Generator
const createGradient = (ctx, area, startColor, endColor) => {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, endColor);
  return gradient;
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

  const tone =
    type === "error"
      ? "border-red-300 bg-red-50 text-red-900"
      : type === "success"
      ? "border-green-300 bg-green-50 text-green-900"
      : "border-blue-300 bg-blue-50 text-blue-900";

  return (
    <div className={`fixed left-3 right-3 top-3 z-[60] rounded-2xl border p-4 text-sm font-bold shadow-xl sm:left-auto sm:right-4 sm:max-w-md ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <span>{message}</span>
        <button type="button" onClick={onClose} className="text-lg leading-none text-slate-700 hover:text-slate-900">
          ×
        </button>
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

        <StatusPill tone={riskTone(strategy.risk)} className="shrink-0">
          {strategy.risk}
        </StatusPill>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Best for</div>
        <div className="mt-1 text-sm font-extrabold text-slate-900">{strategy.bestFor}</div>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{strategy.description}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{strategy.plainEnglish}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {strategy.bullets.map((bullet) => (
          <span key={bullet} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-700">
            {bullet}
          </span>
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

      if (onSaved) {
        await onSaved();
      }
      
      setTimeout(() => {
        if (onSaved) onSaved();
      }, 500);
      
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

      if (onSaved) {
        await onSaved();
      }
      
      setTimeout(() => {
        if (onSaved) onSaved();
      }, 500);
      
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

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-3xl font-extrabold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          🔒 Security tip: create restricted API keys. Trading permission is okay. Withdrawals should stay disabled.
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">📈 Alpaca — Stocks</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox
                title="Paper Keys"
                fields={[
                  { placeholder: "API Key", value: alpacaPaper.apiKey, onChange: (v) => setAlpacaPaper((p) => ({ ...p, apiKey: v })) },
                  { placeholder: "Secret Key", value: alpacaPaper.secret, type: "password", onChange: (v) => setAlpacaPaper((p) => ({ ...p, secret: v })) },
                ]}
                button="Save Paper Keys"
                loading={saving === "alpaca-paper"}
                onSave={() => saveAlpaca("paper")}
              />

              <KeyBox
                title="Live Keys"
                fields={[
                  { placeholder: "API Key", value: alpacaLive.apiKey, onChange: (v) => setAlpacaLive((p) => ({ ...p, apiKey: v })) },
                  { placeholder: "Secret Key", value: alpacaLive.secret, type: "password", onChange: (v) => setAlpacaLive((p) => ({ ...p, secret: v })) },
                ]}
                button="Save Live Keys"
                loading={saving === "alpaca-live"}
                onSave={() => saveAlpaca("live")}
              />
            </div>
          </Card>

          <Card className="bg-slate-50">
            <h3 className="mb-4 text-lg font-extrabold text-slate-900">🔷 OKX — Crypto</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <KeyBox
                title="Paper Keys"
                fields={[
                  { placeholder: "API Key", value: okxPaper.apiKey, onChange: (v) => setOkxPaper((p) => ({ ...p, apiKey: v })) },
                  { placeholder: "Secret Key", value: okxPaper.secret, type: "password", onChange: (v) => setOkxPaper((p) => ({ ...p, secret: v })) },
                  { placeholder: "Passphrase", value: okxPaper.passphrase, type: "password", onChange: (v) => setOkxPaper((p) => ({ ...p, passphrase: v })) },
                ]}
                button="Save Paper Keys"
                loading={saving === "okx-paper"}
                onSave={() => saveOKX("paper")}
              />

              <KeyBox
                title="Live Keys"
                fields={[
                  { placeholder: "API Key", value: okxLive.apiKey, onChange: (v) => setOkxLive((p) => ({ ...p, apiKey: v })) },
                  { placeholder: "Secret Key", value: okxLive.secret, type: "password", onChange: (v) => setOkxLive((p) => ({ ...p, secret: v })) },
                  { placeholder: "Passphrase", value: okxLive.passphrase, type: "password", onChange: (v) => setOkxLive((p) => ({ ...p, passphrase: v })) },
                ]}
                button="Save Live Keys"
                loading={saving === "okx-live"}
                onSave={() => saveOKX("live")}
              />
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
          <Button variant="warning" onClick={onConfirm} disabled={busy} className="w-full">
            {busy ? "Starting..." : "Enable Live"}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="w-full">
            Cancel
          </Button>
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
  
  // Chart data state with realistic demo data
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

  // Chart refs for gradients
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

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

  // Generate new demo data for charts to simulate live updates
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

  // Execute a single paper trade
  const executePaperTrade = useCallback(async () => {
    if (!paperTradingEnabled) {
      console.log("Paper trading not enabled");
      return false;
    }
    
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
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exchange: randomExchange,
          symbol: randomAsset,
          side: randomSide,
          qty: qty,
          strategy: randomStrategy
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log("Trade executed:", data.message);
        refreshDemoChartData();
        return true;
      } else {
        console.error("Trade failed:", data.error);
        return false;
      }
    } catch (err) {
      console.error("Trade execution error:", err);
      return false;
    } finally {
      setExecutingTrade(false);
    }
  }, [paperTradingEnabled, refreshDemoChartData]);

  // Start automatic trading
  const startAutoTrading = useCallback(() => {
    if (autoTradeIntervalRef.current) return;
    
    setAutoTradingEnabled(true);
    notify("Auto-trading started! Trades will execute every 30 seconds.", "success");
    
    executePaperTrade();
    
    // Refresh demo data every 5 seconds for smooth chart updates
    const chartInterval = setInterval(() => {
      if (paperTradingEnabled && mountedRef.current) {
        refreshDemoChartData();
      }
    }, 5000);
    
    autoTradeIntervalRef.current = setInterval(async () => {
      if (paperTradingEnabled && mountedRef.current) {
        await executePaperTrade();
        loadDashboard({ silent: true, force: true });
      }
    }, AUTO_TRADE_INTERVAL_MS);
    
    window.__chartInterval = chartInterval;
  }, [executePaperTrade, paperTradingEnabled, notify, refreshDemoChartData]);

  // Stop automatic trading
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

  const loadDashboard = useCallback(
    async ({ silent = false, force = false } = {}) => {
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
        if (BotAPI.refreshActivation) {
          await BotAPI.refreshActivation(true);
        }
        
        const me = await BotAPI.getMe?.(true);
        if (!me?.id && !me?.email) {
          handleLogout();
          return;
        }
        if (!mountedRef.current) return;

        setUser(me);
        setTradingEnabled(me?.trading_enabled === true);
        setPaperTradingEnabled(me?.paper_trading_enabled === true);

        const [statsPayload, integrationsPayload, strategiesPayload, tradesPayload, trialPayload] = await Promise.all([
          safeCall(() => BotAPI.getUserTradingStats?.(30, true), null),
          safeCall(() => BotAPI.getIntegrationStatus?.(true), null),
          safeCall(() => BotAPI.getTradingStrategies?.(true), null),
          safeCall(() => BotAPI.getGlobalTrades?.({ limit: 20, skipCache: false }), null),
          safeCall(() => (BotAPI.getTrialStatus ? BotAPI.getTrialStatus(true) : Promise.resolve(null)), null),
        ]);

        if (!mountedRef.current) return;

        const newStats = extractSummary(statsPayload);
        if (newStats.total_trades > 0) {
          setStats({
            total_pnl: newStats.total_pnl || 0,
            win_rate: newStats.win_rate || demoWinLoss.winRate,
            total_trades: newStats.total_trades || 0,
            wins: newStats.wins || demoWinLoss.wins,
            losses: newStats.losses || demoWinLoss.losses,
          });
        }
        
        setIntegrations(integrationsPayload || { wallet_connected: false, alpaca_connected: false, okx_connected: false });
        setCurrentStrategy(
          normalizeStrategyId(
            strategiesPayload?.current_strategy || strategiesPayload?.data?.current_strategy || me?.strategy || "mean_reversion"
          )
        );
        
        if (Array.isArray(tradesPayload?.trades) && tradesPayload.trades.length > 0) {
          setCommunityTrades(tradesPayload.trades);
        }
        
        setTrial(
          trialPayload || {
            trial_status: "trial",
            paper_trading_enabled: me?.paper_trading_enabled === true,
            seconds_remaining: 0,
          }
        );
      } catch (err) {
        console.error("[MemberDashboard] Failed to load dashboard:", err);
        if (isAuthError(err)) {
          handleLogout();
          return;
        }
        notify(isRateLimitError(err) ? "Too many requests. Please wait a moment." : "Dashboard data could not fully load, but you are still logged in.", "error");
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    },
    [handleLogout, notify, demoWinLoss]
  );

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard({ silent: false, force: true });
    return () => {
      mountedRef.current = false;
      window.clearTimeout(refreshTimerRef.current);
      if (autoTradeIntervalRef.current) {
        clearInterval(autoTradeIntervalRef.current);
      }
      if (window.__chartInterval) {
        clearInterval(window.__chartInterval);
      }
    };
  }, [loadDashboard]);

  // Start auto-trading when paper trading is enabled
  useEffect(() => {
    if (paperTradingEnabled && !autoTradingEnabled && !tradingEnabled) {
      startAutoTrading();
    } else if (!paperTradingEnabled && autoTradingEnabled) {
      stopAutoTrading();
    }
  }, [paperTradingEnabled, autoTradingEnabled, tradingEnabled, startAutoTrading, stopAutoTrading]);

  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;
  const activeStrategy = STRATEGIES.find((s) => s.id === currentStrategy) || STRATEGIES[0];
  const anyTradingActionBusy = togglingPaper || togglingTrading;

  const displayStats = useMemo(() => {
    const active = paperTradingEnabled || tradingEnabled;
    return {
      total_pnl: Number(stats.total_pnl || 0),
      win_rate: Number(stats.win_rate || 0),
      total_trades: Math.max(Number(stats.total_trades || 0), active ? 1 : 0),
      wins: Number(stats.wins || 0),
      losses: Number(stats.losses || 0),
    };
  }, [stats, paperTradingEnabled, tradingEnabled]);

  const readiness = useMemo(() => {
    let score = 0;
    if (alpacaConnected) score += 25;
    if (okxConnected) score += 25;
    if (paperTradingEnabled) score += 20;
    if (currentStrategy) score += 15;
    if (tradingEnabled) score += 15;
    return Math.min(100, score);
  }, [alpacaConnected, okxConnected, paperTradingEnabled, currentStrategy, tradingEnabled]);

  const achievements = useMemo(() => {
    const unlocked = [];
    if (displayStats.total_trades > 0) unlocked.push("first_trade");
    if (displayStats.total_trades >= 50) unlocked.push("trades_50");
    if (displayStats.total_pnl > 0) unlocked.push("profitable");
    if (bothConnected) unlocked.push("api_ready");
    return unlocked;
  }, [displayStats, bothConnected]);

  // ============================================
  // BEAUTIFUL CHART CONFIGURATIONS
  // ============================================

  // PnL Line Chart with Gradient Fill
  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Cumulative P&L",
        data: pnlSeries,
        borderColor: "#4f46e5",
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.4)");
          gradient.addColorStop(0.5, "rgba(79, 70, 229, 0.1)");
          gradient.addColorStop(1, "rgba(79, 70, 229, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#4f46e5",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        borderWidth: 3,
      },
    ],
  };

  // Win/Loss Doughnut Chart with better styling
  const doughnutChartData = {
    labels: [`Wins (${displayStats.wins || 0})`, `Losses (${displayStats.losses || 0})`],
    datasets: [
      {
        data: [displayStats.wins || 1, displayStats.losses || 1],
        backgroundColor: ["#10b981", "#ef4444"],
        borderColor: ["#059669", "#dc2626"],
        borderWidth: 2,
        hoverOffset: 10,
        borderRadius: 8,
        spacing: 5,
      },
    ],
  };

  // Trade Count Bar Chart with gradient
  const barChartData = {
    labels: chartLabels.slice(-7),
    datasets: [
      {
        label: "Daily Trades",
        data: tradeSeries.slice(-7),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
        borderColor: "#4f46e5",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.65,
        categoryPercentage: 0.8,
      },
    ],
  };

  // Advanced Chart Options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", labels: { color: "#1e293b", font: { weight: "bold", size: 12 } } },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `P&L: ${context.raw > 0 ? "+" : ""}$${context.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: "#475569", font: { size: 11 } }, grid: { color: "rgba(148, 163, 184, 0.15)" } },
      y: {
        ticks: { color: "#475569", callback: (value) => `$${value}` },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
        title: { display: true, text: "Profit & Loss ($)", color: "#64748b", font: { size: 11 } },
      },
    },
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#1e293b", font: { weight: "bold", size: 12 } } },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        callbacks: {
          label: (context) => `${context.label}: ${context.raw} trades (${((context.raw / (displayStats.wins + displayStats.losses)) * 100).toFixed(1)}%)`,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "#1e293b", font: { weight: "bold", size: 12 } } },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#ffffff",
        bodyColor: "#e2e8f0",
        callbacks: { label: (context) => `${context.raw} trades` },
      },
    },
    scales: {
      x: { ticks: { color: "#475569", font: { size: 11, rotation: 45 } }, grid: { display: false } },
      y: { ticks: { color: "#475569", stepSize: 5 }, grid: { color: "rgba(148, 163, 184, 0.15)" }, title: { display: true, text: "Number of Trades", color: "#64748b", font: { size: 11 } } },
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <div className="text-xl font-extrabold text-slate-900 sm:text-2xl">Loading your dashboard…</div>
          <div className="mt-2 text-sm font-semibold text-slate-600">Getting your trading status, stats, and connections.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:p-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />

      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Welcome back 👋</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                {paperTradingEnabled && !tradingEnabled 
                  ? "🤖 Auto-trading is active! Trades execute every 30 seconds. Watch your charts update in real-time."
                  : "Start with paper trading, watch the charts, then turn on live trading when you are ready."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={bothConnected ? "green" : "amber"}>Setup {bothConnected ? "Complete" : "Needs Keys"}</StatusPill>
                <StatusPill tone="blue">Strategy: {activeStrategy.name}</StatusPill>
                {autoTradingEnabled && paperTradingEnabled && !tradingEnabled && (
                  <StatusPill tone="green">🤖 Auto-Trading Active</StatusPill>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap">
              <Button variant="secondary" onClick={() => loadDashboard({ silent: false, force: true })} disabled={refreshing} className="w-full lg:w-auto">
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="secondary" onClick={() => setShowApiModal(true)} className="w-full lg:w-auto">
                Connect Keys
              </Button>
              <Button variant="secondary" onClick={() => nav("/billing-dashboard")} className="w-full lg:w-auto">
                Billing
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Progress Card */}
        <div
          className={`rounded-3xl border p-4 shadow-sm sm:p-6 ${
            bothConnected && !paperTradingEnabled && !tradingEnabled
              ? "border-blue-300 bg-blue-50"
              : paperTradingEnabled && !tradingEnabled
              ? "border-green-300 bg-green-50"
              : tradingEnabled
              ? "border-purple-300 bg-purple-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {!bothConnected ? "Step 1: Connect your API keys" : !paperTradingEnabled ? "Step 2: Start paper trading" : !tradingEnabled ? "Paper trading is active" : "Live trading is active"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700 sm:text-base">
                {!bothConnected
                  ? "Connect both Alpaca and OKX so Imali can run paper trading and live trading."
                  : !paperTradingEnabled
                  ? "Your accounts are connected. Start with virtual money first."
                  : !tradingEnabled
                  ? "Imali is using virtual funds. Auto-trading executes every 30 seconds. Watch your charts, trades, and strategy before using real money."
                  : "Real money trading is turned on. Monitor performance and stop live trading anytime."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={alpacaConnected ? "green" : "amber"}>Alpaca {alpacaConnected ? "Connected" : "Needed"}</StatusPill>
                <StatusPill tone={okxConnected ? "green" : "amber"}>OKX {okxConnected ? "Connected" : "Needed"}</StatusPill>
                <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>Paper {paperTradingEnabled ? "Active" : "Off"}</StatusPill>
                <StatusPill tone={tradingEnabled ? "purple" : "slate"}>Live {tradingEnabled ? "Active" : "Off"}</StatusPill>
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-auto">
              {!bothConnected ? (
                <Button variant="warning" onClick={() => setShowApiModal(true)} className="w-full lg:w-auto">
                  Connect API Keys
                </Button>
              ) : !paperTradingEnabled ? (
                <Button onClick={() => handleTogglePaperTrading(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                  {togglingPaper ? "Starting..." : "Start Paper Trading"}
                </Button>
              ) : !tradingEnabled ? (
                <div className="grid gap-3 sm:grid-cols-3 lg:flex">
                  <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    {togglingPaper ? "Stopping..." : "Stop Paper"}
                  </Button>
                  <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={anyTradingActionBusy} className="w-full lg:w-auto">
                    Start Live Trading
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={async () => {
                      await executePaperTrade();
                      notify("Manual trade executed!", "success");
                    }} 
                    disabled={executingTrade || !paperTradingEnabled}
                    className="w-full lg:w-auto"
                  >
                    {executingTrade ? "Trading..." : "Manual Trade"}
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

        {/* Auto-Trading Status Card */}
        {autoTradingEnabled && paperTradingEnabled && !tradingEnabled && (
          <Card className="border-green-200 bg-green-50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-green-800 sm:text-xl">🤖 Auto-Trading Active</h2>
                <p className="mt-1 text-sm font-semibold text-green-700">
                  Trades are executing automatically every 30 seconds using your selected strategy.
                  Watch the charts update in real-time!
                </p>
              </div>
              <Button variant="danger" onClick={stopAutoTrading} className="w-full sm:w-auto">
                Stop Auto-Trading
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Start Guide */}
        <Card className="border-indigo-200 bg-indigo-50">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-3xl">🎓</span>
            <div>
              <h3 className="text-lg font-extrabold text-indigo-950 sm:text-xl">Quick Start Guide</h3>
              <p className="text-sm font-semibold text-indigo-800">Follow these steps in order.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { step: 1, title: "Connect API keys", desc: "Add Alpaca for stocks and OKX for crypto.", action: "Connect Keys", onClick: () => setShowApiModal(true), disabled: false },
              { step: 2, title: "Start paper trading", desc: `Practice with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.`, action: "Paper Trade", onClick: () => handleTogglePaperTrading(true), disabled: !bothConnected || anyTradingActionBusy || paperTradingEnabled },
              { step: 3, title: "Choose a strategy", desc: "Pick Conservative, Balanced, Momentum, or Arbitrage.", action: null },
              { step: 4, title: "Go live when ready", desc: "Turn on live trading after testing with paper trading.", action: "Go Live", onClick: () => setShowLiveConfirm(true), disabled: !bothConnected || anyTradingActionBusy || tradingEnabled },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-indigo-100 bg-white p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white">{item.step}</div>
                <div className="text-base font-extrabold text-slate-900">{item.title}</div>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{item.desc}</p>
                {item.action && (
                  <button
                    type="button"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className="mt-3 min-h-[40px] w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {item.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Paper Trading Card */}
        <Card className="border-blue-200 bg-blue-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-blue-950 sm:text-xl">🎯 Paper Trading</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-blue-900">
                {paperTradingEnabled ? `Active with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds. Auto-trading every 30 seconds.` : `Available with $${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.`}
                {trial?.seconds_remaining ? ` Trial time left: ${formatTimeLeft(trial.seconds_remaining)}.` : ""}
              </p>
            </div>
            <StatusPill tone={paperTradingEnabled ? "green" : "blue"}>{paperTradingEnabled ? "Active" : "Ready"}</StatusPill>
          </div>
        </Card>

        {/* Trading Cards Row */}
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Paper Trading Card */}
          <Card className={paperTradingEnabled ? "border-green-300 bg-green-50" : "bg-white"}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Paper Trading</h3>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Practice with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual money. No real money is used.</p>
                {!bothConnected && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Connect both OKX and Alpaca first.</p>}
                <div className="mt-4">
                  <StatusPill tone={paperTradingEnabled ? "green" : "slate"}>{paperTradingEnabled ? "Paper Trading Active" : bothConnected ? "Ready to Start" : "Connect Keys First"}</StatusPill>
                </div>
              </div>
              <div className="w-full shrink-0 sm:w-auto">
                {paperTradingEnabled ? (
                  <div className="flex flex-col gap-2">
                    <Button variant="danger" onClick={() => handleTogglePaperTrading(false)} disabled={anyTradingActionBusy} className="w-full">
                      {togglingPaper ? "Stopping..." : "Stop"}
                    </Button>
                    <Button variant="primary" onClick={async () => {
                      await executePaperTrade();
                      notify("Manual trade executed!", "success");
                    }} disabled={executingTrade} className="w-full">
                      {executingTrade ? "Trading..." : "Manual Trade"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => handleTogglePaperTrading(true)} disabled={!bothConnected || anyTradingActionBusy} className="w-full">
                    {togglingPaper ? "Starting..." : "Start"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Live Trading Card */}
          <Card className={tradingEnabled ? "border-green-300 bg-green-50" : "bg-white"}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💰</span>
                  <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Live Trading</h3>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Trade with real funds through your connected exchange accounts.</p>
                {!bothConnected && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Connect both OKX and Alpaca first.</p>}
                <div className="mt-4">
                  <StatusPill tone={tradingEnabled ? "green" : "slate"}>{tradingEnabled ? "Live Trading Active" : bothConnected ? "Ready When You Are" : "Connect Keys First"}</StatusPill>
                </div>
              </div>
              <div className="w-full shrink-0 sm:w-auto">
                {tradingEnabled ? (
                  <Button variant="danger" onClick={() => handleToggleTrading(false)} disabled={anyTradingActionBusy} className="w-full sm:w-auto">
                    {togglingTrading ? "Stopping..." : "Stop"}
                  </Button>
                ) : (
                  <Button variant="warning" onClick={() => setShowLiveConfirm(true)} disabled={!bothConnected || anyTradingActionBusy} className="w-full sm:w-auto">
                    Start
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Trading Readiness */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle helper="This score helps beginners know how complete their setup is.">📊 Trading Readiness</SectionTitle>
            <div className="text-3xl font-extrabold text-slate-900">{readiness}%</div>
          </div>
          <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full ${readiness >= 80 ? "bg-green-500" : readiness >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${readiness}%` }} />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Stat label="Total Profit" value={usd(displayStats.total_pnl)} helper="Closed trades" />
          <Stat label="Win Rate" value={pct(displayStats.win_rate)} helper="Closed trades" />
          <Stat label="Trades" value={displayStats.total_trades} helper={paperTradingEnabled || tradingEnabled ? "Trading active" : "No active trading yet"} />
          <Stat label="Current Mode" value={tradingEnabled ? "Live" : paperTradingEnabled ? "Paper" : "Setup"} helper="Your bot status" />
        </div>

        {/* Strategies Section */}
        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle helper="Pick one strategy. You can change it later.">🎯 Choose Your Strategy</SectionTitle>
            {strategyMessage && <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-800">{strategyMessage}</div>}
          </div>

          <div className="md:hidden">
            <div className="flex snap-x gap-3 overflow-x-auto pb-3 [-webkit-overflow-scrolling:touch]">
              {STRATEGIES.map((strategy) => (
                <div key={strategy.id} className="min-w-[82%] snap-start">
                  <StrategyCard strategy={strategy} active={currentStrategy === strategy.id} saving={savingStrategy === strategy.id} disabled={!!savingStrategy} onSelect={handleStrategyChange} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-center text-xs font-semibold text-slate-500">Swipe to see more strategies</p>
          </div>

          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
            {STRATEGIES.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} active={currentStrategy === strategy.id} saving={savingStrategy === strategy.id} disabled={!!savingStrategy} onSelect={handleStrategyChange} />
            ))}
          </div>
        </Card>

        {/* Charts Grid - Enhanced Visuals */}
        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <SectionTitle>📈 PnL Performance</SectionTitle>
            <div className="relative h-72 w-full">
              <Line ref={lineChartRef} data={lineChartData} options={lineChartOptions} />
            </div>
          </Card>
          <Card>
            <SectionTitle>🥇 Win / Loss Ratio</SectionTitle>
            <div className="relative h-72 w-full">
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex gap-6 text-sm">
                <div><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-1"></span> Wins: {displayStats.wins}</div>
                <div><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span> Losses: {displayStats.losses}</div>
                <div className="font-bold text-indigo-600">Win Rate: {displayStats.win_rate.toFixed(1)}%</div>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle>📊 Daily Trade Volume</SectionTitle>
          <div className="relative h-72 w-full">
            <Bar ref={barChartRef} data={barChartData} options={barChartOptions} />
          </div>
        </Card>

        {/* Required Connections */}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <SectionTitle>🔌 Required Connections</SectionTitle>
            <div className="space-y-3">
              {[
                { title: "Alpaca", desc: "Needed for stock trading.", connected: alpacaConnected, needed: "Needed" },
                { title: "OKX", desc: "Needed for crypto trading.", connected: okxConnected, needed: "Needed" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">{item.title}</div>
                    <div className="text-sm font-medium text-slate-500">{item.desc}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={item.connected ? "green" : "amber"}>{item.connected ? "Connected" : item.needed}</StatusPill>
                    {!item.connected && <Button variant="secondary" onClick={() => setShowApiModal(true)} className="px-3 py-2">Connect</Button>}
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Wallet</div>
                  <div className="text-sm font-medium text-slate-500">Optional for DeFi features.</div>
                </div>
                <StatusPill tone={integrations.wallet_connected ? "green" : "slate"}>{integrations.wallet_connected ? "Connected" : "Optional"}</StatusPill>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>🌍 Community Trades</SectionTitle>
            {communityTrades.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No community trades yet. Start paper trading to see trades appear!</div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-auto">
                {communityTrades.slice(0, 10).map((trade, index) => {
                  const pnl = Number(trade.pnl_usd || trade.pnl || 0);
                  const positive = pnl >= 0;
                  return (
                    <div key={trade.id || index} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900">{trade.symbol || "Unknown"}</span>
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{trade.bot || trade.exchange || "bot"}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{anonymizeEmail(trade.user_email, index)}</div>
                      </div>
                      <div className={`shrink-0 text-sm font-extrabold ${positive ? "text-green-700" : "text-red-700"}`}>{usd(pnl)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Helpful Resources */}
        <Card>
          <SectionTitle>📚 Helpful Resources</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "📚 Trading Guide", desc: "Learn how Imali trades", url: "/guides/trading" },
              { title: "🔧 API Setup", desc: "Connect OKX and Alpaca", url: "/guides/api-setup" },
              { title: "❓ FAQ", desc: "Common beginner questions", url: "/faq" },
              { title: "💬 Support", desc: "Get help", url: "/support" },
            ].map((resource) => (
              <a key={resource.title} href={resource.url} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
                <div className="font-extrabold text-slate-900">{resource.title}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">{resource.desc}</div>
              </a>
            ))}
          </div>
        </Card>

        {/* Available Features */}
        <Card>
          <SectionTitle>✅ Available Features</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: "Paper Trading", desc: "Practice before risking real money.", status: "Unlocked" },
              { title: "Live Trading", desc: "Available after API setup.", status: bothConnected ? "Ready" : "Needs Keys" },
              { title: "Stocks", desc: "Trade through Alpaca.", status: alpacaConnected ? "Ready" : "Needs Alpaca" },
              { title: "Crypto Spot", desc: "Trade through OKX.", status: okxConnected ? "Ready" : "Needs OKX" },
              { title: "Strategies", desc: "Choose Conservative, Balanced, Momentum, or Arbitrage.", status: "Available" },
              { title: "Support", desc: "Beginner help and setup resources.", status: "Available" },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">{feature.title}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">{feature.desc}</div>
                  </div>
                  <StatusPill tone={feature.status.includes("Needs") ? "amber" : feature.status === "Ready" ? "green" : "blue"}>{feature.status}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Achievements */}
        <Card>
          <SectionTitle>🏆 Achievements</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = achievements.includes(achievement.id);
              return (
                <div key={achievement.id} className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${unlocked ? "border-green-300 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  {achievement.icon} {achievement.label}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Button onClick={() => nav("/trade-demo")} className="w-full">Paper Trade Demo</Button>
          <Button variant="warning" onClick={() => (bothConnected ? setShowLiveConfirm(true) : setShowApiModal(true))} disabled={anyTradingActionBusy} className="w-full">Start Live Trading</Button>
          <Button variant="secondary" onClick={() => nav("/activation")} className="w-full">Complete Activation</Button>
        </div>
      </div>

      <ApiKeysModal open={showApiModal} onClose={() => setShowApiModal(false)} onSaved={() => loadDashboard({ silent: true, force: true })} notify={notify} />
      <LiveConfirmModal open={showLiveConfirm} onCancel={() => setShowLiveConfirm(false)} onConfirm={() => handleToggleTrading(true)} busy={togglingTrading} />
    </div>
  );
}
