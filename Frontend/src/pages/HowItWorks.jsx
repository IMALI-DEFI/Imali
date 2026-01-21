// src/pages/HowItWorks.jsx
import React from "react";
import { Link } from "react-router-dom";

// Ambient cards
import tradeLoss from "../assets/images/cards/trade_loss_template2.PNG";
import tradeWin from "../assets/images/cards/trade_win_template2.PNG";

// NFT visuals
import nftStarter from "../assets/images/nfts/nft-starter.png";
import nftPro from "../assets/images/nfts/nft-pro.png";
import nftElite from "../assets/images/nfts/nft-elite.png";
import referralBot from "../assets/images/cards/referralbot.png";

export default function HowItWorks() {
  const card = "rounded-xl bg-gray-800/70 border border-white/10 p-6 shadow-lg";

  return (
    <div className="relative bg-gradient-to-b from-gray-900 to-indigo-950 text-white min-h-screen">
      {/* Ambient robots */}
      <img
        src={tradeWin}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none opacity-15 blur-[1px] hidden lg:block absolute -right-10 top-24 w-[32vw] max-w-[520px] object-contain"
      />
      <img
        src={tradeLoss}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none opacity-10 blur-[2px] hidden lg:block absolute -left-10 bottom-24 w-[28vw] max-w-[460px] object-contain"
      />

      <div className="max-w-7xl mx-auto px-4 pt-28 pb-24 relative">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            How IMALI <span className="text-indigo-400">Works</span>
          </h1>
          <p className="mt-4 text-lg text-indigo-200/90">
            Pick a tier → start in Telegram → fund your wallet → run the Trade Demo (DEMO or LIVE) → earn XP ⭐, Coins 🪙,
            streaks 🔥, and unlock NFTs & perks.
          </p>
        </div>

        {/* Progress rail */}
        <div className="mx-auto max-w-4xl mb-10">
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-purple-500" />
          </div>
          <div className="flex justify-between text-xs text-indigo-200 mt-2">
            <span>Step 1: Setup</span>
            <span>Step 2: Funding</span>
            <span>Step 3: Trade Demo</span>
            <span>Step 4: Pro Tools</span>
          </div>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Step 1: Telegram */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Step 1</div>
            <h3 className="text-xl font-bold mb-3">Start in Telegram</h3>
            <p className="text-indigo-100/90 mb-4">
              Begin with the <b>IMALI Trading Bot</b>. It walks you through linking your wallet, connecting OKX, and choosing
              your <b>Strategy</b>.
            </p>
            <a
              href="https://t.me/Imalitradingbot"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Launch Bot
            </a>
          </div>

          {/* Step 2: Funding Guide */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Step 2</div>
            <h3 className="text-xl font-bold mb-3">Fund Your Wallet</h3>
            <p className="text-indigo-100/90 mb-4">
              Before running LIVE, you’ll need funds (crypto or USDC) in your connected wallet. The Funding Guide shows how
              to deposit, bridge, or swap between chains.
            </p>
            <Link
              to="/funding-guide"
              className="inline-block px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Open Funding Guide
            </Link>
          </div>

          {/* Step 3: Venue + Strategy (match TradeDemo/MemberDashboard wording) */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Step 3</div>
            <h3 className="text-xl font-bold mb-3">Pick Venue + Strategy</h3>

            <div className="text-sm text-indigo-200/90 mb-2">
              Inside the Trade Demo, choose where to run:
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-black/20">CEX</span>
              <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-black/20">DEX</span>
              <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-black/20">BOTH</span>
              <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-black/20">STOCKS</span>
            </div>

            <div className="text-sm text-indigo-200/90 mb-2">Then choose a Strategy:</div>
            <ul className="space-y-2 text-indigo-100/90">
              <li>🚀 <b>Momentum</b> — ride breakouts with guardrails</li>
              <li>🔄 <b>Mean Reversion</b> — buy dips, trim rips</li>
              <li>📈 <b>Volume Spike</b> — catch catalysts fast</li>
              <li>🧠 <b>AI Weighted</b> — AI-weighted logic across venues</li>
            </ul>

            <div className="mt-4 text-[12px] text-emerald-200">
              Auto-run ticks ~4s. Use <b>DEMO</b> to test risk-free. Use <b>LIVE</b> when enabled for your tier.
            </div>
          </div>

          {/* Step 4: Guardrails (less jargon, still aligned) */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Step 4</div>
            <h3 className="text-xl font-bold mb-3">Safety First</h3>
            <ul className="list-disc ml-5 space-y-2 text-indigo-100/90">
              <li>Funds stay in your wallet.</li>
              <li>Simple limits help reduce big surprises.</li>
              <li>Cooldowns help avoid rapid repeat moves.</li>
              <li>Exchange connections can be set to read-only for safety.</li>
            </ul>
          </div>

          {/* Tiers & Profit Share (keep your exact offer language) */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Step 5</div>
            <h3 className="text-xl font-bold mb-3">Tiers & Profit Share</h3>
            <p className="text-indigo-100/90 mb-3">
              Starter (free) includes alerts and a <b>30% profit share</b>. Upgrading to Pro or Elite lowers the share and
              unlocks analytics + speed upgrades.
            </p>
            <Link
              to="/pricing"
              className="inline-block px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 font-semibold"
            >
              Compare Tiers
            </Link>
          </div>

          {/* Gamification (match MemberDashboard language) */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Bonus XP</div>
            <h3 className="text-xl font-bold mb-3">XP ⭐, Coins 🪙, Streak 🔥</h3>
            <ul className="space-y-2 text-indigo-100/90">
              <li>⭐ Profitable ticks add <b>XP</b>.</li>
              <li>🪙 Realized wins and take-profit markers add <b>Coins</b>.</li>
              <li>🔥 Long green streaks increase <b>Streak</b>.</li>
            </ul>
          </div>

          {/* Referral */}
          <div className={card}>
            <div className="text-sm mb-2 text-indigo-300">Partner Path</div>
            <h3 className="text-xl font-bold mb-3">Referral Program</h3>
            <p className="text-indigo-100/90 mb-4">
              Share your link and earn a <b>20% referral share</b>. Top creators qualify for a <b>2% global pool</b>.
            </p>
            <Link
              to="/referral"
              className="inline-block px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Become a Partner
            </Link>
          </div>
        </div>

        {/* NFTs + Value */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              NFTs <span className="text-amber-400">& Value Over Time</span>
            </h2>
            <p className="mt-3 text-indigo-100/90 max-w-3xl mx-auto">
              Earn robot NFTs as you progress. Each tier NFT adds utility and boosts future rewards as IMALI grows.
            </p>
          </div>

          {/* NFT Gallery (unchanged) */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl bg-gray-800/70 border border-white/10 p-4 shadow-lg">
              <img src={nftStarter} alt="Starter NFT" className="w-full h-56 object-contain rounded-lg mb-3 bg-black/30" />
              <h3 className="font-bold">Starter Robot</h3>
              <ul className="mt-2 text-sm text-indigo-100/90 space-y-1">
                <li>• Obtained: onboarding quests</li>
                <li>• Utility: Starter perks + badges</li>
                <li>• Cosmetic: common</li>
              </ul>
            </div>

            <div className="rounded-xl bg-gray-800/70 border border-white/10 p-4 shadow-lg">
              <img src={nftPro} alt="Pro NFT" className="w-full h-56 object-contain rounded-lg mb-3 bg-black/30" />
              <h3 className="font-bold">Pro Robot</h3>
              <ul className="mt-2 text-sm text-indigo-100/90 space-y-1">
                <li>• Obtained: activate Pro tier or Pro-volume</li>
                <li>• Utility: analytics + XP bonus</li>
                <li>• Cosmetic: rare</li>
              </ul>
            </div>

            <div className="rounded-xl bg-gray-800/70 border border-white/10 p-4 shadow-lg">
              <img src={nftElite} alt="Elite NFT" className="w-full h-56 object-contain rounded-lg mb-3 bg-black/30" />
              <h3 className="font-bold">Elite Robot</h3>
              <ul className="mt-2 text-sm text-indigo-100/90 space-y-1">
                <li>• Obtained: activate Elite or win finals</li>
                <li>• Utility: priority signals + DAO boosts</li>
                <li>• Cosmetic: ultra-rare</li>
              </ul>
            </div>

            <div className="rounded-xl bg-gray-800/70 border border-white/10 p-4 shadow-lg">
              <img src={referralBot} alt="Referral Bot" className="w-full h-56 object-contain rounded-lg mb-3 bg-black/30" />
              <h3 className="font-bold">Referral Partner Bot</h3>
              <ul className="mt-2 text-sm text-indigo-100/90 space-y-1">
                <li>• Obtained: referral milestones</li>
                <li>• Utility: rev-share multipliers</li>
                <li>• Cosmetic: seasonal variants</li>
              </ul>
            </div>
          </div>

          {/* Final CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold"
            >
              Unlock Pro / Elite NFTs
            </Link>
            <Link
              to="/referral"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              Build Referral Value
            </Link>
            <Link
              to="/funding-guide"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Read Funding Guide
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
