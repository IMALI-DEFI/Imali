// src/admin/AccessControl.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

export default function AccessControl({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});

  const fetchRoles = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/roles');
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/permissions');
      setPermissions(data.permissions || {});
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    const interval = setInterval(fetchRoles, 30000);
    return () => clearInterval(interval);
  }, [fetchRoles, fetchPermissions]);

  const handleUpdateRole = async (roleId, updates) => {
    try {
      await handleAction(`/api/admin/roles/${roleId}`, 'PUT', updates, 'Update Role');
      fetchRoles();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleAddAdmin = async (email) => {
    try {
      await handleAction('/api/admin/add-admin', 'POST', { email }, 'Add Admin');
      fetchRoles();
    } catch (error) {
      console.error('Failed to add admin:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🔐</span> Access Control
          </h3>
          <p className="text-sm text-white/50">Manage admin permissions and roles</p>
        </div>
        <button
          onClick={() => {
            const email = prompt('Enter email address to add as admin:');
            if (email) handleAddAdmin(email);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
        >
          + Add Admin
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`border rounded-xl p-5 cursor-pointer transition-all ${
              selectedRole?.id === role.id
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
            onClick={() => setSelectedRole(role)}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">
                {role.name === 'admin' ? '👑' : role.name === 'moderator' ? '🛡️' : '👤'}
              </span>
              <div>
                <h4 className="font-semibold capitalize">{role.name}</h4>
                <p className="text-xs text-white/40">{role.user_count || 0} users</p>
              </div>
            </div>
            <div className="text-xs space-y-1">
              {role.permissions?.slice(0, 3).map((perm, i) => (
                <div key={i} className="flex items-center gap-1 text-emerald-400">
                  <span>✓</span>
                  <span>{perm}</span>
                </div>
              ))}
              {(role.permissions?.length || 0) > 3 && (
                <div className="text-white/30">+{role.permissions.length - 3} more</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Role Details */}
      {selectedRole && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold capitalize">{selectedRole.name} Role Permissions</h4>
            <button
              onClick={() => setSelectedRole(null)}
              className="text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(permissions).map(([category, perms]) => (
              <div key={category} className="space-y-2">
                <h5 className="text-sm font-medium text-white/60 capitalize">{category}</h5>
                <div className="space-y-1">
                  {perms.map((perm) => {
                    const hasPermission = selectedRole.permissions?.includes(perm);
                    return (
                      <label key={perm} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={(e) => {
                            const newPermissions = hasPermission
                              ? selectedRole.permissions.filter(p => p !== perm)
                              : [...(selectedRole.permissions || []), perm];
                            handleUpdateRole(selectedRole.id, { permissions: newPermissions });
                          }}
                          className="rounded border-white/10 bg-white/5"
                        />
                        <span className={hasPermission ? 'text-emerald-400' : 'text-white/40'}>
                          {perm.replace(/_/g, ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
