// src/pages/Pricing.jsx
import React from "react";
import { Link } from "react-router-dom";

// 🖼️ Tier NFT art (ensure these paths exist)
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

// Allow env overrides but keep your defaults
const envNum = (k, fallback) => {
  const v = process.env[k];
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const PRICE = {
  starter: envNum("REACT_APP_PRICE_STARTER", 0),
  pro: envNum("REACT_APP_PRICE_PRO", 19),
  elite: envNum("REACT_APP_PRICE_ELITE", 49),
  stock: envNum("REACT_APP_PRICE_STOCK", 99),
  bundle: envNum("REACT_APP_PRICE_BUNDLE", 199),
};

const fmt = (n) => (n === 0 ? "$0" : `$${n}/mo`);

export default function Pricing() {
  // --- Fee rules copy (keep consistent across cards) ---
  const feeFloorLine = "Performance fees apply only on net positive profits above a 3% floor (per billing period).";
  const netProfitLine =
    "“Net profits” means realized PnL after bot trades close, excluding exchange/broker/blockchain/platform fees.";
  const cancelLine = "Cancel anytime. Fees are time-adjusted for partial months after cancellation.";
  const noAdviceLine = "Not financial advice. Trading involves risk, including total loss.";

  // Keep tier slugs aligned with backend checkout tiers: starter/pro/elite/stock/bundle
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: fmt(PRICE.starter),
      kicker: "Free access + pay only on results",
      description:
        "Auto-execution for CEX + Stocks with a performance fee only when you’re up and above the floor.",
      perks: [
        "Live: OKX (CEX) + Alpaca (Stocks)",
        "Auto-execution (when enabled in your account settings)",
        "30% performance fee on net profits above 3% (monthly)",
        "Reduce performance fee to 20% with a $100 IMALI purchase (monthly)",
        "Basic dashboards + alerts",
      ],
      fineprint: [
        feeFloorLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        cancelLine,
      ],
      color: "from-sky-500 to-indigo-600",
      nft: StarterNFT,
      badgeClass: "bg-sky-600/20 text-sky-200 border border-sky-300/30",
    },

    // PRO (slug = pro, price = 19) => Stocks-only plan per your request
    {
      name: "Pro (Stocks)",
      slug: "pro",
      price: fmt(PRICE.pro),
      kicker: "Stocks-first plan",
      description:
        "Focused Alpaca stock bot plan with lower ongoing cost and a small performance fee on wins.",
      perks: [
        "Live: Alpaca (Stocks)",
        "Auto-execution (when enabled)",
        "5% performance fee on net profits above 3% (monthly)",
        "Reduce performance fee to 2% with a $100 IMALI purchase (monthly)",
        "Improved risk controls + alerts",
        "Suggested minimum: $150+ to start (not required)",
      ],
      fineprint: [
        feeFloorLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        cancelLine,
      ],
      color: "from-fuchsia-500 to-purple-600",
      nft: ProNFT,
      badgeClass: "bg-fuchsia-600/20 text-fuchsia-200 border border-fuchsia-300/30",
      popular: true,
    },

    // ELITE (slug = elite, price = 49) => CEX + Stocks
    {
      name: "Pro+ (CEX + Stocks)",
      slug: "elite",
      price: fmt(PRICE.elite),
      kicker: "CEX + Stocks combined",
      description:
        "OKX + Alpaca automation with stronger controls and the same reduced performance fee rules.",
      perks: [
        "Live: OKX (CEX) + Alpaca (Stocks)",
        "Auto-execution (when enabled)",
        "5% performance fee on net profits above 3% (monthly)",
        "Reduce performance fee to 2% with a $100 IMALI purchase (monthly)",
        "Priority alerts + faster support",
        "Suggested minimum: $150+ to start (not required)",
      ],
      fineprint: [
        feeFloorLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        cancelLine,
      ],
      color: "from-amber-400 to-orange-600",
      nft: EliteNFT,
      badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
    },

    // STOCK (slug = stock, price = 99) => DEX + (Stocks OR CEX) + DeFi unlocks + lending
    {
      name: "Elite (DeFi)",
      slug: "stock",
      price: fmt(PRICE.stock),
      kicker: "DEX access + DeFi unlocks",
      description:
        "DEX trading plus premium infra and DeFi tools. Choose DEX + (CEX or Stocks) and unlock advanced modules.",
      perks: [
        "DEX access (Uniswap/QuickSwap-style execution)",
        "Choose: DEX + Stocks OR DEX + CEX",
        "Paid RPC access (better reliability under load)",
        "Yield Farming + Staking unlock with $25 IMALI entry fee",
        "Lending features included (higher tiers)",
        "Suggested minimum: $150+ to start (not required)",
      ],
      fineprint: [
        "DEX trading depends on wallet connection, gas, slippage, and network conditions.",
        "Yield/Staking unlock requires a $25 IMALI entry fee (one-time, non-refundable).",
        netProfitLine,
        cancelLine,
      ],
      color: "from-yellow-500 to-amber-600",
      nft: StockNFT,
      badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
    },

    // BUNDLE (slug = bundle, price = 199) => All 3
    {
      name: "Bundle (All)",
      slug: "bundle",
      price: fmt(PRICE.bundle),
      kicker: "Everything unlocked",
      description:
        "Full stack: DEX + CEX + Stocks, plus DeFi modules (staking/yield/lending) and the best access.",
      perks: [
        "All: DEX + CEX (OKX) + Stocks (Alpaca)",
        "Auto-execution (when enabled) + unified dashboard",
        "Paid RPC + DeFi modules + lending included",
        "Priority support + fastest updates",
        "Suggested minimum: $150+ to start (not required)",
      ],
      fineprint: [
        netProfitLine,
        "Fees and execution reliability depend on connected services and network conditions.",
        cancelLine,
      ],
      color: "from-zinc-300 to-slate-500",
      nft: BundleNFT,
      badgeClass: "bg-zinc-300/20 text-zinc-100 border border-zinc-200/30",
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-extrabold mb-3 tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-pink-500 text-transparent bg-clip-text">
          IMALI Pricing
        </h1>

        {/* First 50 promo banner */}
        <div className="mx-auto mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
          <div className="text-sm font-semibold text-emerald-200">Limited promo</div>
          <div className="text-xl font-extrabold text-white mt-1">
            First 50 customers: 5% performance fee over 3% for 90 days
          </div>
          <div className="text-sm text-white/80 mt-2">
            Applies to eligible paid plans after signup. Promo terms may require verification and can end when the first 50
            spots are filled.
          </div>
        </div>

        <p className="text-lg mb-10 text-gray-300 max-w-3xl mx-auto">
          Auto bots across <b>Stocks (Alpaca)</b>, <b>CEX (OKX)</b>, and <b>DEX</b>.
          Pick a plan, connect your accounts, and track performance in one dashboard.
        </p>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`group relative rounded-2xl shadow-xl bg-gradient-to-br ${plan.color} p-1 transition duration-300 hover:scale-[1.02]`}
            >
              <div className="h-full rounded-2xl bg-black/40 backdrop-blur p-7 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`inline-flex self-start mb-2 px-3 py-1 rounded-full text-xs font-semibold ${plan.badgeClass}`}
                  >
                    {plan.name}
                  </div>
                  {plan.popular && (
                    <div className="text-[10px] font-bold px-2 py-1 rounded bg-amber-400 text-black shadow">
                      MOST POPULAR
                    </div>
                  )}
                </div>

                <div className="text-xs text-white/80 mb-4">{plan.kicker}</div>

                <div className="relative mx-auto mb-6 w-full max-w-xs">
                  <img
                    src={plan.nft}
                    alt={`${plan.name} Tier`}
                    loading="lazy"
                    className="w-full h-auto rounded-xl shadow-lg ring-1 ring-white/10"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_40px_2px_rgba(255,255,255,0.15)]" />
                </div>

                <h2 className="text-3xl font-bold mb-1">{plan.name}</h2>
                <p className="text-base mb-4 text-white/90">{plan.description}</p>
                <p className="text-4xl font-extrabold mb-6">{plan.price}</p>

                <ul className="text-left space-y-3">
                  {plan.perks.map((perk, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-emerald-300 mt-[2px]">✔</span>
                      <span className="text-white/90">{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* fine print */}
                {plan.fineprint?.length ? (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-left">
                    <div className="text-xs font-semibold text-white/80 mb-2">Important</div>
                    <ul className="text-xs text-white/70 space-y-2">
                      {plan.fineprint.map((line, idx) => (
                        <li key={idx}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <Link
                  to={`/signup?tier=${plan.slug}`}
                  className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition font-bold text-center"
                >
                  Select {plan.name}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Global disclaimers */}
        <div className="mt-10 max-w-4xl mx-auto text-left text-sm text-white/60 space-y-2">
          <div>• {noAdviceLine}</div>
          <div>
            • Platform fees are not included (OKX fees, Alpaca fees, spreads, funding rates, and any blockchain gas/RPC
            costs).
          </div>
          <div>• Performance fee calculations are based on realized (closed) trades and net PnL for the billing period.</div>
          <div>• By continuing, you agree to the Terms of Service and acknowledge trading risks.</div>
        </div>
      </div>
    </div>
  );
}