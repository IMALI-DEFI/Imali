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
import { PlayerHUD, QuestList, TradingSchool, useGameProgress, MascotLogo, BalanceChart, WinRing } from "../components/game/GameKit";

// Public, isolated product walkthrough. These service cards never call trading APIs.
const DEMO_SERVICES = [
  { id: 'overview', name: 'Overview', icon: '📊', summary: 'Portfolio, simulated trades, AI analysis, and automation activity.' },
  { id: 'okx', name: 'OKX Spot', icon: '₿', summary: 'Explore exchange connection, spot strategy settings, orders and trade history.' },
  { id: 'futures', name: 'OKX Futures', icon: '📈', summary: 'Explore futures positions, long/short signals, leverage awareness and risk controls.' },
  { id: 'robinhood', name: 'Robinhood Crypto', icon: '🪙', summary: 'Preview the crypto-only connected account, positions, buying power and bot activity.' },
  { id: 'alpaca', name: 'Alpaca', icon: '🏛️', summary: 'Explore account connection, paper activity and portfolio tracking.' },
  { id: 'dex', name: 'DEX', icon: '🔗', summary: 'Preview wallet connection, supported chain selection, token discovery and execution safeguards.' },
  { id: 'options', name: 'Options', icon: '🎯', summary: 'Preview options ideas, risk summaries, monitoring and eligible automation.' },
  { id: 'kalshi', name: 'Kalshi', icon: '🔮', summary: 'Explore prediction markets, contracts, positions and automated-trading workflow.' },
];

const SERVICE_MARKETS = {
  okx: [{symbol:'BTC/USDT',price:67420},{symbol:'ETH/USDT',price:3450},{symbol:'SOL/USDT',price:185}],
  futures: [{symbol:'BTC-USDT-SWAP',price:67420},{symbol:'ETH-USDT-SWAP',price:3450},{symbol:'SOL-USDT-SWAP',price:185}],
  robinhood: [{symbol:'BTC',price:67420},{symbol:'ETH',price:3450},{symbol:'DOGE',price:0.16}],
  alpaca: [{symbol:'AAPL',price:178.50},{symbol:'NVDA',price:890.75},{symbol:'TSLA',price:245.30}],
  dex: [{symbol:'ETH/USDC · Base',price:3450},{symbol:'UNI/USDC · Ethereum',price:12.40},{symbol:'LINK/USDC · Base',price:17.30}],
  options: [{symbol:'AAPL Call · Example',price:4.35},{symbol:'SPY Put · Example',price:3.10},{symbol:'NVDA Call · Example',price:8.75}],
  kalshi: [{symbol:'Weather contract · Example',price:0.57},{symbol:'Economic contract · Example',price:0.43},{symbol:'Sports contract · Example',price:0.62}],
};
const initialServiceState = () => Object.fromEntries(Object.keys(SERVICE_MARKETS).map(id => [id, {balance:1000,pnl:0,wins:0,losses:0,positions:[],trades:[],ticks:0}]));
const simulateServiceTick = (previous, service, riskFactor, settings = {}) => {
  const state = previous[service];
  const markets = SERVICE_MARKETS[service];
  const instrument = markets[state.ticks % markets.length];
  const marketMove = (Math.random() - 0.5) * 0.028;
  const next = {...state,positions:[...state.positions],trades:[...state.trades],ticks:state.ticks+1};
  const timestamp = new Date().toLocaleTimeString();
  if (next.positions.length && (next.ticks % 3 === 0 || next.positions.length >= 2)) {
    const position = next.positions.shift();
    const leverage = service === 'futures' ? Number(position.leverage || 2) : 1;
    let pnl = position.notional * marketMove * riskFactor * leverage;
    if (service === 'dex') pnl -= position.notional * (Number(settings.slippage || 0.5) / 100);
    if (service === 'options') pnl = Math.max(-position.notional, pnl * 3 - 0.65);
    if (service === 'kalshi') pnl = position.notional * (Math.random() < 0.5 ? (1 - position.entry) : -position.entry) * (position.side === 'NO' ? -1 : 1);
    pnl = Number(Math.max(-position.notional, pnl).toFixed(2));
    next.pnl = Number((next.pnl + pnl).toFixed(2));
    next.balance = Number((next.balance + pnl).toFixed(2));
    next[pnl >= 0 ? 'wins' : 'losses'] += 1;
    next.trades.unshift({id:`${service}-${next.ticks}-close`,time:timestamp,symbol:position.symbol,action:'CLOSE',pnl,detail: pnl >= 0 ? 'Example take-profit' : 'Example stop-loss'});
  } else {
    const direction = service === 'kalshi' ? (settings.outcome || 'Yes').toUpperCase() : service === 'options' ? (settings.optionType || 'Call').toUpperCase() : service === 'futures' && next.ticks % 2 ? 'SELL / SHORT' : 'BUY / LONG';
    const position = {id:`${service}-${next.ticks}`,symbol: service === 'dex' ? `${instrument.symbol} · ${settings.chain || 'Base'} preview` : instrument.symbol,entry:instrument.price,notional:Number(settings.orderSize || 100),side:direction,leverage:service === 'futures' ? Number(settings.leverage || 2) : 1};
    next.positions.unshift(position);
    next.trades.unshift({id:`${service}-${next.ticks}-open`,time:timestamp,symbol:position.symbol,action:'OPEN',pnl:null,detail:direction});
  }
  next.trades = next.trades.slice(0,12);
  return {...previous,[service]:next};
};

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
        <span className="ml-auto text-xs text-emerald-400 animate-pulse">● SIMULATED</span>
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
        <h3 className="text-sm font-bold text-white">Simulated Trade Feed</h3>
        {running && (
          <span className="ml-auto text-[10px] text-emerald-400 animate-pulse">● SIMULATED</span>
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
  const [activeService, setActiveService] = useState("okx");
  const [shareMessage, setShareMessage] = useState("");
  const [serviceState, setServiceState] = useState(initialServiceState);
  const [demoSettings, setDemoSettings] = useState({orderSize:100, leverage:2, slippage:0.5, chain:'Base', outcome:'Yes', optionType:'Call'});
  const updateDemoSetting = (key, value) => setDemoSettings(prev => ({...prev,[key]:value}));
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
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('service');
    if (SERVICE_MARKETS[requested]) setActiveService(requested);
  }, [location.search]);

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
    intervalRef.current = setInterval(() => {
      if (activeService === 'overview') generateTrade();
      else setServiceState(current => simulateServiceTick(current, activeService, strategy.id === 'aggressive' ? 1.8 : strategy.id === 'safe' ? 0.55 : strategy.id === 'growth' ? 1.35 : 1, demoSettings));
    }, 2200);
    return () => clearInterval(intervalRef.current);
  }, [running, strategy, activeService, demoSettings]);

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
    setServiceState(initialServiceState());
    setCandles(resetCandles);
    setLiveCandle(resetCandles[resetCandles.length - 1]);
    candleTicksRef.current = 0;
  };

  useEffect(() => {
    if (totalTrades > 10 && !showDemoPrompt && !user?.trading_enabled) {
      setShowDemoPrompt(true);
    }
  }, [totalTrades, user]);

  const selected = DEMO_SERVICES.find(item => item.id === activeService) || DEMO_SERVICES[1];
  const selectedDemo = serviceState[activeService] || serviceState.okx;
  const serviceMarkets = SERVICE_MARKETS[activeService] || SERVICE_MARKETS.okx;
  const changeService = id => { setRunning(false); setActiveService(id); window.history.replaceState(window.history.state, '', `/trade-demo?service=${id}`); };
  const orderOnce = () => {if(activeService !== 'overview') setServiceState(previous => simulateServiceTick(previous, activeService, strategy.id === 'aggressive' ? 1.8 : strategy.id === 'safe' ? 0.55 : strategy.id === 'growth' ? 1.35 : 1, demoSettings));};
  const chartPoints = Array.from({length: 36},(_,index) => {
    const tick = selectedDemo.ticks;
    const variation = Math.sin(index * .71 + tick * .35) * 19 + Math.cos(index * .31 + tick * .51) * 12;
    return `${index * 10},${Math.max(12,Math.min(145,82 - variation - Math.sin(tick / 8) * 14))}`;
  }).join(' ');
  // ---------- Game layer (XP, quests, lessons) ----------
  const { lessonsDone, lessonXp, completeLesson } = useGameProgress();
  const [visitedServices, setVisitedServices] = useState(() => new Set([activeService]));
  const [placedOrder, setPlacedOrder] = useState(false);
  const [startedOnce, setStartedOnce] = useState(false);
  const [pickedStyle, setPickedStyle] = useState(false);
  useEffect(() => {
    setVisitedServices((prev) => (prev.has(activeService) ? prev : new Set(prev).add(activeService)));
  }, [activeService]);

  const allDemo = Object.values(serviceState);
  const gameTrades = allDemo.reduce((sum, s) => sum + s.wins + s.losses, 0);
  const gameWins = allDemo.reduce((sum, s) => sum + s.wins, 0);
  const demoQuests = [
    { id: "style", emoji: "🧠", title: "Pick your robot's style", done: pickedStyle, xp: 10 },
    { id: "order", emoji: "👆", title: "Place an example order", done: placedOrder, xp: 10 },
    { id: "start", emoji: "▶️", title: "Turn on the robot", done: startedOnce, xp: 15 },
    { id: "win", emoji: "🏆", title: "Get your first win", done: gameWins > 0, xp: 15 },
    { id: "explore", emoji: "🧭", title: "Try 3 different markets", done: visitedServices.size >= 3, xp: 30 },
    { id: "school", emoji: "🎓", title: "Pass 2 Trading School lessons", done: lessonsDone.length >= 2, xp: 50 },
  ];
  const playerXp = gameTrades * 2 + gameWins * 3 + lessonXp + demoQuests.reduce((s, q) => s + (q.done ? q.xp : 0), 0);

  const SERVICE_COLORS = { okx: "fun-gold", futures: "fun-red", robinhood: "fun-green", alpaca: "fun-blue", dex: "fun-purple", options: "fun-orange", kalshi: "fun-purple" };
  const SERVICE_TAGS = { okx: "Buy & sell coins", futures: "Bet up or down", robinhood: "Crypto only", alpaca: "Stocks", dex: "Wallet tokens", options: "Pro level", kalshi: "Yes / No markets" };
  const STYLE_LOOK = {
    safe: { emoji: "🐢", nick: "Turtle", color: "fun-green", tag: "Slow & Safe", fire: 1, tip: "Small, careful steps. Wins more often, but wins are smaller." },
    balanced: { emoji: "🦉", nick: "Owl", color: "fun-blue", tag: "Smart Balance", fire: 2, tip: "A little careful, a little brave. A great first pick." },
    growth: { emoji: "🐇", nick: "Rabbit", color: "fun-orange", tag: "Quick Mover", fire: 3, tip: "Hops on chances fast. Bigger swings up and down." },
    aggressive: { emoji: "🐉", nick: "Dragon", color: "fun-red", tag: "Wild Ride", fire: 4, tip: "Goes big! Can win a lot — or lose a lot." },
  };
  const look = STYLE_LOOK[strategy.id] || STYLE_LOOK.balanced;
  const pnlUp = selectedDemo.pnl >= 0;
  const balanceHistory = (() => {
    const closed = selectedDemo.trades.filter((t) => t.pnl !== null); // newest first
    const hist = [selectedDemo.balance];
    let running = selectedDemo.balance;
    closed.forEach((t) => { running -= t.pnl; hist.push(running); });
    return hist.reverse();
  })();
  const shareDemo = async () => {
    const url = window.location.origin + "/trade-demo?service=" + activeService;
    try {
      if (navigator.share) await navigator.share({ title: "IMALI trading demo", url });
      else { await navigator.clipboard.writeText(url); setShareMessage("🔗 Link copied!"); }
    } catch (error) {
      if (error.name !== "AbortError") setShareMessage(url);
    }
  };

  return (
    <main className="fun-game-bg fun-calm min-h-screen text-white pb-14" style={{ background: "radial-gradient(circle at 50% -10%, #2a1366 0, #0a0d26 45%, #050816 100%)" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <PlayerHUD
          name={user?.displayName || user?.name || user?.firstName || "Guest Player"}
          xp={playerXp}
          coins={formatMoney(selectedDemo.balance)}
          coinsLabel={`${selected.name} play money`}
          streak={0}
        />

        {/* HERO */}
        <header className="fun-sparkle p-6 sm:p-8 text-center">
          <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          {justSignedUp && <div className="fun-pill mb-3">🎉 Welcome to IMALI!</div>}
          <MascotLogo size={96} className="mx-auto" />
          <h1 className="mt-3 text-3xl sm:text-5xl font-black fun-shine-text">Robot Trading Playground</h1>
          <p className="fun-help text-lg mt-3 max-w-2xl mx-auto">
            Every market gets <b className="text-[#ffe07a]">$1,000 in play money</b>. Pick a market, pick a robot style, and press Start.
            Nothing here is real — it's just for learning.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="fun-pill">✅ No sign-up</span>
            <span className="fun-pill">✅ No wallet or bank</span>
            <span className="fun-pill">✅ Pretend money only</span>
            <button type="button" onClick={shareDemo} className="fun-btn fun-small fun-ghost">↗ Share this demo</button>
          </div>
          {shareMessage && <p role="status" className="mt-2 text-sm font-bold text-[#8dffc4]">{shareMessage}</p>}
        </header>

        {/* STEP 1: MARKET */}
        <section className="fun-card" aria-label="Step 1: pick a market">
          <div className="flex items-start gap-3 mb-4">
            <span className={`fun-step ${visitedServices.size > 1 ? "is-done" : ""}`}>1</span>
            <div>
              <h2 className="fun-title">What should your robot trade?</h2>
              <p className="fun-help mt-1">Each market is its own little world with its own play money. Switch any time.</p>
            </div>
          </div>
          <nav aria-label="Trading services" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {DEMO_SERVICES.filter((s) => s.id !== "overview").map((service) => (
              <button key={service.id} type="button" aria-pressed={activeService === service.id}
                onClick={() => changeService(service.id)}
                className={`fun-tile ${SERVICE_COLORS[service.id] || "fun-blue"} ${activeService === service.id ? "is-picked" : ""}`}
                style={{ minHeight: 120 }}>
                <span className="fun-emoji" style={{ fontSize: "2.4rem" }} aria-hidden="true">{service.icon}</span>
                <strong style={{ fontSize: ".95rem" }}>{service.name}</strong>
                <small>{SERVICE_TAGS[service.id]}</small>
              </button>
            ))}
          </nav>
          <p key={selected.id} className="fun-help mt-4 fun-slide-in">💡 {selected.summary}</p>
        </section>

        {/* STEP 2: STYLE */}
        <section className="fun-card" aria-label="Step 2: pick a robot style">
          <div className="flex items-start gap-3 mb-4">
            <span className={`fun-step ${pickedStyle ? "is-done" : ""}`}>2</span>
            <div>
              <h2 className="fun-title">Pick your robot's style</h2>
              <p className="fun-help mt-1">More 🔥 = bigger ups and downs.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STRATEGIES.map((option) => {
              const s = STYLE_LOOK[option.id] || STYLE_LOOK.balanced;
              return (
                <button type="button" key={option.id} aria-pressed={strategy.id === option.id}
                  onClick={() => { setStrategy(option); setPickedStyle(true); }}
                  className={`fun-tile ${s.color} ${strategy.id === option.id ? "is-picked" : ""}`}>
                  <span className="fun-emoji" aria-hidden="true">{s.emoji}</span>
                  <strong>{s.nick}</strong>
                  <small>{s.tag}</small>
                  <span className="text-sm" aria-label={`Risk ${s.fire} of 4`}>{"🔥".repeat(s.fire)}{"▫️".repeat(4 - s.fire)}</span>
                </button>
              );
            })}
          </div>
          <p key={strategy.id} className="fun-help mt-4 fun-slide-in">💡 {look.tip}</p>
        </section>

        {/* STEP 3: GO */}
        <section className="fun-sparkle p-5 sm:p-6" aria-label="Step 3: start">
          <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="text-7xl shrink-0"><span className={running ? "fun-bounce" : ""} aria-hidden="true">{look.emoji}</span></div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className={`fun-step ${startedOnce ? "is-done" : ""}`}>3</span>
                <h2 className="text-2xl sm:text-3xl font-black">{running ? `${look.nick} is trading ${selected.name}!` : "Press Start and watch"}</h2>
              </div>
              <p className="fun-help mt-2">
                {running ? "Trades pop up below. Pause any time." : `Your ${look.nick} robot will trade ${selected.name} with pretend money. Or tap "Try one trade" to see a single step.`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button type="button" onClick={() => { setRunning((v) => !v); setStartedOnce(true); }}
                className={`fun-btn fun-big ${running ? "fun-red" : "fun-green"}`}>
                <span className="fun-btn-emoji" aria-hidden="true">{running ? "⏸️" : "▶️"}</span>{running ? "Pause" : "Start"}
              </button>
              <button type="button" onClick={() => { orderOnce(); setPlacedOrder(true); }} disabled={running} className="fun-btn fun-blue">👆 Try one trade</button>
              <button type="button" onClick={() => { setRunning(false); setServiceState((prev) => ({ ...prev, [activeService]: initialServiceState()[activeService] })); }} className="fun-btn fun-ghost">🔄 Start over</button>
            </div>
          </div>
        </section>

        {/* SCOREBOARD */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Scoreboard">
          <div className="fun-card col-span-2 text-center">
            <div className="fun-help font-bold">💵 {selected.name} play money</div>
            <div key={selectedDemo.balance} className={`text-5xl font-black mt-1 fun-pop ${pnlUp ? "text-[#4ff0a0]" : "text-[#ff7a80]"}`}>{formatMoney(selectedDemo.balance)}</div>
            <div className={`font-black mt-1 ${pnlUp ? "text-[#4ff0a0]" : "text-[#ff7a80]"}`}>
              {selectedDemo.wins + selectedDemo.losses ? `${pnlUp ? "+" : ""}${formatMoney(selectedDemo.pnl)} so far` : "Started with $1,000.00"}
            </div>
          </div>
          <div className="fun-card col-span-2 flex items-center justify-center">
            <WinRing wins={selectedDemo.wins} losses={selectedDemo.losses} size={140} />
          </div>
        </section>

        <section className="fun-card" aria-label="Play money over time">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-black text-xl">📈 Your play money over time</h2>
            <span className="fun-pill">{selected.name}</span>
          </div>
          <BalanceChart points={balanceHistory} start={1000} height={190} label="Play money" />
          <p className="text-xs text-white/50 mt-2">The yellow dashed line is where you started. Above it = up, below it = down.</p>
        </section>

        {/* CHART + CONTROLS */}
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="fun-card lg:col-span-3" aria-label="Price chart">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-xl">🕯️ Price chart</h2>
              <span className="fun-pill">{running ? "● Live (pretend)" : "Paused"}</span>
            </div>
            <p className="fun-help text-sm mt-1">🟩 Green candle = price went up. 🟥 Red candle = price went down. Press Start to watch it move.</p>
            <div className="fun-candles mt-3">
              <CandlestickChart data={candles} liveCandle={liveCandle} height={300} />
            </div>
            <p className="text-xs text-white/50 mt-2">Pretend prices for learning — not real prices or signals.</p>
          </section>

          <section className="fun-card lg:col-span-2 space-y-3" aria-label="Robot settings">
            <h2 className="font-black text-xl">🎛️ Robot settings</h2>
            <label className="block text-sm">💵 How much per trade (play $)
              <input type="number" min="10" max="250" step="10" value={demoSettings.orderSize}
                onChange={(e) => updateDemoSetting("orderSize", Math.min(250, Math.max(10, Number(e.target.value) || 10)))}
                className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3 text-white" />
            </label>
            {activeService === "futures" && (
              <label className="block text-sm">🚀 Boost (leverage) — bigger wins AND losses
                <select value={demoSettings.leverage} onChange={(e) => updateDemoSetting("leverage", Number(e.target.value))} className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3">
                  {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}x</option>)}
                </select>
              </label>
            )}
            {activeService === "dex" && (
              <>
                <label className="block text-sm">⛓️ Blockchain
                  <select value={demoSettings.chain} onChange={(e) => updateDemoSetting("chain", e.target.value)} className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3">
                    {["Base", "Ethereum", "Polygon"].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <label className="block text-sm">🌊 Price wiggle room (slippage)
                  <select value={demoSettings.slippage} onChange={(e) => updateDemoSetting("slippage", Number(e.target.value))} className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3">
                    {[0.1, 0.5, 1, 2].map((n) => <option key={n} value={n}>{n}%</option>)}
                  </select>
                </label>
              </>
            )}
            {activeService === "options" && (
              <label className="block text-sm">🎯 Guess up (Call) or down (Put)
                <select value={demoSettings.optionType} onChange={(e) => updateDemoSetting("optionType", e.target.value)} className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3">
                  <option>Call</option><option>Put</option>
                </select>
              </label>
            )}
            {activeService === "kalshi" && (
              <label className="block text-sm">🔮 Will it happen?
                <select value={demoSettings.outcome} onChange={(e) => updateDemoSetting("outcome", e.target.value)} className="mt-1 block w-full rounded-xl border-2 border-[#5c6ad6] bg-[#0a0d26] p-3">
                  <option>Yes</option><option>No</option>
                </select>
              </label>
            )}
            <p className="text-xs text-white/60">Trades: {serviceMarkets.map((a) => a.symbol).join(" · ")}</p>
          </section>
        </div>

        {/* POSITIONS + HISTORY */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="fun-card" aria-label="Open trades">
            <h2 className="font-black text-xl mb-3">🧺 Trades open right now</h2>
            {selectedDemo.positions.length ? selectedDemo.positions.map((position) => (
              <div key={position.id} className="fun-slide-in mb-2 rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-3">
                <strong>{position.symbol}</strong>
                <p className="mt-1 text-sm text-[#8dffc4]">{position.side} · {formatMoney(position.notional)} play money</p>
              </div>
            )) : (
              <div className="py-8 text-center">
                <MascotLogo size={64} className="mx-auto" />
                <p className="fun-help mt-2">No open trades. Press Start or "Try one trade".</p>
              </div>
            )}
          </section>
          <section className="fun-card" aria-label="What the robot did">
            <h2 className="font-black text-xl mb-3">🤖 What the robot did</h2>
            <ul className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedDemo.trades.length ? selectedDemo.trades.map((trade) => {
                const closed = trade.pnl !== null;
                const won = closed && trade.pnl >= 0;
                return (
                  <li key={trade.id} className={`fun-slide-in rounded-2xl p-3 flex items-center gap-3 border-2 ${!closed ? "border-[#5c6ad6] bg-white/5" : won ? "border-[#0fb36a] bg-[#0fb36a1f]" : "border-[#e3263a] bg-[#e3263a1a]"}`}>
                    <span className="text-2xl" aria-hidden="true">{!closed ? "🛒" : won ? "🎉" : "🛑"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-sm">{!closed ? `Bought ${trade.symbol}` : won ? `Won on ${trade.symbol}` : `Stopped a loss on ${trade.symbol}`}</div>
                      <div className="text-xs text-white/60">{trade.detail} · {trade.time}</div>
                    </div>
                    <div className={`font-black ${!closed ? "text-white/70" : won ? "text-[#4ff0a0]" : "text-[#ff7a80]"}`}>{closed ? `${won ? "+" : ""}${formatMoney(trade.pnl)}` : "Open"}</div>
                  </li>
                );
              }) : <p className="fun-help">Waiting for the robot's first move…</p>}
            </ul>
          </section>
        </div>

        {/* QUESTS + SCHOOL */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2"><QuestList title="🗺️ Your Quests" quests={demoQuests} /></div>
          <div className="lg:col-span-3"><TradingSchool lessonsDone={lessonsDone} onComplete={completeLesson} /></div>
        </div>

        {(showDemoPrompt || gameTrades >= 10) && (
          <section className="fun-sparkle p-6 text-center fun-slide-in">
            <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            <MascotLogo size={80} className="mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-black mt-2">Nice work! Want your own robot?</h2>
            <p className="fun-help mt-2 max-w-xl mx-auto">Connect your own account and IMALI trades for you. Your money always stays in your account.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <Link to="/signup" className="fun-btn fun-gold fun-big"><span className="fun-btn-emoji">🚀</span> Get Started</Link>
              <button type="button" onClick={() => navigate("/pricing")} className="fun-btn fun-blue">💎 See Plans</button>
            </div>
          </section>
        )}

        <p className="text-center text-xs text-white/40">
          Everything here is pretend. Futures, options and prediction results are simplified for learning and don't connect to real accounts. Real trading can lose money.
        </p>

        {!(showDemoPrompt || gameTrades >= 10) && (
          <section className="fun-card text-center">
            <h2 className="text-2xl font-black">Ready to try IMALI for real?</h2>
            <p className="fun-help mt-2">Sign up, then connect a supported account whenever you're ready.</p>
            <Link to="/signup" className="fun-btn fun-gold fun-big mt-5"><span className="fun-btn-emoji">🚀</span> Get Started</Link>
          </section>
        )}
      </div>
    </main>
  );
}
