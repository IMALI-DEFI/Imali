// src/admin/EnterpriseRequestsManager.jsx
import React, { useState, useEffect } from 'react';

export default function EnterpriseRequestsManager({ apiBase, showToast, handleAction }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/enterprise-requests?status=pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    const result = await handleAction(
      { id: 'approve', endpoint: `/api/admin/enterprise-requests/${requestId}`, method: 'PUT' },
      { status: 'approved' }
    );
    if (result?.success) {
      showToast('Request approved successfully', 'success');
      fetchRequests();
    }
  };

  const handleReject = async (requestId, notes) => {
    const result = await handleAction(
      { id: 'reject', endpoint: `/api/admin/enterprise-requests/${requestId}`, method: 'PUT' },
      { status: 'rejected', notes }
    );
    if (result?.success) {
      showToast('Request rejected', 'success');
      fetchRequests();
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <div className="text-center py-8">Loading requests...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Enterprise Requests</h3>
      {requests.length === 0 ? (
        <p className="text-white/50 text-center py-8">No pending requests</p>
      ) : (
        requests.map(request => (
          <div key={request.id} className="border border-white/10 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{request.organization_name}</h4>
                <p className="text-sm text-white/60">Contact: {request.contact_name}</p>
                <p className="text-sm text-white/60">Email: {request.email}</p>
                <p className="text-sm text-white/60">Use Case: {request.use_case || 'Not specified'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(request.id)}
                  className="px-3 py-1 bg-emerald-600 rounded-lg text-sm hover:bg-emerald-500"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(request.id, '')}
                  className="px-3 py-1 bg-red-600 rounded-lg text-sm hover:bg-red-500"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}