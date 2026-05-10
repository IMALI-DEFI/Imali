// src/pages/EnterpriseDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEnterprise } from '../hooks/useEnterprise';

const EnterpriseDashboard = () => {
  const { user } = useAuth();
  const { getOrganization, getAnalytics, loading } = useEnterprise();
  const [organization, setOrganization] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const orgResult = await getOrganization();
    if (orgResult.success) {
      setOrganization(orgResult.data);
    }

    const analyticsResult = await getAnalytics(30);
    if (analyticsResult.success) {
      setAnalytics(analyticsResult.data);
    }
  };

  const quickActions = [
    { title: 'Team Management', path: '/enterprise/team', icon: '👥', description: 'Invite and manage team members' },
    { title: 'Custom Strategies', path: '/enterprise/strategies', icon: '📊', description: 'Create trading strategies' },
    { title: 'Analytics', path: '/enterprise/analytics', icon: '📈', description: 'View team performance' },
    { title: 'Audit Logs', path: '/enterprise/audit', icon: '🔍', description: 'Track organization activity' },
    { title: 'Branding', path: '/enterprise/branding', icon: '🎨', description: 'Customize your dashboard' },
    { title: 'Bot Controls', path: '/enterprise/bot-controls', icon: '🤖', description: 'Configure bot settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.email?.split('@')[0]}
          </h1>
          <p className="mt-2 text-indigo-100">
            {organization?.name || 'Your organization'} Enterprise Dashboard
          </p>
          {organization?.custom_branding && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm">
              Custom Branding Active
            </div>
          )}
        </div>

        {/* Stats Section */}
        {analytics && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Trades</dt>
                      <dd className="text-lg font-semibold text-gray-900">{analytics.summary?.total_trades || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total P&L</dt>
                      <dd className={`text-lg font-semibold ${(analytics.summary?.total_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(analytics.summary?.total_pnl || 0).toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Win Rate</dt>
                      <dd className="text-lg font-semibold text-gray-900">{analytics.summary?.win_rate || 0}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Team Members</dt>
                      <dd className="text-lg font-semibold text-gray-900">{organization?.members?.length || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 text-2xl">{action.icon}</div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500 text-center">View audit logs for detailed activity history</p>
            <div className="mt-4 text-center">
              <Link to="/enterprise/audit" className="text-indigo-600 hover:text-indigo-800">
                View All Activity →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;