// src/pages/TradeDemo.jsx - REWRITTEN WITH TRIAL BANNER
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FaPlay,
  FaPause,
  FaRedo,
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaBrain,
  FaTrophy,
  FaArrowRight,
  FaWallet,
  FaExchangeAlt,
} from "react-icons/fa";

const START_BALANCE = 1000;
const TRIAL_DAYS = 7;

const STRATEGIES = [
  {
    id: "safe",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    description: "Slower trades focused on consistency.",
    color: "emerald",
    winRate: 0.62,
  },
  {
    id: "balanced",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    description: "AI-assisted balance between growth and protection.",
    color: "blue",
    winRate: 0.56,
  },
  {
    id: "growth",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    description: "Faster opportunities with larger swings.",
    color: "orange",
    winRate: 0.52,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "Extreme Risk",
    description: "High volatility with larger upside potential.",
    color: "red",
    winRate: 0.48,
  },
];

const ASSETS = [
  { symbol: "BTC", icon: "₿", name: "Bitcoin" },
  { symbol: "ETH", icon: "Ξ", name: "Ethereum" },
  { symbol: "SOL", icon: "◎", name: "Solana" },
  { symbol: "AAPL", icon: "🍎", name: "Apple" },
  { symbol: "TSLA", icon: "⚡", name: "Tesla" },
  { symbol: "NVDA", icon: "💚", name: "NVIDIA" },
];

const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5";

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

export default function TradeDemo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const intervalRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [strategy, setStrategy] = useState(STRATEGIES[1]);

  const [balance, setBalance] = useState(START_BALANCE);
  const [profit, setProfit] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [streak, setStreak] = useState(0);

  const [feed, setFeed] = useState([]);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const justSignedUp = location.state?.justSignedUp;

  const totalTrades = wins + losses;
  const winRate = useMemo(() => {
    if (totalTrades === 0) return 0;
    return ((wins / totalTrades) * 100).toFixed(1);
  }, [wins, losses, totalTrades]);

  const confidence = useMemo(() => {
    let value = 35;
    value += wins * 2;
    value -= losses;
    return Math.min(100, Math.max(0, value));
  }, [wins, losses]);

  const generateTrade = () => {
    const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
    const won = Math.random() < strategy.winRate;
    const amount = Number(((Math.random() * 25 + 5) * (strategy.id === "aggressive" ? 1.8 : 1)).toFixed(2));
    const pnl = won ? amount : -amount * 0.7;

    const trade = {
      id: Date.now(),
      asset,
      pnl,
      type: won ? "Take Profit" : "Stop Loss",
      time: new Date().toLocaleTimeString(),
    };

    setFeed((prev) => [trade, ...prev.slice(0, 24)]);
    setBalance((prev) => prev + pnl);
    setProfit((prev) => prev + pnl);

    if (won) {
      setWins((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    } else {
      setLosses((prev) => prev + 1);
      setStreak(0);
    }
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(generateTrade, 2200);
    return () => clearInterval(intervalRef.current);
  }, [running, strategy]);

  const resetDemo = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setBalance(START_BALANCE);
    setProfit(0);
    setWins(0);
    setLosses(0);
    setStreak(0);
    setFeed([]);
  };

  // Show upgrade prompt after some demo usage
  useEffect(() => {
    if (totalTrades > 10 && !showUpgrade && !user?.trading_enabled) {
      setShowUpgrade(true);
    }
  }, [totalTrades, user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* TRIAL BANNER - CRITICAL ADDITION */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold text-white">
                ✅ Your {TRIAL_DAYS}-day free trial has started!
              </p>
              <p className="text-xs text-white/90">
                You are currently using simulated trading with virtual funds. No real money used.
              </p>
            </div>
          </div>
          {justSignedUp && (
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full animate-pulse">
              Welcome! 🎉
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* HERO */}
        <div className={`${card} overflow-hidden`}>
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-200">
                <FaRobot />
                AI Trading Simulator
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold mt-5 leading-tight">
                Practice Automated Trading With Zero Risk
              </h1>

              <p className="text-slate-300 mt-5 text-lg leading-8">
                Learn how AI-assisted automation, strategies, risk management,
                and trade execution work using a live paper-trading simulation.
                <span className="block text-emerald-400 mt-2">✨ $1,000 virtual credits included — no real money used.</span>
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <button
                  onClick={() => setRunning((prev) => !prev)}
                  className={`rounded-2xl px-6 py-3 font-bold flex items-center gap-2 transition ${
                    running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {running ? <FaPause /> : <FaPlay />}
                  {running ? "Pause Demo" : "Start Demo"}
                </button>

                <button
                  onClick={resetDemo}
                  className="rounded-2xl px-6 py-3 font-bold bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2"
                >
                  <FaRedo />
                  Reset
                </button>
              </div>
            </div>

            <div className="w-full max-w-sm">
              <div className="rounded-3xl bg-black/40 border border-white/10 p-6">
                <div className="text-sm text-white/50">Demo Account Balance</div>
                <div className={`text-5xl font-extrabold mt-2 ${balance >= START_BALANCE ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(balance)}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-white/50 text-sm">P&L</span>
                  <span className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {profit >= 0 ? "+" : ""}{formatMoney(profit)}
                  </span>
                </div>
                <div className="mt-5 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" style={{ width: `${confidence}%` }} />
                </div>
                <div className="mt-2 text-xs text-white/50">AI Confidence: {confidence}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* STRATEGIES */}
        <div className={card}>
          <div className="flex items-center gap-3 mb-5">
            <FaBrain className="text-cyan-300" />
            <h2 className="text-2xl font-bold">Select A Strategy</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STRATEGIES.map((item) => {
              const active = strategy.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => !running && setStrategy(item)}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:bg-white/5"
                  } ${running ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div className="text-4xl">{item.icon}</div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <span className="text-xs text-white/50">{item.risk}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-3 leading-6">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <div className={card}>
            <div className="text-white/50 text-sm">Total Trades</div>
            <div className="text-3xl font-bold mt-2">{totalTrades}</div>
          </div>
          <div className={card}>
            <div className="text-white/50 text-sm">Wins</div>
            <div className="text-3xl font-bold mt-2 text-emerald-400">{wins}</div>
          </div>
          <div className={card}>
            <div className="text-white/50 text-sm">Losses</div>
            <div className="text-3xl font-bold mt-2 text-red-400">{losses}</div>
          </div>
          <div className={card}>
            <div className="text-white/50 text-sm">Win Rate</div>
            <div className="text-3xl font-bold mt-2">{winRate}%</div>
          </div>
          <div className={card}>
            <div className="text-white/50 text-sm">Current Streak</div>
            <div className="text-3xl font-bold mt-2">🔥 {streak}</div>
          </div>
        </div>

        {/* LIVE FEED */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={card}>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <FaChartLine className="text-emerald-300" />
                  <h2 className="text-2xl font-bold">Live Trade Feed</h2>
                </div>
                {running && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Running
                  </div>
                )}
              </div>

              {!feed.length ? (
                <div className="py-20 text-center text-white/30">
                  <div className="text-6xl mb-4">🤖</div>
                  <p>Start the simulator to generate trades.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {feed.map((trade) => (
                    <div key={trade.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="text-3xl">{trade.asset.icon}</div>
                        <div className="min-w-0">
                          <div className="font-bold">{trade.asset.symbol}</div>
                          <div className="text-xs text-white/40">{trade.type} • {trade.time}</div>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}{formatMoney(trade.pnl)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="space-y-6">
            <div className={card}>
              <div className="flex items-center gap-2 mb-4">
                <FaShieldAlt className="text-emerald-300" />
                <h2 className="font-bold text-xl">Safe Learning</h2>
              </div>
              <ul className="space-y-3 text-sm text-slate-300 leading-7">
                <li>✅ No real money used</li>
                <li>✅ Learn automation safely</li>
                <li>✅ Explore risk management</li>
                <li>✅ Understand AI-assisted strategies</li>
                <li>✅ Practice before live trading</li>
              </ul>
            </div>

            {/* UPGRADE PROMPT - Shows after user enjoys the demo */}
            {showUpgrade && (
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-5 animate-pulse">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-bold text-lg">Ready to unlock live trading?</h3>
                <p className="text-sm text-gray-300 mt-2">
                  Connect OKX or Alpaca to start trading with real markets.
                </p>
                <button
                  onClick={() => navigate("/activation")}
                  className="mt-4 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition flex items-center justify-center gap-2"
                >
                  <FaExchangeAlt /> Connect Exchange
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="mt-2 w-full py-2 rounded-xl border border-white/20 hover:bg-white/10 font-semibold transition text-sm"
                >
                  View Plans →
                </button>
              </div>
            )}

            <div className={card}>
              <div className="flex items-center gap-2 mb-4">
                <FaTrophy className="text-yellow-300" />
                <h2 className="font-bold text-xl">Available Plans</h2>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <div className="font-bold">🎟️ Starter</div>
                  <div className="text-sm text-white/50 mt-1">Learn with paper trading</div>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <div className="font-bold">⭐ Pro</div>
                  <div className="text-sm text-white/50 mt-1">Advanced analytics + AI</div>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <div className="font-bold">👑 Elite</div>
                  <div className="text-sm text-white/50 mt-1">Full exchange access</div>
                </div>
              </div>
              <Link to="/pricing" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 px-5 py-3 font-bold transition">
                View Pricing <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>

        {/* FINAL CTA - After enjoying demo */}
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-8 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl font-extrabold">Ready to continue after your free trial?</h2>
          <p className="text-slate-300 mt-4 max-w-3xl mx-auto leading-8">
            Upgrade to Pro for live trading, advanced automation, and full exchange connectivity.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button onClick={() => navigate("/pricing")} className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-8 py-4 font-bold transition">
              Upgrade to Pro →
            </button>
            <button onClick={() => navigate("/activation")} className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-8 py-4 font-bold transition">
              Connect Exchange Later
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-white/30 pb-4">
          Demo environment only. Educational and simulation purposes. No real money used.
          Your {TRIAL_DAYS}-day free trial is active.
        </div>
      </div>
    </div>
  );
}
