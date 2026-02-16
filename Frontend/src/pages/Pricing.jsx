// src/pages/Pricing.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";

// 🖼️ Tier NFT art (ensure these paths exist)
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

/* ===================== HELPERS ===================== */

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

const fmt = (n) => (n === 0 ? "Free" : `$${n}/mo`);
const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));

const Pill = ({ children, tone = "gray" }) => {
  const cls =
    tone === "green"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
      : tone === "blue"
      ? "bg-sky-500/15 text-sky-200 border-sky-400/30"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
      : tone === "purple"
      ? "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30"
      : "bg-white/5 text-white/70 border-white/10";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
};

const SectionTitle = ({ children }) => (
  <div className="text-xs uppercase tracking-wide text-white/60 mb-2">{children}</div>
);

const CTA = ({ to, children }) => (
  <Link
    to={to}
    className="mt-5 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition font-semibold text-center block"
  >
    {children}
  </Link>
);

/* ===================== PAGE ===================== */

export default function Pricing() {
  // Promo counter (First 50)
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

  // Plans (keep slugs aligned with backend: starter/pro/elite/stock/bundle)
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: fmt(PRICE.starter),
      badge: <Pill tone="blue">Best for beginners</Pill>,
      nft: StarterNFT,
      bots: {
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
        "New Crypto": ["—"],
      },
      fees: ["30% performance fee only when up > 3% (monthly)"],
      cta: "Start Free",
      frame: "from-sky-500/40 to-indigo-500/40",
    },
    {
      name: "Pro",
      slug: "pro",
      price: fmt(PRICE.pro),
      badge: <Pill tone="purple">More control</Pill>,
      nft: ProNFT,
      bots: {
        Stocks: ["Alpaca bot"],
        "Established Crypto": ["Optional (if enabled for your account)"],
        "New Crypto": ["—"],
      },
      fees: ["$19/mo + 5% performance fee only when up > 3% (monthly)"],
      cta: "Choose Pro",
      frame: "from-fuchsia-500/40 to-purple-500/40",
      popular: true,
    },
    {
      name: "Elite",
      slug: "elite",
      price: fmt(PRICE.elite),
      badge: <Pill tone="amber">Serious trader</Pill>,
      nft: EliteNFT,
      bots: {
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
        "New Crypto": ["—"],
      },
      fees: ["$49/mo + 5% performance fee only when up > 3% (monthly)"],
      cta: "Choose Elite",
      frame: "from-amber-500/40 to-orange-500/40",
    },
    {
      name: "DeFi (New Crypto)",
      slug: "stock",
      price: fmt(PRICE.stock),
      badge: <Pill tone="green">New Crypto</Pill>,
      nft: StockNFT,
      bots: {
        "New Crypto": ["DEX bot (Uniswap / QuickSwap-style)"],
        "Established Crypto": ["Optional add-on path"],
        Stocks: ["Optional add-on path"],
      },
      fees: ["$99/mo (DEX fees + gas not included)"],
      cta: "Unlock DeFi",
      frame: "from-emerald-500/40 to-teal-500/40",
    },
    {
      name: "Bundle",
      slug: "bundle",
      price: fmt(PRICE.bundle),
      badge: <Pill>Everything</Pill>,
      nft: BundleNFT,
      bots: {
        "New Crypto": ["DEX bot (Uniswap / QuickSwap-style)"],
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
      },
      fees: ["$199/mo (platform + exchange fees may apply)"],
      cta: "Get Bundle",
      frame: "from-zinc-300/30 to-slate-500/30",
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" />
      </div>

      {/* FIX: extra top padding so nothing is cut off under your header */}
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-pink-500 text-transparent bg-clip-text">
            Simple, Clear Pricing
          </h1>
          <p className="mt-3 text-white/70">
            Pick a plan. Connect your accounts. Enable trading.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Pill>New Crypto = DEX</Pill>
            <Pill>Established Crypto = OKX</Pill>
            <Pill>Stocks = Alpaca</Pill>
            <Link
              to="/trade-demo"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition"
            >
              Try the demo →
            </Link>
          </div>
        </div>

        {/* First 50 promo (short) */}
        <div className="mb-10 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-emerald-200">Limited promo</div>
              <div className="text-lg md:text-xl font-extrabold mt-1">
                First 50 customers: 5% performance fee when up &gt; 3% (90 days)
              </div>
              <div className="text-sm text-white/70 mt-1">
                Promo ends when spots are filled.
              </div>
            </div>

            <div className="shrink-0">
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
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.slug}
              className={`relative rounded-2xl p-[1px] bg-gradient-to-br ${p.frame} shadow-xl`}
            >
              <div className="h-full rounded-2xl bg-black/45 backdrop-blur p-6 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{p.name}</h2>
                      {p.popular ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-400 text-black">
                          POPULAR
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2">{p.badge}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold">{p.price}</div>
                    <div className="text-xs text-white/60">cancel anytime</div>
                  </div>
                </div>

                {/* NFT image (keep tops visible) */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <img
                    src={p.nft}
                    alt={`${p.name} Pass`}
                    loading="lazy"
                    className="w-full h-40 object-contain"
                  />
                </div>

                {/* What you get (novice) */}
                <div className="mt-5">
                  <SectionTitle>What you get</SectionTitle>
                  <div className="space-y-2 text-sm text-white/85">
                    {Object.entries(p.bots).map(([k, arr]) => (
                      <div key={k} className="flex items-start justify-between gap-3">
                        <div className="text-white/70">{k}</div>
                        <div className="text-right">
                          {arr.map((x, i) => (
                            <div key={i} className="text-white/90">
                              {x}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fees (short) */}
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                  <SectionTitle>Fees</SectionTitle>
                  <ul className="text-sm text-white/80 space-y-1">
                    {p.fees.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <CTA to={`/signup?tier=${p.slug}`}>{p.cta}</CTA>
              </div>
            </div>
          ))}
        </div>

        {/* Tiny footer (not wordy) */}
        <div className="mt-10 text-sm text-white/60 space-y-2">
          <div>
            Trading is risky. Not financial advice.
          </div>
          <div>
            Exchange fees, spreads, funding rates, and blockchain gas (for DEX) are not included.
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/terms" className="underline hover:text-white">Terms</Link>
            <Link to="/privacy" className="underline hover:text-white">Privacy</Link>
            <Link to="/signup" className="underline hover:text-white">Get started</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
