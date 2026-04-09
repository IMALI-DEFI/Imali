// src/admin/ReportsTab.jsx
import React, { useState } from "react";
import { 
  FaDownload, 
  FaSpinner, 
  FaCalendar, 
  FaChartBar, 
  FaUsers, 
  FaChartLine,
  FaFileExcel,
  FaFileCsv,
  FaRobot,
  FaDollarSign,
  FaPercent,
  FaClock,
  FaExchangeAlt
} from "react-icons/fa";

export default function ReportsTab({ apiBase, showToast }) {
  const [reportType, setReportType] = useState("trades");
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    bot: "",
    status: "",
    min_pnl: "",
    max_pnl: "",
    symbol: ""
  });
  const [exportFormat, setExportFormat] = useState("csv");

  const generateReport = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/reports/${reportType}?`;
      
      if (dateRange.start) url += `start_date=${dateRange.start}&`;
      if (dateRange.end) url += `end_date=${dateRange.end}&`;
      if (filters.bot) url += `bot=${filters.bot}&`;
      if (filters.status) url += `status=${filters.status}&`;
      if (filters.min_pnl) url += `min_pnl=${filters.min_pnl}&`;
      if (filters.max_pnl) url += `max_pnl=${filters.max_pnl}&`;
      if (filters.symbol) url += `symbol=${filters.symbol}&`;
      
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setReportData(data.data);
        showToast("Report generated successfully", "success");
      } else {
        showToast(data.error || "Failed to generate report", "error");
      }
    } catch (error) {
      console.error("Report generation failed:", error);
      showToast("Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      let url = `/api/admin/reports/${reportType}?format=${exportFormat}`;
      if (dateRange.start) url += `&start_date=${dateRange.start}`;
      if (dateRange.end) url += `&end_date=${dateRange.end}`;
      if (filters.bot) url += `&bot=${filters.bot}`;
      if (filters.status) url += `&status=${filters.status}`;
      
      const response = await fetch(`${apiBase}${url}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${reportType}_report_${Date.now()}.${exportFormat === "csv" ? "csv" : "xlsx"}`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      showToast("Export started", "success");
    } catch (error) {
      showToast("Export failed", "error");
    }
  };

  const resetFilters = () => {
    setFilters({
      bot: "",
      status: "",
      min_pnl: "",
      max_pnl: "",
      symbol: ""
    });
    setDateRange({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  const getQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FaChartBar className="text-emerald-400" />
          <h3 className="text-lg font-semibold">Report Generator</h3>
        </div>
        
        {/* Report Type Selection */}
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/70">Report Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setReportType("trades")}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  reportType === "trades" 
                    ? "bg-emerald-600 shadow-lg" 
                    : "border border-white/10 hover:bg-white/5"
                }`}
              >
                <FaExchangeAlt className="inline mr-2" /> Trade Report
              </button>
              <button
                onClick={() => setReportType("users")}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  reportType === "users" 
                    ? "bg-emerald-600 shadow-lg" 
                    : "border border-white/10 hover:bg-white/5"
                }`}
              >
                <FaUsers className="inline mr-2" /> User Report
              </button>
            </div>
          </div>

          {/* Quick Date Ranges */}
          <div>
            <label className="mb-2 block text-sm text-white/70">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => getQuickDateRange(7)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                Last 7 days
              </button>
              <button onClick={() => getQuickDateRange(30)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                Last 30 days
              </button>
              <button onClick={() => getQuickDateRange(90)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                Last 90 days
              </button>
              <button onClick={() => getQuickDateRange(365)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                Last year
              </button>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/70">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/70">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Trade-specific Filters */}
        {reportType === "trades" && (
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">Bot</label>
              <select
                value={filters.bot}
                onChange={(e) => setFilters({ ...filters, bot: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">All Bots</option>
                <option value="sniper">🦄 Sniper Bot</option>
                <option value="okx">🔷 OKX Bot</option>
                <option value="stocks">📈 Stock Bot</option>
                <option value="futures">📊 Futures Bot</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">Symbol</label>
              <input
                type="text"
                placeholder="e.g., BTC, ETH, AAPL"
                value={filters.symbol}
                onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">Min PnL</label>
                <input
                  type="number"
                  placeholder="Min $"
                  value={filters.min_pnl}
                  onChange={(e) => setFilters({ ...filters, min_pnl: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">Max PnL</label>
                <input
                  type="number"
                  placeholder="Max $"
                  value={filters.max_pnl}
                  onChange={(e) => setFilters({ ...filters, max_pnl: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaCalendar />}
            {loading ? "Generating..." : "Generate Report"}
          </button>
          
          {reportData && (
            <>
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
                <button
                  onClick={exportReport}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-6 py-2.5 font-medium transition hover:bg-white/5"
                >
                  {exportFormat === "csv" ? <FaFileCsv /> : <FaFileExcel />}
                  Export
                </button>
              </div>
              <button
                onClick={resetFilters}
                className="rounded-lg border border-white/10 px-6 py-2.5 transition hover:bg-white/5"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <FaChartBar className="text-emerald-400" />
              Report Results
            </h3>
            <div className="text-xs text-white/40">
              Generated: {new Date().toLocaleString()}
            </div>
          </div>
          
          {/* Summary Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <div className="text-xs text-white/50">Total {reportType === "trades" ? "Trades" : "Users"}</div>
              <div className="text-xl font-bold text-white">{reportData.summary?.total_trades || reportData.users?.length || 0}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <div className="text-xs text-white/50">Total PnL</div>
              <div className={`text-xl font-bold ${(reportData.summary?.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(reportData.summary?.total_pnl || 0).toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <div className="text-xs text-white/50">Win Rate</div>
              <div className="text-xl font-bold text-white">{reportData.summary?.win_rate || 0}%</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-center">
              <div className="text-xs text-white/50">Total Volume</div>
              <div className="text-xl font-bold text-white">${(reportData.summary?.total_volume || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* By Bot Breakdown */}
          {reportData.by_bot && Object.keys(reportData.by_bot).length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
                <FaRobot /> Performance by Bot
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2 text-left">Bot</th>
                      <th className="px-3 py-2 text-right">Trades</th>
                      <th className="px-3 py-2 text-right">PnL</th>
                      <th className="px-3 py-2 text-right">Wins</th>
                      <th className="px-3 py-2 text-right">Losses</th>
                      <th className="px-3 py-2 text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.by_bot).map(([name, data]) => (
                      <tr key={name} className="border-b border-white/5">
                        <td className="px-3 py-2 font-medium capitalize">{name}</td>
                        <td className="px-3 py-2 text-right">{data.count}</td>
                        <td className={`px-3 py-2 text-right ${data.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${data.pnl.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-green-400">{data.wins}</td>
                        <td className="px-3 py-2 text-right text-red-400">{data.losses}</td>
                        <td className="px-3 py-2 text-right">
                          {data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Performance Table */}
          {reportType === "users" && reportData.users && reportData.users.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
                <FaUsers /> User Performance
              </h4>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 border-b border-white/10 bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-right">Trades</th>
                      <th className="px-3 py-2 text-right">Total PnL</th>
                      <th className="px-3 py-2 text-right">Wins</th>
                      <th className="px-3 py-2 text-right">Losses</th>
                      <th className="px-3 py-2 text-right">Win Rate</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.users.map((user, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2">{user.email?.split('@')[0] || user.id?.slice(0, 8)}</td>
                        <td className="px-3 py-2 text-right">{user.total_trades || 0}</td>
                        <td className={`px-3 py-2 text-right ${(user.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(user.total_pnl || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-green-400">{user.winning_trades || 0}</td>
                        <td className="px-3 py-2 text-right text-red-400">{user.losing_trades || 0}</td>
                        <td className="px-3 py-2 text-right">{user.win_rate?.toFixed(1) || 0}%</td>
                        <td className="px-3 py-2 text-right">${(user.total_volume || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trades List */}
          {reportType === "trades" && reportData.trades && reportData.trades.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
                <FaExchangeAlt /> Recent Trades
              </h4>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-white/10 bg-gray-900">
                    <tr>
                      <th className="px-2 py-2 text-left">User</th>
                      <th className="px-2 py-2 text-left">Symbol</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Price</th>
                      <th className="px-2 py-2 text-right">PnL</th>
                      <th className="px-2 py-2 text-left">Bot</th>
                      <th className="px-2 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.trades.slice(0, 50).map((trade, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="px-2 py-2">{trade.user_email?.split('@')[0] || trade.user_id?.slice(0, 8)}</td>
                        <td className="px-2 py-2 font-medium">{trade.symbol}</td>
                        <td className="px-2 py-2 text-right">{trade.qty?.toFixed(4)}</td>
                        <td className="px-2 py-2 text-right">${trade.price?.toFixed(2)}</td>
                        <td className={`px-2 py-2 text-right ${trade.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${trade.pnl_usd?.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 capitalize">{trade.bot || '-'}</td>
                        <td className="px-2 py-2">{new Date(trade.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.trades.length > 50 && (
                  <div className="mt-2 text-center text-xs text-white/40">
                    Showing first 50 of {reportData.trades.length} trades
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
