// src/pages/admin/AdminEmail.jsx
import React, { useState } from 'react';
import { FaEnvelope, FaPlus, FaEdit, FaTrash, FaPlay, FaPause, FaChartBar, FaUsers, FaSync, FaSearch } from 'react-icons/fa';

const AdminEmail = () => {
  const [campaigns, setCampaigns] = useState([
    { id: '1', name: 'Welcome Series', status: 'active', sent: 1245, openRate: 68.5, clickRate: 12.3, created: '2024-01-15' },
    { id: '2', name: 'Monthly Newsletter', status: 'draft', sent: 0, openRate: 0, clickRate: 0, created: '2024-02-20' },
    { id: '3', name: 'Product Update', status: 'paused', sent: 892, openRate: 52.1, clickRate: 8.7, created: '2024-03-10' },
    { id: '4', name: 'Holiday Special', status: 'active', sent: 2341, openRate: 71.2, clickRate: 15.4, created: '2024-04-05' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Email Automation</h2>
          <p className="text-sm text-white/40">Manage email campaigns and sequences</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaPlus /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Sent</span>
            <FaEnvelope className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{campaigns.reduce((sum, c) => sum + c.sent, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Avg Open Rate</span>
            <FaChartBar className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{(campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length).toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Subscribers</span>
            <FaUsers className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">1,892</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center gap-2">
          <FaSync /> Refresh
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Email Campaigns</h3>
        </div>
        <div className="divide-y divide-white/5">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <p className="font-medium">{campaign.name}</p>
                <div className="flex items-center gap-3 text-sm text-white/40">
                  <span>{campaign.sent.toLocaleString()} sent</span>
                  <span>•</span>
                  <span>Open: {campaign.openRate}%</span>
                  <span>•</span>
                  <span>Click: {campaign.clickRate}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {campaign.status}
                </span>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  {campaign.status === 'active' ? <FaPause /> : <FaPlay />}
                </button>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaEdit />
                </button>
                <button className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminEmail;
