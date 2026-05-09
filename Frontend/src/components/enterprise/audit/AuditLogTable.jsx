// src/components/enterprise/audit/AuditLogTable.jsx
import React, { useState } from 'react';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_ICONS } from '../../../constants/auditActions';
import AuditLogDetail from './AuditLogDetail';

const AuditLogTable = ({ logs, loading, total, limit, offset, onPageChange }) => {
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  const getActionDisplay = (action) => {
    return {
      label: AUDIT_ACTION_LABELS[action] || action,
      icon: AUDIT_ACTION_ICONS[action] || '📝',
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionInfo = getActionDisplay(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.user_email || 'System'}</div>
                        {log.user_id && <div className="text-xs text-gray-500">{log.user_id}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{actionInfo.icon}</span>
                          <span className="text-sm text-gray-900">{actionInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-md truncate">
                          {JSON.stringify(log.details).substring(0, 100)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetail(log)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </button>
                      </td>
                     </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => onPageChange(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(Math.min(total - limit, offset + limit))}
                disabled={offset + limit >= total}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{offset + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(offset + limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => onPageChange(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => onPageChange(Math.min(total - limit, offset + limit))}
                    disabled={offset + limit >= total}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuditLogDetail
        isOpen={detailModalOpen}
        log={selectedLog}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </>
  );
};

export default AuditLogTable;