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
        
        if (res.status === 404) {
          if (isMounted) setEndpointExists(false);
          return;
        }
        
        if (isMounted) {
          setPositions(res.data?.positions || []);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          if (isMounted) setEndpointExists(false);
        }
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
  if (!endpointExists) return null;
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

  const showOKX = tierAtLeast(tier, "starter");
  const showAlpaca = tierAtLeast(tier, "starter");
  const showDEX = tierAtLeast(tier, "stock");
  const showFutures = tierAtLeast(tier, "elite");

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
  const { user: authUser, activation, setActivation } = useAuth();
  const navigationInProgress = useRef(false);
  
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ===================== TIER + ACTIVATION COMPUTATION ===================== */
  const normalizedTier = useMemo(() => {
    return normalizeTier(authUser?.tier);
  }, [authUser?.tier]);

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;

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

  /* ===================== LOAD TRADES ===================== */
  const loadTrades = useCallback(async () => {
    if (!activationComplete) {
      setTrades([]);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/api/sniper/trades");
      setTrades(Array.isArray(res.data?.trades) ? res.data.trades : []);
    } catch (err) {
      console.warn("Failed to load trades:", err);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [activationComplete]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  /* Auto refresh trades - only if activated */
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
      await BotAPI.toggleTrading(enabled);

      // Fetch ONLY activation status
      const actResponse = await BotAPI.activationStatus();
      const newActivation = actResponse?.status || actResponse;
      
      // Update only activation in context
      if (setActivation) {
        setActivation(newActivation);
      }

      setBanner({
        type: "success",
        message: enabled ? "Trading enabled" : "Trading disabled",
      });
      
      // Reload trades if enabling
      if (enabled) {
        await loadTrades();
      }
    } catch (err) {
      console.error("Toggle trading error:", err);
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Failed to update trading",
      });
    } finally {
      setBusy(false);
    }
  };

  const startBot = async () => {
    if (!activationComplete) {
      setBanner({
        type: "error",
        message: "Complete setup before starting the bot",
      });
      return;
    }

    try {
      setBusy(true);
      const mode = activation?.alpaca_mode === 'live' || activation?.okx_mode === 'live' ? "live" : "paper";
      
      const res = await BotAPI.startBot({ mode });

      if (res?.started) {
        setBanner({
          type: "success",
          message: `Bot started in ${mode} mode`,
        });
      } else {
        throw new Error();
      }
    } catch {
      setBanner({
        type: "error",
        message: "Bot failed to start",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSetupCTA = () => {
    if (navigationInProgress.current) return;
    navigationInProgress.current = true;
    
    if (!billingComplete) {
      nav("/billing");
    } else {
      nav("/activation");
    }
    
    // Reset after navigation
    setTimeout(() => {
      navigationInProgress.current = false;
    }, 1000);
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

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please log in to view your dashboard</p>
          <button
            onClick={() => {
              if (!navigationInProgress.current) {
                navigationInProgress.current = true;
                nav("/login");
                setTimeout(() => {
                  navigationInProgress.current = false;
                }, 1000);
              }
            }}
            className="px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
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
                ? "bg-red-600/10 border-red-500/40 text-red-200"
                : "bg-emerald-600/10 border-emerald-500/40 text-emerald-200"
            }`}
          >
            {banner.message}
          </div>
        )}

        {/* Setup Banner */}
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
              Welcome, {authUser.email}
            </h1>
            <div className="text-sm text-white/60">
              Membership: {normalizedTier.toUpperCase()}
              {activationComplete && (
                <span className="ml-2 text-emerald-400">✓ Active</span>
              )}
            </div>
            <ExchangeStatus 
              status={activation} 
              tier={normalizedTier}
              activationComplete={activationComplete}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleTrading(!tradingEnabled)}
              disabled={busy || !activationComplete}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!activationComplete ? "Complete setup first" : ""}
            >
              {busy ? "Updating..." : (tradingEnabled ? "Disable Trading" : "Enable Trading")}
            </button>

            <button
              onClick={startBot}
              disabled={!tradingEnabled || busy || !activationComplete}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!activationComplete ? "Complete setup first" : !tradingEnabled ? "Enable trading first" : ""}
            >
              {busy ? "Starting..." : "Start Bot"}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Account Value" value={`$${(1000 + totalPnL).toFixed(2)}`} />
          <Stat 
            label="Today’s P&L" 
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
              {tierAtLeast(normalizedTier, "starter") && (
                <ExchangeCard
                  name="OKX"
                  icon="🔷"
                  color="blue"
                  connected={okxConnected}
                  mode={activation?.okx_mode}
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'OKX')}
                />
              )}

              {tierAtLeast(normalizedTier, "starter") && (
                <ExchangeCard
                  name="Alpaca"
                  icon="📈"
                  color="emerald"
                  connected={alpacaConnected}
                  mode={activation?.alpaca_mode}
                  trades={trades.filter(t => normalizeExchange(t.exchange) === 'ALPACA')}
                />
              )}

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

            <div className="bg-white/5 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Exchange Performance</h2>
              <ExchangePnLBreakdown 
                trades={trades} 
                status={activation}
                tier={normalizedTier}
              />
            </div>

            <FuturesPositions 
              tier={normalizedTier} 
              isActive={activationComplete}
            />

            <ImaliBalance />
            <TierStatus />
            
            <RecentTradesTable 
              trades={trades} 
              showExchange={true}
              tier={normalizedTier}
            />
            
            <ReferralSystem />

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
            <p className="text-lg mb-4">Complete setup to see your trading dashboard</p>
            <button
              onClick={handleSetupCTA}
              className="px-6 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Complete Setup
            </button>
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
