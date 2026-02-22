// src/admin/PromoManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Percent,
  Users,
  Clock
} from 'lucide-react';
import api from '../services/api';

const PromoManagement = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    totalPromos: 0,
    activePromos: 0,
    totalUses: 0
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/promo/list');
      setPromos(response.data.promos);
      calculateStats(response.data.promos);
    } catch (error) {
      console.error('Failed to fetch promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (promoList) => {
    const stats = {
      totalPromos: promoList.length,
      activePromos: promoList.filter(p => p.active).length,
      totalUses: promoList.reduce((sum, p) => sum + (p.uses || 0), 0)
    };
    setStats(stats);
  };

  const handleCreatePromo = async (promoData) => {
    try {
      await api.post('/admin/promo/create', promoData);
      setShowCreateModal(false);
      fetchPromos();
    } catch (error) {
      console.error('Failed to create promo:', error);
      alert('Failed to create promo');
    }
  };

  const handleToggleActive = async (promoId, currentActive) => {
    try {
      await api.patch(`/admin/promo/${promoId}`, { active: !currentActive });
      fetchPromos();
    } catch (error) {
      console.error('Failed to toggle promo:', error);
      alert('Failed to update promo');
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) {
      return;
    }
    
    try {
      await api.delete(`/admin/promo/${promoId}`);
      fetchPromos();
    } catch (error) {
      console.error('Failed to delete promo:', error);
      alert('Failed to delete promo');
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    alert('Promo code copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold">Promo Management</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Create Promo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Promos</div>
              <div className="text-2xl font-bold">{stats.totalPromos}</div>
            </div>
            <Gift className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active Promos</div>
              <div className="text-2xl font-bold">{stats.activePromos}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Uses</div>
              <div className="text-2xl font-bold">{stats.totalUses}</div>
            </div>
            <Users className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Promos Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promos.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{promo.code}</span>
                      <button
                        onClick={() => copyToClipboard(promo.code)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {promo.description && (
                      <div className="text-xs text-gray-500 mt-1">{promo.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Percent className="w-4 h-4 text-gray-400" />
                      <span>{promo.fee_percent}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{promo.duration_days} days</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{promo.uses}</span>
                    <span className="text-gray-500 text-sm"> / {promo.max_uses}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(promo.id, promo.active)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        promo.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {promo.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {promos.length === 0 && (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No promos created</h3>
            <p className="text-gray-500">Create your first promo code to get started</p>
          </div>
        )}
      </div>

      {/* Create Promo Modal */}
      {showCreateModal && (
        <CreatePromoModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePromo}
        />
      )}
    </div>
  );
};

// Create Promo Modal Component
const CreatePromoModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    code: '',
    fee_percent: 5,
    duration_days: 90,
    max_uses: 100,
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Create Promo Code</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promo Code
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SUMMER2024"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Percentage
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                step="0.1"
                value={formData.fee_percent}
                onChange={(e) => setFormData({ ...formData, fee_percent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Uses
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this promo is for..."
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Promo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoManagement;