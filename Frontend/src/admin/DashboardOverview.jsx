// src/admin/DashboardOverview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Safe render helper to prevent object rendering errors
const safeRender = (value, fallback = '—') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (React.isValidElement(value)) return value;
  if (typeof value === 'object') {
    // If it's an object with email, render email
    if (value.email) return value.email;
    // If it's an object with name, render name
    if (value.name) return value.name;
    // If it's an object with message, render message
    if (value.message) return value.message;
    // Otherwise return fallback
    return fallback;
  }
  return fallback;
};

// Safe number formatter
const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export default function DashboardOverview({ apiBase, showToast, handleAction, busyAction }) {
  const [metrics, setMetrics] = useState({
    users: { total: 0, active: 0, new: 0 },
    trading: { totalTrades: 0, volume24h: 0, activeBots: 0 },
    revenue: { total: 0, fees24h: 0, pending: 0 },
    system: { uptime: '99.9%', status: 'healthy' }
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [authError, setAuthError] = useState(false);

  const getAuthToken = useCallback(() => {
    try {
      return localStorage.getItem('imali_token');
    } catch (e) {
      console.error('[DashboardOverview] Failed to get token:', e);
      return null;
    }
  }, []);

  const isTokenValid = useCallback(() => {
    const token = getAuthToken();
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }, [getAuthToken]);

  const fetchMetrics = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/admin/metrics`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        const metricsData = data.data || data;
        
        // Safely extract values with fallbacks
        const totalUsers = safeNumber(metricsData.users?.total || metricsData.totalUsers || 0);
        const activeUsers = safeNumber(metricsData.users?.active || metricsData.activeUsers || 0);
        const newUsers = safeNumber(metricsData.users?.new || metricsData.newUsers || 0);
        const totalTrades = safeNumber(metricsData.trades?.total || metricsData.totalTrades || 0);
        const volume24h = safeNumber(metricsData.trading?.volume24h || metricsData.volume24h || 0);
        const activeBots = safeNumber(metricsData.bots?.active || metricsData.activeBots || 0);
        const totalRevenue = safeNumber(metricsData.pnl?.total || metricsData.totalRevenue || metricsData.totalPnl || 0);
        const fees24h = safeNumber(metricsData.revenue?.today || metricsData.fees24h || metricsData.revenue?.fees24h || 0);
        const pendingWithdrawals = safeNumber(metricsData.revenue?.pending_withdrawals || metricsData.pendingWithdrawals || 0);
        const uptime = safeRender(metricsData.system?.uptime || metricsData.uptime || '99.9%');
        const systemStatus = safeRender(metricsData.system?.status || metricsData.status || 'healthy');
        
        setMetrics({
          users: {
            total: totalUsers,
            active: activeUsers,
            new: newUsers
          },
          trading: {
            totalTrades: totalTrades,
            volume24h: volume24h,
            activeBots: activeBots
          },
          revenue: {
            total: totalRevenue,
            fees24h: fees24h,
            pending: pendingWithdrawals
          },
          system: {
            uptime: uptime,
            status: systemStatus
          }
        });
        setAuthError(false);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      if (!authError) {
        showToast?.('Failed to fetch metrics', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAuthToken, showToast, authError]);

  const fetchRecentActivity = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/api/admin/audit-logs?limit=10`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        setAuthError(true);
        return;
      }
      
      const data = await response.json();
      if (data && data.success) {
        const responseData = data.data || data;
        const logs = responseData.logs || [];
        
        // Safely map logs with safeRender for each property
        const safeLogs = logs.map(log => ({
          ...log,
          action: safeRender(log.action, 'info'),
          details: safeRender(log.details, safeRender(log.action, 'Activity')),
          user_email: safeRender(log.user_email, safeRender(log.user_id, 'System')),
          created_at: log.created_at || null
        }));
        
        setRecentActivity(safeLogs);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  }, [apiBase, getAuthToken]);

  // Check token validity on mount
  useEffect(() => {
    if (!isTokenValid()) {
      setAuthError(true);
      setLoading(false);
    }
  }, [isTokenValid]);

  // Initial fetch
  useEffect(() => {
    if (!authError && isTokenValid()) {
      fetchMetrics();
      fetchRecentActivity();
    } else {
      setLoading(false);
    }
  }, [fetchMetrics, fetchRecentActivity, authError, isTokenValid]);

  // Polling interval
  useEffect(() => {
    if (authError || !isTokenValid()) return;
    
    const interval = setInterval(() => {
      fetchMetrics();
      fetchRecentActivity();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchRecentActivity, authError, isTokenValid]);

  // Show access denied if auth error
  if (authError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="mb-4 text-6xl">🔒</div>
        <h3 className="mb-2 text-xl font-semibold text-white">Authentication Required</h3>
        <p className="text-white/60">Please log in to view the admin dashboard.</p>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>✨</span> Admin Dashboard Overview
        </h3>
        <p className="text-sm text-white/50">Key metrics and platform health at a glance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">👥</span>
            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
              +{safeNumber(metrics.users.new)} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-blue-400">{safeNumber(metrics.users.total).toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Users</div>
            <div className="text-xs text-white/30 mt-1">{safeNumber(metrics.users.active).toLocaleString()} active</div>
          </div>
        </div>

        {/* Trading Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
              {safeNumber(metrics.trading.activeBots)} bots
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-emerald-400">{safeNumber(metrics.trading.totalTrades).toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Trades</div>
            <div className="text-xs text-white/30 mt-1">${safeNumber(metrics.trading.volume24h).toLocaleString()} 24h</div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">💰</span>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              ${safeNumber(metrics.revenue.fees24h).toLocaleString()} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-purple-400">${safeNumber(metrics.revenue.total).toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Revenue</div>
            <div className="text-xs text-white/30 mt-1">${safeNumber(metrics.revenue.pending).toLocaleString()} pending</div>
          </div>
        </div>

        {/* System Card */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⚙️</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              safeRender(metrics.system.status) === 'healthy' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {safeRender(metrics.system.status)}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-amber-400">{safeRender(metrics.system.uptime)}</div>
            <div className="text-sm text-white/50">System Uptime</div>
            <div className="text-xs text-white/30 mt-1">All systems operational</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin?tab=users" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-sm font-medium">Manage Users</div>
        </Link>
        <Link to="/admin?tab=withdrawals" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-sm font-medium">Withdrawals</div>
          {safeNumber(metrics.revenue.pending) > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              {safeNumber(metrics.revenue.pending)} pending
            </span>
          )}
        </Link>
        <Link to="/admin?tab=automation" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">🤖</div>
          <div className="text-sm font-medium">Automation</div>
        </Link>
        <Link to="/admin?tab=audit" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-sm font-medium">Audit Logs</div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Recent Activity
        </h4>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className={`text-xs px-2 py-1 rounded ${
                  safeRender(log.action).toLowerCase().includes('error') || safeRender(log.action).toLowerCase().includes('fail')
                    ? 'bg-red-500/20 text-red-300'
                    : safeRender(log.action).toLowerCase() === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {safeRender(log.action, 'info')}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{safeRender(log.details, safeRender(log.action, 'Activity'))}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : new Date().toLocaleString()} • {safeRender(log.user_email, safeRender(log.user_id, 'System'))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
