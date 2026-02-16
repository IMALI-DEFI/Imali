// src/pages/dashboard/MemberDashboard.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

/* ===================== TIER GATING ===================== */
const TIER_ORDER = ["starter", "pro", "elite", "stock", "bundle"];

const normalizeTier = (tier) => {
  const t = String(tier || "starter").toLowerCase().trim();
  return TIER_ORDER.includes(t) ? t : "starter";
};

const tierAtLeast = (userTier, requiredTier) => {
  const normalizedUser = normalizeTier(userTier);
  const normalizedRequired = normalizeTier(requiredTier);
  return TIER_ORDER.indexOf(normalizedUser) >= TIER_ORDER.indexOf(normalizedRequired);
};

/* ===================== EXCHANGE NORMALIZATION ===================== */
const normalizeExchange = (exchange) => {
  if (!exchange) return "DEX";
  const upper = exchange.toUpperCase();
  if (upper.includes("OKX")) return "OKX";
  if (upper.includes("ALPACA")) return "ALPACA";
  if (upper.includes("DEX")) return "DEX";
  if (upper.includes("FUTURE")) return "FUTURES";
  return "DEX";
};

/* ===================== EXCHANGE STATUS CARD ===================== */
const ExchangeCard = ({ name, connected, mode, trades, icon, color }) => {
  const pnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    const wins = trades.filter(t => (t.pnl_usd || 0) > 0).length;
    return ((wins / trades.length) * 100).toFixed(1);
  }, [trades]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold">{name}</h3>
        </div>
        {connected && mode && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            mode === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
          }`}>
            {mode}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
        <div>
          <div className="text-xs text-white/40">Trades</div>
          <div className="font-medium">{trades.length}</div>
        </div>
        <div>
          <div className="text-xs text-white/40">Win Rate</div>
          <div className="font-medium">{winRate}%</div>
        </div>
        <div>
          <div className="text-xs text-white/40">P&L</div>
          <div className={`font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${pnl.toFixed(2)}
          </div>
        </div>
      </div>

      {!connected && (
        <div className="text-xs text-yellow-500/80 mt-2 flex items-center gap-1">
          <span>⚠️</span> Not connected
        </div>
      )}
    </div>
  );
};

/* ===================== FUTURES POSITIONS COMPONENT ===================== */
const FuturesPositions = ({ tier, isActive }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endpointExists, setEndpointExists] = useState(true);

  useEffect(() => {
    if (!tierAtLeast(tier, "elite") || !isActive || !endpointExists) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let intervalId;

    const loadFutures = async () => {
      try {
        const res = await api.get("/api/futures/positions");
        
        // If endpoint returns 404, disable future polling
        if (res.status === 404) {
          if (isMounted) setEndpointExists(false);
          return;
        }
        
        if (isMounted) {
          setPositions(res.data?.positions || []);
        }
      } catch (err) {
        // Check if it's a 404
        if (err.response?.status === 404) {
          if (isMounted) setEndpointExists(false);
        }
        // Silent fail for other errors
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFutures();
    
    if (endpointExists) {
      intervalId = setInterval(loadFutures, 30000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [tier, isActive, endpointExists]);

  if (!tierAtLeast(tier, "elite") || !isActive) return null;
  if (!endpointExists) return null; // Silently hide if endpoint not available
  if (loading) return <div className="bg-white/5 rounded-xl p-4 animate-pulse h-24" />;

  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="font-semibold">Futures Positions</h3>
        </div>
        <span className={`text-sm ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Total P&L: ${totalPnL.toFixed(2)}
        </span>
      </div>

      {positions.length === 0 ? (
        <p className="text-sm text-white/40 py-2">No open futures positions</p>
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
                <span className={pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {pos.pnl > 0 ? '+' : ''}{pos.pnl}%
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

/* ===================== PER-EXCHANGE P&L BREAKDOWN ===================== */
const ExchangePnLBreakdown = ({ trades, status, tier }) => {
  const byExchange = useMemo(() => {
    const result = {
      OKX: { trades: [], total: 0, wins: 0, losses: 0 },
      ALPACA: { trades: [], total: 0, wins: 0, losses: 0 },
      DEX: { trades: [], total: 0, wins: 0, losses: 0 },
      FUTURES: { trades: [], total: 0, wins: 0, losses: 0 },
    };

    trades.forEach(trade => {
      const exchange = normalizeExchange(trade.exchange);
      if (result[exchange]) {
        result[exchange].trades.push(trade);
        result[exchange].total += trade.pnl_usd || 0;
        if ((trade.pnl_usd || 0) > 0) result[exchange].wins++;
        else if ((trade.pnl_usd || 0) < 0) result[exchange].losses++;
      }
    });

    return result;
  }, [trades]);

  // Only show exchanges based on tier
  const showOKX = tierAtLeast(tier, "starter");
  const showAlpaca = tierAtLeast(tier, "starter");
  const showDEX = tierAtLeast(tier, "stock");
  const showFutures = tierAtLeast(tier, "elite");

  // Determine connection status
  const okxConnected = !!status?.okx_connected;
  const alpacaConnected = !!status?.alpaca_connected;
  const dexConnected = tierAtLeast(tier, "stock") && !!status?.wallet_connected;
  const futuresConnected = tierAtLeast(tier, "elite");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
      {showOKX && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔷</span>
            <h4 className="font-medium">OKX</h4>
            {okxConnected && (
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                status?.okx_mode === 'live' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
              }`}>
                {status?.okx_mode || 'paper'}
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Trades:</span>
              <span>{byExchange.OKX.trades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Win Rate:</span>
              <span>
                {byExchange.OKX.trades.length > 0 
                  ? ((byExchange.OKX.wins / byExchange.OKX.trades.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-white/40">P&L:</span>
              <span className={byExchange.OKX.total >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${byExchange.OKX.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showAlpaca && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📈</span>
            <h4 className="font-medium">Alpaca</h4>
            {alpacaConnected && (
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                status?.alpaca_mode === 'live' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
              }`}>
                {status?.alpaca_mode || 'paper'}
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Trades:</span>
              <span>{byExchange.ALPACA.trades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Win Rate:</span>
              <span>
                {byExchange.ALPACA.trades.length > 0 
                  ? ((byExchange.ALPACA.wins / byExchange.ALPACA.trades.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-white/40">P&L:</span>
              <span className={byExchange.ALPACA.total >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${byExchange.ALPACA.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showDEX && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🦄</span>
            <h4 className="font-medium">DEX</h4>
            {dexConnected && (
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 rounded-full ml-auto">
                active
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Trades:</span>
              <span>{byExchange.DEX.trades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Win Rate:</span>
              <span>
                {byExchange.DEX.trades.length > 0 
                  ? ((byExchange.DEX.wins / byExchange.DEX.trades.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-white/40">P&L:</span>
              <span className={byExchange.DEX.total >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${byExchange.DEX.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {showFutures && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <h4 className="font-medium">Futures</h4>
            {futuresConnected && (
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 rounded-full ml-auto">
                ready
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Trades:</span>
              <span>{byExchange.FUTURES.trades.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Win Rate:</span>
              <span>
                {byExchange.FUTURES.trades.length > 0 
                  ? ((byExchange.FUTURES.wins / byExchange.FUTURES.trades.length) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-white/40">P&L:</span>
              <span className={byExchange.FUTURES.total >= 0 ? 'text-green-400' : 'text-red-400'}>
                ${byExchange.FUTURES.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===================== EXCHANGE CONNECTION STATUS ===================== */
const ExchangeStatus = ({ status, tier, activationComplete }) => {
  if (!status) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {status?.okx_connected && tierAtLeast(tier, "starter") && (
        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
          OKX: {status.okx_mode || 'paper'}
        </span>
      )}
      {status?.alpaca_connected && tierAtLeast(tier, "starter") && (
        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          Alpaca: {status.alpaca_mode || 'paper'}
        </span>
      )}
      {tierAtLeast(tier, "stock") && status?.wallet_connected && (
        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
          DEX Ready
        </span>
      )}
    </div>
  );
};

/* ===================== SETUP BANNER ===================== */
const SetupBanner = ({ billingComplete, connectionsComplete, tradingEnabled, onCTAClick }) => {
  if (billingComplete && connectionsComplete && tradingEnabled) return null;

  let message = "";
  let buttonText = "";

  if (!billingComplete) {
    message = "💳 Add a payment method to start trading";
    buttonText = "Go to Billing";
  } else if (!connectionsComplete) {
    message = "🔌 Connect your exchanges to enable trading";
    buttonText = "Complete Setup";
  } else if (!tradingEnabled) {
    message = "⚡ Enable trading when you're ready";
    buttonText = "Enable Trading";
  }

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <p className="text-white/90">{message}</p>
      </div>
      <button
        onClick={onCTAClick}
        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium whitespace-nowrap"
      >
        {buttonText}
      </button>
    </div>
  );
};

/* ===================== MAIN COMPONENT ===================== */
export default function MemberDashboard() {
  const nav = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [activationStatus, setActivationStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ===================== TIER + ACTIVATION COMPUTATION ===================== */
  const normalizedTier = useMemo(() => {
    return normalizeTier(user?.tier);
  }, [user?.tier]);

  const billingComplete = !!activationStatus?.billing_complete;
  const okxConnected = !!activationStatus?.okx_connected;
  const alpacaConnected = !!activationStatus?.alpaca_connected;
  const walletConnected = !!activationStatus?.wallet_connected;
  const tradingEnabled = !!activationStatus?.trading_enabled;

  // Determine required connections based on tier
  const needsOkx = ["starter", "pro", "bundle"].includes(normalizedTier);
  const needsAlpaca = ["starter", "bundle"].includes(normalizedTier);
  const needsWallet = ["elite", "stock", "bundle"].includes(normalizedTier);

  const connectionsComplete = useMemo(() => {
    const ok = needsOkx ? okxConnected : true;
    const al = needsAlpaca ? alpacaConnected : true;
    const wa = needsWallet ? walletConnected : true;
    return ok && al && wa;
  }, [needsOkx, needsAlpaca, needsWallet, okxConnected, alpacaConnected, walletConnected]);

  const activationComplete = billingComplete && connectionsComplete && tradingEnabled;

  /* ===================== LOAD USER + STATUS ===================== */
  const loadDashboard = useCallback(async () => {
    try {
      const me = await BotAPI.me();
      const userObj = me?.user || me;
      setUser(userObj);

      const act = await BotAPI.activationStatus();
      const status = act?.status || act || {};
      setActivationStatus(status);

      const res = await api.get("/api/sniper/trades");
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch (err) {
      setBanner({
        type: "error",
        message: "Unable to load dashboard. Please refresh.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===================== ONBOARDING REDIRECTS (FIX #2) ===================== */
  useEffect(() => {
    if (loading || redirecting) return;

    // Don't redirect if we don't have the data yet
    if (!user || !activationStatus) return;

    // Check billing first
    if (!billingComplete) {
      setRedirecting(true);
      nav("/billing", { replace: true });
      return;
    }

    // Then check connections + trading
    if (!activationComplete) {
      setRedirecting(true);
      nav("/activation", { replace: true });
      return;
    }
  }, [loading, user, activationStatus, billingComplete, activationComplete, nav, redirecting]);

  /* Auto refresh trades (safe interval) - only if activated */
  useEffect(() => {
    if (!activationComplete) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get("/api/sniper/trades");
        setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
      } catch {
        /* silent fail */
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activationComplete]);

  /* ===================== COMPUTED METRICS ===================== */
  const totalPnL = useMemo(
    () => trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0),
    [trades]
  );

  const winRate = useMemo(() => {
    if (!trades.length) return 0;
    const wins = trades.filter((t) => (t.pnl_usd || 0) > 0).length;
    return ((wins / trades.length) * 100).toFixed(1);
  }, [trades]);

  const confidence = useMemo(() => {
    let score = 40;
    if (winRate > 60) score += 20;
    if (trades.length > 20) score += 15;
    if (activationComplete) score += 15;
    return Math.min(score, 100);
  }, [winRate, trades.length, activationComplete]);

  /* ===================== TRADING CONTROL ===================== */
  const toggleTrading = async (enabled) => {
    try {
      setBusy(true);
      await api.post("/api/trading/enable", { enabled });

      setBanner({
        type: "success",
        message: enabled
          ? "Trading has been enabled."
          : "Trading has been disabled.",
      });

      await loadDashboard();
    } catch {
      setBanner({
        type: "error",
        message: "Unable to update trading status.",
      });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    // FIX #7: Guard bot start
    if (!activationComplete) {
      setBanner({
        type: "error",
        message: "Complete activation before starting the bot.",
      });
      return;
    }

    try {
      setBusy(true);
      // Determine mode from connected exchanges
      const mode = activationStatus?.alpaca_mode === 'live' || activationStatus?.okx_mode === 'live' 
        ? "live" 
        : "paper";
      
      const res = await api.post("/api/bot/start", { mode });

      if (res.data?.started) {
        setBanner({
          type: "success",
          message: `Bot started in ${mode} mode.`,
        });
      } else {
        throw new Error();
      }
    } catch {
      setBanner({
        type: "error",
        message: "Bot failed to start.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupCTA = () => {
    if (!billingComplete) {
      nav("/billing");
    } else {
      nav("/activation");
    }
  };

  /* ===================== STATES ===================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // FIX #1: Don't redirect during render - handled in useEffect
  if (!user) {
    return null; // Will be caught by useEffect
  }

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Banner */}
        {banner && (
          <div
            className={`p-4 rounded-xl border ${
              banner.type === "error"
                ? "bg-red-600/10 border-red-500/40"
                : "bg-emerald-600/10 border-emerald-500/40"
            }`}
          >
            {banner.message}
          </div>
        )}

        {/* Setup Banner - FIX #9 */}
        <SetupBanner
          billingComplete={billingComplete}
          connectionsComplete={connectionsComplete}
          tradingEnabled={tradingEnabled}
          onCTAClick={handleSetupCTA}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {user.email}
            </h1>
            <div className="text-sm text-white/60">
              Membership: {normalizedTier.toUpperCase()}
              {activationComplete && (
                <span className="ml-2 text-emerald-400">✓ Active</span>
              )}
            </div>
            {/* Exchange Connection Status */}
            <ExchangeStatus 
              status={activationStatus} 
              tier={normalizedTier}
              activationComplete={activationComplete}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleTrading(!tradingEnabled)}
              disabled={busy || !activationComplete}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!activationComplete ? "Complete setup first" : ""}
            >
              {tradingEnabled ? "Disable Trading" : "Enable Trading"}
            </button>

            <button
              onClick={startBot}
              disabled={!tradingEnabled || busy || !activationComplete}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!activationComplete ? "Complete setup first" : !tradingEnabled ? "Enable trading first" : ""}
            >
              Start Bot
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Account Value" value={`$${(1000 + totalPnL).toFixed(2)}`} />
          <Stat 
            label="Today’s Gain/Loss" 
            value={`$${totalPnL.toFixed(2)}`}
            trend={totalPnL >= 0 ? 'up' : 'down'}
          />
          <Stat label="Win Rate" value={`${winRate}%`} />
          <Stat label="Bot Confidence" value={`${confidence}%`} />
        </div>

        {/* Exchange Cards - Only show if activated */}
        {activationComplete && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* OKX Card */}
              {tierAtLeast(normalizedTier, "starter") && (
                <ExchangeCard
                  name="OKX"
                  icon="🔷"
                  color="blue"
                  connected={okxConnected}
                  mode={activationStatus?.okx_mode}
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'OKX')}
                />
              )}

              {/* Alpaca Card */}
              {tierAtLeast(normalizedTier, "starter") && (
                <ExchangeCard
                  name="Alpaca"
                  icon="📈"
                  color="emerald"
                  connected={alpacaConnected}
                  mode={activationStatus?.alpaca_mode}
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'ALPACA')}
                />
              )}

              {/* DEX Card - Stock tier and above */}
              {tierAtLeast(normalizedTier, "stock") && (
                <ExchangeCard
                  name="DEX"
                  icon="🦄"
                  color="purple"
                  connected={walletConnected}
                  mode={walletConnected ? 'active' : null}
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'DEX')}
                />
              )}

              {/* Futures Card - Elite tier and above */}
              {tierAtLeast(normalizedTier, "elite") && (
                <ExchangeCard
                  name="Futures"
                  icon="📊"
                  color="amber"
                  connected={true}
                  mode="ready"
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'FUTURES')}
                />
              )}
            </div>

            {/* Per-Exchange P&L Breakdown */}
            <div className="bg-white/5 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Exchange Performance</h2>
              <ExchangePnLBreakdown 
                trades={trades} 
                status={activationStatus}
                tier={normalizedTier}
              />
            </div>

            {/* Futures Positions (Elite+) */}
            <FuturesPositions 
              tier={normalizedTier} 
              isActive={activationComplete}
            />

            {/* Core Modules - Only show when activated */}
            <ImaliBalance />
            <TierStatus />
            
            {/* Enhanced Trades Table with Exchange Indicators */}
            <RecentTradesTable 
              trades={trades} 
              showExchange={true}
              tier={normalizedTier}
            />
            
            <ReferralSystem />

            {/* Tier-Gated Modules */}
            {tierAtLeast(normalizedTier, "pro") && <Staking />}
            {tierAtLeast(normalizedTier, "elite") && <YieldFarming />}
            {tierAtLeast(normalizedTier, "elite") && <Futures />}

            <NFTPreview />
            <TradeDemo />
          </>
        )}

        {/* Minimal view when not activated */}
        {!activationComplete && (
          <div className="text-center py-12 text-white/40">
            <p className="text-lg">Complete setup to see your trading dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== STAT COMPONENT ===================== */
function Stat({ label, value, trend }) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : '';
  
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="text-xs text-white/60">{label}</div>
      <div className={`text-lg font-bold ${trendColor}`}>{value}</div>
    </div>
  );
}
