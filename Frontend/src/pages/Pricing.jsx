// src/pages/Pricing.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 🖼️ Tier NFT art (placeholders - update with actual paths)
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

/* ===================== MAIN COMPONENT ===================== */

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Promo counter (First 50)
  const PROMO_LIMIT = 50;
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [spotsLeft, setSpotsLeft] = useState(PROMO_LIMIT);

  // Fetch promo status on mount
  useEffect(() => {
    const fetchPromoStatus = async () => {
      try {
        const response = await fetch("/api/promo/status");
        const data = await response.json();
        if (data.success && data.data) {
          setTotalClaimed(data.data.claimed || 0);
          setSpotsLeft(data.data.spots_left || PROMO_LIMIT);
        }
      } catch (error) {
        console.error("Failed to fetch promo status:", error);
        // Fallback to localStorage
        try {
          const local = Number(localStorage.getItem("imali_promo_claimed") || "0");
          const claimed = Number.isFinite(local) ? local : 0;
          setTotalClaimed(claimed);
          setSpotsLeft(PROMO_LIMIT - claimed);
        } catch {
          setTotalClaimed(0);
          setSpotsLeft(PROMO_LIMIT);
        }
      }
    };
    fetchPromoStatus();
  }, []);

  // Plans (slugs aligned with backend: starter/pro/elite/stock/bundle)
  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: fmt(PRICE.starter),
      priceValue: PRICE.starter,
      badge: <Pill tone="blue">Best for beginners</Pill>,
      nft: StarterNFT,
      description: "Perfect for getting started with automated trading",
      features: [
        "AI-weighted strategy",
        "Paper trading",
        "Basic trading pairs",
        "Daily analytics",
        "Email support"
      ],
      bots: {
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
        "New Crypto": ["—"],
      },
      fees: ["30% performance fee only when up > 3% (monthly)"],
      cta: "Start Free",
      ctaLink: "/signup",
      frame: "from-sky-500/40 to-indigo-500/40",
    },
    {
      name: "Pro",
      slug: "pro",
      price: fmt(PRICE.pro),
      priceValue: PRICE.pro,
      badge: <Pill tone="purple">More control</Pill>,
      nft: ProNFT,
      description: "For active traders who want more strategies",
      features: [
        "All Starter features",
        "Momentum strategy",
        "All trading pairs",
        "Real-time alerts",
        "Priority support",
        "API access"
      ],
      bots: {
        Stocks: ["Alpaca bot"],
        "Established Crypto": ["Optional (if enabled for your account)"],
        "New Crypto": ["—"],
      },
      fees: ["$19/mo + 5% performance fee only when up > 3% (monthly)"],
      cta: "Choose Pro",
      ctaLink: "/signup",
      frame: "from-fuchsia-500/40 to-purple-500/40",
      popular: true,
    },
    {
      name: "Elite",
      slug: "elite",
      price: fmt(PRICE.elite),
      priceValue: PRICE.elite,
      badge: <Pill tone="amber">Serious trader</Pill>,
      nft: EliteNFT,
      description: "Full access to all trading strategies",
      features: [
        "All Pro features",
        "Mean reversion strategy",
        "Cross-exchange arbitrage",
        "Custom indicators",
        "Dedicated account manager",
        "Whitelist priority"
      ],
      bots: {
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
        "New Crypto": ["—"],
      },
      fees: ["$49/mo + 5% performance fee only when up > 3% (monthly)"],
      cta: "Choose Elite",
      ctaLink: "/signup",
      frame: "from-amber-500/40 to-orange-500/40",
    },
    {
      name: "DeFi (New Crypto)",
      slug: "stock",
      price: fmt(PRICE.stock),
      priceValue: PRICE.stock,
      badge: <Pill tone="green">New Crypto</Pill>,
      nft: StockNFT,
      description: "Trade new tokens on DEXs like Uniswap",
      features: [
        "DEX sniper bot",
        "Early token discovery",
        "Honeypot protection",
        "Multi-chain support",
        "Gas optimization"
      ],
      bots: {
        "New Crypto": ["DEX bot (Uniswap / QuickSwap-style)"],
        "Established Crypto": ["Optional add-on path"],
        Stocks: ["Optional add-on path"],
      },
      fees: ["$99/mo (DEX fees + gas not included)"],
      cta: "Unlock DeFi",
      ctaLink: "/signup",
      frame: "from-emerald-500/40 to-teal-500/40",
    },
    {
      name: "Bundle",
      slug: "bundle",
      price: fmt(PRICE.bundle),
      priceValue: PRICE.bundle,
      badge: <Pill>Everything</Pill>,
      nft: BundleNFT,
      description: "All bots, all markets, unlimited potential",
      features: [
        "All Elite features",
        "All DeFi features",
        "All Stock features",
        "Highest position limits",
        "Best support priority",
        "Custom strategy development"
      ],
      bots: {
        "New Crypto": ["DEX bot (Uniswap / QuickSwap-style)"],
        "Established Crypto": ["OKX bot (CEX)"],
        Stocks: ["Alpaca bot"],
      },
      fees: ["$199/mo (platform + exchange fees may apply)"],
      cta: "Get Bundle",
      ctaLink: "/signup",
      frame: "from-zinc-300/30 to-slate-500/30",
    },
  ];

  const handleChoosePlan = (plan) => {
    if (isAuthenticated) {
      // User is logged in, redirect to billing to upgrade/change plan
      navigate("/billing", { state: { selectedTier: plan.slug, fromPricing: true } });
    } else {
      // User not logged in, redirect to signup with tier preselected
      navigate(`/signup?tier=${plan.slug}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Soft background effect */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-pink-500 text-transparent bg-clip-text">
            Simple, Clear Pricing
          </h1>
          <p className="mt-3 text-white/70 max-w-2xl mx-auto">
            Choose the plan that fits your trading style. Start with paper trading, 
            upgrade as you grow. Cancel anytime.
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

        {/* First 50 Promo Banner */}
        <div className="mb-10 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-emerald-200">🔥 LIMITED TIME OFFER</div>
              <div className="text-lg md:text-xl font-extrabold mt-1">
                First 50 customers: 5% performance fee when up &gt; 3% (90 days)
              </div>
              <div className="text-sm text-white/70 mt-1">
                No monthly fees for 3 months. Pay only when you profit.
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
              className="h-full bg-emerald-400/80 transition-all duration-500"
              style={{ width: `${((PROMO_LIMIT - spotsLeft) / PROMO_LIMIT) * 100}%` }}
            />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((p) => (
            <div
              key={p.slug}
              className={`relative rounded-2xl p-[1px] bg-gradient-to-br ${p.frame} shadow-xl hover:shadow-2xl transition-all duration-300`}
            >
              <div className="h-full rounded-2xl bg-black/45 backdrop-blur p-6 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{p.name}</h2>
                      {p.popular && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-400 text-black">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <div className="mt-2">{p.badge}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold">{p.price}</div>
                    {p.priceValue > 0 && (
                      <div className="text-xs text-white/60">billed monthly</div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 mt-2">{p.description}</p>

                {/* NFT Image */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <img
                    src={p.nft}
                    alt={`${p.name} Pass`}
                    loading="lazy"
                    className="w-full h-32 object-contain"
                  />
                </div>

                {/* Features */}
                <div className="mt-5">
                  <SectionTitle>What's included</SectionTitle>
                  <ul className="space-y-2 text-sm">
                    {p.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/85">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bot Access */}
                <div className="mt-5">
                  <SectionTitle>Bot Access</SectionTitle>
                  <div className="space-y-1 text-xs">
                    {Object.entries(p.bots).map(([k, arr]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-white/60">{k}:</span>
                        <span className="text-white/80">{arr.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fees */}
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                  <SectionTitle>Fees</SectionTitle>
                  {p.fees.map((fee, i) => (
                    <div key={i} className="text-xs text-white/70">
                      {fee}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleChoosePlan(p)}
                  className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 font-semibold text-white"
                >
                  {p.cta}
                </button>

                {/* Fine print */}
                <div className="mt-3 text-[10px] text-white/40 text-center">
                  Cancel anytime • No hidden fees
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Trust Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <div className="font-semibold">Secure & Safe</div>
            <div className="text-xs text-white/50">Your API keys are encrypted. We never touch your funds.</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔄</div>
            <div className="font-semibold">Cancel Anytime</div>
            <div className="text-xs text-white/50">No long-term contracts. Pause or stop whenever you want.</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold">24/7 Support</div>
            <div className="text-xs text-white/50">Get help when you need it via email or Telegram.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-8 border-t border-white/10 text-sm text-white/50 space-y-2 text-center">
          <div>⚠️ Trading involves risk. Past performance doesn't guarantee future results.</div>
          <div>Exchange fees, spreads, funding rates, and blockchain gas (for DEX) are not included.</div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="/faq" className="hover:text-white transition">FAQ</Link>
            <Link to="/contact" className="hover:text-white transition">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
