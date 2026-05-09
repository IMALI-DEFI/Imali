// src/components/enterprise/analytics/TeamPerformanceTable.jsx
import React from 'react';

const TeamPerformanceTable = ({ members }) => {
  if (!members || members.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Performance</h3>
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Team Performance</h3>
        <p className="text-sm text-gray-500">Detailed performance metrics by member</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trades
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Win Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wins/Losses
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.user_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{member.email}</div>
                  <div className="text-sm text-gray-500">{member.tier}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.total_trades}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-semibold ${member.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${member.total_pnl?.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">{member.win_rate}%</span>
                    <div className="ml-2 flex-1">
                      <div className="bg-gray-200 rounded-full h-2 w-24">
                        <div
                          className="bg-green-500 rounded-full h-2"
                          style={{ width: `${member.win_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.winning_trades} / {member.losing_trades}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPerformanceTable;