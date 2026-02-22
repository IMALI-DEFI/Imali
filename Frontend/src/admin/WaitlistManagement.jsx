// src/admin/WaitlistManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaTrash 
} from 'react-icons/fa';

import api from '../services/api';

const WaitlistManagement = () => {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    activated: 0,
    averageWaitTime: 0
  });

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/waitlist');
      setWaitlist(response.data.waitlist);
      calculateStats(response.data.waitlist);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (list) => {
    const stats = {
      total: list.length,
      waiting: list.filter(w => w.status === 'waiting').length,
      activated: list.filter(w => w.status === 'activated').length,
      averageWaitTime: calculateAverageWaitTime(list)
    };
    setStats(stats);
  };

  const calculateAverageWaitTime = (list) => {
    const activated = list.filter(w => w.status === 'activated' && w.activated_at && w.created_at);
    if (activated.length === 0) return 0;
    
    const totalWait = activated.reduce((sum, w) => {
      const created = new Date(w.created_at);
      const activated = new Date(w.activated_at);
      return sum + (activated - created);
    }, 0);
    
    return Math.round(totalWait / activated.length / (1000 * 60 * 60 * 24)); // Days
  };

  const handleActivateUser = async (email) => {
    try {
      await api.post(`/admin/waitlist/activate/${email}`);
      fetchWaitlist();
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert('Failed to activate user');
    }
  };

  const handleSendInvite = async (email) => {
    try {
      // You'll need to create this endpoint
      await api.post(`/admin/waitlist/send-invite/${email}`);
      alert('Invitation sent successfully');
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert('Failed to send invitation');
    }
  };

  const handleBulkActivate = async () => {
    if (!window.confirm(`Activate ${filteredWaitlist.length} users from waitlist?`)) {
      return;
    }
    
    try {
      // You'll need to create this endpoint
      await api.post('/admin/waitlist/bulk-activate', {
        emails: filteredWaitlist.map(w => w.email)
      });
      fetchWaitlist();
    } catch (error) {
      console.error('Failed to bulk activate:', error);
      alert('Failed to activate users');
    }
  };

  const exportWaitlist = () => {
    const csv = [
      ['Email', 'Tier', 'Position', 'Status', 'Joined', 'Activated'].join(','),
      ...waitlist.map(w => [
        w.email,
        w.tier,
        w.position,
        w.status,
        new Date(w.created_at).toLocaleDateString(),
        w.activated_at ? new Date(w.activated_at).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredWaitlist = waitlist.filter(entry => {
    const matchesSearch = 
      entry.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    const matchesTier = filterTier === 'all' || entry.tier === filterTier;
    
    return matchesSearch && matchesStatus && matchesTier;
  });

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
          <Users className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold">Waitlist Management</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportWaitlist}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {filteredWaitlist.length > 0 && (
            <button
              onClick={handleBulkActivate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4" />
              Activate {filteredWaitlist.length} Selected
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Waitlist</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <Users className="w-8 h-8 text-indigo-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Waiting</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Activated</div>
              <div className="text-2xl font-bold text-green-600">{stats.activated}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Avg. Wait Time</div>
              <div className="text-2xl font-bold">{stats.averageWaitTime} days</div>
            </div>
            <Calendar className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="activated">Activated</option>
          </select>
          
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
        </div>
      </div>

      {/* Waitlist Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWaitlist.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-indigo-600">
                      #{entry.position}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{entry.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize">{entry.tier}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      entry.status === 'activated' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {entry.activated_at ? new Date(entry.activated_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {entry.status === 'waiting' && (
                        <>
                          <button
                            onClick={() => handleActivateUser(entry.email)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleSendInvite(entry.email)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Send Invite"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredWaitlist.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No waitlist entries found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistManagement;
