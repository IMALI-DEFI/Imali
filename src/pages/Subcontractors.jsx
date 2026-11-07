// src/pages/Subcontractors.jsx
// Public page: local contractors sign up to get paid work from government jobs IMALI wins.
import React, { useEffect, useState } from "react";
import { apiFetch } from "../context/AuthContext";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(" ");
const FALLBACK_TRADES = ["janitorial", "landscaping", "hvac", "plumbing", "electrical", "roofing", "painting", "construction",
  "pest control", "snow removal", "waste / debris", "security guard", "moving / trucking", "fencing", "paving",
  "elevator", "fire safety", "IT / software", "staffing / admin", "food service"];

export default function Subcontractors() {
  const [trades, setTrades] = useState(FALLBACK_TRADES);
  const [f, setF] = useState({ company: "", contact_name: "", email: "", phone: "", website: "", city: "", state: "",
    postal_code: "", service_radius_miles: 50, trades: [], insured: false, bondable: false, government_experience: false,
    naics_codes: "", notes: "", consent: false, website2: "" });
  const [status, setStatus] = useState({ busy: false, ok: null, msg: "" });

  useEffect(() => {
    document.title = "Get Government Work | IMALI Subcontractor Network";
    apiFetch("/api/public/subcontractors/trades").then((r) => r?.trades?.length && setTrades(r.trades)).catch(() => {});
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggleTrade = (t) => setF({ ...f, trades: f.trades.includes(t) ? f.trades.filter((x) => x !== t) : [...f.trades, t] });

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ busy: true, ok: null, msg: "" });
    try {
      const r = await apiFetch("/api/public/subcontractors/signup", { method: "POST", body: JSON.stringify(f) });
      setStatus({ busy: false, ok: true, msg: r?.message || "You're on the list!" });
    } catch (err) {
      setStatus({ busy: false, ok: false, msg: err?.message || "Could not save. Please try again." });
    }
  };

  const input = "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none";

  if (status.ok) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center text-white">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-4 text-3xl font-bold">You're in!</h1>
        <p className="mt-3 text-white/70">{status.msg}</p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-white/80">
          <li>📬 We email you when a job fits your trade and area.</li>
          <li>💵 You reply with your price. No fee to join.</li>
          <li>🤝 If we win the job, you do the work and get paid.</li>
        </ul>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <section className="text-center">
        <p className="text-sm uppercase tracking-widest text-emerald-300">For local contractors</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Get paid work from government jobs</h1>
        <p className="mx-auto mt-3 max-w-xl text-white/70">We find government jobs near you. You do the work. We handle the paperwork.</p>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {[["1️⃣", "Sign up", "Tell us your trade and where you work. 2 minutes."],
          ["2️⃣", "Get a job email", "When a job fits, we send the details and ask your price."],
          ["3️⃣", "Do the work, get paid", "If we win, you do the job. We deal with the government."]].map(([n, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-2xl">{n}</div><b>{t}</b><p className="mt-1 text-sm text-white/60">{d}</p>
          </div>
        ))}
      </section>

      <ul className="mt-6 space-y-1 text-sm text-white/70">
        <li>✅ Free to join. No contracts.</li>
        <li>✅ Only jobs in your trade and your area.</li>
        <li>✅ Say "STOP" anytime and we stop emailing.</li>
      </ul>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        <input type="text" name="website2" value={f.website2} onChange={set("website2")} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="Company name *" value={f.company} onChange={set("company")} required />
          <input className={input} placeholder="Your name" value={f.contact_name} onChange={set("contact_name")} />
          <input className={input} type="email" placeholder="Email *" value={f.email} onChange={set("email")} required />
          <input className={input} placeholder="Phone" value={f.phone} onChange={set("phone")} />
          <input className={input} placeholder="Website" value={f.website} onChange={set("website")} />
          <input className={input} placeholder="City" value={f.city} onChange={set("city")} />
          <select className={input} value={f.state} onChange={set("state")} required>
            <option value="">State *</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={input} placeholder="ZIP" value={f.postal_code} onChange={set("postal_code")} />
        </div>

        <div>
          <p className="mb-2 font-semibold">What work do you do? *</p>
          <div className="flex flex-wrap gap-2">
            {trades.map((t) => (
              <button type="button" key={t} onClick={() => toggleTrade(t)}
                className={`rounded-full border px-3 py-1 text-sm transition ${f.trades.includes(t) ? "border-emerald-400 bg-emerald-500/20" : "border-white/15 hover:bg-white/10"}`}>
                {f.trades.includes(t) ? "✓ " : ""}{t}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">How far will you travel? <b>{f.service_radius_miles} miles</b>
          <input type="range" min="10" max="300" step="10" value={f.service_radius_miles} onChange={set("service_radius_miles")} className="mt-1 w-full" />
        </label>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.insured} onChange={set("insured")} /> I have business insurance</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.bondable} onChange={set("bondable")} /> I can get a bond</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.government_experience} onChange={set("government_experience")} /> I've done government work before</label>
        </div>

        <input className={input} placeholder="NAICS codes, if you know them (e.g. 561720, 561730)" value={f.naics_codes} onChange={set("naics_codes")} />
        <textarea className={input} rows={3} placeholder="Anything else? Crew size, licenses, equipment…" value={f.notes} onChange={set("notes")} />

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={f.consent} onChange={set("consent")} required />
          <span>Yes, email me about jobs that fit my trade and area. I can reply STOP anytime.</span>
        </label>

        {status.ok === false && <p className="rounded-xl bg-rose-500/15 p-2 text-sm text-rose-200">{status.msg}</p>}
        <button type="submit" disabled={status.busy || !f.trades.length}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50">
          {status.busy ? "Saving…" : "Join the network — it's free"}
        </button>
      </form>
    </main>
  );
}
