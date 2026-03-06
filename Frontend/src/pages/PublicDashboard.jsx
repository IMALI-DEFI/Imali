// src/pages/PublicDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// ========== CONFIGURATION ==========
const API_BASE = "https://api.imali-defi.com";
const LIVE_STATS_URL = `${API_BASE}/api/public/live-stats`;

// ========== COMPONENTS ==========
function StatCard({ title, value, icon, subtext, color = "emerald" }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400"
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
          </div>
          <div className="text-[10px] text-white/35">
            {formatTime(trade.created_at || trade.timestamp)} • 
            ${Number(trade.price || 0).toFixed(2)} • 
            {trade.qty && ` ${Number(trade.qty).toFixed(4)} units`}
          </div>
        </div>
      </div>
      <div className="text-right">
        {isOpen ? (
          <div className="font-bold text-sm text-blue-400">Open</div>
        ) : trade.pnl_usd ? (
          <div className={`font-bold text-sm ${trade.pnl_usd > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trade.pnl_usd > 0 ? '+' : ''}{trade.pnl_usd.toFixed(2)} USD
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
    stocks: { health: null },
    sniper: { discoveries: [], health: null },
    okx: { health: null },
    loading: true,
    lastUpdate: null,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    let pollInterval = 30000; // Start with 30 seconds

    const fetchLiveStats = async () => {
      // Pause polling if the tab is hidden to save API rate limits
      if (document.hidden) {
        timeoutId = setTimeout(fetchLiveStats, pollInterval);
        return;
      }

      try {
        console.log("Fetching live stats from combined endpoint...");
        const response = await axios.get(LIVE_STATS_URL, { timeout: 8000 });

        if (!mounted) return;

        const statsData = response.data;
        pollInterval = 30000; // Reset interval to default on successful fetch
        
        setData({
          futures: {
            health: statsData.futures,
            positions: statsData.futures?.positions || [],
            trades: statsData.recent_trades || []
          },
          stocks: {
            health: statsData.stocks
          },
          sniper: {
            health: statsData.sniper,
            discoveries: statsData.discoveries || []
          },
          okx: { health: statsData.okx },
          loading: false,
          lastUpdate: new Date(),
          error: null
        });

      } catch (err) {
        console.error("Fetch error:", err);
        if (!mounted) return;
        
        // Handle 429 Too Many Requests cleanly with Exponential Backoff
        if (err.response?.status === 429) {
          pollInterval = Math.min(pollInterval * 2, 120000); // Max wait 2 minutes
          setData(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Rate limited. Retrying in ${pollInterval / 1000}s...` 
          }));
        } else {
          setData(prev => ({ ...prev, loading: false, error: "Live data unavailable" }));
        }
      }

      // Recursively schedule next fetch dynamically based on the rate limit status
      if (mounted) {
        timeoutId = setTimeout(fetchLiveStats, pollInterval);
      }
    };

    // 50ms delay on initial fetch prevents React Strict Mode from double-firing the API
    timeoutId = setTimeout(fetchLiveStats, 50);

    return () => { 
      mounted = false; 
      clearTimeout(timeoutId); 
    };
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
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">Connecting to trading bots...</p>
        </div>
      </div>
    );
  }

  const hasConnection = data.futures.health || data.stocks.health || data.sniper.health || data.okx.health;
  
  const allTrades = (data.futures.trades || []).sort((a, b) => {
    const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
    const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
    return timeB - timeA;
  }).slice(0, 30);

  const filteredTrades = activeTab === 'all' 
    ? allTrades 
    : activeTab === 'open' 
      ? allTrades.filter(t => !t.pnl && t.status !== 'closed' && t.side !== 'close')
      : activeTab === 'closed'
        ? allTrades.filter(t => t.pnl || t.status === 'closed' || t.side === 'close')
        : allTrades;

  const tabs = [
    { id: 'all', label: 'All', icon: '🌐', count: allTrades.length },
    { id: 'open', label: 'Open', icon: '🟢', count: allTrades.filter(t => !t.pnl && t.status !== 'closed' && t.side !== 'close').length },
    { id: 'closed', label: 'Closed', icon: '✅', count: allTrades.filter(t => t.pnl || t.status === 'closed' || t.side === 'close').length },
  ];

  const activeBots = [data.futures.health, data.stocks.health, data.sniper.health, data.okx.health].filter(Boolean).length;
  const totalPnL = allTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);

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
                <span>Updates every 30s</span>
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
        {data.error && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-amber-300 text-sm">⚠️ {data.error}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Live Trading Dashboard 🚀</h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Watch our AI bots trade in real-time
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard title="Active Bots" value={activeBots} icon="🤖" color="indigo" subtext="Online" />
          <StatCard title="Total Trades" value={allTrades.length} icon="📊" color="purple" subtext="All time" />
          <StatCard title="Total P&L" value={`$${Math.abs(totalPnL).toFixed(2)}`} icon="💰" color={totalPnL >= 0 ? "emerald" : "red"} subtext={totalPnL >= 0 ? 'Profit' : 'Loss'} />
          <StatCard title="Discoveries" value={data.sniper.discoveries.length} icon="🦄" color="amber" subtext="New tokens" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <BotCard name="Futures Bot" icon="📊" health={data.futures.health} stats={
            <>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Trade Feed
                </h2>
                <div className="flex gap-1 bg-black/30 rounded-lg p-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
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
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
                <span>🦄</span> New Token Discoveries
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

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
              <Link to="/signup" className="inline-block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 font-semibold text-sm transition-all">
                Start Trading Free →
              </Link>
              <p className="text-[10px] text-white/30 mt-2">No credit card required</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-white/30 border-t border-white/10 pt-6">
          <p>Live data refreshes every 30 seconds via single endpoint.<br />
            <Link to="/" className="text-indigo-400 hover:underline">Home</Link> • <Link to="/dashboard" className="text-indigo-400 hover:underline">Member Dashboard</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
