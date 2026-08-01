// src/admin/CexManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';

export default function CexManagement({ apiBase, showToast, handleAction, busyAction }) {
  const [balances, setBalances] = useState({
    okx: {},
    alpaca: { cash: 0, stocks: {} }
  });
  const [loading, setLoading] = useState(true);
  const [transferForm, setTransferForm] = useState({
    exchange: 'okx',
    direction: 'deposit',
    asset: 'USDT',
    amount: ''
  });

  const fetchBalances = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/cex/balances`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setBalances(data);
      }
    } catch (error) {
      console.error('Failed to fetch CEX balances:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      await handleAction('/api/admin/cex/transfer', 'POST', transferForm, 'Transfer');
      fetchBalances();
      setTransferForm({ ...transferForm, amount: '' });
    } catch (error) {
      console.error('Transfer failed:', error);
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
            <span>🏧</span> CEX Funding Management
          </h3>
          <p className="text-sm text-white/50">Manage centralized exchange balances and transfers</p>
        </div>
        <button
          onClick={fetchBalances}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
          disabled={busyAction}
        >
          🔄 Refresh Balances
        </button>
      </div>

      {/* Exchange Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OKX Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔷</span>
            <div>
              <h4 className="font-semibold">OKX Exchange</h4>
              <p className="text-xs text-white/50">Spot & Futures Balances</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(balances.okx).length === 0 ? (
              <p className="text-sm text-white/40">No balances found</p>
            ) : (
              Object.entries(balances.okx).map(([asset, amount]) => (
                <div key={asset} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="font-medium">{asset}</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {typeof amount === 'number' ? amount.toFixed(4) : amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alpaca Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📈</span>
            <div>
              <h4 className="font-semibold">Alpaca Markets</h4>
              <p className="text-xs text-white/50">Stock Trading</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="font-medium">Cash Balance</span>
              <span className="text-lg font-bold text-emerald-400">
                ${balances.alpaca.cash?.toFixed(2) || '0.00'}
              </span>
            </div>
            {Object.entries(balances.alpaca.stocks || {}).map(([symbol, shares]) => (
              <div key={symbol} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="font-medium">{symbol}</span>
                <span className="text-lg font-bold text-purple-400">{shares} shares</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h4 className="font-semibold mb-4">Transfer Funds</h4>
        <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={transferForm.exchange}
            onChange={(e) => setTransferForm({ ...transferForm, exchange: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="okx">OKX</option>
            <option value="alpaca">Alpaca</option>
          </select>
          
          <select
            value={transferForm.direction}
            onChange={(e) => setTransferForm({ ...transferForm, direction: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
          
          <select
            value={transferForm.asset}
            onChange={(e) => setTransferForm({ ...transferForm, asset: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="USD">USD</option>
          </select>
          
          <input
            type="number"
            placeholder="Amount"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
            required
          />
          
          <button
            type="submit"
            disabled={busyAction === 'Transfer'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busyAction === 'Transfer' ? 'Processing...' : 'Execute Transfer'}
          </button>
        </form>
      </div>
    </div>
  );
}