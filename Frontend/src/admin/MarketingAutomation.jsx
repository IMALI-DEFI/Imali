// src/pages/admin/MarketingAutomation.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useAdmin from "../hooks/useAdmin";

/* -------------------------------------------------------------------------- */
/*                                  Config                                     */
/* -------------------------------------------------------------------------- */

const PLATFORMS = [
  { id: "telegram", name: "Telegram", icon: "📱", colorClass: "bg-sky-500", badgeClass: "bg-sky-500/20 text-sky-300", maxLength: 4096 },
  { id: "twitter", name: "Twitter/X", icon: "𝕏", colorClass: "bg-sky-600", badgeClass: "bg-sky-600/20 text-sky-300", maxLength: 280 },
  { id: "discord", name: "Discord", icon: "💬", colorClass: "bg-indigo-600", badgeClass: "bg-indigo-600/20 text-indigo-300", maxLength: 2000 },
  { id: "email", name: "Email", icon: "📧", colorClass: "bg-emerald-600", badgeClass: "bg-emerald-600/20 text-emerald-300", maxLength: 10000 },
  { id: "in_app", name: "In-App", icon: "🖥️", colorClass: "bg-purple-600", badgeClass: "bg-purple-600/20 text-purple-300", maxLength: 500 },
  { id: "internal", name: "Internal", icon: "⚙️", colorClass: "bg-gray-600", badgeClass: "bg-gray-600/20 text-gray-300", maxLength: 5000 }
];

const TEMPLATE_VARS = [
  { name: "{pnl}", description: "Today's P&L" },
  { name: "{winRate}", description: "Win rate percentage" },
  { name: "{trades}", description: "Total trades today" },
  { name: "{wins}", description: "Number of winning trades" },
  { name: "{losses}", description: "Number of losing trades" },
  { name: "{dashboardUrl}", description: "Dashboard link" },
  { name: "{date}", description: "Current date" },
  { name: "{botCount}", description: "Active bots count" },
  { name: "{discoveries}", description: "New discoveries" },
  { name: "{user}", description: "Username" },
  { name: "{balance}", description: "User balance" }
];

const SCHEDULE_PRESETS = [
  { value: "*/5 * * * *", label: "Every 5 minutes", desc: "For frequent updates" },
  { value: "*/15 * * * *", label: "Every 15 minutes", desc: "Regular interval" },
  { value: "*/30 * * * *", label: "Every 30 minutes", desc: "Half-hourly" },
  { value: "0 * * * *", label: "Every hour", desc: "Hourly summary" },
  { value: "0 9 * * *", label: "Daily 9 AM", desc: "Morning report" },
  { value: "0 12 * * *", label: "Daily noon", desc: "Midday update" },
  { value: "0 18 * * *", label: "Daily 6 PM", desc: "Evening recap" },
  { value: "0 0 * * *", label: "Daily midnight", desc: "End of day" },
  { value: "0 0 * * 1", label: "Weekly Monday", desc: "Weekly kickoff" },
  { value: "0 0 1 * *", label: "Monthly 1st", desc: "Monthly summary" }
];

const DEFAULT_JOB = {
  id: null,
  name: "",
  description: "",
  schedule: "0 9 * * *",
  channels: ["telegram"],
  messages: {},
  status: "active",
  icon: "📢"
};

/* -------------------------------------------------------------------------- */
/*                                Helpers                                      */
/* -------------------------------------------------------------------------- */

function getPlatformInfo(platformId) {
  return PLATFORMS.find((p) => p.id === platformId) || null;
}

function isValidCron(cron) {
  if (!cron || typeof cron !== "string") return false;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fieldRegex = /^(\*|\*\/\d+|\d+|\d+\-\d+|\d+(,\d+)+)$/;

  return parts.every((part) => fieldRegex.test(part));
}

function formatSchedule(schedule) {
  if (!schedule) return "Not set";
  const preset = SCHEDULE_PRESETS.find((p) => p.value === schedule);
  return preset ? preset.label : schedule;
}

function getStatusMeta(status) {
  switch ((status || "").toLowerCase()) {
    case "active":
      return {
        dot: "bg-green-400",
        pill: "bg-green-500/15 text-green-300 border border-green-500/20"
      };
    case "paused":
      return {
        dot: "bg-amber-400",
        pill: "bg-amber-500/15 text-amber-300 border border-amber-500/20"
      };
    case "error":
      return {
        dot: "bg-red-400",
        pill: "bg-red-500/15 text-red-300 border border-red-500/20"
      };
    default:
      return {
        dot: "bg-gray-400",
        pill: "bg-gray-500/15 text-gray-300 border border-gray-500/20"
      };
  }
}

function createSamplePreview(value) {
  let previewText = value || "";
  const sampleValues = {
    "{pnl}": "+$1,234",
    "{winRate}": "68%",
    "{trades}": "42",
    "{wins}": "28",
    "{losses}": "14",
    "{dashboardUrl}": "https://app.imali-defi.com/dashboard",
    "{date}": new Date().toLocaleDateString(),
    "{botCount}": "5",
    "{discoveries}": "3",
    "{user}": "trader123",
    "{balance}": "$5,678"
  };

  for (const [key, val] of Object.entries(sampleValues)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    previewText = previewText.replace(new RegExp(escaped, "g"), val);
  }

  return previewText;
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                  */
/* -------------------------------------------------------------------------- */

function MessageEditor({ platform, value = "", onChange, variables = [] }) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  const platformInfo = getPlatformInfo(platform) || {
    id: platform,
    name: platform,
    icon: "📱",
    maxLength: 4096
  };

  const charCount = value.length;
  const preview = useMemo(() => createSamplePreview(value), [value]);

  const insertVariable = (varName) => {
    if (!textareaRef.current || !varName) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;

    const nextValue = value.slice(0, start) + varName + value.slice(end);
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + varName.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{platformInfo.icon}</span>
          <h4 className="font-medium text-white">{platformInfo.name}</h4>
        </div>

        <span
          className={`text-xs ${
            charCount > platformInfo.maxLength ? "text-red-400" : "text-white/40"
          }`}
        >
          {charCount}/{platformInfo.maxLength}
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm font-mono text-white outline-none transition focus:border-emerald-500/40"
        placeholder={`Enter ${platformInfo.name} message...`}
        maxLength={platformInfo.maxLength}
      />

      <div className="flex flex-wrap gap-2">
        {variables.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={() => insertVariable(v.name)}
            title={v.description}
            className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300 transition hover:bg-purple-500/30"
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
        >
          {showPreview ? "🙈 Hide Preview" : "👁️ Preview"}
        </button>
      </div>

      {showPreview && (
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/90 whitespace-pre-wrap">
          <div className="mb-1 text-xs text-white/40">Preview:</div>
          {preview || value || ""}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onEdit, onToggle, onRunNow, onDelete, onViewLogs }) {
  if (!job?.id) return null;

  const statusMeta = getStatusMeta(job.status);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-indigo-500/30">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">
            <span className="mr-2">{job.icon || "📢"}</span>
            {job.name || "Unnamed Job"}
          </h3>
          <p className="mt-1 text-xs text-white/50">
            {job.description || "No description"}
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs capitalize ${statusMeta.pill}`}>
          <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          {job.status || "unknown"}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-black/30 p-3">
          <div className="text-xs text-white/40">Schedule</div>
          <div className="mt-1 font-mono text-sm text-emerald-400">
            {formatSchedule(job.schedule)}
          </div>
        </div>

        <div className="rounded-lg bg-black/30 p-3">
          <div className="text-xs text-white/40">Next Run</div>
          <div className="mt-1 text-sm text-white">{job.nextRun || "—"}</div>
        </div>

        <div className="rounded-lg bg-black/30 p-3">
          <div className="text-xs text-white/40">Last Run</div>
          <div className="mt-1 text-sm text-white/70">{job.lastRun || "Never"}</div>
        </div>

        <div className="rounded-lg bg-black/30 p-3">
          <div className="text-xs text-white/40">Platforms</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(job.channels || []).map((channelId) => {
              const p = getPlatformInfo(channelId);
              return p ? (
                <span
                  key={channelId}
                  title={p.name}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${p.badgeClass}`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </span>
              ) : (
                <span
                  key={channelId}
                  className="rounded bg-gray-600/20 px-2 py-1 text-xs text-gray-300"
                >
                  {channelId}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggle(job.id)}
          className={`rounded-lg px-3 py-2 text-xs font-medium text-white transition ${
            job.status === "active"
              ? "bg-amber-600 hover:bg-amber-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {job.status === "active" ? "⏸️ Pause" : "▶️ Resume"}
        </button>

        <button
          type="button"
          onClick={() => onRunNow(job.id)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
        >
          ⚡ Run Now
        </button>

        <button
          type="button"
          onClick={() => onEdit(job)}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
        >
          ✏️ Edit
        </button>

        <button
          type="button"
          onClick={() => onViewLogs(job.id)}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/20"
        >
          📋 Logs
        </button>

        <button
          type="button"
          onClick={() => onDelete(job.id)}
          className="rounded-lg bg-red-600/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-600/40"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

function JobModal({ job, onClose, onSave }) {
  const initialData = useMemo(() => {
    if (!job) return { ...DEFAULT_JOB };
    return {
      ...DEFAULT_JOB,
      ...job,
      channels: Array.isArray(job.channels) && job.channels.length > 0 ? job.channels : ["telegram"],
      messages: job.messages || {}
    };
  }, [job]);

  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(initialData);
    setErrors({});
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleMessageChange = (platform, nextValue) => {
    setFormData((prev) => ({
      ...prev,
      messages: {
        ...(prev.messages || {}),
        [platform]: nextValue
      }
    }));
  };

  const toggleChannel = (channelId) => {
    setFormData((prev) => {
      const current = prev.channels || [];
      const exists = current.includes(channelId);

      const nextChannels = exists
        ? current.filter((c) => c !== channelId)
        : [...current, channelId];

      return {
        ...prev,
        channels: nextChannels
      };
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.name?.trim()) {
      nextErrors.name = "Job name is required";
    }

    if (!isValidCron(formData.schedule)) {
      nextErrors.schedule = "Enter a valid 5-part cron expression";
    }

    if (!Array.isArray(formData.channels) || formData.channels.length === 0) {
      nextErrors.channels = "Select at least one platform";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || "",
        icon: formData.icon?.trim() || "📢"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {formData.id ? "Edit Job" : "Create New Job"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/50">Job Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white outline-none transition focus:border-emerald-500/40"
                placeholder="e.g., Daily Performance Summary"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/50">Icon (emoji)</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => handleChange("icon", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white outline-none transition focus:border-emerald-500/40"
                placeholder="📊"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/50">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white outline-none transition focus:border-emerald-500/40"
              placeholder="What does this job do?"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/50">Schedule</label>

            <select
              value={SCHEDULE_PRESETS.some((p) => p.value === formData.schedule) ? formData.schedule : ""}
              onChange={(e) => {
                if (e.target.value) handleChange("schedule", e.target.value);
              }}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-white outline-none transition focus:border-emerald-500/40"
            >
              <option value="">Choose a preset…</option>
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} — {p.desc}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-white/40">
              Or enter a custom cron expression like{" "}
              <code className="rounded bg-black/30 px-1 py-0.5">0 9 * * *</code>
            </p>

            <input
              type="text"
              value={formData.schedule}
              onChange={(e) => handleChange("schedule", e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2 font-mono text-white outline-none transition focus:border-emerald-500/40"
              placeholder="Custom cron expression"
            />
            {errors.schedule && (
              <p className="mt-1 text-xs text-red-400">{errors.schedule}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/50">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const selected = (formData.channels || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleChannel(p.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition ${
                      selected ? p.colorClass : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <span>{p.icon}</span>
                    {p.name}
                  </button>
                );
              })}
            </div>
            {errors.channels && (
              <p className="mt-1 text-xs text-red-400">{errors.channels}</p>
            )}
          </div>

          {(formData.channels || []).length > 0 && (
            <div>
              <label className="mb-2 block text-sm text-white/50">Message Templates</label>
              <p className="mb-4 text-xs text-white/40">
                Use variables like <code className="rounded bg-black/30 px-1 py-0.5">{`{pnl}`}</code>{" "}
                to insert dynamic data.
              </p>

              <div className="space-y-4">
                {(formData.channels || []).map((channel) => (
                  <MessageEditor
                    key={channel}
                    platform={channel}
                    value={formData.messages?.[channel] || ""}
                    onChange={(nextValue) => handleMessageChange(channel, nextValue)}
                    variables={TEMPLATE_VARS}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : formData.id ? "Save Changes" : "Create Job"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobLogs({ jobId, logs = [], onClose }) {
  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-gray-900">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="font-bold text-white">Logs for Job {jobId}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 transition hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-white/40">No logs yet</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => {
                const level = (log?.level || "info").toLowerCase();
                const levelClass =
                  level === "success"
                    ? "bg-green-500/20 text-green-300"
                    : level === "error"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-amber-500/20 text-amber-300";

                return (
                  <div key={`${log?.timestamp || "log"}-${index}`} className="rounded-lg bg-black/30 p-3 text-xs font-mono">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-white/40">{log?.timestamp || "Unknown time"}</span>
                      <span className={`rounded-full px-2 py-0.5 ${levelClass}`}>
                        {level}
                      </span>
                    </div>

                    <div className="text-white/80">{log?.message || "No message"}</div>

                    {log?.details && (
                      <pre className="mt-2 overflow-x-auto text-xs text-red-300">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Main Component                                 */
/* -------------------------------------------------------------------------- */

export default function MarketingAutomation() {
  const { adminFetch, showToast, user } = useAdmin();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [viewingLogs, setViewingLogs] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    activeJobs: 0,
    pendingPosts: 0
  });
  const [componentError, setComponentError] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const handleWindowError = (event) => {
      console.error("MarketingAutomation window error:", event?.error || event);
    };

    window.addEventListener("error", handleWindowError);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  useEffect(() => {
    console.log("MarketingAutomation user:", user);
  }, [user]);

  const fetchJobs = useCallback(
    async (retry = 0, silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await adminFetch("/api/admin/automation/jobs", { method: "GET" });
        const jobsList = Array.isArray(data?.jobs) ? data.jobs : [];

        if (!mountedRef.current) return;

        setJobs(jobsList);
        setStats({
          totalPosts: data?.stats?.total_posts || 0,
          activeJobs: jobsList.filter((j) => j?.status === "active").length,
          pendingPosts: data?.stats?.pending || 0
        });
      } catch (error) {
        console.error("Failed to fetch jobs:", error);

        if (!mountedRef.current) return;

        const message = error?.message || "";

        if (message.includes("401")) {
          showToast?.("Session expired. Please log in again.", "error");
        } else if (message.includes("429")) {
          if (retry < 3) {
            setTimeout(() => {
              fetchJobs(retry + 1, true);
            }, 30000 * (retry + 1));
          } else {
            showToast?.("Rate limited while loading automation jobs.", "error");
          }
        } else {
          showToast?.("Could not load automation jobs", "error");
        }
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminFetch, showToast]
  );

  useEffect(() => {
    fetchJobs(0, false);

    const interval = setInterval(() => {
      fetchJobs(0, true);
    }, 300000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleToggle = async (jobId) => {
    if (!jobId) return;

    try {
      await adminFetch("/api/admin/automation/jobs/toggle", {
        method: "POST",
        body: JSON.stringify({ jobId })
      });

      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, status: job.status === "active" ? "paused" : "active" }
            : job
        )
      );

      const targetJob = jobs.find((j) => j.id === jobId);
      const wasActive = targetJob?.status === "active";
      showToast?.(`Job ${targetJob?.name || ""} ${wasActive ? "paused" : "resumed"}`, "success");

      fetchJobs(0, true);
    } catch (error) {
      console.error("Failed to toggle job:", error);
      if (!error?.message?.includes("429")) {
        showToast?.("Failed to toggle job", "error");
      }
    }
  };

  const handleRunNow = async (jobId) => {
    if (!jobId) return;

    try {
      await adminFetch("/api/admin/automation/jobs/run", {
        method: "POST",
        body: JSON.stringify({ jobId })
      });

      showToast?.("Job triggered successfully", "success");
      fetchJobs(0, true);
    } catch (error) {
      console.error("Failed to run job:", error);
      if (!error?.message?.includes("429")) {
        showToast?.("Failed to run job", "error");
      }
    }
  };

  const handleSaveJob = async (jobData) => {
    if (!jobData) return;

    try {
      const isEdit = Boolean(jobData.id);
      const endpoint = isEdit
        ? `/api/admin/automation/jobs/${jobData.id}`
        : "/api/admin/automation/jobs";

      await adminFetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(jobData)
      });

      showToast?.(isEdit ? "Job updated" : "Job created", "success");
      setEditingJob(null);
      fetchJobs(0, true);
    } catch (error) {
      console.error("Failed to save job:", error);
      if (!error?.message?.includes("429")) {
        showToast?.("Failed to save job", "error");
      }
    }
  };

  const handleDelete = async (jobId) => {
    if (!jobId) return;

    const confirmed = window.confirm("Are you sure you want to delete this job?");
    if (!confirmed) return;

    try {
      await adminFetch(`/api/admin/automation/jobs/${jobId}`, {
        method: "DELETE"
      });

      showToast?.("Job deleted", "success");
      fetchJobs(0, true);
    } catch (error) {
      console.error("Failed to delete job:", error);
      if (!error?.message?.includes("429")) {
        showToast?.("Failed to delete job", "error");
      }
    }
  };

  const handleViewLogs = async (jobId) => {
    if (!jobId) return;

    try {
      const data = await adminFetch(`/api/admin/automation/logs/${jobId}`, {
        method: "GET"
      });

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setViewingLogs(jobId);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      if (!error?.message?.includes("429")) {
        showToast?.("Failed to fetch logs", "error");
      }
    }
  };

  const handleTestIntegration = async (platform) => {
    if (!platform) return;

    try {
      await adminFetch("/api/admin/social/test", {
        method: "POST",
        body: JSON.stringify({
          platform,
          message: `Test from IMALI Admin at ${new Date().toLocaleString()}`
        })
      });

      showToast?.(`Test sent to ${platform}`, "success");
    } catch (error) {
      console.error("Failed to send test integration:", error);
      if (!error?.message?.includes("429")) {
        showToast?.(`Failed to send to ${platform}`, "error");
      }
    }
  };

  if (componentError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h3 className="mb-2 text-xl font-bold text-red-300">Something went wrong</h3>
        <p className="mb-4 text-white/70">The automation panel encountered an error.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-white/60">Loading automation jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Marketing Automation</h2>
          <p className="text-white/60">
            Schedule and manage automated posts to social channels and emails.
          </p>
          {!user && (
            <p className="mt-1 text-xs text-amber-300">
              User details are not loaded, but automation controls are still available.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-xs text-white/40">Refreshing…</span>
          )}
          <button
            type="button"
            onClick={() => setEditingJob({ ...DEFAULT_JOB })}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
          >
            <span>➕</span>
            New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4">
          <div className="mb-1 text-2xl text-emerald-400">📊</div>
          <div className="text-2xl font-bold text-white">{stats.totalPosts}</div>
          <div className="text-sm text-white/50">Total Posts</div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4">
          <div className="mb-1 text-2xl text-blue-400">🤖</div>
          <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
          <div className="text-sm text-white/50">Active Jobs</div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4">
          <div className="mb-1 text-2xl text-amber-400">⏳</div>
          <div className="text-2xl font-bold text-white">{stats.pendingPosts}</div>
          <div className="text-sm text-white/50">Pending Posts</div>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="mb-4 text-white/50">No automation jobs yet.</p>
          <button
            type="button"
            onClick={() => setEditingJob({ ...DEFAULT_JOB })}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
          >
            Create your first job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {jobs.map((job) => (
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

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6">
        <h3 className="mb-2 text-lg font-semibold text-cyan-300">🧪 Test Your Integrations</h3>
        <p className="mb-4 text-sm text-white/70">
          Send a test message to verify your social channels are working correctly.
        </p>

        <div className="flex flex-wrap gap-3">
          {["telegram", "twitter", "discord"].map((platformId) => {
            const p = getPlatformInfo(platformId);
            if (!p) return null;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleTestIntegration(p.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-80 ${p.colorClass}`}
              >
                <span>{p.icon}</span>
                Test {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {editingJob !== null && (
        <JobModal
          job={editingJob}
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
