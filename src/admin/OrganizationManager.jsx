// src/admin/OrganizationManager.jsx
import React, { useState, useEffect } from 'react';

export default function OrganizationManager({ apiBase, showToast }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/organizations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('imali_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data.organizations || []);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  if (loading) return <div className="text-center py-8">Loading organizations...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">All Organizations</h3>
      {organizations.length === 0 ? (
        <p className="text-white/50 text-center py-8">No organizations yet</p>
      ) : (
        <div className="grid gap-4">
          {organizations.map(org => (
            <div key={org.id} className="border border-white/10 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{org.name}</h4>
                  <p className="text-sm text-white/60">ID: {org.id}</p>
                  <p className="text-sm text-white/60">Members: {org.member_count || 0}</p>
                  <p className="text-sm text-white/60">Created: {new Date(org.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrg(org)}
                  className="px-3 py-1 bg-blue-600 rounded-lg text-sm hover:bg-blue-500"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}