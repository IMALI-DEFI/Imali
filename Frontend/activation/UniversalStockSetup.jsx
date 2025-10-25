// src/components/activation/StockUniverseSetup.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8001";

export default function StockUniverseSetup({ email }) {
  const [mode, setMode] = useState("fixed"); // "fixed" | "auto"
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);     // top N movers
  const [minPrice, setMinPrice] = useState(5);        // filter junk
  const [minDollarVol, setMinDollarVol] = useState(5_000_000); // 5m$+
  const [blacklist, setBlacklist] = useState("OTC");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // optionally fetch existing settings to prefill
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/activation/stock-setup`, { params: { email } });
        if (data?.mode) setMode(data.mode);
        if (data?.symbols) setSymbols(data.symbols.join(","));
        if (data?.autoCount) setAutoCount(data.autoCount);
        if (data?.minPrice) setMinPrice(data.minPrice);
        if (data?.minDollarVol) setMinDollarVol(data.minDollarVol);
        if (data?.blacklist?.length) setBlacklist(data.blacklist.join(","));
      } catch {}
    })();
  }, [email]);

  const onSave = async () => {
    setSaving(true); setErr(""); setOk(false);
    try {
      const payload = {
        email,
        mode,
        symbols: symbols.split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
        autoCount: Number(autoCount),
        minPrice: Number(minPrice),
        minDollarVol: Number(minDollarVol),
        blacklist: blacklist.split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
      };
      await axios.post(`${API_BASE}/activation/stock-setup`, payload);
      setOk(true);
      setTimeout(()=>setOk(false), 2000);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <h3 className="text-lg font-bold mb-2">Stocks: Symbols or Top Movers</h3>

      <div className="flex gap-3 mb-4">
        <button
          className={`px-3 py-2 rounded-xl border ${mode==="fixed" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}
          onClick={() => setMode("fixed")}
        >
          Pick Symbols
        </button>
        <button
          className={`px-3 py-2 rounded-xl border ${mode==="auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}
          onClick={() => setMode("auto")}
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
              onChange={e=>setSymbols(e.target.value)}
              placeholder="SPY,QQQ,AAPL"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
          <p className="text-xs text-gray-400">Tip: start with 3-5 liquid tickers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-300">How many symbols (top N)</span>
            <input type="number" min={5} max={100} value={autoCount} onChange={e=>setAutoCount(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min price ($)</span>
            <input type="number" min={1} value={minPrice} onChange={e=>setMinPrice(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min dollar volume (daily)</span>
            <input type="number" min={100000} step={100000} value={minDollarVol} onChange={e=>setMinDollarVol(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-300">Blacklist (tickers or tags, comma separated)</span>
            <input value={blacklist} onChange={e=>setBlacklist(e.target.value)}
              placeholder="OTC,LOWFLOAT"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10" />
          </label>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button disabled={saving} onClick={onSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        {ok && <span className="text-emerald-300 text-sm">Saved ✓</span>}
        {err && <span className="text-red-300 text-sm">{err}</span>}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        You can change this later in the dashboard. Risk & max positions still apply.
      </div>
    </div>
  );
}
