import React, { useState, useEffect, useCallback } from "react";
import useAdmin from "../hooks/useAdmin";

export default function AuditLogs({ showToast }) {
  const { adminFetch, isAdmin, loading: adminLoading } = useAdmin();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [filters, setFilters] = useState({
    user_id: "",
    action: "",
    start_date: "",
    end_date: "",
  });

  const [stats, setStats] = useState({
    total: 0,
    unique_users: 0,
    actions: {},
  });

  const buildQueryString = useCallback(
    (pageOverride = pagination.page) => {
      const queryParams = new URLSearchParams();

      if (filters.user_id?.trim()) queryParams.append("user_id", filters.user_id.trim());
      if (filters.action?.trim()) queryParams.append("action", filters.action.trim());
      if (filters.start_date) queryParams.append("start_date", filters.start_date);
      if (filters.end_date) queryParams.append("end_date", filters.end_date);

      queryParams.append("page", String(pageOverride));
      queryParams.append("limit", String(pagination.limit));

      return queryParams.toString();
    },
    [filters, pagination.limit]
  );

  const computeStats = useCallback((logsData) => {
    const uniqueUsers = new Set(
      logsData.map((log) => log.user_id).filter(Boolean)
    ).size;

    const actionCounts = {};
    logsData.forEach((log) => {
      const action = log.action || "unknown";
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    setStats({
      total: logsData.length,
      unique_users: uniqueUsers,
      actions: actionCounts,
    });
  }, []);

  const fetchLogs = useCallback(
    async (pageOverride = 1, isManualRefresh = false) => {
      // Don't fetch if not admin or still loading admin status
      if (!isAdmin && !adminLoading) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      // Check for valid token before fetching
      const token = localStorage.getItem('imali_token');
      if (!token) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const query = buildQueryString(pageOverride);
        const response = await adminFetch(`/api/admin/audit-logs?${query}`);

        // Check if response indicates auth error
        if (response?.status === 403 || response?.error?.includes("Admin access required")) {
          setAuthError(true);
          setLogs([]);
          computeStats([]);
          return;
        }

        const payload = response?.data || {};
        const logsData = payload.logs || [];
        const paginationData = payload.pagination || {};

        setLogs(logsData);
        computeStats(logsData);
        setAuthError(false);

        setPagination((prev) => ({
          ...prev,
          page: paginationData.page ?? pageOverride,
          limit: paginationData.limit ?? prev.limit,
          total: paginationData.total ?? logsData.length,
          totalPages: paginationData.totalPages ?? 1,
        }));
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        const errorMessage = error?.message || "";
        
        if (errorMessage.includes("403") || 
            errorMessage.includes("Admin access required") ||
            errorMessage.includes("No authentication token")) {
          setAuthError(true);
        }
        showToast?.(errorMessage || "Failed to fetch audit logs", "error");
        setLogs([]);
        computeStats([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminFetch, buildQueryString, computeStats, showToast, isAdmin, adminLoading]
  );

  // Initial fetch only when admin is confirmed
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchLogs(1);
    }
  }, [isAdmin, adminLoading]); // Remove filters from dependencies to prevent excessive calls

  // Refetch when filters change (but only if admin)
  useEffect(() => {
    if (isAdmin && !adminLoading && !authError) {
      fetchLogs(1);
    }
  }, [filters, isAdmin, adminLoading, authError]);

  // Stop polling if not admin or auth error
  useEffect(() => {
    let interval;
    if (isAdmin && !authError && !adminLoading) {
      interval = setInterval(() => {
        fetchLogs(pagination.page, true);
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchLogs, pagination.page, isAdmin, authError, adminLoading]);

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters({
      user_id: "",
      action: "",
      start_date: "",
      end_date: "",
    });
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchLogs(newPage, true);
  };

  const formatDetails = (details) => {
    if (!details) return "-";

    try {
      if (typeof details === "string") {
        const trimmed = details.trim();
        if (!trimmed) return "-";

        try {
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed);
        } catch {
          return trimmed;
        }
      }

      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  };

  const getActionStyle = (action = "") => {
    const lower = action.toLowerCase();

    if (lower.includes("error") || lower.includes("fail")) {
      return "bg-red-500/20 text-red-300";
    }
    if (lower.includes("create") || lower.includes("add")) {
      return "bg-emerald-500/20 text-emerald-300";
    }
    if (lower.includes("update") || lower.includes("edit")) {
      return "bg-blue-500/20 text-blue-300";
    }
    if (lower.includes("delete") || lower.includes("remove")) {
      return "bg-amber-500/20 text-amber-300";
    }

    return "bg-purple-500/20 text-purple-300";
  };

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Show access denied message if not admin
  if (authError || (!isAdmin && !adminLoading)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="mb-4 text-6xl">🔒</div>
        <h3 className="mb-2 text-xl font-semibold text-white">Admin Access Required</h3>
        <p className="text-white/60">You don't have permission to view audit logs.</p>
        <p className="mt-2 text-sm text-white/40">Please contact an administrator to request access.</p>
        <button
          onClick={() => {
            const token = localStorage.getItem('imali_token');
            if (!token) {
              window.location.href = '/login';
            } else {
              setAuthError(false);
              fetchLogs(1);
            }
          }}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <span>📋</span> Audit Logs
          </h3>
          <p className="text-sm text-white/50">System activity and audit trail</p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page, true)}
          disabled={refreshing}
          className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          title="Refresh audit logs"
        >
          <svg
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
          <div className="text-sm text-white/50">Visible Events</div>
          <div className="mt-1 text-2xl font-bold text-blue-400">{stats.total}</div>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-4">
          <div className="text-sm text-white/50">Unique Users</div>
          <div className="mt-1 text-2xl font-bold text-purple-400">{stats.unique_users}</div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
          <div className="text-sm text-white/50">Unique Actions</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {Object.keys(stats.actions).length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold">Filters</h4>
          <button
            onClick={clearFilters}
            className="text-xs text-white/40 hover:text-white/60"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="User ID"
            value={filters.user_id}
            onChange={(e) => handleFilterChange("user_id", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />

          <input
            type="text"
            placeholder="Action"
            value={filters.action}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange("start_date", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange("end_date", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP Address</th>
              <tr>
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
                  <tr key={log.id || i} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-xs text-white/40">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{log.user_email || "System"}</div>
                      <div className="text-xs text-white/40">
                        {log.user_id ? `${String(log.user_id).slice(0, 8)}...` : "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getActionStyle(log.action)}`}
                      >
                        {log.action || "unknown"}
                      </span>
                    </td>

                    <td className="max-w-xs truncate px-4 py-3">
                      {formatDetails(log.details).slice(0, 80)}
                    </td>

                    <td className="px-4 py-3 text-xs text-white/40">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
            <div className="text-white/50">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} • Total {pagination.total}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1 || refreshing}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>

              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={
                  pagination.page >= pagination.totalPages ||
                  pagination.totalPages <= 1 ||
                  refreshing
                }
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
