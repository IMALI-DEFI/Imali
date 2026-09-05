import React from "react";
import { useNavigate } from "react-router-dom";

export default function ExchangeConnections() {
  const navigate = useNavigate();

  const items = [
    { name: "OKX", tier: "Pro+" },
    { name: "Coinbase", tier: "Elite" },
    { name: "Binance", tier: "Elite" },
    {
      name: "Kalshi",
      tier: "Elite",
      route: "/connect-kalshi",
      description: "Prediction market intelligence • Read-only",
    },
  ];

  return (
    <div>
      <div className="text-lg font-semibold mb-3">Exchange Connections</div>

      <div className="space-y-2">
        {items.map((x) => (
          <div
            key={x.name}
            className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between gap-4"
          >
            <div>
              <div className="font-semibold">{x.name}</div>

              <div className="text-xs text-white/70">
                Available on {x.tier}
              </div>

              {x.description && (
                <div className="text-xs text-white/50 mt-1">
                  {x.description}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (x.route) {
                  navigate(x.route);
                }
              }}
              disabled={!x.route}
              className={`px-3 py-2 rounded-lg border text-sm ${
                x.route
                  ? "bg-white/10 border-white/10 hover:bg-white/15"
                  : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
              }`}
            >
              {x.name === "Kalshi" ? "Connect / Manage" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
