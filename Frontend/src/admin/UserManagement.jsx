// src/admin/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';

export default function UserManagement({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    premium: 0,
    newToday: 0
  });

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/users');
      setUsers(data.users || []);
      
      // Calculate stats
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      
      setStats({
        total: data.users?.length || 0,
        active: data.users?.filter(u => u.tradingEnabled).length || 0,
        premium: data.users?.filter(u => u.tier !== 'starter').length || 0,
        newToday: data.users?.filter(u => new Date(u.createdAt) >= today).length || 0
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleUpdateTier = async (userId, newTier) => {
    try {
      await handleAction(`/api/admin/users/${userId}/tier`, 'PATCH', { tier: newTier }, 'Update Tier');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  };

  const handleToggleTrading = async (userId, enabled) => {
    try {
      await handleAction(`/api/admin/users/${userId}/trading`, 'POST', { enabled }, 'Toggle Trading');
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle trading:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.id?.toLowerCase().includes(search.toLowerCase())
  );

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
            <span>👥</span> User Management
          </h3>
          <p className="text-sm text-white/50">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          disabled={busyAction}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Users</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Active Traders</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Premium Users</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.premium}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">New Today</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.newToday}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <input
          type="text"
          placeholder="Search by email or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-xs text-white/40">{user.id?.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.tier === 'elite' ? 'bg-purple-500/20 text-purple-300' :
                        user.tier === 'pro' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${
                        user.tradingEnabled ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.tradingEnabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {user.tradingEnabled ? 'Trading' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.totalTrades || 0}</td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => handleUpdateTier(user.id, e.target.value)}
                          value={user.tier}
                          className="text-xs bg-black/40 border border-white/10 rounded px-2 py-1"
                          disabled={busyAction}
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="elite">Elite</option>
                        </select>
                        <button
                          onClick={() => handleToggleTrading(user.id, !user.tradingEnabled)}
                          className={`text-xs px-2 py-1 rounded ${
                            user.tradingEnabled 
                              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                          disabled={busyAction}
                        >
                          {user.tradingEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
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
