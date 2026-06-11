// src/components/Dashboard/MemberDashboard.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay,
  FaStop,
  FaSpinner,
  FaSignOutAlt,
  FaCircle,
  FaWallet,
  FaChartLine,
  FaRobot,
  FaLock,
  FaCrown,
  FaArrowRight,
  FaSyncAlt,
  FaPlug,
  FaBitcoin,
  FaApple,
  FaFire,
  FaWater,
} from "react-icons/fa";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const POLL_MS = 7000;

const TIER_RANK = {
  starter: 0,
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
    label: "Crypto",
    icon: <FaBitcoin />,
    exchange: "okx",
    minTier: "starter",
    connectRoute: "/connect-okx",
  },
  {
    id: "stocks",
    label: "Stocks",
    icon: <FaApple />,
    exchange: "alpaca",
    minTier: "pro",
    connectRoute: "/connect-alpaca",
  },
  {
    id: "futures",
    label: "Futures",
    icon: <FaChartLine />,
    exchange: "okx",
    minTier: "elite",
    connectRoute: "/billing-dashboard",
  },
  {
    id: "dex",
    label: "DEX",
    icon: <FaWater />,
    exchange: "sniper",
    minTier: "elite",
    connectRoute: "/billing-dashboard",
  },
];

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slower trades focused on consistency.",
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between safety and opportunity.",
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Looks for stronger market movement.",
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "High Risk",
    description: "Fast, high-volatility opportunities.",
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
  MATIC: "Polygon",
  POL: "Polygon",
};

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatPercent = (n) => `${Number(n || 0).toFixed(1)}%`;

const normalizeMode = (mode) =>
  String(mode || "paper").toLowerCase() === "live" ? "live" : "paper";

const normalizeTier = (tier) => String(tier || "starter").toLowerCase();

const tierRank = (tier) => TIER_RANK[normalizeTier(tier)] ?? 0;

const hasTierAccess = (userTier, minTier) => tierRank(userTier) >= tierRank(minTier);

const getStrategy = (id) => STRATEGIES.find((s) => s.id === id) || STRATEGIES[1];

const getAssetIcon = (symbol) => {
  const s = String(symbol || "").toUpperCase();

  if (s === "USD") return "💵";
  if (s === "USDT") return "₮";
  if (s === "FIL") return "ƒ";
  if (s === "XRP") return "✕";
  if (s === "ICP") return "∞";
  if (s === "ETC" || s === "ETH") return "◆";
  if (s === "NEAR") return "N";
  if (s === "INJ") return "◎";
  if (s === "BTC") return "₿";
  if (s === "SOL") return "◎";

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

  const [botRunning, setBotRunning] = useState(false);
  const [botMode, setBotMode] = useState("paper");
  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]);

  const [connected, setConnected] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [cashValue, setCashValue] = useState(0);
  const [assetValue, setAssetValue] = useState(0);
  const [assets, setAssets] = useState([]);

  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    realizedPnl: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
  });

  const activeTab = useMemo(
    () => TRADING_TYPES.find((item) => item.id === activeType) || TRADING_TYPES[0],
    [activeType]
  );

  const activeExchange = activeTab.exchange;
  const isLocked = !hasTierAccess(userTier, activeTab.minTier);

  const winRate = useMemo(() => {
    const total = Number(stats.wins || 0) + Number(stats.losses || 0);
    if (!total) return 0;
    return (Number(stats.wins || 0) / total) * 100;
  }, [stats]);

  const totalAssetValue = Number(cashValue || 0) + Number(assetValue || 0);

  const visibleAssets = useMemo(() => {
    const cashAsset =
      cashValue > 0
        ? [
            {
              symbol: activeType === "stocks" ? "USD" : "USDT",
              name: activeType === "stocks" ? "Cash" : "Tether",
              quantity: cashValue,
              value: cashValue,
              changePct: null,
              isCash: true,
            },
          ]
        : [];

    return [...cashAsset, ...assets]
      .filter((asset) => Number(asset.value || 0) >= 0.5)
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  }, [assets, cashValue, activeType]);

  const smallBalancesCount = useMemo(() => {
    return assets.filter((asset) => Number(asset.value || 0) > 0 && Number(asset.value || 0) < 0.5)
      .length;
  }, [assets]);

  const donutData = useMemo(
    () => ({
      labels: ["Wins", "Losses"],
      datasets: [
        {
          data: [Number(stats.wins || 0), Number(stats.losses || 0)],
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
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
    }),
    []
  );

  const fetchUser = useCallback(async () => {
    const me = await BotAPI.getMe?.(true);
    const tier = me?.tier || me?.user?.tier || me?.plan || user?.tier || "starter";
    setUserTier(normalizeTier(tier));
  }, [user]);

  const fetchBotStatus = useCallback(async () => {
    const res = await BotAPI.getTradingBotStatus?.(true);

    const bot =
      res?.activeBot ||
      res?.data?.find?.((b) => b.exchange === activeExchange) ||
      res?.data?.[0] ||
      null;

    const running =
      res?.isRunning === true ||
      bot?.isRunning === true ||
      bot?.running === true ||
      String(bot?.status || "").toLowerCase() === "running";

    setBotRunning(Boolean(running));

    if (bot?.mode) setBotMode(normalizeMode(bot.mode));
    if (bot?.strategy) setCurrentStrategy(getStrategy(bot.strategy));
  }, [activeExchange]);

  const fetchIntegrationStatus = useCallback(async () => {
    const res = await BotAPI.getIntegrationStatus?.(true);

    if (activeExchange === "okx") {
      setConnected(Boolean(res?.okx_connected));
      setApiKeyMasked(res?.okx_api_key_masked || "");
      if (res?.okx_mode) setBotMode(normalizeMode(res.okx_mode));
      return;
    }

    if (activeExchange === "alpaca") {
      setConnected(Boolean(res?.alpaca_connected));
      setApiKeyMasked(res?.alpaca_api_key_masked || "");
      if (res?.alpaca_mode) setBotMode(normalizeMode(res.alpaca_mode));
      return;
    }

    setConnected(true);
    setApiKeyMasked("DEX Bot");
  }, [activeExchange]);

  const normalizeAsset = (asset) => {
    const symbol = String(asset.ccy || asset.symbol || asset.asset || "").toUpperCase();
    const quantity = Number(asset.available ?? asset.bal ?? asset.balance ?? asset.qty ?? asset.quantity ?? 0);
    const value = Number(asset.usdValue ?? asset.usd_value ?? asset.value ?? asset.totalUsd ?? asset.total_usd ?? 0);
    const changePct = asset.changePct ?? asset.change_pct ?? asset.pnl_pct ?? asset.pnlPercent ?? null;

    return {
      symbol,
      name: ASSET_NAMES[symbol] || symbol,
      quantity,
      value,
      changePct,
      isCash: symbol === "USD" || symbol === "USDT",
    };
  };

  const fetchBalance = useCallback(async () => {
    const res = await BotAPI.getExchangeBalance?.(true);

    if (activeExchange === "okx") {
      const okxAssets = Array.isArray(res?.okx_assets) ? res.okx_assets.map(normalizeAsset) : [];
      const cash = Number(res?.okx_available_usdt || 0);

      const nonCashAssets = okxAssets.filter((a) => a.symbol !== "USDT" && a.symbol !== "USD");
      const holdingsValue = nonCashAssets.reduce((sum, a) => sum + Number(a.value || 0), 0);

      setCashValue(cash);
      setAssetValue(holdingsValue);
      setAssets(nonCashAssets);
      return;
    }

    if (activeExchange === "alpaca") {
      const alpacaAssets = Array.isArray(res?.alpaca_assets) ? res.alpaca_assets.map(normalizeAsset) : [];
      const cash = Number(res?.alpaca_available_usd || 0);
      const holdingsValue = alpacaAssets.reduce((sum, a) => sum + Number(a.value || 0), 0);

      setCashValue(cash);
      setAssetValue(holdingsValue);
      setAssets(alpacaAssets);
      return;
    }

    setCashValue(0);
    setAssetValue(0);
    setAssets([]);
  }, [activeExchange]);

  const fetchPositions = useCallback(async () => {
    const res = await BotAPI.getOpenPositions?.(activeExchange, true);
    setPositions(Array.isArray(res?.positions) ? res.positions : []);
  }, [activeExchange]);

  const fetchStats = useCallback(async () => {
    const res = await BotAPI.getLiveTradingStats?.(activeExchange, true);
    const s = res?.summary || {};

    setStats({
      realizedPnl: Number(s.realized_pnl ?? s.realizedPnl ?? s.total_pnl ?? 0),
      totalPnl: Number(s.total_pnl ?? s.totalPnl ?? 0),
      wins: Number(s.wins ?? 0),
      losses: Number(s.losses ?? 0),
      totalTrades: Number(s.total_trades ?? s.totalTrades ?? 0),
    });
  }, [activeExchange]);

  const fetchTrades = useCallback(async () => {
    const res = await BotAPI.getLiveTradeHistory?.(20, activeExchange, true);
    setTrades(Array.isArray(res?.trades) ? res.trades.slice(0, 10) : []);
  }, [activeExchange]);

  const refreshDashboard = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);

        await Promise.all([
          fetchUser(),
          fetchBotStatus(),
          fetchIntegrationStatus(),
          fetchBalance(),
          fetchPositions(),
          fetchStats(),
          fetchTrades(),
        ]);

        setLastUpdated(new Date());
        setError("");
      } catch (err) {
        console.error("Dashboard refresh error:", err);
        setError(err?.message || "Dashboard refresh failed.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      fetchUser,
      fetchBotStatus,
      fetchIntegrationStatus,
      fetchBalance,
      fetchPositions,
      fetchStats,
      fetchTrades,
    ]
  );

  useEffect(() => {
    mountedRef.current = true;
    refreshDashboard(false);

    const interval = setInterval(() => refreshDashboard(false), POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    setLoading(true);
    refreshDashboard(false);
  }, [activeType, refreshDashboard]);

  const handleTabClick = (tab) => {
    setActiveType(tab.id);
  };

  const handleStartBot = async () => {
    if (isLocked) {
      navigate("/billing-dashboard");
      return;
    }

    if (!connected && activeExchange !== "sniper") {
      alert(`Connect ${activeTab.label} keys first.`);
      return;
    }

    setProcessing(true);

    try {
      const res = await BotAPI.startTradingBot?.(
        activeExchange,
        currentStrategy.id,
        botMode
      );

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
      const res = await BotAPI.stopTradingBot?.(activeExchange);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-5xl text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white pb-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_35%)]" />

      <header className="relative border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-cyan-400/10 grid place-items-center text-3xl">
              🚀
            </div>

            <div>
              <h1 className="text-3xl font-black leading-none">IMALI</h1>
              <p className="text-xs tracking-[0.28em] text-white/50 font-black mt-1">
                AI TRADING PLATFORM
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-500 px-4 py-3 font-black hover:bg-red-400"
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

        <section className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white/50">Welcome back,</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black">IMALI Trader</h2>
              <span className="rounded-lg bg-emerald-400/15 px-2 py-1 text-xs font-black text-emerald-300">
                {normalizeTier(userTier).toUpperCase()} PLAN
              </span>
            </div>
            <p className="text-sm text-white/50">{user?.email || "Member"}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill running={botRunning} />
              <ModePill mode={botMode} />
            </div>
          </div>

          <button
            onClick={() => navigate("/billing-dashboard")}
            className="hidden sm:flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black hover:bg-emerald-400"
          >
            <FaCrown />
            Upgrade Plan
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-4">
            {TRADING_TYPES.map((tab) => {
              const locked = !hasTierAccess(userTier, tab.minTier);
              const active = activeType === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`relative min-w-0 px-2 py-4 sm:px-4 sm:py-5 text-center font-black transition ${
                    active ? "bg-cyan-400/10 text-white" : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                    <span className={`text-xl ${active ? "text-cyan-300" : ""}`}>
                      {tab.icon}
                    </span>
                    <span className="text-xs sm:text-base truncate">{tab.label}</span>
                    {locked && <FaLock className="text-[10px] text-white/40" />}
                  </div>

                  {active && (
                    <div className="absolute bottom-0 left-5 right-5 h-1 rounded-full bg-cyan-300 shadow-lg shadow-cyan-400/50" />
                  )}
                </button>
              );
            })}
          </div>

          {isLocked && (
            <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <FaLock className="text-white/50" />
                <span>
                  {activeTab.label} trading requires {activeTab.minTier.toUpperCase()} plan or higher.
                </span>
              </div>

              <button
                onClick={() => navigate("/billing-dashboard")}
                className="shrink-0 text-sm font-black text-cyan-300"
              >
                Upgrade <FaArrowRight className="inline ml-1" />
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <h3 className="text-xl font-black">Account Overview</h3>
              <p className="mt-6 text-sm text-white/50">Total Assets Value</p>
              <p className="mt-2 text-5xl font-black">{formatMoney(totalAssetValue)}</p>

              <p className={`mt-3 font-black ${stats.totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {stats.totalPnl >= 0 ? "+" : ""}
                {formatMoney(stats.totalPnl)} today
              </p>
            </div>

            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <div className="relative h-[150px]">
                <Doughnut data={donutData} options={donutOptions} />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-2xl font-black">{formatPercent(winRate)}</p>
                    <p className="text-xs text-white/60">Win Rate</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <LegendRow label="Wins" value={stats.wins} color="bg-emerald-400" />
                <LegendRow label="Losses" value={stats.losses} color="bg-red-400" />
                <LegendRow label="Total Trades" value={stats.totalTrades} color="bg-white/40" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-black">Assets</h3>
            <button className="text-cyan-300 font-black">
              View All <FaArrowRight className="inline ml-1" />
            </button>
          </div>

          {visibleAssets.length === 0 ? (
            <Empty text="No assets detected yet" />
          ) : (
            <div className="space-y-4">
              {visibleAssets.map((asset) => (
                <AssetRow key={`${asset.symbol}-${asset.value}`} asset={asset} total={totalAssetValue} />
              ))}

              {smallBalancesCount > 0 && (
                <div className="mt-4 rounded-2xl bg-black/25 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-white/10 grid place-items-center">
                      ◔
                    </div>
                    <div>
                      <p className="font-black">Small balances</p>
                      <p className="text-sm text-white/40">{smallBalancesCount} assets under $0.50</p>
                    </div>
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
              <div className="text-4xl">{currentStrategy.icon}</div>
              <div>
                <div className="flex items-center gap-2">
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
              <BotInfo label="Positions" value={`${positions.length} / 5`} />
            </div>

            <div className="mt-5 flex gap-3">
              {!botRunning ? (
                <button
                  onClick={handleStartBot}
                  disabled={processing}
                  className="flex-1 rounded-2xl bg-emerald-500 py-4 font-black text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                  {processing ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPlay className="inline mr-2" />}
                  Start Bot
                </button>
              ) : (
                <button
                  onClick={handleStopBot}
                  disabled={processing}
                  className="flex-1 rounded-2xl bg-red-500 py-4 font-black hover:bg-red-400 disabled:opacity-50"
                >
                  {processing ? <FaSpinner className="animate-spin inline mr-2" /> : <FaStop className="inline mr-2" />}
                  Stop Bot
                </button>
              )}

              <button
                onClick={() => navigate(activeTab.connectRoute)}
                className="rounded-2xl bg-white/10 px-5 py-4 font-black hover:bg-white/15"
              >
                <FaPlug />
              </button>
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
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-black">Available Bots</h3>
            <button
              onClick={() => refreshDashboard(true)}
              disabled={refreshing}
              className="text-cyan-300 font-black disabled:opacity-50"
            >
              {refreshing ? <FaSpinner className="animate-spin inline mr-2" /> : <FaSyncAlt className="inline mr-2" />}
              Refresh
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => setCurrentStrategy(strategy)}
                className={`rounded-2xl border p-4 text-left transition ${
                  currentStrategy.id === strategy.id
                    ? "border-cyan-300 bg-cyan-400/10"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="text-3xl">{strategy.icon}</div>
                <p className="mt-3 text-lg font-black">{strategy.name}</p>
                <p className="text-sm text-cyan-200">{strategy.risk}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-purple-500/30 bg-purple-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/20 grid place-items-center text-purple-300">
              <FaLock />
            </div>
            <div>
              <h3 className="font-black">Unlock More Power</h3>
              <p className="text-sm text-white/60">
                Upgrade to Elite for Futures, DEX sniper bots, advanced AI strategies, and priority support.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/billing-dashboard")}
            className="rounded-2xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400"
          >
            <FaCrown className="inline mr-2" />
            Upgrade Now
          </button>
        </section>

        <p className="text-center text-xs text-white/30 pb-8">
          Live trading involves real risk. Only trade what you can afford to lose.
        </p>
      </main>
    </div>
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
  const pct = total > 0 ? (Number(asset.value || 0) / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-cyan-400/20 grid place-items-center text-xl font-black text-cyan-200">
          {getAssetIcon(asset.symbol)}
        </div>

        <div className="min-w-0">
          <p className="font-black truncate">{asset.symbol}</p>
          <p className="text-sm text-white/45 truncate">{asset.name}</p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-black">{formatMoney(asset.value)}</p>
        <p className="text-sm text-white/40">{Number(asset.quantity || 0).toLocaleString()}</p>
      </div>

      <div className="w-16 text-right">
        {asset.changePct === null || asset.changePct === undefined ? (
          <p className="text-sm text-white/35">{formatPercent(pct)}</p>
        ) : (
          <p className={Number(asset.changePct) >= 0 ? "text-emerald-300" : "text-red-300"}>
            {Number(asset.changePct) >= 0 ? "+" : ""}
            {formatPercent(asset.changePct)}
          </p>
        )}
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

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-black/25 py-10 text-center text-white/40">
      {text}
    </div>
  );
}