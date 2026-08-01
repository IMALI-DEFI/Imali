// src/components/admin/enterprise/ApproveRequestModal.jsx
import React, { useState } from 'react';

const ApproveRequestModal = ({ isOpen, request, onClose, onApprove }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmit = async () => {
    setLoading(true);
    await onApprove(request.id);
    setLoading(false);
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Approve Enterprise Request
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to approve the enterprise request for{' '}
                  <strong>{request.organization_name}</strong>?
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  This will:
                </p>
                <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                  <li>Create a new organization</li>
                  <li>Set up an admin account for {request.email}</li>
                  <li>Send a welcome email with login instructions</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Approve'}
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

export default ApproveRequestModal;