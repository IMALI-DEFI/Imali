// src/admin/DashboardOverview.jsx (gamified)
import React from "react";
import GamifiedShell from "./_GamifiedShell";

export default function DashboardOverview() {
  return (
    <GamifiedShell
      title="Overview"
      subtitle="Quick glance at KPIs, treasury and user growth."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Treasury Balance", value: "$1,234,567" },
          { label: "24h Volume", value: "$78,910" },
          { label: "Active Users", value: "1,204" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-white/60">{kpi.label}</div>
            <div className="text-2xl font-bold mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-white/60 text-xs">
        (Hook this up to your real APIs/data sources.)
      </div>
    </GamifiedShell>
  );
}
