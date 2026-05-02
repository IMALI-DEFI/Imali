// src/admin/MarketingAutomation.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  FaTelegram, 
  FaTwitter, 
  FaDiscord, 
  FaEnvelope, 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaPlay, 
  FaPause,
  FaSpinner,
  FaClock,
  FaRobot,
  FaChartLine,
  FaHashtag,
  FaUsers,
  FaBell,
  FaCalendarAlt,
  FaSave,
  FaTimes,
  FaCopy,
  FaCheckCircle
} from "react-icons/fa";

export default function MarketingAutomation({ apiBase, showToast }) {
  const [activeTab, setActiveTab] = useState("jobs");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState({
    name: "",
    platform: "telegram",
    channel: "",
    message_template: "",
    schedule: "daily",
    schedule_time: "09:00",
    active: true,
    variables: []
  });
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_sent: 0,
    success_rate: 0
  });

  const platforms = [
    { id: "telegram", name: "Telegram", icon: FaTelegram, color: "bg-blue-500" },
    { id: "twitter", name: "Twitter/X", icon: FaTwitter, color: "bg-sky-500" },
    { id: "discord", name: "Discord", icon: FaDiscord, color: "bg-indigo-500" },
    { id: "email", name: "Email", icon: FaEnvelope, color: "bg-gray-500" }
  ];

  const scheduleOptions = [
    { value: "hourly", label: "Every Hour" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" }
  ];

  const variableOptions = [
    { key: "{pnl}", description: "Today's PnL" },
    { key: "{total_pnl}", description: "Total Platform PnL" },
    { key: "{total_trades}", description: "Total Trades" },
    { key: "{win_rate}", description: "Win Rate" },
    { key: "{active_users}", description: "Active Users" },
    { key: "{top_bot}", description: "Best Performing Bot" },
    { key: "{date}", description: "Current Date" }
  ];

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setJobs(data.data?.jobs || []);
        setStats({
          total_jobs: data.data?.total || 0,
          active_jobs: (data.data?.jobs || []).filter(j => j.active).length,
          total_sent: data.data?.total_sent || 0,
          success_rate: data.data?.success_rate || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      showToast?.("Failed to load automation jobs", "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const createJob = async () => {
    if (!jobForm.name || !jobForm.message_template) {
      showToast?.("Please fill in all required fields", "error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify(jobForm)
      });
      const data = await response.json();
      if (data.success) {
        showToast?.("Job created successfully", "success");
        setShowCreateModal(false);
        resetForm();
        fetchJobs();
      } else {
        showToast?.(data.error || "Failed to create job", "error");
      }
    } catch (error) {
      console.error("Create job error:", error);
      showToast?.("Failed to create job", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateJob = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify(jobForm)
      });
      const data = await response.json();
      if (data.success) {
        showToast?.("Job updated successfully", "success");
        setShowCreateModal(false);
        setEditingJob(null);
        resetForm();
        fetchJobs();
      } else {
        showToast?.(data.error || "Failed to update job", "error");
      }
    } catch (error) {
      console.error("Update job error:", error);
      showToast?.("Failed to update job", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this automation job?")) return;
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast?.("Job deleted", "success");
        fetchJobs();
      } else {
        showToast?.(data.error || "Failed to delete job", "error");
      }
    } catch (error) {
      console.error("Delete job error:", error);
      showToast?.("Failed to delete job", "error");
    }
  };

  const toggleJobStatus = async (jobId, currentStatus) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify({ active: !currentStatus })
      });
      const data = await response.json();
      if (data.success) {
        showToast?.(`Job ${!currentStatus ? 'activated' : 'paused'}`, "success");
        fetchJobs();
      }
    } catch (error) {
      console.error("Toggle job error:", error);
      showToast?.("Failed to toggle job status", "error");
    }
  };

  const runJobNow = async (jobId) => {
    try {
      const response = await fetch(`${apiBase}/api/admin/automation/jobs/${jobId}/run`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast?.("Job executed successfully", "success");
      } else {
        showToast?.(data.error || "Failed to execute job", "error");
      }
    } catch (error) {
      console.error("Run job error:", error);
      showToast?.("Failed to execute job", "error");
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage) return;
    setTestLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/social/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('imali_token')}`
        },
        body: JSON.stringify({ message: testMessage, platform: jobForm.platform })
      });
      const data = await response.json();
      if (data.success) {
        showToast?.("Test message sent", "success");
        setTestMessage("");
      } else {
        showToast?.(data.error || "Failed to send test", "error");
      }
    } catch (error) {
      console.error("Test message error:", error);
      showToast?.("Failed to send test message", "error");
    } finally {
      setTestLoading(false);
    }
  };

  const resetForm = () => {
    setJobForm({
      name: "",
      platform: "telegram",
      channel: "",
      message_template: "",
      schedule: "daily",
      schedule_time: "09:00",
      active: true,
      variables: []
    });
    setEditingJob(null);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setJobForm({
      name: job.name || "",
      platform: job.platform || "telegram",
      channel: job.channel || "",
      message_template: job.message_template || "",
      schedule: job.schedule || "daily",
      schedule_time: job.schedule_time || "09:00",
      active: job.active !== false,
      variables: job.variables || []
    });
    setShowCreateModal(true);
  };

  const insertVariable = (variable) => {
    setJobForm({
      ...jobForm,
      message_template: jobForm.message_template + variable
    });
  };

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? <platform.icon className="text-sm" /> : <FaRobot />;
  };

  const getPlatformColor = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform?.color || "bg-gray-500";
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaRobot className="mx-auto mb-2 text-xl text-emerald-400" />
          <div className="text-2xl font-bold text-white">{stats.total_jobs}</div>
          <div className="text-xs text-white/50">Total Jobs</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaPlay className="mx-auto mb-2 text-xl text-green-400" />
          <div className="text-2xl font-bold text-white">{stats.active_jobs}</div>
          <div className="text-xs text-white/50">Active Jobs</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaBell className="mx-auto mb-2 text-xl text-blue-400" />
          <div className="text-2xl font-bold text-white">{stats.total_sent}</div>
          <div className="text-xs text-white/50">Messages Sent</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaChartLine className="mx-auto mb-2 text-xl text-purple-400" />
          <div className="text-2xl font-bold text-white">{stats.success_rate}%</div>
          <div className="text-xs text-white/50">Success Rate</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "jobs" 
              ? "border-b-2 border-emerald-500 text-emerald-400" 
              : "text-white/50 hover:text-white"
          }`}
        >
          <FaRobot className="inline mr-2" /> Automation Jobs
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "templates" 
              ? "border-b-2 border-emerald-500 text-emerald-400" 
              : "text-white/50 hover:text-white"
          }`}
        >
          <FaHashtag className="inline mr-2" /> Templates
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "analytics" 
              ? "border-b-2 border-emerald-500 text-emerald-400" 
              : "text-white/50 hover:text-white"
          }`}
        >
          <FaChartLine className="inline mr-2" /> Analytics
        </button>
      </div>

      {/* Jobs Tab */}
      {activeTab === "jobs" && (
        <>
          {/* Create Job Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              <FaPlus /> Create Automation Job
            </button>
          </div>

          {/* Jobs List */}
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <FaRobot className="mx-auto mb-3 text-4xl text-white/30" />
                <p className="text-white/50">No automation jobs yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  Create your first job →
                </button>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${getPlatformColor(job.platform)} bg-opacity-20`}>
                        {getPlatformIcon(job.platform)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{job.name || 'Unnamed Job'}</h4>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <FaClock /> {job.schedule || 'daily'}
                          </span>
                          <span>•</span>
                          <span>Channel: {job.channel || "Default"}</span>
                          {job.last_run && (
                            <>
                              <span>•</span>
                              <span>Last run: {new Date(job.last_run).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => runJobNow(job.id)}
                        className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                        title="Run Now"
                      >
                        <FaPlay className="text-green-400" />
                      </button>
                      <button
                        onClick={() => openEditModal(job)}
                        className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                        title="Edit"
                      >
                        <FaEdit className="text-amber-400" />
                      </button>
                      <button
                        onClick={() => toggleJobStatus(job.id, job.active)}
                        className={`rounded-lg border p-2 text-sm hover:bg-white/5 ${
                          job.active ? 'border-green-500/30 text-green-400' : 'border-gray-500/30 text-gray-400'
                        }`}
                        title={job.active ? "Pause" : "Activate"}
                      >
                        {job.active ? <FaPause /> : <FaPlay />}
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                        title="Delete"
                      >
                        <FaTrash className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-black/30 p-3">
                    <div className="text-xs text-white/50 mb-1">Message Template:</div>
                    <div className="text-sm break-all">{job.message_template || 'No template'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Templates Tab - FIXED: Removed the undefined pnl variable */}
      {activeTab === "templates" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FaHashtag /> Available Variables
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {variableOptions.map((variable) => (
              <div key={variable.key} className="rounded-lg border border-white/10 bg-black/30 p-3">
                <code className="text-sm text-emerald-400">{variable.key}</code>
                <p className="mt-1 text-xs text-white/50">{variable.description}</p>
              </div>
            ))}
          </div>

          <h3 className="mb-4 mt-6 flex items-center gap-2 text-lg font-semibold">
            <FaCopy /> Message Templates
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="text-sm text-white/80">
                🚀 <strong>Daily Performance Update</strong>
              </div>
              {/* ✅ FIXED: Removed the inline {pnl} that was causing the error */}
              <div className="mt-2 text-xs text-white/50 break-all">
                Today's PnL: $0.00 | Total Trades: 0 | Win Rate: 0%
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                Variables will be replaced with actual values when the job runs
              </p>
              <button
                onClick={() => {
                  setJobForm({
                    ...jobForm,
                    message_template: "Today's PnL: {pnl} | Total Trades: {total_trades} | Win Rate: {win_rate}%"
                  });
                  showToast?.("Template copied", "success");
                }}
                className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FaChartLine /> Automation Analytics
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-center">
              <FaTelegram className="mx-auto mb-2 text-2xl text-blue-400" />
              <div className="text-lg font-bold text-white">Telegram</div>
              <div className="text-xs text-white/50">Active: {jobs.filter(j => j.platform === "telegram" && j.active).length}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-center">
              <FaTwitter className="mx-auto mb-2 text-2xl text-sky-400" />
              <div className="text-lg font-bold text-white">Twitter/X</div>
              <div className="text-xs text-white/50">Active: {jobs.filter(j => j.platform === "twitter" && j.active).length}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-center">
              <FaEnvelope className="mx-auto mb-2 text-2xl text-gray-400" />
              <div className="text-lg font-bold text-white">Email</div>
              <div className="text-xs text-white/50">Active: {jobs.filter(j => j.platform === "email" && j.active).length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingJob ? "Edit Automation Job" : "Create Automation Job"}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-white/50 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-white/70">Job Name *</label>
                <input
                  type="text"
                  value={jobForm.name}
                  onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                  placeholder="e.g., Daily Performance Update"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Platform *</label>
                <div className="flex gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setJobForm({ ...jobForm, platform: platform.id })}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm transition ${
                        jobForm.platform === platform.id
                          ? `${platform.color} text-white shadow-lg`
                          : "border border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <platform.icon className="inline mr-2" /> {platform.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Channel / Recipient</label>
                <input
                  type="text"
                  value={jobForm.channel}
                  onChange={(e) => setJobForm({ ...jobForm, channel: e.target.value })}
                  placeholder={jobForm.platform === "telegram" ? "@username or channel ID" : "Email address"}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Message Template *</label>
                <textarea
                  value={jobForm.message_template}
                  onChange={(e) => setJobForm({ ...jobForm, message_template: e.target.value })}
                  placeholder="Enter your message here. Use {variables} for dynamic content."
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {variableOptions.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Schedule</label>
                  <select
                    value={jobForm.schedule}
                    onChange={(e) => setJobForm({ ...jobForm, schedule: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                  >
                    {scheduleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Schedule Time</label>
                  <input
                    type="time"
                    value={jobForm.schedule_time}
                    onChange={(e) => setJobForm({ ...jobForm, schedule_time: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Active</label>
                <button
                  type="button"
                  onClick={() => setJobForm({ ...jobForm, active: !jobForm.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    jobForm.active ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute h-4 w-4 rounded-full bg-white transition ${
                    jobForm.active ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Test Section */}
              <div className="border-t border-white/10 pt-4">
                <label className="mb-2 block text-sm text-white/70">Test Message</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message..."
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={sendTestMessage}
                    disabled={testLoading}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm hover:bg-purple-500 disabled:opacity-50"
                  >
                    {testLoading ? <FaSpinner className="animate-spin" /> : "Send Test"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={editingJob ? updateJob : createJob}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? <FaSpinner className="mx-auto animate-spin" /> : <FaSave className="inline mr-2" />}
                  {saving ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
