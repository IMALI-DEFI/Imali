// src/admin/BidDesk.jsx
// Bid Desk: every government job in plain words, with subs, prices, papers and one-tap actions.
import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../context/AuthContext";

const BASE = "/api/admin/work-agent/bid-desk";
const post = (path, body) => apiFetch(BASE + path, { method: "POST", body: JSON.stringify(body || {}) });
const usd = (n) => (n === null || n === undefined || n === "" ? "—" : "$" + Math.round(Number(n)).toLocaleString());
const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const daysLeft = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null);

const LOOK = {
  go: { label: "GO", emoji: "🟢", ring: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" },
  maybe: { label: "MAYBE", emoji: "🟡", ring: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  answer: { label: "ANSWER", emoji: "💬", ring: "border-sky-400/40 bg-sky-400/10 text-sky-200" },
  skip: { label: "SKIP", emoji: "⚪", ring: "border-white/15 bg-white/5 text-white/60" },
};
const OWNER = { you: "👤 You", sub: "🛠️ Sub", robot: "🤖 Robot" };

function Stat({ n, label, emoji }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-2xl font-bold">{emoji} {n ?? "—"}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function Btn({ children, onClick, tone = "default", busy, small }) {
  const tones = {
    default: "border-white/15 bg-white/5 hover:bg-white/10",
    good: "border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30",
    warn: "border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20",
  };
  return (
    <button onClick={onClick} disabled={busy}
      className={`rounded-xl border ${tones[tone]} ${small ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"} font-medium transition disabled:opacity-50`}>
      {busy ? "…" : children}
    </button>
  );
}

function Checklist({ id, items, onChange }) {
  const [busy, setBusy] = useState(null);
  const toggle = async (it) => {
    setBusy(it.item);
    try { await post(`/briefs/${id}/checklist`, { item: it.item, status: it.status === "done" ? "todo" : "done" }); onChange(); }
    finally { setBusy(null); }
  };
  return (
    <ul className="space-y-1">
      {(items || []).map((it) => {
        const late = it.status === "late" || it.status === "blocker";
        return (
          <li key={it.item} className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={it.status === "done"} disabled={busy === it.item || it.owner === "robot"}
              onChange={() => toggle(it)} />
            <div className={it.status === "done" ? "text-white/40 line-through" : late ? "text-rose-200" : ""}>
              <b>{it.item}</b> <span className="text-white/50">· {OWNER[it.owner] || it.owner} · by {day(it.get_by)}</span>
              {it.status === "blocker" && <span className="ml-1 rounded bg-rose-500/30 px-1 text-xs">BLOCKER</span>}
              {it.why && <div className="text-xs text-white/50">{it.why}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ id, onDone }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(null);
  const [quote, setQuote] = useState({});
  const load = useCallback(() => apiFetch(`${BASE}/briefs/${id}`).then(setD).catch(() => setD({ error: true })), [id]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <p className="text-sm text-white/50">Loading…</p>;
  if (d.error) return <p className="text-sm text-rose-300">Could not load.</p>;
  const b = d.brief;
  const act = async (key, fn) => { setBusy(key); try { await fn(); await load(); onDone?.(); } catch (e) { alert(e.message || "Did not work"); } finally { setBusy(null); } };
  return (
    <div className="mt-3 space-y-4 border-t border-white/10 pt-3">
      <div>
        <h4 className="mb-1 font-semibold">📋 Papers to get (and when)</h4>
        <Checklist id={id} items={b.doc_schedule} onChange={load} />
      </div>
      <div>
        <h4 className="mb-1 font-semibold">🛠️ Subs and their prices</h4>
        {!d.rfqs.length && <p className="text-sm text-white/50">No price requests yet. The robot makes them for Go/Maybe jobs.</p>}
        <ul className="space-y-2">
          {d.rfqs.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{r.company || r.recipient_email}</b> · {r.sent_at ? `asked ${day(r.sent_at)}` : "not sent yet"}
                  {r.quote_amount ? <> · price <b className="text-emerald-300">{usd(r.quote_amount)}</b></> : r.reply_received ? " · replied" : ""}</span>
                <span className="flex gap-1">
                  {!r.sent_at && r.status === "draft" && <>
                    <Btn small tone="good" busy={busy === "s" + r.id} onClick={() => act("s" + r.id, () => post(`/rfqs/${r.id}/send`))}>Send</Btn>
                    <Btn small busy={busy === "x" + r.id} onClick={() => act("x" + r.id, () => post(`/rfqs/${r.id}/skip`))}>Don't send</Btn>
                  </>}
                </span>
              </div>
              {r.sent_at && !r.quote_amount && (
                <div className="mt-1 flex gap-1">
                  <input className="w-28 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs" placeholder="Price $"
                    value={quote[r.id] || ""} onChange={(e) => setQuote({ ...quote, [r.id]: e.target.value })} />
                  <Btn small busy={busy === "q" + r.id} onClick={() => act("q" + r.id, () => post(`/rfqs/${r.id}/quote`, { amount: Number(quote[r.id]) }))}>Save price</Btn>
                </div>
              )}
              {!r.sent_at && <details className="mt-1 text-xs text-white/60"><summary>See email</summary><pre className="whitespace-pre-wrap">{r.body}</pre></details>}
            </li>
          ))}
        </ul>
      </div>
      {!!(b.attachments || []).length && (
        <div>
          <h4 className="mb-1 font-semibold">📎 Government files</h4>
          <ul className="text-sm">{b.attachments.map((a) => <li key={a.url}><a className="text-sky-300 underline" href={a.url} target="_blank" rel="noreferrer">{a.name}</a></li>)}</ul>
        </div>
      )}
      {b.contracting_officer?.email && (
        <p className="text-sm">📧 Contracting officer: <b>{b.contracting_officer.name}</b> · <a className="text-sky-300 underline" href={`mailto:${b.contracting_officer.email}`}>{b.contracting_officer.email}</a></p>
      )}
      <div className="flex flex-wrap gap-2">
        <a className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" href={b.url} target="_blank" rel="noreferrer">Open on SAM.gov ↗</a>
        <Btn tone="good" busy={busy === "sub"} onClick={() => window.confirm("Did you submit this bid on the government site?") && act("sub", () => post(`/briefs/${id}/submitted`, { amount: b.recommended_bid }))}>✅ I submitted it</Btn>
        <Btn tone="warn" busy={busy === "skip"} onClick={() => act("skip", () => post(`/briefs/${id}/skip`, { reason: "Skipped from Bid Desk" }))}>Skip this job</Btn>
      </div>
    </div>
  );
}

function BidCard({ b, onChange }) {
  const [open, setOpen] = useState(false);
  const look = LOOK[b.decision] || LOOK.skip;
  const left = daysLeft(b.due_at);
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${look.ring}`}>{look.emoji} {look.label} · {b.go_score}</span>
        <span className={`text-xs ${left !== null && left <= 5 ? "text-rose-300" : "text-white/60"}`}>
          ⏰ {left === null ? "no due date" : left <= 0 ? "due today" : `${left} day${left === 1 ? "" : "s"} left`} · {day(b.due_at)}
        </span>
      </div>
      <h3 className="mt-2 font-semibold leading-snug">{b.title}</h3>
      <p className="mt-1 text-sm text-white/80">{b.plain_summary}</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-white/70">
        {(b.bullets || []).slice(0, 5).map((x, i) => <li key={i}>{x}</li>)}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/5 p-2"><div className="text-white/50">Sub price</div><b>{usd(b.best_quote)}</b></div>
        <div className="rounded-xl bg-white/5 p-2"><div className="text-white/50">Your bid</div><b>{usd(b.recommended_bid)}</b></div>
        <div className="rounded-xl bg-emerald-500/10 p-2"><div className="text-white/50">You keep</div><b className="text-emerald-300">{usd(b.est_profit)}</b></div>
      </div>
      <ul className="mt-3 space-y-0.5 text-xs text-white/60">
        {(b.decision_reasons || []).slice(0, 5).map((r, i) => <li key={i}>• {r}</li>)}
      </ul>
      <p className="mt-2 text-sm"><b>👉 Next:</b> {b.next_step}</p>
      <p className="mt-1 text-xs text-white/40">🛠️ {b.trade || "—"} · 📍 {b.location || "—"} · {b.subs} subs matched · {b.rfqs_sent} asked · {b.quotes} prices · {b.files} files</p>
      <div className="mt-2"><Btn small onClick={() => setOpen(!open)}>{open ? "Hide" : "Open papers, subs & actions"}</Btn></div>
      {open && <Detail id={b.id} onDone={onChange} />}
    </div>
  );
}

export default function BidDesk() {
  const [s, setS] = useState(null);
  const [tab, setTab] = useState("go");
  const [items, setItems] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [kaggle, setKaggle] = useState([]);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const [sum, list, appr] = await Promise.all([
        apiFetch(`${BASE}/summary`), apiFetch(`${BASE}/briefs?decision=${tab}&limit=60`), apiFetch(`${BASE}/approved-waiting`)]);
      setS(sum); setItems(list.items || []); setWaiting(appr.items || []); setErr(null);
      apiFetch(`${BASE}/kaggle`).then((k) => setKaggle(k.items || [])).catch(() => {});
    } catch (e) { setErr(e.message || "Bid Desk is not reachable yet."); }
  }, [tab]);
  useEffect(() => { load(); const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);

  const dec = s?.decisions || {};
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">🏛️ Bid Desk</h2>
        <p className="text-sm text-white/60">Government jobs in plain words. The robot reads the papers, finds subs, asks for prices, and does the math.</p>
      </div>

      {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{err}</div>}

      {s && !s.sam_registered && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <b>⚠️ Step 1: Sign up on SAM.gov.</b>
          <ul className="mt-1 list-disc pl-5">
            <li>You can't win a government job without it.</li>
            <li>It's free. It takes 2–4 weeks.</li>
            <li>You need a business name and a tax ID (EIN).</li>
          </ul>
          <a className="mt-2 inline-block text-amber-200 underline" href="https://sam.gov/content/entity-registration" target="_blank" rel="noreferrer">Start SAM.gov sign-up ↗</a>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat emoji="🟢" n={dec.go || 0} label="Go — worth bidding" />
        <Stat emoji="🟡" n={dec.maybe || 0} label="Maybe" />
        <Stat emoji="💬" n={dec.answer || 0} label="Just answer (no bid yet)" />
        <Stat emoji="⚪" n={dec.skip || 0} label="Skip" />
        <Stat emoji="✉️" n={s?.rfq?.sent} label={`Price requests sent (${s?.rfq?.sent_today ?? 0} today)`} />
        <Stat emoji="📝" n={s?.rfq?.drafts} label="Price requests ready to send" />
        <Stat emoji="💵" n={s?.rfq?.quotes} label="Sub prices received" />
        <Stat emoji="🧹" n={s?.archive?.archived} label={`Old jobs cleaned up (${s?.archive?.missed_30d ?? 0} missed this month)`} />
      </div>

      {s && !s.auto_send && s.rfq?.drafts > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">
          <span>📝 <b>{s.rfq.drafts}</b> price requests to subs are ready.</span>
          <Btn tone="good" busy={busy === "all"} onClick={async () => { setBusy("all"); try { const r = await post("/rfqs/send-all"); alert(`Sent ${r.sent}`); } catch (e) { alert(e.message); } finally { setBusy(null); load(); } }}>Send them all (max 15/day)</Btn>
        </div>
      )}

      {!!s?.docs_due?.length && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-2 font-semibold">📅 Due in the next 7 days</h3>
          <ul className="space-y-1 text-sm">
            {s.docs_due.map((x, i) => (
              <li key={i} className={new Date(x.get_by) < Date.now() ? "text-rose-200" : ""}>
                <b>{day(x.get_by)}</b> · {x.item} <span className="text-white/50">({OWNER[x.owner] || x.owner}) — {String(x.title).slice(0, 60)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {["go", "maybe", "answer", "skip"].map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full border px-3 py-1 text-sm ${tab === k ? LOOK[k].ring : "border-white/10 text-white/60"}`}>
            {LOOK[k].emoji} {LOOK[k].label} ({dec[k] || 0})
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((b) => <BidCard key={b.id} b={b} onChange={load} />)}
        {!items.length && <p className="text-sm text-white/50">Nothing here right now. The robot checks every 30 minutes.</p>}
      </div>

      {!!waiting.length && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold">✅ You approved these. Finish them:</h3>
          <p className="mb-2 text-xs text-white/50">Open the link, send it, then tap Done. That's it.</p>
          <ul className="space-y-2">
            {waiting.slice(0, 40).map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><b>{w.title}</b> <span className="text-white/50">· {w.company} · {w.lane}</span></span>
                <span className="flex gap-1">
                  {w.link && <a className="rounded-lg border border-white/15 px-2 py-1 text-xs" href={w.link} target="_blank" rel="noreferrer">Open ↗</a>}
                  <Btn small tone="good" busy={busy === "w" + w.id} onClick={async () => { setBusy("w" + w.id); try { await post(`/approved/${w.id}/done`); } finally { setBusy(null); load(); } }}>Done</Btn>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!kaggle.length && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold">🏆 Kaggle contests</h3>
          <p className="mb-2 text-xs text-white/50">Robot trains, submits and records the score every 6 hours. Your only job: tap Join once on each one you want.</p>
          <ul className="space-y-2 text-sm">
            {kaggle.map((k) => (
              <li key={k.slug} className="flex flex-wrap items-center justify-between gap-2">
                <span><b>{k.title}</b> <span className="text-white/50">· {k.reward_text || "no cash"} · ends {day(k.deadline)}</span>
                  <div className="text-xs text-white/60">{k.last_public_score ? `Score ${k.last_public_score}${k.user_rank ? ` · rank #${k.user_rank}/${k.team_count}` : ""} · ` : ""}{k.reason || k.status}</div></span>
                {k.status === "needs_join" && <a className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs" href={`${k.url}/rules`} target="_blank" rel="noreferrer">Join on Kaggle ↗</a>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-white/40">New subs can sign up themselves at <a className="underline" href="/subcontractors" target="_blank" rel="noreferrer">/subcontractors</a>. Public board: <a className="underline" href="/opportunity" target="_blank" rel="noreferrer">/opportunity</a> ({s?.signups?.total ?? 0} so far).</p>
    </div>
  );
}
