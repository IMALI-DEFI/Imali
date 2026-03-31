// src/pages/Pricing.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";

// ... (keep all imports and helper functions)

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { liveStats, isConnected } = useSocket();

  const [promoData, setPromoData] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    active: true,
    loading: true,
    feePercent: 5,
    durationDays: 90,
    thresholdPercent: 3,
  });

  // Fetch promo status from endpoint
  useEffect(() => {
    const fetchPromoStatus = async () => {
      try {
        const response = await axios.get(PROMO_STATUS_URL, { timeout: 6000 });
        if (response.data?.success) {
          const promo = response.data.data;
          const limit = Number(promo.limit) || 50;
          const claimed = Number(promo.claimed) || 0;
          
          setPromoData({
            limit,
            claimed,
            spotsLeft: Math.max(0, limit - claimed),
            active: claimed < limit,
            loading: false,
            feePercent: Number(promo.fee_percent) || 5,
            durationDays: Number(promo.duration_days) || 90,
            thresholdPercent: Number(promo.threshold_percent) || 3,
          });
        }
      } catch (error) {
        console.error("Failed to fetch promo status:", error);
        setPromoData(prev => ({ ...prev, loading: false }));
      }
    };
    
    fetchPromoStatus();
  }, []);

  // Social proof with live stats
  const activeUsersText = useMemo(() => {
    if (liveStats.activeBots > 0) {
      return `${liveStats.activeBots} active traders right now`;
    }
    return "Join our growing community";
  }, [liveStats.activeBots]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Live stats banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span>{isConnected ? 'Live Data' : 'Updates every 30s'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/70">💰 ${Math.abs(liveStats.totalPnl).toFixed(0)}K total profits</span>
            <span className="text-white/70">🤖 {activeUsersText}</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16">
        {/* Header with live badge */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-mono">LIVE PRICING</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-pink-500 text-transparent bg-clip-text">
            Simple, Clear Pricing
          </h1>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
            Choose the plan that fits your trading style. Start with paper trading, 
            upgrade as you grow. Cancel anytime.
          </p>
        </div>

        {/* Rest of the pricing component remains the same... */}
      </div>
    </div>
  );
}
