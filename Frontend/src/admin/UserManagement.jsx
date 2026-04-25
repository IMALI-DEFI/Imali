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
  FaDollarSign,
  FaChartLine,
  FaUsers,
  FaPlus,
  FaSyncAlt
} from "react-icons/fa";

export default function UserManagement({ apiBase, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    tier: "starter",
    strategy: "ai_weighted",
    trading_enabled: true,
    is_admin: false,
    portfolio_value: 1000
  });

  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [stats, setStats] = useState({
    total_pnl: 0,
    total_trades: 0,
    win_rate: 0
  });

  const limit = 20;

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("imali_token")}`
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      let url = `/api/admin/users?page=${page}&limit=${limit}`;

      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await fetch(`${apiBase}${url}`, {
        headers: authHeaders
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data?.users || []);
        setTotalPages(data.data?.pagination?.totalPages || 1);
        setTotalUsers(data.data?.pagination?.total || 0);
      } else {
        showToast(data.error || "Failed to load users", "error");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, apiBase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const resetSearch = () => {
    setSearch("");
    setPage(1);
    setTimeout(fetchUsers, 0);
  };

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setShowViewModal(true);

    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        headers: authHeaders
      });

      const data = await response.json();

      if (data.success && data.data) {
        const fullUser = data.data.user || user;
        const trades = data.data.trades || [];

        const totalPnl = trades.reduce((sum, trade) => {
          return sum + Number(trade.pnl_usd || 0);
        }, 0);

        const winningTrades = trades.filter((trade) => Number(trade.pnl_usd || 0) > 0).length;
        const totalTrades = trades.length;

        setSelectedUser(fullUser);
        setStats({
          total_pnl: totalPnl,
          total_trades: totalTrades,
          win_rate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      showToast("Failed to load user details", "error");
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);

    setEditForm({
      tier: user.tier || "starter",
      trading_enabled: Boolean(user.trading_enabled),
      is_admin: Boolean(user.is_admin),
      portfolio_value: Number(user.portfolio_value || 1000),
      strategy: user.strategy || "ai_weighted"
    });

    setShowEditModal(true);
  };

  const createUser = async () => {
    if (!newUserForm.email.trim()) {
      showToast("Email is required", "error");
      return;
    }

    if (!newUserForm.password.trim()) {
      showToast("Password is required", "error");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(newUserForm)
      });

      const data = await response.json();

      if (data.success) {
        showToast("User created successfully", "success");
        setShowAddModal(false);

        setNewUserForm({
          email: "",
          password: "",
          tier: "starter",
          strategy: "ai_weighted",
          trading_enabled: true,
          is_admin: false,
          portfolio_value: 1000
        });

        fetchUsers();
      } else {
        showToast(data.error || "Failed to create user", "error");
      }
    } catch (error) {
      console.error("Failed to create user:", error);
      showToast("Failed to create user", "error");
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser) return;

    setUpdating(true);

    try {
      const response = await fetch(`${apiBase}/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
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
      console.error("Failed to update user:", error);
      showToast("Failed to update user", "error");
    } finally {
      setUpdating(false);
    }
  };

  const revokeApiKey = async (userId) => {
    if (!confirm("Revoke this user's API key?")) return;

    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}/revoke-api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
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
      console.error("Failed to revoke API key:", error);
      showToast("Failed to revoke API key", "error");
    }
  };

  const toggleTrading = async (userId, enabled) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ trading_enabled: enabled })
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Trading ${enabled ? "enabled" : "disabled"}`, "success");
        fetchUsers();
      } else {
        showToast(data.error || "Failed to update trading status", "error");
      }
    } catch (error) {
      console.error("Failed to update trading status:", error);
      showToast("Failed to update trading status", "error");
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`Delete user ${userEmail}? This cannot be undone.`)) return;

    setDeleting(true);

    try {
      const response = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders
      });

      const data = await response.json();

      if (data.success) {
        showToast("User deleted", "success");
        setShowViewModal(false);
        setShowEditModal(false);
        fetchUsers();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
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
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <FaUsers /> All Users
            </h2>
            <p className="text-sm text-white/50">View, add, edit, and delete user accounts.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
            >
              <FaPlus /> Add User
            </button>

            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 font-medium text-white hover:bg-white/5"
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 md:flex-row">
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
              onClick={resetSearch}
              className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/5"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Total Users</div>
          <div className="text-xl font-bold text-white">{totalUsers}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Active Traders</div>
          <div className="text-xl font-bold text-white">
            {users.filter((user) => user.trading_enabled).length}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-xs text-white/50">Admins</div>
          <div className="text-xl font-bold text-white">
            {users.filter((user) => user.is_admin).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="min-w-[1200px] w-full text-sm">
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
                <td colSpan={8} className="py-8 text-center text-white/50">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                        <span className="text-sm font-bold text-emerald-400">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <div className="font-medium text-white">{user.email}</div>
                        <div className="text-xs text-white/40">{user.id?.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${getTierBadge(user.tier)}`}>
                      {user.tier?.toUpperCase() || "STARTER"}
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
                    ${Number(user.portfolio_value || 0).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-right">{user.total_trades || 0}</td>

                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      Number(user.total_pnl || 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${Number(user.total_pnl || 0).toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex min-w-[220px] justify-center gap-3">
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
                        className={
                          user.trading_enabled
                            ? "text-red-400 hover:text-red-300"
                            : "text-green-400 hover:text-green-300"
                        }
                        title={user.trading_enabled ? "Disable Trading" : "Enable Trading"}
                      >
                        {user.trading_enabled ? <FaBan /> : <FaCheckCircle />}
                      </button>

                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        disabled={deleting}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        title="Delete User"
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
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm text-white/50">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6">
            <ModalHeader title="Add User" onClose={() => setShowAddModal(false)} />

            <UserForm form={newUserForm} setForm={setNewUserForm} includePassword />

            <div className="mt-6 flex gap-3">
              <button
                onClick={createUser}
                disabled={creating}
                className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create User"}
              </button>

              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <ModalHeader title="User Details" onClose={() => setShowViewModal(false)} />

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoBox label="Email" value={selectedUser.email} />
                <InfoBox label="User ID" value={selectedUser.id} mono />
                <InfoBox label="Tier" value={selectedUser.tier || "starter"} />
                <InfoBox label="Strategy" value={selectedUser.strategy || "ai_weighted"} />
                <InfoBox
                  label="Portfolio Value"
                  value={`$${Number(selectedUser.portfolio_value || 0).toLocaleString()}`}
                  highlight
                />
                <InfoBox
                  label="Member Since"
                  value={
                    selectedUser.created_at
                      ? new Date(selectedUser.created_at).toLocaleDateString()
                      : "-"
                  }
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <FaChartLine /> Trading Performance
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="Total Trades" value={stats.total_trades} />
                  <StatBox
                    label="Total PnL"
                    value={`$${stats.total_pnl.toFixed(2)}`}
                    color={stats.total_pnl >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  <StatBox label="Win Rate" value={`${stats.win_rate.toFixed(1)}%`} />
                </div>
              </div>

              {selectedUser.wallet_addresses?.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold">
                    <FaDollarSign /> Connected Wallets
                  </h4>

                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {selectedUser.wallet_addresses.map((addr, index) => (
                      <div key={index} className="break-all font-mono text-xs text-white/70">
                        {addr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(selectedUser);
                }}
                className="rounded-lg bg-amber-600 py-2 font-medium hover:bg-amber-500"
              >
                Edit User
              </button>

              <button
                onClick={() => deleteUser(selectedUser.id, selectedUser.email)}
                disabled={deleting}
                className="rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete User"}
              </button>

              <button
                onClick={() => setShowViewModal(false)}
                className="rounded-lg border border-white/10 py-2 hover:bg-white/5"
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
            <ModalHeader title="Edit User" onClose={() => setShowEditModal(false)} />

            <UserForm form={editForm} setForm={setEditForm} />

            <div className="mt-6 flex gap-3">
              <button
                onClick={updateUser}
                disabled={updating}
                className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {updating ? (
                  "Saving..."
                ) : (
                  <>
                    <FaSave className="mr-2 inline" /> Save Changes
                  </>
                )}
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
      )}
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-xl font-bold">{title}</h3>
      <button onClick={onClose} className="text-white/50 hover:text-white">
        <FaTimes />
      </button>
    </div>
  );
}

function UserForm({ form, setForm, includePassword = false }) {
  return (
    <div className="space-y-4">
      {includePassword && (
        <>
          <div>
            <label className="mb-1 block text-sm text-white/70">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              placeholder="user@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              placeholder="Temporary password"
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-sm text-white/70">Tier</label>
        <select
          value={form.tier}
          onChange={(e) => setForm({ ...form, tier: e.target.value })}
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
          value={form.strategy}
          onChange={(e) => setForm({ ...form, strategy: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
        >
          <option value="ai_weighted">AI Weighted</option>
          <option value="momentum">Momentum</option>
          <option value="mean_reversion">Mean Reversion</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-white/70">Portfolio Value</label>
        <input
          type="number"
          value={form.portfolio_value}
          onChange={(e) =>
            setForm({
              ...form,
              portfolio_value: Number(e.target.value)
            })
          }
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
        />
      </div>

      <ToggleRow
        label="Trading Enabled"
        enabled={form.trading_enabled}
        onClick={() => setForm({ ...form, trading_enabled: !form.trading_enabled })}
        activeClass="bg-emerald-600"
      />

      <ToggleRow
        label="Admin Access"
        enabled={form.is_admin}
        onClick={() => setForm({ ...form, is_admin: !form.is_admin })}
        activeClass="bg-purple-600"
      />
    </div>
  );
}

function ToggleRow({ label, enabled, onClick, activeClass }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-white/70">{label}</label>
      <button
        type="button"
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? activeClass : "bg-gray-600"
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white transition ${
            enabled ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoBox({ label, value, mono = false, highlight = false }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div
        className={`${mono ? "break-all font-mono text-xs" : "font-medium"} ${
          highlight ? "text-lg font-bold text-emerald-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "text-white" }) {
  return (
    <div className="text-center">
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}