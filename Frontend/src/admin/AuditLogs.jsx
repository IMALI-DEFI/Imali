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
    [filters, pagination.page, pagination.limit]
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
    async (pageOverride = pagination.page, isManualRefresh = false) => {
      // Don't fetch if not admin
      if (!isAdmin && !adminLoading) {
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
        if (error?.message?.includes("403") || error?.message?.includes("Admin access required")) {
          setAuthError(true);
        }
        showToast?.(error?.message || "Failed to fetch audit logs", "error");
        setLogs([]);
        computeStats([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminFetch, buildQueryString, computeStats, pagination.page, showToast, isAdmin, adminLoading]
  );

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchLogs(1);
    }
  }, [filters, fetchLogs, isAdmin, adminLoading]);

  // Stop polling if not admin
  useEffect(() => {
    let interval;
    if (isAdmin && !authError) {
      interval = setInterval(() => {
        fetchLogs(pagination.page, true);
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchLogs, pagination.page, isAdmin, authError]);

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

  // Show access denied message if not admin
  if (authError || (!isAdmin && !adminLoading)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="mb-4 text-6xl">🔒</div>
        <h3 className="mb-2 text-xl font-semibold text-white">Admin Access Required</h3>
        <p className="text-white/60">You don't have permission to view audit logs.</p>
        <p className="mt-2 text-sm text-white/40">Please contact an administrator to request access.</p>
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
      {/* Rest of your component remains the same */}
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

      {/* Rest of your JSX - stats cards, filters, table, pagination */}
      {/* ... keep the existing JSX from your original component ... */}
    </div>
  );
}
