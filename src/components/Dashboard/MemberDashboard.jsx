// src/components/Dashboard/MemberDashboard.jsx
// LIVE-ONLY, MOBILE-FIRST MEMBER DASHBOARD

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Toaster } from "react-hot-toast";
import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import {
  FaApple,
  FaArrowRight,
  FaBitcoin,
  FaChartLine,
  FaCheckCircle,
  FaCircle,
  FaCoins,
  FaCog,
  FaCreditCard,
  FaCrown,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaKey,
  FaLock,
  FaPlay,
  FaPlug,
  FaRedo,
  FaRobot,
  FaShieldAlt,
  FaSignOutAlt,
  FaSpinner,
  FaStop,
  FaSyncAlt,
  FaUsers,
  FaWallet,
  FaWater,
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import AIThinkingPanel from "./AIThinkingPanel";
import CandlestickChart from "../charts/CandlestickChart";

import nftStarter from "../../assets/images/nfts/nft-starter.png";
import nftPro from "../../assets/images/nfts/nft-pro.png";
import nftElite from "../../assets/images/nfts/nft-elite.png";

ChartJS.register(ArcElement, Tooltip);

const POLL_INTERVALS = {
  BOT_STATUS: 5000,
  BALANCES: 15000,
  TRADES: 10000,
  CANDLES: 30000,
};

const API_RETRY_COUNT = 2;
const API_RETRY_DELAY_MS = 1000;

const TIER_RANK = {
  starter: 0,
  pro: 1,
  elite: 2,
  enterprise: 3,
};

const TIER_CONFIG = {
  starter: {
    name: "Starter",
    image: nftStarter,
    alt: "Starter membership",
  },
  pro: {
    name: "Pro",
    image: nftPro,
    alt: "Pro membership",
  },
  elite: {
    name: "Elite",
    image: nftElite,
    alt: "Elite membership",
  },
  enterprise: {
    name: "Enterprise",
    image: null,
    alt: "Enterprise membership",
  },
};

const TRADING_TYPES = [
  {
    id: "crypto",
    categoryId: "spot",
    label: "Crypto",
    icon: <FaBitcoin />,
    exchange: "okx",
    connectionKey: "okx",
    connectionLabel: "OKX API",
    minTier: "pro",
    connectRoute: "/connect-okx",
    upgradeMessage: "Unlock Crypto Trading",
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
    upgradeMessage: "Unlock Stock Trading",
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
    upgradeMessage: "Unlock Futures Trading",
  },
  {
    id: "dex",
    categoryId: "dex",
    label: "DEX",
    icon: <FaWater />,
    exchange: "wallet",
    connectionKey: "wallet",
    connectionLabel: "Wallet / DEX",
    minTier: "elite",
    connectRoute: "/connect-wallet",
    upgradeMessage: "Unlock DEX Trading",
  },
];

const FALLBACK_STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Lower Risk",
    description: "Uses stricter entry rules and fewer positions.",
    maxPositions: 3,
    tradePct: 0.1,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Moderate Risk",
    description: "Balances technical signals, confidence, and risk.",
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
    description: "Looks for stronger market momentum and trend continuation.",
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
    description: "Uses broader entry criteria and higher trade frequency.",
    maxPositions: 8,
    tradePct: 0.15,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
];

const SETTINGS_TABS = [
  { id: "billing", icon: <FaCreditCard />, label: "Billing", route: "/billing" },
  { id: "trading", icon: <FaPlug />, label: "Trading", route: "/connect-okx" },
  { id: "wallets", icon: <FaWallet />, label: "Wallets", route: "/connect-wallet" },
  { id: "activation", icon: <FaExchangeAlt />, label: "Activation", route: "/activation" },
  { id: "security", icon: <FaShieldAlt />, label: "Security", route: "/settings/security" },
  { id: "api", icon: <FaKey />, label: "API Keys", route: "/settings/api" },
  { id: "automation", icon: <FaRobot />, label: "Automation", route: "/settings/automation" },
];

const ASSET_NAMES = {
  USD: "Cash",
  USDT: "Tether",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  LINK: "Chainlink",
  AVAX: "Avalanche",
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
const formatMoney = (value) => `$${num(value).toFixed(2)}`;
const formatPercent = (value) => `${num(value).toFixed(1)}%`;

const hasTierAccess = (userTier, minTier) =>
  (TIER_RANK[normalizeTier(userTier)] ?? 0) >=
  (TIER_RANK[normalizeTier(minTier)] ?? 999);

const fetchWithRetry = async (
  fn,
  retries = API_RETRY_COUNT,
  delay = API_RETRY_DELAY_MS
) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) =>
        window.setTimeout(resolve, delay * (attempt + 1))
      );
    }
  }

  throw new Error("Request failed.");
};

const getAssetIcon = (symbol) => {
  const value = String(symbol || "").toUpperCase();

  if (value === "USD") return "💵";
  if (value === "USDT") return "₮";
  if (value === "BTC") return "₿";
  if (value === "ETH") return "◆";
  if (value === "SOL") return "◎";
  if (value === "DOGE") return "Ð";

  return value.slice(0, 2);
};

// ==============================
// Mobile‑first GlassCard
// ==============================
const GlassCard = ({
  children,
  className = "",
  contentClassName = "p-4 sm:p-5 md:p-6",
  gradient = "from-white/5 to-white/5",
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} shadow-xl backdrop-blur-xl ${className}`}
  >
    <div className="absolute inset-0 bg-white/[0.03]" />
    <div className={`relative z-10 ${contentClassName}`}>{children}</div>
  </div>
);

// ==============================
// Sub‑components (mobile‑optimized)
// ==============================
const MiniBox = memo(({ label, value }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center sm:p-3">
    <p className="text-[10px] text-white/40 sm:text-xs">{label}</p>
    <p className="mt-1 break-words text-xs font-black text-white sm:text-sm md:text-base">
      {value}
    </p>
  </div>
));

const StatusPill = memo(({ running }) => (
  <div
    className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-widest sm:px-4 sm:py-2 sm:text-xs ${
      running
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
        : "border-white/10 bg-white/10 text-white/50"
    }`}
  >
    <FaCircle
      className={`mr-1.5 inline h-1.5 w-1.5 sm:mr-2 sm:h-2 sm:w-2 ${
        running ? "text-emerald-300" : "text-white/40"
      }`}
    />
    {running ? "BOT RUNNING" : "BOT OFF"}
  </div>
));

const LivePill = memo(() => (
  <div className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-[10px] font-black tracking-widest text-red-300 sm:px-4 sm:py-2 sm:text-xs">
    🔴 LIVE TRADING
  </div>
));

const AssetRow = memo(({ asset, total }) => {
  const percentage = total > 0 ? (num(asset.value) / total) * 100 : 0;

  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-2 rounded-xl p-2 transition hover:bg-white/5 sm:grid-cols-[48px_1fr_auto_auto] sm:gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-cyan-400/20 font-black text-cyan-200 sm:h-12 sm:w-12">
        {getAssetIcon(asset.symbol)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-black text-white sm:text-sm md:text-base">
          {asset.symbol}
        </p>
        <p className="truncate text-[10px] text-white/45 sm:text-xs md:text-sm">
          {asset.name}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xs font-black text-white sm:text-sm md:text-base">
          {formatMoney(asset.value)}
        </p>
        <p className="text-[10px] text-white/40 sm:text-xs">
          {num(asset.quantity).toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}
        </p>
      </div>

      <p className="hidden text-right text-xs text-white/35 sm:block">
        {formatPercent(percentage)}
      </p>
    </div>
  );
});

const StrategyCard = memo(({ strategy, selected, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-h-[44px] w-full rounded-2xl border p-3 text-left transition sm:p-4 ${
      selected
        ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/10"
        : "border-white/10 bg-white/5 hover:bg-white/10"
    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
  >
    <div className="flex items-start gap-2 sm:gap-3">
      <span className="text-2xl sm:text-3xl">{strategy.icon}</span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <p className="text-sm font-black text-white sm:text-base">
            {strategy.name}
          </p>
          <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black text-cyan-200 sm:px-3 sm:py-1 sm:text-[10px]">
            {strategy.risk}
          </span>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-white/50 sm:mt-2">
          {strategy.description}
        </p>

        <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-white/50 sm:mt-3 sm:gap-2 sm:text-[10px]">
          <span>Max: {strategy.maxPositions || "-"} positions</span>
          <span>Trade: {formatPercent(num(strategy.tradePct) * 100)}</span>
          <span>TP: {formatPercent(num(strategy.takeProfitPct) * 100)}</span>
          <span>SL: {formatPercent(num(strategy.stopLossPct) * 100)}</span>
        </div>
      </div>
    </div>
  </button>
));

const ConnectionCard = memo(
  ({
    activeTab,
    connection,
    isLocked,
    needsReconnect,
    onConnect,
    onUpgrade,
    lastUpdated,
  }) => (
    <GlassCard
      className={
        isLocked
          ? "border-purple-500/30"
          : needsReconnect
          ? "border-amber-400/30"
          : "border-emerald-400/30"
      }
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12 ${
              isLocked
                ? "bg-purple-500/20 text-purple-300"
                : needsReconnect
                ? "bg-amber-400/20 text-amber-300"
                : "bg-emerald-400/20 text-emerald-300"
            }`}
          >
            {isLocked ? (
              <FaLock className="text-sm sm:text-base" />
            ) : needsReconnect ? (
              <FaExclamationTriangle className="text-sm sm:text-base" />
            ) : (
              <FaCheckCircle className="text-sm sm:text-base" />
            )}
          </div>

          <div>
            <h3 className="text-base font-black text-white sm:text-lg">
              {activeTab.connectionLabel}
            </h3>

            <p className="text-xs text-white/60 sm:text-sm">
              {isLocked
                ? `${activeTab.label} requires ${activeTab.minTier.toUpperCase()} or higher.`
                : needsReconnect
                ? "Connect this account before live trading can begin."
                : `Connected${connection?.keyMasked ? ` (${connection.keyMasked})` : ""}.`}
            </p>

            <p className="mt-0.5 text-[10px] text-white/35 sm:mt-1 sm:text-xs">
              Last checked:{" "}
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "Not checked"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={isLocked ? onUpgrade : onConnect}
          className={`min-h-[44px] rounded-2xl px-4 py-2.5 text-xs font-black transition sm:px-5 sm:py-3 sm:text-sm ${
            isLocked
              ? "bg-purple-600 text-white hover:bg-purple-500"
              : needsReconnect
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          {isLocked ? (
            <>
              <FaCrown className="mr-1.5 inline sm:mr-2" />
              {activeTab.upgradeMessage}
            </>
          ) : needsReconnect ? (
            <>
              <FaRedo className="mr-1.5 inline sm:mr-2" />
              Connect
            </>
          ) : (
            <>
              <FaPlug className="mr-1.5 inline sm:mr-2" />
              Manage
            </>
          )}
        </button>
      </div>
    </GlassCard>
  )
);

const TradeItem = memo(({ trade }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 sm:flex-row sm:items-center sm:p-4"
  >
    <div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <p className="text-sm font-bold text-white sm:text-base">{trade.symbol}</p>
        <span className="rounded-full border border-red-500/30 bg-red-500/20 px-1.5 py-0.5 text-[8px] font-black text-red-300 sm:px-2 sm:text-[9px]">
          ● LIVE
        </span>
      </div>

      <p className="text-[10px] text-white/40 sm:text-xs">
        {trade.type} • {trade.time}
      </p>

      {trade.price > 0 && (
        <p className="text-[10px] text-white/30 sm:text-xs">@ {formatMoney(trade.price)}</p>
      )}
    </div>

    <p
      className={`font-bold ${
        trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {trade.pnl >= 0 ? "+" : ""}
      {formatMoney(trade.pnl)}
      {trade.pnlPercent !== 0 && (
        <span className="ml-1 text-[10px] sm:text-xs">
          ({trade.pnl >= 0 ? "+" : ""}
          {trade.pnlPercent.toFixed(2)}%)
        </span>
      )}
    </p>
  </motion.div>
));

// ==============================
// Reducer & Initial State
// ==============================
const initialState = {
  loading: true,
  refreshing: false,
  processing: false,
  userTier: "starter",
  subscriptionStatus: "",
  activeType: "crypto",
  strategies: FALLBACK_STRATEGIES,
  currentStrategy: FALLBACK_STRATEGIES[1],
  botRunning: false,
  connections: {
    okx: { connected: false, keyMasked: "" },
    alpaca: { connected: false, keyMasked: "" },
    wallet: { connected: false, keyMasked: "" },
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
  candles: [],
  candlesLoading: false,
  candlesSource: "none",
  referral: {
    totalReferrals: 0,
    signups: 0,
    paidReferrals: 0,
    freeMonths: 0,
  },
};

const ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_REFRESHING: "SET_REFRESHING",
  SET_PROCESSING: "SET_PROCESSING",
  SET_USER_TIER: "SET_USER_TIER",
  SET_SUBSCRIPTION_STATUS: "SET_SUBSCRIPTION_STATUS",
  SET_ACTIVE_TYPE: "SET_ACTIVE_TYPE",
  SET_STRATEGIES: "SET_STRATEGIES",
  SET_CURRENT_STRATEGY: "SET_CURRENT_STRATEGY",
  SET_BOT_RUNNING: "SET_BOT_RUNNING",
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
  SET_CANDLES: "SET_CANDLES",
  SET_CANDLES_LOADING: "SET_CANDLES_LOADING",
  SET_CANDLES_SOURCE: "SET_CANDLES_SOURCE",
  SET_REFERRAL: "SET_REFERRAL",
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
      return { ...state, userTier: normalizeTier(action.payload) };
    case ACTIONS.SET_SUBSCRIPTION_STATUS:
      return {
        ...state,
        subscriptionStatus: String(action.payload || "").toLowerCase(),
      };
    case ACTIONS.SET_ACTIVE_TYPE:
      return { ...state, activeType: action.payload };
    case ACTIONS.SET_STRATEGIES:
      return { ...state, strategies: action.payload };
    case ACTIONS.SET_CURRENT_STRATEGY:
      return { ...state, currentStrategy: action.payload };
    case ACTIONS.SET_BOT_RUNNING:
      return { ...state, botRunning: Boolean(action.payload) };
    case ACTIONS.SET_CONNECTIONS:
      return {
        ...state,
        connections: { ...state.connections, ...action.payload },
      };
    case ACTIONS.SET_BALANCE_DATA:
      return { ...state, ...action.payload };
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
    case ACTIONS.SET_CANDLES:
      return { ...state, candles: action.payload };
    case ACTIONS.SET_CANDLES_LOADING:
      return { ...state, candlesLoading: action.payload };
    case ACTIONS.SET_CANDLES_SOURCE:
      return { ...state, candlesSource: action.payload };
    case ACTIONS.SET_REFERRAL:
      return { ...state, referral: { ...state.referral, ...action.payload } };
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

// ==============================
// Main Component
// ==============================
export default function MemberDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, logout } = useAuth();

  const mountedRef = useRef(false);
  const refreshLockRef = useRef(false);
  const intervalsRef = useRef({});
  const [isVisible, setIsVisible] = useState(true);
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const previousActiveType = usePrevious(state.activeType);

  // Subscription status: prefer fresh state from API, fallback to context
  const normalizedSubscriptionStatus = String(
    state.subscriptionStatus ||
      user?.subscription_status ||
      activation?.subscription_status ||
      ""
  ).toLowerCase();

  const hasPaidAccess = ["active", "trialing"].includes(
    normalizedSubscriptionStatus
  );

  // Tier: prefer context over reducer default (but we also update from API)
  const selectedTier = normalizeTier(
    user?.tier ||
      activation?.tier ||
      state.userTier ||
      "starter"
  );

  const effectiveTier = hasPaidAccess ? selectedTier : "starter";

  const currentTierConfig =
    TIER_CONFIG[selectedTier] || TIER_CONFIG.starter;

  const visibleTradingTypes = useMemo(() => {
    if (effectiveTier === "starter") return [];

    if (effectiveTier === "pro") {
      return TRADING_TYPES.filter(
        (item) => item.id === "crypto" || item.id === "stocks"
      );
    }

    return TRADING_TYPES;
  }, [effectiveTier]);

  const activeTab = useMemo(() => {
    return (
      visibleTradingTypes.find((item) => item.id === state.activeType) ||
      visibleTradingTypes[0] ||
      TRADING_TYPES[0]
    );
  }, [state.activeType, visibleTradingTypes]);

  const activeConnection =
    state.connections[activeTab.connectionKey] || {};

  const isLocked = !hasTierAccess(effectiveTier, activeTab.minTier);
  const isConnected = Boolean(activeConnection.connected);
  const needsReconnect = !isLocked && !isConnected;

  const activeSettingsTab = useMemo(() => {
    const path = location.pathname;

    if (path.includes("/billing")) return "billing";
    if (path.includes("/connect-okx") || path.includes("/connect-alpaca"))
      return "trading";
    if (path.includes("/connect-wallet")) return "wallets";
    if (path.includes("/activation")) return "activation";
    if (path.includes("/settings/security")) return "security";
    if (path.includes("/settings/api")) return "api";
    if (path.includes("/settings/automation")) return "automation";

    return "";
  }, [location.pathname]);

  const winRate = useMemo(() => {
    const total = num(state.stats.wins) + num(state.stats.losses);
    return total > 0 ? (num(state.stats.wins) / total) * 100 : 0;
  }, [state.stats.losses, state.stats.wins]);

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
    [state.stats.losses, state.stats.wins]
  );

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
    }),
    []
  );

  const visibleAssets = useMemo(() => {
    const assets = [];

    if (state.usdCashValue > 0) {
      assets.push({
        symbol: "USD",
        name: "Cash",
        quantity: state.usdCashValue,
        value: state.usdCashValue,
      });
    }

    if (state.usdtValue > 0) {
      assets.push({
        symbol: "USDT",
        name: "Tether",
        quantity: state.usdtQty || state.usdtValue,
        value: state.usdtValue,
      });
    }

    return [...assets, ...state.assets]
      .filter((asset) => num(asset.value) >= 0.5)
      .sort((a, b) => num(b.value) - num(a.value));
  }, [state.assets, state.usdCashValue, state.usdtQty, state.usdtValue]);

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
    try {
      const response = await fetchWithRetry(() => BotAPI.getMe?.(true));
      const data = unwrapData(response);
      const nextUser = data.user || data;

      dispatch({
        type: ACTIONS.SET_USER_TIER,
        payload:
          nextUser?.tier ||
          user?.tier ||
          activation?.tier ||
          "starter",
      });

      dispatch({
        type: ACTIONS.SET_SUBSCRIPTION_STATUS,
        payload:
          nextUser?.subscription_status ||
          nextUser?.subscriptionStatus ||
          user?.subscription_status ||
          activation?.subscription_status ||
          "",
      });
    } catch (error) {
      console.warn("Could not load user:", error);
    }
  }, [user?.tier, user?.subscription_status, activation?.tier, activation?.subscription_status]);

  const fetchStrategies = useCallback(async () => {
    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getStrategyConfigs?.(true)
      );

      const data = unwrapData(response);
      const raw = data.data || data.strategies || data;

      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

      const mapped = Object.entries(raw).map(([id, config]) => ({
        id,
        name:
          config.name ||
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
          config.risk ||
          (id === "mean_reversion"
            ? "Lower Risk"
            : id === "ai_weighted"
            ? "Moderate Risk"
            : id === "momentum"
            ? "Higher Risk"
            : "High Risk"),
        description: config.description || "",
        recommended: Boolean(config.recommended),
        maxPositions: config.maxPositions,
        tradePct: config.tradePct,
        takeProfitPct: config.takeProfitPct,
        stopLossPct: config.stopLossPct,
      }));

      if (!mapped.length) return;

      dispatch({ type: ACTIONS.SET_STRATEGIES, payload: mapped });

      const savedId = localStorage.getItem("imali_selected_strategy");
      const selected =
        mapped.find((strategy) => strategy.id === savedId) ||
        mapped.find((strategy) => strategy.recommended) ||
        mapped[0];

      dispatch({ type: ACTIONS.SET_CURRENT_STRATEGY, payload: selected });
    } catch (error) {
      console.warn("Could not load strategies:", error);
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getTradingBotStatus?.(true)
      );

      const data = unwrapData(response);

      const bots = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [data];

      const runningBot = bots.find(
        (bot) =>
          bot?.isRunning === true ||
          bot?.status === "running" ||
          bot?.active === true
      );

      dispatch({
        type: ACTIONS.SET_BOT_RUNNING,
        payload: Boolean(runningBot),
      });

      if (runningBot?.strategy) {
        const selected = state.strategies.find(
          (strategy) => strategy.id === runningBot.strategy
        );

        if (selected) {
          dispatch({
            type: ACTIONS.SET_CURRENT_STRATEGY,
            payload: selected,
          });
        }
      }

      dispatch({
        type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
        payload:
          runningBot?.openPositions ??
          runningBot?.open_positions ??
          data?.summary?.open_positions ??
          0,
      });
    } catch (error) {
      console.warn("Could not load bot status:", error);
    }
  }, [state.strategies]);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getIntegrationStatus?.(true)
      );

      const data = unwrapData(response);

      const toBool = (value) =>
        value === true || value === "true" || value === 1 || value === "1";

      dispatch({
        type: ACTIONS.SET_CONNECTIONS,
        payload: {
          okx: {
            connected: toBool(
              data.okx_connected ??
                data.okxConnected ??
                data.okx?.connected ??
                Boolean(data.okx_api_key_masked || data.okx_key_masked)
            ),
            keyMasked:
              data.okx_api_key_masked ??
              data.okx_key_masked ??
              data.okx?.keyMasked ??
              "",
          },
          alpaca: {
            connected: toBool(
              data.alpaca_connected ??
                data.alpacaConnected ??
                data.alpaca?.connected ??
                Boolean(
                  data.alpaca_api_key_masked || data.alpaca_key_masked
                )
            ),
            keyMasked:
              data.alpaca_api_key_masked ??
              data.alpaca_key_masked ??
              data.alpaca?.keyMasked ??
              "",
          },
          wallet: {
            connected: toBool(
              data.wallet_connected ??
                data.walletConnected ??
                data.wallet?.connected
            ),
            keyMasked:
              data.wallet_address_masked ??
              data.walletAddressMasked ??
              data.wallet?.address_masked ??
              "",
          },
        },
      });
    } catch (error) {
      console.warn("Could not load integration status:", error);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!hasPaidAccess || !isConnected) {
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
      return;
    }

    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getExchangeBalance?.(true)
      );

      const data = unwrapData(response);

      if (activeTab.exchange === "okx") {
        const normalized = (data.okx_assets || [])
          .map(normalizeAsset)
          .filter((asset) => asset.symbol);

        const usdt = normalized.find((asset) => asset.symbol === "USDT");
        const usd = normalized.find((asset) => asset.symbol === "USD");
        const otherAssets = normalized.filter(
          (asset) => !["USD", "USDT"].includes(asset.symbol)
        );

        const total = num(data.okx_total ?? data.okx ?? data.total);
        const usdtValue = num(
          data.okx_available_usdt ?? usdt?.value ?? usdt?.quantity
        );
        const otherTotal = otherAssets.reduce(
          (sum, asset) => sum + num(asset.value),
          0
        );
        const usdValue =
          num(usd?.value) ||
          Math.max(total - usdtValue - otherTotal, 0);

        dispatch({
          type: ACTIONS.SET_BALANCE_DATA,
          payload: {
            totalAssetValue: total || usdValue + usdtValue + otherTotal,
            usdCashValue: usdValue,
            usdtValue,
            usdtQty: num(usdt?.quantity ?? usdtValue),
            assets: otherAssets,
          },
        });

        return;
      }

      if (activeTab.exchange === "alpaca") {
        const assets = (data.alpaca_assets || [])
          .map(normalizeAsset)
          .filter((asset) => asset.symbol);

        const cash = num(
          data.alpaca_available_usd ?? data.alpaca_cash ?? data.cash
        );

        const positionsValue = assets.reduce(
          (sum, asset) => sum + num(asset.value),
          0
        );

        dispatch({
          type: ACTIONS.SET_BALANCE_DATA,
          payload: {
            totalAssetValue:
              num(data.alpaca_total ?? data.alpaca_equity ?? data.alpaca) ||
              cash + positionsValue,
            usdCashValue: cash,
            usdtValue: 0,
            usdtQty: 0,
            assets,
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
    } catch (error) {
      console.warn("Could not load balances:", error);
    }
  }, [
    activeTab.exchange,
    hasPaidAccess,
    isConnected,
    normalizeAsset,
  ]);

  const fetchStats = useCallback(async () => {
    if (!hasPaidAccess || !isConnected) return;

    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getLiveTradingStats?.(activeTab.exchange, true)
      );

      const data = unwrapData(response);
      const stats = data.summary || data;

      dispatch({
        type: ACTIONS.SET_STATS,
        payload: {
          realizedPnl: num(
            stats.realized_pnl ?? stats.realizedPnl ?? stats.total_pnl
          ),
          totalPnl: num(
            stats.total_pnl ?? stats.totalPnl ?? stats.realized_pnl
          ),
          wins: num(stats.wins),
          losses: num(stats.losses),
          totalTrades: num(stats.total_trades ?? stats.totalTrades),
        },
      });
    } catch (error) {
      console.warn("Could not load stats:", error);
    }
  }, [activeTab.exchange, hasPaidAccess, isConnected]);

  const fetchPositions = useCallback(async () => {
    if (!hasPaidAccess || !isConnected) return;

    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getOpenPositions?.(activeTab.exchange, true)
      );

      const data = unwrapData(response);
      const positions =
        data.positions || data.openPositions || data.data || [];

      dispatch({ type: ACTIONS.SET_POSITIONS, payload: positions });
      dispatch({
        type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
        payload: positions.length,
      });
    } catch (error) {
      console.warn("Could not load positions:", error);
    }
  }, [activeTab.exchange, hasPaidAccess, isConnected]);

  const fetchTradeFeed = useCallback(async () => {
    if (!hasPaidAccess || !isConnected) {
      dispatch({ type: ACTIONS.SET_TRADE_FEED, payload: [] });
      return;
    }

    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getLiveTradeHistory?.(20, activeTab.exchange, true)
      );

      const data = unwrapData(response);
      const trades = data.trades || data.data || [];

      const formatted = trades.slice(0, 20).map((trade) => ({
        id:
          trade.id ||
          `${trade.symbol}-${trade.created_at}-${Math.random()}`,
        symbol: String(trade.symbol || "Unknown")
          .replace("-USDT", "")
          .replace("/USDT", ""),
        pnl: num(trade.pnl_usd),
        pnlPercent: num(trade.pnl_percent),
        price: num(trade.price),
        time: trade.closed_at
          ? new Date(trade.closed_at).toLocaleTimeString()
          : trade.created_at
          ? new Date(trade.created_at).toLocaleTimeString()
          : new Date().toLocaleTimeString(),
        type:
          trade.exit_reason === "take_profit"
            ? "Take Profit"
            : trade.exit_reason === "stop_loss"
            ? "Stop Loss"
            : trade.side || "Trade",
      }));

      dispatch({ type: ACTIONS.SET_TRADE_FEED, payload: formatted });
    } catch (error) {
      console.warn("Could not load trade history:", error);
    }
  }, [activeTab.exchange, hasPaidAccess, isConnected]);

  const fetchCandles = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: true });

    if (!hasPaidAccess || !isConnected) {
      dispatch({ type: ACTIONS.SET_CANDLES, payload: [] });
      dispatch({ type: ACTIONS.SET_CANDLES_SOURCE, payload: "none" });
      dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: false });
      return;
    }

    try {
      const symbol =
        activeTab.exchange === "alpaca" ? "AAPL" : "BTC-USDT";

      const response = await BotAPI.getMarketCandles?.({
        exchange: activeTab.exchange,
        symbol,
        timeframe: "1m",
        limit: 100,
      });

      const data = unwrapData(response);
      const candles = data.candles || data.data || [];

      const formatted = candles
        .map((candle) => ({
          time: Math.floor(
            new Date(
              candle.time ?? candle.timestamp ?? candle.created_at
            ).getTime() / 1000
          ),
          open: num(candle.open),
          high: num(candle.high),
          low: num(candle.low),
          close: num(candle.close),
        }))
        .filter(
          (candle) =>
            candle.time &&
            candle.open &&
            candle.high &&
            candle.low &&
            candle.close
        )
        .sort((a, b) => a.time - b.time);

      dispatch({ type: ACTIONS.SET_CANDLES, payload: formatted });
      dispatch({ type: ACTIONS.SET_CANDLES_SOURCE, payload: "live" });
    } catch (error) {
      console.warn("Could not load live candles:", error);
      dispatch({ type: ACTIONS.SET_CANDLES, payload: [] });
      dispatch({
        type: ACTIONS.SET_CANDLES_SOURCE,
        payload: "unavailable",
      });
    } finally {
      dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: false });
    }
  }, [activeTab.exchange, hasPaidAccess, isConnected]);

  const fetchImali = useCallback(async () => {
    try {
      const [balanceResult, discountResult] = await Promise.allSettled([
        fetchWithRetry(() => BotAPI.getImaliBalance?.()),
        fetchWithRetry(() => BotAPI.getImaliDiscountStatus?.()),
      ]);

      const balance = unwrapData(
        balanceResult.status === "fulfilled" ? balanceResult.value : {}
      );

      const discount = unwrapData(
        discountResult.status === "fulfilled" ? discountResult.value : {}
      );

      dispatch({
        type: ACTIONS.SET_IMALI,
        payload: {
          balance: num(balance.balance ?? balance.imali_balance),
          discountPct: num(
            discount.discountPct ?? discount.discount_pct
          ),
          discountActive: Boolean(
            discount.active ?? discount.discountActive
          ),
        },
      });
    } catch (error) {
      console.warn("Could not load IMALI information:", error);
    }
  }, []);

  const fetchReferral = useCallback(async () => {
    try {
      const response = await fetchWithRetry(() =>
        BotAPI.getReferralStats?.()
      );

      const data = unwrapData(response);

      dispatch({
        type: ACTIONS.SET_REFERRAL,
        payload: {
          totalReferrals: num(data.totalReferrals),
          signups: num(data.signups),
          paidReferrals: num(data.paidReferrals),
          freeMonths: num(data.freeMonths),
        },
      });
    } catch (error) {
      console.warn("Could not load referral stats:", error);
    }
  }, []);

  const saveStrategyPreference = useCallback(async (strategyId) => {
    localStorage.setItem("imali_selected_strategy", strategyId);

    try {
      await BotAPI.updateUserStrategy?.(strategyId);
    } catch (error) {
      console.warn("Could not save strategy preference:", error);
    }
  }, []);

  const refreshDashboard = useCallback(
    async (manual = false) => {
      if (refreshLockRef.current) return;

      refreshLockRef.current = true;

      if (manual) {
        dispatch({ type: ACTIONS.SET_REFRESHING, payload: true });
      }

      try {
        await Promise.allSettled([
          fetchUser(),
          fetchIntegrationStatus(),
          fetchBotStatus(),
          fetchBalance(),
          fetchStats(),
          fetchPositions(),
          fetchTradeFeed(),
          fetchCandles(),
          fetchImali(),
          fetchReferral(),
        ]);

        if (mountedRef.current) {
          dispatch({
            type: ACTIONS.SET_LAST_UPDATED,
            payload: new Date(),
          });
          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        showError(error?.message || "Dashboard refresh failed.");
      } finally {
        refreshLockRef.current = false;

        if (mountedRef.current) {
          dispatch({ type: ACTIONS.SET_REFRESHING, payload: false });
        }
      }
    },
    [
      fetchBalance,
      fetchBotStatus,
      fetchCandles,
      fetchImali,
      fetchIntegrationStatus,
      fetchPositions,
      fetchReferral,
      fetchStats,
      fetchTradeFeed,
      fetchUser,
      showError,
    ]
  );

  const handleStartBot = useCallback(async () => {
    if (!hasPaidAccess) {
      showError("Activate a paid plan before starting live trading.");
      navigate("/billing");
      return;
    }

    if (isLocked) {
      showError("Your current plan does not include this market.");
      navigate("/billing");
      return;
    }

    if (!isConnected) {
      showError(`Connect your ${activeTab.connectionLabel} first.`);
      navigate(activeTab.connectRoute);
      return;
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

      let response = null;

      if (BotAPI.startTradingBotByCategory) {
        response = await BotAPI.startTradingBotByCategory(
          activeTab.categoryId,
          state.currentStrategy.id,
          "live",
          config
        );
      }

      if (
        (!response || response?.success === false) &&
        BotAPI.startTradingBot
      ) {
        response = await BotAPI.startTradingBot(
          activeTab.exchange,
          state.currentStrategy.id,
          "live",
          activeTab.categoryId,
          config
        );
      }

      if (!response) {
        throw new Error("No bot start API method is available.");
      }

      if (response?.success === false) {
        throw new Error(
          response?.error || response?.message || "Bot failed to start."
        );
      }

      showNotice("Live trading bot started.");
      await refreshDashboard(true);
    } catch (error) {
      showError(error?.message || "Unable to start the bot.");
    } finally {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_PROCESSING, payload: false });
      }
    }
  }, [
    activeTab,
    hasPaidAccess,
    isConnected,
    isLocked,
    navigate,
    refreshDashboard,
    saveStrategyPreference,
    showError,
    showNotice,
    state.currentStrategy,
  ]);

  const handleStopBot = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_PROCESSING, payload: true });

    try {
      let response = null;

      if (BotAPI.stopTradingBotByCategory) {
        response = await BotAPI.stopTradingBotByCategory(
          activeTab.categoryId
        );
      }

      if (
        (!response || response?.success === false) &&
        BotAPI.stopTradingBot
      ) {
        response = await BotAPI.stopTradingBot(activeTab.exchange);
      }

      if (response?.success === false) {
        throw new Error(response.error || "Bot failed to stop.");
      }

      showNotice("Bot stopped.");
      await refreshDashboard(true);
    } catch (error) {
      showError(error?.message || "Unable to stop the bot.");
    } finally {
      if (mountedRef.current) {
        dispatch({ type: ACTIONS.SET_PROCESSING, payload: false });
      }
    }
  }, [activeTab, refreshDashboard, showError, showNotice]);

  const handleSelectStrategy = useCallback(
    async (strategy) => {
      if (state.botRunning) {
        showError("Stop the bot before changing strategies.");
        return;
      }

      dispatch({
        type: ACTIONS.SET_CURRENT_STRATEGY,
        payload: strategy,
      });

      await saveStrategyPreference(strategy.id);
      showNotice(`Strategy changed to ${strategy.name}.`);
    },
    [
      saveStrategyPreference,
      showError,
      showNotice,
      state.botRunning,
    ]
  );

  const handleApplyImaliDiscount = useCallback(async () => {
    try {
      const response = await BotAPI.applyImaliDiscount?.();

      if (response?.success === false) {
        throw new Error(
          response?.error || "Unable to apply the discount."
        );
      }

      await fetchImali();
      showNotice("IMALI discount applied.");
    } catch (error) {
      showError(error?.message || "Unable to apply the discount.");
    }
  }, [fetchImali, showError, showNotice]);

  // ==============================
  // Effects - Mount/Unmount
  // ==============================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Object.values(intervalsRef.current).forEach((intervalId) => {
        if (intervalId) {
          window.clearInterval(intervalId);
        }
      });
      intervalsRef.current = {};
    };
  }, []);

  // ==============================
  // Effect - Initial data load
  // ==============================
  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      await Promise.allSettled([
        fetchUser(),
        fetchStrategies(),
        fetchIntegrationStatus(),
        fetchBotStatus(),
        fetchImali(),
        fetchReferral(),
      ]);
      if (!cancelled && mountedRef.current) {
        dispatch({
          type: ACTIONS.SET_LOADING,
          payload: false,
        });
      }
    };
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [
    fetchUser,
    fetchStrategies,
    fetchIntegrationStatus,
    fetchBotStatus,
    fetchImali,
    fetchReferral,
  ]);

  // ==============================
  // Effect - Polling (stale closure free)
  // ==============================
  useEffect(() => {
    // Clear existing intervals
    Object.values(intervalsRef.current).forEach((intervalId) => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    });
    intervalsRef.current = {};

    if (!user || !isVisible) {
      return undefined;
    }

    intervalsRef.current.bot = window.setInterval(() => {
      fetchBotStatus();
    }, POLL_INTERVALS.BOT_STATUS);

    intervalsRef.current.balance = window.setInterval(() => {
      fetchBalance();
    }, POLL_INTERVALS.BALANCES);

    intervalsRef.current.trades = window.setInterval(() => {
      Promise.allSettled([
        fetchTradeFeed(),
        fetchStats(),
        fetchPositions(),
      ]);
    }, POLL_INTERVALS.TRADES);

    intervalsRef.current.candles = window.setInterval(() => {
      fetchCandles();
    }, POLL_INTERVALS.CANDLES);

    return () => {
      Object.values(intervalsRef.current).forEach((intervalId) => {
        if (intervalId) {
          window.clearInterval(intervalId);
        }
      });
      intervalsRef.current = {};
    };
  }, [
    user,
    isVisible,
    fetchBotStatus,
    fetchBalance,
    fetchTradeFeed,
    fetchStats,
    fetchPositions,
    fetchCandles,
  ]);

  // ==============================
  // Effect - Active tab switch refresh
  // ==============================
  useEffect(() => {
    if (
      previousActiveType === undefined ||
      previousActiveType === state.activeType
    ) {
      return;
    }

    Promise.allSettled([
      fetchIntegrationStatus(),
      fetchBalance(),
      fetchStats(),
      fetchPositions(),
      fetchTradeFeed(),
      fetchCandles(),
    ]);
  }, [
    fetchBalance,
    fetchCandles,
    fetchIntegrationStatus,
    fetchPositions,
    fetchStats,
    fetchTradeFeed,
    previousActiveType,
    state.activeType,
  ]);

  // ==============================
  // Effect - Visibility change
  // ==============================
  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);

      if (visible) refreshDashboard(false);
    };

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
  }, [refreshDashboard]);

  // ==============================
  // Effect - Reset active type when tiers change
  // ==============================
  useEffect(() => {
    const activeStillVisible = visibleTradingTypes.some(
      (item) => item.id === state.activeType
    );

    if (
      visibleTradingTypes.length > 0 &&
      !activeStillVisible
    ) {
      dispatch({
        type: ACTIONS.SET_ACTIVE_TYPE,
        payload: visibleTradingTypes[0].id,
      });
    }
  }, [state.activeType, visibleTradingTypes]);

  // ==============================
  // Render
  // ==============================
  if (state.loading && !state.lastUpdated) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
        <div className="text-center">
          <FaSpinner className="mx-auto animate-spin text-5xl text-cyan-300" />
          <p className="mt-4 text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 pb-10 text-white">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%)]" />

      <header className="relative border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-2xl">
              🚀
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-none text-white">
                IMALI
              </h1>
              <p className="mt-1 truncate text-[10px] font-black tracking-[0.2em] text-white/50">
                LIVE TRADING PLATFORM
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/billing")}
              className="min-h-[44px] rounded-2xl bg-emerald-600 px-3 py-2 font-black text-white transition hover:bg-emerald-500 sm:px-4"
            >
              <FaCog className="sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="min-h-[44px] rounded-2xl bg-red-500 px-3 py-2 font-black text-white transition hover:bg-red-400 sm:px-4"
            >
              <FaSignOutAlt className="sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-5 px-4 py-6">
        {state.error && (
          <GlassCard className="border-red-500/40">
            <p className="text-sm text-red-200">{state.error}</p>
          </GlassCard>
        )}

        {state.notice && (
          <GlassCard className="border-emerald-500/40">
            <p className="text-sm text-emerald-200">{state.notice}</p>
          </GlassCard>
        )}

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {currentTierConfig.image && (
            <img
              src={currentTierConfig.image}
              alt={currentTierConfig.alt}
              className="h-14 w-14 rounded-xl object-cover shadow-lg ring-2 ring-cyan-400/30"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/50">Welcome back,</p>

            <h2 className="truncate text-xl font-black text-white sm:text-2xl">
              {user?.displayName ||
                user?.name ||
                user?.firstName ||
                "Trader"}
            </h2>

            <p className="truncate text-sm text-white/50">
              {user?.email || "Member"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill running={state.botRunning} />
              <LivePill />

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-widest sm:px-4 sm:py-2 sm:text-xs ${
                  hasPaidAccess
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/40 bg-amber-400/10 text-amber-300"
                }`}
              >
                {hasPaidAccess
                  ? `${effectiveTier.toUpperCase()} ACTIVE`
                  : "ACTIVATION REQUIRED"}
              </span>
            </div>
          </div>
        </section>

        <GlassCard>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SETTINGS_TABS.slice(0, 4).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.route)}
                className={`min-h-[44px] rounded-xl px-2 py-2.5 text-[10px] font-black transition sm:px-3 sm:py-3 sm:text-xs ${
                  activeSettingsTab === tab.id
                    ? "border border-cyan-400/30 bg-cyan-400/20 text-cyan-300"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <span className="mr-1.5 inline sm:mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {!hasPaidAccess && (
          <GlassCard className="border-amber-500/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="text-3xl">⚠️</span>

              <div className="flex-1">
                <h3 className="text-lg font-black text-amber-300">
                  Activate Live Trading
                </h3>

                <p className="mt-1 text-sm text-white/60">
                  Add a payment method and activate Pro or Elite before
                  connecting an exchange or starting a bot.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/billing")}
                className="min-h-[44px] rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-500"
              >
                Activate Plan
              </button>
            </div>
          </GlassCard>
        )}

        {visibleTradingTypes.length > 0 && (
          <GlassCard contentClassName="p-0">
            <div
              className={`grid ${
                visibleTradingTypes.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-4"
              }`}
            >
              {visibleTradingTypes.map((tab) => {
                const active = state.activeType === tab.id;
                const locked = !hasTierAccess(
                  effectiveTier,
                  tab.minTier
                );

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: ACTIONS.SET_ACTIVE_TYPE,
                        payload: tab.id,
                      })
                    }
                    className={`relative min-h-[56px] px-2 py-3 font-black transition sm:min-h-[64px] ${
                      active
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-white/50 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="block text-base sm:text-lg">{tab.icon}</span>
                    <span className="mt-0.5 block text-[9px] sm:mt-1 sm:text-sm">
                      {tab.label}
                    </span>
                    {locked && (
                      <FaLock className="mx-auto mt-0.5 text-[8px] sm:mt-1 sm:text-[10px]" />
                    )}
                    {active && (
                      <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-cyan-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        )}

        <ConnectionCard
          activeTab={activeTab}
          connection={activeConnection}
          isLocked={isLocked || !hasPaidAccess}
          needsReconnect={needsReconnect}
          onConnect={() => navigate(activeTab.connectRoute)}
          onUpgrade={() => navigate("/billing")}
          lastUpdated={state.lastUpdated}
        />

        <GlassCard>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <h3 className="text-xl font-black text-white">
                Account Overview
              </h3>

              <p className="mt-6 text-sm text-white/50">
                Total Account Value
              </p>

              <p className="mt-2 break-words text-2xl font-black text-white sm:text-3xl md:text-5xl">
                {formatMoney(state.totalAssetValue)}
              </p>

              <p
                className={`mt-3 font-black ${
                  state.stats.totalPnl >= 0
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {state.stats.totalPnl >= 0 ? "+" : ""}
                {formatMoney(state.stats.totalPnl)} realized
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniBox
                  label="Open Positions"
                  value={state.openPositionsCount}
                />
                <MiniBox
                  label="USD Cash"
                  value={formatMoney(state.usdCashValue)}
                />
                <MiniBox
                  label="USDT"
                  value={formatMoney(state.usdtValue)}
                />
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center gap-3 sm:grid-cols-[130px_1fr] sm:gap-4">
              <div className="relative h-[120px] sm:h-[130px]">
                <Doughnut
                  data={donutData}
                  options={donutOptions}
                />

                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-base font-black text-white sm:text-xl">
                      {formatPercent(winRate)}
                    </p>
                    <p className="text-[10px] text-white/50 sm:text-xs">Win Rate</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
                <p className="flex justify-between gap-3">
                  <span className="text-white/50">Wins</span>
                  <strong>{state.stats.wins}</strong>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-white/50">Losses</span>
                  <strong>{state.stats.losses}</strong>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-white/50">Trades</span>
                  <strong>{state.stats.totalTrades}</strong>
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-white">Assets</h3>

            <button
              type="button"
              onClick={() => refreshDashboard(true)}
              disabled={state.refreshing}
              className="min-h-[44px] font-black text-cyan-300 disabled:opacity-50"
            >
              {state.refreshing ? (
                <FaSpinner className="mr-2 inline animate-spin" />
              ) : (
                <FaSyncAlt className="mr-2 inline" />
              )}
              Refresh
            </button>
          </div>

          {visibleAssets.length === 0 ? (
            <div className="rounded-2xl bg-black/25 py-10 text-center text-white/40">
              {isConnected
                ? "No assets detected."
                : "Connect an account to load assets."}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleAssets.map((asset) => (
                <AssetRow
                  key={`${asset.symbol}-${asset.value}`}
                  asset={asset}
                  total={state.totalAssetValue}
                />
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-black text-white">
                Live Market Candles
              </h3>
              <p className="text-xs text-white/40">
                {state.candlesSource === "live"
                  ? "Connected exchange market data"
                  : "Connect and activate an account to load data"}
              </p>
            </div>

            <span className="text-xs text-red-300">
              🔴 LIVE DATA
            </span>
          </div>

          {state.candlesLoading ? (
            <div className="grid h-[200px] place-items-center rounded-2xl bg-black/25 sm:h-[240px]">
              <FaSpinner className="animate-spin text-3xl text-cyan-300" />
            </div>
          ) : state.candles.length > 0 ? (
            <div className="h-[220px] rounded-2xl border border-white/10 bg-black/30 p-1.5 sm:h-[300px] sm:p-2">
              <CandlestickChart
                data={state.candles}
                liveCandle={state.candles[state.candles.length - 1]}
                height={300}
              />
            </div>
          ) : (
            <div className="grid h-[200px] place-items-center rounded-2xl bg-black/25 p-4 text-center text-white/40 sm:h-[240px]">
              No live candle data is available.
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-white">
              Live Trade Feed
            </h3>

            {state.botRunning && (
              <span className="text-sm text-emerald-400">
                ● Bot Running
              </span>
            )}
          </div>

          {state.tradeFeed.length === 0 ? (
            <div className="py-14 text-center text-white/30">
              <div className="mb-3 text-5xl">🤖</div>
              <p>No live trades are available yet.</p>
            </div>
          ) : (
            <div className="max-h-[500px] space-y-3 overflow-y-auto">
              {state.tradeFeed.map((trade) => (
                <TradeItem key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </GlassCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-white">
                Active Bot
              </h3>
              <FaRobot className="text-2xl text-cyan-300" />
            </div>

            <div className="flex items-start gap-4">
              <span className="text-3xl sm:text-4xl">
                {state.currentStrategy.icon}
              </span>

              <div>
                <h4 className="text-lg font-black text-white sm:text-2xl">
                  {state.currentStrategy.name}
                </h4>
                <p className="text-xs text-white/50 sm:text-sm">
                  {state.currentStrategy.description}
                </p>
              </div>
            </div>

            <div className="my-5 h-px bg-white/10" />

            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:gap-3 sm:text-sm">
              <div>
                <p className="text-white/40">Market</p>
                <p className="font-black">{activeTab.label}</p>
              </div>

              <div>
                <p className="text-white/40">Mode</p>
                <p className="font-black text-red-300">LIVE</p>
              </div>

              <div>
                <p className="text-white/40">Positions</p>
                <p className="font-black">
                  {state.openPositionsCount} /{" "}
                  {state.currentStrategy.maxPositions || 5}
                </p>
              </div>
            </div>

            <div className="mt-5">
              {!state.botRunning ? (
                <button
                  type="button"
                  onClick={handleStartBot}
                  disabled={state.processing}
                  className="min-h-[52px] w-full rounded-2xl bg-emerald-500 py-3 font-black text-black transition hover:bg-emerald-400 disabled:opacity-50 sm:py-4"
                >
                  {state.processing ? (
                    <FaSpinner className="mr-2 inline animate-spin" />
                  ) : !hasPaidAccess || isLocked ? (
                    <FaLock className="mr-2 inline" />
                  ) : !isConnected ? (
                    <FaPlug className="mr-2 inline" />
                  ) : (
                    <FaPlay className="mr-2 inline" />
                  )}

                  {!hasPaidAccess
                    ? "Activate Live Trading"
                    : isLocked
                    ? "Upgrade to Unlock"
                    : !isConnected
                    ? "Connect Account"
                    : "Start Live Bot"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopBot}
                  disabled={state.processing}
                  className="min-h-[52px] w-full rounded-2xl bg-red-500 py-3 font-black text-white transition hover:bg-red-400 disabled:opacity-50 sm:py-4"
                >
                  {state.processing ? (
                    <FaSpinner className="mr-2 inline animate-spin" />
                  ) : (
                    <FaStop className="mr-2 inline" />
                  )}
                  Stop Bot
                </button>
              )}
            </div>

            <p className="mt-3 text-center text-[10px] text-white/35 sm:text-xs">
              Live trading uses real funds and can result in losses.
            </p>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-5 text-xl font-black text-white">
              Performance
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <MiniBox
                label="Realized PnL"
                value={formatMoney(state.stats.realizedPnl)}
              />
              <MiniBox
                label="Total PnL"
                value={formatMoney(state.stats.totalPnl)}
              />
              <MiniBox
                label="Total Trades"
                value={state.stats.totalTrades}
              />
              <MiniBox
                label="Win Rate"
                value={formatPercent(winRate)}
              />
            </div>
          </GlassCard>
        </div>

        <AIThinkingPanel
          strategy={state.currentStrategy}
          stats={state.stats}
          effectiveTier={effectiveTier}
        />

        <GlassCard className="border-emerald-500/20">
          <div className="mb-4 flex items-center gap-3">
            <FaUsers className="text-xl text-emerald-400" />
            <h3 className="font-bold text-white">
              Referral Program
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              ["Clicks", state.referral.totalReferrals],
              ["Signups", state.referral.signups],
              ["Paid", state.referral.paidReferrals],
              ["Free Months", state.referral.freeMonths],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-white/5 p-2 text-center sm:p-3"
              >
                <p className="text-lg font-bold text-white sm:text-2xl">
                  <CountUp end={num(value)} duration={1.2} />
                </p>
                <p className="text-[9px] text-white/40 sm:text-[10px]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate("/referrals")}
            className="mt-4 min-h-[44px] text-sm font-black text-emerald-400"
          >
            View Referral Dashboard
            <FaArrowRight className="ml-2 inline" />
          </button>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-5 text-xl font-black text-white">
            Trading Strategies
          </h3>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                selected={
                  state.currentStrategy.id === strategy.id
                }
                disabled={state.botRunning}
                onClick={() =>
                  handleSelectStrategy(strategy)
                }
              />
            ))}
          </div>
        </GlassCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard className="border-emerald-500/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-black text-white">
                IMALI Utility
              </h3>
              <FaCoins className="text-2xl text-emerald-300" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MiniBox
                label="Balance"
                value={`${num(
                  state.imali.balance
                ).toLocaleString()} IMALI`}
              />
              <MiniBox
                label="Discount"
                value={formatPercent(
                  state.imali.discountPct
                )}
              />
              <MiniBox
                label="Status"
                value={
                  state.imali.discountActive
                    ? "Active"
                    : "Inactive"
                }
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/buy-imali")}
                className="min-h-[44px] rounded-2xl bg-emerald-500 py-3 font-black text-black hover:bg-emerald-400"
              >
                Buy IMALI
              </button>

              <button
                type="button"
                onClick={handleApplyImaliDiscount}
                className="min-h-[44px] rounded-2xl bg-white/10 py-3 font-black text-white hover:bg-white/15"
              >
                Apply Discount
              </button>
            </div>
          </GlassCard>

          <GlassCard className="border-purple-500/30">
            <h3 className="text-2xl font-black text-white">
              Need More Access?
            </h3>

            <p className="mt-2 text-sm text-white/60">
              Upgrade to Elite for futures, DEX trading,
              additional automation, and advanced controls.
            </p>

            <button
              type="button"
              onClick={() => navigate("/billing")}
              className="mt-5 min-h-[44px] w-full rounded-2xl bg-purple-500 px-5 py-3 font-black text-white hover:bg-purple-400"
            >
              <FaCrown className="mr-2 inline" />
              View Plans
            </button>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}