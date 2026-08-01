// src/components/Dashboard/TradingOverview.js
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * TradingOverview (dark, self-contained)
 * Drives from `feed` prop, and ALSO listens to window events as a fallback:
 *  • "trade-demo:update"  → { source, pnl, equity, balance, wins, losses, running, mode, ts?, venues? }
 *  • "trade-demo:markers" → { hp: [{ time, venue, kind, text }] }
 *  • "trade-demo:markers:tp" → { time, venue, kind, text }
 *
 * ✅ Venue labels match TradeDemo UI:
 *   dex    -> New Crypto
 *   cex    -> Established Crypto
 *   stocks -> Stocks
 *   both   -> New & Established
 *   bundle -> All
 */
const VENUE_UI = {
  dex: "New Crypto",
  cex: "Established Crypto",
  stocks: "Stocks",
  both: "New & Established",
  bundle: "All",
};

export default function TradingOverview({ stats = {}, className = "", feed = null }) {
  // live state
  const [mode, setMode] = useState("demo");
  const [running, setRunning] = useState(false);
  const [pnl, setPnl] = useState(0);
  const [equity, setEquity] = useState(0);
  const [balance, setBalance] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // ✅ optional active venues badges (if provided)
  // expected shape: ["dex","cex"] or ["stocks"] etc.
  const [venues, setVenues] = useState([]);

  // local series for sparkline
  const [series, setSeries] = useState([{ t: Date.now(), v: 1000 }]);
  const lastT = useRef(0);

  // optional markers
  const [hpMarkers, setHpMarkers] = useState([]);
  const [tpMarkers, setTpMarkers] = useState([]);

  /* -------------------------- DRIVE FROM PROPS -------------------------- */
  useEffect(() => {
    if (!feed) return;
    const d = feed;

    setMode(d.mode || "demo");
    setRunning(!!d.running);
    if (Number.isFinite(d.pnl)) setPnl(Number(d.pnl));
    if (Number.isFinite(d.equity)) setEquity(Number(d.equity));
    if (Number.isFinite(d.balance)) setBalance(Number(d.balance));
    if (Number.isFinite(d.wins)) setWins(Number(d.wins));
    if (Number.isFinite(d.losses)) setLosses(Number(d.losses));

    if (Array.isArray(d.venues)) setVenues(d.venues.filter(Boolean));
    else if (typeof d.venue === "string" && d.venue) setVenues([d.venue]);

    const now = Number.isFinite(d.ts) ? Number(d.ts) : Date.now();
    if (now - lastT.current > 250) {
      const v = Number(d.equity);
      const safeV = Number.isFinite(v) && v > 0 ? v : (series.at(-1)?.v ?? 1000);
      setSeries((s) => [...s.slice(-199), { t: now, v: safeV }]);
      lastT.current = now;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  /* --------------------- FALLBACK: WINDOW EVENTS --------------------- */
  useEffect(() => {
    function onUpdate(e) {
      const d = e.detail || {};
      setMode(d.mode || "demo");
      setRunning(!!d.running);
      if (Number.isFinite(d.pnl)) setPnl(Number(d.pnl));
      if (Number.isFinite(d.equity)) setEquity(Number(d.equity));
      if (Number.isFinite(d.balance)) setBalance(Number(d.balance));
      if (Number.isFinite(d.wins)) setWins(Number(d.wins));
      if (Number.isFinite(d.losses)) setLosses(Number(d.losses));

      if (Array.isArray(d.venues)) setVenues(d.venues.filter(Boolean));
      else if (typeof d.venue === "string" && d.venue) setVenues([d.venue]);

      const now = Number.isFinite(d.ts) ? Number(d.ts) : Date.now();
      if (now - lastT.current > 900) {
        const v = Number(d.equity);
        const safeV = Number.isFinite(v) && v > 0 ? v : (series.at(-1)?.v ?? 1000);
        setSeries((s) => [...s.slice(-199), { t: now, v: safeV }]);
        lastT.current = now;
      }
    }

    function onHp(e) {
      const list = (e.detail?.hp || []).map((m) => ({
        time: (m.time || Math.floor(Date.now() / 1000)) * 1000,
        venue: m.venue || "?",
        text: m.text || "Risk",
      }));
      if (list.length) setHpMarkers((prev) => [...prev, ...list].slice(-50));
    }

    function onTp(e) {
      const m = e.detail || {};
      const one = {
        time: (m.time || Math.floor(Date.now() / 1000)) * 1000,
        venue: m.venue || "?",
        text: m.text || "TP",
      };
      setTpMarkers((prev) => [...prev, one].slice(-50));
    }

    window.addEventListener("trade-demo:update", onUpdate);
    window.addEventListener("trade-demo:markers", onHp);
    window.addEventListener("trade-demo:markers:tp", onTp);
    return () => {
      window.removeEventListener("trade-demo:update", onUpdate);
      window.removeEventListener("trade-demo:markers", onHp);
      window.removeEventListener("trade-demo:markers:tp", onTp);
    };
  }, [series]);

  const gross = pnl;
  const wl = { wins, losses, total: Math.max(0, wins + losses) };
  const winRate = wl.total ? Math.round((wins / wl.total) * 100) : (stats.winRate || 0);

  // sparkline geometry
  const spark = useMemo(() => {
    const w = 600,
      h = 120;
    const values = series.map((d) => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.1 || 1;
    const lo = min - pad,
      hi = max + pad;

    const x = (i) => (i / Math.max(1, series.length - 1)) * (w - 8) + 4;
    const y = (v) => {
      const pct = (v - lo) / Math.max(1e-9, hi - lo);
      return (1 - pct) * (h - 16) + 8;
    };

    const points = series.map((d, i) => [x(i), y(d.v)]);
    const path =
      points.length >= 2
        ? points.reduce((s, [px, py], i) => (i ? s + ` L ${px} ${py}` : `M ${px} ${py}`), "")
        : "";

    return { w, h, min, max, last: values.at(-1) ?? 0, path, points, isEmpty: points.length < 2 };
  }, [series]);

  // small badge
  const Badge = ({ tone = "slate", children }) => {
    const map = {
      emerald: "border-emerald-400 bg-emerald-600/90 text-white",
      sky: "border-sky-400 bg-sky-600/90 text-white",
      rose: "border-rose-400 bg-rose-600/90 text-white",
      slate: "border-slate-500 bg-slate-800/90 text-white",
      amber: "border-amber-400 bg-amber-500 text-black",
    };
    return <span className={`text-[11px] rounded-full border px-2 py-1 ${map[tone]}`}>{children}</span>;
  };

  const venueBadges = (venues || [])
    .map((v) => String(v).toLowerCase())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className={`tr-over w-full text-white ${className}`} style={{ backgroundColor: "rgba(2, 6, 23, 0.96)" }}>
      {/* top strip */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs p-3 border-b border-slate-700/60 bg-slate-900/80">
        <div className="font-black text-white">Trading Overview</div>

        {/* ✅ Venue labels */}
        {venueBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {venueBadges.map((v) => (
              <Badge key={v} tone="slate">
                {VENUE_UI[v] || v.toUpperCase()}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Badge tone={running ? "emerald" : "slate"}>{running ? "RUNNING" : "READY"}</Badge>
          <Badge tone="sky">{(mode || "DEMO").toUpperCase()}</Badge>
          <Badge tone={gross >= 0 ? "emerald" : "rose"}>
            Gross {gross >= 0 ? "+" : "-"}${Math.abs(gross).toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-3">
        <Kpi label="Equity" value={`$${(equity || 0).toFixed(2)}`} />
        <Kpi label="Cash balance" value={`$${(balance || 0).toFixed(2)}`} />
        <Kpi label="Gross PnL" value={`${gross >= 0 ? "+" : "-"}$${Math.abs(gross).toFixed(2)}`} />
        <Kpi label="Win rate" value={`${winRate}%`} />
        <Kpi label="Wins • Losses" value={`${wins} • ${losses}`} />
        <Kpi label="Trades" value={`${wl.total}`} />
      </div>

      {/* sparkline */}
      <div className="p-3">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/80">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60">
            <div className="text-sm font-semibold text-white">Equity (live)</div>
            <div className="text-xs text-slate-300">
              Min ${spark.min.toFixed(2)} • Max ${spark.max.toFixed(2)} • Last ${spark.last.toFixed(2)}
            </div>
          </div>
          <div className="p-2">
            <div className="w-full overflow-hidden rounded-lg bg-slate-950">
              <svg
                viewBox={`0 0 ${spark.w} ${spark.h}`}
                className="w-full h-32"
                style={{ background: "transparent" }}
                preserveAspectRatio="none"
              >
                <rect x="0" y="0" width={spark.w} height={spark.h} fill="#0f172a" />

                <line
                  x1="0"
                  y1={spark.h * 0.25}
                  x2={spark.w}
                  y2={spark.h * 0.25}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1={spark.h * 0.5}
                  x2={spark.w}
                  y2={spark.h * 0.5}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1={spark.h * 0.75}
                  x2={spark.w}
                  y2={spark.h * 0.75}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />

                {spark.path && (
                  <path
                    d={spark.path}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {!spark.isEmpty && spark.path && (
                  <>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`${spark.path} L ${spark.points[spark.points.length - 1][0]} ${spark.h} L ${spark.points[0][0]} ${spark.h} Z`}
                      fill="url(#gradient)"
                    />
                  </>
                )}

                {spark.points.length > 0 && (
                  <circle
                    cx={spark.points.at(-1)[0]}
                    cy={spark.points.at(-1)[1]}
                    r="4"
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                )}

                {spark.isEmpty && (
                  <text
                    x={spark.w / 2}
                    y={spark.h / 2}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize="14"
                    fontFamily="monospace"
                  >
                    Waiting for data…
                  </text>
                )}
              </svg>
            </div>
          </div>

          {(hpMarkers.length > 0 || tpMarkers.length > 0) && (
            <div className="px-3 pb-3 text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <span className="text-rose-400">▽</span> Honeypot risk: {hpMarkers.length}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-sky-400">★</span> Take-profit: {tpMarkers.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* bottom stats (props) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3">
        <Kpi
          label="24h PnL (prop)"
          value={`${Number(stats.pnl24h || 0) >= 0 ? "+" : "-"}$${Math.abs(Number(stats.pnl24h || 0)).toFixed(2)}`}
        />
        <Kpi label="Sharpe (prop)" value={`${Number(stats.sharpe || 0).toFixed(2)}`} />
        <Kpi label="Trades (prop)" value={`${Number(stats.trades || 0)}`} />
        <Kpi label="Win rate (prop)" value={`${Number(stats.winRate || 0)}%`} />
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="p-3 rounded-lg border border-slate-700/60 bg-slate-900/80">
      <div className="text-[11px] sm:text-[12px] uppercase text-slate-300 tracking-wide">{label}</div>
      <div className="text-sm sm:text-base font-semibold break-all text-white">{value}</div>
    </div>
  );
}
