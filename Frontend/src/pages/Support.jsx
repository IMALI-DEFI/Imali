import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Support() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "I connected my wallet but features are locked. What now?",
      a: "Make sure your subscription tier is active and your wallet address is synced in your Profile. If you recently upgraded, refresh the page and reconnect your wallet.",
    },
    {
      q: "Trades aren’t showing on my dashboard.",
      a: "Check the bot status below, confirm your selected exchange (OKX) API keys are valid, and verify your Telegram notifications are enabled in your profile.",
    },
    {
      q: "Why is a transaction pending?",
      a: "High network congestion or low gas can delay confirmation. Try increasing gas or wait a few minutes. See Supported Chains for RPC tips.",
    },
    {
      q: "How do referrals and XP work?",
      a: "Share your referral link from the dashboard. As referrals trade, you earn commissions and XP that unlock cosmetic badges and perks.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-950 via-indigo-950/40 to-gray-950 text-white">
      {/* Ambient, gamified background elements */}
      <div className="pointer-events-none absolute -top-20 -left-32 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(236,72,153,0.06),transparent_35%)]" />

      <div className="max-w-6xl mx-auto px-4 py-14">
        {/* Header / Gamified Stats */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Support & Player Help
            </h1>
            <p className="text-gray-300 mt-2">
              Stuck on a quest? Power up here. Browse quick actions, status, and FAQs—or open a ticket.
            </p>
          </div>

          {/* Player card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 md:w-[360px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Player Level</p>
                <p className="text-xl font-bold">Level 3 — Apprentice</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-3 py-1 text-xs font-semibold">
                ● Online
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>XP</span>
                <span>480 / 600</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[80%] bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-[11px] rounded-md bg-indigo-500/15 text-indigo-300 px-2 py-1">
                  🎯 Daily Streak: 4
                </span>
                <span className="text-[11px] rounded-md bg-amber-500/15 text-amber-300 px-2 py-1">
                  🏆 Referral Rookie
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <Link
            to="/supported-chains"
            className="group relative block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-lg">Supported Chains</h2>
              <span className="text-white/60 group-hover:translate-x-1 transition">→</span>
            </div>
            <p className="text-gray-300 mt-2">Networks, RPC tips, gas guidance.</p>
            <div className="mt-4 text-xs text-white/60">Polygon • Ethereum • Base</div>
          </Link>

          <Link
            to="/funding-guide"
            className="group relative block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-lg">Funding Guide</h2>
              <span className="text-white/60 group-hover:translate-x-1 transition">→</span>
            </div>
            <p className="text-gray-300 mt-2">Get crypto into your wallet step-by-step.</p>
            <div className="mt-4 text-xs text-white/60">Screenshots • Safety tips</div>
          </Link>

          <Link
            to="/wallet-metamask"
            className="group relative block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-lg">MetaMask Setup</h2>
              <span className="text-white/60 group-hover:translate-x-1 transition">→</span>
            </div>
            <p className="text-gray-300 mt-2">Install, create, and secure your wallet.</p>
            <div className="mt-4 text-xs text-white/60">Seed phrase • Hardware tips</div>
          </Link>
        </div>

        {/* Status + Actions */}
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">System Status</h3>
              <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-1">All Systems Operational</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-300">
              <li>• Dashboard API — <span className="text-emerald-300">OK</span></li>
              <li>• Telegram Alerts — <span className="text-emerald-300">OK</span></li>
              <li>• OKX Integration — <span className="text-emerald-300">OK</span></li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold">Troubleshooting</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              <li>1) Refresh and reconnect your wallet</li>
              <li>2) Verify your tier is active</li>
              <li>3) Check RPC and gas settings</li>
              <li>4) Review exchange API keys</li>
            </ul>
            <Link
              to="/how-it-works"
              className="inline-block mt-4 text-sm rounded-md border border-white/10 bg-white/10 px-3 py-2 hover:bg-white/20"
            >
              Open the Step-by-Step Wizard
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-semibold">Contact & Community</h3>
            <div className="mt-3 space-y-3 text-sm">
              <a
                href="mailto:support@imali-defi.com"
                className="block rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-3 py-2"
              >
                ✉️ Email Support — support@imali-defi.com
              </a>
              <a
                className="block rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-2"
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noreferrer"
              >
                🤖 Telegram Bot — @Imalitradingbot
              </a>
              <Link
                to="/referral"
                className="block rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-3 py-2"
              >
                🏅 Referral Center — Earn XP & Commissions
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ (Accordion) */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">FAQ</h2>
            <span className="text-xs text-white/60">New? Start here.</span>
          </div>

          <div className="mt-4 divide-y divide-white/10">
            {faqs.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left py-4 focus:outline-none"
                aria-expanded={openFaq === idx}
                aria-controls={`faq-panel-${idx}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">{item.q}</p>
                  <span className="text-white/60">{openFaq === idx ? "−" : "+"}</span>
                </div>
                <div
                  id={`faq-panel-${idx}`}
                  className={`text-sm text-gray-300 transition-all ${
                    openFaq === idx ? "mt-2 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                  }`}
                >
                  {item.a}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket CTA */}
        <div className="mt-10 rounded-2xl border border-indigo-400/30 bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/20 p-6 text-center">
          <h3 className="text-lg font-semibold">Still need help?</h3>
          <p className="text-gray-200 mt-1">
            Open a ticket and our team will assist. Include your wallet address and any error messages.
          </p>
          <a
            href="mailto:support@imali-defi.com?subject=Support%20Ticket%20Request&body=Wallet%20Address:%0D%0AIssue:%0D%0ASteps%20Tried:%0D%0AScreenshots/Tx%20Hash:"
            className="inline-block mt-4 rounded-lg border border-white/10 bg-white/10 px-4 py-2 hover:bg-white/20"
          >
            🎟️ Open a Ticket via Email
          </a>
        </div>
      </div>
    </div>
  );
}