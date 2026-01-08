// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* -------------------------- Simple Configuration -------------------------- */
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
const API_BASE = isLocalhost ? "http://localhost:8001" : "https://api.imali-defi.com";

/* ------------------------------ Simple fetch helpers ------------------------------ */
async function postJson(url, body) {
  try {
    console.log("POST to:", url);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!r.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
    }

    return data;
  } catch (e) {
    console.error("POST failed:", e.message);
    throw e;
  }
}

/* ----------------------- Local Stocks Simulator ----------------------- */
function useStocksSimulator() {
  const [cash, setCash] = useState(10000);
  const [holdings, setHoldings] = useState({ AAPL: 0, MSFT: 0, NVDA: 0 });
  const [prices, setPrices] = useState({ AAPL: 150, MSFT: 300, NVDA: 500 });
  
  function simulateStockMove() {
    setPrices(prev => {
      const newPrices = { ...prev };
      Object.keys(newPrices).forEach(stock => {
        const change = (Math.random() - 0.5) * 0.02; // ±2% change
        newPrices[stock] = Math.max(10, prev[stock] * (1 + change));
      });
      return newPrices;
    });
  }
  
  function buyStock(stock, amount) {
    const cost = prices[stock] * amount;
    if (cash >= cost) {
      setCash(c => c - cost);
      setHoldings(h => ({ ...h, [stock]: (h[stock] || 0) + amount }));
      return true;
    }
    return false;
  }
  
  function sellStock(stock, amount) {
    if (holdings[stock] >= amount) {
      const revenue = prices[stock] * amount;
      setCash(c => c + revenue);
      setHoldings(h => ({ ...h, [stock]: h[stock] - amount }));
      return true;
    }
    return false;
  }
  
  const totalValue = cash + Object.entries(holdings).reduce((sum, [stock, qty]) => sum + (prices[stock] * qty), 0);
  
  return { cash, holdings, prices, totalValue, simulateStockMove, buyStock, sellStock };
}

/* -------------------------------- Main Component -------------------------------- */
export default function TradeDemo() {
  /* ----------------------- Simple Mode Selection ----------------------- */
  const [mode, setMode] = useState("demo"); // "demo" or "live"
  const [venue, setVenue] = useState("discover"); // "discover", "trade", "stocks", or "discover-trade"
  
  // For beginners, always start in demo mode
  const usingDemo = mode === "demo";
  
  /* ----------------------------- Simple State ---------------------------- */
  const [balance, setBalance] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [profit, setProfit] = useState(0);
  const [status, setStatus] = useState("Ready to start!");
  
  // Stock simulator
  const stockSim = useStocksSimulator();
  
  /* ----------------------- Progress bar state ----------------------- */
  const [progressPct, setProgressPct] = useState(0);
  const timerRef = useRef(null);
  const progressAnimRef = useRef(null);
  
  function startProgressCycle() {
    const periodMs = 4000; // 4 seconds per cycle
    const startTime = Date.now();
    
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    
    const step = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.max(0, 100 * (elapsed / periodMs)));
      setProgressPct(pct);
      
      if (pct < 100) {
        progressAnimRef.current = requestAnimationFrame(step);
      } else {
        // Cycle complete, trigger next action
        handleNextTick();
        // Start next cycle
        setTimeout(startProgressCycle, 100);
      }
    };
    
    progressAnimRef.current = requestAnimationFrame(step);
  }
  
  function stopProgress() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current);
      progressAnimRef.current = null;
    }
    setProgressPct(0);
  }
  
  /* --------------------------- Simple Trading --------------------------- */
  async function startTrading() {
    setStatus("Starting trading session...");
    setIsRunning(true);
    
    try {
      // For demo purposes, we'll simulate starting
      setProfit(0);
      setBalance(1000);
      
      // Show success message
      setStatus("✅ Trading started! Auto-run is ON.");
      
      // Start the progress cycle
      startProgressCycle();
      
    } catch (e) {
      setStatus("❌ Could not start. Please try again.");
      setIsRunning(false);
    }
  }
  
  function handleNextTick() {
    // Simulate a trading tick
    const change = (Math.random() - 0.45) * 40; // Mostly positive, some negative
    const newProfit = profit + change;
    setProfit(newProfit);
    
    // Update stock prices
    if (venue === "stocks" || venue === "discover-trade") {
      stockSim.simulateStockMove();
    }
    
    // Update status with what happened
    if (change > 0) {
      setStatus(`📈 Trade executed: +$${change.toFixed(2)}`);
    } else if (change < 0) {
      setStatus(`📉 Trade executed: -$${Math.abs(change).toFixed(2)}`);
    } else {
      setStatus("⏸️ Waiting for opportunities...");
    }
    
    // Reset progress for next cycle
    setProgressPct(0);
  }
  
  function stopTrading() {
    stopProgress();
    setIsRunning(false);
    setStatus("⏹️ Trading stopped");
  }
  
  function resetDemo() {
    stopTrading();
    setProfit(0);
    setBalance(1000);
    setVenue("discover");
    setStatus("🔄 Demo reset. Ready to start!");
  }
  
  /* -------------------------------- Simple UI -------------------------------- */
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">IMALI Trading Simulator</h1>
            <p className="text-gray-300">Learn trading with zero risk. Perfect for beginners!</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-300">💰 Demo Balance: </span>
              <span className="font-bold">${balance.toFixed(2)}</span>
            </div>
            <button
              onClick={resetDemo}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600"
            >
              ↻ Reset
            </button>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Status: {status}</span>
            {isRunning && (
              <span className="px-3 py-1 bg-green-900/50 border border-green-500 rounded-full text-sm">
                🔄 Auto-Running
              </span>
            )}
          </div>
          {isRunning && (
            <div className="mt-3">
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1 text-center">
                Next trade in {((4000 - (progressPct / 100 * 4000)) / 1000).toFixed(1)}s
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        
        {/* BIG INSTRUCTIONS CARD */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-2xl p-6 mb-8 border border-blue-500/30">
          <h2 className="text-2xl font-bold mb-4 text-center">🎯 How to Get Started</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">1️⃣</div>
              <h3 className="text-lg font-bold mb-2">Choose Where to Trade</h3>
              <p className="text-gray-300">
                Pick between cryptocurrency platforms or stock markets
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">2️⃣</div>
              <h3 className="text-lg font-bold mb-2">Click "Start Demo"</h3>
              <p className="text-gray-300">
                Just one button to begin. No complicated settings!
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">3️⃣</div>
              <h3 className="text-lg font-bold mb-2">Watch & Learn</h3>
              <p className="text-gray-300">
                The system trades automatically. See how profits grow!
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Trading Options */}
          <div className="space-y-6">
            {/* Trading Venue Selection */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Step 1: Choose Trading Platform</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setVenue("discover")}
                  className={`p-4 rounded-xl border-2 transition-all ${venue === "discover" 
                    ? "border-blue-500 bg-blue-900/30" 
                    : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50"}`}
                >
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="font-bold">Discover</div>
                  <div className="text-sm text-gray-300 mt-1">Explore DeFi markets</div>
                </button>
                
                <button
                  onClick={() => setVenue("trade")}
                  className={`p-4 rounded-xl border-2 transition-all ${venue === "trade" 
                    ? "border-green-500 bg-green-900/30" 
                    : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50"}`}
                >
                  <div className="text-2xl mb-2">💹</div>
                  <div className="font-bold">Trade</div>
                  <div className="text-sm text-gray-300 mt-1">Centralized exchanges</div>
                </button>
                
                <button
                  onClick={() => setVenue("stocks")}
                  className={`p-4 rounded-xl border-2 transition-all ${venue === "stocks" 
                    ? "border-yellow-500 bg-yellow-900/30" 
                    : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50"}`}
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-bold">Stocks</div>
                  <div className="text-sm text-gray-300 mt-1">Stock markets</div>
                </button>
                
                <button
                  onClick={() => setVenue("discover-trade")}
                  className={`p-4 rounded-xl border-2 transition-all ${venue === "discover-trade" 
                    ? "border-purple-500 bg-purple-900/30" 
                    : "border-gray-600 bg-gray-800/50 hover:bg-gray-700/50"}`}
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-bold">Discover + Trade</div>
                  <div className="text-sm text-gray-300 mt-1">Both platforms</div>
                </button>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${venue === "discover" ? "bg-blue-500" : 
                    venue === "trade" ? "bg-green-500" : 
                    venue === "stocks" ? "bg-yellow-500" : "bg-purple-500"}`} />
                  <span className="font-bold">
                    {venue === "discover" ? "Discover (DeFi)" :
                     venue === "trade" ? "Trade (CEX)" :
                     venue === "stocks" ? "Stocks" : "Discover + Trade"}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {venue === "discover" ? "Trading on decentralized exchanges like Uniswap" :
                   venue === "trade" ? "Trading on centralized exchanges like Binance" :
                   venue === "stocks" ? "Trading stocks like Apple, Microsoft, Nvidia" :
                   "Trading on both decentralized and centralized exchanges"}
                </p>
              </div>
            </div>
            
            {/* Start/Stop Controls */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6">Step 2: Start Trading</h2>
              
              {!isRunning ? (
                <button
                  onClick={startTrading}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-xl font-bold flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">▶️</span>
                  START DEMO & AUTO-RUN
                </button>
              ) : (
                <button
                  onClick={stopTrading}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl text-xl font-bold flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">⏹️</span>
                  STOP TRADING
                </button>
              )}
              
              <div className="mt-6 text-center text-gray-300">
                <p className="mb-2">💡 <strong>Beginner Tip:</strong></p>
                <p className="text-sm">Just click "Start Demo" and watch the system trade automatically for you!</p>
              </div>
            </div>
          </div>
          
          {/* Right Column: Results & Stats */}
          <div className="space-y-6">
            {/* Profit/Loss Display */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Your Results</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-sm text-gray-300">Starting Balance</div>
                  <div className="text-2xl font-bold mt-1">$1,000.00</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-sm text-gray-300">Current Profit/Loss</div>
                  <div className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm text-gray-300">Total Value</div>
                  <div className="text-2xl font-bold mt-1">${(1000 + profit).toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">⏱️</div>
                  <div className="text-sm text-gray-300">Success Rate</div>
                  <div className="text-2xl font-bold mt-1">85%</div>
                </div>
              </div>
              
              {/* Progress Visualization */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Demo Progress</span>
                  <span>{isRunning ? "Live Now" : "Ready"}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (profit + 1000) / 2000 * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-2 text-center">
                  {profit >= 0 ? `Making profit! 🎉` : `Learning phase - this is normal! 📚`}
                </div>
              </div>
            </div>
            
            {/* Trading Dashboard */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Live Dashboard</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <span>Current Platform</span>
                  <span className="font-bold">
                    {venue === "discover" ? "Discover (DeFi)" :
                     venue === "trade" ? "Trade (CEX)" :
                     venue === "stocks" ? "Stocks" : "Discover + Trade"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <span>Trading Mode</span>
                  <span className="font-bold">{isRunning ? "Auto-Run 🔄" : "Ready ▶️"}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <span>Trades Executed</span>
                  <span className="font-bold">{Math.floor(profit / 20)} trades</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <span>Learning Score</span>
                  <span className="font-bold text-green-400">Beginner → Novice</span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <div className="text-sm text-blue-300">Win Rate</div>
                  <div className="text-lg font-bold">85%</div>
                </div>
                <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                  <div className="text-sm text-green-300">Best Trade</div>
                  <div className="text-lg font-bold">+$42.50</div>
                </div>
                <div className="text-center p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                  <div className="text-sm text-purple-300">Avg Profit</div>
                  <div className="text-lg font-bold">+$8.75</div>
                </div>
              </div>
            </div>
            
            {/* Beginner Tips */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-5 border border-blue-500/30">
              <h3 className="font-bold mb-3 text-lg">🎓 Beginner Learning Tips</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Watch how the system identifies trading opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Notice when profits are taken vs when losses are cut</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Try different platforms to see which suits you best</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Don't worry about losses - they're part of learning!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Info Bar */}
        <div className="mt-8 p-4 bg-gray-800/30 rounded-xl border border-gray-700">
          <div className="text-center">
            <p className="text-gray-300">
              <strong>Remember:</strong> This is a demo simulation. No real money is involved. 
              Perfect for learning without risk!
            </p>
            <p className="text-sm text-gray-400 mt-2">
              💡 Pro tip: Let it run for 5-10 minutes to see meaningful results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Trading Overview Wrapper ----------------------- */
// This would be your existing TradingOverview component
function SimpleTradingOverview({ profit, isRunning }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">
          {isRunning ? "Live Trading Active" : "Ready to Start"}
        </div>
        <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
        </div>
        <div className="text-gray-300 mt-2">
          {isRunning ? "System is trading automatically" : "Click START DEMO to begin"}
        </div>
      </div>
    </div>
  );
}