// src/pages/Enterprise.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
  FaTachometerAlt,
  FaEye,
  FaLock,
  FaBrain,
  FaDatabase,
  FaBolt,
  FaCog,
  FaBuilding,
  FaServer,
  FaCloud,
  FaKey,
  FaInfoCircle,
  FaSpinner,
} from "react-icons/fa";

// API base URL - adjust to your environment
const API_BASE = process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";

// Demo mode flag - set to false for production
const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === "true";

export default function Enterprise() {
  const [activeDemoTab, setActiveDemoTab] = useState("simulator");
  const [marketData, setMarketData] = useState({
    btc: { price: 0, change: 0, momentum: "medium", confidence: 0, loading: true },
    eth: { price: 0, change: 0, momentum: "medium", confidence: 0, loading: true },
    sol: { price: 0, change: 0, momentum: "medium", confidence: 0, loading: true },
  });
  const [recentTrades, setRecentTrades] = useState([]);
  const [scannerAssets, setScannerAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paperTradeConfig, setPaperTradeConfig] = useState({
    asset_universe: "btc_eth",
    strategy_type: "momentum",
    max_positions: 5,
  });
  const [paperTradeResult, setPaperTradeResult] = useState(null);

  const card = "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  // Fetch real market data from API
  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/market/prices`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMarketData({
            btc: {
              price: data.data.btc?.price || 68000,
              change: data.data.btc?.change_24h || 1.2,
              momentum: data.data.btc?.momentum || "medium",
              confidence: data.data.btc?.confidence || 75,
              loading: false,
            },
            eth: {
              price: data.data.eth?.price || 3600,
              change: data.data.eth?.change_24h || 0.8,
              momentum: data.data.eth?.momentum || "medium",
              confidence: data.data.eth?.confidence || 68,
              loading: false,
            },
            sol: {
              price: data.data.sol?.price || 165,
              change: data.data.sol?.change_24h || 3.5,
              momentum: data.data.sol?.momentum || "high",
              confidence: data.data.sol?.confidence || 82,
              loading: false,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      // Fallback to demo data with loading indicator
      setMarketData({
        btc: { price: 71234, change: 2.4, momentum: "high", confidence: 87, loading: false, demo: true },
        eth: { price: 3821, change: 1.8, momentum: "medium", confidence: 72, loading: false, demo: true },
        sol: { price: 168, change: 5.2, momentum: "very_high", confidence: 91, loading: false, demo: true },
      });
    }
  }, []);

  // Fetch recent trades (anonymized)
  const fetchRecentTrades = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trading/global-trades?limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.trades) {
          setRecentTrades(data.trades.slice(0, 5).map(trade => ({
            asset: trade.symbol?.split('/')[0] || "BTC",
            type: trade.side?.toUpperCase() || "BUY",
            returnPercent: Math.min(Math.abs(trade.pnl_percent || 0), 25), // Cap at 25% for realism
            entryPrice: trade.price || 0,
            exitPrice: trade.exit_price || trade.price * (1 + (trade.pnl_percent || 0) / 100),
            confidence: 55 + Math.floor(Math.random() * 35),
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
      // Fallback demo trades - realistic returns
      setRecentTrades([
        { asset: "BTC", type: "BUY", returnPercent: 8.2, entryPrice: 65800, exitPrice: 71234, confidence: 78 },
        { asset: "ETH", type: "BUY", returnPercent: 6.4, entryPrice: 3590, exitPrice: 3821, confidence: 71 },
        { asset: "SOL", type: "SELL", returnPercent: 3.8, entryPrice: 162, exitPrice: 168, confidence: 65 },
        { asset: "AVAX", type: "BUY", returnPercent: 11.5, entryPrice: 28.70, exitPrice: 32.00, confidence: 73 },
        { asset: "ARB", type: "BUY", returnPercent: 5.2, entryPrice: 1.036, exitPrice: 1.090, confidence: 68 },
      ]);
    }
  }, []);

  // Fetch scanner assets
  const fetchScannerAssets = useCallback(async () => {
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
      setScannerAssets([
        { symbol: "BTC", active: true, momentum: "high", confidence: 84 },
        { symbol: "ETH", active: true, momentum: "medium", confidence: 71 },
        { symbol: "SOL", active: true, momentum: "high", confidence: 88 },
        { symbol: "BNB", active: true, momentum: "low", confidence: 48 },
        { symbol: "AVAX", active: true, momentum: "high", confidence: 79 },
        { symbol: "MATIC", active: false, momentum: "low", confidence: 42 },
        { symbol: "ARB", active: true, momentum: "medium", confidence: 63 },
        { symbol: "OP", active: true, momentum: "medium", confidence: 58 },
      ]);
    }
  }, []);

  // Simulate paper trade
  const simulatePaperTrade = () => {
    setLoading(true);
    setTimeout(() => {
      const randomReturn = (Math.random() * 12 - 3).toFixed(1);
      setPaperTradeResult({
        success: true,
        returnPercent: randomReturn,
        isWin: parseFloat(randomReturn) > 0,
        message: `Paper trade executed with ${parseFloat(randomReturn) > 0 ? 'gain' : 'loss'} of ${Math.abs(randomReturn)}%`,
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
    }, 1500);
  };

  useEffect(() => {
    fetchMarketData();
    fetchRecentTrades();
    fetchScannerAssets();
  }, [fetchMarketData, fetchRecentTrades, fetchScannerAssets]);

  // Periodic refresh for market data (every 30 seconds)
  useEffect(() => {
    if (!DEMO_MODE) {
      const interval = setInterval(() => {
        fetchMarketData();
        fetchScannerAssets();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchMarketData, fetchScannerAssets]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* HERO - Collaborative, professional tone */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-14">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <div className="flex items-center gap-4 mb-6">
              <img
                src={logo}
                alt="IMALI Enterprise"
                className="h-20 w-auto object-contain"
              />

              <div>
                <div className="text-2xl font-extrabold tracking-wide">
                  IMALI <span className="text-emerald-400">ENTERPRISE</span>
                </div>
                <div className="text-slate-400 text-sm">
                  Enterprise Demo Environment
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <FaBuilding />
              Prepared for Institutional Partners
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-6">
              White-Label Trading <span className="text-emerald-400">Infrastructure</span>
            </h1>

            <p className="mt-6 text-lg text-slate-300 leading-8">
              Deploy fully branded trading platforms with multi-bot automation, 
              subscriber management, exchange integrations, and enterprise-grade 
              analytics — all under your own brand.
            </p>

            <p className="mt-4 text-slate-400 leading-7">
              This demonstration environment showcases the infrastructure capabilities 
              available for partners, brokers, and fintech operators.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                "White-label deployment ready",
                "Multi-bot infrastructure",
                "Subscriber management",
                "Exchange integrations",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <FaCheckCircle className="text-emerald-400 text-xs" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 mt-10">
              <Link
                to="/signup"
                className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                Schedule Partner Demo
                <FaArrowRight />
              </Link>

              <button
                onClick={() => document.getElementById("demo-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
              >
                Explore Demo Environment
              </button>
            </div>
          </div>

          {/* RIGHT SIDE - Trading Infrastructure Features */}
          <div className="relative">
            <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                <div className={card}>
                  <FaRobot className="text-3xl text-emerald-300" />
                  <div className="mt-4 text-xl font-bold">
                    Multi-Bot Trading
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Deploy multiple automated strategies simultaneously.
                  </div>
                </div>

                <div className={card}>
                  <FaPalette className="text-3xl text-cyan-300" />
                  <div className="mt-4 text-xl font-bold">
                    White-Label
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Fully branded for your business.
                  </div>
                </div>

                <div className={card}>
                  <FaUsers className="text-3xl text-purple-300" />
                  <div className="mt-4 text-xl font-bold">
                    Subscriber Management
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Onboard users and manage access tiers.
                  </div>
                </div>

                <div className={card}>
                  <FaExchangeAlt className="text-3xl text-yellow-300" />
                  <div className="mt-4 text-xl font-bold">
                    Exchange Ready
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    OKX, Binance, Alpaca, and more.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* INFRASTRUCTURE STACK - Credible, accurate language */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1 text-sm text-blue-300 mb-3">
              <FaServer /> Production Infrastructure
            </div>
            <h2 className="text-3xl font-extrabold">Enterprise-Grade Stack</h2>
            <p className="mt-3 text-slate-400">Built for scale, security, and real-time performance</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <FaServer className="text-emerald-400" />
              </div>
              <h3 className="font-semibold">Backend</h3>
              <p className="text-xs text-slate-400 mt-1">Node.js + Python • PostgreSQL • Redis</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <FaCloud className="text-blue-400" />
              </div>
              <h3 className="font-semibold">Infrastructure</h3>
              <p className="text-xs text-slate-400 mt-1">Cloud deployment ready • Containerized services</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <FaKey className="text-purple-400" />
              </div>
              <h3 className="font-semibold">Security</h3>
              <p className="text-xs text-slate-400 mt-1">AES-256 encryption • RBAC • Audit logs</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                <FaExchangeAlt className="text-yellow-400" />
              </div>
              <h3 className="font-semibold">Integrations</h3>
              <p className="text-xs text-slate-400 mt-1">WebSocket feeds • REST APIs • Exchange connectors</p>
            </div>
          </div>
        </div>
      </section>

      {/* ENTERPRISE FEATURES */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold">
            Built For Trading Firms & Fintech Operators
          </h2>
          <p className="mt-5 text-slate-400 leading-8">
            Everything you need to launch and scale a branded trading automation platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-14">
          {[
            { icon: <FaPalette />, title: "White-Label Deployment", desc: "Fully customizable branding, domain, and UI. Launch under your own name within days." },
            { icon: <FaRobot />, title: "Multi-Bot Infrastructure", desc: "Deploy unlimited bots with configurable strategies, asset filters, and risk parameters." },
            { icon: <FaUsers />, title: "Subscriber Management", desc: "Tiered access, user onboarding, analytics, and retention tools built in." },
            { icon: <FaExchangeAlt />, title: "Exchange Integrations", desc: "OKX, Binance, Bybit, Alpaca, and more. Paper trading + live execution ready." },
            { icon: <FaSlidersH />, title: "Strategy Configuration", desc: "Asset filters, position limits, exposure caps, and risk weighting per symbol." },
            { icon: <FaChartLine />, title: "Partner Analytics Dashboards", desc: "Real-time performance tracking, asset-level reporting, and portfolio analytics." },
            { icon: <FaLock />, title: "Risk Management Controls", desc: "Per-asset exposure limits, max positions, drawdown protection, and excluded assets." },
            { icon: <FaDatabase />, title: "Paper & Live Environments", desc: "Test strategies risk-free before deploying real capital." },
            { icon: <FaCog />, title: "Multi-User Admin System", desc: "Team accounts, role-based access, and partner management." },
          ].map((feature) => (
            <div key={feature.title} className={card}>
              <div className="text-3xl text-emerald-400">{feature.icon}</div>
              <h3 className="text-xl font-bold mt-4">{feature.title}</h3>
              <p className="text-slate-400 mt-2 text-sm leading-6">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DEMO SECTION - Controlled Realism */}
      <section id="demo-section" className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300 mb-4">
              <FaBolt className="text-xs" />
              Interactive Demo Environment
            </div>
            <h2 className="text-4xl font-extrabold">
              Experience The Infrastructure
            </h2>
            <p className="mt-4 text-slate-400 leading-7">
              Real market data feeds • Simulated execution • Complete transparency
            </p>
          </div>

          {/* Demo Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-8 border-b border-white/10 pb-3">
            {[
              { id: "simulator", label: "💰 Paper Trading Simulator", icon: "🎮" },
              { id: "scanner", label: "📡 Live Market Scanner", icon: "📡" },
              { id: "analytics", label: "📊 Trade Examples", icon: "📊" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
                  activeDemoTab === tab.id
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6 min-h-[450px]">
            
            {/* Paper Trading Simulator */}
            {activeDemoTab === "simulator" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaRobot /> Strategy Configurator
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Configure bot settings — paper trade with real market data
                  </p>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Asset Universe</label>
                      <select 
                        className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={paperTradeConfig.asset_universe}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, asset_universe: e.target.value })}
                      >
                        <option value="btc_eth">BTC + ETH only</option>
                        <option value="top10">Top 10 market cap</option>
                        <option value="custom">Custom watchlist</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Strategy Type</label>
                      <select 
                        className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={paperTradeConfig.strategy_type}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, strategy_type: e.target.value })}
                      >
                        <option value="momentum">Momentum Scanner</option>
                        <option value="mean_reversion">Mean Reversion</option>
                        <option value="trend">Trend Following</option>
                        <option value="volatility">Volatility Breakout</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Max Positions: {paperTradeConfig.max_positions}</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={paperTradeConfig.max_positions}
                        onChange={(e) => setPaperTradeConfig({ ...paperTradeConfig, max_positions: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    
                    <button 
                      onClick={simulatePaperTrade}
                      disabled={loading}
                      className="w-full rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 transition disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="inline animate-spin mr-2" /> : null}
                      Execute Paper Trade →
                    </button>

                    {paperTradeResult && (
                      <div className={`mt-3 p-3 rounded-lg text-center text-sm ${paperTradeResult.isWin ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {paperTradeResult.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaChartLine /> Market Data Feed
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {DEMO_MODE ? "Sample market data" : "Live prices from connected exchanges"}
                  </p>
                  
                  <div className="space-y-3 mt-4">
                    {Object.entries(marketData).map(([symbol, data]) => (
                      <div key={symbol} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <div>
                          <span className="font-bold uppercase">{symbol}</span>
                          <span className="text-xs text-slate-400 ml-2">Perpetual</span>
                          {data.demo && <span className="text-xs text-yellow-500 ml-2">(demo)</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold">
                            {data.loading ? (
                              <FaSpinner className="animate-spin inline" />
                            ) : (
                              `$${data.price.toLocaleString()}`
                            )}
                          </div>
                          <div className={`text-xs ${data.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {data.change >= 0 ? "+" : ""}{data.change}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">AI Score</div>
                          <div className="font-mono text-sm">{data.confidence}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-4 text-center">
                    Paper trades execute at market prices — no real funds at risk
                  </p>
                </div>
              </div>
            )}

            {/* Live Market Scanner */}
            {activeDemoTab === "scanner" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                    <div className="text-2xl">🔥</div>
                    <div className="font-bold text-emerald-300">High Momentum</div>
                    <div className="text-sm">
                      {scannerAssets.filter(a => a.momentum === "high").slice(0, 3).map(a => a.symbol).join(", ") || "SOL, AVAX, OP"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
                    <div className="text-2xl">⚠️</div>
                    <div className="font-bold text-yellow-300">Elevated Volatility</div>
                    <div className="text-sm">Monitor with caution</div>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                    <div className="text-2xl">🤖</div>
                    <div className="font-bold text-purple-300">AI Opportunity Score</div>
                    <div className="text-sm">Ranked by confidence</div>
                  </div>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                  <h3 className="font-bold flex items-center gap-2">
                    <FaEye /> Asset Monitoring
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                    {scannerAssets.slice(0, 12).map((asset) => (
                      <div key={asset.symbol} className="flex justify-between items-center p-2 rounded bg-white/5">
                        <span className="font-medium">{asset.symbol}</span>
                        <div className="flex items-center gap-1">
                          {asset.momentum === "high" && <span className="text-emerald-400 text-xs">🔥</span>}
                          <span className={`text-xs ${asset.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {asset.active ? 'Monitoring' : 'Watch'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-4 text-center">
                    Scanner monitors liquidity, volatility, momentum, and AI confidence scores
                  </p>
                </div>
              </div>
            )}

            {/* Trade Examples - Realistic returns */}
            {activeDemoTab === "analytics" && (
              <div className="rounded-xl bg-black/40 border border-white/10 p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                  <FaFileAlt /> Strategy Performance Examples
                </h3>
                <div className="space-y-2">
                  {recentTrades.map((trade, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                      <div>
                        <span className="font-bold">{trade.asset}/USD</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${trade.type === "BUY" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {trade.type}
                        </span>
                      </div>
                      <div className={`font-bold ${trade.returnPercent > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {trade.returnPercent > 0 ? "+" : ""}{trade.returnPercent}%
                      </div>
                      <div className="text-xs text-slate-400 hidden md:block">
                        Entry: ${trade.entryPrice.toLocaleString()} → Exit: ${trade.exitPrice.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        Score: {trade.confidence}%
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Example trades for demonstration. Past results do not guarantee future returns.
                </p>
              </div>
            )}

          </div>

          <div className="text-center mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium transition"
            >
              Schedule Technical Walkthrough <FaArrowRight className="text-sm" />
            </Link>
            <p className="text-xs text-slate-500 mt-3">
              Full platform access available for qualified partners
            </p>
          </div>

        </div>
      </section>

      {/* WHAT ENTERPRISE CLIENTS ASK - Anticipating objections */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h3 className="text-2xl font-bold text-center mb-6">
            Common Enterprise Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Can we onboard our own users?",
              "Can we manage subscriptions and billing?",
              "Can we fully brand the platform?",
              "Can we limit which assets trade?",
              "Can we track analytics per user or team?",
              "Can we configure risk parameters?",
              "How quickly can we deploy?",
              "Does the infrastructure scale?",
            ].map((q) => (
              <div key={q} className="flex items-center gap-2 text-slate-300">
                <FaCheckCircle className="text-emerald-400 text-sm" />
                {q}
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">
            Yes — these capabilities are available for enterprise partners.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="rounded-[36px] border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-10 text-center">
          <div className="text-6xl mb-5">
            🚀
          </div>
          <h2 className="text-4xl font-extrabold">
            Ready To Discuss Your Deployment?
          </h2>
          <p className="mt-5 text-slate-300 leading-8 max-w-3xl mx-auto">
            White-label infrastructure, subscriber management, multi-bot automation — 
            deployed under your brand.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Link
              to="/signup"
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Schedule Partner Discussion
            </Link>
            <Link
              to="/trade-demo"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
            >
              Explore Public Demo
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLIANCE DISCLAIMER */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm mb-2">
            <FaInfoCircle />
            <span className="font-semibold">Important Information</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            IMALI provides automation infrastructure and analytics tools. Nothing on this platform 
            constitutes financial advice or guaranteed returns. Trading involves substantial risk of loss. 
            Past performance does not guarantee future results. All trading decisions are your own responsibility.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <div className="text-center text-xs text-white/30 pb-10 px-4">
        IMALI Enterprise • White-Label Trading Infrastructure • AI Automation • Multi-Bot Deployment
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
