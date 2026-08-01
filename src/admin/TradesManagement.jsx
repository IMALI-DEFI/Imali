// src/admin/TradesManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaSearch, FaFilter, FaDownload, FaEye, FaEdit, FaTimes, FaCheck, FaSpinner, FaChartLine } from "react-icons/fa";

// ==============================================
// SAFE UTILITY FUNCTIONS
// ==============================================

// Safe number formatter - prevents .toFixed errors
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00';
  
  let num;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    return '0.00';
  }
  
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

// Safe number parser - returns number or 0
const safeParseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Safe toLocaleString formatter for display
const formatCurrency = (value) => {
  const num = safeParseNumber(value);
  const formatted = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return num >= 0 ? `$${formatted}` : `-$${formatted}`;
};

// Safe number display with 4 decimals for quantities
const formatQuantity = (value) => {
  const num = safeParseNumber(value);
  return num.toFixed(4);
};

// ==============================================
// MAIN COMPONENT
// ==============================================

export default function TradesManagement({ apiBase, account, showToast, handleAction, stats }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrades, setTotalTrades] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    bot: "",
    user_id: "",
    search: ""
  });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updating, setUpdating] = useState(false);
  const [summary, setSummary] = useState({
    total_pnl: 0,
    winning_trades: 0,
    losing_trades: 0,
    avg_pnl: 0
  });

  const limit = 50;
  const abortControllerRef = useRef(null);

  // Get auth token safely
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('imali_token') || 
                  sessionStorage.getItem('imali_token');
    if (!token) {
      console.warn('No auth token found for trades management');
    }
    return token;
  }, []);

  const fetchTrades = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      console.warn('Skipping trades fetch - no auth token');
      setLoading(false);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      let url = `/api/admin/trades?page=${page}&limit=${limit}`;
      if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
      if (filters.bot) url += `&bot=${encodeURIComponent(filters.bot)}`;
      if (filters.user_id) url += `&user_id=${encodeURIComponent(filters.user_id)}`;
      
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const responseData = data.data || data;
        const tradesList = responseData.trades || [];
        
        // SAFE: Sanitize all trades - ensure numeric fields are numbers
        const sanitizedTrades = tradesList.map(trade => ({
          ...trade,
          qty: safeParseNumber(trade.qty),
          price: safeParseNumber(trade.price),
          pnl_usd: safeParseNumber(trade.pnl_usd),
          pnl_percent: safeParseNumber(trade.pnl_percent),
          exit_price: safeParseNumber(trade.exit_price),
          entry_price: safeParseNumber(trade.entry_price),
        }));
        
        setTrades(sanitizedTrades);
        setTotalPages(responseData.pagination?.totalPages || 1);
        setTotalTrades(responseData.pagination?.total || 0);
        
        // SAFE: Calculate summary with sanitized values
        const totalPnl = sanitizedTrades.reduce((sum, t) => sum + safeParseNumber(t.pnl_usd), 0);
        const winning = sanitizedTrades.filter(t => safeParseNumber(t.pnl_usd) > 0).length;
        const losing = sanitizedTrades.filter(t => safeParseNumber(t.pnl_usd) < 0).length;
        
        setSummary({
          total_pnl: totalPnl,
          winning_trades: winning,
          losing_trades: losing,
          avg_pnl: sanitizedTrades.length > 0 ? totalPnl / sanitizedTrades.length : 0
        });
      } else {
        throw new Error(data.error || 'Failed to fetch trades');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error("Failed to fetch trades:", error);
      if (showToast) {
        showToast(error.message || "Failed to load trades", "error");
      }
      // Set empty state on error
      setTrades([]);
      setTotalPages(1);
      setTotalTrades(0);
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [page, filters, apiBase, showToast, getAuthToken]);

  useEffect(() => {
    fetchTrades();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrades]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const applyFilters = () => {
    fetchTrades();
  };

  const resetFilters = () => {
    setFilters({ status: "", bot: "", user_id: "", search: "" });
    setPage(1);
    setTimeout(() => fetchTrades(), 100);
  };

  const exportToCSV = async () => {
    const token = getAuthToken();
    if (!token) {
      if (showToast) showToast("Please log in to export", "error");
      return;
    }
    
    try {
      const response = await fetch(`${apiBase}/api/admin/reports/trades?format=csv`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_export_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      if (showToast) showToast("Export started", "success");
    } catch (error) {
      console.error("Export failed:", error);
      if (showToast) showToast("Export failed", "error");
    }
  };

  const openEditModal = (trade) => {
    setSelectedTrade(trade);
    setEditForm({
      status: trade.status || "closed",
      pnl_usd: safeParseNumber(trade.pnl_usd),
      pnl_percent: safeParseNumber(trade.pnl_percent),
      exit_price: safeParseNumber(trade.exit_price, "")
    });
    setShowEditModal(true);
  };

  const updateTrade = async () => {
    const token = getAuthToken();
    if (!token) {
      if (showToast) showToast("Please log in to update", "error");
      return;
    }
    
    setUpdating(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/trades/${selectedTrade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editForm,
          pnl_usd: safeParseNumber(editForm.pnl_usd),
          pnl_percent: safeParseNumber(editForm.pnl_percent),
          exit_price: editForm.exit_price ? safeParseNumber(editForm.exit_price) : null
        })
      });
      
      const data = await response.json();
      if (data.success) {
        if (showToast) showToast("Trade updated successfully", "success");
        setShowEditModal(false);
        fetchTrades();
      } else {
        throw new Error(data.error || "Update failed");
      }
    } catch (error) {
      console.error("Update failed:", error);
      if (showToast) showToast(error.message || "Failed to update trade", "error");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      closed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      winning: "bg-green-500/20 text-green-300 border-green-500/30",
      losing: "bg-red-500/20 text-red-300 border-red-500/30"
    };
    return colors[status?.toLowerCase()] || colors.closed;
  };

  const getSideBadge = (side) => {
    const sideLower = side?.toLowerCase();
    if (sideLower === "buy") return "bg-green-500/20 text-green-300";
    if (sideLower === "sell") return "bg-red-500/20 text-red-300";
    return "bg-gray-500/20 text-gray-300";
  };

  // Show loading state
  if (loading && trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
        <p className="mt-2 text-sm text-white/50">Loading trades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - SAFE: using safeToFixed */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Total Trades</div>
          <div className="text-xl font-bold text-white">{totalTrades.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Total PnL</div>
          <div className={`text-xl font-bold ${summary.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(summary.total_pnl)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Win/Loss</div>
          <div className="text-xl font-bold text-white">
            {summary.winning_trades} / {summary.losing_trades}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Avg PnL</div>
          <div className={`text-xl font-bold ${summary.avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(summary.avg_pnl)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <FaFilter className="text-white/50" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filters.bot}
            onChange={(e) => handleFilterChange("bot", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="">All Bots</option>
            <option value="sniper">Sniper Bot</option>
            <option value="okx">OKX Bot</option>
            <option value="stocks">Stock Bot</option>
            <option value="futures">Futures Bot</option>
          </select>
          <input
            type="text"
            placeholder="User ID"
            value={filters.user_id}
            onChange={(e) => handleFilterChange("user_id", e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <div className="flex gap-2">
            <button onClick={applyFilters} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">
              Apply
            </button>
            <button onClick={resetFilters} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
              Reset
            </button>
            <button onClick={exportToCSV} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500">
              <FaDownload className="inline mr-1" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Trades Table - SAFE: using safe formatters */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Symbol</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">PnL</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Bot</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-white/50">No trades found</td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{trade.id?.slice(0, 8) || 'N/A'}</td>
                  <td className="px-4 py-3">{trade.email || trade.user_id?.slice(0, 8) || 'N/A'}</td>
                  <td className="px-4 py-3 font-medium">{trade.symbol || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getSideBadge(trade.side)}`}>
                      {trade.side?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatQuantity(trade.qty)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(trade.price)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${safeParseNumber(trade.pnl_usd) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(trade.pnl_usd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadge(trade.status)}`}>
                      {trade.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{trade.bot || '-'}</td>
                  <td className="px-4 py-3 text-xs">
                    {trade.created_at ? new Date(trade.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => openEditModal(trade)} 
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit Trade"
                    >
                      <FaEdit />
                    </button>
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
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50 hover:bg-white/5 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-50 hover:bg-white/5 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Trade</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/50 hover:text-white transition-colors">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/70">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">PnL (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.pnl_usd}
                  onChange={(e) => setEditForm({ ...editForm, pnl_usd: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Exit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.exit_price}
                  onChange={(e) => setEditForm({ ...editForm, exit_price: e.target.value ? parseFloat(e.target.value) : "" })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={updateTrade} 
                  disabled={updating} 
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {updating ? <FaSpinner className="mx-auto animate-spin" /> : "Save Changes"}
                </button>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5 transition-colors"
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
