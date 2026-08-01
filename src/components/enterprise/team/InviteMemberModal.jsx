// src/components/enterprise/team/InviteMemberModal.jsx
import React, { useState } from 'react';
import { ENTERPRISE_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../../constants/enterpriseRoles';

const InviteMemberModal = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ENTERPRISE_ROLES.MEMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await onInvite(email, role);
    
    if (result.success) {
      setEmail('');
      setRole(ENTERPRISE_ROLES.MEMBER);
      onClose();
    } else {
      setError(result.error || 'Failed to invite user');
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Invite Team Member
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Send an invitation to join your organization
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="colleague@company.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value={ENTERPRISE_ROLES.ADMIN}>Admin - {ROLE_DESCRIPTIONS[ENTERPRISE_ROLES.ADMIN]}</option>
                <option value={ENTERPRISE_ROLES.MEMBER}>Member - {ROLE_DESCRIPTIONS[ENTERPRISE_ROLES.MEMBER]}</option>
                <option value={ENTERPRISE_ROLES.VIEWER}>Viewer - {ROLE_DESCRIPTIONS[ENTERPRISE_ROLES.VIEWER]}</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteMemberModal;