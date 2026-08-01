// src/components/enterprise/strategies/StrategyCard.jsx
import React, { useState } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import EditStrategyModal from './EditStrategyModal';

const StrategyCard = ({ strategy, onDelete, onUpdate }) => {
  const { updateStrategy } = useEnterprise();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isActive, setIsActive] = useState(strategy.is_active);

  const handleToggleActive = async () => {
    const result = await updateStrategy(strategy.id, { is_active: !isActive });
    if (result.success) {
      setIsActive(!isActive);
      onUpdate();
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{strategy.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{strategy.description}</p>
            </div>
            <div className="ml-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isActive}
                  onChange={handleToggleActive}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                Risk: {strategy.strategy_config?.risk_level || 'medium'}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 text-xs">
                Created {new Date(strategy.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              onClick={() => setEditModalOpen(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(strategy.id)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <EditStrategyModal
        isOpen={editModalOpen}
        strategy={strategy}
        onClose={() => setEditModalOpen(false)}
        onUpdated={onUpdate}
      />
    </>
  );
};

export default StrategyCard;