// src/pages/Pricing.jsx
import React from "react";
import { Link } from "react-router-dom";

// 🖼️ Tier NFT art (ensure these paths exist)
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT     from "../assets/images/nfts/nft-pro.png";
import EliteNFT   from "../assets/images/nfts/nft-elite.png";
import StockNFT   from "../assets/images/nfts/nft-stock.png";
import BundleNFT  from "../assets/images/nfts/nft-bundle.png";

// Allow env overrides but keep your defaults
const envNum = (k, fallback) => {
  const v = process.env[k];
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const PRICE = {
  starter: envNum("REACT_APP_PRICE_STARTER", 0),
  pro:     envNum("REACT_APP_PRICE_PRO", 19),
  elite:   envNum("REACT_APP_PRICE_ELITE", 49),
  stock:   envNum("REACT_APP_PRICE_STOCK", 99),
  bundle:  envNum("REACT_APP_PRICE_BUNDLE", 199),
};

const fmt = (n) => (n === 0 ? "$0" : `$${n}/mo`);

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: fmt(PRICE.starter),
      description: "Get started with IMALI and explore the basics.",
      perks: [
        "Demo: CEX / DEX / Stocks",
        "AI Weighted & core strategies",
        "Basic Telegram alerts",
      ],
      color: "from-sky-500 to-indigo-600",
      nft: StarterNFT,
      badgeClass: "bg-sky-600/20 text-sky-200 border border-sky-300/30",
    },
    {
      name: "Pro",
      slug: "pro",
      price: fmt(PRICE.pro),
      description: "Unlock enhanced bot features for crypto.",
      perks: [
        "CEX or DEX (Live-ready)",
        "Custom parameters & risk controls",
        "Telegram fills & risk alerts",
        "Priority support",
      ],
      color: "from-fuchsia-500 to-purple-600",
      nft: ProNFT,
      badgeClass: "bg-fuchsia-600/20 text-fuchsia-200 border border-fuchsia-300/30",
      popular: true, // purely visual
    },
    {
      name: "Elite",
      slug: "elite",
      price: fmt(PRICE.elite),
      description: "Advanced crypto features and analytics.",
      perks: [
        "CEX + DEX (Live-ready)",
        "Auto-run engine (≈4s ticks) + markers",
        "Advanced analytics & KPIs",
        "Early access to new models",
      ],
      color: "from-amber-400 to-orange-600",
      nft: EliteNFT,
      badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
    },
    {
      name: "Stock",
      slug: "stock",
      price: fmt(PRICE.stock),
      description: "Equities bot (Demo + Live via exchange API).",
      perks: [
        "Stocks Demo + Live (API ready)",
        "Local AAPL simulator + optional remote API",
        "Equity curve, KPIs & alerts",
        "Email support",
      ],
      color: "from-yellow-500 to-amber-600",
      nft: StockNFT,
      badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
    },
    {
      name: "BUNDLE ALL",
      slug: "bundle",
      price: fmt(PRICE.bundle),
      description: "Everything: CEX + DEX + Stocks (Demo & Live-ready).",
      perks: [
        "LIVE: CEX + DEX + Stocks",
        "Unified dashboard & auto-run engine",
        "Full alerts, analytics, and priority support",
        "Best value for power users",
      ],
      color: "from-zinc-300 to-slate-500",
      nft: BundleNFT,
      badgeClass: "bg-zinc-300/20 text-zinc-100 border border-zinc-200/30",
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Gamified background */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-pink-500 text-transparent bg-clip-text animate-pulse">
          🎮 Power Up with IMALI
        </h1>
        <p className="text-xl mb-12 text-gray-300 max-w-3xl mx-auto">
          Choose your tier, unlock bot perks, and level up your DeFi game. The
          more IMALI you hold, the more rewards and discounts you unlock.
        </p>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`group relative rounded-2xl shadow-xl bg-gradient-to-br ${plan.color} p-1 transition duration-300 hover:scale-[1.02]`}
            >
              {/* Inner card */}
              <div className="h-full rounded-2xl bg-black/40 backdrop-blur p-7 flex flex-col">
                {/* Tier badge */}
                <div
                  className={`inline-flex self-start mb-4 px-3 py-1 rounded-full text-xs font-semibold ${plan.badgeClass}`}
                >
                  {plan.name} Tier
                </div>

                {/* NFT preview */}
                <div className="relative mx-auto mb-6 w-full max-w-xs">
                  <img
                    src={plan.nft}
                    alt={`${plan.name} Tier Robot NFT`}
                    loading="lazy"
                    className="w-full h-auto rounded-xl shadow-lg ring-1 ring-white/10"
                  />
                  {plan.popular && (
                    <div className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-1 rounded bg-amber-400 text-black shadow">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_40px_2px_rgba(255,255,255,0.15)]" />
                </div>

                {/* Copy */}
                <h2 className="text-3xl font-bold mb-1">{plan.name}</h2>
                <p className="text-lg mb-4 text-gray-100">{plan.description}</p>
                <p className="text-4xl font-extrabold mb-6">{plan.price}</p>

                {/* Perks */}
                <ul className="text-left space-y-3 flex-1">
                  {plan.perks.map((perk, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <span className="text-emerald-300">✔</span>
                      <span className="text-white/90">{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={`/signup?tier=${plan.slug}`}
                  className="mt-8 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition font-bold text-center"
                >
                  Select {plan.name}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-sm text-white/60">
          NFTs are your visual badges for each tier. Holding IMALI can reduce the take-rate on net
          PnL across paid plans. Signup will detect IMALI and apply any eligible discounts.
        </div>
      </div>
    </div>
  );
}
