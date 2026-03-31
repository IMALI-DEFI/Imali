// src/pages/Home.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

// ... (keep all imports and helper functions)

export default function Home() {
  const { liveStats, announcements, isConnected, socket } = useSocket();
  const promo = usePromoStatus();
  const promoClaim = usePromoClaim();
  const [activity, setActivity] = useState({
    trades: [],
    stats: {
      currentStatus: "Loading...",
      activeBots: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      online: false,
      botStatuses: [],
    },
    pnlHistory: [],
    loading: true,
    error: null,
  });
  const [isMuted, setIsMuted] = useState(true);
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState("starter");

  const videoId = "x6Dvj1ALs-w";

  // Listen for live updates
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const unsubscribeTrade = socket.onTrade((trade) => {
      setActivity(prev => ({
        ...prev,
        trades: [trade, ...prev.trades].slice(0, 20),
        stats: {
          ...prev.stats,
          totalTrades: prev.stats.totalTrades + 1,
          wins: prev.stats.wins + (trade.pnl > 0 ? 1 : 0),
          losses: prev.stats.losses + (trade.pnl < 0 ? 1 : 0),
        }
      }));
    });
    
    const unsubscribeStats = socket.onLiveStats((stats) => {
      setActivity(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          activeBots: stats.active_bots || 0,
          online: stats.active_bots > 0,
          botStatuses: stats.bots || []
        }
      }));
    });
    
    return () => {
      unsubscribeTrade();
      unsubscribeStats();
    };
  }, [socket, isConnected]);

  // Fetch initial data via REST
  const fetchActivity = useCallback(async () => {
    try {
      const statsRes = await axios.get(PUBLIC_STATS_URL, { timeout: 10000 });
      if (statsRes.data?.success) {
        const data = statsRes.data.data;
        const trades = data.recent_trades || [];
        const summary = data.summary || {};
        
        const botStatuses = (data.bots || []).map(bot => ({
          label: getBotDisplayName(bot.name),
          live: bot.total_trades > 0,
          details: bot,
        }));
        
        setActivity({
          trades: trades.slice(0, 20),
          stats: {
            currentStatus: botStatuses.some(b => b.live) ? "Live" : "Demo",
            activeBots: botStatuses.filter(b => b.live).length,
            totalTrades: summary.total_trades || trades.length,
            wins: summary.wins || 0,
            losses: summary.losses || 0,
            winRate: summary.win_rate || 0,
            online: botStatuses.some(b => b.live),
            botStatuses,
          },
          pnlHistory: data.daily_pnl || [],
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      setActivity(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Add connection status to the header
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* Add connection status bar */}
      <div className="fixed top-0 right-4 z-50 flex items-center gap-2 text-xs bg-white/90 px-3 py-1 rounded-full shadow-sm mt-2">
        <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-gray-600">{isConnected ? 'Live' : 'Updates every 30s'}</span>
      </div>
      
      {/* Live Announcements Ticker */}
      {announcements.length > 0 && (
        <div className="bg-indigo-600 text-white py-2 px-4 text-center text-sm animate-pulse">
          📢 {announcements[0]?.title}: {announcements[0]?.content}
        </div>
      )}
      
      {/* Rest of the component remains the same... */}
    </div>
  );
}
