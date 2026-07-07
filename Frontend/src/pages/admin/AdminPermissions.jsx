// src/pages/admin/AdminPermissions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaShieldAlt, FaUserCog, FaLock, FaUnlock, FaCheck,
  FaTimes, FaEdit, FaPlus, FaTrash, FaSpinner,
  FaUsers, FaChartBar, FaCreditCard, FaEnvelope,
  FaCog, FaDatabase, FaServer, FaGlobe, FaRefresh,
  FaSave, FaUserPlus, FaEye
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] });
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  // All available permissions for the organization
  const allPermissions = [
    { id: 'users', label: 'Manage Users', icon: <FaUsers />, description: 'Create, edit, and delete users' },
    { id: 'reports', label: 'View Reports', icon: <FaChartBar />, description: 'Access all report data' },
    { id: 'billing', label: 'Manage Billing', icon: <FaCreditCard />, description: 'Manage payments and subscriptions' },
    { id: 'analytics', label: 'View Analytics', icon: <FaChartBar />, description: 'Access analytics dashboard' },
    { id: 'settings', label: 'Manage Settings', icon: <FaCog />, description: 'Change system settings' },
    { id: 'permissions', label: 'Manage Permissions', icon: <FaShieldAlt />, description: 'Edit roles and permissions' },
    { id: 'audit', label: 'View Audit Logs', icon: <FaDatabase />, description: 'Access audit trail' },
    { id: 'email', label: 'Send Email', icon: <FaEnvelope />, description: 'Send emails to users' },
    { id: 'api', label: 'API Access', icon: <FaServer />, description: 'Access API endpoints' },
    { id: 'organizations', label: 'Manage Organizations', icon: <FaGlobe />, description: 'Create and edit organizations' },
  ];

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Try to fetch roles from API
      // const data = await BotAPI.getRoles();
      // setRoles(data || []);
      
      // Mock data for demo
      setRoles([
        { 
          id: 'admin', 
          name: 'Admin', 
          description: 'Full access to all features',
          permissions: allPermissions.map(p => p.id),
          users: 2,
          created: '2024-01-15',
          isSystem: true
        },
        { 
          id: 'manager', 
          name: 'Manager', 
          description: 'Can manage users and view reports',
          permissions: ['users', 'reports', 'analytics', 'email', 'audit'],
          users: 5,
          created: '2024-02-20',
          isSystem: false
        },
        { 
          id: 'member', 
          name: 'Member', 
          description: 'Basic access to view data',
          permissions: ['reports', 'analytics'],
          users: 15,
          created: '2024-03-10',
          isSystem: false
        },
        { 
          id: 'viewer', 
          name: 'Viewer', 
          description: 'Read-only access',
          permissions: ['reports'],
          users: 3,
          created: '2024-04-05',
          isSystem: false
        },
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load roles');
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.name.trim()) {
      setError('Role name is required');
      return;
    }
    
    setActionLoading(prev => ({ ...prev, create: true }));
    setError('');
    
    try {
      // await BotAPI.createRole(newRole);
      const role = {
        id: newRole.name.toLowerCase().replace(/\s/g, '_') + '_' + Date.now(),
        name: newRole.name,
        description: newRole.description || '',
        permissions: newRole.permissions,
        users: 0,
        created: new Date().toISOString().split('T')[0],
        isSystem: false
      };
      setRoles(prev => [...prev, role]);
      setNewRole({ name: '', description: '', permissions: [] });
      setShowCreateRole(false);
    } catch (err) {
      setError(err.message || 'Failed to create role');
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    setActionLoading(prev => ({ ...prev, [roleId]: true }));
    setError('');
    
    try {
      // await BotAPI.updateRole(roleId, updatedData);
      setRoles(prev => prev.map(r => 
        r.id === roleId ? { ...r, ...updatedData } : r
      ));
      setShowEditRole(false);
      setCurrentRole(null);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setActionLoading(prev => ({ ...prev, [roleId]: false }));
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? This cannot be undone.')) return;
    
    setActionLoading(prev => ({ ...prev, [roleId]: true }));
    setError('');
    
    try {
      // await BotAPI.deleteRole(roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (err) {
      setError(err.message || 'Failed to delete role');
    } finally {
      setActionLoading(prev => ({ ...prev, [roleId]: false }));
    }
  };

  const togglePermission = (permissionId) => {
    setNewRole(prev => {
      const current = prev.permissions || [];
      const updated = current.includes(permissionId)
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId];
      return { ...prev, permissions: updated };
    });
  };

  const toggleEditPermission = (permissionId) => {
    if (!currentRole) return;
    const current = currentRole.permissions || [];
    const updated = current.includes(permissionId)
      ? current.filter(p => p !== permissionId)
      : [...current, permissionId];
    setCurrentRole(prev => ({ ...prev, permissions: updated }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPermissionNames = (permissionIds) => {
    return permissionIds.map(id => {
      const perm = allPermissions.find(p => p.id === id);
      return perm?.label || id;
    }).join(', ');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Permissions</h2>
          <p className="text-sm text-white/40">Manage roles and access control for your organization</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchRoles}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            <FaRefresh /> Refresh
          </button>
          <button 
            onClick={() => setShowCreateRole(true)}
            className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2"
          >
            <FaPlus /> Create Role
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{roles.length}</p>
          <p className="text-xs text-white/40">Total Roles</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{roles.filter(r => !r.isSystem).length}</p>
          <p className="text-xs text-white/40">Custom Roles</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{roles.reduce((sum, r) => sum + (r.users || 0), 0)}</p>
          <p className="text-xs text-white/40">Total Users</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{allPermissions.length}</p>
          <p className="text-xs text-white/40">Available Permissions</p>
        </div>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <FaShieldAlt className="text-purple-400" />
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  {role.isSystem && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">System</span>
                  )}
                </div>
                <p className="text-sm text-white/40 mt-1">{role.description}</p>
              </div>
              <div className="flex gap-1">
                {!role.isSystem && (
                  <>
                    <button 
                      onClick={() => { setCurrentRole(role); setShowEditRole(true); }}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                      title="Edit Role"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={actionLoading[role.id]}
                      className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition"
                      title="Delete Role"
                    >
                      {actionLoading[role.id] ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                    </button>
                  </>
                )}
                {role.isSystem && (
                  <button 
                    className="p-1.5 text-white/20 cursor-not-allowed"
                    title="System roles cannot be edited"
                  >
                    <FaLock className="text-xs" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {role.permissions.map((permId) => {
                const perm = allPermissions.find(p => p.id === permId);
                return perm ? (
                  <span key={permId} className="px-2 py-0.5 bg-white/10 rounded-full text-xs flex items-center gap-1">
                    {perm.icon} {perm.label}
                  </span>
                ) : null;
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-white/40">
              <span>{role.users} users with this role</span>
              <span>Created: {formatDate(role.created)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaUserPlus className="text-purple-400" />
                Create New Role
              </h3>
              <button 
                onClick={() => { setShowCreateRole(false); setNewRole({ name: '', description: '', permissions: [] }); setError(''); }}
                className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/40 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Support Team"
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-1">Description</label>
                  <input
                    type="text"
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this role"
                    className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/40 mb-3">Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allPermissions.map((perm) => (
                      <div 
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          newRole.permissions?.includes(perm.id)
                            ? 'border-purple-500/50 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-lg text-purple-400">{perm.icon}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{perm.label}</p>
                            <p className="text-xs text-white/40">{perm.description}</p>
                          </div>
                          {newRole.permissions?.includes(perm.id) && (
                            <FaCheck className="text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={actionLoading.create}
                  className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading.create ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateRole(false); setNewRole({ name: '', description: '', permissions: [] }); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRole && currentRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaEdit className="text-purple-400" />
                Edit Role: {currentRole.name}
              </h3>
              <button 
                onClick={() => { setShowEditRole(false); setCurrentRole(null); setError(''); }}
                className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/40 mb-1">Role Name</label>
                <input
                  type="text"
                  value={currentRole.name}
                  onChange={(e) => setCurrentRole(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/40 mb-1">Description</label>
                <input
                  type="text"
                  value={currentRole.description || ''}
                  onChange={(e) => setCurrentRole(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-white/40 mb-3">Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allPermissions.map((perm) => (
                    <div 
                      key={perm.id}
                      onClick={() => toggleEditPermission(perm.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        currentRole.permissions?.includes(perm.id)
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-lg text-purple-400">{perm.icon}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-white/40">{perm.description}</p>
                        </div>
                        {currentRole.permissions?.includes(perm.id) && (
                          <FaCheck className="text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleUpdateRole(currentRole.id, { 
                    name: currentRole.name, 
                    description: currentRole.description, 
                    permissions: currentRole.permissions 
                  })}
                  disabled={actionLoading[currentRole.id]}
                  className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading[currentRole.id] ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  Save Changes
                </button>
                <button
                  onClick={() => { setShowEditRole(false); setCurrentRole(null); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition"
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
};

export default AdminPermissions;