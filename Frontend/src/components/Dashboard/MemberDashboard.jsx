// src/components/Dashboard/MemberDashboard.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "react-icons/fa";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

const POLL_MS = 7000;

const TIER_RANK = {
  starter: 0,
  free: 0,
  trial: 0,
  common: 0,
  pro: 1,
  rare: 1,
  stock: 1,
  elite: 2,
  epic: 2,
  legendary: 3,
  bundle: 3,
  enterprise: 4,
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
const normalizeMode = (mode) => (String(mode || "paper").toLowerCase() === "live" ? "live" : "paper");
const formatMoney = (value) => `$${num(value).toFixed(2)}`;
const formatPercent = (value) => `${num(value).toFixed(1)}%`;
const tierRank = (tier) => TIER_RANK[normalizeTier(tier)] ?? 0;
const hasTierAccess = (userTier, minTier) => tierRank(userTier) >= tierRank(minTier);

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

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [userTier, setUserTier] = useState("starter");
  const [activeType, setActiveType] = useState("crypto");

  const [strategies, setStrategies] = useState(FALLBACK_STRATEGIES);
  const [currentStrategy, setCurrentStrategy] = useState(FALLBACK_STRATEGIES[1]);

  const [botRunning, setBotRunning] = useState(false);
  const [botMode, setBotMode] = useState("paper");

  const [connections, setConnections] = useState({
    okx: { connected: false, mode: "paper", keyMasked: "" },
    alpaca: { connected: false, mode: "paper", keyMasked: "" },
    wallet: { connected: false, mode: "live", keyMasked: "" },
  });

  const [totalAssetValue, setTotalAssetValue] = useState(0);
  const [usdCashValue, setUsdCashValue] = useState(0);
  const [usdtValue, setUsdtValue] = useState(0);
  const [usdtQty, setUsdtQty] = useState(0);
  const [assets, setAssets] = useState([]);

  const [positions, setPositions] = useState([]);
  const [openPositionsCount, setOpenPositionsCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    realizedPnl: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
  });

  const [imali, setImali] = useState({
    balance: 0,
    discountPct: 0,
    discountActive: false,
  });

  const activeTab = useMemo(
    () => TRADING_TYPES.find((item) => item.id === activeType) || TRADING_TYPES[0],
    [activeType]
  );

  const activeConnection = connections[activeTab.connectionKey];
  const isLocked = !hasTierAccess(userTier, activeTab.minTier);
  const isConnected = Boolean(activeConnection?.connected);
  const needsReconnect = !isConnected && !isLocked;

  const winRate = useMemo(() => {
    const total = num(stats.wins) + num(stats.losses);
    return total ? (num(stats.wins) / total) * 100 : 0;
  }, [stats.wins, stats.losses]);

  const visibleAssets = useMemo(() => {
    const base = [];

    if (usdCashValue > 0) {
      base.push({
        symbol: "USD",
        name: "Cash",
        quantity: usdCashValue,
        value: usdCashValue,
      });
    }

    if (usdtValue > 0) {
      base.push({
        symbol: "USDT",
        name: "Tether",
        quantity: usdtQty || usdtValue,
        value: usdtValue,
      });
    }

    return [...base, ...assets]
      .filter((asset) => num(asset.value) >= 0.5)
      .sort((a, b) => num(b.value) - num(a.value));
  }, [assets, usdCashValue, usdtValue, usdtQty]);

  const smallBalancesCount = useMemo(
    () => assets.filter((asset) => num(asset.value) > 0 && num(asset.value) < 0.5).length,
    [assets]
  );

  const donutData = useMemo(
    () => ({
      labels: ["Wins", "Losses"],
      datasets: [
        {
          data: [num(stats.wins), num(stats.losses)],
          backgroundColor: ["#4ade80", "#f43f5e"],
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    }),
    [stats.wins, stats.losses]
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
    const symbol = String(asset.ccy || asset.currency || asset.symbol || asset.asset || "").toUpperCase();

    return {
      symbol,
      name: ASSET_NAMES[symbol] || symbol,
      quantity: num(asset.available ?? asset.amount ?? asset.bal ?? asset.balance ?? asset.qty ?? asset.quantity),
      value: num(asset.usdValue ?? asset.usd_value ?? asset.value ?? asset.totalUsd ?? asset.total_usd ?? asset.eqUsd),
    };
  }, []);

  const getStrategy = useCallback(
    (id) => strategies.find((s) => s.id === id) || strategies[1] || FALLBACK_STRATEGIES[1],
    [strategies]
  );

  const fetchUser = useCallback(async () => {
    const res = await BotAPI.getMe?.(true);
    const d = unwrapData(res);
    const u = d.user || d;
    setUserTier(normalizeTier(u?.tier || user?.tier || "starter"));
  }, [user]);

  const fetchStrategies = useCallback(async () => {
    const res = await BotAPI.getStrategyConfigs?.(true);
    const d = unwrapData(res);
    const raw = d.data || d.strategies || d;

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
      icon: id === "mean_reversion" ? "🛡️" : id === "ai_weighted" ? "🤖" : id === "momentum" ? "📈" : "🔥",
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

    if (mapped.length) {
      setStrategies(mapped);
      setCurrentStrategy((prev) => mapped.find((s) => s.id === prev.id) || mapped[1] || mapped[0]);
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    const res = await BotAPI.getTradingBotStatus?.(true);
    const d = unwrapData(res);
    const list = d.bots || d.data || [];

    const bot =
      d.activeBot ||
      list.find?.((item) => item.category === activeTab.categoryId || item.exchange === activeTab.exchange) ||
      list[0] ||
      null;

    const running =
      d.isRunning === true ||
      bot?.isRunning === true ||
      bot?.running === true ||
      String(bot?.status || "").toLowerCase() === "running";

    setBotRunning(Boolean(running));

    if (bot?.mode) setBotMode(normalizeMode(bot.mode));
    if (bot?.strategy) setCurrentStrategy(getStrategy(bot.strategy));

    const botPositions = num(bot?.openPositions ?? bot?.open_positions);
    if (botPositions > 0) setOpenPositionsCount(botPositions);
  }, [activeTab, getStrategy]);

  const fetchIntegrationStatus = useCallback(async () => {
    const res = await BotAPI.getIntegrationStatus?.(true);
    const d = unwrapData(res);

    setConnections({
      okx: {
        connected: Boolean(d.okx_connected),
        mode: normalizeMode(d.okx_mode),
        keyMasked: d.okx_api_key_masked || "",
      },
      alpaca: {
        connected: Boolean(d.alpaca_connected),
        mode: normalizeMode(d.alpaca_mode),
        keyMasked: d.alpaca_api_key_masked || "",
      },
      wallet: {
        connected: Boolean(d.wallet_connected),
        mode: "live",
        keyMasked: d.wallet_address_masked || "",
      },
    });

    if (activeTab.connectionKey === "okx") setBotMode(normalizeMode(d.okx_mode));
    if (activeTab.connectionKey === "alpaca") setBotMode(normalizeMode(d.alpaca_mode));
  }, [activeTab.connectionKey]);

  const fetchBalance = useCallback(async () => {
    const res = await BotAPI.getExchangeBalance?.(true);
    const d = unwrapData(res);

    if (activeTab.exchange === "okx") {
      const rawAssets = Array.isArray(d.okx_assets) ? d.okx_assets : [];
      const normalized = rawAssets.map(normalizeAsset).filter((asset) => asset.symbol);

      const usdtAsset = normalized.find((asset) => asset.symbol === "USDT");
      const otherAssets = normalized.filter((asset) => !["USD", "USDT"].includes(asset.symbol));

      const okxTotal = num(d.okx_total ?? d.okx ?? d.total);
      const usdtAvailable = num(d.okx_available_usdt ?? usdtAsset?.value);
      const usdtQuantity = num(usdtAsset?.quantity ?? usdtAvailable);
      const otherAssetsTotal = otherAssets.reduce((sum, asset) => sum + num(asset.value), 0);

      const usdAsset = normalized.find((asset) => asset.symbol === "USD");
      const inferredUsd =
        okxTotal > otherAssetsTotal + usdtAvailable
          ? okxTotal - otherAssetsTotal - usdtAvailable
          : 0;

      const usdCash = num(usdAsset?.value) || inferredUsd;
      const total = okxTotal || usdCash + usdtAvailable + otherAssetsTotal;

      setUsdCashValue(usdCash);
      setUsdtValue(usdtAvailable);
      setUsdtQty(usdtQuantity);
      setAssets(otherAssets);
      setTotalAssetValue(total);
      return;
    }

    if (activeTab.exchange === "alpaca") {
      const rawAssets = Array.isArray(d.alpaca_assets) ? d.alpaca_assets : [];
      const normalized = rawAssets.map(normalizeAsset).filter((asset) => asset.symbol);
      const cash = num(d.alpaca_available_usd ?? d.alpaca_cash ?? d.cash);
      const stocksValue = normalized.reduce((sum, asset) => sum + num(asset.value), 0);
      const total = num(d.alpaca_total ?? d.alpaca_equity ?? d.alpaca) || cash + stocksValue;

      setUsdCashValue(cash);
      setUsdtValue(0);
      setUsdtQty(0);
      setAssets(normalized);
      setTotalAssetValue(total);
      return;
    }

    setUsdCashValue(0);
    setUsdtValue(0);
    setUsdtQty(0);
    setAssets([]);
    setTotalAssetValue(0);
  }, [activeTab.exchange, normalizeAsset]);

  const fetchPositions = useCallback(async () => {
    const res = await BotAPI.getOpenPositions?.(activeTab.exchange, true);
    const d = unwrapData(res);
    const list = d.positions || [];
    setPositions(list);
    setOpenPositionsCount(list.length);
  }, [activeTab.exchange]);

  const fetchStats = useCallback(async () => {
    const res = await BotAPI.getLiveTradingStats?.(activeTab.exchange, true);
    const d = unwrapData(res);
    const s = d.summary || d;

    setStats({
      realizedPnl: num(s.realized_pnl ?? s.realizedPnl ?? s.total_pnl),
      totalPnl: num(s.total_pnl ?? s.totalPnl ?? s.realized_pnl),
      wins: num(s.wins),
      losses: num(s.losses),
      totalTrades: num(s.total_trades ?? s.totalTrades),
    });

    const open = num(s.open_positions ?? s.openPositions);
    if (open > 0) setOpenPositionsCount(open);
  }, [activeTab.exchange]);

  const fetchImali = useCallback(async () => {
    const balance = unwrapData(await BotAPI.getImaliBalance?.());
    const discount = unwrapData(await BotAPI.getImaliDiscountStatus?.());

    setImali({
      balance: num(balance.balance ?? balance.imali_balance),
      discountPct: num(discount.discountPct ?? discount.discount_pct),
      discountActive: Boolean(discount.active ?? discount.discountActive),
    });
  }, []);

  const refreshDashboard = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);

        await Promise.all([
          fetchUser(),
          fetchStrategies(),
          fetchBotStatus(),
          fetchIntegrationStatus(),
          fetchBalance(),
          fetchPositions(),
          fetchStats(),
          fetchImali(),
        ]);

        if (!mountedRef.current) return;
        setLastUpdated(new Date());
        setError("");
      } catch (err) {
        console.error("Dashboard refresh error:", err);
        if (mountedRef.current) setError(err?.message || "Dashboard refresh failed.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchUser, fetchStrategies, fetchBotStatus, fetchIntegrationStatus, fetchBalance, fetchPositions, fetchStats, fetchImali]
  );

  useEffect(() => {
    mountedRef.current = true;

    refreshDashboard(false);

    const interval = setInterval(() => {
      refreshDashboard(false);
    }, POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    refreshDashboard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  const handleConnect = () => {
    if (isLocked) navigate("/billing-dashboard");
    else navigate(activeTab.connectRoute);
  };

  const handleStartBot = async () => {
    if (isLocked) return navigate("/billing-dashboard");
    if (!isConnected) return navigate(activeTab.connectRoute);

    setProcessing(true);

    try {
      const config = {
        takeProfitPct: currentStrategy.takeProfitPct,
        stopLossPct: currentStrategy.stopLossPct,
      };

      const res =
        (await BotAPI.startTradingBotByCategory?.(activeTab.categoryId, currentStrategy.id, botMode, config)) ||
        (await BotAPI.startTradingBot?.(activeTab.exchange, currentStrategy.id, botMode, activeTab.categoryId, config));

      if (res?.success === false) {
        alert(res?.error || "Failed to start bot.");
        return;
      }

      await refreshDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to start bot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleStopBot = async () => {
    setProcessing(true);

    try {
      const res =
        (await BotAPI.stopTradingBotByCategory?.(activeTab.categoryId)) ||
        (await BotAPI.stopTradingBot?.(activeTab.exchange));

      if (res?.success === false) {
        alert(res?.error || "Failed to stop bot.");
        return;
      }

      await refreshDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to stop bot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyImaliDiscount = async () => {
    const res = await BotAPI.applyImaliDiscount?.();

    if (res?.success === false) {
      alert(res?.error || "Unable to apply IMALI discount.");
      return;
    }

    await refreshDashboard(true);
    alert("IMALI discount applied.");
  };

  if (loading && !lastUpdated) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-5xl text-cyan-300" />
      </div>
    );
  }

  return (
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
            className="shrink-0 rounded-2xl bg-red-500 px-4 py-3 font-black hover:bg-red-400"
          >
            <FaSignOutAlt className="inline mr-2" />
            Logout
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 space-y-5">
        {error && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <section>
          <p className="text-white/50">Welcome back,</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black">IMALI Trader</h2>
            <span className="rounded-lg bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300">
              {normalizeTier(userTier).toUpperCase()} PLAN
            </span>
            {refreshing && (
              <span className="text-xs text-cyan-300">
                <FaSpinner className="inline animate-spin mr-1" />
                Updating
              </span>
            )}
          </div>
          <p className="text-sm text-white/50 truncate">{user?.email || "Member"}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill running={botRunning} />
            <ModePill mode={botMode} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-4">
            {TRADING_TYPES.map((tab) => {
              const locked = !hasTierAccess(userTier, tab.minTier);
              const active = activeType === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id)}
                  className={`relative min-w-0 px-1 py-4 text-center font-black transition ${
                    active ? "bg-cyan-400/10 text-white" : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className={`text-xl ${active ? "text-cyan-300" : ""}`}>{tab.icon}</span>
                    <span className="text-[11px] sm:text-base leading-none">{tab.label}</span>
                    {locked && <FaLock className="text-[10px] text-white/40" />}
                  </div>
                  {active && <div className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-cyan-300" />}
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
          userTier={userTier}
          onConnect={handleConnect}
          onUpgrade={() => navigate("/billing-dashboard")}
          lastUpdated={lastUpdated}
        />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <h3 className="text-xl font-black">Account Overview</h3>
              <p className="mt-6 text-sm text-white/50">Total Assets Value</p>
              <p className="mt-2 text-5xl font-black">{formatMoney(totalAssetValue)}</p>

              <p className={`mt-3 font-black ${stats.totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}
                {formatMoney(stats.totalPnl)} realized
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniBox label="Open Positions" value={openPositionsCount} />
                <MiniBox label="USD Cash" value={formatMoney(usdCashValue)} />
                <MiniBox label="USDT" value={formatMoney(usdtValue)} />
              </div>
            </div>

            <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[140px_1fr] items-center gap-4">
              <div className="relative h-[130px] sm:h-[140px]">
                <Doughnut data={donutData} options={donutOptions} />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-xl sm:text-2xl font-black">{formatPercent(winRate)}</p>
                    <p className="text-xs text-white/60">Win Rate</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <LegendRow label="Wins" value={stats.wins} color="bg-emerald-400" />
                <LegendRow label="Losses" value={stats.losses} color="bg-red-400" />
                <LegendRow label="Trades" value={stats.totalTrades} color="bg-white/40" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-black">Assets</h3>
            <button
              onClick={() => refreshDashboard(true)}
              disabled={refreshing}
              className="text-cyan-300 font-black disabled:opacity-50"
            >
              {refreshing ? <FaSpinner className="animate-spin inline mr-2" /> : <FaSyncAlt className="inline mr-2" />}
              Refresh
            </button>
          </div>

          {visibleAssets.length === 0 ? (
            <Empty text={isConnected ? "No assets detected yet" : "Connect account to load assets"} />
          ) : (
            <div className="space-y-4">
              {visibleAssets.map((asset) => (
                <AssetRow key={`${asset.symbol}-${asset.value}`} asset={asset} total={totalAssetValue} />
              ))}

              {smallBalancesCount > 0 && (
                <div className="mt-4 rounded-2xl bg-black/25 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-black">Small balances</p>
                    <p className="text-sm text-white/40">{smallBalancesCount} assets under $0.50</p>
                  </div>
                  <FaArrowRight className="text-white/40" />
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Active Bot" icon={<FaRobot />}>
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{currentStrategy.icon}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-2xl font-black">{currentStrategy.name}</h4>
                  <span className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-black text-red-300">
                    {currentStrategy.risk}
                  </span>
                </div>
                <p className="text-white/50">{currentStrategy.description}</p>
              </div>
            </div>

            <div className="my-5 h-px bg-white/10" />

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <BotInfo label="Market" value={activeTab.label} />
              <BotInfo label="Mode" value={botMode.toUpperCase()} />
              <BotInfo label="Positions" value={`${openPositionsCount} / ${currentStrategy.maxPositions || 5}`} />
            </div>

            <div className="mt-5">
              {!botRunning ? (
                <button
                  onClick={handleStartBot}
                  disabled={processing}
                  className={`w-full rounded-2xl py-4 font-black disabled:opacity-50 ${
                    isLocked || !isConnected
                      ? "bg-cyan-500 text-black hover:bg-cyan-400"
                      : "bg-emerald-500 text-black hover:bg-emerald-400"
                  }`}
                >
                  {processing ? (
                    <FaSpinner className="animate-spin inline mr-2" />
                  ) : isLocked ? (
                    <FaLock className="inline mr-2" />
                  ) : !isConnected ? (
                    <FaPlug className="inline mr-2" />
                  ) : (
                    <FaPlay className="inline mr-2" />
                  )}
                  {isLocked ? "Upgrade to Unlock" : !isConnected ? "Connect to Start" : "Start Bot"}
                </button>
              ) : (
                <button
                  onClick={handleStopBot}
                  disabled={processing}
                  className="w-full rounded-2xl bg-red-500 py-4 font-black hover:bg-red-400 disabled:opacity-50"
                >
                  {processing ? <FaSpinner className="animate-spin inline mr-2" /> : <FaStop className="inline mr-2" />}
                  Stop Bot
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Performance" icon={<FaChartLine />}>
            <div className="grid grid-cols-2 gap-3">
              <SmallStat title="Realized PnL" value={formatMoney(stats.realizedPnl)} pnl />
              <SmallStat title="Total PnL" value={formatMoney(stats.totalPnl)} pnl />
              <SmallStat title="Total Trades" value={Number(stats.totalTrades || 0).toLocaleString()} />
              <SmallStat title="Win Rate" value={formatPercent(winRate)} />
            </div>
          </Panel>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-5 text-xl sm:text-2xl font-black">Available Bot Strategies</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                selected={currentStrategy.id === strategy.id}
                onClick={() => setCurrentStrategy(strategy)}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <ImaliCard
            imali={imali}
            onBuy={() => navigate("/buy-imali")}
            onApply={handleApplyImaliDiscount}
          />

          <section className="rounded-[2rem] border border-purple-500/30 bg-purple-500/10 p-5 flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-black text-2xl">Unlock More Power</h3>
              <p className="text-sm sm:text-base text-white/60 leading-relaxed">
                Upgrade to Elite for Futures, DEX sniper bots, advanced AI strategies, and priority support.
              </p>
            </div>

            <button
              onClick={() => navigate("/billing-dashboard")}
              className="rounded-2xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400"
            >
              <FaCrown className="inline mr-2" />
              Upgrade Now
            </button>
          </section>
        </section>
      </main>
    </div>
  );
}

function MiniBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-black/25 p-3 sm:p-4">
      <p className="text-xs sm:text-sm text-white/40">{label}</p>
      <p className="mt-2 font-black text-sm sm:text-base">{value}</p>
    </div>
  );
}

function StrategyCard({ strategy, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-3xl leading-none">{strategy.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-black leading-tight break-words">{strategy.name}</p>
            <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200 whitespace-nowrap">
              {strategy.risk}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/50">{strategy.description}</p>

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

function ConnectionCard({ activeTab, connection, isLocked, needsReconnect, userTier, onConnect, onUpgrade, lastUpdated }) {
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
            {isLocked ? <FaLock /> : needsReconnect ? <FaExclamationTriangle /> : <FaCheckCircle />}
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black">{activeTab.connectionLabel}</h3>
            {isLocked ? (
              <p className="text-sm text-white/60">
                {activeTab.label} trading requires {activeTab.minTier.toUpperCase()} plan or higher.
                Current plan: {normalizeTier(userTier).toUpperCase()}.
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
              Last checked: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Not checked yet"}
            </p>
          </div>
        </div>

        <button
          onClick={isLocked ? onUpgrade : onConnect}
          className={`rounded-2xl px-5 py-3 font-black ${
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
      <FaCircle className={`inline mr-2 h-2 w-2 ${running ? "text-emerald-300" : "text-white/40"}`} />
      {running ? "BOT RUNNING" : "BOT OFF"}
    </div>
  );
}

function ModePill({ mode }) {
  return (
    <div
      className={`rounded-full border px-4 py-2 text-xs font-black tracking-widest ${
        mode === "live"
          ? "border-red-400/40 bg-red-400/10 text-red-300"
          : "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
      }`}
    >
      {mode.toUpperCase()} MODE
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
      <div className="h-12 w-12 shrink-0 rounded-full bg-cyan-400/20 grid place-items-center text-xl font-black text-cyan-200">
        {getAssetIcon(asset.symbol)}
      </div>

      <div className="min-w-0">
        <p className="font-black truncate">{asset.symbol}</p>
        <p className="text-sm text-white/45 truncate">{asset.name}</p>
      </div>

      <div className="text-right">
        <p className="font-black">{formatMoney(asset.value)}</p>
        <p className="text-sm text-white/40">
          {num(asset.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })}
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
  const color = pnl ? (numeric >= 0 ? "text-emerald-300" : "text-red-300") : "text-white";

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
        <MiniBox label="Balance" value={`${num(imali.balance).toLocaleString()} IMALI`} />
        <MiniBox label="Discount" value={formatPercent(imali.discountPct)} />
        <MiniBox label="Status" value={imali.discountActive ? "Active" : "Inactive"} />
      </div>

      <p className="mt-4 text-sm text-white/60">
        Hold IMALI for platform discounts, lower fees, early access, and future ecosystem benefits.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={onBuy} className="rounded-2xl bg-emerald-500 py-3 font-black text-black hover:bg-emerald-400">
          Buy IMALI
        </button>
        <button onClick={onApply} className="rounded-2xl bg-white/10 py-3 font-black hover:bg-white/15">
          Apply Discount
        </button>
      </div>
    </section>
  );
}

function Empty({ text }) {
  return <div className="rounded-2xl bg-black/25 py-10 text-center text-white/40">{text}</div>;
}