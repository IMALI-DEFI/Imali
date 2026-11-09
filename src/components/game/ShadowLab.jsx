// src/components/game/ShadowLab.jsx
// Shadow Lab logo + live status card. Reads /api/public/lab-status,
// published every 15 min by imali-lab-publish.timer on the lab server.
import React, { useEffect, useState } from "react";

/** Shadow Lab emblem: hex badge, glowing flask, shadow-bot eyes inside. */
export function ShadowLabLogo({ size = 96, className = "" }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`fun-mascot fun-mascot-move ${className}`} role="img" aria-label="IMALI Shadow Lab logo">
      <defs>
        <linearGradient id="slHex" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1d8f" />
          <stop offset="1" stopColor="#0b0a2a" />
        </linearGradient>
        <linearGradient id="slRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe07a" />
          <stop offset=".5" stopColor="#c59bff" />
          <stop offset="1" stopColor="#4ff0a0" />
        </linearGradient>
        <linearGradient id="slLiquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8dffc4" />
          <stop offset="1" stopColor="#0fb36a" />
        </linearGradient>
        <radialGradient id="slGlow" cx=".5" cy=".7" r=".6">
          <stop offset="0" stopColor="#4ff0a0" stopOpacity=".55" />
          <stop offset="1" stopColor="#4ff0a0" stopOpacity="0" />
        </radialGradient>
        <clipPath id="slFlask">
          <path d="M50 30h20v20l18 32a8 8 0 0 1-7 12H39a8 8 0 0 1-7-12l18-32z" />
        </clipPath>
      </defs>
      {/* hex badge */}
      <path d="M60 4l48 27v58L60 116 12 89V31z" fill="url(#slHex)" stroke="url(#slRim)" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="60" cy="74" r="40" fill="url(#slGlow)" />
      {/* flask */}
      <g clipPath="url(#slFlask)">
        <rect x="20" y="20" width="80" height="80" fill="#ffffff14" />
        <path d="M20 66c10-5 20 5 30 0s20-6 30 0 15 4 20 0v40H20z" fill="url(#slLiquid)" />
        {/* shadow bot inside the liquid */}
        <rect x="45" y="70" width="30" height="18" rx="7" fill="#0b0a2a" opacity=".85" />
        <circle cx="54" cy="79" r="3.2" fill="#ffe07a" />
        <circle cx="66" cy="79" r="3.2" fill="#ffe07a" />
        <circle cx="40" cy="62" r="2.5" fill="#ffffffaa" />
        <circle cx="76" cy="57" r="2" fill="#ffffffaa" />
        <circle cx="62" cy="52" r="1.6" fill="#ffffffaa" />
      </g>
      <path d="M50 30h20v20l18 32a8 8 0 0 1-7 12H39a8 8 0 0 1-7-12l18-32z" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="46" y="24" width="28" height="8" rx="3" fill="#fff" />
    </svg>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-US") : "—");

// Live status is published every 15 min by the lab server. Try the site's /api proxy first,
// then the API domain directly (public JSON, CORS open). Hidden if neither answers.
const SOURCES = ["/api/public/lab-status", "https://api.imali-defi.com/api/public/lab-status"];

async function loadLabStatus() {
  for (const url of SOURCES) {
    try {
      const r = await fetch(`${url}?ts=${Date.now()}`, { headers: { Accept: "application/json" } });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && j.version >= 2) return j;
    } catch (_) { /* try next source */ }
  }
  return null;
}

const STATUS_TEXT = {
  collecting: "Collecting data",
  testing: "Testing ideas",
  promoted: "Upgrade went live",
};

/** Home-page card: what the Shadow Lab is doing right now. Hidden if no data. */
export function ShadowLabCard() {
  const [lab, setLab] = useState(null);

  useEffect(() => {
    let on = true;
    loadLabStatus().then((j) => { if (on && j) setLab(j); });
    const t = setInterval(() => loadLabStatus().then((j) => { if (on && j) setLab(j); }), 5 * 60 * 1000);
    return () => { on = false; clearInterval(t); };
  }, []);

  if (!lab) return null;
  const live = lab.live_upgrades || [];
  const testing = lab.testing || [];
  const mood = lab.market_mood || {};
  const stats = lab.stats || {};
  const updates = (lab.updates || []).slice(0, 4);
  const up = mood.btc_trend === "up";

  return (
    <section id="shadow-lab" className="fun-card scroll-mt-24" aria-label="Shadow Lab live status">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <ShadowLabLogo size={92} className="shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl sm:text-3xl font-black">Shadow Lab</h2>
            <span className="fun-pill">
              <span className="inline-block h-2 w-2 rounded-full bg-[#4ff0a0] animate-pulse mr-1" />Live
            </span>
            <span className="fun-pill">🧪 Tested before it trades</span>
          </div>
          <p className="fun-help mt-1">
            Every robot idea is tested in the lab first. Only ideas that pass every check get promoted to real trading —
            and they're pulled back automatically if they stop working.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* what is live */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="font-black">🚀 Live upgrades</div>
          {live.length ? (
            <ul className="mt-2 space-y-2">
              {live.slice(0, 3).map((u) => (
                <li key={u.id} className="text-sm">
                  <span className="font-bold">{u.kind === "safety_filter" ? "🛡️ " : "⚡ "}{u.title}</span>
                  <span className="block text-xs text-white/55">{u.strategy} · {u.venue} · live {timeAgo(u.since)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fun-help text-sm mt-2">Nothing has earned a spot yet — the lab keeps testing.</p>
          )}
        </div>

        {/* what is being tested */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="font-black">🔬 Being tested</div>
          {testing.length ? (
            <div className="mt-2 space-y-3">
              {testing.slice(0, 3).map((t) => (
                <div key={t.venue + t.strategy}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t.strategy} · {t.venue}</span>
                    <span className="text-[#4ff0a0]">{STATUS_TEXT[t.status] || t.status}</span>
                  </div>
                  <div className="fun-xp mt-1">
                    <div style={{ width: `${Math.max(4, t.progress_pct)}%` }} />
                    <span>{fmt(t.samples)} / {fmt(t.needed)} test trades</span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">{t.ideas_tested} ideas in the running</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="fun-help text-sm mt-2">Setting up the next experiment.</p>
          )}
        </div>

        {/* market check */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="font-black">🛡️ Market check</div>
          <p className="text-3xl mt-2" aria-hidden="true">{up ? "📈" : mood.btc_trend === "down" ? "📉" : "⏳"}</p>
          <p className="text-sm font-bold mt-1">{mood.note}</p>
          <p className="text-xs text-white/50 mt-3">
            🔁 {fmt(stats.shadow_setups_recorded)} setups recorded · {fmt(stats.real_trades_analyzed)} real trades studied
          </p>
          {stats.last_validation_at && (
            <p className="text-xs text-white/50">Checked again every {stats.validation_every_hours || 2} hrs · last {timeAgo(stats.last_validation_at)}</p>
          )}
        </div>
      </div>

      {updates.length > 0 && (
        <div className="mt-5">
          <div className="font-black mb-2">📣 Lab updates</div>
          <ul className="space-y-1">
            {updates.map((u, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-white/45 shrink-0 w-20">{timeAgo(u.at)}</span>
                <span>{u.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(lab.checks) && lab.checks.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-bold text-sm">✅ The {lab.checks.length} checks every idea must pass</summary>
          <ol className="list-decimal ml-6 mt-2 space-y-1 text-sm text-white/80">
            {lab.checks.map((c) => <li key={c}>{c}</li>)}
          </ol>
        </details>
      )}

      <p className="text-xs text-white/45 mt-4">
        {lab.disclaimer || "Research results are not a promise of future returns."}
        {lab.published_at ? ` Updated ${timeAgo(lab.published_at)}.` : ""}
      </p>
    </section>
  );
}
