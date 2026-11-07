// src/components/game/ShadowLab.jsx
// Shadow Lab logo + live update card. Reads /shadow-lab/latest.json,
// published from the research machine by publish_shadow_lab.py.
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

const pct = (v) => (v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`);

/** Bar pair comparing the tested idea vs. simply holding everything. */
function CompareBars({ idea, all }) {
  const max = Math.max(Math.abs(idea || 0), Math.abs(all || 0), 1);
  const bar = (v, color) => (
    <div className="h-4 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(Math.abs(v || 0) / max) * 100}%`, background: color, transition: "width .6s ease" }} />
    </div>
  );
  return (
    <div className="space-y-2 text-sm font-bold">
      <div><div className="flex justify-between"><span>🧪 Lab idea</span><span className="text-[#4ff0a0]">{pct(idea)}</span></div>{bar(idea, "linear-gradient(90deg,#0fb36a,#4ff0a0)")}</div>
      <div><div className="flex justify-between"><span>🧺 Holding everything</span><span className="text-[#c9d2ff]">{pct(all)}</span></div>{bar(all, "linear-gradient(90deg,#5c6ad6,#9fd0ff)")}</div>
    </div>
  );
}

/** Home-page card: what the Shadow Lab is doing right now. Hidden if no data. */
export function ShadowLabCard() {
  const [lab, setLab] = useState(null);

  useEffect(() => {
    let on = true;
    fetch(`/shadow-lab/latest.json?ts=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (on && j) setLab(j); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  if (!lab) return null;
  const scan = lab.last_scan;
  const indep = lab.research?.periods?.independent;
  const checksMissing = Number(lab.checks_missing || 0);
  const checksTotal = Math.max(checksMissing, 8);
  const passed = checksTotal - checksMissing;

  return (
    <section className="fun-card" aria-label="Shadow Lab update">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <ShadowLabLogo size={92} className="shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl sm:text-3xl font-black">Shadow Lab</h2>
            <span className="fun-pill">🔬 Research only</span>
            {!lab.live_orders_authorized && <span className="fun-pill">🔒 No real trades</span>}
          </div>
          <p className="fun-help mt-1">
            Where IMALI tests new robot ideas in the shadows — with pretend money — before any of them are allowed near a real account.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {/* live scan */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="flex items-center gap-2 font-black">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4ff0a0] animate-pulse" /> Latest scan
          </div>
          {scan ? (
            <>
              <p className="text-3xl font-black mt-2">{scan.markets_checked ?? "—"}</p>
              <p className="fun-help text-sm">markets checked {timeAgo(scan.at)}</p>
              <p className="text-sm font-bold mt-2">
                {scan.watchlist_count > 0
                  ? `👀 ${scan.watchlist_count} looked interesting`
                  : "😌 None met the rules — so it sat tight."}
              </p>
            </>
          ) : <p className="fun-help mt-2">Waiting for the next scan.</p>}
          {lab.scans_last_24h > 0 && <p className="text-xs text-white/50 mt-2">🔁 {lab.scans_last_24h} scans in the last 24 hours</p>}
        </div>

        {/* research result */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="font-black">🧪 Latest experiment</div>
          {indep ? (
            <>
              <p className="fun-help text-sm mt-1 mb-3">Tested on past prices it hadn't seen before:</p>
              <CompareBars idea={indep.selected_return_pct} all={indep.all_return_pct} />
              <p className="text-xs text-white/60 mt-2">Biggest dip along the way: <b className="text-[#ff9aa0]">{pct(indep.selected_drawdown_pct)}</b></p>
            </>
          ) : <p className="fun-help mt-2">New experiment coming soon.</p>}
        </div>

        {/* safety gate */}
        <div className="rounded-2xl border-2 border-[#5c6ad6] bg-white/5 p-4">
          <div className="font-black">🛡️ Safety gate</div>
          <p className="fun-help text-sm mt-1">An idea must pass every check before it can ever trade for real.</p>
          <div className="fun-xp mt-3"><div style={{ width: `${(passed / checksTotal) * 100}%` }} /><span>{passed} / {checksTotal} checks passed</span></div>
          <p className="text-sm font-bold mt-3">
            {lab.live_orders_authorized ? "✅ Cleared for live trading" : "🔒 Staying in the lab for now"}
          </p>
        </div>
      </div>

      <p className="text-xs text-white/45 mt-4">
        Research results use past data and modeled fees. They are not live results and don't promise future returns.
        {lab.published_at ? ` Updated ${timeAgo(lab.published_at)}.` : ""}
      </p>
    </section>
  );
}
