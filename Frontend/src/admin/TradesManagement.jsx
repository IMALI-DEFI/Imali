// src/admin/TradesManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FaSearch, FaFilter, FaDownload, FaEye, FaEdit, FaTimes, FaCheck, FaSpinner, FaChartLine } from "react-icons/fa";

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

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/trades?page=${page}&limit=${limit}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.bot) url += `&bot=${filters.bot}`;
      if (filters.user_id) url += `&user_id=${filters.user_id}`;
      
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setTrades(data.data?.trades || []);
        setTotalPages(data.data?.pagination?.totalPages || 1);
        setTotalTrades(data.data?.pagination?.total || 0);
        
        // Calculate summary
        const tradesList = data.data?.trades || [];
        const totalPnl = tradesList.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
        const winning = tradesList.filter(t => t.pnl_usd > 0).length;
        const losing = tradesList.filter(t => t.pnl_usd < 0).length;
        setSummary({
          total_pnl: totalPnl,
          winning_trades: winning,
          losing_trades: losing,
          avg_pnl: tradesList.length > 0 ? totalPnl / tradesList.length : 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error);
      showToast("Failed to load trades", "error");
    } finally {
      setLoading(false);
    }
  }, [page, filters, apiBase, showToast]);

  useEffect(() => {
    fetchTrades();
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
    try {
      const response = await fetch(`${apiBase}/api/admin/reports/trades?format=csv`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_export_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Export started", "success");
    } catch (error) {
      showToast("Export failed", "error");
    }
  };

  const openEditModal = (trade) => {
    setSelectedTrade(trade);
    setEditForm({
      status: trade.status,
      pnl_usd: trade.pnl_usd,
      pnl_percent: trade.pnl_percent,
      exit_price: trade.exit_price || ""
    });
    setShowEditModal(true);
  };

  const updateTrade = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/trades/${selectedTrade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (data.success) {
        showToast("Trade updated successfully", "success");
        setShowEditModal(false);
        fetchTrades();
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (error) {
      showToast("Failed to update trade", "error");
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
    return colors[status] || colors.closed;
  };

  const getSideBadge = (side) => {
    if (side === "buy") return "bg-green-500/20 text-green-300";
    if (side === "sell") return "bg-red-500/20 text-red-300";
    return "bg-gray-500/20 text-gray-300";
  };

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Total Trades</div>
          <div className="text-xl font-bold text-white">{totalTrades}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-white/50">Total PnL</div>
          <div className={`text-xl font-bold ${summary.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${summary.total_pnl.toFixed(2)}
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
            ${summary.avg_pnl.toFixed(2)}
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

      {/* Trades Table */}
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
                  <td className="px-4 py-3 font-mono text-xs">{trade.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">{trade.email || trade.user_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getSideBadge(trade.side)}`}>
                      {trade.side?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{parseFloat(trade.qty).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right">${parseFloat(trade.price).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${parseFloat(trade.pnl_usd) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${parseFloat(trade.pnl_usd || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadge(trade.status)}`}>
                      {trade.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{trade.bot || "-"}</td>
                  <td className="px-4 py-3 text-xs">{new Date(trade.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEditModal(trade)} className="text-blue-400 hover:text-blue-300">
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Trade</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white/50 hover:text-white">
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
                  value={editForm.pnl_usd}
                  onChange={(e) => setEditForm({ ...editForm, pnl_usd: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Exit Price</label>
                <input
                  type="number"
                  value={editForm.exit_price}
                  onChange={(e) => setEditForm({ ...editForm, exit_price: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={updateTrade} disabled={updating} className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
                  {updating ? <FaSpinner className="mx-auto animate-spin" /> : "Save Changes"}
                </button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5">
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