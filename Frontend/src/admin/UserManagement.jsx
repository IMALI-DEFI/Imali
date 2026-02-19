// src/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import BotAPI from '../utils/BotAPI';

export default function UserManagement({ apiBase, onUserAction }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state for new user
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tier: 'starter',
    strategy: 'ai_weighted',
    tradingEnabled: false
  });

  // Promo form state
  const [promoData, setPromoData] = useState({
    code: '',
    fee_percent: 5.0,
    duration_days: 90,
    max_uses: 1,
    description: ''
  });

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${BotAPI.getToken()}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handlePromoChange = (e) => {
    const { name, value } = e.target;
    setPromoData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBase}/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      setSuccess(`User ${formData.email} created successfully!`);
      setFormData({
        email: '',
        password: '',
        tier: 'starter',
        strategy: 'ai_weighted',
        tradingEnabled: false
      });
      
      await fetchUsers();
      if (onUserAction) onUserAction('created');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBase}/admin/promo/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify(promoData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create promo');
      }

      setSuccess(`Promo code ${promoData.code} created!`);
      setPromoData({
        code: '',
        fee_percent: 5.0,
        duration_days: 90,
        max_uses: 1,
        description: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">👥 User & Promo Management</h2>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-200">
          ✅ {success}
        </div>
      )}

      {/* Create User Form */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">➕ Create New User</h3>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="8"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Tier</label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Strategy</label>
              <select
                name="strategy"
                value={formData.strategy}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              >
                <option value="ai_weighted">AI Weighted</option>
                <option value="momentum">Momentum</option>
                <option value="mean_reversion">Mean Reversion</option>
              </select>
            </div>
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="tradingEnabled"
              checked={formData.tradingEnabled}
              onChange={handleInputChange}
              className="rounded bg-black/40 border-white/10"
            />
            <span className="text-sm text-white/80">Enable trading immediately</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Create Promo Form */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">🎟️ Create Promo Code</h3>
        <form onSubmit={handleCreatePromo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Promo Code *</label>
              <input
                type="text"
                name="code"
                value={promoData.code}
                onChange={handlePromoChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white uppercase"
                placeholder="SUMMER2024"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Fee %</label>
              <input
                type="number"
                name="fee_percent"
                value={promoData.fee_percent}
                onChange={handlePromoChange}
                step="0.5"
                min="0"
                max="100"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Duration (days)</label>
              <input
                type="number"
                name="duration_days"
                value={promoData.duration_days}
                onChange={handlePromoChange}
                min="1"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Max Uses</label>
              <input
                type="number"
                name="max_uses"
                value={promoData.max_uses}
                onChange={handlePromoChange}
                min="1"
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea
              name="description"
              value={promoData.description}
              onChange={handlePromoChange}
              rows="2"
              className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
              placeholder="Special summer promo for new users"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Promo Code'}
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">📋 User List ({users.length})</h3>
        {/* ... rest of your user list code ... */}
      </div>
    </div>
  );
}
