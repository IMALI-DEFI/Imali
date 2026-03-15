// src/pages/admin/MarketingAutomation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

// Platform configuration with fallback
const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: '📱', color: 'bg-sky-500', maxLength: 4096 },
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'bg-sky-600', maxLength: 280 },
  { id: 'discord', name: 'Discord', icon: '💬', color: 'bg-indigo-600', maxLength: 2000 },
  { id: 'email', name: 'Email', icon: '📧', color: 'bg-emerald-600', maxLength: 10000 },
  { id: 'in_app', name: 'In-App', icon: '🖥️', color: 'bg-purple-600', maxLength: 500 },
  { id: 'internal', name: 'Internal', icon: '⚙️', color: 'bg-gray-600', maxLength: 5000 }
];

// Available template variables with descriptions
const TEMPLATE_VARS = [
  { name: '{pnl}', description: 'Today\'s P&L' },
  { name: '{winRate}', description: 'Win rate percentage' },
  { name: '{trades}', description: 'Total trades today' },
  { name: '{wins}', description: 'Number of winning trades' },
  { name: '{losses}', description: 'Number of losing trades' },
  { name: '{dashboardUrl}', description: 'Dashboard link' },
  { name: '{date}', description: 'Current date' },
  { name: '{botCount}', description: 'Active bots count' },
  { name: '{discoveries}', description: 'New discoveries' },
  { name: '{user}', description: 'Username' },
  { name: '{balance}', description: 'User balance' }
];

// Preset schedules with descriptions
const SCHEDULE_PRESETS = [
  { value: '*/5 * * * *', label: 'Every 5 minutes', desc: 'For frequent updates' },
  { value: '*/15 * * * *', label: 'Every 15 minutes', desc: 'Regular interval' },
  { value: '*/30 * * * *', label: 'Every 30 minutes', desc: 'Half-hourly' },
  { value: '0 * * * *', label: 'Every hour', desc: 'Hourly summary' },
  { value: '0 9 * * *', label: 'Daily 9 AM', desc: 'Morning report' },
  { value: '0 12 * * *', label: 'Daily noon', desc: 'Midday update' },
  { value: '0 18 * * *', label: 'Daily 6 PM', desc: 'Evening recap' },
  { value: '0 0 * * *', label: 'Daily midnight', desc: 'End of day' },
  { value: '0 0 * * 1', label: 'Weekly Monday', desc: 'Weekly kickoff' },
  { value: '0 0 1 * *', label: 'Monthly 1st', desc: 'Monthly summary' }
];

// Message editor component with preview
function MessageEditor({ platform, value = '', onChange, variables = [] }) {
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(value?.length || 0);
  }, [value]);

  if (!platform) return null;

  const platformInfo = PLATFORMS.find(p => p?.id === platform) || PLATFORMS[0];

  const insertVariable = (varName) => {
    if (!varName) return;
    const textarea = document.getElementById(`message-${platform}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = (value || '').substring(0, start) + varName + (value || '').substring(end);
    onChange(newValue);
  };

  const generatePreview = () => {
    let previewText = value || '';
    const sampleValues = {
      '{pnl}': '+$1,234',
      '{winRate}': '68%',
      '{trades}': '42',
      '{wins}': '28',
      '{losses}': '14',
      '{dashboardUrl}': 'https://app.imali-defi.com/dashboard',
      '{date}': new Date().toLocaleDateString(),
      '{botCount}': '5',
      '{discoveries}': '3',
      '{user}': 'trader123',
      '{balance}': '$5,678'
    };
    
    Object.entries(sampleValues).forEach(([key, val]) => {
      previewText = previewText.replace(new RegExp(key.replace(/{/g, '\\{').replace(/}/g, '\\}'), 'g'), val);
    });
    
    setPreview(previewText);
    setShowPreview(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{platformInfo?.icon || '📱'}</span>
          <h4 className="font-medium capitalize">{platformInfo?.name || platform}</h4>
        </div>
        <span className={`text-xs ${charCount > (platformInfo?.maxLength || 4096) ? 'text-red-400' : 'text-white/40'}`}>
          {charCount}/{platformInfo?.maxLength || 4096}
        </span>
      </div>

      <textarea
        id={`message-${platform}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-mono"
        placeholder={`Enter ${platformInfo?.name || platform} message...`}
        maxLength={platformInfo?.maxLength || 4096}
      />

      <div className="flex flex-wrap gap-2">
        {(variables || []).map(v => v?.name ? (
          <button
            key={v.name}
            onClick={() => insertVariable(v.name)}
            className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 transition"
            title={v.description || ''}
          >
            {v.name}
          </button>
        ) : null)}
      </div>

      <div className="flex gap-2">
        <button
          onClick={generatePreview}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition"
        >
          👁️ Preview
        </button>
        <button
          onClick={() => setShowPreview(false)}
          className={`px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition ${!showPreview ? 'opacity-50' : ''}`}
        >
          Hide Preview
        </button>
      </div>

      {showPreview && (
        <div className="bg-black/30 border border-white/10 rounded-lg p-3 text-sm whitespace-pre-wrap">
          <div className="text-xs text-white/40 mb-1">Preview:</div>
          {preview || value || ''}
        </div>
      )}
    </div>
  );
}

// Job card component
function JobCard({ job, onEdit, onToggle, onRunNow, onDelete, onViewLogs }) {
  if (!job?.id) return null;

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'bg-green-400';
      case 'paused': return 'bg-amber-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const formatSchedule = (schedule) => {
    if (!schedule) return 'Not set';
    const preset = SCHEDULE_PRESETS.find(p => p.value === schedule);
    return preset ? preset.label : schedule;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-indigo-500/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{job.name || 'Unnamed Job'}</h3>
          <p className="text-xs text-white/50">{job.description || 'No description'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
          <span className="text-xs capitalize">{job.status || 'unknown'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-black/30 rounded p-2">
          <div className="text-white/40">Schedule</div>
          <div className="font-mono text-emerald-400">{formatSchedule(job.schedule)}</div>
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
          <div className="text-white/40">Platforms</div>
          <div className="flex gap-1 flex-wrap">
            {(job.channels || []).map(ch => {
              if (!ch) return null;
              const p = PLATFORMS.find(p => p?.id === ch);
              return p ? (
                <span key={ch} title={p.name} className={`${p.color}/20 text-${p.color.split('-')[1]}-300 px-1.5 py-0.5 rounded text-xs`}>
                  {p.icon}
                </span>
              ) : (
                <span key={ch} title={ch} className="bg-gray-600/20 text-gray-300 px-1.5 py-0.5 rounded text-xs">
                  🔧
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(job.id)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            job.status === 'active'
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {job.status === 'active' ? '⏸️ Pause' : '▶️ Resume'}
        </button>
        <button
          onClick={() => onRunNow(job.id)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium transition"
        >
          ⚡ Run Now
        </button>
        <button
          onClick={() => onEdit(job)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onViewLogs(job.id)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
        >
          📋 Logs
        </button>
        <button
          onClick={() => onDelete(job.id)}
          className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-xs font-medium transition text-red-300"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// Job modal component
function JobModal({ job, onClose, onSave }) {
  const [formData, setFormData] = useState(() => job || {
    name: '',
    description: '',
    schedule: '0 9 * * *',
    channels: ['telegram'],
    messages: {},
    status: 'active',
    icon: '📢'
  });
  const [saving, setSaving] = useState(false);

  if (!onClose || !onSave) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMessageChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      messages: { ...(prev.messages || {}), [platform]: value }
    }));
  };

  const toggleChannel = (channelId) => {
    setFormData(prev => {
      const channels = prev.channels || [];
      const newChannels = channels.includes(channelId)
        ? channels.filter(c => c !== channelId)
        : [...channels, channelId];
      return { ...prev, channels: newChannels };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      alert('Please enter a job name');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{job ? 'Edit Job' : 'Create New Job'}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/50 mb-1">Job Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2"
                placeholder="e.g., Daily Performance Summary"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={formData.icon || ''}
                onChange={(e) => handleChange('icon', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2"
                placeholder="📊"
                maxLength="2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2"
              placeholder="What does this job do?"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-1">Schedule</label>
            <select
              value={formData.schedule || '0 9 * * *'}
              onChange={(e) => handleChange('schedule', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2"
            >
              {SCHEDULE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
              ))}
            </select>
            <input
              type="text"
              value={formData.schedule || ''}
              onChange={(e) => handleChange('schedule', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 mt-2"
              placeholder="Custom cron expression"
            />
          </div>

          <div>
            <label className="block text-sm text-white/50 mb-2">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => toggleChannel(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    (formData.channels || []).includes(p.id)
                      ? `${p.color} text-white`
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span>{p.icon}</span> {p.name}
                </button>
              ))}
            </div>
          </div>

          {(formData.channels || []).length > 0 && (
            <div>
              <label className="block text-sm text-white/50 mb-2">Message Templates</label>
              <p className="text-xs text-white/40 mb-3">
                Use variables like {'{pnl}'} to insert dynamic data.
              </p>
              <div className="space-y-6">
                {(formData.channels || []).map(channel => (
                  <MessageEditor
                    key={channel}
                    platform={channel}
                    value={formData.messages?.[channel] || ''}
                    onChange={(val) => handleMessageChange(channel, val)}
                    variables={TEMPLATE_VARS}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : (job ? 'Save Changes' : 'Create Job')}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Logs viewer component
function JobLogs({ jobId, logs = [], onClose }) {
  if (!jobId || !onClose) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold">Logs for Job {jobId}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-white/40">No logs yet</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-3 text-xs font-mono">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white/40">{log?.timestamp || 'Unknown time'}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      log?.level === 'success' ? 'bg-green-500/20 text-green-300' :
                      log?.level === 'error' ? 'bg-red-500/20 text-red-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {log?.level || 'info'}
                    </span>
                  </div>
                  <div className="text-white/80">{log?.message || 'No message'}</div>
                  {log?.details && <pre className="text-red-400 mt-1 text-xs overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component - with hooks properly ordered
export default function MarketingAutomation() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const { adminFetch, showToast, user, isLoading: userLoading, error: userError, hasToken } = useAdmin();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingLogs, setViewingLogs] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    activeJobs: 0,
    pendingPosts: 0
  });

  // Define fetchJobs
  const fetchJobs = useCallback(async () => {
    try {
      setFetchError(null);
      const data = await adminFetch('/api/admin/automation/jobs', { method: 'GET' });
      setJobs(data?.jobs || []);
      setStats({
        totalPosts: data?.stats?.total_posts || 0,
        activeJobs: data?.jobs?.filter(j => j?.status === 'active').length || 0,
        pendingPosts: data?.stats?.pending || 0
      });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setFetchError(error.message || 'Failed to load jobs');
      
      if (error.message?.includes('401')) {
        showToast('Session expired. Please log in again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [adminFetch, showToast]);

  // useEffect for initial fetch and polling
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 300000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Event handlers
  const handleToggle = async (jobId) => {
    if (!jobId) return;
    try {
      await adminFetch('/api/admin/automation/jobs/toggle', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });
      await fetchJobs();
      showToast('Job toggled successfully', 'success');
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast('Failed to toggle job', 'error');
      }
    }
  };

  const handleRunNow = async (jobId) => {
    if (!jobId) return;
    try {
      await adminFetch('/api/admin/automation/jobs/run', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });
      showToast('Job triggered successfully', 'success');
      await fetchJobs();
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast('Failed to run job', 'error');
      }
    }
  };

  const handleSaveJob = async (jobData) => {
    if (!jobData) return;
    try {
      const method = jobData.id ? 'PUT' : 'POST';
      const endpoint = jobData.id 
        ? `/api/admin/automation/jobs/${jobData.id}` 
        : '/api/admin/automation/jobs';
      
      await adminFetch(endpoint, {
        method,
        body: JSON.stringify(jobData)
      });
      
      showToast(jobData.id ? 'Job updated' : 'Job created', 'success');
      setEditingJob(null);
      await fetchJobs();
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast('Failed to save job', 'error');
      }
    }
  };

  const handleDelete = async (jobId) => {
    if (!jobId) return;
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await adminFetch(`/api/admin/automation/jobs/${jobId}`, { method: 'DELETE' });
      showToast('Job deleted', 'success');
      await fetchJobs();
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast('Failed to delete job', 'error');
      }
    }
  };

  const handleViewLogs = async (jobId) => {
    if (!jobId) return;
    try {
      const data = await adminFetch(`/api/admin/automation/logs/${jobId}`, { method: 'GET' });
      setLogs(data?.logs || []);
      setViewingLogs(jobId);
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast('Failed to fetch logs', 'error');
      }
    }
  };

  const handleTestIntegration = async (platform) => {
    if (!platform) return;
    try {
      await adminFetch('/api/admin/social/test', {
        method: 'POST',
        body: JSON.stringify({ 
          platform, 
          message: `Test from IMALI Admin at ${new Date().toLocaleString()}` 
        })
      });
      showToast(`Test sent to ${platform}`, 'success');
    } catch (error) {
      if (!error.message?.includes('429')) {
        showToast(`Failed to send to ${platform}`, 'error');
      }
    }
  };

  // Conditional returns - NOW SAFE after all hooks
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/60">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-red-300 mb-2">Authentication Error</h3>
        <p className="text-white/70 mb-4">{userError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-amber-300 mb-2">Not Logged In</h3>
        <p className="text-white/70 mb-4">Please log in to access the automation panel.</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-red-300 mb-2">Failed to Load Jobs</h3>
        <p className="text-white/70 mb-4">{fetchError}</p>
        <button
          onClick={fetchJobs}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Marketing Automation</h2>
          <p className="text-white/60">Schedule and manage automated posts to social channels and emails.</p>
        </div>
        <button
          onClick={() => setEditingJob({})}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition flex items-center gap-2"
        >
          <span>➕</span> New Job
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-emerald-400 text-2xl mb-1">📊</div>
          <div className="text-2xl font-bold text-white">{stats.totalPosts}</div>
          <div className="text-sm text-white/50">Total Posts</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-400 text-2xl mb-1">🤖</div>
          <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
          <div className="text-sm text-white/50">Active Jobs</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="text-amber-400 text-2xl mb-1">⏳</div>
          <div className="text-2xl font-bold text-white">{stats.pendingPosts}</div>
          <div className="text-sm text-white/50">Pending Posts</div>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/50 mb-4">No automation jobs yet.</p>
          <button
            onClick={() => setEditingJob({})}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
          >
            Create your first job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={setEditingJob}
              onToggle={handleToggle}
              onRunNow={handleRunNow}
              onDelete={handleDelete}
              onViewLogs={handleViewLogs}
            />
          ))}
        </div>
      )}

      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-cyan-300 mb-2">🧪 Test Your Integrations</h3>
        <p className="text-sm text-white/70 mb-4">
          Send a test message to verify your social channels are working correctly.
        </p>
        <div className="flex flex-wrap gap-3">
          {['telegram', 'twitter', 'discord'].map(platform => {
            const p = PLATFORMS.find(p => p?.id === platform);
            return p ? (
              <button
                key={p.id}
                onClick={() => handleTestIntegration(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${p.color} hover:opacity-80`}
              >
                <span>{p.icon}</span> Test {p.name}
              </button>
            ) : null;
          })}
        </div>
      </div>

      {editingJob !== null && (
        <JobModal
          job={editingJob?.id ? editingJob : null}
          onClose={() => setEditingJob(null)}
          onSave={handleSaveJob}
        />
      )}

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
