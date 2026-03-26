// src/components/ReferralSystem.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "../context/WalletContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaUserFriends,
  FaCoins,
  FaChartLine,
  FaTelegram,
  FaCopy,
  FaRobot,
  FaCheckCircle,
  FaSpinner,
  FaWallet,
  FaGift,
  FaTwitter,
  FaArrowLeft,
  FaCrown,
  FaLink,
  FaStar,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const accentMap = {
  emerald: {
    icon: "text-emerald-300",
    value: "text-emerald-200",
    tile: "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-900/10",
  },
  yellow: {
    icon: "text-yellow-300",
    value: "text-yellow-200",
    tile: "border-yellow-400/20 bg-gradient-to-br from-yellow-500/10 to-yellow-900/10",
  },
  amber: {
    icon: "text-amber-300",
    value: "text-amber-200",
    tile: "border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-900/10",
  },
  violet: {
    icon: "text-violet-300",
    value: "text-violet-200",
    tile: "border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-violet-900/10",
  },
};

const Tile = ({ title, value, icon: Icon, accent = "emerald", suffix = "" }) => {
  const colors = accentMap[accent] || accentMap.emerald;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors.tile}`}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-white/70">
          {title}
        </h4>
        {Icon && <Icon className={`text-lg ${colors.icon}`} />}
      </div>

      <div className={`text-2xl font-extrabold ${colors.value}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix}
      </div>
    </div>
  );
};

const defaultReferralData = {
  code: "",
  totalReferrals: 0,
  level1Earnings: 0,
  level2Earnings: 0,
  pendingRewards: 0,
  earned: 0,
  paid_out: 0,
  rewardPercentage: 20,
  rewardCurrency: "USDC",
  qualifiedReferrals: 0,
  nftTier: "Starter Referral NFT",
};

const ReferralSystem = () => {
  const { account, isConnected, connectWallet } = useWallet();

  const [referralData, setReferralData] = useState(defaultReferralData);
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    } else {
      setAuthToken(null);
      setIsAuthenticated(false);
    }
  }, []);

  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    const shortCode = wallet.slice(2, 10).toUpperCase();
    return `IMALI-${shortCode}`;
  };

  const guestReferralCode = useMemo(() => {
    return isConnected && account ? generateReferralCode(account) : "";
  }, [account, isConnected]);

  const effectiveReferralCode = referralData.code || guestReferralCode;

  const referralUrl = useMemo(() => {
    if (!effectiveReferralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(
      effectiveReferralCode
    )}`;
  }, [effectiveReferralCode]);

  const fetchReferralData = async () => {
    if (!account || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token");

      if (!token) {
        setReferralData((prev) => ({
          ...prev,
          code: generateReferralCode(account),
        }));
        setLoading(false);
        return;
      }

      const [infoRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/referrals/info`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/api/referrals/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (infoRes.data.success) {
        const info = infoRes.data.data;
        setReferralData((prev) => ({
          ...prev,
          code: info.code || generateReferralCode(account),
          totalReferrals: info.total_referred || info.count || 0,
          earned: info.earned || 0,
          paid_out: info.paid_out || 0,
          pendingRewards: info.pending || 0,
          rewardPercentage: info.reward_percentage || 20,
          rewardCurrency: info.reward_currency || "USDC",
          nftTier:
            info.total_referred >= 50
              ? "Legendary Referral NFT"
              : info.total_referred >= 20
              ? "Gold Referral NFT"
              : info.total_referred >= 5
              ? "Silver Referral NFT"
              : "Starter Referral NFT",
        }));
      }

      if (statsRes.data.success) {
        const stats = statsRes.data.data;
        setReferralData((prev) => ({
          ...prev,
          qualifiedReferrals: stats.qualified_referrals || 0,
          level1Earnings: stats.total_rewards_earned || 0,
          level2Earnings: (stats.total_rewards_earned || 0) * 0.25,
        }));
      }
    } catch (err) {
      console.error("Error fetching referral data:", err);

      setReferralData((prev) => ({
        ...prev,
        code: generateReferralCode(account),
      }));

      if (err.response?.status === 401) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setError("Please log in to apply a referral code.");
      return;
    }

    setApplyLoading(true);
    setError(null);
    setSuccess(null);
    setValidationStatus(null);

    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token");

      const validateRes = await axios.post(`${API_BASE}/api/referrals/validate`, {
        code: referralInput.trim().toUpperCase(),
      });

      if (validateRes.data.success) {
        setValidationStatus({ valid: true, message: "Valid referral code!" });

        const applyRes = await axios.post(
          `${API_BASE}/api/referrals/apply`,
          { code: referralInput.trim().toUpperCase() },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (applyRes.data.success) {
          setSuccess("Referral code applied successfully.");
          setReferralInput("");
          fetchReferralData();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(applyRes.data.message || "Failed to apply referral code.");
        }
      } else {
        setValidationStatus({ valid: false, message: "Invalid referral code." });
        setError("Invalid referral code.");
      }
    } catch (err) {
      console.error("Error applying referral code:", err);
      setError(
        err.response?.data?.message || "Failed to apply referral code. Please try again."
      );
    } finally {
      setApplyLoading(false);
    }
  };

  const claimRewards = async () => {
    if (referralData.pendingRewards <= 0) {
      setError("No pending rewards to claim.");
      return;
    }

    if (!isAuthenticated) {
      setError("Please log in to claim rewards.");
      return;
    }

    if (!walletAddress && !showWalletInput) {
      setShowWalletInput(true);
      return;
    }

    if (!walletAddress) {
      setError("Please enter a wallet address.");
      return;
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Please enter a valid Ethereum-style wallet address.");
      return;
    }

    setClaimLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token");

      const response = await axios.post(
        `${API_BASE}/api/referrals/claim`,
        {
          amount: referralData.pendingRewards,
          wallet_address: walletAddress,
          claim_all: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess("Claim submitted successfully.");
        fetchReferralData();
        setWalletAddress("");
        setShowWalletInput(false);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(response.data.message || "Failed to claim rewards.");
      }
    } catch (err) {
      console.error("Error claiming rewards:", err);
      setError(err.response?.data?.message || "Failed to claim rewards.");
    } finally {
      setClaimLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleConnectWallet = () => {
    if (connectWallet) {
      connectWallet();
    } else {
      window.dispatchEvent(new CustomEvent("open-wallet-modal"));
    }
  };

  useEffect(() => {
    if (account && isConnected) {
      setReferralData((prev) => ({
        ...prev,
        code: prev.code || generateReferralCode(account),
      }));

      if (isAuthenticated) {
        fetchReferralData();
      }
    }
  }, [account, isConnected, isAuthenticated]);

  if (!isConnected) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
          >
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
              <FaRobot className="text-5xl text-emerald-300" />
            </div>

            <h1 className="mb-4 bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
              Get Your Referral Link First
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
              Connect a wallet to instantly generate your IMALI referral link.
              No full signup required just to start sharing.
            </p>

            <div className="mx-auto mb-8 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="mb-3 text-lg font-semibold">How it works</h3>
              <ol className="space-y-3 text-left text-white/80">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-200">
                    1
                  </span>
                  <span>Connect your wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-200">
                    2
                  </span>
                  <span>Instantly generate your referral link and QR code</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm text-emerald-200">
                    3
                  </span>
                  <span>Share it now and finish full signup later if you want to claim rewards</span>
                </li>
              </ol>
            </div>

            <button
              onClick={handleConnectWallet}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-cyan-400"
            >
              <FaWallet className="text-sm" />
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !effectiveReferralCode) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto mb-4 animate-spin text-4xl text-emerald-400" />
            <p className="text-white/70">Loading referral data...</p>
          </div>
        </div>
      </div>
    );
  }

  const guestMode = isConnected && !isAuthenticated;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
        >
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        <div className="mb-10 text-center">
          <h1 className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            <FaUserFriends /> Boost With Referrals
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Share your link, level up your referral NFT, and earn{" "}
            {referralData.rewardPercentage}% of fees from users you refer.
            Payouts in {referralData.rewardCurrency}.
          </p>
        </div>

        {guestMode && (
          <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-cyan-100">
            Your wallet is connected, so your referral link is ready now. You do
            not need a full account just to share it. Full signup is only needed
            later for claiming rewards and viewing full referral history.
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-400/20 bg-green-500/10 p-4 text-green-200">
            <FaCheckCircle />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <img
                src={referralImg}
                alt="IMALI Referral overview"
                className="mb-4 w-full rounded-xl"
              />
              <h3 className="mb-2 text-lg font-bold">How it works</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-white/80">
                <li>Connect your wallet to generate a referral code.</li>
                <li>Share your link or QR code instantly.</li>
                <li>Friends sign up with your code.</li>
                <li>You level up your referral NFT as your network grows.</li>
                <li>Log in later to track earnings and claim rewards.</li>
              </ol>

              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
              >
                <FaTelegram className="mr-2" /> Start via Telegram
              </a>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <FaRobot className="text-amber-300" /> Referral NFT Bot
                </h3>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                  NFT Utility
                </span>
              </div>

              <img
                src={referralBot}
                alt="IMALI Referral NFT Bot"
                className="mb-4 w-full rounded-xl border border-amber-400/20"
              />

              <div className="mb-3 rounded-xl border border-yellow-400/20 bg-black/20 p-3">
                <div className="mb-1 flex items-center gap-2 text-yellow-200">
                  <FaCrown />
                  <span className="text-sm font-semibold">Current NFT Tier</span>
                </div>
                <p className="text-lg font-bold text-white">{referralData.nftTier}</p>
              </div>

              <ul className="space-y-2 text-sm text-white/85">
                <li>
                  • <b>Starter NFT:</b> Begin sharing right away with a wallet-generated link.
                </li>
                <li>
                  • <b>Tier Upgrades:</b> More referrals can unlock stronger NFT status and perks.
                </li>
                <li>
                  • <b>Reward Multipliers:</b> Higher referral performance can support bonus campaigns.
                </li>
                <li>
                  • <b>Leaderboard Utility:</b> Top referrers can unlock special access and seasonal drops.
                </li>
                <li>
                  • <b>Future Perks:</b> Early beta access, partner tools, and collectible upgrades.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 p-5">
              <h3 className="mb-3 text-lg font-bold">Your Referral Link</h3>

              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="rounded-xl border border-emerald-400/20 bg-white p-3">
                  <QRCodeCanvas
                    value={referralUrl || "https://imali-defi.com/signup"}
                    size={140}
                  />
                </div>

                <code className="break-all text-center text-xs text-emerald-200">
                  {referralUrl || "Connect wallet to generate"}
                </code>
              </div>

              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-l-xl border border-emerald-400/20 bg-black/30 p-3 text-sm text-white"
                  placeholder="Connect wallet to generate link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`flex items-center gap-2 rounded-r-xl px-4 transition ${
                    referralUrl
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-700 text-gray-400"
                  }`}
                >
                  <FaCopy /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent(
                    `Join me on IMALI. Use my referral link and level up into smarter trading.`
                  );
                  const url = encodeURIComponent(referralUrl);
                  window.open(
                    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
                    "_blank"
                  );
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 py-2 text-white transition hover:bg-blue-600"
                disabled={!referralUrl}
              >
                <FaTwitter className="mr-2" /> Share on X/Twitter
              </button>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                <div className="mb-1 flex items-center gap-2">
                  <FaLink className="text-emerald-300" />
                  <span className="font-semibold text-white/90">Referral Code</span>
                </div>
                <span className="font-mono">{effectiveReferralCode || "Not generated yet"}</span>
              </div>
            </div>
          </aside>

          <section className="space-y-6 lg:col-span-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Tile
                title="Referrals"
                value={referralData.totalReferrals}
                icon={FaUserFriends}
                accent="emerald"
              />
              <Tile
                title="Total Earned"
                value={Number(referralData.earned || 0).toFixed(2)}
                icon={FaCoins}
                accent="yellow"
                suffix={` ${referralData.rewardCurrency}`}
              />
              <Tile
                title="Qualified"
                value={referralData.qualifiedReferrals}
                icon={FaStar}
                accent="amber"
              />
              <Tile
                title="Pending"
                value={Number(referralData.pendingRewards || 0).toFixed(2)}
                icon={FaGift}
                accent="violet"
                suffix={` ${referralData.rewardCurrency}`}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold">Claim your rewards</h3>
                  <p className="text-sm text-white/70">
                    Pending: {Number(referralData.pendingRewards || 0).toFixed(2)}{" "}
                    {referralData.rewardCurrency}
                  </p>
                </div>

                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0 || claimLoading || guestMode}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition ${
                    referralData.pendingRewards > 0 && !claimLoading && !guestMode
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-700 text-gray-400"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : <FaGift />}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>

              {guestMode && (
                <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  You can generate and share a referral link right now. To claim rewards later,
                  log in or create your account using this same wallet.
                </div>
              )}

              {showWalletInput && !guestMode && (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <label className="mb-2 block text-sm font-medium text-white">
                    Wallet Address for {referralData.rewardCurrency}
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white"
                  />
                  <p className="mt-2 text-xs text-white/70">
                    Enter your Ethereum or Polygon wallet to receive {referralData.rewardCurrency}.
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-4 text-sm text-white/75 sm:grid-cols-2">
                <ul className="list-inside list-disc space-y-2">
                  <li>{referralData.rewardPercentage}% share on referred user fees.</li>
                  <li>Rewards are paid in {referralData.rewardCurrency}.</li>
                </ul>
                <ul className="list-inside list-disc space-y-2">
                  <li>Full signup is not required just to get a link.</li>
                  <li>Full account access is used for claims and deeper tracking.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-6">
              <h3 className="mb-3 font-semibold">Have a referral code?</h3>

              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code (e.g. IMALI-XXXXXX)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-l-xl border border-white/10 bg-black/30 p-3 text-sm text-white"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`rounded-r-xl px-6 py-3 transition ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "cursor-not-allowed bg-gray-700 text-gray-400"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              </div>

              {validationStatus && (
                <p
                  className={`mt-2 text-xs ${
                    validationStatus.valid ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {validationStatus.message}
                </p>
              )}

              <p className="mt-2 text-xs text-white/60">
                Applying a referral code still requires login so it can be tied to an account.
              </p>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-600/20 to-purple-700/20 p-6 sm:flex-row">
              <div>
                <h3 className="text-xl font-bold">Ready to invite friends?</h3>
                <p className="text-sm text-white/75">
                  Share your link now. Upgrade your referral NFT as your network grows.
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/pricing"
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  View Pricing
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/signup"
                    className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Finish Signup
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;