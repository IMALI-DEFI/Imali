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

const POLL_INTERVAL_MS = 7000;

const STRATEGIES = [
  { id: "mean_reversion", name: "Conservative", icon: "🛡️", risk: "Low" },
  { id: "ai_weighted", name: "Balanced AI", icon: "🤖", risk: "Medium" },
  { id: "momentum", name: "Growth", icon: "📈", risk: "Higher" },
  { id: "aggressive", name: "Aggressive", icon: "🔥", risk: "High" },
];

const EXCHANGES = [
  { id: "okx", name: "OKX", connectRoute: "/connect-okx", cashLabel: "Available USDT" },
  { id: "alpaca", name: "Alpaca", connectRoute: "/connect-alpaca", cashLabel: "Available USD" },
];

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatPercent = (n) => `${Number(n || 0).toFixed(1)}%`;

const normalizeMode = (mode) => {
  const value = String(mode || "").toLowerCase();
  return value === "live" ? "live" : "paper";
};

const getStrategy = (id) => {
  return STRATEGIES.find((s) => s.id === id) || STRATEGIES[1];
};

const unwrap = (res) => {
  return res?.data?.data || res?.data || res || {};
};

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [activeExchange, setActiveExchange] = useState("okx");
  const [botRunning, setBotRunning] = useState(false);
  const [botMode, setBotMode] = useState("paper");
  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]);

  const [exchangeConnected, setExchangeConnected] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [availableCash, setAvailableCash] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const [positions, setPositions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [trades, setTrades] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    totalTrades: 0,
  });

  const exchangeConfig = useMemo(() => {
    return EXCHANGES.find((e) => e.id === activeExchange) || EXCHANGES[0];
  }, [activeExchange]);

  const winRate = useMemo(() => {
    const wins = Number(stats.wins || 0);
    const losses = Number(stats.losses || 0);
    const total = wins + losses;
    if (!total) return 0;
    return (wins / total) * 100;
  }, [stats]);

  const openPositionsValue = useMemo(() => {
    return positions.reduce((sum, p) => {
      const qty = Number(p.qty ?? p.quantity ?? p.size ?? 0);
      const price = Number(
        p.current_price ??
          p.mark_price ??
          p.price ??
          p.entry_price ??
          p.entryPrice ??
          0
      );
      return sum + qty * price;
    }, 0);
  }, [positions]);

  const totalEquity = Number(availableCash || 0) + Number(openPositionsValue || 0);

  const fetchBotStatus = useCallback(async () => {
    const res = await BotAPI.getTradingBotStatus?.();
    const data = unwrap(res);

    console.log("BOT STATUS PAYLOAD:", data);

    const isRunning =
      data.isRunning === true ||
      data.running === true ||
      data.botRunning === true ||
      String(data.status || "").toLowerCase() === "running" ||
      String(data.bot_status || "").toLowerCase() === "running" ||
      String(data.botStatus || "").toLowerCase() === "running";

    setBotRunning(isRunning);

    if (data.mode || data.bot_mode || data.trading_mode) {
      setBotMode(normalizeMode(data.mode || data.bot_mode || data.trading_mode));
    }

    if (data.strategy || data.strategy_id || data.currentStrategy) {
      setCurrentStrategy(
        getStrategy(data.strategy || data.strategy_id || data.currentStrategy)
      );
    }
  }, []);

  const fetchIntegrationStatus = useCallback(async () => {
    const res = await BotAPI.getIntegrationStatus?.();
    const data = unwrap(res);

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

  const fetchBalance = useCallback(async () => {
    const res = await BotAPI.getExchangeBalance?.();
    const data = unwrap(res);

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
      setTotalBalance(total);
      setAssets(okxAssets);

      return;
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
      setTotalBalance(total);
      setAssets([]);
    }
  }, [activeExchange]);

  const fetchPositions = useCallback(async () => {
    const res = await BotAPI.getOpenPositions?.(activeExchange);
    const data = unwrap(res);
    const list = data.positions || data.open_positions || data.openPositions || [];

    setPositions(Array.isArray(list) ? list : []);
  }, [activeExchange]);

  const fetchStats = useCallback(async () => {
    const res = await BotAPI.getLiveTradingStats?.(activeExchange);
    const data = unwrap(res);
    const summary = data.summary || data;

    setStats({
      realizedPnl: Number(summary.realized_pnl ?? summary.realizedPnl ?? 0),
      unrealizedPnl: Number(summary.unrealized_pnl ?? summary.unrealizedPnl ?? 0),
      totalPnl: Number(summary.total_pnl ?? summary.totalPnl ?? 0),
      wins: Number(summary.wins ?? 0),
      losses: Number(summary.losses ?? 0),
      totalTrades: Number(summary.total_trades ?? summary.totalTrades ?? 0),
    });
  }, [activeExchange]);

  const fetchTrades = useCallback(async () => {
    const res = await BotAPI.getLiveTradeHistory?.(20, activeExchange);
    const data = unwrap(res);
    const list = data.trades || data.history || [];

    setTrades(Array.isArray(list) ? list.slice(0, 20) : []);
  }, [activeExchange]);

  const refreshDashboard = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);

        await Promise.all([
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
        setError(err?.message || "Unable to refresh dashboard.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
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

    const interval = setInterval(() => {
      refreshDashboard(false);
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    refreshDashboard(false);
  }, [activeExchange, refreshDashboard]);

  const handleStartBot = async () => {
    if (!exchangeConnected) {
      alert(`Connect ${exchangeConfig.name} API keys first.`);
      return;
    }

    setProcessing(true);

    try {
      const res = await BotAPI.startTradingBot?.(
        activeExchange,
        currentStrategy.id,
        botMode
      );

      const data = unwrap(res);

      if (res?.success === false || data?.success === false) {
        alert(data?.error || data?.message || "Failed to start bot.");
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
      const data = unwrap(res);

      if (res?.success === false || data?.success === false) {
        alert(data?.error || data?.message || "Failed to stop bot.");
        return;
      }

      await refreshDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to stop bot.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseAllPositions = async () => {
    if (!window.confirm(`Close all ${exchangeConfig.name} positions?`)) return;

    setProcessing(true);

    try {
      await BotAPI.closeAllPositions?.(activeExchange);
      await refreshDashboard(true);
    } catch (err) {
      alert(err?.message || "Failed to close positions.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <FaSpinner className="animate-spin text-4xl text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-10">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 grid place-items-center text-2xl">
              🚀
            </div>

            <div>
              <h1 className="text-xl font-black">IMALI Trading Dashboard</h1>
              <p className="text-sm text-white/50">{user?.email || "Member"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
                botRunning
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-gray-500/20 text-gray-300"
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
              className="rounded-full bg-red-600 px-4 py-2 font-bold hover:bg-red-500"
            >
              <FaSignOutAlt className="inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <DashboardCard
            title="Bot Status"
            value={botRunning ? "Running" : "Off"}
            icon={<FaRobot />}
            color={botRunning ? "text-emerald-400" : "text-white"}
          />

          <DashboardCard
            title="Mode"
            value={botMode.toUpperCase()}
            icon={<FaExchangeAlt />}
            color={botMode === "live" ? "text-red-400" : "text-yellow-400"}
          />

          <DashboardCard
            title={exchangeConfig.cashLabel}
            value={formatMoney(availableCash)}
            icon={<FaWallet />}
            color="text-white"
          />

          <DashboardCard
            title="Total Equity"
            value={formatMoney(totalEquity || totalBalance)}
            icon={<FaChartLine />}
            color="text-white"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black">Exchange</h2>
              <p className="text-sm text-white/50">
                Status refreshes every {POLL_INTERVAL_MS / 1000} seconds.
              </p>
            </div>

            <button
              onClick={() => refreshDashboard(true)}
              disabled={refreshing}
              className="rounded-xl bg-white/10 px-4 py-2 font-bold hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <FaSpinner className="animate-spin inline mr-2" />
              ) : (
                <FaSyncAlt className="inline mr-2" />
              )}
              Refresh
            </button>
          </div>

          <div className="flex gap-2 mb-5">
            {EXCHANGES.map((exchange) => (
              <button
                key={exchange.id}
                onClick={() => setActiveExchange(exchange.id)}
                className={`rounded-full px-4 py-2 font-bold ${
                  activeExchange === exchange.id
                    ? "bg-cyan-600"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {exchange.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <InfoBox
              title="Connection"
              value={exchangeConnected ? "Connected" : "Not Connected"}
              icon={
                exchangeConnected ? (
                  <FaCheckCircle className="text-emerald-400" />
                ) : (
                  <FaTimesCircle className="text-red-400" />
                )
              }
            />

            <InfoBox title="API Key" value={apiKeyMasked || "None"} icon={<FaKey />} />
            <InfoBox title="Balance" value={formatMoney(totalBalance)} icon={<FaWallet />} />
            <InfoBox
              title="Last Updated"
              value={lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
              icon={<FaSyncAlt />}
            />
          </div>

          <button
            onClick={() => navigate(exchangeConfig.connectRoute)}
            className="mt-5 rounded-xl bg-cyan-600 px-5 py-3 font-black hover:bg-cyan-500"
          >
            <FaPlug className="inline mr-2" />
            Connect / Update Keys
          </button>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-black mb-4">Bot Controls</h2>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setBotMode("paper")}
                className={`rounded-xl py-3 font-black ${
                  botMode === "paper"
                    ? "bg-yellow-500 text-black"
                    : "bg-white/10 text-white/60"
                }`}
              >
                Paper
              </button>

              <button
                onClick={() => setBotMode("live")}
                className={`rounded-xl py-3 font-black ${
                  botMode === "live"
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                Live
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setCurrentStrategy(strategy)}
                  className={`w-full rounded-xl border p-4 text-left ${
                    currentStrategy.id === strategy.id
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex justify-between">
                    <strong>
                      {strategy.icon} {strategy.name}
                    </strong>
                    <span className="text-sm text-white/50">{strategy.risk}</span>
                  </div>
                </button>
              ))}
            </div>

            {!botRunning ? (
              <button
                onClick={handleStartBot}
                disabled={processing || !exchangeConnected}
                className="w-full rounded-xl bg-emerald-600 py-3 font-black hover:bg-emerald-500 disabled:opacity-50"
              >
                {processing ? (
                  <FaSpinner className="animate-spin inline mr-2" />
                ) : (
                  <FaPlay className="inline mr-2" />
                )}
                Start Bot
              </button>
            ) : (
              <button
                onClick={handleStopBot}
                disabled={processing}
                className="w-full rounded-xl bg-red-600 py-3 font-black hover:bg-red-500 disabled:opacity-50"
              >
                {processing ? (
                  <FaSpinner className="animate-spin inline mr-2" />
                ) : (
                  <FaStop className="inline mr-2" />
                )}
                Stop Bot
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-black mb-4">Performance</h2>

            <div className="grid grid-cols-2 gap-3">
              <StatBox title="Realized PnL" value={formatMoney(stats.realizedPnl)} />
              <StatBox title="Unrealized PnL" value={formatMoney(stats.unrealizedPnl)} />
              <StatBox title="Total PnL" value={formatMoney(stats.totalPnl)} />
              <StatBox title="Win Rate" value={formatPercent(winRate)} />
              <StatBox title="Trades" value={Number(stats.totalTrades || 0).toLocaleString()} />
              <StatBox title="Open Positions" value={positions.length} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black mb-4">Open Positions</h2>

          {positions.length === 0 ? (
            <div className="text-center text-white/40 py-8">No open positions</div>
          ) : (
            <div className="space-y-3">
              {positions.map((p, i) => {
                const symbol = p.symbol || p.instId || p.asset || "Position";
                const qty = p.qty ?? p.quantity ?? p.size ?? 0;
                const entry = p.entry_price ?? p.entryPrice ?? p.price ?? 0;
                const pnl = Number(p.pnl_usd ?? p.pnlUsd ?? p.pnl ?? 0);

                return (
                  <div
                    key={p.id || `${symbol}-${i}`}
                    className="rounded-xl bg-white/[0.04] p-4 flex justify-between"
                  >
                    <div>
                      <strong>{symbol}</strong>
                      <p className="text-xs text-white/40">
                        Qty: {qty} · Entry: {formatMoney(entry)}
                      </p>
                    </div>

                    <strong className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatMoney(pnl)}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black mb-4">Recent Trades</h2>

          {trades.length === 0 ? (
            <div className="text-center text-white/40 py-8">No recent trades</div>
          ) : (
            <div className="space-y-3">
              {trades.map((trade, i) => (
                <div
                  key={trade.id || i}
                  className="rounded-xl bg-white/[0.04] p-4 flex justify-between"
                >
                  <div>
                    <strong>
                      {String(trade.side || trade.action || "").toUpperCase()}{" "}
                      {trade.symbol || ""}
                    </strong>
                    <p className="text-xs text-white/40">
                      {trade.strategy || trade.created_at || ""}
                    </p>
                  </div>

                  <strong
                    className={
                      Number(trade.pnl_usd ?? trade.pnl ?? 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {formatMoney(trade.pnl_usd ?? trade.pnl ?? 0)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="text-xl font-black text-red-300 mb-3">Emergency Controls</h2>

          <button
            onClick={handleCloseAllPositions}
            disabled={processing || positions.length === 0}
            className="w-full rounded-xl bg-red-600 py-3 font-black hover:bg-red-500 disabled:opacity-50"
          >
            Close All Positions
          </button>
        </section>

        <p className="text-center text-xs text-white/30">
          Live trading involves real risk. Only trade what you can afford to lose.
        </p>
      </main>
    </div>
  );
}

function DashboardCard({ title, value, icon, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex justify-between text-white/50">
        <p className="font-bold">{title}</p>
        {icon}
      </div>
      <p className={`mt-5 text-3xl font-black ${color || "text-white"}`}>{value}</p>
    </div>
  );
}

function InfoBox({ title, value, icon }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <div className="flex justify-between text-white/40">
        <p className="text-xs font-bold">{title}</p>
        {icon}
      </div>
      <p className="mt-3 font-black">{value}</p>
    </div>
  );
}

function StatBox({ title, value }) {
  const numeric = Number(String(value).replace(/[$,%]/g, ""));
  const isPnl = title.toLowerCase().includes("pnl");

  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <p className="text-xs text-white/40">{title}</p>
      <p
        className={`mt-2 text-xl font-black ${
          isPnl ? (numeric >= 0 ? "text-emerald-400" : "text-red-400") : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}