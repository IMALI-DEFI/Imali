// src/pages/BotsControlPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEnterprise } from '../hooks/useEnterprise';

const BotsControlPage = () => {
  const { user, isEnterpriseAdmin, hasEnhancedBotControls } = useAuth();
  const { updateBotControls, getOrganization, loading } = useEnterprise();
  
  const [botControls, setBotControls] = useState({
    default_risk_level: 'medium',
    max_position_size_usd: 10000,
    max_daily_trades: 100,
    max_concurrent_positions: 5,
    allowed_strategies: ['mean_reversion', 'ai_weighted', 'momentum'],
    require_approval_for_trades: false,
    approval_threshold_usd: 5000,
    stop_loss_global_percent: 5,
    take_profit_global_percent: 10,
    trading_hours: {
      enabled: false,
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York',
    },
    blacklisted_symbols: [],
    whitelisted_symbols: [],
    email_notifications: {
      on_trade: true,
      on_error: true,
      on_approval_needed: true,
    },
    auto_close_positions: {
      enabled: false,
      minutes: 60,
    },
    max_loss_per_day_usd: 1000,
    max_loss_per_week_usd: 5000,
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [blacklistInput, setBlacklistInput] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');

  useEffect(() => {
    loadOrganizationSettings();
  }, []);

  const loadOrganizationSettings = async () => {
    const result = await getOrganization();
    if (result.success && result.data.enhanced_bot_controls) {
      setBotControls(prev => ({
        ...prev,
        ...result.data.enhanced_bot_controls,
      }));
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

  const addToBlacklist = () => {
    if (blacklistInput && !botControls.blacklisted_symbols.includes(blacklistInput.toUpperCase())) {
      setBotControls({
        ...botControls,
        blacklisted_symbols: [...botControls.blacklisted_symbols, blacklistInput.toUpperCase()],
      });
      setBlacklistInput('');
    }
  };

  const removeFromBlacklist = (symbol) => {
    setBotControls({
      ...botControls,
      blacklisted_symbols: botControls.blacklisted_symbols.filter(s => s !== symbol),
    });
  };

  const addToWhitelist = () => {
    if (whitelistInput && !botControls.whitelisted_symbols.includes(whitelistInput.toUpperCase())) {
      setBotControls({
        ...botControls,
        whitelisted_symbols: [...botControls.whitelisted_symbols, whitelistInput.toUpperCase()],
      });
      setWhitelistInput('');
    }
  };

  const removeFromWhitelist = (symbol) => {
    setBotControls({
      ...botControls,
      whitelisted_symbols: botControls.whitelisted_symbols.filter(s => s !== symbol),
    });
  };

  const strategyOptions = [
    { id: 'mean_reversion', name: 'Mean Reversion', risk: 'low', description: 'Buys dips and sells rips' },
    { id: 'ai_weighted', name: 'AI Weighted', risk: 'medium', description: 'Smart mix of signals' },
    { id: 'momentum', name: 'Momentum', risk: 'high', description: 'Follows strong trends' },
    { id: 'arbitrage', name: 'Arbitrage', risk: 'low', description: 'Profits from price differences' },
    { id: 'futures', name: 'Futures Engine', risk: 'high', description: 'Crypto futures execution' },
    { id: 'alpha', name: 'Alpha Sniper', risk: 'high', description: 'Premium entries and signals' },
  ];

  const riskLevels = [
    { value: 'low', label: 'Low Risk', color: 'green', description: 'Conservative trading, tight stop losses' },
    { value: 'medium', label: 'Medium Risk', color: 'yellow', description: 'Balanced approach' },
    { value: 'high', label: 'High Risk', color: 'red', description: 'Aggressive trading for higher returns' },
  ];

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  ];

  if (!isEnterpriseAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-gray-400">You need enterprise admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bot Controls</h1>
          <p className="text-gray-400">
            Configure advanced trading bot settings for your organization
          </p>
          {!hasEnhancedBotControls && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-yellow-400 text-xl">⚠️</span>
                <div>
                  <p className="text-yellow-300 font-medium">Enhanced Bot Controls Required</p>
                  <p className="text-yellow-300/70 text-sm">Upgrade to access advanced bot configuration features.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <nav className="flex gap-4">
            {[
              { id: 'general', label: 'General', icon: '⚙️' },
              { id: 'risk', label: 'Risk Management', icon: '🛡️' },
              { id: 'strategies', label: 'Strategies', icon: '📊' },
              { id: 'symbols', label: 'Symbols', icon: '💰' },
              { id: 'notifications', label: 'Notifications', icon: '📧' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Risk Level
                    </label>
                    <div className="flex gap-4">
                      {riskLevels.map(risk => (
                        <label key={risk.value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            value={risk.value}
                            checked={botControls.default_risk_level === risk.value}
                            onChange={(e) => handleChange('default_risk_level', e.target.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600"
                          />
                          <span className={`text-sm text-${risk.color}-400`}>{risk.label}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {riskLevels.find(r => r.value === botControls.default_risk_level)?.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Concurrent Positions
                    </label>
                    <select
                      value={botControls.max_concurrent_positions}
                      onChange={(e) => handleChange('max_concurrent_positions', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num} positions</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Position Size (USD)
                    </label>
                    <input
                      type="number"
                      value={botControls.max_position_size_usd}
                      onChange={(e) => handleChange('max_position_size_usd', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Daily Trades
                    </label>
                    <input
                      type="number"
                      value={botControls.max_daily_trades}
                      onChange={(e) => handleChange('max_daily_trades', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Trading Hours */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Trading Hours</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <span className="text-white font-medium">Restrict Trading Hours</span>
                      <p className="text-xs text-gray-400 mt-1">Limit trading to specific hours of the day</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={botControls.trading_hours.enabled}
                      onChange={(e) => handleNestedChange('trading_hours', 'enabled', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>

                  {botControls.trading_hours.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={botControls.trading_hours.start}
                          onChange={(e) => handleNestedChange('trading_hours', 'start', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                        <input
                          type="time"
                          value={botControls.trading_hours.end}
                          onChange={(e) => handleNestedChange('trading_hours', 'end', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Time Zone</label>
                        <select
                          value={botControls.trading_hours.timezone}
                          onChange={(e) => handleNestedChange('trading_hours', 'timezone', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {timezones.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-close Positions */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Auto-Close Positions</h3>
                <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-white font-medium">Auto-Close Positions</span>
                    <p className="text-xs text-gray-400 mt-1">Automatically close positions after a set time</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botControls.auto_close_positions.enabled}
                    onChange={(e) => handleNestedChange('auto_close_positions', 'enabled', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                  />
                </label>

                {botControls.auto_close_positions.enabled && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Close After (minutes)
                    </label>
                    <input
                      type="number"
                      value={botControls.auto_close_positions.minutes}
                      onChange={(e) => handleNestedChange('auto_close_positions', 'minutes', parseInt(e.target.value))}
                      className="w-full md:w-1/3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk Management Tab */}
          {activeTab === 'risk' && (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Stop Loss & Take Profit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Global Stop Loss (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={botControls.stop_loss_global_percent}
                      onChange={(e) => handleChange('stop_loss_global_percent', parseFloat(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default stop loss for all trades</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Global Take Profit (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={botControls.take_profit_global_percent}
                      onChange={(e) => handleChange('take_profit_global_percent', parseFloat(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default take profit for all trades</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Daily/Weekly Loss Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Loss Per Day (USD)
                    </label>
                    <input
                      type="number"
                      value={botControls.max_loss_per_day_usd}
                      onChange={(e) => handleChange('max_loss_per_day_usd', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Trading will stop if daily loss exceeds this amount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Loss Per Week (USD)
                    </label>
                    <input
                      type="number"
                      value={botControls.max_loss_per_week_usd}
                      onChange={(e) => handleChange('max_loss_per_week_usd', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Trading will stop if weekly loss exceeds this amount</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Approval Workflow</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <span className="text-white font-medium">Require Approval for Large Trades</span>
                      <p className="text-xs text-gray-400 mt-1">Admin approval required for trades above threshold</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={botControls.require_approval_for_trades}
                      onChange={(e) => handleChange('require_approval_for_trades', e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>

                  {botControls.require_approval_for_trades && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Approval Threshold (USD)
                      </label>
                      <input
                        type="number"
                        value={botControls.approval_threshold_usd}
                        onChange={(e) => handleChange('approval_threshold_usd', parseInt(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Trades above this amount require admin approval</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Strategies Tab */}
          {activeTab === 'strategies' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Available Strategies</h3>
              <p className="text-sm text-gray-400 mb-4">Select which strategies are available to your team members</p>
              <div className="space-y-3">
                {strategyOptions.map(strategy => (
                  <label key={strategy.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-2 py-1 rounded ${
                          strategy.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                          strategy.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {strategy.risk}
                        </span>
                        <span className="font-medium text-white">{strategy.name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-1">{strategy.description}</p>
                    </div>
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
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Symbols Tab */}
          {activeTab === 'symbols' && (
            <div className="space-y-6">
              {/* Blacklisted Symbols */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Blacklisted Symbols</h3>
                <p className="text-sm text-gray-400 mb-4">Prevent trading on these symbols</p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && addToBlacklist()}
                    placeholder="Enter symbol (e.g., BTC-USDT)"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addToBlacklist}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                  >
                    Add to Blacklist
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {botControls.blacklisted_symbols.map(symbol => (
                    <span key={symbol} className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                      {symbol}
                      <button
                        type="button"
                        onClick={() => removeFromBlacklist(symbol)}
                        className="hover:text-red-300"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {botControls.blacklisted_symbols.length === 0 && (
                    <p className="text-gray-500 text-sm">No blacklisted symbols</p>
                  )}
                </div>
              </div>

              {/* Whitelisted Symbols */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Whitelisted Symbols</h3>
                <p className="text-sm text-gray-400 mb-4">Only trade these symbols (empty = all allowed)</p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={whitelistInput}
                    onChange={(e) => setWhitelistInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && addToWhitelist()}
                    placeholder="Enter symbol (e.g., BTC-USDT)"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addToWhitelist}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
                  >
                    Add to Whitelist
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {botControls.whitelisted_symbols.map(symbol => (
                    <span key={symbol} className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      {symbol}
                      <button
                        type="button"
                        onClick={() => removeFromWhitelist(symbol)}
                        className="hover:text-green-300"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {botControls.whitelisted_symbols.length === 0 && (
                    <p className="text-gray-500 text-sm">No whitelisted symbols (all symbols allowed)</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Email Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-white font-medium">On Trade Execution</span>
                    <p className="text-xs text-gray-400 mt-1">Receive email when a trade is executed</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botControls.email_notifications.on_trade}
                    onChange={(e) => handleNestedChange('email_notifications', 'on_trade', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-white font-medium">On Error</span>
                    <p className="text-xs text-gray-400 mt-1">Receive email when a bot error occurs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botControls.email_notifications.on_error}
                    onChange={(e) => handleNestedChange('email_notifications', 'on_error', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-white font-medium">When Approval Needed</span>
                    <p className="text-xs text-gray-400 mt-1">Receive email when a trade requires approval</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={botControls.email_notifications.on_approval_needed}
                    onChange={(e) => handleNestedChange('email_notifications', 'on_approval_needed', e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={saving || !hasEnhancedBotControls}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BotsControlPage;
