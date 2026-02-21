// src/admin/PromoManagement.jsx
import React, { useState, useEffect } from 'react';
import BotAPI from '../utils/BotAPI';

export default function PromoManagement({ apiBase }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    fee_percent: 5.0,
    duration_days: 90,
    max_uses: 1,
    description: ''
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await BotAPI.adminListPromos();
      setPromos(data.promos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await BotAPI.adminCreatePromo(form);
      alert('✅ Promo created');
      setForm({ code: '', fee_percent: 5.0, duration_days: 90, max_uses: 1, description: '' });
      fetchPromos();
    } catch (err) {
      alert('❌ Failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🎟️ Promo Management</h2>
      
      <form onSubmit={handleCreate} className="bg-white/5 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold">Create New Promo</h3>
        <input
          placeholder="Code"
          value={form.code}
          onChange={(e) => setForm({...form, code: e.target.value})}
          className="w-full p-2 rounded bg-black/40"
          required
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Fee %"
            value={form.fee_percent}
            onChange={(e) => setForm({...form, fee_percent: parseFloat(e.target.value)})}
            className="p-2 rounded bg-black/40"
            step="0.5"
          />
          <input
            type="number"
            placeholder="Days"
            value={form.duration_days}
            onChange={(e) => setForm({...form, duration_days: parseInt(e.target.value)})}
            className="p-2 rounded bg-black/40"
          />
          <input
            type="number"
            placeholder="Max Uses"
            value={form.max_uses}
            onChange={(e) => setForm({...form, max_uses: parseInt(e.target.value)})}
            className="p-2 rounded bg-black/40"
          />
        </div>
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
          className="w-full p-2 rounded bg-black/40"
          rows="2"
        />
        <button type="submit" className="px-4 py-2 bg-emerald-600 rounded">
          Create Promo
        </button>
      </form>

      <div className="space-y-2">
        {promos.map(promo => (
          <div key={promo.id} className="bg-white/5 p-3 rounded flex justify-between">
            <div>
              <span className="font-mono">{promo.code}</span>
              <span className="ml-2 text-sm text-white/60">{promo.uses}/{promo.max_uses} uses</span>
            </div>
            <span className="text-emerald-400">{promo.fee_percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
