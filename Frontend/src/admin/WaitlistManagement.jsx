// src/admin/WaitlistManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';

export default function WaitlistManagement({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    activated: 0,
    byTier: {}
  });

  const fetchWaitlist = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/waitlist');
      setWaitlist(data.waitlist || []);
      
      // Calculate stats
      const waiting = data.waitlist?.filter(w => w.status === 'waiting') || [];
      const activated = data.waitlist?.filter(w => w.status === 'activated') || [];
      const byTier = {};
      data.waitlist?.forEach(w => {
        byTier[w.tier] = (byTier[w.tier] || 0) + 1;
      });
      
      setStats({
        total: data.waitlist?.length || 0,
        waiting: waiting.length,
        activated: activated.length,
        byTier
      });
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchWaitlist();
    const interval = setInterval(fetchWaitlist, 30000);
    return () => clearInterval(interval);
  }, [fetchWaitlist]);

  const handleActivate = async (email) => {
    try {
      await handleAction(`/api/admin/waitlist/activate/${encodeURIComponent(email)}`, 'POST', {}, 'Activate');
      fetchWaitlist();
      showToast(`User ${email} activated`, 'success');
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
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
            <span>⏳</span> Waitlist Management
          </h3>
          <p className="text-sm text-white/50">Manage user waitlist and early access</p>
        </div>
        <button
          onClick={fetchWaitlist}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Waiting</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.waiting}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Activated</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.activated}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">By Tier</div>
          <div className="text-sm font-medium text-purple-400 mt-1">
            {Object.entries(stats.byTier).map(([tier, count]) => (
              <span key={tier} className="mr-2">{tier}: {count}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {waitlist.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                    No waitlist entries found
                  </td>
                </tr>
              ) : (
                waitlist.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{entry.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        entry.tier === 'elite' ? 'bg-purple-500/20 text-purple-300' :
                        entry.tier === 'pro' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {entry.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">#{entry.position}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        entry.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-300' :
                        entry.status === 'activated' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === 'waiting' && (
                        <button
                          onClick={() => handleActivate(entry.email)}
                          className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30"
                          disabled={busyAction}
                        >
                          Activate
                        </button>
                      )}
                    </td>
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
