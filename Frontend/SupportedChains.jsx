// src/pages/SupportedChains.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function SupportedChains() {
  const card = "rounded-xl bg-gray-800/70 border border-white/10 p-6 shadow-lg";

  // ---- Demo/Live toggle (mirrors HowItWorks style) ------------------------
  const [mode, setMode] = useState("demo"); // "demo" | "live"

  // ---- Chains data (extend as needed) -------------------------------------
  const chains = useMemo(
    () => [
      {
        name: "Ethereum Mainnet",
        id: 1,
        symbol: "ETH",
        badge: "Most Liquid",
        color: "from-emerald-500/20 to-emerald-400/10",
        rpcNote:
          "Deepest liquidity. Fees (gas) can spike—budget extra and avoid peak hype if you're new.",
        tips: [
          "Keep a buffer of ETH for gas to avoid stuck trades.",
          "Use conservative slippage on small pools.",
        ],
      },
      {
        name: "BNB Smart Chain",
        id: 56,
        symbol: "BNB",
        badge: "Low Fees",
        color: "from-amber-500/20 to-amber-400/10",
        rpcNote:
          "Cheap + fast. Great playground for frequent, smaller bot trades.",
        tips: [
          "Start with tiny size to learn flows.",
          "Double-check token contracts—many lookalikes exist.",
        ],
      },
      {
        name: "Polygon",
        id: 137,
        symbol: "MATIC",
        badge: "Fast & Popular",
        color: "from-indigo-500/20 to-indigo-400/10",
        rpcNote:
          "High throughput + low fees. Ideal for DCA/grid and high-volume strategies.",
        tips: [
          "Mind slippage during sudden volume spikes.",
          "Reliable RPC improves fill reliability for bots.",
        ],
      },
      // Add Arbitrum, Base, Optimism, etc. if you support them
    ],
    []
  );

  // ---- Gamified onboarding checklist (XP rail) ----------------------------
  const [tasks, setTasks] = useState([
    { id: "t1", label: "Connect your wallet (MetaMask / Coinbase)", done: false },
    { id: "t2", label: "Switch wallet network to a supported chain", done: false },
    { id: "t3", label: "Fund with a small amount of native gas token", done: false },
    { id: "t4", label: "Make a tiny practice swap ($1–$5)", done: false },
  ]);
  const xpPerTask = 25;
  const completed = tasks.filter((t) => t.done).length;
  const progress = Math.round((completed / tasks.length) * 100);
  const xp = completed * xpPerTask;

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      alert("Copied!");
    } catch {
      alert("Copy failed—please copy manually.");
    }
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openFAQ, setOpenFAQ] = useState(null);

  return (
    <div className="relative bg-gradient-to-b from-gray-900 to-indigo-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-24 relative">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Supported <span className="text-indigo-400">Chains</span>
          </h1>
          <p className="mt-4 text-lg text-indigo-200/90">
            Pick a network, fund gas, and you’re ready. Demo or Live — IMALI uses the same
            core AI logic, so each step helps you level up.
          </p>

          {/* Mode Toggle */}
          <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {["demo", "live"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm rounded-lg transition ${
                  mode === m ? "bg-indigo-600" : "hover:bg-white/10"
                }`}
              >
                {m === "demo" ? "Demo Mode" : "Live Mode"}
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-indigo-200/80">
            In <b>{mode === "demo" ? "Demo" : "Live"}</b> you’ll see {mode === "demo" ? "practice flows with tiny amounts" : "real balances & orders"}.
          </div>
        </div>

        {/* Progress rail (HowItWorks-style) */}
        <div className="mx-auto max-w-4xl mb-10">
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-indigo-200 mt-2">
            <span>Level 1: Wallet</span>
            <span>Level 2: Chain</span>
            <span>Level 3: Funding</span>
            <span>Level 4: First Trade</span>
          </div>
        </div>

        {/* Gamified checklist */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 p-5 mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold">Level 1: Chain Setup</h2>
              <p className="text-gray-300">
                Complete the steps to earn XP and unlock advanced tools.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-300">
                XP: {xp} / {xpPerTask * tasks.length}
              </div>
              <div className="w-48 h-2 bg-white/10 rounded-full mt-1">
                <div
                  className="h-2 rounded-full bg-purple-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">{progress}% complete</div>
            </div>
          </div>

          <ul className="mt-4 grid md:grid-cols-2 gap-3">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-lg border border-white/10 p-3 bg-white/5"
              >
                <button
                  aria-label={t.done ? "Uncheck task" : "Check task"}
                  onClick={() => toggleTask(t.id)}
                  className={`mt-0.5 w-5 h-5 rounded grid place-items-center border ${
                    t.done
                      ? "bg-green-500/80 border-green-400"
                      : "bg-transparent border-white/20"
                  }`}
                >
                  {t.done ? "✓" : ""}
                </button>
                <span className={t.done ? "line-through text-gray-400" : ""}>
                  {t.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/funding-guide"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold"
            >
              Open Funding Guide
            </Link>
            <Link
              to="/how-it-works"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
            >
              How IMALI Works
            </Link>
          </div>
        </div>

        {/* Chains grid (cards) */}
        <div className="grid md:grid-cols-3 gap-6">
          {chains.map((c) => (
            <article
              key={c.id}
              className={`rounded-xl border border-white/10 bg-gradient-to-br ${c.color} p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <span className="text-[10px] uppercase tracking-wide bg-white/10 rounded-full px-2 py-1">
                  {c.badge}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-300">Native Token</span>
                  <span className="font-mono">{c.symbol}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-300">Chain ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{c.id}</span>
                    <button
                      onClick={() => copy(c.id)}
                      className="text-xs px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <p className="text-gray-200/90 mt-3">{c.rpcNote}</p>

                <ul className="mt-3 space-y-1 text-gray-300 list-disc list-inside">
                  {c.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>

                {/* Advanced View */}
                {showAdvanced && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-gray-400">
                      Advanced: Use a dedicated RPC, set sane gas limits, and monitor
                      mempool for snipes. Always test with tiny size first.
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Advanced toggle + tip */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setShowAdvanced((s) => !s)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            {showAdvanced ? "Simple View" : "Advanced View"}
          </button>
          <span className="text-xs text-gray-400">
            Paid IMALI tiers include faster RPC for smoother trading.
          </span>
        </div>

        {/* Safety & Glossary (HowItWorks-style side-by-side) */}
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <section className={card}>
            <h4 className="text-lg font-semibold">Novice Safety Checklist</h4>
            <ul className="mt-3 space-y-2 text-indigo-100/90 text-sm">
              <li>🛡️ Verify token contracts on a block explorer before buying.</li>
              <li>🧪 Practice with $1–$5 to learn fees + slippage.</li>
              <li>🔑 Never share seed phrases—only use official wallets.</li>
              <li>📉 Expect volatility. Size positions to survive drawdowns.</li>
              <li>⛽ Keep extra gas token on each chain for emergencies.</li>
            </ul>
          </section>

          <section className={card}>
            <h4 className="text-lg font-semibold">Common Terms (Plain English)</h4>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium">Chain</dt>
                <dd className="text-gray-300">The network where your transactions live.</dd>
              </div>
              <div>
                <dt className="font-medium">Gas</dt>
                <dd className="text-gray-300">Fee in the chain’s native token to run actions.</dd>
              </div>
              <div>
                <dt className="font-medium">RPC</dt>
                <dd className="text-gray-300">The “internet line” your wallet uses to talk to a chain.</dd>
              </div>
              <div>
                <dt className="font-medium">Slippage</dt>
                <dd className="text-gray-300">How much price wiggle you allow during a trade.</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* FAQ */}
        <section className="mt-10">
          <h4 className="text-lg font-semibold mb-3">FAQ</h4>
          <div className="space-y-2">
            {[
              {
                q: "Which chain should I start with?",
                a: "Polygon or BNB are beginner-friendly due to low fees. Ethereum offers the most pairs but has higher gas.",
              },
              {
                q: "How much gas do I need?",
                a: "For tests, ~$5–$20 on low-fee chains; on Ethereum, keep more to handle spikes.",
              },
              {
                q: "Do I need a paid RPC?",
                a: "Free RPCs are fine to start. If you run bots or trade fast, premium RPCs improve reliability.",
              },
              {
                q: "Is switching chains risky?",
                a: "Switching networks is free. Bridging tokens has fees and risk—bridge small amounts first.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
                open={openFAQ === i}
                onToggle={(e) => setOpenFAQ(e.currentTarget.open ? i : null)}
              >
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-gray-300 text-sm">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/signup"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold"
          >
            Get Started
          </Link>
          <Link
            to="/funding-guide"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold"
          >
            Funding Guide
          </Link>
          <Link
            to="/how-it-works"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
          >
            How It Works
          </Link>
        </div>
      </div>
    </div>
  );
}