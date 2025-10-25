import React from "react";

export default function RecentTradesTable() {
  const rows = [
    { t: "ETH/USDC", side: "BUY",  qty: 0.2, price: 3500, ts: "2m" },
    { t: "MATIC/USDT", side: "SELL", qty: 200, price: 0.72, ts: "5m" },
    { t: "BASE/USDC", side: "BUY",  qty: 50, price: 1.42, ts: "9m" },
  ];
  return (
    <div>
      <div className="text-lg font-semibold mb-3">Recent Trades</div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left">Pair</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-white/0 even:bg-white/5">
                <td className="px-3 py-2">{r.t}</td>
                <td className="px-3 py-2">{r.side}</td>
                <td className="px-3 py-2 text-right">{r.qty}</td>
                <td className="px-3 py-2 text-right">${r.price}</td>
                <td className="px-3 py-2 text-right">{r.ts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
