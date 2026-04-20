// src/admin/UserManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaKey, 
  FaBan, 
  FaCheckCircle, 
  FaSpinner,
  FaEye,
  FaTimes,
  FaSave,
  FaUserGraduate,
  FaDollarSign,
  FaChartLine,
  FaEnvelope,
  FaCalendar,
  FaCrown
} from "react-icons/fa";

export default function UserManagement({ apiBase, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({
    total_pnl: 0,
    total_trades: 0,
    win_rate: 0
  });

  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/users?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data?.users || []);
        setTotalPages(data.data?.pagination?.totalPages || 1);
        setTotalUsers(data.data?.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, apiBase, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
    
    // Fetch user's trading stats
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSelectedUser(data.data.user);
        const trades = data.data.trades || [];
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
        const winning = trades.filter(t => t.pnl_usd > 0).length;
        const totalTrades = trades.length;
        setStats({
          total_pnl: totalPnl,
          total_trades: totalTrades,
          win_rate: totalTrades > 0 ? (winning / totalTrades) * 100 : 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      tier: user.tier,
      trading_enabled: user.trading_enabled,
      is_admin: user.is_admin,
      portfolio_value: user.portfolio_value,
      strategy: user.strategy
    });
    setShowEditModal(true);
  };

  const updateUser = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (data.success) {
        showToast("User updated successfully", "success");
        setShowEditModal(false);
        fetchUsers();
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (error) {
      showToast("Failed to update user", "error");
    } finally {
      setUpdating(false);
    }
  };

  const updateUserTier = async (userId, newTier) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify({ tier: newTier })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Tier updated to ${newTier}`, "success");
        fetchUsers();
      } else {
        showToast(data.error || "Failed to update tier", "error");
      }
    } catch (error) {
      showToast("Failed to update tier", "error");
    }
  };

  const revokeApiKey = async (userId) => {
    if (!confirm("Revoke this user's API key? They will need to generate a new one.")) return;
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}/revoke-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast("API key revoked", "success");
        fetchUsers();
      } else {
        showToast(data.error || "Failed to revoke API key", "error");
      }
    } catch (error) {
      showToast("Failed to revoke API key", "error");
    }
  };

  const toggleTrading = async (userId, enabled) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify({ trading_enabled: enabled })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Trading ${enabled ? 'enabled' : 'disabled'}`, "success");
        fetchUsers();
      }
    } catch (error) {
      showToast("Failed to update trading status", "error");
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`Delete user ${userEmail}? This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast("User deleted", "success");
        fetchUsers();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (error) {
      showToast("Failed to delete user", "error");
    } finally {
      setDeleting(false);
    }
  };

  const getTierBadge = (tier) => {
    const colors = {
      starter: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      pro: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      elite: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      bundle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    };
    return colors[tier] || colors.starter;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-10 pr-3 text-white placeholder:text-white/30"
            />
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 hover:bg-emerald-500">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); fetchUsers(); }}
              className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/5"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Total Users</div>
          <div className="text-xl font-bold text-white">{totalUsers}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Active Traders</div>
          <div className="text-xl font-bold text-white">
            {users.filter(u => u.trading_enabled).length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Admins</div>
          <div className="text-xl font-bold text-white">
            {users.filter(u => u.is_admin).length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Tier</th>
              <th className="px-4 py-3 text-center">Trading</th>
              <th className="px-4 py-3 text-right">Portfolio</th>
              <th className="px-4 py-3 text-right">Trades</th>
              <th className="px-4 py-3 text-right">Total PnL</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-white/50">No users found</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-400">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-white/40">{user.id?.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${getTierBadge(user.tier)}`}>
                      {user.tier?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.trading_enabled ? (
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <FaCheckCircle className="text-xs" /> Active
                      </span>
                    ) : (
                      <span className="text-red-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${(user.portfolio_value || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">{user.total_trades || 0}</td>
                  <td className={`px-4 py-3 text-right font-medium ${(user.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(user.total_pnl || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="text-blue-400 hover:text-blue-300"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-amber-400 hover:text-amber-300"
                        title="Edit User"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => revokeApiKey(user.id)}
                        className="text-orange-400 hover:text-orange-300"
                        title="Revoke API Key"
                      >
                        <FaKey />
                      </button>
                      <button
                        onClick={() => toggleTrading(user.id, !user.trading_enabled)}
                        className={user.trading_enabled ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}
                        title={user.trading_enabled ? "Disable Trading" : "Enable Trading"}
                      >
                        {user.trading_enabled ? <FaBan /> : <FaCheckCircle />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete User"
                        disabled={deleting}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">User Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-white/50 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">Email</div>
                  <div className="font-medium">{selectedUser.email}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">User ID</div>
                  <div className="font-mono text-xs break-all">{selectedUser.id}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">Tier</div>
                  <div className="font-medium capitalize">{selectedUser.tier}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">Strategy</div>
                  <div className="font-medium">{selectedUser.strategy || "AI Weighted"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">Portfolio Value</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ${(selectedUser.portfolio_value || 0).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/50">Member Since</div>
                  <div>{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Trading Stats */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <FaChartLine /> Trading Performance
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-white/50">Total Trades</div>
                    <div className="text-lg font-bold">{stats.total_trades}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/50">Total PnL</div>
                    <div className={`text-lg font-bold ${stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${stats.total_pnl.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/50">Win Rate</div>
                    <div className="text-lg font-bold">{stats.win_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Wallet Addresses */}
              {selectedUser.wallet_addresses && selectedUser.wallet_addresses.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold">
                    <FaDollarSign /> Connected Wallets
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedUser.wallet_addresses.map((addr, i) => (
                      <div key={i} className="font-mono text-xs break-all text-white/70">
                        {addr}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API Keys */}
              {selectedUser.api_keys && selectedUser.api_keys.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold">
                    <FaKey /> API Keys
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedUser.api_keys.map((key, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-mono text-xs">{key.plan} - {key.is_active ? 'Active' : 'Revoked'}</span>
                        <span className="text-xs text-white/40">
                          Created: {new Date(key.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowViewModal(false); openEditModal(selectedUser); }}
                className="flex-1 rounded-lg bg-amber-600 py-2 font-medium hover:bg-amber-500"
              >
                Edit User
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/50 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/70">Tier</label>
                <select
                  value={editForm.tier}
                  onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                  <option value="bundle">Bundle</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Strategy</label>
                <select
                  value={editForm.strategy}
                  onChange={(e) => setEditForm({ ...editForm, strategy: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                >
                  <option value="ai_weighted">AI Weighted (Balanced)</option>
                  <option value="momentum">Momentum (Aggressive)</option>
                  <option value="mean_reversion">Mean Reversion (Conservative)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Portfolio Value (USD)</label>
                <input
                  type="number"
                  value={editForm.portfolio_value}
                  onChange={(e) => setEditForm({ ...editForm, portfolio_value: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Trading Enabled</label>
                <button
                  onClick={() => setEditForm({ ...editForm, trading_enabled: !editForm.trading_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    editForm.trading_enabled ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute h-4 w-4 rounded-full bg-white transition ${
                    editForm.trading_enabled ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Admin Access</label>
                <button
                  onClick={() => setEditForm({ ...editForm, is_admin: !editForm.is_admin })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    editForm.is_admin ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute h-4 w-4 rounded-full bg-white transition ${
                    editForm.is_admin ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={updateUser}
                  disabled={updating}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {updating ? <FaSpinner className="mx-auto animate-spin" /> : <FaSave className="inline mr-2" />}
                  {updating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
