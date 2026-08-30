import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePromoStatus, usePromoClaim } from "../hooks/usePromo";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import toast, { Toaster } from "react-hot-toast";
import { FaShareAlt, FaCrown, FaRobot, FaBrain, FaChartLine, FaArrowRight, FaCheckCircle, FaShieldAlt, FaCoins } from "react-icons/fa";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Import CandlestickChart for hero background
import CandlestickChart from "../components/charts/CandlestickChart";
import * as candleGenerator from "../utils/demoCandleGenerator";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatNumber = (value) => safeNumber(value).toLocaleString();

const getBotDisplayName = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name === "okx") return "OKX Spot";
  if (name === "futures") return "Futures Bot";
  if (name === "stocks" || name === "stock") return "Stock Bot";
  if (name === "sniper") return "Sniper Bot";
  return botName || "Bot";
};

const getBotIcon = (botName) => {
  const name = (botName || "").toLowerCase();
  if (name.includes("stock")) return "📈";
  if (name.includes("futures")) return "📊";
  if (name.includes("sniper")) return "🎯";
  if (name.includes("okx")) return "🔷";
  return "🤖";
};

function normalizeBotName(botName) {
  const name = String(botName || "").toLowerCase();
  if (name.includes("okx")) return "okx";
  if (name.includes("future")) return "futures";
  if (name.includes("stock") || name.includes("alpaca")) return "stocks";
  if (name.includes("sniper") || name.includes("dex")) return "sniper";
  return name || "unknown";
}

function buildActivitySeries(trades = []) {
  if (!trades.length) return [4, 6, 5, 8, 6, 9, 7];

  const dayMap = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  trades.slice(0, 100).forEach((trade) => {
    if (trade.created_at) {
      const date = new Date(trade.created_at);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      if (dayMap[dayName]) {
        const pnl = Math.abs(trade.pnl_usd || trade.pnl || 0);
        dayMap[dayName].push(pnl);
      }
    }
  });

  return dayOrder.map((day) => {
    const activities = dayMap[day];
    if (activities.length === 0) return 5;
    const avg = activities.reduce((a, b) => a + b, 0) / activities.length;
    return Math.max(3, Math.min(15, avg / 50 + 3));
  });
}

// Glass Card Component - Mobile responsive
const GlassCard = ({ children, className = "", gradient = "from-emerald-500/10 to-cyan-500/10" }) => (
  <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
    <div className="relative z-10 p-4 sm:p-6">{children}</div>
  </div>
);

// PromoMeter Component
function PromoMeter({ promo }) {
  const pct = promo.limit > 0 ? (promo.claimed / promo.limit) * 100 : 0;
  const urgency = promo.spotsLeft <= 10 ? "text-red-400" : promo.spotsLeft <= 25 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-white/50">{promo.loading ? "Loading..." : `${promo.claimed} of ${promo.limit} spots claimed`}</span>
        <span className={`font-bold ${urgency}`}>{promo.loading ? "..." : `${promo.spotsLeft} left`}</span>
      </div>
      <div className="h-2 sm:h-3 overflow-hidden rounded-full bg-white/10">
        <motion.div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
}

// Floating Market Prices - Mobile responsive
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
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-4 py-1.5 sm:py-2 px-2">
      {prices.map((item) => (
        <motion.div
          key={item.symbol}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: Math.random() * 0.5 }}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 text-[10px] sm:text-xs md:text-sm"
        >
          <span className="font-bold text-white">{item.symbol}</span>
          <span className="ml-1 sm:ml-2 text-white/70 text-[10px] sm:text-xs">${item.price.toLocaleString()}</span>
          <span className={`ml-1 sm:ml-2 ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'} text-[10px] sm:text-xs`}>
            {item.change}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// AI Thinking Panel - Mobile responsive
const AIThinkingPanel = () => {
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
        { regime: "Bearish", confidence: 76, reasoning: ["Overbought conditions", "Resistance rejection", "Volume decreasing"], decision: "SHORT" },
        { regime: "Neutral", confidence: 62, reasoning: ["Consolidation", "Low volatility", "Awaiting breakout"], decision: "HOLD" },
        { regime: "Bullish", confidence: 91, reasoning: ["Breakout confirmed", "High volume", "Momentum increasing"], decision: "LONG" },
      ];
      setSignal(signals[Math.floor(Math.random() * signals.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-5 md:p-6">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <FaBrain className="text-cyan-400 text-lg sm:text-xl" />
          <h3 className="text-base sm:text-lg font-bold text-white">AI Analysis</h3>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
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
            <div className="mt-1 h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-white/10">
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
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/70"
                >
                  <FaCheckCircle className="text-emerald-400 text-[8px] sm:text-xs flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-white/10">
            <span className="text-white/60 text-xs sm:text-sm">Decision</span>
            <motion.span
              key={signal.decision}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`font-bold px-3 py-1 rounded-full text-xs sm:text-sm ${
                signal.decision === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' :
                signal.decision === 'SHORT' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {signal.decision}
            </motion.span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animated Bot Activity - Mobile responsive
const AnimatedBotActivity = () => {
  const [status, setStatus] = useState({
    active: true,
    scanning: "BTC",
    confidence: 82,
    decision: "BUY"
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const assets = ["BTC", "ETH", "SOL", "AVAX", "MATIC"];
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const confidence = Math.floor(Math.random() * 30) + 65;
      const decisions = ["BUY", "SELL", "HOLD"];
      const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
      
      setStatus({
        active: true,
        scanning: randomAsset,
        confidence,
        decision: randomDecision
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-5 md:p-6">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <FaRobot className="text-emerald-400 text-lg sm:text-xl" />
            <h3 className="text-base sm:text-lg font-bold text-white">Bot Activity</h3>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs text-emerald-400">Active</span>
          </div>
        </div>
        
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          <div className="flex justify-between items-center p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60 text-xs sm:text-sm">Scanning</span>
            <span className="text-white font-bold text-xs sm:text-sm">{status.scanning}</span>
          </div>
          
          <div className="flex justify-between items-center p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60 text-xs sm:text-sm">Confidence</span>
            <span className="text-white font-bold text-xs sm:text-sm">{status.confidence}%</span>
          </div>
          
          <div className="flex justify-between items-center p-2 sm:p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60 text-xs sm:text-sm">Decision</span>
            <span className={`font-bold text-xs sm:text-sm ${
              status.decision === 'BUY' ? 'text-emerald-400' :
              status.decision === 'SELL' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {status.decision}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animated Trade Feed - Mobile responsive
const AnimatedTradeFeed = ({ trades = [] }) => {
  const [feed, setFeed] = useState([]);
  
  useEffect(() => {
    const generateTrade = () => {
      const assets = ["BTC", "ETH", "SOL", "AVAX", "MATIC"];
      const decisions = ["BUY", "SELL"];
      const randomAsset = assets[Math.floor(Math.random() * assets.length)];
      const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
      const entry = (Math.random() * 1000 + 100).toFixed(2);
      const target = (parseFloat(entry) * (1 + (Math.random() * 0.05 + 0.01))).toFixed(2);
      const stop = (parseFloat(entry) * (1 - (Math.random() * 0.03 + 0.01))).toFixed(2);
      
      const newTrade = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        asset: randomAsset,
        decision: randomDecision,
        confidence: Math.floor(Math.random() * 30) + 65,
        entry: `$${entry}`,
        target: `$${target}`,
        stop: `$${stop}`
      };
      
      setFeed(prev => [newTrade, ...prev.slice(0, 9)]);
    };
    
    generateTrade();
    const interval = setInterval(generateTrade, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl max-h-[350px] sm:max-h-[400px] overflow-y-auto">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative z-10 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4 sticky top-0 bg-black/50 backdrop-blur py-2 -mt-2 -mx-2 px-2 sm:px-3 rounded-t-2xl">
          <FaChartLine className="text-emerald-400 text-lg sm:text-xl flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-white">Live Trade Feed</h3>
        </div>
        
        <AnimatePresence>
          {feed.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-sm text-white/30">{trade.time}</span>
                    <span className="font-bold text-sm sm:text-base text-white">{trade.asset}</span>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-xs font-bold ${
                      trade.decision === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.decision}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 text-[8px] sm:text-xs">
                    <span className="text-white/30">Entry: <span className="text-white/60">{trade.entry}</span></span>
                    <span className="text-white/30">Target: <span className="text-emerald-400/60">{trade.target}</span></span>
                    <span className="text-white/30">Stop: <span className="text-red-400/60">{trade.stop}</span></span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex sm:block items-center gap-2">
                  <span className="text-white/30 text-[8px] sm:text-xs">Confidence</span>
                  <div className="text-xs sm:text-sm font-bold text-white">{trade.confidence}%</div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Hero with Candlestick Background - Mobile responsive
const HeroSection = ({ activity, onClaimClick }) => {
  const [candles] = useState(() => 
    candleGenerator.createInitialCandles({ count: 40, startPrice: 67420, intervalSeconds: 60 })
  );
  const [liveCandle, setLiveCandle] = useState(() => candles[candles.length - 1]);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setLiveCandle(current => {
        if (!current) return current;
        if (tickRef.current % 6 === 0) {
          return candleGenerator.createNextCandle(current, 60);
        }
        return candleGenerator.updateLiveCandle(current, { volatility: 0.0008 });
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden min-h-[80vh] sm:min-h-[85vh] md:min-h-[90vh] flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-10 sm:opacity-20">
          <CandlestickChart data={candles} liveCandle={liveCandle} height={window.innerHeight * 0.9} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Column */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-emerald-400 backdrop-blur-sm">
                <span className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Signals + Automated Trading with Robinhood, OKX & Alpaca
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 sm:mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
            >
              Get AI Signals.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Then Automate.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0"
            >
              Start free with IMALI AI Signals. When you are ready to automate, connect a supported account such as Robinhood Crypto, OKX, or Alpaca while your funds remain with the provider.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-3"
            >
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2.5 backdrop-blur-sm transition hover:bg-emerald-500/20"
              >
                <span className="text-sm text-white/70">Automation plans starting at</span>
                <span className="text-xl font-extrabold text-emerald-400">$19/month</span>
                <FaArrowRight className="text-emerald-400 text-xs" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-4 sm:mt-5 flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start"
            >
              <button
                type="button"
                onClick={onClaimClick}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-105"
              >
                Get Free AI Signals
                <FaArrowRight className="group-hover:translate-x-1 transition" />
              </button>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                See How IMALI Works
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm text-white/50"
            >
              <span className="flex items-center gap-1.5 sm:gap-2">
                <FaCheckCircle className="text-emerald-400 text-xs sm:text-sm" />
                Free newsletter
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <FaCheckCircle className="text-emerald-400 text-xs sm:text-sm" />
                AI signal updates
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <FaCheckCircle className="text-emerald-400 text-xs sm:text-sm" />
                Unsubscribe anytime
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <FaShieldAlt className="text-emerald-400 text-xs sm:text-sm" />
                Noncustodial connections
              </span>
            </motion.div>
          </div>
          
          {/* Right Column - Glass Panels */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4 max-w-md mx-auto lg:mx-0 w-full"
          >
            <AIThinkingPanel />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <AnimatedBotActivity />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-5 md:p-6">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <div className="relative z-10 text-center">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                    <CountUp end={activity.stats.totalTrades} duration={2} separator="," />
                  </div>
                  <div className="text-[10px] sm:text-sm text-white/50 mt-0.5 sm:mt-1">Total Trades</div>
                </div>
                <div className="relative z-10 mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
                  <div>
                    <div className="text-base sm:text-lg font-bold text-emerald-400">
                      <CountUp end={safeNumber(activity.stats.winRate)} duration={2} decimals={1} />%
                    </div>
                    <div className="text-[8px] sm:text-xs text-white/40">Win Rate</div>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-white">
                      <CountUp end={activity.stats.activeBots} duration={2} />
                    </div>
                    <div className="text-[8px] sm:text-xs text-white/40">Active Bots</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Main Home Component
export default function Home() {
  const { user } = useAuth();
  const promo = usePromoStatus();
  const promoClaim = usePromoClaim();

  const [activity, setActivity] = useState({
    trades: [],
    stats: { currentStatus: "Loading...", activeBots: 0, totalTrades: 0, wins: 0, losses: 0, winRate: 0, online: false, botStatuses: [] },
    loading: true,
    error: null,
  });

  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [claimStatus, setClaimStatus] = useState({ loading: false, error: null, success: false });

  const userReferralLink = useMemo(() => {
    if (!user?.referral_code) return null;
    return `${window.location.origin}/signup?ref=${user.referral_code}`;
  }, [user]);

  const fetchActivity = useCallback(async () => {
    try {
      const statsRes = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });
      if (statsRes.data?.success) {
        const data = statsRes.data.data || {};
        const trades = Array.isArray(data?.recent_trades) ? data.recent_trades : [];
        const summary = data?.summary || {};

        const mainBots = ["okx", "futures", "stocks", "sniper"];
        const botStatuses = Array.isArray(data?.bots)
          ? data.bots.filter((bot) => mainBots.includes(normalizeBotName(bot?.name))).map((bot) => ({
              label: getBotDisplayName(bot?.name),
              live: safeNumber(bot?.total_trades) > 0 || safeNumber(bot?.open_positions) > 0,
              details: bot,
            }))
          : [];

        setActivity({
          trades: trades.slice(0, 20),
          stats: {
            currentStatus: botStatuses.some((b) => b.live) ? "Live" : "Demo",
            activeBots: botStatuses.filter((b) => b.live).length,
            totalTrades: safeNumber(summary?.total_trades, trades.length),
            wins: safeNumber(summary?.wins, 0),
            losses: safeNumber(summary?.losses, 0),
            winRate: safeNumber(summary?.win_rate, 0),
            online: botStatuses.some((b) => b.live),
            botStatuses,
          },
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      setActivity((prev) => ({ ...prev, loading: false, error: "Could not refresh live stats" }));
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setClaimStatus({ loading: false, error: "Please enter your email address", success: false });
      return;
    }

    setClaimStatus({ loading: true, error: null, success: false });

    try {
      const success = await promoClaim.claim(email);
      if (success) {
        setClaimStatus({ loading: false, error: null, success: true });
        setShowForm(false);
        toast.success("You’re subscribed! Check your email for IMALI AI Signals.");
        setTimeout(() => setClaimStatus({ loading: false, error: null, success: false }), 5000);
      } else {
        setClaimStatus({ loading: false, error: promoClaim.state.error || "Failed to subscribe", success: false });
      }
    } catch (err) {
      setClaimStatus({ loading: false, error: err.message || "Failed to subscribe", success: false });
    }
  };

  const resetClaimForm = () => {
    setShowForm(false);
    setEmail("");
    setClaimStatus({ loading: false, error: null, success: false });
    promoClaim.reset();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      {/* Sticky Promo Banner - Mobile responsive */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg"
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex flex-col xs:flex-row items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl animate-bounce flex-shrink-0">🎁</span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">🧠 Free AI Trading Signals — Delivered to Your Inbox</p>
                <p className="text-[10px] sm:text-xs text-white/90 hidden xs:block">Free newsletter required. Unsubscribe anytime.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowForm(true)} 
              className="rounded-full bg-white px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-orange-600 shadow-lg transition hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
            >
              Get Free Signals →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Hero Section with Candles */}
      <HeroSection activity={activity} onClaimClick={() => setShowForm(true)} />

      {/* Floating Market Prices */}
      <div className="relative z-10 border-y border-white/5 bg-black/20 backdrop-blur-sm py-1.5 sm:py-3">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <FloatingPrices />
        </div>
      </div>

      {/* Features Section - Glass Cards */}
      <section className="relative z-10 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Start with Free Signals → <span className="text-emerald-400">Automate When Ready</span>
            </h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-white/60 max-w-2xl mx-auto px-4">
              Start with the free AI Signals newsletter, explore the platform, then automate trading when you are ready.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { num: "01", title: "Get Free AI Signals", text: "Join the free newsletter and see the market opportunities IMALI is identifying.", icon: "📩" },
              { num: "02", title: "Create Your IMALI Account", text: "Choose your market, strategy, and risk settings when you are ready to automate.", icon: "🤖" },
              { num: "03", title: "Connect & Automate", text: "Connect Robinhood Crypto, OKX, Alpaca, or a supported wallet. IMALI sends orders without taking custody of your funds.", icon: "⚡" },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-6 sm:p-8 text-center"
              >
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <div className="relative z-10">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{step.icon}</div>
                  <div className="text-3xl sm:text-4xl font-bold text-white/10 mb-1 sm:mb-2">{step.num}</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">{step.title}</h3>
                  <p className="text-sm sm:text-base text-white/60">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Activity Section */}
      <section className="relative z-10 py-12 sm:py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            <AnimatedTradeFeed trades={activity.trades} />
            <div className="space-y-4 sm:space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <div className="relative z-10">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Available Bots</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { icon: "📊", name: "Futures Bot", desc: "High leverage" },
                      { icon: "📈", name: "Stock Bot", desc: "Alpaca + Robinhood Agentic path" },
                      { icon: "🎯", name: "Sniper Bot", desc: "DEX trading" },
                      { icon: "🟢", name: "Robinhood Crypto", desc: "Familiar crypto account" },
                      { icon: "🔷", name: "OKX Spot", desc: "CEX trading" },
                    ].map((bot, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        viewport={{ once: true }}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-center hover:bg-white/10 transition"
                      >
                        <span className="text-2xl sm:text-3xl block mb-1 sm:mb-2">{bot.icon}</span>
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{bot.name}</p>
                        <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 truncate">{bot.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-6">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                  <FaCoins className="text-amber-400 text-lg sm:text-xl flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">Referral Rewards</h3>
                    <p className="text-xs sm:text-sm text-white/60 truncate">Earn recurring subscription commissions</p>
                  </div>
                </div>
                <div className="relative z-10 mt-3 sm:mt-4">
                  <Link to="/referrals" className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-amber-400 hover:text-amber-300 transition">
                    View referral dashboard <FaArrowRight className="text-xs" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Form Section - Mobile responsive */}
      <section className="relative z-10 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-5 sm:p-8">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
            <div className="relative z-10">
              <div className="text-center mb-4 sm:mb-6">
                <span className="text-4xl sm:text-5xl block mb-3 sm:mb-4 animate-pulse">🎁</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Free IMALI AI Signals Newsletter</h3>
                <p className="text-sm sm:text-base text-white/60 mt-1 sm:mt-2">Get AI-generated market opportunities delivered to your inbox. Free to join. No credit card required.</p>
              </div>

              <div className="space-y-2 sm:space-y-3 rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 mb-4 sm:mb-6">
                {[
                  "🧠 AI-generated trading signals",
                  "📊 Confidence scores and AI ratings",
                  "💰 Price and market opportunity details",
                  "⚠️ Risk ratings for each highlighted setup",
                  "🔥 Top opportunities across supported markets",
                  "✅ Free to join — unsubscribe anytime",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/70">
                    <FaCheckCircle className="text-emerald-400 text-[10px] sm:text-xs flex-shrink-0" />
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>

              <PromoMeter promo={promo} />

              {!showForm && !claimStatus.success && promo.active && (
                <button 
                  onClick={() => setShowForm(true)} 
                  className="mt-4 sm:mt-6 w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3 sm:py-4 text-sm sm:text-base font-bold text-white shadow-lg hover:from-emerald-500 hover:to-cyan-500 transition"
                >
                  📩 Get Free AI Signals
                </button>
              )}

              {showForm && !claimStatus.success && (
                <form onSubmit={handleClaimSubmit} className="mt-4 sm:mt-6 space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:py-4 text-sm sm:text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    required
                    autoFocus
                    disabled={claimStatus.loading}
                  />

                  {claimStatus.error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 sm:p-3 text-xs sm:text-sm text-red-400">
                      ⚠️ {claimStatus.error}
                    </div>
                  )}

                  <div className="flex gap-2 sm:gap-3">
                    <button 
                      type="submit" 
                      disabled={claimStatus.loading} 
                      className="flex-1 rounded-xl bg-emerald-600 py-3 sm:py-4 text-xs sm:text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-500 transition"
                    >
                      {claimStatus.loading ? "Subscribing..." : "✅ Subscribe Free"}
                    </button>
                    <button 
                      type="button" 
                      onClick={resetClaimForm} 
                      className="px-4 sm:px-6 text-xs sm:text-sm text-white/40 hover:text-white/60 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {claimStatus.success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 text-center"
                >
                  <div className="text-3xl sm:text-4xl mb-2">🎉</div>
                  <p className="text-base sm:text-lg font-bold text-emerald-400">You’re Subscribed!</p>
                  <p className="mt-1 text-xs sm:text-sm text-white/60">
                    Check your inbox for IMALI AI Signals. You can <Link to="/signup" className="text-emerald-400 underline">create an IMALI account</Link> anytime to explore automation.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Referral Link */}
      {userReferralLink && (
        <section className="relative z-10 py-12 sm:py-16 bg-black/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl shadow-xl p-4 sm:p-6">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
              <div className="relative z-10 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">Your Referral Link</p>
                  <h3 className="text-base sm:text-lg font-bold text-white">Invite developers and traders</h3>
                  <p className="text-xs sm:text-sm text-white/60">Earn recurring subscription commissions.</p>
                  <code className="mt-1 sm:mt-2 block break-all text-[10px] sm:text-xs text-emerald-400 bg-white/5 p-1.5 sm:p-2 rounded-lg">{userReferralLink}</code>
                </div>
                <Link 
                  to="/referrals" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl sm:rounded-2xl bg-emerald-600 px-4 sm:px-5 py-2.5 sm:py-3 font-bold text-sm sm:text-base text-white transition hover:bg-emerald-500 flex-shrink-0"
                >
                  <FaShareAlt className="mr-1.5 sm:mr-2" /> Referral Hub →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA - Mobile responsive */}
      <section className="relative z-10 py-12 sm:py-16 md:py-20 bg-gradient-to-r from-emerald-600 to-cyan-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Start Free. Automate Later.</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto px-4">
              Get IMALI AI Signals first. If the platform fits you, create an account and connect Robinhood Crypto, OKX, Alpaca, or a supported wallet when you are ready.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-6 sm:mt-8 inline-block rounded-full bg-white px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-bold text-emerald-700 shadow-lg transition hover:scale-105 hover:bg-gray-100"
            >
              Get Free AI Signals →
            </button>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-white/75">Free newsletter required. Unsubscribe anytime.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}