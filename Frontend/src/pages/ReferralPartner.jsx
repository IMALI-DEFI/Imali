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
  referrals: any[];
  earnings_history: any[];
  total_referred: number;
  qualified_referrals: number;
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
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      
      // Fetch all referral data in parallel
      const [infoRes, statsRes, historyRes, claimsRes] = await Promise.all([
        fetch('/api/referrals/info'),
        fetch('/api/referrals/stats'),
        fetch('/api/referrals/history'),
        fetch('/api/referrals/claims')
      ]);

      const infoData = await infoRes.json();
      const statsData = await statsRes.json();
      const historyData = await historyRes.json();
      const claimsData = await claimsRes.json();

      if (infoData.success) setReferralInfo(infoData.data);
      if (statsData.success) setStats(statsData.data);
      if (historyData.success) setHistory(historyData.data);
      if (claimsData.success) setClaims(claimsData.data.claims || []);
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
    if (!claimAmount && !walletAddress) {
      setClaimAmount(stats?.pending_rewards.toString() || '');
      return;
    }

    try {
      setClaiming(true);
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(claimAmount) || stats?.pending_rewards,
          wallet_address: walletAddress,
          claim_all: !claimAmount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Claim submitted! ${data.message}`);
        fetchReferralData(); // Refresh data
        setClaimAmount('');
        setWalletAddress('');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!referralInfo) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Unable to load referral information</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{referralInfo.total_referred}</span>
          </div>
          <p className="text-gray-600 mt-2">Total Referrals</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <DollarSign className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">${referralInfo.earned.toFixed(2)}</span>
          </div>
          <p className="text-gray-600 mt-2">Total Earned</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Gift className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">${referralInfo.pending.toFixed(2)}</span>
          </div>
          <p className="text-gray-600 mt-2">Pending Rewards</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <Wallet className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{referralInfo.reward_currency}</span>
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
                <p className="text-2xl font-bold">{stats.qualified_referrals}</p>
                <p className="text-xs text-gray-400">of {stats.total_referrals} total</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversion_rate}%</p>
                <p className="text-xs text-gray-400">referrals that qualified</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Avg Reward/Referral</p>
                <p className="text-2xl font-bold">${stats.avg_reward_per_referral}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Monthly Growth</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-500 text-sm">This Month Fees</p>
                <p className="text-2xl font-bold">${stats.monthly_breakdown.this_month_fees.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Last Month Fees</p>
                <p className="text-2xl font-bold">${stats.monthly_breakdown.last_month_fees.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Growth</p>
                <p className={`text-2xl font-bold ${stats.monthly_breakdown.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.monthly_breakdown.growth >= 0 ? '+' : ''}{stats.monthly_breakdown.growth}%
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
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Claim
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder={`Max: $${stats.pending_rewards.toFixed(2)}`}
                      className="flex-1 p-3 border rounded-lg"
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
                  <p className="text-xs text-gray-500 mt-1">Minimum claim: $10 USDC</p>
                </div>
                
                <button
                  onClick={handleClaimRewards}
                  disabled={claiming}
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  {claiming ? 'Processing...' : 'Claim Rewards'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && history && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Referral History</h2>
          
          {history.referrals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No referrals yet</p>
          ) : (
            <div className="space-y-4">
              {history.referrals.map((ref) => (
                <div key={ref.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{ref.referred_email}</p>
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
                      <p className="font-bold text-green-600">+${ref.total_rewards.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{ref.total_fees.toFixed(2)} fees</p>
                    </div>
                  </div>
                  
                  {ref.trades.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">Recent trades:</p>
                      <div className="space-y-1">
                        {ref.trades.slice(-3).map((trade: any, i: number) => (
                          <div key={i} className="text-xs text-gray-600">
                            ${trade.fee_amount.toFixed(2)} fee → ${trade.reward_amount.toFixed(2)} reward
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
            <p className="text-gray-500 text-center py-8">No claim history</p>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Claim #{claim.id.slice(-8)}</p>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
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
                      {claim.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{claim.rejection_reason}</p>
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
