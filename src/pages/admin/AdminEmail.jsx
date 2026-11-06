import React from 'react';
import { FaEnvelope, FaExclamationCircle } from 'react-icons/fa';

// No sample delivery figures: only show metrics after a verified backend integration.
const AdminEmail = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">Email Automation</h2>
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2"><FaExclamationCircle className="text-amber-400"/><strong>Live email reporting not connected</strong></div>
      <p className="text-sm text-white/70">Email sent, delivered, opened, clicked and subscriber totals are unavailable until the email provider and campaign event logs are connected. No sample counts are displayed.</p>
      <p className="text-sm text-white/70">Starter welcome and upgrade sequences are not verified as active. Do not rely on this page to confirm delivery.</p>
    </div>
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-3"><FaEnvelope className="text-purple-400"/><span>Verified campaign records: unavailable</span></div>
  </div>
);
export default AdminEmail;
