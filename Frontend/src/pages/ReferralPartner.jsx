// src/components/ReferralSystem.jsx
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import {
  FaUserFriends,
  FaShareAlt,
  FaCoins,
  FaChartLine,
  FaTelegram,
  FaCopy,
  FaRobot,
  FaWallet,
  FaArrowRight,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const Tile = ({ title, value, icon: Icon, accent = "emerald" }) => {
  const accentClasses = {
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100",
    yellow: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100",
    amber: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100",
    violet: "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100",
  };
  const iconClasses = {
    emerald: "text-emerald-600",
    yellow: "text-yellow-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };
  return (
    <div className={`rounded-2xl p-5 border ${accentClasses[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm uppercase tracking-wide text-gray-600">{title}</h4>
        {Icon && <Icon className={iconClasses[accent]} />}
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
};

// Wallet option component for the modal
const WalletOption = ({ name, icon, description, installUrl, mobile }) => (
  <a
    href={installUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:shadow-md hover:border-emerald-300"
  >
    <div className="text-3xl">{icon}</div>
    <div className="flex-1">
      <div className="font-semibold text-gray-900 group-hover:text-emerald-600">
        {name}
        {mobile && <span className="ml-2 text-xs text-gray-500">Mobile</span>}
      </div>
      <div className="text-xs text-gray-600">{description}</div>
    </div>
    <FaArrowRight className="text-gray-400 group-hover:text-emerald-600" />
  </a>
);

// Wallet guide modal – appears when user has no wallet
const WalletGuideModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
        <h2 className="text-2xl font-bold text-gray-900">Choose a Wallet</h2>
        <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
      <div className="p-6">
        <p className="mb-6 text-gray-600">
          To get your referral link and earn rewards, you'll need a Web3 wallet.
        </p>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FaWallet className="text-emerald-600" /> Popular Wallets
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WalletOption
            name="MetaMask"
            icon="🦊"
            description="Most popular wallet for beginners"
            installUrl="https://metamask.io/download/"
          />
          <WalletOption
            name="Coinbase Wallet"
            icon="💰"
            description="Simple and beginner-friendly"
            installUrl="https://www.coinbase.com/wallet"
          />
          <WalletOption
            name="Trust Wallet"
            icon="🔒"
            description="Easy mobile wallet"
            installUrl="https://trustwallet.com/"
            mobile
          />
          <WalletOption
            name="Rainbow"
            icon="🌈"
            description="Popular mobile wallet"
            installUrl="https://rainbow.me/"
            mobile
          />
        </div>
        <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          💡 After installing, refresh this page and connect your new wallet.
        </div>
      </div>
    </div>
  </div>
);

const ReferralSystem = () => {
  const { account, isConnected, connectWallet, connecting, hasWallet } = useWallet();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    pendingRewards: 0,
  });
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showWalletGuide, setShowWalletGuide] = useState(false);

  const referralUrl = referralData.code
    ? `${window.location.origin}/signup?ref=${referralData.code}`
    : "";

  useEffect(() => {
    if (!account) return;
    const code = account.slice(2, 10).toUpperCase();
    setReferralData((prev) => ({
      ...prev,
      code,
      // TODO: Replace with real data from backend/contract
      totalReferrals: 12,
      level1Earnings: 5.42,
      level2Earnings: 1.23,
      pendingRewards: 2.15,
    }));
  }, [account]);

  const handleConnectClick = () => {
    if (!hasWallet) {
      setShowWalletGuide(true);
    } else {
      connectWallet();
    }
  };

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

  // Loading state while connecting
  if (connecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to wallet...</p>
        </div>
      </div>
    );
  }

  // Main dashboard (original layout, white theme)
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 flex items-center justify-center gap-3">
            <FaUserFriends className="text-emerald-600" /> Boost With Referrals
          </h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Share your link, level up rewards, and unlock perks. Earnings pay out in USDC/IMALI.
            Your <span className="font-semibold">Referral Bot</span> grows its value as the IMALI bot scales.
          </p>
        </div>

        {/* Wallet status / connect button */}
        {!isConnected && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-700 font-medium">Connect your wallet to get your referral link</p>
              <p className="text-sm text-gray-500">You'll receive a unique code to share</p>
            </div>
            <button
              onClick={handleConnectClick}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <FaWallet /> Connect Wallet
            </button>
          </div>
        )}

        {isConnected && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-emerald-700">
                Wallet Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT COLUMN: Explainer + QR + Referral Bot */}
          <aside className="lg:col-span-2 space-y-6">
            {/* Explainer card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <img src={referralImg} alt="IMALI Referral overview" className="w-full rounded-xl mb-4" />
              <h3 className="text-lg font-bold mb-2 text-gray-900">How it works</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
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

            {/* Referral Bot value card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                  <FaRobot className="text-amber-600" /> Your Referral Bot
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  Value Accrual
                </span>
              </div>
              <img src={referralBot} alt="IMALI Referral Bot" className="w-full rounded-xl border border-amber-200 mb-4" />
              <p className="text-sm text-gray-700">
                As the <b>IMALI bot</b> grows (more users, more signals, more partner volume), your Referral Bot gains utility and
                long-term value:
              </p>
              <ul className="mt-3 text-sm space-y-2 text-gray-700">
                <li>• <b>Tier Boosts:</b> Higher member tiers you refer can increase your rev-share multipliers.</li>
                <li>• <b>Volume Rewards:</b> A % of trading volume from your network can unlock milestone bonuses.</li>
                <li>• <b>Staking Synergy:</b> Holding/staking IMALI can boost your partner payout percentages.</li>
                <li>• <b>Seasonal Leaderboards:</b> Top referrers earn bonus pools, cosmetics, and rare collectibles.</li>
                <li>• <b>Partner Utilities:</b> Access to partner-only signals, early betas, and DAO proposals.</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                (Program specifics are on-chain & backend-driven; evolving as IMALI scales. Visual bot badge shown in your dashboard.)
              </p>
            </div>

            {/* Your QR + link */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="text-lg font-bold mb-3 text-gray-900">Your Referral Link</h3>
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <QRCodeCanvas value={referralUrl || "https://imali-defi.com/signup"} size={140} />
                </div>
                <code className="text-xs break-all text-emerald-700 text-center">
                  {referralUrl || "Connect your wallet to generate"}
                </code>
              </div>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 p-3 rounded-l-xl bg-white border border-gray-300 text-sm text-gray-900"
                  placeholder="Connect a wallet to generate your link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`px-4 rounded-r-xl flex items-center gap-2 ${
                    referralUrl
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
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
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Claim your rewards</h3>
                  <p className="text-sm text-gray-600">Payouts in USDC or IMALI. Requires connected wallet.</p>
                </div>
                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0}
                  className={`px-6 py-3 rounded-2xl font-semibold ${
                    referralData.pendingRewards > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Claim Rewards
                </button>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                <ul className="space-y-2 list-disc list-inside text-gray-700">
                  <li>20% referral share on signups from your link (paid in USDC).</li>
                  <li>Influencers may receive a global 2% pool via monthly statement.</li>
                </ul>
                <ul className="space-y-2 list-disc list-inside text-gray-700">
                  <li>Rewards unlock once users pick a tier & connect a wallet.</li>
                  <li>Track live stats in your Partner Dashboard.</li>
                </ul>
              </div>
            </div>

            {/* Apply a Code */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="font-semibold mb-3 text-gray-900">Have a referral code?</h3>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  className="flex-1 p-3 rounded-l-xl bg-white border border-gray-300 text-gray-900"
                />
                <button
                  onClick={registerReferral}
                  disabled={!referralInput.trim()}
                  className={`px-6 py-3 rounded-r-xl ${
                    referralInput.trim()
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Apply
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">Tip: Ask a friend for their code to earn them a bonus.</p>
            </div>

            {/* CTA: Drive to pricing/signup */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Ready to invite friends?</h3>
                <p className="text-sm text-gray-600">Choose a tier first so your rewards can track instantly.</p>
              </div>
              <div className="flex gap-3">
                <Link to="/pricing" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  View Pricing
                </Link>
                <Link to="/signup" className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  Go to Signup
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Wallet Guide Modal */}
      {showWalletGuide && <WalletGuideModal onClose={() => setShowWalletGuide(false)} />}
    </div>
  );
};

export default ReferralSystem;
