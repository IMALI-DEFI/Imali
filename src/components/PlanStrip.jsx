import React from "react";
import { Link } from "react-router-dom";

// Free vs Pro vs Elite at a glance. Used on Home, How It Works and the demo
// so every page answers "what do I get if I upgrade?" in one look.
const PLANS = [
  {
    id: "starter",
    emoji: "🐣",
    name: "Free",
    price: "$0",
    period: "forever",
    promise: "Practice with $1,000 in pretend money, forever.",
    replaces: "No card. Learn how the robots work first.",
    cta: "Play the Demo",
    to: "/trade-demo",
    btn: "fun-blue",
  },
  {
    id: "pro",
    emoji: "🚀",
    name: "Pro",
    price: "$19.95",
    period: "/month",
    promise: "Your robot trades your real Robinhood, OKX and Alpaca accounts.",
    replaces: "One dashboard instead of checking 3 apps and trading by hand.",
    cta: "Start Pro",
    to: "/signup?plan=pro&tier=pro&product_type=trading",
    btn: "fun-gold",
    popular: true,
  },
  {
    id: "elite",
    emoji: "👑",
    name: "Elite",
    price: "$49",
    period: "/month",
    promise: "Every robot: futures, DEX wallet trading, staking and lending.",
    replaces: "Replaces separate futures, DeFi and wallet tools.",
    cta: "Go Elite",
    to: "/signup?plan=elite&tier=elite&product_type=trading",
    btn: "fun-purple",
  },
];

export default function PlanStrip({
  title = "Practice free. Go live when you're ready.",
  subtitle = "Flat monthly price. We never take a cut of your profits. Cancel any time.",
  from = "plan-strip",
  className = "",
}) {
  return (
    <section className={`fun-card p-6 sm:p-8 text-center ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-black">{title}</h2>
      {subtitle && <p className="fun-help mt-2 max-w-xl mx-auto">{subtitle}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-3 text-left">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-5 ${
              plan.popular ? "border-[#ffe07a] bg-[#ffe07a]/10" : "border-white/15 bg-black/20"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-5 rounded-full bg-[#ffe07a] px-3 py-0.5 text-xs font-black text-[#1b1440]">
                Most popular
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">{plan.emoji}</span>
              <strong className="text-xl">{plan.name}</strong>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-black text-[#ffe07a]">{plan.price}</span>
              <span className="ml-1 text-sm fun-help">{plan.period}</span>
            </div>
            <p className="mt-3 font-bold">{plan.promise}</p>
            <p className="mt-2 text-sm fun-help">{plan.replaces}</p>
            <Link
              to={plan.to}
              state={plan.id === "starter" ? undefined : { tier: plan.id, product_type: "trading", from }}
              className={`fun-btn ${plan.btn} mt-5 w-full justify-center`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40 mt-5">Trading with real money can lose money. Past results don't promise future results.</p>
    </section>
  );
}
