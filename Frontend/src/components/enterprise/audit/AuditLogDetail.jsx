// src/components/enterprise/audit/AuditLogDetail.jsx
import React from 'react';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_ICONS } from '../../../constants/auditActions';

const AuditLogDetail = ({ isOpen, log, onClose }) => {
  if (!isOpen || !log) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const actionInfo = {
    label: AUDIT_ACTION_LABELS[log.action] || log.action,
    icon: AUDIT_ACTION_ICONS[log.action] || '📝',
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-3xl mr-3">{actionInfo.icon}</span>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Audit Log Details
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Action</label>
                <p className="mt-1 text-sm text-gray-900">{actionInfo.label}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Timestamp</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(log.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">User</label>
                <p className="mt-1 text-sm text-gray-900">{log.user_email || 'System'}</p>
                {log.user_id && (
                  <p className="mt-1 text-xs text-gray-500">ID: {log.user_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">IP Address</label>
                <p className="mt-1 text-sm text-gray-900">{log.ip_address || 'N/A'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Details</label>
              <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-96">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            </div>
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

export default AuditLogDetail;