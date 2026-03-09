// src/admin/StocksManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

export default function StocksManagement({ apiBase, showToast, handleAction, busyAction }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalPnL: 0,
    totalShares: 0,
    winRate: 0
  });

  const fetchPositions = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/stocks/positions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setPositions(data.positions || []);
        calculateStats(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to fetch stock positions:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const calculateStats = (positions) => {
    const totalValue = positions.reduce((sum, p) => sum + (p.shares * p.current_price), 0);
    const totalCost = positions.reduce((sum, p) => sum + (p.shares * p.avg_price), 0);
    const totalPnL = totalValue - totalCost;
    const totalShares = positions.reduce((sum, p) => sum + p.shares, 0);
    const wins = positions.filter(p => (p.current_price - p.avg_price) > 0).length;
    const winRate = positions.length ? (wins / positions.length) * 100 : 0;

    setStats({ totalValue, totalPnL, totalShares, winRate });
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

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
            <span>📈</span> Stock Portfolio Management
          </h3>
          <p className="text-sm text-white/50">Monitor and manage stock trading operations</p>
        </div>
        <button
          onClick={fetchPositions}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors"
          disabled={busyAction}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Value</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${stats.totalValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total P&L</div>
          <div className={`text-2xl font-bold mt-1 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Total Shares</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {stats.totalShares.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-sm text-white/50">Win Rate</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {stats.winRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h4 className="font-semibold">Current Positions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Shares</th>
                <th className="px-4 py-3">Avg Price</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">P&L</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-white/40">
                    No stock positions found
                  </td>
                </tr>
              ) : (
                positions.map((pos, i) => {
                  const value = pos.shares * pos.current_price;
                  const cost = pos.shares * pos.avg_price;
                  const pnl = value - cost;
                  const pnlPercent = (pnl / cost) * 100;
                  
                  return (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-bold">{pos.symbol}</td>
                      <td className="px-4 py-3">{pos.shares}</td>
                      <td className="px-4 py-3">${pos.avg_price.toFixed(2)}</td>
                      <td className="px-4 py-3">${pos.current_price.toFixed(2)}</td>
                      <td className="px-4 py-3">${value.toFixed(2)}</td>
                      <td className={`px-4 py-3 ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleAction('/api/admin/stocks/trade', 'POST', { 
                            action: 'sell', 
                            symbol: pos.symbol, 
                            shares: Math.floor(pos.shares / 2) 
                          }, 'Sell')}
                          className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Trade Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="font-semibold mb-4">Quick Trade</h4>
        <form className="flex flex-wrap gap-3" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="Symbol (e.g., AAPL)"
            className="flex-1 min-w-[120px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Shares"
            className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <select className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            Execute Trade
          </button>
        </form>
      </div>
    </div>
  );
}