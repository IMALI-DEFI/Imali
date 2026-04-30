// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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

/* ================= CONSTANTS ================= */
const PAPER_TRADING_BALANCE = 1000;

const NFT_TIERS = {
  none: {
    rank: 0,
    key: "none",
    name: "Starter Access",
    color: "border-slate-300",
    badge: "bg-slate-100 text-slate-700",
    perks: ["Paper trading", "Basic dashboard", "Beginner strategy access"],
  },
  common: {
    rank: 1,
    key: "common",
    name: "Common",
    color: "border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    perks: ["Live trading access", "Lower fees", "Priority execution"],
  },
  rare: {
    rank: 2,
    key: "rare",
    name: "Rare",
    color: "border-sky-400",
    badge: "bg-sky-100 text-sky-700",
    perks: ["Advanced bots", "Arbitrage strategy", "Deeper analytics"],
  },
  epic: {
    rank: 3,
    key: "epic",
    name: "Epic",
    color: "border-purple-400",
    badge: "bg-purple-100 text-purple-700",
    perks: ["Futures tools", "All bots", "Faster routing"],
  },
  legendary: {
    rank: 4,
    key: "legendary",
    name: "Legendary",
    color: "border-yellow-400",
    badge: "bg-yellow-100 text-yellow-700",
    perks: ["Alpha access", "VIP support", "Premium signals"],
  },
};

const FALLBACK_STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    emoji: "🛡️",
    minTier: "none",
    risk: "Low",
    description: "Looks for dips and safer rebounds. Best for beginners.",
    howToUse: "Automatically buys during dips and sells during rebounds.",
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    minTier: "none",
    risk: "Medium",
    description: "A balanced AI mix of multiple trading signals.",
    howToUse: "AI analyzes market conditions and adjusts strategy automatically.",
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    minTier: "none",
    risk: "High",
    description: "Follows strong moves when markets are trending.",
    howToUse: "Follows market trends. Best in strong bull or bear markets.",
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    minTier: "rare",
    risk: "Low",
    description: "Looks for price differences across venues.",
    howToUse: "Profits from price differences between exchanges. Requires Rare tier.",
  },
  {
    id: "futures",
    name: "Futures Engine",
    emoji: "📈",
    minTier: "epic",
    risk: "High",
    description: "Higher-speed crypto futures execution.",
    howToUse: "Trade crypto futures with leverage. Requires Epic tier.",
  },
  {
    id: "alpha",
    name: "Alpha Sniper",
    emoji: "🎯",
    minTier: "legendary",
    risk: "High",
    description: "Premium entries, signals, and early-access tools.",
    howToUse: "VIP only. Premium signals and early access.",
  },
];

const FEATURE_GATES = {
  paper_trading: {
    title: "Paper Trading",
    minTier: "none",
    description: "Practice trading before risking real money.",
    helpText: "Start here to learn without risk!",
  },
  live_trading: {
    title: "Live Trading",
    minTier: "common",
    description: "Trade with real capital after setup is complete.",
    helpText: "Trade with real money. Requires connected exchange accounts.",
  },
  advanced_bots: {
    title: "Advanced Bots",
    minTier: "rare",
    description: "Unlock stronger automation and premium execution logic.",
    helpText: "More sophisticated trading algorithms.",
  },
  futures: {
    title: "Futures Trading",
    minTier: "epic",
    description: "Access higher-risk futures trading tools.",
    helpText: "Trade crypto futures. Higher risk, higher potential returns.",
  },
  alpha_signals: {
    title: "Alpha Signals",
    minTier: "legendary",
    description: "Premium signals, early access, and VIP-level features.",
    helpText: "Get exclusive trading signals before the public.",
  },
};

const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀", helpText: "Complete your first trade" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥", helpText: "Trade 7 days in a row" },
  { id: "trades_50", label: "50 Trades", icon: "🏆", helpText: "Complete 50 total trades" },
  { id: "profitable", label: "Profitable Day", icon: "💰", helpText: "End a day with profit" },
  { id: "nft_holder", label: "NFT Holder", icon: "🎟️", helpText: "Hold an Imali NFT" },
];

/* ================= HELPERS ================= */
const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = {
    "mean reversion": "mean_reversion",
    conservative: "mean_reversion",
    balanced: "ai_weighted",
    "ai weighted": "ai_weighted",
    momentum: "momentum",
    arbitrage: "arbitrage",
    futures: "futures",
    alpha: "alpha",
  };
  return aliases[v] || v || "mean_reversion";
};

const tierRank = (tierKey) => NFT_TIERS[tierKey]?.rank ?? 0;
const hasTierAccess = (userTierKey, requiredTierKey) =>
  tierRank(userTierKey) >= tierRank(requiredTierKey);

const riskClass = (risk) => {
  const r = String(risk || "").toLowerCase();
  if (r === "low") return "bg-green-100 text-green-700";
  if (r === "high") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
};

const decorateStrategies = (strategies = []) => {
  const fallbackMap = new Map(FALLBACK_STRATEGIES.map((s) => [s.id, s]));
  return strategies.map((strategy) => {
    const id = normalizeStrategyId(strategy.id || strategy.name);
    const fallback = fallbackMap.get(id);
    return {
      id,
      name: fallback?.name || strategy.name || id,
      emoji: fallback?.emoji || "🎯",
      minTier: fallback?.minTier || "none",
      risk: fallback?.risk || strategy.risk_level || "Medium",
      description: fallback?.description || strategy.description,
      howToUse: fallback?.howToUse || "Click to activate",
    };
  });
};

const extractDailySeries = (statsResult) => {
  if (Array.isArray(statsResult?.daily_performance)) return statsResult.daily_performance;
  if (Array.isArray(statsResult?.data?.daily_performance)) return statsResult.data.daily_performance;
  return [];
};

const extractSummary = (statsResult) => {
  if (statsResult?.summary) return statsResult.summary;
  if (statsResult?.data?.summary) return statsResult.data.summary;
  return {};
};

const getStrategyFromResult = (result, fallbackId) => {
  return normalizeStrategyId(
    result?.strategy ||
      result?.current_strategy ||
      result?.data?.strategy ||
      result?.data?.current_strategy ||
      fallbackId
  );
};

const formatTrialRemaining = (seconds) => {
  const s = Number(seconds || 0);
  if (s <= 0) return "Expired";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
};

const anonymizeEmail = (email, index = 0) => {
  if (!email) return `member_${1000 + index}`;
  const raw = String(email).toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) % 10000;
  return `member_${String(hash).padStart(4, "0")}`;
};

/* ================= HELP TOOLTIP ================= */
function HelpTooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 p-2 text-center text-xs text-white">
          {text}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
        </div>
      )}
    </div>
  );
}

/* ================= QUICK START GUIDE ================= */
function QuickStartGuide({ onStartTour }) {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    { number: "1", title: "Connect API Keys", description: "Connect your exchange accounts (Alpaca for stocks, OKX for crypto)." },
    { number: "2", title: "Choose Strategy", description: "Pick a trading strategy that matches your risk tolerance." },
    { number: "3", title: "Paper Trade First", description: "Practice with $1,000 virtual money before going live." },
    { number: "4", title: "Go Live", description: "Upgrade to Common tier and trade with real funds." },
  ];

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex cursor-pointer items-center justify-between" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <h3 className="font-semibold text-indigo-900">Quick Start Guide</h3>
        </div>
        <span className="text-indigo-600">{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {steps.map((step) => (
            <div key={step.number} className="flex items-start gap-3 rounded-lg bg-white p-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {step.number}
              </div>
              <div>
                <div className="font-medium text-gray-900">{step.title}</div>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
          <button
            onClick={onStartTour}
            className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Launch Interactive Tour 🎯
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= API KEYS MODAL ================= */
function ApiKeysModal({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState("");
  const [alpacaPaper, setAlpacaPaper] = useState({ apiKey: "", secret: "" });
  const [alpacaLive, setAlpacaLive] = useState({ apiKey: "", secret: "" });
  const [okxPaper, setOkxPaper] = useState({ apiKey: "", secret: "", passphrase: "" });
  const [okxLive, setOkxLive] = useState({ apiKey: "", secret: "", passphrase: "" });

  if (!open) return null;

  const saveAlpaca = async (mode) => {
    const payload = mode === "paper" ? alpacaPaper : alpacaLive;
    if (!payload.apiKey || !payload.secret) {
      alert("Please fill in both Alpaca fields.");
      return;
    }

    setSaving(`alpaca-${mode}`);
    try {
      const result = await BotAPI.connectAlpaca({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        mode,
      });
      if (!result?.success) throw new Error(result?.error || "Failed to save Alpaca keys.");
      alert(`Alpaca ${mode} keys saved.`);
      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });
      await onSaved?.();
    } catch (err) {
      alert(err?.message || "Failed to save Alpaca keys.");
    } finally {
      setSaving("");
    }
  };

  const saveOKX = async (mode) => {
    const payload = mode === "paper" ? okxPaper : okxLive;
    if (!payload.apiKey || !payload.secret || !payload.passphrase) {
      alert("Please fill in all OKX fields.");
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
      if (!result?.success) throw new Error(result?.error || "Failed to save OKX keys.");
      alert(`OKX ${mode} keys saved.`);
      if (mode === "paper") setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      if (mode === "live") setOkxLive({ apiKey: "", secret: "", passphrase: "" });
      await onSaved?.();
    } catch (err) {
      alert(err?.message || "Failed to save OKX keys.");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API & Exchange Keys</h2>
            <p className="mt-1 text-sm text-gray-600">
              Connect OKX and Alpaca to enable paper and live trading.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900">×</button>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>🔒 Security:</strong> Create restricted API keys with trading-only permissions. Disable withdrawals.
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h3 className="text-lg font-bold text-gray-900">Alpaca — Stocks & ETFs</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 text-sm font-bold text-gray-900">Paper Keys</div>
                <div className="space-y-2">
                  <input type="text" value={alpacaPaper.apiKey} onChange={(e) => setAlpacaPaper({ ...alpacaPaper, apiKey: e.target.value })} placeholder="API Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={alpacaPaper.secret} onChange={(e) => setAlpacaPaper({ ...alpacaPaper, secret: e.target.value })} placeholder="Secret Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={() => saveAlpaca("paper")} disabled={saving.startsWith("alpaca")} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 text-sm font-bold text-gray-900">Live Keys</div>
                <div className="space-y-2">
                  <input type="text" value={alpacaLive.apiKey} onChange={(e) => setAlpacaLive({ ...alpacaLive, apiKey: e.target.value })} placeholder="API Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={alpacaLive.secret} onChange={(e) => setAlpacaLive({ ...alpacaLive, secret: e.target.value })} placeholder="Secret Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={() => saveAlpaca("live")} disabled={saving.startsWith("alpaca")} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">🔷</span>
              <h3 className="text-lg font-bold text-gray-900">OKX — Crypto</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 text-sm font-bold text-gray-900">Paper Keys</div>
                <div className="space-y-2">
                  <input type="text" value={okxPaper.apiKey} onChange={(e) => setOkxPaper({ ...okxPaper, apiKey: e.target.value })} placeholder="API Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={okxPaper.secret} onChange={(e) => setOkxPaper({ ...okxPaper, secret: e.target.value })} placeholder="Secret Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={okxPaper.passphrase} onChange={(e) => setOkxPaper({ ...okxPaper, passphrase: e.target.value })} placeholder="Passphrase" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={() => saveOKX("paper")} disabled={saving.startsWith("okx")} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 text-sm font-bold text-gray-900">Live Keys</div>
                <div className="space-y-2">
                  <input type="text" value={okxLive.apiKey} onChange={(e) => setOkxLive({ ...okxLive, apiKey: e.target.value })} placeholder="API Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={okxLive.secret} onChange={(e) => setOkxLive({ ...okxLive, secret: e.target.value })} placeholder="Secret Key" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="password" value={okxLive.passphrase} onChange={(e) => setOkxLive({ ...okxLive, passphrase: e.target.value })} placeholder="Passphrase" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <button onClick={() => saveOKX("live")} disabled={saving.startsWith("okx")} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function Stat({ label, value, helper, tooltip }) {
  return (
    <HelpTooltip text={tooltip || helper}>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:shadow-md">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        {helper && <div className="mt-1 text-xs text-gray-500">{helper}</div>}
      </div>
    </HelpTooltip>
  );
}

/* ================= CONNECTION ROW ================= */
function ConnectionRow({ title, connected, helper, required = true, onConnect, tooltip }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div>
        <HelpTooltip text={tooltip}>
          <span className="font-medium text-gray-900">{title}</span>
        </HelpTooltip>
        {helper && <div className="text-xs text-gray-500">{helper}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${connected ? "bg-emerald-100 text-emerald-700" : required ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>
          {connected ? "Connected" : required ? "Required" : "Optional"}
        </span>
        {!connected && <button onClick={onConnect} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Connect</button>}
      </div>
    </div>
  );
}

/* ================= CTA BUTTON ================= */
function CTA({ title, onClick, tooltip }) {
  return (
    <HelpTooltip text={tooltip}>
      <button onClick={onClick} className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">{title}</button>
    </HelpTooltip>
  );
}

/* ================= TIER CTA ================= */
function TierCTA({ title, unlocked, lockedText, onClick, onLockedClick, tooltip }) {
  if (unlocked) {
    return (
      <HelpTooltip text={tooltip}>
        <button onClick={onClick} className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">{title}</button>
      </HelpTooltip>
    );
  }
  return (
    <HelpTooltip text={lockedText}>
      <button onClick={onLockedClick} className="rounded-xl border border-amber-300 bg-amber-50 py-3 font-semibold text-amber-800 hover:bg-amber-100">
        🔒 {title} — {lockedText}
      </button>
    </HelpTooltip>
  );
}

/* ================= COMMUNITY TRADES ================= */
function CommunityTrades({ trades }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 font-semibold">🌍 Community Trades</h3>
      {trades.length === 0 ? (
        <div className="text-sm text-gray-500">No community trades yet.</div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-auto">
          {trades.map((trade, index) => {
            const pnl = Number(trade.pnl_usd || 0);
            const positive = pnl >= 0;
            return (
              <div key={trade.id || index} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{trade.bot || "Bot"}</span>
                  </div>
                  <div className="text-xs text-gray-500">{anonymizeEmail(trade.user_email, index)} • {trade.exchange || "exchange"}</div>
                </div>
                <div className={`text-sm font-bold ${positive ? "text-emerald-700" : "text-red-700"}`}>{usd(pnl)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= SETUP RECOMMENDATION ================= */
function SetupRecommendation({ alpacaConnected, okxConnected, onConnect }) {
  const bothReady = alpacaConnected && okxConnected;
  return (
    <div className={`rounded-2xl border p-5 ${bothReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold ${bothReady ? "text-emerald-900" : "text-amber-900"}`}>
            {bothReady ? "✅ Full setup complete" : "⚠️ Required: Connect both Alpaca and OKX"}
          </h2>
          <p className={`mt-1 text-sm ${bothReady ? "text-emerald-800" : "text-amber-900"}`}>
            Both OKX and Alpaca connections are required for paper trading.
          </p>
        </div>
        {!bothReady && (
          <button onClick={onConnect} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Connect Required Keys
          </button>
        )}
      </div>
    </div>
  );
}

/* ================= TRIAL BANNER ================= */
function TrialBanner({ trial, alpacaConnected, okxConnected }) {
  const status = String(trial?.trial_status || "").toLowerCase();
  const secondsRemaining = Number(trial?.seconds_remaining || 0);
  const bothConnected = alpacaConnected && okxConnected;
  const active = status === "trial" && trial?.paper_trading_enabled !== false && secondsRemaining > 0;
  const ready = bothConnected && !active;

  if (!bothConnected) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-amber-900">⚠️ Connect API Keys</h3>
            <p className="text-sm text-amber-800">Connect both OKX and Alpaca to start paper trading.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Keys Required</span>
        </div>
      </div>
    );
  }

  if (ready) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-emerald-900">📝 Ready to Trade</h3>
            <p className="text-sm text-emerald-800">Start paper trading with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual money.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sky-900">🎯 Paper Trading Active</h3>
          <p className="text-sm text-sky-800">Trading with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds. {formatTrialRemaining(secondsRemaining)} remaining.</p>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Active</span>
      </div>
    </div>
  );
}

/* ================= RESOURCE LINKS ================= */
function ResourceLinks() {
  const resources = [
    { name: "📚 Trading Guide", url: "/guides/trading", description: "Learn how to trade" },
    { name: "🔧 API Setup", url: "/guides/api-setup", description: "Get OKX & Alpaca keys" },
    { name: "❓ FAQ", url: "/faq", description: "Common questions" },
    { name: "💬 Support", url: "/support", description: "Get help" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">📚 Helpful Resources</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {resources.map((resource) => (
          <a key={resource.name} href={resource.url} className="group rounded-lg border border-gray-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50">
            <div className="font-medium text-gray-900 group-hover:text-indigo-700">{resource.name}</div>
            <div className="text-xs text-gray-500">{resource.description}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ================= TRADING CONTROL BUTTONS ================= */
function TradingControlButtons({ tradingEnabled, paperTradingEnabled, trialActive, alpacaConnected, okxConnected, userTier, onToggleTrading, onTogglePaperTrading, onUpgrade, loading }) {
  const bothConnected = alpacaConnected && okxConnected;
  const tierRanks = { starter: 0, common: 1, rare: 2, epic: 3, legendary: 4 };
  const userTierRank = tierRanks[userTier] || 0;
  const hasLiveAccess = userTierRank >= 1;
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleStartLiveTrading = () => {
    if (!hasLiveAccess) { onUpgrade?.(); return; }
    if (!bothConnected) { alert("Connect both OKX and Alpaca API keys first."); return; }
    setShowConfirmModal(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Paper Trading Card */}
        <div className={`rounded-xl border p-6 transition-all ${paperTradingEnabled ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2"><span className="text-3xl">📝</span><h3 className="text-xl font-semibold">Paper Trading</h3></div>
              <p className="text-gray-600">Practice with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual money. No real risk.</p>
              {!bothConnected && <p className="text-sm text-amber-600 mt-2">⚠️ Connect both OKX & Alpaca keys</p>}
              {paperTradingEnabled && <p className="text-sm text-emerald-600 mt-2">✅ Active - Trading with virtual funds</p>}
            </div>
            <button onClick={() => onTogglePaperTrading(!paperTradingEnabled)} disabled={loading || (!paperTradingEnabled && !bothConnected)} className={`px-5 py-2 rounded-lg font-semibold ${paperTradingEnabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} disabled:opacity-50`}>
              {paperTradingEnabled ? 'Stop Paper Trading' : 'Start Paper Trading'}
            </button>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-500">
            {paperTradingEnabled ? `✓ Virtual balance: $${PAPER_TRADING_BALANCE.toLocaleString()}` : bothConnected ? 'Click to start practicing' : '⚠️ Connect OKX + Alpaca'}
          </div>
        </div>

        {/* Live Trading Card */}
        <div className={`rounded-xl border p-6 transition-all ${tradingEnabled ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2"><span className="text-3xl">💰</span><h3 className="text-xl font-semibold">Live Trading</h3></div>
              <p className="text-gray-600">Trade with real funds through your connected exchanges.</p>
              {!hasLiveAccess && <p className="text-amber-600 text-sm mt-2">🔒 Common tier required - <button onClick={onUpgrade} className="underline">Upgrade Now</button></p>}
              {hasLiveAccess && !bothConnected && <p className="text-sm text-amber-600 mt-2">⚠️ Connect both OKX & Alpaca keys</p>}
              {tradingEnabled && <p className="text-sm text-emerald-600 mt-2">✅ Active - Real funds trading</p>}
            </div>
            {!hasLiveAccess ? (
              <button onClick={onUpgrade} className="px-5 py-2 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white">Upgrade to Common</button>
            ) : tradingEnabled ? (
              <button onClick={() => onToggleTrading(false)} className="px-5 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white">Stop Live Trading</button>
            ) : (
              <button onClick={handleStartLiveTrading} disabled={!bothConnected} className={`px-5 py-2 rounded-lg font-semibold ${bothConnected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-400 cursor-not-allowed text-white'}`}>Start Live Trading</button>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-500">
            {tradingEnabled ? '✓ Connected - Trading with real funds' : hasLiveAccess && bothConnected ? 'Ready to start live trading' : hasLiveAccess ? '⚠️ Connect both OKX and Alpaca' : '⬆️ Upgrade to Common tier'}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">⚠️ Confirm Live Trading</h3>
            <p className="text-gray-700 mb-4">You are about to enable <strong className="text-emerald-600">Live Trading</strong> with real funds.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 font-semibold mb-2">⚠️ Risk Warning:</p>
              <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                <li>Live trading involves real financial risk</li>
                <li>You can lose money - only trade what you can afford</li>
                <li>Start with small position sizes</li>
                <li>You can stop live trading at any time</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { onToggleTrading(true); setShowConfirmModal(false); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg font-semibold text-white">Yes, Enable</button>
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 border border-gray-300 hover:bg-gray-100 py-2 rounded-lg font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [integrations, setIntegrations] = useState({ wallet_connected: false, alpaca_connected: false, okx_connected: false });
  const [trial, setTrial] = useState(null);
  const [strategies, setStrategies] = useState(FALLBACK_STRATEGIES);
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [showApiModal, setShowApiModal] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");
  const [communityTrades, setCommunityTrades] = useState([]);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [paperTradingEnabled, setPaperTradingEnabled] = useState(false);
  const [togglingTrading, setTogglingTrading] = useState(false);
  const [togglingPaper, setTogglingPaper] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const me = await BotAPI.getMe(true);
      if (!me?.id && !me?.email) {
        BotAPI.clearToken?.();
        BotAPI.clearApiKey?.();
        nav("/login");
        return;
      }
      setUser(me);
      setTradingEnabled(me?.trading_enabled === true);
      setPaperTradingEnabled(me?.paper_trading_enabled === true);

      const [statsResult, integrationsResult, strategiesResult, globalTradesResult, trialResult] = await Promise.allSettled([
        BotAPI.getUserTradingStats(30, true),
        BotAPI.getIntegrationStatus(true),
        BotAPI.getTradingStrategies(true),
        BotAPI.getGlobalTrades({ limit: 20, skipCache: true }),
        BotAPI.getTrialStatus ? BotAPI.getTrialStatus(true) : Promise.resolve(null),
      ]);

      const statsPayload = statsResult.status === "fulfilled" ? statsResult.value : null;
      const integrationsPayload = integrationsResult.status === "fulfilled" ? integrationsResult.value : null;
      const strategiesPayload = strategiesResult.status === "fulfilled" ? strategiesResult.value : null;
      const tradesPayload = globalTradesResult.status === "fulfilled" ? globalTradesResult.value : null;
      let trialPayload = trialResult.status === "fulfilled" ? trialResult.value : null;

      if (!trialPayload || trialPayload.trial_status !== 'trial') {
        trialPayload = { trial_status: 'trial', paper_trading_enabled: true, seconds_remaining: 604800 };
      } else {
        trialPayload.paper_trading_enabled = true;
        if (!trialPayload.seconds_remaining || trialPayload.seconds_remaining <= 0) trialPayload.seconds_remaining = 604800;
      }

      const summary = extractSummary(statsPayload);
      const dailySeries = extractDailySeries(statsPayload);
      setStats(summary);
      setSeries(dailySeries);
      setStreak(Number(summary?.current_streak || 0));
      setIntegrations(integrationsPayload || { wallet_connected: false, alpaca_connected: false, okx_connected: false });
      
      const backendStrategies = Array.isArray(strategiesPayload?.strategies) ? strategiesPayload.strategies : Array.isArray(strategiesPayload?.data?.strategies) ? strategiesPayload.data.strategies : FALLBACK_STRATEGIES;
      setStrategies(decorateStrategies(backendStrategies));
      setCurrentStrategy(normalizeStrategyId(strategiesPayload?.current_strategy || strategiesPayload?.data?.current_strategy || me?.strategy || "mean_reversion"));
      setCommunityTrades(Array.isArray(tradesPayload?.trades) ? tradesPayload.trades : []);
      setTrial(trialPayload);
    } catch (err) {
      console.error("Failed to load member dashboard:", err);
      if (String(err?.message || "").toLowerCase().includes("invalid or expired token")) {
        BotAPI.clearToken?.();
        BotAPI.clearApiKey?.();
        nav("/login");
        return;
      }
      setStats({});
      setSeries([]);
      setStreak(0);
      setCommunityTrades([]);
      setTrial({ trial_status: 'trial', paper_trading_enabled: true, seconds_remaining: 604800 });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleToggleTrading = async (enabled) => {
    setTogglingTrading(true);
    try {
      const result = await BotAPI.toggleTrading(enabled);
      if (result?.success) { setTradingEnabled(enabled); await loadDashboard(true); }
      else alert(result?.error || "Failed to update trading status");
    } catch (error) { alert("Failed to update trading status"); }
    finally { setTogglingTrading(false); }
  };

  const handleTogglePaperTrading = async (enabled) => {
    setTogglingPaper(true);
    try { setPaperTradingEnabled(enabled); }
    catch (error) { alert("Failed to update paper trading status"); }
    finally { setTogglingPaper(false); }
  };

  const handleUpgrade = () => { nav("/pricing"); };

  useEffect(() => { loadDashboard(false); }, []);

  const nftKey = String(user?.nft_tier || "none").toLowerCase();
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;
  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothConnected = alpacaConnected && okxConnected;
  const trialActive = trial?.trial_status === "trial" && trial?.seconds_remaining > 0;
  const userTier = user?.tier || "starter";

  const confidence = useMemo(() => {
    let score = 0;
    score += Math.min(30, Number(stats.win_rate || 0) * 0.3);
    score += Math.min(30, Number(stats.total_trades || 0) * 0.3);
    score += Math.min(20, Number(streak || 0) * 2);
    score += bothConnected ? 10 : 0;
    score += nftKey !== "none" ? 10 : 0;
    return Math.min(100, Math.round(score));
  }, [stats, streak, nftKey, bothConnected]);

  const unlockedAchievements = useMemo(() => {
    const list = [];
    if (Number(stats.total_trades || 0) > 0) list.push("first_trade");
    if (Number(streak || 0) >= 7) list.push("streak_7");
    if (Number(stats.total_trades || 0) >= 50) list.push("trades_50");
    if (Number(stats.total_pnl || 0) > 0) list.push("profitable");
    if (nftKey !== "none") list.push("nft_holder");
    return list;
  }, [stats, streak, nftKey]);

  const lockedCount = useMemo(() => Object.values(FEATURE_GATES).filter((f) => !hasTierAccess(nftKey, f.minTier)).length, [nftKey]);

  const lineData = useMemo(() => ({ labels: series.map((p) => p.date || "—"), datasets: [{ label: "PnL", data: series.map((p) => Number(p.pnl ?? 0)), borderColor: "#4f46e5", backgroundColor: "rgba(79, 70, 229, 0.12)", fill: true, tension: 0.3 }] }), [series]);
  const doughnutData = useMemo(() => ({ labels: ["Wins", "Losses"], datasets: [{ data: [Number(stats.wins || 0), Number(stats.losses || 0)], backgroundColor: ["#10b981", "#ef4444"], borderWidth: 0 }] }), [stats]);
  const barData = useMemo(() => ({ labels: series.slice(-7).map((p) => p.date || "—"), datasets: [{ label: "Trades", data: series.slice(-7).map((p) => Number(p.trades || 0)), backgroundColor: "#6366f1" }] }), [series]);

  const handleStrategyChange = async (strategy) => {
    if (!hasTierAccess(nftKey, strategy.minTier)) { handleUpgrade(); return; }
    if (strategy.id === currentStrategy) return;
    const previous = currentStrategy;
    setSavingStrategy(strategy.id);
    setStrategyMessage("");
    setCurrentStrategy(strategy.id);
    try {
      const result = await BotAPI.updateUserStrategy(strategy.id);
      if (!result?.success) throw new Error("Failed to update strategy.");
      const saved = getStrategyFromResult(result, strategy.id);
      setCurrentStrategy(saved);
      setUser((prev) => (prev ? { ...prev, strategy: saved } : prev));
      setStrategyMessage(result?.message || `${strategy.name} activated.`);
    } catch (err) {
      setCurrentStrategy(previous);
      setStrategyMessage(err?.message || "Failed to update strategy.");
    } finally {
      setSavingStrategy("");
      setTimeout(() => setStrategyMessage(""), 3500);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">Loading dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Welcome back 👋</h1>
            <p className="mt-1 text-sm text-gray-600">Connect both OKX and Alpaca to start paper trading with ${PAPER_TRADING_BALANCE.toLocaleString()} virtual funds.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => loadDashboard(true)} disabled={refreshing} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">{refreshing ? "Refreshing..." : "Refresh"}</button>
            <button onClick={() => setShowApiModal(true)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">Connect API Keys</button>
            <button onClick={() => nav("/billing-dashboard")} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">Billing</button>
            <button onClick={handleUpgrade} className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white">⭐ Upgrade to Live</button>
          </div>
        </div>

        {/* Quick Start Guide */}
        <QuickStartGuide onStartTour={() => {}} />

        {/* Trial Banner */}
        <TrialBanner trial={trial} alpacaConnected={alpacaConnected} okxConnected={okxConnected} />

        {/* Setup Recommendation */}
        <SetupRecommendation alpacaConnected={alpacaConnected} okxConnected={okxConnected} onConnect={() => setShowApiModal(true)} />

        {/* Trading Controls */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold mb-4">🎮 Trading Controls</h3>
            <TradingControlButtons
              tradingEnabled={tradingEnabled}
              paperTradingEnabled={paperTradingEnabled}
              trialActive={trialActive}
              alpacaConnected={alpacaConnected}
              okxConnected={okxConnected}
              userTier={userTier}
              onToggleTrading={handleToggleTrading}
              onTogglePaperTrading={handleTogglePaperTrading}
              onUpgrade={handleUpgrade}
              loading={togglingTrading || togglingPaper}
            />
          </div>
        </div>

        {/* Trading Strategy Section */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">🎯 Trading Strategy</h3>
              {strategyMessage && <div className="text-sm text-indigo-700">{strategyMessage}</div>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy) => {
                const unlocked = hasTierAccess(nftKey, strategy.minTier);
                const active = currentStrategy === strategy.id;
                const updating = savingStrategy === strategy.id;
                return (
                  <HelpTooltip key={strategy.id} text={strategy.howToUse}>
                    <button onClick={() => handleStrategyChange(strategy)} disabled={!!savingStrategy} className={`w-full rounded-xl border p-4 text-left transition-all ${active ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-md" : unlocked ? "border-gray-200 bg-white hover:shadow-md" : "border-gray-200 bg-white opacity-75"} disabled:opacity-80 hover:scale-[1.02]`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><span className="text-2xl">{strategy.emoji}</span><span className="font-semibold text-gray-900">{strategy.name}</span></div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskClass(strategy.risk)}`}>{strategy.risk}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{strategy.description}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{unlocked ? "✓ Unlocked" : `🔒 ${NFT_TIERS[strategy.minTier]?.name || strategy.minTier}+`}</span>
                        {active ? <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">{updating ? "Updating..." : "Active ✓"}</span> : unlocked ? <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{updating ? "Updating..." : "Use this strategy"}</span> : null}
                      </div>
                    </button>
                  </HelpTooltip>
                );
              })}
            </div>
          </div>
        </div>

        {/* Membership Tier Card */}
        <div className={`rounded-2xl border ${nft.color} bg-gray-50 p-5 shadow-sm`}>
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-xl font-semibold">🧬 {nft.name}</h2><span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${nft.badge}`}>Membership Tier</span></div>
            <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm"><div className="text-xs font-semibold uppercase text-gray-500">Locked</div><div className="mt-1 text-2xl font-bold text-gray-900">{lockedCount}</div></div>
          </div>
          <ul className="mt-4 list-disc pl-5 text-sm text-gray-600">{nft.perks.map((perk) => <li key={perk}>{perk}</li>)}</ul>
          <button onClick={handleUpgrade} className="mt-4 w-full rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 font-semibold text-white">⬆️ Upgrade to Common</button>
        </div>

        {/* Trading Readiness */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">📊 Trading Readiness</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200"><div className={`h-full ${confidence >= 70 ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${confidence}%` }} /></div>
          <p className="mt-1 text-xs text-gray-500">Readiness increases with completed connections, trading history, and membership.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total Profit" value={usd(stats.total_pnl)} helper="Closed trade PnL" />
          <Stat label="Win Rate" value={pct(stats.win_rate)} helper="Closed trades" />
          <Stat label="Trades" value={Number(stats.total_trades || 0)} helper="Total recorded" />
          <Stat label="Daily Streak" value={`🔥 ${streak}`} helper="Consistency" />
        </div>

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 xl:col-span-2"><h3 className="mb-3 font-semibold">📈 PnL Performance</h3>{series.length === 0 ? <div className="text-sm text-gray-500">No performance data yet.</div> : <div className="h-72"><Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} /></div>}</div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4"><h3 className="mb-3 font-semibold">🥇 Win / Loss</h3><div className="h-72"><Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>
        </div>

        {/* Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4"><h3 className="mb-3 font-semibold">📊 Trade Count — Last 7 Days</h3><div className="h-72"><Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} /></div></div>

        {/* Connections */}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">🔌 Required Connections</h3>
            <div className="space-y-3">
              <ConnectionRow title="Alpaca" connected={alpacaConnected} helper="For stock trading" onConnect={() => setShowApiModal(true)} />
              <ConnectionRow title="OKX" connected={okxConnected} helper="For crypto trading" onConnect={() => setShowApiModal(true)} />
              <ConnectionRow title="Wallet" connected={!!integrations.wallet_connected} helper="Optional for DeFi" required={false} onConnect={() => nav("/activation")} />
            </div>
          </div>
          <CommunityTrades trades={communityTrades} />
        </div>

        {/* Resource Links */}
        <ResourceLinks />

        {/* Locked Features */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">🔒 Membership Locked Features</h3><button onClick={handleUpgrade} className="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Unlock Live Trading</button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(FEATURE_GATES).map(([key, feature]) => {
              const unlocked = hasTierAccess(nftKey, feature.minTier);
              return (
                <HelpTooltip key={key} text={feature.helpText}>
                  <div className={`rounded-xl border p-4 ${unlocked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="font-semibold text-gray-900">{feature.title}</div><div className="mt-1 text-sm text-gray-600">{feature.description}</div></div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{unlocked ? "Unlocked" : `${NFT_TIERS[feature.minTier]?.name || feature.minTier}+`}</span>
                    </div>
                  </div>
                </HelpTooltip>
              );
            })}
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">🏆 Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => (
              <HelpTooltip key={achievement.id} text={achievement.helpText}>
                <div className={`rounded-lg border px-3 py-2 ${unlockedAchievements.includes(achievement.id) ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-400"}`}>{achievement.icon} {achievement.label}</div>
              </HelpTooltip>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-4 md:grid-cols-4">
          <CTA title="Paper Trade Demo" onClick={() => nav("/trade-demo")} tooltip="Practice with virtual money" />
          <TierCTA title="Go Live" unlocked={hasTierAccess(nftKey, "common") && bothConnected} lockedText={!bothConnected ? "Connect Alpaca + OKX" : "Common+ required"} onClick={() => nav("/trade-demo?mode=live")} onLockedClick={() => bothConnected ? handleUpgrade() : setShowApiModal(true)} />
          <TierCTA title="Advanced Bots" unlocked={hasTierAccess(nftKey, "rare") && bothConnected} lockedText={!bothConnected ? "Connect Alpaca + OKX" : "Rare+ required"} onClick={handleUpgrade} onLockedClick={() => bothConnected ? handleUpgrade() : setShowApiModal(true)} />
          <TierCTA title="Futures" unlocked={hasTierAccess(nftKey, "epic") && okxConnected} lockedText={!okxConnected ? "Connect OKX" : "Epic+ required"} onClick={handleUpgrade} onLockedClick={() => okxConnected ? handleUpgrade() : setShowApiModal(true)} />
        </div>

        {/* Secondary Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <TierCTA title="Alpha Signals" unlocked={hasTierAccess(nftKey, "legendary") && bothConnected} lockedText={!bothConnected ? "Connect Alpaca + OKX" : "Legendary required"} onClick={handleUpgrade} onLockedClick={() => bothConnected ? handleUpgrade() : setShowApiModal(true)} />
          <CTA title="Billing" onClick={() => nav("/billing-dashboard")} tooltip="Manage subscription" />
          <CTA title="Complete Activation" onClick={() => nav("/activation")} tooltip="Finish setup" />
        </div>
      </div>

      <ApiKeysModal open={showApiModal} onClose={() => setShowApiModal(false)} onSaved={() => loadDashboard(true)} />
    </div>
  );
}