import React from "react";
import { Link, useLocation } from "react-router-dom";

import { MascotLogo } from "../components/game/GameKit";
const PAGES = {
  "/ai-crypto-trading-bot": {
    eyebrow: "AI CRYPTO TRADING BOT",
    title: "AI Crypto Trading Bot for Automated Market Analysis and Execution",
    intro: "IMALI is a non-custodial AI trading assistant that analyzes crypto markets, scores opportunities and can automate execution through connected accounts.",
    sections: [
      ["AI-assisted trade analysis", "IMALI evaluates market conditions and trading signals to help identify higher-quality setups."],
      ["Automated execution", "Connect supported accounts so approved strategies can move from analysis to execution without transferring custody of your funds."],
      ["Built around risk controls", "Confidence scoring, position controls and exit logic are designed to support disciplined automated trading."]
    ]
  },
  "/automated-crypto-trading": {
    eyebrow: "AUTOMATED CRYPTO TRADING",
    title: "Automated Crypto Trading with AI-Assisted Decision Support",
    intro: "Use IMALI to combine market analysis, scoring and automated crypto trading in one workflow while keeping assets in your connected accounts.",
    sections: [
      ["From signal to action", "IMALI can evaluate setups and route qualified decisions into your configured trading workflow."],
      ["Non-custodial architecture", "IMALI is designed to connect to your existing accounts rather than take custody of your assets."],
      ["Continuous market monitoring", "Automated analysis helps reduce the need to manually watch every market and timeframe."]
    ]
  },
  "/crypto-trading-software": {
    eyebrow: "CRYPTO TRADING SOFTWARE",
    title: "Crypto Trading Software for AI Analysis, Automation and Risk Management",
    intro: "IMALI brings market intelligence, trading automation and connected-account execution together in a single crypto trading platform.",
    sections: [
      ["Unified trading workflow", "Analyze markets, score opportunities, review strategy performance and manage automation from one place."],
      ["Connected exchanges and brokers", "IMALI is built around integrations so users can work with supported accounts they already use."],
      ["Transparent decision support", "See the analysis and confidence behind a trading decision instead of relying on a black-box signal feed."]
    ]
  },
  "/non-custodial-trading-bot": {
    eyebrow: "NON-CUSTODIAL TRADING BOT",
    title: "Non-Custodial Trading Bot for AI-Powered Crypto Automation",
    intro: "IMALI is built to automate trading without requiring users to deposit assets into an IMALI-controlled account.",
    sections: [
      ["Keep control of assets", "Your funds remain with supported connected providers rather than being pooled into an IMALI custody account."],
      ["AI-assisted automation", "Trading logic combines market analysis, confidence scoring and configurable execution rules."],
      ["Designed for oversight", "Users can review performance, account connections and automation settings from the IMALI dashboard."]
    ]
  }
};

export default function SEOLanding() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || PAGES["/ai-crypto-trading-bot"];

  return (
    <div className="min-h-screen bg-[#050816] text-white px-6 py-20">
      <div className="max-w-5xl mx-auto">
        <p className="text-emerald-400 font-bold tracking-[0.2em] mb-4">{page.eyebrow}</p>
        <MascotLogo size={84} className="block mx-auto mb-3" />
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">{page.title}</h1>
        <p className="text-lg md:text-xl text-white/70 leading-8 max-w-3xl">{page.intro}</p>

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {page.sections.map(([heading, body]) => (
            <section key={heading} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold mb-3">{heading}</h2>
              <p className="text-white/65 leading-7">{body}</p>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap gap-5 mt-10">
          <Link className="text-emerald-400 underline" to="/trade-demo">View the IMALI Demo</Link>
          <Link className="text-emerald-400 underline" to="/how-it-works">How IMALI Works</Link>
          <Link className="text-emerald-400 underline" to="/pricing">View Pricing</Link>
        </div>

        <p className="text-white/45 text-sm mt-10">
          Trading involves risk. IMALI provides software, analysis and automation tools and does not guarantee trading results.
        </p>
      </div>
    </div>
  );
}
