// src/admin/NewsletterManager.jsx - REWRITTEN (Conversion sequences + working endpoints)
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaEnvelope, FaUsers, FaPaperPlane, FaPlus, FaTrash, FaEdit, 
  FaSpinner, FaChartLine, FaMailBulk, FaTimes, FaSave, FaClock,
  FaMoneyBillWave, FaArrowUp, FaCheckCircle, FaCalendarAlt
} from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

// =============================================
// CONVERSION EMAIL SEQUENCES
// =============================================
const CONVERSION_SEQUENCES = [
  {
    id: "day1-welcome", name: "Day 1 — Welcome and First Steps", sendAfterDays: 0,
    subject: "Welcome to IMALI — Here Are 3 Easy Steps", segment: "new_users",
    html: `<h2>Welcome to IMALI!</h2><p>Your account is ready. Here are three easy steps:</p><ol><li><a href="https://imali-defi.com/login">Sign in</a> to your account.</li><li><a href="https://imali-defi.com/trade-demo">Try the demo</a> to see how the trading robots work.</li><li><a href="https://imali-defi.com/pricing">See the plans</a> if you want to upgrade.</li></ol><p>Starter is free. Pro costs $19.95 a month. Elite costs $49 a month. You can choose a plan and follow the payment steps. Trading involves risk and you can lose money.</p>`
  },
  {
    id: "day3-success", name: "Day 3 — Understand the Robots", sendAfterDays: 3,
    subject: "What Does an IMALI Trading Robot Do?", segment: "new_users",
    html: `<h2>Meet your trading robots</h2><p>IMALI helps you choose a trading style. A robot can watch markets and place trades when your account is connected and trading is enabled.</p><p>Try the <a href="https://imali-defi.com/trade-demo">free demo</a> first. The demo is for learning, not real money.</p><p>Want more features? <a href="https://imali-defi.com/pricing">Compare the plans</a>. Trading can lose money.</p>`
  },
  {
    id: "day5-testimonial", name: "Day 5 — Choosing a Plan", sendAfterDays: 5,
    subject: "IMALI Plans Made Simple", segment: "new_users",
    html: `<h2>Which plan fits you?</h2><p><b>Starter:</b> Free. Start exploring IMALI.</p><p><b>Pro:</b> $19.95 per month.</p><p><b>Elite:</b> $49 per month.</p><p>To upgrade: <b>1.</b> <a href="https://imali-defi.com/pricing">Open Plans</a>. <b>2.</b> Pick Pro or Elite. <b>3.</b> Follow the payment steps.</p><p>You do not need to pay just to explore the demo.</p>`
  },
  {
    id: "day7-offer", name: "Day 7 — Explore Your Options", sendAfterDays: 7,
    subject: "Ready for the Next Step with IMALI?", segment: "new_users",
    html: `<h2>Ready to explore more?</h2><p>You can keep learning about IMALI and compare your options.</p><p><a href="https://imali-defi.com/pricing">See all plans</a>. Pro is $19.95 per month and Elite is $49 per month. Pick a plan, then follow the payment steps if you decide to upgrade.</p><p>No special discount is promised in this email. Trading involves risk.</p>`
  },
  {
    id: "day14-final", name: "Day 14 — Come Back Anytime", sendAfterDays: 14,
    subject: "Your IMALI Account Is Here When You Need It", segment: "new_users",
    html: `<h2>Come back anytime</h2><p>Want another look? <a href="https://imali-defi.com/trade-demo">Try the demo</a> or <a href="https://imali-defi.com/login">sign in</a>.</p><p>Need to upgrade? <a href="https://imali-defi.com/pricing">Open Plans</a>, pick a plan, and follow the payment steps.</p><p>Trading can lose money. Start with the demo if you are new.</p>`
  },
];

const SEGMENTS = [
  { value: "all", label: "All Users" },
  { value: "new_users", label: "New Users (Never Paid)" },
  { value: "trial_ending", label: "Trial Ending in 3 Days" },
  { value: "inactive_7d", label: "Inactive for 7+ Days" },
  { value: "active_paid", label: "Active Paid Users" },
];

export default function NewsletterManager({ apiBase, showToast }) {
  const baseUrl = apiBase || API_BASE;
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [stats, setStats] = useState({ total_sent: 0, last_sent: null });

  const [formData, setFormData] = useState({
    subject: '',
    html_content: '',
    segment: 'all',
  });

  // =============================================
  // USE SEQUENCE - Fixed: Now a regular function, not a hook
  // =============================================
  const handleUseSequence = (sequence) => {
    setFormData({
      subject: sequence.subject,
      html_content: sequence.html,
      segment: sequence.segment,
    });
    setSelectedSequence(sequence);
    setShowCreateModal(true);
  };

  // =============================================
  // SEND EMAIL
  // =============================================
  const sendEmail = async () => {
    if (!formData.subject || !formData.html_content) {
      showToast?.("Subject and content are required", "error");
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const token = localStorage.getItem('imali_token');
      const res = await fetch(`${baseUrl}/api/admin/bulk-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          subject: formData.subject,
          html_content: formData.html_content,
          user_filter: formData.segment === 'all' ? 'all' : 'by_tier',
          test_mode: false,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) {
        showToast?.(`Sent to ${data.data?.sent || 0} users`, "success");
        setStats(prev => ({ total_sent: prev.total_sent + (data.data?.sent || 0), last_sent: new Date() }));
      } else {
        showToast?.(data.error || "Failed to send", "error");
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  if (loading) {
    return <div className="flex items-center justify-center py-12"><FaSpinner className="animate-spin text-3xl text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Logo */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <img 
          src="/logo192.png" 
          alt="IMALI Logo" 
          className="h-10 w-10 rounded-lg"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%2310b981'/%3E%3Ctext x='20' y='28' text-anchor='middle' font-size='22' fill='white' font-weight='bold'%3EI%3C/text%3E%3C/svg%3E";
          }}
        />
        <div>
          <h2 className="text-xl font-bold text-white">Newsletter Manager</h2>
          <p className="text-sm text-white/50">Manage email campaigns and conversion sequences</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<FaEnvelope />} color="text-blue-400" value={stats.total_sent} label="Total Sent" />
        <StatCard icon={<FaUsers />} color="text-emerald-400" value="39" label="Total Users" />
        <StatCard icon={<FaClock />} color="text-purple-400" value={stats.last_sent ? new Date(stats.last_sent).toLocaleDateString() : "Never"} label="Last Sent" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FaMoneyBillWave className="text-emerald-400" /> Conversion Email Sequences
          </h3>
          <p className="text-sm text-white/50">Automated emails to convert free users to paid</p>
        </div>
        <button onClick={() => { setFormData({ subject: '', html_content: '', segment: 'all' }); setSelectedSequence(null); setShowCreateModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500">
          <FaPlus /> Custom Email
        </button>
      </div>

      {/* Conversion Sequences */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white/70">📅 Scheduled Conversion Sequences</h4>
        {CONVERSION_SEQUENCES.map((seq) => (
          <div key={seq.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                    Day {seq.sendAfterDays}
                  </span>
                  <h4 className="font-semibold text-white">{seq.name}</h4>
                </div>
                <div className="mt-1 text-sm text-white/60">{seq.subject}</div>
              </div>
              <button onClick={() => handleUseSequence(seq)}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                <FaPaperPlane className="inline mr-2" /> Use This Email
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Send Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo192.png" 
                  alt="IMALI" 
                  className="h-8 w-8 rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2310b981'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='18' fill='white' font-weight='bold'%3EI%3C/text%3E%3C/svg%3E";
                  }}
                />
                <h3 className="text-xl font-bold text-white">
                  {selectedSequence ? `Send: ${selectedSequence.name}` : "Custom Email"}
                </h3>
              </div>
              <button onClick={() => { setShowCreateModal(false); setSendResult(null); }} className="text-white/50 hover:text-white"><FaTimes /></button>
            </div>

            <div className="space-y-4">
              <Field label="Segment">
                <select value={formData.segment} onChange={e => setFormData(prev => ({ ...prev, segment: e.target.value }))}
                  className="input">
                  {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>

              <Field label="Subject *">
                <input type="text" value={formData.subject} onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject" className="input" />
              </Field>

              <Field label="HTML Content *">
                <textarea value={formData.html_content} onChange={e => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
                  rows={14} className="input font-mono text-sm" />
              </Field>

              {sendResult && (
                <div className={`rounded-lg border p-4 ${sendResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  {sendResult.success ? (
                    <div className="text-emerald-400"><FaCheckCircle className="inline mr-2" />Sent: {sendResult.data?.sent || 0} | Failed: {sendResult.data?.failed || 0}</div>
                  ) : (
                    <div className="text-red-400">{sendResult.error}</div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={sendEmail} disabled={sending}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                  {sending ? <FaSpinner className="animate-spin inline mr-2" /> : <FaPaperPlane className="inline mr-2" />}
                  Send Now
                </button>
                <button onClick={() => { setShowCreateModal(false); setSendResult(null); }}
                  className="flex-1 rounded-lg border border-white/10 py-2 text-white hover:bg-white/5">Cancel</button>
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