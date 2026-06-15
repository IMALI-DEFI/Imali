// src/pages/Pricing.jsx - COMPLETE IMALI PLATFORM PRICING PAGE
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheck,
  FaLock,
  FaRobot,
  FaChartLine,
  FaWallet,
  FaCrown,
  FaRocket,
  FaCoins,
  FaQuestionCircle,
  FaStar,
  FaBuilding,
  FaUsers,
  FaShieldAlt,
  FaGift,
  FaPercentage,
  FaArrowRight,
} from "react-icons/fa";

// Import NFT images from src/assets/images/nfts
import nftStarter from "../assets/images/nfts/nft-starter.png";
import nftPro from "../assets/images/nfts/nft-pro.png";
import nftElite from "../assets/images/nfts/nft-elite.png";

// Enterprise image is in public folder
const ENTERPRISE_IMAGE = "/enterprise.PNG";

const plans = [
  {
    id: "starter",
    name: "Starter",
    image: nftStarter,
    alt: "Starter NFT Collection Artwork",
    price: "Free",
    period: "",
    subtitle: "Best for learning before using real money.",
    cta: "Start Free Trial",
    route: "/signup?plan=starter",
    color: "from-emerald-500/20 to-teal-500/10",
    buttonColor: "from-emerald-600 to-teal-600",
    features: [
      "Paper trading simulator",
      "$1,000 virtual demo balance",
      "Basic strategy testing",
      "Beginner dashboard",
      "Stock & crypto preview",
      "No credit card required",
      "Instant access",
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
    image: nftPro,
    alt: "Pro NFT Collection Artwork",
    price: "19",
    period: "/month",
    subtitle: "Best for users ready to connect real trading accounts.",
    cta: "Start Pro",
    route: "/signup?plan=pro",
    color: "from-blue-600/20 to-indigo-500/10",
    buttonColor: "from-blue-600 to-indigo-600",
    features: [
      "Everything in Starter",
      "Live stock trading (Alpaca)",
      "Live crypto spot trading (OKX)",
      "OKX API connection",
      "Alpaca API connection",
      "AI-assisted trading strategies",
      "Performance dashboard",
      "Trade history",
      "Take-profit & stop-loss automation",
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
    image: nftElite,
    alt: "Elite NFT Collection Artwork",
    price: "49",
    period: "/month",
    subtitle: "Best for advanced trading and DeFi access.",
    cta: "Start Elite",
    route: "/signup?plan=elite",
    color: "from-purple-600/20 to-pink-500/10",
    buttonColor: "from-purple-600 to-pink-600",
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
    id: "enterprise",
    name: "Enterprise",
    image: ENTERPRISE_IMAGE,
    alt: "Enterprise Plan - Custom Solutions for Institutions",
    price: "Custom",
    period: "",
    subtitle: "Best for teams, funds, and institutions.",
    cta: "Contact Sales",
    route: "mailto:imalidefi@gmail.com",
    color: "from-indigo-600/20 to-purple-500/10",
    buttonColor: "from-indigo-600 to-purple-600",
    features: [
      "Everything in Elite",
      "Custom branded dashboard",
      "Dedicated account manager",
      "Team management & roles",
      "Custom bot development",
      "White-label options",
      "SLAs available",
      "Priority support",
      "Volume-based pricing",
    ],
    locked: [],
    isEnterprise: true,
  },
];

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes, you can upgrade or downgrade anytime. Changes take effect immediately.",
  },
  {
    q: "Is there a free trial?",
    a: "All paid plans include a 7-day free trial. No commitment required.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Credit card, PayPal, and cryptocurrency (USDC, USDT, IMALI tokens with 10% discount).",
  },
  {
    q: "Can I use IMALI without connecting an exchange?",
    a: "Yes! The Starter plan includes paper trading with $1,000 virtual funds. No API keys required.",
  },
  {
    q: "Is my API key safe?",
    a: "We encrypt all API keys using AES-256. Keys are stored with restricted permissions (trade-only, no withdrawals).",
  },
  {
    q: "What's the IMALI token utility?",
    a: "IMALI tokens unlock fee discounts (up to 30%), staking rewards, governance voting, and exclusive NFT benefits.",
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

      {/* NFT / Plan Image */}
      <div className="flex justify-center">
        <img
          src={plan.image}
          alt={plan.alt}
          className="h-32 w-32 rounded-2xl object-cover shadow-lg ring-2 ring-white/20"
          loading="lazy"
        />
      </div>

      <h3 className="mt-4 text-center text-2xl font-extrabold text-white">
        {plan.name}
      </h3>

      <div className="mt-2 text-center">
        {plan.price === "Free" ? (
          <div className="text-4xl font-extrabold text-white">{plan.price}</div>
        ) : plan.price === "Custom" ? (
          <div className="text-3xl font-extrabold text-white">{plan.price}</div>
        ) : (
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold text-white">${plan.price}</span>
            <span className="text-sm text-white/50">{plan.period}</span>
          </div>
        )}
      </div>

      <p className="mt-3 min-h-[48px] text-center text-sm leading-6 text-slate-300">
        {plan.subtitle}
      </p>

      {plan.isEnterprise ? (
        <a
          href={plan.route}
          className={`mt-6 block rounded-2xl bg-gradient-to-r ${plan.buttonColor} px-5 py-3 text-center font-bold text-white transition hover:opacity-90`}
        >
          {plan.cta} →
        </a>
      ) : (
        <Link
          to={plan.route}
          className={`mt-6 block rounded-2xl bg-gradient-to-r ${plan.buttonColor} px-5 py-3 text-center font-bold text-white transition hover:opacity-90`}
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
              <FaCheck className="mt-0.5 shrink-0 text-emerald-400 text-xs" />
              <span>{feature}</span>
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

function FAQItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-lg font-semibold text-white">{question}</span>
        <FaQuestionCircle className={`text-cyan-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="pb-5 text-slate-300 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* IMALI Token Utility Section */}
        <div className="mt-16 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 p-8">
          <div className="flex flex-col items-center text-center">
            <FaCoins className="text-6xl text-emerald-400" />
            <h2 className="mt-4 text-3xl font-extrabold">IMALI Token Utility</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              Hold IMALI tokens to unlock platform discounts, governance rights, and exclusive benefits.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <FaPercentage className="mx-auto text-3xl text-emerald-400" />
              <h3 className="mt-3 text-xl font-bold">Fee Discounts</h3>
              <p className="mt-2 text-sm text-slate-300">
                Up to 30% discount on trading fees when paying with IMALI tokens.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <FaStar className="mx-auto text-3xl text-amber-400" />
              <h3 className="mt-3 text-xl font-bold">Staking Rewards</h3>
              <p className="mt-2 text-sm text-slate-300">
                Stake IMALI tokens to earn platform revenue share (up to 12% APY).
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <FaUsers className="mx-auto text-3xl text-purple-400" />
              <h3 className="mt-3 text-xl font-bold">DAO Governance</h3>
              <p className="mt-2 text-sm text-slate-300">
                Vote on platform features, fee structures, and treasury allocation.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/buy-imali"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700"
            >
              Buy IMALI Tokens <FaArrowRight />
            </Link>
          </div>
        </div>

        {/* NFT Membership Benefits */}
        <div className="mt-12 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-pink-600/10 p-8">
          <div className="flex flex-col items-center text-center">
            <div className="text-6xl">🎨</div>
            <h2 className="mt-4 text-3xl font-extrabold">NFT Membership Benefits</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              IMALI NFT holders get premium platform access, exclusive features, and community rewards.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-3xl">👑</div>
              <p className="mt-2 text-sm font-bold">Elite Tier Access</p>
              <p className="text-xs text-slate-400">Full platform unlocked</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-3xl">💰</div>
              <p className="mt-2 text-sm font-bold">Revenue Share</p>
              <p className="text-xs text-slate-400">NFT holders earn fees</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-3xl">🎁</div>
              <p className="mt-2 text-sm font-bold">Airdrops</p>
              <p className="text-xs text-slate-400">Exclusive token drops</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-3xl">🤝</div>
              <p className="mt-2 text-sm font-bold">Early Access</p>
              <p className="text-xs text-slate-400">Beta features first</p>
            </div>
          </div>
        </div>

        {/* Enterprise White-Label Section */}
        <div className="mt-12 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 p-8">
          <div className="flex flex-col items-center text-center">
            <FaBuilding className="text-6xl text-indigo-400" />
            <h2 className="mt-4 text-3xl font-extrabold">Enterprise & White-Label Solutions</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              For hedge funds, trading desks, and institutions needing custom infrastructure.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <img
              src={ENTERPRISE_IMAGE}
              alt="Enterprise White-Label Dashboard Preview"
              className="max-w-full rounded-2xl border border-white/20 shadow-2xl"
              loading="lazy"
            />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <FaShieldAlt className="mx-auto text-2xl text-indigo-400" />
              <p className="mt-2 text-sm">Custom Branding</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <FaUsers className="mx-auto text-2xl text-indigo-400" />
              <p className="mt-2 text-sm">Team Management</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <FaRobot className="mx-auto text-2xl text-indigo-400" />
              <p className="mt-2 text-sm">Custom Bot Dev</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="mailto:imalidefi@gmail.com"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700"
            >
              Contact Enterprise Sales <FaArrowRight />
            </a>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
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
                  <td className="py-3 text-sm">IMALI Token Discounts</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-white/30">✗</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 text-sm">NFT Membership</td>
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

        {/* How IMALI Makes Money - Transparency Section */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-3xl font-extrabold">
            How IMALI Makes Money
          </h2>
          <p className="mt-3 text-center text-slate-300">
            We believe in transparency. Here's how we sustain the platform.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-2xl mb-2">💳</div>
              <h3 className="font-bold">Subscription Fees</h3>
              <p className="mt-1 text-xs text-slate-400">Pro & Elite monthly plans</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-2xl mb-2">🔄</div>
              <h3 className="font-bold">Trading Fees</h3>
              <p className="mt-1 text-xs text-slate-400">0.1% per executed trade</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-2xl mb-2">🏦</div>
              <h3 className="font-bold">Staking Spread</h3>
              <p className="mt-1 text-xs text-slate-400">Revenue from yield generation</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-2xl mb-2">🏢</div>
              <h3 className="font-bold">Enterprise</h3>
              <p className="mt-1 text-xs text-slate-400">Custom white-label solutions</p>
            </div>
          </div>
        </div>

        {/* Why Hold IMALI Tokens */}
        <div className="mt-12 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-600/10 to-orange-600/10 p-8">
          <div className="flex flex-col items-center text-center">
            <FaGift className="text-6xl text-amber-400" />
            <h2 className="mt-4 text-3xl font-extrabold">Why Hold IMALI Tokens?</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              IMALI tokens are the backbone of our ecosystem. Holders get discounts, rewards, and governance rights.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-3xl">💰</div>
              <p className="mt-2 text-sm font-bold">Up to 30% Fee Discount</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-3xl">📈</div>
              <p className="mt-2 text-sm font-bold">12% APY Staking Rewards</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
              <div className="text-3xl">🗳️</div>
              <p className="mt-2 text-sm font-bold">DAO Voting Power</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/buy-imali"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-6 py-3 font-bold text-white transition hover:bg-amber-700"
            >
              Buy IMALI Tokens <FaArrowRight />
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-center text-3xl font-extrabold">
            Frequently Asked Questions
          </h2>

          <div className="mt-8 mx-auto max-w-3xl">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              />
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-12 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 p-8 text-center">
          <FaCrown className="mx-auto text-5xl text-amber-300" />

          <h2 className="mt-5 text-3xl font-extrabold">
            Ready to start your trading journey?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            Join thousands of traders using IMALI to automate their strategies.
            Start free, practice first, go live when ready.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup?plan=starter"
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 font-bold text-white transition hover:from-emerald-700 hover:to-teal-700"
            >
              Start Free Trial →
            </Link>

            <Link
              to="/trade-demo"
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Try Demo First →
            </Link>

            <a
              href="mailto:imalidefi@gmail.com"
              className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Contact Sales →
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs leading-6 text-white/30">
          <p>
            Paper trading uses simulated funds. Live trading requires connected
            accounts and carries risk. IMALI does not guarantee profits.
          </p>
          <p className="mt-2">
            All paid plans include a 7-day free trial. Cancel anytime.
          </p>
          <p className="mt-2">
            IMALI tokens are utility tokens. No investment advice. DYOR.
          </p>
        </div>
      </div>
    </div>
  );
}
