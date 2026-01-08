// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------- Trading Simulator Engine ----------------------- */
function useTradingSimulator(initialBalance = 1000) {
  const [balance, setBalance] = useState(initialBalance);
  const [totalValue, setTotalValue] = useState(initialBalance);
  const [profit, setProfit] = useState(0);
  const [trades, setTrades] = useState([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [holdings, setHoldings] = useState({
    crypto: { BTC: 0, ETH: 0, SOL: 0 },
    stocks: { AAPL: 0, MSFT: 0, NVDA: 0 }
  });
  const [prices, setPrices] = useState({
    crypto: { BTC: 45000, ETH: 2500, SOL: 100 },
    stocks: { AAPL: 180, MSFT: 420, NVDA: 800 }
  });

  // Calculate total value
  useEffect(() => {
    const cryptoValue = Object.entries(holdings.crypto).reduce(
      (sum, [asset, amount]) => sum + (prices.crypto[asset] * amount),
      0
    );
    const stockValue = Object.entries(holdings.stocks).reduce(
      (sum, [asset, amount]) => sum + (prices.stocks[asset] * amount),
      0
    );
    setTotalValue(balance + cryptoValue + stockValue);
    setProfit(totalValue - initialBalance);
  }, [balance, holdings, prices, initialBalance, totalValue]);

  // Simulate price movements
  function simulatePriceMove() {
    setPrices(prev => ({
      crypto: {
        BTC: Math.max(1000, prev.crypto.BTC * (1 + (Math.random() - 0.48) * 0.015)),
        ETH: Math.max(100, prev.crypto.ETH * (1 + (Math.random() - 0.49) * 0.02)),
        SOL: Math.max(10, prev.crypto.SOL * (1 + (Math.random() - 0.47) * 0.025))
      },
      stocks: {
        AAPL: Math.max(50, prev.stocks.AAPL * (1 + (Math.random() - 0.49) * 0.01)),
        MSFT: Math.max(100, prev.stocks.MSFT * (1 + (Math.random() - 0.48) * 0.012)),
        NVDA: Math.max(200, prev.stocks.NVDA * (1 + (Math.random() - 0.46) * 0.018))
      }
    }));
  }

  // Execute a trade
  function executeTrade(type, asset, action, amount) {
    const assetType = Object.keys(prices.crypto).includes(asset) ? 'crypto' : 'stocks';
    const price = prices[assetType][asset];
    const cost = price * amount;
    const fee = cost * 0.001; // 0.1% fee
    
    let success = false;
    let tradeResult = {};

    if (action === 'BUY') {
      if (balance >= cost + fee) {
        setBalance(b => b - cost - fee);
        setHoldings(h => ({
          ...h,
          [assetType]: { ...h[assetType], [asset]: (h[assetType][asset] || 0) + amount }
        }));
        success = true;
        tradeResult = {
          type: 'buy',
          asset,
          amount,
          price,
          fee,
          pnl: -fee, // Negative PnL for buy (just the fee)
          timestamp: Date.now()
        };
      }
    } else if (action === 'SELL') {
      if (holdings[assetType][asset] >= amount) {
        const revenue = cost - fee;
        setBalance(b => b + revenue);
        setHoldings(h => ({
          ...h,
          [assetType]: { ...h[assetType], [asset]: h[assetType][asset] - amount }
        }));
        success = true;
        
        // Calculate PnL for sell (simplified)
        const avgBuyPrice = price * 0.98; // Assume bought slightly cheaper
        const pnl = (price - avgBuyPrice) * amount - fee;
        
        tradeResult = {
          type: 'sell',
          asset,
          amount,
          price,
          fee,
          pnl,
          timestamp: Date.now()
        };

        // Update wins/losses
        if (pnl > 0) {
          setWins(w => w + 1);
        } else if (pnl < 0) {
          setLosses(l => l + 1);
        }
      }
    }

    if (success) {
      const newTrade = {
        id: Date.now(),
        type: `${assetType.toUpperCase()} ${action}`,
        asset,
        action,
        amount,
        price: price.toFixed(2),
        pnl: tradeResult.pnl ? tradeResult.pnl.toFixed(2) : '0.00',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        success: true
      };
      
      setTrades(prev => [newTrade, ...prev.slice(0, 9)]); // Keep last 10 trades
      simulatePriceMove();
      
      return { success: true, trade: newTrade };
    }
    
    return { success: false };
  }

  // Auto trading function
  function autoTrade(venue) {
    const cryptoAssets = Object.keys(prices.crypto);
    const stockAssets = Object.keys(prices.stocks);
    
    // Randomly pick an asset based on venue
    let assetPool = [];
    if (venue === 'crypto') assetPool = cryptoAssets;
    else if (venue === 'stocks') assetPool = stockAssets;
    else assetPool = [...cryptoAssets, ...stockAssets];
    
    const randomAsset = assetPool[Math.floor(Math.random() * assetPool.length)];
    const assetType = cryptoAssets.includes(randomAsset) ? 'crypto' : 'stocks';
    
    // Random action (more likely to buy when holdings are low, sell when high)
    const currentHolding = holdings[assetType][randomAsset] || 0;
    const maxReasonableHoldings = venue === 'crypto' ? 2 : 50;
    const action = currentHolding < maxReasonableHoldings * 0.3 || Math.random() > 0.6 ? 'BUY' : 'SELL';
    
    // Random amount
    const maxAmount = action === 'BUY' 
      ? Math.floor(balance / prices[assetType][randomAsset] / 2)
      : Math.floor(currentHolding * 0.3);
    
    const amount = maxAmount > 0 ? Math.max(1, Math.floor(Math.random() * maxAmount)) : 0;
    
    if (amount > 0) {
      return executeTrade(assetType, randomAsset, action, amount);
    }
    
    return { success: false };
  }

  function reset(newBalance = initialBalance) {
    setBalance(newBalance);
    setTotalValue(newBalance);
    setProfit(0);
    setTrades([]);
    setWins(0);
    setLosses(0);
    setHoldings({
      crypto: { BTC: 0, ETH: 0, SOL: 0 },
      stocks: { AAPL: 0, MSFT: 0, NVDA: 0 }
    });
    setPrices({
      crypto: { BTC: 45000, ETH: 2500, SOL: 100 },
      stocks: { AAPL: 180, MSFT: 420, NVDA: 800 }
    });
  }

  return {
    balance,
    totalValue,
    profit,
    trades,
    wins,
    losses,
    holdings,
    prices,
    executeTrade,
    autoTrade,
    simulatePriceMove,
    reset,
    setBalance
  };
}

/* -------------------------------- Main Component -------------------------------- */
export default function TradeDemo() {
  /* ----------------------- State Management ----------------------- */
  const [venue, setVenue] = useState("both"); // "crypto", "stocks", or "both"
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready to start trading! 🚀");
  const [startingBalance, setStartingBalance] = useState(1000);
  const [showTradeLog, setShowTradeLog] = useState(true);
  
  // Trading simulator
  const sim = useTradingSimulator(startingBalance);
  
  /* ----------------------- Auto-run Management ----------------------- */
  const timerRef = useRef(null);
  const [progressPct, setProgressPct] = useState(0);
  const progressAnimRef = useRef(null);
  
  function startAutoRun() {
    setIsRunning(true);
    setStatus("Auto-trading started! Watching for opportunities... 👀");
    
    // Start progress animation
    const startTime = Date.now();
    const periodMs = 3000; // 3 seconds per trade
    
    const step = () => {
      if (!isRunning) return;
      
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.max(0, 100 * (elapsed / periodMs)));
      setProgressPct(pct);
      
      if (pct < 100) {
        progressAnimRef.current = requestAnimationFrame(step);
      } else {
        // Execute a trade
        const result = sim.autoTrade(venue);
        
        if (result.success) {
          const trade = result.trade;
          const pnlNum = parseFloat(trade.pnl);
          
          if (pnlNum > 0) {
            setStatus(`✅ WIN! Sold ${trade.amount} ${trade.asset} for +$${Math.abs(pnlNum).toFixed(2)} profit! 🎉`);
          } else if (pnlNum < 0) {
            setStatus(`📉 Loss on ${trade.asset}: -$${Math.abs(pnlNum).toFixed(2)}. Learning opportunity! 📚`);
          } else {
            setStatus(`⚡ ${trade.action} ${trade.amount} ${trade.asset} at $${trade.price}`);
          }
        } else {
          setStatus("⏸️ Evaluating market conditions...");
        }
        
        // Start next cycle
        setTimeout(() => {
          if (isRunning) {
            startAutoRun();
          }
        }, 500);
      }
    };
    
    progressAnimRef.current = requestAnimationFrame(step);
  }
  
  function stopAutoRun() {
    setIsRunning(false);
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current);
    }
    setProgressPct(0);
    setStatus("Trading stopped. Ready for next session! ⏹️");
  }
  
  function startTrading() {
    if (isRunning) {
      stopAutoRun();
    } else {
      sim.reset(startingBalance);
      startAutoRun();
    }
  }
  
  function resetDemo() {
    stopAutoRun();
    sim.reset(startingBalance);
    setStatus("Demo reset with new balance! Ready to trade! 🔄");
  }
  
  /* ----------------------- Manual Trade Functions ----------------------- */
  function quickBuy(assetType, asset) {
    const price = sim.prices[assetType][asset];
    const maxAmount = Math.floor(sim.balance / price);
    const amount = Math.max(1, Math.floor(maxAmount * 0.1)); // Buy 10% of what we can afford
    
    const result = sim.executeTrade(assetType, asset, 'BUY', amount);
    if (result.success) {
      setStatus(`🛒 Bought ${amount} ${asset} at $${price.toFixed(2)}`);
    }
  }
  
  function quickSell(assetType, asset) {
    const holding = sim.holdings[assetType][asset] || 0;
    if (holding > 0) {
      const amount = Math.max(1, Math.floor(holding * 0.5)); // Sell 50% of holdings
      const result = sim.executeTrade(assetType, asset, 'SELL', amount);
      if (result.success) {
        const pnl = parseFloat(result.trade.pnl);
        if (pnl > 0) {
          setStatus(`💰 SOLD! ${amount} ${asset} for +$${pnl.toFixed(2)} profit! 🎯`);
        }
      }
    }
  }
  
  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              IMALI Trading Academy
            </h1>
            <p className="text-gray-300 text-lg">Learn trading with real-time simulations. Zero risk! 🎯</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="text-sm text-gray-300">Demo Balance</div>
              <div className="text-2xl font-bold">${sim.balance.toFixed(2)}</div>
            </div>
            <div className={`border rounded-xl p-4 ${sim.profit >= 0 ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
              <div className="text-sm text-gray-300">Profit/Loss</div>
              <div className={`text-2xl font-bold ${sim.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {sim.profit >= 0 ? '+' : ''}${sim.profit.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="bg-gray-800/30 rounded-2xl p-5 mb-6 border border-gray-700 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'animate-pulse bg-green-500' : 'bg-blue-500'}`} />
              <span className="text-lg font-medium">{status}</span>
            </div>
            
            {isRunning && (
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-green-900/50 border border-green-500 rounded-full text-sm">
                  🔄 Auto-Trading
                </div>
                <div className="text-sm text-gray-400">
                  Wins: <span className="text-green-400 font-bold">{sim.wins}</span> • 
                  Losses: <span className="text-red-400 font-bold">{sim.losses}</span>
                </div>
              </div>
            )}
          </div>
          
          {isRunning && (
            <div className="mt-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">
                Next trade in {((3000 - (progressPct / 100 * 3000)) / 1000).toFixed(1)}s
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        
        {/* Balance & Control Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Balance Settings */}
          <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">💰 Starting Balance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Set your demo balance</label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">$</span>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(Math.max(100, parseInt(e.target.value) || 1000))}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg"
                    disabled={isRunning}
                  />
                  <button
                    onClick={resetDemo}
                    disabled={isRunning}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    Update
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => {
                      if (!isRunning) {
                        setStartingBalance(amount);
                        resetDemo();
                      }
                    }}
                    disabled={isRunning}
                    className={`p-3 rounded-lg text-center ${startingBalance === amount ? 'bg-blue-900/50 border-2 border-blue-500' : 'bg-gray-900/50 border border-gray-700'}`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              
              <div className="text-sm text-gray-400">
                💡 Higher balance = more trading opportunities. Start small and learn!
              </div>
            </div>
          </div>
          
          {/* Trading Platform Selection */}
          <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">🌐 Trading Platform</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'crypto', label: 'Crypto Only', desc: 'BTC, ETH, SOL', icon: '₿' },
                { id: 'stocks', label: 'Stocks Only', desc: 'AAPL, MSFT, NVDA', icon: '📈' },
                { id: 'both', label: 'Both Platforms', desc: 'Crypto + Stocks', icon: '🚀' },
              ].map(platform => (
                <button
                  key={platform.id}
                  onClick={() => setVenue(platform.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${venue === platform.id 
                    ? 'border-blue-500 bg-blue-900/30' 
                    : 'border-gray-700 bg-gray-900/50 hover:bg-gray-800/50'}`}
                >
                  <div className="text-2xl mb-2">{platform.icon}</div>
                  <div className="font-bold">{platform.label}</div>
                  <div className="text-sm text-gray-300 mt-1">{platform.desc}</div>
                </button>
              ))}
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-300 mb-1">Selected Platform:</div>
              <div className="font-bold text-lg">
                {venue === 'crypto' ? 'Cryptocurrency Trading' :
                 venue === 'stocks' ? 'Stock Market Trading' :
                 'Crypto + Stocks Trading'}
              </div>
            </div>
          </div>
          
          {/* Main Control */}
          <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">🎮 Trading Control</h2>
            
            <button
              onClick={startTrading}
              className={`w-full py-4 rounded-xl text-xl font-bold mb-4 transition-all ${isRunning 
                ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}`}
            >
              {isRunning ? (
                <>
                  <span className="text-2xl mr-2">⏸️</span>
                  STOP AUTO-TRADING
                </>
              ) : (
                <>
                  <span className="text-2xl mr-2">🚀</span>
                  START AUTO-TRADING
                </>
              )}
            </button>
            
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Win Rate:</span>
                <span className="font-bold">
                  {sim.wins + sim.losses > 0 
                    ? `${Math.round((sim.wins / (sim.wins + sim.losses)) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Trades:</span>
                <span className="font-bold">{sim.trades.length}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-300">Total Value:</span>
                <span className="font-bold text-lg">${sim.totalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trading Dashboard */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Live Markets */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">📊 Live Markets</h2>
                <button
                  onClick={() => setShowTradeLog(!showTradeLog)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                >
                  {showTradeLog ? 'Hide Trades' : 'Show Trades'}
                </button>
              </div>
              
              {/* Crypto Markets */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">₿</span> Cryptocurrencies
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(sim.prices.crypto).map(([asset, price]) => (
                    <div key={asset} className="bg-gray-900/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg">{asset}</div>
                          <div className="text-2xl font-bold">${price.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-400">
                          Held: {sim.holdings.crypto[asset] || 0}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => quickBuy('crypto', asset)}
                          disabled={isRunning || sim.balance < price}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => quickSell('crypto', asset)}
                          disabled={isRunning || !sim.holdings.crypto[asset]}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Stock Markets */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">📈</span> Stocks
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(sim.prices.stocks).map(([asset, price]) => (
                    <div key={asset} className="bg-gray-900/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg">{asset}</div>
                          <div className="text-2xl font-bold">${price.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-400">
                          Held: {sim.holdings.stocks[asset] || 0}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => quickBuy('stocks', asset)}
                          disabled={isRunning || sim.balance < price}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        >
                          Buy
                        </button>
                        <button
                          onClick={() => quickSell('stocks', asset)}
                          disabled={isRunning || !sim.holdings.stocks[asset]}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Trade Log */}
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">📝 Recent Trades</h2>
              <div className="text-sm text-gray-400 mt-1">
                Wins: <span className="text-green-400 font-bold">{sim.wins}</span> • 
                Losses: <span className="text-red-400 font-bold">{sim.losses}</span>
              </div>
            </div>
            
            <div className="h-[500px] overflow-y-auto p-4">
              {showTradeLog ? (
                sim.trades.length > 0 ? (
                  <div className="space-y-3">
                    {sim.trades.map(trade => {
                      const pnlNum = parseFloat(trade.pnl);
                      return (
                        <div 
                          key={trade.id} 
                          className={`p-4 rounded-lg border ${pnlNum > 0 ? 'bg-green-900/20 border-green-500/30' : pnlNum < 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-900/20 border-gray-700'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg ${trade.action === 'BUY' ? 'text-blue-400' : 'text-green-400'}`}>
                                {trade.action === 'BUY' ? '🛒' : '💰'}
                              </span>
                              <div>
                                <div className="font-bold">{trade.asset}</div>
                                <div className="text-sm text-gray-400">{trade.type}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${trade.price}</div>
                              <div className={`text-sm font-bold ${pnlNum > 0 ? 'text-green-400' : pnlNum < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {pnlNum > 0 ? '+' : ''}{trade.pnl}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>{trade.amount} shares</span>
                            <span>{trade.time}</span>
                          </div>
                          {pnlNum > 0 && (
                            <div className="mt-2 text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded inline-block">
                              ✅ Profit!
                            </div>
                          )}
                          {pnlNum < 0 && (
                            <div className="mt-2 text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded inline-block">
                              📉 Loss
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <div className="text-lg mb-2">No trades yet</div>
                    <div className="text-sm">Start auto-trading to see your first trade!</div>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">👁️</div>
                  <div className="text-lg">Trade log hidden</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Holdings & Stats */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Holdings */}
          <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">💼 Your Holdings</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-yellow-400">Cryptocurrency</h3>
              <div className="space-y-3">
                {Object.entries(sim.holdings.crypto)
                  .filter(([_, amount]) => amount > 0)
                  .map(([asset, amount]) => (
                    <div key={asset} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-lg">₿</span>
                        </div>
                        <div>
                          <div className="font-bold">{asset}</div>
                          <div className="text-sm text-gray-400">{(amount * sim.prices.crypto[asset]).toFixed(2)} USD</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{amount.toFixed(4)}</div>
                        <div className="text-sm text-gray-400">${sim.prices.crypto[asset].toFixed(2)} each</div>
                      </div>
                    </div>
                  ))}
                {Object.values(sim.holdings.crypto).every(v => v === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    No cryptocurrency holdings yet
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-3 text-blue-400">Stocks</h3>
              <div className="space-y-3">
                {Object.entries(sim.holdings.stocks)
                  .filter(([_, amount]) => amount > 0)
                  .map(([asset, amount]) => (
                    <div key={asset} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <span className="text-lg">📈</span>
                        </div>
                        <div>
                          <div className="font-bold">{asset}</div>
                          <div className="text-sm text-gray-400">{(amount * sim.prices.stocks[asset]).toFixed(2)} USD</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{amount} shares</div>
                        <div className="text-sm text-gray-400">${sim.prices.stocks[asset].toFixed(2)} each</div>
                      </div>
                    </div>
                  ))}
                {Object.values(sim.holdings.stocks).every(v => v === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    No stock holdings yet
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats & Learning */}
          <div className="space-y-6">
            <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">📈 Trading Statistics</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm text-gray-300">Win Rate</div>
                  <div className="text-2xl font-bold mt-1">
                    {sim.wins + sim.losses > 0 
                      ? `${Math.round((sim.wins / (sim.wins + sim.losses)) * 100)}%` 
                      : '0%'}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-sm text-gray-300">Avg Profit</div>
                  <div className="text-2xl font-bold mt-1">
                    ${(sim.profit / Math.max(1, sim.trades.length)).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm text-gray-300">Total Trades</div>
                  <div className="text-2xl font-bold mt-1">{sim.trades.length}</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-sm text-gray-300">Best Trade</div>
                  <div className="text-2xl font-bold mt-1 text-green-400">
                    ${Math.max(0, ...sim.trades.map(t => parseFloat(t.pnl))).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-4">
                <div className="font-bold mb-2">Learning Progress</div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${Math.min(100, (sim.trades.length / 20) * 100)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-300">
                  {sim.trades.length >= 20 ? 'Advanced Learner 🏆' :
                   sim.trades.length >= 10 ? 'Intermediate Trader 📈' :
                   sim.trades.length >= 5 ? 'Getting Started 🎯' :
                   'New Beginner 📚'}
                </div>
              </div>
            </div>
            
            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-500/30">
              <h3 className="font-bold mb-4 text-lg">💡 Trading Tips</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="text-green-400 text-xl">✓</div>
                  <div>
                    <div className="font-bold">Diversify</div>
                    <div className="text-sm text-gray-300">Try both crypto and stocks to spread risk</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-green-400 text-xl">✓</div>
                  <div>
                    <div className="font-bold">Start Small</div>
                    <div className="text-sm text-gray-300">Begin with $500-$1000 to learn the basics</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-green-400 text-xl">✓</div>
                  <div>
                    <div className="font-bold">Watch & Learn</div>
                    <div className="text-sm text-gray-300">Let auto-trading run to see patterns</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer Note */}
        <div className="text-center p-6 bg-gray-800/20 rounded-2xl border border-gray-700">
          <p className="text-gray-300">
            <strong>Remember:</strong> This is a risk-free trading simulation. Perfect for beginners to learn without financial risk! 
          </p>
          <p className="text-sm text-gray-400 mt-2">
            💡 Pro tip: Start with a small balance, watch auto-trading, then try manual trades!
          </p>
        </div>
      </div>
    </div>
  );
}