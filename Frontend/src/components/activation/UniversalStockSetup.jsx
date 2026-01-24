// src/components/activation/StockUniverseSetup.jsx
import React, { useState } from "react";

export default function StockUniverseSetup({ email }) {
  const [mode, setMode] = useState("fixed"); // "fixed" | "auto"
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);
  const [minPrice, setMinPrice] = useState(5);
  const [minDollarVol, setMinDollarVol] = useState(5_000_000);
  const [blacklist, setBlacklist] = useState("OTC");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    
    // Simulate API call
    setTimeout(() => {
      console.log("Saving stock universe settings:", {
        email,
        mode,
        symbols: mode === "fixed" ? symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) : [],
        autoCount,
        minPrice,
        minDollarVol,
        blacklist: blacklist.split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
      });
      
      setSaving(false);
      setStatus("Settings saved locally (backend integration coming soon)");
      
      // Clear status after 3 seconds
      setTimeout(() => setStatus(""), 3000);
    }, 800);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <h3 className="text-lg font-bold mb-2">Stocks: Symbols or Top Movers</h3>
      
      <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
        ⚠️ Stock universe configuration is currently stored locally. 
        Backend integration will be available in a future update.
      </div>

      <div className="flex gap-3 mb-4">
        <button
          className={`px-3 py-2 rounded-xl border transition-colors ${
            mode === "fixed" 
              ? "bg-white/10 border-white/30" 
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
          onClick={() => setMode("fixed")}
          type="button"
        >
          Pick Symbols
        </button>
        <button
          className={`px-3 py-2 rounded-xl border transition-colors ${
            mode === "auto" 
              ? "bg-white/10 border-white/30" 
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
          onClick={() => setMode("auto")}
          type="button"
        >
          Auto-pick Top Movers
        </button>
      </div>

      {mode === "fixed" ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm text-gray-300">Symbols (comma separated)</span>
            <input
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="SPY,QQQ,AAPL"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </label>
          <p className="text-xs text-gray-400">Tip: start with 3–5 liquid tickers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-300">How many symbols (top N)</span>
            <input
              type="number"
              min={5}
              max={100}
              value={autoCount}
              onChange={(e) => setAutoCount(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min price ($)</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min dollar volume (daily)</span>
            <input
              type="number"
              min={100000}
              step={100000}
              value={minDollarVol}
              onChange={(e) => setMinDollarVol(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-300">Blacklist (tickers or tags, comma separated)</span>
            <input
              value={blacklist}
              onChange={(e) => setBlacklist(e.target.value)}
              placeholder="OTC,LOWFLOAT"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </label>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          type="button"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            "Save Settings"
          )}
        </button>
        
        {status && (
          <div className={`text-sm ${status.includes("saved") ? "text-emerald-300" : "text-amber-200"}`}>
            {status}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="text-sm font-semibold mb-2">Preview</h4>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Mode: <span className="text-gray-300">{mode}</span></div>
          {mode === "fixed" ? (
            <div>Symbols: <span className="text-gray-300">{symbols || "None"}</span></div>
          ) : (
            <>
              <div>Auto-pick top <span className="text-gray-300">{autoCount}</span> movers</div>
              <div>Filters: Price ≥${minPrice}, Volume ≥${minDollarVol.toLocaleString()}</div>
              <div>Blacklist: <span className="text-gray-300">{blacklist || "None"}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
