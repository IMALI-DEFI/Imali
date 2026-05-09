// src/components/enterprise/analytics/ExportReports.jsx
import React from 'react';

const ExportReports = ({ analytics }) => {
  const handleExportCSV = () => {
    if (!analytics?.data?.members) return;

    const headers = ['Email', 'Tier', 'Total Trades', 'Total P&L', 'Win Rate', 'Winning Trades', 'Losing Trades'];
    const rows = analytics.data.members.map(member => [
      member.email,
      member.tier,
      member.total_trades,
      member.total_pnl,
      member.win_rate,
      member.winning_trades,
      member.losing_trades,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enterprise-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExportCSV}
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export CSV
    </button>
  );
};

export default ExportReports;