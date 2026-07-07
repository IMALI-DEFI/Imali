// Frontend/src/pages/admin/AdminEnterpriseManagement.jsx
import React, { useState } from 'react';
import { FaBuilding, FaUsers, FaCrown, FaChartBar, FaPlus, FaEdit, FaTrash, FaEye, FaUserPlus } from 'react-icons/fa';

const AdminEnterpriseManagement = () => {
  const [enterprises, setEnterprises] = useState([
    { id: '1', name: 'Acme Corp', members: 25, plan: 'enterprise', status: 'active', created: '2024-01-15' },
    { id: '2', name: 'DataVault LLC', members: 18, plan: 'business', status: 'active', created: '2024-02-20' },
    { id: '3', name: 'CloudSync Inc', members: 32, plan: 'enterprise', status: 'pending', created: '2024-03-10' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Enterprise Management</h2>
          <p className="text-sm text-white/40">Manage enterprise organizations and features</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaPlus /> Create Enterprise
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Enterprises</span>
            <FaBuilding className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{enterprises.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Members</span>
            <FaUsers className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{enterprises.reduce((sum, e) => sum + e.members, 0)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Enterprise Plans</span>
            <FaCrown className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{enterprises.filter(e => e.plan === 'enterprise').length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Pending Requests</span>
            <FaUserPlus className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{enterprises.filter(e => e.status === 'pending').length}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Enterprise Organizations</h3>
        </div>
        <div className="divide-y divide-white/5">
          {enterprises.map((enterprise) => (
            <div key={enterprise.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <div className="flex items-center gap-3">
                  <FaBuilding className="text-purple-400" />
                  <p className="font-medium">{enterprise.name}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span>{enterprise.members} members</span>
                  <span>•</span>
                  <span>{enterprise.plan}</span>
                  <span>•</span>
                  <span>Created: {enterprise.created}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs ${enterprise.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {enterprise.status}
                </span>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaEye />
                </button>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaUserPlus />
                </button>
                <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition">
                  <FaEdit />
                </button>
                <button className="p-1.5 text
