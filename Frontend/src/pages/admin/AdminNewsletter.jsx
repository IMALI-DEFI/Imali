// src/pages/admin/AdminNewsletter.jsx
import React, { useState } from 'react';
import { FaNewspaper, FaPlus, FaEdit, FaTrash, FaSend, FaUsers, FaEye, FaChartBar, FaSync, FaSearch } from 'react-icons/fa';

const AdminNewsletter = () => {
  const [newsletters, setNewsletters] = useState([
    { id: '1', title: 'Monthly Update - January 2026', status: 'sent', date: '2026-01-15', opens: 845, clicks: 210, subscribers: 1892 },
    { id: '2', title: 'New Feature Announcement', status: 'draft', date: null, opens: 0, clicks: 0, subscribers: 0 },
    { id: '3', title: 'Weekly Digest - Week 3', status: 'scheduled', date: '2026-01-20', opens: 0, clicks: 0, subscribers: 1892 },
    { id: '4', title: 'Product Update - Q1 2026', status: 'sent', date: '2026-01-10', opens: 1024, clicks: 267, subscribers: 1892 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredNewsletters = newsletters.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Newsletter</h2>
          <p className="text-sm text-white/40">Create and send newsletters to subscribers</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaPlus /> New Newsletter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Subscribers</span>
            <FaUsers className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">1,892</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Avg Open Rate</span>
            <FaEye className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">44.7%</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Avg Click Rate</span>
            <FaChartBar className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">11.1%</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search newsletters..."
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
          <h3 className="font-semibold">Newsletters</h3>
        </div>
        <div className="divide-y divide-white/5">
          {filteredNewsletters.map((newsletter) => (
            <div key={newsletter.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <p className="font-medium">{newsletter.title}</p>
                <div className="flex items-center gap-3 text-sm text-white/40">
                  {newsletter.date && <span>{newsletter.date}</span>}
                  <span>•</span>
                  <span>{newsletter.opens} opens</span>
                  <span>•</span>
                  <span>{newsletter.clicks} clicks</span>
                  {newsletter.subscribers > 0 && <span>•</span>}
                  {newsletter.subscribers > 0 && <span>{newsletter.subscribers} subscribers</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${newsletter.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : newsletter.status === 'draft' ? 'bg-gray-500/20 text-gray-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {newsletter.status}
                </span>
                {newsletter.status === 'draft' && (
                  <button className="p-1.5 text-emerald-400/60 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition">
                    <FaSend />
                  </button>
                )}
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

export default AdminNewsletter;
