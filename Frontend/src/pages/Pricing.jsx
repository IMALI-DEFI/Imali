// src/pages/Pricing.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// Bot images
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PROMO_STATUS_URL = `${API_BASE}/api/promo/status`;

// Simplified pricing structure
const PRICE = {
  starter: 0,
  pro: 19,
  elite: 49,
  enterprise: "Custom",
};

// Simplified performance fees (NO fee during trial)
const PERFORMANCE_FEE = {
  starter: 0,
  pro: 15,
  elite: 10,
  enterprise: 5,
};

const PROFIT_THRESHOLD = 3;

const Pill = ({ children, tone = "gray" }) => {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "blue"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : tone === "orange"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : tone === "purple"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : tone === "indigo"
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
};

export default function Pricing() {
  const [promoData, setPromoData] = useState({
    limit: 100,
    claimed: 0,
    spotsLeft: 100,
    active: true,
    loading: true,
  });

  const fetchPromoStatus = useCallback(async () => {
    try {
      const response = await axios.get(PROMO_STATUS_URL, { timeout: 10000 });
      if (response.data?.success) {
        const data = response.data.data;
        setPromoData({
          limit: data.limit || 100,
          claimed: data.claimed || 0,
          spotsLeft: data.spots_left || 100,
          active: data.active || true,
          loading: false,
        });
      } else {
        setPromoData(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error fetching promo:", error);
      setPromoData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchPromoStatus();
  }, [fetchPromoStatus]);

  const { spotsLeft, limit, active, loading } = promoData;
  const spotsLeftNum = spotsLeft;

  const plans = [
    {
      name: "Free Trial",
      slug: "starter",
      price: "$0",
      period: "7 days",
      priceDetail: "No credit card required",
      badge: <Pill tone="green">Safe Start</Pill>,
      image: StarterNFT,
      bots: ["Paper Trading", "Stocks", "Crypto (OKX)"],
      features: [
        { text: "$1,000 paper trading credits", included: true, highlight: true },
        { text: "Test all bots risk-free", included: true },
        { text: "Stock & crypto trading demo", included: true },
        { text: "No performance fee", included: true, highlight: true },
        { text: "No credit card required", included: true, highlight: true },
        { text: "Email support", included: true },
      ],
      fee: `${PERFORMANCE_FEE.starter}% performance fee (none during trial)`,
      cta: "Start Free Trial",
      ctaLink: "/signup?tier=starter&next=demo",
      highlight: false,
      enterprise: false,
    },
    {
      name: "Pro",
      slug: "pro",
      price: "$19",
      period: "/month",
      priceDetail: "Upgrade when ready",
      badge: <Pill tone="orange">Most Popular</Pill>,
      image: ProNFT,
      bots: ["Live Trading", "Stocks", "Crypto (OKX)", "Crypto Futures"],
      features: [
        { text: "Live trading enabled", included: true, highlight: true },
        { text: "All stocks & crypto bots", included: true },
        { text: "Advanced strategies", included: true },
        { text: `${PERFORMANCE_FEE.pro}% performance fee`, included: true },
        { text: "Priority support", included: true },
        { text: "API access", included: true },
      ],
      fee: `${PERFORMANCE_FEE.pro}% performance fee on profits > ${PROFIT_THRESHOLD}%`,
      cta: "Start Pro",
      ctaLink: "/signup?tier=pro&next=billing",
      highlight: true,
      enterprise: false,
    },
    {
      name: "Elite",
      slug: "elite",
      price: "$49",
      period: "/month",
      priceDetail: "For active traders",
      badge: <Pill tone="purple">Power User</Pill>,
      image: EliteNFT,
      bots: ["Stocks", "Crypto (OKX)", "Crypto Futures", "DEX Trading"],
      features: [
        { text: "Everything in Pro", included: true },
        { text: "DEX trading (Uniswap, QuickSwap)", included: true, highlight: true },
        { text: "Custom indicators", included: true },
        { text: `${PERFORMANCE_FEE.elite}% performance fee`, included: true, highlight: true },
        { text: "Priority execution", included: true },
        { text: "24/7 priority support", included: true },
      ],
      fee: `${PERFORMANCE_FEE.elite}% performance fee on profits > ${PROFIT_THRESHOLD}%`,
      cta: "Start Elite",
      ctaLink: "/signup?tier=elite&next=billing",
      highlight: false,
      enterprise: false,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      price: "Custom",
      period: "",
      priceDetail: "Volume-based pricing",
      badge: <Pill tone="indigo">Teams & Orgs</Pill>,
      image: "/enterprise.PNG",
      bots: ["All Bots", "White-label", "Custom Development"],
      features: [
        { text: "Everything in Elite", included: true },
        { text: "Custom branded dashboard", included: true, highlight: true },
        { text: "Dedicated account manager", included: true },
        { text: "Team management & roles", included: true },
        { text: `${PERFORMANCE_FEE.enterprise}% performance fee`, included: true, highlight: true },
        { text: "Custom bot development", included: true },
        { text: "White-label options", included: true },
      ],
      fee: `${PERFORMANCE_FEE.enterprise}% performance fee on profits > ${PROFIT_THRESHOLD}%`,
      cta: "Contact Sales",
      ctaLink: "mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry",
      highlight: false,
      enterprise: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold">
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              Start Safe. Trade Smart.
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            The beginner-friendly automation platform for stocks and crypto. 
            Learn with paper trading. Go live when ready.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Pill tone="green">✅ Start with $1,000 paper trading</Pill>
            <Pill tone="blue">💳 No credit card required</Pill>
            <Pill tone="orange">🎯 7-day free trial</Pill>
            <Pill tone="purple">📚 Learn risk-free</Pill>
          </div>
        </div>

        {/* Safe Learning Message */}
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-50 to-sky-50 rounded-2xl px-6 py-4 text-center border border-emerald-200">
            <p className="text-sm text-gray-700">
              🎓 <span className="font-semibold">Learn without risk:</span> Start with paper trading, master the bots, 
              then switch to live trading when you're confident. Cancel anytime.
            </p>
          </div>
        </div>

        {/* Urgency banner */}
        {!loading && active && spotsLeftNum < 50 && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm font-semibold text-orange-700">🔥 Limited offer</div>
                  <div className="text-sm text-gray-700">
                    Only <span className="font-bold text-orange-700">{spotsLeftNum}</span> spots left at this price
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Join {limit - spotsLeftNum}+ traders already using IMALI
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee savings callout */}
        <div className="mt-6 max-w-3xl mx-auto text-center">
          <div className="bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-700">
            💎 <span className="font-semibold">Upgrade to lower your performance fee:</span>{" "}
            <span className="text-emerald-600 font-bold">Free Trial: {PERFORMANCE_FEE.starter}%</span> → 
            <span className="text-emerald-600 font-bold"> Pro: {PERFORMANCE_FEE.pro}%</span> → 
            <span className="text-emerald-600 font-bold"> Elite: {PERFORMANCE_FEE.elite}%</span> →
            <span className="text-indigo-600 font-bold"> Enterprise: {PERFORMANCE_FEE.enterprise}%</span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "bg-white shadow-2xl border-2 border-emerald-500 scale-105 z-10"
                  : plan.enterprise
                  ? "bg-white shadow-lg border-2 border-indigo-300 hover:shadow-xl"
                  : "bg-white shadow-lg border border-gray-200 hover:shadow-xl"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    🎯 MOST POPULAR
                  </span>
                </div>
              )}

              {plan.enterprise && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    TEAMS
                  </span>
                </div>
              )}

              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-1">{plan.badge}</div>
                  </div>
                </div>

                {/* Bot Image */}
                <div className="mt-4 -mx-5 bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl">
                  {typeof plan.image === 'string' && plan.image.startsWith('/') ? (
                    <img 
                      src={plan.image} 
                      alt={`${plan.name} plan`}
                      className="w-full h-28 object-contain"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <img 
                      src={plan.image} 
                      alt={`${plan.name} plan`}
                      className="w-full h-28 object-contain"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Bots included */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Includes</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {plan.bots.map((bot, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {bot}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>
                  {plan.priceDetail && (
                    <div className="text-xs text-gray-500 mt-1">{plan.priceDetail}</div>
                  )}
                </div>

                {/* Performance Fee */}
                <div className={`mt-4 p-2.5 rounded-lg text-center ${
                  plan.enterprise 
                    ? "bg-indigo-50 border border-indigo-200" 
                    : plan.slug === "starter"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-amber-50 border border-amber-200"
                }`}>
                  <p className="text-[11px] font-semibold text-gray-600">Performance fee</p>
                  <p className={`text-sm font-bold ${
                    plan.slug === "starter" ? "text-emerald-700" : "text-amber-800"
                  }`}>
                    {plan.fee}
                  </p>
                  {plan.slug === "starter" && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">✓ Zero fees during trial</p>
                  )}
                </div>

                {/* CTA Button */}
                {plan.enterprise ? (
                  <a
                    href={plan.ctaLink}
                    className="mt-4 w-full py-2.5 rounded-xl font-semibold text-center transition-all block text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                  >
                    {plan.cta} →
                  </a>
                ) : (
                  <Link
                    to={plan.ctaLink}
                    className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-center transition-all block text-sm ${
                      plan.highlight
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md"
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    }`}
                  >
                    {plan.cta} →
                  </Link>
                )}

                {/* Features */}
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-900 mb-2">What's included:</p>
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <svg
                          className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                            feature.included ? "text-emerald-500" : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className={`text-xs ${feature.highlight ? "font-semibold text-gray-900" : feature.included ? "text-gray-700" : "text-gray-400 line-through"}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progressive Fee Structure Table */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-sky-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 text-center">Upgrade to Keep More Profits</h3>
            <p className="text-sm text-gray-600 text-center mt-1">Higher tiers = lower performance fees</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-left text-gray-600">Monthly Price</th>
                  <th className="px-4 py-3 text-left text-gray-600">Performance Fee</th>
                  <th className="px-4 py-3 text-left text-gray-600">You Keep</th>
                  <th className="px-4 py-3 text-left text-gray-600">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">Free Trial</td>
                  <td className="px-4 py-3">$0</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{PERFORMANCE_FEE.starter}%</td>
                  <td className="px-4 py-3">100% of profits</td>
                  <td className="px-4 py-3 text-gray-500">—</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">Pro</td>
                  <td className="px-4 py-3">$19/mo</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{PERFORMANCE_FEE.pro}%</td>
                  <td className="px-4 py-3">85% of profits</td>
                  <td className="px-4 py-3 text-green-600">↓ 50% fee reduction</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">Elite</td>
                  <td className="px-4 py-3">$49/mo</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{PERFORMANCE_FEE.elite}%</td>
                  <td className="px-4 py-3">90% of profits</td>
                  <td className="px-4 py-3 text-green-600">↓ 67% fee reduction</td>
                </tr>
                <tr className="hover:bg-gray-50 bg-indigo-50">
                  <td className="px-4 py-3 font-bold text-indigo-700">Enterprise</td>
                  <td className="px-4 py-3 font-bold">Custom</td>
                  <td className="px-4 py-3 text-indigo-700 font-bold">{PERFORMANCE_FEE.enterprise}%</td>
                  <td className="px-4 py-3">95% of profits</td>
                  <td className="px-4 py-3 text-green-600 font-bold">↓ 83% fee reduction</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bot Categories Explanation */}
        <div className="mt-12">
          <h3 className="text-center text-lg font-bold text-gray-900 mb-6">What You Can Trade</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
              <div className="text-2xl mb-2">📈</div>
              <p className="font-semibold text-gray-900 text-sm">Stocks</p>
              <p className="text-xs text-gray-500">Alpaca integration • Paper & Live</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
              <div className="text-2xl mb-2">🔷</div>
              <p className="font-semibold text-gray-900 text-sm">Crypto (CEX)</p>
              <p className="text-xs text-gray-500">OKX spot trading • Easy to start</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
              <div className="text-2xl mb-2">📊</div>
              <p className="font-semibold text-gray-900 text-sm">Crypto Futures</p>
              <p className="text-xs text-gray-500">Leveraged trading • Advanced</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
              <div className="text-2xl mb-2">🔄</div>
              <p className="font-semibold text-gray-900 text-sm">DEX Trading</p>
              <p className="text-xs text-gray-500">Uniswap, QuickSwap • DeFi</p>
            </div>
          </div>
        </div>

        {/* Enterprise Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-8 md:px-8 md:py-10">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white">Need a Custom Solution?</h3>
              <p className="text-indigo-100 mt-2 max-w-2xl mx-auto">
                Enterprise plans with dedicated support, custom branding, and team management
              </p>
            </div>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">🏢</div>
                <p className="font-semibold text-white text-sm">Custom Branding</p>
                <p className="text-xs text-indigo-100">White-label dashboard</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">👥</div>
                <p className="font-semibold text-white text-sm">Team Management</p>
                <p className="text-xs text-indigo-100">Roles & permissions</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">⚡</div>
                <p className="font-semibold text-white text-sm">Lowest Fees</p>
                <p className="text-xs text-indigo-100">Only {PERFORMANCE_FEE.enterprise}% performance fee</p>
              </div>
            </div>
            <div className="text-center mt-6">
              <a
                href="mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry"
                className="inline-block px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-lg"
              >
                Contact Sales →
              </a>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">🚀</div>
            <p className="font-semibold text-gray-900">Learn Risk-Free</p>
            <p className="text-sm text-gray-500">$1,000 paper trading credits to practice</p>
          </div>
          <div>
            <div className="text-3xl mb-2">💳</div>
            <p className="font-semibold text-gray-900">No Credit Card Required</p>
            <p className="text-sm text-gray-500">For the free trial. Only pay when you upgrade</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎓</div>
            <p className="font-semibold text-gray-900">Perfect for Beginners</p>
            <p className="text-sm text-gray-500">Simple setup • Cancel anytime</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition"
          >
            Already have an account? Sign in →
          </Link>
        </div>

        {/* Footer disclaimer */}
        <div className="mt-12 text-xs text-gray-400 text-center space-y-2">
          <p>Trading involves risk. Past performance doesn't guarantee future results.</p>
          <p>Performance fees only apply to profits above {PROFIT_THRESHOLD}%. Exchange fees, spreads, and gas fees may apply.</p>
          <p>No performance fee during the 7-day free trial. Cancel anytime with no obligation.</p>
          <p>Enterprise pricing varies based on volume and requirements. Contact sales for details.</p>
        </div>
      </div>
    </div>
  );
}