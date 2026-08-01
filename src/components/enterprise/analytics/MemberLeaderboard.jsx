// src/components/enterprise/analytics/MemberLeaderboard.jsx
import React from 'react';

const MemberLeaderboard = ({ members }) => {
  if (!members || members.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
        <p className="text-gray-500 text-center">No data available</p>
      </div>
    );
  }

  const sortedMembers = [...members].sort((a, b) => b.total_pnl - a.total_pnl).slice(0, 5);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Top Performers</h3>
        <p className="text-sm text-gray-500">Best performing team members</p>
      </div>
      <div className="divide-y divide-gray-200">
        {sortedMembers.map((member, idx) => (
          <div key={member.user_id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {idx + 1}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{member.email}</p>
                  <p className="text-xs text-gray-500">{member.total_trades} trades</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${member.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${member.total_pnl?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{member.win_rate}% win rate</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberLeaderboard;