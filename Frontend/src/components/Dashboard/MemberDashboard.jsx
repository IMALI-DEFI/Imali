// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay, FaPause, FaSpinner, FaSignOutAlt, FaCircle,
  FaExchangeAlt, FaCheckCircle, FaChartLine, FaInfoCircle
} from "react-icons/fa";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// ── helpers ──────────────────────────────────────────────────
const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

// Fix 1: robust money parser (same as BotAPI's parseMoney)
const parseMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    return parseMoney(
      value.total ?? value.balance ?? value.equity ?? value.available ?? value.cash ?? value.usd ?? 0
    );
  }
  return 0;
};

// ── safe wrappers for BotAPI's connection helpers (fallback if not yet in BotAPI.js) ──
const getConnectionStatusSafe = (key, status) => {
  if (BotAPI.getConnectionStatus) {
    return BotAPI.getConnectionStatus(key, status);
  }
  // fallback to direct property read
  if (key === "okx") {
    return {
      connected: status.okx_connected,
      mode: status.okx_mode,
      keyMasked: status.okx_api_key_masked,
    };
  }
  if (key === "alpaca") {
    return {
      connected: status.alpaca_connected,
      mode: status.alpaca_mode,
      keyMasked: status.alpaca_api_key_masked,
    };
  }
  // futures, dex placeholders
  return {
    connected: false,
    mode: "paper",
    keyMasked: null,
  };
};

const getConnectionBalanceSafe = (key, balances) => {
  if (BotAPI.getConnectionBalance) {
    return BotAPI.getConnectionBalance(key, balances);
  }
  const payload = balances?.data || balances || {};
  if (key === "okx") {
    return {
      total: Number(payload.okx ?? payload.okx_total ?? payload.total ?? 0),
      available: Number(payload.okx_available_usdt ?? 0),
    };
  }
  if (key === "alpaca") {
    return {
      total: Number(payload.alpaca ?? payload.alpaca_total ?? 0),
      available: Number(payload.alpaca ?? payload.alpaca_total ?? 0),
    };
  }
  return {
    total: 0,
    available: 0,
  };
};

const Metric = ({ label, value, positive }) => (
  <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
    <div className="text-xs text-white/40">{label}</div>
    <div
      className={`mt-1 text-2xl font-bold ${
        positive === true ? "text-emerald-400" :
        positive === false ? "text-red-400" :
        "text-white"
      }`}
    >
      {value}
    </div>
  </div>
);

const PortfolioBar = ({ usdt, openValue }) => {
  const total = Number(usdt || 0) + Number(openValue || 0);
  const usdtPct = total ? (usdt / total) * 100 : 0;
  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
      <h3 className="font-bold mb-3">Portfolio Allocation</h3>
      <div className="h-4 rounded-full overflow-hidden bg-white/10">
        <div className="h-full bg-emerald-500" style={{ width: `${usdtPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/50">
        <span>USDT {usdtPct.toFixed(1)}%</span>
        <span>Open positions {(100 - usdtPct).toFixed(1)}%</span>
      </div>
    </div>
  );
};

// ── strategies ───────────────────────────────────────────────
const STRATEGIES = [
  { id: "mean_reversion", name: "Conservative", icon: "🛡️", risk: "Low", description: "Slow, steady trades focused on consistency." },
  { id: "ai_weighted", name: "Balanced AI", icon: "🤖", risk: "Medium", description: "AI‑assisted balance between growth and protection." },
  { id: "momentum", name: "Growth", icon: "📈", risk: "Higher", description: "Faster opportunities with larger swings." },
  { id: "aggressive", name: "Aggressive", icon: "🔥", risk: "High", description: "High volatility with larger upside potential." },
];

// ── supported exchanges ──────────────────────────────────────
const EXCHANGES = [
  { id: "okx", name: "OKX", icon: "🟡", route: "/connect-okx" },
  { id: "alpaca", name: "Alpaca", icon: "🦙", route: "/connect-alpaca" },
  { id: "okx_futures", name: "Futures", icon: "⚡", disabled: true, placeholder: true },
  { id: "dex", name: "DEX", icon: "🔁", disabled: true, placeholder: true },
];

// ── component ─────────────────────────────────────────────────
export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const intervalRef = useRef(null);
  const balanceIntervalRef = useRef(null);
  const botStatusIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const [running, setRunning] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState(STRATEGIES[1]); // Balanced AI default
  const [isBotStarting, setIsBotStarting] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // active exchange
  const [activeExchange, setActiveExchange] = useState("okx");

  // connections map
  const [connections, setConnections] = useState(
    EXCHANGES.reduce((acc, ex) => {
      acc[ex.id] = {
        connected: false,
        mode: "paper",
        apiKeyMasked: null,
        balance: 0,
        availableUsdt: 0,
        apiVerified: false,
        apiError: null,
      };
      return acc;
    }, {})
  );

  // live stats with proper P&L breakdown
  const [liveStats, setLiveStats] = useState({
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    openPositions: 0,
    dailyPnl: 0,
    dailyTrades: 0,
    dailyPerformance: [], // array of { date, equity }
  });
  const [liveFeed, setLiveFeed] = useState([]);

  // computed from active exchange
  const currentConn = connections[activeExchange] || {};
  const liveTotalBalance = currentConn.balance || 0;
  const openPositionValue = Math.max(liveTotalBalance - (currentConn.availableUsdt || 0), 0);
  const liveWinRate =
    (liveStats.wins + liveStats.losses) > 0
      ? ((liveStats.wins / (liveStats.wins + liveStats.losses)) * 100).toFixed(1)
      : "0.0";

  // chart data preparation
  const equityData = liveStats.dailyPerformance?.length > 0
    ? {
        labels: liveStats.dailyPerformance.map(d => d.date || d.label),
        datasets: [
          {
            label: 'Account Equity',
            data: liveStats.dailyPerformance.map(d => d.equity || d.balance || d.total),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      }
    : {
        labels: [new Date().toLocaleDateString()],
        datasets: [
          {
            label: 'Account Equity',
            data: [liveTotalBalance],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      };

  const winLossData = {
    labels: ['Wins', 'Losses'],
    datasets: [
      {
        data: [liveStats.wins, liveStats.losses],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  // ── data fetching ──────────────────────────────────────────
  const fetchAllConnections = useCallback(async () => {
    const status = await BotAPI.getIntegrationStatus?.(true);
    if (!status || !isMountedRef.current) return;

    setConnections((prev) => {
      const next = { ...prev };
      for (const ex of EXCHANGES) {
        const key = ex.id;
        const connData = getConnectionStatusSafe(key, status);
        next[key] = {
          ...next[key],
          connected: connData.connected,
          mode: connData.mode,
          apiKeyMasked: connData.keyMasked,
          apiVerified: false,
          apiError: null,
        };
      }
      return next;
    });

    const balances = await BotAPI.getExchangeBalance?.(true);
    if (balances && isMountedRef.current) {
      setConnections((prev) => {
        const next = { ...prev };
        for (const ex of EXCHANGES) {
          const key = ex.id;
          const connBal = getConnectionBalanceSafe(key, balances);
          next[key] = {
            ...next[key],
            balance: connBal.total,
            availableUsdt: connBal.available,
            apiVerified: connBal.total > 0 || connBal.available > 0,
            apiError: null,
          };
        }
        return next;
      });
    }
  }, []);

  const fetchLiveStats = useCallback(async () => {
    try {
      const stats = await BotAPI.getLiveTradingStats?.();
      if (stats && isMountedRef.current) {
        const summary = stats.summary || stats;
        const realized = parseMoney(summary.total_pnl || summary.realized_pnl || summary.pnl || 0);
        const unrealized = parseMoney(summary.unrealized_pnl || summary.open_pnl || 0);
        setLiveStats({
          realizedPnl: realized,
          unrealizedPnl: unrealized,
          totalPnl: realized + unrealized,
          winRate: Number(summary.win_rate || stats.winRate || 0),
          totalTrades: Number(summary.total_trades || stats.totalTrades || stats.trades || 0),
          wins: Number(summary.wins || stats.wins || 0),
          losses: Number(summary.losses || stats.losses || 0),
          openPositions: Number(summary.open_positions || stats.open_positions || stats.openPositions || 0),
          dailyPnl: parseMoney(summary.daily_pnl || summary.dailyPnl || 0),
          dailyTrades: Number(summary.daily_trades || summary.dailyTrades || 0),
          dailyPerformance: summary.daily_performance || stats.dailyPerformance || [],
        });
      }
    } catch (err) {
      console.error("fetchLiveStats:", err);
    }
  }, []);

  const fetchLiveTrades = useCallback(async () => {
    try {
      const response = await BotAPI.getLiveTradeHistory?.(20);
      const trades = response?.trades || response?.data?.trades || [];
      if (isMountedRef.current) {
        setLiveFeed(
          trades.slice(0, 25).map((t) => {
            const isOpen = t.status === "open";
            const pnl = Number(t.pnl ?? t.pnl_usd ?? 0);
            return {
              id: t.id,
              symbol: t.symbol,
              pnl,
              status: t.status,
              type: isOpen ? "Live Position" : t.label || (pnl >= 0 ? "Take Profit" : "Stop Loss"),
              time: new Date(t.closed_at || t.created_at).toLocaleTimeString(),
            };
          })
        );
      }
    } catch (err) {
      console.error("fetchLiveTrades:", err);
    }
  }, []);

  // Fix 3: strict bot detection – only match the active exchange
  const fetchBotStatus = useCallback(async () => {
    try {
      const status = await BotAPI.getTradingBotStatus?.();
      const bots = Array.isArray(status?.data)
        ? status.data
        : Array.isArray(status?.data?.bots)
        ? status.data.bots
        : [];
      const activeBot = bots.find(
        (b) => b.exchange === activeExchange && (b.isRunning || b.status === "running")
      );
      if (isMountedRef.current) {
        setRunning(!!activeBot);
        if (activeBot?.strategy) {
          const strat = STRATEGIES.find((s) => s.id === activeBot.strategy);
          if (strat) setCurrentStrategy(strat);
        }
      }
    } catch (err) {
      console.error("fetchBotStatus:", err);
    }
  }, [activeExchange]);

  // ── effects ─────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (botStatusIntervalRef.current) clearInterval(botStatusIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsInitialLoad(true);
      await Promise.all([fetchAllConnections(), fetchBotStatus(), fetchLiveStats(), fetchLiveTrades()]);
      setIsInitialLoad(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (currentConn.mode === "live") {
      const refresh = () => {
        fetchAllConnections();
        fetchBotStatus();
        fetchLiveStats();
        fetchLiveTrades();
      };
      refresh();
      balanceIntervalRef.current = setInterval(refresh, 15000);
      botStatusIntervalRef.current = setInterval(fetchBotStatus, 5000);
    }
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
      if (botStatusIntervalRef.current) clearInterval(botStatusIntervalRef.current);
    };
  }, [currentConn.mode, activeExchange]);

  // ── actions ─────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout?.();
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  const startStopBot = async () => {
    if (running) {
      setIsBotStarting(true);
      try {
        await BotAPI.stopTradingBot?.(activeExchange);
        setRunning(false);
        await fetchBotStatus();
      } catch (err) {
        alert("Failed to stop bot: " + err.message);
      } finally {
        setIsBotStarting(false);
      }
      return;
    }

    if (!currentConn.connected || currentConn.mode !== "live") {
      alert(`Connect ${activeExchange.toUpperCase()} and switch to LIVE mode first.`);
      return;
    }

    const confirmed = window.confirm(
      `Start live trading with ${currentStrategy.name}?\n\n` +
      `This uses real ${activeExchange.toUpperCase()} funds. The bot may buy, sell, take profit, or stop loss automatically.`
    );
    if (!confirmed) return;

    setIsBotStarting(true);
    try {
      const result = await BotAPI.startTradingBot?.(activeExchange, currentStrategy.id, "live");
      if (result?.success) {
        setRunning(true);
        await fetchBotStatus();
        await fetchLiveStats();
        await fetchLiveTrades();
        await fetchAllConnections();
      } else {
        alert(result?.error || "Failed to start bot");
      }
    } catch (err) {
      alert("Start error: " + err.message);
    } finally {
      setIsBotStarting(false);
    }
  };

  const handleExchangeTab = (exchangeId) => {
    if (EXCHANGES.find(e => e.id === exchangeId)?.disabled) {
      alert("Coming soon!");
      return;
    }
    setActiveExchange(exchangeId);
    fetchAllConnections();
    fetchBotStatus();
  };

  // ── top bar status string ──────────────────────────────────
  const connectionLabel = currentConn.connected
    ? (currentConn.mode === "live" ? "LIVE" : "DEMO")
    : "NOT CONNECTED";
  const botLabel = running ? "BOT RUNNING" : "BOT OFF";

  // ── render ──────────────────────────────────────────────────
  if (isInitialLoad && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <FaSpinner className="animate-spin text-4xl text-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <button onClick={() => navigate("/login")} className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-bold">IMALI Live Trading</p>
            <p className="text-xs text-white/80">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
            running ? "bg-red-500 animate-pulse" : 
            currentConn.connected ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500"
          }`}>
            <FaCircle className="h-2 w-2" />
            {connectionLabel} • {botLabel}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold hover:bg-red-500">
            <FaSignOutAlt size={12} />
            Logout
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Exchange tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {EXCHANGES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleExchangeTab(ex.id)}
              disabled={ex.disabled}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                activeExchange === ex.id
                  ? "bg-cyan-600 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              } ${ex.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span>{ex.icon}</span>
              {ex.name}
              {ex.placeholder && <span className="text-xs ml-1 opacity-70">soon</span>}
            </button>
          ))}
        </div>

        {/* 1. Am I connected? */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-2xl font-bold mb-4">🔗 Am I connected?</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/10 gap-4">
            <div className="flex items-center gap-3">
              <FaExchangeAlt className="text-2xl text-cyan-400" />
              <div>
                <div className="font-bold">{activeExchange.toUpperCase()}</div>
                <div className="text-sm text-white/50">
                  {currentConn.apiKeyMasked
                    ? `Key: ${currentConn.apiKeyMasked}`
                    : "Not connected"}
                </div>
                {currentConn.connected && (
                  <div className="mt-1 text-sm">
                    {currentConn.apiVerified ? (
                      <span className="text-emerald-400">✅ API verified and balance loaded</span>
                    ) : currentConn.apiError ? (
                      <span className="text-red-400">❌ {currentConn.apiError}</span>
                    ) : (
                      <span className="text-yellow-400">⚠️ Connected, waiting for balance verification</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-xl font-bold ${currentConn.mode === "live" ? "text-red-400" : "text-emerald-400"}`}>
                {currentConn.mode === "live" ? "LIVE" : "Demo"}
              </div>
              <div className="text-sm text-white/40">
                Balance: {formatMoney(currentConn.balance)}
              </div>
            </div>
            {!currentConn.connected && (
              <button
                onClick={() => navigate(EXCHANGES.find(e => e.id === activeExchange)?.route || "/connect-okx")}
                className="rounded-xl bg-cyan-600 px-4 py-2 font-bold hover:bg-cyan-500"
              >
                Connect {activeExchange.toUpperCase()}
              </button>
            )}
          </div>
        </div>

        {/* 2. What strategy is selected? */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-2xl font-bold mb-4">🎯 What strategy is selected?</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {STRATEGIES.map((strat) => {
              const active = currentStrategy.id === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => !running && setCurrentStrategy(strat)}
                  disabled={running}
                  className={`rounded-2xl border p-4 text-left transition flex flex-col ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="text-3xl mb-1">{strat.icon}</div>
                  <div className="font-bold text-sm">{strat.name}</div>
                  <div className="text-xs text-white/50">{strat.risk} Risk</div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-3 flex-1">{strat.description}</p>
                  {active && <div className="mt-2 text-xs text-cyan-400">✓ Active</div>}
                </button>
              );
            })}
          </div>
          {running && <p className="mt-3 text-xs text-yellow-400">Stop the bot to change strategy.</p>}
        </div>

        {/* 3. Am I making money? */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-2xl font-bold mb-4">💰 Am I making money?</h2>
          
          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Metric label="Account Value" value={formatMoney(liveTotalBalance)} />
            <Metric label="USDT Available" value={formatMoney(currentConn.availableUsdt)} />
            <Metric label="Realized P&L" value={formatMoney(liveStats.realizedPnl)} positive={liveStats.realizedPnl >= 0} />
            <Metric label="Unrealized P&L" value={formatMoney(liveStats.unrealizedPnl)} positive={liveStats.unrealizedPnl >= 0} />
            <Metric label="Net P&L" value={formatMoney(liveStats.totalPnl)} positive={liveStats.totalPnl >= 0} />
            <Metric label="Win Rate" value={`${liveWinRate}%`} />
            <Metric label="Open Positions" value={liveStats.openPositions} />
            <Metric label="Trades" value={liveStats.totalTrades} />
          </div>

          {/* Equity Curve */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">📈 Account Growth</h3>
            <div className="h-48 w-full">
              <Line data={equityData} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { ticks: { color: '#ffffff50' }, grid: { display: false } },
                  y: { ticks: { color: '#ffffff50' }, grid: { color: '#ffffff10' } }
                },
                plugins: { legend: { display: false } }
              }} />
            </div>
          </div>

          {/* Win / Loss Doughnut */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">🥧 Win / Loss Ratio</h3>
            <div className="h-40 w-40 mx-auto">
              <Doughnut data={winLossData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }} />
            </div>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              <span className="text-emerald-400">Wins: {liveStats.wins}</span>
              <span className="text-red-400">Losses: {liveStats.losses}</span>
            </div>
          </div>

          {/* Portfolio Allocation */}
          <PortfolioBar usdt={currentConn.availableUsdt} openValue={openPositionValue} />
        </div>

        {/* Start / Stop */}
        <div className="text-center">
          <button
            onClick={startStopBot}
            disabled={isBotStarting}
            className={`text-2xl font-bold px-12 py-6 rounded-2xl transition transform hover:scale-105 ${
              isBotStarting ? "bg-gray-600 cursor-not-allowed" :
              running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isBotStarting ? (
              <FaSpinner className="inline mr-3 animate-spin" />
            ) : running ? (
              <FaPause className="inline mr-3" />
            ) : (
              <FaPlay className="inline mr-3" />
            )}
            {running ? "Stop Bot" : "Start Live Trading"}
          </button>
          {running && (
            <p className="mt-2 text-xs text-green-400">Bot is actively monitoring the market</p>
          )}
          {!running && !currentConn.connected && (
            <p className="mt-3 text-sm text-amber-400">
              <FaInfoCircle className="inline mr-1" />
              Connect {activeExchange.toUpperCase()} and enable LIVE mode to start.
            </p>
          )}
        </div>

        {/* Trade Feed */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-xl font-bold mb-4">📋 Trade Feed</h2>
          {liveFeed.length === 0 ? (
            <div className="py-12 text-center text-white/30">
              <div className="mb-3 text-4xl">🤖</div>
              <p>No trades yet. Start the bot to see activity.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {liveFeed.map((trade) => (
                <div
                  key={trade.id}
                  className="flex justify-between items-center p-3 rounded-xl border border-white/10 bg-black/20"
                >
                  <div>
                    <span className="font-bold">{trade.symbol}</span>
                    <div className="text-xs text-white/40">
                      {trade.type} • {trade.time}
                    </div>
                  </div>
                  <div
                    className={`font-bold ${
                      trade.status === "open"
                        ? "text-cyan-400"
                        : trade.pnl >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {trade.status === "open"
                      ? "OPEN"
                      : `${trade.pnl >= 0 ? "+" : ""}${formatMoney(trade.pnl)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup instructions */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 text-sm text-white/70">
          <p>1. Connect your {activeExchange.toUpperCase()} API keys.</p>
          <p>2. Verify balance and permissions.</p>
          <p>3. Choose a strategy.</p>
          <p>4. Press <strong>Start Live Trading</strong> once.</p>
          <p className="text-yellow-400 mt-2">
            Do not press Start repeatedly. The bot monitors and exits trades automatically.
          </p>
        </div>

        <div className="pb-8 text-center text-xs text-white/30">
          Live trading involves real risk. Only trade what you can afford to lose.
        </div>
      </div>
    </div>
  );
}