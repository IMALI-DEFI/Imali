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
    if (value.email) return value.email;
    if (value.name) return value.name;
    if (value.message) return value.message;
    return fallback;
  }
  return fallback;
};

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

const formatCurrency = (value) => {
  const num = safeNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-US').format(safeNumber(value));
};

const formatPercent = (value) => {
  const num = safeNumber(value);
  return `${num.toFixed(1)}%`;
};

export default function DashboardOverview({ apiBase, showToast, handleAction, busyAction }) {
  const [metrics, setMetrics] = useState({
    users: { total: 0, active: 0, new: 0, enterprise: 0, pendingEnterprise: 0 },
    trading: { totalTrades: 0, volume24h: 0, activeBots: 0, winRate: 0 },
    revenue: { total: 0, fees24h: 0, pending: 0 },
    system: { uptime: '99.9%', status: 'healthy' },
    pnl: { last30Days: 0 },
    enterprise: {
      totalOrganizations: 0,
      totalMembers: 0,
      customStrategies: 0,
      activeOrganizations: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [authError, setAuthError] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activityLimit, setActivityLimit] = useState(10);
  const [pnlDetails, setPnlDetails] = useState(null);
  const [showPnlDetails, setShowPnlDetails] = useState(false);
  const [enterpriseDetails, setEnterpriseDetails] = useState(null);
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);

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

  // Fetch PNL details for last 30 days
  const fetchPnlDetails = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/api/admin/pnl-details?days=30`, {
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
        setPnlDetails(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch PNL details:', error);
    }
  }, [apiBase, getAuthToken]);

  // Fetch enterprise details
  const fetchEnterpriseDetails = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/api/admin/enterprise/details`, {
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
        setEnterpriseDetails(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch enterprise details:', error);
    }
  }, [apiBase, getAuthToken]);

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
        
        setMetrics({
          users: {
            total: safeNumber(metricsData.users?.total || 0),
            active: safeNumber(metricsData.users?.active || 0),
            new: safeNumber(metricsData.users?.new || 0),
            enterprise: safeNumber(metricsData.users?.enterprise || 0),
            pendingEnterprise: safeNumber(metricsData.users?.pendingEnterprise || 0),
          },
          trading: {
            totalTrades: safeNumber(metricsData.trades?.total || 0),
            volume24h: safeNumber(metricsData.trading?.volume24h || 0),
            activeBots: safeNumber(metricsData.bots?.active || 0),
            winRate: safeNumber(metricsData.trading?.winRate || 0),
          },
          revenue: {
            total: safeNumber(metricsData.pnl?.total || 0),
            fees24h: safeNumber(metricsData.revenue?.today || 0),
            pending: safeNumber(metricsData.revenue?.pending_withdrawals || 0),
          },
          system: {
            uptime: safeRender(metricsData.system?.uptime || '99.9%'),
            status: safeRender(metricsData.system?.status || 'healthy'),
          },
          pnl: {
            last30Days: safeNumber(metricsData.pnl?.last30Days || 0),
          },
          enterprise: {
            totalOrganizations: safeNumber(metricsData.enterprise?.totalOrganizations || 0),
            totalMembers: safeNumber(metricsData.enterprise?.totalMembers || 0),
            customStrategies: safeNumber(metricsData.enterprise?.customStrategies || 0),
            activeOrganizations: safeNumber(metricsData.enterprise?.activeOrganizations || 0),
          },
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
      const limit = showAllActivity ? 100 : activityLimit;
      const response = await fetch(`${apiBase}/api/admin/audit-logs?limit=${limit}`, {
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
  }, [apiBase, getAuthToken, showAllActivity, activityLimit]);

  useEffect(() => {
    if (!isTokenValid()) {
      setAuthError(true);
      setLoading(false);
    }
  }, [isTokenValid]);

  useEffect(() => {
    if (!authError && isTokenValid()) {
      fetchMetrics();
      fetchRecentActivity();
      fetchPnlDetails();
      fetchEnterpriseDetails();
    } else {
      setLoading(false);
    }
  }, [fetchMetrics, fetchRecentActivity, fetchPnlDetails, fetchEnterpriseDetails, authError, isTokenValid]);

  useEffect(() => {
    if (authError || !isTokenValid()) return;
    
    const interval = setInterval(() => {
      fetchMetrics();
      fetchRecentActivity();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchRecentActivity, authError, isTokenValid]);

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

  const getPnlColor = (value) => {
    const num = safeNumber(value);
    if (num > 0) return 'text-emerald-400';
    if (num < 0) return 'text-red-400';
    return 'text-white/50';
  };

  const getPnlIcon = (value) => {
    const num = safeNumber(value);
    if (num > 0) return '📈';
    if (num < 0) return '📉';
    return '📊';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🏢</span> IMALI Owner Dashboard
        </h3>
        <p className="text-sm text-white/50">Complete platform oversight and enterprise management</p>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">👥</span>
            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
              +{formatNumber(metrics.users.new)} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-blue-400">{formatNumber(metrics.users.total)}</div>
            <div className="text-sm text-white/50">Total Users</div>
            <div className="text-xs text-white/30 mt-1">{formatNumber(metrics.users.active)} active</div>
            <div className="text-xs text-purple-400 mt-1">🏢 {formatNumber(metrics.users.enterprise)} enterprise</div>
            {metrics.users.pendingEnterprise > 0 && (
              <Link to="/admin/enterprise-requests" className="text-xs text-amber-400 hover:underline mt-1 inline-block">
                ⏳ {formatNumber(metrics.users.pendingEnterprise)} pending requests
              </Link>
            )}
          </div>
        </div>

        {/* Trading Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
              {formatNumber(metrics.trading.activeBots)} bots
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-emerald-400">{formatNumber(metrics.trading.totalTrades)}</div>
            <div className="text-sm text-white/50">Total Trades</div>
            <div className="text-xs text-white/30 mt-1">${formatNumber(metrics.trading.volume24h)} 24h volume</div>
            <div className="text-xs text-emerald-400 mt-1">🏆 Win Rate: {formatPercent(metrics.trading.winRate)}</div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">💰</span>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
              +{formatCurrency(metrics.revenue.fees24h)} today
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-purple-400">{formatCurrency(metrics.revenue.total)}</div>
            <div className="text-sm text-white/50">Total Revenue</div>
            <div className="text-xs text-white/30 mt-1">{formatCurrency(metrics.revenue.pending)} pending</div>
          </div>
        </div>

        {/* Enterprise Card */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl">🏢</span>
            <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full">
              Enterprise
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-purple-400">{formatNumber(metrics.enterprise.totalOrganizations)}</div>
            <div className="text-sm text-white/50">Organizations</div>
            <div className="text-xs text-white/30 mt-1">{formatNumber(metrics.enterprise.totalMembers)} total members</div>
            <div className="text-xs text-emerald-400 mt-1">📊 {formatNumber(metrics.enterprise.customStrategies)} custom strategies</div>
          </div>
        </div>
      </div>

      {/* PNL Section - Last 30 Days Only */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <span>📈</span> Platform PNL Performance
            </h4>
            <p className="text-xs text-white/40">Last 30 days overview</p>
          </div>
          <button
            onClick={() => setShowPnlDetails(!showPnlDetails)}
            className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
          >
            {showPnlDetails ? 'Hide Details' : 'View Details'}
            <span>{showPnlDetails ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Main PNL Display */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="text-5xl font-bold flex items-center gap-3">
              <span className="text-4xl">{getPnlIcon(metrics.pnl.last30Days)}</span>
              <span className={getPnlColor(metrics.pnl.last30Days)}>
                {formatCurrency(metrics.pnl.last30Days)}
              </span>
            </div>
            <div className="text-sm text-white/40 mt-2">Total PNL (Last 30 Days)</div>
          </div>
        </div>

        {/* PNL Details Expandable Section */}
        {showPnlDetails && pnlDetails && (
          <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40">Winning Trades</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {formatNumber(pnlDetails.winningTrades || 0)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40">Losing Trades</div>
                <div className="text-lg font-semibold text-red-400">
                  {formatNumber(pnlDetails.losingTrades || 0)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40">Win Rate</div>
                <div className="text-lg font-semibold text-cyan-400">
                  {formatPercent(pnlDetails.winRate || 0)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/40">Average PNL/Trade</div>
                <div className={`text-lg font-semibold ${getPnlColor(pnlDetails.avgPnl || 0)}`}>
                  {formatCurrency(pnlDetails.avgPnl || 0)}
                </div>
              </div>
            </div>
            <div className="text-xs text-white/30 italic">
              * Based on all closed trades in the last 30 days
            </div>
          </div>
        )}
      </div>

      {/* Enterprise Section */}
      <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <span>🏢</span> Enterprise Overview
            </h4>
            <p className="text-xs text-white/40">Organization and team metrics</p>
          </div>
          <Link to="/admin/enterprise-requests" className="text-sm text-purple-400 hover:text-purple-300">
            Manage Requests →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">🏢</div>
            <div className="text-2xl font-bold text-purple-400">{formatNumber(metrics.enterprise.totalOrganizations)}</div>
            <div className="text-xs text-white/40">Organizations</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">👥</div>
            <div className="text-2xl font-bold text-blue-400">{formatNumber(metrics.enterprise.totalMembers)}</div>
            <div className="text-xs text-white/40">Team Members</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-2xl font-bold text-emerald-400">{formatNumber(metrics.enterprise.customStrategies)}</div>
            <div className="text-xs text-white/40">Custom Strategies</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold text-cyan-400">{formatNumber(metrics.enterprise.activeOrganizations)}</div>
            <div className="text-xs text-white/40">Active Orgs</div>
          </div>
        </div>

        {metrics.users.pendingEnterprise > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⏳</span>
              <span className="text-sm text-amber-300">{formatNumber(metrics.users.pendingEnterprise)} pending enterprise requests</span>
            </div>
            <Link to="/admin/enterprise-requests" className="text-xs text-amber-400 hover:text-amber-300">
              Review Now →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link to="/admin?tab=users" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-sm font-medium">Users</div>
        </Link>
        <Link to="/admin?tab=enterprise" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">🏢</div>
          <div className="text-sm font-medium">Enterprise</div>
        </Link>
        <Link to="/admin?tab=withdrawals" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-sm font-medium">Withdrawals</div>
          {safeNumber(metrics.revenue.pending) > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              {formatNumber(metrics.revenue.pending)} pending
            </span>
          )}
        </Link>
        <Link to="/admin?tab=automation" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">🤖</div>
          <div className="text-sm font-medium">Automation</div>
        </Link>
        <Link to="/admin/enterprise-requests" className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-all">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-sm font-medium">Requests</div>
          {metrics.users.pendingEnterprise > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full mt-1 inline-block">
              {formatNumber(metrics.users.pendingEnterprise)}
            </span>
          )}
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold flex items-center gap-2">
            <span>📋</span> Recent Activity
          </h4>
          <div className="flex gap-2">
            <select
              value={activityLimit}
              onChange={(e) => setActivityLimit(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs"
            >
              <option value={10}>Last 10</option>
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
            <button
              onClick={() => setShowAllActivity(!showAllActivity)}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              {showAllActivity ? 'Show Less' : 'Show All'}
            </button>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.slice(0, showAllActivity ? undefined : activityLimit).map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  safeRender(log.action).toLowerCase().includes('error') || safeRender(log.action).toLowerCase().includes('fail')
                    ? 'bg-red-500/20 text-red-300'
                    : safeRender(log.action).toLowerCase() === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {safeRender(log.action, 'info')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{safeRender(log.details, safeRender(log.action, 'Activity'))}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : new Date().toLocaleString()} • {safeRender(log.user_email, safeRender(log.user_id, 'System'))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="text-sm font-medium">System Status</div>
              <div className="text-xs text-white/40">All systems operational</div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${
              safeRender(metrics.system.status) === 'healthy' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {safeRender(metrics.system.status)}
            </div>
            <div className="text-xs text-white/40">Uptime: {safeRender(metrics.system.uptime)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
