// src/components/enterprise/strategies/StrategiesLibrary.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import StrategyCard from './StrategyCard';
import CreateStrategyModal from './CreateStrategyModal';

const StrategiesLibrary = () => {
  const { getStrategies, deleteStrategy, loading } = useEnterprise();
  const [strategies, setStrategies] = useState([]);
  const [customConfig, setCustomConfig] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    const result = await getStrategies();
    if (result.success) {
      setStrategies(result.data.strategies);
      setCustomConfig(result.data.custom_config);
    }
  };

  const handleDelete = async (strategyId) => {
    if (window.confirm('Are you sure you want to delete this strategy?')) {
      const result = await deleteStrategy(strategyId);
      if (result.success) {
        await loadStrategies();
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Strategies</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage custom trading strategies for your organization
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Strategy
          </button>
        </div>
      </div>

      {customConfig && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800">Bot Controls Configuration</h3>
          <pre className="mt-2 text-xs text-blue-600 overflow-auto">
            {JSON.stringify(customConfig, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            onDelete={handleDelete}
            onUpdate={loadStrategies}
          />
        ))}
      </div>

      {strategies.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No custom strategies yet. Create your first strategy!</p>
        </div>
      )}

      <CreateStrategyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={loadStrategies}
      />
    </div>
  );
};

export default StrategiesLibrary;