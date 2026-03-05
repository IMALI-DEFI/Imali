// src/pages/PublicDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// ========== CONFIGURATION ==========
const API_BASE = "https://api.imali-defi.com";
const PROXY_ENDPOINTS = {
  futuresHealth: `${API_BASE}/api/proxy/futures/health`,
  futuresTrades: `${API_BASE}/api/proxy/futures/trades?limit=20`,
  futuresPositions: `${API_BASE}/api/proxy/futures/positions`,
  stocksHealth: `${API_BASE}/api/proxy/stocks/health`,
  stocksPositions: `${API_BASE}/api/proxy/stocks/positions`,
  sniperHealth: `${API_BASE}/api/proxy/sniper/health`,
  sniperDiscoveries: `${API_BASE}/api/proxy/sniper/discoveries?limit=10`,
  okxHealth: `${API_BASE}/api/proxy/okx/health`,
  liveStats: `${API_BASE}/api/public/live-stats`,
};

// ========== COMPONENTS ==========
function StatCard({ title, value, icon, subtext, color = "emerald" }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400"
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-white/50">{title}</p>
          <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 ${colorClasses[color]}`}>
            {value}
          </p>
          {subtext && <p className="text-[10px] sm:text-xs text-white/30 mt-1">{subtext}</p>}
        </div>
        <div className="text-2xl sm:text-3xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function BotCard({ name, icon, health, stats }) {
  const isOnline = !!health;
  const statusColor = isOnline ? "text-green-400" : "text-red-400";
  const statusText = isOnline ? "● Online" : "○ Offline";

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">{icon}</span>
          <span className="font-semibold text-sm sm:text-base">{name}</span>
        </div>
        <span className={`text-xs ${statusColor}`}>{statusText}</span>
      </div>
      {isOnline ? (
        <div className="text-xs space-y-1 text-white/60">{stats}</div>
      ) : (
        <div className="text-xs text-white/30 py-1">Waiting for connection...</div>
      )}
    </div>
  );
}

function TradeRow({ trade }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / 1440)}d ago`;
    } catch {
      return '';
    }
  };

  // Determine trade type and styling
  const isBuy = trade.side === 'buy' || trade.side === 'long';
  const isSell = trade.side === 'sell' || trade.side === 'short';
  const isClose = trade.side === 'close';
  const isOpen = !trade.pnl && trade.status !== 'closed' && !isClose;
  
  let borderColor = "border-l-gray-500";
  let bgColor = "bg-white/[0.03]";
  let badgeColor = "bg-gray-500/20 text-gray-300";
  let badgeText = "UNKNOWN";
  
  if (isOpen) {
    borderColor = "border-l-blue-500";
    bgColor = "bg-blue-500/5";
    badgeColor = "bg-blue-500/20 text-blue-300";
    badgeText = "OPEN";
  } else if (isClose) {
    borderColor = "border-l-purple-500";
    bgColor = "bg-purple-500/5";
    badgeColor = "bg-purple-500/20 text-purple-300";
    badgeText = "CLOSED";
  } else if (isBuy) {
    borderColor = "border-l-green-500";
    bgColor = "bg-green-500/5";
    badgeColor = "bg-green-500/20 text-green-300";
    badgeText = "BUY";
  } else if (isSell) {
    borderColor = "border-l-red-500";
    bgColor = "bg-red-500/5";
    badgeColor = "bg-red-500/20 text-red-300";
    badgeText = "SELL";
  }

  // Calculate P&L display
  const pnlValue = trade.pnl || trade.pnl_percent || 0;
  const pnlUsd = trade.pnl_usd || 0;
  const isProfitable = pnlValue > 0;

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm border-l-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base">📊</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{trade.symbol || 'Unknown'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}>
              {badgeText}
            </span>
            {trade.strategy && (
              <span className="text-[8px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                {trade.strategy}
              </span>
            )}
          </div>
          <div className="text-[10px] text-white/35">
            {formatTime(trade.created_at || trade.timestamp || trade.time)} • 
            ${Number(trade.price || 0).toFixed(2)} • 
            {trade.qty && ` ${Number(trade.qty).toFixed(4)} units`}
          </div>
        </div>
      </div>
      <div className="text-right">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-400">Open</div>
        ) : isClose ? (
          <div>
            <div className={`font-bold text-sm ${pnlUsd > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnlUsd > 0 ? '+' : ''}{pnlUsd.toFixed(2)} USD
            </div>
            {pnlValue && (
              <div className={`text-[10px] ${pnlValue > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {pnlValue > 0 ? '+' : ''}{pnlValue.toFixed(2)}%
              </div>
            )}
          </div>
        ) : (
          <div className="font-bold text-sm text-white">
            ${Number(trade.price || 0).toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoveryCard({ discovery }) {
  const score = discovery.ai_score || discovery.score || 0;
  let scoreColor = "text-orange-400";
  if (score >= 0.7) scoreColor = "text-green-400";
  else if (score >= 0.5) scoreColor = "text-yellow-400";

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs hover:bg-purple-500/10 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium flex items-center gap-1">
          <span className="text-base">🦄</span>
          <span className="capitalize">{discovery.chain || 'Ethereum'}</span>
        </span>
        <span className="text-white/40 text-[10px]">{discovery.age || 0} blocks</span>
      </div>
      <div className="text-white/60 font-mono text-[10px] mb-2 truncate">
        {discovery.pair || discovery.address || 'New token'}
      </div>
      <div className="flex justify-between items-center">
        <div>
          <span className="text-white/40">AI Score</span>
          <span className={`ml-2 font-bold ${scoreColor}`}>{score.toFixed(2)}</span>
        </div>
        {score >= 0.7 && (
          <span className="text-[8px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Ready</span>
        )}
      </div>
    </div>
  );
}

// ========== HOOKS ==========
function useLiveData() {
  const [data, setData] = useState({
    futures: { positions: [], health: null, trades: [] },
    stocks: { positions: [], health: null },
    sniper: { discoveries: [], health: null },
    okx: { health: null },
    loading: true,
    lastUpdate: null,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const fetchAllData = async () => {
      try {
        console.log("Fetching all data from endpoints...");
        
        // Fetch all data in parallel
        const [
          futuresHealth,
          stocksHealth,
          sniperHealth,
          okxHealth,
          futuresTrades,
          sniperDiscoveries,
          futuresPositions
        ] = await Promise.allSettled([
          axios.get(PROXY_ENDPOINTS.futuresHealth, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.stocksHealth, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.sniperHealth, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.okxHealth, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.futuresTrades, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.sniperDiscoveries, { timeout: 5000 }),
          axios.get(PROXY_ENDPOINTS.futuresPositions, { timeout: 5000 })
        ]);

        if (!mounted) return;

        // Process futures trades - handle different response formats
        let trades = [];
        if (futuresTrades.status === 'fulfilled' && futuresTrades.value.data) {
          trades = futuresTrades.value.data.trades || 
                   futuresTrades.value.data || 
                   [];
        }

        // Process futures positions
        let positions = [];
        if (futuresPositions.status === 'fulfilled' && futuresPositions.value.data) {
          positions = futuresPositions.value.data.positions || 
                      futuresPositions.value.data || 
                      [];
        }

        // Process sniper discoveries
        let discoveries = [];
        if (sniperDiscoveries.status === 'fulfilled' && sniperDiscoveries.value.data) {
          discoveries = sniperDiscoveries.value.data.discoveries || 
                        sniperDiscoveries.value.data || 
                        [];
        }

        setData({
          futures: {
            health: futuresHealth.status === 'fulfilled' ? futuresHealth.value.data : null,
            positions: positions,
            trades: trades
          },
          stocks: {
            health: stocksHealth.status === 'fulfilled' ? stocksHealth.value.data : null,
            positions: stocksHealth.status === 'fulfilled' ? stocksHealth.value.data?.positions || [] : []
          },
          sniper: {
            health: sniperHealth.status === 'fulfilled' ? sniperHealth.value.data : null,
            discoveries: discoveries
          },
          okx: { health: okxHealth.status === 'fulfilled' ? okxHealth.value.data : null },
          loading: false,
          lastUpdate: new Date(),
          error: null
        });

        console.log("Data updated:", {
          trades: trades.length,
          positions: positions.length,
          discoveries: discoveries.length
        });

      } catch (err) {
        console.error("Fetch error:", err);
        if (!mounted) return;
        setData(prev => ({ ...prev, loading: false, error: "Some services unavailable" }));
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return data;
}

// ========== MAIN COMPONENT ==========
export default function PublicDashboard() {
  const data = useLiveData();
  const [activeTab, setActiveTab] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLastUpdate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/60">Connecting to trading bots...</p>
        </div>
      </div>
    );
  }

  const hasConnection = data.futures.health || data.stocks.health || data.sniper.health || data.okx.health;
  
  // Combine all trades from futures bot
  const allTrades = (data.futures.trades || []).sort((a, b) => {
    const timeA = new Date(a.created_at || a.timestamp || a.time || 0).getTime();
    const timeB = new Date(b.created_at || b.timestamp || b.time || 0).getTime();
    return timeB - timeA;
  }).slice(0, 30);

  const filteredTrades = activeTab === 'all' 
    ? allTrades 
    : allTrades.filter(t => {
        if (activeTab === 'open') return !t.pnl && t.status !== 'closed' && t.side !== 'close';
        if (activeTab === 'closed') return t.pnl || t.status === 'closed' || t.side === 'close';
        if (activeTab === 'buy') return t.side === 'buy' || t.side === 'long';
        if (activeTab === 'sell') return t.side === 'sell' || t.side === 'short';
        return true;
      });

  const tabs = [
    { id: 'all', label: 'All', icon: '🌐', count: allTrades.length },
    { id: 'open', label: 'Open', icon: '🟢', count: allTrades.filter(t => !t.pnl && t.status !== 'closed' && t.side !== 'close').length },
    { id: 'closed', label: 'Closed', icon: '✅', count: allTrades.filter(t => t.pnl || t.status === 'closed' || t.side === 'close').length },
    { id: 'buy', label: 'Buys', icon: '📈', count: allTrades.filter(t => t.side === 'buy' || t.side === 'long').length },
    { id: 'sell', label: 'Sells', icon: '📉', count: allTrades.filter(t => t.side === 'sell' || t.side === 'short').length },
  ];

  const activePositions = data.futures.positions?.length || 0;
  const activeBots = [
    data.futures.health ? 'Futures' : null,
    data.stocks.health ? 'Stocks' : null,
    data.sniper.health ? 'Sniper' : null,
    data.okx.health ? 'OKX' : null
  ].filter(Boolean).length;

  // Calculate stats from trades
  const totalPnL = allTrades
    .filter(t => t.pnl_usd)
    .reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  
  const winningTrades = allTrades.filter(t => t.pnl_usd > 0).length;
  const losingTrades = allTrades.filter(t => t.pnl_usd < 0).length;
  const winRate = allTrades.length ? ((winningTrades / allTrades.length) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">IMALI</Link>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full animate-pulse">
                {hasConnection ? 'LIVE' : 'CONNECTING'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className={`w-2 h-2 rounded-full ${hasConnection ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                <span>Updates every 15s</span>
              </div>
              <div className="text-xs text-white/40">{lastUpdate.toLocaleTimeString()}</div>
              <Link to="/signup" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs sm:text-sm font-semibold transition-all">
                Sign Up Free →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!hasConnection && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ Waiting for connection to trading bots...</p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Live Trading Dashboard 🚀</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch our AI bots trade in real-time across futures, stocks, and crypto markets.
            {activePositions > 0 && (
              <span className="block mt-2 text-emerald-400">🔥 Currently {activePositions} active position{activePositions !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Positions" value={activePositions} icon="🎯" color="emerald" subtext="Open trades" />
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext="Online" />
          <StatCard title="Win Rate" value={`${winRate}%`} icon="📊" color="purple" subtext={`${winningTrades}W / ${losingTrades}L`} />
          <StatCard title="Total P&L" value={`$${Math.abs(totalPnL).toFixed(2)}`} icon="💰" color={totalPnL >= 0 ? "emerald" : "red"} subtext={totalPnL >= 0 ? 'Profit' : 'Loss'} />
          <StatCard title="Total Trades" value={allTrades.length} icon="📋" color="amber" subtext="All time" />
        </div>

        {/* Bot Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <BotCard name="Futures Bot" icon="📊" health={data.futures.health} stats={
            <>
              <div>Positions: {data.futures.positions?.length || 0}</div>
              <div>Pairs: {data.futures.health?.total_symbols || 199}</div>
              <div>Trades: {data.futures.trades?.length || 0}</div>
            </>
          } />
          <BotCard name="Stock Bot" icon="📈" health={data.stocks.health} stats={
            <>
              <div>Symbols: {data.stocks.health?.symbols || 500}</div>
              <div>Mode: {data.stocks.health?.mode || 'paper'}</div>
            </>
          } />
          <BotCard name="Sniper Bot" icon="🦄" health={data.sniper.health} stats={
            <>
              <div>Discoveries: {data.sniper.discoveries.length}</div>
              <div>Dry Run: {data.sniper.health?.dry_run ? 'Yes' : 'No'}</div>
            </>
          } />
          <BotCard name="OKX Spot" icon="🔷" health={data.okx.health} stats={
            <>
              <div>Status: Online</div>
              <div>Ready to trade</div>
            </>
          } />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trades Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                </h2>
                <div className="flex flex-wrap gap-1 bg-black/30 rounded-lg p-1 max-w-[400px]">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        activeTab === tab.id
                          ? 'bg-emerald-600 text-white'
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 && (
                        <span className="ml-1 text-[8px] bg-white/20 px-1.5 rounded-full">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTrades.length > 0 ? (
                  filteredTrades.map((trade, i) => <TradeRow key={i} trade={trade} />)
                ) : (
                  <div className="text-center py-12 text-white/30">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">No trades match filter</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Discoveries & Info */}
          <div className="space-y-4">
            {/* Recent Discoveries */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span>
                New Token Discoveries
                {data.sniper.discoveries.length > 0 && (
                  <span className="ml-auto text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                    {data.sniper.discoveries.length} new
                  </span>
                )}
              </h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {data.sniper.discoveries.length > 0 ? (
                  data.sniper.discoveries.slice(0, 8).map((d, i) => <DiscoveryCard key={i} discovery={d} />)
                ) : (
                  <div className="text-center py-8 text-white/30 text-sm">
                    <div className="text-2xl mb-2">🔍</div>
                    Scanning for new tokens...
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-3">📊 Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Last 10 trades</span>
                  <span className="font-bold">{allTrades.slice(0, 10).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">24h Volume</span>
                  <span className="font-bold">${(allTrades.reduce((sum, t) => sum + (t.qty * t.price || 0), 0) * 0.1).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Best Trade</span>
                  <span className="font-bold text-emerald-400">
                    {allTrades.sort((a, b) => (b.pnl_usd || 0) - (a.pnl_usd || 0))[0]?.symbol || 'None'}
                  </span>
                </div>
                {data.futures.positions?.length > 0 && (
                  <div className="border-t border-white/10 pt-3 mt-2">
                    <div className="text-xs text-white/40 mb-2">Current Positions:</div>
                    {data.futures.positions.slice(0, 2).map((pos, i) => (
                      <div key={i} className="text-sm font-mono bg-emerald-500/10 p-2 rounded-lg mb-1">
                        {pos.symbol} {pos.side} · {pos.qty} units @ ${pos.entry?.toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-white/10 my-3" />
                <div className="text-center">
                  <Link to="/signup" className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all">
                    Start Trading Free →
                  </Link>
                  <p className="text-[10px] text-white/30 mt-2">No credit card required</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>Live data refreshes every 15 seconds. Connected to futures bot with {allTrades.length} trades recorded.<br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link> • <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
