// Frontend/src/pages/admin/AdminPromoCodes.jsx
import React, { useState } from 'react';
import { FaGift, FaPlus, FaEdit, FaTrash, FaCopy, FaCheck, FaCalendar, FaUsers, FaDollarSign } from 'react-icons/fa';

const AdminPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState([
    { id: '1', code: 'WELCOME2026', discount: 20, type: 'percentage', uses: 45, maxUses: 100, expires: '2026-12-31', status: 'active' },
    { id: '2', code: 'SUMMER50', discount: 50, type: 'fixed', uses: 12, maxUses: 50, expires: '2026-08-31', status: 'active' },
    { id: '3', code: 'EARLYBIRD10', discount: 10, type: 'percentage', uses: 78, maxUses: 200, expires: '2026-03-31', status: 'expired' },
  ]);
  const [copied, setCopied] = useState(null);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'bg-emerald-500/20 text-emerald-400',
      expired: 'bg-red-500/20 text-red-400',
      paused: 'bg-amber-500/20 text-amber-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs ${map[status] || map.active}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Promo Codes</h2>
          <p className="text-sm text-white/40">Create and manage discount codes</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition flex items-center gap-2">
          <FaPlus /> Generate Code
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Total Codes</span>
            <FaGift className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{promoCodes.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Used</span>
            <FaUsers className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{promoCodes.reduce((sum, p) => sum + p.uses, 0)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Avg Discount</span>
            <FaDollarSign className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{Math.round(promoCodes.reduce((sum, p) => sum + p.discount, 0) / promoCodes.length)}%</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Active Promo Codes</h3>
        </div>
        <div className="divide-y divide-white/5">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-purple-400">{promo.code}</span>
                  <button 
                    onClick={() => copyCode(promo.code)}
                    className="text-white/40 hover:text-white transition"
                  >
                    {copied === promo.code ? <FaCheck className="text-emerald-400" /> : <FaCopy />}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/40">
                  <span>{promo.discount}% off</span>
                  <span>•</span>
                  <span>{promo.uses}/{promo.maxUses} uses</span>
                  <span>•</span>
                  <span>Expires: {promo.expires}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(promo.status)}
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

export default AdminPromoCodes;
