// src/pages/ReferralPartner.jsx
import React from "react";
import referralBot from "../assets/images/cards/referralbot.png"; // optional ambient art

export default function ReferralPartner() {
  const card = "rounded-xl bg-gray-800/70 border border-white/10 p-6 shadow-lg backdrop-blur-md";

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-purple-900 via-indigo-950 to-black text-white overflow-hidden">
      {/* Ambient visual (optional bot art or logo glow) */}
      <img
        src={referralBot}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none opacity-20 blur-[2px] absolute top-20 right-10 w-[30vw] max-w-[480px] hidden lg:block"
      />

      {/* Floating glow orbs for gamified energy */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] left-[15%] w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl animate-ping"></div>
      </div>

      {/* Gradient overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl p-6 pt-24 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-lg">
          Referral Partner Program
        </h1>
        <p className="mt-3 text-lg text-zinc-300 max-w-2xl mx-auto">
          Invite friends, earn lifetime rewards, and level up your badge collection as your network grows.
        </p>

        {/* Info Card */}
        <div className={`mt-10 ${card}`}>
          <h2 className="text-2xl font-semibold text-indigo-300">
            ⚡ How It Works
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-left text-sm text-zinc-300">
            <li>
              <span className="font-semibold text-purple-400">Get your link:</span> Access your unique referral link from your member dashboard.
            </li>
            <li>
              <span className="font-semibold text-purple-400">Share & Earn:</span> Invite your followers, friends, and trading groups.
            </li>
            <li>
              <span className="font-semibold text-purple-400">Level Up:</span> Earn XP, unlock NFT badges, and rise through referral tiers as your network trades.
            </li>
          </ol>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <button className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-3 text-white font-bold shadow-md hover:scale-105 hover:shadow-xl transition-all duration-200">
            Get My Referral Link 🚀
          </button>
        </div>

        {/* Animated tagline */}
        <p className="mt-6 text-sm text-zinc-400 italic">
          "Your influence fuels the IMALI ecosystem — every trade strengthens your legacy."
        </p>
      </div>
    </div>
  );
}