// src/pages/admin/AdminOrganizations.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaBuilding, FaUsers, FaEdit, FaEye, FaPlus, FaTrash,
  FaSearch, FaSpinner, FaCheck, FaTimes, FaCrown,
  FaUserPlus, FaEnvelope, FaSync, FaFilter,
  FaDollarSign, FaCalendar, FaClock, FaLink
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [newOrg, setNewOrg] = useState({ name: '', plan: 'professional', email: '' });

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await BotAPI.getOrganizations();
      setOrganizations(data || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      // Demo data
      setOrganizations([
        { 
          id: '1', 
          name: 'Acme Corp', 
          plan: 'business', 
          members: 12, 
          status: 'active', 
          created: '2024-01-15',
          owner: 'john@acme.com',
          revenue: 45000,
          subscription: 'active'
        },
        { 
          id: '2', 
          name: 'TechStart Inc', 
          plan: 'professional', 
          members: 5, 
          status: 'active', 
          created: '2024-02-20',
          owner: 'jane@techstart.com',
          revenue: 12000,
          subscription: 'active'
        },
        { 
          id: '3', 
          name: 'DataVault LLC', 
          plan: 'enterprise', 
          members: 25, 
          status: 'active', 
          created: '2024-03-10',
          owner: 'bob@datavault.com',
          revenue: 89000,
          subscription: 'active'
        },
        { 
          id: '4', 
          name: 'CloudSync', 
          plan: 'business', 
          members: 8, 
          status: 'suspended', 
          created: '2024-04-05',
          owner: 'alice@cloudsync.com',
          revenue: 23000,
          subscription: 'inactive'
        },
        { 
          id: '5', 
          name: 'AI Solutions', 
          plan: 'professional', 
          members: 3, 
          status: 'pending', 
          created: '2024-05-01',
          owner: 'mike@aisolutions.com',
          revenue: 0,
          subscription: 'pending'
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          org.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          org.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || org.status === filter || org.plan === filter;
    return matchesSearch && matchesFilter;
  });

  const handleOrgAction = async (orgId, action) => {
    setActionLoading(prev => ({ ...prev, [orgId]: true }));
    try {
      // await BotAPI.updateOrganization(orgId, { status: action });
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchOrganizations();
    } catch (error) {
      console.error(`Failed to ${action} organization:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [orgId]: false }));
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrg.name) return;
    
    setActionLoading(prev => ({ ...prev, create: true }));
    try {
      // await BotAPI.createOrganization(newOrg);
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowCreateModal(false);
      setNewOrg({ name: '', plan: 'professional', email: '' });
      await fetchOrganizations();
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  const getPlanBadge = (plan) => {
    const map = {
      enterprise: { color: 'bg-amber-500/20 text-amber-400', icon: <FaCrown className="inline mr-1" />, label: 'Enterprise' },
      business: { color: 'bg-purple-500/20 text-purple-400', icon: <FaBuilding className="inline mr-1" />, label: 'Business' },
      professional: { color: 'bg-blue-500/20 text-blue-400', icon: <FaLink className="inline mr-1" />, label: 'Professional' },
      starter: { color: 'bg-gray-500/20 text-gray-400', icon: null, label: 'Starter' },
    };
    const p = map[plan] || map.starter;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${p.color}`}>{p.icon} {p.label}</span>;
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Active' },
      suspended: { color: 'bg-red-500/20 text-red-400', label: 'Suspended' },
      pending: { color: 'bg-amber-500/20 text-amber-400', label: 'Pending' },
      inactive: { color: 'bg-gray-500/20 text-gray-400', label: 'Inactive' },
    };
    const s = map[status] || map.active;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Organizations</h2>
          <p className="text-sm text-white/40">{organizations.length} total organizations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2"
          >
            <FaPlus /> Create Organization
          </button>
          <button 
            onClick={fetchOrganizations}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{organizations.length}</p>
          <p className="text-xs text-white/40">Total</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{organizations.filter(o => o.status === 'active').length}</p>
          <p className="text-xs text-white/40">Active</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{organizations.filter(o => o.plan === 'enterprise').length}</p>
          <p className="text-xs text-white/40">Enterprise</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{organizations.reduce((sum, o) => sum + (o.members || 0), 0)}</p>
          <p className="text-xs text-white/40">Total Members</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
          <option value="enterprise">Enterprise</option>
          <option value="business">Business</option>
          <option value="professional">Professional</option>
        </select>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrgs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/40">
            No organizations found
          </div>
        ) : (
          filteredOrgs.map((org) => (
            <div key={org.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FaBuilding className="text-purple-400" />
                    <h3 className="font-semibold truncate">{org.name}</h3>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getPlanBadge(org.plan)}
                    {getStatusBadge(org.status)}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => { setSelectedOrg(org); setShowOrgModal(true); }}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                  >
                    <FaEye />
                  </button>
                  <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                    <FaEdit />
                  </button>
                  <button 
                    onClick={() => handleOrgAction(org.id, 'delete')}
                    disabled={actionLoading[org.id]}
                    className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                  >
                    {actionLoading[org.id] ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="flex items-center gap-1 text-white/60">
                  <FaUsers /> {org.members || 0} members
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <FaDollarSign /> {formatCurrency(org.revenue || 0)}
                </span>
                <span className="flex items-center gap-1 text-white/40 col-span-2">
                  <FaCalendar /> Joined {formatDate(org.created)}
                </span>
              </div>
              {org.owner && (
                <p className="mt-2 text-xs text-white/40 truncate">Owner: {org.owner}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Organization Detail Modal */}
      {showOrgModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaBuilding className="text-purple-400" />
                {selectedOrg.name}
              </h3>
              <button onClick={() => setShowOrgModal(false)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/40">Plan</p>
                  <p>{getPlanBadge(selectedOrg.plan)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Status</p>
                  <p>{getStatusBadge(selectedOrg.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Members</p>
                  <p className="font-medium">{selectedOrg.members || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Revenue</p>
                  <p className="text-emerald-400 font-medium">{formatCurrency(selectedOrg.revenue || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Created</p>
                  <p className="text-white/60">{formatDate(selectedOrg.created)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Subscription</p>
                  <p className="text-white/60">{selectedOrg.subscription || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Owner</p>
                  <p className="text-white/60">{selectedOrg.owner || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-white/40">Organization ID</p>
                  <p className="text-white/40 text-xs font-mono">{selectedOrg.id}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40">Members</div>
                  <div className="text-lg font-bold text-blue-400">{selectedOrg.members || 0}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40">Revenue</div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(selectedOrg.revenue || 0)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40">Plan</div>
                  <div className="text-lg font-bold text-purple-400">{selectedOrg.plan || 'N/A'}</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
                  <FaUserPlus /> Invite Member
                </button>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
                  <FaEnvelope /> Contact
                </button>
                <button onClick={() => setShowOrgModal(false)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition ml-auto">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-950 p-6">
            <h3 className="text-xl font-bold mb-4">Create Organization</h3>
            <form onSubmit={handleCreateOrg}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/40 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={newOrg.name}
                    onChange={(e) => setNewOrg(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Organization"
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={newOrg.email}
                    onChange={(e) => setNewOrg(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="owner@example.com"
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-1">Plan</label>
                  <select
                    value={newOrg.plan}
                    onChange={(e) => setNewOrg(prev => ({ ...prev, plan: e.target.value }))}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={actionLoading.create}
                  className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {actionLoading.create ? <FaSpinner className="animate-spin mx-auto" /> : 'Create Organization'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setNewOrg({ name: '', plan: 'professional', email: '' }); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrganizations;
