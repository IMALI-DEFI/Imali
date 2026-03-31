// src/pages/admin/AdminPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import BotAPI from "../utils/BotAPI";

// ... (keep all imports and constants)

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { socket, isConnected, liveStats, lastTrade } = useSocket();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState("");
  const [activeTabKey, setActiveTabKey] = useState("overview");
  const [results, setResults] = useState("Click any action to load data...");
  const [busyAction, setBusyAction] = useState("");
  const [liveTrades, setLiveTrades] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 0,
    memory: 0,
    active_users: 0,
    tps: 0
  });
  const [stats, setStats] = useState({
    users: "---",
    health: "---",
    metrics: "---",
  });

  const token = BotAPI.getToken();
  const normalizedEmail = useMemo(() => String(user?.email || "").trim().toLowerCase(), [user?.email]);
  const hasAdminAccess = useMemo(() => user?.is_admin === true || ADMIN_EMAILS.includes(normalizedEmail), [user?.is_admin, normalizedEmail]);

  // Subscribe to system metrics via Socket.IO
  useEffect(() => {
    if (!socket || !isConnected || !hasAdminAccess) return;
    
    socket.subscribeSystemMetrics();
    
    const unsubscribeMetric = socket.onSystemMetric((metric) => {
      setSystemMetrics(metric);
      setStats(prev => ({
        ...prev,
        metrics: metric.active_users || prev.metrics
      }));
    });
    
    const unsubscribeTrade = socket.onTrade((trade) => {
      setLiveTrades(prev => [trade, ...prev].slice(0, 50));
    });
    
    return () => {
      unsubscribeMetric();
      unsubscribeTrade();
    };
  }, [socket, isConnected, hasAdminAccess]);

  // Check admin access
  useEffect(() => {
    if (loading) return;
    if (!user || !token) {
      setAccessError("Please log in first.");
      setCheckingAccess(false);
      return;
    }
    if (!hasAdminAccess) {
      setAccessError("You do not have admin access.");
      setCheckingAccess(false);
      return;
    }
    setCheckingAccess(false);
    setAccessError("");
  }, [loading, user, token, hasAdminAccess]);

  // ... (keep existing runRequest, loadUsers, etc.)

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-gray-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-4 text-6xl">🔒</div>
          <h1 className="mb-2 text-2xl font-bold">Admin Only</h1>
          <p className="mb-6 text-white/65">{accessError || "You do not have admin access."}</p>
          <button onClick={() => navigate("/dashboard")} className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <div className="max-w-7xl mx-auto p-8">
        {/* Connection Status */}
        <div className="mb-4 flex justify-end">
          <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1 rounded-full">
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-white/70">{isConnected ? 'Live admin feed' : 'Polling mode'}</span>
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
        <p className="mb-6 text-gray-400">
          Logged in as: <strong className="text-green-400">{user?.email || "wayne@imali-defi.com"}</strong>
          {isConnected && <span className="ml-2 text-xs text-green-400">● Real-time</span>}
        </p>

        <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/20 p-4">
          <p className="text-green-300">✅ Admin privileges: <strong>ACTIVE</strong></p>
        </div>

        {/* System Metrics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <SummaryCard title="Active Users" value={systemMetrics.active_users} color="text-blue-400" />
          <SummaryCard title="CPU Usage" value={`${systemMetrics.cpu}%`} color="text-green-400" />
          <SummaryCard title="Memory" value={`${systemMetrics.memory} MB`} color="text-purple-400" />
          <SummaryCard title="TPS" value={systemMetrics.tps} color="text-orange-400" />
        </div>

        {/* Live Trades Monitor */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>📊</span> Live Trades Monitor
              {isConnected && <span className="text-xs text-green-400 animate-pulse">● LIVE</span>}
            </h2>
            <span className="text-xs text-white/50">{liveTrades.length} trades in last 5 min</span>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {liveTrades.length > 0 ? (
              liveTrades.map((trade, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono">{trade.symbol}</span>
                    <span className={trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-white/70'}>
                      {trade.pnl ? (trade.pnl > 0 ? '+' : '') + trade.pnl.toFixed(2) : 'Open'}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/50 mt-1">
                    <span>{trade.side?.toUpperCase()} @ ${trade.price}</span>
                    <span>{timeAgo(trade.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-white/50 py-8">Waiting for live trades...</p>
            )}
          </div>
        </div>

        {/* Rest of the admin panel content */}
        {/* ... */}
      </div>
    </div>
  );
}
