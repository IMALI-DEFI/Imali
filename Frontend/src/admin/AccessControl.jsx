// src/admin/AccessControl.jsx
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Key, 
  Globe, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

const AccessControl = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ipWhitelist: [],
    countryBlocklist: [],
    rateLimits: {
      default: '200 per day',
      auth: '60 per hour',
      trading: '30 per hour',
      withdrawals: '10 per hour'
    },
    twoFARequired: false,
    sessionTimeout: 3600,
    maxLoginAttempts: 5
  });
  
  const [newIp, setNewIp] = useState('');
  const [newCountry, setNewCountry] = useState('');

  useEffect(() => {
    fetchAccessSettings();
  }, []);

  const fetchAccessSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/config');
      setSettings(response.data.config.security || settings);
    } catch (error) {
      console.error('Failed to fetch access settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/admin/config', {
        security: settings
      });
      alert('Access control settings updated successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addIpToWhitelist = () => {
    if (newIp && !settings.ipWhitelist.includes(newIp)) {
      setSettings({
        ...settings,
        ipWhitelist: [...settings.ipWhitelist, newIp]
      });
      setNewIp('');
    }
  };

  const removeIpFromWhitelist = (ip) => {
    setSettings({
      ...settings,
      ipWhitelist: settings.ipWhitelist.filter(i => i !== ip)
    });
  };

  const addCountryToBlocklist = () => {
    if (newCountry && !settings.countryBlocklist.includes(newCountry)) {
      setSettings({
        ...settings,
        countryBlocklist: [...settings.countryBlocklist, newCountry]
      });
      setNewCountry('');
    }
  };

  const removeCountryFromBlocklist = (country) => {
    setSettings({
      ...settings,
      countryBlocklist: settings.countryBlocklist.filter(c => c !== country)
    });
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
          <Shield className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold">Access Control</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IP Whitelist */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">IP Whitelist</h2>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Enter IP address"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addIpToWhitelist}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {settings.ipWhitelist.map((ip, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-mono">{ip}</span>
                <button
                  onClick={() => removeIpFromWhitelist(ip)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
            {settings.ipWhitelist.length === 0 && (
              <p className="text-gray-500 text-center py-4">No IP addresses whitelisted</p>
            )}
          </div>
        </div>

        {/* Country Blocklist */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold">Country Blocklist</h2>
          </div>
          
          <div className="flex gap-2 mb-4">
            <select
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select country</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
              <option value="CN">China</option>
              <option value="RU">Russia</option>
            </select>
            <button
              onClick={addCountryToBlocklist}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Block
            </button>
          </div>

          <div className="space-y-2">
            {settings.countryBlocklist.map((country, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span>{country}</span>
                <button
                  onClick={() => removeCountryFromBlocklist(country)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
            {settings.countryBlocklist.length === 0 && (
              <p className="text-gray-500 text-center py-4">No countries blocked</p>
            )}
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Rate Limits</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Rate Limit
              </label>
              <input
                type="text"
                value={settings.rateLimits.default}
                onChange={(e) => setSettings({
                  ...settings,
                  rateLimits: { ...settings.rateLimits, default: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication Rate Limit
              </label>
              <input
                type="text"
                value={settings.rateLimits.auth}
                onChange={(e) => setSettings({
                  ...settings,
                  rateLimits: { ...settings.rateLimits, auth: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trading Rate Limit
              </label>
              <input
                type="text"
                value={settings.rateLimits.trading}
                onChange={(e) => setSettings({
                  ...settings,
                  rateLimits: { ...settings.rateLimits, trading: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Security Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Require 2FA for All Users
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.twoFARequired}
                  onChange={(e) => setSettings({ ...settings, twoFARequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (seconds)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;