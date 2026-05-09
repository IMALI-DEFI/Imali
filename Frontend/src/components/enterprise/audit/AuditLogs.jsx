// src/components/enterprise/audit/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { useEnterprise } from '../../../hooks/useEnterprise';
import AuditLogTable from './AuditLogTable';
import AuditLogFilters from './AuditLogFilters';
import AuditLogExport from './AuditLogExport';

const AuditLogs = () => {
  const { getAuditLogs, loading } = useEnterprise();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    const result = await getAuditLogs(filters.limit, filters.offset);
    if (result.success) {
      setLogs(result.data.logs || []);
      setTotal(result.data.total || 0);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters, offset: 0 });
  };

  const handlePageChange = (newOffset) => {
    setFilters({ ...filters, offset: newOffset });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Track all organization activities and changes
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <AuditLogExport logs={logs} />
        </div>
      </div>

      <div className="mt-6">
        <AuditLogFilters onFilterChange={handleFilterChange} />
      </div>

      <div className="mt-6">
        <AuditLogTable
          logs={logs}
          loading={loading}
          total={total}
          limit={filters.limit}
          offset={filters.offset}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default AuditLogs;