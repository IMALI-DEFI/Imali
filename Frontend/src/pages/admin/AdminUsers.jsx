// Frontend/src/pages/admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FaSearch, FaUserPlus, FaEdit, FaTrash, FaUserCheck, 
  FaUserSlash, FaEye, FaSpinner, FaEnvelope, FaShieldAlt,
  FaUserCircle, FaFilter, FaSort, FaDownload, FaSync
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await BotAPI.getOrganizationUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Demo data
      setUsers([
        { id: '1', email: 'john.doe@example.com', name: 'John Doe', role: 'admin', status: 'active', joined: '2024-01-15', lastLogin: '2026-01-14', avatar: null },
        { id: '2', email: 'jane.smith@example.com', name: 'Jane Smith', role: 'member', status: 'active', joined: '2024-02-20', lastLogin: '2026-01-13', avatar: null },
        { id: '3', email: 'bob.johnson@example.com', name: 'Bob Johnson', role: 'member', status: 'inactive', joined: '2024-03-10', lastLogin: '2025-12-20', avatar: null },
        { id: '4', email: 'alice.williams@example.com', name: 'Alice Williams', role: 'admin', status: 'active', joined: '2024-04-05', lastLogin: '2026-01-14', avatar: null },
        { id: '5', email: 'charlie.brown@example.com', name: 'Charlie Brown', role: 'member', status: 'pending', joined: '2026-01-10', lastLogin: null, avatar: null },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply filter
    if (filter !== 'all') {
      result = result.filter(u => u.status === filter || u.role === filter);
    }
    
    // Apply sort
    result = [...result].sort((a, b) => {
      const aVal = (a[sortBy] || '').toString().toLowerCase();
      const bVal = (b[sortBy] || '').toString().toLowerCase();
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    
    return result;
  }, [users, searchQuery, filter, sortBy, sortOrder]);

  const handleUserAction = async (userId, action, data = {}) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      // These would use your existing BotAPI methods
      switch(action) {
        case 'remove':
          // await BotAPI.removeUser(userId);
          break;
        case 'make-admin':
          // await BotAPI.updateUserRole(userId, 'admin');
          break;
        case 'remove-admin':
          // await BotAPI.updateUserRole(userId, 'member');
          break;
        case 'activate':
          // await BotAPI.activateUser(userId);
          break;
        case 'deactivate':
          // await BotAPI.deactivateUser(userId);
          break;
        default:
          break;
      }
      await fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setActionLoading(prev => ({ ...prev, invite: true }));
    try {
      // await BotAPI.inviteUser(inviteEmail, inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, invite: false }));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { color: 'bg-emerald-500/20 text-emerald-400', icon: '●' },
      inactive: { color: 'bg-gray-500/20 text-gray-400', icon: '○' },
      pending: { color: 'bg-amber-500/20 text-amber-400', icon: '◐' },
      suspended: { color: 'bg-red-500/20 text-red-400', icon: '⊗' },
    };
    const s = map[status] || map.inactive;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.icon} {status || 'active'}</span>;
  };

  const getRoleBadge = (role) => {
    const map = {
      admin: { color: 'bg-purple-500/20 text-purple-400', label: 'Admin' },
      manager: { color: 'bg-blue-500/20 text-blue-400', label: 'Manager' },
      member: { color: 'bg-gray-500/20 text-gray-400', label: 'Member' },
    };
    const r = map[role] || map.member;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${r.color}`}>{r.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-sm text-white/40">{users.length} total users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2"
          >
            <FaUserPlus /> Invite User
          </button>
          <button 
            onClick={fetchUsers}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{users.filter(u => u.status === 'active').length}</p>
          <p className="text-xs text-white/40">Active</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-xs text-white/40">Admins</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{users.filter(u => u.status === 'pending').length}</p>
          <p className="text-xs text-white/40">Pending</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-gray-400">{users.filter(u => u.status === 'inactive').length}</p>
          <p className="text-xs text-white/40">Inactive</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="admin">Admins</option>
            <option value="member">Members</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-left text-white/40">
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort('name')}>
                  User {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort('email')}>
                  Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort('role')}>
                  Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer hover:text-white/70" onClick={() => handleSort('joined')}>
                  Joined {sortBy === 'joined' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-white/40">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <FaUserCircle className="text-purple-400" />
                        </div>
                        <span className="font-medium">{user.name || user.email?.split('@')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{user.email}</td>
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-3 text-white/40">{formatDate(user.joined)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedUser(user); setShowUserModal(true); }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => { /* Edit user */ }}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                          title="Edit User"
                        >
                          <FaEdit />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleUserAction(user.id, user.status === 'active' ? 'deactivate' : 'activate')}
                            disabled={actionLoading[user.id]}
                            className={`p-1.5 ${user.status === 'active' ? 'text-amber-400/60 hover:text-amber-400' : 'text-emerald-400/60 hover:text-emerald-400'} hover:bg-white/10 rounded-lg transition`}
                            title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {actionLoading[user.id] ? <FaSpinner className="animate-spin" /> : (user.status === 'active' ? <FaUserSlash /> : <FaUserCheck />)}
                          </button>
                        )}
                        <button
                          onClick={() => handleUserAction(user.id, 'remove')}
                          disabled={actionLoading[user.id]}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                          title="Remove User"
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
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaUserCircle className="text-purple-400" />
                User Details
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/40">Name</p>
                  <p className="font-medium">{selectedUser.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Role</p>
                  <p>{getRoleBadge(selectedUser.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Status</p>
                  <p>{getStatusBadge(selectedUser.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Joined</p>
                  <p className="text-white/60">{formatDate(selectedUser.joined)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/40">Last Login</p>
                  <p className="text-white/60">{formatDate(selectedUser.lastLogin)}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
                  <FaEdit /> Edit
                </button>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
                  <FaEnvelope /> Send Email
                </button>
                <button onClick={() => setShowUserModal(false)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition ml-auto">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-950 p-6">
            <h3 className="text-xl font-bold mb-4">Invite User</h3>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/40 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={actionLoading.invite}
                  className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {actionLoading.invite ? <FaSpinner className="animate-spin mx-auto" /> : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
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

export default AdminUsers;
