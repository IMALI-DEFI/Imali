// src/pages/OpportunityBoard.jsx
// Public dashboard at /opportunity: live government jobs in plain words, subs we need, and Kaggle results.
// Shows public-safe info only (no prices, profit, quotes or sub names).
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../context/AuthContext";

const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const left = (d) => { const n = d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null; return n === null ? "" : n <= 0 ? "due today" : `${n} day${n === 1 ? "" : "s"} left`; };
const num = (n) => (n === undefined || n === null ? "…" : Number(n).toLocaleString());
const TAG = {
  go: ["🟢", "We're bidding", "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"],
  maybe: ["🟡", "Checking it out", "border-amber-400/40 bg-amber-400/10 text-amber-200"],
  answer: ["💬", "Info request", "border-sky-400/40 bg-sky-400/10 text-sky-200"],
};
const KSTATUS = { scored: "🏁 Scored", submitted: "📤 Submitted", ready: "⚙️ Training", needs_join: "🕐 Up next", unsupported: "⏭️ Skipped", too_big: "⏭️ Too big", error: "⚠️ Retrying" };

function Big({ n, label, emoji }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="text-3xl font-extrabold">{emoji} {num(n)}</div>
      <div className="mt-1 text-xs text-white/60">{label}</div>
    </div>
  );
}

export default function OpportunityBoard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    document.title = "Live Opportunity Board | IMALI";
    const load = () => apiFetch("/api/public/subcontractors/board").then((r) => { setD(r); setErr(false); }).catch(() => setErr(true));
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const s = d?.stats || {};
  const jobs = (d?.jobs || []).filter((j) => filter === "all" || j.decision === filter);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-white">
      <section className="text-center">
        <p className="text-sm uppercase tracking-widest text-emerald-300">Live · updates every 30 minutes</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">🤖 The Opportunity Robot</h1>
        <p className="mx-auto mt-3 max-w-2xl text-white/70">
          It reads every new government job, picks the good ones, and finds local companies to do the work.
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Big emoji="🔎" n={s.jobs_checked} label="Jobs checked" />
        <Big emoji="📄" n={s.files_read} label="Government files read" />
        <Big emoji="✅" n={s.worth_it} label="Worth a look right now" />
        <Big emoji="🛠️" n={s.subs} label="Local pros in the network" />
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-bold">How it works</h2>
        <ol className="mt-2 grid gap-2 text-sm text-white/75 sm:grid-cols-4">
          <li>1️⃣ <b>Find.</b> Robot checks SAM.gov all day.</li>
          <li>2️⃣ <b>Read.</b> It reads the job papers and writes them in plain words.</li>
          <li>3️⃣ <b>Match.</b> It finds local pros who do that work.</li>
          <li>4️⃣ <b>Price.</b> Pros send a price. We bid. Pros do the job.</li>
        </ol>
      </section>

      {err && <p className="mt-6 rounded-xl bg-rose-500/10 p-3 text-center text-sm text-rose-200">The board is taking a nap. Try again in a minute.</p>}

      {!!d?.subs_needed?.length && (
        <section className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <h2 className="text-lg font-bold">🙋 We need local pros for these jobs</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.subs_needed.map((n) => (
              <span key={n.trade + n.state} className="rounded-full border border-emerald-400/40 px-3 py-1 text-sm">
                {n.trade} · {n.state} <b>({n.jobs})</b>
              </span>
            ))}
          </div>
          <Link to="/subcontractors" className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2 font-bold text-black hover:bg-emerald-400">
            I do this work. Sign me up (free) →
          </Link>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">🏛️ Open government jobs</h2>
          <div className="flex gap-2 text-sm">
            {["all", "go", "maybe", "answer"].map((k) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 ${filter === k ? "border-white/40 bg-white/10" : "border-white/10 text-white/60"}`}>
                {k === "all" ? "All" : `${TAG[k][0]} ${TAG[k][1]}`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {!d && !err && <p className="text-white/50">Loading…</p>}
          {d && !jobs.length && <p className="text-white/50">No open jobs in this group right now. The robot checks again soon.</p>}
          {jobs.map((j) => {
            const t = TAG[j.decision] || TAG.maybe;
            return (
              <article key={j.id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 font-bold ${t[2]}`}>{t[0]} {t[1]}</span>
                  <span className="text-white/60">⏰ {left(j.due_at)} · {day(j.due_at)}</span>
                </div>
                <h3 className="mt-2 font-semibold leading-snug">{j.title}</h3>
                <p className="mt-1 text-sm text-white/75">{j.plain_summary}</p>
                {!!(j.bullets || []).length && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-white/65">{j.bullets.slice(0, 4).map((b, i) => <li key={i}>{b}</li>)}</ul>
                )}
                <p className="mt-2 text-xs text-white/45">🛠️ {j.trade || "—"} · 📍 {j.location || "—"}{j.agency ? ` · 🏢 ${j.agency}` : ""}</p>
                {j.url && <a href={j.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-sky-300 underline">See it on SAM.gov ↗</a>}
              </article>
            );
          })}
        </div>
      </section>

      {!!d?.kaggle?.length && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">🏆 AI contests (Kaggle)</h2>
          <p className="text-sm text-white/60">The robot builds a model, sends it in, and posts the score.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {d.kaggle.map((k) => (
              <a key={k.url} href={k.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10">
                <div className="flex justify-between text-xs text-white/60"><span>{KSTATUS[k.status] || k.status}</span><span>Prize: {k.reward_text || "—"}</span></div>
                <div className="mt-1 font-semibold">{k.title}</div>
                <div className="mt-1 text-xs text-white/60">
                  {k.last_public_score ? <>Score <b className="text-white">{k.last_public_score}</b>{k.user_rank ? ` · rank #${k.user_rank} of ${k.team_count}` : ""}</> : `Ends ${day(k.deadline)}`}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
        <h2 className="text-lg font-bold">Got a crew? Get government work.</h2>
        <p className="mt-1 text-sm text-white/65">Free to join. We only email jobs that fit your trade and area.</p>
        <Link to="/subcontractors" className="mt-3 inline-block rounded-xl bg-emerald-500 px-5 py-2 font-bold text-black hover:bg-emerald-400">Join the network →</Link>
        <p className="mt-3 text-xs text-white/40">Updated {d?.as_of ? new Date(d.as_of).toLocaleString() : "…"}</p>
      </section>
    </main>
  );
}
