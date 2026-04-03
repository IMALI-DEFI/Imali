import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// 🖼️ Tier NFT art (ensure these paths exist)
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import StockNFT from "../assets/images/nfts/nft-stock.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PROMO_STATUS_URL = `${API_BASE}/api/promo/status`;

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

const Pill = ({ children, tone = "gray" }) => {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "blue"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : tone === "amber"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : tone === "purple"
      ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${cls}`}>
      {children}
    </span>
  );
};

const SectionTitle = ({ children }) => (
  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{children}</div>
);

const CTA = ({ to, children }) => (
  <Link
    to={to}
    className="mt-5 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition font-semibold text-center text-white block"
  >
    {children}
  </Link>
);

/* ===================== PAGE ===================== */

export default function Pricing() {
  const [promoData, setPromoData] = useState({
    limit: 50,
    claimed: 0,
    spotsLeft: 50,
    feePercent: 5,
    thresholdPercent: 3,
    durationDays: 90,
    active: true,
    loading: true,
    error: null,
  });

  const fetchPromoStatus = useCallback(async () => {
    try {
      const response = await axios.get(PROMO_STATUS_URL, { timeout: 10000 });
      if (response.data?.success) {
        const data = response.data.data;
        setPromoData({
          limit: data.limit || 50,
          claimed: data.claimed || 0,
          spotsLeft: data.spots_left || 50,
          feePercent: data.fee_percent || 5,
          thresholdPercent: data.threshold_percent || 3,
          durationDays: data.duration_days || 90,
          active: data.active || true,
          loading: false,
          error: null,
        });
      } else {
        setPromoData(prev => ({ ...prev, loading: false, error: "Failed to load promo data" }));
      }
    } catch (error) {
      console.error("Error fetching promo status:", error);
      setPromoData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  useEffect(() => {
    fetchPromoStatus();
    // Refresh promo status every 60 seconds
    const interval = setInterval(fetchPromoStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchPromoStatus]);

  const { limit, claimed, spotsLeft, feePercent, thresholdPercent, durationDays, active, loading } = promoData;
  const totalClaimed = claimed;
  const spotsLeftNum = spotsLeft;

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
      frame: "from-sky-400 to-indigo-400",
      popular: false,
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
      fees: [`$${PRICE.pro}/mo + ${feePercent}% performance fee only when up > ${thresholdPercent}% (monthly)`],
      cta: "Choose Pro",
      frame: "from-fuchsia-400 to-purple-400",
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
      fees: [`$${PRICE.elite}/mo + ${feePercent}% performance fee only when up > ${thresholdPercent}% (monthly)`],
      cta: "Choose Elite",
      frame: "from-amber-400 to-orange-400",
      popular: false,
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
      fees: [`$${PRICE.stock}/mo (DEX fees + gas not included)`],
      cta: "Unlock DeFi",
      frame: "from-emerald-400 to-teal-400",
      popular: false,
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
      fees: [`$${PRICE.bundle}/mo (platform + exchange fees may apply)`],
      cta: "Get Bundle",
      frame: "from-gray-400 to-slate-500",
      popular: false,
    },
  ];

  return (
    <div className="relative min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 via-amber-600 to-pink-600 text-transparent bg-clip-text">
            Simple, Clear Pricing
          </h1>
          <p className="mt-3 text-gray-600">
            Pick a plan. Connect your accounts. Enable trading.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Pill tone="green">New Crypto = DEX</Pill>
            <Pill tone="blue">Established Crypto = OKX</Pill>
            <Pill>Stocks = Alpaca</Pill>
            <Link
              to="/trade-demo"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs border border-gray-300 bg-white hover:bg-gray-50 transition text-gray-700"
            >
              Try the demo →
            </Link>
          </div>
        </div>

        {/* First 50 promo - using real API data */}
        {!loading && active && (
          <div className="mb-10 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-emerald-700">Limited promo</div>
                <div className="text-lg md:text-xl font-extrabold mt-1 text-gray-900">
                  First {limit} customers: {feePercent}% performance fee when up &gt; {thresholdPercent}% ({durationDays} days)
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Promo ends when spots are filled.
                </div>
              </div>

              <div className="shrink-0">
                <div className="text-xs text-gray-600">Spots left</div>
                <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                  {spotsLeftNum}
                </div>
                <div className="text-[11px] text-gray-500">out of {limit}</div>
              </div>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(totalClaimed / limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-2 text-sm text-gray-500">Loading promo...</p>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.slug}
              className={`relative rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow overflow-hidden`}
            >
              <div className="h-full rounded-2xl p-6 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">{p.name}</h2>
                      {p.popular ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          POPULAR
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2">{p.badge}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-gray-900">{p.price}</div>
                    <div className="text-xs text-gray-500">cancel anytime</div>
                  </div>
                </div>

                {/* NFT image */}
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <img
                    src={p.nft}
                    alt={`${p.name} Pass`}
                    loading="lazy"
                    className="w-full h-40 object-contain"
                  />
                </div>

                {/* What you get */}
                <div className="mt-5">
                  <SectionTitle>What you get</SectionTitle>
                  <div className="space-y-2 text-sm text-gray-700">
                    {Object.entries(p.bots).map(([k, arr]) => (
                      <div key={k} className="flex items-start justify-between gap-3">
                        <div className="text-gray-500">{k}</div>
                        <div className="text-right">
                          {arr.map((x, i) => (
                            <div key={i} className="text-gray-800">
                              {x}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fees */}
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <SectionTitle>Fees</SectionTitle>
                  <ul className="text-sm text-gray-700 space-y-1">
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

        {/* Footer */}
        <div className="mt-10 text-sm text-gray-500 space-y-2 text-center">
          <div>
            Trading is risky. Not financial advice.
          </div>
          <div>
            Exchange fees, spreads, funding rates, and blockchain gas (for DEX) are not included.
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/terms" className="underline hover:text-gray-800">Terms</Link>
            <Link to="/privacy" className="underline hover:text-gray-800">Privacy</Link>
            <Link to="/signup" className="underline hover:text-gray-800">Get started</Link>
          </div>
        </div>
      </div>
    </div>
  );
}