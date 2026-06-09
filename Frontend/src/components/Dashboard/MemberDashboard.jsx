// src/components/Dashboard/MemberDashboard.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BotAPI from "../../utils/BotAPI";
import {
  FaPlay, FaPause, FaSpinner, FaSignOutAlt, FaCircle,
  FaExchangeAlt, FaCheckCircle, FaChartLine, FaInfoCircle
} from "react-icons/fa";

// ── helpers ──────────────────────────────────────────────────
const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

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

// ── supported exchanges (OKX, Alpaca, futures, DEX) ──────────
const EXCHANGES = [
  { id: "okx", name: "OKX", icon: "🟡", route: "/connect-okx" },
  { id: "alpaca", name: "Alpaca", icon: "🦙", route: "/connect-alpaca" },
  { id: "futures", name: "Futures", icon: "⚡", disabled: true, placeholder: true },
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

  // active exchange state (supports OKX, Alpaca, futures, DEX)
  const [activeExchange, setActiveExchange] = useState("okx");

  // connections map: exchange id -> { connected, mode, apiKeyMasked, balance, availableUsdt, apiVerified, apiError }
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

  const [liveStats, setLiveStats] = useState({
    pnl: 0,
    winRate: 0,
    trades: 0,
    wins: 0,
    losses: 0,
    openPositions: 0,
    dailyPnl: 0,
    dailyTrades: 0,
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

  // ── data fetching ──────────────────────────────────────────
  const fetchAllConnections = useCallback(async () => {
    const status = await BotAPI.getIntegrationStatus?.(true);
    if (!status || !isMountedRef.current) return;

    setConnections((prev) => {
      const next = { ...prev };
      for (const ex of EXCHANGES) {
        const key = ex.id;
        const connData = BotAPI.getConnectionStatus?.(key, status) || {
          connected: false,
          mode: "paper",
          keyMasked: null,
        };
        next[key] = {
          ...next[key],
          connected: connData.connected,
          mode: connData.mode,
          apiKeyMasked: connData.keyMasked,
          // reset verification until balances arrive
          apiVerified: false,
          apiError: null,
        };
      }
      return next;
    });

    // fetch balances for all exchanges
    const balances = await BotAPI.getExchangeBalance?.(true);
    if (balances && isMountedRef.current) {
      setConnections((prev) => {
        const next = { ...prev };
        for (const ex of EXCHANGES) {
          const key = ex.id;
          const connBal = BotAPI.getConnectionBalance?.(key, balances) || {
            total: 0,
            available: 0,
          };
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
        setLiveStats({
          pnl: stats.summary?.total_pnl || stats.total_pnl || stats.pnl || 0,
          winRate: stats.summary?.win_rate || stats.win_rate || stats.winRate || 0,
          trades: stats.summary?.total_trades || stats.total_trades || stats.trades || 0,
          wins: stats.summary?.wins || stats.wins || 0,
          losses: stats.summary?.losses || stats.losses || 0,
          openPositions: stats.summary?.open_positions || stats.open_positions || 0,
          dailyPnl: stats.summary?.daily_pnl || stats.daily_pnl || 0,
          dailyTrades: stats.summary?.daily_trades || stats.daily_trades || 0,
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
              type: isOpen
                ? "Live Position"
                : t.label || (pnl >= 0 ? "Take Profit" : "Stop Loss"),
              time: new Date(t.closed_at || t.created_at).toLocaleTimeString(),
            };
          })
        );
      }
    } catch (err) {
      console.error("fetchLiveTrades:", err);
    }
  }, []);

  const fetchBotStatus = useCallback(async () => {
    try {
      const status = await BotAPI.getTradingBotStatus?.();
      const bots = Array.isArray(status?.data)
        ? status.data
        : Array.isArray(status?.data?.bots)
        ? status.data.bots
        : [];
      const activeBot = bots.find(
        (b) => (b.exchange === activeExchange || b.exchange === "okx") && (b.isRunning || b.status === "running")
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
    // force refresh
    fetchAllConnections();
    fetchBotStatus();
  };

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
            running ? "bg-red-500 animate-pulse" : "bg-white/20"
          }`}>
            <FaCircle className="h-2 w-2" />
            {running ? "LIVE" : "OFF"}
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
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {STRATEGIES.map((strat) => {
              const active = currentStrategy.id === strat.id;
              return (
                <button
                  key={strat.id}
                  onClick={() => !running && setCurrentStrategy(strat)}
                  disabled={running}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="text-3xl">{strat.icon}</div>
                  <div className="mt-2 font-bold">{strat.name}</div>
                  <div className="text-xs text-white/50">{strat.risk} Risk</div>
                  <p className="mt-1 text-xs text-slate-400">{strat.description}</p>
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Metric label="Total Value" value={formatMoney(liveTotalBalance)} />
            <Metric label="USDT Available" value={formatMoney(currentConn.availableUsdt)} />
            <Metric label="Realized P&L" value={formatMoney(liveStats.pnl)} positive={liveStats.pnl >= 0} />
            <Metric label="Open Positions" value={liveStats.openPositions} />
            <Metric label="Win Rate" value={`${liveWinRate}%`} />
            <Metric label="Trades" value={liveStats.trades} />
          </div>
          <PortfolioBar
            usdt={currentConn.availableUsdt}
            openValue={openPositionValue}
          />
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