// src/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FaSearch, FaFilter, FaSort, FaEye, FaEdit, FaTrash, 
  FaBan, FaCheck, FaUserPlus, FaDownload, FaRefresh,
  FaEnvelope, FaCalendar, FaUsers, FaBuilding, FaStar,
  FaUserCircle, FaUserCheck, FaUserSlash, FaShieldAlt,
  FaRobot, FaCrown, FaArrowLeft, FaArrowRight,
  FaChevronDown, FaChevronUp, FaSpinner
} from "react-icons/fa";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const getAuthToken = () => {
  try {
    return localStorage.getItem("imali_token");
  } catch (e) {
    console.error("[AdminUsers] Failed to get token:", e);
    return null;
  }
};

const adminFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${safeEndpoint}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const payload = contentType.includes("application/json") && text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText || "Request failed";
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
};

const AdminUsers = ({ showToast, stats, refreshStats }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const limit = 20;

  const filters = [
    { value: "all", label: "All Users", icon: <FaUsers /> },
    { value: "admin", label: "Admins", icon: <FaShieldAlt /> },
    { value: "enterprise", label: "Enterprise", icon: <FaBuilding /> },
    { value: "pro", label: "Pro", icon: <FaStar /> },
    { value: "starter", label: "Starter", icon: <FaUserCircle /> },
    { value: "banned", label: "Banned", icon: <FaBan /> },
  ];

  const fetchUsers = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        search: searchQuery || "",
        filter: filter !== "all" ? filter : "",
        sortBy,
        sortOrder,
      });

      const response = await adminFetch(`/api/admin/users?${params.toString()}`);
      
      setUsers(response.data || response.users || []);
      setTotalUsers(response.total || response.data?.length || 0);
      setTotalPages(Math.ceil((response.total || 0) / limit));
      setCurrentPage(page);
    } catch (error) {
      console.error("[AdminUsers] Failed to fetch users:", error);
      showToast?.(error.message || "Failed to load users", "error");
      // Fallback to demo data
      setUsers(getDemoUsers());
      setTotalUsers(51);
      setTotalPages(3);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filter, sortBy, sortOrder, showToast]);

  const getDemoUsers = () => {
    return [
      { id: "1", email: "wayne@imali-defi.com", name: "Wayne", tier: "admin", is_admin: true, created_at: "2024-01-15", last_login: "2024-06-30", status: "active", organization: "IMALI" },
      { id: "2", email: "enterprise@imali.com", name: "Enterprise User", tier: "enterprise", is_admin: false, created_at: "2024-02-20", last_login: "2024-06-29", status: "active", organization: "Enterprise Org" },
      { id: "3", email: "hassankiosman@gmail.com", name: "Hassan Kiosman", tier: "starter", is_admin: false, created_at: "2024-03-10", last_login: "2024-06-28", status: "active", organization: null },
      { id: "4", email: "perfectkuriso@gmail.com", name: "Perfect Kuriso", tier: "pro", is_admin: false, created_at: "2024-03-15", last_login: "2024-06-27", status: "active", organization: null },
      { id: "5", email: "garethadams@hotmail.com", name: "Gareth Adams", tier: "starter", is_admin: false, created_at: "2024-04-01", last_login: "2024-06-26", status: "inactive", organization: null },
    ];
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    fetchUsers(1);
  };

  const handleUserAction = async (userId, action, data = {}) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const endpoint = `/api/admin/users/${userId}/${action}`;
      await adminFetch(endpoint, { method: "POST", body: JSON.stringify(data) });
      showToast?.(`User ${action} completed successfully`, "success");
      fetchUsers(currentPage);
      refreshStats?.();
    } catch (error) {
      showToast?.(error.message || `Failed to ${action} user`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { color: "bg-emerald-500/20 text-emerald-400", label: "Active" },
      inactive: { color: "bg-gray-500/20 text-gray-400", label: "Inactive" },
      banned: { color: "bg-red-500/20 text-red-400", label: "Banned" },
      pending: { color: "bg-amber-500/20 text-amber-400", label: "Pending" },
    };
    const s = statusMap[status] || statusMap.inactive;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  const getTierBadge = (tier) => {
    const tierMap = {
      admin: { color: "bg-purple-500/20 text-purple-400", label: "Admin" },
      enterprise: { color: "bg-indigo-500/20 text-indigo-400", label: "Enterprise" },
      pro: { color: "bg-blue-500/20 text-blue-400", label: "Pro" },
      elite: { color: "bg-amber-500/20 text-amber-400", label: "Elite" },
      starter: { color: "bg-gray-500/20 text-gray-400", label: "Starter" },
    };
    const t = tierMap[tier] || tierMap.starter;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${t.color}`}>{t.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-sm text-white/60">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{totalUsers}</p>
          <p className="text-xs text-white/40">Total Users</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-blue-400">
            {users.filter(u => u.is_admin).length}
          </p>
          <p className="text-xs text-white/40">Admins</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-purple-400">
            {users.filter(u => u.tier === "enterprise").length}
          </p>
          <p className="text-xs text-white/40">Enterprise</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-red-400">
            {users.filter(u => u.status === "banned").length}
          </p>
          <p className="text-xs text-white/40">Banned</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 transition">
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                fetchUsers(1);
              }}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition ${
                filter === f.value
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/40">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort("email")}>
                Email {sortBy === "email" && (sortOrder === "asc" ? <FaChevronUp className="inline" /> : <FaChevronDown className="inline" />)}
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort("tier")}>
                Tier {sortBy === "tier" && (sortOrder === "asc" ? <FaChevronUp className="inline" /> : <FaChevronDown className="inline" />)}
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort("status")}>
                Status {sortBy === "status" && (sortOrder === "asc" ? <FaChevronUp className="inline" /> : <FaChevronDown className="inline" />)}
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort("created_at")}>
                Joined {sortBy === "created_at" && (sortOrder === "asc" ? <FaChevronUp className="inline" /> : <FaChevronDown className="inline" />)}
              </th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FaUserCircle className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name || user.email?.split("@")[0] || "User"}</p>
                        {user.organization && (
                          <p className="text-xs text-white/40">{user.organization}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{user.email}</td>
                  <td className="px-4 py-3">{getTierBadge(user.tier)}</td>
                  <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                  <td className="px-4 py-3 text-white/40">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      {!user.is_admin && (
                        <>
                          {user.status !== "banned" ? (
                            <button
                              onClick={() => handleUserAction(user.id, "ban")}
                              disabled={actionLoading[user.id]}
                              className="rounded-lg p-1.5 text-amber-400/60 hover:bg-white/10 hover:text-amber-400 transition"
                              title="Ban User"
                            >
                              {actionLoading[user.id] ? <FaSpinner className="animate-spin" /> : <FaBan />}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user.id, "unban")}
                              disabled={actionLoading[user.id]}
                              className="rounded-lg p-1.5 text-emerald-400/60 hover:bg-white/10 hover:text-emerald-400 transition"
                              title="Unban User"
                            >
                              {actionLoading[user.id] ? <FaSpinner className="animate-spin" /> : <FaUserCheck />}
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(user.id, "make-admin")}
                            disabled={actionLoading[user.id]}
                            className="rounded-lg p-1.5 text-purple-400/60 hover:bg-white/10 hover:text-purple-400 transition"
                            title="Make Admin"
                          >
                            {actionLoading[user.id] ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleUserAction(user.id, "delete")}
                        disabled={actionLoading[user.id]}
                        className="rounded-lg p-1.5 text-red-400/60 hover:bg-white/10 hover:text-red-400 transition"
                        title="Delete User"
                      >
                        {actionLoading[user.id] ? <FaSpinner className="animate-spin" /> : <FaTrash />}
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/40">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalUsers)} of {totalUsers} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchUsers(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaArrowLeft />
            </button>
            <span className="px-3 py-1.5 text-sm text-white/60">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => fetchUsers(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaArrowRight />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaUserCircle className="text-purple-400" />
                User Details
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/40">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Name</p>
                  <p className="font-medium">{selectedUser.name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Tier</p>
                  <p>{getTierBadge(selectedUser.tier)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Status</p>
                  <p>{getStatusBadge(selectedUser.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Joined</p>
                  <p className="text-white/60">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Last Login</p>
                  <p className="text-white/60">{formatDate(selectedUser.last_login)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Organization</p>
                  <p className="text-white/60">{selectedUser.organization || "None"}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    // Could navigate to user edit page
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-medium hover:bg-emerald-500 transition"
                >
                  <FaEdit className="inline mr-2" /> Edit User
                </button>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    // Could send email to user
                  }}
                  className="rounded-xl border border-white/10 px-6 py-2 text-sm font-medium hover:bg-white/10 transition"
                >
                  <FaEnvelope className="inline mr-2" /> Send Email
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="rounded-xl border border-white/10 px-6 py-2 text-sm font-medium hover:bg-white/10 transition ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
