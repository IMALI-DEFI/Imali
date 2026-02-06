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

/* ---------------- Deep Magic Links ---------------- */
// These links go directly to relevant documentation/setup guides
const MAGIC_LINKS = {
  starter: {
    guide: "https://docs.imali-defi.com/guides/starter-quickstart",
    alpaca: "https://alpaca.markets/learn/how-to-create-paper-trading-api-keys/",
    okx: "https://www.okx.com/learn/how-to-create-api-keys-on-okx",
    billing: "https://docs.imali-defi.com/billing/starter-fees-explained"
  },
  pro: {
    guide: "https://docs.imali-defi.com/guides/pro-trading-setup",
    billing: "https://docs.imali-defi.com/billing/pro-subscription-faq"
  },
  elite: {
    guide: "https://docs.imali-defi.com/guides/elite-wallet-setup",
    wallet: "https://docs.imali-defi.com/wallets/connect-metamask",
    billing: "https://docs.imali-defi.com/billing/elite-subscription-faq"
  },
  bundle: {
    guide: "https://docs.imali-defi.com/guides/bundle-power-user",
    billing: "https://docs.imali-defi.com/billing/bundle-discounts"
  }
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
      desc: "Perfect for beginners. Start trading today!",
      tagline: "Start with just your email - no wallet needed",
      requirements: [
        "✅ Email signup (no wallet needed)",
        "✅ Credit card for billing (no subscription)",
        "✅ Connect BOTH exchanges (easy 5-min setup)",
        "✅ Enable trading to start"
      ],
      integrations: [
        { name: "Alpaca Stocks", status: "Required", link: MAGIC_LINKS.starter.alpaca },
        { name: "OKX Crypto", status: "Required", link: MAGIC_LINKS.starter.okx },
        { name: "Wallet", status: "Optional", link: null }
      ],
      features: [
        "Automatic trading for stocks & crypto",
        "Beginner-safe AI strategies",
        "Pay only 30% when you profit",
        "Cancel anytime, no commitment"
      ],
      fees: "30% of profits (only if you make money)",
      guideLink: MAGIC_LINKS.starter.guide,
      billingLink: MAGIC_LINKS.starter.billing,
      whatYouNeed: "Email + Credit Card + 10 minutes"
    },
    {
      id: "pro",
      name: "Pro",
      price: price(PRICES.pro),
      img: ProNFT,
      desc: "More control, better returns.",
      tagline: "For traders ready to level up",
      requirements: [
        "✅ Email signup",
        "✅ Monthly subscription ($19/mo)",
        "✅ Connect at least ONE integration",
        "✅ Enable trading to start"
      ],
      integrations: [
        { name: "Alpaca Stocks", status: "Choose 1+", link: null },
        { name: "OKX Crypto", status: "Choose 1+", link: null },
        { name: "Wallet", status: "Choose 1+", link: null }
      ],
      features: [
        "All Starter features PLUS",
        "Auto OR alert-only trading",
        "Lower 5% performance fees",
        "Faster trade execution",
        "Priority signals"
      ],
      fees: "5% of profits + $19/mo subscription",
      guideLink: MAGIC_LINKS.pro.guide,
      billingLink: MAGIC_LINKS.pro.billing,
      whatYouNeed: "Email + Credit Card"
    },
    {
      id: "elite",
      name: "Elite",
      price: price(PRICES.elite),
      img: EliteNFT,
      desc: "Advanced crypto + futures trading.",
      tagline: "For serious crypto traders",
      requirements: [
        "✅ Email signup",
        "✅ Monthly subscription ($49/mo)",
        "✅ Connect your crypto wallet",
        "✅ Enable trading to start"
      ],
      integrations: [
        { name: "Wallet", status: "Required", link: MAGIC_LINKS.elite.wallet },
        { name: "OKX Crypto", status: "Optional", link: null },
        { name: "Alpaca Stocks", status: "Optional", link: null }
      ],
      features: [
        "All Pro features PLUS",
        "Access to futures trading",
        "New crypto opportunities",
        "Priority execution",
        "Advanced DeFi strategies"
      ],
      fees: "5% of profits + $49/mo subscription",
      guideLink: MAGIC_LINKS.elite.guide,
      billingLink: MAGIC_LINKS.elite.billing,
      whatYouNeed: "Email + Wallet + Credit Card"
    },
    {
      id: "bundle",
      name: "Bundle",
      price: price(PRICES.bundle),
      img: BundleNFT,
      desc: "Everything unlocked. Maximum returns.",
      tagline: "For power users who want it all",
      requirements: [
        "✅ Email signup",
        "✅ Annual subscription ($199/yr)",
        "✅ Connect everything you want",
        "✅ Enable trading to start"
      ],
      integrations: [
        { name: "Wallet", status: "Recommended", link: null },
        { name: "OKX Crypto", status: "Recommended", link: null },
        { name: "Alpaca Stocks", status: "Recommended", link: null }
      ],
      features: [
        "All Elite features PLUS",
        "Lowest fees overall",
        "Fastest signals",
        "24/7 priority support",
        "Custom strategy access"
      ],
      fees: "Lowest fees + $199/yr (save 60%)",
      guideLink: MAGIC_LINKS.bundle.guide,
      billingLink: MAGIC_LINKS.bundle.billing,
      whatYouNeed: "Everything optional - you choose"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Simple, Clear Pricing
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
            Start with what you have. Upgrade as you grow. No hidden fees, no long-term contracts.
          </p>
        </div>

        {/* WALLET BANNER */}
        {!account && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200 text-center max-w-2xl mx-auto">
            🔐 <strong>No wallet needed to start!</strong> Connect later if you upgrade. 
            <Link to="/learn/no-wallet-start" className="ml-2 text-blue-300 underline">
              Learn how Starter works without a wallet
            </Link>
          </div>
        )}

        {/* COMPARISON GUIDE */}
        <div className="mb-8 max-w-4xl mx-auto bg-gray-900/30 border border-gray-800 rounded-xl p-4">
          <h3 className="font-bold text-lg mb-2 text-center">🎯 Quick Guide: Which Plan is Right for You?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2">
              <div className="font-semibold text-emerald-400">Starter</div>
              <div className="text-xs text-gray-400">Best for beginners</div>
            </div>
            <div className="text-center p-2">
              <div className="font-semibold text-blue-400">Pro</div>
              <div className="text-xs text-gray-400">Want more control</div>
            </div>
            <div className="text-center p-2">
              <div className="font-semibold text-purple-400">Elite</div>
              <div className="text-xs text-gray-400">Serious crypto trader</div>
            </div>
            <div className="text-center p-2">
              <div className="font-semibold text-amber-400">Bundle</div>
              <div className="text-xs text-gray-400">Power user / all access</div>
            </div>
          </div>
        </div>

        {/* PLANS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isRecommended = plan.id === recommended;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col bg-gray-900/50 transition-all duration-300 hover:scale-[1.02]
                  ${
                    isRecommended
                      ? "border-emerald-400 shadow-lg shadow-emerald-400/10"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                    Recommended for You
                  </div>
                )}

                <img
                  src={plan.img}
                  alt={plan.name}
                  className="rounded-xl mb-4 h-40 w-full object-cover"
                  loading="lazy"
                />

                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-gray-400 text-sm mb-2">{plan.desc}</p>
                <p className="text-xs text-gray-500 mb-3 italic">{plan.tagline}</p>

                <div className="text-3xl font-extrabold mb-4">
                  {plan.price}
                </div>

                {/* What You Need */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">📋 What you need:</div>
                  <div className="text-sm text-gray-300">{plan.whatYouNeed}</div>
                </div>

                {/* Requirements */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">✅ Requirements to activate:</div>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {plan.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>

                {/* Integrations */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">🔌 Integrations:</div>
                  <div className="space-y-1">
                    {plan.integrations.map((integ, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-300">{integ.name}</span>
                        <span className={
                          integ.status === "Required" ? "text-red-400" :
                          integ.status === "Recommended" ? "text-blue-400" : "text-gray-500"
                        }>
                          {integ.status}
                          {integ.link && (
                            <a href={integ.link} target="_blank" rel="noopener noreferrer" 
                               className="ml-1 text-blue-400 hover:text-blue-300">
                              (guide)
                            </a>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">✨ Features:</div>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-emerald-400 mr-2">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fees */}
                <div className="text-xs text-gray-400 mb-4">
                  💰 Fees: {plan.fees}
                </div>

                {/* Action Buttons */}
                <div className="mt-auto space-y-2">
                  <Link
                    to={`/signup?tier=${plan.id}`}
                    className={`block w-full text-center py-3 rounded-xl font-semibold transition
                      ${
                        isRecommended
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-gray-800 hover:bg-gray-700"
                      }`}
                  >
                    Choose {plan.name}
                  </Link>
                  
                  <div className="flex gap-2">
                    <a
                      href={plan.guideLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
                    >
                      📚 Setup Guide
                    </a>
                    <a
                      href={plan.billingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs"
                    >
                      💳 Billing FAQ
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* KEY POINTS */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold mb-4 text-center">🔑 Key Things to Know</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <div className="font-bold text-emerald-400 mb-2">1. Start Simple</div>
              <p className="text-sm text-gray-400">
                <strong>Starter plan is FREE</strong> and perfect for beginners. 
                You only pay when you profit (30% of gains). Connect both Alpaca and OKX to activate.
              </p>
            </div>
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <div className="font-bold text-blue-400 mb-2">2. Grow as You Go</div>
              <p className="text-sm text-gray-400">
                Upgrade anytime from your dashboard. Your settings and data move with you. 
                No need to start over when you upgrade.
              </p>
            </div>
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <div className="font-bold text-purple-400 mb-2">3. No Lock-in</div>
              <p className="text-sm text-gray-400">
                Cancel anytime. Downgrade if needed. You own your API keys and wallet - 
                we never control your funds.
              </p>
            </div>
          </div>
        </div>

        {/* ACTIVATION ALIGNMENT */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-xl max-w-3xl mx-auto">
          <h4 className="font-bold text-blue-300 mb-2 text-center">🎯 Activation Requirements Summary</h4>
          <div className="text-sm text-gray-300 space-y-2">
            <p><strong>Starter:</strong> Email + Credit Card + <strong>BOTH</strong> Alpaca & OKX connected</p>
            <p><strong>Pro:</strong> Email + Subscription + <strong>Any 1</strong> integration (Alpaca, OKX, or Wallet)</p>
            <p><strong>Elite:</strong> Email + Subscription + <strong>Wallet</strong> connected</p>
            <p><strong>Bundle:</strong> Email + Subscription + Connect whatever you want (all optional)</p>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Once activated, you'll see "Demo mode active" until you enable trading in the final step.
          </p>
        </div>

        {/* FOOTER NOTES */}
        <div className="mt-10 text-xs text-gray-500 space-y-2 max-w-3xl mx-auto">
          <p>• <strong>Performance fees only</strong>: You only pay when you make money. No profits = no fees.</p>
          <p>• <strong>Cancel anytime</strong>: From your dashboard. No questions asked.</p>
          <p>• <strong>Trading involves risk</strong>: Never trade money you can't afford to lose.</p>
          <p>• <strong>Need help?</strong> <a href="mailto:support@imali-defi.com" className="text-blue-400">support@imali-defi.com</a> or join our Discord.</p>
        </div>

        {/* BOTTOM CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 mb-4">Still not sure? Start with Starter - it's free!</p>
          <Link
            to="/signup?tier=starter"
            className="inline-block px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            🚀 Start Free with Starter Plan
          </Link>
          <p className="text-xs text-gray-500 mt-2">
            Takes 10 minutes. No credit card needed to sign up.
          </p>
        </div>
      </div>
    </div>
  );
}
