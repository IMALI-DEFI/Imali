// Frontend/src/pages/admin/AdminSystemHealth.jsx
import React, { useState, useEffect } from 'react';
import { FaServer, FaCheck, FaTimes, FaSpinner, FaDatabase, FaCloud, FaClock, FaShieldAlt } from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminSystemHealth = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        // const data = await BotAPI.getSystemHealth();
        setServices([
          { name: 'API Server', status: 'healthy', responseTime: '45ms', uptime: '99.99%' },
          { name: 'Database', status: 'healthy', responseTime: '12ms', uptime: '99.97%' },
          { name: 'Redis Cache', status: 'healthy', responseTime: '3ms', uptime: '99.95%' },
          { name: 'Stripe API', status: 'healthy', responseTime: '210ms', uptime: '99.98%' },
          { name: 'WebSocket Server', status: 'healthy', responseTime: '28ms', uptime: '99.92%' },
          { name: 'Background Jobs', status: 'degraded', responseTime: '150ms', uptime: '98.50%' },
        ]);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const getStatusBadge = (status) => {
    const map = {
      healthy: { color: 'bg-emerald-500/20 text-emerald-400', icon: <FaCheck /> },
      degraded: { color: 'bg-amber-500/20 text-amber-400', icon: <FaSpinner className="animate-spin" /> },
      down: { color: 'bg-red-500/20 text-red-400', icon: <FaTimes /> },
    };
    const s = map[status] || map.healthy;
    return <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${s.color}`}>{s.icon} {status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">System Health</h2>
          <p className="text-sm text-white/40">Monitor platform service status</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            All Systems Operational
          </span>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition">
            <FaClock className="inline mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Overall Uptime</span>
            <FaServer className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-400">99.98%</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Avg Response Time</span>
            <FaClock className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">74ms</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/40">Services Running</span>
            <FaShieldAlt className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2">5/6</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="font-semibold">Service Status</h3>
        </div>
        <div className="divide-y divide-white/5">
          {services.map((service) => (
            <div key={service.name} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div className="flex items-center gap-3">
                <FaServer className="text-purple-400" />
                <div>
                  <p className="font-medium">{service.name}</p>
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    <span>Response: {service.responseTime}</span>
                    <span>•</span>
                    <span>Uptime: {service.uptime}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(service.status)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSystemHealth;
