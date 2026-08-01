// src/components/enterprise/team/RemoveMemberModal.jsx
import React, { useState } from 'react';

const RemoveMemberModal = ({ isOpen, member, onClose, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !member) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    const result = await onRemove(member.user_id);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to remove user');
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
                Remove Team Member
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove <strong>{member.email}</strong> from your organization?
                </p>
                <p className="mt-2 text-sm text-red-600">
                  This action cannot be undone. The user will lose access to all organization features.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Removing...' : 'Remove Member'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveMemberModal;