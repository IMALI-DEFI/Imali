// src/components/enterprise/strategies/CreateStrategyModal.jsx
import React, { useState } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import { DEFAULT_STRATEGY_CONFIG, RISK_LEVELS, STRATEGY_TEMPLATES } from '../../../constants/strategyDefaults';

const CreateStrategyModal = ({ isOpen, onClose, onCreated }) => {
  const { createStrategy, loading } = useEnterprise();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategyConfig, setStrategyConfig] = useState(DEFAULT_STRATEGY_CONFIG);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    const template = STRATEGY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setStrategyConfig({ ...DEFAULT_STRATEGY_CONFIG, ...template.config });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Strategy name is required');
      return;
    }

    const result = await createStrategy(name, description, strategyConfig);
    if (result.success) {
      setName('');
      setDescription('');
      setStrategyConfig(DEFAULT_STRATEGY_CONFIG);
      setSelectedTemplate('');
      onCreated();
      onClose();
    } else {
      setError(result.error || 'Failed to create strategy');
    }
  };

  const updateConfig = (key, value) => {
    setStrategyConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create Custom Strategy
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Define a new trading strategy for your organization
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start from template (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Custom strategy</option>
                {STRATEGY_TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Strategy Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Conservative Momentum"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Describe the strategy's approach and goals"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Level
              </label>
              <div className="flex gap-4">
                {RISK_LEVELS.map(risk => (
                  <label key={risk.value} className="flex items-center">
                    <input
                      type="radio"
                      value={risk.value}
                      checked={strategyConfig.risk_level === risk.value}
                      onChange={(e) => updateConfig('risk_level', e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">{risk.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Position Size ($)
                </label>
                <input
                  type="number"
                  value={strategyConfig.max_position_size}
                  onChange={(e) => updateConfig('max_position_size', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Daily Trade Limit
                </label>
                <input
                  type="number"
                  value={strategyConfig.daily_trade_limit}
                  onChange={(e) => updateConfig('daily_trade_limit', parseInt(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={strategyConfig.stop_loss_percent}
                  onChange={(e) => updateConfig('stop_loss_percent', parseFloat(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={strategyConfig.take_profit_percent}
                  onChange={(e) => updateConfig('take_profit_percent', parseFloat(e.target.value))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Strategy'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStrategyModal;