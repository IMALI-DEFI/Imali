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
  FaToggleOn,
  FaToggleOff,
  FaCloudDownloadAlt,
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

// Number formatting helpers
const formatPrice = (price) => {
  const num = Number(price || 0);
  return isNaN(num) ? "0" : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (percent) => {
  const num = Number(percent || 0);
  return isNaN(num) ? "0" : num.toFixed(1);
};

export default function Enterprise() {
  const [activeTab, setActiveTab] = useState("trading");
  const [chartView, setChartView] = useState("performance");
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Live/Simulated toggle - DEFAULT TO LIVE MODE
  const [isLive, setIsLive] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  
  // Market data
  const [marketData, setMarketData] = useState({
    btc: { price: 71234, change: 2.4, confidence: 87 },
    eth: { price: 3821, change: 1.8, confidence: 72 },
    sol: { price: 168, change: 5.2, confidence: 91 },
  });
  
  const [recentTrades, setRecentTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [tradeResult, setTradeResult] = useState(null);
  
  // Chart data
  const [chartData, setChartData] = useState({ labels: [], pnl: [], trades: [], winRate: [] });
  const [chartPeriod, setChartPeriod] = useState("30");
  const [assetDistribution] = useState({
    labels: ["BTC", "ETH", "SOL", "AVAX", "ARB", "Other"],
    values: [42, 23, 18, 9, 5, 3],
  });
  
  // Exchange connection state
  const [alpacaConnected, setAlpacaConnected] = useState(false);
  const [okxConnected, setOkxConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showAlpacaModal, setShowAlpacaModal] = useState(false);
  const [showOkxModal, setShowOkxModal] = useState(false);
  const [connError, setConnError] = useState(null);
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [okxKey, setOkxKey] = useState("");
  const [okxSecret, setOkxSecret] = useState("");
  const [okxPass, setOkxPass] = useState("");
  
  // Strategy config
  const [strategyConfig, setStrategyConfig] = useState({
    exchange: "alpaca",
    assets: "btc_eth",
    strategy: "momentum",
  });

  const cardStyle = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  // Generate chart data
  const generateChartData = useCallback((days = 30) => {
    const labels = [];
    const pnlData = [];
    const tradesData = [];
    const winRateData = [];
    let cumulative = 0;
    const daysNum = parseInt(days, 10);
    
    for (let i = daysNum; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const dailyPnl = (Math.random() * 200 - 50) + (i < 15 ? 20 : 0);
      cumulative += dailyPnl;
      pnlData.push(Math.round(cumulative * 100) / 100);
      tradesData.push(Math.floor(Math.random() * 15) + 3);
      winRateData.push(Math.floor(Math.random() * 30) + 45);
    }
    return { labels, pnl: pnlData, trades: tradesData, winRate: winRateData };
  }, []);

  // Fetch market prices
  const fetchPrices = useCallback(async () => {
    if (!isLive) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/public/market/prices`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setMarketData({
            btc: { price: data.data.btc?.price || 71234, change: data.data.btc?.change_24h || 2.4, confidence: 87 },
            eth: { price: data.data.eth?.price || 3821, change: data.data.eth?.change_24h || 1.8, confidence: 72 },
            sol: { price: data.data.sol?.price || 168, change: data.data.sol?.change_24h || 5.2, confidence: 91 },
          });
        }
      }
    } catch (err) {
      console.error("Price fetch failed:", err);
    }
  }, [isLive]);

  // Fetch watchlist
  const fetchWatchlist = useCallback(async () => {
    if (!isLive) {
      setWatchlist([
        { symbol: "BTC", price: 71234, change: 2.4, momentum: "High", confidence: 87 },
        { symbol: "ETH", price: 3821, change: 1.8, momentum: "Medium", confidence: 72 },
        { symbol: "SOL", price: 168, change: 5.2, momentum: "High", confidence: 91 },
        { symbol: "AVAX", price: 38, change: 3.2, momentum: "Medium", confidence: 68 },
        { symbol: "ARB", price: 1.12, change: -0.8, momentum: "Low", confidence: 55 },
      ]);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/public/market/scanner`);
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.assets) {
          setWatchlist(data.data.assets.slice(0, 10));
        }
      }
    } catch (err) {
      console.error("Watchlist fetch failed:", err);
    }
  }, [isLive]);

  // Fetch recent trades
  const fetchTrades = useCallback(async () => {
    if (!isLive) {
      setRecentTrades([
        { asset: "BTC", type: "BUY", returnPct: 8.2, entry: 65800, exit: 71234, confidence: 78, exchange: "Alpaca" },
        { asset: "ETH", type: "BUY", returnPct: 6.4, entry: 3590, exit: 3821, confidence: 71, exchange: "OKX" },
        { asset: "SOL", type: "SELL", returnPct: 3.8, entry: 162, exit: 168, confidence: 65, exchange: "Alpaca" },
        { asset: "AVAX", type: "BUY", returnPct: 11.5, entry: 28.70, exit: 32.00, confidence: 73, exchange: "OKX" },
      ]);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/trading/global-trades?limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (data?.trades) {
          setRecentTrades(data.trades.slice(0, 5).map(t => ({
            asset: t.symbol?.split('/')[0] || "BTC",
            type: t.side?.toUpperCase() || "BUY",
            returnPct: Math.min(Math.abs(t.pnl_percent || 0), 25),
            entry: t.price || 0,
            exit: t.exit_price || t.price || 0,
            confidence: 55 + Math.floor(Math.random() * 35),
            exchange: t.exchange || "unknown",
          })));
        }
      }
    } catch (err) {
      console.error("Trades fetch failed:", err);
    }
  }, [isLive]);

  // Check exchange connections
  const checkConnections = useCallback(async () => {
    if (!isLive) return;
    
    const token = localStorage.getItem("imali_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/integrations/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setAlpacaConnected(data.data.alpaca_connected);
          setOkxConnected(data.data.okx_connected);
        }
      } catch (err) {
        console.error("Connection check failed:", err);
      }
    }
  }, [isLive]);

  // Update charts when period or mode changes
  useEffect(() => {
    const data = generateChartData(parseInt(chartPeriod, 10));
    setChartData({
      labels: data.labels,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.winRate,
    });
  }, [chartPeriod, isLive, generateChartData]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchPrices(), fetchWatchlist(), fetchTrades()]);
      await checkConnections();
      setIsLoading(false);
    };
    load();
  }, [fetchPrices, fetchWatchlist, fetchTrades, checkConnections]);

  // Polling for live data (every 15 seconds, no WebSockets)
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      fetchPrices();
      fetchWatchlist();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [isLive, fetchPrices, fetchWatchlist]);

  // Toggle between live and simulated
  const toggleMode = async () => {
    setIsToggling(true);
    setIsLoading(true);
    
    const wasLive = isLive;
    setIsLive(!wasLive);
    
    if (wasLive) {
      setAlpacaConnected(false);
      setOkxConnected(false);
    }
    
    await Promise.all([fetchPrices(), fetchWatchlist(), fetchTrades()]);
    if (!wasLive) await checkConnections();
    
    setTimeout(() => {
      setIsLoading(false);
      setIsToggling(false);
      setTradeResult({
        success: true,
        message: `Switched to ${!wasLive ? "Live" : "Simulated"} Mode`,
      });
      setTimeout(() => setTradeResult(null), 3000);
    }, 500);
  };

  // Connect to Alpaca (demo or real)
  const connectAlpaca = async () => {
    if (!isLive) {
      setConnecting(true);
      setTimeout(() => {
        setAlpacaConnected(true);
        setConnecting(false);
        setShowAlpacaModal(false);
        setTradeResult({ success: true, message: "Alpaca connected (Demo Mode)" });
        setTimeout(() => setTradeResult(null), 3000);
      }, 1000);
      return;
    }
    
    if (!alpacaKey || !alpacaSecret) {
      setConnError("API Key and Secret Key required");
      return;
    }
    
    setConnecting(true);
    setConnError(null);
    
    try {
      const token = localStorage.getItem("imali_token");
      const res = await fetch(`${API_BASE}/api/integrations/alpaca`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ api_key: alpacaKey, secret_key: alpacaSecret, mode: "paper" }),
      });
      
      const data = await res.json();
      if (data.success) {
        setAlpacaConnected(true);
        setShowAlpacaModal(false);
        setAlpacaKey("");
        setAlpacaSecret("");
      } else {
        setConnError(data.error || "Connection failed");
      }
    } catch (err) {
      setConnError("Network error");
    } finally {
      setConnecting(false);
    }
  };

  // Connect to OKX
  const connectOkx = async () => {
    if (!isLive) {
      setConnecting(true);
      setTimeout(() => {
        setOkxConnected(true);
        setConnecting(false);
        setShowOkxModal(false);
        setTradeResult({ success: true, message: "OKX connected (Demo Mode)" });
        setTimeout(() => setTradeResult(null), 3000);
      }, 1000);
      return;
    }
    
    if (!okxKey || !okxSecret || !okxPass) {
      setConnError("API Key, Secret Key, and Passphrase required");
      return;
    }
    
    setConnecting(true);
    setConnError(null);
    
    try {
      const token = localStorage.getItem("imali_token");
      const res = await fetch(`${API_BASE}/api/integrations/okx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ api_key: okxKey, secret_key: okxSecret, passphrase: okxPass, mode: "paper" }),
      });
      
      const data = await res.json();
      if (data.success) {
        setOkxConnected(true);
        setShowOkxModal(false);
        setOkxKey("");
        setOkxSecret("");
        setOkxPass("");
      } else {
        setConnError(data.error || "Connection failed");
      }
    } catch (err) {
      setConnError("Network error");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAlpaca = () => setAlpacaConnected(false);
  const disconnectOkx = () => setOkxConnected(false);

  // Execute paper trade
  const executeTrade = () => {
    setIsExecuting(true);
    setTradeResult(null);
    
    setTimeout(() => {
      const pnl = (Math.random() * 12 - 3).toFixed(1);
      const isWin = parseFloat(pnl) > 0;
      const exchange = strategyConfig.exchange === "alpaca" ? "Alpaca" : "OKX";
      
      setTradeResult({
        success: true,
        isWin,
        pnl,
        message: `Trade executed on ${exchange} with ${isWin ? 'gain' : 'loss'} of ${Math.abs(pnl)}%`,
      });
      setIsExecuting(false);
      
      // Add to recent trades
      const newTrade = {
        asset: strategyConfig.assets === "btc_eth" ? "BTC" : "SOL",
        type: Math.random() > 0.5 ? "BUY" : "SELL",
        returnPct: parseFloat(pnl),
        entry: marketData.btc?.price || 65000,
        exit: (marketData.btc?.price || 65000) * (1 + parseFloat(pnl) / 100),
        confidence: Math.floor(Math.random() * 30) + 60,
        exchange,
      };
      setRecentTrades(prev => [newTrade, ...prev.slice(0, 4)]);
    }, 1500);
  };

  // Chart configurations
  const pnlChart = {
    labels: chartData.labels,
    datasets: [{ label: "Cumulative P&L ($)", data: chartData.pnl, borderColor: "rgb(16, 185, 129)", backgroundColor: "rgba(16, 185, 129, 0.1)", fill: true, tension: 0.4, pointRadius: 2 }],
  };

  const tradesChart = {
    labels: chartData.labels,
    datasets: [{ label: "Daily Trades", data: chartData.trades, borderColor: "rgb(59, 130, 246)", backgroundColor: "rgba(59, 130, 246, 0.5)", fill: true, tension: 0.4, pointRadius: 2 }],
  };

  const winRateChart = {
    labels: chartData.labels,
    datasets: [{ label: "Win Rate (%)", data: chartData.winRate, borderColor: "rgb(139, 92, 246)", backgroundColor: "rgba(139, 92, 246, 0.1)", fill: true, tension: 0.4, pointRadius: 2 }],
  };

  const distributionChart = {
    labels: assetDistribution.labels,
    datasets: [{ label: "Volume by Asset", data: assetDistribution.values, backgroundColor: ["rgba(16, 185, 129, 0.8)", "rgba(59, 130, 246, 0.8)", "rgba(139, 92, 246, 0.8)", "rgba(245, 158, 11, 0.8)", "rgba(239, 68, 68, 0.8)", "rgba(107, 114, 128, 0.8)"], borderRadius: 8 }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top", labels: { color: "rgba(255,255,255,0.7)" } } },
    scales: { x: { ticks: { color: "rgba(255,255,255,0.5)" }, grid: { color: "rgba(255,255,255,0.05)" } }, y: { ticks: { color: "rgba(255,255,255,0.5)" }, grid: { color: "rgba(255,255,255,0.05)" } } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-14">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <img src={logo} alt="IMALI" className="h-20 w-auto object-contain" />
              <div>
                <div className="text-2xl font-extrabold tracking-wide">IMALI <span className="text-emerald-400">ENTERPRISE</span></div>
                <div className="text-slate-400 text-sm">Trading Infrastructure Platform</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <FaBuilding /> Institutional Trading Automation
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-6">
              White-Label <span className="text-emerald-400">Trading Infrastructure</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-8">
              Deploy branded trading platforms with multi-bot automation, subscriber management, 
              exchange integrations, and enterprise-grade analytics.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Link to="/signup" className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition flex items-center gap-2">
                Request Access <FaArrowRight />
              </Link>
              <button onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition">
                Live Demo
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                <div className={cardStyle}><FaRobot className="text-3xl text-emerald-300" /><div className="mt-4 text-xl font-bold">Multi-Bot</div><div className="text-sm text-slate-400">Multiple strategies</div></div>
                <div className={cardStyle}><FaPalette className="text-3xl text-cyan-300" /><div className="mt-4 text-xl font-bold">White-Label</div><div className="text-sm text-slate-400">Your brand</div></div>
                <div className={cardStyle}><FaUsers className="text-3xl text-purple-300" /><div className="mt-4 text-xl font-bold">Subscribers</div><div className="text-sm text-slate-400">Tiered access</div></div>
                <div className={cardStyle}><FaExchangeAlt className="text-3xl text-yellow-300" /><div className="mt-4 text-xl font-bold">Exchanges</div><div className="text-sm text-slate-400">OKX • Alpaca</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODE TOGGLE */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isLive ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                {isLive ? <FaCloudDownloadAlt className="text-emerald-400 text-xl" /> : <FaRobot className="text-blue-400 text-xl" />}
              </div>
              <div>
                <div className="font-bold">{isLive ? "Live Mode" : "Demo Mode"}</div>
                <div className="text-xs text-slate-400">
                  {isLive ? "Real API data • Live prices" : "Simulated data • No API required"}
                </div>
              </div>
            </div>
            <button onClick={toggleMode} disabled={isToggling}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl font-medium transition-all ${
                isLive ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
              } disabled:opacity-50`}>
              {isToggling ? <FaSpinner className="animate-spin" /> : isLive ? <><FaToggleOff /> Demo Mode</> : <><FaToggleOn /> Live Mode</>}
            </button>
          </div>
          {isLive && <div className="mt-3 text-xs text-amber-400 flex items-center gap-2 border-t border-white/10 pt-3"><FaExclamationTriangle /> Live mode requires backend API on port 3000</div>}
        </div>
      </section>

      {/* EXCHANGE CONNECTIONS */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-6">
          <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2"><FaPlug /> Exchange Connections</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className={`rounded-xl border p-5 ${alpacaConnected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">A</div>
                  <div><h3 className="font-bold">Alpaca</h3><p className="text-xs text-slate-400">US Stocks & Crypto</p></div>
                </div>
                {alpacaConnected ? (
                  <button onClick={disconnectAlpaca} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full"><FaUnlink /> Disconnect</button>
                ) : (
                  <button onClick={() => setShowAlpacaModal(true)} className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full"><FaPlug /> Connect</button>
                )}
              </div>
              {alpacaConnected && <div className="mt-2 text-xs text-emerald-400"><FaCheck /> Connected (Paper Trading)</div>}
            </div>
            <div className={`rounded-xl border p-5 ${okxConnected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-400">O</div>
                  <div><h3 className="font-bold">OKX</h3><p className="text-xs text-slate-400">Crypto Futures</p></div>
                </div>
                {okxConnected ? (
                  <button onClick={disconnectOkx} className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full"><FaUnlink /> Disconnect</button>
                ) : (
                  <button onClick={() => setShowOkxModal(true)} className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full"><FaPlug /> Connect</button>
                )}
              </div>
              {okxConnected && <div className="mt-2 text-xs text-emerald-400"><FaCheck /> Connected (Paper Trading)</div>}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold">Enterprise Platform Features</h2>
          <p className="mt-3 text-slate-400">Everything you need to launch a branded trading platform</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <FaPalette />, title: "White-Label", desc: "Fully customizable branding" },
            { icon: <FaRobot />, title: "Multi-Bot", desc: "Unlimited strategies" },
            { icon: <FaUsers />, title: "Subscriber Management", desc: "Tiered access" },
            { icon: <FaExchangeAlt />, title: "Exchange Integrations", desc: "OKX, Alpaca, Binance" },
            { icon: <FaSlidersH />, title: "Risk Controls", desc: "Position limits & exposure caps" },
            { icon: <FaChartLine />, title: "Analytics", desc: "Real-time performance tracking" },
          ].map((feature) => (
            <div key={feature.title} className={cardStyle}>
              <div className="text-3xl text-emerald-400">{feature.icon}</div>
              <h3 className="text-xl font-bold mt-4">{feature.title}</h3>
              <p className="text-slate-400 mt-2 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DEMO */}
      <section id="demo-section" className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300 mb-3"><FaBolt /> {isLive ? "Live" : "Demo"} Environment</div>
            <h2 className="text-4xl font-bold">Trading Platform Demo</h2>
            <p className="mt-2 text-slate-400">{isLive ? "Real market data • Live API feeds" : "Simulated data • Instant execution"}</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 border-b border-white/10 pb-3">
            {[
              { id: "trading", label: "💰 Paper Trading" },
              { id: "watchlist", label: "📡 Watchlist" },
              { id: "analytics", label: "📊 Analytics" },
              { id: "history", label: "📋 Trade History" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.id ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-white/5"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 min-h-[450px]">
            
            {/* Paper Trading Tab */}
            {activeTab === "trading" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="font-bold mb-4">Strategy Configurator</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-300">Exchange</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 mt-1"
                        value={strategyConfig.exchange}
                        onChange={(e) => setStrategyConfig({ ...strategyConfig, exchange: e.target.value })}>
                        <option value="alpaca">Alpaca</option>
                        <option value="okx">OKX</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300">Assets</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 mt-1"
                        value={strategyConfig.assets}
                        onChange={(e) => setStrategyConfig({ ...strategyConfig, assets: e.target.value })}>
                        <option value="btc_eth">BTC + ETH</option>
                        <option value="top10">Top 10 Market Cap</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300">Strategy</label>
                      <select className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 mt-1"
                        value={strategyConfig.strategy}
                        onChange={(e) => setStrategyConfig({ ...strategyConfig, strategy: e.target.value })}>
                        <option value="momentum">Momentum</option>
                        <option value="mean_reversion">Mean Reversion</option>
                        <option value="trend">Trend Following</option>
                      </select>
                    </div>
                    <button onClick={executeTrade} disabled={isExecuting}
                      className="w-full rounded-lg bg-emerald-600 py-3 font-medium hover:bg-emerald-500 transition">
                      {isExecuting ? <FaSpinner className="animate-spin inline mr-2" /> : null}
                      Execute Paper Trade
                    </button>
                    {tradeResult && (
                      <div className={`p-3 rounded-lg text-center ${tradeResult.isWin ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {tradeResult.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FaChartLine /> Market Prices {isLive && <span className="text-xs text-emerald-400">● LIVE</span>}</h3>
                  <div className="space-y-3">
                    {Object.entries(marketData).map(([symbol, data]) => (
                      <div key={symbol} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <span className="font-bold uppercase">{symbol}</span>
                        <div className="text-right">
                          <div className="font-mono">${formatPrice(data.price)}</div>
                          <div className={`text-xs ${data.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {data.change >= 0 ? "+" : ""}{formatPercent(data.change)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">AI Score</div>
                          <div>{data.confidence}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Watchlist Tab */}
            {activeTab === "watchlist" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlist.map((asset) => (
                  <div key={asset.symbol} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex justify-between">
                      <span className="font-bold">{asset.symbol}</span>
                      <span className={asset.change >= 0 ? "text-green-400" : "text-red-400"}>{asset.change >= 0 ? "+" : ""}{asset.change}%</span>
                    </div>
                    <div className="text-2xl font-bold mt-2">${formatPrice(asset.price)}</div>
                    <div className="flex justify-between text-xs text-slate-400 mt-3">
                      <span>Momentum: {asset.momentum || "Medium"}</span>
                      <span>Confidence: {asset.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="flex justify-between flex-wrap gap-2">
                  <div className="flex gap-2">
                    {["7", "30", "90"].map((p) => (
                      <button key={p} onClick={() => setChartPeriod(p)}
                        className={`px-3 py-1 rounded-lg text-sm ${chartPeriod === p ? "bg-emerald-600" : "bg-white/5"}`}>
                        {p}D
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {["performance", "trades", "winrate", "distribution"].map((v) => (
                      <button key={v} onClick={() => setChartView(v)}
                        className={`px-3 py-1 rounded-lg text-xs ${chartView === v ? "bg-white/10" : "text-slate-500"}`}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <div className="h-80">
                    {chartView === "performance" && <Line data={pnlChart} options={chartOptions} />}
                    {chartView === "trades" && <Bar data={tradesChart} options={chartOptions} />}
                    {chartView === "winrate" && <Line data={winRateChart} options={chartOptions} />}
                    {chartView === "distribution" && <Bar data={distributionChart} options={chartOptions} />}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/5 p-3 rounded-lg text-center"><div className="text-emerald-400 text-xl font-bold">+{formatPrice(chartData.pnl[chartData.pnl.length - 1])}</div><div className="text-xs text-slate-400">Total P&L</div></div>
                  <div className="bg-white/5 p-3 rounded-lg text-center"><div className="text-blue-400 text-xl font-bold">{chartData.trades.reduce((a, b) => a + b, 0)}</div><div className="text-xs text-slate-400">Total Trades</div></div>
                  <div className="bg-white/5 p-3 rounded-lg text-center"><div className="text-purple-400 text-xl font-bold">{chartData.winRate[chartData.winRate.length - 1] || 0}%</div><div className="text-xs text-slate-400">Win Rate</div></div>
                  <div className="bg-white/5 p-3 rounded-lg text-center"><div className="text-yellow-400 text-xl font-bold">2.3</div><div className="text-xs text-slate-400">Sharpe Ratio</div></div>
                </div>
              </div>
            )}

            {/* Trade History Tab */}
            {activeTab === "history" && (
              <div className="space-y-2">
                {recentTrades.map((trade, i) => (
                  <div key={i} className="flex flex-wrap justify-between items-center p-3 rounded-lg bg-white/5">
                    <div><span className="font-bold">{trade.asset}</span><span className={`ml-2 text-xs px-2 py-0.5 rounded ${trade.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{trade.type}</span></div>
                    <div className={trade.returnPct > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{trade.returnPct > 0 ? "+" : ""}{trade.returnPct}%</div>
                    <div className="text-xs text-slate-400">Entry: ${formatPrice(trade.entry)} → Exit: ${formatPrice(trade.exit)}</div>
                    <div className="text-xs text-slate-500">Score: {trade.confidence}%</div>
                  </div>
                ))}
                <p className="text-xs text-slate-500 text-center mt-4">Past performance does not guarantee future results.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ENTERPRISE QUESTIONS */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h3 className="text-2xl font-bold text-center mb-6">Enterprise FAQs</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {["Can we brand the platform?", "Can we manage subscribers?", "Can we set risk limits?", "Can we track analytics?", "How fast can we deploy?", "Does it scale?"].map((q) => (
              <div key={q} className="flex items-center gap-2 text-slate-300"><FaCheckCircle className="text-emerald-400 text-sm" />{q}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="rounded-[36px] border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-10 text-center">
          <h2 className="text-4xl font-bold">Ready to Launch?</h2>
          <p className="mt-4 text-slate-300">Multi-bot automation, analytics, and exchange integrations — deployed under your brand.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/signup" className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold">Request Access</Link>
            <Link to="/trade-demo" className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold">Launch Demo</Link>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
          <p className="text-xs text-slate-400">IMALI provides automation infrastructure. Nothing on this platform constitutes financial advice. Trading involves risk.</p>
        </div>
      </section>

      <div className="text-center text-xs text-white/30 pb-10">IMALI Enterprise • White-Label Trading Infrastructure</div>

      {/* Modals */}
      {showAlpacaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h3 className="text-xl font-bold mb-4">Connect Alpaca {!isLive && "(Demo)"}</h3>
            {connError && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{connError}</div>}
            <div className="space-y-4">
              <input type="text" placeholder="API Key" value={alpacaKey} onChange={(e) => setAlpacaKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2" />
              <input type="password" placeholder="Secret Key" value={alpacaSecret} onChange={(e) => setAlpacaSecret(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2" />
              <button onClick={connectAlpaca} disabled={connecting} className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500">
                {connecting ? <FaSpinner className="animate-spin inline mr-2" /> : null} Connect
              </button>
              <button onClick={() => { setShowAlpacaModal(false); setConnError(null); }} className="w-full rounded-lg border border-white/10 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showOkxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h3 className="text-xl font-bold mb-4">Connect OKX {!isLive && "(Demo)"}</h3>
            {connError && <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">{connError}</div>}
            <div className="space-y-4">
              <input type="text" placeholder="API Key" value={okxKey} onChange={(e) => setOkxKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2" />
              <input type="password" placeholder="Secret Key" value={okxSecret} onChange={(e) => setOkxSecret(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2" />
              <input type="password" placeholder="Passphrase" value={okxPass} onChange={(e) => setOkxPass(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2" />
              <button onClick={connectOkx} disabled={connecting} className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500">
                {connecting ? <FaSpinner className="animate-spin inline mr-2" /> : null} Connect
              </button>
              <button onClick={() => { setShowOkxModal(false); setConnError(null); }} className="w-full rounded-lg border border-white/10 py-2">Cancel</button>
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
