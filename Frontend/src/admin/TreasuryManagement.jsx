// src/admin/TreasuryManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';

export default function TreasuryManagement({ apiBase, showToast, handleAction, busyAction }) {
  const [treasury, setTreasury] = useState({
    balance: 0,
    staked: 0,
    pools: 0,
    pending: 0,
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    address: '',
    asset: 'USDT'
  });

  const fetchTreasury = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/treasury/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setTreasury(data);
      }
    } catch (error) {
      console.error('Failed to fetch treasury stats:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 30000);
    return () => clearInterval(interval);
  }, [fetchTreasury]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      await handleAction('/api/admin/treasury/withdraw', 'POST', withdrawForm, 'Withdraw');
      fetchTreasury();
      setWithdrawForm({ amount: '', address: '', asset: 'USDT' });
    } catch (error) {
      console.error('Withdrawal failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🏦</span> Treasury Management
          </h3>
          <p className="text-sm text-white/50">Manage platform treasury and distributions</p>
        </div>
        <button
          onClick={fetchTreasury}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
          disabled={busyAction}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Balance</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${treasury.balance.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Staked</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {treasury.staked.toLocaleString()} IMALI
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Liquidity Pools</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {treasury.pools}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Pending</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            ${treasury.pending.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Withdraw Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h4 className="font-semibold mb-4">Treasury Withdrawal</h4>
        <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Amount"
            value={withdrawForm.amount}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Wallet Address"
            value={withdrawForm.address}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, address: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            required
          />
          <select
            value={withdrawForm.asset}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, asset: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="USDT">USDT</option>
            <option value="IMALI">IMALI</option>
            <option value="ETH">ETH</option>
          </select>
          <button
            type="submit"
            disabled={busyAction === 'Withdraw'}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busyAction === 'Withdraw' ? 'Processing...' : 'Withdraw Funds'}
          </button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h4 className="font-semibold mb-4">Recent Transactions</h4>
        {treasury.history?.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">No transaction history</p>
        ) : (
          <div className="space-y-2">
            {treasury.history?.map((tx, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                <div>
                  <span className="text-white/60">{tx.date}</span>
                  <span className="ml-3 font-medium">{tx.description}</span>
                </div>
                <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} {tx.asset}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}