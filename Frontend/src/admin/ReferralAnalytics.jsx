// src/admin/ReferralAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Import icons from react-icons
import { 
  FiUsers, FiDollarSign, FiGift, FiTrendingUp, FiAward, FiClock, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiCopy, FiExternalLink, 
  FiWallet, FiAlertCircle, FiDownload, FiFilter, FiSearch, 
  FiChevronUp, FiChevronDown, FiEye 
} from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://api.imali-defi.com';

// Helper to get auth token
const getAuthToken = () => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
};

const ReferralAnalytics = ({ 
  account, 
  showToast, 
  stats: globalStats,
  refreshStats 
}) => {
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', minAmount: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState({});

  // Fetch referral analytics
  const fetchReferralAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = getAuthToken();
      if (!token) {
        showToast('Please log in to view referral analytics', 'error');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all referral analytics in parallel
      const [earningsRes, pendingClaimsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/referrals/earnings`, { headers }),
        axios.get(`${API_BASE}/api/admin/referrals/pending-claims`, { headers })
      ]);

      if (earningsRes.data.success) {
        setReferralStats(earningsRes.data.data.summary);
        setTopReferrers(earningsRes.data.data.top_referrers || []);
      }
      
      if (pendingClaimsRes.data.success) {
        setPendingClaims(pendingClaimsRes.data.data.claims || []);
      }
      
    } catch (error) {
      console.error('Error fetching referral analytics:', error);
      if (error.response?.status === 401) {
        showToast('Session expired. Please log in again.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to load referral analytics', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReferralAnalytics();
    const interval = setInterval(fetchReferralAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchReferralAnalytics]);

  // Process claim approval/rejection
  const processClaim = async (claimId, action, txHash = '', rejectionReason = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this claim?`)) {
      return;
    }

    setProcessing(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showToast('Please log in to process claims', 'error');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/admin/referrals/process-claims`,
        {
          claim_id: claimId,
          action: action,
          tx_hash: txHash,
          rejection_reason: rejectionReason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(`Claim ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
        fetchReferralAnalytics(); // Refresh data
      } else {
        showToast(response.data.message || 'Failed to process claim', 'error');
      }
    } catch (error) {
      console.error('Error processing claim:', error);
      showToast(error.response?.data?.message || 'Failed to process claim', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Process bulk payouts
  const processBulkPayouts = async () => {
    if (!window.confirm('⚠️ WARNING: This will process all pending payouts above $50 minimum. This action cannot be undone. Continue?')) {
      return;
    }

    setProcessing(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showToast('Please log in to process payouts', 'error');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/admin/referrals/process-payouts`,
        { dry_run: false, min_payout: 50 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast(`✅ Processed ${response.data.processed} payouts totaling $${response.data.total_amount}`, 'success');
        fetchReferralAnalytics();
      } else {
        showToast(response.data.message || 'Failed to process payouts', 'error');
      }
    } catch (error) {
      console.error('Error processing payouts:', error);
      showToast(error.response?.data?.message || 'Failed to process payouts', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Export claims as CSV
  const exportClaimsCSV = () => {
    if (pendingClaims.length === 0) {
      showToast('No claims to export', 'info');
      return;
    }

    const headers = ['Claim ID', 'User Email', 'Amount', 'Wallet Address', 'Created At', 'Status'];
    const rows = pendingClaims.map(claim => [
      claim.id,
      claim.user_email,
      claim.amount,
      claim.wallet_address,
      new Date(claim.created_at).toLocaleString(),
      claim.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral_claims_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Claims exported successfully', 'success');
  };

  // Filter claims
  const filteredClaims = pendingClaims.filter(claim => {
    if (filter.status !== 'all' && claim.status !== filter.status) return false;
    if (filter.minAmount > 0 && claim.amount < filter.minAmount) return false;
    if (searchTerm && !claim.user_email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Toggle user expansion
  const toggleUserExpand = (userId) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-white/60">Loading referral analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {referralStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="h-5 w-5 text-blue-400" />
                <span className="text-sm text-white/60">Total Referrals</span>
              </div>
              <span className="text-2xl font-bold">{referralStats.total_referrals || 0}</span>
            </div>
            <div className="mt-2 text-xs text-white/40">
              {referralStats.qualified_referrals || 0} qualified
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiDollarSign className="h-5 w-5 text-green-400" />
                <span className="text-sm text-white/60">Total Rewards</span>
              </div>
              <span className="text-2xl font-bold">${(referralStats.total_rewards_earned || 0).toFixed(2)}</span>
            </div>
            <div className="mt-2 text-xs text-white/40">
              ${(referralStats.rewards_paid || 0).toFixed(2)} paid
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiClock className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-white/60">Pending Rewards</span>
              </div>
              <span className="text-2xl font-bold">${(referralStats.rewards_pending || 0).toFixed(2)}</span>
            </div>
            <div className="mt-2 text-xs text-white/40">
              {pendingClaims.length} pending claims
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiTrendingUp className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-white/60">Conversion Rate</span>
              </div>
              <span className="text-2xl font-bold">{referralStats.conversion_rate || 0}%</span>
            </div>
            <div className="mt-2 text-xs text-white/40">
              ${(referralStats.total_fees_generated || 0).toFixed(2)} fees generated
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: FiEye },
            { id: 'claims', label: 'Pending Claims', icon: FiClock, count: pendingClaims.length },
            { id: 'top-referrers', label: 'Top Referrers', icon: FiAward }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && referralStats && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={processBulkPayouts}
                disabled={processing || (referralStats.rewards_pending || 0) < 50}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FiDollarSign className="h-4 w-4" />
                )}
                Process Bulk Payouts
              </button>
              <button
                onClick={fetchReferralAnalytics}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
              >
                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Reward Distribution */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-lg font-semibold">Reward Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Rewards Paid</span>
                  <span>${(referralStats.rewards_paid || 0).toFixed(2)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div 
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ 
                      width: `${Math.min(100, ((referralStats.rewards_paid || 0) / (referralStats.total_rewards_earned || 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Pending Rewards</span>
                  <span>${(referralStats.rewards_pending || 0).toFixed(2)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div 
                    className="h-full rounded-full bg-yellow-500 transition-all"
                    style={{ 
                      width: `${Math.min(100, ((referralStats.rewards_pending || 0) / (referralStats.total_rewards_earned || 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <FiSearch className="h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="h-4 w-4 text-white/40" />
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button
              onClick={exportClaimsCSV}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              <FiDownload className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {/* Claims List */}
          {filteredClaims.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <FiClock className="mx-auto mb-3 h-12 w-12 text-white/30" />
              <p className="text-white/60">No pending claims to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => (
                <div key={claim.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{claim.id.slice(-8)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          claim.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          claim.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {claim.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{claim.user_email}</p>
                      <p className="mt-1 text-xs text-white/40">
                        Wallet: {claim.wallet_address?.slice(0, 10)}...{claim.wallet_address?.slice(-8)}
                      </p>
                      <p className="text-xs text-white/40">
                        Requested: {new Date(claim.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">${claim.amount.toFixed(2)}</p>
                      <p className="text-xs text-white/40">USDC</p>
                    </div>
                  </div>

                  {claim.status === 'pending' && (
                    <div className="mt-4 flex gap-3 pt-4 border-t border-white/10">
                      <button
                        onClick={() => {
                          const txHash = prompt('Enter transaction hash:');
                          if (txHash && txHash.trim()) {
                            processClaim(claim.id, 'approve', txHash.trim());
                          }
                        }}
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm transition hover:bg-green-500 disabled:opacity-50"
                      >
                        <FiCheckCircle className="h-4 w-4" />
                        Approve & Pay
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Enter rejection reason:');
                          if (reason && reason.trim()) {
                            processClaim(claim.id, 'reject', '', reason.trim());
                          }
                        }}
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm transition hover:bg-red-500 disabled:opacity-50"
                      >
                        <FiXCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top Referrers Tab */}
      {activeTab === 'top-referrers' && (
        <div className="space-y-4">
          {topReferrers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <FiAward className="mx-auto mb-3 h-12 w-12 text-white/30" />
              <p className="text-white/60">No referrers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topReferrers.map((referrer, index) => (
                <div key={referrer.user_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
                        <span className="text-lg font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{referrer.email}</p>
                        <p className="text-sm text-white/40">{referrer.referrals} referrals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400">${referrer.rewards_earned.toFixed(2)}</p>
                      <p className="text-xs text-white/40">${referrer.fees_generated.toFixed(2)} fees</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleUserExpand(referrer.user_id)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
                  >
                    {expandedUsers[referrer.user_id] ? (
                      <FiChevronUp className="h-3 w-3" />
                    ) : (
                      <FiChevronDown className="h-3 w-3" />
                    )}
                    {expandedUsers[referrer.user_id] ? 'Hide Details' : 'View Details'}
                  </button>
                  
                  {expandedUsers[referrer.user_id] && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-white/40">User ID</p>
                          <p className="font-mono text-xs">{referrer.user_id.slice(0, 16)}...</p>
                        </div>
                        <div>
                          <p className="text-white/40">Reward Rate</p>
                          <p>20% of fees</p>
                        </div>
                        <div>
                          <p className="text-white/40">Avg Reward/Referral</p>
                          <p>${(referrer.rewards_earned / referrer.referrals).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-white/40">Qualification Rate</p>
                          <p>~{(referrer.rewards_earned / (referrer.fees_generated * 0.2) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralAnalytics;
