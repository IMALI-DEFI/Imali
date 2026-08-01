// src/components/enterprise/analytics/EnterpriseAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import SummaryCards from './SummaryCards';
import MemberLeaderboard from './MemberLeaderboard';
import TeamPerformanceTable from './TeamPerformanceTable';
import DateRangeFilter from './DateRangeFilter';
import ExportReports from './ExportReports';

const EnterpriseAnalytics = () => {
  const { getAnalytics, loading } = useEnterprise();
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    const result = await getAnalytics(days);
    if (result.success) {
      setAnalytics(result.data);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track your team's trading performance and metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-4">
          <DateRangeFilter days={days} onDaysChange={setDays} />
          <ExportReports analytics={analytics} />
        </div>
      </div>

      <div className="mt-8">
        <SummaryCards summary={analytics?.data?.summary} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TeamPerformanceTable members={analytics?.data?.members} />
        </div>
        <div>
          <MemberLeaderboard members={analytics?.data?.members} />
        </div>
      </div>
    </div>
  );
};

export default EnterpriseAnalytics;