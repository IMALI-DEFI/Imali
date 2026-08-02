// src/pages/TradeDemo.jsx - MODERN FIN TECH REWRITE (Mobile-Responsive)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
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
  FaExchangeAlt,
  FaBuilding,
  FaCheckCircle,
  FaCrown,
  FaCoins,
  FaClock,
  FaFire,
} from "react-icons/fa";

import CandlestickChart from "../components/charts/CandlestickChart";
import { createInitialCandles, createNextCandle, updateLiveCandle } from "../utils/demoCandleGenerator";

const START_BALANCE = 1000;

const STRATEGIES = [
  {
    id: "safe",
    name: "Conservative",
    icon: "🛡️",
    risk: "Low Risk",
    riskLevel: 20,
    description: "Slower trades focused on consistency.",
    color: "emerald",
    winRate: 0.62,
  },
  {
    id: "balanced",
    name: "Balanced AI",
    icon: "🤖",
    risk: "Medium Risk",
    riskLevel: 50,
    description: "AI-assisted balance between growth and protection.",
    color: "blue",
    winRate: 0.56,
  },
  {
    id: "growth",
    name: "Growth",
    icon: "📈",
    risk: "Higher Risk",
    riskLevel: 75,
    description: "Faster opportunities with larger swings.",
    color: "orange",
    winRate: 0.52,
  },
  {
    id: "aggressive",
    name: "Aggressive",
    icon: "🔥",
    risk: "Extreme Risk",
    riskLevel: 95,
    description: "High volatility with larger upside potential.",
    color: "red",
    winRate: 0.48,
  },
];

const ASSETS = [
  { symbol: "BTC", icon: "₿", name: "Bitcoin", price: 67420 },
  { symbol: "ETH", icon: "Ξ", name: "Ethereum", price: 3450 },
  { symbol: "SOL", icon: "◎", name: "Solana", price: 185 },
  { symbol: "AAPL", icon: "🍎", name: "Apple", price: 178.50 },
  { symbol: "TSLA", icon: "⚡", name: "Tesla", price: 245.30 },
  { symbol: "NVDA", icon: "💚", name: "NVIDIA", price: 890.75 },
];

// Glass Card Component
const GlassCard = ({ children, className = "", gradient = "from-emerald-500/10 to-cyan-500/10" }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
    <div className="relative z-10 p-4 sm:p-5">{children}</div>
  </div>
);

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

// AI Thinking Panel (enhanced for demo)
const AIThinkingPanel = ({ confidence, strategy }) => {
  const [signal, setSignal] = useState({
    regime: "Bullish",
    confidence: 84,
    reasoning: ["RSI recovering", "Volume increasing", "EMA crossover"],
    decision: "LONG"
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const signals = [
        { regime: "Bullish", confidence: 84, reasoning: ["RSI recovering", "Volume increasing", "EMA crossover"], decision: "LONG" },
        { regime: "Bullish", confidence: 91, reasoning: ["Breakout confirmed", "High volume", "Momentum increasing"], decision: "LONG" },
        { regime: "Bearish", confidence: 76, reasoning: ["Overbought conditions", "Resistance rejection", "Volume decreasing"], decision: "SHORT" },
        { regime: "Neutral", confidence: 62, reasoning: ["Consolidation", "Low volatility", "Awaiting breakout"], decision: "HOLD" },
      ];
      setSignal(signals[Math.floor(Math.random() * signals.length)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="border-cyan-500/20" gradient="from-cyan-500/10 to-blue-500/10">
      <div className="flex items-center gap-3 mb-4">
        <FaBrain className="text-cyan-400 text-xl" />
        <h3 className="text-lg font-bold text-white">AI Analysis</h3>
        <span className="ml-auto text-xs text-emerald-400 animate-pulse">● LIVE</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
          <span className="text-white/60 text-xs sm:text-sm">Market Regime</span>
          <span className={`font-bold text-sm sm:text-base ${signal.regime === 'Bullish' ? 'text-emerald-400' : signal.regime === 'Bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
            {signal.regime}
          </span>
        </div>
        
        <div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-white/60">Confidence</span>
            <span className="text-white font-bold">{signal.confidence}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${signal.confidence}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        <div>
          <span className="text-white/60 text-xs">Reasoning</span>
          <ul className="mt-1 space-y-0.5">
            {signal.reasoning.map((item, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 text-xs text-white/70"
              >
                <FaCheckCircle className="text-emerald-400 text-[10px]" />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-white/60 text-xs sm:text-sm">Decision</span>
          <motion.span
            key={signal.decision}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs ${
              signal.decision === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' :
              signal.decision === 'SHORT' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {signal.decision}
          </motion.span>
        </div>
      </div>
    </GlassCard>
  );
};

// Animated Bot Status (enhanced)
const AnimatedBotStatus = ({ running, strategy }) => {
  const [status, setStatus] = useState({
    scanning: "BTC",
    confidence: 82,
    decision: "BUY"
  });

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const assets = ["BTC", "ETH", "SOL", "AVAX", "MATIC"];
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const confidence = Math.floor(Math.random() * 30) + 65;
      const decisions = ["BUY", "SELL", "HOLD"];
      const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
      
      setStatus({
        scanning: randomAsset,
        confidence,
        decision: randomDecision
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <GlassCard className="border-emerald-500/20" gradient="from-emerald-500/10 to-cyan-500/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaRobot className="text-emerald-400 text-lg" />
          <h3 className="text-sm font-bold text-white">Bot Status</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs ${running ? 'text-emerald-400' : 'text-gray-400'}`}>
            {running ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>
      </div>
      
      {running ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
            <span className="text-white/50 text-xs">Scanning</span>
            <span className="text-white font-bold text-sm">{status.scanning}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
            <span className="text-white/50 text-xs">Confidence</span>
            <span className="text-white font-bold text-sm">{status.confidence}%</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-white/5">
            <span className="text-white/50 text-xs">Decision</span>
            <span className={`font-bold text-sm ${
              status.decision === 'BUY' ? 'text-emerald-400' :
              status.decision === 'SELL' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {status.decision}
            </span>
          </div>
          <div className="text-xs text-white/30 text-center mt-1">
            Strategy: {strategy.name}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-white/30 text-sm">
          Start the demo to see bot activity
        </div>
      )}
    </GlassCard>
  );
};

// Floating Market Prices (reusable)
const FloatingPrices = () => {
  const prices = [
    { symbol: "BTC", price: 67420, change: "+2.4%" },
    { symbol: "ETH", price: 3450, change: "+1.8%" },
    { symbol: "SOL", price: 185, change: "+4.2%" },
    { symbol: "AAPL", price: 178.50, change: "+0.6%" },
    { symbol: "TSLA", price: 245.30, change: "-1.2%" },
    { symbol: "NVDA", price: 890.75, change: "+3.1%" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3 py-2">
      {prices.map((item) => (
        <motion.div
          key={item.symbol}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs md:text-sm backdrop-blur-sm"
        >
          <span className="font-bold text-white">{item.symbol}</span>
          <span className="ml-1.5 text-white/70">${item.price.toLocaleString()}</span>
          <span className={`ml-1.5 ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.change}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// Strategy Heatmap (reusable)
const StrategyHeatmap = ({ strategy, onSelect, running }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {STRATEGIES.map((s) => (
        <button
          key={s.id}
          onClick={() => !running && onSelect(s)}
          disabled={running}
          className={`relative rounded-2xl p-3 text-center transition-all ${
            strategy.id === s.id 
              ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20' 
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          } border ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="text-xs font-semibold text-white">{s.name}</div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div 
              className={`h-full rounded-full ${
                s.riskLevel <= 30 ? 'bg-emerald-400' :
                s.riskLevel <= 60 ? 'bg-yellow-400' :
                s.riskLevel <= 80 ? 'bg-orange-400' :
                'bg-red-400'
              }`}
              style={{ width: `${s.riskLevel}%` }}
            />
          </div>
          <div className="mt-0.5 text-[8px] text-white/30">{s.risk}</div>
        </button>
      ))}
    </div>
  );
};

// Animated Trade Feed (Enhanced)
const AnimatedTradeFeed = ({ trades = [], running }) => {
  const [feed, setFeed] = useState([]);
  
  useEffect(() => {
    if (!running) return;
    
    const generateTrade = () => {
      const assets = ["BTC", "ETH", "SOL", "AVAX", "MATIC"];
      const decisions = ["BUY", "SELL"];
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
      const entry = (Math.random() * 1000 + 100).toFixed(2);
      const target = (parseFloat(entry) * (1 + (Math.random() * 0.05 + 0.01))).toFixed(2);
      const stop = (parseFloat(entry) * (1 - (Math.random() * 0.03 + 0.01))).toFixed(2);
      const pnl = randomDecision === 'BUY' 
        ? (Math.random() * 15 + 5).toFixed(2) 
        : (-(Math.random() * 10 + 2)).toFixed(2);
      
      const newTrade = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        asset: randomAsset,
        decision: randomDecision,
        confidence: Math.floor(Math.random() * 30) + 65,
        entry: `$${entry}`,
        target: `$${target}`,
        stop: `$${stop}`,
        pnl: parseFloat(pnl),
      };
      
      setFeed(prev => [newTrade, ...prev.slice(0, 14)]);
    };
    
    generateTrade();
    const interval = setInterval(generateTrade, 2000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <GlassCard className="max-h-[420px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 sticky top-0 bg-black/50 backdrop-blur py-2 -mt-2 -mx-2 px-3 rounded-t-2xl">
        <FaChartLine className="text-emerald-400 text-lg" />
        <h3 className="text-sm font-bold text-white">Live Trade Feed</h3>
        {running && (
          <span className="ml-auto text-[10px] text-emerald-400 animate-pulse">● LIVE</span>
        )}
      </div>
      
      {feed.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">
          {running ? 'Waiting for trades...' : 'Start the demo to see trades'}
        </div>
      ) : (
        <AnimatePresence>
          {feed.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mb-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-white/30">{trade.time}</span>
                    <span className="font-bold text-sm text-white">{trade.asset}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      trade.decision === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.decision}
                    </span>
                    <span className={`text-xs font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 text-[10px]">
                    <span className="text-white/30">Entry: <span className="text-white/60">{trade.entry}</span></span>
                    <span className="text-white/30">Target: <span className="text-emerald-400/60">{trade.target}</span></span>
                    <span className="text-white/30">Stop: <span className="text-red-400/60">{trade.stop}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-white/30 text-[10px]">Confidence</span>
                  <div className="text-xs font-bold text-white">{trade.confidence}%</div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </GlassCard>
  );
};

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
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);

  // Candlestick state
  const [candles, setCandles] = useState(() => 
    createInitialCandles({ count: 50, startPrice: 67420, intervalSeconds: 60 })
  );
  const [liveCandle, setLiveCandle] = useState(() => candles[candles.length - 1]);
  const candleTicksRef = useRef(0);

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

  // Candlestick animation effect
  useEffect(() => {
    if (!running) return undefined;

    const animationInterval = window.setInterval(() => {
      candleTicksRef.current += 1;

      setLiveCandle((current) => {
        if (!current) return current;

        if (candleTicksRef.current % 6 === 0) {
          const next = createNextCandle(current, 60);
          setCandles((previous) => [...previous.slice(-79), next]);
          return next;
        }

        return updateLiveCandle(current, {
          volatility: strategy.id === "aggressive" ? 0.002 : strategy.id === "growth" ? 0.0014 : strategy.id === "safe" ? 0.0005 : 0.0009,
        });
      });
    }, 400);

    return () => window.clearInterval(animationInterval);
  }, [running, strategy.id]);

  const resetDemo = () => {
    clearInterval(intervalRef.current);

    const resetCandles = createInitialCandles({
      count: 50,
      startPrice: 67420,
      intervalSeconds: 60,
    });

    setRunning(false);
    setBalance(START_BALANCE);
    setProfit(0);
    setWins(0);
    setLosses(0);
    setStreak(0);
    setFeed([]);
    setCandles(resetCandles);
    setLiveCandle(resetCandles[resetCandles.length - 1]);
    candleTicksRef.current = 0;
  };

  useEffect(() => {
    if (totalTrades > 10 && !showDemoPrompt && !user?.trading_enabled) {
      setShowDemoPrompt(true);
    }
  }, [totalTrades, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* DEMO ACCESS BANNER */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold text-white">Demo Access Active</p>
              <p className="text-xs text-white/90">
                Experience IMALI with a $1,000 virtual account before connecting a real exchange.
              </p>
            </div>
          </div>
          {justSignedUp && (
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full animate-pulse">Welcome! 🎉</span>
          )}
        </div>
      </div>

      {/* Floating Market Prices */}
      <div className="border-b border-white/5 bg-black/20 backdrop-blur-sm py-2">
        <div className="max-w-7xl mx-auto px-4">
          <FloatingPrices />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-200">
                <FaRobot />
                AI Trading Simulator
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold mt-5 leading-tight text-white">
                Learn AI Trading <span className="text-emerald-400">Risk-Free</span>
              </h1>

              <p className="text-slate-300 mt-5 text-base md:text-lg leading-8">
                Experience IMALI with a <span className="text-emerald-400 font-bold">$1,000 virtual account</span> before connecting a real exchange.
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <button
                  onClick={() => setRunning((prev) => !prev)}
                  className={`rounded-2xl px-5 md:px-6 py-3 font-bold flex items-center gap-2 transition text-sm md:text-base ${
                    running ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {running ? <FaPause /> : <FaPlay />}
                  {running ? "Pause Demo" : "Start Demo"}
                </button>

                <button
                  onClick={resetDemo}
                  className="rounded-2xl px-5 md:px-6 py-3 font-bold bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 text-sm md:text-base"
                >
                  <FaRedo />
                  Reset
                </button>

                <button
                  onClick={() => navigate("/pricing")}
                  className="rounded-2xl px-5 md:px-6 py-3 font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-2 text-sm md:text-base"
                >
                  <FaCrown />
                  Upgrade to Live
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-emerald-400 text-[10px]" />
                  No API keys required
                </span>
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-emerald-400 text-[10px]" />
                  Virtual funds only
                </span>
                <span className="flex items-center gap-1.5">
                  <FaCheckCircle className="text-emerald-400 text-[10px]" />
                  Learn risk-free
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm">
              <div className="rounded-3xl bg-black/40 border border-white/10 p-6">
                <div className="text-sm text-white/50">Demo Account Balance</div>
                <div className={`text-4xl md:text-5xl font-extrabold mt-2 ${balance >= START_BALANCE ? "text-emerald-400" : "text-red-400"}`}>
                  <CountUp end={balance} duration={1} decimals={2} prefix="$" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-white/50 text-sm">P&L</span>
                  <span className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {profit >= 0 ? "+" : ""}<CountUp end={profit} duration={1} decimals={2} prefix="$" />
                  </span>
                </div>
                <div className="mt-5 h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/50">
                  <span>AI Confidence</span>
                  <span>{confidence}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-white/30">Wins</div>
                    <div className="font-bold text-emerald-400">{wins}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-white/30">Losses</div>
                    <div className="font-bold text-red-400">{losses}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="text-white/30">Streak</div>
                    <div className="font-bold text-white">🔥 {streak}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CANDLESTICK CHART SECTION */}
        <GlassCard className="overflow-hidden">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <FaChartLine className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">BTC/USD Demo Market</h2>
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                Simulated candlestick movement for exploring the interface
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                {running ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}
              </div>
              <div className="text-xs text-white/30">
                <FaClock className="inline mr-1" />
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <CandlestickChart data={candles} liveCandle={liveCandle} height={320} />
          </div>

          <p className="mt-3 text-[10px] text-white/25 text-center">
            Candles and prices are generated for demonstration. They are not live market data.
          </p>
        </GlassCard>

        {/* STRATEGY HEATMAP */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FaBrain className="text-cyan-300" />
            <h2 className="text-xl font-bold text-white">Select Strategy</h2>
            {running && (
              <span className="text-xs text-yellow-400 ml-2">● Strategy locked while running</span>
            )}
          </div>
          <StrategyHeatmap 
            strategy={strategy} 
            onSelect={setStrategy} 
            running={running} 
          />
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Trades", value: totalTrades, color: "text-white" },
            { label: "Win Rate", value: `${winRate}%`, color: "text-emerald-400" },
            { label: "Wins", value: wins, color: "text-emerald-400" },
            { label: "Losses", value: losses, color: "text-red-400" },
          ].map((stat, idx) => (
            <GlassCard key={idx} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                <CountUp end={typeof stat.value === 'number' ? stat.value : parseFloat(stat.value) || 0} duration={1.5} />
                {typeof stat.value === 'string' && stat.value.includes('%') ? '%' : ''}
              </div>
              <div className="mt-1 text-xs text-white/40">{stat.label}</div>
            </GlassCard>
          ))}
        </div>

        {/* LIVE FEED + SIDE PANEL */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnimatedTradeFeed trades={feed} running={running} />
          </div>

          <div className="space-y-4">
            <AIThinkingPanel confidence={confidence} strategy={strategy} />
            <AnimatedBotStatus running={running} strategy={strategy} />

            {/* Demo completion prompt */}
            {showDemoPrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-5 backdrop-blur"
              >
                <div className="text-3xl mb-3">🎉</div>
                <h3 className="font-bold text-lg text-white">You've completed the demo.</h3>
                <p className="text-sm text-gray-300 mt-1">Ready to trade with your own account?</p>
                <button
                  onClick={() => navigate("/pricing")}
                  className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition flex items-center justify-center gap-2"
                >
                  <FaCrown /> Upgrade to Live Trading
                </button>
                <button
                  onClick={() => navigate("/activation")}
                  className="mt-2 w-full py-2.5 rounded-xl border border-white/20 hover:bg-white/10 font-semibold transition text-sm"
                >
                  Continue Setup Later
                </button>
              </motion.div>
            )}

            {/* Access Plans */}
            <GlassCard className="border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <FaTrophy className="text-yellow-300" />
                <h3 className="font-bold text-white">Access Plans</h3>
              </div>
              <div className="space-y-2">
                {[
                  { tier: "Demo", desc: "$1,000 Demo Account • AI Simulator", color: "emerald" },
                  { tier: "Pro", desc: "Live trading • OKX • Alpaca • AI automation", color: "blue" },
                  { tier: "Elite", desc: "DEX • Advanced bots • Sniper • Priority support", color: "purple" },
                ].map((plan) => (
                  <div key={plan.tier} className={`rounded-xl border border-${plan.color}-500/20 bg-${plan.color}-500/5 p-3`}>
                    <div className="font-bold text-sm text-white">{plan.tier}</div>
                    <div className="text-xs text-white/40">{plan.desc}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-bold text-sm transition w-full"
              >
                View Plans <FaArrowRight />
              </button>
            </GlassCard>
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 p-6 md:p-8 text-center backdrop-blur">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to trade with your own account?</h2>
          <p className="text-slate-300 mt-4 max-w-3xl mx-auto leading-8 text-sm md:text-base">
            Upgrade to Pro for live trading, connect OKX, Alpaca, or MetaMask, and start live trading.
            <span className="block text-emerald-400 mt-2">You keep 100% of your profits. No hidden fees.</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button onClick={() => navigate("/pricing")} className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 md:px-8 py-3 md:py-4 font-bold transition text-sm md:text-base">
              Upgrade to Live Trading →
            </button>
            <button onClick={() => navigate("/enterprise")} className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-6 md:px-8 py-3 md:py-4 font-bold transition text-sm md:text-base">
              View Enterprise Overview
            </button>
            <button onClick={() => navigate("/activation")} className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-6 md:px-8 py-3 md:py-4 font-bold transition text-sm md:text-base">
              Continue Setup Later
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-white/20 pb-4">
          Demo environment only. $1,000 virtual account for learning purposes. No real money used.
          Upgrade to Pro for live trading.
        </div>
      </div>
    </div>
  );
}