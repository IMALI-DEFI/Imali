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

const TIERS = ["starter", "pro", "elite", "bundle"];
const STRATEGIES = [
  { value: "mean_reversion", label: "Conservative / Mean Reversion" },
  { value: "ai_weighted", label: "Balanced / AI Weighted" },
  { value: "momentum", label: "Aggressive / Momentum" },
  { value: "arbitrage", label: "Arbitrage" },
];

const DEFAULT_ADD_FORM = {
  email: "",
  password: "",
  tier: "starter",
  strategy: "ai_weighted",
  portfolio_value: 1000,
  trading_enabled: false,
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
    pro: "border-purple-500/30 bg-purple-500/20 text-purple-300",
    elite: "border-amber-500/30 bg-amber-500/20 text-amber-300",
    bundle: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
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
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
          ...(options.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || "Request failed");
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
      portfolio_value: Number(user.portfolio_value || 1000),
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
        body: JSON.stringify(addForm),
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

  const toggleTrading = async (user) => {
    setWorking(true);

    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          trading_enabled: !user.trading_enabled,
        }),
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
        body: JSON.stringify({ days: 7 }),
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
    if (!window.confirm(`Revoke API key for ${user.email}?`)) return;

    setWorking(true);

    try {
      await apiRequest(`/api/admin/users/${user.id}/revoke-api-key`, {
        method: "POST",
      });

      toast("API key revoked", "success");
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3">
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-sm text-white/60">
            Add users, activate practice trading, enable live trading, and manage plans.
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

            <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500">
              Search
            </button>

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
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
            <FaUserPlus />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Total Users" value={summary.total} />
        <SummaryCard label="Trading Enabled" value={summary.active} />
        <SummaryCard label="Practice Active" value={summary.trialActive} />
        <SummaryCard label="Admins" value={summary.admins} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-center">Practice</th>
              <th className="px-4 py-3 text-center">Trading</th>
              <th className="px-4 py-3 text-left">Strategy</th>
              <th className="px-4 py-3 text-right">Portfolio</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-white/50">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const practiceActive =
                  user.trial_status === "trial" && user.paper_trading_enabled;

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
                      <span className={`rounded-full border px-2 py-1 text-xs ${tierBadge(user.tier)}`}>
                        {(user.tier || "starter").toUpperCase()}
                      </span>
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

                    <td className="px-4 py-3 text-white/80">
                      {user.strategy || "ai_weighted"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {money(user.portfolio_value)}
                    </td>

                    <td className="px-4 py-3 text-white/60">
                      {formatDate(user.created_at)}
                    </td>

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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-white/60">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

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

      {showViewModal && selectedUser && (
        <UserModal title="User Details" onClose={() => setShowViewModal(false)} wide>
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Email" value={selectedUser.email} />
            <Info label="User ID" value={selectedUser.id} mono />
            <Info label="Plan" value={selectedUser.tier} />
            <Info label="Strategy" value={selectedUser.strategy} />
            <Info label="Portfolio" value={money(selectedUser.portfolio_value)} />
            <Info label="Joined" value={formatDate(selectedUser.created_at)} />
            <Info label="Practice Trading" value={selectedUser.paper_trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Trial Status" value={selectedUser.trial_status || "—"} />
            <Info label="Live Trading" value={selectedUser.trading_enabled ? "Enabled" : "Disabled"} />
            <Info label="Admin" value={selectedUser.is_admin ? "Yes" : "No"} />
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

      {showEditModal && selectedUser && (
        <UserModal title="Edit User" onClose={() => setShowEditModal(false)}>
          {!showDeleteConfirm ? (
            <>
              <UserForm form={editForm} setForm={setEditForm} />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => reactivateTrial(selectedUser)}
                  disabled={working}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Reactivate Practice
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
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-red-300">
                  <FaExclamationTriangle />
                  Permanent Delete
                </div>

                <p className="text-sm text-white/80">
                  This will delete:
                </p>

                <p className="mt-2 rounded bg-black/40 p-2 font-mono text-sm">
                  {selectedUser.email}
                </p>

                <p className="mt-3 text-xs text-red-300/80">
                  This cannot be undone. User access, settings, API keys, and related data may be removed depending on backend rules.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={deleteUser}
                  disabled={working}
                  className="flex-1 rounded-lg bg-red-600 py-2 font-semibold hover:bg-red-500 disabled:opacity-50"
                >
                  {working ? "Deleting..." : "Confirm Delete"}
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </UserModal>
      )}
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

function UserForm({ form, setForm, includePassword = false }) {
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      {"email" in form && (
        <Field label="Email Address" icon={<FaEnvelope />}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="user@example.com"
            className="input"
          />
        </Field>
      )}

      {includePassword && (
        <Field label="Temporary Password" icon={<FaLock />}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="At least 8 characters"
            className="input"
          />
        </Field>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Plan">
          <select value={form.tier} onChange={(e) => update("tier", e.target.value)} className="input">
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Strategy">
          <select value={form.strategy} onChange={(e) => update("strategy", e.target.value)} className="input">
            {STRATEGIES.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Portfolio Value">
        <input
          type="number"
          value={form.portfolio_value}
          onChange={(e) => update("portfolio_value", Number(e.target.value || 0))}
          className="input"
        />
      </Field>

      <Toggle
        label="Enable Live Trading"
        value={!!form.trading_enabled}
        onChange={() => update("trading_enabled", !form.trading_enabled)}
      />

      {"paper_trading_enabled" in form && (
        <Toggle
          label="Enable Practice Trading"
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
        {icon ? <span className="text-xs">{icon}</span> : null}
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