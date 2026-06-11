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
  FaRobot,
  FaChartLine,
  FaWallet,
  FaExchangeAlt,
  FaShieldAlt,
  FaBrain,
  FaTrophy,
  FaPlug,
  FaSyncAlt,
  FaFire,
} from "react-icons/fa";

const POLL_MS = 7000;

const STRATEGIES = [
  {
    id: "mean_reversion",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    desc: "Slower trades focused on consistency.",
    accent: "emerald",
  },
  {
    id: "ai_weighted",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    desc: "AI-assisted balance between safety and opportunity.",
    accent: "cyan",
  },
  {
    id: "momentum",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    desc: "Looks for stronger market movement.",
    accent: "purple",
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "High Risk",
    desc: "Fast, high-volatility opportunities.",
    accent: "red",
  },
];

const EXCHANGES = [
  { id: "okx", name: "OKX", cashLabel: "Available USDT", route: "/connect-okx" },
  { id: "alpaca", name: "Alpaca", cashLabel: "Available USD", route: "/connect-alpaca" },
];

const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
const formatPercent = (n) => `${Number(n || 0).toFixed(1)}%`;

const normalizeMode = (mode) =>
  String(mode || "paper").toLowerCase() === "live" ? "live" : "paper";

const getStrategy = (id) =>
  STRATEGIES.find((s) => s.id === id) || STRATEGIES[1];

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

  const [connected, setConnected] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [availableCash, setAvailableCash] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const [positions, setPositions] = useState([]);
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

  const exchange = useMemo(
    () => EXCHANGES.find((e) => e.id === activeExchange) || EXCHANGES[0],
    [activeExchange]
  );

  const winRate = useMemo(() => {
    const total = Number(stats.wins || 0) + Number(stats.losses || 0);
    if (!total) return 0;
    return (Number(stats.wins || 0) / total) * 100;
  }, [stats]);

  const positionsValue = useMemo(() => {
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

  const totalEquity = Number(availableCash || 0) + Number(positionsValue || 0);

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

    setConnected(Boolean(res?.alpaca_connected));
    setApiKeyMasked(res?.alpaca_api_key_masked || "");
    if (res?.alpaca_mode) setBotMode(normalizeMode(res.alpaca_mode));
  }, [activeExchange]);

  const fetchBalance = useCallback(async () => {
    const res = await BotAPI.getExchangeBalance?.(true);

    if (activeExchange === "okx") {
      setAvailableCash(Number(res?.okx_available_usdt || 0));
      setTotalBalance(Number(res?.okx_total || res?.total || 0));
      return;
    }

    setAvailableCash(Number(res?.alpaca_available_usd || 0));
    setTotalBalance(Number(res?.alpaca_total || 0));
  }, [activeExchange]);

  const fetchPositions = useCallback(async () => {
    const res = await BotAPI.getOpenPositions?.(activeExchange, true);
    setPositions(Array.isArray(res?.positions) ? res.positions : []);
  }, [activeExchange]);

  const fetchStats = useCallback(async () => {
    const res = await BotAPI.getLiveTradingStats?.(activeExchange, true);
    const s = res?.summary || {};

    setStats({
      realizedPnl: Number(s.realized_pnl ?? s.realizedPnl ?? 0),
      unrealizedPnl: Number(s.unrealized_pnl ?? s.unrealizedPnl ?? 0),
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
  }, [activeExchange, refreshDashboard]);

  const handleStartBot = async () => {
    if (!connected) {
      alert(`Connect ${exchange.name} first.`);
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

  const handleCloseAll = async () => {
    if (!window.confirm(`Close all ${exchange.name} positions?`)) return;

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
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <FaSpinner className="animate-spin text-5xl text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_35%)]" />

      <header className="relative border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-cyan-400/15 grid place-items-center text-3xl shadow-lg shadow-cyan-500/20">
              🚀
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300 font-black">
                IMALI
              </p>
              <h1 className="text-2xl md:text-4xl font-black leading-tight">
                AI Trading Dashboard
              </h1>
              <p className="text-sm text-white/50">{user?.email || "Member"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusPill running={botRunning} />

            <button
              onClick={logout}
              className="rounded-2xl bg-red-500 px-4 py-3 font-black hover:bg-red-400"
            >
              <FaSignOutAlt className="inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-8 shadow-2xl shadow-black/30">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-wrap gap-2 mb-5">
                {EXCHANGES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveExchange(item.id)}
                    className={`rounded-full px-5 py-2 font-black transition ${
                      activeExchange === item.id
                        ? "bg-cyan-400 text-black shadow-lg shadow-cyan-500/30"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-3 w-3 rounded-full ${
                    botRunning ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                  }`}
                />
                <p className="text-sm uppercase tracking-[0.25em] text-white/50 font-black">
                  {botRunning ? "Bot Running" : "Bot Off"}
                </p>
              </div>

              <h2 className="text-4xl md:text-6xl font-black leading-none">
                {currentStrategy.name}
              </h2>

              <p className="mt-4 max-w-xl text-white/60">
                {currentStrategy.desc} Current mode is{" "}
                <span
                  className={
                    botMode === "live" ? "text-red-300 font-black" : "text-yellow-300 font-black"
                  }
                >
                  {botMode.toUpperCase()}
                </span>
                .
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {!botRunning ? (
                  <button
                    onClick={handleStartBot}
                    disabled={processing || !connected}
                    className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black hover:bg-emerald-400 disabled:opacity-50"
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
                    className="rounded-2xl bg-red-500 px-6 py-4 font-black hover:bg-red-400 disabled:opacity-50"
                  >
                    {processing ? (
                      <FaSpinner className="animate-spin inline mr-2" />
                    ) : (
                      <FaStop className="inline mr-2" />
                    )}
                    Stop Bot
                  </button>
                )}

                <button
                  onClick={() => navigate(exchange.route)}
                  className="rounded-2xl bg-white/10 px-6 py-4 font-black hover:bg-white/15"
                >
                  <FaPlug className="inline mr-2" />
                  Connect Keys
                </button>

                <button
                  onClick={() => refreshDashboard(true)}
                  disabled={refreshing}
                  className="rounded-2xl bg-white/10 px-6 py-4 font-black hover:bg-white/15 disabled:opacity-50"
                >
                  {refreshing ? (
                    <FaSpinner className="animate-spin inline mr-2" />
                  ) : (
                    <FaSyncAlt className="inline mr-2" />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
              <div className="grid grid-cols-2 gap-3">
                <HeroStat title="Mode" value={botMode.toUpperCase()} hot={botMode === "live"} />
                <HeroStat title={exchange.cashLabel} value={formatMoney(availableCash)} />
                <HeroStat title="Total Equity" value={formatMoney(totalEquity || totalBalance)} />
                <HeroStat title="Win Rate" value={formatPercent(winRate)} />
              </div>

              <div className="mt-5 rounded-2xl bg-white/[0.05] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Connection</span>
                  <span className={connected ? "text-emerald-300 font-black" : "text-red-300 font-black"}>
                    {connected ? "Connected" : "Not Connected"}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-white/50">API Key</span>
                  <span className="font-black">{apiKeyMasked || "None"}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-white/50">Updated</span>
                  <span className="font-black">
                    {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={<FaWallet />} title={exchange.cashLabel} value={formatMoney(availableCash)} />
          <MetricCard icon={<FaChartLine />} title="Total PnL" value={formatMoney(stats.totalPnl)} pnl />
          <MetricCard icon={<FaTrophy />} title="Total Trades" value={Number(stats.totalTrades || 0).toLocaleString()} />
          <MetricCard icon={<FaRobot />} title="Open Positions" value={positions.length} />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-2xl font-black">Choose Strategy</h3>
              <p className="text-sm text-white/50">Same demo-style strategy cards.</p>
            </div>
            <FaBrain className="text-3xl text-cyan-300" />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentStrategy(s)}
                className={`rounded-[1.5rem] border p-5 text-left transition hover:-translate-y-1 ${
                  currentStrategy.id === s.id
                    ? "border-cyan-300 bg-cyan-400/10 shadow-xl shadow-cyan-500/10"
                    : "border-white/10 bg-black/25 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-4xl">{s.icon}</div>
                <h4 className="mt-4 text-xl font-black">{s.name}</h4>
                <p className="mt-1 text-sm text-cyan-200">{s.risk}</p>
                <p className="mt-3 text-sm text-white/50">{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Performance" icon={<FaChartLine />}>
            <div className="grid grid-cols-2 gap-3">
              <SmallStat title="Realized PnL" value={formatMoney(stats.realizedPnl)} pnl />
              <SmallStat title="Unrealized PnL" value={formatMoney(stats.unrealizedPnl)} pnl />
              <SmallStat title="Total PnL" value={formatMoney(stats.totalPnl)} pnl />
              <SmallStat title="Win Rate" value={formatPercent(winRate)} />
            </div>
          </Panel>

          <Panel title="Mode Controls" icon={<FaExchangeAlt />}>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBotMode("paper")}
                className={`rounded-2xl p-5 font-black ${
                  botMode === "paper"
                    ? "bg-yellow-400 text-black"
                    : "bg-white/10 text-white/60"
                }`}
              >
                Paper Mode
              </button>

              <button
                onClick={() => setBotMode("live")}
                className={`rounded-2xl p-5 font-black ${
                  botMode === "live"
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-white/60"
                }`}
              >
                Live Mode
              </button>
            </div>

            <p className="mt-4 text-sm text-white/40">
              Use paper mode for testing. Live mode uses real connected exchange funds.
            </p>
          </Panel>
        </section>

        <Panel title="Open Positions" icon={<FaFire />}>
          {positions.length === 0 ? (
            <Empty text="No open positions" />
          ) : (
            <div className="space-y-3">
              {positions.map((p, i) => {
                const symbol = p.symbol || p.instId || p.asset || "Position";
                const qty = p.qty ?? p.quantity ?? p.size ?? 0;
                const entry = p.entry_price ?? p.entryPrice ?? p.price ?? 0;
                const pnl = Number(p.pnl_usd ?? p.pnlUsd ?? p.pnl ?? 0);

                return (
                  <Row
                    key={p.id || `${symbol}-${i}`}
                    title={symbol}
                    subtitle={`Qty: ${qty} · Entry: ${formatMoney(entry)}`}
                    right={formatMoney(pnl)}
                    positive={pnl >= 0}
                  />
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Recent Trades" icon={<FaTrophy />}>
          {trades.length === 0 ? (
            <Empty text="No recent trades yet" />
          ) : (
            <div className="space-y-3">
              {trades.map((t, i) => {
                const pnl = Number(t.pnl_usd ?? t.pnl ?? 0);

                return (
                  <Row
                    key={t.id || i}
                    title={`${String(t.side || t.action || "").toUpperCase()} ${t.symbol || ""}`}
                    subtitle={t.strategy || t.created_at || ""}
                    right={formatMoney(pnl)}
                    positive={pnl >= 0}
                  />
                );
              })}
            </div>
          )}
        </Panel>

        <section className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-5">
          <h3 className="text-xl font-black text-red-300 mb-3">Emergency Controls</h3>
          <button
            onClick={handleCloseAll}
            disabled={processing || positions.length === 0}
            className="w-full rounded-2xl bg-red-500 py-4 font-black hover:bg-red-400 disabled:opacity-50"
          >
            Close All Positions
          </button>
        </section>

        <p className="text-center text-xs text-white/30 pb-6">
          Live trading involves real risk. Only trade what you can afford to lose.
        </p>
      </main>
    </div>
  );
}

function StatusPill({ running }) {
  return (
    <div
      className={`hidden sm:flex items-center gap-2 rounded-2xl px-4 py-3 font-black ${
        running ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
      }`}
    >
      <FaCircle className={`h-2 w-2 ${running ? "animate-pulse text-emerald-400" : "text-gray-400"}`} />
      {running ? "BOT RUNNING" : "BOT OFF"}
    </div>
  );
}

function HeroStat({ title, value, hot }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] p-4">
      <p className="text-xs uppercase tracking-widest text-white/40 font-black">{title}</p>
      <p className={`mt-3 text-2xl font-black ${hot ? "text-red-300" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function MetricCard({ icon, title, value, pnl }) {
  const numeric = Number(String(value).replace(/[$,%]/g, ""));
  const color = pnl ? (numeric >= 0 ? "text-emerald-300" : "text-red-300") : "text-white";

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex justify-between text-white/40">
        <span className="font-bold">{title}</span>
        <span className="text-cyan-300">{icon}</span>
      </div>
      <p className={`mt-5 text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-2xl font-black">{title}</h3>
        <span className="text-cyan-300 text-2xl">{icon}</span>
      </div>
      {children}
    </section>
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

function Row({ title, subtitle, right, positive }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/25 p-4">
      <div>
        <p className="font-black">{title || "Trade"}</p>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>
      <p className={`font-black ${positive ? "text-emerald-300" : "text-red-300"}`}>
        {right}
      </p>
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