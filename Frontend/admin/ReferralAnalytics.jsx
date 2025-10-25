// src/admin/ReferralAnalytics.jsx (gamified)
import React from "react";
import GamifiedShell from "./_GamifiedShell";

export default function ReferralAnalytics() {
  return (
    <GamifiedShell
      title="Referral Analytics"
      subtitle="Track referrals, conversion, and top partners."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Referrals", value: "532" },
          { label: "30d Conversions", value: "129" },
          { label: "Top Partner Rev", value: "$4,920" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-white/60">{kpi.label}</div>
            <div className="text-2xl font-bold mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
        Add charts/tables here (e.g. Recharts) hooked to your backend.
      </div>
    </GamifiedShell>
  );
}
