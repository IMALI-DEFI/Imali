// src/admin/SupportTickets.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAdmin from '../hooks/useAdmin';

export default function SupportTickets({ apiBase, showToast, handleAction, busyAction }) {
  const { adminFetch } = useAdmin();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState('open');

  const fetchTickets = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/support/tickets');
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      await handleAction(`/api/admin/support/tickets/${ticketId}/status`, 'PUT', { status }, 'Update Status');
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      await handleAction(`/api/admin/support/tickets/${selectedTicket.id}/messages`, 'POST', { 
        message: replyText,
        is_admin: true 
      }, 'Send Reply');
      setReplyText('');
      // Refresh ticket details
      const updated = await adminFetch(`/api/admin/support/tickets/${selectedTicket.id}`);
      setSelectedTicket(updated.ticket);
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);

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
            <span>🎫</span> Support Tickets
          </h3>
          <p className="text-sm text-white/50">Manage customer support requests</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={fetchTickets}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tickets List */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[600px] overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              No tickets found
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium truncate">{ticket.subject}</div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    ticket.status === 'open' ? 'bg-green-500/20 text-green-300' :
                    ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300' :
                    ticket.status === 'resolved' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span>{ticket.user_email || 'Unknown'}</span>
                  <span>•</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Ticket Details */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 h-[600px] overflow-y-auto">
          {!selectedTicket ? (
            <div className="h-full flex items-center justify-center text-white/40">
              Select a ticket to view details
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{selectedTicket.subject}</h4>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs"
                  disabled={busyAction}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="text-xs text-white/40">
                From: {selectedTicket.user_email} • Created: {new Date(selectedTicket.created_at).toLocaleString()}
              </div>

              {/* Messages */}
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {selectedTicket.messages?.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-lg ${
                    msg.is_admin 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 ml-8' 
                      : 'bg-white/5 border border-white/10 mr-8'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.is_admin ? 'Admin' : msg.user_email || 'User'}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-4 border-t border-white/10">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows="3"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  disabled={sendingReply}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingReply ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      'Send Reply'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
