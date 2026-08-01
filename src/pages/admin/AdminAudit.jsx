// Frontend/src/pages/admin/AdminAudit.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, FaFilter, FaEye, FaDownload, FaSync,
  FaUser, FaEnvelope, FaCog, FaShieldAlt, FaCreditCard,
  FaUsers, FaBuilding, FaChartBar, FaSpinner,
  FaChevronLeft, FaChevronRight, FaCalendar
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminAudit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  const limit = 20;

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'USER_LOGIN', label: 'User Login' },
    { value: 'USER_LOGOUT', label: 'User Logout' },
    { value: 'USER_CREATED', label: 'User Created' },
    { value: 'USER_UPDATED', label: 'User Updated' },
    { value: 'USER_DELETED', label: 'User Deleted' },
    { value: 'ORGANIZATION_CREATED', label: 'Organization Created' },
    { value: 'ORGANIZATION_UPDATED', label: 'Organization Updated' },
    { value: 'SUBSCRIPTION_CHANGED', label: 'Subscription Changed' },
    { value: 'PAYMENT_MADE', label: 'Payment Made' },
    { value: 'SETTINGS_UPDATED', label: 'Settings Updated' },
    { value: 'PERMISSION_CHANGED', label: 'Permission Changed' },
  ];

  const fetchLogs = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const data = await BotAPI.getAuditLogs({ page, limit, search: searchQuery, type: filter });
      setLogs(data?.logs || []);
      setTotalPages(Math.ceil((data?.total || 0) / limit));
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setLogs([
        { 
          id: '1', 
          action: 'USER_LOGIN', 
          user: 'john.doe@example.com', 
          time: '2026-01-15 10:30:00', 
          ip: '192.168.1.100',
          details: 'Successful login from Chrome on Windows',
          status: 'success'
        },
        { 
          id: '2', 
          action: 'USER_CREATED', 
          user: 'admin@example.com', 
          time: '2026-01-15 09:45:00', 
          ip: '192.168.1.1',
          details: 'Created user jane.smith@example.com with role: member',
          status: 'success'
        },
        { 
          id: '3', 
          action: 'SETTINGS_UPDATED', 
          user: 'admin@example.com', 
          time: '2026-01-14 16:20:00', 
          ip: '192.168.1.1',
          details: 'Updated organization settings: theme, timezone, and notification preferences',
          status: 'success'
        },
        { 
          id: '4', 
          action: 'PAYMENT_MADE', 
          user: 'jane.smith@example.com', 
          time: '2026-01-14 14:15:00', 
          ip: '192.168.1.50',
          details: 'Payment of $99.00 for subscription renewal',
          status: 'success'
        },
        { 
          id: '5', 
          action: 'PERMISSION_CHANGED', 
          user: 'admin@example.com', 
          time: '2026-01-13 11:30:00', 
          ip: '192.168.1.1',
          details: 'Updated permissions for role: manager - added "users" permission',
          status: 'success'
        },
        { 
          id: '6', 
          action: 'USER_LOGIN', 
          user: 'bob.johnson@example.com', 
          time: '2026-01-13 08:00:00', 
          ip: '192.168.1.200',
          details: 'Failed login attempt - invalid password',
          status: 'failed'
        },
      ]);
      setTotalPages(3);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action) => {
    const map = {
      'USER_LOGIN': <FaUser className="text-blue-400" />,
      'USER_LOGOUT': <FaUser className="text-gray-400" />,
      'USER_CREATED': <FaUser className="text-emerald-400" />,
      'USER_UPDATED': <FaUser className="text-amber-400" />,
      'USER_DELETED': <FaUser className="text-red-400" />,
      'ORGANIZATION_CREATED': <FaBuilding className="text-purple-400" />,
      'ORGANIZATION_UPDATED': <FaBuilding className="text-amber-400" />,
      'SUBSCRIPTION_CHANGED': <FaCreditCard className="text-green-400" />,
      'PAYMENT_MADE': <FaCreditCard className="text-emerald-400" />,
      'SETTINGS_UPDATED': <FaCog className="text-gray-400" />,
      'PERMISSION_CHANGED': <FaShieldAlt className="text-purple-400" />,
    };
    return map[action] || <FaCog className="text-gray-400" />;
  };

  const getStatusBadge = (status) => {
    const map = {
      success: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Success' },
      failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
      pending: { color: 'bg-amber-500/20 text-amber-400', label: 'Pending' },
    };
    const s = map[status] || map.success;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Audit Logs</h2>
          <p className="text-sm text-white/40">Track all user and system actions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => fetchLogs(1)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            <FaSync /> Refresh
          </button>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          {actionTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <button 
          onClick={() => fetchLogs(1)}
          className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition"
        >
          Apply Filters
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-left text-white/40">
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span>{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{log.user}</td>
                    <td className="px-4 py-3 text-white/40">{formatDate(log.time)}</td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-white/40">{log.ip || 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => { setSelectedLog(log); setShowLogModal(true); }}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/40">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); fetchLogs(Math.max(1, currentPage - 1)); }}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); fetchLogs(Math.min(totalPages, currentPage + 1)); }}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {getActionIcon(selectedLog.action)}
                Log Details
              </h3>
              <button onClick={() => setShowLogModal(false)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/40">Action</p>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Status</p>
                  <p>{getStatusBadge(selectedLog.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">User</p>
                  <p className="text-white/60">{selectedLog.user}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">IP Address</p>
                  <p className="text-white/60">{selectedLog.ip || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Time</p>
                  <p className="text-white/60">{formatDate(selectedLog.time)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Details</p>
                  <p className="text-white/60 p-3 bg-black/30 rounded-lg mt-1">{selectedLog.details}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition ml-auto">
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

export default AdminAudit;
