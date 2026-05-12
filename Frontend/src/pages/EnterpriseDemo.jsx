// src/pages/Enterprise.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import logo from "../assets/imali-logo.png";

import {
  FaRobot,
  FaChartLine,
  FaShieldAlt,
  FaUsers,
  FaCheckCircle,
  FaArrowRight,
  FaExchangeAlt,
  FaPalette,
  FaSlidersH,
  FaFileAlt,
  FaEye,
  FaLock,
  FaDatabase,
  FaBolt,
  FaCog,
  FaBuilding,
  FaServer,
  FaCloud,
  FaKey,
  FaInfoCircle,
  FaSpinner,
  FaPlug,
  FaUnlink,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// API base URL
const API_BASE = process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";

// FORCE DEMO MODE for now (set to false when backend is ready)
const DEMO_MODE = true;

// Safe number formatting helper
const formatPrice = (price) => {
  const num = Number(price || 0);
  return isNaN(num) ? "0" : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (percent) => {
  const num = Number(percent || 0);
  return isNaN(num) ? "0" : num.toFixed(1);
};

export default function Enterprise() {
  const [activeDemoTab, setActiveDemoTab] = useState("simulator");
  const [activeChartTab, setActiveChartTab] = useState("performance");
  const [pageLoading, setPageLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);
  
  // Market Data State
  const [marketData, setMarketData] = useState({
    btc: { price: 71234, change: 2.4, momentum: "high", confidence: 87, loading: false },
    eth: { price: 3821, change: 1.8, momentum: "medium", confidence: 72, loading: false },
    sol: { price: 168, change: 5.2, momentum: "very_high", confidence: 91, loading: false },
  });
  
  const [recentTrades, setRecentTrades] = useState([]);
  const [scannerAssets, setScannerAssets] = useState([]);
  const [paperTradeResult, setPaperTradeResult] = useState(null);
  
  // Chart Data State
  const [performanceData, setPerformanceData] = useState({
    labels: [],
    pnl: [],
    trades: [],
    winRate: [],
  });
  const [distributionData] = useState({
    labels: ["BTC", "ETH", "SOL", "AVAX", "ARB", "Other"],
    values: [42, 23, 18, 9, 5, 3],
  });
  const [chartPeriod, setChartPeriod] = useState("30");
  
  // API Connection States (Demo mode only - UI only)
  const [alpacaConnected, setAlpacaConnected] = useState(false);
  const [okxConnected, setOkxConnected] = useState(false);
  const [connectingAlpaca, setConnectingAlpaca] = useState(false);
  const [connectingOkx, setConnectingOkx] = useState(false);
  const [alpacaMode] = useState("paper");
  const [okxMode] = useState("paper");
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);
  const [showOkxModal, setShowOkxModal] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const [paperTradeConfig, setPaperTradeConfig] = useState({
    asset_universe: "btc_eth",
    strategy_type: "momentum",
    max_positions: 5,
    selected_exchange: "alpaca",
  });

  const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  // Generate historical performance data for charts
  const generateHistoricalData = useCallback((days = 30) => {
    const labels = [];
    const pnlData = [];
    const tradesData = [];
    const winRateData = [];
    
    let cumulativePnl = 0;
    const daysInt = parseInt(days, 10);
    
    for (let i = daysInt; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const dailyPnl = (Math.random() * 200 - 50) + (i < 15 ? 20 : 0);
      cumulativePnl += dailyPnl;
      pnlData.push(Math.round(cumulativePnl * 100) / 100);
      tradesData.push(Math.floor(Math.random() * 15) + 3);
      winRateData.push(Math.floor(Math.random() * 30) + 45);
    }
    
    return { labels, pnl: pnlData, trades: tradesData, winRate: winRateData };
  }, []);

  // Fetch market data (Demo or Real)
  const fetchMarketData = useCallback(async () => {
    if (DEMO_MODE) {
      // Demo data - already set in initialState
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/public/market/prices`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMarketData({
            btc: {
              price: data.data.btc?.price || 71234,
              change: data.data.btc?.change_24h || 2.4,
              momentum: data.data.btc?.momentum || "high",
              confidence: data.data.btc?.confidence || 87,
              loading: false,
            },
            eth: {
              price: data.data.eth?.price || 3821,
              change: data.data.eth?.change_24h || 1.8,
              momentum: data.data.eth?.momentum || "medium",
              confidence: data.data.eth?.confidence || 72,
              loading: false,
            },
            sol: {
              price: data.data.sol?.price || 168,
              change: data.data.sol?.change_24h || 5.2,
              momentum: data.data.sol?.momentum || "very_high",
              confidence: data.data.sol?.confidence || 91,
              loading: false,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      // Keep demo data
    }
  }, []);

  // Fetch recent trades
  const fetchRecentTrades = useCallback(async () => {
    if (DEMO_MODE) {
      setRecentTrades([
        { asset: "BTC", type: "BUY", returnPercent: 8.2, entryPrice: 65800, exitPrice: 71234, confidence: 78, exchange: "Alpaca" },
        { asset: "ETH", type: "BUY", returnPercent: 6.4, entryPrice: 3590, exitPrice: 3821, confidence: 71, exchange: "OKX" },
        { asset: "SOL", type: "SELL", returnPercent: 3.8, entryPrice: 162, exitPrice: 168, confidence: 65, exchange: "Alpaca" },
        { asset: "AVAX", type: "BUY", returnPercent: 11.5, entryPrice: 28.70, exitPrice: 32.00, confidence: 73, exchange: "OKX" },
        { asset: "ARB", type: "BUY", returnPercent: 5.2, entryPrice: 1.036, exitPrice: 1.090, confidence: 68, exchange: "Alpaca" },
      ]);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/trading/global-trades?limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.trades) {
          setRecentTrades(data.trades.slice(0, 5).map(trade => ({
            asset: trade.symbol?.split('/')[0] || "BTC",
            type: trade.side?.toUpperCase() || "BUY",
            returnPercent: Math.min(Math.abs(trade.pnl_percent || 0), 25),
            entryPrice: trade.price || 0,
            exitPrice: trade.exit_price || trade.price || 0,
            confidence: 55 + Math.floor(Math.random() * 35),
            exchange: trade.exchange || "unknown",
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    }
  }, []);

  // Fetch scanner assets
  const fetchScannerAssets = useCallback(async () => {
    if (DEMO_MODE) {
      setScannerAssets([
        { symbol: "BTC", active: true, momentum: "high", confidence: 84, exchange: "Both" },
        { symbol: "ETH", active: true, momentum: "medium", confidence: 71, exchange: "Both" },
        { symbol: "SOL", active: true, momentum: "high", confidence: 88, exchange: "OKX" },
        { symbol: "AAPL", active: true, momentum: "medium", confidence: 65, exchange: "Alpaca" },
        { symbol: "TSLA", active: true, momentum: "high", confidence: 72, exchange: "Alpaca" },
        { symbol: "NVDA", active: true, momentum: "high", confidence: 81, exchange: "Alpaca" },
        { symbol: "AVAX", active: true, momentum: "high", confidence: 79, exchange: "OKX" },
        { symbol: "BNB", active: true, momentum: "low", confidence: 48, exchange: "OKX" },
        { symbol: "ARB", active: true, momentum: "medium", confidence: 63, exchange: "Both" },
        { symbol: "OP", active: true, momentum: "medium", confidence: 58, exchange: "OKX" },
      ]);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/public/market/scanner`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setScannerAssets(data.data.assets);
        }
      }
    } catch (error) {
      console.error("Failed to fetch scanner:", error);
    }
  }, []);

  // Update chart data when period changes
  useEffect(() => {
    const historical = generateHistoricalData(parseInt(chartPeriod, 10));
    setPerformanceData({
      labels: historical.labels,
      pnl: historical.pnl,
      trades: historical.trades,
      winRate: historical.winRate,
    });
  }, [chartPeriod, generateHistoricalData]);

  // Demo connection handlers (UI only)
  const connectAlpacaDemo = () => {
    setConnectingAlpaca(true);
    setTimeout(() => {
      setAlpacaConnected(true);
      setConnectingAlpaca(false);
      setShowAlpacaModal(false);
      setPaperTradeResult({
        success: true,
        message: "Alpaca connected in demo mode! Paper trading ready.",
        isSuccess: true,
      });
      setTimeout(() => setPaperTradeResult(null), 3000);
    }, 1000);
  };

  const connectOkxDemo = () => {
    setConnectingOkx(true);
    setTimeout(() => {
      setOkxConnected(true);
      setConnectingOkx(false);
      setShowOkxModal(false);
      setPaperTradeResult({
        success: true,
        message: "OKX connected in demo mode! Paper trading ready.",
        isSuccess: true,
      });
      setTimeout(() => setPaperTradeResult(null), 3000);
    }, 1000);
  };

  const disconnectAlpacaDemo = () => {
    setAlpacaConnected(false);
    setPaperTradeResult({
      success: true,
      message: "Alpaca disconnected.",
      isSuccess: true,
    });
    setTimeout(() => setPaperTradeResult(null), 2000);
  };

  const disconnectOkxDemo = () => {
    setOkxConnected(false);
    setPaperTradeResult({
      success: true,
      message: "OKX disconnected.",
      isSuccess: true,
    });
    setTimeout(() => setPaperTradeResult(null), 2000);
  };

  // Execute paper trade
  const executePaperTrade = () => {
    setTradeLoading(true);
    setPaperTradeResult(null);
    
    setTimeout(() => {
      const randomReturn = (Math.random() * 12 - 3).toFixed(1);
      const isWin = parseFloat(randomReturn) > 0;
      const exchange = paperTradeConfig.selected_exchange === "alpaca" ? "Alpaca" : "OKX";
      
      setPaperTradeResult({
        success: true,
        returnPercent: randomReturn,
        isWin: isWin,
        message: `Paper trade executed on ${exchange} with ${isWin ? 'gain' : 'loss'} of ${Math.abs(randomReturn)}%`,
        exchange: exchange,
      });
      setTradeLoading(false);
      
      // Refresh trades list with new demo trade
      const newTrade = {
        asset: paperTradeConfig.asset_universe === "btc_eth" ? "BTC" : "SOL",
        type: Math.random() > 0.5 ? "BUY" : "SELL",
        returnPercent: parseFloat(randomReturn),
        entryPrice: marketData.btc?.price || 65000,
        exitPrice: (marketData.btc?.price || 65000) * (1 + parseFloat(randomReturn) / 100),
        confidence: Math.floor(Math.random() * 30) + 60,
        exchange: exchange,
      };
      setRecentTrades(prev => [newTrade, ...prev.slice(0, 4)]);
    }, 1500);
  };

  // Chart Configurations
  const pnlChartData = {
    labels: performanceData.labels,
    datasets: [{
      label: "Cumulative P&L ($)",
      data: performanceData.pnl,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointBackgroundColor: "rgb(16, 185, 129)",
    }],
  };

  const tradesChartData = {
    labels: performanceData.labels,
    datasets: [{
      label: "Daily Trades",
      data: performanceData.trades,
      borderColor: "rgb(59, 130, 246)",
      backgroundColor: "rgba(59, 130, 246, 0.5)",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
    }],
  };

  const winRateChartData = {
    labels: performanceData.labels,
    datasets: [{
      label: "Win Rate (%)",
      data: performanceData.winRate,
      borderColor: "rgb(139, 92, 246)",
      backgroundColor: "rgba(139, 92, 246, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointBackgroundColor: "rgb(139, 92, 246)",
    }],
  };

  const distributionChartData = {
    labels: distributionData.labels,
    datasets: [{
      label: "Trading Distribution",
      data: distributionData.values,
      backgroundColor: [
        "rgba(16, 185, 129, 0.8)",
        "rgba(59, 130, 246, 0.8)",
        "rgba(139, 92, 246, 0.8)",
        "rgba(245, 158, 11, 0.8)",
        "rgba(239, 68, 68, 0.8)",
        "rgba(107, 114, 128, 0.8)",
      ],
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: "rgba(255,255,255,0.7)", font: { size: 11 } } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "rgba(255,255,255,0.5)", maxRotation: 45 }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "rgba(255,255,255,0.5)" }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top", labels: { color: "rgba(255,255,255,0.7)" } } },
    scales: {
      x: { ticks: { color: "rgba(255,255,255,0.5)" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "rgba(255,255,255,0.5)" }, grid: { color: "rgba(255,255,255,0.05)" } },
    },
  };

  useEffect(() => {
    fetchMarketData();
    fetchRecentTrades();
    fetchScannerAssets();
    setPageLoading(false);
  }, [fetchMarketData, fetchRecentTrades, fetchScannerAssets]);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* HERO SECTION - Same as before, keeping it concise */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-14">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <img src={logo} alt="IMALI Enterprise" className="h-20 w-auto object-contain" />
              <div>
                <div className="text-2xl font-extrabold tracking-wide">
                  IMALI <span className="text-emerald-400">ENTERPRISE</span>
                </div>
                <div className="text-slate-400 text-sm">Enterprise Demo Environment</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <FaBuilding /> Prepared for Institutional Partners
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-6">
              White-Label Trading <span className="text-emerald-400">Infrastructure</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-8">
              Deploy fully branded trading platforms with multi-bot automation, 
              subscriber management, exchange integrations, and enterprise-grade 
              analytics — all under your own brand.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Link to="/signup" className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                Schedule Partner Demo <FaArrowRight />
              </Link>
              <button onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition">
                Explore Demo Environment
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                <div className={card}><FaRobot className="text-3xl text-emerald-300" /><div className="mt-4 text-xl font-bold">Multi-Bot Trading</div><div className="text-sm text-slate-400 mt-2">Deploy multiple automated strategies.</div></div>
                <div className={card}><FaPalette className="text-3xl text-cyan-300" /><div className="mt-4 text-xl font-bold">White-Label</div><div className="text-sm text-slate-400 mt-2">Fully branded for your business.</div></div>
                <div className={card}><FaUsers className="text-3xl text-purple-300" /><div className="mt-4 text-xl font-bold">Subscriber Management</div><div className="text-sm text-slate-400 mt-2">Onboard users and manage tiers.</div></div>
                <div className={card}><FaExchangeAlt className="text-3xl text-yellow-300" /><div className="mt-4 text-xl font-bold">Exchange Ready</div><div className="text-sm text-slate-400 mt-2">OKX, Binance, Alpaca, and more.</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API CONNECTION SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold flex items-center justify-center gap-2"><FaPlug /> Connect Your Exchange</h2>
            <p className="text-slate-400 text-sm mt-1">Connect to Alpaca or OKX for live paper trading {DEMO_MODE && "(Demo Mode - UI Only)"}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`rounded-xl border p-5 ${alpacaConnected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><span className="text-blue-400 font-bold">A</span></div>
                  <div><h3 className="font-bold">Alpaca</h3><p className="text-xs text-slate-400">US Stocks & Crypto</p></div>
                </div>
                {alpacaConnected ? (
                  <button onClick={disconnectAlpacaDemo} className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30"><FaUnlink className="text-xs" /> Disconnect</button>
                ) : (
                  <button onClick={() => setShowAlpacaModal(true)} className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30"><FaPlug className="text-xs" /> Connect</button>
                )}
              </div>
              {alpacaConnected && <div className="flex items-center gap-2 text-xs text-emerald-400 mt-2"><FaCheck /> Connected ({alpacaMode === "paper" ? "Paper Trading" : "Live"})</div>}
            </div>
            <div className={`rounded-xl border p-5 ${okxConnected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center"><span className="text-purple-400 font-bold">O</span></div>
                  <div><h3 className="font-bold">OKX</h3><p className="text-xs text-slate-400">Crypto Futures & Spot</p></div>
                </div>
                {okxConnected ? (
                  <button onClick={disconnectOkxDemo} className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full hover:bg-red-500/30"><FaUnlink className="text-xs" /> Disconnect</button>
                ) : (
                  <button onClick={() => setShowOkxModal(true)} className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/30"><FaPlug className="text-xs" /> Connect</button>
                )}
              </div>
              {okxConnected && <div className="flex items-center gap-2 text-xs text-emerald-400 mt-2"><FaCheck /> Connected ({okxMode === "paper" ? "Paper Trading" : "Live"})</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ENTERPRISE FEATURES */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold">Built For Trading Firms & Fintech Operators</h2>
          <p className="mt-4 text-slate-400">Everything you need to launch a branded trading automation platform.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <FaPalette />, title: "White-Label Deployment", desc: "Fully customizable branding, domain, and UI." },
            { icon: <FaRobot />, title: "Multi-Bot Infrastructure", desc: "Deploy unlimited bots with configurable strategies." },
            { icon: <FaUsers />, title: "Subscriber Management", desc: "Tiered access, user onboarding, and analytics." },
            { icon: <FaExchangeAlt />, title: "Exchange Integrations", desc: "OKX, Binance, Alpaca, and more." },
            { icon: <FaSlidersH />, title: "Strategy Configuration", desc: "Asset filters, position limits, and risk controls." },
            { icon: <FaChartLine />, title: "Analytics Dashboards", desc: "Real-time performance tracking and reporting." },
            { icon: <FaLock />, title: "Risk Management", desc: "Exposure limits, drawdown protection." },
            { icon: <FaDatabase />, title: "Paper & Live Environments", desc: "Test strategies risk-free." },
            { icon: <FaCog />, title: "Multi-User Admin", desc: "Team accounts and role-based access." },
          ].map((feature) => (
            <div key={feature.title} className={card}>
              <div className="text-3xl text-emerald-400">{feature.icon}</div>
              <h3 className="text-xl font-bold mt-4">{feature.title}</h3>
              <p className="text-slate-400 mt-2 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DEMO SECTION */}
      <section id="demo-section" className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300 mb-4"><FaBolt /> Interactive Demo Environment</div>
            <h2 className="text-4xl font-extrabold">Experience The Infrastructure</h2>
            <p className="mt-3 text-slate-400">Real market data feeds • Simulated execution • Advanced Analytics</p>
          </div>

          {/* Demo Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 border-b border-white/10 pb-3">
            {[
              { id: "simulator", label: "💰 Paper Trading", icon: "🎮" },
              { id: "scanner", label: "📡 Market Scanner", icon: "📡" },
              { id: "analytics", label: "📊 Analytics & Charts", icon: "📊" },
              { id: "trades", label: "📋 Trade Examples", icon: "📋" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveDemoTab(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
                  activeDemoTab === tab.id ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 min-h-[500px]">
            
            {/* Paper Trading Simulator */}
            {activeDemoTab === "simulator" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><FaRobot /> Strategy Configurator</h3>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Exchange</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={paperTradeConfig.selected_exchange}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, selected_exchange: e.target.value })}>
                        <option value="alpaca">Alpaca (US Stocks & Crypto)</option>
                        <option value="okx">OKX (Crypto Futures)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Asset Universe</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={paperTradeConfig.asset_universe}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, asset_universe: e.target.value })}>
                        <option value="btc_eth">BTC + ETH only</option>
                        <option value="top10">Top 10 market cap</option>
                        <option value="stocks">US Stocks (Alpaca)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Strategy Type</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={paperTradeConfig.strategy_type}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, strategy_type: e.target.value })}>
                        <option value="momentum">Momentum Scanner</option>
                        <option value="mean_reversion">Mean Reversion</option>
                        <option value="trend">Trend Following</option>
                      </select>
                    </div>
                    <button onClick={executePaperTrade} disabled={tradeLoading}
                      className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 transition disabled:opacity-50">
                      {tradeLoading ? <FaSpinner className="inline animate-spin mr-2" /> : null}
                      Execute Paper Trade →
                    </button>
                    {paperTradeResult && (
                      <div className={`mt-3 p-3 rounded-lg text-center text-sm ${paperTradeResult.isWin ? 'bg-green-500/20 text-green-300' : paperTradeResult.isError ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {paperTradeResult.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2"><FaChartLine /> Live Market Feed</h3>
                  <div className="space-y-3 mt-4">
                    {Object.entries(marketData).map(([symbol, data]) => (
                      <div key={symbol} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div><span className="font-bold uppercase">{symbol}</span></div>
                        <div className="text-right">
                          <div className="font-mono font-bold">${formatPrice(data.price)}</div>
                          <div className={`text-xs ${data.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {data.change >= 0 ? "+" : ""}{formatPercent(data.change)}%
                          </div>
                        </div>
                        <div><div className="text-xs text-slate-400">AI Score</div><div className="font-mono text-sm">{data.confidence}%</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Market Scanner */}
            {activeDemoTab === "scanner" && (
              <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4"><FaEye /> Asset Monitor</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {scannerAssets.slice(0, 16).map((asset) => (
                    <div key={asset.symbol} className="flex justify-between items-center p-2 rounded bg-white/5">
                      <span className="font-medium">{asset.symbol}</span>
                      <div className="flex items-center gap-1">
                        {asset.momentum === "high" && <span className="text-emerald-400 text-xs">🔥</span>}
                        <span className={`text-xs ${asset.active ? 'text-emerald-400' : 'text-slate-500'}`}>{asset.active ? 'Active' : 'Watch'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid md:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                    <div className="text-2xl">🔥</div><div className="font-bold text-emerald-300">High Momentum</div>
                    <div className="text-xs">{scannerAssets.filter(a => a.momentum === "high").slice(0, 3).map(a => a.symbol).join(", ")}</div>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                    <div className="text-2xl">🤖</div><div className="font-bold text-purple-300">AI Opportunity Score</div>
                    <div className="text-xs">Ranked by confidence</div>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <div className="text-2xl">📊</div><div className="font-bold text-blue-300">Exchange Coverage</div>
                    <div className="text-xs">Alpaca: Stocks • OKX: Crypto</div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics & Charts */}
            {activeDemoTab === "analytics" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-2">
                    {[
                      { value: "7", label: "7D" },
                      { value: "30", label: "30D" },
                      { value: "90", label: "90D" },
                    ].map((period) => (
                      <button key={period.value} onClick={() => setChartPeriod(period.value)}
                        className={`px-3 py-1 rounded-lg text-sm transition ${
                          chartPeriod === period.value ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}>
                        {period.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[
                      { id: "performance", label: "Performance" },
                      { id: "trades", label: "Trades" },
                      { id: "winrate", label: "Win Rate" },
                      { id: "distribution", label: "Distribution" },
                    ].map((tab) => (
                      <button key={tab.id} onClick={() => setActiveChartTab(tab.id)}
                        className={`px-3 py-1 rounded-lg text-xs transition ${
                          activeChartTab === tab.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <div className="h-80">
                    {activeChartTab === "performance" && <Line data={pnlChartData} options={chartOptions} />}
                    {activeChartTab === "trades" && <Bar data={tradesChartData} options={barChartOptions} />}
                    {activeChartTab === "winrate" && <Line data={winRateChartData} options={chartOptions} />}
                    {activeChartTab === "distribution" && <Bar data={distributionChartData} options={barChartOptions} />}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">+{formatPrice(performanceData.pnl[performanceData.pnl.length - 1])}</div>
                    <div className="text-xs text-slate-400">Total P&L (USD)</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">{performanceData.trades.reduce((a, b) => a + b, 0) || 0}</div>
                    <div className="text-xs text-slate-400">Total Trades</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">{performanceData.winRate[performanceData.winRate.length - 1] || 0}%</div>
                    <div className="text-xs text-slate-400">Win Rate</div>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-400">2.3</div>
                    <div className="text-xs text-slate-400">Sharpe Ratio</div>
                  </div>
                </div>
              </div>
            )}

            {/* Trade Examples */}
            {activeDemoTab === "trades" && (
              <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4"><FaFileAlt /> Recent Strategy Performance</h3>
                <div className="space-y-2">
                  {recentTrades.map((trade, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-white/5 flex-wrap gap-2">
                      <div>
                        <span className="font-bold">{trade.asset}/USD</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${trade.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{trade.type}</span>
                        <span className="ml-2 text-xs text-slate-500">{trade.exchange}</span>
                      </div>
                      <div className={`font-bold ${trade.returnPercent > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.returnPercent > 0 ? "+" : ""}{formatPercent(trade.returnPercent)}%
                      </div>
                      <div className="text-xs text-slate-400 hidden md:block">
                        Entry: ${formatPrice(trade.entryPrice)} → Exit: ${formatPrice(trade.exitPrice)}
                      </div>
                      <div className="text-xs text-slate-500">Score: {trade.confidence}%</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">Example trades for demonstration. Past results do not guarantee future returns.</p>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium transition">
              Schedule Technical Walkthrough <FaArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLIANCE DISCLAIMER */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm mb-2"><FaInfoCircle /><span className="font-semibold">Important Information</span></div>
          <p className="text-xs text-slate-400 leading-relaxed">IMALI provides automation infrastructure and analytics tools. Nothing on this platform constitutes financial advice or guaranteed returns. Trading involves substantial risk of loss. Past performance does not guarantee future results.</p>
        </div>
      </section>

      <div className="text-center text-xs text-white/30 pb-10 px-4">IMALI Enterprise • White-Label Trading Infrastructure • AI Automation • Multi-Bot Deployment</div>

      {/* Modals */}
      {showAlpacaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h3 className="text-xl font-bold mb-4">Connect to Alpaca {DEMO_MODE && "(Demo Mode)"}</h3>
            {connectionError && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{connectionError}</div>}
            <div className="space-y-4">
              <input type="text" placeholder="API Key (any value in demo)" value={alpacaApiKey} onChange={(e) => setAlpacaApiKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white" />
              <input type="password" placeholder="Secret Key (any value in demo)" value={alpacaSecretKey} onChange={(e) => setAlpacaSecretKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white" />
              <button onClick={connectAlpacaDemo} disabled={connectingAlpaca} className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500">
                {connectingAlpaca ? <FaSpinner className="inline animate-spin mr-2" /> : null} Connect (Demo)
              </button>
              <button onClick={() => { setShowAlpacaModal(false); setConnectionError(null); }} className="w-full rounded-lg border border-white/10 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showOkxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h3 className="text-xl font-bold mb-4">Connect to OKX {DEMO_MODE && "(Demo Mode)"}</h3>
            {connectionError && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{connectionError}</div>}
            <div className="space-y-4">
              <input type="text" placeholder="API Key (any value in demo)" value={okxApiKey} onChange={(e) => setOkxApiKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white" />
              <input type="password" placeholder="Secret Key (any value in demo)" value={okxSecretKey} onChange={(e) => setOkxSecretKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white" />
              <input type="password" placeholder="Passphrase (any value in demo)" value={okxPassphrase} onChange={(e) => setOkxPassphrase(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white" />
              <button onClick={connectOkxDemo} disabled={connectingOkx} className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500">
                {connectingOkx ? <FaSpinner className="inline animate-spin mr-2" /> : null} Connect (Demo)
              </button>
              <button onClick={() => { setShowOkxModal(false); setConnectionError(null); }} className="w-full rounded-lg border border-white/10 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
