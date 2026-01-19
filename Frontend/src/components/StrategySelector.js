import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveUserStrategy } from "../utils/firebase";
import { useWallet } from "../context/WalletContext";

/**
 * Gamified Strategy Selector (IDs match backend)
 * - IDs: ai_weighted, momentum, meanrev, volume_spike
 * - All strategies have slider params
 * - If wallet connected → save to backend; else → localStorage
 * - Then route to /demo
 */

const catalog = {
  ai_weighted: {
    id: "ai_weighted",
    title: "🤖 AI Weighted",
    desc:
      "Blend Momentum, Mean Reversion, and Volume. Set weights + a minimum quality score.",
    color: "from-indigo-500 to-purple-600",
    defaults: { momentumWeight: 0.4, meanRevWeight: 0.3, volumeWeight: 0.3, minScore: 0.65 },
    fields: [
      { key: "momentumWeight", label: "Momentum Weight", min: 0, max: 1, step: 0.05 },
      { key: "meanRevWeight", label: "MeanRev Weight", min: 0, max: 1, step: 0.05 },
      { key: "volumeWeight", label: "Volume Weight", min: 0, max: 1, step: 0.05 },
      { key: "minScore", label: "Min Score (0–1)", min: 0, max: 1, step: 0.01 },
    ],
  },
  momentum: {
    id: "momentum",
    title: "🚀 Momentum",
    desc: "Ride strong trends. Buys strength, cuts weakness.",
    color: "from-emerald-500 to-teal-600",
    defaults: { lookback: 30, threshold: 1.5, cooldown: 10 },
    fields: [
      { key: "lookback", label: "Lookback (bars)", min: 5, max: 200, step: 1 },
      { key: "threshold", label: "Z-Score Threshold", min: 0, max: 5, step: 0.1 },
      { key: "cooldown", label: "Cooldown (bars)", min: 0, max: 120, step: 1 },
    ],
  },
  meanrev: {
    id: "meanrev",
    title: "🔄 Mean Reversion",
    desc: "Buy dips / sell rips around a band. Calmer profile.",
    color: "from-sky-500 to-blue-600",
    defaults: { band: 2.0, maxHoldBars: 60, size: 1 },
    fields: [
      { key: "band", label: "Band (σ)", min: 0.5, max: 4, step: 0.1 },
      { key: "maxHoldBars", label: "Max Hold (bars)", min: 5, max: 240, step: 1 },
      { key: "size", label: "Position Size", min: 1, max: 10, step: 1 },
    ],
  },
  volume_spike: {
    id: "volume_spike",
    title: "📈 Volume Spike",
    desc: "Catch unusual activity / breakouts early.",
    color: "from-amber-500 to-orange-600",
    defaults: { window: 50, spikeMultiplier: 2.5, cooldown: 15 },
    fields: [
      { key: "window", label: "Window (bars)", min: 5, max: 200, step: 1 },
      { key: "spikeMultiplier", label: "Spike × Average", min: 1, max: 10, step: 0.1 },
      { key: "cooldown", label: "Cooldown (bars)", min: 0, max: 120, step: 1 },
    ],
  },
};

const StrategySelector = () => {
  const navigate = useNavigate();
  const { account } = useWallet();

  const [strategy, setStrategy] = useState("ai_weighted");
  const [params, setParams] = useState(catalog.ai_weighted.defaults);
  const [isSaving, setIsSaving] = useState(false);

  // 🔥 Intensity meter (for UI flair)
  const intensity = useMemo(() => {
    if (strategy === "ai_weighted") {
      const s =
        (params.momentumWeight ?? 0) * 0.45 +
        (params.volumeWeight ?? 0) * 0.35 +
        (params.meanRevWeight ?? 0) * 0.2;
      return Math.min(5, Math.max(1, Math.round(s * 5)));
    }
    if (strategy === "momentum") return 5;
    if (strategy === "volume_spike") return 4;
    if (strategy === "meanrev") return 2;
    return 3;
  }, [strategy, params]);

  const flames = "🔥".repeat(intensity) + " " + "🧊".repeat(Math.max(0, 5 - intensity));

  const handleSelect = (id) => {
    setStrategy(id);
    setParams(catalog[id].defaults || {});
  };

  const setField = (key, value) => setParams((p) => ({ ...p, [key]: value }));

  const saveAndGo = async () => {
    setIsSaving(true);
    try {
      const payload = { strategy, params };
      if (account) {
        await saveUserStrategy(account, payload);
      } else {
        localStorage.setItem("IMALI_STRATEGY_PREF", JSON.stringify(payload));
      }
      navigate("/demo");
    } catch (e) {
      console.error(e);
      alert("Could not save your strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const cardBase =
    "rounded-2xl border-2 p-5 cursor-pointer transition-all transform hover:scale-[1.02]";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-600 bg-clip-text text-transparent">
          Pick Your Strategy
        </h1>
        <p className="text-gray-500 mt-2">
          Choose a style. Tune intensity. We’ll use this in your demo.
        </p>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.values(catalog).map((s) => (
          <div
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={
              strategy === s.id
                ? `${cardBase} border-indigo-400 bg-gradient-to-br ${s.color} text-white shadow-lg`
                : `${cardBase} border-gray-200 hover:border-indigo-300 bg-white`
            }
          >
            <div className="text-lg font-bold mb-2">{s.title}</div>
            <p className={`text-sm ${strategy === s.id ? "text-indigo-100" : "text-gray-600"}`}>
              {s.desc}
            </p>
            {strategy === s.id && (
              <div className="mt-3 text-sm">
                <span className="opacity-80">Intensity:</span>{" "}
                <span className="font-semibold">{flames}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Param sliders */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-gray-50 to-indigo-50 p-5 mb-8">
        <h3 className="font-bold text-gray-800 mb-3">
          Tune {catalog[strategy].title.replace(/^[^ ]+ /, "")}
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {catalog[strategy].fields.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">{f.label}</label>
                <div className="text-xs font-semibold text-indigo-600">
                  {Number(params[f.key]).toFixed(f.step < 1 ? 2 : 0)}
                </div>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={params[f.key]}
                onChange={(e) => setField(f.key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-600 mt-3">
          These params are sent to the backend and used by the strategy.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-8">
        <h4 className="font-bold text-gray-800 mb-2">Quick Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>🔥 More <b>Momentum/Volume</b> → faster, spikier trades.</li>
          <li>🧊 More <b>Mean Reversion</b> → calmer, dip-buying behavior.</li>
          <li>✅ <b>Min Score</b> (AI Weighted) filters out weak signals.</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={saveAndGo}
          disabled={isSaving}
          className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all ${
            isSaving
              ? "bg-gray-400 cursor-wait"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
          }`}
        >
          {isSaving ? "Saving…" : "Save & Start Demo →"}
        </button>

        {!account && (
          <p className="mt-3 text-xs text-gray-500">
            No wallet yet? No problem. We’ll save locally and sync once you connect.
          </p>
        )}
      </div>
    </div>
  );
};

export default StrategySelector;