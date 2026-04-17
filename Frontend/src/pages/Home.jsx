import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [isMuted, setIsMuted] = useState(true);
  const videoId = "x6Dvj1ALs-w";

  const Pill = ({ children }) => (
    <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm border">
      {children}
    </span>
  );

  const StepCard = ({ num, title, text }) => (
    <div className="rounded-3xl bg-white p-8 shadow-lg border">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
        {num}
      </div>
      <h3 className="mt-5 text-2xl font-bold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600 leading-relaxed">{text}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-white text-gray-900">

      {/* TOP BAR */}
      <div className="fixed right-4 top-4 z-50 rounded-full bg-white px-4 py-2 text-xs shadow-md">
        🔴 Live Bots Running
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

        {/* PROMO */}
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-8 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            🎁 Start with Paper Trading
          </h2>
          <p className="mt-3 text-lg opacity-95">
            Fake money • Real automated trading • Risk Free Learning
          </p>
        </div>

        {/* HEADLINE */}
        <div className="mt-14 text-center">
          <h1 className="mx-auto max-w-6xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-4xl font-extrabold text-transparent sm:text-6xl lg:text-7xl">
            Automated Trading for Stock and Crypto
          </h1>

          {/* NEW TAGLINE */}
          <p className="mx-auto mt-8 max-w-4xl text-xl leading-relaxed text-gray-700 sm:text-2xl">
            <span className="font-bold text-emerald-600">
              Take profits automatically and reducing loses trading stock and crypto.
            </span>
          </p>

          <p className="mx-auto mt-4 max-w-4xl text-lg text-gray-600">
            Start with paper trading (fake money real auto trading), then move to
            live auto trading when ready.
          </p>

          <p className="mt-4 text-lg font-bold text-red-600">
            CANCEL ANY TIME
          </p>

          {/* PILLS */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Pill>✅ Beginner Friendly</Pill>
            <Pill>📈 Stocks</Pill>
            <Pill>₿ Crypto</Pill>
            <Pill>🤖 AI Bots</Pill>
            <Pill>💸 Cancel Anytime</Pill>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/pricing"
              className="rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold text-white shadow-xl hover:bg-emerald-500"
            >
              Start Now →
            </Link>

            <Link
              to="/trade-demo"
              className="rounded-full border border-gray-300 bg-white px-10 py-4 text-lg font-bold text-gray-800 hover:bg-gray-50"
            >
              Try Demo →
            </Link>
          </div>
        </div>

        {/* VIDEO */}
        <div className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-3xl bg-black shadow-2xl relative">
          <div className="relative pt-[56.25%]">
            <iframe
              className="absolute left-0 top-0 h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&loop=1&mute=${
                isMuted ? 1 : 0
              }&controls=1&modestbranding=1&rel=0&playlist=${videoId}`}
              title="IMALI Trading Demo"
              allowFullScreen
            />
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-6 right-6 rounded-full bg-black/70 px-4 py-3 text-white"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </section>

      {/* 3 STEPS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-4xl font-extrabold text-gray-900">
          Start in 3 Easy Steps
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">

          <StepCard
            num="1"
            title="Connect Accounts"
            text="Connect your stock broker or crypto wallet: Alpaca, OKX, MetaMask."
          />

          <StepCard
            num="2"
            title="Select Strategy"
            text="Choose the bot strategy that fits your trading style."
          />

          <StepCard
            num="3"
            title="Begin Trading"
            text="Start paper trading first, then switch to live automated trading anytime."
          />

        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">

          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="text-4xl">📈</div>
            <h3 className="mt-4 text-2xl font-bold">Stock Bots</h3>
            <p className="mt-3 text-gray-600">
              Automate stock trading with Alpaca.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="text-4xl">₿</div>
            <h3 className="mt-4 text-2xl font-bold">Crypto Bots</h3>
            <p className="mt-3 text-gray-600">
              Trade crypto automatically with OKX and MetaMask.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="text-4xl">🤖</div>
            <h3 className="mt-4 text-2xl font-bold">AI Automation</h3>
            <p className="mt-3 text-gray-600">
              Bots can take profits automatically and reduce emotional trading.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-gradient-to-r from-emerald-600 to-cyan-600 py-20 text-center text-white">
        <h2 className="text-4xl font-extrabold">
          Ready to Begin?
        </h2>

        <p className="mt-4 text-xl opacity-95">
          Start with fake money. Move to live trading when ready.
        </p>

        <p className="mt-3 text-lg font-bold">
          Cancel Any Time.
        </p>

        <Link
          to="/pricing"
          className="mt-8 inline-block rounded-full bg-white px-10 py-4 text-lg font-bold text-emerald-700 shadow-xl"
        >
          Get Started →
        </Link>
      </section>
    </div>
  );
}
