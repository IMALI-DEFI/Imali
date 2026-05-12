// src/pages/Enterprise.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/imali-logo.png";

import {
  FaRobot,
  FaChartLine,
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
  FaSignal,
} from "react-icons/fa";

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://api.imali-defi.com";

export default function Enterprise() {
  const [activeDemoTab, setActiveDemoTab] = useState("simulator");
  const [liveMode, setLiveMode] = useState(true);
  const [loading, setLoading] = useState(false);

  const [marketData, setMarketData] = useState(fallbackMarketData);
  const [scannerAssets, setScannerAssets] = useState(fallbackScannerAssets);

  const [paperResult, setPaperResult] = useState(null);

  const [strategyConfig, setStrategyConfig] = useState({
    strategy: "momentum",
    maxPositions: 5,
    risk: 2,
  });

  const card =
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6";

  /* =========================================
     FETCH MARKET DATA
  ========================================= */

  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/public/market/prices`
      );

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();

      if (data?.data) {
        setMarketData({
          btc: {
            price: data.data.btc?.price || 71234,
            change: data.data.btc?.change_24h || 2.4,
            confidence: 87,
          },
          eth: {
            price: data.data.eth?.price || 3821,
            change: data.data.eth?.change_24h || 1.8,
            confidence: 72,
          },
          sol: {
            price: data.data.sol?.price || 168,
            change: data.data.sol?.change_24h || 5.2,
            confidence: 91,
          },
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* =========================================
     AUTO REFRESH
  ========================================= */

  useEffect(() => {
    fetchMarketData();

    if (!liveMode) return;

    const interval = setInterval(() => {
      fetchMarketData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchMarketData, liveMode]);

  /* =========================================
     PAPER TRADE
  ========================================= */

  const runPaperTrade = () => {
    setLoading(true);
    setPaperResult(null);

    setTimeout(() => {
      const pnl = (Math.random() * 10 - 2).toFixed(1);

      setPaperResult({
        success: Number(pnl) >= 0,
        pnl,
      });

      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-16">

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
                  IMALI ENTERPRISE
                </div>

                <div className="text-slate-400 text-sm">
                  White-Label Trading Infrastructure
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <FaBuilding />
              Enterprise Trading Automation Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mt-6">
              White-Label Trading
              <span className="text-emerald-400">
                {" "}Infrastructure
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-300 leading-8">
              Deploy branded trading platforms with multi-bot automation,
              subscriber management, exchange integrations,
              and enterprise-grade analytics.
            </p>

            <p className="mt-4 text-slate-400 leading-7">
              Connected to OKX for crypto markets and Alpaca for
              stock and ETF trading infrastructure.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">

              {[
                "White-label deployment",
                "Multi-bot infrastructure",
                "Subscriber management",
                "Exchange integrations",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <FaCheckCircle className="text-emerald-400 text-xs" />
                  {item}
                </div>
              ))}

            </div>

            <div className="flex flex-wrap gap-4 mt-10">

              <Link
                to="/signup"
                className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition flex items-center gap-2"
              >
                Request Enterprise Access
                <FaArrowRight />
              </Link>

              <button
                onClick={() =>
                  document
                    .getElementById("demo-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
              >
                Explore Demo
              </button>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="relative">

            <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 backdrop-blur">

              <div className="grid grid-cols-2 gap-4">

                <div className={card}>
                  <FaRobot className="text-3xl text-emerald-300" />
                  <div className="mt-4 text-xl font-bold">
                    Multi-Bot Trading
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Deploy multiple automated strategies.
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
                    User Management
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Tiered access and onboarding.
                  </div>
                </div>

                <div className={card}>
                  <FaExchangeAlt className="text-3xl text-yellow-300" />
                  <div className="mt-4 text-xl font-bold">
                    Exchange Ready
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    OKX • Alpaca • Binance
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* INFRASTRUCTURE */}

      <section className="max-w-7xl mx-auto px-4 py-10">

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">

          <div className="text-center max-w-3xl mx-auto mb-10">

            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1 text-sm text-blue-300 mb-3">
              <FaServer />
              Enterprise Infrastructure
            </div>

            <h2 className="text-3xl font-extrabold">
              Production-Ready Stack
            </h2>

            <p className="mt-3 text-slate-400">
              Built for scale, security, and real-time automation
            </p>

          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="text-center">
              <FaServer className="mx-auto text-3xl text-emerald-400" />
              <h3 className="mt-3 font-semibold">Backend</h3>
              <p className="text-xs text-slate-400 mt-1">
                Node.js • Python • PostgreSQL
              </p>
            </div>

            <div className="text-center">
              <FaCloud className="mx-auto text-3xl text-blue-400" />
              <h3 className="mt-3 font-semibold">Infrastructure</h3>
              <p className="text-xs text-slate-400 mt-1">
                Cloud deployment ready
              </p>
            </div>

            <div className="text-center">
              <FaKey className="mx-auto text-3xl text-purple-400" />
              <h3 className="mt-3 font-semibold">Security</h3>
              <p className="text-xs text-slate-400 mt-1">
                Encryption • RBAC • Audit Logs
              </p>
            </div>

            <div className="text-center">
              <FaExchangeAlt className="mx-auto text-3xl text-yellow-400" />
              <h3 className="mt-3 font-semibold">Integrations</h3>
              <p className="text-xs text-slate-400 mt-1">
                REST APIs • Exchange connectors
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* DEMO */}

      <section
        id="demo-section"
        className="max-w-7xl mx-auto px-4 py-10"
      >

        <div className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-8">

          <div className="flex flex-wrap justify-between gap-4 items-center">

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300 mb-3">
                <FaBolt />
                Interactive Demo Environment
              </div>

              <h2 className="text-4xl font-extrabold">
                Experience The Platform
              </h2>

              <p className="mt-3 text-slate-400">
                Real market data • Simulated execution • Controlled demo environment
              </p>
            </div>

            {/* LIVE TOGGLE */}

            <div className="flex flex-col items-end">

              <div className="flex items-center gap-3">

                <FaSignal className="text-emerald-400" />

                <span className="text-sm text-slate-300">
                  Live Data
                </span>

                <button
                  onClick={() => setLiveMode(!liveMode)}
                  className={`w-14 h-7 rounded-full transition ${
                    liveMode ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`h-5 w-5 bg-white rounded-full transition transform ${
                      liveMode
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>

              </div>

              <p className="text-xs text-slate-500 mt-2">
                Refreshes every 15 seconds
              </p>

            </div>

          </div>

          {/* TABS */}

          <div className="flex flex-wrap justify-center gap-2 mt-10 border-b border-white/10 pb-3">

            {[
              {
                id: "simulator",
                label: "Paper Trading",
              },
              {
                id: "scanner",
                label: "Market Scanner",
              },
              {
                id: "analytics",
                label: "Trade Examples",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition ${
                  activeDemoTab === tab.id
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}

          </div>

          {/* TAB CONTENT */}

          <div className="mt-8 min-h-[420px]">

            {/* PAPER TRADING */}

            {activeDemoTab === "simulator" && (
              <div className="grid lg:grid-cols-2 gap-6">

                <div className="rounded-xl bg-black/40 border border-white/10 p-5">

                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaRobot />
                    Strategy Configurator
                  </h3>

                  <div className="space-y-4 mt-5">

                    <div>
                      <label className="text-sm text-slate-300 block mb-1">
                        Strategy
                      </label>

                      <select
                        className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm"
                        value={strategyConfig.strategy}
                        onChange={(e) =>
                          setStrategyConfig({
                            ...strategyConfig,
                            strategy: e.target.value,
                          })
                        }
                      >
                        <option value="momentum">
                          Momentum
                        </option>

                        <option value="mean_reversion">
                          Mean Reversion
                        </option>

                        <option value="volatility">
                          Volatility Breakout
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-slate-300 block mb-1">
                        Max Positions
                      </label>

                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={strategyConfig.maxPositions}
                        onChange={(e) =>
                          setStrategyConfig({
                            ...strategyConfig,
                            maxPositions: Number(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-slate-300 block mb-1">
                        Risk Per Trade ({strategyConfig.risk}%)
                      </label>

                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={strategyConfig.risk}
                        onChange={(e) =>
                          setStrategyConfig({
                            ...strategyConfig,
                            risk: Number(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <button
                      onClick={runPaperTrade}
                      disabled={loading}
                      className="w-full rounded-lg bg-emerald-600 py-3 font-medium hover:bg-emerald-500 transition disabled:opacity-50"
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin inline mr-2" />
                      ) : null}

                      {loading
                        ? "Executing..."
                        : "Run Paper Trade"}
                    </button>

                    {paperResult && (
                      <div
                        className={`rounded-lg p-3 text-sm ${
                          paperResult.success
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        Simulated trade completed with{" "}
                        {paperResult.success ? "gain" : "loss"} of{" "}
                        {Math.abs(paperResult.pnl)}%
                      </div>
                    )}

                  </div>

                </div>

                {/* LIVE MARKET */}

                <div className="rounded-xl bg-black/40 border border-white/10 p-5">

                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaChartLine />
                    Market Feed
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    Real-time market pricing
                  </p>

                  <div className="space-y-3 mt-5">

                    {Object.entries(marketData).map(
                      ([symbol, data]) => (
                        <div
                          key={symbol}
                          className="flex justify-between items-center p-3 rounded-lg bg-white/5"
                        >

                          <div>
                            <span className="font-bold uppercase">
                              {symbol}
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold">
                              ${data.price.toLocaleString()}
                            </div>

                            <div
                              className={`text-xs ${
                                data.change > 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {data.change > 0 ? "+" : ""}
                              {data.change}%
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-slate-400">
                              AI Score
                            </div>

                            <div className="font-mono text-sm">
                              {data.confidence}%
                            </div>
                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* SCANNER */}

            {activeDemoTab === "scanner" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                {scannerAssets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="rounded-xl border border-white/10 bg-white/5 p-5"
                  >

                    <div className="flex justify-between items-center">

                      <div className="font-bold">
                        {asset.symbol}
                      </div>

                      <div
                        className={`text-sm ${
                          asset.change > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {asset.change > 0 ? "+" : ""}
                        {asset.change}%
                      </div>

                    </div>

                    <div className="mt-3 text-2xl font-bold">
                      ${asset.price.toLocaleString()}
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-400">

                      <span>
                        Momentum: {asset.momentum}
                      </span>

                      <span>
                        AI: {asset.confidence}%
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}

            {/* ANALYTICS */}

            {activeDemoTab === "analytics" && (
              <div className="space-y-3">

                {fallbackTrades.map((trade, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap justify-between gap-4 items-center rounded-xl bg-white/5 border border-white/10 p-4"
                  >

                    <div>
                      <div className="font-bold">
                        {trade.asset}/USD
                      </div>

                      <div className="text-xs text-slate-400">
                        {trade.type}
                      </div>
                    </div>

                    <div className="text-emerald-400 font-bold">
                      +{trade.return}%
                    </div>

                    <div className="text-sm text-slate-400">
                      Entry: ${trade.entry}
                    </div>

                    <div className="text-sm text-slate-400">
                      Exit: ${trade.exit}
                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

      </section>

      {/* FAQ */}

      <section className="max-w-5xl mx-auto px-4 py-10">

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">

          <h3 className="text-2xl font-bold text-center mb-6">
            Common Enterprise Questions
          </h3>

          <div className="grid md:grid-cols-2 gap-4">

            {[
              "Can I onboard users?",
              "Can I fully brand the platform?",
              "Can I manage subscriptions?",
              "Can I configure risk controls?",
              "Can I limit traded assets?",
              "Can this scale to large user bases?",
              "Can I deploy quickly?",
              "Can I monitor analytics?",
            ].map((q) => (
              <div
                key={q}
                className="flex items-center gap-2 text-slate-300"
              >
                <FaCheckCircle className="text-emerald-400 text-sm" />
                {q}
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* CTA */}

      <section className="max-w-5xl mx-auto px-4 py-16">

        <div className="rounded-[36px] border border-indigo-500/20 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 p-10 text-center">

          <div className="text-6xl mb-5">
            🚀
          </div>

          <h2 className="text-4xl font-extrabold">
            Ready To Launch Your Platform?
          </h2>

          <p className="mt-5 text-slate-300 leading-8 max-w-3xl mx-auto">
            Multi-bot automation, enterprise analytics,
            subscriber management, and exchange integrations —
            deployed under your brand.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10">

            <Link
              to="/signup"
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold transition"
            >
              Request Enterprise Access
            </Link>

            <Link
              to="/trade-demo"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold transition"
            >
              Launch Interactive Demo
            </Link>

          </div>

        </div>

      </section>

      {/* DISCLAIMER */}

      <section className="max-w-4xl mx-auto px-4 pb-10">

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">

          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm mb-2">
            <FaInfoCircle />
            <span className="font-semibold">
              Important Information
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            IMALI provides automation infrastructure and analytics tools.
            Nothing on this platform constitutes financial advice or
            guaranteed returns. Trading involves risk.
          </p>

        </div>

      </section>

      {/* FOOTER */}

      <div className="text-center text-xs text-white/30 pb-10 px-4">
        IMALI Enterprise • White-Label Trading Infrastructure •
        Multi-Bot Deployment • OKX • Alpaca
      </div>

    </div>
  );
}

/* =========================================
   FALLBACK DATA
========================================= */

const fallbackMarketData = {
  btc: {
    price: 71234,
    change: 2.4,
    confidence: 87,
  },
  eth: {
    price: 3821,
    change: 1.8,
    confidence: 72,
  },
  sol: {
    price: 168,
    change: 5.2,
    confidence: 91,
  },
};

const fallbackScannerAssets = [
  {
    symbol: "BTC",
    price: 71234,
    change: 2.4,
    momentum: "High",
    confidence: 87,
  },
  {
    symbol: "ETH",
    price: 3821,
    change: 1.8,
    momentum: "Medium",
    confidence: 72,
  },
  {
    symbol: "SOL",
    price: 168,
    change: 5.2,
    momentum: "High",
    confidence: 91,
  },
  {
    symbol: "AVAX",
    price: 38,
    change: 3.2,
    momentum: "Medium",
    confidence: 68,
  },
  {
    symbol: "ARB",
    price: 1.12,
    change: -0.8,
    momentum: "Low",
    confidence: 55,
  },
  {
    symbol: "TSLA",
    price: 214,
    change: 1.4,
    momentum: "Medium",
    confidence: 63,
  },
];

const fallbackTrades = [
  {
    asset: "BTC",
    type: "BUY",
    return: 8.2,
    entry: "65,800",
    exit: "71,234",
  },
  {
    asset: "ETH",
    type: "BUY",
    return: 6.4,
    entry: "3,590",
    exit: "3,821",
  },
  {
    asset: "SOL",
    type: "SELL",
    return: 3.8,
    entry: "162",
    exit: "168",
  },
];