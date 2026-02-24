// src/admin/TokenManagement.jsx (gamified)
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function TokenManagement() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <GamifiedShell
      title="Token Management"
      subtitle="Mint/burn and administrative token actions."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-3">Mint</h3>
          <input
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 mb-2"
            placeholder="Recipient (0x...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 mb-3"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">
            Mint
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-3">Burn</h3>
          <input
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 mb-2"
            placeholder="Address (0x...)"
          />
          <input
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10 mb-3"
            placeholder="Amount"
          />
          <button className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold">
            Burn
          </button>
        </div>
      </div>
      <div className="mt-4 text-xs text-white/60">
        Wire these buttons to your contract calls or Admin API.
      </div>
    </GamifiedShell>
  );
}
