// src/pages/admin/MarketingAutomation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

// Predefined job definitions (will be replaced by API data when available)
const DEFAULT_JOBS = [
  {
    id: 'daily_social_summary',
    name: 'Daily Performance Summary',
    description: 'Posts daily P&L, win rate, and trading stats to social channels',
    icon: '📊',
    defaultSchedule: '0 9 * * *',
    channels: ['twitter', 'telegram', 'discord'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { posts: 0, impressions: 0, clicks: 0 }
  },
  {
    id: 'waitlist_nurturing',
    name: 'Waitlist Email Sequence',
    description: 'Sends nurturing emails to waitlist subscribers',
    icon: '📧',
    defaultSchedule: '0 10 * * 1,3,5',
    channels: ['email'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { sent: 0, opens: 0, conversions: 0 }
  },
  {
    id: 'referral_rewards',
    name: 'Referral Reward Processing',
    description: 'Checks for new referrals and awards bonuses',
    icon: '🎁',
    defaultSchedule: '*/15 * * * *',
    channels: ['internal'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { processed: 0, rewarded: 0, value: 0 }
  },
  {
    id: 'promo_expiry',
    name: 'Promo Code Expiry',
    description: 'Automatically expires promo codes and updates status',
    icon: '⏰',
    defaultSchedule: '0 * * * *',
    channels: ['internal'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { expired: 0, active: 0 }
  },
  {
    id: 'announcement_publisher',
    name: 'Scheduled Announcements',
    description: 'Publishes scheduled announcements at set times',
    icon: '📢',
    defaultSchedule: '* * * * *',
    channels: ['in_app', 'email'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { published: 0, scheduled: 0 }
  },
  {
    id: 'new_user_onboarding',
    name: 'New User Onboarding Flow',
    description: 'Sends welcome emails and guides to new signups',
    icon: '👋',
    defaultSchedule: '*/5 * * * *',
    channels: ['email', 'telegram'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { welcomed: 0, activated: 0 }
  },
  {
    id: 'telegram_broadcast',
    name: 'Telegram Channel Updates',
    description: 'Broadcasts important updates to Telegram channel',
    icon: '📱',
    defaultSchedule: '0 12,18 * * *',
    channels: ['telegram'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { messages: 0, views: 0 }
  },
  {
    id: 'performance_alert',
    name: 'Performance Alert',
    description: 'Sends alerts when P&L exceeds thresholds',
    icon: '⚠️',
    defaultSchedule: '*/10 * * * *',
    channels: ['telegram', 'discord'],
    lastRun: null,
    nextRun: null,
    status: 'active',
    stats: { alerts: 0, thresholds: 3 }
  }
];

const JOB_SCHEDULES = [
  { value: '*/5 * * * *', label: 'Every 5 minutes' },
  { value: '*/15 * * * *', label: 'Every 15 minutes' },
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */3 * * *', label: 'Every 3 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 12 * * *', label: 'Daily at noon' },
  { value: '0 18 * * *', label: 'Daily at 6 PM' },
  { value: '0 0 * * 1', label: 'Weekly on Monday' },
  { value: '0 0 1 * *', label: 'Monthly on 1st' }
];

const SOCIAL_CHANNELS = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'bg-sky-600' },
  { id: 'telegram', name: 'Telegram', icon: '📱', color: 'bg-sky-500' },
  { id: 'discord', name: 'Discord', icon: '💬', color: 'bg-indigo-600' },
  { id: 'email', name: 'Email', icon: '📧', color: 'bg-emerald-600' },
  { id: 'in_app', name: 'In-App', icon: '🖥️', color: 'bg-purple-600' }
];

// Helper to format cron expressions for display
const formatCron = (cron) => {
  if (!cron) return '';
  const map = {
    '*/5 * * * *': 'Every 5 min',
    '*/15 * * * *': 'Every 15 min',
    '*/30 * * * *': 'Every 30 min',
    '0 * * * *': 'Every hour',
    '0 9 * * *': 'Daily 9 AM',
    '0 12,18 * * *': '12 PM, 6 PM',
    '0 12 * * *': 'Daily noon',
    '0 18 * * *': 'Daily 6 PM',
    '0 0 * * *': 'Daily midnight',
    '0 0 * * 1': 'Weekly Monday',
    '0 0 1 * *': 'Monthly 1st'
  };
  return map[cron] || cron;
};

function JobCard({ job, onToggle, onRunNow, onEdit, onViewLogs }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-400';
      case 'paused': return 'bg-amber-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-indigo-500/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{job.icon}</span>
          <div>
            <h3 className="font-semibold">{job.name}</h3>
            <p className="text-xs text-white/50">{job.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
          <span className="text-xs capitalize">{job.status}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {job.channels.map(ch => {
          const channel = SOCIAL_CHANNELS.find(c => c.id === ch);
          return channel ? (
            <span key={ch} className={`text-[10px] px-2 py-0.5 rounded-full ${channel.color}/20 text-${channel.color.split('-')[1]}-300 border border-${channel.color.split('-')[1]}-500/30`}>
              {channel.icon} {channel.name}
            </span>
          ) : null;
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-black/30 rounded p-2">
          <div className="text-white/40">Schedule</div>
          <div className="font-mono text-emerald-400">{formatCron(job.schedule || job.defaultSchedule)}</div>
        </div>
        <div className="bg-black/30 rounded p-2">
          <div className="text-white/40">Next Run</div>
          <div className="text-white">{job.nextRun || '—'}</div>
        </div>
        <div className="bg-black/30 rounded p-2">
          <div className="text-white/40">Last Run</div>
          <div className="text-white/60">{job.lastRun || 'Never'}</div>
        </div>
        <div className="bg-black/30 rounded p-2">
          <div className="text-white/40">Stats</div>
          <div className="text-purple-400">
            {job.id === 'daily_social_summary' && `${job.stats.posts} posts`}
            {job.id === 'waitlist_nurturing' && `${job.stats.sent} sent`}
            {job.id === 'referral_rewards' && `${job.stats.rewarded} rewarded`}
            {job.id === 'promo_expiry' && `${job.stats.active} active`}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(job.id)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            job.status === 'active'
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {job.status === 'active' ? '⏸️ Pause' : '▶️ Resume'}
        </button>
        <button
          onClick={() => onRunNow(job.id)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-all"
        >
          ⚡ Run Now
        </button>
        <button
          onClick={() => onEdit(job)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-all"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onViewLogs(job.id)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-all"
        >
          📋 Logs
        </button>
      </div>
    </div>
  );
}

function PostTemplateEditor({ job, onSave, onTest }) {
  const [templates, setTemplates] = useState({
    twitter: '📊 Daily Trading Summary\n\nP&L: {pnl}\nWin Rate: {winRate}%\nTrades: {trades}\n\nView live: {dashboardUrl} #trading #crypto',
    telegram: '📊 *Daily Trading Performance*\n\n💰 P&L: {pnl}\n📈 Win Rate: {winRate}%\n🔄 Total Trades: {trades}\n\n👉 [View Live Dashboard]({dashboardUrl})',
    discord: '📊 **Daily Trading Summary**\n\n• P&L: {pnl}\n• Win Rate: {winRate}%\n• Trades: {trades}\n\n<{dashboardUrl}>'
  });

  const [selectedChannel, setSelectedChannel] = useState('twitter');

  const variables = [
    '{pnl}', '{winRate}', '{trades}', '{wins}', '{losses}',
    '{dashboardUrl}', '{date}', '{botCount}', '{discoveries}'
  ];

  const handleInsertVariable = (variable) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = templates[selectedChannel].substring(0, start) + variable + templates[selectedChannel].substring(end);
    setTemplates({ ...templates, [selectedChannel]: newText });
    // Restore cursor after update (React will reset it, but we can focus later)
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['twitter', 'telegram', 'discord'].map(ch => (
          <button
            key={ch}
            onClick={() => setSelectedChannel(ch)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              selectedChannel === ch
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      <textarea
        key={selectedChannel} // force re-render when channel changes
        value={templates[selectedChannel]}
        onChange={(e) => setTemplates({ ...templates, [selectedChannel]: e.target.value })}
        rows={6}
        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-mono"
        placeholder="Post template..."
      />

      <div className="flex flex-wrap gap-2">
        {variables.map(v => (
          <button
            key={v}
            onClick={() => handleInsertVariable(v)}
            className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30"
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(job.id, templates)}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-all"
        >
          Save Templates
        </button>
        <button
          onClick={() => onTest(job.id, selectedChannel, templates[selectedChannel])}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-all"
        >
          Test Post
        </button>
      </div>
    </div>
  );
}

function JobLogs({ jobId, logs, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold">Job Logs: {jobId}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-white/40">No logs yet</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-3 text-xs font-mono">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/40">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      log.status === 'success' ? 'bg-green-500/20 text-green-300' :
                      log.status === 'error' ? 'bg-red-500/20 text-red-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-white/80">{log.message}</div>
                  {log.error && <div className="text-red-400 mt-1">{log.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketingAutomation() {
  const { adminFetch, showToast } = useAdmin();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingLogs, setViewingLogs] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalEmails: 0,
    conversionRate: 0,
    activeJobs: 0
  });

  const fetchJobs = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/automation/jobs');
      // Assume API returns { jobs: [], stats: {} }
      setJobs(data.jobs || []);
      setStats(data.stats || {
        totalPosts: 0,
        totalEmails: 0,
        conversionRate: 0,
        activeJobs: (data.jobs || []).filter(j => j.status === 'active').length
      });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      showToast('Using mock data (API unavailable)', 'warning');
      // Fallback to default jobs with some realistic mock data
      setJobs(DEFAULT_JOBS.map(j => ({
        ...j,
        status: j.id === 'daily_social_summary' ? 'active' : 'paused',
        lastRun: j.id === 'daily_social_summary' ? '2 hours ago' : null,
        nextRun: j.id === 'daily_social_summary' ? 'in 7 hours' : null,
        schedule: j.defaultSchedule
      })));
    } finally {
      setLoading(false);
    }
  }, [adminFetch, showToast]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleToggle = async (jobId) => {
    try {
      await adminFetch('/api/admin/automation/jobs/toggle', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });
      // Optimistic update
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: job.status === 'active' ? 'paused' : 'active' }
          : job
      ));
      const job = jobs.find(j => j.id === jobId);
      showToast(`Job ${job?.name} ${job?.status === 'active' ? 'paused' : 'resumed'}`, 'success');
    } catch (error) {
      showToast('Failed to toggle job', 'error');
    }
  };

  const handleRunNow = async (jobId) => {
    try {
      await adminFetch('/api/admin/automation/jobs/run', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });
      showToast(`Job triggered successfully`, 'success');
      fetchJobs(); // refresh to update lastRun
    } catch (error) {
      showToast('Failed to run job', 'error');
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
  };

  const handleSaveSchedule = async (jobId, schedule) => {
    try {
      await adminFetch('/api/admin/automation/schedule', {
        method: 'POST',
        body: JSON.stringify({ jobId, schedule })
      });
      setJobs(prev => prev.map(job => job.id === jobId ? { ...job, schedule } : job));
      setEditingJob(null);
      showToast('Schedule updated', 'success');
    } catch (error) {
      showToast('Failed to update schedule', 'error');
    }
  };

  const handleViewLogs = async (jobId) => {
    try {
      const data = await adminFetch(`/api/admin/automation/logs/${jobId}`);
      setLogs(data.logs || []);
      setViewingLogs(jobId);
    } catch (error) {
      showToast('Failed to fetch logs', 'error');
    }
  };

  const handleTestPost = async (jobId, channel, template) => {
    try {
      await adminFetch('/api/admin/automation/test', {
        method: 'POST',
        body: JSON.stringify({ jobId, channel, template })
      });
      showToast(`Test post sent to ${channel}`, 'success');
    } catch (error) {
      showToast('Failed to send test post', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-emerald-400 text-2xl mb-1">📊</div>
          <div className="text-2xl font-bold text-white">{stats.totalPosts}</div>
          <div className="text-sm text-white/50">Total Posts</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-400 text-2xl mb-1">📧</div>
          <div className="text-2xl font-bold text-white">{stats.totalEmails}</div>
          <div className="text-sm text-white/50">Emails Sent</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="text-purple-400 text-2xl mb-1">📈</div>
          <div className="text-2xl font-bold text-white">{stats.conversionRate}%</div>
          <div className="text-sm text-white/50">Conversion Rate</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-2xl mb-1">🤖</div>
          <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
          <div className="text-sm text-white/50">Active Jobs</div>
        </div>
      </div>

      {/* Job Cards */}
      {jobs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/50">No automation jobs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onToggle={handleToggle}
              onRunNow={handleRunNow}
              onEdit={handleEdit}
              onViewLogs={handleViewLogs}
            />
          ))}
        </div>
      )}

      {/* Edit Schedule Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-white/10 p-6">
            <h3 className="font-bold text-xl mb-4">Edit Schedule: {editingJob.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-2">Schedule (cron expression)</label>
                <select
                  value={editingJob.schedule || editingJob.defaultSchedule}
                  onChange={(e) => setEditingJob({ ...editingJob, schedule: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2"
                >
                  {JOB_SCHEDULES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {editingJob.id === 'daily_social_summary' && (
                <div>
                  <label className="block text-sm text-white/50 mb-2">Post Templates</label>
                  <PostTemplateEditor
                    job={editingJob}
                    onSave={async (jobId, templates) => {
                      try {
                        await adminFetch('/api/admin/automation/templates', {
                          method: 'POST',
                          body: JSON.stringify({ jobId, templates })
                        });
                        showToast('Templates saved', 'success');
                      } catch (error) {
                        showToast('Failed to save templates', 'error');
                      }
                    }}
                    onTest={handleTestPost}
                  />
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleSaveSchedule(editingJob.id, editingJob.schedule)}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {viewingLogs && (
        <JobLogs
          jobId={viewingLogs}
          logs={logs}
          onClose={() => setViewingLogs(null)}
        />
      )}
    </div>
  );
}