import React from "react";
import { Link, useLocation } from "react-router-dom";

import { MascotLogo } from "../components/game/GameKit";
const COMPARISONS = {
  "/compare/3commas": {
    competitor: "3Commas",
    title: "IMALI vs 3Commas",
    subtitle: "AI-assisted crypto automation compared",
    competitorFocus: "3Commas offers SmartTrade tools, DCA, signal and grid bots, TradingView integrations, backtesting and AI-assisted bot setup across connected exchanges.",
    imaliFocus: "IMALI focuses on AI-assisted market scoring, automated execution, connected-account trading and a non-custodial workflow designed to keep assets with supported providers.",
    chooseCompetitor: "You may prefer 3Commas if you want a mature toolkit centered on configurable DCA, grid, signal and TradingView-driven bot strategies.",
    chooseUs: "You may prefer IMALI if you want a more guided AI trading assistant that emphasizes market scoring, automation and simplified decision support."
  },
  "/compare/cryptohopper": {
    competitor: "Cryptohopper",
    title: "IMALI vs Cryptohopper",
    subtitle: "Crypto trading bots and AI automation compared",
    competitorFocus: "Cryptohopper offers automatic trading, strategy design, signals, copy trading, trailing tools, paper trading, backtesting and AI strategy selection.",
    imaliFocus: "IMALI is designed around AI-assisted analysis, confidence scoring, automated trade execution and connected-account trading without taking custody of user assets.",
    chooseCompetitor: "You may prefer Cryptohopper if you want a broad catalog of configurable bot types, marketplace strategies and social or copy-trading features.",
    chooseUs: "You may prefer IMALI if you want AI-guided market evaluation and execution in a simpler workflow centered on confidence and risk controls."
  },
  "/compare/pionex": {
    competitor: "Pionex",
    title: "IMALI vs Pionex",
    subtitle: "Connected trading assistant vs exchange with built-in bots",
    competitorFocus: "Pionex is a crypto exchange with built-in automated trading bots, including grid, DCA and rebalancing tools.",
    imaliFocus: "IMALI is a non-custodial trading assistant designed to connect with supported external accounts and apply AI-assisted analysis and automation without becoming the exchange itself.",
    chooseCompetitor: "You may prefer Pionex if you want an exchange and its built-in trading bots in one platform.",
    chooseUs: "You may prefer IMALI if you want an AI trading layer that works with supported connected accounts rather than moving your trading workflow into a single bot-focused exchange."
  }
};

export default function Compare() {
  const { pathname } = useLocation();
  const page = COMPARISONS[pathname] || COMPARISONS["/compare/3commas"];

  return (
    <div className="min-h-screen bg-[#050816] text-white px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <p className="text-emerald-400 font-bold tracking-[0.2em] mb-4">IMALI COMPARISON</p>
        <MascotLogo size={84} className="block mx-auto mb-3" />
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">{page.title}</h1>
        <p className="text-lg md:text-xl text-white/70">{page.subtitle}</p>

        <div className="grid md:grid-cols-2 gap-5 mt-10">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold mb-3">{page.competitor}</h2>
            <p className="text-white/70 leading-7">{page.competitorFocus}</p>
          </section>
          <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6">
            <h2 className="text-2xl font-semibold mb-3">IMALI</h2>
            <p className="text-white/70 leading-7">{page.imaliFocus}</p>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Which one may fit you better?</h2>
          <p className="text-white/70 leading-7 mb-3"><strong className="text-white">{page.competitor}:</strong> {page.chooseCompetitor}</p>
          <p className="text-white/70 leading-7"><strong className="text-white">IMALI:</strong> {page.chooseUs}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Why IMALI is different</h2>
          <p className="text-white/70 leading-7">
            IMALI is built as an AI trading assistant rather than a custody platform. Its goal is to help users analyze opportunities, score setups, apply risk controls and automate eligible trades through supported connected accounts while keeping asset custody with those providers.
          </p>
        </section>

        <div className="flex flex-wrap gap-5 mt-10">
          <Link className="text-emerald-400 underline" to="/trade-demo">View the IMALI Demo</Link>
          <Link className="text-emerald-400 underline" to="/how-it-works">How IMALI Works</Link>
          <Link className="text-emerald-400 underline" to="/pricing">View Pricing</Link>
        </div>

        <p className="text-white/40 text-sm mt-10">
          Product features can change over time. This comparison is based on publicly described product positioning and is intended for general informational purposes. Trading involves risk.
        </p>
      </div>
    </div>
  );
}
