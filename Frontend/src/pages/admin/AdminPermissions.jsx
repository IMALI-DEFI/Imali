// src/pages/admin/AdminPermissions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FaShieldAlt,
  FaUserCog,
  FaLock,
  FaUnlock,
  FaCheck,
  FaTimes,
  FaEdit,
  FaPlus,
  FaTrash,
  FaSpinner,
  FaUsers,
  FaChartBar,
  FaCreditCard,
  FaEnvelope,
  FaCog,
  FaDatabase,
  FaServer,
  FaGlobe,
  FaSync,
  FaSave,
  FaUserPlus,
  FaEye,
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
          isSystem: true,
        },
        {
          id: 'manager',
          name: 'Manager',
          description: 'Can manage users and view reports',
          permissions: ['users', 'reports', 'analytics', 'email', 'audit'],
          users: 5,
          created: '2024-02-20',
          isSystem: false,
        },
        {
          id: 'member',
          name: 'Member',
          description: 'Basic access to view data',
          permissions: ['reports', 'analytics'],
          users: 15,
          created: '2024-03-10',
          isSystem: false,
        },
        {
          id: 'viewer',
          name: 'Viewer',
          description: 'Read-only access',
          permissions: ['reports'],
          users: 3,
          created: '2024-04-05',
          isSystem: false,
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

    setActionLoading((prev) => ({ ...prev, create: true }));
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
        isSystem: false,
      };
      setRoles((prev) => [...prev, role]);
      setNewRole({ name: '', description: '', permissions: [] });
      setShowCreateRole(false);
    } catch (err) {
      setError(err.message || 'Failed to create role');
    } finally {
      setActionLoading((prev) => ({ ...prev, create: false }));
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    setActionLoading((prev) => ({ ...prev, [roleId]: true }));
    setError('');

    try {
      // await BotAPI.updateRole(roleId, updatedData);
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, ...updatedData } : r))
      );
      setShowEditRole(false);
      setCurrentRole(null);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setActionLoading((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? This cannot be undone.')) return;

    setActionLoading((prev) => ({ ...prev, [roleId]: true }));
    setError('');

    try {
      // await BotAPI.deleteRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (err) {
      setError(err.message || 'Failed to delete role');
    } finally {
      setActionLoading((prev) => ({ ...prev, [roleId]: false }));
    }
  };

  const togglePermission = (permissionId) => {
    setNewRole((prev) => {
      const current = prev.permissions || [];
      const updated = current.includes(permissionId)
        ? current.filter((p) => p !== permissionId)
        : [...current, permissionId];
      return { ...prev, permissions: updated };
    });
  };

  const toggleEditPermission = (permissionId) => {
    if (!currentRole) return;
    const current = currentRole.permissions || [];
    const updated = current.includes(permissionId)
      ? current.filter((p) => p !== permissionId)
      : [...current, permissionId];
    setCurrentRole((prev) => ({ ...prev, permissions: updated }));
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Permissions</h2>
          <p className="text-sm text-white/40">Manage roles and access control for your organization</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRoles}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            <FaSync /> Refresh
          </button>
          <button
            onClick={() => setShowCreateRole(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm transition hover:bg-purple-500"
          >
            <FaPlus /> Create Role
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{roles.length}</p>
          <p className="text-xs text-white/40">Total Roles</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">
            {roles.filter((r) => !r.isSystem).length}
          </p>
          <p className="text-xs text-white/40">Custom Roles</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-blue-400">
            {roles.reduce((sum, r) => sum + (r.users || 0), 0)}
          </p>
          <p className="text-xs text-white/40">Total Users</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{allPermissions.length}</p>
          <p className="text-xs text-white/40">Available Permissions</p>
        </div>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-500/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <FaShieldAlt className="text-purple-400" />
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  {role.isSystem && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                      System
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/40">{role.description}</p>
              </div>
              <div className="flex gap-1">
                {!role.isSystem ? (
                  <>
                    <button
                      onClick={() => {
                        setCurrentRole(role);
                        setShowEditRole(true);
                      }}
                      className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
                      title="Edit Role"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={actionLoading[role.id]}
                      className="rounded-lg p-1.5 text-red-400/60 transition hover:bg-white/10 hover:text-red-400"
                      title="Delete Role"
                    >
                      {actionLoading[role.id] ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    className="cursor-not-allowed p-1.5 text-white/20"
                    title="System roles cannot be edited"
                  >
                    <FaLock className="text-xs" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {role.permissions.map((permId) => {
                const perm = allPermissions.find((p) => p.id === permId);
                return perm ? (
                  <span
                    key={permId}
                    className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs"
                  >
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <FaUserPlus className="text-purple-400" />
                Create New Role
              </h3>
              <button
                onClick={() => {
                  setShowCreateRole(false);
                  setNewRole({ name: '', description: '', permissions: [] });
                  setError('');
                }}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-white/40">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) =>
                      setNewRole((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Support Team"
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/40">Description</label>
                  <input
                    type="text"
                    value={newRole.description}
                    onChange={(e) =>
                      setNewRole((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Brief description of this role"
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm text-white/40">Permissions</label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {allPermissions.map((perm) => (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
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
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading.create}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {actionLoading.create ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaSave />
                  )}
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRole(false);
                    setNewRole({ name: '', description: '', permissions: [] });
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <FaEdit className="text-purple-400" />
                Edit Role: {currentRole.name}
              </h3>
              <button
                onClick={() => {
                  setShowEditRole(false);
                  setCurrentRole(null);
                  setError('');
                }}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/40">Role Name</label>
                <input
                  type="text"
                  value={currentRole.name}
                  onChange={(e) =>
                    setCurrentRole((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/40">Description</label>
                <input
                  type="text"
                  value={currentRole.description || ''}
                  onChange={(e) =>
                    setCurrentRole((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-white focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-3 block text-sm text-white/40">Permissions</label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {allPermissions.map((perm) => (
                    <div
                      key={perm.id}
                      onClick={() => toggleEditPermission(perm.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
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
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() =>
                    handleUpdateRole(currentRole.id, {
                      name: currentRole.name,
                      description: currentRole.description,
                      permissions: currentRole.permissions,
                    })
                  }
                  disabled={actionLoading[currentRole.id]}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {actionLoading[currentRole.id] ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaSave />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditRole(false);
                    setCurrentRole(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
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