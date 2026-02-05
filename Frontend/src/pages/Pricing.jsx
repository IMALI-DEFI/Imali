import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

// Tier art
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";

/* ---------------- Prices ---------------- */
const PRICE = {
  starter: "$0",
  pro: "$19 / month",
  elite: "$49 / month",
};

/* ---------------- Helper ---------------- */
const hasBalance = (balance) => {
  try {
    return Number(balance) > 50; // soft heuristic
  } catch {
    return false;
  }
};

export default function Pricing() {
  const { account, balance } = useWallet();

  /* ---------------- Recommendation Logic ---------------- */
  const recommended = useMemo(() => {
    if (!account) return "starter";
    if (account && !hasBalance(balance)) return "pro";
    if (account && hasBalance(balance)) return "elite";
    return "starter";
  }, [account, balance]);

  const plans = [
    {
      name: "Starter",
      slug: "starter",
      price: PRICE.starter,
      image: StarterNFT,
      blurb: "Learn how it works.",
      bullets: [
        "Demo mode",
        "See example crypto trades",
        "No wallet needed",
      ],
      fees: ["No monthly cost"],
    },
    {
      name: "Pro",
      slug: "pro",
      price: PRICE.pro,
      image: ProNFT,
      blurb: "Trade new crypto with your wallet.",
      bullets: [
        "New crypto (DeFi)",
        "Auto trade or alerts",
        "Staking access",
      ],
      fees: [
        "5% fee only on profits",
        "No profit = no fee",
        "Cancel anytime",
      ],
    },
    {
      name: "Elite",
      slug: "elite",
      price: PRICE.elite,
      image: EliteNFT,
      blurb: "Advanced tools + futures.",
      bullets: [
        "Everything in Pro",
        "Futures tools",
        "Higher limits",
      ],
      fees: [
        "5% fee on profits",
        "Futures fees apply when used",
        "Cancel anytime",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <h1 className="text-3xl font-extrabold text-center mb-2">
          Pricing
        </h1>
        <p className="text-center text-white/70 mb-8">
          Start free. Upgrade when ready.
        </p>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isRecommended = recommended === plan.slug;

            return (
              <div
                key={plan.slug}
                className={`relative rounded-xl border p-5 flex flex-col ${
                  isRecommended
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-black">
                    Recommended
                  </div>
                )}

                <img
                  src={plan.image}
                  alt={plan.name}
                  className="rounded-lg mb-4 ring-1 ring-white/10"
                />

                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-sm text-white/70 mb-3">{plan.blurb}</p>

                <div className="text-2xl font-extrabold mb-4">
                  {plan.price}
                </div>

                {/* Bullets */}
                <ul className="space-y-2 text-sm mb-4">
                  {plan.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-400">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Fees */}
                <div className="text-xs text-white/60 mb-5 space-y-1">
                  {plan.fees.map((f, i) => (
                    <div key={i}>• {f}</div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  to={`/signup?tier=${plan.slug}`}
                  className={`mt-auto w-full py-2.5 rounded-lg text-center font-semibold ${
                    isRecommended
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 text-xs text-white/60 text-center space-y-1">
          <div>• Fees only apply when you profit</div>
          <div>• You control your wallet</div>
          <div>• Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}
