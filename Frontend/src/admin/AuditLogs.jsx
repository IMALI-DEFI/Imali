// src/admin/AuditLogs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

export default function AuditLogs({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    start_date: '',
    end_date: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    unique_users: 0,
    actions: {}
  });

  const fetchLogs = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.user_id) queryParams.append('user_id', filters.user_id);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      
      const data = await adminFetch(`/api/admin/audit-logs?${queryParams}`);
      setLogs(data.logs || []);
      
      // Calculate stats
      const uniqueUsers = new Set(data.logs?.map(l => l.user_id)).size;
      const actionCounts = {};
      data.logs?.forEach(l => {
        actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
      });
      
      setStats({
        total: data.logs?.length || 0,
        unique_users: uniqueUsers,
        actions: actionCounts
      });
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, filters]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ user_id: '', action: '', start_date: '', end_date: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📋</span> Audit Logs
          </h3>
          <p className="text-sm text-white/50">System activity and audit trail</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Events</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Unique Users</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.unique_users}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Unique Actions</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{Object.keys(stats.actions).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Filters</h4>
          <button
            onClick={clearFilters}
            className="text-xs text-white/40 hover:text-white/60"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="User ID"
            value={filters.user_id}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Action"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-white/40">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{log.user_email || 'System'}</div>
                      <div className="text-xs text-white/40">{log.user_id?.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.action.includes('error') ? 'bg-red-500/20 text-red-300' :
                        log.action.includes('create') ? 'bg-emerald-500/20 text-emerald-300' :
                        log.action.includes('update') ? 'bg-blue-500/20 text-blue-300' :
                        log.action.includes('delete') ? 'bg-amber-500/20 text-amber-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 50) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
