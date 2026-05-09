// src/components/enterprise/analytics/DateRangeFilter.jsx
import React from 'react';

const DateRangeFilter = ({ days, onDaysChange }) => {
  const options = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
    { value: 365, label: 'Last year' },
  ];

  return (
    <div className="relative">
      <select
        value={days}
        onChange={(e) => onDaysChange(parseInt(e.target.value))}
        className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateRangeFilter;