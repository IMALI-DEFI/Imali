// src/pages/Pricing.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FaCheck,
  FaLock,
  FaRobot,
  FaChartLine,
  FaWallet,
  FaCrown,
  FaRocket,
} from "react-icons/fa";

const plans = [
  {
    id: "starter",
    name: "Starter",
    icon: "🎟️",
    price: "Free",
    subtitle: "Best for learning before using real money.",
    cta: "Start Free",
    route: "/signup?plan=starter",
    color: "from-blue-500/20 to-cyan-500/10",
    features: [
      "Paper trading simulator",
      "$1,000 virtual demo balance",
      "Basic strategy testing",
      "Beginner dashboard",
      "Stock trading preview",
      "No API keys required for demo mode",
    ],
    locked: [
      "Live crypto trading",
      "Live stock trading",
      "Staking",
      "Lending",
      "DEX sniper",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: "⭐",
    price: "$19/month",
    subtitle: "Best for users ready to connect real trading accounts.",
    cta: "Upgrade to Pro",
    route: "/signup?plan=pro",
    color: "from-purple-500/20 to-indigo-500/10",
    features: [
      "Everything in Starter",
      "Live stock trading",
      "Live crypto spot trading",
      "OKX API connection",
      "Alpaca API connection",
      "AI-assisted trading strategies",
      "Performance dashboard",
      "Trade history",
      "Take-profit and stop-loss automation",
    ],
    locked: [
      "DEX sniper",
      "Futures trading",
      "Staking",
      "Lending",
      "NFT membership",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    icon: "👑",
    price: "$49/month",
    subtitle: "Best for advanced trading and DeFi access.",
    cta: "Upgrade to Elite",
    route: "/signup?plan=elite",
    color: "from-amber-500/20 to-orange-500/10",
    popular: true,
    features: [
      "Everything in Pro",
      "Futures trading",
      "DEX sniper access",
      "MetaMask wallet connection",
      "IMALI token balance tracking",
      "Staking access",
      "Lending access",
      "NFT membership features",
      "Referral rewards",
      "Advanced risk tools",
    ],
    locked: [
      "DAO voting",
      "Treasury tools",
      "Liquidity tools",
      "Buyback dashboard",
      "Airdrop dashboard",
    ],
  },
  {
    id: "bundle",
    name: "All Access",
    icon: "🎁",
    price: "$199/month",
    subtitle: "Best for power users, founders, and early supporters.",
    cta: "Get All Access",
    route: "/signup?plan=bundle",
    color: "from-emerald-500/20 to-green-500/10",
    features: [
      "Everything in Elite",
      "Priority support",
      "Early access to new tools",
      "DAO voting features",
      "Treasury tools",
      "Liquidity tools",
      "Buyback dashboard",
      "Airdrop dashboard",
      "Advanced analytics",
      "Premium platform controls",
    ],
    locked: [],
  },
];

function PlanCard({ plan }) {
  return (
    <div
      className={`relative rounded-3xl border border-white/10 bg-gradient-to-br ${plan.color} p-6 backdrop-blur`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-extrabold text-black">
          Most Popular
        </div>
      )}

      <div className="text-4xl">{plan.icon}</div>

      <h3 className="mt-4 text-2xl font-extrabold text-white">{plan.name}</h3>

      <div className="mt-2 text-4xl font-extrabold text-white">
        {plan.price}
      </div>

      <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-300">
        {plan.subtitle}
      </p>

      <Link
        to={plan.route}
        className="mt-6 block rounded-2xl bg-emerald-600 px-5 py-3 text-center font-bold text-white transition hover:bg-emerald-500"
      >
        {plan.cta}
      </Link>

      <div className="mt-6">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">
          Included
        </h4>

        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
              <FaCheck className="mt-1 shrink-0 text-emerald-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {plan.locked.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/40">
            Higher-tier features
          </h4>

          <ul className="space-y-3">
            {plan.locked.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-white/40">
                <FaLock className="mt-1 shrink-0 text-amber-300/70" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
            <FaRobot />
            Simple IMALI Pricing
          </div>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
            Start Free. Practice First. Go Live When Ready.
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            IMALI is built so beginners can learn with paper trading first,
            then connect OKX, Alpaca, or MetaMask when they are ready for live
            trading and DeFi features.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-3xl font-extrabold">
            How IMALI Access Works
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <FaRobot className="text-3xl text-cyan-300" />
              <h3 className="mt-4 font-bold">1. Practice</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Start with simulated trading and virtual funds.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <FaChartLine className="text-3xl text-emerald-300" />
              <h3 className="mt-4 font-bold">2. Connect API</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Connect OKX for crypto or Alpaca for stocks.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <FaWallet className="text-3xl text-purple-300" />
              <h3 className="mt-4 font-bold">3. Connect Wallet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use MetaMask for IMALI token and DeFi features.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <FaRocket className="text-3xl text-amber-300" />
              <h3 className="mt-4 font-bold">4. Go Live</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Switch from paper to live when you are ready.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 p-8 text-center">
          <FaCrown className="mx-auto text-5xl text-amber-300" />

          <h2 className="mt-5 text-3xl font-extrabold">
            Not sure where to start?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            Start with the free demo. You can upgrade later when you are ready
            to connect real accounts or unlock advanced IMALI features.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/trade-demo"
              className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white transition hover:bg-emerald-500"
            >
              Try Demo First
            </Link>

            <Link
              to="/signup?plan=starter"
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Create Free Account
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-xs leading-6 text-white/30">
          Paper trading uses simulated funds. Live trading requires connected
          accounts and carries risk. IMALI does not guarantee profits.
        </div>
      </div>
    </div>
  );
}