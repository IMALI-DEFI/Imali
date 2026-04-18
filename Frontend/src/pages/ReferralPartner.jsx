// src/components/ReferralSystem.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
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
  FaMobile,
  FaArrowRight,
  FaEnvelope,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

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

const WalletOption = ({ name, icon, description, installUrl, mobile, onClick }) => {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (installUrl) {
      window.open(installUrl, "_blank");
    }
  };

  return (
    <a
      href={installUrl || "#"}
      onClick={handleClick}
      target={installUrl ? "_blank" : undefined}
      rel={installUrl ? "noopener noreferrer" : undefined}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:shadow-md hover:border-emerald-300"
    >
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 transition group-hover:text-emerald-600">
          {name}
          {mobile && <span className="ml-2 text-xs text-gray-500">Mobile</span>}
        </div>
        <div className="text-xs text-gray-600">{description}</div>
      </div>
      <FaArrowRight className="text-gray-400 transition group-hover:text-emerald-600" />
    </a>
  );
};

const WalletGuideModal = ({ onClose, onConnectMetaMask }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Choose Your Wallet</h2>
        <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <div className="p-4 md:p-6">
        <p className="mb-6 text-sm md:text-base text-gray-600">
          A Web3 wallet helps you get your referral link, track rewards, and claim payouts later.
        </p>

        <h3 className="mb-3 flex items-center gap-2 text-base md:text-lg font-semibold text-gray-900">
          <FaWallet className="text-emerald-600" /> Popular Wallets
        </h3>
        <div className="grid grid-cols-1 gap-3 md:gap-4">
          <WalletOption
            name="MetaMask"
            icon="🦊"
            description="Connect directly (already installed)"
            onClick={onConnectMetaMask}
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
          💡 New to crypto? MetaMask or Coinbase Wallet are the easiest places to start.
        </div>
      </div>
    </div>
  </div>
);

const SignupModal = ({ onClose, onSignup, loading, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Create Account</h2>
        <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <p className="text-xs text-gray-500">
          Use at least 8 characters with uppercase, lowercase, and a number.
        </p>

        <button
          onClick={onSignup}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-3 text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? <FaSpinner className="mx-auto animate-spin" /> : "Create Account"}
        </button>

        <p className="text-center text-xs text-gray-500">
          You can add a wallet later to claim rewards.
        </p>
      </div>
    </div>
  </div>
);

export default function ReferralSystem() {
  const navigate = useNavigate();
  const { account, isConnected, connectWallet, connecting, hasWallet } = useWallet();
  const { signup, isAuthenticated } = useAuth();

  const [referralData, setReferralData] = useState(defaultReferralData);
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [showWalletInput, setShowWalletInput] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

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
    return `${window.location.origin}/signup?ref=${encodeURIComponent(effectiveReferralCode)}`;
  }, [effectiveReferralCode]);

  const computeNftTier = (totalReferred) => {
    if (totalReferred >= 50) return "Legendary Referral NFT";
    if (totalReferred >= 20) return "Gold Referral NFT";
    if (totalReferred >= 5) return "Silver Referral NFT";
    return "Starter Referral NFT";
  };

  const clearNotices = () => {
    setError("");
    setSuccess("");
    setValidationStatus(null);
  };

  useEffect(() => {
    const tryAutoConnect = async () => {
      if (autoConnectAttempted || isConnected || connecting) return;
      setAutoConnectAttempted(true);

      try {
        await connectWallet();
      } catch (err) {
        console.log("[ReferralSystem] Auto-connect skipped:", err?.message);
      }
    };

    const timer = setTimeout(tryAutoConnect, 400);
    return () => clearTimeout(timer);
  }, [autoConnectAttempted, isConnected, connecting, connectWallet]);

  const fetchReferralData = async () => {
    if (!isConnected || !account) return;

    setLoading(true);
    clearNotices();

    try {
      if (!isAuthenticated) {
        setReferralData((prev) => ({
          ...prev,
          code: generateReferralCode(account),
          nftTier: computeNftTier(prev.totalReferrals || 0),
        }));
        return;
      }

      const [infoRes, statsRes] = await Promise.all([
        BotAPI.getReferralInfo(),
        BotAPI.getReferralStats ? BotAPI.getReferralStats() : Promise.resolve(null),
      ]);

      const info = infoRes?.data || infoRes || {};
      const stats = statsRes?.data || statsRes || {};
      const totalReferred = info.total_referred || info.count || 0;

      setReferralData({
        code: info.code || generateReferralCode(account),
        totalReferrals: totalReferred,
        level1Earnings: stats.total_rewards_earned || 0,
        level2Earnings: (stats.total_rewards_earned || 0) * 0.25,
        pendingRewards: info.pending || stats.pending_rewards || 0,
        earned: info.earned || 0,
        paid_out: info.paid_out || 0,
        rewardPercentage: info.reward_percentage || stats.reward_percentage || 20,
        rewardCurrency: info.reward_currency || "USDC",
        qualifiedReferrals: stats.qualified_referrals || 0,
        nftTier: computeNftTier(totalReferred),
      });
    } catch (err) {
      console.error("[ReferralSystem] fetchReferralData error:", err);
      setReferralData((prev) => ({
        ...prev,
        code: generateReferralCode(account),
        nftTier: computeNftTier(prev.totalReferrals || 0),
      }));
      setError("Could not load full referral data. Your link is still ready to share.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      setReferralData((prev) => ({
        ...prev,
        code: prev.code || generateReferralCode(account),
      }));
      fetchReferralData();
    }
  }, [isConnected, account, isAuthenticated]);

  const handleConnectWallet = async () => {
    clearNotices();
    try {
      await connectWallet();
      setShowWalletGuide(false);
    } catch (err) {
      setError(err?.message || "Could not connect wallet.");
    }
  };

  const handleConnectClick = () => {
    if (hasWallet) {
      handleConnectWallet();
    } else {
      setShowWalletGuide(true);
    }
  };

  const copyToClipboard = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy your referral link.");
    }
  };

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setError("Please log in before applying a referral code.");
      return;
    }

    setApplyLoading(true);
    clearNotices();

    try {
      await BotAPI.validateReferralCode(referralInput.trim().toUpperCase());
      setValidationStatus({ valid: true, message: "Referral code looks good." });

      if (!BotAPI.applyReferralCode) {
        throw new Error("Apply referral endpoint is not connected in BotAPI yet.");
      }

      const applyRes = await BotAPI.applyReferralCode(referralInput.trim().toUpperCase());

      if (applyRes?.success || applyRes?.applied || applyRes?.data?.applied) {
        setSuccess("Referral code applied successfully.");
        setReferralInput("");
        await fetchReferralData();
      } else {
        setError(applyRes?.message || "Could not apply referral code.");
      }
    } catch (err) {
      console.error("[ReferralSystem] applyReferralCode error:", err);
      setValidationStatus({ valid: false, message: "That code could not be used." });
      setError(err?.response?.data?.message || err?.message || "Failed to apply referral code.");
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

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError("Please enter a valid wallet address.");
      return;
    }

    if (!BotAPI.claimReferralRewards) {
      setError("Claim endpoint is not connected in BotAPI yet.");
      return;
    }

    setClaimLoading(true);
    clearNotices();

    try {
      const response = await BotAPI.claimReferralRewards(
        referralData.pendingRewards,
        walletAddress,
        true
      );

      if (response?.success || response?.id || response?.data?.id) {
        setSuccess("Your reward claim was submitted.");
        setWalletAddress("");
        setShowWalletInput(false);
        await fetchReferralData();
      } else {
        setError(response?.message || "Could not submit your claim.");
      }
    } catch (err) {
      console.error("[ReferralSystem] claimRewards error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to claim rewards.");
    } finally {
      setClaimLoading(false);
    }
  };

  const validateSignupPassword = () => {
    if (!signupEmail.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) {
      return "Please enter a valid email address.";
    }
    if (signupPassword.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(signupPassword)) return "Password must include an uppercase letter.";
    if (!/[a-z]/.test(signupPassword)) return "Password must include a lowercase letter.";
    if (!/[0-9]/.test(signupPassword)) return "Password must include a number.";
    if (signupPassword !== signupConfirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleEmailSignup = async () => {
    clearNotices();

    const validationError = validateSignupPassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        tier: "starter",
        strategy: "ai_weighted",
        referral_code: effectiveReferralCode || undefined,
      });

      if (!result?.success) {
        setError(result?.error || "Signup failed.");
        return;
      }

      setShowSignupForm(false);
      setGuestMode(false);
      setSuccess("Account created successfully! You can now continue to billing.");
      navigate("/billing", {
        replace: true,
        state: {
          email: signupEmail.trim().toLowerCase(),
          tier: "starter",
          strategy: "ai_weighted",
          fromSignup: true,
          showWelcome: true,
        },
      });
    } catch (err) {
      setError(err?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const isGuestView = guestMode && !isConnected && !isAuthenticated;
  const walletOnlyMode = isConnected && !isAuthenticated;

  if (connecting && !isConnected) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <FaSpinner className="mb-4 animate-spin text-4xl text-emerald-600" />
          <p className="text-gray-600 text-center">Connecting to wallet...</p>
          <p className="mt-2 text-sm text-gray-400 text-center">
            Please approve the connection in your wallet if prompted.
          </p>
        </div>
      </div>
    );
  }

  if (!hasWallet && !guestMode) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-12">
          <Link to="/" className="mb-4 md:mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="rounded-2xl md:rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50 p-6 md:p-8 shadow-sm">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 md:mb-6 inline-flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-emerald-100">
                <FaWallet className="text-4xl md:text-5xl text-emerald-600" />
              </div>

              <h1 className="mb-3 md:mb-4 text-3xl md:text-5xl font-bold text-gray-900">
                Start the Referral Program
              </h1>

              <p className="mx-auto mb-6 md:mb-8 max-w-2xl text-base md:text-lg text-gray-600">
                Choose how you want to participate. You can use a wallet, sign up with email, or browse first.
              </p>

              <div className="mb-6 md:mb-8 grid grid-cols-1 gap-4 md:gap-6">
                <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 md:p-6 text-left">
                  <div className="mb-2 md:mb-3 text-3xl md:text-4xl">🦊</div>
                  <h3 className="mb-2 text-lg md:text-xl font-bold text-gray-900">Use a Web3 Wallet</h3>
                  <p className="mb-3 md:mb-4 text-sm md:text-base text-gray-600">
                    Best for full referral rewards and direct wallet payouts.
                  </p>
                  <ul className="mb-4 space-y-1 text-sm md:text-base text-gray-600">
                    <li>✓ Get referral link instantly</li>
                    <li>✓ Claim rewards to your wallet</li>
                    <li>✓ Track Referral NFT progress</li>
                  </ul>
                  <button
                    onClick={() => setShowWalletGuide(true)}
                    className="w-full rounded-lg bg-emerald-600 py-2 md:py-3 text-white transition hover:bg-emerald-700"
                  >
                    Choose a Wallet →
                  </button>
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 md:p-6 text-left">
                  <div className="mb-2 md:mb-3 text-3xl md:text-4xl">✉️</div>
                  <h3 className="mb-2 text-lg md:text-xl font-bold text-gray-900">Use Email Only</h3>
                  <p className="mb-3 md:mb-4 text-sm md:text-base text-gray-600">
                    Good for beginners. You can add a wallet later.
                  </p>
                  <ul className="mb-4 space-y-1 text-sm md:text-base text-gray-600">
                    <li>✓ Get referral link</li>
                    <li>✓ Track referrals</li>
                    <li>✓ Upgrade later</li>
                  </ul>
                  <button
                    onClick={() => setShowSignupForm(true)}
                    className="w-full rounded-lg bg-gray-600 py-2 md:py-3 text-white transition hover:bg-gray-700"
                  >
                    Sign up with Email →
                  </button>
                </div>
              </div>

              <button
                onClick={() => setGuestMode(true)}
                className="rounded-lg bg-gray-100 px-5 md:px-6 py-2 md:py-3 text-gray-700 transition hover:bg-gray-200"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>

        {showWalletGuide && (
          <WalletGuideModal 
            onClose={() => setShowWalletGuide(false)} 
            onConnectMetaMask={handleConnectWallet}
          />
        )}
        {showSignupForm && (
          <SignupModal
            onClose={() => setShowSignupForm(false)}
            onSignup={handleEmailSignup}
            loading={loading}
            email={signupEmail}
            setEmail={setSignupEmail}
            password={signupPassword}
            setPassword={setSignupPassword}
            confirmPassword={signupConfirmPassword}
            setConfirmPassword={setSignupConfirmPassword}
          />
        )}
      </div>
    );
  }

  if (!isConnected && hasWallet && !guestMode) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-12">
          <Link to="/" className="mb-4 md:mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="rounded-2xl md:rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50 p-6 md:p-8 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 md:mb-6 inline-flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-emerald-100">
                <FaWallet className="text-4xl md:text-5xl text-emerald-600" />
              </div>

              <h1 className="mb-3 md:mb-4 text-3xl md:text-5xl font-bold text-gray-900">
                Connect Your Wallet
              </h1>

              <p className="mx-auto mb-6 md:mb-8 max-w-2xl text-base md:text-lg text-gray-600">
                Connect your wallet to get your personal referral link and start sharing right away.
              </p>

              <button
                onClick={handleConnectClick}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 md:px-8 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {connecting ? <FaSpinner className="animate-spin" /> : <FaWallet className="text-sm" />}
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>

              <div className="mt-4 md:mt-6">
                <button
                  onClick={() => setShowWalletGuide(true)}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Need help choosing a wallet?
                </button>
              </div>

              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                <button
                  onClick={() => setGuestMode(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Continue as Guest instead
                </button>
              </div>
            </div>
          </div>
        </div>

        {showWalletGuide && (
          <WalletGuideModal 
            onClose={() => setShowWalletGuide(false)} 
            onConnectMetaMask={handleConnectWallet}
          />
        )}
      </div>
    );
  }

  if (isGuestView) {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-12">
          <Link to="/" className="mb-4 md:mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="mb-4 md:mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 text-sm md:text-base">
            You are browsing in guest mode. Create an account or connect a wallet to get your referral link and earn rewards.
          </div>

          <div className="py-8 md:py-12 text-center">
            <FaUserFriends className="mx-auto mb-4 text-5xl md:text-6xl text-gray-300" />
            <h2 className="mb-2 text-xl md:text-2xl font-bold text-gray-900">See the Referral Program</h2>
            <p className="mb-4 md:mb-6 text-sm md:text-base text-gray-600">
              Sign up or connect a wallet to activate your referral dashboard.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 px-4">
              <button
                onClick={() => setShowSignupForm(true)}
                className="rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700"
              >
                Sign Up with Email
              </button>
              <button
                onClick={() => setGuestMode(false)}
                className="rounded-lg border border-emerald-600 px-6 py-3 text-emerald-600 hover:bg-emerald-50"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>

        {showSignupForm && (
          <SignupModal
            onClose={() => setShowSignupForm(false)}
            onSignup={handleEmailSignup}
            loading={loading}
            email={signupEmail}
            setEmail={setSignupEmail}
            password={signupPassword}
            setPassword={setSignupPassword}
            confirmPassword={signupConfirmPassword}
            setConfirmPassword={setSignupConfirmPassword}
          />
        )}
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
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-12">
        <Link to="/" className="mb-4 md:mb-6 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        {isConnected && (
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 md:px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs md:text-sm text-emerald-700 break-all">
                Wallet: {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
            </div>
            <button
              onClick={handleConnectClick}
              className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            >
              <FaSyncAlt className="inline" />
              Switch
            </button>
          </div>
        )}

        <div className="mb-6 md:mb-10 text-center">
          <h1 className="flex items-center justify-center gap-2 md:gap-3 text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <FaUserFriends className="text-emerald-600" />
            Boost With Referrals
          </h1>
          <p className="mx-auto mt-2 md:mt-3 max-w-2xl text-sm md:text-base text-gray-600">
            Share your link, invite new users, and grow your Referral NFT as your network expands.
          </p>
        </div>

        {walletOnlyMode && (
          <div className="mb-4 md:mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 md:p-4 text-sm text-cyan-800">
            Your wallet is connected. Your referral link is ready now, even before full signup.
          </div>
        )}

        {success && (
          <div className="mb-4 md:mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 md:p-4 text-sm text-green-700">
            <FaCheckCircle />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 md:mb-6 rounded-xl border border-red-200 bg-red-50 p-3 md:p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-5">
          <aside className="space-y-4 md:space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
              <img
                src={referralImg}
                alt="IMALI Referral overview"
                className="mb-3 md:mb-4 w-full rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <h3 className="mb-2 text-base md:text-lg font-bold text-gray-900">How it works</h3>
              <ol className="list-inside list-decimal space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                <li>Connect your wallet or create an account.</li>
                <li>Copy your referral link or QR code.</li>
                <li>Share it with friends.</li>
                <li>Track rewards and level up your Referral NFT as referrals grow.</li>
              </ol>

              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 md:mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-3 md:px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <FaTelegram className="mr-2" /> Start via Telegram
              </a>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5 shadow-sm">
              <div className="mb-2 md:mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base md:text-lg font-bold text-gray-900">
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
                className="mb-3 md:mb-4 w-full rounded-xl border border-amber-200"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              <div className="mb-2 md:mb-3 rounded-xl border border-amber-200 bg-white p-3">
                <div className="mb-1 flex items-center gap-2 text-amber-700">
                  <FaMedal />
                  <span className="text-xs md:text-sm font-semibold">Your current NFT level</span>
                </div>
                <p className="text-base md:text-lg font-bold text-gray-900">{referralData.nftTier}</p>
              </div>

              <p className="text-xs md:text-sm text-gray-600">
                As your referral activity grows, your Referral NFT status can grow too.
              </p>

              <ul className="mt-2 md:mt-3 space-y-1 md:space-y-2 text-xs md:text-sm text-gray-700">
                <li>• Start with a beginner referral status.</li>
                <li>• Unlock stronger NFT tiers with more referrals.</li>
                <li>• Higher levels may bring future perks and bonus campaigns.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:p-5 shadow-sm">
              <h3 className="mb-2 md:mb-3 text-base md:text-lg font-bold text-gray-900">Your Referral Link</h3>

              <div className="mb-3 md:mb-4 flex flex-col items-center gap-2 md:gap-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-2 md:p-3">
                  <QRCodeCanvas
                    value={referralUrl || "https://imali-defi.com/signup"}
                    size={120}
                    className="w-[120px] h-[120px] md:w-[140px] md:h-[140px]"
                  />
                </div>

                <code className="break-all text-center text-xs text-emerald-700">
                  {referralUrl || "Your link will appear here"}
                </code>
              </div>

              <div className="flex flex-col sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-t-xl sm:rounded-l-xl sm:rounded-r-none border border-gray-300 bg-white p-2 md:p-3 text-sm text-gray-900"
                  placeholder="Your referral link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`flex items-center justify-center gap-2 rounded-b-xl sm:rounded-r-xl sm:rounded-l-none px-4 py-2 md:py-3 transition ${
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
                className="mt-2 md:mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-500 py-2 text-white transition hover:bg-blue-600"
                disabled={!referralUrl}
              >
                <FaTwitter className="mr-2" /> Share on X/Twitter
              </button>

              <div className="mt-2 md:mt-3 rounded-xl border border-emerald-200 bg-white p-2 md:p-3 text-xs text-gray-600">
                <div className="mb-1 flex items-center gap-2">
                  <FaLink className="text-emerald-600" />
                  <span className="font-semibold text-gray-900">Referral Code</span>
                </div>
                <span className="font-mono text-xs break-all">{effectiveReferralCode || "Not generated yet"}</span>
              </div>
            </div>
          </aside>

          <section className="space-y-4 md:space-y-6 lg:col-span-3">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Tile title="Referrals" value={referralData.totalReferrals} icon={FaUserFriends} accent="emerald" />
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

            <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">Claim your rewards</h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    Pending: {Number(referralData.pendingRewards || 0).toFixed(2)}{" "}
                    {referralData.rewardCurrency}
                  </p>
                </div>

                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0 || claimLoading || walletOnlyMode}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 md:px-6 py-2 md:py-3 font-semibold transition ${
                    referralData.pendingRewards > 0 && !claimLoading && !walletOnlyMode
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : <FaGift />}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>

              {walletOnlyMode && (
                <div className="mt-3 md:mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 md:p-4 text-xs md:text-sm text-cyan-800">
                  You can share your link now. Finish account signup later to claim rewards.
                </div>
              )}

              {showWalletInput && !walletOnlyMode && (
                <div className="mt-3 md:mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 md:p-4">
                  <label className="mb-2 block text-xs md:text-sm font-medium text-gray-900">
                    Wallet address for payout
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-xl border border-gray-300 bg-white p-2 md:p-3 text-sm text-gray-900"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Enter the wallet where you want to receive your reward.
                  </p>
                </div>
              )}

              <div className="mt-4 md:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm text-gray-600">
                <ul className="list-inside list-disc space-y-1 md:space-y-2">
                  <li>You earn {referralData.rewardPercentage}% from eligible referral activity.</li>
                  <li>Rewards are paid in {referralData.rewardCurrency}.</li>
                </ul>
                <ul className="list-inside list-disc space-y-1 md:space-y-2">
                  <li>Your wallet can generate your referral link right away.</li>
                  <li>Full account access unlocks claims and deeper tracking.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-6 shadow-sm">
              <h3 className="mb-2 md:mb-3 font-semibold text-gray-900">Have a referral code?</h3>

              <div className="flex flex-col sm:flex-row">
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-t-xl sm:rounded-l-xl sm:rounded-r-none border border-gray-300 bg-white p-2 md:p-3 text-sm text-gray-900"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`rounded-b-xl sm:rounded-r-xl sm:rounded-l-none px-4 md:px-6 py-2 md:py-3 transition ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              </div>

              {validationStatus && (
                <p className={`mt-2 text-xs ${validationStatus.valid ? "text-green-600" : "text-red-600"}`}>
                  {validationStatus.message}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Use a friend's referral code when joining so they get credit.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 md:p-6 shadow-sm">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">Ready to invite friends?</h3>
                <p className="text-xs md:text-sm text-gray-600">
                  Share your link and start building your Referral NFT presence.
                </p>
              </div>

              <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
                <Link
                  to="/pricing"
                  className="flex-1 sm:flex-none text-center rounded-xl bg-indigo-600 px-4 md:px-5 py-2 md:py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  View Pricing
                </Link>
                {!isAuthenticated && (
                  <Link
                    to={effectiveReferralCode ? `/signup?ref=${encodeURIComponent(effectiveReferralCode)}` : "/signup"}
                    className="flex-1 sm:flex-none text-center rounded-xl bg-emerald-600 px-4 md:px-5 py-2 md:py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Finish Signup
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {showWalletGuide && (
        <WalletGuideModal 
          onClose={() => setShowWalletGuide(false)} 
          onConnectMetaMask={handleConnectWallet}
        />
      )}
      {showSignupForm && (
        <SignupModal
          onClose={() => setShowSignupForm(false)}
          onSignup={handleEmailSignup}
          loading={loading}
          email={signupEmail}
          setEmail={setSignupEmail}
          password={signupPassword}
          setPassword={setSignupPassword}
          confirmPassword={signupConfirmPassword}
          setConfirmPassword={setSignupConfirmPassword}
        />
      )}
    </div>
  );
}