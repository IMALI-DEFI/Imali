// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../utils/BotAPI";
import BotAPI from "../../utils/BotAPI";

/* Feature modules */
import ImaliBalance from "./ImaliBalance";
import Staking from "./Staking";
import YieldFarming from "./YieldFarming";
import NFTPreview from "./NFTPreview";
import TierStatus from "./TierStatus";
import RecentTradesTable from "./RecentTradesTable";
import ReferralSystem from "./ReferralSystem";
import TradeDemo from "./TradeDemo";
import Futures from "./Futures";

/* ===================== CONSTANTS ===================== */
const TIER_ORDER = ["starter", "pro", "elite", "stock", "bundle"];
const POLL_INTERVAL = 60_000;   // 60 seconds (was 15s — caused 429s)
const RETRY_BASE_DELAY = 2000;  // 2 seconds base backoff
const MAX_RETRIES = 3;

/* ===================== HELPERS ===================== */
const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return TIER_ORDER.includes(t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) =>
  TIER_ORDER.indexOf(normalizeTier(userTier)) >=
  TIER_ORDER.indexOf(normalizeTier(requiredTier));

const normalizeExchange = (exchange) => {
  if (!exchange) return "DEX";
  const u = exchange.toUpperCase();
  if (u.includes("OKX")) return "OKX";
  if (u.includes("ALPACA")) return "ALPACA";
  if (u.includes("DEX")) return "DEX";
  if (u.includes("FUTURE")) return "FUTURES";
  return "DEX";
};

const formatMoney = (n) => {
  const val = Number(n) || 0;
  const sign = val >= 0 ? "+" : "";
  return `${sign}$${Math.abs(val).toFixed(2)}`;
};

/* ===================== RATE-LIMITED FETCH ===================== */
const fetchWithRetry = async (url, retries = MAX_RETRIES, delay = RETRY_BASE_DELAY) => {
  try {
    const res = await api.get(url);
    return res;
  } catch (err) {
    if (retries > 0 && err.response?.status === 429) {
      const retryAfter = parseInt(err.response.headers?.["retry-after"] || "0", 10) * 1000;
      const waitTime = Math.max(retryAfter, delay);
      console.log(`[Dashboard] 429 on ${url}, retrying in ${waitTime}ms (${retries} left)`);
      await new Promise((r) => setTimeout(r, waitTime));
      return fetchWithRetry(url, retries - 1, delay * 2);
    }
    throw err;
  }
};

/* ===================== PROGRESS RING ===================== */
const ProgressRing = ({ percent, size = 80, stroke = 6, color = "#10b981", children }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

/* ===================== MINI BAR CHART ===================== */
const MiniBarChart = ({ data, height = 60 }) => {
  if (!data.length) {
    return (
      <div className="flex items-end gap-1 justify-center" style={{ height }}>
        <p className="text-xs text-white/30">No trades yet — start the bot! 🤖</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.slice(-20).map((d, i) => {
        const h = (Math.abs(d.value) / max) * height * 0.9;
        return (
          <div
            key={i}
            title={`${d.label}: ${formatMoney(d.value)}`}
            className={`rounded-t flex-1 min-w-[4px] max-w-[16px] transition-all duration-300 cursor-pointer hover:opacity-80 ${
              d.value >= 0 ? "bg-emerald-500" : "bg-red-500"
            }`}
            style={{ height: Math.max(h, 2) }}
          />
        );
      })}
    </div>
  );
};

/* ===================== LEVEL BADGE ===================== */
const LevelBadge = ({ trades, winRate, pnl }) => {
  const level = useMemo(() => {
    let xp = 0;
    xp += Math.min(trades, 50) * 2;          // 2 XP per trade, max 100
    xp += Math.max(0, winRate - 40) * 1.5;   // bonus for win rate above 40
    xp += Math.max(0, pnl) * 0.1;            // 0.1 XP per dollar profit

    if (xp >= 200) return { name: "🏆 Legend", level: 5, color: "text-yellow-400", xp, next: 200 };
    if (xp >= 120) return { name: "💎 Diamond", level: 4, color: "text-cyan-400", xp, next: 200 };
    if (xp >= 70)  return { name: "🥇 Gold", level: 3, color: "text-yellow-300", xp, next: 120 };
    if (xp >= 30)  return { name: "🥈 Silver", level: 2, color: "text-gray-300", xp, next: 70 };
    return { name: "🥉 Bronze", level: 1, color: "text-amber-600", xp, next: 30 };
  }, [trades, winRate, pnl]);

  const progress = (level.xp / level.next) * 100;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-white/60">Your Trader Level</h3>
        <span className={`text-lg font-bold ${level.color}`}>{level.name}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-white/40 mt-1">
        {Math.floor(level.xp)} / {level.next} XP — Keep trading to level up!
      </p>
    </div>
  );
};

/* ===================== EXCHANGE CARD (GAMIFIED) ===================== */
const ExchangeCard = ({ name, connected, mode, trades, icon }) => {
  const pnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    return ((trades.filter((t) => (t.pnl_usd || 0) > 0).length / trades.length) * 100).toFixed(1);
  }, [trades]);

  const chartData = useMemo(
    () => trades.slice(-15).map((t, i) => ({ label: `Trade ${i + 1}`, value: t.pnl_usd || 0 })),
    [trades]
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold">{name}</h3>
            {connected ? (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                mode === "live" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
              }`}>
                {mode || "paper"}
              </span>
            ) : (
              <span className="text-xs text-yellow-500">⚠️ Not connected</span>
            )}
          </div>
        </div>
        <ProgressRing
          percent={Number(winRate)}
          size={48}
          stroke={4}
          color={Number(winRate) >= 50 ? "#10b981" : "#ef4444"}
        >
          <span className="text-xs font-bold">{winRate}%</span>
        </ProgressRing>
      </div>

      <MiniBarChart data={chartData} height={40} />

      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-xs text-white/40">Trades</div>
          <div className="font-bold">{trades.length}</div>
        </div>
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-xs text-white/40">Profit</div>
          <div className={`font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatMoney(pnl)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== UPGRADE CARD ===================== */
const UpgradeCard = ({ name, icon, description, features, color, currentTier, requiredTier }) => {
  const nav = useNavigate();
  const unlocked = tierAtLeast(currentTier, requiredTier);

  return (
    <div className={`rounded-xl p-4 border transition-all ${
      unlocked
        ? `bg-${color}-500/5 border-${color}-500/20`
        : "bg-white/5 border-white/10 opacity-60"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <span className={`text-xs ${unlocked ? "text-emerald-400" : "text-white/40"}`}>
            {unlocked ? "✅ Active" : `🔒 Requires ${requiredTier.toUpperCase()}`}
          </span>
        </div>
      </div>
      <p className="text-xs text-white/50 mb-3">{description}</p>
      <ul className="space-y-1 mb-3">
        {features.map((f, i) => (
          <li key={i} className="text-xs text-white/40 flex items-center gap-1">
            <span>{unlocked ? "✅" : "⬜"}</span> {f}
          </li>
        ))}
      </ul>
      {!unlocked && (
        <button
          onClick={() => nav("/pricing")}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Upgrade to Unlock →
        </button>
      )}
    </div>
  );
};

/* ===================== FUTURES POSITIONS ===================== */
const FuturesPositions = ({ tier, isActive }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!tierAtLeast(tier, "elite") || !isActive || !available) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        const res = await fetchWithRetry("/api/futures/positions");
        if (mounted) setPositions(res.data?.positions || []);
      } catch (err) {
        if (err.response?.status === 404 && mounted) setAvailable(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [tier, isActive, available]);

  if (!tierAtLeast(tier, "elite") || !isActive || !available) return null;
  if (loading) return <div className="bg-white/5 rounded-xl p-4 animate-pulse h-24" />;

  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="font-semibold">Futures Positions</h3>
        </div>
        <span className={`text-sm font-medium ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
          P&L: {formatMoney(totalPnL)}
        </span>
      </div>

      {positions.length === 0 ? (
        <p className="text-sm text-white/40 py-2">No open positions — the bot will open them automatically 🤖</p>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => (
            <div key={pos.symbol} className="bg-black/30 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{pos.symbol}</span>
                  <span className="text-xs text-white/40 ml-2">
                    {pos.size} @ ${pos.entryPrice}
                  </span>
                </div>
                <span className={pos.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                  {pos.pnl > 0 ? "+" : ""}{pos.pnl}%
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-white/40">
                <span>Leverage: {pos.leverage}x</span>
                <span>Liq: ${pos.liquidation}</span>
                <span>Margin: ${pos.margin}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ===================== PnL BREAKDOWN ===================== */
const ExchangePnLBreakdown = ({ trades, status, tier }) => {
  const byExchange = useMemo(() => {
    const result = {
      OKX: { trades: [], total: 0, wins: 0 },
      ALPACA: { trades: [], total: 0, wins: 0 },
      DEX: { trades: [], total: 0, wins: 0 },
      FUTURES: { trades: [], total: 0, wins: 0 },
    };

    trades.forEach((t) => {
      const ex = normalizeExchange(t.exchange);
      if (result[ex]) {
        result[ex].trades.push(t);
        result[ex].total += t.pnl_usd || 0;
        if ((t.pnl_usd || 0) > 0) result[ex].wins++;
      }
    });

    return result;
  }, [trades]);

  const exchanges = [
    { key: "OKX", icon: "🔷", color: "blue", minTier: "starter", connected: !!status?.okx_connected, mode: status?.okx_mode },
    { key: "ALPACA", icon: "📈", color: "emerald", minTier: "starter", connected: !!status?.alpaca_connected, mode: status?.alpaca_mode },
    { key: "DEX", icon: "🦄", color: "purple", minTier: "stock", connected: !!status?.wallet_connected, mode: "active" },
    { key: "FUTURES", icon: "📊", color: "amber", minTier: "elite", connected: tierAtLeast(tier, "elite"), mode: "ready" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {exchanges.map(({ key, icon, minTier, connected, mode }) => {
        const show = tierAtLeast(tier, minTier);
        const data = byExchange[key];
        const wr = data.trades.length > 0
          ? ((data.wins / data.trades.length) * 100).toFixed(1)
          : "0.0";

        if (!show) return null;

        return (
          <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{icon}</span>
              <h4 className="font-medium">{key}</h4>
              {connected && (
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                  mode === "live" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                }`}>
                  {mode || "paper"}
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Trades</span>
                <span className="font-medium">{data.trades.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Win Rate</span>
                <span className="font-medium">{wr}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">P&L</span>
                <span className={`font-bold ${data.total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(data.total)}
                </span>
              </div>

              {/* Mini win rate bar */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    Number(wr) >= 50 ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  style={{ width: `${wr}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ===================== CONNECTION PILLS ===================== */
const ConnectionPills = ({ status, tier }) => {
  if (!status) return null;

  const pills = [
    { show: !!status.okx_connected && tierAtLeast(tier, "starter"), label: `OKX: ${status.okx_mode || "paper"}`, color: "blue" },
    { show: !!status.alpaca_connected && tierAtLeast(tier, "starter"), label: `Alpaca: ${status.alpaca_mode || "paper"}`, color: "emerald" },
    { show: !!status.wallet_connected && tierAtLeast(tier, "stock"), label: "DEX Ready", color: "purple" },
  ].filter((p) => p.show);

  if (!pills.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {pills.map((p, i) => (
        <span
          key={i}
          className={`px-2 py-1 bg-${p.color}-500/20 text-${p.color}-300 rounded-full text-xs flex items-center gap-1`}
        >
          <span className={`w-1.5 h-1.5 bg-${p.color}-400 rounded-full animate-pulse`} />
          {p.label}
        </span>
      ))}
    </div>
  );
};

/* ===================== SETUP BANNER ===================== */
const SetupBanner = ({ billing, connections, trading, onCTA }) => {
  if (billing && connections && trading) return null;

  const step = !billing
    ? { msg: "💳 Add a payment method to start earning", btn: "Add Card" }
    : !connections
    ? { msg: "🔌 Connect your exchanges so the bot can trade for you", btn: "Connect Now" }
    : { msg: "⚡ Hit the button to let your bot start making trades!", btn: "Enable Trading" };

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🚀</span>
        <div>
          <p className="text-white font-medium">{step.msg}</p>
          <p className="text-xs text-white/50 mt-1">
            You're almost there — just a few clicks away!
          </p>
        </div>
      </div>
      <button
        onClick={onCTA}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium whitespace-nowrap transition-colors"
      >
        {step.btn} →
      </button>
    </div>
  );
};

/* =====================================================================
   MAIN DASHBOARD COMPONENT
===================================================================== */
export default function MemberDashboard() {
  const nav = useNavigate();
  const {
    user: authUser,
    activation,
    activationComplete: ctxActivationComplete,
    setActivation,
    refreshActivation,
  } = useAuth();

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  // Prevent duplicate fetches
  const fetchInFlight = useRef(false);
  const pollRef = useRef(null);

  /* ================ DERIVED STATE ================ */
  const normalizedTier = useMemo(() => normalizeTier(authUser?.tier), [authUser?.tier]);

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;

  const connectionsComplete = useMemo(() => {
    const needsOkx = ["starter", "pro", "bundle"].includes(normalizedTier);
    const needsAlpaca = ["starter", "bundle"].includes(normalizedTier);
    const needsWallet = ["elite", "stock", "bundle"].includes(normalizedTier);
    return (
      (!needsOkx || okxConnected) &&
      (!needsAlpaca || alpacaConnected) &&
      (!needsWallet || walletConnected)
    );
  }, [normalizedTier, okxConnected, alpacaConnected, walletConnected]);

  const activationComplete = billingComplete && connectionsComplete && tradingEnabled;

  /* ================ SINGLE TRADE FETCHER (deduplicated) ================ */
  const loadTrades = useCallback(async () => {
    // Guard: don't fetch if not activated or already fetching
    if (!activationComplete) {
      setTrades([]);
      setLoading(false);
      return;
    }

    if (fetchInFlight.current) {
      console.log("[Dashboard] Skipping duplicate fetch");
      return;
    }

    fetchInFlight.current = true;

    try {
      const res = await fetchWithRetry("/api/sniper/trades");
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch (err) {
      if (err.response?.status !== 429) {
        console.warn("[Dashboard] Failed to load trades:", err.message);
      }
      // Don't clear trades on error — keep stale data
    } finally {
      fetchInFlight.current = false;
      setLoading(false);
    }
  }, [activationComplete]);

  // Initial load — ONE call
  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Polling — ONE interval, long delay, with cleanup
  useEffect(() => {
    if (!activationComplete) return;

    // Clear any existing interval first
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(() => {
      console.log("[Dashboard] Polling trades...");
      loadTrades();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activationComplete, loadTrades]);

  /* ================ METRICS ================ */
  const totalPnL = useMemo(() => trades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [trades]);

  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    return ((trades.filter((t) => (t.pnl_usd || 0) > 0).length / trades.length) * 100).toFixed(1);
  }, [trades]);

  const confidence = useMemo(() => {
    let s = 40;
    if (winRate > 60) s += 20;
    if (trades.length > 20) s += 15;
    if (activationComplete) s += 15;
    return Math.min(s, 100);
  }, [winRate, trades.length, activationComplete]);

  const todayTrades = useMemo(() => {
    const today = new Date().toDateString();
    return trades.filter((t) => new Date(t.created_at || t.timestamp).toDateString() === today);
  }, [trades]);

  const todayPnL = useMemo(() => todayTrades.reduce((s, t) => s + (t.pnl_usd || 0), 0), [todayTrades]);

  const chartData = useMemo(
    () => trades.slice(-20).map((t, i) => ({ label: `#${i + 1}`, value: t.pnl_usd || 0 })),
    [trades]
  );

  /* ================ ACTIONS ================ */
  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await BotAPI.toggleTrading(enabled);

      if (refreshActivation) {
        await refreshActivation();
      } else {
        const res = await BotAPI.activationStatus();
        if (setActivation) setActivation(res?.status ?? res);
      }

      setBanner({
        type: "success",
        message: enabled ? "✅ Trading enabled! Your bot is ready." : "Trading paused.",
      });

      if (enabled) await loadTrades();
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Couldn't update trading status",
      });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    if (!activationComplete) {
      setBanner({ type: "error", message: "Finish setup first — you're almost there!" });
      return;
    }

    try {
      setBusy(true);
      const mode = activation?.okx_mode === "live" || activation?.alpaca_mode === "live" ? "live" : "paper";
      const res = await BotAPI.startBot({ mode });

      if (res?.started) {
        setBanner({ type: "success", message: `🤖 Bot started in ${mode} mode! Sit back and relax.` });
        // Reload trades after a short delay to let bot initialize
        setTimeout(loadTrades, 3000);
      } else {
        throw new Error();
      }
    } catch {
      setBanner({ type: "error", message: "Bot didn't start — try again in a moment" });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupCTA = () => {
    if (!billingComplete) nav("/billing");
    else nav("/activation");
  };

  /* ================ LOADING ================ */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in to continue</p>
          <button onClick={() => nav("/login")} className="px-6 py-2 bg-emerald-600 rounded-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ================ RENDER ================ */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Banners ── */}
        {banner && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              banner.type === "error"
                ? "bg-red-600/10 border-red-500/40 text-red-200"
                : "bg-emerald-600/10 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span>{banner.message}</span>
            <button onClick={() => setBanner(null)} className="text-white/40 hover:text-white ml-4">✕</button>
          </div>
        )}

        <SetupBanner
          billing={billingComplete}
          connections={connectionsComplete}
          trading={tradingEnabled}
          onCTA={handleSetupCTA}
        />

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Hey there! 👋 Welcome back
            </h1>
            <p className="text-sm text-white/50">{authUser.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
                {normalizedTier.toUpperCase()} Plan
              </span>
              {activationComplete && (
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                  ✓ Active
                </span>
              )}
            </div>
            <ConnectionPills status={activation} tier={normalizedTier} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleTrading(!tradingEnabled)}
              disabled={busy || !activationComplete}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                tradingEnabled
                  ? "bg-red-600/80 hover:bg-red-600"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {busy ? "..." : tradingEnabled ? "⏸ Pause Bot" : "▶ Enable Bot"}
            </button>
            <button
              onClick={startBot}
              disabled={!tradingEnabled || busy || !activationComplete}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {busy ? "..." : "🚀 Start Bot"}
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">💰 Account Value</div>
            <div className="text-xl font-bold mt-1">${(1000 + totalPnL).toFixed(2)}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">📈 Today's P&L</div>
            <div className={`text-xl font-bold mt-1 ${todayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatMoney(todayPnL)}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">📊 Total P&L</div>
            <div className={`text-xl font-bold mt-1 ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatMoney(totalPnL)}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">🎯 Win Rate</div>
            <div className="text-xl font-bold mt-1">{winRate}%</div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${Number(winRate) >= 50 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10">
            <div className="text-xs text-white/50">🤖 Bot Confidence</div>
            <div className="flex items-center gap-3 mt-1">
              <ProgressRing percent={confidence} size={44} stroke={4}>
                <span className="text-xs font-bold">{confidence}%</span>
              </ProgressRing>
              <span className="text-sm text-white/60">
                {confidence >= 80 ? "Excellent!" : confidence >= 60 ? "Good" : "Building..."}
              </span>
            </div>
          </div>
        </div>

        {/* ── Trader Level ── */}
        <LevelBadge trades={trades.length} winRate={Number(winRate)} pnl={totalPnL} />

        {/* ── P&L Chart ── */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">📉 Recent Trade Results</h2>
            <span className="text-xs text-white/40">{trades.length} total trades</span>
          </div>
          <MiniBarChart data={chartData} height={80} />
          <div className="flex justify-between mt-2 text-xs text-white/30">
            <span>← Older</span>
            <span>Newer →</span>
          </div>
        </div>

        {/* ── Active Services (Exchange Cards) ── */}
        {activationComplete && (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-4">🔗 Your Active Services</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tierAtLeast(normalizedTier, "starter") && (
                  <ExchangeCard
                    name="OKX Crypto"
                    icon="🔷"
                    connected={okxConnected}
                    mode={activation?.okx_mode}
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "OKX")}
                  />
                )}
                {tierAtLeast(normalizedTier, "starter") && (
                  <ExchangeCard
                    name="Alpaca Stocks"
                    icon="📈"
                    connected={alpacaConnected}
                    mode={activation?.alpaca_mode}
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "ALPACA")}
                  />
                )}
                {tierAtLeast(normalizedTier, "stock") && (
                  <ExchangeCard
                    name="DEX Trading"
                    icon="🦄"
                    connected={walletConnected}
                    mode={walletConnected ? "active" : null}
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "DEX")}
                  />
                )}
                {tierAtLeast(normalizedTier, "elite") && (
                  <ExchangeCard
                    name="Futures"
                    icon="📊"
                    connected={true}
                    mode="ready"
                    trades={trades.filter((t) => normalizeExchange(t.exchange) === "FUTURES")}
                  />
                )}
              </div>
            </div>

            {/* ── Exchange Performance Breakdown ── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">📊 Performance by Exchange</h2>
              <ExchangePnLBreakdown trades={trades} status={activation} tier={normalizedTier} />
            </div>

            {/* ── Futures Positions ── */}
            <FuturesPositions tier={normalizedTier} isActive={activationComplete} />
          </>
        )}

        {/* ── Available Upgrades ── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">⚡ Services & Upgrades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UpgradeCard
              name="Staking"
              icon="🥩"
              description="Earn passive rewards by staking your IMALI tokens"
              features={["Earn daily rewards", "No lock-up period", "Auto-compound"]}
              color="purple"
              currentTier={normalizedTier}
              requiredTier="pro"
            />
            <UpgradeCard
              name="DEX Trading"
              icon="🦄"
              description="Trade on decentralized exchanges for more opportunities"
              features={["Uniswap integration", "MEV protection", "Auto-routing"]}
              color="blue"
              currentTier={normalizedTier}
              requiredTier="stock"
            />
            <UpgradeCard
              name="Yield Farming"
              icon="🌾"
              description="Put your tokens to work in liquidity pools"
              features={["Top pool selection", "Auto-harvest", "Risk management"]}
              color="emerald"
              currentTier={normalizedTier}
              requiredTier="elite"
            />
            <UpgradeCard
              name="Futures Trading"
              icon="📊"
              description="Trade with leverage for amplified gains"
              features={["Up to 20x leverage", "Auto stop-loss", "Smart entries"]}
              color="amber"
              currentTier={normalizedTier}
              requiredTier="elite"
            />
          </div>
        </div>

        {/* ── Feature Modules ── */}
        {activationComplete && (
          <>
            <ImaliBalance />
            <TierStatus />
            <RecentTradesTable trades={trades} showExchange={true} tier={normalizedTier} />
            <ReferralSystem />

            {tierAtLeast(normalizedTier, "pro") && <Staking />}
            {tierAtLeast(normalizedTier, "elite") && <YieldFarming />}
            {tierAtLeast(normalizedTier, "elite") && <Futures />}

            <NFTPreview />
            <TradeDemo />
          </>
        )}

        {/* ── Not Activated View ── */}
        {!activationComplete && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-bold mb-2">Your bot is almost ready!</h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Complete the quick setup to unlock your trading dashboard, charts, and all the cool features.
            </p>
            <button
              onClick={handleSetupCTA}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Finish Setup →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
