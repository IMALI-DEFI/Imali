// src/admin/UserManagement.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBan,
  FaCheckCircle,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaKey,
  FaLock,
  FaPlus,
  FaSave,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa";

const TOKEN_KEY = "imali_token";

// FIXED: Match backend tier values
const TIERS = ["starter", "common", "rare", "epic", "legendary"];
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative / Mean Reversion" },
  { value: "ai_weighted", label: "Balanced / AI Weighted" },
  { value: "momentum", label: "Aggressive / Momentum" },
  { value: "arbitrage", label: "Arbitrage" },
  { value: "futures", label: "Futures Engine" },
  { value: "alpha", label: "Alpha Sniper" },
];

const DEFAULT_ADD_FORM = {
  email: "",
  password: "",
  tier: "starter",
  strategy: "ai_weighted",
  is_admin: false,
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

function tierBadge(tier) {
  const styles = {
    starter: "border-blue-500/30 bg-blue-500/20 text-blue-300",
    common: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
    rare: "border-purple-500/30 bg-purple-500/20 text-purple-300",
    epic: "border-amber-500/30 bg-amber-500/20 text-amber-300",
    legendary: "border-yellow-500/30 bg-yellow-500/20 text-yellow-300",
  };
  return styles[tier] || styles.starter;
}

export default function UserManagement({ apiBase = "", showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [addForm, setAddForm] = useState(DEFAULT_ADD_FORM);
  const [editForm, setEditForm] = useState({});

  const toast = useCallback(
    (message, type = "info") => {
      if (typeof showToast === "function") showToast(message, type);
      else console.log(`[${type}] ${message}`);
    },
    [showToast]
  );

  const apiRequest = useCallback(
    async (path, options = {}) => {
      const token = getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || `Request failed: ${response.status}`);
      }

      return data;
    },
    [apiBase]
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const data = await apiRequest(`/api/admin/users?${params.toString()}`);
      setUsers(data.data?.users || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
      setTotalUsers(data.data?.pagination?.total || 0);
    } catch (error) {
      console.error("Fetch users failed:", error);
      toast(error.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, limit, page, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const summary = useMemo(() => {
    return {
      total: totalUsers,
      active: users.filter((u) => u.trading_enabled).length,
      admins: users.filter((u) => u.is_admin).length,
      trialActive: users.filter((u) => u.trial_status === "trial" && u.paper_trading_enabled).length,
    };
  }, [users, totalUsers]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openAddUser = () => {
    setAddForm(DEFAULT_ADD_FORM);
    setShowAddModal(true);
  };

  const openViewUser = async (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
    try {
      const data = await apiRequest(`/api/admin/users/${user.id}`);
      setSelectedUser(data.data?.user || user);
    } catch (error) {
      console.error("View user failed:", error);
      toast("Loaded basic user details only", "warning");
    }
  };

  const openEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      tier: user.tier || "starter",
      strategy: user.strategy || "ai_weighted",
      trading_enabled: !!user.trading_enabled,
      paper_trading_enabled: !!user.paper_trading_enabled,
      trial_status: user.trial_status || "trial",
      is_admin: !!user.is_admin,
    });
    setShowDeleteConfirm(false);
    setShowEditModal(true);
  };

  const createUser = async () => {
    if (!addForm.email.includes("@")) {
      toast("Enter a valid email address", "error");
      return;
    }
    if (!addForm.password || addForm.password.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }

    setWorking(true);
    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          tier: addForm.tier,
          strategy: addForm.strategy,
          is_admin: addForm.is_admin,
        }),
      });
      toast("User created successfully", "success");
      setShowAddModal(false);
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to create user", "error");
    } finally {
      setWorking(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      toast("User updated successfully", "success");
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update user", "error");
    } finally {
      setWorking(false);
    }
  };

  const updateTier = async (userId, newTier) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      toast(`Tier updated to ${newTier}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update tier", "error");
    } finally {
      setWorking(false);
    }
  };

  const toggleTrading = async (user) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ trading_enabled: !user.trading_enabled }),
      });
      toast(`Trading ${!user.trading_enabled ? "enabled" : "disabled"}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to update trading", "error");
    } finally {
      setWorking(false);
    }
  };

  const reactivateTrial = async (user) => {
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${user.id}/reactivate-trial`, {
        method: "POST",
        body: JSON.stringify({ trial_days: 7 }),
      });
      toast("Practice trading reactivated for 7 days", "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to reactivate practice trading", "error");
    } finally {
      setWorking(false);
    }
  };

  const revokeApiKey = async (user) => {
    if (!window.confirm(`Revoke API key for ${user.email}? A new key will be generated.`)) return;
    setWorking(true);
    try {
      const data = await apiRequest(`/api/admin/users/${user.id}/revoke-api-key`, {
        method: "POST",
      });
      toast(`API key revoked. New key: ${data.data?.new_api_key || "Generated"}`, "success");
      fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to revoke API key", "error");
    } finally {
      setWorking(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      toast("User deleted successfully", "success");
      setShowEditModal(false);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      if (users.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchUsers();
    } catch (error) {
      toast(error.message || "Failed to delete user", "error");
    } finally {
      setWorking(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-white">
        <FaSpinner className="mr-3 animate-spin text-3xl text-emerald-400" />
        Loading users...
      </div>
    );
  }

  return (
    <div className="space-y-5 text-white">
      {/* Header Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3">
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-sm text-white/60">
            Manage user accounts, tiers, trading permissions, and API keys.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by email..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-10 pr-3 text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  fetchUsers();
                }}
                className="rounded-lg border border-white/10 px-4 py-2 hover:bg-white/10"
              >
                Clear
              </button>
            )}
          </form>

          <button
            onClick={openAddUser}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
          >
            <FaUserPlus /> Add User
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total Users" value={summary.total} />
        <SummaryCard label="Trading Enabled" value={summary.active} />
        <SummaryCard label="Practice Active" value={summary.trialActive} />
        <SummaryCard label="Admins" value={summary.admins} />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Tier</th>
              <th className="px-4 py-3 text-center">Practice</th>
              <th className="px-4 py-3 text-center">Live Trading</th>
              <th className="px-4 py-3 text-left">Strategy</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-white/50">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const practiceActive = user.trial_status === "trial" && user.paper_trading_enabled;
                return (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-300">
                          {user.email?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="font-semibold">{user.email}</div>
                          <div className="text-xs text-white/40">{user.id?.slice(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.tier || "starter"}
                        onChange={(e) => updateTier(user.id, e.target.value)}
                        className={`rounded-full border px-2 py-1 text-xs ${tierBadge(user.tier)} bg-transparent cursor-pointer`}
                        disabled={working}
                      >
                        {TIERS.map((t) => (
                          <option key={t} value={t} className="bg-gray-900">
                            {t.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {practiceActive ? (
                        <span className="text-emerald-400">Active</span>
                      ) : (
                        <button
                          onClick={() => reactivateTrial(user)}
                          disabled={working}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/20"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.trading_enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <FaCheckCircle /> Enabled
                        </span>
                      ) : (
                        <span className="text-red-400">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/80">{user.strategy || "ai_weighted"}</td>
                    <td className="px-4 py-3 text-white/60">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-3">
                        <IconButton title="View" onClick={() => openViewUser(user)} icon={<FaEye />} color="text-blue-400" />
                        <IconButton title="Edit" onClick={() => openEditUser(user)} icon={<FaEdit />} color="text-amber-400" />
                        <IconButton title="Revoke API Key" onClick={() => revokeApiKey(user)} icon={<FaKey />} color="text-orange-400" />
                        <IconButton
                          title={user.trading_enabled ? "Disable Trading" : "Enable Trading"}
                          onClick={() => toggleTrading(user)}
                          icon={user.trading_enabled ? <FaBan /> : <FaCheckCircle />}
                          color={user.trading_enabled ? "text-red-400" : "text-emerald-400"}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-white/60">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals - Same as before, keep your existing modal code */}
      {/* ... (keep your existing modal JSX) ... */}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function IconButton({ title, icon, onClick, color }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`${color} transition hover:scale-110 hover:opacity-80`}
      type="button"
    >
      {icon}
    </button>
  );
}
