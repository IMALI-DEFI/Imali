import React from "react";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-6">
        <h1 className="text-3xl font-bold">About IMALI</h1>
        <p className="text-white/80">
          IMALI helps newcomers participate in DeFi with clear education,
          guardrails, and practical tools. We combine AI‑assisted strategies,
          staking, NFTs, and DAO governance so that everyday people can build,
          learn, and grow.
        </p>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Our Mission</h2>
          <p className="text-white/80">
            Make decentralized finance approachable and beneficial for the “small
            guy” — with transparent products and fair incentives.
          </p>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">What We Offer</h2>
          <ul className="list-disc pl-6 text-white/80 space-y-1">
            <li>AI‑assisted trading strategies for novices and pros</li>
            <li>NFT membership tiers with tangible utility</li>
            <li>Staking, lending, and gamified dashboards</li>
            <li>Referral rewards and community governance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
