import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const catalog = {
  ai_weighted: {
    id: "ai_weighted",
    title: "🤖 AI Weighted",
    desc: "Blend Momentum, Mean Reversion, and Volume with a quality score.",
    defaults: { momentumWeight: 0.4, meanRevWeight: 0.3, volumeWeight: 0.3, minScore: 0.65 },
  },
  momentum: { id: "momentum", title: "⚡ Momentum", desc: "Ride trends with trailing stops.", defaults: { lookback: 20, takeProfit: 0.08, stopLoss: 0.04 } },
  meanrev:  { id: "meanrev",  title: "🔁 Mean Reversion", desc: "Fade extremes back to fair value.", defaults: { z: 1.5, takeProfit: 0.05, stopLoss: 0.03 } },
  volume_spike: { id: "volume_spike", title: "📈 Volume Spike", desc: "Act on unusual volume bursts.", defaults: { window: 30, spike: 3 } },
};

export default function StrategySelector() {
  const [id, setId] = useState("ai_weighted");
  const [params, setParams] = useState(catalog["ai_weighted"].defaults);
  const navigate = useNavigate();

  const onChange = (k) => (e) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }));
  const save = () => {
    localStorage.setItem("imali_strategy", JSON.stringify({ id, params }));
    navigate("/dashboard");
  };

  const strategy = useMemo(() => catalog[id], [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-14 space-y-6">
        <h1 className="text-3xl font-bold">Choose Your Strategy</h1>
        <select
          className="rounded-lg bg-gray-900/60 border border-white/10 px-3 py-2"
          value={id}
          onChange={(e) => { setId(e.target.value); setParams(catalog[e.target.value].defaults); }}
        >
          {Object.values(catalog).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <p className="text-white/80">{strategy.desc}</p>

        <div className="rounded-xl bg-white/5 border border-white/10 p-6 space-y-4">
          {Object.entries(params).map(([k, v]) => (
            <label key={k} className="block">
              <span className="text-sm">{k}</span>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg bg-gray-900/60 border border-white/10 px-3 py-2"
                value={v}
                onChange={onChange(k)}
              />
            </label>
          ))}
        </div>

        <button onClick={save} className="rounded-lg bg-emerald-500/90 hover:bg-emerald-500 px-5 py-3 font-semibold">
          Save & Go to Dashboard
        </button>
      </div>
    </div>
  );
}
