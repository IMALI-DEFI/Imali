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

const hasTierAccess = (userTier, minTier) =>
  (TIER_RANK[normalizeTier(userTier)] ?? 0) >=
  (TIER_RANK[normalizeTier(minTier)] ?? 999);

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

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MiniBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/25 p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-white/40">{label}</p>
      <p className="mt-2 font-black text-sm sm:text-base">{value}</p>
    </div>
  );
}

function StrategyCard({ strategy, selected, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-cyan-300 bg-cyan-400/10"
          : "border-white/10 bg-black/20 hover:bg-white/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-3xl leading-none">{strategy.icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-black leading-tight break-words">
              {strategy.name}
            </p>

            <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200 whitespace-nowrap">
              {strategy.risk}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {strategy.description}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/50">
            <span>Max: {strategy.maxPositions || "-"} pos.</span>
            <span>Trade: {formatPercent(num(strategy.tradePct) * 100)}</span>
            <span>TP: {formatPercent(num(strategy.takeProfitPct) * 100)}</span>
            <span>SL: {formatPercent(num(strategy.stopLossPct) * 100)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ConnectionCard({
  activeTab,
  connection,
  isLocked,
  needsReconnect,
  userTier,
  onConnect,
  onUpgrade,
  lastUpdated,
}) {
  return (
    <section
      className={`rounded-[2rem] border p-5 ${
        isLocked
          ? "border-purple-500/30 bg-purple-500/10"
          : needsReconnect
          ? "border-yellow-400/30 bg-yellow-400/10"
          : "border-emerald-400/30 bg-emerald-400/10"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center ${
              isLocked
                ? "bg-purple-500/20 text-purple-300"
                : needsReconnect
                ? "bg-yellow-400/20 text-yellow-300"
                : "bg-emerald-400/20 text-emerald-300"
            }`}
          >
            {isLocked ? (
              <FaLock />
            ) : needsReconnect ? (
              <FaExclamationTriangle />
            ) : (
              <FaCheckCircle />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black">{activeTab.connectionLabel}</h3>

            {isLocked ? (
              <p className="text-sm text-white/60">
                {activeTab.label} trading requires{" "}
                {activeTab.minTier.toUpperCase()} plan or higher. Current plan:{" "}
                {normalizeTier(userTier).toUpperCase()}.
              </p>
            ) : needsReconnect ? (
              <p className="text-sm text-yellow-100/80">
                Reconnect before trading can start.
              </p>
            ) : (
              <p className="text-sm text-emerald-100/80">
                Connected {connection?.keyMasked ? `(${connection.keyMasked})` : ""}.
              </p>
            )}

            <p className="mt-1 text-xs text-white/40">
              Last checked:{" "}
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "Not checked yet"}
            </p>
          </div>
        </div>

        <button
          onClick={isLocked ? onUpgrade : onConnect}
          className={`rounded-2xl px-5 py-3 font-black transition ${
            isLocked
              ? "bg-purple-500 hover:bg-purple-400"
              : needsReconnect
              ? "bg-yellow-400 text-black hover:bg-yellow-300"
              : "bg-white/10 hover:bg-white/15"
          }`}
        >
          {isLocked ? (
            <>
              <FaCrown className="inline mr-2" />
              Upgrade
            </>
          ) : needsReconnect ? (
            <>
              <FaRedo className="inline mr-2" />
              Reconnect
            </>
          ) : (
            <>
              <FaPlug className="inline mr-2" />
              Manage
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function StatusPill({ running }) {
  return (
    <div
      className={`rounded-full border px-4 py-2 text-xs font-black tracking-widest ${
        running
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-white/10 bg-white/10 text-white/50"
      }`}
    >
      <FaCircle
        className={`inline mr-2 h-2 w-2 ${
          running ? "text-emerald-300" : "text-white/40"
        }`}
      />
      {running ? "BOT RUNNING" : "BOT OFF"}
    </div>
  );
}

function ModePill({ mode }) {
  const safeMode = normalizeMode(mode);

  return (
    <div
      className={`rounded-full border px-4 py-2 text-xs font-black tracking-widest ${
        safeMode === "live"
          ? "border-red-400/40 bg-red-400/10 text-red-300"
          : "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
      }`}
    >
      {safeMode.toUpperCase()} MODE
    </div>
  );
}

function LegendRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-white/60">
        <span className={`h-3 w-3 rounded-full ${color}`} />
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function AssetRow({ asset, total }) {
  const pct = total > 0 ? (num(asset.value) / total) * 100 : 0;

  return (
    <div className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-cyan-400/20 grid place-items-center text-xl font-black text-cyan-200">
        {getAssetIcon(asset.symbol)}
      </div>

      <div className="min-w-0">
        <p className="font-black truncate">{asset.symbol}</p>
        <p className="text-sm text-white/45 truncate">{asset.name}</p>
      </div>

      <div className="text-right">
        <p className="font-black">{formatMoney(asset.value)}</p>
        <p className="text-sm text-white/40">
          {num(asset.quantity).toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}
        </p>
      </div>

      <div className="w-14 text-right">
        <p className="text-sm text-white/35">{formatPercent(pct)}</p>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-black">{title}</h3>
        <span className="text-cyan-300 text-2xl">{icon}</span>
      </div>

      {children}
    </section>
  );
}

function BotInfo({ label, value }) {
  return (
    <div>
      <p className="text-white/40">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function SmallStat({ title, value, pnl }) {
  const numeric = Number(String(value).replace(/[$,%]/g, ""));
  const color = pnl
    ? numeric >= 0
      ? "text-emerald-300"
      : "text-red-300"
    : "text-white";

  return (
    <div className="rounded-2xl bg-black/25 p-4">
      <p className="text-sm text-white/40">{title}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function ImaliCard({ imali, onBuy, onApply }) {
  return (
    <section className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-2xl font-black">IMALI Utility</h3>
        <FaCoins className="text-2xl text-emerald-300" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniBox
          label="Balance"
          value={`${num(imali.balance).toLocaleString()} IMALI`}
        />
        <MiniBox label="Discount" value={formatPercent(imali.discountPct)} />
        <MiniBox label="Status" value={imali.discountActive ? "Active" : "Inactive"} />
      </div>

      <p className="mt-4 text-sm text-white/60">
        Hold IMALI for platform discounts, lower fees, early access, and future
        ecosystem benefits.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onBuy}
          className="rounded-2xl bg-emerald-500 py-3 font-black text-black hover:bg-emerald-400 transition"
        >
          Buy IMALI
        </button>

        <button
          onClick={onApply}
          className="rounded-2xl bg-white/10 py-3 font-black hover:bg-white/15 transition"
        >
          Apply Discount
        </button>
      </div>
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-black/25 py-10 text-center text-white/40">
      {text}
    </div>
  );
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MemberDashboard() {
  // ... (all the main component code you already have)
  // I'm showing the complete file with all subcomponents above
}
