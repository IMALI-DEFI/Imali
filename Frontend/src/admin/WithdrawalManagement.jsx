// src/admin/WithdrawalManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaTrash 
} from 'react-icons/fa';

import api from '../services/api';

const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    rejected: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/withdrawals');
      setWithdrawals(response.data.withdrawals);
      calculateStats(response.data.withdrawals);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (withdrawalList) => {
    const stats = {
      pending: withdrawalList.filter(w => w.status === 'pending').length,
      completed: withdrawalList.filter(w => w.status === 'completed').length,
      rejected: withdrawalList.filter(w => w.status === 'rejected').length,
      totalAmount: withdrawalList.reduce((sum, w) => sum + w.amount, 0),
      pendingAmount: withdrawalList
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0)
    };
    setStats(stats);
  };

  const handleProcessWithdrawal = async (withdrawalId, action) => {
    try {
      setProcessingId(withdrawalId);
      await api.post(`/admin/withdrawals/${withdrawalId}/${action}`);
      await fetchWithdrawals();
      if (selectedWithdrawal && selectedWithdrawal.id === withdrawalId) {
        setShowDetailsModal(false);
        setSelectedWithdrawal(null);
      }
    } catch (error) {
      console.error(`Failed to ${action} withdrawal:`, error);
      alert(`Failed to ${action} withdrawal`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const exportWithdrawals = () => {
    const csv = [
      ['ID', 'User', 'Email', 'Amount', 'Net Amount', 'Fee', 'Method', 'Address', 'Status', 'Created', 'Processed'].join(','),
      ...withdrawals.map(w => [
        w.id,
        w.user_id,
        w.user_email,
        w.amount,
        w.net_amount,
        w.fee,
        w.method,
        w.address,
        w.status,
        new Date(w.created_at).toLocaleString(),
        w.processed_at ? new Date(w.processed_at).toLocaleString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch = 
      w.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || w.method === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold">Withdrawal Management</h1>
        </div>
        <button
          onClick={exportWithdrawals}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Withdrawals</div>
              <div className="text-2xl font-bold">{withdrawals.length}</div>
            </div>
            <DollarSign className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Rejected</div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </div>
            <XCircle className="w-8 h-8 text-red-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Pending Amount</div>
              <div className="text-2xl font-bold text-indigo-600">${stats.pendingAmount.toFixed(2)}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user email, ID, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Methods</option>
            <option value="crypto">Crypto</option>
            <option value="bank">Bank</option>
          </select>
          
          <button
            onClick={fetchWithdrawals}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWithdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{withdrawal.user_email}</div>
                        <div className="text-xs text-gray-500">ID: {withdrawal.user_id?.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">${withdrawal.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Net: ${withdrawal.net_amount?.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    ${withdrawal.fee?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                      {withdrawal.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {withdrawal.address?.slice(0, 6)}...{withdrawal.address?.slice(-4)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(withdrawal.address)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                      {getStatusIcon(withdrawal.status)}
                      {withdrawal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{new Date(withdrawal.created_at).toLocaleDateString()}</div>
                    <div className="text-xs">{new Date(withdrawal.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewDetails(withdrawal)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredWithdrawals.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawals found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Withdrawal Details Modal */}
      {showDetailsModal && selectedWithdrawal && (
        <WithdrawalDetailsModal
          withdrawal={selectedWithdrawal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedWithdrawal(null);
          }}
          onProcess={handleProcessWithdrawal}
          processingId={processingId}
        />
      )}
    </div>
  );
};

// Withdrawal Details Modal Component
const WithdrawalDetailsModal = ({ withdrawal, onClose, onProcess, processingId }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (withdrawal.user_id) {
      fetchUserDetails();
    }
  }, [withdrawal.user_id]);

  const fetchUserDetails = async () => {
    try {
      setLoadingUser(true);
      const response = await api.get(`/admin/users/${withdrawal.user_id}`);
      setUserDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const openInExplorer = (txHash) => {
    if (txHash) {
      window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Withdrawal Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Amount Summary */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-6 text-white">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm opacity-75">Requested Amount</div>
                  <div className="text-2xl font-bold">${withdrawal.amount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-75">Fee ({withdrawal.fee_percent || 0.5}%)</div>
                  <div className="text-2xl font-bold">${withdrawal.fee.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm opacity-75">Net Amount</div>
                  <div className="text-2xl font-bold">${withdrawal.net_amount.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(withdrawal.status)}`}>
                  {getStatusIcon(withdrawal.status)}
                  {withdrawal.status.toUpperCase()}
                </span>
              </div>
              {withdrawal.processed_at && (
                <div className="text-sm text-gray-500">
                  Processed: {new Date(withdrawal.processed_at).toLocaleString()}
                </div>
              )}
            </div>

            {/* Withdrawal Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Withdrawal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Withdrawal ID</div>
                  <div className="font-mono text-sm mt-1">{withdrawal.id}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Method</div>
                  <div className="font-medium capitalize mt-1">{withdrawal.method}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="font-medium mt-1">{new Date(withdrawal.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Last Updated</div>
                  <div className="font-medium mt-1">
                    {withdrawal.updated_at ? new Date(withdrawal.updated_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Destination Address</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Address</span>
                  <button
                    onClick={() => copyToClipboard(withdrawal.address)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <div className="font-mono text-sm break-all bg-white p-3 rounded border">
                  {withdrawal.address}
                </div>
                {withdrawal.method === 'crypto' && (
                  <div className="mt-3">
                    <button
                      onClick={() => openInExplorer(withdrawal.tx_hash)}
                      disabled={!withdrawal.tx_hash}
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Explorer
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* User Details */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">User Information</h3>
              {loadingUser ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{withdrawal.user_email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">User ID</div>
                      <div className="font-mono text-sm">{withdrawal.user_id}</div>
                    </div>
                    {userDetails && (
                      <>
                        <div>
                          <div className="text-sm text-gray-600">Tier</div>
                          <div className="font-medium capitalize">{userDetails.tier}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Balance</div>
                          <div className="font-medium">${userDetails.portfolio_value?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Total Withdrawn</div>
                          <div className="font-medium">${userDetails.total_withdrawn?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Member Since</div>
                          <div className="font-medium">
                            {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction History (if available) */}
            {withdrawal.tx_hash && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Transaction Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Transaction Hash</div>
                      <div className="font-mono text-sm break-all">{withdrawal.tx_hash}</div>
                    </div>
                    {withdrawal.tx_confirmation && (
                      <div>
                        <div className="text-sm text-gray-600">Confirmations</div>
                        <div className="font-medium">{withdrawal.tx_confirmation}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons for Pending Withdrawals */}
            {withdrawal.status === 'pending' && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pending Approval
                </h3>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => onProcess(withdrawal.id, 'approve')}
                    disabled={processingId === withdrawal.id}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === withdrawal.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve Withdrawal
                  </button>
                  <button
                    onClick={() => onProcess(withdrawal.id, 'reject')}
                    disabled={processingId === withdrawal.id}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === withdrawal.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject Withdrawal
                  </button>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Approving this withdrawal will deduct ${withdrawal.amount.toFixed(2)} from the user's balance 
                      and mark it as completed. This action cannot be undone.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add notes about this withdrawal (internal use only)"
                defaultValue={withdrawal.notes || ''}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions for status colors and icons (keep these outside the component)
const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    default:
      return null;
  }
};

export default WithdrawalManagement;
