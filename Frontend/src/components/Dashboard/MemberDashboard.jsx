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
  FaCheckCircle,
  FaTimesCircle,
  FaWallet,
  FaRobot,
  FaExchangeAlt,
  FaChartLine,
  FaKey,
  FaPlug,
  FaSyncAlt,
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const POLL_INTERVAL_MS = 8000;

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low",
    description: "Waits for stronger dips before entering trades.",
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium",
    description: "Balanced AI-assisted signal selection.",
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher",
    description: "Follows stronger market movement.",
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "High",
    description: "Higher-frequency, higher-volatility trading.",
  },
];

const EXCHANGES = [
  {
    id: "okx",
    name: "OKX",
    assetLabel: "Available USDT",
    connectRoute: "/connect-okx",
  },
  {
    id: "alpaca",
    name: "Alpaca",
    assetLabel: "Available USD",
    connectRoute: "/connect-alpaca",
  },
];

function normalizeMode(value) {
  const mode = String(value || "").toLowerCase();
  return mode === "live" ? "live" : "paper";
}

function getStrategyById(id) {
  return STRATEGIES.find((strategy) => strategy.id === id) || STRATEGIES[1];
}

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const mountedRef = useRef(true);
  const pollingRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [activeExchange, setActiveExchange] = useState("okx");
  const [botRunning, setBotRunning] = useState(false);
  const [botMode, setBotMode] = useState("paper");
  const [botError, setBotError] = useState("");

  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]);

  const [exchangeConnected, setExchangeConnected] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [availableCash, setAvailableCash] = useState(0);
  const [accountBalance, setAccountBalance] = useState(0);
  const [assets, setAssets] = useState([]);

  const [positions, setPositions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [equityHistory, setEquityHistory] = useState([]);

  const [stats, setStats] = useState({
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
  });

  const [riskSettings, setRiskSettings] = useState({
    tradePct: 0.15,
    maxPositions: 3,
    minTradeUsd: 8,
    takeProfitPct: 0.025,
    stopLossPct: 0.025,
  });

  const activeExchangeConfig = useMemo(
    () => EXCHANGES.find((exchange) => exchange.id === activeExchange) || EXCHANGES[0],
    [activeExchange]
  );

  const winRate = useMemo(() => {
    const total = Number(stats.wins || 0) + Number(stats.losses || 0);
    if (!total) return 0;
    return (Number(stats.wins || 0) / total) * 100;
  }, [stats.wins, stats.losses]);

  const openPositionsValue = useMemo(() => {
    return positions.reduce((sum, position) => {
      const qty = Number(position.qty ?? position.quantity ?? position.size ?? 0);
      const price = Number(position.price ?? position.current_price ?? position.mark_price ?? position.entry_price ?? 0);
      return sum + qty * price;
    }, 0);
  }, [positions]);

  const totalEquity = Number(availableCash || 0) + Number(openPositionsValue || 0);

  const chartData = useMemo(
    () => ({
      labels: equityHistory.map((item) => item.time),
      datasets: [
        {
          label: "Account Equity",
          data: equityHistory.map((item) => item.equity),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          tension: 0.3,
          fill: true,
        },
      ],
    }),
    [equityHistory]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#ffffff",
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    }),
    []
  );

  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) setter(value);
  }, []);

  const fetchBotStatus = useCallback(async () => {
    const response = await BotAPI.getTradingBotStatus?.();
    const data = response?.data || response || {};

    const isRunning = Boolean(data.isRunning ?? data.running ?? data.botRunning ?? false);
    const mode = normalizeMode(data.mode || data.bot_mode || data.trading_mode || botMode);
    const strategyId = data.strategy || data.currentStrategy || data.strategy_id;

    setBotRunning(isRunning);
    setBotMode(mode);

    if (strategyId) {
      setCurrentStrategy(getStrategyById(strategyId));
    }

    setRiskSettings((prev) => ({
      ...prev,
      tradePct: Number(data.tradePct ?? data.trade_pct ?? prev.tradePct),
      maxPositions: Number(data.maxPositions ?? data.max_positions ?? prev.maxPositions),
      minTradeUsd: Number(data.minTradeUsd ?? data.min_trade_usd ?? prev.minTradeUsd),
      takeProfitPct: Number(data.takeProfitPct ?? data.take_profit_pct ?? prev.takeProfitPct),
      stopLossPct: Number(data.stopLossPct ?? data.stop_loss_pct ?? prev.stopLossPct),
    }));

    setBotError("");
  }, [botMode]);

  const fetchIntegrationStatus = useCallback(async () => {
    const response = await BotAPI.getIntegrationStatus?.();
    const data = response?.data || response || {};

    if (activeExchange === "okx") {
      setExchangeConnected(Boolean(data.okx_connected || data.okxConnected));
      setApiKeyMasked(data.okx_api_key_masked || data.okxApiKeyMasked || "");
      if (data.okx_mode) setBotMode(normalizeMode(data.okx_mode));
      return;
    }

    if (activeExchange === "alpaca") {
      setExchangeConnected(Boolean(data.alpaca_connected || data.alpacaConnected));
      setApiKeyMasked(data.alpaca_api_key_masked || data.alpacaApiKeyMasked || "");
      if (data.alpaca_mode) setBotMode(normalizeMode(data.alpaca_mode));
    }
  }, [activeExchange]);

  const fetchBalanceAndAssets = useCallback(async () => {
    const response = await BotAPI.getExchangeBalance?.();
    const data = response?.data || response || {};

    if (activeExchange === "okx") {
      const available = Number(
        data.okx_available_usdt ??
          data.okxAvailableUsdt ??
          data.available_usdt ??
          data.availableUSDT ??
          0
      );

      const total = Number(
        data.okx_total_usd ??
          data.okxTotalUsd ??
          data.okx_balance ??
          data.okx ??
          data.total ??
          available
      );

      const okxAssets = Array.isArray(data.okx_assets)
        ? data.okx_assets
        : Array.isArray(data.assets)
          ? data.assets
          : [];

      setAvailableCash(available);
      setAccountBalance(total);
      setAssets(
        okxAssets.filter((asset) => {
          const value = Number(asset.usdValue ?? asset.usd_value ?? asset.value ?? 0);
          const currency = asset.ccy || asset.symbol || asset.asset;
          return value > 0.01 && currency !== "USDT";
        })
      );

      return { available, total };
    }

    if (activeExchange === "alpaca") {
      const available = Number(
        data.alpaca_available_usd ??
          data.alpacaAvailableUsd ??
          data.alpaca_cash ??
          data.cash ??
          0
      );

      const total = Number(
        data.alpaca_equity ??
          data.alpacaEquity ??
          data.alpaca_balance ??
          data.alpaca ??
          available
      );

      setAvailableCash(available);
      setAccountBalance(total);
      setAssets([]);

      return { available, total };
    }

    return { available: 0, total: 0 };
  }, [activeExchange]);

  const fetchOpenPositions = useCallback(async () => {
    const response = await BotAPI.getOpenPositions?.(activeExchange);
    const data = response?.data || response || {};
    const nextPositions = data.positions || data.open_positions || data || [];

    setPositions(Array.isArray(nextPositions) ? nextPositions : []);
    return Array.isArray(nextPositions) ? nextPositions : [];
  }, [activeExchange]);

  const fetchTradingStats = useCallback(async () => {
    const response = await BotAPI.getLiveTradingStats?.(activeExchange);
    const data = response?.data || response || {};
    const summary = data.summary || data;

    setStats({
      realizedPnl: Number(summary.realized_pnl ?? summary.realizedPnl ?? summary.total_pnl ?? 0),
      unrealizedPnl: Number(summary.unrealized_pnl ?? summary.unrealizedPnl ?? 0),
      totalPnl: Number(summary.total_pnl ?? summary.totalPnl ?? 0),
      wins: Number(summary.wins ?? 0),
      losses: Number(summary.losses ?? 0),
      totalTrades: Number(summary.total_trades ?? summary.totalTrades ?? 0),
    });
  }, [activeExchange]);

  const fetchRecentTrades = useCallback(async () => {
    const response = await BotAPI.getLiveTradeHistory?.(20, activeExchange);
    const data = response?.data || response || {};
    const trades = data.trades || data.history || [];

    const formatted = Array.isArray(trades)
      ? trades.slice(0, 20).map((trade, index) => ({
          id: trade.id || `${trade.symbol || "trade"}-${index}`,
          time: trade.created_at
            ? new Date(trade.created_at).toLocaleTimeString()
            : trade.time || new Date().toLocaleTimeString(),
          action: `${String(trade.side || trade.action || "").toUpperCase()} ${trade.symbol || ""}`.trim(),
          details: trade.strategy || trade.mode || "",
          pnl: Number(trade.pnl_usd ?? trade.pnl ?? 0),
        }))
      : [];

    setActivities(formatted);
  }, [activeExchange]);

  const refreshDashboard = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (showSpinner) setRefreshing(true);

      try {
        await Promise.all([
          fetchBotStatus(),
          fetchIntegrationStatus(),
          fetchTradingStats(),
          fetchRecentTrades(),
        ]);

        const [balanceResult, latestPositions] = await Promise.all([
          fetchBalanceAndAssets(),
          fetchOpenPositions(),
        ]);

        const positionsValue = latestPositions.reduce((sum, position) => {
          const qty = Number(position.qty ?? position.quantity ?? position.size ?? 0);
          const price = Number(
            position.price ?? position.current_price ?? position.mark_price ?? position.entry_price ?? 0
          );
          return sum + qty * price;
        }, 0);

        const nextEquity = Number(balanceResult?.available || 0) + Number(positionsValue || 0);

        setEquityHistory((prev) => {
          const next = [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              equity: nextEquity,
            },
          ];
          return next.slice(-30);
        });

        setLastUpdated(new Date());
      } catch (error) {
        console.error("refreshDashboard error:", error);
        setBotError(error?.message || "Unable to refresh dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      fetchBotStatus,
      fetchIntegrationStatus,
      fetchTradingStats,
      fetchRecentTrades,
      fetchBalanceAndAssets,
      fetchOpenPositions,
    ]
  );

  useEffect(() => {
    mountedRef.current = true;

    refreshDashboard({ showSpinner: false });

    pollingRef.current = setInterval(() => {
      refreshDashboard({ showSpinner: false });
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    setLoading(true);
    refreshDashboard({ showSpinner: false });
  }, [activeExchange, refreshDashboard]);

  const handleStartBot = async () => {
    if (!exchangeConnected) {
      alert(`Connect ${activeExchangeConfig.name} API keys first.`);
      return;
    }

    setProcessing(true);

    try {
      const response = await BotAPI.startTradingBot?.(
        activeExchange,
        currentStrategy.id,
        botMode
      );

      const success = response?.success !== false;

      if (!success) {
        alert(response?.error || response?.message || "Failed to start bot.");
        return;
      }

      await refreshDashboard({ showSpinner: true });
    } catch (error) {
      alert(error?.message || "Failed to start bot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleStopBot = async () => {
    setProcessing(true);

    try {
      const response = await BotAPI.stopTradingBot?.(activeExchange);
      const success = response?.success !== false;

      if (!success) {
        alert(response?.error || response?.message || "Failed to stop bot.");
        return;
      }

      await refreshDashboard({ showSpinner: true });
    } catch (error) {
      alert(error?.message || "Failed to stop bot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseAllPositions = async () => {
    const confirmed = window.confirm(
      `Close all open ${activeExchangeConfig.name} positions?`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const response = await BotAPI.closeAllPositions?.(activeExchange);
      const success = response?.success !== false;

      if (!success) {
        alert(response?.error || response?.message || "Failed to close positions.");
        return;
      }

      await refreshDashboard({ showSpinner: true });
    } catch (error) {
      alert(error?.message || "Failed to close positions.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <FaSpinner className="animate-spin text-4xl text-emerald-400" />
          <p className="text-sm text-white/60">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white pb-10">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-xl">
              🚀
            </div>
            <div>
              <h1 className="text-base font-bold">IMALI Trading Dashboard</h1>
              <p className="text-xs text-white/50">{user?.email || "Member"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                botRunning
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-gray-500/15 text-gray-300"
              }`}
            >
              <FaCircle
                className={`h-2 w-2 ${
                  botRunning ? "animate-pulse text-emerald-400" : "text-gray-400"
                }`}
              />
              {botRunning ? "BOT RUNNING" : "BOT OFF"}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500"
            >
              <FaSignOutAlt size={12} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {botError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {botError}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Bot Status</p>
              <FaRobot className={botRunning ? "text-emerald-400" : "text-white/30"} />
            </div>
            <p className={`mt-2 text-2xl font-black ${botRunning ? "text-emerald-400" : "text-white"}`}>
              {botRunning ? "Running" : "Off"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Mode</p>
              <FaExchangeAlt className={botMode === "live" ? "text-red-400" : "text-yellow-400"} />
            </div>
            <p className={`mt-2 text-2xl font-black ${botMode === "live" ? "text-red-400" : "text-yellow-400"}`}>
              {botMode.toUpperCase()}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">{activeExchangeConfig.assetLabel}</p>
              <FaWallet className="text-cyan-400" />
            </div>
            <p className="mt-2 text-2xl font-black">{formatMoney(availableCash)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">Total Equity</p>
              <FaChartLine className="text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black">{formatMoney(totalEquity || accountBalance)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Exchange Connection</h2>
              <p className="text-sm text-white/50">
                API status, mode, and balance are refreshed every 8 seconds.
              </p>
            </div>

            <button
              onClick={() => refreshDashboard({ showSpinner: true })}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
              Refresh
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {EXCHANGES.map((exchange) => (
              <button
                key={exchange.id}
                onClick={() => setActiveExchange(exchange.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  activeExchange === exchange.id
                    ? "bg-cyan-600 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
              >
                {exchange.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/40">Connection</p>
              <div className="mt-2 flex items-center gap-2 font-bold">
                {exchangeConnected ? (
                  <>
                    <FaCheckCircle className="text-emerald-400" />
                    Connected
                  </>
                ) : (
                  <>
                    <FaTimesCircle className="text-red-400" />
                    Not Connected
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/40">API Key</p>
              <div className="mt-2 flex items-center gap-2 font-bold">
                <FaKey className="text-white/40" />
                {apiKeyMasked || "None"}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/40">Account Balance</p>
              <p className="mt-2 font-bold">{formatMoney(accountBalance)}</p>
            </div>

            <div className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/40">Last Updated</p>
              <p className="mt-2 font-bold">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate(activeExchangeConfig.connectRoute)}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold hover:bg-cyan-500"
            >
              <FaPlug />
              Connect / Update Keys
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Bot Controls</h2>
                <p className="text-sm text-white/50">
                  Starts using the selected exchange, strategy, and mode.
                </p>
              </div>

              <div
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  botRunning
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-gray-500/15 text-gray-300"
                }`}
              >
                {botRunning ? "RUNNING" : "STOPPED"}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setBotMode("paper")}
                className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  botMode === "paper"
                    ? "bg-yellow-500 text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Paper Mode
              </button>

              <button
                onClick={() => setBotMode("live")}
                className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  botMode === "live"
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Live Mode
              </button>
            </div>

            <div className="mb-5 grid gap-3">
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setCurrentStrategy(strategy)}
                  className={`rounded-xl border p-4 text-left transition ${
                    currentStrategy.id === strategy.id
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold">
                      {strategy.icon} {strategy.name}
                    </div>
                    <div className="text-xs text-white/50">{strategy.risk}</div>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{strategy.description}</p>
                </button>
              ))}
            </div>

            {!botRunning ? (
              <button
                onClick={handleStartBot}
                disabled={processing || !exchangeConnected}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-black hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? <FaSpinner className="animate-spin" /> : <FaPlay />}
                Start Bot
              </button>
            ) : (
              <button
                onClick={handleStopBot}
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-black hover:bg-red-500 disabled:opacity-50"
              >
                {processing ? <FaSpinner className="animate-spin" /> : <FaStop />}
                Stop Bot
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-lg font-bold">Risk Settings</h2>
            <p className="mb-4 text-sm text-white/50">Read from bot status/config when available.</p>

            <div className="grid gap-3">
              <div className="flex justify-between rounded-xl bg-white/[0.04] p-4">
                <span className="text-white/50">Trade Size</span>
                <strong>{formatPercent(Number(riskSettings.tradePct) * 100)}</strong>
              </div>

              <div className="flex justify-between rounded-xl bg-white/[0.04] p-4">
                <span className="text-white/50">Max Positions</span>
                <strong>{riskSettings.maxPositions}</strong>
              </div>

              <div className="flex justify-between rounded-xl bg-white/[0.04] p-4">
                <span className="text-white/50">Minimum Trade</span>
                <strong>{formatMoney(riskSettings.minTradeUsd)}</strong>
              </div>

              <div className="flex justify-between rounded-xl bg-white/[0.04] p-4">
                <span className="text-white/50">Take Profit</span>
                <strong>{formatPercent(Number(riskSettings.takeProfitPct) * 100)}</strong>
              </div>

              <div className="flex justify-between rounded-xl bg-white/[0.04] p-4">
                <span className="text-white/50">Stop Loss</span>
                <strong>{formatPercent(Number(riskSettings.stopLossPct) * 100)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-lg font-bold">Open Positions</h2>

          {positions.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] py-10 text-center text-white/40">
              No open positions
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position, index) => {
                const symbol = position.symbol || position.instId || position.asset || "Position";
                const entry = Number(position.entry_price ?? position.entryPrice ?? position.price ?? 0);
                const qty = Number(position.qty ?? position.quantity ?? position.size ?? 0);
                const pnl = Number(position.pnl_usd ?? position.pnlUsd ?? position.pnl ?? 0);

                return (
                  <div
                    key={position.id || `${symbol}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] p-4"
                  >
                    <div>
                      <p className="font-bold">{symbol}</p>
                      <p className="text-xs text-white/40">
                        Qty: {qty} · Entry: {formatMoney(entry)}
                      </p>
                    </div>

                    <p className={`font-black ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatMoney(pnl)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="mb-4 text-lg font-bold">Performance</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-white/40">Realized PnL</p>
                <p className={`mt-1 text-xl font-black ${stats.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(stats.realizedPnl)}
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-white/40">Unrealized PnL</p>
                <p className={`mt-1 text-xl font-black ${stats.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(stats.unrealizedPnl)}
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-white/40">Total PnL</p>
                <p className={`mt-1 text-xl font-black ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(stats.totalPnl)}
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.04] p-4">
                <p className="text-xs text-white/40">Win Rate</p>
                <p className="mt-1 text-xl font-black">{formatPercent(winRate)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs text-white/40">Total Trades</p>
              <p className="mt-1 text-xl font-black">{Number(stats.totalTrades || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="mb-4 text-lg font-bold">Equity History</h2>

            <div className="h-72">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-lg font-bold">Recent Activity</h2>

          {activities.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] py-8 text-center text-white/40">
              No recent trades yet
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3"
                >
                  <div>
                    <p className="font-bold">{activity.action || "Trade"}</p>
                    <p className="text-xs text-white/40">
                      {activity.time} {activity.details ? `· ${activity.details}` : ""}
                    </p>
                  </div>

                  <p className={`font-bold ${Number(activity.pnl || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatMoney(activity.pnl)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-lg font-bold">Assets</h2>

          {assets.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] py-8 text-center text-white/40">
              No non-cash assets detected
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset, index) => {
                const currency = asset.ccy || asset.symbol || asset.asset || "Asset";
                const balance = asset.bal || asset.balance || asset.qty || 0;
                const value = Number(asset.usdValue ?? asset.usd_value ?? asset.value ?? 0);

                return (
                  <div
                    key={`${currency}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3"
                  >
                    <div>
                      <p className="font-bold">{currency}</p>
                      <p className="text-xs text-white/40">Balance: {balance}</p>
                    </div>

                    <p className="font-bold">{formatMoney(value)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="mb-2 text-lg font-bold text-red-300">Emergency Controls</h2>
          <p className="mb-4 text-sm text-red-100/70">
            Use this only when you want to exit all open positions for the selected exchange.
          </p>

          <button
            onClick={handleCloseAllPositions}
            disabled={processing || positions.length === 0}
            className="w-full rounded-xl bg-red-600 py-3 font-black hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close All Positions
          </button>
        </section>

        <p className="text-center text-xs text-white/30">
          Live trading involves real risk. Only trade with funds you can afford to lose.
        </p>
      </main>
    </div>
  );
}