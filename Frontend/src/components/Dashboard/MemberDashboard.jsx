// src/components/Dashboard/MemberDashboard.jsx
// Production-ready IMALI Member Dashboard with tier integration

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaApple,
  FaArrowRight,
  FaBitcoin,
  FaChartLine,
  FaCheckCircle,
  FaCircle,
  FaCoins,
  FaCrown,
  FaExclamationTriangle,
  FaLock,
  FaPlay,
  FaPlug,
  FaRedo,
  FaRobot,
  FaSignOutAlt,
  FaSpinner,
  FaStop,
  FaSyncAlt,
  FaWater,
  FaBug,
} from "react-icons/fa";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

import nftStarter from "../../assets/images/nfts/nft-starter.png";
import nftPro from "../../assets/images/nfts/nft-pro.png";
import nftElite from "../../assets/images/nfts/nft-elite.png";

ChartJS.register(ArcElement, Tooltip);

const POLL_MS = 7000;
const CRITICAL_POLL_MS = 3000;
const API_RETRY_COUNT = 2;
const API_RETRY_DELAY_MS = 1000;
const STALE_TIME_MS = 60000;

// ✅ FIX: Updated TIER_RANK with proper pricing tiers
const TIER_RANK = {
  starter: 0,
  pro: 1,
  elite: 2,
  enterprise: 3,
};

// ✅ FIX: Tier configuration with proper pricing
const TIER_CONFIG = {
  starter: {
    name: "Starter",
    image: nftStarter,
    alt: "Starter NFT - Free tier access",
    color: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/30",
    price: "$0",
    period: "7‑day trial",
    requiresPayment: false,
    features: ["Paper trading", "1K demo funds", "Basic strategies"],
  },
  pro: {
    name: "Pro",
    image: nftPro,
    alt: "Pro NFT - Professional trading tier",
    color: "from-blue-600/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
    price: "$19",
    period: "/month",
    requiresPayment: true,
    features: ["Live crypto", "Live stocks", "AI strategies", "Priority support"],
  },
  elite: {
    name: "Elite",
    image: nftElite,
    alt: "Elite NFT - Advanced trading tier",
    color: "from-purple-600/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
    price: "$49",
    period: "/month",
    requiresPayment: true,
    features: ["Everything in Pro", "DEX sniper", "Futures", "NFT benefits"],
  },
  enterprise: {
    name: "Enterprise",
    image: null,
    alt: "Enterprise - Custom solutions",
    color: "from-indigo-600/20 to-purple-500/10",
    borderColor: "border-indigo-500/30",
    price: "Custom",
    period: "",
    requiresPayment: false,
    features: ["Custom solutions", "Team management", "Dedicated support"],
  },
};

// ✅ FIX: Trading types with proper tier requirements
const TRADING_TYPES = [
  {
    id: "crypto",
    categoryId: "spot",
    label: "Crypto",
    icon: <FaBitcoin />,
    exchange: "okx",
    connectionKey: "okx",
    connectionLabel: "OKX API",
    minTier: "starter",
    paperOnlyStarter: true,
    connectRoute: "/connect-okx",
  },
  {
    id: "futures",
    categoryId: "futures",
    label: "Futures",
    icon: <FaChartLine />,
    exchange: "okx",
    connectionKey: "okx",
    connectionLabel: "OKX Futures API",
    minTier: "elite",
    connectRoute: "/connect-okx",
  },
  {
    id: "dex",
    categoryId: "dex",
    label: "DEX",
    icon: <FaWater />,
    exchange: "wallet",
    connectionKey: "wallet",
    connectionLabel: "Wallet / DEX Bot",
    minTier: "elite",
    connectRoute: "/connect-wallet",
  },
  {
    id: "stocks",
    categoryId: "stocks",
    label: "Stocks",
    icon: <FaApple />,
    exchange: "alpaca",
    connectionKey: "alpaca",
    connectionLabel: "Alpaca API",
    minTier: "pro",
    connectRoute: "/connect-alpaca",
  },
];

const FALLBACK_STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slow, steady trades focused on consistency.",
    maxPositions: 3,
    tradePct: 0.1,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between safety and opportunity.",
    recommended: true,
    maxPositions: 5,
    tradePct: 0.12,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Looks for stronger market movement.",
    maxPositions: 6,
    tradePct: 0.14,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "High Risk",
    description: "Fast, high-volatility opportunities.",
    maxPositions: 8,
    tradePct: 0.15,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
];

const ASSET_NAMES = {
  USD: "Cash",
  USDT: "Tether",
  FIL: "Filecoin",
  XRP: "XRP",
  ICP: "Internet Computer",
  ETC: "Ethereum Classic",
  NEAR: "NEAR Protocol",
  INJ: "Injective",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  MATIC: "Polygon",
  POL: "Polygon",
  AAPL: "Apple",
  TSLA: "Tesla",
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
};

const num = (value) => {
  const parsed = Number(String(value ?? 0).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const unwrapData = (res) => res?.data || res || {};
const normalizeTier = (tier) => String(tier || "starter").toLowerCase();
const normalizeMode = (mode) =>
  String(mode || "paper").toLowerCase() === "live" ? "live" : "paper";
const formatMoney = (value) => `$${num(value).toFixed(2)}`;
const formatPercent = (value) => `${num(value).toFixed(1)}%`;

// ✅ FIX: Safer tier access with proper validation
const hasTierAccess = (userTier, minTier) =>
  (TIER_RANK[normalizeTier(userTier)] ?? 0) >=
  (TIER_RANK[normalizeTier(minTier)] ?? 999);

// ✅ FIX: Get tier from localStorage or user
const getStoredTier = () => {
  const stored = localStorage.getItem("IMALI_SELECTED_TIER");
  if (stored && TIER_RANK[normalizeTier(stored)] !== undefined) {
    return normalizeTier(stored);
  }
  return null;
};

const fetchWithRetry = async (
  fn,
  retries = API_RETRY_COUNT,
  delay = API_RETRY_DELAY_MS
) => {
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new Error("Max retries exceeded");
};

const getAssetIcon = (symbol) => {
  const s = String(symbol || "").toUpperCase();
  if (s === "USD") return "💵";
  if (s === "USDT") return "₮";
  if (s === "BTC") return "₿";
  if (s === "ETH" || s === "ETC") return "◆";
  if (s === "FIL") return "ƒ";
  if (s === "XRP") return "✕";
  if (s === "ICP") return "∞";
  if (s === "DOGE") return "Ð";
  return s.slice(0, 2);
};

const getStockIcon = (symbol) => {
  const s = String(symbol || "").toUpperCase();
  if (s === "AAPL") return "🍎";
  if (s === "TSLA") return "⚡";
  if (s === "NVDA") return "💚";
  if (s === "MSFT") return "🪟";
  if (s === "BTC") return "₿";
  if (s === "ETH") return "◆";
  if (s === "SOL") return "◎";
  return s.slice(0, 2);
};

const initialState = {
  loading: true,
  refreshing: false,
  processing: false,
  userTier: getStoredTier() || "starter",
  activeType: "crypto",
  strategies: FALLBACK_STRATEGIES,
  currentStrategy: FALLBACK_STRATEGIES[1],
  botRunning: false,
  botMode: "paper",
  connections: {
    okx: { connected: false, mode: "paper", keyMasked: "" },
    alpaca: { connected: false, mode: "paper", keyMasked: "" },
    wallet: { connected: false, mode: "live", keyMasked: "" },
  },
  totalAssetValue: 0,
  usdCashValue: 0,
  usdtValue: 0,
  usdtQty: 0,
  assets: [],
  positions: [],
  openPositionsCount: 0,
  lastUpdated: null,
  error: "",
  notice: "",
  tradeFeed: [],
  stats: {
    realizedPnl: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
  },
  imali: {
    balance: 0,
    discountPct: 0,
    discountActive: false,
  },
  debug: {
    lastStartAttempt: null,
    lastStartResult: null,
    lastStartError: null,
  },
};

const ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_REFRESHING: "SET_REFRESHING",
  SET_PROCESSING: "SET_PROCESSING",
  SET_USER_TIER: "SET_USER_TIER",
  SET_ACTIVE_TYPE: "SET_ACTIVE_TYPE",
  SET_STRATEGIES: "SET_STRATEGIES",
  SET_CURRENT_STRATEGY: "SET_CURRENT_STRATEGY",
  SET_BOT_RUNNING: "SET_BOT_RUNNING",
  SET_BOT_MODE: "SET_BOT_MODE",
  SET_CONNECTIONS: "SET_CONNECTIONS",
  SET_BALANCE_DATA: "SET_BALANCE_DATA",
  SET_POSITIONS: "SET_POSITIONS",
  SET_OPEN_POSITIONS_COUNT: "SET_OPEN_POSITIONS_COUNT",
  SET_LAST_UPDATED: "SET_LAST_UPDATED",
  SET_ERROR: "SET_ERROR",
  SET_NOTICE: "SET_NOTICE",
  SET_TRADE_FEED: "SET_TRADE_FEED",
  SET_STATS: "SET_STATS",
  SET_IMALI: "SET_IMALI",
  SET_DEBUG: "SET_DEBUG",
  UPDATE_STRATEGY_PREF: "UPDATE_STRATEGY_PREF",
  RESET_STATE: "RESET_STATE",
};

function dashboardReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_REFRESHING:
      return { ...state, refreshing: action.payload };
    case ACTIONS.SET_PROCESSING:
      return { ...state, processing: action.payload };
    case ACTIONS.SET_USER_TIER:
      const newTier = normalizeTier(action.payload);
      localStorage.setItem("IMALI_SELECTED_TIER", newTier);
      return { ...state, userTier: newTier };
    case ACTIONS.SET_ACTIVE_TYPE:
      return { ...state, activeType: action.payload };
    case ACTIONS.SET_STRATEGIES:
      return { ...state, strategies: action.payload };
    case ACTIONS.SET_CURRENT_STRATEGY:
      return { ...state, currentStrategy: action.payload };
    case ACTIONS.SET_BOT_RUNNING:
      return { ...state, botRunning: Boolean(action.payload) };
    case ACTIONS.SET_BOT_MODE:
      return { ...state, botMode: normalizeMode(action.payload) };
    case ACTIONS.SET_CONNECTIONS:
      return {
        ...state,
        connections: { ...state.connections, ...action.payload },
      };
    case ACTIONS.SET_BALANCE_DATA:
      return {
        ...state,
        totalAssetValue: action.payload.totalAssetValue ?? state.totalAssetValue,
        usdCashValue: action.payload.usdCashValue ?? state.usdCashValue,
        usdtValue: action.payload.usdtValue ?? state.usdtValue,
        usdtQty: action.payload.usdtQty ?? state.usdtQty,
        assets: action.payload.assets ?? state.assets,
      };
    case ACTIONS.SET_POSITIONS:
      return { ...state, positions: action.payload };
    case ACTIONS.SET_OPEN_POSITIONS_COUNT:
      return { ...state, openPositionsCount: num(action.payload) };
    case ACTIONS.SET_LAST_UPDATED:
      return { ...state, lastUpdated: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    case ACTIONS.SET_NOTICE:
      return { ...state, notice: action.payload };
    case ACTIONS.SET_TRADE_FEED:
      return { ...state, tradeFeed: action.payload };
    case ACTIONS.SET_STATS:
      return { ...state, stats: { ...state.stats, ...action.payload } };
    case ACTIONS.SET_IMALI:
      return { ...state, imali: { ...state.imali, ...action.payload } };
    case ACTIONS.SET_DEBUG:
      return { ...state, debug: { ...state.debug, ...action.payload } };
    case ACTIONS.UPDATE_STRATEGY_PREF:
      localStorage.setItem("imali_selected_strategy", action.payload.id);
      return { ...state, currentStrategy: action.payload };
    case ACTIONS.RESET_STATE:
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-8">
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-8 max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-black mb-2">Dashboard Error</h2>
            <p className="text-white/60 mb-4">
              Something went wrong loading your dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-cyan-500 px-6 py-3 font-black hover:bg-cyan-400 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function TierUpgradeCard({ currentTier, onUpgrade }) {
  const nextTiers = [
    {
      id: "pro",
      config: TIER_CONFIG.pro,
      price: "$19/mo",
      description: "Live crypto & stock trading, AI strategies",
    },
    {
      id: "elite",
      config: TIER_CONFIG.elite,
      price: "$49/mo",
      description: "Futures, DEX sniper, staking, lending",
    },
  ];

  if (currentTier === "elite" || currentTier === "enterprise") return null;

  const nextTier =
    nextTiers.find((tier) =>
      currentTier === "starter" ? tier.id === "pro" : tier.id === "elite"
    ) || nextTiers[0];

  return (
    <section
      className={`rounded-[2rem] border ${nextTier.config.borderColor} bg-gradient-to-br ${nextTier.config.color} p-5`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <img
          src={nextTier.config.image}
          alt={nextTier.config.alt}
          className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-2 ring-white/20"
          loading="lazy"
        />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <h3 className="text-2xl font-black">
              {nextTier.config.name} Plan
            </h3>
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
              {nextTier.price}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/70">
            {nextTier.description}
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-black text-white transition hover:from-amber-600 hover:to-orange-600"
        >
          <FaCrown className="inline mr-2" />
          Upgrade to {nextTier.config.name}
        </button>
      </div>
    </section>
  );
}

function DebugPanel({ state, onTestStartBot }) {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-yellow-500/80 backdrop-blur px-3 py-2 text-xs font-black text-black hover:bg-yellow-400 transition"
      >
        <FaBug className="inline mr-1" /> Debug
      </button>

      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-96 rounded-2xl border border-yellow-500/30 bg-black/95 backdrop-blur-lg p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-yellow-400">Debug Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <p>Bot Running: {state.botRunning ? "✅ Yes" : "❌ No"}</p>
            <p>Bot Mode: {state.botMode}</p>
            <p>Open Positions: {state.openPositionsCount}</p>
            <p>Active Tab: {state.activeType}</p>
            <p>User Tier: {state.userTier}</p>
            <p>Current Strategy: {state.currentStrategy?.name}</p>
            <p>
              Last Start Attempt:{" "}
              {state.debug.lastStartAttempt
                ? new Date(state.debug.lastStartAttempt).toLocaleTimeString()
                : "Never"}
            </p>

            {state.debug.lastStartResult && (
              <details className="mt-2">
                <summary className="cursor-pointer text-cyan-400">
                  Last Start Result
                </summary>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/50 p-2 text-[10px]">
                  {JSON.stringify(state.debug.lastStartResult, null, 2)}
                </pre>
              </details>
            )}

            {state.debug.lastStartError && (
              <div className="mt-2 rounded bg-red-500/20 p-2 text-red-300">
                Error: {state.debug.lastStartError}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={onTestStartBot}
              className="flex-1 rounded-lg bg-yellow-500/20 px-3 py-2 text-xs font-bold text-yellow-400 hover:bg-yellow-500/30"
            >
              Test Start Bot
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const mountedRef = useRef(false);
  const intervalRef = useRef(null);
  const criticalIntervalRef = useRef(null);
  const backgroundPromisesRef = useRef([]);

  const lastFetchTimeRef = useRef({
    user: 0,
    strategies: 0,
    integrations: 0,
  });

  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const previousActiveType = usePrevious(state.activeType);

  // ✅ FIX: Load tier from localStorage on mount
  useEffect(() => {
    const storedTier = getStoredTier();
    if (storedTier && storedTier !== state.userTier) {
      dispatch({ type: ACTIONS.SET_USER_TIER, payload: storedTier });
    }
  }, []);

  // ✅ FIX: Sync tier from user and localStorage
  useEffect(() => {
    if (user?.tier) {
      const userTier = normalizeTier(user.tier);
      const storedTier = getStoredTier();
      
      // If user tier is different from stored, use user tier
      if (userTier !== storedTier && userTier !== state.userTier) {
        dispatch({ type: ACTIONS.SET_USER_TIER, payload: userTier });
      }
    }
  }, [user?.tier]);

  const currentTierConfig =
    TIER_CONFIG[normalizeTier(state.userTier)] || TIER_CONFIG.starter;

  const activeTab = useMemo(
    () =>
      TRADING_TYPES.find((item) => item.id === state.activeType) ||
      TRADING_TYPES[0],
    [state.activeType]
  );

  const activeConnection = useMemo(
    () => state.connections[activeTab.connectionKey],
    [state.connections, activeTab.connectionKey]
  );

  const isLocked = useMemo(
    () => !hasTierAccess(state.userTier, activeTab.minTier),
    [state.userTier, activeTab.minTier]
  );

  const isConnected = useMemo(
    () => Boolean(activeConnection?.connected),
    [activeConnection]
  );

  const needsReconnect = useMemo(
    () => !isConnected && !isLocked,
    [isConnected, isLocked]
  );

  const starterPaperOnly =
    state.userTier === "starter" && activeTab?.paperOnlyStarter;

  const winRate = useMemo(() => {
    const total = num(state.stats.wins) + num(state.stats.losses);
    return total ? (num(state.stats.wins) / total) * 100 : 0;
  }, [state.stats.wins, state.stats.losses]);

  const visibleAssets = useMemo(() => {
    const base = [];

    if (state.usdCashValue > 0) {
      base.push({
        symbol: "USD",
        name: "Cash",
        quantity: state.usdCashValue,
        value: state.usdCashValue,
      });
    }

    if (state.usdtValue > 0) {
      base.push({
        symbol: "USDT",
        name: "Tether",
        quantity: state.usdtQty || state.usdtValue,
        value: state.usdtValue,
      });
    }

    return [...base, ...state.assets]
      .filter((asset) => num(asset.value) >= 0.5)
      .sort((a, b) => num(b.value) - num(a.value));
  }, [state.assets, state.usdCashValue, state.usdtValue, state.usdtQty]);

  const smallBalancesCount = useMemo(
    () =>
      state.assets.filter((asset) => num(asset.value) > 0 && num(asset.value) < 0.5)
        .length,
    [state.assets]
  );

  const donutData = useMemo(
    () => ({
      labels: ["Wins", "Losses"],
      datasets: [
        {
          data: [num(state.stats.wins), num(state.stats.losses)],
          backgroundColor: ["#4ade80", "#f43f5e"],
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    }),
    [state.stats.wins, state.stats.losses]
  );

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    }),
    []
  );

  const normalizeAsset = useCallback((asset) => {
    const symbol = String(
      asset.ccy || asset.currency || asset.symbol || asset.asset || ""
    ).toUpperCase();

    return {
      symbol,
      name: ASSET_NAMES[symbol] || symbol,
      quantity: num(
        asset.available ??
          asset.amount ??
          asset.bal ??
          asset.balance ??
          asset.qty ??
          asset.quantity
      ),
      value: num(
        asset.usdValue ??
          asset.usd_value ??
          asset.value ??
          asset.totalUsd ??
          asset.total_usd ??
          asset.eqUsd
      ),
    };
  }, []);

  const getStrategy = useCallback(
    (id) =>
      state.strategies.find((strategy) => strategy.id === id) ||
      state.strategies[1] ||
      FALLBACK_STRATEGIES[1],
    [state.strategies]
  );

  const showNotice = useCallback((message) => {
    dispatch({ type: ACTIONS.SET_NOTICE, payload: message });
    window.setTimeout(() => {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_NOTICE, payload: "" });
      }
    }, 4000);
  }, []);

  const showError = useCallback((message) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: message });
    window.setTimeout(() => {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: "" });
      }
    }, 6000);
  }, []);

  const fetchUser = useCallback(async () => {
    const res = await fetchWithRetry(() => BotAPI.getMe?.(true));
    const data = unwrapData(res);
    const nextUser = data.user || data;

    if (nextUser?.tier) {
      const tier = normalizeTier(nextUser.tier);
      localStorage.setItem("IMALI_SELECTED_TIER", tier);
      dispatch({ type: ACTIONS.SET_USER_TIER, payload: tier });
    }

    lastFetchTimeRef.current.user = Date.now();
  }, []);

  const fetchStrategies = useCallback(async () => {
    const res = await fetchWithRetry(() => BotAPI.getStrategyConfigs?.(true));
    const data = unwrapData(res);
    const raw = data.data || data.strategies || data;

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

    const mapped = Object.entries(raw).map(([id, cfg]) => ({
      id,
      name:
        cfg.name ||
        (id === "mean_reversion"
          ? "Conservative"
          : id === "ai_weighted"
          ? "Balanced AI"
          : id === "momentum"
          ? "Growth"
          : "Aggressive"),
      icon:
        id === "mean_reversion"
          ? "🛡️"
          : id === "ai_weighted"
          ? "🤖"
          : id === "momentum"
          ? "📈"
          : "🔥",
      risk:
        cfg.riskLevel === "low"
          ? "Low Risk"
          : cfg.riskLevel === "medium"
          ? "Medium Risk"
          : cfg.riskLevel === "higher"
          ? "Higher Risk"
          : "High Risk",
      description: cfg.description || "",
      recommended: Boolean(cfg.recommended),
      maxPositions: cfg.maxPositions,
      tradePct: cfg.tradePct,
      takeProfitPct: cfg.takeProfitPct,
      stopLossPct: cfg.stopLossPct,
    }));

    if (!mapped.length) return;

    dispatch({ type: ACTIONS.SET_STRATEGIES, payload: mapped });

    const savedStrategyId = localStorage.getItem("imali_selected_strategy");
    let selectedStrategy = null;

    try {
      const prefRes = await BotAPI.getUserStrategyPreference?.();
      const prefData = unwrapData(prefRes);
      const backendStrategyId = prefData.strategyId || prefData.strategy;

      if (backendStrategyId) {
        selectedStrategy = mapped.find((strategy) => strategy.id === backendStrategyId);
      }
    } catch (err) {
      console.warn("Could not fetch user strategy preference", err);
    }

    if (!selectedStrategy && savedStrategyId) {
      selectedStrategy = mapped.find((strategy) => strategy.id === savedStrategyId);
    }

    if (!selectedStrategy) {
      selectedStrategy = mapped.find((strategy) => strategy.recommended) || mapped[1] || mapped[0];
    }

    dispatch({ type: ACTIONS.SET_CURRENT_STRATEGY, payload: selectedStrategy });
    lastFetchTimeRef.current.strategies = Date.now();
  }, []);

  const fetchBotStatus = useCallback(async () => {
    const res = await fetchWithRetry(() => BotAPI.getTradingBotStatus?.(true));
    const responseData = res?.data || res || {};

    const bots = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
      ? responseData
      : responseData?.isRunning !== undefined ||
        responseData?.status !== undefined ||
        responseData?.active !== undefined
      ? [responseData]
      : [];

    const runningBots = bots.filter(
      (bot) =>
        bot?.isRunning === true ||
        bot?.status === "running" ||
        bot?.active === true
    );

    const isRunning = runningBots.length > 0;
    const runningBot = runningBots[0] || bots[0];

    dispatch({ type: ACTIONS.SET_BOT_RUNNING, payload: isRunning });

    if (runningBot?.mode) {
      dispatch({ type: ACTIONS.SET_BOT_MODE, payload: runningBot.mode });
    }

    if (runningBot?.strategy) {
      const strategy = getStrategy(runningBot.strategy);
      if (strategy) {
        dispatch({ type: ACTIONS.SET_CURRENT_STRATEGY, payload: strategy });
      }
    }

    const botPositions = num(
      runningBot?.openPositions ?? runningBot?.open_positions ?? 0
    );

    dispatch({
      type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
      payload: botPositions,
    });

    if (responseData.summary) {
      const open = num(
        responseData.summary.open_positions ?? responseData.summary.openPositions ?? 0
      );

      dispatch({
        type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
        payload: open,
      });
    }
  }, [getStrategy]);

  const fetchIntegrationStatus = useCallback(async () => {
    const res = await fetchWithRetry(() => BotAPI.getIntegrationStatus?.(true));
    const data = unwrapData(res);

    const toBool = (value) =>
      value === true || value === "true" || value === 1 || value === "1";

    const okxConnected = toBool(
      data.okx_connected ??
        data.okxConnected ??
        data.okx?.connected ??
        Boolean(data.okx_api_key_masked || data.okx_key_masked || data.okxKeyMasked)
    );

    const alpacaConnected = toBool(
      data.alpaca_connected ??
        data.alpacaConnected ??
        data.alpaca?.connected ??
        Boolean(
          data.alpaca_api_key_masked ||
            data.alpaca_key_masked ||
            data.alpacaKeyMasked
        )
    );

    const walletConnected = toBool(
      data.wallet_connected ?? data.walletConnected ?? data.wallet?.connected
    );

    const okxMode = normalizeMode(
      data.okx_mode ?? data.okxMode ?? data.okx?.mode ?? "paper"
    );

    const alpacaMode = normalizeMode(
      data.alpaca_mode ?? data.alpacaMode ?? data.alpaca?.mode ?? "paper"
    );

    dispatch({
      type: ACTIONS.SET_CONNECTIONS,
      payload: {
        okx: {
          connected: okxConnected,
          mode: okxMode,
          keyMasked:
            data.okx_api_key_masked ??
            data.okx_key_masked ??
            data.okxKeyMasked ??
            data.okx?.keyMasked ??
            "",
        },
        alpaca: {
          connected: alpacaConnected,
          mode: alpacaMode,
          keyMasked:
            data.alpaca_api_key_masked ??
            data.alpaca_key_masked ??
            data.alpacaKeyMasked ??
            data.alpaca?.keyMasked ??
            "",
        },
        wallet: {
          connected: walletConnected,
          mode: "live",
          keyMasked:
            data.wallet_address_masked ??
            data.walletAddressMasked ??
            data.wallet?.address_masked ??
            "",
        },
      },
    });

    if (activeTab.connectionKey === "okx") {
      dispatch({ type: ACTIONS.SET_BOT_MODE, payload: okxMode });
    }

    if (activeTab.connectionKey === "alpaca") {
      dispatch({ type: ACTIONS.SET_BOT_MODE, payload: alpacaMode });
    }

    lastFetchTimeRef.current.integrations = Date.now();
  }, [activeTab.connectionKey]);

  const fetchBalance = useCallback(async () => {
    const res = await fetchWithRetry(() => BotAPI.getExchangeBalance?.(true));
    const data = unwrapData(res);

    if (activeTab.exchange === "okx") {
      const rawAssets = Array.isArray(data.okx_assets) ? data.okx_assets : [];
      const normalized = rawAssets.map(normalizeAsset).filter((asset) => asset.symbol);

      const usdtAsset = normalized.find((asset) => asset.symbol === "USDT");
      const usdAsset = normalized.find((asset) => asset.symbol === "USD");
      const otherAssets = normalized.filter(
        (asset) => !["USD", "USDT"].includes(asset.symbol)
      );

      const okxTotal = num(data.okx_total ?? data.okx ?? data.total);
      const usdtAvailable = num(data.okx_available_usdt ?? usdtAsset?.value);
      const usdtQuantity = num(usdtAsset?.quantity ?? usdtAvailable);
      const otherAssetsTotal = otherAssets.reduce(
        (sum, asset) => sum + num(asset.value),
        0
      );

      const inferredUsd =
        okxTotal > otherAssetsTotal + usdtAvailable
          ? okxTotal - otherAssetsTotal - usdtAvailable
          : 0;

      const usdCash = num(usdAsset?.value) || inferredUsd;
      const total = okxTotal || usdCash + usdtAvailable + otherAssetsTotal;

      dispatch({
        type: ACTIONS.SET_BALANCE_DATA,
        payload: {
          totalAssetValue: total,
          usdCashValue: usdCash,
          usdtValue: usdtAvailable,
          usdtQty: usdtQuantity,
          assets: otherAssets,
        },
      });

      return;
    }

    if (activeTab.exchange === "alpaca") {
      const rawAssets = Array.isArray(data.alpaca_assets)
        ? data.alpaca_assets
        : [];

      const normalized = rawAssets.map(normalizeAsset).filter((asset) => asset.symbol);
      const cash = num(data.alpaca_available_usd ?? data.alpaca_cash ?? data.cash);
      const stocksValue = normalized.reduce((sum, asset) => sum + num(asset.value), 0);
      const total =
        num(data.alpaca_total ?? data.alpaca_equity ?? data.alpaca) ||
        cash + stocksValue;

      dispatch({
        type: ACTIONS.SET_BALANCE_DATA,
        payload: {
          totalAssetValue: total,
          usdCashValue: cash,
          usdtValue: 0,
          usdtQty: 0,
          assets: normalized,
        },
      });

      return;
    }

    dispatch({
      type: ACTIONS.SET_BALANCE_DATA,
      payload: {
        totalAssetValue: 0,
        usdCashValue: 0,
        usdtValue: 0,
        usdtQty: 0,
        assets: [],
      },
    });
  }, [activeTab.exchange, normalizeAsset]);

  const fetchPositions = useCallback(async () => {
    const res = await fetchWithRetry(() =>
      BotAPI.getOpenPositions?.(activeTab.exchange, true)
    );

    const data = unwrapData(res);
    const list = data.positions || data.openPositions || data.data || [];

    dispatch({ type: ACTIONS.SET_POSITIONS, payload: list });
    dispatch({ type: ACTIONS.SET_OPEN_POSITIONS_COUNT, payload: list.length });
  }, [activeTab.exchange]);

  const fetchStats = useCallback(async () => {
    const res = await fetchWithRetry(() =>
      BotAPI.getLiveTradingStats?.(activeTab.exchange, true)
    );

    const data = unwrapData(res);
    const stats = data.summary || data;

    dispatch({
      type: ACTIONS.SET_STATS,
      payload: {
        realizedPnl: num(stats.realized_pnl ?? stats.realizedPnl ?? stats.total_pnl),
        totalPnl: num(stats.total_pnl ?? stats.totalPnl ?? stats.realized_pnl),
        wins: num(stats.wins),
        losses: num(stats.losses),
        totalTrades: num(stats.total_trades ?? stats.totalTrades),
      },
    });

    const open = num(stats.open_positions ?? stats.openPositions ?? 0);

    dispatch({
      type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
      payload: open,
    });
  }, [activeTab.exchange]);

  const fetchTradeFeed = useCallback(async () => {
    try {
      const res = await fetchWithRetry(() =>
        BotAPI.getLiveTradeHistory?.(20, activeTab.exchange, true)
      );

      const data = unwrapData(res);
      const trades = data.trades || data.data || [];

      const formattedTrades = trades.slice(0, 20).map((trade) => {
        let tradeType = "Trade";

        if (trade.exit_reason === "take_profit") tradeType = "Take Profit";
        else if (trade.exit_reason === "stop_loss") tradeType = "Stop Loss";
        else if (num(trade.pnl_usd) > 0) tradeType = "Take Profit";
        else if (num(trade.pnl_usd) < 0) tradeType = "Stop Loss";

        const displaySymbol = String(trade.symbol || "Unknown")
          .replace("-USDT", "")
          .replace("/USDT", "");

        return {
          id: trade.id || `${trade.symbol}-${trade.created_at}-${Math.random()}`,
          symbol: displaySymbol,
          fullSymbol: trade.symbol,
          side: trade.side,
          pnl: num(trade.pnl_usd),
          pnlPercent: num(trade.pnl_percent),
          quantity: num(trade.qty),
          price: num(trade.price),
          exitPrice: num(trade.exit_price),
          time: trade.closed_at
            ? new Date(trade.closed_at).toLocaleTimeString()
            : trade.created_at
            ? new Date(trade.created_at).toLocaleTimeString()
            : new Date().toLocaleTimeString(),
          type: tradeType,
          status: trade.status,
          mode: trade.mode || activeTab.exchange === "alpaca" ? "live" : "paper",
          simulated: trade.simulated !== false,
        };
      });

      dispatch({ type: ACTIONS.SET_TRADE_FEED, payload: formattedTrades });
    } catch (err) {
      console.warn("Failed to fetch live trades:", err);
    }
  }, [activeTab.exchange]);

  const fetchImali = useCallback(async () => {
    const [balanceRes, discountRes] = await Promise.allSettled([
      fetchWithRetry(() => BotAPI.getImaliBalance?.()),
      fetchWithRetry(() => BotAPI.getImaliDiscountStatus?.()),
    ]);

    const balance = unwrapData(
      balanceRes.status === "fulfilled" ? balanceRes.value : {}
    );

    const discount = unwrapData(
      discountRes.status === "fulfilled" ? discountRes.value : {}
    );

    dispatch({
      type: ACTIONS.SET_IMALI,
      payload: {
        balance: num(balance.balance ?? balance.imali_balance),
        discountPct: num(discount.discountPct ?? discount.discount_pct),
        discountActive: Boolean(discount.active ?? discount.discountActive),
      },
    });
  }, []);

  const saveStrategyPreference = useCallback(async (strategyId) => {
    localStorage.setItem("imali_selected_strategy", strategyId);

    try {
      await BotAPI.updateUserStrategyPreference?.({ strategyId });
    } catch (err) {
      console.warn("Could not save strategy preference to backend", err);
    }
  }, []);

  const fetchFunctionsRef = useRef({});

  useEffect(() => {
    fetchFunctionsRef.current = {
      fetchUser,
      fetchStrategies,
      fetchBotStatus,
      fetchIntegrationStatus,
      fetchBalance,
      fetchPositions,
      fetchStats,
      fetchTradeFeed,
      fetchImali,
    };
  }, [
    fetchUser,
    fetchStrategies,
    fetchBotStatus,
    fetchIntegrationStatus,
    fetchBalance,
    fetchPositions,
    fetchStats,
    fetchTradeFeed,
    fetchImali,
  ]);

  const refreshDashboard = useCallback(
    async (manual = false) => {
      const startTime = performance.now();

      if (manual) {
        dispatch({ type: ACTIONS.SET_REFRESHING, payload: true });
      }

      const fns = fetchFunctionsRef.current;
      const now = Date.now();

      const shouldRefreshUser =
        manual || now - lastFetchTimeRef.current.user > STALE_TIME_MS;

      const shouldRefreshStrategies =
        manual || now - lastFetchTimeRef.current.strategies > STALE_TIME_MS;

      const shouldRefreshIntegrations =
        manual || now - lastFetchTimeRef.current.integrations > STALE_TIME_MS;

      const criticalApis = [
        fns.fetchBotStatus,
        fns.fetchBalance,
        fns.fetchTradeFeed,
      ].filter(Boolean);

      const backgroundApis = [];

      if (shouldRefreshUser && fns.fetchUser) backgroundApis.push(fns.fetchUser);
      if (shouldRefreshStrategies && fns.fetchStrategies) {
        backgroundApis.push(fns.fetchStrategies);
      }
      if (shouldRefreshIntegrations && fns.fetchIntegrationStatus) {
        backgroundApis.push(fns.fetchIntegrationStatus);
      }

      [fns.fetchStats, fns.fetchImali, fns.fetchPositions]
        .filter(Boolean)
        .forEach((fn) => backgroundApis.push(fn));

      try {
        await Promise.allSettled(
          criticalApis.map((fn) =>
            fn().catch((err) => {
              console.warn(`Critical API failed: ${fn.name}`, err);
              return null;
            })
          )
        );

        if (backgroundApis.length > 0) {
          const backgroundPromise = Promise.allSettled(
            backgroundApis.map((fn) =>
              fn().catch((err) => {
                console.warn(`Background API failed: ${fn.name}`, err);
                return null;
              })
            )
          ).finally(() => {
            backgroundPromisesRef.current =
              backgroundPromisesRef.current.filter((p) => p !== backgroundPromise);
          });

          backgroundPromisesRef.current.push(backgroundPromise);
        }

        if (mountedRef.current) {
          dispatch({ type: ACTIONS.SET_LAST_UPDATED, payload: new Date() });
          dispatch({ type: ACTIONS.SET_ERROR, payload: "" });
        }
      } catch (err) {
        console.error("Dashboard refresh error:", err);

        if (mountedRef.current) {
          dispatch({
            type: ACTIONS.SET_ERROR,
            payload: err?.message || "Dashboard refresh failed.",
          });
        }
      } finally {
        if (mountedRef.current && manual) {
          dispatch({ type: ACTIONS.SET_REFRESHING, payload: false });
        }

        if (mountedRef.current) {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }

        const duration = performance.now() - startTime;

        if (duration > 2000) {
          console.warn(`Dashboard refresh slow: ${duration.toFixed(0)}ms`);
        }
      }
    },
    []
  );

  const handleSelectStrategy = useCallback(
    async (strategy) => {
      dispatch({ type: ACTIONS.SET_CURRENT_STRATEGY, payload: strategy });
      await saveStrategyPreference(strategy.id);
    },
    [saveStrategyPreference]
  );

  const handleConnect = useCallback(() => {
    if (isLocked) {
      navigate("/pricing", { 
        state: { tier: state.userTier, from: "dashboard" } 
      });
      return;
    }

    navigate(activeTab.connectRoute);
  }, [isLocked, navigate, activeTab.connectRoute, state.userTier]);

  const testStartBot = useCallback(async () => {
    dispatch({
      type: ACTIONS.SET_DEBUG,
      payload: {
        lastStartAttempt: Date.now(),
        lastStartResult: null,
        lastStartError: null,
      },
    });

    try {
      const launchMode = starterPaperOnly ? "paper" : state.botMode;

      const testConfig = {
        takeProfitPct: state.currentStrategy.takeProfitPct,
        stopLossPct: state.currentStrategy.stopLossPct,
        maxPositions: state.currentStrategy.maxPositions,
      };

      const result = BotAPI.startTradingBotByCategory
        ? await BotAPI.startTradingBotByCategory(
            activeTab.categoryId,
            state.currentStrategy.id,
            launchMode,
            testConfig
          )
        : await BotAPI.startTradingBot(
            activeTab.exchange,
            state.currentStrategy.id,
            launchMode,
            activeTab.categoryId,
            testConfig
          );

      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { lastStartResult: result, lastStartError: null },
      });

      showNotice("Test bot start completed.");
      await refreshDashboard(true);
    } catch (err) {
      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { lastStartError: err.message },
      });

      showError(`Test failed: ${err.message}`);
    }
  }, [
    activeTab,
    state.currentStrategy,
    state.botMode,
    starterPaperOnly,
    refreshDashboard,
    showNotice,
    showError,
  ]);

  const handleStartBot = useCallback(async () => {
    dispatch({
      type: ACTIONS.SET_DEBUG,
      payload: {
        lastStartAttempt: Date.now(),
        lastStartResult: null,
        lastStartError: null,
      },
    });

    if (isLocked) {
      showError("Please upgrade your plan to access this trading type.");
      navigate("/pricing", { 
        state: { tier: state.userTier, from: "dashboard" } 
      });
      return;
    }

    if (!isConnected) {
      showError(`Please connect your ${activeTab.connectionLabel} first.`);
      navigate(activeTab.connectRoute);
      return;
    }

    const launchMode = starterPaperOnly ? "paper" : state.botMode;

    if (starterPaperOnly && state.botMode !== "paper") {
      dispatch({ type: ACTIONS.SET_BOT_MODE, payload: "paper" });
    }

    dispatch({ type: ACTIONS.SET_PROCESSING, payload: true });

    try {
      await saveStrategyPreference(state.currentStrategy.id);

      const config = {
        takeProfitPct: state.currentStrategy.takeProfitPct,
        stopLossPct: state.currentStrategy.stopLossPct,
        maxPositions: state.currentStrategy.maxPositions,
        tradePct: state.currentStrategy.tradePct,
      };

      let res = null;

      if (BotAPI.startTradingBotByCategory) {
        res = await BotAPI.startTradingBotByCategory(
          activeTab.categoryId,
          state.currentStrategy.id,
          launchMode,
          config
        );
      }

      if ((!res || res?.success === false) && BotAPI.startTradingBot) {
        res = await BotAPI.startTradingBot(
          activeTab.exchange,
          state.currentStrategy.id,
          launchMode,
          activeTab.categoryId,
          config
        );
      }

      if (!res) {
        throw new Error("No API method available to start bot.");
      }

      if (res?.success === false) {
        throw new Error(res?.error || res?.message || "Failed to start bot.");
      }

      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { lastStartResult: res, lastStartError: null },
      });

      showNotice(
        starterPaperOnly
          ? "Paper trading bot started."
          : "Bot started successfully."
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshDashboard(true);
    } catch (err) {
      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { lastStartError: err.message },
      });

      showError(`Failed to start bot: ${err?.message || "Unknown error"}`);
    } finally {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_PROCESSING, payload: false });
      }
    }
  }, [
    isLocked,
    isConnected,
    navigate,
    activeTab,
    state.currentStrategy,
    state.botMode,
    state.userTier,
    starterPaperOnly,
    saveStrategyPreference,
    refreshDashboard,
    showNotice,
    showError,
  ]);

  const handleStopBot = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_PROCESSING, payload: true });

    try {
      let res = null;

      if (BotAPI.stopTradingBotByCategory) {
        res = await BotAPI.stopTradingBotByCategory(activeTab.categoryId);
      }

      if ((!res || res?.success === false) && BotAPI.stopTradingBot) {
        res = await BotAPI.stopTradingBot(activeTab.exchange);
      }

      if (res?.success === false) {
        throw new Error(res?.error || "Failed to stop bot.");
      }

      showNotice("Bot stopped.");
      await refreshDashboard(true);
    } catch (err) {
      showError(err?.message || "Failed to stop bot.");
    } finally {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_PROCESSING, payload: false });
      }
    }
  }, [activeTab, refreshDashboard, showNotice, showError]);

  const handleApplyImaliDiscount = useCallback(async () => {
    try {
      const res = await BotAPI.applyImaliDiscount?.();

      if (res?.success === false) {
        throw new Error(res?.error || "Unable to apply IMALI discount.");
      }

      await refreshDashboard(true);
      showNotice("IMALI discount applied.");
    } catch (err) {
      showError(err?.message || "Unable to apply IMALI discount.");
    }
  }, [refreshDashboard, showNotice, showError]);

  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: ACTIONS.SET_ERROR, payload: "" });
      refreshDashboard(true);
    };

    const handleOffline = () => {
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: "No internet connection. Reconnect to refresh data.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    mountedRef.current = true;
    refreshDashboard(false);

    intervalRef.current = window.setInterval(() => {
      if (mountedRef.current) refreshDashboard(false);
    }, POLL_MS);

    return () => {
      mountedRef.current = false;

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      backgroundPromisesRef.current.forEach((promise) => {
        promise?.catch?.(() => {});
      });

      backgroundPromisesRef.current = [];
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (!state.botRunning) {
      if (criticalIntervalRef.current) {
        window.clearInterval(criticalIntervalRef.current);
        criticalIntervalRef.current = null;
      }

      return undefined;
    }

    criticalIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;

      const fns = fetchFunctionsRef.current;

      Promise.allSettled([
        fns.fetchBotStatus?.().catch(() => null),
        fns.fetchBalance?.().catch(() => null),
        fns.fetchTradeFeed?.().catch(() => null),
      ]);
    }, CRITICAL_POLL_MS);

    return () => {
      if (criticalIntervalRef.current) {
        window.clearInterval(criticalIntervalRef.current);
        criticalIntervalRef.current = null;
      }
    };
  }, [state.botRunning]);

  useEffect(() => {
    if (previousActiveType === undefined) return;
    if (state.activeType === previousActiveType) return;

    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        refreshDashboard(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [state.activeType, previousActiveType, refreshDashboard]);

  if (state.loading && !state.lastUpdated) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FaSpinner className="animate-spin text-5xl text-cyan-300 mx-auto" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-[#050816] text-white pb-10 overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

        <header className="relative border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-cyan-400/10 grid place-items-center text-3xl">
                🚀
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black leading-none">IMALI</h1>
                <p className="text-xs tracking-[0.24em] text-white/50 font-black mt-1 truncate">
                  AI TRADING PLATFORM
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              aria-label="Logout"
              className="shrink-0 rounded-2xl bg-red-500 px-4 py-3 font-black hover:bg-red-400 transition"
            >
              <FaSignOutAlt className="inline mr-2" />
              Logout
            </button>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-4 py-6 space-y-5">
          {state.error && (
            <div
              className="rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-red-200"
              role="alert"
              aria-live="polite"
            >
              {state.error}
            </div>
          )}

          {state.notice && (
            <div
              className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200"
              role="status"
              aria-live="polite"
            >
              {state.notice}
            </div>
          )}

          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {currentTierConfig.image && (
                <img
                  src={currentTierConfig.image}
                  alt={currentTierConfig.alt}
                  className="h-16 w-16 rounded-xl object-cover shadow-lg ring-2 ring-cyan-400/30"
                  loading="lazy"
                />
              )}

              <div className="flex-1">
                <p className="text-white/50">Welcome back,</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black">IMALI Trader</h2>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-black ${currentTierConfig.borderColor} bg-opacity-15`}
                  >
                    {normalizeTier(state.userTier).toUpperCase()} PLAN
                  </span>

                  {state.refreshing && (
                    <span className="text-xs text-cyan-300">
                      <FaSpinner className="inline animate-spin mr-1" />
                      Updating
                    </span>
                  )}
                </div>

                <p className="text-sm text-white/50 truncate">
                  {user?.email || "Member"}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill running={state.botRunning} />
                  <ModePill mode={state.botMode} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] overflow-hidden">
            <div className="grid grid-cols-4">
              {TRADING_TYPES.map((tab) => {
                const locked = !hasTierAccess(state.userTier, tab.minTier);
                const active = state.activeType === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      dispatch({
                        type: ACTIONS.SET_ACTIVE_TYPE,
                        payload: tab.id,
                      })
                    }
                    aria-label={`Switch to ${tab.label} trading`}
                    aria-current={active ? "page" : undefined}
                    className={`relative min-w-0 px-1 py-4 text-center font-black transition ${
                      active
                        ? "bg-cyan-400/10 text-white"
                        : "text-white/50 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className={`text-xl ${active ? "text-cyan-300" : ""}`}>
                        {tab.icon}
                      </span>
                      <span className="text-[11px] sm:text-base leading-none">
                        {tab.label}
                      </span>
                      {locked && (
                        <FaLock className="text-[10px] text-white/40" />
                      )}
                    </div>

                    {active && (
                      <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-cyan-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <ConnectionCard
            activeTab={activeTab}
            connection={activeConnection}
            isLocked={isLocked}
            needsReconnect={needsReconnect}
            userTier={state.userTier}
            onConnect={handleConnect}
            onUpgrade={() => navigate("/pricing", { 
              state: { tier: state.userTier, from: "dashboard" } 
            })}
            lastUpdated={state.lastUpdated}
          />

          {starterPaperOnly && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm">
              Starter accounts support paper trading only. Upgrade to Pro for live trading.
            </div>
          )}

          <TierUpgradeCard
            currentTier={normalizeTier(state.userTier)}
            onUpgrade={() => navigate("/pricing", { 
              state: { tier: state.userTier, from: "dashboard" } 
            })}
          />

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <div>
                <h3 className="text-xl font-black">Account Overview</h3>
                <p className="mt-6 text-sm text-white/50">Total Assets Value</p>
                <p className="mt-2 text-5xl font-black">
                  {formatMoney(state.totalAssetValue)}
                </p>
                <p
                  className={`mt-3 font-black ${
                    state.stats.totalPnl >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {state.stats.totalPnl >= 0 ? "+" : ""}
                  {formatMoney(state.stats.totalPnl)} realized
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniBox label="Open Positions" value={state.openPositionsCount} />
                  <MiniBox label="USD Cash" value={formatMoney(state.usdCashValue)} />
                  <MiniBox label="USDT" value={formatMoney(state.usdtValue)} />
                </div>
              </div>

              <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[140px_1fr] items-center gap-4">
                <div className="relative h-[130px] sm:h-[140px]">
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-xl sm:text-2xl font-black">
                        {formatPercent(winRate)}
                      </p>
                      <p className="text-xs text-white/60">Win Rate</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <LegendRow label="Wins" value={state.stats.wins} color="bg-emerald-400" />
                  <LegendRow label="Losses" value={state.stats.losses} color="bg-red-400" />
                  <LegendRow label="Trades" value={state.stats.totalTrades} color="bg-white/40" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black">Assets</h3>
              <button
                onClick={() => refreshDashboard(true)}
                disabled={state.refreshing}
                className="text-cyan-300 font-black disabled:opacity-50 transition"
              >
                {state.refreshing ? (
                  <FaSpinner className="animate-spin inline mr-2" />
                ) : (
                  <FaSyncAlt className="inline mr-2" />
                )}
                Refresh
              </button>
            </div>

            {visibleAssets.length === 0 ? (
              <Empty
                text={
                  isConnected
                    ? "No assets detected yet"
                    : "Connect account to load assets"
                }
              />
            ) : (
              <div className="space-y-4">
                {visibleAssets.map((asset) => (
                  <AssetRow
                    key={`${asset.symbol}-${asset.value}`}
                    asset={asset}
                    total={state.totalAssetValue}
                  />
                ))}

                {smallBalancesCount > 0 && (
                  <div className="mt-4 rounded-2xl bg-black/25 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-black">Small balances</p>
                      <p className="text-sm text-white/40">
                        {smallBalancesCount} assets under $0.50
                      </p>
                    </div>
                    <FaArrowRight className="text-white/40" />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <FaChartLine className="text-emerald-300" />
                <h3 className="text-xl font-black">Live Trade Feed</h3>
              </div>

              {state.botRunning && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Bot Running • {(state.botMode || "paper").toUpperCase()} MODE
                </div>
              )}
            </div>

            {state.tradeFeed.length === 0 ? (
              <div className="py-16 text-center text-white/30">
                <div className="text-6xl mb-4">🤖</div>
                <p>Start the bot to see trades appear here.</p>
                <p className="text-xs text-white/40 mt-2">
                  Bot status: {state.botRunning ? "Running" : "Stopped"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {state.tradeFeed.map((trade) => (
                  <div
                    key={trade.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="text-3xl">{getStockIcon(trade.symbol)}</div>
                      <div className="min-w-0">
                        <div className="font-bold">{trade.symbol}</div>
                        <div className="text-xs text-white/40">
                          {trade.type} • {trade.time}
                          {trade.mode === "live" && (
                            <span className="ml-1 text-emerald-400">● LIVE</span>
                          )}
                        </div>
                        {trade.price > 0 && (
                          <div className="text-xs text-white/30 mt-1">
                            @ {formatMoney(trade.price)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`font-bold text-lg ${
                        trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {trade.pnl >= 0 ? "+" : ""}
                      {formatMoney(trade.pnl)}
                      {trade.pnlPercent !== 0 && (
                        <span className="text-xs ml-1">
                          ({trade.pnl >= 0 ? "+" : ""}
                          {trade.pnlPercent.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Panel title="Active Bot" icon={<FaRobot />}>
              <div className="flex items-start gap-4">
                <div className="text-4xl shrink-0">
                  {state.currentStrategy.icon}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-2xl font-black">
                      {state.currentStrategy.name}
                    </h4>
                    <span className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-black text-red-300">
                      {state.currentStrategy.risk}
                    </span>
                  </div>

                  <p className="text-white/50">
                    {state.currentStrategy.description}
                  </p>
                </div>
              </div>

              <div className="my-5 h-px bg-white/10" />

              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <BotInfo label="Market" value={activeTab.label} />
                <BotInfo label="Mode" value={state.botMode.toUpperCase()} />
                <BotInfo
                  label="Positions"
                  value={`${state.openPositionsCount} / ${
                    state.currentStrategy.maxPositions || 5
                  }`}
                />
              </div>

              <div className="mt-5">
                {!state.botRunning ? (
                  <button
                    onClick={handleStartBot}
                    disabled={state.processing}
                    className={`w-full rounded-2xl py-4 font-black disabled:opacity-50 transition ${
                      isLocked || !isConnected
                        ? "bg-cyan-500 text-black hover:bg-cyan-400"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
                  >
                    {state.processing ? (
                      <FaSpinner className="animate-spin inline mr-2" />
                    ) : isLocked ? (
                      <FaLock className="inline mr-2" />
                    ) : !isConnected ? (
                      <FaPlug className="inline mr-2" />
                    ) : (
                      <FaPlay className="inline mr-2" />
                    )}
                    {isLocked
                      ? "Upgrade to Unlock"
                      : !isConnected
                      ? "Connect to Start"
                      : starterPaperOnly
                      ? "Start Paper Bot"
                      : "Start Bot"}
                  </button>
                ) : (
                  <button
                    onClick={handleStopBot}
                    disabled={state.processing}
                    className="w-full rounded-2xl bg-red-500 py-4 font-black hover:bg-red-400 disabled:opacity-50 transition"
                  >
                    {state.processing ? (
                      <FaSpinner className="animate-spin inline mr-2" />
                    ) : (
                      <FaStop className="inline mr-2" />
                    )}
                    Stop Bot
                  </button>
                )}
              </div>
            </Panel>

            <Panel title="Performance" icon={<FaChartLine />}>
              <div className="grid grid-cols-2 gap-3">
                <SmallStat title="Realized PnL" value={formatMoney(state.stats.realizedPnl)} pnl />
                <SmallStat title="Total PnL" value={formatMoney(state.stats.totalPnl)} pnl />
                <SmallStat title="Total Trades" value={Number(state.stats.totalTrades || 0).toLocaleString()} />
                <SmallStat title="Win Rate" value={formatPercent(winRate)} />
              </div>
            </Panel>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <h3 className="mb-5 text-xl sm:text-2xl font-black">
              Available Bot Strategies
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {state.strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  selected={state.currentStrategy.id === strategy.id}
                  onClick={() => handleSelectStrategy(strategy)}
                  disabled={state.botRunning}
                />
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ImaliCard
              imali={state.imali}
              onBuy={() => navigate("/buy-imali")}
              onApply={handleApplyImaliDiscount}
            />

            <section className="rounded-[2rem] border border-purple-500/30 bg-purple-500/10 p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-black text-2xl">Unlock More Power</h3>
                <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                  Upgrade to Elite for Futures, DEX sniper bots, advanced AI
                  strategies, and priority support.
                </p>
              </div>

              <button
                onClick={() => navigate("/pricing", { 
                  state: { tier: state.userTier, from: "dashboard" } 
                })}
                className="rounded-2xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400 transition"
              >
                <FaCrown className="inline mr-2" />
                Upgrade Now
              </button>
            </section>
          </section>
        </main>

        <DebugPanel state={state} onTestStartBot={testStartBot} />
      </div>
    </DashboardErrorBoundary>
  );
}

// ... (all subcomponents remain the same)
