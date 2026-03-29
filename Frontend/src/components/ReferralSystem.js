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
  FaMedal,
  FaLink,
  FaSyncAlt,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const accentMap = {
  emerald: {
    icon: "text-emerald-600",
    value: "text-emerald-700",
    tile: "border-emerald-200 bg-emerald-50",
  },
  yellow: {
    icon: "text-amber-500",
    value: "text-amber-700",
    tile: "border-amber-200 bg-amber-50",
  },
  amber: {
    icon: "text-orange-500",
    value: "text-orange-700",
    tile: "border-orange-200 bg-orange-50",
  },
  violet: {
    icon: "text-violet-600",
    value: "text-violet-700",
    tile: "border-violet-200 bg-violet-50",
  },
};

const Tile = ({ title, value, icon: Icon, accent = "emerald", suffix = "" }) => {
  const colors = accentMap[accent] || accentMap.emerald;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors.tile}`}>
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
  const { account, isConnected, connectWallet, connecting, hasWallet } = useWallet();

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
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Check authentication status
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  // Auto-connect wallet on page load
  useEffect(() => {
    const autoConnect = async () => {
      // Don't attempt auto-connect if already connected, connecting, or already attempted
      if (isConnected || connecting || autoConnectAttempted) return;
      
      // Don't attempt if no wallet is installed
      if (!hasWallet) {
        setAutoConnectAttempted(true);
        return;
      }

      setAutoConnectAttempted(true);
      
      try {
        await connectWallet();
        console.log("[ReferralSystem] Auto-connect successful");
      } catch (err) {
        console.log("[ReferralSystem] Auto-connect failed or user rejected:", err.message);
        // Don't show error for auto-connect failures - user can manually connect
      }
    };

    // Small delay to ensure wallet context is ready
    const timer = setTimeout(autoConnect, 500);
    return () => clearTimeout(timer);
  }, [connectWallet, isConnected, connecting, autoConnectAttempted, hasWallet]);

  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    return `IMALI-${wallet.slice(2, 10).toUpperCase()}`;
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
        localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

      if (!token) {
        setReferralData((prev) => ({
          ...prev,
          code: generateReferralCode(account),
        }));
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
        const totalReferred = info.total_referred || info.count || 0;

        setReferralData((prev) => ({
          ...prev,
          code: info.code || generateReferralCode(account),
          totalReferrals: totalReferred,
          earned: info.earned || 0,
          paid_out: info.paid_out || 0,
          pendingRewards: info.pending || 0,
          rewardPercentage: info.reward_percentage || 20,
          rewardCurrency: info.reward_currency || "USDC",
          nftTier:
            totalReferred >= 50
              ? "Legendary Referral NFT"
              : totalReferred >= 20
              ? "Gold Referral NFT"
              : totalReferred >= 5
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
    } finally {
      setLoading(false);
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

  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet();
    } catch (err) {
      console.error("Wallet connect failed:", err);
      setError(err.message || "Could not connect wallet.");
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

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setError("Please log in before applying a referral code.");
      return;
    }

    setApplyLoading(true);
    setError(null);
    setSuccess(null);
    setValidationStatus(null);

    try {
      const token =
        localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

      const validateRes = await axios.post(`${API_BASE}/api/referrals/validate`, {
        code: referralInput.trim().toUpperCase(),
      });

      if (validateRes.data.success) {
        setValidationStatus({ valid: true, message: "Referral code looks good." });

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
          setError(applyRes.data.message || "Could not apply referral code.");
        }
      }
    } catch (err) {
      console.error("Error applying referral code:", err);
      setError(
        err.response?.data?.message || "Failed to apply referral code."
      );
      setValidationStatus({ valid: false, message: "That code could not be used." });
    } finally {
      setApplyLoading(false);
    }
  };

  const claimRewards = async () => {
    if (referralData.pendingRewards <= 0) {
      setError("There are no pending rewards to claim yet.");
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
      setError("Please enter a valid wallet address.");
      return;
    }

    setClaimLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token =
        localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");

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
        setSuccess("Your reward claim was submitted.");
        fetchReferralData();
        setWalletAddress("");
        setShowWalletInput(false);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(response.data.message || "Could not submit your claim.");
      }
    } catch (err) {
      console.error("Error claiming rewards:", err);
      setError(err.response?.data?.message || "Failed to claim rewards.");
    } finally {
      setClaimLoading(false);
    }
  };

  const guestMode = isConnected && !isAuthenticated;

  // Show loading state while auto-connect is in progress
  if (connecting && !isConnected) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto mb-4 animate-spin text-4xl text-emerald-600" />
            <p className="text-gray-600">Connecting to wallet...</p>
            <p className="mt-2 text-sm text-gray-400">
              Please approve the connection in your wallet if prompted.
            </p>
            <button
              onClick={handleConnectWallet}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-600 px-6 py-2 text-emerald-600 transition hover:bg-emerald-50"
            >
              <FaSyncAlt />
              Connect Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No wallet installed - show install prompt
  if (!hasWallet && !autoConnectAttempted) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
          >
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                <FaWallet className="text-5xl text-emerald-600" />
              </div>

              <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                Start the Referral Program
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
                To begin, you'll need a Web3 wallet like MetaMask. Install one to get
                your personal referral link and start sharing right away.
              </p>

              <div className="mx-auto mb-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Get a Web3 Wallet
                </h3>

                <ol className="space-y-3 text-gray-600">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      1
                    </span>
                    <span>
                      Install <b>MetaMask</b> or another Web3 wallet browser extension.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      2
                    </span>
                    <span>
                      Create or import a wallet and fund it if needed.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      3
                    </span>
                    <span>
                      Refresh this page and approve the connection request.
                    </span>
                  </li>
                </ol>
              </div>

              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700"
              >
                <FaWallet className="text-sm" />
                Install MetaMask
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not connected but wallet exists - show connect screen with auto-connect already attempted
  if (!isConnected && hasWallet && autoConnectAttempted) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
          >
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                <FaWallet className="text-5xl text-emerald-600" />
              </div>

              <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                Start the Referral Program
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
                Connect your wallet to get your personal referral link and start sharing.
              </p>

              <div className="mx-auto mb-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  How to connect your wallet
                </h3>

                <ol className="space-y-3 text-gray-600">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      1
                    </span>
                    <span>
                      Click the <b>Connect Wallet</b> button below.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      2
                    </span>
                    <span>
                      Your wallet app or browser wallet will pop up and ask for permission.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      3
                    </span>
                    <span>
                      Approve the connection. After that, your referral link and QR code will appear.
                    </span>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleConnectWallet}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {connecting ? <FaSpinner className="animate-spin" /> : <FaWallet className="text-sm" />}
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !effectiveReferralCode) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto mb-4 animate-spin text-4xl text-emerald-600" />
            <p className="text-gray-600">Loading your referral page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-gray-500 transition hover:text-gray-900"
        >
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        {/* Wallet connection status indicator */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-emerald-700">
              Wallet Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
            </span>
          </div>
          <button
            onClick={handleConnectWallet}
            className="text-xs text-emerald-600 hover:text-emerald-800"
          >
            <FaSyncAlt className="inline mr-1" /> Switch Wallet
          </button>
        </div>

        <div className="mb-10 text-center">
          <h1 className="flex items-center justify-center gap-3 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
            <FaUserFriends className="text-emerald-600" />
            Boost With Referrals
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Share your link, invite new users, and earn rewards. As you grow in the
            program, you can unlock and level up your Referral NFT.
          </p>
        </div>

        {guestMode && (
          <div className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
            Your wallet is connected. That means your referral link is ready now.
            You can start sharing it even before completing full signup.
          </div>
        )}

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
              <h3 className="mb-2 text-lg font-bold text-gray-900">How it works</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
                <li>Your wallet is connected automatically when you visit.</li>
                <li>Share that link or QR code with friends.</li>
                <li>When they join using your link, your referral activity starts tracking.</li>
                <li>As you grow, you can earn rewards and unlock Referral NFT perks.</li>
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

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <FaRobot className="text-amber-600" />
                  Referral NFT Bot
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  NFT Program
                </span>
              </div>

              <img
                src={referralBot}
                alt="IMALI Referral Bot"
                className="mb-4 w-full rounded-xl border border-amber-200"
              />

              <div className="mb-3 rounded-xl border border-amber-200 bg-white p-3">
                <div className="mb-1 flex items-center gap-2 text-amber-700">
                  <FaMedal />
                  <span className="text-sm font-semibold">Your current NFT level</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{referralData.nftTier}</p>
              </div>

              <p className="text-sm text-gray-600">
                The Referral NFT is part of the program experience. As your referral
                network grows, you may unlock better status, extra visibility, and future perks.
              </p>

              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>• Start with a basic referral presence after connecting your wallet.</li>
                <li>• Grow referrals to move into higher NFT levels.</li>
                <li>• Higher levels can be tied to special perks, campaigns, or bonuses.</li>
                <li>• Your referral bot image represents your referral identity in the program.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-gray-900">Your Referral Link</h3>

              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-3">
                  <QRCodeCanvas
                    value={referralUrl || "https://imali-defi.com/signup"}
                    size={140}
                  />
                </div>

                <code className="break-all text-center text-xs text-emerald-700">
                  {referralUrl || "Your link will appear here"}
                </code>
              </div>

              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-l-xl border border-gray-300 bg-white p-3 text-sm text-gray-900"
                  placeholder="Connect wallet to generate your link"
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
                    "Join me on IMALI and check out this referral link:"
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

              <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-xs text-gray-600">
                <div className="mb-1 flex items-center gap-2">
                  <FaLink className="text-emerald-600" />
                  <span className="font-semibold text-gray-900">Referral Code</span>
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
                icon={FaChartLine}
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

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Claim your rewards</h3>
                  <p className="text-sm text-gray-600">
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
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : <FaGift />}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>

              {guestMode && (
                <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
                  You can share your link now. To claim rewards later, log in or finish creating your account.
                </div>
              )}

              {showWalletInput && !guestMode && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Wallet address for payout
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Enter the wallet where you want to receive your reward.
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
                <ul className="list-inside list-disc space-y-2">
                  <li>You earn {referralData.rewardPercentage}% from eligible referral activity.</li>
                  <li>Rewards are paid in {referralData.rewardCurrency}.</li>
                </ul>
                <ul className="list-inside list-disc space-y-2">
                  <li>Your wallet is automatically detected when you visit.</li>
                  <li>Full account access is used for claims and advanced tracking.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-900">Have a referral code?</h3>

              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code"
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
                Use a friend&apos;s referral code when joining so they get credit.
              </p>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm sm:flex-row">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Ready to invite friends?</h3>
                <p className="text-sm text-gray-600">
                  Share your link and start building your Referral NFT presence.
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
