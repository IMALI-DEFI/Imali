import React from 'react';
import SocialConnections from '../../components/admin/SocialConnections';
import { apiFetch } from '../../context/AuthContext';
const api = {
  get: path => apiFetch(path, { method: 'GET', credentials: 'include' }),
  post: (path, body) => apiFetch(path, { method: 'POST', credentials: 'include', body: JSON.stringify(body || {}) }),
};
export default function SocialConnectionsPage() {
  return <div className="max-w-6xl mx-auto px-6 py-10"><SocialConnections api={api} /></div>;
}
