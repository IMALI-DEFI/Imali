// src/admin/AutoResponder.jsx - REWRITTEN (Connected to working backend endpoints)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaEnvelope, FaRobot, FaPlus, FaTrash, FaEdit, FaPlay, FaPause,
  FaSave, FaTimes, FaSpinner, FaChartLine, FaMailBulk, FaUsers,
  FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaSyncAlt,
  FaClock, FaCheck, FaTimes as FaX,
} from "react-icons/fa";

// =============================================
// DEFAULTS — Welcome email on signup, daily digest
// =============================================
const DEFAULT_RULES = [
  {
    id: "welcome-email",
    name: "Welcome Email on Signup",
    trigger_event: "signup",
    subject: "Welcome to IMALI — Start Trading Today",
    delay_minutes: 0,
    is_active: true,
    description: "Sends immediately when a new user signs up",
    sent_count: 0,
  },
  {
    id: "daily-digest",
    name: "Daily Trade Digest",
    trigger_event: "manual",
    subject: "IMALI Daily Trade Digest",
    delay_minutes: 0,
    is_active: true,
    description: "Sends at 9am daily with 24h trade stats to all active users",
    sent_count: 0,
  },
];

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

export default function AutoResponder({ apiBase, showToast }) {
  const baseUrl = apiBase || API_BASE;

  const [autoResponses, setAutoResponses] = useState(DEFAULT_RULES);
  const [loading, setLoading] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [bulkEmailResult, setBulkEmailResult] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  const [bulkEmailData, setBulkEmailData] = useState({
    subject: "",
    html_content: "",
    user_filter: "all",
    selected_tiers: [],
    date_range_days: 30,
    selected_user_ids: [],
    test_mode: false,
    test_email: "",
  });

  const [stats, setStats] = useState({ total_sent: 0, active_rules: 2, open_rate: 0, click_rate: 0 });

  const getAuthToken = useCallback(() => {
    try { return localStorage.getItem("imali_token"); }
    catch { return null; }
  }, []);

  const authHeaders = useCallback(() => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }, [getAuthToken]);

  // =============================================
  // SEND DAILY TRADE DIGEST
  // =============================================
  const sendTradeDigest = async () => {
    setSendingDigest(true);
    setErrorDetail(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/send-trade-digest`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Digest sent to ${data.data?.sent || 0} users (${data.data?.failed || 0} failed)`, "success");
        setStats(prev => ({ ...prev, total_sent: prev.total_sent + (data.data?.sent || 0) }));
      } else {
        showToast?.(data.error || "Failed to send digest", "error");
      }
    } catch (err) {
      showToast?.("Failed to send digest", "error");
    } finally {
      setSendingDigest(false);
    }
  };

  // =============================================
  // SEND BULK EMAIL
  // =============================================
  const sendBulkEmail = async () => {
    if (!bulkEmailData.subject.trim() || !bulkEmailData.html_content.trim()) {
      showToast?.("Subject and content are required", "error");
      return;
    }
    if (bulkEmailData.test_mode && !bulkEmailData.test_email) {
      showToast?.("Test email required in test mode", "error");
      return;
    }

    setSendingBulk(true);
    setBulkEmailResult(null);
    try {
      const payload = {
        subject: bulkEmailData.subject,
        html_content: bulkEmailData.html_content,
        test_mode: bulkEmailData.test_mode,
        test_email: bulkEmailData.test_email,
        user_filter: bulkEmailData.user_filter,
        selected_tiers: bulkEmailData.selected_tiers,
        date_range_days: bulkEmailData.date_range_days,
      };

      const res = await fetch(`${baseUrl}/api/admin/bulk-email`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setBulkEmailResult(data);
      if (data.success) {
        showToast?.(`Sent to ${data.data?.sent || 0} users`, "success");
        setStats(prev => ({ ...prev, total_sent: prev.total_sent + (data.data?.sent || 0) }));
      }
    } catch (err) {
      setBulkEmailResult({ success: false, error: err.message });
    } finally {
      setSendingBulk(false);
    }
  };

  // =============================================
  // TOGGLE RULE
  // =============================================
  const toggleRule = (ruleId) => {
    setAutoResponses(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !r.is_active } : r));
    showToast?.("Rule toggled", "success");
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="space-y-6">
      {/* Error Display */}
      {errorDetail && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
          <FaExclamationTriangle className="inline mr-2" />{errorDetail}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FaEnvelope />} color="text-blue-400" value={stats.total_sent} label="Emails Sent" />
        <StatCard icon={<FaRobot />} color="text-emerald-400" value={stats.active_rules} label="Active Rules" />
        <StatCard icon={<FaChartLine />} color="text-purple-400" value={`${stats.open_rate}%`} label="Open Rate" />
        <StatCard icon={<FaChartLine />} color="text-amber-400" value={`${stats.click_rate}%`} label="Click Rate" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FaRobot className="text-emerald-400" /> Email & Auto-Responder
          </h3>
          <p className="text-sm text-white/50">Welcome emails and daily trade digests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sendTradeDigest} disabled={sendingDigest}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
            {sendingDigest ? <FaSpinner className="animate-spin" /> : <FaClock />}
            Send Daily Digest Now
          </button>
          <button onClick={() => setShowBulkEmailModal(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500">
            <FaMailBulk /> Bulk Email
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {autoResponses.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-white">{rule.name}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${rule.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-500/20 text-gray-300"}`}>
                    {rule.is_active ? <FaCheck className="inline mr-1" /> : <FaX className="inline mr-1" />}
                    {rule.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/50">{rule.description}</div>
                <div className="mt-2 text-sm text-white/70">Subject: {rule.subject}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleRule(rule.id)}
                  className={`rounded-lg border p-2 text-sm hover:bg-white/5 ${rule.is_active ? "border-red-500/30 text-red-400" : "border-green-500/30 text-green-400"}`}
                  title={rule.is_active ? "Pause" : "Activate"}>
                  {rule.is_active ? <FaPause /> : <FaPlay />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Email Modal */}
      {showBulkEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white"><FaMailBulk className="mr-2 inline text-purple-400" />Bulk Email</h3>
              <button onClick={() => { setShowBulkEmailModal(false); setBulkEmailResult(null); }} className="text-white/50 hover:text-white"><FaTimes /></button>
            </div>

            <div className="space-y-4">
              {/* Test Mode */}
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                <div><div className="text-sm font-medium text-white">Test Mode</div><div className="text-xs text-white/40">Send to one email first</div></div>
                <button onClick={() => setBulkEmailData(prev => ({ ...prev, test_mode: !prev.test_mode }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${bulkEmailData.test_mode ? "bg-purple-600" : "bg-gray-600"}`}>
                  <span className={`absolute h-4 w-4 rounded-full bg-white transition ${bulkEmailData.test_mode ? "right-1" : "left-1"}`} />
                </button>
              </div>

              {bulkEmailData.test_mode && (
                <Field label="Test Email">
                  <input type="email" value={bulkEmailData.test_email} onChange={e => setBulkEmailData(prev => ({ ...prev, test_email: e.target.value }))}
                    placeholder="test@example.com" className="input" />
                </Field>
              )}

              <Field label="Subject *">
                <input type="text" value={bulkEmailData.subject} onChange={e => setBulkEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Important Update from IMALI" className="input" />
              </Field>

              <Field label="HTML Content *">
                <textarea value={bulkEmailData.html_content} onChange={e => setBulkEmailData(prev => ({ ...prev, html_content: e.target.value }))}
                  placeholder="<h1>Hello!</h1><p>Your message here...</p>" rows={8} className="input font-mono text-sm" />
              </Field>

              {bulkEmailResult && (
                <div className={`rounded-lg border p-4 ${bulkEmailResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  {bulkEmailResult.success ? (
                    <div className="text-emerald-400"><FaCheckCircle className="inline mr-2" />Sent: {bulkEmailResult.data?.sent || 0} | Failed: {bulkEmailResult.data?.failed || 0}</div>
                  ) : (
                    <div className="text-red-400"><FaExclamationTriangle className="inline mr-2" />{bulkEmailResult.error}</div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={sendBulkEmail} disabled={sendingBulk}
                  className="flex-1 rounded-lg bg-purple-600 py-2 font-medium text-white hover:bg-purple-500 disabled:opacity-50">
                  {sendingBulk ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPaperPlane className="inline mr-2" />}
                  {bulkEmailData.test_mode ? "Send Test" : "Send to All Users"}
                </button>
                <button onClick={() => setShowBulkEmailModal(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-white hover:bg-white/5">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); padding: 0.5rem 0.75rem; color: white; outline: none; }
        .input::placeholder { color: rgba(255,255,255,0.3); }
        .input:focus { border-color: rgba(16,185,129,0.65); box-shadow: 0 0 0 2px rgba(16,185,129,0.15); }
        textarea.input { font-family: monospace; }
      `}</style>
    </div>
  );
}

function StatCard({ icon, color, value, label }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className={`mx-auto mb-2 text-xl ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1 block text-sm text-white/70">{label}</label>{children}</div>;
}
