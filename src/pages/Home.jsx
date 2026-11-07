// src/pages/Home.jsx — game-style home (same links, offers and social showcase as before).
import React from "react";
import { Link } from "react-router-dom";
import RecentSocialShowcase from "../components/RecentSocialShowcase";
import { MascotLogo } from "../components/game/GameKit";
import { ShadowLabCard } from "../components/game/ShadowLab";

const STEPS = [
  { emoji: "📝", color: "fun-gold", title: "Make your account", text: "Sign up and pick the plan you want." },
  { emoji: "🔌", color: "fun-blue", title: "Connect an account", text: "Robinhood Crypto, OKX, Alpaca, Kalshi or a DEX wallet. Your money stays there." },
  { emoji: "🤖", color: "fun-green", title: "Let your robot trade", text: "IMALI watches the market, checks chances, and trades using your settings." },
];

const PROVIDERS = [
  { emoji: "🪶", color: "fun-green", name: "Robinhood Crypto" },
  { emoji: "🪙", color: "fun-gold", name: "OKX" },
  { emoji: "🏛️", color: "fun-blue", name: "Alpaca" },
  { emoji: "🔮", color: "fun-purple", name: "Kalshi" },
  { emoji: "🔗", color: "fun-orange", name: "DEX Wallet" },
];

const DEMO_MARKETS = ["🪙 OKX Spot & Futures", "🪶 Robinhood Crypto", "🏛️ Alpaca & Options", "🔮 DEX & Kalshi"];

export default function Home() {
  return (
    <div className="fun-game-bg min-h-screen overflow-x-hidden text-white" style={{ background: "radial-gradient(circle at 50% -10%, #2a1366 0, #0a0d26 45%, #050816 100%)" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
        {/* HERO */}
        <section className="fun-sparkle p-6 sm:p-10 text-center">
          <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <MascotLogo size={120} className="mx-auto" />
          <h1 className="mt-3 text-4xl sm:text-6xl font-black leading-tight">
            Let IMALI <span className="fun-shine-text">Trade for You</span>
          </h1>
          <p className="fun-help text-lg sm:text-xl mt-4 max-w-2xl mx-auto">
            Connect a trading account you already have. Your IMALI robot looks for good chances, keeps losses small,
            and trades for you — while you learn how markets work.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/trade-demo" className="fun-btn fun-gold fun-big fun-pulse">
              <span className="fun-btn-emoji" aria-hidden="true">🎮</span> Play the Free Demo
            </Link>
            <Link to="/signup" className="fun-btn fun-green fun-big">
              <span aria-hidden="true">🚀</span> Get Started
            </Link>
          </div>
          <p className="text-sm text-white/60 mt-3">The demo uses pretend money. No sign-up needed.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="fun-pill">🔒 Your money stays in your account</span>
            <span className="fun-pill">🛑 Stop-loss safety net</span>
            <span className="fun-pill">⏹️ Cancel any time</span>
          </div>
        </section>

        {/* DEMO PREVIEW */}
        <section className="grid gap-6 lg:grid-cols-2 items-center">
          <div>
            <span className="fun-pill">🎮 Free practice mode</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">Try every robot before you connect anything</h2>
            <p className="fun-help mt-3 text-lg">
              Play with $1,000 in pretend money across OKX, Robinhood Crypto, Alpaca, DEX, options, futures and Kalshi.
              Everything in the demo is simulated — nothing real happens.
            </p>
            <Link to="/trade-demo" className="fun-btn fun-gold mt-5">🎮 Open the Demo →</Link>
          </div>
          <Link to="/trade-demo" className="fun-card block hover:-translate-y-1 transition" aria-label="Open the interactive demo">
            <div className="flex justify-between text-sm font-bold">
              <span className="fun-help">IMALI · Robot HQ preview</span>
              <span className="fun-pill">🟡 PRACTICE</span>
            </div>
            <div className="my-6 text-center">
              <div className="text-5xl font-black text-[#4ff0a0]">$1,000.00</div>
              <div className="fun-help text-sm mt-1">💵 Starting play money</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_MARKETS.map((m) => (
                <div key={m} className="rounded-xl border-2 border-white/10 bg-white/5 p-3 text-sm font-bold">{m}</div>
              ))}
            </div>
            <p className="mt-4 text-center font-black text-[#ffe07a]">Tap to play →</p>
          </Link>
        </section>

        <ShadowLabCard />

        <RecentSocialShowcase />

        {/* 3 STEPS */}
        <section>
          <h2 className="text-center text-3xl sm:text-4xl font-black">How it works — 3 steps</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`fun-tile ${s.color}`} style={{ minHeight: 220, cursor: "default" }}>
                <span className="fun-step" style={{ position: "absolute", top: 12, left: 12 }}>{i + 1}</span>
                <span className="fun-emoji" aria-hidden="true">{s.emoji}</span>
                <strong>{s.title}</strong>
                <span className="text-sm font-bold max-w-[17rem]" style={{ textShadow: "0 1px 0 #0006" }}>{s.text}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link to="/how-it-works" className="fun-btn fun-ghost">🧭 See the full tour</Link>
          </div>
        </section>

        {/* PROVIDERS */}
        <section className="fun-card text-center">
          <h2 className="text-2xl sm:text-3xl font-black">🔌 Use an account you already have</h2>
          <p className="fun-help mt-2 max-w-xl mx-auto">IMALI connects to these without ever holding your money.</p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PROVIDERS.map((p) => (
              <div key={p.name} className={`fun-tile ${p.color}`} style={{ minHeight: 120, cursor: "default" }}>
                <span className="fun-emoji" style={{ fontSize: "2.6rem" }} aria-hidden="true">{p.emoji}</span>
                <strong style={{ fontSize: "1rem" }}>{p.name}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* OFFER */}
        <section className="fun-sparkle p-6 sm:p-10 max-w-3xl mx-auto text-center">
          <div className="fun-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <span className="fun-pill">🚀 IMALI Pro</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black">Put a robot to work on your trading</h2>
          <p className="fun-help mt-3 max-w-xl mx-auto">
            Connect a supported account, pick your settings, and let IMALI find chances and make eligible trades for you.
          </p>
          <div className="mt-6 flex items-end justify-center gap-2">
            <span className="text-6xl font-black text-[#ffe07a]">$19.95</span>
            <span className="mb-2 text-lg fun-help">/month</span>
          </div>
          <Link
            to="/signup?plan=pro&tier=pro&product_type=trading"
            state={{ tier: "pro", product_type: "trading", from: "home-video-demo" }}
            className="fun-btn fun-gold fun-big mt-6 w-full sm:w-auto"
          >
            <span className="fun-btn-emoji" aria-hidden="true">🚀</span> Start Trading with IMALI
          </Link>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="fun-pill">🔒 Non-custodial</span>
            <span className="fun-pill">✅ Your money stays in your account</span>
            <span className="fun-pill">⏹️ Cancel any time</span>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="fun-card p-8 text-center">
          <MascotLogo size={84} className="mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-black mt-2">Ready to let IMALI watch the market for you?</h2>
          <p className="fun-help mt-2 max-w-xl mx-auto">Try the free demo first, or jump straight in.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/trade-demo" className="fun-btn fun-blue fun-big">🎮 Play the Demo</Link>
            <Link
              to="/signup?plan=pro&tier=pro&product_type=trading"
              state={{ tier: "pro", product_type: "trading", from: "home" }}
              className="fun-btn fun-green fun-big"
            >
              🚀 Start Pro — $19.95/month
            </Link>
          </div>
          <p className="text-xs text-white/40 mt-5">Trading with real money can lose money. Past results don't promise future results.</p>
        </section>
      </div>
    </div>
  );
}
