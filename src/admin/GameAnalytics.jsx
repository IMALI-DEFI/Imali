// src/admin/GameAnalytics.jsx
// Per-game analytics for blackculturevault.com (GA4 via /api/admin/ga4/games).
import React, { useEffect, useState } from "react";
import { apiFetch } from "../context/AuthContext";

const COLORS = { kasri: "#f59e0b", card_room: "#22c55e", yasuke: "#ef4444", yasuke_web: "#f472b6", bobble: "#38bdf8", vault_trivia: "#a78bfa", home: "#94a3b8" };
const n = (v) => (v === undefined || v === null ? "—" : Number(v).toLocaleString());
const secs = (s) => (!s ? "0s" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

function Trend({ rows, games }) {
  const keys = games.filter((g) => g.key !== "home" && g.users > 0).map((g) => g.key);
  if (!rows?.length || !keys.length) return null;
  const W = 640, H = 140, P = 6;
  const max = Math.max(1, ...rows.flatMap((r) => keys.map((k) => r[k] || 0)));
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, rows.length - 1);
  const y = (v) => H - P - (v * (H - 2 * P)) / max;
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily players by game">
        {keys.map((k) => (
          <polyline key={k} fill="none" stroke={COLORS[k] || "#fff"} strokeWidth="2.5" strokeLinejoin="round"
            points={rows.map((r, i) => `${x(i)},${y(r[k] || 0)}`).join(" ")} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-white/50"><span>{rows[0].date}</span><span>{rows[rows.length - 1].date}</span></div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {keys.map((k) => (
          <span key={k} className="flex items-center gap-1"><i style={{ background: COLORS[k], width: 10, height: 10, borderRadius: 9, display: "inline-block" }} />{games.find((g) => g.key === k)?.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function GameAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    apiFetch(`/api/admin/ga4/games?days=${days}`)
      .then((r) => { if (alive) { setData(r?.data || r); setError(""); } })
      .catch(() => { if (alive) { setData(null); setError("Game analytics are unavailable right now."); } })
      .finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [days]);

  const games = data?.games || [];
  const playable = games.filter((g) => g.key !== "home");
  const top = Math.max(1, ...playable.map((g) => g.users));
  const home = games.find((g) => g.key === "home");
  const total = (k) => playable.reduce((a, g) => a + (g.events?.[k] || 0), 0);

  return (
    <section className="imali-traffic-dashboard" aria-label="Black Culture Vault game analytics">
      <div className="imali-traffic-heading">
        <div>
          <h3>🎮 Black Culture Vault · Games</h3>
          <p>Each game on its own: who plays, how long, and who finishes.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-amber-200/50 bg-transparent px-3 py-2 text-sm">
          {[7, 30, 90].map((d) => <option key={d} value={d} className="text-black">Last {d} days</option>)}
        </select>
      </div>

      {error && <p role="alert">{error}</p>}
      {busy && !data && <p className="imali-traffic-notice">Loading game numbers…</p>}

      {data && (
        <>
          <div className="imali-traffic-metrics">
            <div className="imali-traffic-metric"><span>Visitors on the game picker</span><strong>{n(home?.users)}</strong></div>
            <div className="imali-traffic-metric"><span>Games started</span><strong>{n(total("game_start"))}</strong></div>
            <div className="imali-traffic-metric"><span>Games finished</span><strong>{n(total("game_end"))}</strong></div>
            <div className="imali-traffic-metric"><span>Buy / unlock clicks</span><strong>{n(total("purchase_click"))}</strong></div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-amber-200">
                  <th className="p-2">Game</th><th className="p-2">Players</th><th className="p-2">New</th>
                  <th className="p-2">Avg time</th><th className="p-2">Starts</th><th className="p-2">Finished</th>
                  <th className="p-2">Played 60s+</th><th className="p-2">Buy clicks</th>
                </tr>
              </thead>
              <tbody>
                {playable.map((g) => (
                  <tr key={g.key} className="border-t border-white/20">
                    <td className="p-2">
                      <a href={g.url} target="_blank" rel="noopener noreferrer" className="font-bold underline-offset-2 hover:underline">{g.label}</a>
                      <div className="mt-1 h-1.5 rounded bg-white/10"><div className="h-1.5 rounded" style={{ width: `${(100 * g.users) / top}%`, background: COLORS[g.key] }} /></div>
                    </td>
                    <td className="p-2">{n(g.users)}</td>
                    <td className="p-2">{n(g.newUsers)}</td>
                    <td className="p-2">{secs(g.avgEngagementSec)}</td>
                    <td className="p-2">{n(g.events?.game_start)}</td>
                    <td className="p-2">{n(g.events?.game_end)}{g.events?.game_start ? <span className="text-white/50"> ({g.finishRate}%)</span> : null}</td>
                    <td className="p-2">{n(g.events?.game_engaged)}</td>
                    <td className="p-2">{n(g.events?.purchase_click)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Trend rows={data.trend} games={games} />

          <h4 className="mt-5 font-bold text-amber-100">♠️ Card Room by game</h4>
          {data.subgames?.available ? (
            data.subgames.rows.length ? (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.subgames.rows.map((s) => (
                  <div key={s.key} className="rounded-xl border border-white/20 bg-white/10 p-3">
                    <strong className="block">{s.label}</strong>
                    <span className="block text-xs text-white/70">{n(s.starts)} started · {n(s.finishes)} finished · {n(s.rounds)} rounds</span>
                  </div>
                ))}
              </div>
            ) : <p className="imali-traffic-notice">No Spades, Tunk, Solitaire or Poker games recorded in this period yet.</p>
          ) : <p className="imali-traffic-notice">{data.subgames?.note || "Card Room breakdown is not available yet."}</p>}

          <p className="imali-traffic-notice">
            Players and time come from Google Analytics for all history. Starts, finishes, 60-second plays and buy clicks were added on Nov 18, 2026, so they count from then on.
            Google takes a few hours to process new events. Numbers refresh every 30 minutes.
          </p>
          {data.errors?.length > 0 && <p role="alert" className="text-sm text-red-200">{data.errors.join(" · ")}</p>}
        </>
      )}
    </section>
  );
}
