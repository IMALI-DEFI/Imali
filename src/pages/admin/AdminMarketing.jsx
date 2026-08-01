// Frontend/src/pages/admin/AdminMarketing.jsx
import React from 'react';
import { FaBullhorn, FaRobot, FaEnvelope, FaTwitter, FaFacebook, FaLinkedin, FaCalendar, FaChartBar } from 'react-icons/fa';

const AdminMarketing = () => {
  const campaigns = [
    { id: '1', name: 'Q1 Product Launch', status: 'active', budget: 5000, impressions: 12500, clicks: 892, conversion: 3.2 },
    { id: '2', name: 'Referral Campaign', status: 'active', budget: 2000, impressions: 8450, clicks: 456, conversion: 5.1 },
    { id: '3', name: 'Holiday Special', status: 'paused', budget: 1500, impressions: 3200, clicks: 178, conversion: 2.8 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Marketing</h2>
          <p className="text-sm text-white/40">Manage marketing campaigns and promotions</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaBullhorn /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaBullhorn className="text-2xl text-purple-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Active Campaigns</p>
          <p className="text-2xl font-bold">2</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaChartBar className="text-2xl text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Total Impressions</p>
          <p className="text-2xl font-bold">24,150</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaRobot className="text-2xl text-blue-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Automation Rules</p>
          <p className="text-2xl font-bold">8</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <FaCalendar className="text-2xl text-amber-400 mx-auto" />
          <p className="text-sm font-semibold mt-2">Scheduled Posts</p>
          <p className="text-2xl font-bold">14</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Campaigns</h3>
        </div>
        <div className="divide-y divide-white/5">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <p className="font-medium">{campaign.name}</p>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span>${campaign.budget.toLocaleString()}</span>
                  <span>•</span>
                  <span>{campaign.impressions.toLocaleString()} impressions</span>
                  <span>•</span>
                  <span>{campaign.clicks} clicks</span>
                  <span>•</span>
                  <span>{campaign.conversion}% conversion</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {campaign.status}
                </span>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaBullhorn />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMarketing;
