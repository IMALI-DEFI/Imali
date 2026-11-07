import React, { useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaShieldAlt, FaSpinner, FaSyncAlt } from "react-icons/fa";
import BotAPI from "../../utils/BotAPI";

const LANE_META = {
  stocks: { icon: "📈", name: "Stocks" },
  options: { icon: "🧩", name: "Options" },
  futures: { icon: "⚡", name: "Futures" },
  kalshi: { icon: "🎯", name: "Kalshi" },
  dex: { icon: "🔗", name: "DEX" },
};

export default function AutomatedTradingControls() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await BotAPI.getAutomationLanes();
      setLanes(Array.isArray(result?.lanes) ? result.lanes : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Unable to load automation controls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setLane = async (lane) => {
    const next = !lane.armed;
    if (next) {
      const confirmed = window.confirm(
        `Enable live automated trading for ${lane.label || lane.lane}?\n\nIMALI may submit live orders automatically within your configured risk limits. You can turn this off at any time.`
      );
      if (!confirmed) return;
    }

    setSaving(lane.lane);
    setError("");
    setNotice("");
    try {
      const result = await BotAPI.setAutomationLane(lane.lane, next, next);
      setLanes(Array.isArray(result?.lanes) ? result.lanes : lanes);
      setNotice(`${lane.label || lane.lane} automated trading ${next ? "enabled" : "disabled"}.`);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Unable to update automation");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-cyan-300" />
            <h3 className="text-lg sm:text-xl font-black">Automated Trading</h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-white/50">
            Choose which live trading lanes IMALI may automate for your account.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {loading && lanes.length === 0 ? (
        <div className="py-8 text-center text-white/50">
          <FaSpinner className="mx-auto mb-2 animate-spin" />
          Loading automated trading lanes…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {lanes.map((lane) => {
            const meta = LANE_META[lane.lane] || { icon: "🤖", name: lane.label || lane.lane };
            const busy = saving === lane.lane;
            const canEnable = lane.ready === true;
            return (
              <div key={lane.lane} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xl">{meta.icon}</div>
                    <h4 className="mt-1 font-black">{lane.label || meta.name}</h4>
                    <p className="text-[11px] uppercase tracking-wide text-white/40">
                      {!lane.connected ? "Setup Required" : String(lane.mode || "").toLowerCase() === "paper" ? "Connected Paper" : "Connected Live"}
                    </p>
                  </div>
                  {lane.ready ? (
                    <FaCheckCircle className="text-emerald-300 mt-1" title="Ready" />
                  ) : (
                    <FaExclamationTriangle className="text-amber-300 mt-1" title="Setup required" />
                  )}
                </div>

                <div className="mt-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Connection</span>
                    <span className={lane.connected ? "text-emerald-300" : "text-amber-300"}>
                      {lane.connected ? "Connected" : "Setup required"}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-white/45">Automation</span>
                    <span className={lane.armed ? "text-emerald-300" : "text-white/55"}>
                      {lane.armed ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>

                {!lane.ready && lane.blocker && (
                  <p className="mt-3 min-h-[34px] text-[11px] leading-4 text-amber-200/80">{lane.blocker}</p>
                )}
                {lane.ready && (
                  <p className="mt-3 min-h-[34px] text-[11px] leading-4 text-white/45">
                    {lane.armed ? "Live automation is armed for this lane." : "Ready to enable."}
                  </p>
                )}

                <button
                  type="button"
                  disabled={busy || (!lane.armed && !canEnable)}
                  onClick={() => setLane(lane)}
                  className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-black transition ${
                    lane.armed
                      ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
                      : canEnable
                      ? "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  }`}
                >
                  {busy ? <FaSpinner className="mx-auto animate-spin" /> : lane.armed ? "Turn Off" : "Enable Auto"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-4 text-white/35">
        Turning a lane off engages that lane’s kill switch. Turning it on requires a ready live connection and your confirmation.
      </p>
    </section>
  );
}
