import React from "react";

export default function ExchangeConnections() {
  const items = [
    { name: "OKX", tier: "Pro+" },
    { name: "Coinbase", tier: "Elite" },
    { name: "Binance", tier: "Elite" },
  ];
  return (
    <div>
      <div className="text-lg font-semibold mb-3">Exchange Connections</div>
      <div className="space-y-2">
        {items.map((x) => (
          <div key={x.name} className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{x.name}</div>
              <div className="text-xs text-white/70">Available on {x.tier}</div>
            </div>
            <button className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 text-sm">Connect</button>
          </div>
        ))}
      </div>
    </div>
  );
}
