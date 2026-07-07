// Frontend/src/pages/admin/AdminReports.jsx
import React, { useState, useEffect } from 'react';
import { 
  FaDownload, FaFilePdf, FaFileExcel, FaFileCsv,
  FaCalendar, FaChartBar, FaUsers, FaDollarSign,
  FaSearch, FaSpinner, FaEye, FaPrint, FaShare
} from 'react-icons/fa';
import BotAPI from '../../utils/BotAPI';

const AdminReports = () => {
  const [dateRange, setDateRange] = useState({ 
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('users');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await BotAPI.getReports();
        setReports(data || [
          { id: '1', name: 'User Report - January 2026', type: 'users', date: '2026-01-31', size: '245 KB', status: 'ready' },
          { id: '2', name: 'Trade Report - Q1 2026', type: 'trades', date: '2026-03-31', size: '1.2 MB', status: 'ready' },
          { id: '3', name: 'Billing Report - December 2025', type: 'billing', date: '2025-12-31', size: '890 KB', status: 'ready' },
          { id: '4', name: 'User Activity Report', type: 'users', date: '2026-01-14', size: '456 KB', status: 'processing' },
        ]);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const data = await BotAPI.getReports({ 
        type: reportType,
        start: dateRange.start,
        end: dateRange.end
      });
      // Add to reports list
      setReports(prev => [{
        id: Date.now().toString(),
        name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`,
        type: reportType,
        date: new Date().toISOString().split('T')[0],
        size: '245 KB',
        status: 'ready'
      }, ...prev]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getReportIcon = (type) => {
    const map = {
      users: <FaUsers className="text-blue-400" />,
      trades: <FaChartBar className="text-emerald-400" />,
      billing: <FaDollarSign className="text-amber-400" />,
    };
    return map[type] || <FaFilePdf className="text-red-400" />;
  };

  const getStatusBadge = (status) => {
    const map = {
      ready: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Ready' },
      processing: { color: 'bg-amber-500/20 text-amber-400', label: 'Processing' },
      failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
    };
    const s = map[status] || map.ready;
    return <span className={`px-2 py-0.5 rounded-full text-xs ${s.color}`}>{s.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reports</h2>

      {/* Generate Report */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FaCalendar /> Generate New Report
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-white/40 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="users">User Report</option>
              <option value="trades">Trade Report</option>
              <option value="billing">Billing Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/40 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/40 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? <FaSpinner className="animate-spin" /> : <FaDownload />}
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-blue-500/30 transition cursor-pointer">
          <FaUsers className="text-3xl text-blue-400 mx-auto mb-2" />
          <p className="font-semibold">User Reports</p>
          <p className="text-sm text-white/40">User activity, growth, and retention</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-emerald-500/30 transition cursor-pointer">
          <FaChartBar className="text-3xl text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold">Trade Reports</p>
          <p className="text-sm text-white/40">Trade volume, PNL, and performance</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:border-amber-500/30 transition cursor-pointer">
          <FaDollarSign className="text-3xl text-amber-400 mx-auto mb-2" />
          <p className="font-semibold">Billing Reports</p>
          <p className="text-sm text-white/40">Revenue, subscriptions, and invoices</p>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold">Recent Reports</h3>
          <span className="text-sm text-white/40">{reports.length} reports</span>
        </div>
        <div className="divide-y divide-white/5">
          {reports.map((report) => (
            <div key={report.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition">
              <div className="flex items-center gap-3">
                {getReportIcon(report.type)}
                <div>
                  <p className="font-medium">{report.name}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{report.date}</span>
                    <span>•</span>
                    <span>{report.size}</span>
                    <span>•</span>
                    {getStatusBadge(report.status)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.status === 'ready' && (
                  <>
                    <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="View">
                      <FaEye />
                    </button>
                    <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Download PDF">
                      <FaFilePdf />
                    </button>
                    <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Download Excel">
                      <FaFileExcel />
                    </button>
                    <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition" title="Share">
                      <FaShare />
                    </button>
                  </>
                )}
                {report.status === 'processing' && (
                  <FaSpinner className="animate-spin text-amber-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
