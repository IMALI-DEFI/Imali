// src/pages/PainLanding.jsx
// Pain-point landing pages for social posts.
// Each page: name the pain -> show how IMALI fixes it -> free practice signup -> Pro.
// Only claim what /pricing lists. Practice is free forever; Pro $19.95/mo; Elite $49/mo.
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { MascotLogo } from "../components/game/GameKit";
import { trackMarketingEvent } from "../components/MarketingTracker";

export const PAIN_PAGES = {
  "/too-many-apps": {
    eyebrow: "ONE PLACE FOR ALL OF IT",
    title: "Too many trading apps?",
    intro:
      "Robinhood for crypto. Alpaca for stocks. OKX for everything else. IMALI puts your accounts in one dashboard, with one robot that trades for you.",
    pains: [
      "You jump between apps just to see how you're doing.",
      "Every app has its own buttons, charts and rules.",
      "You never see your whole picture in one place.",
    ],
    helps: [
      ["🧩", "One dashboard", "Connect Robinhood Crypto, OKX and Alpaca and see them together."],
      ["🤖", "One robot", "Pick a market and a style, press Start, and your robot trades in that account."],
      ["📈", "One score", "See your total profit or loss from all your connected accounts."],
    ],
    cta: "Try it free",
  },
  "/learn-to-trade": {
    eyebrow: "LEARN BY WATCHING",
    title: "Trading feels confusing?",
    intro:
      "Watch a robot trade with $1,000 of pretend money and see why it buys and sells. You learn as it goes, without risking a cent.",
    pains: [
      "Charts look like a foreign language.",
      "Videos and courses don't show you a real trade happening.",
      "You're scared to lose money while you're still learning.",
    ],
    helps: [
      ["🎮", "Practice robot", "$1,000 of pretend money. Free forever, no card."],
      ["🎓", "Learn as it trades", "Every trade shows what the robot did, in plain words."],
      ["🛡️", "Safety built in", "Take-profit and stop-loss rules help limit losses on real trades."],
    ],
    cta: "Start my practice robot",
  },
  "/no-time-to-trade": {
    eyebrow: "TRADING WHILE YOU LIVE YOUR LIFE",
    title: "Can't watch charts all day?",
    intro:
      "You have a job, a family and a life. Your IMALI robot watches the market and follows its rules while you're busy.",
    pains: [
      "The best moves happen while you're at work or asleep.",
      "You miss your exit because you weren't looking.",
      "You make emotional trades when you finally check in.",
    ],
    helps: [
      ["⏰", "Watches for you", "Your robot scans the market and acts on its rules, day and night."],
      ["🎯", "Sticks to the plan", "Take-profit and stop-loss rules sell for you, no emotions."],
      ["🔔", "Easy check-ins", "Open your dashboard any time to see every trade it made."],
    ],
    cta: "Try it free",
  },
};

export default function PainLanding() {
  const { pathname } = useLocation();
  const page = PAIN_PAGES[pathname] || PAIN_PAGES["/too-many-apps"];
  const track = (cta) => {
    try {
      trackMarketingEvent("cta_click", { metadata: { path: pathname, cta } });
    } catch (_) {}
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-5 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <MascotLogo size={88} className="block mx-auto mb-4" />
          <p className="text-xs font-black tracking-[0.2em] text-cyan-300">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-black leading-tight">{page.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{page.intro}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="fun-btn fun-green fun-big" onClick={() => track("hero_signup")}>
              {page.cta}
            </Link>
            <Link to="/trade-demo" className="fun-btn fun-ghost" onClick={() => track("hero_demo")}>
              Watch the demo
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/60">Free forever. No card. No time limit.</p>
        </div>

        <section className="fun-card mt-12">
          <h2 className="text-2xl font-black">Sound familiar?</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-white/85">
            {page.pains.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <h2 className="mt-12 text-2xl font-black">How IMALI helps</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {page.helps.map(([icon, heading, body]) => (
            <section key={heading} className="fun-card">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-2 text-lg font-black">{heading}</h3>
              <p className="mt-1 text-white/75">{body}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-black">Start free. Go Pro when you're ready.</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="fun-card">
            <h3 className="text-xl font-black">Starter — Free</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-white/80">
              <li>Practice robot with $1,000 of pretend money</li>
              <li>Try every market style in practice</li>
              <li>No card, no time limit</li>
            </ul>
          </section>
          <section className="fun-card" style={{ borderColor: "rgba(255,214,90,.6)" }}>
            <h3 className="text-xl font-black">Pro — $19.95/mo</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-white/80">
              <li>Your robot trades your real account</li>
              <li>Connect OKX, Robinhood Crypto and Alpaca</li>
              <li>AI strategies with take-profit and stop-loss</li>
            </ul>
            <p className="mt-2 text-sm text-white/60">Elite ($49/mo) adds futures and DEX tools. Flat monthly price, no profit share. Cancel anytime.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="fun-btn fun-gold fun-big" onClick={() => track("bottom_signup")}>
            {page.cta}
          </Link>
          <Link to="/pricing" className="fun-btn fun-ghost" onClick={() => track("bottom_pricing")}>
            Compare plans
          </Link>
        </div>

        <p className="mt-12 text-center text-xs text-white/50">
          Practice trades use pretend money. Real trading can lose money. IMALI does not guarantee profits.
          Your money stays in your own accounts.
        </p>
      </div>
    </main>
  );
}
