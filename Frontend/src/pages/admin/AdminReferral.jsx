// src/pages/admin/AdminReferral.jsx
import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaDollarSign, FaChartBar, FaCopy, FaCheck, FaSync, FaSearch } from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminReferral = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, earnings: 0, pending: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const data = await BotAPI.getReferrals?.() || [];
        setReferrals(data);
        setStats({
          total: data.length || 0,
          earnings: data.reduce((sum, r) => sum + (r.earnings || 0), 0),
          pending: data.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.earnings || 0), 0),
        });
      } catch (error) {
        console.error('Failed to fetch referrals:', error);
        setReferrals([
          { id: '1', name: 'John Doe', email: 'john@example.com', referrals: 5, earnings: 45.50, status: 'active', joined: '2024-01-15' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', referrals: 3, earnings: 28.20, status: 'active', joined: '2024-02-20' },
          { id: '3', name: 'Bob Johnson', email: 'bob@example.com', referrals: 1, earnings: 9.50, status: 'pending', joined: '2024-03-10' },
        ]);
        setStats({ total: 9, earnings: 83.20, pending: 9.50 });
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText('https://imali.com/ref/welcome');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredReferrals = referrals.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Referral Program</h2>
          <p className="text-sm text-white/40">Track and manage referrals</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaUserPlus /> Create Referral Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Referrals</span>
            <FaUsers className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Earnings</span>
            <FaDollarSign className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">${stats.earnings.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Pending Payout</span>
            <FaChartBar className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">${stats.pending.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-sm text-white/40 mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value="https://imali.com/ref/welcome"
            readOnly
            className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm"
          />
          <button 
            onClick={copyLink}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2"
          >
            {copied ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search referrals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
          <FaRefresh /> Refresh
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Recent Referrals</h3>
        </div>
        <div className="divide-y divide-white/5">
          {filteredReferrals.map((ref) => (
            <div key={ref.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <p className="font-medium">{ref.name}</p>
                <p className="text-sm text-white/40">{ref.email}</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm text-white/60">{ref.referrals} referrals</span>
                <span className="text-sm text-emerald-400">${ref.earnings.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ref.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {ref.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminReferral;
