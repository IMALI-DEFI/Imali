import React, { useState } from "react";

// IMALI Partner Program earnings calculator (2026-11-17).
// Terms match the backend (services/referral-partner-service.js): 25% for 12 months.
const RATE = 0.25;
const MONTHS = 12;
const PLANS = [
  { key: "pro", label: "Pro", price: 19.95 },
  { key: "elite", label: "Elite", price: 49 },
];
const money = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function PartnerEarningsCalculator({ className = "", dark = false }) {
  const t = dark
    ? { wrap: "border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-white/5", kick: "text-emerald-300", h: "text-white", p: "text-white/60", off: "border-white/15 bg-white/5 text-white/80 hover:border-emerald-400", tile: "bg-white/5", tl: "text-white/50", num: "text-emerald-300", lab: "text-white", foot: "text-white/40" }
    : { wrap: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white", kick: "text-emerald-700", h: "text-gray-900", p: "text-gray-600", off: "border-gray-200 bg-white text-gray-700 hover:border-emerald-400", tile: "bg-white shadow-sm", tl: "text-gray-500", num: "text-emerald-700", lab: "text-gray-800", foot: "text-gray-500" };
  const [plan, setPlan] = useState("elite");
  const [count, setCount] = useState(25);
  const price = (PLANS.find((p) => p.key === plan) || PLANS[1]).price;
  const monthly = count * price * RATE;
  const yearly = monthly * MONTHS;

  return (
    <div className={`rounded-3xl border ${t.wrap} p-6 text-left shadow-sm ${className}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${t.kick}`}>Partner earnings calculator</p>
      <h3 className={`mt-1 text-2xl font-extrabold ${t.h}`}>See what you could earn</h3>
      <p className={`mt-1 text-sm ${t.p}`}>
        Earn 25% of every IMALI plan your referrals buy, every month, for up to 12 months.
      </p>

      <div className="mt-5 flex gap-2">
        {PLANS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPlan(p.key)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              plan === p.key
                ? "border-emerald-600 bg-emerald-600 text-white"
                : t.off
            }`}
          >
            {p.label} · ${p.price}/mo
          </button>
        ))}
      </div>

      <label className={`mt-5 block text-sm font-semibold ${t.lab}`} htmlFor="imali-partner-count">
        Paid referrals: <span className={t.num}>{count}</span>
      </label>
      <input
        id="imali-partner-count"
        type="range"
        min="1"
        max="200"
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        className="mt-2 w-full accent-emerald-600"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className={`rounded-2xl ${t.tile} p-4 text-center`}>
          <p className={`text-xs ${t.tl}`}>Per month</p>
          <p className={`text-2xl font-extrabold ${t.num}`}>{money(monthly)}</p>
        </div>
        <div className={`rounded-2xl ${t.tile} p-4 text-center`}>
          <p className={`text-xs ${t.tl}`}>Over 12 months</p>
          <p className={`text-2xl font-extrabold ${t.num}`}>{money(yearly)}</p>
        </div>
      </div>

      <p className={`mt-4 text-xs ${t.foot}`}>
        Example only, not a guarantee. Earnings depend on how many people you refer and how long they stay
        subscribed. Commissions apply to eligible paid plans and follow the partner-program terms.
      </p>
    </div>
  );
}
