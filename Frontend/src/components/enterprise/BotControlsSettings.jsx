// src/components/enterprise/BotControlsSettings.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../hooks/useEnterprise';

const BotControlsSettings = () => {
  const { getOrganization, updateBotControls, loading } = useEnterprise();
  const [botControls, setBotControls] = useState({
    default_risk_level: 'medium',
    max_position_size_usd: 10000,
    max_daily_trades: 100,
    allowed_strategies: ['mean_reversion', 'ai_weighted', 'momentum'],
    require_approval_for_trades: false,
    approval_threshold_usd: 5000,
    trading_hours: {
      enabled: false,
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York',
    },
    blacklisted_symbols: [],
    whitelisted_symbols: [],
    stop_loss_global_percent: 5,
    take_profit_global_percent: 10,
    max_concurrent_positions: 5,
    email_notifications: {
      on_trade: true,
      on_error: true,
      on_approval_needed: true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    const result = await getOrganization();
    if (result.success && result.data.enhanced_bot_controls) {
      setBotControls({ ...botControls, ...result.data.enhanced_bot_controls });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateBotControls(botControls);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Bot controls updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update bot controls' });
    }
    
    setSaving(false);
  };

  const handleChange = (field, value) => {
    setBotControls({ ...botControls, [field]: value });
  };

  const handleNestedChange = (parent, field, value) => {
    setBotControls({
      ...botControls,
      [parent]: { ...botControls[parent], [field]: value },
    });
  };

  const strategyOptions = [
    { id: 'mean_reversion', name: 'Mean Reversion', risk: 'low' },
    { id: 'ai_weighted', name: 'AI Weighted', risk: 'medium' },
    { id: 'momentum', name: 'Momentum', risk: 'high' },
    { id: 'arbitrage', name: 'Arbitrage', risk: 'low' },
    { id: 'futures', name: 'Futures Engine', risk: 'high' },
    { id: 'alpha', name: 'Alpha Sniper', risk: 'high' },
  ];

  const riskLevels = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'red' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bot Controls</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure advanced bot settings for your organization
          </p>
        </div>
      </div>

      {message && (
        <div className={`mt-6 rounded-md p-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Risk Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Management</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Risk Level
              </label>
              <div className="flex gap-4">
                {riskLevels.map(risk => (
                  <label key={risk.value} className="flex items-center">
                    <input
                      type="radio"
                      value={risk.value}
                      checked={botControls.default_risk_level === risk.value}
                      onChange={(e) => handleChange('default_risk_level', e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className={`ml-2 text-sm font-medium text-${risk.color}-600`}>
                      {risk.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Position Size (USD)
                </label>
                <input
                  type="number"
                  value={botControls.max_position_size_usd}
                  onChange={(e) => handleChange('max_position_size_usd', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Daily Trades
                </label>
                <input
                  type="number"
                  value={botControls.max_daily_trades}
                  onChange={(e) => handleChange('max_daily_trades', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Global Stop Loss (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={botControls.stop_loss_global_percent}
                  onChange={(e) => handleChange('stop_loss_global_percent', parseFloat(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Global Take Profit (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={botControls.take_profit_global_percent}
                  onChange={(e) => handleChange('take_profit_global_percent', parseFloat(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Concurrent Positions
                </label>
                <select
                  value={botControls.max_concurrent_positions}
                  onChange={(e) => handleChange('max_concurrent_positions', parseInt(e.target.value))}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Access */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Strategy Access</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Select which strategies are available to team members:</p>
            {strategyOptions.map(strategy => (
              <label key={strategy.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={botControls.allowed_strategies.includes(strategy.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleChange('allowed_strategies', [...botControls.allowed_strategies, strategy.id]);
                      } else {
                        handleChange('allowed_strategies', botControls.allowed_strategies.filter(s => s !== strategy.id));
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">{strategy.name}</span>
                    <p className="text-xs text-gray-500">Risk: {strategy.risk}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Approval Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Workflow</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-900">Require Approval for Trades</span>
                <p className="text-xs text-gray-500">Require admin approval before executing trades</p>
              </div>
              <input
                type="checkbox"
                checked={botControls.require_approval_for_trades}
                onChange={(e) => handleChange('require_approval_for_trades', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </label>
            {botControls.require_approval_for_trades && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Approval Threshold (USD)
                </label>
                <input
                  type="number"
                  value={botControls.approval_threshold_usd}
                  onChange={(e) => handleChange('approval_threshold_usd', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Trades above this amount require approval (set to 0 for all trades)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Trading Hours */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trading Hours</h3>
          <label className="flex items-center justify-between p-3 border rounded-lg mb-4">
            <div>
              <span className="text-sm font-medium text-gray-900">Restrict Trading Hours</span>
              <p className="text-xs text-gray-500">Limit trading to specific hours of the day</p>
            </div>
            <input
              type="checkbox"
              checked={botControls.trading_hours.enabled}
              onChange={(e) => handleNestedChange('trading_hours', 'enabled', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </label>
          {botControls.trading_hours.enabled && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={botControls.trading_hours.start}
                  onChange={(e) => handleNestedChange('trading_hours', 'start', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={botControls.trading_hours.end}
                  onChange={(e) => handleNestedChange('trading_hours', 'end', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Time Zone</label>
                <select
                  value={botControls.trading_hours.timezone}
                  onChange={(e) => handleNestedChange('trading_hours', 'timezone', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Email Notifications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium text-gray-900">On Trade Execution</span>
              <input
                type="checkbox"
                checked={botControls.email_notifications.on_trade}
                onChange={(e) => handleNestedChange('email_notifications', 'on_trade', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium text-gray-900">On Error</span>
              <input
                type="checkbox"
                checked={botControls.email_notifications.on_error}
                onChange={(e) => handleNestedChange('email_notifications', 'on_error', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium text-gray-900">When Approval Needed</span>
              <input
                type="checkbox"
                checked={botControls.email_notifications.on_approval_needed}
                onChange={(e) => handleNestedChange('email_notifications', 'on_approval_needed', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BotControlsSettings;