// src/admin/FeeDistributor.jsx (gamified)
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function FeeDistributor() {
  const [bps, setBps] = useState("");
  const [recipient, setRecipient] = useState("");

  return (
    <GamifiedShell
      title="Fee Distributor"
      subtitle="Adjust fees and distribution routes."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-3">Set Fee BPS</h3>
          <div className="flex gap-2">
            <input
              placeholder="e.g., 300"
              value={bps}
              onChange={(e) => setBps(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10"
            />
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Save
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-3">Set Recipient</h3>
          <div className="flex gap-2">
            <input
              placeholder="0xRecipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10"
            />
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Save
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 text-xs text-white/60">
        Connect to FeesAPI.setFeeBps / setRecipient.
      </div>
    </GamifiedShell>
  );
}
