// src/admin/ReferralPartners.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaUsers, 
  FaUserPlus, 
  FaDollarSign, 
  FaChartLine, 
  FaSearch, 
  FaDownload,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaEye
} from 'react-icons/fa';
import useAdmin from '../hooks/useAdmin';

export default function ReferralPartners({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReferrer, setSelectedReferrer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total_referrers: 0,
    total_referrals: 0,
    qualified_referrals: 0,
    total_earned: 0,
    pending_payouts: 0
  });

  const fetchReferralPartners = useCallback(async () => {
    try {
      // Fetch all users with referral data
      const data = await adminFetch('/api/admin/referrals/partners');
      setReferrals(data.referrals || []);
      setStats(data.stats || {
        total_referrers: 0,
        total_referrals: 0,
        qualified_referrals: 0,
        total_earned: 0,
        pending_payouts: 0
      });
    } catch (error) {
      console.error('Failed to fetch referral partners:', error);
      showToast?.('Failed to load referral partners', 'error');
    } finally {
      setLoading(false);
    }
  }, [adminFetch, showToast]);

  useEffect(() => {
    fetchReferralPartners();
    const interval = setInterval(fetchReferralPartners, 60000);
    return () => clearInterval(interval);
  }, [fetchReferralPartners]);

  const fetchReferrerDetails = async (referrerId) => {
    try {
      const data = await adminFetch(`/api/admin/referrals/partners/${referrerId}`);
      setSelectedReferrer(data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to fetch referrer details:', error);
      showToast?.('Failed to load referrer details', 'error');
    }
  };

  const filteredReferrals = referrals.filter(ref => 
    ref.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaUsers className="text-emerald-400" />
            Referral Partners
          </h3>
          <p className="text-sm text-white/50">Users who have referred others to the platform</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
            <input
              type="text"
              placeholder="Search by email or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 w-64"
            />
          </div>
          <button
            onClick={fetchReferralPartners}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <FaSpinner className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Referrers</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.total_referrers}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Referrals</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.total_referrals}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Qualified</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.qualified_referrals}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Earned</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">${stats.total_earned.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Pending Payouts</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">${stats.pending_payouts.toLocaleString()}</div>
        </div>
      </div>

      {/* Referral Partners Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Referral Code</th>
                <th className="px-4 py-3 text-center">Total Referrals</th>
                <th className="px-4 py-3 text-center">Qualified</th>
                <th className="px-4 py-3 text-right">Total Earned</th>
                <th className="px-4 py-3 text-right">Pending</th>
                <th className="px-4 py-3 text-center">Conversion Rate</th>
                <th className="px-4 py-3 text-center">Actions</th>
               </tr>
            </thead>
            <tbody className="text-sm">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-white/40">
                    No referral partners found
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => (
                  <tr key={ref.user_id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{ref.email}</div>
                      <div className="text-xs text-white/40">ID: {ref.user_id?.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-black/40 px-2 py-1 rounded">{ref.referral_code}</code>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{ref.total_referrals}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-emerald-400">{ref.qualified_referrals}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-yellow-400">
                      ${ref.total_earned?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-400">
                      ${ref.pending_earnings?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${ref.conversion_rate || 0}%` }}
                          />
                        </div>
                        <span className="text-xs">{ref.conversion_rate || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => fetchReferrerDetails(ref.user_id)}
                        className="p-1.5 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                        title="View Details"
                      >
                        <FaEye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referrer Details Modal */}
      {showDetailsModal && selectedReferrer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaUserPlus className="text-emerald-400" />
                Referral Details: {selectedReferrer.email}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-white/50 hover:text-white"
              >
                <FaTimesCircle size={20} />
              </button>
            </div>

            {/* Referrer Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50">Referral Code</div>
                <code className="text-sm font-mono text-emerald-400">{selectedReferrer.referral_code}</code>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50">Total Referrals</div>
                <div className="text-xl font-bold">{selectedReferrer.total_referrals}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50">Qualified</div>
                <div className="text-xl font-bold text-emerald-400">{selectedReferrer.qualified_referrals}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-white/50">Total Earned</div>
                <div className="text-xl font-bold text-yellow-400">${selectedReferrer.total_earned?.toFixed(2)}</div>
              </div>
            </div>

            {/* Referred Users List */}
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FaUsers className="text-purple-400" />
              Referred Users ({selectedReferrer.referred_users?.length || 0})
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-xs text-white/40">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Signed Up</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Reward</th>
                    <th className="px-3 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReferrer.referred_users?.map((user, idx) => (
                    <tr key={idx} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-white/40">{user.user_id?.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          user.qualified 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {user.qualified ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                          {user.qualified ? 'Qualified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-yellow-400">
                        ${user.reward_amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-white/40">
                        {new Date(user.referred_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!selectedReferrer.referred_users || selectedReferrer.referred_users.length === 0) && (
                    <tr>
                      <td colSpan="5" className="px-3 py-4 text-center text-white/40">
                        No referred users yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
