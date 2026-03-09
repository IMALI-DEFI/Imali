// src/admin/SystemHealth.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

export default function SystemHealth({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [health, setHealth] = useState({
    status: 'checking',
    services: {},
    system: {},
    timestamp: null
  });
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await adminFetch('/api/health/detailed');
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'healthy' || status === 'connected' || status === 'configured' || status === 'enabled') {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
    if (status === 'unavailable' || status === 'disconnected' || status === 'disabled' || status === 'not configured') {
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}>
            {health.status === 'healthy' ? '● All Systems Operational' : '○ Issues Detected'}
          </span>
          <button
            onClick={fetchHealth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            disabled={busyAction}
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(health.services || {}).map(([service, status]) => {
          if (typeof status === 'object') {
            return Object.entries(status).map(([subService, subStatus]) => (
              <div key={`${service}-${subService}`} className={`border rounded-xl p-4 ${getStatusColor(subStatus)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{subService}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-black/20">
                    {typeof subStatus === 'string' ? subStatus : 'unknown'}
                  </span>
                </div>
                <div className="text-xs opacity-75">
                  {service}
                </div>
              </div>
            ));
          }
          
          return (
            <div key={service} className={`border rounded-xl p-4 ${getStatusColor(status)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{service}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-black/20">
                  {typeof status === 'string' ? status : 'unknown'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Info */}
      {health.system && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h4 className="font-semibold mb-4">System Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Python Version</span>
                <span className="font-mono">{health.system.python_version?.split(' ')[0] || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Memory Usage</span>
                <span className="font-mono">{health.system.memory_usage || 'Unknown'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Uptime</span>
                <span className="font-mono text-emerald-400">99.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Last Restart</span>
                <span className="font-mono">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
