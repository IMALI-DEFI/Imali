// src/components/enterprise/audit/AuditLogFilters.jsx
import React, { useState } from 'react';
import { AUDIT_ACTION_LABELS } from '../../../constants/auditActions';

const AuditLogFilters = ({ onFilterChange }) => {
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApplyFilters = () => {
    onFilterChange({ action, startDate, endDate, offset: 0 });
  };

  const handleResetFilters = () => {
    setAction('');
    setStartDate('');
    setEndDate('');
    onFilterChange({ action: '', startDate: '', endDate: '', offset: 0 });
  };

  const actionOptions = [
    { value: '', label: 'All Actions' },
    ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Filters</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action Type
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {actionOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end space-x-3">
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default AuditLogFilters;