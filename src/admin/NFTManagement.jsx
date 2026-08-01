// src/admin/NFTManagement.jsx (gamified)
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function NFTManagement() {
  const [to, setTo] = useState("");
  const [tier, setTier] = useState("Starter");

  return (
    <GamifiedShell
      title="NFT Management"
      subtitle="Mint and manage membership NFTs."
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Recipient (0x...)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="p-3 rounded-xl bg-black/40 border border-white/10"
          />
          <select
            className="p-3 rounded-xl bg-black/40 border border-white/10"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            <option>Starter</option>
            <option>Pro</option>
            <option>Elite</option>
          </select>
          <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">
            Mint NFT
          </button>
        </div>
        <div className="mt-3 text-xs text-white/60">
          Wire to your NFT contract mint function or Admin API.
        </div>
      </div>
    </GamifiedShell>
  );
}
