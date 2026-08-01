import React from "react";

export default function ProfitCapAlert() {
  const enabled = JSON.parse(localStorage.getItem("imali_profit_cap_alert") || "true");
  if (!enabled) return null;
  return (
    <div className="rounded-xl bg-yellow-500/10 border border-yellow-300/30 p-4 text-sm">
      <div className="font-semibold">Demo vs Live Reminder</div>
      <div className="text-white/80">
        Demo results are hypothetical and may differ from live trading. Manage risk and start small.
      </div>
    </div>
  );
}
