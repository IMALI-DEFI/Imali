// src/components/Dashboard/MemberDashboard.jsx
// ENHANCED - With Professional Trading Features

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  memo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import toast, { Toaster } from "react-hot-toast";
import AIThinkingPanel from "./AIThinkingPanel";
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
  FaCog,
  FaCreditCard,
  FaKey,
  FaWallet,
  FaExchangeAlt,
  FaShieldAlt,
  FaBell,
  FaBrain,
  FaUsers,
  FaEnvelope,
} from "react-icons/fa";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

import nftStarter from "../../assets/images/nfts/nft-starter.png";
import nftPro from "../../assets/images/nfts/nft-pro.png";
import nftElite from "../../assets/images/nfts/nft-elite.png";

// Import CandlestickChart
import CandlestickChart from "../charts/CandlestickChart";
import * as candleGenerator from "../../utils/demoCandleGenerator";

ChartJS.register(ArcElement, Tooltip);

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Optimized polling intervals
const POLL_INTERVALS = {
  BOT_STATUS: 5000,
  BALANCES: 15000,
  TRADES: 10000,
  STRATEGIES: 0,
  PROFILE: 0,
  BILLING: 0,
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
    name: "Demo",
    image: nftStarter,
    alt: "Demo Access - Free tier",
    color: "from-cyan-500/20 to-blue-500/10",
    borderColor: "border-cyan-500/30",
  },
  pro: {
    name: "Pro",
    image: nftPro,
    alt: "Pro NFT - Professional trading tier",
    color: "from-blue-600/20 to-indigo-500/10",
    borderColor: "border-blue-500/30",
  },
  elite: {
    name: "Elite",
    image: nftElite,
    alt: "Elite NFT - Advanced trading tier",
    color: "from-purple-600/20 to-pink-500/10",
    borderColor: "border-purple-500/30",
  },
  enterprise: {
    name: "Enterprise",
    image: null,
    alt: "Enterprise - Custom solutions",
    color: "from-indigo-600/20 to-purple-500/10",
    borderColor: "border-indigo-500/30",
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
    upgradeMessage: "Unlock Live Trading",
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
    connectionLabel: "Wallet / DEX Bot",
    minTier: "elite",
    connectRoute: "/connect-wallet",
    upgradeMessage: "Unlock DEX Sniper",
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
];

const FALLBACK_STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    riskLevel: 20,
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
    riskLevel: 50,
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
    riskLevel: 75,
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
    riskLevel: 95,
    description: "Fast, high-volatility opportunities.",
    maxPositions: 8,
    tradePct: 0.15,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  },
];

const SETTINGS_TABS = [
  { id: "billing", icon: <FaCreditCard />, label: "Billing", route: "/billing" },
  { id: "trading", icon: <FaPlug />, label: "Trading Accounts", route: "/connect-okx" },
  { id: "wallets", icon: <FaWallet />, label: "Wallets", route: "/connect-wallet" },
  { id: "activation", icon: <FaExchangeAlt />, label: "Activation", route: "/activation" },
  { id: "security", icon: <FaShieldAlt />, label: "Security", route: "/settings/security" },
  { id: "notifications", icon: <FaBell />, label: "Notifications", route: "/settings/notifications" },
  { id: "api", icon: <FaKey />, label: "API Keys", route: "/settings/api" },
  { id: "automation", icon: <FaRobot />, label: "Automation", route: "/settings/automation" },
};

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

// ============================================================================
// GLASS CARD COMPONENT - Mobile responsive
// ============================================================================

const GlassCard = ({ 
  children, 
  className = "", 
  contentClassName = "p-4 sm:p-5 md:p-6",
  gradient = "from-emerald-500/10 to-cyan-500/10" 
}) => (
  <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5" />
    <div className={`relative z-10 ${contentClassName}`}>{children}</div>
  </div>
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

const fetchWithRetry = async (
  fn,
  retries = API_RETRY_COUNT,
  delay = API_RETRY_DELAY_MS,
  signal = null
) => {
  for (let i = 0; i <= retries; i += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

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

// ============================================================================
// ENHANCED SUBCOMPONENTS
// ============================================================================

const MiniBox = memo(({ label, value }) => (
  <GlassCard 
    contentClassName="p-2 sm:p-3 md:p-4 text-center" 
    gradient="from-white/5 to-white/5"
  >
    <p className="text-[10px] sm:text-xs md:text-sm text-white/40">{label}</p>
    <p className="mt-1 sm:mt-2 font-black text-sm sm:text-base md:text-lg text-white">{value}</p>
  </GlassCard>
));
MiniBox.displayName = "MiniBox";

const LegendRow = memo(({ label, value, color }) => (
  <div className="flex items-center justify-between gap-2 sm:gap-3">
    <div className="flex items-center gap-1.5 sm:gap-2 text-white/60 text-xs sm:text-sm">
      <span className={`h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full ${color}`} />
      {label}
    </div>
    <strong className="text-white text-xs sm:text-sm">{value}</strong>
  </div>
));
LegendRow.displayName = "LegendRow";

const AssetRow = memo(({ asset, total }) => {
  const pct = total > 0 ? (num(asset.value) / total) * 100 : 0;

  return (
    <div className="grid grid-cols-[40px_1fr_auto_auto] sm:grid-cols-[48px_1fr_auto_auto] items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-white/5 transition">
      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-cyan-400/20 grid place-items-center text-base sm:text-xl font-black text-cyan-200">
        {getAssetIcon(asset.symbol)}
      </div>

      <div className="min-w-0">
        <p className="font-black truncate text-white text-sm sm:text-base">{asset.symbol}</p>
        <p className="text-xs sm:text-sm text-white/45 truncate">{asset.name}</p>
      </div>

      <div className="text-right">
        <p className="font-black text-white text-sm sm:text-base">{formatMoney(asset.value)}</p>
        <p className="text-xs sm:text-sm text-white/40">
          {num(asset.quantity).toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}
        </p>
      </div>

      <div className="w-10 sm:w-14 text-right">
        <p className="text-xs sm:text-sm text-white/35">{formatPercent(pct)}</p>
      </div>
    </div>
  );
});
AssetRow.displayName = "AssetRow";

const StrategyCard = memo(({ strategy, selected, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full rounded-2xl border p-3 sm:p-4 text-left transition ${
      selected
        ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20"
        : "border-white/10 bg-white/5 hover:bg-white/10"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="shrink-0 text-2xl sm:text-3xl leading-none">{strategy.icon}</div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base sm:text-lg font-black leading-tight break-words text-white">
            {strategy.name}
          </p>

          <span className="w-fit rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-black whitespace-nowrap bg-cyan-400/10 text-cyan-200">
            {strategy.risk}
          </span>
        </div>

        <p className="mt-1 sm:mt-3 text-xs sm:text-sm leading-relaxed text-white/50">
          {strategy.description}
        </p>

        <div className="mt-2 sm:mt-4 grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs text-white/50">
          <span>Max: {strategy.maxPositions || "-"} pos.</span>
          <span>Trade: {formatPercent(num(strategy.tradePct) * 100)}</span>
          <span>TP: {formatPercent(num(strategy.takeProfitPct) * 100)}</span>
          <span>SL: {formatPercent(num(strategy.stopLossPct) * 100)}</span>
        </div>

        {disabled && (
          <div className="mt-2 sm:mt-3 text-center text-[10px] sm:text-xs text-yellow-400">
            ⚠️ Stop bot to change strategy
          </div>
        )}
      </div>
    </div>
  </button>
));
StrategyCard.displayName = "StrategyCard";

const ConnectionCard = memo(
  ({
    activeTab,
    connection,
    isLocked,
    needsReconnect,
    userTier,
    onConnect,
    onUpgrade,
    lastUpdated,
  }) => (
    <GlassCard
      className={`p-4 sm:p-5 ${
        isLocked
          ? "border-purple-500/30 bg-purple-500/10"
          : needsReconnect
          ? "border-yellow-400/30 bg-yellow-400/10"
          : "border-emerald-400/30 bg-emerald-400/10"
      }`}
      gradient="from-white/5 to-white/5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-2xl grid place-items-center ${
              isLocked
                ? "bg-purple-500/20 text-purple-300"
                : needsReconnect
                ? "bg-yellow-400/20 text-yellow-300"
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

          <div className="min-w-0">
            <h3 className="text-base sm:text-xl font-black text-white">{activeTab.connectionLabel}</h3>

            {isLocked ? (
              <p className="text-xs sm:text-sm text-white/60">
                {activeTab.label} trading requires{" "}
                {activeTab.minTier.toUpperCase()} plan or higher. Current plan:{" "}
                {normalizeTier(userTier).toUpperCase()}.
              </p>
            ) : needsReconnect ? (
              <p className="text-xs sm:text-sm text-yellow-100/80">
                Reconnect before trading can start.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-emerald-100/80">
                Connected {connection?.keyMasked ? `(${connection.keyMasked})` : ""}.
              </p>
            )}

            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/40">
              Last checked:{" "}
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "Not checked yet"}
            </p>
          </div>
        </div>

        <button
          onClick={isLocked ? onUpgrade : onConnect}
          className={`rounded-2xl px-4 sm:px-5 py-2 sm:py-3 font-black text-sm sm:text-base transition ${
            isLocked
              ? "bg-purple-500 hover:bg-purple-400 text-white"
              : needsReconnect
              ? "bg-yellow-400 text-black hover:bg-yellow-300"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
        >
          {isLocked ? (
            <>
              <FaCrown className="inline mr-1 sm:mr-2" />
              {activeTab.upgradeMessage || "Upgrade"}
            </>
          ) : needsReconnect ? (
            <>
              <FaRedo className="inline mr-1 sm:mr-2" />
              Reconnect
            </>
          ) : (
            <>
              <FaPlug className="inline mr-1 sm:mr-2" />
              Manage
            </>
          )}
        </button>
      </div>
    </GlassCard>
  )
);
ConnectionCard.displayName = "ConnectionCard";

const StatusPill = memo(({ running }) => (
  <div
    className={`rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black tracking-widest ${
      running
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
        : "border-white/10 bg-white/10 text-white/50"
    }`}
  >
    <FaCircle
      className={`inline mr-1 sm:mr-2 h-1.5 sm:h-2 w-1.5 sm:w-2 ${
        running ? "text-emerald-300" : "text-white/40"
      }`}
    />
    {running ? "BOT RUNNING" : "BOT OFF"}
  </div>
));
StatusPill.displayName = "StatusPill";

const ModePill = memo(({ mode }) => {
  const safeMode = normalizeMode(mode);

  return (
    <div
      className={`rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black tracking-widest ${
        safeMode === "live"
          ? "border-red-400/40 bg-red-400/10 text-red-300"
          : "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
      }`}
    >
      {safeMode === "live" ? "🔴" : "🟡"} {safeMode.toUpperCase()} MODE
    </div>
  );
});
ModePill.displayName = "ModePill";

const SettingsTab = memo(({ icon, label, onClick, active = false }) => (
  <button
    onClick={onClick}
    className={`rounded-xl px-2 sm:px-3 py-2 sm:py-3 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1 sm:gap-2 ${
      active
        ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30"
        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
    }`}
  >
    <span className="text-sm sm:text-base">{icon}</span>
    <span className="hidden xs:inline">{label}</span>
  </button>
));
SettingsTab.displayName = "SettingsTab";

const TradeItem = memo(({ trade }) => {
  const isLive = trade.mode === "live";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-white/10 transition"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="text-2xl sm:text-3xl flex-shrink-0">{getStockIcon(trade.symbol)}</div>
        <div className="min-w-0">
          <div className="font-bold flex flex-wrap items-center gap-1 sm:gap-2 text-white text-sm sm:text-base">
            {trade.symbol}
            <span
              className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-black ${
                isLive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              }`}
            >
              {isLive ? "● LIVE" : "● PAPER"}
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {trade.type} • {trade.time}
          </div>
          {trade.price > 0 && (
            <div className="text-[10px] sm:text-xs text-white/30 mt-0.5">
              @ {formatMoney(trade.price)}
            </div>
          )}
        </div>
      </div>

      <div
        className={`font-bold text-base sm:text-lg ${
          trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {trade.pnl >= 0 ? "+" : ""}
        {formatMoney(trade.pnl)}
        {trade.pnlPercent !== 0 && (
          <span className="text-[10px] sm:text-xs ml-0.5 sm:ml-1">
            ({trade.pnl >= 0 ? "+" : ""}
            {trade.pnlPercent.toFixed(2)}%)
          </span>
        )}
      </div>
    </motion.div>
  );
});
TradeItem.displayName = "TradeItem";

// ============================================================================
// UPGRADE PROMPT - Specific messages
// ============================================================================

const UpgradePrompt = ({ currentTier, onUpgrade }) => {
  const features = [];
  
  if (currentTier === "starter" || currentTier === "demo") {
    features.push(
      { icon: "🔴", label: "Live Trading", desc: "Trade with real funds on OKX" },
      { icon: "🤖", label: "AI Automation", desc: "Automated strategies 24/7" },
      { icon: "📊", label: "Advanced Analytics", desc: "Professional trading insights" }
    );
  } else if (currentTier === "pro") {
    features.push(
      { icon: "🎯", label: "DEX Sniper", desc: "Front-run DeFi opportunities" },
      { icon: "📈", label: "Futures Trading", desc: "Leveraged positions" },
      { icon: "🏦", label: "Staking & Lending", desc: "Earn yield on assets" }
    );
  }

  if (features.length === 0) return null;

  return (
    <GlassCard className="border-purple-500/30 bg-purple-500/10" gradient="from-purple-500/10 to-purple-500/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FaCrown className="text-amber-400" />
            <h4 className="font-bold text-white">
              {currentTier === "starter" ? "Unlock Full Trading Power" : "Go Elite"}
            </h4>
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-white/70">
                <span>{feature.icon}</span>
                <span>
                  <strong className="text-white/90">{feature.label}</strong>
                  <span className="text-white/50"> • {feature.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-black text-sm text-white transition hover:from-amber-600 hover:to-orange-600"
        >
          <FaCrown className="inline mr-2" />
          {currentTier === "starter" ? "Unlock Pro" : "Upgrade to Elite"}
        </button>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// REFERRAL CARD
// ============================================================================

const ReferralCard = ({ referralData, user }) => {
  if (!user) return null;

  return (
    <GlassCard className="border-emerald-500/20" gradient="from-emerald-500/10 to-cyan-500/10">
      <div className="flex items-center gap-3 mb-4">
        <FaUsers className="text-emerald-400 text-xl" />
        <h4 className="font-bold text-white">Referral Program</h4>
        <span className="ml-auto text-[10px] text-emerald-400">● ACTIVE</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-xl bg-white/5">
          <div className="text-2xl font-bold text-white">
            <CountUp end={referralData?.totalReferrals || 0} duration={1.5} />
          </div>
          <div className="text-[10px] text-white/40">Clicks</div>
        </div>
        <div className="text-center p-2 rounded-xl bg-white/5">
          <div className="text-2xl font-bold text-emerald-400">
            <CountUp end={referralData?.signups || 0} duration={1.5} />
          </div>
          <div className="text-[10px] text-white/40">Signups</div>
        </div>
        <div className="text-center p-2 rounded-xl bg-white/5">
          <div className="text-2xl font-bold text-amber-400">
            <CountUp end={referralData?.paidReferrals || 0} duration={1.5} />
          </div>
          <div className="text-[10px] text-white/40">Paid Referrals</div>
        </div>
        <div className="text-center p-2 rounded-xl bg-white/5">
          <div className="text-2xl font-bold text-cyan-400">
            <CountUp end={referralData?.freeMonths || 0} duration={1.5} />
          </div>
          <div className="text-[10px] text-white/40">Free Months</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-white/40 truncate max-w-[60%]">
          Your link: {user?.referral_code && `${window.location.origin}/signup?ref=${user.referral_code}`}
        </div>
        <button 
          onClick={() => window.location.href = '/referrals'}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition"
        >
          View Dashboard →
        </button>
      </div>
    </GlassCard>
  );
};

// ============================================================================
// EMAIL CAPTURE CARD (for non-authenticated visitors)
// ============================================================================

const EmailCaptureCard = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const response = await BotAPI.captureMarketingLead({
        email: email.trim().toLowerCase(),
        source: "member-dashboard-demo",
        interest: "automated-trading",
        consent: true,
      });
      
      if (response?.success === false) {
        throw new Error(response.error || "Unable to subscribe");
      }
      
      localStorage.setItem('demo_email_capture', email);
      setSubmitted(true);
      toast.success('Thanks for subscribing! 🎉');
      onSubmit?.(email);
    } catch (err) {
      console.error('Email capture failed:', err);
      toast.error(err.message || "Unable to subscribe");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <GlassCard className="border-emerald-500/20 text-center" gradient="from-emerald-500/10 to-cyan-500/10">
        <FaCheckCircle className="text-emerald-400 text-3xl mx-auto mb-2" />
        <p className="text-white font-bold">You're on the list! 🎉</p>
        <p className="text-xs text-white/50">We'll send you updates and trading insights.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="border-blue-500/20" gradient="from-blue-500/10 to-purple-500/10">
      <div className="flex items-center gap-3 mb-3">
        <FaEnvelope className="text-blue-400 text-xl" />
        <h4 className="font-bold text-white">Get Trading Insights</h4>
      </div>
      <p className="text-xs text-white/50 mb-3">
        Subscribe for market updates, platform news, and trading strategies.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? <FaSpinner className="animate-spin" /> : "Subscribe"}
        </button>
      </form>
    </GlassCard>
  );
};

// ============================================================================
// INITIAL STATE & REDUCER
// ============================================================================

const initialState = {
  loading: true,
  refreshing: false,
  processing: false,
  userTier: "starter",
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
  candles: [],
  candlesLoading: false,
  analysis: {
    regime: "Neutral",
    confidence: 0,
    reasoning: [],
    decision: "WAIT",
    updatedAt: null,
    source: "unavailable",
  },
  candlesSource: "none",
  referral: {
    totalReferrals: 0,
    signups: 0,
    paidReferrals: 0,
    freeMonths: 0,
  },
  debug: {
    lastStartAttempt: null,
    lastStartResult: null,
    lastStartError: null,
    latency: 0,
    lastPoll: null,
    failedRequests: 0,
    backendVersion: "unknown",
    userId: null,
    botId: null,
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
  SET_CANDLES: "SET_CANDLES",
  SET_CANDLES_LOADING: "SET_CANDLES_LOADING",
  SET_ANALYSIS: "SET_ANALYSIS",
  SET_CANDLES_SOURCE: "SET_CANDLES_SOURCE",
  SET_REFERRAL: "SET_REFERRAL",
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
      return { ...state, userTier: normalizeTier(action.payload) };
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
    case ACTIONS.SET_CANDLES:
      return { ...state, candles: action.payload };
    case ACTIONS.SET_CANDLES_LOADING:
      return { ...state, candlesLoading: action.payload };
    case ACTIONS.SET_REFERRAL:
      return { ...state, referral: { ...state.referral, ...action.payload } };
    case ACTIONS.SET_ANALYSIS:
      return {
        ...state,
        analysis: {
          ...state.analysis,
          ...action.payload,
        },
      };
    case ACTIONS.SET_CANDLES_SOURCE:
      return { ...state, candlesSource: action.payload };
    case ACTIONS.UPDATE_STRATEGY_PREF:
      localStorage.setItem("imali_selected_strategy", action.payload.id);
      return { ...state, currentStrategy: action.payload };
    case ACTIONS.RESET_STATE:
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

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
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
          <GlassCard className="p-8 max-w-md text-center border-red-500/40">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-black mb-2 text-white">Dashboard Error</h2>
            <p className="text-white/60 mb-4">
              Something went wrong loading your dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-cyan-500 px-6 py-3 font-black hover:bg-cyan-400 transition text-black"
            >
              Refresh Page
            </button>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// DEBUG PANEL
// ============================================================================

function DebugPanel({ state }) {
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
        <div className="fixed bottom-16 right-4 z-50 w-96 rounded-2xl border border-yellow-500/30 bg-black/95 backdrop-blur-lg p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-yellow-400">Debug Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono text-white/70">
            <p><span className="text-white/50">Bot Running:</span> {state.botRunning ? "✅ Yes" : "❌ No"}</p>
            <p><span className="text-white/50">Bot Mode:</span> {state.botMode}</p>
            <p><span className="text-white/50">Open Positions:</span> {state.openPositionsCount}</p>
            <p><span className="text-white/50">Active Tab:</span> {state.activeType}</p>
            <p><span className="text-white/50">Current Strategy:</span> {state.currentStrategy?.name}</p>
            <p><span className="text-white/50">API Latency:</span> {state.debug.latency}ms</p>
            <p><span className="text-white/50">Last Poll:</span> {state.debug.lastPoll?.toLocaleTimeString() || "Never"}</p>
            <p><span className="text-white/50">Failed Requests:</span> {state.debug.failedRequests}</p>
            <p><span className="text-white/50">Backend Version:</span> {state.debug.backendVersion}</p>
            <p><span className="text-white/50">User ID:</span> {state.debug.userId || "N/A"}</p>
            <p><span className="text-white/50">Bot ID:</span> {state.debug.botId || "N/A"}</p>

            {state.debug.lastStartAttempt && (
              <p><span className="text-white/50">Last Start:</span> {new Date(state.debug.lastStartAttempt).toLocaleTimeString()}</p>
            )}

            {state.debug.lastStartResult && (
              <details className="mt-2">
                <summary className="cursor-pointer text-cyan-400">Last Start Result</summary>
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
              onClick={() => window.location.reload()}
              className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20 text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MemberDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, logout } = useAuth();

  const mountedRef = useRef(false);
  const refreshLock = useRef(false);
  const abortControllersRef = useRef([]);
  const intervalsRef = useRef({});
  const [isVisible, setIsVisible] = useState(true);

  const lastFetchTimeRef = useRef({
    user: 0,
    strategies: 0,
    integrations: 0,
  });

  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const previousActiveType = usePrevious(state.activeType);

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

  // Enhanced paid access detection
  const normalizedSubscriptionStatus = String(
    user?.subscription_status ||
      activation?.subscription_status ||
      ""
  ).toLowerCase();

  const hasCardOnFile = Boolean(
    user?.has_card_on_file ||
      user?.billing_complete ||
      activation?.has_card_on_file ||
      activation?.billing_complete
  );

  const hasPaidAccess = [
    "active",
    "trialing"
  ].includes(normalizedSubscriptionStatus);

  const effectiveTier =
    normalizeTier(state.userTier) === "starter"
      ? "starter"
      : hasPaidAccess
        ? normalizeTier(state.userTier)
        : "starter";

  // Visible trading types by tier
  const visibleTradingTypes = useMemo(() => {
    if (effectiveTier === "starter") {
      return TRADING_TYPES.filter((item) => item.id === "crypto");
    }
    if (effectiveTier === "pro") {
      return TRADING_TYPES.filter(
        (item) => item.id === "crypto" || item.id === "stocks"
      );
    }
    if (effectiveTier === "elite" || effectiveTier === "enterprise") {
      return TRADING_TYPES;
    }
    return TRADING_TYPES.filter((item) => item.id === "crypto");
  }, [effectiveTier]);

  // Reset active tab when access changes
  useEffect(() => {
    const activeStillVisible = visibleTradingTypes.some(
      (item) => item.id === state.activeType
    );
    if (!activeStillVisible) {
      dispatch({
        type: ACTIONS.SET_ACTIVE_TYPE,
        payload: visibleTradingTypes[0]?.id || "crypto",
      });
    }
  }, [visibleTradingTypes, state.activeType]);

  // Access locking uses effectiveTier
  const isLocked = useMemo(
    () => !hasTierAccess(effectiveTier, activeTab.minTier),
    [effectiveTier, activeTab.minTier]
  );

  const isConnected = useMemo(
    () => Boolean(activeConnection?.connected),
    [activeConnection]
  );

  const starterPaperOnly =
    effectiveTier === "starter" && activeTab?.paperOnlyStarter;

  const needsReconnect = useMemo(() => {
    if (starterPaperOnly) return false;
    return !isConnected && !isLocked;
  }, [starterPaperOnly, isConnected, isLocked]);

  // Account Status Helper
  const accountStatus = useMemo(() => {
    const tier = state.userTier;
    const hasAccess = hasPaidAccess;

    if (tier === "starter") {
      return {
        status: "Free",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        message: "Demo trading enabled",
        icon: "🌱",
        label: "DEMO ACCESS",
      };
    }

    if (hasAccess) {
      return {
        status: "Active",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        message: `${tier.toUpperCase()} plan active`,
        icon: "⭐",
        label: `${tier.toUpperCase()} PLAN`,
      };
    }

    return {
      status: "Billing Incomplete",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      message: `${tier.toUpperCase()} selected · Demo only`,
      icon: "⚠️",
      label: "DEMO ACCESS",
    };
  }, [state.userTier, hasPaidAccess]);

  // Active settings tab detection
  const activeSettingsTab = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/billing")) return "billing";
    if (path.includes("/connect-okx") || path.includes("/connect-alpaca")) return "trading";
    if (path.includes("/connect-wallet")) return "wallets";
    if (path.includes("/activation")) return "activation";
    if (path.includes("/settings/security")) return "security";
    if (path.includes("/settings/notifications")) return "notifications";
    if (path.includes("/settings/api")) return "api";
    if (path.includes("/settings/automation")) return "automation";
    return "billing";
  }, [location.pathname]);

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

  // ============================================================================
  // API FETCH FUNCTIONS
  // ============================================================================

  const fetchCandles = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: true });

    try {
      if (effectiveTier === "starter") {
        const simulatedCandles = candleGenerator.createInitialCandles({
          count: 40,
          startPrice: 67420,
          intervalSeconds: 60,
        });
        
        dispatch({ type: ACTIONS.SET_CANDLES, payload: simulatedCandles });
        dispatch({ type: ACTIONS.SET_CANDLES_SOURCE, payload: "simulated" });
        dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: false });
        return;
      }

      const symbol = activeTab.exchange === "alpaca" ? "AAPL" : "BTC-USDT";
      const res = await BotAPI.getMarketCandles?.({
        exchange: activeTab.exchange,
        symbol,
        timeframe: "1m",
        limit: 100,
      });

      const data = unwrapData(res);
      const rawCandles = data.candles || data.data || [];

      const formattedCandles = rawCandles
        .map((candle) => ({
          time: Math.floor(
            new Date(candle.time ?? candle.timestamp ?? candle.created_at).getTime() / 1000
          ),
          open: num(candle.open),
          high: num(candle.high),
          low: num(candle.low),
          close: num(candle.close),
        }))
        .filter((candle) => candle.time && candle.open && candle.high && candle.low && candle.close)
        .sort((a, b) => a.time - b.time);

      dispatch({ type: ACTIONS.SET_CANDLES, payload: formattedCandles });
      dispatch({ type: ACTIONS.SET_CANDLES_SOURCE, payload: "live" });
    } catch (error) {
      console.warn("Could not load market candles:", error);
      const fallbackCandles = candleGenerator.createInitialCandles({
        count: 40,
        startPrice: 67420,
        intervalSeconds: 60,
      });
      dispatch({ type: ACTIONS.SET_CANDLES, payload: fallbackCandles });
      dispatch({ type: ACTIONS.SET_CANDLES_SOURCE, payload: "unavailable" });
    } finally {
      dispatch({ type: ACTIONS.SET_CANDLES_LOADING, payload: false });
    }
  }, [activeTab.exchange, effectiveTier]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetchWithRetry(() => BotAPI.getMe?.(true));
      const data = unwrapData(res);
      const nextUser = data.user || data;

      dispatch({
        type: ACTIONS.SET_USER_TIER,
        payload: nextUser?.tier || user?.tier || "starter",
      });

      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { userId: nextUser?.id || user?.id },
      });

      lastFetchTimeRef.current.user = Date.now();
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch user failed:", err);
      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { failedRequests: state.debug.failedRequests + 1 },
      });
    }
  }, [user?.tier, user?.id, state.debug.failedRequests]);

  const fetchStrategies = useCallback(async () => {
    try {
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
        riskLevel: cfg.riskLevel === "low" ? 20 : cfg.riskLevel === "medium" ? 50 : cfg.riskLevel === "higher" ? 75 : 95,
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
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch strategies failed:", err);
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    const startTime = performance.now();

    try {
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

      if (botPositions > 0 || isRunning) {
        dispatch({
          type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
          payload: botPositions,
        });
      }

      if (responseData.summary) {
        const open = num(
          responseData.summary.open_positions ?? responseData.summary.openPositions ?? 0
        );

        if (open > 0) {
          dispatch({
            type: ACTIONS.SET_OPEN_POSITIONS_COUNT,
            payload: open,
          });
        }
      }

      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { botId: runningBot?.botId || runningBot?.id || "N/A" },
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch bot status failed:", err);
      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { failedRequests: state.debug.failedRequests + 1 },
      });
    } finally {
      const latency = performance.now() - startTime;
      dispatch({
        type: ACTIONS.SET_DEBUG,
        payload: { latency: Math.round(latency), lastPoll: new Date() },
      });
    }
  }, [getStrategy, state.debug.failedRequests]);

  const fetchIntegrationStatus = useCallback(async () => {
    try {
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
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch integration status failed:", err);
    }
  }, [activeTab.connectionKey]);

  const fetchBalance = useCallback(async () => {
    try {
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
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch balance failed:", err);
    }
  }, [activeTab.exchange, normalizeAsset]);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetchWithRetry(() =>
        BotAPI.getOpenPositions?.(activeTab.exchange, true)
      );

      const data = unwrapData(res);
      const list = data.positions || data.openPositions || data.data || [];

      dispatch({ type: ACTIONS.SET_POSITIONS, payload: list });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch positions failed:", err);
    }
  }, [activeTab.exchange]);

  const fetchStats = useCallback(async () => {
    try {
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
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch stats failed:", err);
    }
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

        const tradeMode =
          trade.mode ??
          (activeTab.exchange === "alpaca" ? "live" : "paper");

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
          mode: tradeMode,
          simulated: trade.simulated !== false,
        };
      });

      if (formattedTrades.length) {
        dispatch({ type: ACTIONS.SET_TRADE_FEED, payload: formattedTrades });
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Failed to fetch live trades:", err);
    }
  }, [activeTab.exchange]);

  const fetchImali = useCallback(async () => {
    try {
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
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch IMALI failed:", err);
    }
  }, []);

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetchWithRetry(() => BotAPI.getReferralStats?.());
      const data = unwrapData(res);

      dispatch({
        type: ACTIONS.SET_REFERRAL,
        payload: {
          totalReferrals: num(data.totalReferrals || 0),
          signups: num(data.signups || 0),
          paidReferrals: num(data.paidReferrals || 0),
          freeMonths: num(data.freeMonths || 0),
        },
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("Fetch referral stats failed:", err);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    if (effectiveTier === "starter") {
      dispatch({
        type: ACTIONS.SET_ANALYSIS,
        payload: {
          regime: "Neutral",
          confidence: 65,
          reasoning: [
            "Demo analysis",
            "Simulated momentum",
            "Virtual market conditions",
          ],
          decision: "OBSERVE",
          source: "simulated",
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const symbol =
        activeTab.exchange === "alpaca" ? "AAPL" : "BTC-USDT";

      const response = await BotAPI.getMarketAnalysis({
        exchange: activeTab.exchange,
        symbol,
        strategy: state.currentStrategy.id,
        timeframe: "5m",
      });

      const data = unwrapData(response);
      const analysis = data.analysis || data;

      dispatch({
        type: ACTIONS.SET_ANALYSIS,
        payload: {
          regime: analysis.regime || "Neutral",
          confidence: num(analysis.confidence),
          reasoning: Array.isArray(analysis.reasoning)
            ? analysis.reasoning
            : [],
          decision: analysis.decision || "WAIT",
          updatedAt: analysis.updatedAt || new Date().toISOString(),
          source: "live",
        },
      });
    } catch (error) {
      console.warn("Analysis fetch failed:", error);

      dispatch({
        type: ACTIONS.SET_ANALYSIS,
        payload: {
          source: "unavailable",
        },
      });
    }
  }, [
    effectiveTier,
    activeTab.exchange,
    state.currentStrategy.id,
  ]);

  // ============================================================================
  // SAVE FUNCTIONS
  // ============================================================================

  const saveStrategyPreference = useCallback(async (strategyId) => {
    localStorage.setItem("imali_selected_strategy", strategyId);

    try {
      await BotAPI.updateUserStrategy?.(strategyId);
    } catch (err) {
      console.warn("Could not save strategy preference to backend", err);
    }
  }, []);

  // ============================================================================
  // REFRESH DASHBOARD
  // ============================================================================

  const refreshDashboard = useCallback(
    async (manual = false, options = {}) => {
      if (refreshLock.current) {
        console.warn("Refresh already in progress, skipping");
        return;
      }

      refreshLock.current = true;

      const {
        refreshBot = true,
        refreshBalance = true,
        refreshTrades = true,
        refreshStrategies = false,
        refreshProfile = false,
        refreshBilling = false,
        refreshCandles = false,
        refreshReferral = false,
        refreshAnalysis = false,
      } = options;

      if (manual) {
        dispatch({ type: ACTIONS.SET_REFRESHING, payload: true });
      }

      const fns = {
        fetchBotStatus,
        fetchBalance,
        fetchTradeFeed,
        fetchStrategies,
        fetchUser,
        fetchIntegrationStatus,
        fetchStats,
        fetchPositions,
        fetchImali,
        fetchCandles,
        fetchReferral,
        fetchAnalysis,
      };

      const startTime = performance.now();

      try {
        const promises = [];

        if (refreshBot && fns.fetchBotStatus) {
          promises.push(fns.fetchBotStatus().catch((err) => {
            if (err.name !== "AbortError") console.warn("Bot status refresh failed:", err);
            return null;
          }));
        }

        if (refreshBalance && fns.fetchBalance) {
          promises.push(fns.fetchBalance().catch((err) => {
            if (err.name !== "AbortError") console.warn("Balance refresh failed:", err);
            return null;
          }));
        }

        if (refreshTrades && fns.fetchTradeFeed) {
          promises.push(fns.fetchTradeFeed().catch((err) => {
            if (err.name !== "AbortError") console.warn("Trade feed refresh failed:", err);
            return null;
          }));
        }

        if (refreshStrategies && fns.fetchStrategies) {
          promises.push(fns.fetchStrategies().catch((err) => {
            if (err.name !== "AbortError") console.warn("Strategies refresh failed:", err);
            return null;
          }));
        }

        if (refreshProfile && fns.fetchUser) {
          promises.push(fns.fetchUser().catch((err) => {
            if (err.name !== "AbortError") console.warn("Profile refresh failed:", err);
            return null;
          }));
        }

        if (refreshBilling && fns.fetchIntegrationStatus) {
          promises.push(fns.fetchIntegrationStatus().catch((err) => {
            if (err.name !== "AbortError") console.warn("Billing refresh failed:", err);
            return null;
          }));
        }

        if (refreshCandles && fns.fetchCandles) {
          promises.push(fns.fetchCandles().catch((err) => {
            if (err.name !== "AbortError") console.warn("Candles refresh failed:", err);
            return null;
          }));
        }

        if (refreshReferral && fns.fetchReferral) {
          promises.push(fns.fetchReferral().catch((err) => {
            if (err.name !== "AbortError") console.warn("Referral refresh failed:", err);
            return null;
          }));
        }

        if (refreshAnalysis && fns.fetchAnalysis) {
          promises.push(fns.fetchAnalysis().catch((err) => {
            if (err.name !== "AbortError") console.warn("Analysis refresh failed:", err);
            return null;
          }));
        }

        await Promise.allSettled(promises);

        const backgroundPromises = [];

        if (fns.fetchStats) {
          backgroundPromises.push(fns.fetchStats().catch((err) => {
            if (err.name !== "AbortError") console.warn("Stats refresh failed:", err);
            return null;
          }));
        }

        if (fns.fetchPositions) {
          backgroundPromises.push(fns.fetchPositions().catch((err) => {
            if (err.name !== "AbortError") console.warn("Positions refresh failed:", err);
            return null;
          }));
        }

        if (fns.fetchImali) {
          backgroundPromises.push(fns.fetchImali().catch((err) => {
            if (err.name !== "AbortError") console.warn("IMALI refresh failed:", err);
            return null;
          }));
        }

        await Promise.allSettled(backgroundPromises);

        if (mountedRef.current) {
          const totalLatency = performance.now() - startTime;
          dispatch({
            type: ACTIONS.SET_DEBUG,
            payload: { latency: Math.round(totalLatency) },
          });
          dispatch({ type: ACTIONS.SET_LAST_UPDATED, payload: new Date() });

          if (manual) {
            dispatch({ type: ACTIONS.SET_REFRESHING, payload: false });
            dispatch({ type: ACTIONS.SET_ERROR, payload: "" });
          }

          dispatch({ type: ACTIONS.SET_LOADING, payload: false });
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
        refreshLock.current = false;
      }
    },
    [
      fetchBotStatus,
      fetchBalance,
      fetchTradeFeed,
      fetchStrategies,
      fetchUser,
      fetchIntegrationStatus,
      fetchStats,
      fetchPositions,
      fetchImali,
      fetchCandles,
      fetchReferral,
      fetchAnalysis,
    ]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectStrategy = useCallback(
    async (strategy) => {
      if (state.botRunning) {
        showError("Stop the bot before changing strategies.");
        return;
      }

      dispatch({ type: ACTIONS.SET_CURRENT_STRATEGY, payload: strategy });
      await saveStrategyPreference(strategy.id);
      showNotice(`Strategy changed to ${strategy.name}`);
    },
    [state.botRunning, saveStrategyPreference, showNotice, showError]
  );

  const handleConnect = useCallback(() => {
    if (isLocked) {
      navigate("/billing");
      return;
    }

    navigate(activeTab.connectRoute);
  }, [isLocked, navigate, activeTab.connectRoute]);

  const handleStartBot = useCallback(async () => {
    if (isLocked) {
      showError("Your current plan does not include this trading type.");
      navigate("/billing");
      return;
    }

    const requiresConnection = !starterPaperOnly;

    if (requiresConnection && !isConnected) {
      showError(`Please connect your ${activeTab.connectionLabel} first.`);
      navigate(activeTab.connectRoute);
      return;
    }

    const launchMode = starterPaperOnly ? "paper" : state.botMode;

    if (starterPaperOnly && state.botMode !== "paper") {
      dispatch({
        type: ACTIONS.SET_BOT_MODE,
        payload: "paper",
      });
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
          ? "Demo bot started."
          : "Bot started successfully."
      );

      await refreshDashboard(true, {
        refreshBot: true,
        refreshBalance: true,
        refreshTrades: true,
        refreshAnalysis: true,
      });
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
    starterPaperOnly,
    navigate,
    activeTab,
    state.botMode,
    state.currentStrategy,
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
      await refreshDashboard(true, {
        refreshBot: true,
        refreshBalance: true,
        refreshTrades: true,
      });
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

      await refreshDashboard(true, {
        refreshBot: false,
        refreshBalance: false,
        refreshTrades: false,
        refreshBilling: true,
      });

      showNotice("IMALI discount applied.");
    } catch (err) {
      showError(err?.message || "Unable to apply IMALI discount.");
    }
  }, [refreshDashboard, showNotice, showError]);

  const goToSettings = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  const handleEmailCapture = useCallback((email) => {
    // Store email for marketing
    localStorage.setItem('imali_marketing_email', email);
    toast.success('Thanks for subscribing! 🎉');
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);

      if (visible) {
        refreshDashboard(true, {
          refreshBot: true,
          refreshBalance: true,
          refreshTrades: true,
          refreshStrategies: true,
          refreshProfile: true,
          refreshBilling: true,
          refreshCandles: true,
          refreshReferral: true,
          refreshAnalysis: true,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refreshDashboard]);

  useEffect(() => {
    mountedRef.current = true;

    const loadCritical = async () => {
      await Promise.allSettled([
        fetchUser(),
        fetchBotStatus(),
        fetchCandles(),
        fetchReferral(),
        fetchAnalysis(),
      ]);

      dispatch({ type: ACTIONS.SET_LOADING, payload: false });

      await Promise.allSettled([
        fetchBalance(),
        fetchIntegrationStatus(),
      ]);

      setTimeout(() => {
        if (mountedRef.current) {
          Promise.allSettled([
            fetchTradeFeed(),
            fetchStats(),
            fetchPositions(),
            fetchImali(),
            fetchStrategies(),
          ]);
        }
      }, 500);
    };

    loadCritical();

    if (user) {
      intervalsRef.current.bot = window.setInterval(() => {
        if (mountedRef.current && isVisible && user) {
          refreshDashboard(false, {
            refreshBot: true,
            refreshBalance: false,
            refreshTrades: false,
          });
        }
      }, POLL_INTERVALS.BOT_STATUS);

      intervalsRef.current.balance = window.setInterval(() => {
        if (mountedRef.current && isVisible && user) {
          refreshDashboard(false, {
            refreshBot: false,
            refreshBalance: true,
            refreshTrades: false,
          });
        }
      }, POLL_INTERVALS.BALANCES);

      intervalsRef.current.trades = window.setInterval(() => {
        if (mountedRef.current && isVisible && user) {
          refreshDashboard(false, {
            refreshBot: false,
            refreshBalance: false,
            refreshTrades: true,
          });
        }
      }, POLL_INTERVALS.TRADES);

      intervalsRef.current.candles = window.setInterval(() => {
        if (mountedRef.current && isVisible && user) {
          refreshDashboard(false, {
            refreshBot: false,
            refreshBalance: false,
            refreshTrades: false,
            refreshCandles: true,
          });
        }
      }, POLL_INTERVALS.CANDLES);
    }

    return () => {
      mountedRef.current = false;

      Object.values(intervalsRef.current).forEach((interval) => {
        if (interval) window.clearInterval(interval);
      });

      abortControllersRef.current.forEach((controller) => {
        controller.abort();
      });
      abortControllersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (previousActiveType === undefined) return;
    if (state.activeType === previousActiveType) return;

    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        refreshDashboard(true, {
          refreshBot: true,
          refreshBalance: true,
          refreshTrades: true,
          refreshCandles: true,
          refreshAnalysis: true,
        });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [state.activeType, previousActiveType, refreshDashboard]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (state.loading && !state.lastUpdated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <FaSpinner className="animate-spin text-5xl text-cyan-300 mx-auto" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-white pb-10 overflow-x-hidden">
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

        <header className="relative border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-cyan-400/10 grid place-items-center text-3xl">
                🚀
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-black leading-none text-white">IMALI</h1>
                <p className="text-xs tracking-[0.24em] text-white/50 font-black mt-1 truncate">
                  AI TRADING PLATFORM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => goToSettings("/billing")}
                className="shrink-0 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 font-black transition flex items-center gap-2 text-white"
              >
                <FaCog className="inline" />
                Settings
              </button>

              <button
                onClick={logout}
                aria-label="Logout"
                className="shrink-0 rounded-2xl bg-red-500 px-4 py-3 font-black hover:bg-red-400 transition text-white"
              >
                <FaSignOutAlt className="inline mr-2" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-4 py-6 space-y-5">
          {state.error && (
            <GlassCard className="border-red-500/40 bg-red-500/10" gradient="from-red-500/10 to-red-500/10">
              <p className="text-red-200">{state.error}</p>
            </GlassCard>
          )}

          {state.notice && (
            <GlassCard className="border-emerald-500/40 bg-emerald-500/10" gradient="from-emerald-500/10 to-emerald-500/10">
              <p className="text-emerald-200">{state.notice}</p>
            </GlassCard>
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
                  <h2 className="text-2xl font-black text-white">
                    Welcome, {user?.displayName || user?.name || user?.firstName || "Trader"}
                  </h2>
                  <span className={`rounded-lg px-2 py-1 text-xs font-black ${accountStatus.bg} ${accountStatus.border} ${accountStatus.color}`}>
                    {accountStatus.icon} {accountStatus.label}
                  </span>
                  {state.refreshing && (
                    <span className="text-xs text-cyan-300">
                      <FaSpinner className="inline animate-spin mr-1" />
                      Updating
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-1">{accountStatus.message}</p>
                <p className="text-sm text-white/50 truncate">{user?.email || "Member"}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill running={state.botRunning} />
                  <ModePill mode={state.botMode} />
                </div>
              </div>
            </div>
          </section>

          {/* Settings Tabs - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SETTINGS_TABS.slice(0, 4).map((tab) => (
                <SettingsTab
                  key={tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  onClick={() => goToSettings(tab.route)}
                  active={tab.id === activeSettingsTab}
                />
              ))}
            </div>
          </GlassCard>

          {/* Upgrade Prompt - Specific messaging */}
          {effectiveTier !== "elite" && effectiveTier !== "enterprise" && (
            <UpgradePrompt 
              currentTier={effectiveTier} 
              onUpgrade={() => navigate("/billing")}
            />
          )}

          {/* Billing Incomplete Warning */}
          {state.userTier !== "starter" && !hasPaidAccess && (
            <GlassCard className="border-amber-500/30 bg-amber-500/10" gradient="from-amber-500/10 to-amber-500/10">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-black text-amber-300">
                    {state.userTier.toUpperCase()} Plan Selected — Billing Incomplete
                  </h3>
                  <p className="text-white/60 mt-1">
                    Demo trading is still available. Add a payment method to activate {state.userTier} live features.
                  </p>
                  <button
                    onClick={() => navigate("/billing", { state: { tier: state.userTier, updateCard: true } })}
                    className="mt-3 rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-3 font-black transition text-white"
                  >
                    💳 Add Payment Method
                  </button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Trading Types - Glass style */}
          <GlassCard className="overflow-hidden" gradient="from-white/5 to-white/5">
            <div className="grid grid-cols-4">
              {visibleTradingTypes.map((tab) => {
                const locked = !hasTierAccess(effectiveTier, tab.minTier);
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
          </GlassCard>

          {/* Connection Card */}
          {starterPaperOnly ? (
            <GlassCard className="border-emerald-500/30 bg-emerald-500/10" gradient="from-emerald-500/10 to-emerald-500/10">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                  <FaCheckCircle />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Demo Trading Ready</h3>
                  <p className="text-sm text-emerald-100/80">
                    No exchange API key or credit card is required for demo trading.
                  </p>
                </div>
              </div>
            </GlassCard>
          ) : (
            <ConnectionCard
              activeTab={activeTab}
              connection={activeConnection}
              isLocked={isLocked}
              needsReconnect={needsReconnect}
              userTier={effectiveTier}
              onConnect={handleConnect}
              onUpgrade={() => navigate("/billing")}
              lastUpdated={state.lastUpdated}
            />
          )}

          {starterPaperOnly && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-300 text-sm">
              Demo accounts support paper trading only. Upgrade to Pro for live trading.
            </div>
          )}

          {/* Account Overview - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <div>
                <h3 className="text-xl font-black text-white">Account Overview</h3>
                <p className="mt-6 text-sm text-white/50">Total Assets Value</p>
                <p className="mt-2 text-5xl font-black text-white">
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
                      <p className="text-xl sm:text-2xl font-black text-white">
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
          </GlassCard>

          {/* Assets - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Assets</h3>
              <button
                onClick={() =>
                  refreshDashboard(true, {
                    refreshBot: true,
                    refreshBalance: true,
                    refreshTrades: true,
                  })
                }
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
              <div className="rounded-2xl bg-black/25 py-10 text-center text-white/40">
                {isConnected
                  ? "No assets detected yet"
                  : "Connect account to load assets"}
              </div>
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
                      <p className="font-black text-white">Small balances</p>
                      <p className="text-sm text-white/40">
                        {smallBalancesCount} assets under $0.50
                      </p>
                    </div>
                    <FaArrowRight className="text-white/40" />
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Candlestick Chart - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">Market Candles</h3>
                <p className="text-xs sm:text-sm text-white/40">
                  {state.candlesSource === "simulated" ? "📊 Simulated market data" : 
                   state.candlesSource === "live" ? "🔴 Live market data" : 
                   "⚠️ Market data unavailable"}
                </p>
              </div>
              <span className="text-[10px] sm:text-xs text-white/30">
                {state.candlesSource === "simulated" ? "🟡 DEMO MODE" : 
                 state.candlesSource === "live" ? "🔴 LIVE" : 
                 "⚪ UNAVAILABLE"}
              </span>
            </div>

            {state.candlesLoading ? (
              <div className="grid h-[200px] sm:h-[250px] md:h-[300px] place-items-center rounded-2xl bg-black/25">
                <FaSpinner className="animate-spin text-2xl sm:text-3xl text-cyan-300" />
              </div>
            ) : state.candles.length ? (
              <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/30 p-1.5 sm:p-2">
                <CandlestickChart
                  data={state.candles}
                  liveCandle={state.candles[state.candles.length - 1]}
                  height={window.innerWidth < 640 ? 250 : window.innerWidth < 768 ? 300 : 360}
                />
              </div>
            ) : (
              <div className="grid h-[200px] sm:h-[250px] md:h-[300px] place-items-center rounded-xl sm:rounded-2xl bg-black/25 text-center text-white/40 p-4">
                <div>
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📊</div>
                  <p className="text-sm sm:text-base">No market candle data available.</p>
                  <p className="text-xs sm:text-sm text-white/30 mt-1">
                    {state.candlesSource === "none" ? "Loading candles..." : "Connect an exchange to see live candles"}
                  </p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Live Trade Feed - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <FaChartLine className="text-emerald-300" />
                <h3 className="text-xl font-black text-white">Live Trade Feed</h3>
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
                  <TradeItem key={trade.id} trade={trade} />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Active Bot + Performance - Glass style */}
          <div className="grid gap-5 lg:grid-cols-2">
            <GlassCard gradient="from-white/5 to-white/5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white">Active Bot</h3>
                <span className="text-cyan-300 text-2xl">
                  <FaRobot />
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-4xl shrink-0">
                  {state.currentStrategy.icon}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-2xl font-black text-white">
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
                <div>
                  <p className="text-white/40">Market</p>
                  <p className="font-black text-white">{activeTab.label}</p>
                </div>
                <div>
                  <p className="text-white/40">Mode</p>
                  <p className="font-black text-white">{state.botMode.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-white/40">Positions</p>
                  <p className="font-black text-white">
                    {state.openPositionsCount} / {state.currentStrategy.maxPositions || 5}
                  </p>
                </div>
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
                      ? "Start Demo Bot"
                      : "Start Bot"}
                  </button>
                ) : (
                  <button
                    onClick={handleStopBot}
                    disabled={state.processing}
                    className="w-full rounded-2xl bg-red-500 py-4 font-black hover:bg-red-400 disabled:opacity-50 transition text-white"
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
            </GlassCard>

            <GlassCard gradient="from-white/5 to-white/5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white">Performance</h3>
                <span className="text-cyan-300 text-2xl">
                  <FaChartLine />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-sm text-white/40">Realized PnL</p>
                  <p className={`mt-2 text-2xl font-black ${
                    state.stats.realizedPnl >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}>
                    {formatMoney(state.stats.realizedPnl)}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-sm text-white/40">Total PnL</p>
                  <p className={`mt-2 text-2xl font-black ${
                    state.stats.totalPnl >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}>
                    {formatMoney(state.stats.totalPnl)}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-sm text-white/40">Total Trades</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {Number(state.stats.totalTrades || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-sm text-white/40">Win Rate</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatPercent(winRate)}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* AI Thinking Panel */}
          <AIThinkingPanel 
            strategy={state.currentStrategy} 
            stats={state.stats} 
            effectiveTier={effectiveTier}
          />

          {/* Referral Card */}
          <ReferralCard 
            referralData={state.referral} 
            user={user} 
          />

          {/* Email Capture Card (only for demo users) */}
          {effectiveTier === "starter" && (
            <EmailCaptureCard onSubmit={handleEmailCapture} />
          )}

          {/* Available Bot Strategies - Glass style */}
          <GlassCard gradient="from-white/5 to-white/5">
            <h3 className="mb-5 text-xl sm:text-2xl font-black text-white">
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
          </GlassCard>

          {/* IMALI Utility + Upgrade - Glass style */}
          <div className="grid gap-5 lg:grid-cols-2">
            <GlassCard className="border-emerald-500/30 bg-emerald-500/10" gradient="from-emerald-500/10 to-emerald-500/10">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-black text-white">IMALI Utility</h3>
                <FaCoins className="text-2xl text-emerald-300" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniBox
                  label="Balance"
                  value={`${num(state.imali.balance).toLocaleString()} IMALI`}
                />
                <MiniBox label="Discount" value={formatPercent(state.imali.discountPct)} />
                <MiniBox label="Status" value={state.imali.discountActive ? "Active" : "Inactive"} />
              </div>

              <p className="mt-4 text-sm text-white/60">
                Hold IMALI for platform discounts, lower fees, early access, and future
                ecosystem benefits.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => goToSettings("/buy-imali")}
                  className="rounded-2xl bg-emerald-500 py-3 font-black text-black hover:bg-emerald-400 transition"
                >
                  Buy IMALI
                </button>

                <button
                  onClick={handleApplyImaliDiscount}
                  className="rounded-2xl bg-white/10 py-3 font-black hover:bg-white/15 transition text-white"
                >
                  Apply Discount
                </button>
              </div>
            </GlassCard>

            <GlassCard className="border-purple-500/30 bg-purple-500/10 flex flex-col justify-between gap-4" gradient="from-purple-500/10 to-purple-500/10">
              <div>
                <h3 className="font-black text-2xl text-white">Unlock More Power</h3>
                <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                  Upgrade to Elite for Futures, DEX sniper bots, advanced AI
                  strategies, and priority support.
                </p>
              </div>

              <button
                onClick={() => goToSettings("/billing")}
                className="rounded-2xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400 transition text-white"
              >
                <FaCrown className="inline mr-2" />
                Upgrade Now
              </button>
            </GlassCard>
          </div>
        </main>

        <DebugPanel state={state} />
      </div>
    </DashboardErrorBoundary>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}