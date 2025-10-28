// src/components/ReferralSystem.jsx (Gamified + Referral Bot explainer)
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import { FaUserFriends, FaShareAlt, FaCoins, FaChartLine, FaTelegram, FaCopy, FaRobot } from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png"; // ← NEW

const Tile = ({ title, value, icon: Icon, accent = "emerald" }) => (
  <div className={`rounded-2xl p-5 border bg-gradient-to-br from-${accent}-500/10 to-${accent}-900/10 border-${accent}-400/30`}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm uppercase tracking-wide text-white/70">{title}</h4>
      {Icon && <Icon className={`text-${accent}-300`} />}
    </div>
    <div className="text-2xl font-extrabold">{value}</div>
  </div>
);

const ReferralSystem = () => {
  const { account } = useWallet();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    pendingRewards: 0,
  });
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);

  const referralUrl = referralData.code ? `${window.location.origin}/signup?ref=${referralData.code}` : "";

  useEffect(() => {
    if (!account) return;
    const code = account.slice(2, 10).toUpperCase();
    setReferralData((prev) => ({
      ...prev,
      code,
      // TODO: Replace demo stats with backend/contract reads
      totalReferrals: 12,
      level1Earnings: 5.42,
      level2Earnings: 1.23,
      pendingRewards: 2.15,
    }));
  }, [account]);

  const copyToClipboard = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const registerReferral = async () => {
    // TODO: backend/contract
    alert(`Referral code ${referralInput.trim()} registered!`);
    setReferralInput("");
  };

  const claimRewards = async () => {
    // TODO: contract claim
    alert("Rewards claimed successfully!");
    setReferralData((p) => ({ ...p, pendingRewards: 0 }));
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent animate-pulse flex items-center justify-center gap-3">
            <FaUserFriends /> Boost With Referrals
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Share your link, level up rewards, and unlock perks. Earnings pay out in USDC/IMALI.
            Your <span className="font-semibold">Referral Bot</span> grows its value as the IMALI bot scales.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT COLUMN: Explainer + QR + Referral Bot */}
          <aside className="lg:col-span-2 space-y-6">
            {/* Explainer card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <img src={referralImg} alt="IMALI Referral overview" className="w-full rounded-xl mb-4" />
              <h3 className="text-lg font-bold mb-2">How it works</h3>
              <ol className="list-decimal list-inside text-white/80 space-y-1 text-sm">
                <li>Connect your wallet to generate a unique code.</li>
                <li>Share your link/QR. Friends sign up for any tier.</li>
                <li>You earn a revenue share. Track and claim here.</li>
              </ol>
              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                <FaTelegram className="mr-2" /> Start via Telegram
              </a>
            </div>

            {/* NEW: Referral Bot value card */}
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaRobot /> Your Referral Bot
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  Value Accrual
                </span>
              </div>
              <img src={referralBot} alt="IMALI Referral Bot" className="w-full rounded-xl border border-amber-400/20 mb-4" />
              <p className="text-sm text-white/80">
                As the <b>IMALI bot</b> grows (more users, more signals, more partner volume), your Referral Bot gains utility and
                long-term value:
              </p>
              <ul className="mt-3 text-sm space-y-2 text-white/85">
                <li>• <b>Tier Boosts:</b> Higher member tiers you refer can increase your rev-share multipliers.</li>
                <li>• <b>Volume Rewards:</b> A % of trading volume from your network can unlock milestone bonuses.</li>
                <li>• <b>Staking Synergy:</b> Holding/staking IMALI can boost your partner payout percentages.</li>
                <li>• <b>Seasonal Leaderboards:</b> Top referrers earn bonus pools, cosmetics, and rare collectibles.</li>
                <li>• <b>Partner Utilities:</b> Access to partner-only signals, early betas, and DAO proposals.</li>
              </ul>
              <p className="mt-3 text-xs text-white/60">
                (Program specifics are on-chain & backend-driven; evolving as IMALI scales. Visual bot badge shown in your dashboard.)
              </p>
            </div>

            {/* Your QR + link */}
            <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600/20 to-emerald-900/30 p-5">
              <h3 className="text-lg font-bold mb-3">Your Referral Link</h3>
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="p-3 bg-black/40 rounded-xl border border-emerald-500/30">
                  <QRCodeCanvas value={referralUrl || "https://imali-defi.com/signup"} size={140} />
                </div>
                <code className="text-xs break-all text-emerald-200/90 text-center">
                  {referralUrl || "Connect your wallet to generate"}
                </code>
              </div>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 p-3 rounded-l-xl bg-black/40 border border-emerald-500/30 text-sm"
                  placeholder="Connect a wallet to generate your link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`px-4 rounded-r-xl flex items-center gap-2 ${referralUrl ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-500/50 cursor-not-allowed"}`}
                >
                  <FaCopy /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent("Join me on IMALI — crypto trading made simple:");
                  const url = encodeURIComponent(referralUrl);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                }}
                className="mt-3 w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center justify-center"
                disabled={!referralUrl}
              >
                <FaShareAlt className="mr-2" /> Share on X/Twitter
              </button>
            </div>
          </aside>

          {/* RIGHT COLUMN: Stats + Actions */}
          <section className="lg:col-span-3 space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Tile title="Referrals" value={referralData.totalReferrals} icon={FaUserFriends} accent="emerald" />
              <Tile title="Level 1" value={`${referralData.level1Earnings} IMALI`} icon={FaCoins} accent="yellow" />
              <Tile title="Level 2" value={`${referralData.level2Earnings} IMALI`} icon={FaCoins} accent="amber" />
              <Tile title="Pending" value={`${referralData.pendingRewards} IMALI`} icon={FaChartLine} accent="violet" />
            </div>

            {/* Claim + Program rules */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Claim your rewards</h3>
                  <p className="text-sm text-white/70">Payouts in USDC or IMALI. Requires connected wallet.</p>
                </div>
                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0}
                  className={`px-6 py-3 rounded-2xl font-semibold ${referralData.pendingRewards > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-600/40 cursor-not-allowed"}`}
                >
                  Claim Rewards
                </button>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                <ul className="space-y-2 list-disc list-inside text-white/80">
                  <li>20% referral share on signups from your link (paid in USDC).</li>
                  <li>Influencers may receive a global 2% pool via monthly statement.</li>
                </ul>
                <ul className="space-y-2 list-disc list-inside text-white/80">
                  <li>Rewards unlock once users pick a tier & connect a wallet.</li>
                  <li>Track live stats in your Partner Dashboard.</li>
                </ul>
              </div>
            </div>

            {/* Apply a Code */}
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-6">
              <h3 className="font-semibold mb-3">Have a referral code?</h3>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  className="flex-1 p-3 rounded-l-xl bg-black/40 border border-amber-400/30"
                />
                <button
                  onClick={registerReferral}
                  disabled={!referralInput.trim()}
                  className={`px-6 py-3 rounded-r-xl ${referralInput.trim() ? "bg-amber-500 hover:bg-amber-600" : "bg-gray-500/40 cursor-not-allowed"}`}
                >
                  Apply
                </button>
              </div>
              <p className="mt-2 text-xs text-white/70">Tip: Ask a friend for their code to earn them a bonus.</p>
            </div>

            {/* CTA: Drive to pricing/signup */}
            <div className="rounded-2xl border border-indigo-400/30 p-6 bg-gradient-to-r from-indigo-600/20 to-purple-700/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Ready to invite friends?</h3>
                <p className="text-sm text-white/80">Choose a tier first so your rewards can track instantly.</p>
              </div>
              <div className="flex gap-3">
                <Link to="/pricing" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold">View Pricing</Link>
                <Link to="/signup" className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold">Go to Signup</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;
