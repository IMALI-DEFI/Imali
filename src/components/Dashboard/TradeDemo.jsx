import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function TradeDemo() {
  const [pnl, setPnl] = useState(0);
  const [showUpsell, setShowUpsell] = useState(false);

  // simulate demo PnL updates (replace with real demo feed if available)
  useEffect(() => {
    const id = setInterval(() => {
      setPnl((p) => {
        const next = p + Math.random() * 15;
        if (next > 50) setShowUpsell(true);
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-xl bg-black text-white p-4">
      <div className="text-sm text-slate-400">Demo Trading</div>
      <div className="text-2xl font-bold mt-2">PnL: ${pnl.toFixed(2)}</div>

      {showUpsell && (
        <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
          <div className="font-semibold text-emerald-300">
            🚀 Your demo is profitable
          </div>
          <div className="text-sm text-slate-300 mt-1">
            Go live to capture real profits with the same strategy.
          </div>
          <Link
            to="/pricing"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
          >
            Upgrade to Go Live
          </Link>
        </div>
      )}
    </div>
  );
}
