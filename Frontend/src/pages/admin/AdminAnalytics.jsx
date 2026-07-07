// Frontend/src/pages/admin/AdminAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, FaUsers, FaDollarSign, FaCalendar,
  FaArrowUp, FaArrowDown, FaUserPlus, FaEye,
  FaDownload, FaFilter, FaSync, FaSpinner
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await BotAPI.getAnalytics({ period });
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setAnalytics({
          overview: {
            totalUsers: 51,
            activeUsers: 23,
            newUsers: 12,
            totalRevenue: 1130.53,
            monthlyRevenue: 452.67,
            totalTrades: 82588,
            monthlyTrades: 12450,
            winRate: 68.5,
          },
          trends: {
            users: { current: 51, previous: 39, growth: 30.8 },
            revenue: { current: 1130.53, previous: 892.45, growth: 26.7 },
            trades: { current: 82588, previous: 71812, growth: 15.0 },
            activeUsers: { current: 23, previous: 25, growth: -8.0 },
          },
          daily: [
            { date: '2026-01-10', users: 45, trades: 1200, revenue: 45.50 },
            { date: '2026-01-11', users: 47, trades: 1350, revenue: 52.30 },
            { date: '2026-01-12', users: 48, trades: 1280, revenue: 48.10 },
            { date: '2026-01-13', users: 49, trades: 1420, revenue: 56.80 },
            { date: '2026-01-14', users: 51, trades: 1550, revenue: 62.00 },
          ],
          topUsers: [
            { name: 'John Doe', trades: 234, revenue: 1234.56 },
            { name: 'Jane Smith', trades: 189, revenue: 987.65 },
            { name: 'Bob Johnson', trades: 156, revenue: 876.54 },
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-emerald-400';
    if (growth < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <FaArrowUp className="inline mr-1" />;
    if (growth < 0) return <FaArrowDown className="inline mr-1" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { overview, trends, daily, topUsers } = analytics || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Analytics</h2>
          <p className="text-sm text-white/40">Platform performance and insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs transition ${
                  period === p ? 'bg-purple-600' : 'hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
            <FaRefresh /> Refresh
          </button>
          <button className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Users</span>
            <FaUsers className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.totalUsers || 0}</p>
          <span className={`text-xs ${getGrowthColor(trends?.users?.growth || 0)}`}>
            {getGrowthIcon(trends?.users?.growth)} {Math.abs(trends?.users?.growth || 0)}% from last period
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Active Users</span>
            <FaUserPlus className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.activeUsers || 0}</p>
          <span className={`text-xs ${getGrowthColor(trends?.activeUsers?.growth || 0)}`}>
            {getGrowthIcon(trends?.activeUsers?.growth)} {Math.abs(trends?.activeUsers?.growth || 0)}% from last period
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Revenue</span>
            <FaDollarSign className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">${(overview?.totalRevenue || 0).toFixed(2)}</p>
          <span className={`text-xs ${getGrowthColor(trends?.revenue?.growth || 0)}`}>
            {getGrowthIcon(trends?.revenue?.growth)} {Math.abs(trends?.revenue?.growth || 0)}% from last period
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Win Rate</span>
            <FaChartLine className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.winRate || 0}%</p>
          <span className="text-xs text-white/40">From {overview?.totalTrades || 0} trades</span>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FaChartLine /> Daily Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/40 border-b border-white/10">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium text-right">Users</th>
                <th className="px-3 py-2 font-medium text-right">Trades</th>
                <th className="px-3 py-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {daily?.map((day) => (
                <tr key={day.date} className="hover:bg-white/5 transition">
                  <td className="px-3 py-2 text-white/60">{day.date}</td>
                  <td className="px-3 py-2 text-right">{day.users}</td>
                  <td className="px-3 py-2 text-right">{day.trades}</td>
                  <td className="px-3 py-2 text-right text-emerald-400">${day.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FaUsers /> Top Users
        </h3>
        <div className="space-y-3">
          {topUsers?.map((user, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-purple-400">#{i + 1}</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-white/60">{user.trades} trades</span>
                <span className="text-emerald-400">${user.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
