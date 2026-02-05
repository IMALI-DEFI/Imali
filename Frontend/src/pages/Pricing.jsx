import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

// NFT images
import StarterNFT from "../assets/images/nfts/nft-starter.png";
import ProNFT from "../assets/images/nfts/nft-pro.png";
import EliteNFT from "../assets/images/nfts/nft-elite.png";
import BundleNFT from "../assets/images/nfts/nft-bundle.png";

/* ---------------- Helpers ---------------- */
const price = (n) => (n === 0 ? "Free" : `$${n}/mo`);

const PRICES = {
  starter: 0,
  pro: 19,
  elite: 49,
  bundle: 199,
};

/* ---------------- Component ---------------- */
export default function Pricing() {
  // 🔐 Wallet-safe access (NO CRASH)
  const wallet = useWallet?.() ?? {};
  const account = wallet?.account ?? null;
  const balance = Number(wallet?.balance ?? 0);

  /* ---------------- Recommendation Logic ----------------
     Simple + novice-friendly:
     - No wallet → Starter
     - Wallet < $150 → Pro
     - Wallet >= $150 → Elite
     - Power users → Bundle
  -------------------------------------------------------- */
  const recommended = useMemo(() => {
    if (!account) return "starter";
    if (balance >= 1000) return "bundle";
    if (balance >= 150) return "elite";
    return "pro";
  }, [account, balance]);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: price(PRICES.starter),
      img: StarterNFT,
      desc: "Best place to start. Fully guided crypto trading.",
      perks: [
        "Automatic crypto trading",
        "Beginner-safe strategies",
        "Only pay when you profit",
        "Cancel anytime",
      ],
      fees: "30% of profits (only if you’re up)",
    },
    {
      id: "pro",
      name: "Pro",
      price: price(PRICES.pro),
      img: ProNFT,
      desc: "More control with better signals.",
      perks: [
        "Auto or alert-only mode",
        "Lower performance fees",
        "Faster trade execution",
        "Cancel anytime",
      ],
      fees: "5% of profits (only if you’re up)",
    },
    {
      id: "elite",
      name: "Elite",
      price: price(PRICES.elite),
      img: EliteNFT,
      desc: "Advanced crypto + futures trading.",
      perks: [
        "New crypto opportunities",
        "Futures trading access",
        "Priority execution",
        "Cancel anytime",
      ],
      fees: "5% of profits (only if you’re up)",
    },
    {
      id: "bundle",
      name: "Bundle",
      price: price(PRICES.bundle),
      img: BundleNFT,
      desc: "Everything unlocked for power users.",
      perks: [
        "All trading features",
        "Fastest signals",
        "Priority support",
        "Cancel anytime",
      ],
      fees: "Lowest possible fees",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Simple Pricing
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Start small. Upgrade anytime. No long-term contracts.
          </p>
        </div>

        {/* WALLET BANNER */}
        {!account && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200 text-center">
            🔐 Connect your wallet to see a recommended plan
          </div>
        )}

        {/* PLANS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isRecommended = plan.id === recommended;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col bg-gray-900/50
                  ${
                    isRecommended
                      ? "border-emerald-400 shadow-lg"
                      : "border-gray-800"
                  }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                    Recommended
                  </div>
                )}

                <img
                  src={plan.img}
                  alt={plan.name}
                  className="rounded-xl mb-4"
                  loading="lazy"
                />

                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-gray-400 text-sm mb-3">{plan.desc}</p>

                <div className="text-3xl font-extrabold mb-4">
                  {plan.price}
                </div>

                <ul className="text-sm text-gray-300 space-y-2 mb-4">
                  {plan.perks.map((p, i) => (
                    <li key={i}>✔ {p}</li>
                  ))}
                </ul>

                <div className="text-xs text-gray-400 mb-4">
                  Fees: {plan.fees}
                </div>

                <Link
                  to={`/signup?tier=${plan.id}`}
                  className={`mt-auto w-full text-center py-3 rounded-xl font-semibold transition
                    ${
                      isRecommended
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            );
          })}
        </div>

        {/* FOOTER NOTES */}
        <div className="mt-10 text-xs text-gray-500 space-y-2 max-w-3xl mx-auto">
          <p>• You only pay performance fees when you make money.</p>
          <p>• Cancel anytime from your dashboard.</p>
          <p>• Trading involves risk. Never trade money you can’t afford to lose.</p>
        </div>
      </div>
    </div>
  );
}
