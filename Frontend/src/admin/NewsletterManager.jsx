// src/admin/NewsletterManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FaEnvelope, FaUsers, FaSend, FaPlus, FaTrash, FaEdit, FaEye, FaSpinner, FaCopy, FaChartLine, FaMailBulk, FaListOl } from 'react-icons/fa';

export default function NewsletterManager({ apiBase, showToast }) {
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscribers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    segment: 'all',
    schedule_date: null
  });

  const [stats, setStats] = useState({
    total_subscribers: 0,
    active_subscribers: 0,
    campaigns_sent: 0,
    avg_open_rate: 0,
    avg_click_rate: 0
  });

  const fetchSubscribers = useCallback(async () => {
    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/subscribers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubscribers(data.data.subscribers || []);
        setStats(prev => ({
          ...prev,
          total_subscribers: data.data.total || 0,
          active_subscribers: data.data.active || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    }
  }, [apiBase]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.data.campaigns || []);
        setStats(prev => ({
          ...prev,
          campaigns_sent: data.data.campaigns?.filter(c => c.status === 'sent').length || 0,
          avg_open_rate: data.data.stats?.avg_open_rate || 0,
          avg_click_rate: data.data.stats?.avg_click_rate || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchSubscribers();
    fetchCampaigns();
  }, [fetchSubscribers, fetchCampaigns]);

  const createCampaign = async () => {
    if (!formData.subject || !formData.content) {
      showToast('Please fill in subject and content', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        showToast('Campaign created successfully', 'success');
        setShowCreateModal(false);
        resetForm();
        fetchCampaigns();
      } else {
        showToast(data.error || 'Failed to create campaign', 'error');
      }
    } catch (error) {
      showToast('Failed to create campaign', 'error');
    }
  };

  const sendCampaign = async (campaignId) => {
    if (!confirm(`Send this newsletter to ${stats.total_subscribers} subscribers?`)) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Newsletter sent to ${data.data.sent_count} subscribers`, 'success');
        fetchCampaigns();
      } else {
        showToast(data.error || 'Failed to send campaign', 'error');
      }
    } catch (error) {
      showToast('Failed to send newsletter', 'error');
    } finally {
      setSending(false);
      setShowSendModal(false);
    }
  };

  const deleteSubscriber = async (email) => {
    if (!confirm(`Remove ${email} from newsletter?`)) return;
    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/subscribers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        showToast('Subscriber removed', 'success');
        fetchSubscribers();
      }
    } catch (error) {
      showToast('Failed to remove subscriber', 'error');
    }
  };

  const exportSubscribers = async () => {
    try {
      const token = localStorage.getItem('imali_token');
      const response = await fetch(`${apiBase}/api/admin/newsletter/subscribers/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Export started', 'success');
    } catch (error) {
      showToast('Failed to export', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      content: '',
      segment: 'all',
      schedule_date: null
    });
    setSelectedCampaign(null);
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaUsers className="mx-auto mb-2 text-xl text-blue-400" />
          <div className="text-2xl font-bold text-white">{stats.total_subscribers}</div>
          <div className="text-xs text-white/50">Subscribers</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaMailBulk className="mx-auto mb-2 text-xl text-emerald-400" />
          <div className="text-2xl font-bold text-white">{stats.campaigns_sent}</div>
          <div className="text-xs text-white/50">Campaigns Sent</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaChartLine className="mx-auto mb-2 text-xl text-purple-400" />
          <div className="text-2xl font-bold text-white">{stats.avg_open_rate}%</div>
          <div className="text-xs text-white/50">Open Rate</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaChartLine className="mx-auto mb-2 text-xl text-amber-400" />
          <div className="text-2xl font-bold text-white">{stats.avg_click_rate}%</div>
          <div className="text-xs text-white/50">Click Rate</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <FaEnvelope className="mx-auto mb-2 text-xl text-cyan-400" />
          <div className="text-2xl font-bold text-white">{stats.active_subscribers}</div>
          <div className="text-xs text-white/50">Active</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'subscribers' 
              ? 'border-b-2 border-emerald-500 text-emerald-400' 
              : 'text-white/50 hover:text-white'
          }`}
        >
          <FaListOl className="inline mr-2" /> Subscribers
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'campaigns' 
              ? 'border-b-2 border-emerald-500 text-emerald-400' 
              : 'text-white/50 hover:text-white'
          }`}
        >
          <FaMailBulk className="inline mr-2" /> Campaigns
        </button>
      </div>

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={exportSubscribers}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
            >
              <FaCopy className="inline mr-2" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr className="text-left text-white/50">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Interest</th>
                  <th className="px-4 py-3">Subscribed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/40">No subscribers yet</td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.email} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">{sub.email}</td>
                      <td className="px-4 py-3">{sub.first_name || '-'}</td>
                      <td className="px-4 py-3">{sub.interest || 'all'}</td>
                      <td className="px-4 py-3 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${sub.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {sub.active ? 'Active' : 'Unsubscribed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deleteSubscriber(sub.email)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              <FaPlus /> New Campaign
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <FaMailBulk className="mx-auto mb-3 text-4xl text-white/30" />
                <p className="text-white/50">No campaigns yet</p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{campaign.subject}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          campaign.status === 'sent' ? 'bg-emerald-500/20 text-emerald-300' :
                          campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                        <span>Segment: {campaign.segment || 'all'}</span>
                        <span>• Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                        {campaign.sent_at && <span>• Sent: {new Date(campaign.sent_at).toLocaleDateString()}</span>}
                        {campaign.open_rate && <span>• Open Rate: {campaign.open_rate}%</span>}
                      </div>
                      <div className="mt-2 text-sm text-white/70 line-clamp-2">
                        {campaign.content?.substring(0, 150)}...
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setShowSendModal(true);
                        }}
                        disabled={campaign.status === 'sent'}
                        className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5 disabled:opacity-50"
                        title={campaign.status === 'sent' ? 'Already sent' : 'Send Now'}
                      >
                        <FaSend className="text-green-400" />
                      </button>
                      <button
                        onClick={() => {
                          setFormData({
                            subject: campaign.subject,
                            content: campaign.content,
                            segment: campaign.segment || 'all',
                            schedule_date: null
                          });
                          setSelectedCampaign(campaign);
                          setShowCreateModal(true);
                        }}
                        className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5"
                        title="Edit"
                      >
                        <FaEdit className="text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Create/Edit Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                {selectedCampaign ? "Edit Campaign" : "Create Newsletter Campaign"}
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
                <label className="mb-1 block text-sm text-white/70">Subject *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Your newsletter subject"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Segment</label>
                <select
                  value={formData.segment}
                  onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white"
                >
                  <option value="all">All Subscribers</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive (>30 days)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your newsletter content here. Supports HTML."
                  rows={12}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createCampaign}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500"
                >
                  <FaSave className="inline mr-2" />
                  {selectedCampaign ? "Save Changes" : "Save as Draft"}
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

      {/* Send Confirmation Modal */}
      {showSendModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6">
            <h3 className="mb-2 text-xl font-bold">Send Newsletter</h3>
            <p className="mb-4 text-white/60">
              Send "{selectedCampaign.subject}" to {stats.total_subscribers} subscribers?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => sendCampaign(selectedCampaign.id)}
                disabled={sending}
                className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50"
              >
                {sending ? <FaSpinner className="mx-auto animate-spin" /> : <FaSend className="inline mr-2" />}
                {sending ? "Sending..." : "Send Now"}
              </button>
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 rounded-lg border border-white/10 py-2 hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}