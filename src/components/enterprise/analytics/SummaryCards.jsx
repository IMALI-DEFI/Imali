// src/components/enterprise/analytics/SummaryCards.jsx
import React from 'react';

const SummaryCards = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    {
      title: 'Total Trades',
      value: summary.total_trades || 0,
      icon: '📊',
      color: 'bg-blue-500',
    },
    {
      title: 'Total P&L',
      value: `$${summary.total_pnl?.toLocaleString() || 0}`,
      icon: '💰',
      color: summary.total_pnl >= 0 ? 'bg-green-500' : 'bg-red-500',
    },
    {
      title: 'Win Rate',
      value: `${summary.win_rate || 0}%`,
      icon: '🏆',
      color: 'bg-purple-500',
    },
    {
      title: 'Active Traders',
      value: summary.active_traders || 0,
      icon: '👥',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{card.value}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className={`${card.color} h-1`}></div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;