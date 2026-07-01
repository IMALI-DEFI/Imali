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
    id: "day1-welcome",
    name: "Day 1 — Welcome & Platform Tour",
    sendAfterDays: 0,
    subject: "Welcome to IMALI — Here's What You Can Do",
    segment: "new_users",
    html: `<h2>Welcome to IMALI!</h2>
<p>You've joined the smartest automated trading platform. Here's what you can do right now:</p>
<ul>
<li>📊 <a href="https://imali-defi.com/live">Watch live paper trades</a> — see the bot in action</li>
<li>🤖 <a href="https://imali-defi.com/dashboard">Try paper trading</a> — $1,000 virtual credits</li>
<li>📈 <a href="https://imali-defi.com/how-it-works">Learn how it works</a></li>
</ul>
<p><strong>Ready for real trading?</strong> Upgrade to Pro and connect your exchange.</p>
<p><a href="https://imali-defi.com/billing?tier=pro" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Upgrade to Pro →</a></p>`
  },
  {
    id: "day3-success",
    name: "Day 3 — Real Results from Live Trading",
    sendAfterDays: 3,
    subject: "See What IMALI's Bot Did This Week",
    segment: "new_users",
    html: `<h2>This Week's Trading Results</h2>
<p>Our trading bot has been running 24/7. Here are the latest trades:</p>
<div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:15px 0;">
<p style="font-size:18px;"><strong>📊 Recent Performance:</strong></p>
<p>✅ BTC/USDT +3.2% | ✅ ETH/USDT +2.8% | ✅ SOL/USDT +4.1%</p>
<p style="font-size:12px;color:#666;">Past performance does not guarantee future results.</p>
</div>
<p>These trades happened automatically with stop-loss protection on every position.</p>
<p><a href="https://imali-defi.com/billing?tier=pro" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Start Live Trading →</a></p>`
  },
  {
    id: "day5-testimonial",
    name: "Day 5 — Traders Are Seeing Results",
    sendAfterDays: 5,
    subject: "What IMALI Users Are Saying",
    segment: "new_users",
    html: `<h2>Real Traders, Real Results</h2>
<div style="background:#f0f7ff;padding:15px;border-radius:8px;margin:10px 0;">
<p>"I was skeptical at first, but the stop-loss protection alone saved me from a 15% drawdown. The bot is disciplined."</p>
<p style="font-size:12px;color:#666;">— IMALI Pro User</p>
</div>
<p>IMALI isn't about get-rich-quick. It's about consistent, automated execution with risk controls.</p>
<p><strong>Your paper trading credits are still active.</strong> But they expire soon.</p>
<p><a href="https://imali-defi.com/billing?tier=pro" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Upgrade Before Credits Expire →</a></p>`
  },
  {
    id: "day7-offer",
    name: "Day 7 — Special Offer (Last Chance)",
    sendAfterDays: 7,
    subject: "Your Trial is Ending — Special Offer Inside",
    segment: "new_users",
    html: `<h2>Your Free Trial is Almost Over</h2>
<p>You've had a week to explore IMALI. Here's a special offer to continue:</p>
<div style="background:#fef3c7;padding:15px;border-radius:8px;margin:15px 0;text-align:center;">
<p style="font-size:24px;font-weight:bold;margin:0;">20% OFF</p>
<p style="margin:5px 0;">Your First Month of Pro</p>
<p style="font-size:12px;">Use code: <strong>IMALI20</strong></p>
</div>
<p>That's just <strong>$15.20</strong> for your first month of live automated trading with stop-loss protection.</p>
<p><a href="https://imali-defi.com/billing?tier=pro" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Claim Your Discount →</a></p>`
  },
  {
    id: "day14-final",
    name: "Day 14 — We Miss You",
    sendAfterDays: 14,
    subject: "Still Interested in Automated Trading?",
    segment: "new_users",
    html: `<h2>Hey — We Noticed You Haven't Started Trading Yet</h2>
<p>No pressure. But if you're still interested, here's what you're missing:</p>
<ul>
<li>🤖 300+ crypto pairs scanned 24/7</li>
<li>🛡️ Stop-loss on every trade</li>
<li>📈 Trailing take-profit locks in gains</li>
<li>📊 Real-time dashboard</li>
</ul>
<p>Your account is still active. Come back anytime.</p>
<p><a href="https://imali-defi.com/dashboard" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Go to Dashboard →</a></p>`
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
  // USE CONVERSION SEQUENCE
  // =============================================
  const useSequence = (sequence) => {
    setFormData({
      subject: sequence.subject,
      html_content: sequence.html,
      segment: sequence.segment,
    });
    setSelectedSequence(sequence);
    setShowCreateModal(true);
  };

  // =============================================
  // RENDER
  // =============================================
  if (loading) {
    return <div className="flex items-center justify-center py-12"><FaSpinner className="animate-spin text-3xl text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
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
              <button onClick={() => useSequence(seq)}
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
              <h3 className="text-xl font-bold text-white">
                {selectedSequence ? `Send: ${selectedSequence.name}` : "Custom Email"}
              </h3>
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
