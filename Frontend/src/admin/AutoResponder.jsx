// src/admin/AutoResponder.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FaEnvelope, FaRobot, FaPlus, FaTrash, FaEdit, FaPlay, FaPause, FaSave, FaTimes, FaSpinner, FaBell, FaUsers, FaChartLine } from 'react-icons/fa';

export default function AutoResponder({ apiBase, showToast, handleAction, busyAction }) {
  const [autoResponses, setAutoResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [stats, setStats] = useState({
    total_sent: 0,
    active_rules: 0,
    open_rate: 0,
    click_rate: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    trigger_event: 'signup',
    subject: '',
    template: '',
    delay_minutes: 0,
    is_active: true,
    conditions: {
      tier: [],
      referral_source: null
    }
  });

  const triggerEvents = [
    { value: 'signup', label: 'New Signup', description: 'Trigger when user creates account' },
    { value: 'signup_with_referral', label: 'Signup with Referral', description: 'User signed up using referral code' },
    { value: 'first_deposit', label: 'First Deposit', description: 'User makes first deposit' },
    { value: 'first_trade', label: 'First Trade', description: 'User completes first trade' },
    { value: 'activation_complete', label: 'Activation Complete', description: 'User completes platform activation' },
    { value: 'tier_upgrade', label: 'Tier Upgrade', description: 'User upgrades their tier' }
  ];

  const fetchAutoResponses = useCallback(async () => {
    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast('Authentication required', 'error');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const rules = data.data?.rules || [];
        setAutoResponses(rules);
        setStats({
          total_sent: data.data?.stats?.total_sent || 0,
          active_rules: rules.filter(r => r.is_active).length,
          open_rate: data.data?.stats?.open_rate || 0,
          click_rate: data.data?.stats?.click_rate || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch auto-responders:', error);
      showToast?.('Failed to load auto-responders', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    fetchAutoResponses();
  }, [fetchAutoResponses]);

  const createRule = async () => {
    if (!formData.name || !formData.subject || !formData.template) {
      showToast?.('Please fill in all required fields', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast?.('Authentication required', 'error');
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        showToast?.('Auto-responder rule created', 'success');
        setShowCreateModal(false);
        resetForm();
        fetchAutoResponses();
      } else {
        showToast?.(data.error || 'Failed to create rule', 'error');
      }
    } catch (error) {
      console.error('Create rule error:', error);
      showToast?.('Failed to create auto-responder', 'error');
    }
  };

  const updateRule = async () => {
    if (!editingResponse?.id) return;
    
    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast?.('Authentication required', 'error');
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules/${editingResponse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        showToast?.('Auto-responder rule updated', 'success');
        setShowCreateModal(false);
        setEditingResponse(null);
        resetForm();
        fetchAutoResponses();
      } else {
        showToast?.(data.error || 'Failed to update rule', 'error');
      }
    } catch (error) {
      console.error('Update rule error:', error);
      showToast?.('Failed to update auto-responder', 'error');
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('Delete this auto-responder rule?')) return;
    
    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast?.('Authentication required', 'error');
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast?.('Rule deleted', 'success');
        fetchAutoResponses();
      } else {
        showToast?.(data.error || 'Failed to delete rule', 'error');
      }
    } catch (error) {
      console.error('Delete rule error:', error);
      showToast?.('Failed to delete rule', 'error');
    }
  };

  const toggleRuleStatus = async (ruleId, currentStatus) => {
    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast?.('Authentication required', 'error');
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentStatus })
      });
      const data = await response.json();
      if (data.success) {
        showToast?.(`Rule ${!currentStatus ? 'activated' : 'paused'}`, 'success');
        fetchAutoResponses();
      } else {
        showToast?.(data.error || 'Failed to toggle rule', 'error');
      }
    } catch (error) {
      console.error('Toggle rule error:', error);
      showToast?.('Failed to toggle rule', 'error');
    }
  };

  const testRule = async (ruleId) => {
    const testEmail = prompt('Enter email address to send test:');
    if (!testEmail) return;
    
    if (!testEmail.includes('@') || !testEmail.includes('.')) {
      showToast?.('Please enter a valid email address', 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('imali_token');
      if (!token) {
        showToast?.('Authentication required', 'error');
        return;
      }
      
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules/${ruleId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ test_email: testEmail })
      });
      const data = await response.json();
      if (data.success) {
        showToast?.(`Test email sent to ${testEmail}`, 'success');
      } else {
        showToast?.(data.error || 'Failed to send test', 'error');
      }
    } catch (error) {
      console.error('Test rule error:', error);
      showToast?.('Failed to send test email', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_event: 'signup',
      subject: '',
      template: '',
      delay_minutes: 0,
      is_active: true,
      conditions: {
        tier: [],
        referral_source: null
      }
    });
    setEditingResponse(null);
  };

  const openEditModal = (rule) => {
    setEditingResponse(rule);
    setFormData({
      name: rule.name || '',
      trigger_event: rule.trigger_event || 'signup',
      subject: rule.subject || '',
      template: rule.template || '',
      delay_minutes: rule.delay_minutes || 0,
      is_active: rule.is_active !== false,
      conditions: rule.conditions || { tier: [], referral_source: null }
    });
    setShowCreateModal(true);
  };

  if (loading) {
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
          <FaEnvelope className="mx-auto mb-2 text-xl text-blue-400" />
          <div className="text-2xl font-bold text-white">{stats.total_sent}</div>
          <div className="text-xs text-white/50">Emails Sent</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaRobot className="mx-auto mb-2 text-xl text-emerald-400" />
          <div className="text-2xl font-bold text-white">{stats.active_rules}</div>
          <div className="text-xs text-white/50">Active Rules</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaChartLine className="mx-auto mb-2 text-xl text-purple-400" />
          <div className="text-2xl font-bold text-white">{stats.open_rate}%</div>
          <div className="text-xs text-white/50">Open Rate</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaChartLine className="mx-auto mb-2 text-xl text-amber-400" />
          <div className="text-2xl font-bold text-white">{stats.click_rate}%</div>
          <div className="text-xs text-white/50">Click Rate</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FaRobot className="text-emerald-400" />
            Auto-Responder Rules
          </h3>
          <p className="text-sm text-white/50">Automated email sequences for user events</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          disabled={busyAction}
        >
          <FaPlus /> Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {autoResponses.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <FaRobot className="mx-auto mb-3 text-4xl text-white/30" />
            <p className="text-white/50">No auto-responder rules yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Create your first rule →
            </button>
          </div>
        ) : (
          autoResponses.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{rule.name || 'Unnamed Rule'}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${rule.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'}`}>
                      {rule.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>Trigger: {triggerEvents.find(e => e.value === rule.trigger_event)?.label || rule.trigger_event}</span>
                    <span>• Delay: {rule.delay_minutes || 0} minutes</span>
                    <span>• Sent: {rule.sent_count || 0} emails</span>
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    Subject: {rule.subject || 'No subject'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => testRule(rule.id)}
                    className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                    title="Send Test"
                  >
                    <FaPlay className="text-green-400" />
                  </button>
                  <button
                    onClick={() => openEditModal(rule)}
                    className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                    title="Edit"
                  >
                    <FaEdit className="text-amber-400" />
                  </button>
                  <button
                    onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                    className={`rounded-lg border p-2 text-sm hover:bg-white/5 ${
                      rule.is_active ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'
                    }`}
                    title={rule.is_active ? "Pause" : "Activate"}
                  >
                    {rule.is_active ? <FaPause /> : <FaPlay />}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                    title="Delete"
                  >
                    <FaTrash className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {editingResponse ? "Edit Auto-Responder Rule" : "Create Auto-Responder Rule"}
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
                <label className="mb-1 block text-sm text-white/70">Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email for New Users"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Trigger Event *</label>
                <select
                  value={formData.trigger_event}
                  onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                >
                  {triggerEvents.map(event => (
                    <option key={event.value} value={event.value}>{event.label} - {event.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Delay (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="43200"
                  value={formData.delay_minutes}
                  onChange={(e) => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="0 for immediate"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
                <p className="mt-1 text-xs text-white/40">Delay before sending after trigger event (max 30 days)</p>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Email Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Welcome to IMALI!"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Email Template *</label>
                <textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  placeholder={`Welcome {user_name}!

Thank you for joining IMALI. Get started with these steps:
1. Complete your profile
2. Connect your wallet
3. Start trading

Need help? Contact support@imali-defi.com`}
                  rows={8}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30"
                />
                <p className="mt-1 text-xs text-white/40">
                  Available variables: {'{user_name}'}, {'{user_email}'}, {'{referral_code}'}, {'{dashboard_link}'}, {'{support_email}'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Active</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    formData.is_active ? 'bg-emerald-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute h-4 w-4 rounded-full bg-white transition ${
                    formData.is_active ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingResponse ? updateRule : createRule}
                  disabled={busyAction}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  <FaSave className="inline mr-2" />
                  {busyAction ? "Processing..." : (editingResponse ? "Update Rule" : "Create Rule")}
                </button>
                <button
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
