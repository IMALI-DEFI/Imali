// src/pages/MemberDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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

/* ================= CHART SETUP ================= */
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

/* ================= CONFIG ================= */
const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const TOKEN_KEY = "imali_token";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ================= NFT TIERS ================= */
const NFT_TIERS = {
  none: {
    rank: 0,
    key: "none",
    name: "No Membership",
    color: "border-slate-300",
    glow: "",
    perks: ["Standard fees", "Basic features"],
  },
  common: {
    rank: 1,
    key: "common",
    name: "Common",
    color: "border-emerald-400",
    glow: "shadow-emerald-200",
    perks: ["Lower fees", "Priority execution", "Live trading"],
  },
  rare: {
    rank: 2,
    key: "rare",
    name: "Rare",
    color: "border-sky-400",
    glow: "shadow-sky-200",
    perks: ["Even lower fees", "Advanced bots", "Arbitrage strategy"],
  },
  epic: {
    rank: 3,
    key: "epic",
    name: "Epic",
    color: "border-purple-400",
    glow: "shadow-purple-200",
    perks: ["Best fees", "All bots", "Faster routing", "Futures access"],
  },
  legendary: {
    rank: 4,
    key: "legendary",
    name: "Legendary",
    color: "border-yellow-400",
    glow: "shadow-yellow-200",
    perks: ["Lowest fees", "Alpha access", "VIP support", "Premium signals"],
  },
};

const FEATURE_GATES = {
  live_trading: {
    title: "Go Live",
    minTier: "common",
    description: "Trade with real capital.",
  },
  advanced_bots: {
    title: "Advanced Bots",
    minTier: "rare",
    description: "Unlock stronger automation and premium execution logic.",
  },
  futures: {
    title: "Futures Trading",
    minTier: "epic",
    description: "Access leveraged futures trading tools.",
  },
  alpha_signals: {
    title: "Alpha Signals",
    minTier: "legendary",
    description: "Premium signals, early access, and VIP-level features.",
  },
};

/* ================= STRATEGIES ================= */
const STRATEGIES = [
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
    description: "Balanced AI allocation and execution.",
  },
  {
    id: "momentum",
    name: "Momentum",
    emoji: "🔥",
    minTier: "none",
    risk: "High",
    description: "Capture strength in strong market trends.",
  },
  {
    id: "arbitrage",
    name: "Arbitrage",
    emoji: "🔄",
    minTier: "rare",
    risk: "Low",
    description: "Profit from price differences across venues.",
  },
  {
    id: "futures",
    name: "Futures Engine",
    emoji: "📈",
    minTier: "epic",
    risk: "High",
    description: "Higher-speed futures execution.",
  },
  {
    id: "alpha",
    name: "Alpha Sniper",
    emoji: "🎯",
    minTier: "legendary",
    risk: "High",
    description: "Top-tier premium entries and signals.",
  },
];

/* ================= ACHIEVEMENTS ================= */
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

const normalizeUser = (data) => data?.data?.user || data?.user || data?.data || data || null;
const normalizeStats = (data) => data?.summary || data?.data?.summary || {};
const normalizeSeries = (data) => {
  const raw =
    data?.daily_performance ||
    data?.series ||
    data?.data?.daily_performance ||
    data?.data?.series ||
    [];

  return Array.isArray(raw)
    ? raw.map((p) => ({
        x: p?.date || p?.x || "",
        y: Number(p?.pnl ?? p?.y ?? 0),
        trades: Number(p?.trades ?? 0),
      }))
    : [];
};

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

const isAuthError = (err) => {
  const status = err?.response?.status;
  return status === 401 || status === 403;
};

const isRetryableRouteError = (err) => {
  const status = err?.response?.status;
  return status === 404 || status === 405;
};

const requestCurrentStrategy = async () => {
  const attempts = [
    { method: "get", url: "/api/user/strategy" },
    { method: "get", url: "/api/trading/strategy" },
    { method: "get", url: "/api/trading/current-strategy" },
  ];

  for (const attempt of attempts) {
    try {
      const res = await API({ method: attempt.method, url: attempt.url });
      const strategy =
        res?.data?.strategy ||
        res?.data?.current_strategy ||
        res?.data?.data?.strategy ||
        res?.data?.data?.current_strategy;

      if (strategy) return normalizeStrategyId(strategy);
    } catch (err) {
      if (isAuthError(err)) throw err;
      if (!isRetryableRouteError(err)) throw err;
    }
  }

  return null;
};

const updateStrategyRequest = async (strategyId) => {
  const payload = { strategy: strategyId };

  const attempts = [
    { method: "post", url: "/api/trading/strategy" },
    { method: "post", url: "/api/trading/update-strategy" },
    { method: "post", url: "/api/user/strategy" },
    { method: "patch", url: "/api/trading/strategy" },
    { method: "patch", url: "/api/user/strategy" },
    { method: "put", url: "/api/trading/strategy" },
    { method: "put", url: "/api/user/strategy" },
  ];

  let lastErr = null;

  for (const attempt of attempts) {
    try {
      const res = await API({
        method: attempt.method,
        url: attempt.url,
        data: payload,
      });
      return res?.data || { success: true, strategy: strategyId };
    } catch (err) {
      lastErr = err;
      if (isAuthError(err)) throw err;
      if (isRetryableRouteError(err)) continue;
      throw err;
    }
  }

  throw lastErr || new Error("No working strategy endpoint found.");
};

/* ================= MODAL ================= */
function ApiKeysModal({ open, onClose }) {
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
      await API.post("/api/integrations/alpaca", {
        api_key: payload.apiKey,
        api_secret: payload.secret,
        mode,
      });
      alert(`Alpaca ${mode} keys saved.`);
      if (mode === "paper") setAlpacaPaper({ apiKey: "", secret: "" });
      if (mode === "live") setAlpacaLive({ apiKey: "", secret: "" });
    } catch (err) {
      if (isAuthError(err)) {
        clearToken();
        alert("Your session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }
      alert(err?.response?.data?.message || err?.message || `Failed to save Alpaca ${mode} keys.`);
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
      await API.post("/api/integrations/okx", {
        api_key: payload.apiKey,
        api_secret: payload.secret,
        passphrase: payload.passphrase,
        mode,
      });
      alert(`OKX ${mode} keys saved.`);
      if (mode === "paper") setOkxPaper({ apiKey: "", secret: "", passphrase: "" });
      if (mode === "live") setOkxLive({ apiKey: "", secret: "", passphrase: "" });
    } catch (err) {
      if (isAuthError(err)) {
        clearToken();
        alert("Your session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }
      alert(err?.response?.data?.message || err?.message || `Failed to save OKX ${mode} keys.`);
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">API & Exchange Keys</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage paper and live credentials for Alpaca and OKX.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-2xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExchangeBlock
            title="Alpaca"
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
            title="OKX"
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <input
          type="password"
          value={state.secret}
          onChange={(e) => setState({ ...state, secret: e.target.value })}
          placeholder="Secret Key"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        {requiresPassphrase ? (
          <input
            type="password"
            value={state.passphrase}
            onChange={(e) => setState({ ...state, passphrase: e.target.value })}
            placeholder="Passphrase"
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

/* ================= COMPONENT ================= */
export default function MemberDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [series, setSeries] = useState([]);
  const [streak, setStreak] = useState(0);
  const [currentStrategy, setCurrentStrategy] = useState("mean_reversion");
  const [showApiModal, setShowApiModal] = useState(false);
  const [savingStrategy, setSavingStrategy] = useState("");
  const [strategyMessage, setStrategyMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await API.get("/api/me");
        const currentUser = normalizeUser(meRes.data);

        if (!currentUser?.email && !currentUser?.id) {
          clearToken();
          nav("/login");
          return;
        }

        setUser(currentUser);
        setCurrentStrategy(normalizeStrategyId(currentUser?.strategy));

        const statsRes = await API.get("/api/user/trading-stats?days=30");
        const statsData = statsRes.data || {};
        const summary = normalizeStats(statsData);
        const performanceSeries = normalizeSeries(statsData);

        setStats(summary);
        setSeries(performanceSeries);
        setStreak(Number(summary?.current_streak || 0));

        try {
          const fetchedStrategy = await requestCurrentStrategy();
          if (fetchedStrategy) setCurrentStrategy(fetchedStrategy);
        } catch (err) {
          if (isAuthError(err)) {
            clearToken();
            nav("/login");
            return;
          }
        }
      } catch (err) {
        if (isAuthError(err)) {
          clearToken();
          nav("/login");
          return;
        }

        console.error("Failed to load member dashboard:", err);
        setStats({});
        setSeries([]);
        setStreak(0);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [nav]);

  const nftKey = String(user?.nft_tier || "none").toLowerCase();
  const nft = NFT_TIERS[nftKey] || NFT_TIERS.none;

  const confidence = useMemo(() => {
    let score = 0;
    score += Math.min(30, Number(stats.win_rate || 0) * 0.3);
    score += Math.min(30, Number(stats.total_trades || 0) * 0.3);
    score += Math.min(20, Number(streak || 0) * 2);
    score += nftKey !== "none" ? 20 : 0;
    return Math.min(100, Math.round(score));
  }, [stats, streak, nftKey]);

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
    return Object.values(FEATURE_GATES).filter(
      (feature) => !hasTierAccess(nftKey, feature.minTier)
    ).length;
  }, [nftKey]);

  const lineData = useMemo(
    () => ({
      labels: series.map((p) => p.x || "—"),
      datasets: [
        {
          label: "PnL",
          data: series.map((p) => Number(p.y || 0)),
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
      datasets: [
        {
          data: [wins, losses],
          backgroundColor: ["#10b981", "#ef4444"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const barData = useMemo(() => {
    const lastSeven = series.slice(-7);
    return {
      labels: lastSeven.map((p) => p.x || "—"),
      datasets: [
        {
          label: "Trades",
          data: lastSeven.map((p) => Number(p.trades || 0)),
          backgroundColor: "#6366f1",
        },
      ],
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
      const result = await updateStrategyRequest(strategy.id);
      const saved =
        normalizeStrategyId(
          result?.strategy ||
            result?.current_strategy ||
            result?.data?.strategy ||
            result?.data?.current_strategy ||
            strategy.id
        ) || strategy.id;

      setCurrentStrategy(saved);
      setUser((prev) => (prev ? { ...prev, strategy: saved } : prev));
      setStrategyMessage(`${strategy.name} activated.`);
    } catch (err) {
      setCurrentStrategy(previous);

      if (isAuthError(err)) {
        clearToken();
        setStrategyMessage("Your session expired. Please log in again.");
        setTimeout(() => nav("/login"), 900);
        return;
      }

      if (isRetryableRouteError(err)) {
        setStrategyMessage("Strategy endpoint exists, but the backend method or route still does not match.");
      } else {
        setStrategyMessage(
          err?.response?.data?.message || err?.message || "Failed to update strategy."
        );
      }
    } finally {
      setSavingStrategy("");
      setTimeout(() => setStrategyMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        Loading…
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
              Your membership controls which premium trading tools you can unlock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowApiModal(true)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              API & Keys
            </button>

            <button
              onClick={() => nav("/billing-dashboard")}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Billing Dashboard
            </button>

            <button
              onClick={() => nav("/pricing")}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade Plan
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">🎯 Trading Strategy</h3>
            {strategyMessage ? <div className="text-sm text-indigo-700">{strategyMessage}</div> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {STRATEGIES.map((strategy) => {
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
                        {unlocked ? "Unlocked" : `${NFT_TIERS[strategy.minTier].name}+`}
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

        <div className={`rounded-2xl border ${nft.color} ${nft.glow} bg-gray-50 p-5 shadow-sm`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">🧬 Membership NFT — {nft.name}</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                {nft.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Locked features</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{lockedCount}</div>
            </div>
          </div>

          {nftKey === "none" && (
            <button
              onClick={() => nav("/nft")}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
            >
              Upgrade Membership
            </button>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">📊 Trading Confidence</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${confidence >= 70 ? "bg-emerald-500" : "bg-yellow-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Confidence is built from win rate, consistency, and experience.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Total Profit" value={usd(stats.total_pnl)} />
          <Stat label="Win Rate" value={pct(stats.win_rate)} />
          <Stat label="Trades" value={Number(stats.total_trades || 0)} />
          <Stat label="Daily Streak" value={`🔥 ${streak}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 xl:col-span-2">
            <h3 className="mb-3 font-semibold">📈 PnL Performance</h3>
            {series.length === 0 ? (
              <div className="text-sm text-gray-500">No performance data yet.</div>
            ) : (
              <div className="h-72">
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                  }}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">🥇 Win / Loss</h3>
            <div className="h-72">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold">📊 Trade Count (Last 7 Points)</h3>
          <div className="h-72">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
              }}
            />
          </div>
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
                <div
                  key={key}
                  className={`rounded-xl border p-4 ${
                    unlocked ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{feature.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{feature.description}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        unlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {unlocked ? "Unlocked" : `${NFT_TIERS[feature.minTier].name}+`}
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
          <CTA title="Trade Demo" onClick={() => nav("/trade-demo")} />
          <TierCTA
            title="Go Live"
            unlocked={hasTierAccess(nftKey, "common")}
            lockedText="Common+ required"
            onClick={() => nav("/trade-demo?mode=live")}
            onLockedClick={() => nav("/pricing")}
          />
          <TierCTA
            title="Advanced Bots"
            unlocked={hasTierAccess(nftKey, "rare")}
            lockedText="Rare+ required"
            onClick={() => nav("/bots")}
            onLockedClick={() => nav("/pricing")}
          />
          <TierCTA
            title="Futures"
            unlocked={hasTierAccess(nftKey, "epic")}
            lockedText="Epic+ required"
            onClick={() => nav("/futures")}
            onLockedClick={() => nav("/pricing")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TierCTA
            title="Alpha Signals"
            unlocked={hasTierAccess(nftKey, "legendary")}
            lockedText="Legendary required"
            onClick={() => nav("/signals")}
            onLockedClick={() => nav("/pricing")}
          />
          <CTA title="Billing" onClick={() => nav("/billing-dashboard")} />
          <CTA title="Learn" onClick={() => nav("/help")} />
        </div>
      </div>

      <ApiKeysModal open={showApiModal} onClose={() => setShowApiModal(false)} />
    </div>
  );
}

/* ================= SMALL ================= */
const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-bold text-gray-900">{value}</div>
  </div>
);

const CTA = ({ title, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
  >
    {title}
  </button>
);

const TierCTA = ({ title, unlocked, lockedText, onClick, onLockedClick }) => {
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
};
