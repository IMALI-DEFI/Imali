// src/pages/Pricing.jsx - REWRITTEN (Corrected redirects)
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
    icon: "🌱",
    price: "Free",
    subtitle: "Best for learning before using real money.",
    cta: "Start Free Trial",
    route: "/signup?plan=starter",
    color: "from-emerald-500/20 to-teal-500/10",
    features: [
      "✅ Paper trading simulator",
      "✅ $1,000 virtual demo balance",
      "✅ Basic strategy testing",
      "✅ Beginner dashboard",
      "✅ Stock & crypto preview",
      "✅ No credit card required",
      "✅ Instant access",
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
    cta: "Start Pro",
    route: "/signup?plan=pro",
    color: "from-blue-600/20 to-indigo-500/10",
    features: [
      "✅ Everything in Starter",
      "✅ Live stock trading (Alpaca)",
      "✅ Live crypto spot trading (OKX)",
      "✅ OKX API connection",
      "✅ Alpaca API connection",
      "✅ AI-assisted trading strategies",
      "✅ Performance dashboard",
      "✅ Trade history",
      "✅ Take-profit & stop-loss automation",
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
    cta: "Start Elite",
    route: "/signup?plan=elite",
    color: "from-purple-600/20 to-pink-500/10",
    popular: true,
    features: [
      "✅ Everything in Pro",
      "✅ Futures trading",
      "✅ DEX sniper access",
      "✅ MetaMask wallet connection",
      "✅ IMALI token balance tracking",
      "✅ Staking access",
      "✅ Lending access",
      "✅ NFT membership features",
      "✅ Referral rewards",
      "✅ Advanced risk tools",
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
    id: "enterprise",
    name: "Enterprise",
    icon: "🏢",
    price: "Custom",
    subtitle: "Best for teams, funds, and institutions.",
    cta: "Contact Sales",
    route: "/contact-sales",
    color: "from-indigo-600/20 to-purple-500/10",
    features: [
      "✅ Everything in Elite",
      "✅ Custom branded dashboard",
      "✅ Dedicated account manager",
      "✅ Team management & roles",
      "✅ Custom bot development",
      "✅ White-label options",
      "✅ SLAs available",
      "✅ Priority support",
      "✅ Volume-based pricing",
    ],
    locked: [],
    isEnterprise: true,
  },
];

function PlanCard({ plan }) {
  return (
    <div
      className={`relative rounded-3xl border border-white/10 bg-gradient-to-br ${plan.color} p-6 backdrop-blur transition-all hover:scale-[1.02] hover:border-white/20`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-xs font-extrabold text-black shadow-lg">
          🔥 Most Popular
        </div>
      )}

      <div className="text-5xl">{plan.icon}</div>

      <h3 className="mt-4 text-2xl font-extrabold text-white">{plan.name}</h3>

      <div className="mt-2">
        {typeof plan.price === "string" ? (
          <div className="text-4xl font-extrabold text-white">{plan.price}</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-white">${plan.price}</span>
            <span className="text-sm text-white/50">/month</span>
          </div>
        )}
      </div>

      <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-300">
        {plan.subtitle}
      </p>

      {plan.isEnterprise ? (
        <a
          href="mailto:sales@imali-defi.com?subject=Enterprise%20Plan%20Inquiry"
          className="mt-6 block rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-center font-bold text-white transition hover:from-indigo-700 hover:to-purple-700"
        >
          {plan.cta} →
        </a>
      ) : (
        <Link
          to={plan.route}
          className="mt-6 block rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-center font-bold text-white transition hover:from-emerald-700 hover:to-teal-700"
        >
          {plan.cta} →
        </Link>
      )}

      <div className="mt-6">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/60">
          Included
        </h4>

        <ul className="space-y-2">
          {plan.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{feature.replace("✅ ", "")}</span>
            </li>
          ))}
          {plan.features.length > 6 && (
            <li className="text-xs text-white/40 pl-5">
              +{plan.features.length - 6} more features
            </li>
          )}
        </ul>
      </div>

      {plan.locked.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/40">
            Unlock with higher tier
          </h4>

          <ul className="space-y-2">
            {plan.locked.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/40">
                <FaLock className="mt-0.5 shrink-0 text-amber-300/50 text-xs" />
                <span>{feature}</span>
              </li>
            ))}
            {plan.locked.length > 4 && (
              <li className="text-xs text-white/30 pl-5">
                +{plan.locked.length - 4} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
            <FaRobot />
            Simple. Transparent. Start Free.
          </div>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
            Start Free. <span className="text-emerald-400">Practice First.</span> Go Live When Ready.
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            IMALI is built so beginners can learn with paper trading first,
            then connect OKX, Alpaca, or MetaMask when they are ready for live
            trading and DeFi features.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">
            Compare Plans
          </h2>
          
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-sm font-semibold text-white/60">Feature</th>
                  <th className="pb-4 text-center text-sm font-semibold text-white/60">Starter</th>
                  <th className="pb-4 text-center text-sm font-semibold text-white/60">Pro</th>
                  <th className="pb-4 text-center text-sm font-semibold text-white/60">Elite</th>
                  <th className="pb-4 text-center text-sm font-semibold text-white/60">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 text-sm">Paper Trading</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Live Crypto Trading (OKX)</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Live Stock Trading (Alpaca)</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">DEX Sniper / DeFi</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Futures Trading</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Staking / Lending</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Team Management</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">Custom Branding</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="py-4 text-sm font-bold">Price</td>
                  <td className="py-4 text-center font-bold text-emerald-400">Free</td>
                  <td className="py-4 text-center font-bold">$19/mo</td>
                  <td className="py-4 text-center font-bold">$49/mo</td>
                  <td className="py-4 text-center font-bold">Custom</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-3xl font-extrabold">
            How IMALI Access Works
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="font-bold">1. Start Free</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Create a Starter account. No credit card required.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-4xl mb-3">🎮</div>
              <h3 className="font-bold">2. Practice</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Use paper trading with $1,000 virtual funds.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-4xl mb-3">🔌</div>
              <h3 className="font-bold">3. Connect API</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Add OKX or Alpaca keys when ready for live trading.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold">4. Go Live</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Upgrade to Pro or Elite and start live trading.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 p-8 text-center">
          <FaCrown className="mx-auto text-5xl text-amber-300" />

          <h2 className="mt-5 text-3xl font-extrabold">
            Not sure where to start?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            Start with the free Starter plan. You can practice with paper trading,
            then upgrade when you're ready to connect real accounts.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup?plan=starter"
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 font-bold text-white transition hover:from-emerald-700 hover:to-teal-700"
            >
              Start Free Trial →
            </Link>

            <Link
              to="/signup?plan=pro"
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Go Pro →
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-xs leading-6 text-white/30">
          <p>
            Paper trading uses simulated funds. Live trading requires connected
            accounts and carries risk. IMALI does not guarantee profits.
          </p>
          <p className="mt-2">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
