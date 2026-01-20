// src/pages/Pricing.jsx
import React, { useMemo, useState, useEffect } from "react";
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
const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

export default function Pricing() {
  // ---------------- Promo counter (First 50) ----------------
  const PROMO_LIMIT = 50;
  const claimedFromEnv = useMemo(() => {
    const raw = process.env.REACT_APP_PROMO_FIRST50_CLAIMED;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, []);
  const [localClaimed, setLocalClaimed] = useState(0);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("imali_promo_claimed") || "0");
      setLocalClaimed(Number.isFinite(v) ? v : 0);
    } catch {
      setLocalClaimed(0);
    }
  }, []);

  const totalClaimed = clampInt(claimedFromEnv + localClaimed, 0, PROMO_LIMIT);
  const spotsLeft = clampInt(PROMO_LIMIT - totalClaimed, 0, PROMO_LIMIT);

  // --- Simple, novice-friendly fee rules copy ---
  const feeFloorLine =
    "Performance fees only apply when you are up (positive) AND you are up more than 3% for the billing month.";
  const alertsVsAutoLine =
    "Auto or Manual: You can choose auto-execution OR alerts-only. If you use alerts-only, any performance fee is still based on the bot’s suggestions for that month.";
  const netProfitLine =
    "“Net profits” = closed (realized) trade results after positions close. This does NOT include OKX/Alpaca fees, spreads, funding rates, gas, or blockchain/RPC fees.";
  const stopLine =
    "Safety: You’ll have a big STOP TRADING button and a Cancel Plan button so you can pause or leave anytime.";
  const cancelLine =
    "Cancel anytime. If you cancel mid-month, subscription charges are time-adjusted for the days used.";
  const noAdviceLine =
    "Not financial advice. Trading is risky and you can lose money.";

  // Keep tier slugs aligned with backend checkout tiers: starter/pro/elite/stock/bundle
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: fmt(PRICE.starter),
      kicker: "Free + pay only when you win",
      description:
        "Best for beginners who want help with Stocks and Established Crypto (CEX). Choose auto or alerts-only.",
      perks: [
        "Stocks (Alpaca) + Established Crypto (OKX / CEX)",
        "Choose: Auto execution OR Alerts-only",
        "30% performance fee on net profits above 3% (monthly)",
        "Lower fee to 20% with $100 IMALI purchase/hold (monthly)",
        "Simple dashboard + Telegram alerts",
        "Big STOP TRADING + Cancel buttons",
      ],
      fineprint: [
        feeFloorLine,
        alertsVsAutoLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        stopLine,
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
        "For people who want a focused Stocks bot plan. Choose auto or alerts-only.",
      perks: [
        "Stocks (Alpaca)",
        "Choose: Auto execution OR Alerts-only",
        "5% performance fee on net profits above 3% (monthly)",
        "Lower fee to 2% with $100 IMALI purchase/hold (monthly)",
        "Better alerts + basic risk settings",
        "Suggested starting amount: $150+ (optional)",
        "Big STOP TRADING + Cancel buttons",
      ],
      fineprint: [
        feeFloorLine,
        alertsVsAutoLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        stopLine,
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
      kicker: "Stocks + Established Crypto",
      description:
        "For users who want Stocks + Established Crypto (CEX). Choose auto or alerts-only.",
      perks: [
        "Established Crypto (OKX / CEX) + Stocks (Alpaca)",
        "Choose: Auto execution OR Alerts-only",
        "5% performance fee on net profits above 3% (monthly)",
        "Lower fee to 2% with $100 IMALI purchase/hold (monthly)",
        "Better controls + priority alerts",
        "Suggested starting amount: $150+ (optional)",
        "Big STOP TRADING + Cancel buttons",
      ],
      fineprint: [
        feeFloorLine,
        alertsVsAutoLine,
        netProfitLine,
        "IMALI discount requires holding/purchasing at least $100 worth of IMALI during the billing month.",
        stopLine,
        cancelLine,
      ],
      color: "from-amber-400 to-orange-600",
      nft: EliteNFT,
      badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-300/30",
    },

    // STOCK (slug = stock, price = 99) => DEX + (Stocks OR CEX) + DeFi unlocks + lending
    {
      name: "Elite (DeFi / New Crypto)",
      slug: "stock",
      price: fmt(PRICE.stock),
      kicker: "New Crypto (DEX) + DeFi unlocks",
      description:
        "For people who want New Crypto (DEX) plus better reliability and DeFi tools. Choose DEX + (Stocks or CEX).",
      perks: [
        "New Crypto (DEX) trading (Uniswap/QuickSwap-style)",
        "Choose: DEX + Stocks OR DEX + Established Crypto (CEX)",
        "Paid RPC access (more reliable under load)",
        "Yield Farming + Staking unlock with $25 IMALI entry fee",
        "Lending included (higher tiers)",
        "Suggested starting amount: $150+ (optional)",
        "Big STOP TRADING + Cancel buttons",
      ],
      fineprint: [
        "DEX trading depends on wallet connection, gas, slippage, and network conditions.",
        "Yield/Staking unlock requires a $25 IMALI entry fee (one-time, non-refundable).",
        alertsVsAutoLine,
        netProfitLine,
        stopLine,
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
        "Best for power users: Stocks + Established Crypto (CEX) + New Crypto (DEX) plus DeFi tools.",
      perks: [
        "All: Stocks (Alpaca) + Established Crypto (OKX/CEX) + New Crypto (DEX)",
        "Choose: Auto execution OR Alerts-only",
        "Paid RPC + DeFi modules + lending included",
        "Priority support + fastest updates",
        "Suggested starting amount: $150+ (optional)",
        "Big STOP TRADING + Cancel buttons",
      ],
      fineprint: [
        alertsVsAutoLine,
        netProfitLine,
        stopLine,
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

        {/* First 50 promo banner + counter */}
        <div className="mx-auto mb-10 max-w-3xl rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-emerald-200">Limited promo</div>
              <div className="text-xl font-extrabold text-white mt-1">
                First 50 customers: 5% performance fee over 3% for 90 days
              </div>
              <div className="text-sm text-white/80 mt-2">
                Cancel anytime. Promo ends when the 50 spots are filled.
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-white/70">Spots left</div>
              <div className="text-3xl font-extrabold text-emerald-200 tabular-nums">
                {spotsLeft}
              </div>
              <div className="text-[11px] text-white/60">out of {PROMO_LIMIT}</div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-400/80"
              style={{ width: `${(totalClaimed / PROMO_LIMIT) * 100}%` }}
            />
          </div>

          <div className="mt-4 text-xs text-white/70">
            Tip: set <span className="font-mono">REACT_APP_PROMO_FIRST50_CLAIMED</span> in Netlify to control the counter.
          </div>
        </div>

        <p className="text-lg mb-10 text-gray-300 max-w-3xl mx-auto">
          Simple language, beginner-friendly:
          <b> Established Crypto</b> = CEX (like OKX). <b>New Crypto</b> = DEX (wallet trading).
          You can run <b>Auto</b> or use <b>Manual alerts</b>. Your performance fee is based on the bot’s suggestions
          for that month.
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

                {/* Visible safety actions (UX reminder) */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white/80">
                    ⛔ STOP TRADING
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white/80">
                    ❌ Cancel Plan
                  </div>
                </div>
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
          <div>• Performance fee calculations are based on realized (closed) trades and net PnL for the billing month.</div>
          <div>• By continuing, you agree to the Terms of Service and acknowledge trading risks.</div>
        </div>
      </div>
    </div>
  );
}