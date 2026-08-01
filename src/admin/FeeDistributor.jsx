// src/admin/FeeDistributor.jsx
import React, { useState } from "react";
import GamifiedShell from "./_GamifiedShell";

export default function FeeDistributor() {
  const [bps, setBps] = useState("");
  const [recipient, setRecipient] = useState("");

  return (
    <GamifiedShell
      title="Fee Control Nexus"
      subtitle="Route protocol rewards. Power the IMALI economy."
    >
      {/* ECONOMY OVERVIEW */}
      <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5">
        <h3 className="font-semibold mb-2">🎖️ Why This Matters</h3>
        <p className="text-sm text-white/70 leading-relaxed">
          Fees collected here directly fuel the IMALI ecosystem.
          They determine how value flows between <b>players</b>, <b>NFT holders</b>,
          and <b>token supply mechanics</b>.
        </p>
        <ul className="mt-3 text-sm text-white/60 space-y-1 list-disc list-inside">
          <li>NFT holders benefit from protocol growth & buybacks</li>
          <li>Burns reduce supply, increasing scarcity</li>
          <li>Wallet payouts reward performance & participation</li>
        </ul>
      </div>

      {/* CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FEE BPS */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-1">⚙️ Protocol Fee (BPS)</h3>
          <p className="text-xs text-white/50 mb-3">
            100 BPS = 1%. Fees power buybacks, burns, and NFT rewards.
          </p>
          <div className="flex gap-2">
            <input
              placeholder="e.g. 300 (3%)"
              value={bps}
              onChange={(e) => setBps(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10"
            />
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Lock In
            </button>
          </div>
        </div>

        {/* RECIPIENT */}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h3 className="font-semibold mb-1">🎯 Reward Vault</h3>
          <p className="text-xs text-white/50 mb-3">
            Destination wallet for routed fees (treasury, distributor, DAO).
          </p>
          <div className="flex gap-2">
            <input
              placeholder="0xRecipientAddress"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10"
            />
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Assign
            </button>
          </div>
        </div>
      </div>

      {/* NFT VALUE */}
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <h3 className="font-semibold mb-2">🧬 NFT Utility Layer</h3>
        <p className="text-sm text-white/70 leading-relaxed">
          IMALI NFTs are not cosmetic. They are <b>economic amplifiers</b>.
        </p>
        <ul className="mt-3 text-sm text-white/60 space-y-1 list-disc list-inside">
          <li>Fee-boost multipliers on staking & trading rewards</li>
          <li>Priority access to new bots & strategies</li>
          <li>Governance weight over fee routing decisions</li>
          <li>Long-term value from buyback-powered demand</li>
        </ul>
      </div>

      <div className="mt-4 text-xs text-white/50">
        Hooks into <code>FeesAPI.setFeeBps</code> and <code>setRecipient</code>.  
        Changes affect live protocol economics.
      </div>
    </GamifiedShell>
  );
}
