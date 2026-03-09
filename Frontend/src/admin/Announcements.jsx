// src/admin/Announcements.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

export default function Announcements({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_users: '',
    scheduled_date: ''
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/announcements');
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        target_users: formData.target_users ? formData.target_users.split(',').map(u => u.trim()) : []
      };
      await handleAction('/api/admin/announcements', 'POST', payload, 'Create Announcement');
      setShowForm(false);
      setFormData({ title: '', content: '', priority: 'normal', target_users: '', scheduled_date: '' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📢</span> Announcements
          </h3>
          <p className="text-sm text-white/50">Create and manage platform announcements</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h4 className="font-semibold mb-4">Create New Announcement</h4>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows="4"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Target Users (comma separated)</label>
                <input
                  type="text"
                  value={formData.target_users}
                  onChange={(e) => setFormData({ ...formData, target_users: e.target.value })}
                  placeholder="user@example.com, user2@example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busyAction === 'Create Announcement'}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {busyAction === 'Create Announcement' ? 'Creating...' : 'Publish Announcement'}
            </button>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/40">
            No announcements yet
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{announcement.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority}
                    </span>
                    {announcement.scheduled_time && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                    <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                    {announcement.scheduled_time && (
                      <span>Schedule: {new Date(announcement.scheduled_time).toLocaleString()}</span>
                    )}
                    {announcement.target_users?.length > 0 && (
                      <span>Targeted: {announcement.target_users.length} users</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  announcement.read_by?.length > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {announcement.read_by?.length || 0} read
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
