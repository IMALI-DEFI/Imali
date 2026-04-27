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
    description: "Looks for dips and safer rebounds.",
  },
  {
    id: "ai_weighted",
    name: "Balanced",
    emoji: "⚖️",
    minTier: "none",
    risk: "Medium",
    description: "A balanced AI mix of multiple trading signals.",
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    minTier: "none",
    risk: "High",
    description: "Follows strong moves when markets are trending.",
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    minTier: "rare",
    risk: "Low",
    description: "Looks for price differences across venues.",
  },
  {
    id: "futures",
    name: "Futures Engine",
    emoji: "📈",
    minTier: "epic",
    risk: "High",
    description: "Higher-speed crypto futures execution.",
  },
  {
    id: "alpha",
    name: "Alpha Sniper",
    emoji: "🎯",
    minTier: "legendary",
    risk: "High",
    description: "Premium entries, signals, and early-access tools.",
  },
];

const FEATURE_GATES = {
  paper_trading: {
    title: "Paper Trading",
    minTier: "none",
    description: "Practice trading before risking real money.",
  },
  live_trading: {
    title: "Live Trading",
    minTier: "common",
    description: "Trade with real capital after setup is complete.",
  },
  advanced_bots: {
    title: "Advanced Bots",
    minTier: "rare",
    description: "Unlock stronger automation and premium execution logic.",
  },
  futures: {
    title: "Futures Trading",
    minTier: "epic",
    description: "Access higher-risk futures trading tools.",
  },
  alpha_signals: {
    title: "Alpha Signals",
    minTier: "legendary",
    description: "Premium signals, early access, and VIP-level features.",
  },
};

const ACHIEVEMENTS = [
  { id: "first_trade", label: "First Trade", icon: "🚀" },
  { id: "streak_7", label: "7-Day Streak", icon: "🔥" },
  { id: "trades_50", label: "50 Trades", icon: "🏆" },
  { id: "profitable", label: "Profitable Day", icon: "💰" },
  { id: "nft_holder", label: "NFT Holder", icon: "🎟️" },
];

/* ================= HELPERS ================= */
const usd = (n = 0) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n = 0) => `${Number(n || 0).toFixed(1)}%`;

const normalizeStrategyId = (value) => {
  const v = String(value || "").trim().toLowerCase();
  const aliases = {
    "mean reversion": "mean_reversion",
    "mean-reversion": "mean_reversion",
    conservative: "mean_reversion",
    balanced: "ai_weighted",
    "ai weighted": "ai_weighted",
    "ai-weighted": "ai_weighted",
    momentum: "momentum",
    arbitrage: "arbitrage",
    "futures engine": "futures",
    futures: "futures",
    "alpha sniper": "alpha",
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
      description: fallback?.description || strategy.description || "Trading strategy",
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
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr${hours === 1 ? "" : "s"}`;
};

const anonymizeEmail = (email, index = 0) => {
  if (!email) return `member_${1000 + index}`;
  const raw = String(email).toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) % 10000;
  return `member_${String(hash).padStart(4, "0")}`;
};

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
      alert(`Please fill in both Alpaca ${mode} fields.`);
      return;
    }

    setSaving(`alpaca-${mode}`);
    try {
      const result = await BotAPI.connectAlpaca({
        api_key: payload.apiKey.trim(),
        api_secret: payload.secret.trim(),
        mode,
      });

      if (!result?.success) throw new Error(result?.error || `Failed to save Alpaca ${mode} keys.`);
      alert(`Alpaca ${mode} keys saved.`);

      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });
      await onSaved?.();
    } catch (err) {
      alert(err?.message || `Failed to save Alpaca ${mode} keys.`);
    } finally {
      setSaving("");
    }
  };

  const saveOKX = async (mode) => {
    const payload = mode === "paper" ? okxPaper : okxLive;
    if (!payload.apiKey || !payload.secret || !payload.passphrase) {
      alert(`Please fill in all OKX ${mode} fields.`);
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

      if (!result?.success) throw new Error(result?.error || `Failed to save OKX ${mode} keys.`);
      alert(`OKX ${mode} keys saved.`);

      if (mode === "paper") setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      if (mode === "live") setOkxLive({ apiKey: "", secret: "", passphrase: "" });
      await onSaved?.();
    } catch (err) {
      alert(err?.message || `Failed to save OKX ${mode} keys.`);
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
              Alpaca is required for stock trading. OKX is required for crypto trading. Set up both for the full Imali experience.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close API key modal"
          >
            ×
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Security recommendation:</strong> create restricted API keys with trading-only permissions. Do not enable withdrawals. Use paper keys first, then live keys only when ready.
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExchangeBlock
            title="Alpaca — Stocks & ETFs"
            icon="📈"
            paperState={alpacaPaper}
            setPaperState={setAlpacaPaper}
            liveState={alpacaLive}
            setLiveState={setAlpacaLive}
            onSavePaper={() => saveAlpaca("paper")}
            onSaveLive={() => saveAlpaca("live")}
            saving={saving.startsWith("alpaca")}
          />

          <ExchangeBlock
            title="OKX — Crypto Spot/Futures"
            icon="🔷"
            paperState={okxPaper}
            setPaperState={setOkxPaper}
            liveState={okxLive}
            setLiveState={setOkxLive}
            onSavePaper={() => saveOKX("paper")}
            onSaveLive={() => saveOKX("live")}
            saving={saving.startsWith("okx")}
            requiresPassphrase
          />
        </div>
      </div>
    </div>
  );
}

function ExchangeBlock({
  title,
  icon,
  paperState,
  setPaperState,
  liveState,
  setLiveState,
  onSavePaper,
  onSaveLive,
  saving,
  requiresPassphrase = false,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <KeyForm
          title="Paper Keys"
          state={paperState}
          setState={setPaperState}
          onSave={onSavePaper}
          saving={saving}
          requiresPassphrase={requiresPassphrase}
        />
        <KeyForm
          title="Live Keys"
          state={liveState}
          setState={setLiveState}
          onSave={onSaveLive}
          saving={saving}
          requiresPassphrase={requiresPassphrase}
        />
      </div>
    </div>
  );
}

function KeyForm({ title, state, setState, onSave, saving, requiresPassphrase = false }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-bold text-gray-900">{title}</div>
      <div className="space-y-2">
        <input
          type="text"
          value={state.apiKey}
          onChange={(e) => setState({ ...state, apiKey: e.target.value })}
          placeholder="API Key"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <input
          type="password"
          value={state.secret}
          onChange={(e) => setState({ ...state, secret: e.target.value })}
          placeholder="Secret Key"
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        {requiresPassphrase ? (
          <input
            type="password"
            value={state.passphrase}
            onChange={(e) => setState({ ...state, passphrase: e.target.value })}
            placeholder="Passphrase"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        ) : null}
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */
function Stat({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-gray-500">{helper}</div> : null}
    </div>
  );
}

function ConnectionRow({ title, connected, helper, required = true, onConnect }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <div>
        <span className="font-medium text-gray-900">{title}</span>
        {helper ? <div className="text-xs text-gray-500">{helper}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            connected ? "bg-emerald-100 text-emerald-700" : required ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
          }`}
        >
          {connected ? "Connected" : required ? "Required" : "Optional"}
        </span>
        {!connected ? (
          <button
            onClick={onConnect}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Connect
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CTA({ title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
    >
      {title}
    </button>
  );
}

function TierCTA({ title, unlocked, lockedText, onClick, onLockedClick }) {
  if (unlocked) {
    return (
      <button
        onClick={onClick}
        className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
      >
        {title}
      </button>
    );
  }

  return (
    <button
      onClick={onLockedClick}
      className="rounded-xl border border-amber-300 bg-amber-50 py-3 font-semibold text-amber-800 hover:bg-amber-100"
    >
      🔒 {title} — {lockedText}
    </button>
  );
}

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
              <div
                key={trade.id || index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{trade.symbol || "Unknown"}</span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {trade.bot || "Bot"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {anonymizeEmail(trade.user_email, index)} • {trade.exchange || "exchange"}
                  </div>
                </div>
                <div className={`text-sm font-bold ${positive ? "text-emerald-700" : "text-red-700"}`}>
                  {usd(pnl)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SetupRecommendation({ alpacaConnected, okxConnected, onConnect }) {
  const bothReady = alpacaConnected && okxConnected;
  return (
    <div className={`rounded-2xl border p-5 ${bothReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={`text-lg font-bold ${bothReady ? "text-emerald-900" : "text-amber-900"}`}>
            {bothReady ? "✅ Full stock + crypto setup complete" : "⚠️ Recommended setup: connect both Alpaca and OKX"}
          </h2>
          <p className={`mt-1 text-sm ${bothReady ? "text-emerald-800" : "text-amber-900"}`}>
            Alpaca powers stock and ETF trading. OKX powers crypto spot and futures trading. To use Imali across both stock and crypto markets, both connections should be completed.
          </p>
        </div>
        {!bothReady ? (
          <button
            onClick={onConnect}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Connect Missing Keys
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TrialBanner({ trial }) {
  const status = String(trial?.trial_status || "").toLowerCase();
  const active = status === "trial" && trial?.paper_trading_enabled !== false && Number(trial?.seconds_remaining || 0) > 0;

  if (!trial) return null;

  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-sky-200 bg-sky-50" : "border-rose-200 bg-rose-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`font-bold ${active ? "text-sky-900" : "text-rose-900"}`}>
            {active ? "Paper trading trial active" : "Paper trading trial inactive"}
          </h3>
          <p className={`text-sm ${active ? "text-sky-800" : "text-rose-800"}`}>
            {active
              ? `Time remaining: ${formatTrialRemaining(trial.seconds_remaining)}. Use this time to test before going live.`
              : "Your trial is expired or inactive. Upgrade or contact support to continue trading."}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700"}`}>
          {active ? "Trial Active" : "Trial Inactive"}
        </span>
      </div>
    </div>
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
  const [integrations, setIntegrations] = useState({
    wallet_connected: false,
    alpaca_connected: false,
    okx_connected: false,
  });
  const [trial, setTrial] = useState(null);
  const [strategies, setStrategies] = useState(FALLBACK_STRATEGIES);
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [showApiModal, setShowApiModal] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");
  const [communityTrades, setCommunityTrades] = useState([]);

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

      const [statsResult, integrationsResult, strategiesResult, globalTradesResult, trialResult] =
        await Promise.allSettled([
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
      const trialPayload = trialResult.status === "fulfilled" ? trialResult.value : null;

      const summary = extractSummary(statsPayload);
      const dailySeries = extractDailySeries(statsPayload);

      setStats(summary);
      setSeries(dailySeries);
      setStreak(Number(summary?.current_streak || 0));
      setIntegrations(integrationsPayload || {
        wallet_connected: false,
        alpaca_connected: false,
        okx_connected: false,
      });

      const backendStrategies = Array.isArray(strategiesPayload?.strategies)
        ? strategiesPayload.strategies
        : Array.isArray(strategiesPayload?.data?.strategies)
        ? strategiesPayload.data.strategies
        : FALLBACK_STRATEGIES;

      setStrategies(decorateStrategies(backendStrategies));
      setCurrentStrategy(
        normalizeStrategyId(strategiesPayload?.current_strategy || strategiesPayload?.data?.current_strategy || me?.strategy || "mean_reversion")
      );
      setCommunityTrades(Array.isArray(tradesPayload?.trades) ? tradesPayload.trades : []);
      setTrial(trialPayload?.data || trialPayload || {
        trial_status: me?.trial_status,
        trial_ends_at: me?.trial_ends_at,
        paper_trading_enabled: me?.paper_trading_enabled,
      });
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
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nftKey = String(user?.nft_tier || "none").toLowerCase();
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;
  const alpacaConnected = !!integrations.alpaca_connected;
  const okxConnected = !!integrations.okx_connected;
  const bothMarketConnectionsReady = alpacaConnected && okxConnected;

  const confidence = useMemo(() => {
    let score = 0;
    score += Math.min(30, Number(stats.win_rate || 0) * 0.3);
    score += Math.min(30, Number(stats.total_trades || 0) * 0.3);
    score += Math.min(20, Number(streak || 0) * 2);
    score += bothMarketConnectionsReady ? 10 : 0;
    score += nftKey !== "none" ? 10 : 0;
    return Math.min(100, Math.round(score));
  }, [stats, streak, nftKey, bothMarketConnectionsReady]);

  const unlockedAchievements = useMemo(() => {
    const list = [];
    if (Number(stats.total_trades || 0) > 0) list.push("first_trade");
    if (Number(streak || 0) >= 7) list.push("streak_7");
    if (Number(stats.total_trades || 0) >= 50) list.push("trades_50");
    if (Number(stats.total_pnl || 0) > 0) list.push("profitable");
    if (nftKey !== "none") list.push("nft_holder");
    return list;
  }, [stats, streak, nftKey]);

  const lockedCount = useMemo(() => {
    return Object.values(FEATURE_GATES).filter((feature) => !hasTierAccess(nftKey, feature.minTier)).length;
  }, [nftKey]);

  const lineData = useMemo(
    () => ({
      labels: series.map((p) => p.date || p.x || "—"),
      datasets: [
        {
          label: "PnL",
          data: series.map((p) => Number(p.pnl ?? p.y ?? 0)),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.12)",
          fill: true,
          tension: 0.3,
        },
      ],
    }),
    [series]
  );

  const doughnutData = useMemo(() => {
    const wins = Number(stats.wins || 0);
    const losses = Number(stats.losses || 0);
    return {
      labels: ["Wins", "Losses"],
      datasets: [{ data: [wins, losses], backgroundColor: ["#10b981", "#ef4444"], borderWidth: 0 }],
    };
  }, [stats]);

  const barData = useMemo(() => {
    const lastSeven = series.slice(-7);
    return {
      labels: lastSeven.map((p) => p.date || p.x || "—"),
      datasets: [{ label: "Trades", data: lastSeven.map((p) => Number(p.trades || 0)), backgroundColor: "#6366f1" }],
    };
  }, [series]);

  const handleStrategyChange = async (strategy) => {
    if (!hasTierAccess(nftKey, strategy.minTier)) {
      nav("/pricing");
      return;
    }

    if (strategy.id === currentStrategy) return;

    const previous = currentStrategy;
    setSavingStrategy(strategy.id);
    setStrategyMessage("");
    setCurrentStrategy(strategy.id);

    try {
      const result = await BotAPI.updateUserStrategy(strategy.id);
      if (!result?.success) throw new Error(result?.error || "Failed to update strategy.");

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Welcome back 👋</h1>
            <p className="mt-1 text-sm text-gray-600">
              Connect Alpaca for stocks and OKX for crypto to unlock the full Imali trading workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={() => setShowApiModal(true)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Connect API Keys
            </button>

            <button
              onClick={() => nav("/billing-dashboard")}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Billing
            </button>

            <button
              onClick={() => nav("/pricing")}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade
            </button>
          </div>
        </div>

        <TrialBanner trial={trial} />

        <SetupRecommendation
          alpacaConnected={alpacaConnected}
          okxConnected={okxConnected}
          onConnect={() => setShowApiModal(true)}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">🎯 Trading Strategy</h3>
              {strategyMessage ? <div className="text-sm text-indigo-700">{strategyMessage}</div> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {strategies.map((strategy) => {
                const unlocked = hasTierAccess(nftKey, strategy.minTier);
                const active = currentStrategy === strategy.id;
                const updating = savingStrategy === strategy.id;

                return (
                  <button
                    key={strategy.id}
                    onClick={() => handleStrategyChange(strategy)}
                    disabled={!!savingStrategy}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                        : unlocked
                        ? "border-gray-200 bg-white hover:shadow-sm"
                        : "border-gray-200 bg-white opacity-90"
                    } disabled:opacity-80`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{strategy.emoji}</span>
                          <span className="font-semibold text-gray-900">{strategy.name}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">{strategy.description}</div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskClass(strategy.risk)}`}>
                          {strategy.risk}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {unlocked ? "Unlocked" : `${NFT_TIERS[strategy.minTier]?.name || strategy.minTier}+`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {active ? (
                        <div className="rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white">
                          {updating ? "Updating..." : "Active"}
                        </div>
                      ) : unlocked ? (
                        <div className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                          {updating ? "Updating..." : "Use this strategy"}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
                          Locked — Upgrade Required
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl border ${nft.color} bg-gray-50 p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">🧬 {nft.name}</h2>
                <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${nft.badge}`}>
                  Membership Tier
                </span>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Locked</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{lockedCount}</div>
              </div>
            </div>

            <ul className="mt-4 list-disc pl-5 text-sm text-gray-600">
              {nft.perks.map((perk) => <li key={perk}>{perk}</li>)}
            </ul>

            <button
              onClick={() => nav("/pricing")}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade Membership
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">📊 Trading Readiness</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${confidence >= 70 ? "bg-emerald-500" : "bg-yellow-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Readiness increases with completed connections, trading history, consistency, and membership access.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total Profit" value={usd(stats.total_pnl)} helper="Closed trade PnL" />
          <Stat label="Win Rate" value={pct(stats.win_rate)} helper="Closed trades" />
          <Stat label="Trades" value={Number(stats.total_trades || 0)} helper="Total recorded" />
          <Stat label="Daily Streak" value={`🔥 ${streak}`} helper="Consistency" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 xl:col-span-2">
            <h3 className="mb-3 font-semibold">📈 PnL Performance</h3>
            {series.length === 0 ? (
              <div className="text-sm text-gray-500">No performance data yet.</div>
            ) : (
              <div className="h-72">
                <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">🥇 Win / Loss</h3>
            <div className="h-72">
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">📊 Trade Count — Last 7 Points</h3>
          <div className="h-72">
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">🔌 Required Connections</h3>
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              For full stock + crypto trading, connect both platforms: Alpaca for stocks/ETFs and OKX for crypto.
            </div>
            <div className="space-y-3">
              <ConnectionRow
                title="Alpaca"
                connected={alpacaConnected}
                helper="Required for stock and ETF trading"
                onConnect={() => setShowApiModal(true)}
              />
              <ConnectionRow
                title="OKX"
                connected={okxConnected}
                helper="Required for crypto spot and futures trading"
                onConnect={() => setShowApiModal(true)}
              />
              <ConnectionRow
                title="Wallet / MetaMask"
                connected={!!integrations.wallet_connected}
                helper="Optional for DeFi wallet activity"
                required={false}
                onConnect={() => nav("/activation")}
              />
            </div>
          </div>

          <CommunityTrades trades={communityTrades} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">🔒 Membership Locked Features</h3>
            <button
              onClick={() => nav("/pricing")}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Unlock More
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(FEATURE_GATES).map(([key, feature]) => {
              const unlocked = hasTierAccess(nftKey, feature.minTier);
              return (
                <div key={key} className={`rounded-xl border p-4 ${unlocked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{feature.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{feature.description}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {unlocked ? "Unlocked" : `${NFT_TIERS[feature.minTier]?.name || feature.minTier}+`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">🏆 Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border px-3 py-2 ${
                  unlockedAchievements.includes(achievement.id)
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {achievement.icon} {achievement.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <CTA title="Paper Trade Demo" onClick={() => nav("/trade-demo")} />
          <TierCTA
            title="Go Live"
            unlocked={hasTierAccess(nftKey, "common") && bothMarketConnectionsReady}
            lockedText={!bothMarketConnectionsReady ? "Connect Alpaca + OKX" : "Common+ required"}
            onClick={() => nav("/trade-demo?mode=live")}
            onLockedClick={() => (bothMarketConnectionsReady ? nav("/pricing") : setShowApiModal(true))}
          />
          <TierCTA
            title="Advanced Bots"
            unlocked={hasTierAccess(nftKey, "rare") && bothMarketConnectionsReady}
            lockedText={!bothMarketConnectionsReady ? "Connect Alpaca + OKX" : "Rare+ required"}
            onClick={() => nav("/pricing")}
            onLockedClick={() => (bothMarketConnectionsReady ? nav("/pricing") : setShowApiModal(true))}
          />
          <TierCTA
            title="Futures"
            unlocked={hasTierAccess(nftKey, "epic") && okxConnected}
            lockedText={!okxConnected ? "Connect OKX" : "Epic+ required"}
            onClick={() => nav("/pricing")}
            onLockedClick={() => (okxConnected ? nav("/pricing") : setShowApiModal(true))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TierCTA
            title="Alpha Signals"
            unlocked={hasTierAccess(nftKey, "legendary") && bothMarketConnectionsReady}
            lockedText={!bothMarketConnectionsReady ? "Connect Alpaca + OKX" : "Legendary required"}
            onClick={() => nav("/pricing")}
            onLockedClick={() => (bothMarketConnectionsReady ? nav("/pricing") : setShowApiModal(true))}
          />
          <CTA title="Billing" onClick={() => nav("/billing-dashboard")} />
          <CTA title="Complete Activation" onClick={() => nav("/activation")} />
        </div>
      </div>

      <ApiKeysModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
        onSaved={() => loadDashboard(true)}
      />
    </div>
  );
}
