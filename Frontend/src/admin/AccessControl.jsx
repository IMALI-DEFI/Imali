// src/admin/AccessControl.jsx (gamified)
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function AccessControl() {
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("admin");

  return (
    <GamifiedShell
      title="Access Control"
      subtitle="Grant or revoke elevated permissions."
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="p-3 rounded-xl bg-black/40 border border-white/10"
          />
          <select
            className="p-3 rounded-xl bg-black/40 border border-white/10"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="analyst">Analyst</option>
          </select>
          <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">
            Grant
          </button>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold">
            Revoke
          </button>
        </div>
        <div className="mt-3 text-xs text-white/60">
          Connect to your contract's role-based access control or backend.
        </div>
      </div>
    </GamifiedShell>
  );
}
