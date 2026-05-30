// src/pages/Pricing.jsx - Updated with proper checkout
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const PRICE = { starter: 0, pro: 19, elite: 49, enterprise: "Custom" };
const PERFORMANCE_FEE = { starter: 0, pro: 15, elite: 10, enterprise: 5 };
const PROFIT_THRESHOLD = 3;

const Pill = ({ children, tone = "gray" }) => {
  const cls = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-sky-100 text-sky-700 border-sky-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  }[tone] || cls.gray;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {children}
    </span>
  );
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (plan) => {
    if (plan === "enterprise") {
      window.location.href = "mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry";
      return;
    }

    setLoading(true);
    
    // If user is logged in, go to billing with selected tier
    if (user) {
      navigate("/billing", { state: { tier: plan, fromPricing: true } });
    } else {
      // Not logged in, go to signup with tier preselected
      navigate(`/signup?tier=${plan}&next=billing`);
    }
    setLoading(false);
  };

  const plans = [
    {
      name: "Free Trial",
      slug: "starter",
      price: "$0",
      period: "7 days",
      priceDetail: "No credit card required",
      badge: <Pill tone="green">Safe Start</Pill>,
      features: [
        { text: "$1,000 paper trading credits", included: true, highlight: true },
        { text: "Test all bots risk-free", included: true },
        { text: "Stock & crypto trading demo", included: true },
        { text: "No performance fee", included: true, highlight: true },
        { text: "No credit card required", included: true, highlight: true },
      ],
      cta: "Start Free Trial",
      highlight: false,
    },
    {
      name: "Pro",
      slug: "pro",
      price: "$19",
      period: "/month",
      priceDetail: "Upgrade when ready",
      badge: <Pill tone="orange">Most Popular</Pill>,
      features: [
        { text: "Live trading enabled", included: true, highlight: true },
        { text: "All stocks & crypto bots", included: true },
        { text: `${PERFORMANCE_FEE.pro}% performance fee`, included: true },
        { text: "Priority support", included: true },
        { text: "API access", included: true },
      ],
      cta: "Start Pro",
      highlight: true,
    },
    {
      name: "Elite",
      slug: "elite",
      price: "$49",
      period: "/month",
      priceDetail: "For active traders",
      badge: <Pill tone="purple">Power User</Pill>,
      features: [
        { text: "Everything in Pro", included: true },
        { text: "DEX trading (Uniswap, QuickSwap)", included: true, highlight: true },
        { text: "Custom indicators", included: true },
        { text: `${PERFORMANCE_FEE.elite}% performance fee`, included: true, highlight: true },
        { text: "24/7 priority support", included: true },
      ],
      cta: "Start Elite",
      highlight: false,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      price: "Custom",
      period: "",
      priceDetail: "Volume-based pricing",
      badge: <Pill tone="indigo">Teams & Orgs</Pill>,
      features: [
        { text: "Everything in Elite", included: true },
        { text: "Custom branded dashboard", included: true, highlight: true },
        { text: "Dedicated account manager", included: true },
        { text: `${PERFORMANCE_FEE.enterprise}% performance fee`, included: true, highlight: true },
        { text: "Custom bot development", included: true },
      ],
      cta: "Contact Sales",
      highlight: false,
      isEnterprise: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold">
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              Start Safe. Trade Smart.
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Learn with paper trading. Go live when ready.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 items-stretch mt-12">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative rounded-2xl transition-all duration-300 flex flex-col ${
                plan.highlight
                  ? "bg-white shadow-2xl border-2 border-emerald-500 scale-105 z-10"
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
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-1">{plan.badge}</div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>
                  {plan.priceDetail && (
                    <div className="text-xs text-gray-500 mt-1">{plan.priceDetail}</div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.slug)}
                  disabled={loading}
                  className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-center transition-all text-sm ${
                    plan.highlight
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md"
                      : plan.isEnterprise
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  {plan.cta} →
                </button>

                <div className="mt-6">
                  <p className="text-xs font-semibold text-gray-900 mb-2">What's included:</p>
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${feature.included ? "text-emerald-500" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-xs ${feature.highlight ? "font-semibold text-gray-900" : "text-gray-700"}`}>
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

        {/* Already have account */}
        <div className="mt-12 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition">
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
