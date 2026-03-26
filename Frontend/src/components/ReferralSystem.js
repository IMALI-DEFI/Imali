// src/components/ReferralSystem.jsx
import React, { useState, useEffect } from "react";
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
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const accentMap = {
  emerald: {
    icon: "text-emerald-600",
    value: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
  },
  yellow: {
    icon: "text-amber-500",
    value: "text-amber-600",
    badge: "bg-amber-50 text-amber-700",
  },
  amber: {
    icon: "text-orange-500",
    value: "text-orange-600",
    badge: "bg-orange-50 text-orange-700",
  },
  violet: {
    icon: "text-violet-600",
    value: "text-violet-600",
    badge: "bg-violet-50 text-violet-700",
  },
  blue: {
    icon: "text-blue-600",
    value: "text-blue-600",
    badge: "bg-blue-50 text-blue-700",
  },
};

const Tile = ({ title, value, icon: Icon, accent = "emerald", suffix = "" }) => {
  const colors = accentMap[accent] || accentMap.emerald;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
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

const ReferralSystem = () => {
  const { account, isConnected, connectWallet } = useWallet();

  const [referralData, setReferralData] = useState({
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
  });

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
      setIsAuthenticated(false);
    }
  }, []);

  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    const shortCode = wallet.slice(2, 10).toUpperCase();
    return `IMALI-${shortCode}`;
  };

  const referralUrl = referralData.code
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(
        referralData.code
      )}`
    : "";

  const fetchReferralData = async () => {
    if (!account || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token");

      if (!token) {
        setError("Please log in to view referral data");
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
    } catch (error) {
      console.error("Error fetching referral data:", error);
      if (error.response?.status === 401) {
        setError("Session expired. Please log in again.");
        setIsAuthenticated(false);
      } else {
        setError("Failed to load referral data. Please try again.");
      }

      setReferralData((prev) => ({
        ...prev,
        code: generateReferralCode(account),
      }));
    } finally {
      setLoading(false);
    }
  };

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setError("Please log in to apply a referral code");
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

      if (!token) {
        setError("Please log in to apply a referral code");
        setApplyLoading(false);
        return;
      }

      const validateRes = await axios.post(`${API_BASE}/api/referrals/validate`, {
        code: referralInput.trim().toUpperCase(),
      });

      if (validateRes.data.success) {
        setValidationStatus({ valid: true, message: "Valid referral code!" });

        const applyRes = await axios.post(
          `${API_BASE}/api/referrals/apply`,
          {
            code: referralInput.trim().toUpperCase(),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (applyRes.data.success) {
          setSuccess("Referral code applied successfully!");
          setReferralInput("");
          fetchReferralData();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(applyRes.data.message || "Failed to apply referral code");
        }
      } else {
        setValidationStatus({ valid: false, message: "Invalid referral code" });
        setError("Invalid referral code. Please check and try again.");
      }
    } catch (error) {
      console.error("Error applying referral code:", error);
      if (error.response?.status === 404) {
        setError("Referral code not found");
      } else if (error.response?.status === 400) {
        setError(
          error.response.data.message ||
            "Cannot apply referral code to your account"
        );
      } else {
        setError("Failed to apply referral code. Please try again.");
      }
    } finally {
      setApplyLoading(false);
    }
  };

  const claimRewards = async () => {
    if (referralData.pendingRewards <= 0) {
      setError("No pending rewards to claim");
      return;
    }

    if (!isAuthenticated) {
      setError("Please log in to claim rewards");
      return;
    }

    if (!walletAddress && !showWalletInput) {
      setShowWalletInput(true);
      return;
    }

    if (!walletAddress) {
      setError("Please enter a wallet address to receive rewards");
      return;
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError(
        "Please enter a valid Ethereum wallet address (0x followed by 40 hex characters)"
      );
      return;
    }

    setClaimLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token =
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token");

      if (!token) {
        setError("Please log in to claim rewards");
        setClaimLoading(false);
        return;
      }

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
        setSuccess(`Claim submitted! ${response.data.message}`);
        fetchReferralData();
        setWalletAddress("");
        setShowWalletInput(false);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.data.message || "Failed to claim rewards");
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
      if (error.response?.status === 400) {
        setError(error.response.data.message || "Invalid claim request");
      } else {
        setError("Failed to claim rewards. Please try again.");
      }
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
    if (account && isConnected && isAuthenticated) {
      fetchReferralData();
    }
  }, [account, isConnected, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
          >
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
              <FaUserFriends className="text-5xl text-emerald-600" />
            </div>

            <h1 className="mb-4 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-4xl font-bold text-transparent">
              IMALI Referral Program
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
              Earn 20% of fees paid by users you refer. Connect your account to
              get started.
            </p>

            <div className="mx-auto mb-8 max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                How it works
              </h3>

              <ol className="space-y-3 text-left text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    1
                  </span>
                  <span>Create an account or log in</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    2
                  </span>
                  <span>Get your unique referral link</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    3
                  </span>
                  <span>
                    Share with friends and earn 20% of their fees in USDC
                  </span>
                </li>
              </ol>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-8 py-3 font-semibold text-white transition hover:from-emerald-500 hover:to-cyan-500"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
          >
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="text-center">
            <FaWallet className="mx-auto mb-6 text-6xl text-emerald-600" />
            <h1 className="mb-4 text-3xl font-bold">Connect Your Wallet</h1>
            <p className="mx-auto mb-8 max-w-md text-gray-600">
              Connect your wallet to view your referral stats and start earning
              rewards.
            </p>
            <button
              onClick={handleConnectWallet}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-8 py-3 font-semibold text-white transition hover:from-emerald-500 hover:to-cyan-500"
            >
              <FaWallet className="text-sm" />
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !referralData.code) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto mb-4 animate-spin text-4xl text-emerald-600" />
            <p className="text-gray-600">Loading referral data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
        >
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        <div className="mb-10 text-center">
          <h1 className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 via-amber-500 to-pink-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            <FaUserFriends /> Boost With Referrals
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Share your link, earn {referralData.rewardPercentage}% of fees paid
            by users you refer. Payouts in {referralData.rewardCurrency}.
          </p>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            <FaCheckCircle />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <aside className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <img
                src={referralImg}
                alt="IMALI Referral overview"
                className="mb-4 w-full rounded-xl"
              />
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                How it works
              </h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
                <li>Connect your wallet to generate a unique code.</li>
                <li>Share your link or QR code. Friends sign up for any tier.</li>
                <li>
                  You earn {referralData.rewardPercentage}% of the fees they pay.
                </li>
                <li>Track earnings and claim rewards here.</li>
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

            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <FaRobot className="text-amber-600" /> Your Referral Bot
                </h3>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  Value Accrual
                </span>
              </div>

              <img
                src={referralBot}
                alt="IMALI Referral Bot"
                className="mb-4 w-full rounded-xl border border-gray-200"
              />

              <p className="text-sm text-gray-600">
                As the <b>IMALI bot</b> grows with more users, more signals, and
                more partner volume, your Referral Bot gains utility and
                long-term value:
              </p>

              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>
                  • <b>Tier Boosts:</b> Higher member tiers you refer can
                  increase your revenue-share multipliers.
                </li>
                <li>
                  • <b>Volume Rewards:</b> A percentage of trading volume from
                  your network can unlock milestone bonuses.
                </li>
                <li>
                  • <b>Staking Synergy:</b> Holding or staking IMALI can boost
                  your partner payout percentages.
                </li>
                <li>
                  • <b>Seasonal Leaderboards:</b> Top referrers can earn bonus
                  pools and exclusive rewards.
                </li>
                <li>
                  • <b>Partner Utilities:</b> Access to partner-only signals,
                  early betas, and governance-style perks.
                </li>
              </ul>

              <p className="mt-3 text-xs text-gray-500">
                Program specifics can evolve as IMALI scales. Track your
                referral bot value in your dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-gray-900">
                Your Referral Link
              </h3>

              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <QRCodeCanvas
                    value={referralUrl || "https://imali-defi.com/signup"}
                    size={140}
                  />
                </div>

                <code className="break-all text-center text-xs text-emerald-700">
                  {referralUrl || "Generating your link..."}
                </code>
              </div>

              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-l-xl border border-gray-300 bg-white p-3 text-sm text-gray-900"
                  placeholder="Connect wallet to generate link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`flex items-center gap-2 rounded-r-xl px-4 transition ${
                    referralUrl
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  <FaCopy /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent(
                    `Join me on IMALI — earn ${referralData.rewardPercentage}% referral rewards on ${referralData.rewardCurrency}!`
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
                value={referralData.earned.toFixed(2)}
                icon={FaCoins}
                accent="yellow"
                suffix={` ${referralData.rewardCurrency}`}
              />
              <Tile
                title="Qualified"
                value={referralData.qualifiedReferrals}
                icon={FaChartLine}
                accent="amber"
              />
              <Tile
                title="Pending"
                value={referralData.pendingRewards.toFixed(2)}
                icon={FaGift}
                accent="violet"
                suffix={` ${referralData.rewardCurrency}`}
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Claim your rewards
                  </h3>
                  <p className="text-sm text-gray-600">
                    Pending: {referralData.pendingRewards.toFixed(2)}{" "}
                    {referralData.rewardCurrency}
                  </p>
                </div>

                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0 || claimLoading}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition ${
                    referralData.pendingRewards > 0 && !claimLoading
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {claimLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaGift />
                  )}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>

              {showWalletInput && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Wallet Address for {referralData.rewardCurrency}
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Enter your Ethereum or Polygon wallet to receive{" "}
                    {referralData.rewardCurrency}.
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    {referralData.rewardPercentage}% referral share on fees paid
                    by users you refer.
                  </li>
                  <li>
                    Paid in {referralData.rewardCurrency} after the user
                    qualifies.
                  </li>
                </ul>
                <ul className="list-inside list-disc space-y-2">
                  <li>Rewards unlock once a referred user pays fees.</li>
                  <li>
                    Minimum claim: $10 {referralData.rewardCurrency}.
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">
                Have a referral code?
              </h3>

              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code (e.g., IMALI-XXXXXX)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-l-xl border border-gray-300 bg-white p-3 text-sm text-gray-900"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`rounded-r-xl px-6 py-3 transition ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              </div>

              {validationStatus && (
                <p
                  className={`mt-2 text-xs ${
                    validationStatus.valid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {validationStatus.message}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Enter a friend&apos;s code to give them a referral bonus when you
                start trading.
              </p>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm sm:flex-row">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Ready to invite friends?
                </h3>
                <p className="text-sm text-gray-600">
                  Share your link and start earning{" "}
                  {referralData.rewardPercentage}% of their fees.
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/pricing"
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  View Pricing
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Go to Signup
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;