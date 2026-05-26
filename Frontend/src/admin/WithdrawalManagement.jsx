// src/admin/WithdrawalManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import useAdmin from '../hooks/useAdmin';

// Safe number formatter to prevent .toFixed errors
const safeFormatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0.00';
  
  let num;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    return '0.00';
  }
  
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

// Safe amount formatter with $ prefix
const formatAmount = (value) => {
  const formatted = safeFormatNumber(value, 2);
  return `$${formatted}`;
};

export default function WithdrawalManagement({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch, isAuthenticated, isLoading: authLoading } = useAdmin();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalAmount: 0
  });
  
  const initialFetchDone = useRef(false);

  // Safe fetch wrapper with auth check
  const fetchWithdrawals = useCallback(async () => {
    // Don't fetch if not authenticated or still loading auth
    if (!isAuthenticated || authLoading) {
      console.log('Skipping withdrawals fetch - not authenticated or auth loading');
      return;
    }

    try {
      // adminFetch already handles auth token injection
      const data = await adminFetch('/api/admin/withdrawals');
      
      // SAFE: Ensure data is an array and sanitize numeric values
      const withdrawalsData = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
      
      // Sanitize each withdrawal to ensure numeric fields are numbers
      const sanitizedWithdrawals = withdrawalsData.map(w => ({
        ...w,
        amount: typeof w.amount === 'number' ? w.amount : parseFloat(w.amount) || 0,
        fee: typeof w.fee === 'number' ? w.fee : parseFloat(w.fee) || 0,
        net_amount: typeof w.net_amount === 'number' ? w.net_amount : parseFloat(w.net_amount) || 0,
      }));
      
      setWithdrawals(sanitizedWithdrawals);
      
      // Calculate stats with safe number handling
      const pending = sanitizedWithdrawals.filter(w => w.status === 'pending') || [];
      const completed = sanitizedWithdrawals.filter(w => w.status === 'completed') || [];
      
      // SAFE: Use reduce with default 0 and ensure number addition
      const totalAmount = sanitizedWithdrawals.reduce((sum, w) => {
        const amount = typeof w.amount === 'number' ? w.amount : parseFloat(w.amount) || 0;
        return sum + amount;
      }, 0);
      
      setStats({
        total: sanitizedWithdrawals.length,
        pending: pending.length,
        completed: completed.length,
        totalAmount: totalAmount
      });
      
      // Show success toast if needed
      if (showToast) {
        showToast('Withdrawals refreshed', 'success');
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      // Don't show error toast for auth errors - they're expected when not logged in
      if (error.message !== 'No authentication token found' && showToast) {
        showToast('Failed to fetch withdrawals', 'error');
      }
      // Set empty state on error instead of crashing
      setWithdrawals([]);
      setStats({
        total: 0,
        pending: 0,
        completed: 0,
        totalAmount: 0
      });
    } finally {
      setLoading(false);
    }
  }, [adminFetch, isAuthenticated, authLoading, showToast]);

  // Initial fetch with auth dependency
  useEffect(() => {
    if (isAuthenticated && !authLoading && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchWithdrawals();
    }
  }, [isAuthenticated, authLoading, fetchWithdrawals]);

  // Polling interval - only when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    
    fetchWithdrawals(); // Immediate fetch on auth change
    
    const interval = setInterval(() => {
      // Only fetch if still authenticated
      if (isAuthenticated) {
        fetchWithdrawals();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading, fetchWithdrawals]);

  const handleProcessWithdrawal = async (withdrawalId, action) => {
    if (!isAuthenticated) {
      if (showToast) showToast('Please log in to process withdrawals', 'error');
      return;
    }
    
    try {
      await handleAction(`/api/admin/withdrawals/${withdrawalId}/${action}`, 'POST', {}, `Withdrawal ${action}`);
      // Refresh after action
      await fetchWithdrawals();
      if (showToast) {
        showToast(`Withdrawal ${action}d successfully`, 'success');
      }
    } catch (error) {
      console.error(`Failed to ${action} withdrawal:`, error);
      if (showToast) {
        showToast(`Failed to ${action} withdrawal: ${error.message}`, 'error');
      }
    }
  };

  // Show loading state while auth is initializing
  if (authLoading || (loading && withdrawals.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-sm text-white/50">Please log in to access withdrawal management</p>
      </div>
    );
  }

  const filteredWithdrawals = withdrawals.filter(w => filter === 'all' || w.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>💰</span> Withdrawal Management
          </h3>
          <p className="text-sm text-white/50">Process and review withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={fetchWithdrawals}
            disabled={busyAction}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards - SAFE: using formatAmount function */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Pending</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Completed</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.completed}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Amount</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{formatAmount(stats.totalAmount)}</div>
        </div>
      </div>

      {/* Withdrawals Table - SAFE: using safe formatters */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
               </tr>
            </thead>
            <tbody className="text-sm">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-white/40">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.user_email || 'Unknown'}</div>
                      <div className="text-xs text-white/40">{w.user_id?.slice(0, 8)}...</div>
                    </td>
                    {/* SAFE: using formatAmount and safeFormatNumber */}
                    <td className="px-4 py-3 font-bold">{formatAmount(w.amount)}</td>
                    <td className="px-4 py-3 capitalize">{w.method || 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs font-mono">{w.address?.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-red-400">{formatAmount(w.fee)}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatAmount(w.net_amount)}</td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                        w.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {w.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {w.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProcessWithdrawal(w.id, 'approve')}
                            className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30 disabled:opacity-50"
                            disabled={busyAction}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessWithdrawal(w.id, 'reject')}
                            className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 disabled:opacity-50"
                            disabled={busyAction}
                          >
                            Reject
                          </button>
                        </div>
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
  );
}
