// src/components/admin/enterprise/RequestDetailModal.jsx
import React from 'react';

const RequestDetailModal = ({ isOpen, request, onClose }) => {
  if (!isOpen || !request) return null;

  const desiredFeatures = request.desired_features || [];

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Enterprise Request Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Organization</label>
                <p className="mt-1 text-sm text-gray-900">{request.organization_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Contact Name</label>
                <p className="mt-1 text-sm text-gray-900">{request.contact_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{request.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Company Size</label>
                <p className="mt-1 text-sm text-gray-900">{request.company_size || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Use Case</label>
                <p className="mt-1 text-sm text-gray-900">{request.use_case || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Submitted</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {desiredFeatures.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Desired Features
                </label>
                <div className="flex flex-wrap gap-2">
                  {desiredFeatures.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;