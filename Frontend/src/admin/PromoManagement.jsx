// src/admin/PromoManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../hooks/useAdmin';

export default function PromoManagement({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    fee_percent: 5,
    duration_days: 90,
    max_uses: 1,
    description: ''
  });

  const fetchPromos = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/promo/list');
      setPromos(data.promos || []);
    } catch (error) {
      console.error('Failed to fetch promos:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchPromos();
    const interval = setInterval(fetchPromos, 30000);
    return () => clearInterval(interval);
  }, [fetchPromos]);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    try {
      await handleAction('/api/admin/promo/create', 'POST', formData, 'Create Promo');
      setShowForm(false);
      setFormData({ code: '', fee_percent: 5, duration_days: 90, max_uses: 1, description: '' });
      fetchPromos();
    } catch (error) {
      console.error('Failed to create promo:', error);
    }
  };

  const handleTogglePromo = async (promoId, active) => {
    try {
      await handleAction(`/api/admin/promo/${promoId}/toggle`, 'POST', { active: !active }, 'Toggle Promo');
      fetchPromos();
    } catch (error) {
      console.error('Failed to toggle promo:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🎟️</span> Promo Code Management
          </h3>
          <p className="text-sm text-white/50">Create and manage promotional codes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Promo'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h4 className="font-semibold mb-4">Create New Promo Code</h4>
          <form onSubmit={handleCreatePromo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Promo Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="SUMMER2024"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Fee Percent</label>
              <input
                type="number"
                value={formData.fee_percent}
                onChange={(e) => setFormData({ ...formData, fee_percent: parseFloat(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                step="0.1"
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Duration (days)</label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Max Uses</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                min="1"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/50 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="Summer Sale 2024"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busyAction === 'Create Promo'}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {busyAction === 'Create Promo' ? 'Creating...' : 'Create Promo Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promos Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/30">
              <tr className="text-left text-xs text-white/40">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Fee %</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-white/40">
                    No promo codes found
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr key={promo.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{promo.code}</td>
                    <td className="px-4 py-3">{promo.fee_percent}%</td>
                    <td className="px-4 py-3">{promo.duration_days} days</td>
                    <td className="px-4 py-3">{promo.uses}/{promo.max_uses}</td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {new Date(promo.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        promo.active 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {promo.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePromo(promo.id, promo.active)}
                        className={`text-xs px-2 py-1 rounded ${
                          promo.active 
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                        disabled={busyAction}
                      >
                        {promo.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
