// app/components/ReferralDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Loader2, Copy, Check, Users, DollarSign, Gift, History, Wallet } from 'lucide-react';

interface ReferralInfo {
  code: string | null;
  count: number;
  earned: number;
  paid_out: number;
  pending: number;
  referral_link: string | null;
  reward_percentage: number;
  reward_currency: string;
  total_referred: number;
  referral_history: any[];
}

interface ReferralStats {
  total_referrals: number;
  qualified_referrals: number;
  pending_referrals: number;
  total_fees_generated: number;
  total_rewards_earned: number;
  pending_rewards: number;
  paid_out: number;
  conversion_rate: number;
  avg_reward_per_referral: number;
  monthly_breakdown: {
    this_month_fees: number;
    last_month_fees: number;
    growth: number;
  };
  reward_percentage: number;
}

interface ReferralHistory {
  referrals: Array<{
    id: string;
    referred_email: string;
    referred_id: string;
    status: string;
    total_fees: number;
    total_rewards: number;
    reward_paid: number;
    reward_pending: number;
    created_at: number;
    qualified_at: number | null;
    paid_at: number | null;
    trades: any[];
  }>;
  earnings_history: any[];
  total_referred: number;
  qualified_referrals: number;
}

interface ReferralClaim {
  id: string;
  amount: number;
  currency: string;
  wallet_address: string;
  status: 'pending' | 'completed' | 'rejected';
  created_at: number;
  processed_at: number | null;
  tx_hash: string | null;
  rejection_reason: string | null;
}

export default function ReferralDashboard() {
  const { user, isLoaded } = useUser();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'claims'>('overview');
  const [claims, setClaims] = useState<ReferralClaim[]>([]);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      // Fetch all referral data in parallel with error handling
      const [infoRes, statsRes, historyRes, claimsRes] = await Promise.allSettled([
        fetch('/api/referrals/info'),
        fetch('/api/referrals/stats'),
        fetch('/api/referrals/history'),
        fetch('/api/referrals/claims')
      ]);

      // Handle info data
      if (infoRes.status === 'fulfilled') {
        const infoData = await infoRes.value.json();
        if (infoData.success) {
          setReferralInfo(infoData.data);
        } else {
          console.error('Failed to fetch referral info:', infoData.message);
        }
      } else {
        console.error('Failed to fetch referral info:', infoRes.reason);
      }

      // Handle stats data
      if (statsRes.status === 'fulfilled') {
        const statsData = await statsRes.value.json();
        if (statsData.success) {
          setStats(statsData.data);
        } else {
          console.error('Failed to fetch referral stats:', statsData.message);
        }
      } else {
        console.error('Failed to fetch referral stats:', statsRes.reason);
      }

      // Handle history data
      if (historyRes.status === 'fulfilled') {
        const historyData = await historyRes.value.json();
        if (historyData.success) {
          setHistory(historyData.data);
        } else {
          console.error('Failed to fetch referral history:', historyData.message);
        }
      } else {
        console.error('Failed to fetch referral history:', historyRes.reason);
      }

      // Handle claims data
      if (claimsRes.status === 'fulfilled') {
        const claimsData = await claimsRes.value.json();
        if (claimsData.success) {
          setClaims(claimsData.data.claims || []);
        } else {
          console.error('Failed to fetch referral claims:', claimsData.message);
        }
      } else {
        console.error('Failed to fetch referral claims:', claimsRes.reason);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimRewards = async () => {
    // Validate wallet address
    if (!walletAddress) {
      alert('Please enter a wallet address to receive USDC');
      return;
    }

    // Validate wallet format (basic Ethereum address validation)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid Ethereum wallet address (0x followed by 40 hex characters)');
      return;
    }

    const amountToClaim = claimAmount ? parseFloat(claimAmount) : (stats?.pending_rewards || 0);
    
    if (amountToClaim <= 0) {
      alert('Please enter a valid amount to claim');
      return;
    }

    if (amountToClaim < 10) {
      alert('Minimum claim amount is $10 USDC');
      return;
    }

    if (stats && amountToClaim > stats.pending_rewards) {
      alert(`Cannot claim more than your pending rewards ($${stats.pending_rewards.toFixed(2)})`);
      return;
    }

    try {
      setClaiming(true);
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountToClaim,
          wallet_address: walletAddress,
          claim_all: !claimAmount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message || 'Claim submitted successfully! It will be processed within 24-48 hours.'}`);
        // Refresh all data
        await fetchReferralData();
        setClaimAmount('');
        setWalletAddress('');
      } else {
        alert(`❌ Error: ${data.message || 'Failed to submit claim'}`);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards. Please check your connection and try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Loading state
  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // No referral info state (user might not have referral code yet)
  if (!referralInfo) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <Gift className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Referral Program Coming Soon</h2>
          <p className="text-gray-600">
            Your referral code is being generated. Check back in a few minutes or contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-blue-100">
          Earn {referralInfo.reward_percentage}% of fees paid by users you refer, paid in {referralInfo.reward_currency}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{referralInfo.total_referred || 0}</span>
          </div>
          <p className="text-gray-600 mt-2">Total Referrals</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <DollarSign className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">${referralInfo.earned?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="text-gray-600 mt-2">Total Earned</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Gift className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">${referralInfo.pending?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="text-gray-600 mt-2">Pending Rewards</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Wallet className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{referralInfo.reward_currency || 'USDC'}</span>
          </div>
          <p className="text-gray-600 mt-2">Reward Currency</p>
        </div>
      </div>

      {/* Referral Link Section */}
      {referralInfo.referral_link && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Referral Link</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={referralInfo.referral_link}
              readOnly
              className="flex-1 p-3 border rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(referralInfo.referral_link!)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 justify-center"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          {referralInfo.code && (
            <p className="text-sm text-gray-500 mt-3">
              Referral Code: <span className="font-mono font-bold">{referralInfo.code}</span>
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {['overview', 'history', 'claims'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-500 text-sm">Qualified Referrals</p>
                <p className="text-2xl font-bold">{stats.qualified_referrals || 0}</p>
                <p className="text-xs text-gray-400">of {stats.total_referrals || 0} total</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversion_rate || 0}%</p>
                <p className="text-xs text-gray-400">referrals that qualified</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Avg Reward/Referral</p>
                <p className="text-2xl font-bold">${(stats.avg_reward_per_referral || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monthly Growth</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-500 text-sm">This Month Fees</p>
                <p className="text-2xl font-bold">${(stats.monthly_breakdown?.this_month_fees || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Last Month Fees</p>
                <p className="text-2xl font-bold">${(stats.monthly_breakdown?.last_month_fees || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Growth</p>
                <p className={`text-2xl font-bold ${(stats.monthly_breakdown?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(stats.monthly_breakdown?.growth || 0) >= 0 ? '+' : ''}{stats.monthly_breakdown?.growth || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Claim Section */}
          {stats.pending_rewards > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
              <h2 className="text-xl font-semibold mb-4 text-green-800">Claim Your Rewards</h2>
              <p className="text-green-700 mb-4">
                You have <strong className="text-2xl">${stats.pending_rewards.toFixed(2)}</strong> in pending rewards
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address (USDC on Ethereum/Polygon)
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your Ethereum or Polygon wallet address to receive USDC
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Claim (Minimum $10)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder={`Max: $${stats.pending_rewards.toFixed(2)}`}
                      className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      step="10"
                      min="10"
                      max={stats.pending_rewards}
                    />
                    <button
                      onClick={() => setClaimAmount(stats.pending_rewards.toString())}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      Max
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleClaimRewards}
                  disabled={claiming || !walletAddress}
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  {claiming ? 'Processing...' : 'Claim Rewards'}
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  Claims are processed within 24-48 hours. You'll receive a notification when your claim is approved.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && history && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Referral History</h2>
          
          {!history.referrals || history.referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No referrals yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Share your referral link to start earning rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.referrals.map((ref) => (
                <div key={ref.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-1">
                      <p className="font-medium break-all">{ref.referred_email}</p>
                      <p className="text-sm text-gray-500">
                        Joined: {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: <span className={`font-medium ${
                          ref.status === 'qualified' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {ref.status === 'qualified' ? '✓ Qualified' : '⏳ Pending'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+${ref.total_rewards?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-gray-500">${ref.total_fees?.toFixed(2) || '0.00'} fees</p>
                    </div>
                  </div>
                  
                  {ref.trades && ref.trades.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">Recent earnings:</p>
                      <div className="space-y-1">
                        {ref.trades.slice(-3).map((trade: any, i: number) => (
                          <div key={i} className="text-xs text-gray-600 flex justify-between">
                            <span>Trade fee: ${trade.fee_amount?.toFixed(2)}</span>
                            <span className="text-green-600">+${trade.reward_amount?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Claim History</h2>
          
          {claims.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No claim history</p>
              <p className="text-sm text-gray-400 mt-1">
                Once you have at least $10 in pending rewards, you can request a payout.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-medium">Claim #{claim.id.slice(-8)}</p>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 break-all">
                        Wallet: {claim.wallet_address?.slice(0, 10)}...{claim.wallet_address?.slice(-8)}
                      </p>
                      {claim.tx_hash && (
                        <p className="text-xs text-blue-600 mt-1">
                          TX: {claim.tx_hash.slice(0, 16)}...
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${claim.amount.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${
                        claim.status === 'completed' ? 'text-green-600' :
                        claim.status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {claim.status === 'completed' ? '✓ Completed' :
                         claim.status === 'pending' ? '⏳ Pending' :
                         '✗ Rejected'}
                      </p>
                      {claim.processed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Processed: {new Date(claim.processed_at).toLocaleDateString()}
                        </p>
                      )}
                      {claim.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1 max-w-xs">{claim.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
