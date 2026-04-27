// src/admin/DashboardOverview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

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
      if (data.success) {
        const metricsData = data.data || data;
        setMetrics({
          users: {
            total: metricsData.users?.total || 0,
            active: metricsData.users?.active || 0,
            new: metricsData.users?.new || 0
          },
          trading: {
            totalTrades: metricsData.trades?.total || 0,
            volume24h: metricsData.trading?.volume24h || 0,
            activeBots: metricsData.bots?.active || 0
          },
          revenue: {
            total: metricsData.pnl?.total || 0,
            fees24h: metricsData.revenue?.today || 0,
            pending: metricsData.revenue?.pending_withdrawals || 0
          },
          system: {
            uptime: metricsData.system?.uptime || '99.9%',
            status: metricsData.system?.status || 'healthy'
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
      if (data.success) {
        const responseData = data.data || data;
        setRecentActivity(responseData.logs || []);
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
              +{metrics.users.new} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-blue-400">{metrics.users.total.toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Users</div>
            <div className="text-xs text-white/30 mt-1">{metrics.users.active.toLocaleString()} active</div>
          </div>
        </div>

        {/* Trading Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
              {metrics.trading.activeBots} bots
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-emerald-400">{metrics.trading.totalTrades.toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Trades</div>
            <div className="text-xs text-white/30 mt-1">${metrics.trading.volume24h.toLocaleString()} 24h</div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">💰</span>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              ${metrics.revenue.fees24h.toLocaleString()} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-purple-400">${metrics.revenue.total.toLocaleString()}</div>
            <div className="text-sm text-white/50">Total Revenue</div>
            <div className="text-xs text-white/30 mt-1">${metrics.revenue.pending.toLocaleString()} pending</div>
          </div>
        </div>

        {/* System Card */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">⚙️</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              metrics.system.status === 'healthy' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {metrics.system.status}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-amber-400">{metrics.system.uptime}</div>
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
          {metrics.revenue.pending > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              {metrics.revenue.pending} pending
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
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className={`text-xs px-2 py-1 rounded ${
                  log.action === 'error' || log.action?.toLowerCase().includes('fail') 
                    ? 'bg-red-500/20 text-red-300'
                    : log.action === 'warning' 
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {log.action || 'info'}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{log.details || log.action || 'Activity'}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : new Date().toLocaleString()} • {log.user_email || log.user_id || 'System'}
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
