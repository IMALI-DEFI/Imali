// src/admin/AdminPlatformCustomers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaCubes, FaUsers, FaSearch, FaEye, FaEdit, 
  FaTrash, FaSpinner, FaFilter, FaBuilding,
  FaCreditCard, FaCalendar, FaChevronLeft, FaChevronRight,
  FaDownload, FaRefresh, FaUserCircle, FaShieldAlt,
  FaBan, FaCheck, FaEnvelope
} from 'react-icons/fa';

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const getAuthToken = () => {
  try {
    return localStorage.getItem("imali_token");
  } catch (e) {
    console.error("[AdminPlatformCustomers] Failed to get token:", e);
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

const AdminPlatformCustomers = ({ showToast }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const limit = 20;

  const fetchCustomers = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      // Fetch users with product_type = 'admin'
      const params = new URLSearchParams({
        page,
        limit,
        search: searchQuery || "",
        product_type: 'admin',
        filter: filter !== 'all' ? filter : "",
      });

      const response = await adminFetch(`/api/admin/users?${params.toString()}`);
      
      setCustomers(response.data || response.users || []);
      setTotalPages(Math.ceil((response.total || 0) / limit));
      setCurrentPage(page);
    } catch (error) {
      console.error("[AdminPlatformCustomers] Failed to fetch customers:", error);
      showToast?.(error.message || "Failed to load customers", "error");
      // Demo data
      setCustomers([
        { 
          id: '1', 
          email: 'techstart@example.com', 
          name: 'TechStart Inc', 
          plan: 'business',
          status: 'active',
          organization: 'TechStart Inc',
          users: 12,
          joined: '2024-01-15',
          lastLogin: '2026-01-14'
        },
        { 
          id: '2', 
          email: 'datavault@example.com', 
          name: 'DataVault LLC', 
          plan: 'enterprise',
          status: 'active',
          organization: 'DataVault LLC',
          users: 25,
          joined: '2024-02-20',
          lastLogin: '2026-01-13'
        },
        { 
          id: '3', 
          email: 'cloudsync@example.com', 
          name: 'CloudSync Inc', 
          plan: 'professional',
          status: 'suspended',
          organization: 'CloudSync Inc',
          users: 5,
          joined: '2024-03-10',
          lastLogin: '2025-12-20'
        },
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filter, showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCustomerAction = async (customerId, action, data = {}) => {
    setActionLoading(prev => ({ ...prev, [customerId]: true }));
    try {
      const endpoint = `/api/admin/users/${customerId}/${action}`;
      await adminFetch(endpoint, { method: "POST", body: JSON.stringify(data) });
      showToast?.(`Customer ${action} completed successfully`, "success");
      fetchCustomers(currentPage);
    } catch (error) {
      showToast?.(error.message || `Failed to ${action} customer`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const getPlanBadge = (plan) => {
    const map = {
      enterprise: { color: 'bg-amber-500/20 text-amber-400', icon: '👑' },
      business: { color: 'bg-purple-500/20 text-purple-400', icon: '💼' },
      professional: { color: 'bg-blue-500/20 text-blue-400', icon: '⭐' },
    };
    const p = map[plan] || map.professional;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${p.color}`}>{p.icon} {plan || 'professional'}</span>;
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Active' },
      suspended: { color: 'bg-red-500/20 text-red-400', label: 'Suspended' },
      pending: { color: 'bg-amber-500/20 text-amber-400', label: 'Pending' },
    };
    const s = map[status] || map.active;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaCubes className="text-purple-400" />
            Admin Platform Customers
          </h2>
          <p className="text-sm text-white/40">Manage organizations using the Admin Platform</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchCustomers(1)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            <FaRefresh /> Refresh
          </button>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{customers.length}</p>
          <p className="text-xs text-white/40">Total Customers</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{customers.filter(c => c.status === 'active').length}</p>
          <p className="text-xs text-white/40">Active</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{customers.filter(c => c.plan === 'enterprise').length}</p>
          <p className="text-xs text-white/40">Enterprise</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{customers.reduce((sum, c) => sum + (c.users || 0), 0)}</p>
          <p className="text-xs text-white/40">Total Users</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by name, email, or organization..."
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
          <option value="all">All Plans</option>
          <option value="professional">Professional</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button 
          onClick={() => fetchCustomers(1)}
          className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition"
        >
          Apply Filters
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-left text-white/40">
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Users</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                    No Admin Platform customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <FaBuilding className="text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name || customer.organization}</p>
                          <p className="text-xs text-white/40">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getPlanBadge(customer.plan)}</td>
                    <td className="px-4 py-3">{getStatusBadge(customer.status)}</td>
                    <td className="px-4 py-3 text-white/60">{customer.users || 0}</td>
                    <td className="px-4 py-3 text-white/40">{formatDate(customer.joined)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedCustomer(customer); setShowCustomerModal(true); }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        {customer.status === 'active' ? (
                          <button
                            onClick={() => handleCustomerAction(customer.id, 'suspend')}
                            disabled={actionLoading[customer.id]}
                            className="p-1.5 text-amber-400/60 hover:text-amber-400 hover:bg-white/10 rounded-lg transition"
                            title="Suspend"
                          >
                            {actionLoading[customer.id] ? <FaSpinner className="animate-spin" /> : <FaBan />}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCustomerAction(customer.id, 'activate')}
                            disabled={actionLoading[customer.id]}
                            className="p-1.5 text-emerald-400/60 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition"
                            title="Activate"
                          >
                            {actionLoading[customer.id] ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          </button>
                        )}
                        <button
                          onClick={() => handleCustomerAction(customer.id, 'delete')}
                          disabled={actionLoading[customer.id]}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                          title="Delete"
                        >
                          {actionLoading[customer.id] ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                        </button>
                      </div>
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
              onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); fetchCustomers(Math.max(1, currentPage - 1)); }}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); fetchCustomers(Math.min(totalPages, currentPage + 1)); }}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-white/10 rounded-lg text-sm disabled:opacity-40 hover:bg-white/5 transition"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaBuilding className="text-purple-400" />
                {selectedCustomer.name || selectedCustomer.organization}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/40">Organization</p>
                  <p className="font-medium">{selectedCustomer.organization || selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Email</p>
                  <p className="text-white/60">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Plan</p>
                  <p>{getPlanBadge(selectedCustomer.plan)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Status</p>
                  <p>{getStatusBadge(selectedCustomer.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Total Users</p>
                  <p className="text-white/60">{selectedCustomer.users || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Joined</p>
                  <p className="text-white/60">{formatDate(selectedCustomer.joined)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Last Login</p>
                  <p className="text-white/60">{formatDate(selectedCustomer.lastLogin)}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
                  <FaEdit /> Edit
                </button>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
                  <FaEnvelope /> Contact
                </button>
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

export default AdminPlatformCustomers;
