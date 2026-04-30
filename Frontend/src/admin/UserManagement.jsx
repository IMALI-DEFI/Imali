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
  FaEnvelopeOpenText,
  FaRobot,
  FaUserTag,
  FaCreditCard,
  FaPlug,
  FaCalendarAlt,
  FaChartLine,
  FaWallet,
  FaExchangeAlt,
} from "react-icons/fa";

const TOKEN_KEY = "imali_token";

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

function statusBadge(condition, trueText = "Active", falseText = "Inactive") {
  return condition ? (
    <span className="inline-flex items-center gap-1 text-emerald-400">
      <FaCheckCircle className="text-xs" /> {trueText}
    </span>
  ) : (
    <span className="text-red-400">{falseText}</span>
  );
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
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [showAutoResponderModal, setShowAutoResponderModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);

  const [addForm, setAddForm] = useState(DEFAULT_ADD_FORM);
  const [editForm, setEditForm] = useState({});
  const [newsletterForm, setNewsletterForm] = useState({ subject: "", content: "" });
  const [autoResponderForm, setAutoResponderForm] = useState({ rule_id: "", event_type: "signup", delay_minutes: 0 });
  const [autoResponderRules, setAutoResponderRules] = useState([]);

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

  const fetchAutoResponderRules = useCallback(async () => {
    try {
      const data = await apiRequest("/api/admin/autoresponder/rules");
      setAutoResponderRules(data.data?.rules || []);
    } catch (error) {
      console.error("Fetch auto-responder rules failed:", error);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchUsers();
    fetchAutoResponderRules();
  }, [fetchUsers, fetchAutoResponderRules]);

  const summary = useMemo(() => {
    return {
      total: totalUsers,
      active: users.filter((u) => u.trading_enabled).length,
      admins: users.filter((u) => u.is_admin).length,
      trialActive: users.filter((u) => u.trial_status === "trial" && u.paper_trading_enabled).length,
      hasBilling: users.filter((u) => u.has_card_on_file).length,
      hasAlpaca: users.filter((u) => u.alpaca_connected === "true" || u.alpaca_connected === true).length,
      hasOkx: users.filter((u) => u.okx_connected === "true" || u.okx_connected === true).length,
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
      email: user.email,
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

  const openConnectionsModal = (user) => {
    setSelectedUser(user);
    setShowConnectionsModal(true);
  };

  const openNewsletterModal = (user) => {
    setSelectedUser(user);
    setNewsletterForm({ subject: "", content: "" });
    setShowNewsletterModal(true);
  };

  const openAutoResponderModal = (user) => {
    setSelectedUser(user);
    setAutoResponderForm({ rule_id: "", event_type: "signup", delay_minutes: 0 });
    setShowAutoResponderModal(true);
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
        body: JSON.stringify({
          email: editForm.email,
          tier: editForm.tier,
          strategy: editForm.strategy,
          trading_enabled: editForm.trading_enabled,
          is_admin: editForm.is_admin,
        }),
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

  const addToNewsletter = async () => {
    if (!selectedUser?.id) return;
    setWorking(true);
    try {
      await apiRequest("/api/admin/newsletter/subscribers", {
        method: "POST",
        body: JSON.stringify({
          email: selectedUser.email,
          first_name: selectedUser.email.split('@')[0],
          interest: "all",
        }),
      });
      toast(`Added ${selectedUser.email} to newsletter`, "success");
      setShowNewsletterModal(false);
    } catch (error) {
      toast(error.message || "Failed to add to newsletter", "error");
    } finally {
      setWorking(false);
    }
  };

  const addToAutoResponder = async () => {
    if (!selectedUser?.id || !autoResponderForm.rule_id) return;
    setWorking(true);
    try {
      await apiRequest(`/api/admin/autoresponder/users/${selectedUser.id}/add`, {
        method: "POST",
        body: JSON.stringify({
          rule_id: autoResponderForm.rule_id,
          event_type: autoResponderForm.event_type,
          delay_minutes: autoResponderForm.delay_minutes,
        }),
      });
      toast(`Added ${selectedUser.email} to auto-responder rule`, "success");
      setShowAutoResponderModal(false);
    } catch (error) {
      toast(error.message || "Failed to add to auto-responder", "error");
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
            Manage user accounts, tiers, trading permissions, API keys, and view connection status.
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

      {/* Stats Summary - Enhanced */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <SummaryCard label="Total Users" value={summary.total} icon="👥" />
        <SummaryCard label="Trading Enabled" value={summary.active} icon="📈" />
        <SummaryCard label="Practice Active" value={summary.trialActive} icon="📝" />
        <SummaryCard label="Admins" value={summary.admins} icon="👑" />
        <SummaryCard label="Billing Setup" value={summary.hasBilling} icon="💳" />
        <SummaryCard label="Connected" value={`${summary.hasAlpaca + summary.hasOkx}`} icon="🔌" />
      </div>

      {/* Users Table - Enhanced with connection indicators */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Tier</th>
              <th className="px-4 py-3 text-center">Practice</th>
              <th className="px-4 py-3 text-center">Live</th>
              <th className="px-4 py-3 text-center">Billing</th>
              <th className="px-4 py-3 text-center">Alpaca</th>
              <th className="px-4 py-3 text-center">OKX</th>
              <th className="px-4 py-3 text-left">Strategy</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-white/50">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const practiceActive = user.trial_status === "trial" && user.paper_trading_enabled;
                const billingComplete = user.has_card_on_file === true || user.billing_complete === true;
                const alpacaConnected = user.alpaca_connected === "true" || user.alpaca_connected === true;
                const okxConnected = user.okx_connected === "true" || user.okx_connected === true;

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
                        <span className="text-emerald-400 text-xs">Active</span>
                      ) : (
                        <button
                          onClick={() => reactivateTrial(user)}
                          disabled={working}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {statusBadge(user.trading_enabled, "On", "Off")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {billingComplete ? (
                        <span className="text-emerald-400 text-sm" title="Billing Complete">💳✓</span>
                      ) : (
                        <span className="text-gray-500 text-sm" title="No Card">💳✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alpacaConnected ? (
                        <span className="text-emerald-400 text-sm" title="Alpaca Connected">🦙✓</span>
                      ) : (
                        <span className="text-gray-500 text-sm" title="Alpaca Not Connected">🦙✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {okxConnected ? (
                        <span className="text-emerald-400 text-sm" title="OKX Connected">🟢✓</span>
                      ) : (
                        <span className="text-gray-500 text-sm" title="OKX Not Connected">🔴✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-xs">{user.strategy || "ai_weighted"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <IconButton title="View" onClick={() => openViewUser(user)} icon={<FaEye />} color="text-blue-400" />
                        <IconButton title="Edit" onClick={() => openEditUser(user)} icon={<FaEdit />} color="text-amber-400" />
                        <IconButton title="Connections" onClick={() => openConnectionsModal(user)} icon={<FaPlug />} color="text-cyan-400" />
                        <IconButton title="Add to Newsletter" onClick={() => openNewsletterModal(user)} icon={<FaEnvelopeOpenText />} color="text-green-400" />
                        <IconButton title="Add to Auto-Responder" onClick={() => openAutoResponderModal(user)} icon={<FaRobot />} color="text-purple-400" />
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

      {/* Add User Modal */}
      {showAddModal && (
        <UserModal title="Add New User" onClose={() => setShowAddModal(false)}>
          <UserForm form={addForm} setForm={setAddForm} includePassword />
          <ModalActions
            primaryLabel="Create User"
            onPrimary={createUser}
            onCancel={() => setShowAddModal(false)}
            working={working}
          />
        </UserModal>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <UserModal title="User Details" onClose={() => setShowViewModal(false)} wide>
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Email" value={selectedUser.email} />
            <Info label="User ID" value={selectedUser.id} mono />
            <Info label="Plan" value={selectedUser.tier} />
            <Info label="Strategy" value={selectedUser.strategy} />
            <Info label="Portfolio" value={money(selectedUser.portfolio_value)} />
            <Info label="Joined" value={formatDate(selectedUser.created_at)} />
            <Info label="Practice Trading" value={selectedUser.paper_trading_enabled ? "Active" : "Inactive"} />
            <Info label="Trial Status" value={selectedUser.trial_status || "trial"} />
            <Info label="Live Trading" value={selectedUser.trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Admin" value={selectedUser.is_admin ? "Yes" : "No"} />
            <Info label="Billing Complete" value={selectedUser.has_card_on_file ? "Yes" : "No"} />
            <Info label="Alpaca Connected" value={selectedUser.alpaca_connected ? "Yes" : "No"} />
            <Info label="OKX Connected" value={selectedUser.okx_connected ? "Yes" : "No"} />
            <Info label="Wallet Connected" value={selectedUser.wallet_connected ? "Yes" : "No"} />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setShowViewModal(false);
                openEditUser(selectedUser);
              }}
              className="flex-1 rounded-lg bg-amber-600 py-2 font-semibold hover:bg-amber-500"
            >
              Edit User
            </button>
            <button
              onClick={() => {
                setShowViewModal(false);
                reactivateTrial(selectedUser);
              }}
              className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500"
            >
              Reactivate Practice
            </button>
          </div>
        </UserModal>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserModal title="Edit User" onClose={() => setShowEditModal(false)}>
          {!showDeleteConfirm ? (
            <>
              <UserForm form={editForm} setForm={setEditForm} includeEmail />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => reactivateTrial(selectedUser)}
                  disabled={working}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Reactivate Practice (7 days)
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-red-300 hover:bg-red-500/20"
                >
                  Delete User
                </button>
              </div>
              <ModalActions
                primaryLabel="Save Changes"
                onPrimary={updateUser}
                onCancel={() => setShowEditModal(false)}
                working={working}
              />
            </>
          ) : (
            <DeleteConfirmModal
              user={selectedUser}
              onConfirm={deleteUser}
              onCancel={() => setShowDeleteConfirm(false)}
              working={working}
            />
          )}
        </UserModal>
      )}

      {/* Connections Modal - NEW */}
      {showConnectionsModal && selectedUser && (
        <UserModal title="User Connections & Status" onClose={() => setShowConnectionsModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Status */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaCreditCard className="text-emerald-400" /> Billing Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Card on File:</span>
                    <span className={selectedUser.has_card_on_file ? "text-emerald-400" : "text-red-400"}>
                      {selectedUser.has_card_on_file ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Billing Complete:</span>
                    <span className={selectedUser.billing_complete ? "text-emerald-400" : "text-yellow-400"}>
                      {selectedUser.billing_complete ? "Yes" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exchange Connections */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaExchangeAlt className="text-cyan-400" /> Exchange Connections
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Alpaca:</span>
                    <span className={selectedUser.alpaca_connected ? "text-emerald-400" : "text-red-400"}>
                      {selectedUser.alpaca_connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">OKX:</span>
                    <span className={selectedUser.okx_connected ? "text-emerald-400" : "text-red-400"}>
                      {selectedUser.okx_connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trading Status */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaChartLine className="text-purple-400" /> Trading Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Live Trading:</span>
                    <span className={selectedUser.trading_enabled ? "text-emerald-400" : "text-red-400"}>
                      {selectedUser.trading_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Paper Trading:</span>
                    <span className={selectedUser.paper_trading_enabled ? "text-emerald-400" : "text-red-400"}>
                      {selectedUser.paper_trading_enabled ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Strategy:</span>
                    <span className="text-white">{selectedUser.strategy || "ai_weighted"}</span>
                  </div>
                </div>
              </div>

              {/* Trial Info */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaCalendarAlt className="text-amber-400" /> Trial Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Status:</span>
                    <span className={selectedUser.trial_status === "trial" ? "text-emerald-400" : "text-yellow-400"}>
                      {selectedUser.trial_status || "trial"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Started:</span>
                    <span className="text-white">{formatDate(selectedUser.trial_started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Ends:</span>
                    <span className="text-white">{formatDate(selectedUser.trial_ends_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Address if available */}
            {selectedUser.wallet_addresses && selectedUser.wallet_addresses.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaWallet className="text-indigo-400" /> Wallet Addresses
                </h4>
                <div className="space-y-1">
                  {selectedUser.wallet_addresses.map((addr, idx) => (
                    <div key={idx} className="text-xs font-mono text-white/60 break-all">
                      {addr}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setShowConnectionsModal(false)}
              className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500"
            >
              Close
            </button>
          </div>
        </UserModal>
      )}

      {/* Newsletter Modal */}
      {showNewsletterModal && selectedUser && (
        <UserModal title="Add to Newsletter" onClose={() => setShowNewsletterModal(false)}>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <FaEnvelopeOpenText className="text-2xl text-green-400" />
                <div>
                  <h3 className="font-semibold">{selectedUser.email}</h3>
                  <p className="text-sm text-white/60">Will be added to newsletter subscribers</p>
                </div>
              </div>
            </div>
            <Info label="Subscriber Status" value="Pending addition" />
            <Info label="Interest" value="All updates" />
          </div>
          <ModalActions
            primaryLabel="Add to Newsletter"
            onPrimary={addToNewsletter}
            onCancel={() => setShowNewsletterModal(false)}
            working={working}
          />
        </UserModal>
      )}

      {/* Auto-Responder Modal */}
      {showAutoResponderModal && selectedUser && (
        <UserModal title="Add to Auto-Responder" onClose={() => setShowAutoResponderModal(false)}>
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
              <div className="flex items-center gap-3">
                <FaRobot className="text-2xl text-purple-400" />
                <div>
                  <h3 className="font-semibold">{selectedUser.email}</h3>
                  <p className="text-sm text-white/60">Will receive automated emails based on selected rule</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Select Auto-Responder Rule</label>
              <select
                value={autoResponderForm.rule_id}
                onChange={(e) => setAutoResponderForm({ ...autoResponderForm, rule_id: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              >
                <option value="">Select a rule...</option>
                {autoResponderRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name} ({rule.trigger_event})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Event Type</label>
              <select
                value={autoResponderForm.event_type}
                onChange={(e) => setAutoResponderForm({ ...autoResponderForm, event_type: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
              >
                <option value="signup">User Signup</option>
                <option value="first_trade">First Trade</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Delay (minutes)</label>
              <input
                type="number"
                value={autoResponderForm.delay_minutes}
                onChange={(e) => setAutoResponderForm({ ...autoResponderForm, delay_minutes: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                placeholder="0 = immediate"
              />
            </div>
          </div>
          <ModalActions
            primaryLabel="Add to Auto-Responder"
            onPrimary={addToAutoResponder}
            onCancel={() => setShowAutoResponderModal(false)}
            working={working}
          />
        </UserModal>
      )}
    </div>
  );
}

// Helper Components
function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-lg mb-1">{icon}</div>
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

function UserModal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div
        className={`max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl ${
          wide ? "w-full max-w-3xl" : "w-full max-w-lg"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <FaTimes />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserForm({ form, setForm, includePassword = false, includeEmail = false }) {
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      {(includeEmail || form.email !== undefined) && (
        <Field label="Email Address" icon={<FaEnvelope />}>
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
            placeholder="user@example.com"
            className="input w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </Field>
      )}

      {includePassword && (
        <Field label="Password" icon={<FaLock />}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 8 characters"
            className="input w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </Field>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Plan">
          <select
            value={form.tier}
            onChange={(e) => update("tier", e.target.value)}
            className="input w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Strategy">
          <select
            value={form.strategy}
            onChange={(e) => update("strategy", e.target.value)}
            className="input w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
          >
            {STRATEGIES.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Toggle
        label="Enable Live Trading"
        value={!!form.trading_enabled}
        onChange={() => update("trading_enabled", !form.trading_enabled)}
      />

      {"paper_trading_enabled" in form && (
        <Toggle
          label="Enable Practice Trading (7-Day Trial)"
          value={!!form.paper_trading_enabled}
          onChange={() => update("paper_trading_enabled", !form.paper_trading_enabled)}
        />
      )}

      <Toggle
        label="Admin Access"
        value={!!form.is_admin}
        onChange={() => update("is_admin", !form.is_admin)}
      />
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center gap-2 text-sm text-white/70">
        {icon && <span className="text-xs">{icon}</span>}
        {label}
      </div>
      {children}
    </label>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
      <span className="text-sm text-white/80">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-emerald-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white transition ${
            value ? "right-1" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function ModalActions({ primaryLabel, onPrimary, onCancel, working }) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        onClick={onPrimary}
        disabled={working}
        className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
      >
        {working ? (
          <>
            <FaSpinner className="mr-2 inline animate-spin" />
            Working...
          </>
        ) : (
          <>
            <FaSave className="mr-2 inline" />
            {primaryLabel}
          </>
        )}
      </button>
      <button
        onClick={onCancel}
        disabled={working}
        className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/10 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}

function DeleteConfirmModal({ user, onConfirm, onCancel, working }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 font-bold text-red-300">
          <FaExclamationTriangle />
          Permanent Delete
        </div>
        <p className="text-sm text-white/80">This will permanently delete:</p>
        <p className="mt-2 rounded bg-black/40 p-2 font-mono text-sm">{user.email}</p>
        <p className="mt-3 text-xs text-red-300/80">This action cannot be undone.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={working}
          className="flex-1 rounded-lg bg-red-600 py-2 font-semibold hover:bg-red-500 disabled:opacity-50"
        >
          {working ? "Deleting..." : "Confirm Delete"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className={`mt-1 break-all font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}
