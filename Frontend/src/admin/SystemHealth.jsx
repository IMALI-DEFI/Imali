// src/admin/SystemHealth.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaTrash 
} from 'react-icons/fa';

import api from '../services/api';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        api.get('/health/detailed'),
        api.get('/admin/metrics')
      ]);
      setHealth(healthRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'configured':
      case 'enabled':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'disconnected':
      case 'disabled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'configured':
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'unhealthy':
      case 'disconnected':
      case 'disabled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  // Sample data for charts - replace with real data from your API
  const systemLoadData = [
    { time: '00:00', cpu: 45, memory: 60, requests: 120 },
    { time: '04:00', cpu: 42, memory: 58, requests: 98 },
    { time: '08:00', cpu: 65, memory: 72, requests: 245 },
    { time: '12:00', cpu: 78, memory: 85, requests: 389 },
    { time: '16:00', cpu: 82, memory: 88, requests: 412 },
    { time: '20:00', cpu: 58, memory: 70, requests: 267 },
    { time: 'Now', cpu: 52, memory: 65, requests: 156 }
  ];

  const errorRateData = [
    { time: '00:00', errors: 2 },
    { time: '04:00', errors: 1 },
    { time: '08:00', errors: 5 },
    { time: '12:00', errors: 8 },
    { time: '16:00', errors: 7 },
    { time: '20:00', errors: 3 },
    { time: 'Now', errors: 2 }
  ];

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
          <Activity className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold">System Health</h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealthData}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Server className="w-5 h-5 text-gray-400" />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(health?.services?.api)}`}>
              {health?.services?.api}
            </span>
          </div>
          <div className="text-2xl font-bold">API Server</div>
          <div className="text-sm text-gray-500 mt-1">Uptime: 99.9%</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-gray-400" />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(health?.services?.firestore)}`}>
              {health?.services?.firestore}
            </span>
          </div>
          <div className="text-2xl font-bold">Database</div>
          <div className="text-sm text-gray-500 mt-1">Firestore</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(health?.services?.stripe)}`}>
              {health?.services?.stripe}
            </span>
          </div>
          <div className="text-2xl font-bold">Payments</div>
          <div className="text-sm text-gray-500 mt-1">Stripe</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(health?.services?.encryption)}`}>
              {health?.services?.encryption}
            </span>
          </div>
          <div className="text-2xl font-bold">Encryption</div>
          <div className="text-sm text-gray-500 mt-1">AES-256</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 opacity-75" />
            <span className="text-xs opacity-75">Total</span>
          </div>
          <div className="text-3xl font-bold">{metrics?.users?.total || 0}</div>
          <div className="text-sm opacity-75 mt-1">Active Users</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 opacity-75" />
            <span className="text-xs opacity-75">Today</span>
          </div>
          <div className="text-3xl font-bold">${metrics?.trading?.volume_today?.toFixed(2) || 0}</div>
          <div className="text-sm opacity-75 mt-1">Trading Volume</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 opacity-75" />
            <span className="text-xs opacity-75">Pending</span>
          </div>
          <div className="text-3xl font-bold">{metrics?.revenue?.pending_withdrawals || 0}</div>
          <div className="text-sm opacity-75 mt-1">Withdrawals</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 opacity-75" />
            <span className="text-xs opacity-75">Response</span>
          </div>
          <div className="text-3xl font-bold">124ms</div>
          <div className="text-sm opacity-75 mt-1">Avg Response Time</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">System Load</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={systemLoadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
              <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Memory %" />
              <Line type="monotone" dataKey="requests" stroke="#ffc658" name="Requests" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Error Rate</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={errorRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="errors" stroke="#ff4d4f" fill="#ffccc7" name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Service Status</h2>
        </div>
        <div className="divide-y">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">API Server</div>
                <div className="text-sm text-gray-500">Python Flask</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">99.9% uptime</span>
              {getStatusIcon(health?.services?.api)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Firestore Database</div>
                <div className="text-sm text-gray-500">Google Cloud</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Connected</span>
              {getStatusIcon(health?.services?.firestore)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Stripe Payments</div>
                <div className="text-sm text-gray-500">Payment Processing</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Configured</span>
              {getStatusIcon(health?.services?.stripe)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Bot Service</div>
                <div className="text-sm text-gray-500">Trading Bots</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Operational</span>
              {getStatusIcon(health?.services?.bot_service)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Encryption Service</div>
                <div className="text-sm text-gray-500">AES-256</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Enabled</span>
              {getStatusIcon(health?.services?.encryption)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Redis Cache</div>
                <div className="text-sm text-gray-500">Session Storage</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Connected</span>
              {getStatusIcon(health?.services?.redis)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">Email Service</div>
                <div className="text-sm text-gray-500">SendGrid</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Configured</span>
              {getStatusIcon(health?.services?.notifications?.email)}
            </div>
          </div>
          
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium">SMS Service</div>
                <div className="text-sm text-gray-500">Twilio</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Configured</span>
              {getStatusIcon(health?.services?.notifications?.sms)}
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Python Version</div>
            <div className="font-medium">{health?.system?.python_version?.split(' ')[0]}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Memory Usage</div>
            <div className="font-medium">{health?.system?.memory_usage}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Last Updated</div>
            <div className="font-medium">{new Date(health?.timestamp).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
