// app/components/ReferralDashboard.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Loader2,
  Copy,
  Check,
  Users,
  DollarSign,
  Gift,
  History,
  Wallet,
} from 'lucide-react';

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
  const [claims, setClaims] = useState<ReferralClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'claims'>('overview');

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);

      const [infoRes, statsRes, historyRes, claimsRes] = await Promise.allSettled([
        fetch('/api/referrals/info', { credentials: 'include' }),
        fetch('/api/referrals/stats', { credentials: 'include' }),
        fetch('/api/referrals/history', { credentials: 'include' }),
        fetch('/api/referrals/claims', { credentials: 'include' }),
      ]);

      if (infoRes.status === 'fulfilled') {
        const infoData = await infoRes.value.json();
        if (infoData.success) setReferralInfo(infoData.data);
      }

      if (statsRes.status === 'fulfilled') {
        const statsData = await statsRes.value.json();
        if (statsData.success) setStats(statsData.data);
      }

      if (historyRes.status === 'fulfilled') {
        const historyData = await historyRes.value.json();
        if (historyData.success) setHistory(historyData.data);
      }

      if (claimsRes.status === 'fulfilled') {
        const claimsData = await claimsRes.value.json();
        if (claimsData.success) setClaims(claimsData.data.claims || []);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signupReferralLink = useMemo(() => {
    if (typeof window === 'undefined') return '';

    const code = referralInfo?.code?.trim();
    if (!code) return '';

    return `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
  }, [referralInfo?.code]);

  const displayReferralLink = referralInfo?.referral_link || signupReferralLink || '';

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleClaimRewards = async () => {
    if (!walletAddress) {
      alert('Please enter a wallet address to receive USDC');
      return;
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid Ethereum wallet address');
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
        credentials: 'include',
        body: JSON.stringify({
          amount: amountToClaim,
          wallet_address: walletAddress,
          claim_all: !claimAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message || 'Claim submitted successfully.'}`);
        await fetchReferralData();
        setClaimAmount('');
        setWalletAddress('');
      } else {
        alert(`❌ Error: ${data.message || 'Failed to submit claim'}`);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!referralInfo) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-8 text-center shadow-sm">
            <Gift className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Referral Program Coming Soon</h2>
            <p className="text-gray-600">
              Your referral code is being generated. Check back shortly or contact support if this keeps happening.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs: Array<'overview' | 'history' | 'claims'> = ['overview', 'history', 'claims'];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Referral Program</h1>
          <p className="mt-2 text-gray-600">
            Earn {referralInfo.reward_percentage}% of fees paid by users you refer, paid in{' '}
            {referralInfo.reward_currency || 'USDC'}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold">{referralInfo.total_referred || 0}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Total Referrals</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold">${referralInfo.earned?.toFixed(2) || '0.00'}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Total Earned</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <Gift className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold">${referralInfo.pending?.toFixed(2) || '0.00'}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Pending Rewards</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <Wallet className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold">{referralInfo.reward_currency || 'USDC'}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Reward Currency</p>
          </div>
        </div>

        {displayReferralLink && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Your Referral Link</h2>
            <p className="mt-1 text-sm text-gray-500">
              This link sends people to signup and automatically applies your code.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={displayReferralLink}
                readOnly
                className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-800"
              />
              <button
                onClick={() => copyToClipboard(displayReferralLink)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {referralInfo.code && (
              <p className="mt-3 text-sm text-gray-500">
                Referral Code: <span className="font-mono font-semibold text-gray-900">{referralInfo.code}</span>
              </p>
            )}
          </div>
        )}

        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-1 py-3 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Performance Stats</h2>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">Qualified Referrals</p>
                  <p className="text-2xl font-bold">{stats.qualified_referrals || 0}</p>
                  <p className="text-xs text-gray-400">of {stats.total_referrals || 0} total</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-bold">{stats.conversion_rate || 0}%</p>
                  <p className="text-xs text-gray-400">referrals that qualified</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Reward / Referral</p>
                  <p className="text-2xl font-bold">${(stats.avg_reward_per_referral || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Monthly Growth</h2>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">This Month Fees</p>
                  <p className="text-2xl font-bold">
                    ${(stats.monthly_breakdown?.this_month_fees || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Month Fees</p>
                  <p className="text-2xl font-bold">
                    ${(stats.monthly_breakdown?.last_month_fees || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Growth</p>
                  <p
                    className={`text-2xl font-bold ${
                      (stats.monthly_breakdown?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {(stats.monthly_breakdown?.growth || 0) >= 0 ? '+' : ''}
                    {stats.monthly_breakdown?.growth || 0}%
                  </p>
                </div>
              </div>
            </div>

            {stats.pending_rewards > 0 && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-green-900">Claim Your Rewards</h2>
                <p className="mt-2 text-green-800">
                  You have <strong className="text-2xl">${stats.pending_rewards.toFixed(2)}</strong> in pending rewards.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full rounded-xl border border-gray-300 bg-white p-3 focus:border-green-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter your Ethereum or Polygon wallet address to receive USDC.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Amount to Claim (Minimum $10)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={claimAmount}
                        onChange={(e) => setClaimAmount(e.target.value)}
                        placeholder={`Max: $${stats.pending_rewards.toFixed(2)}`}
                        className="flex-1 rounded-xl border border-gray-300 bg-white p-3 focus:border-green-500 focus:outline-none"
                        step="10"
                        min="10"
                        max={stats.pending_rewards}
                      />
                      <button
                        onClick={() => setClaimAmount(stats.pending_rewards.toString())}
                        className="rounded-xl bg-gray-200 px-4 py-2 hover:bg-gray-300"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleClaimRewards}
                    disabled={claiming || !walletAddress}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    {claiming ? 'Processing...' : 'Claim Rewards'}
                  </button>

                  <p className="text-center text-xs text-gray-500">
                    Claims are processed within 24–48 hours.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && history && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Referral History</h2>

            {!history.referrals || history.referrals.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No referrals yet</p>
                <p className="mt-1 text-sm text-gray-400">Share your referral link to start earning rewards.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {history.referrals.map((ref) => (
                  <div key={ref.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium break-all">{ref.referred_email}</p>
                        <p className="text-sm text-gray-500">
                          Joined: {new Date(ref.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          Status:{' '}
                          <span
                            className={`font-medium ${
                              ref.status === 'qualified' ? 'text-green-600' : 'text-amber-600'
                            }`}
                          >
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
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <p className="mb-2 text-xs text-gray-500">Recent earnings:</p>
                        <div className="space-y-1">
                          {ref.trades.slice(-3).map((trade: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-gray-600">
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

        {activeTab === 'claims' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Claim History</h2>

            {claims.length === 0 ? (
              <div className="py-12 text-center">
                <History className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No claim history</p>
                <p className="mt-1 text-sm text-gray-400">
                  Once you have at least $10 in pending rewards, you can request a payout.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {claims.map((claim) => (
                  <div key={claim.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">Claim #{claim.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">
                          Requested: {new Date(claim.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500 break-all">
                          Wallet: {claim.wallet_address?.slice(0, 10)}...{claim.wallet_address?.slice(-8)}
                        </p>
                        {claim.tx_hash && (
                          <p className="mt-1 text-xs text-blue-600">TX: {claim.tx_hash.slice(0, 16)}...</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-green-600">${claim.amount.toFixed(2)}</p>
                        <p
                          className={`text-sm font-medium ${
                            claim.status === 'completed'
                              ? 'text-green-600'
                              : claim.status === 'pending'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {claim.status === 'completed'
                            ? '✓ Completed'
                            : claim.status === 'pending'
                            ? '⏳ Pending'
                            : '✗ Rejected'}
                        </p>

                        {claim.processed_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            Processed: {new Date(claim.processed_at).toLocaleDateString()}
                          </p>
                        )}

                        {claim.rejection_reason && (
                          <p className="mt-1 max-w-xs text-xs text-red-500">{claim.rejection_reason}</p>
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
    </div>
  );
}
