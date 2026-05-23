// src/admin/SystemHealth.jsx
import React, { useState, useEffect, useCallback } from 'react';

export default function SystemHealth({ apiBase, showToast, handleAction, busyAction }) {
  const [health, setHealth] = useState({
    status: 'checking',
    services: {},
    system: {},
    metrics: {},
    timestamp: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      
      // Use public fetch instead of adminFetch (no auth required)
      const baseUrl = apiBase || 'https://api.imali-defi.com';
      const response = await fetch(`${baseUrl}/api/health/detailed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setHealth({
          status: data.status || 'unknown',
          services: data.services || {},
          system: data.system || {},
          metrics: data.metrics || {},
          timestamp: data.timestamp || new Date().toISOString()
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      setError(error.message);
      
      // Set fallback data
      setHealth({
        status: 'unavailable',
        services: {
          api: 'unreachable',
          database: 'unknown',
          email: 'unknown'
        },
        system: {},
        metrics: {},
        timestamp: new Date().toISOString()
      });
      
      if (showToast) {
        showToast('Failed to fetch system health: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const getStatusColor = (status) => {
    const statusStr = String(status || '').toLowerCase();
    const healthyStatuses = ['healthy', 'connected', 'configured', 'enabled', 'active', 'ok'];
    const unhealthyStatuses = ['unavailable', 'disconnected', 'disabled', 'not configured', 'error', 'unreachable'];
    
    if (healthyStatuses.includes(statusStr)) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
    if (unhealthyStatuses.includes(statusStr)) {
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  };

  const getStatusIcon = (status) => {
    const statusStr = String(status || '').toLowerCase();
    if (statusStr === 'healthy' || statusStr === 'connected') return '✅';
    if (statusStr === 'unavailable' || statusStr === 'disconnected') return '❌';
    if (statusStr === 'configured') return '🔧';
    if (statusStr === 'active') return '⚡';
    return '⚠️';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && health.status === 'unavailable') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🔌</div>
        <h4 className="text-lg font-semibold text-red-400">Unable to Connect</h4>
        <p className="text-sm text-white/50 mt-2">Cannot reach the health check endpoint. The API may be down or unreachable.</p>
        <button
          onClick={fetchHealth}
          className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🏥</span> System Health Monitor
          </h3>
          <p className="text-sm text-white/50">Real-time system status and service health</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
            health.status === 'healthy' 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
              : health.status === 'degraded'
              ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}>
            {health.status === 'healthy' ? '● All Systems Operational' : 
             health.status === 'degraded' ? '⚠️ Degraded Performance' : 
             '○ Issues Detected'}
          </span>
          <button
            onClick={fetchHealth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            disabled={busyAction}
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Last Update */}
      {health.timestamp && (
        <div className="text-xs text-white/30">
          Last updated: {new Date(health.timestamp).toLocaleString()}
        </div>
      )}

      {/* Metrics Summary Cards */}
      {health.metrics && Object.keys(health.metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {health.metrics.total_users !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{health.metrics.total_users.toLocaleString()}</div>
              <div className="text-xs text-white/50">Total Users</div>
            </div>
          )}
          {health.metrics.total_trades !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{health.metrics.total_trades.toLocaleString()}</div>
              <div className="text-xs text-white/50">Total Trades</div>
            </div>
          )}
          {health.metrics.active_bots_24h !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">{health.metrics.active_bots_24h}</div>
              <div className="text-xs text-white/50">Active Bots (24h)</div>
            </div>
          )}
          {health.system?.uptime_seconds !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {Math.floor(health.system.uptime_seconds / 3600)}h
              </div>
              <div className="text-xs text-white/50">Uptime</div>
            </div>
          )}
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(health.services || {}).map(([service, status]) => {
          // Handle nested service objects (like bots)
          if (typeof status === 'object' && status !== null && !Array.isArray(status)) {
            return Object.entries(status).map(([subService, subStatus]) => (
              <div key={`${service}-${subService}`} className={`border rounded-xl p-4 ${getStatusColor(subStatus)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">
                    {getStatusIcon(subStatus)} {subService.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-black/20">
                    {typeof subStatus === 'string' ? subStatus : 'unknown'}
                  </span>
                </div>
                <div className="text-xs opacity-75 text-white/50">
                  {service}
                </div>
              </div>
            ));
          }
          
          // Handle simple service status (skip latency as it's a number)
          if (service === 'database_latency_ms') return null;
          
          return (
            <div key={service} className={`border rounded-xl p-4 ${getStatusColor(status)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {getStatusIcon(status)} {service.replace(/_/g, ' ')}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-black/20">
                  {typeof status === 'string' ? status : 'unknown'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Info */}
      {health.system && Object.keys(health.system).length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h4 className="font-semibold mb-4">System Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {health.system.node_version && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Node Version</span>
                  <span className="font-mono">{health.system.node_version}</span>
                </div>
              )}
              {health.system.platform && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Platform</span>
                  <span className="font-mono">{health.system.platform}</span>
                </div>
              )}
              {health.system.environment && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Environment</span>
                  <span className="font-mono">{health.system.environment}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {health.system.memory_usage && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Memory Usage</span>
                  <span className="font-mono">{health.system.memory_usage}</span>
                </div>
              )}
              {health.system.uptime_seconds && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Uptime</span>
                  <span className="font-mono text-emerald-400">
                    {Math.floor(health.system.uptime_seconds / 3600)}h {Math.floor((health.system.uptime_seconds % 3600) / 60)}m
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {Object.keys(health.services).length === 0 && !error && (
        <div className="text-center py-8 text-white/30">
          <div className="text-4xl mb-2">📡</div>
          <p className="text-sm">Waiting for health data...</p>
        </div>
      )}
    </div>
  );
}
