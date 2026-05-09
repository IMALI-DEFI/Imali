// src/components/admin/enterprise/EnterpriseRequestsList.jsx
import React, { useState, useEffect } from 'react';
import { useEnterpriseRequests } from '../../../hooks/useEnterpriseRequests';
import RequestDetailModal from './RequestDetailModal';
import ApproveRequestModal from './ApproveRequestModal';
import RejectRequestModal from './RejectRequestModal';

const EnterpriseRequestsList = () => {
  const { getRequests, approveRequest, rejectRequest, loading } = useEnterpriseRequests();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const result = await getRequests('pending');
    if (result.success) {
      setRequests(result.data.requests || []);
    }
  };

  const handleApprove = async (requestId) => {
    const result = await approveRequest(requestId);
    if (result.success) {
      await loadRequests();
      setApproveModalOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleReject = async (requestId, notes) => {
    const result = await rejectRequest(requestId, notes);
    if (result.success) {
      await loadRequests();
      setRejectModalOpen(false);
      setSelectedRequest(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enterprise Requests</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review and manage enterprise signup requests
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={loadRequests}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Organization
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Use Case
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading && requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No pending enterprise requests
                      </td>
                    </tr>
                  ) : (
                    requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {request.organization_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {request.contact_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {request.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {request.use_case || 'Not specified'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadge(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setDetailModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            View
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setApproveModalOpen(true);
                                }}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setRejectModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <RequestDetailModal
        isOpen={detailModalOpen}
        request={selectedRequest}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedRequest(null);
        }}
      />

      <ApproveRequestModal
        isOpen={approveModalOpen}
        request={selectedRequest}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedRequest(null);
        }}
        onApprove={handleApprove}
      />

      <RejectRequestModal
        isOpen={rejectModalOpen}
        request={selectedRequest}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
        }}
        onReject={handleReject}
      />
    </div>
  );
};

export default EnterpriseRequestsList;