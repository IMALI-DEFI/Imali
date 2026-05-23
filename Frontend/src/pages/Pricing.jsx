import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const PROMO_STATUS_URL = `${API_BASE}/api/promo/status`;

const PRICE = {
  starter: 0,
  pro: 19,
  elite: 49,
  bundle: 99,
  enterprise: "Custom",
};

const fmt = (n) => (n === 0 ? "Free" : `$${n}/mo`);

const Pill = ({ children, tone = "gray" }) => {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "blue"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : tone === "orange"
      ? "bg-orange-100 text-orange-700 border-orange-200"
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
      priceDetail: "Then $19/month",
      badge: <Pill tone="green">No credit card</Pill>,
      features: [
        { text: "$1,000 paper trading credits", included: true },
        { text: "Test all bots risk-free", included: true },
        { text: "Stock & crypto trading", included: true },
        { text: "Basic strategies", included: true },
        { text: "Email support", included: true },
      ],
      cta: "Start Free Trial →",
      highlight: false,
    },
    {
      name: "Pro",
      slug: "pro",
      price: "$19",
      period: "/month",
      priceDetail: "billed monthly",
      badge: <Pill tone="orange">Most Popular</Pill>,
      features: [
        { text: "Live trading enabled", included: true },
        { text: "All bots (Stocks + Crypto)", included: true },
        { text: "Advanced strategies", included: true },
        { text: "Priority support", included: true },
        { text: "API access", included: true },
        { text: "No profit sharing", included: true, highlight: true },
      ],
      cta: "Start Pro →",
      highlight: true,
    },
    {
      name: "Bundle",
      slug: "bundle",
      price: "$99",
      period: "/month",
      priceDetail: "billed monthly",
      badge: <Pill tone="blue">Best Value</Pill>,
      features: [
        { text: "Everything in Pro", included: true },
        { text: "DEX trading (Uniswap, QuickSwap)", included: true },
        { text: "Custom strategies", included: true },
        { text: "Priority execution", included: true },
        { text: "24/7 support", included: true },
        { text: "Save 48% vs separate plans", included: true, highlight: true },
      ],
      cta: "Get Bundle →",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold">
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Pill tone="green">✅ Cancel anytime</Pill>
            <Pill tone="blue">💳 No hidden fees</Pill>
            <Pill>🎯 7-day free trial</Pill>
          </div>
        </div>

        {/* Urgency banner */}
        {!loading && active && spotsLeftNum < 50 && (
          <div className="mt-8 max-w-2xl mx-auto">
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
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "bg-white shadow-2xl border-2 border-emerald-500 scale-105 md:scale-105 z-10"
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

              <div className="p-6 flex-grow">
                {/* Plan name */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">{plan.badge}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500">{plan.period}</span>}
                  </div>
                  {plan.priceDetail && (
                    <div className="text-sm text-gray-500 mt-1">{plan.priceDetail}</div>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  to={`/signup?tier=${plan.slug}`}
                  className={`mt-6 w-full py-3 rounded-xl font-semibold text-center transition-all block ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <div className="mt-8">
                  <p className="text-sm font-semibold text-gray-900 mb-3">What's included:</p>
                  <div className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <svg
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
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
                        <span
                          className={`text-sm ${
                            feature.highlight
                              ? "text-emerald-700 font-semibold"
                              : feature.included
                              ? "text-gray-700"
                              : "text-gray-400 line-through"
                          }`}
                        >
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

        {/* Enterprise Section */}
        <div className="mt-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-8 md:px-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-white">Need a custom solution?</h3>
              <p className="text-indigo-100 mt-2 max-w-md">
                Enterprise plans with dedicated support, custom branding, and team management
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">Custom bots</span>
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">Team controls</span>
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">White-label</span>
              </div>
            </div>
            <Link
              to="/signup?tier=enterprise"
              className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-lg whitespace-nowrap"
            >
              Contact Sales →
            </Link>
          </div>
        </div>

        {/* FAQ / Social Proof */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">🚀</div>
            <p className="font-semibold text-gray-900">Start with $1,000</p>
            <p className="text-sm text-gray-500">Paper trading credits to test risk-free</p>
          </div>
          <div>
            <div className="text-3xl mb-2">💳</div>
            <p className="font-semibold text-gray-900">No credit card required</p>
            <p className="text-sm text-gray-500">For the free trial. Cancel anytime</p>
          </div>
          <div>
            <div className="text-3xl mb-2">⚡</div>
            <p className="font-semibold text-gray-900">Setup in 5 minutes</p>
            <p className="text-sm text-gray-500">Connect exchanges and start trading</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition"
          >
            Already have an account? Sign in →
          </Link>
        </div>

        {/* Footer disclaimer */}
        <div className="mt-12 text-xs text-gray-400 text-center space-y-2">
          <p>Trading involves risk. Past performance doesn't guarantee future results.</p>
          <p>Exchange fees, spreads, and gas fees may apply.</p>
        </div>
      </div>
    </div>
  );
}
