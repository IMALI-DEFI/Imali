// src/components/Dashboard/TierStatus.jsx
import React from "react";

const TIERS = {
  Starter: {
    color: "bg-gray-500",
    perks: ["Basic staking access", "Referral rewards"],
  },
  Pro: {
    color: "bg-blue-600",
    perks: ["Boosted APY", "Yield farming access", "Royalties"],
  },
  Elite: {
    color: "bg-yellow-500",
    perks: ["Highest APY boost", "All perks unlocked", "DAO voting"],
  },
};

export default function TierStatus({ userData, onUpgrade }) {
  const tier = userData?.tier || "Starter";
  const info = TIERS[tier] || TIERS.Starter;

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-black/30 text-white">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">
          Current Tier:{" "}
          <span
            className={`px-2 py-1 text-sm rounded-lg font-semibold ${info.color}`}
          >
            {tier}
          </span>
        </h3>

        {/* Upgrade button (hide for Elite) */}
        {tier !== "Elite" && (
          <button
            onClick={() => onUpgrade?.(tier === "Starter" ? "Pro" : "Elite")}
            className="px-3 py-1 text-xs font-semibold bg-emerald-600/70 hover:bg-emerald-600 rounded-lg border border-emerald-400/50"
          >
            Upgrade →
          </button>
        )}
      </div>

      {/* Profit share info */}
      <div className="text-sm text-white/80 mb-3">
        Profit Share: <b>{userData?.profitShareRate ?? 30}%</b>
        <br />
        Profit Cap: <b>${userData?.profitCap ?? 100}</b>
      </div>

      {/* Perks list */}
      <div>
        <h4 className="text-sm font-semibold mb-1">Perks:</h4>
        <ul className="list-disc list-inside text-sm text-white/70">
          {info.perks.map((perk, idx) => (
            <li key={idx}>{perk}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
