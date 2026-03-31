// src/pages/PublicDashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
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

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler
);

const API_BASE = "https://api.imali-defi.com";
const PUBLIC_STATS_URL = `${API_BASE}/api/public/live-stats`;

// ... (keep all helper functions the same: safeNumber, formatCurrency, etc.)

export default function PublicDashboard() {
  const { liveStats, lastTrade, isConnected, socket } = useSocket();
  const [data, setData] = useState({
    trades: [],
    summary: {},
    botStats: {},
    loading: true,
    error: null,
    lastUpdate: null
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortRecentTrades, setSortRecentTrades] = useState("recent");

  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(PUBLIC_STATS_URL, { timeout: 15000 });
      if (response.data?.success) {
        const apiData = response.data.data;
        const trades = apiData.recent_trades || [];
        const summary = apiData.summary || {};
        
        // Process bot stats
        const botStats = {};
        const mainBots = ["okx", "futures", "stocks", "sniper"];
        
        (apiData.bots || []).forEach(bot => {
          if (!mainBots.includes(bot.name)) return;
          const totalTrades = safeNumber(bot.total_trades);
          if (totalTrades === 0) return;
          
          const wins = safeNumber(bot.wins);
          const losses = safeNumber(bot.losses);
          const closedTrades = wins + losses;
          let bestReturn = 0;
          trades.forEach(trade => {
            if (trade.bot === bot.name) {
              bestReturn = Math.max(bestReturn, safeNumber(trade.pnl_percent));
            }
          });
          
          botStats[bot.name] = {
            total_trades: totalTrades,
            wins, losses,
            win_rate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
            best_return: bestReturn,
          };
        });
        
        setData({
          trades,
          summary,
          botStats,
          loading: false,
          error: null,
          lastUpdate: new Date()
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setData(prev => ({ ...prev, loading: false, error: "Failed to fetch data" }));
    }
  }, []);

  // Listen for live trades via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const unsubscribe = socket.onTrade((trade) => {
      console.log("[PublicDashboard] Live trade received:", trade);
      setData(prev => ({
        ...prev,
        trades: [trade, ...prev.trades].slice(0, 200),
        lastUpdate: new Date()
      }));
    });
    
    return unsubscribe;
  }, [socket, isConnected]);

  // Initial fetch and periodic refresh (fallback)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ... (rest of the component remains the same, but add connection status)
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                IMALI
              </Link>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span>{isConnected ? 'Live' : 'Polling'}</span>
              <span>•</span>
              <span>{activeBots} active bots</span>
              <Link to="/signup" className="px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-medium">
                Join
              </Link>
            </div>
          </div>
        </div>
      </header>
      {/* Rest of the component... */}
    </div>
  );
}
