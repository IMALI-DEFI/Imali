// src/admin/BuyBackDashboard.jsx (gamified)
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function BuyBackDashboard() {
  const [token, setToken] = useState("");
  const [amountUsd, setAmountUsd] = useState("");

  return (
    <GamifiedShell
      title="Buyback"
      subtitle="Execute buybacks via API or on-chain."
    >
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Token address (0x...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="p-3 rounded-xl bg-black/40 border border-white/10"
          />
          <input
            placeholder="Amount (USD)"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            className="p-3 rounded-xl bg-black/40 border border-white/10"
          />
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
            Run Buyback
          </button>
        </div>
        <div className="mt-3 text-xs text-white/60">
          Hook this to TreasuryAPI.runBuyback or your contract method.
        </div>
      </div>
    </GamifiedShell>
  );
}
