// src/admin/EnterpriseAnalytics.jsx
import React, { useState, useEffect } from 'react';

export default function EnterpriseAnalytics({ apiBase }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/enterprise/analytics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-center py-8">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Enterprise Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🏢</div>
          <div className="text-2xl font-bold text-purple-400">{analytics?.total_organizations || 0}</div>
          <div className="text-sm text-white/60">Total Organizations</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">👥</div>
          <div className="text-2xl font-bold text-blue-400">{analytics?.total_members || 0}</div>
          <div className="text-sm text-white/60">Total Members</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-2xl font-bold text-emerald-400">{analytics?.total_custom_strategies || 0}</div>
          <div className="text-sm text-white/60">Custom Strategies</div>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Organization Performance</h4>
        <div className="space-y-2">
          {analytics?.organizations?.map(org => (
            <div key={org.id} className="flex justify-between items-center py-2 border-b border-white/10">
              <span>{org.name}</span>
              <span className="text-emerald-400">${org.total_pnl?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}