import React, { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULTS = {
  profile: "aggressive",
  minScore: 65,
  minConfidence: 70,
  rsi15Min: 35,
  rsi15Max: 72,
  requireRsi15Rising: true,
  volume15Min: 0.50,
  rsi1Min: 20,
  rsi1Max: 50,
  requireRsi1Rising: true,
  macd1Improving: true,
  macd1BullishCross: false,
  volume1Min: 0.15,
  broadMarketGuard: true,
  tokenMarketOverride: true,
  minQuoteVolume15m: 25000,
  max1mAgeSeconds: 180,
  maxOpenPositions: 8,
  stopLossPct: 0.025,
  takeProfitPct: 0.03,
  trailingArmPct: 0.0075,
  trailingDropPct: 0.0125,
  profitLockNetPct: 0.0015,
};

const PRESETS = {
  conservative: { ...DEFAULTS, profile: "conservative", minScore: 75, minConfidence: 78, rsi15Min: 40, volume15Min: 0.9, rsi1Min: 28, rsi1Max: 48, volume1Min: 0.8, maxOpenPositions: 3 },
  balanced: { ...DEFAULTS, profile: "balanced", minScore: 70, minConfidence: 74, rsi15Min: 36, volume15Min: 0.65, rsi1Min: 24, rsi1Max: 52, volume1Min: 0.45, maxOpenPositions: 5 },
  aggressive: { ...DEFAULTS },
  very_aggressive: { ...DEFAULTS, profile: "very_aggressive", minScore: 58, minConfidence: 64, rsi15Min: 25, requireRsi15Rising: false, volume15Min: 0.30, rsi1Min: 15, rsi1Max: 55, volume1Min: 0.10, maxOpenPositions: 8 },
};

const NumericField = ({ label, value, onChange, min, max, step = "0.01", help }) => (
  <label className="block">
    <span className="text-sm font-medium text-white/85">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-emerald-400/60"
    />
    {help && <span className="mt-1 block text-xs text-white/40">{help}</span>}
  </label>
);

const Toggle = ({ label, checked, onChange, help }) => (
  <label className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3">
    <div>
      <div className="text-sm font-medium text-white/85">{label}</div>
      {help && <div className="mt-1 text-xs text-white/40">{help}</div>}
    </div>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-emerald-500" />
  </label>
);

export default function TradingStrategyControl({ apiBase, showToast }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState(null);

  const token = () => localStorage.getItem("imali_token") || sessionStorage.getItem("imali_token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/trading-strategy`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to load strategy settings");
      setSettings({ ...DEFAULTS, ...(data.settings || {}) });
      setMeta(data.meta || null);
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const applyPreset = (name) => {
    setSettings({ ...PRESETS[name], profile: name });
    showToast?.(`${name.replace("_", " ")} profile loaded — Save Changes to apply.`, "info");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/trading-strategy`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSettings({ ...DEFAULTS, ...(data.settings || settings) });
      setMeta(data.meta || null);
      showToast?.("Trading strategy settings saved.", "success");
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const rollback = async () => {
    if (!window.confirm("Restore the previous saved trading-strategy configuration?")) return;
    try {
      const res = await fetch(`${apiBase}/api/admin/trading-strategy/rollback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rollback failed");
      setSettings({ ...DEFAULTS, ...(data.settings || {}) });
      setMeta(data.meta || null);
      showToast?.("Previous strategy configuration restored.", "success");
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  const riskLabel = useMemo(() => {
    if (settings.profile === "very_aggressive") return "Very Aggressive";
    if (settings.profile === "aggressive") return "Aggressive";
    if (settings.profile === "balanced") return "Balanced";
    return "Conservative";
  }, [settings.profile]);

  if (loading) return <div className="py-16 text-center text-white/60">Loading trading strategy settings…</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Active Strategy Controls</div>
            <div className="text-sm text-white/55">Current profile: <span className="font-semibold text-emerald-300">{riskLabel}</span></div>
            {meta?.updatedAt && <div className="mt-1 text-xs text-white/35">Last saved {new Date(meta.updatedAt).toLocaleString()}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} onClick={() => applyPreset(name)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10">
                {name.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Qualification</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumericField label="Minimum score" value={settings.minScore} onChange={(v) => update("minScore", v)} min={1} max={100} step="1" />
          <NumericField label="Minimum confidence" value={settings.minConfidence} onChange={(v) => update("minConfidence", v)} min={1} max={100} step="1" />
          <NumericField label="Maximum open positions" value={settings.maxOpenPositions} onChange={(v) => update("maxOpenPositions", v)} min={1} max={20} step="1" />
          <NumericField label="15m minimum quote volume" value={settings.minQuoteVolume15m} onChange={(v) => update("minQuoteVolume15m", v)} min={0} max={10000000} step="1000" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">15-minute setup</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumericField label="15m RSI minimum" value={settings.rsi15Min} onChange={(v) => update("rsi15Min", v)} min={0} max={100} step="1" />
          <NumericField label="15m RSI maximum" value={settings.rsi15Max} onChange={(v) => update("rsi15Max", v)} min={0} max={100} step="1" />
          <NumericField label="15m volume ratio minimum" value={settings.volume15Min} onChange={(v) => update("volume15Min", v)} min={0} max={5} step="0.05" />
          <Toggle label="15m RSI must be rising" checked={settings.requireRsi15Rising} onChange={(v) => update("requireRsi15Rising", v)} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">1-minute execution</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumericField label="1m RSI minimum" value={settings.rsi1Min} onChange={(v) => update("rsi1Min", v)} min={0} max={100} step="1" />
          <NumericField label="1m RSI maximum" value={settings.rsi1Max} onChange={(v) => update("rsi1Max", v)} min={0} max={100} step="1" />
          <NumericField label="1m volume ratio minimum" value={settings.volume1Min} onChange={(v) => update("volume1Min", v)} min={0} max={5} step="0.05" />
          <Toggle label="1m RSI must be rising" checked={settings.requireRsi1Rising} onChange={(v) => update("requireRsi1Rising", v)} />
          <Toggle label="MACD must be improving" checked={settings.macd1Improving} onChange={(v) => update("macd1Improving", v)} />
          <Toggle label="Require recent MACD bullish cross" checked={settings.macd1BullishCross} onChange={(v) => update("macd1BullishCross", v)} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Market & data guards</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Toggle label="BTC / broad-market weakness guard" checked={settings.broadMarketGuard} onChange={(v) => update("broadMarketGuard", v)} />
          <Toggle label="Allow strong-token market override" checked={settings.tokenMarketOverride} onChange={(v) => update("tokenMarketOverride", v)} />
          <NumericField label="Maximum 1m candle age (seconds)" value={settings.max1mAgeSeconds} onChange={(v) => update("max1mAgeSeconds", v)} min={30} max={900} step="10" />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Exit / profit protection</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <NumericField label="Stop loss" value={settings.stopLossPct} onChange={(v) => update("stopLossPct", v)} min={0.001} max={0.25} step="0.001" help="0.025 = 2.5%" />
          <NumericField label="Take profit" value={settings.takeProfitPct} onChange={(v) => update("takeProfitPct", v)} min={0.001} max={1} step="0.001" help="0.03 = 3%" />
          <NumericField label="Trailing arm" value={settings.trailingArmPct} onChange={(v) => update("trailingArmPct", v)} min={0.001} max={0.25} step="0.001" />
          <NumericField label="Trailing drop" value={settings.trailingDropPct} onChange={(v) => update("trailingDropPct", v)} min={0.001} max={0.25} step="0.001" />
          <NumericField label="Net profit-lock floor" value={settings.profitLockNetPct} onChange={(v) => update("profitLockNetPct", v)} min={0} max={0.1} step="0.0005" />
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
        <button onClick={rollback} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20">Rollback Previous</button>
        <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Reload</button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
