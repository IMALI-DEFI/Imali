import React from "react";
import { Link } from "react-router-dom";

const NEXT_TIER = {
  starter: "pro",
  pro: "elite",
  elite: "bundle",
};

export default function TierNudge({ tier }) {
  const next = NEXT_TIER[tier];
  if (!next) return null;

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
      <div className="font-semibold text-amber-300">
        🎯 You’re 1 feature away from {next.toUpperCase()}
      </div>
      <div className="text-slate-300 mt-1">
        Unlock deeper analytics, faster execution, and more control.
      </div>
      <Link
        to="/pricing"
        className="inline-block mt-3 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold"
      >
        View Upgrade
      </Link>
    </div>
  );
}
