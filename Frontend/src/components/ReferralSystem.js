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
  FaGooglePlay,
  FaApple,
  FaChrome,
  FaFirefox,
  FaMobile,
  FaQuestionCircle,
  FaEnvelope,
  FaArrowRight,
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
  const [showWalletGuide, setShowWalletGuide] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  // Check authentication status
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
  }, []);

  // Auto-connect wallet on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (isConnected || connecting || autoConnectAttempted) return;
      
      if (!hasWallet) {
        setAutoConnectAttempted(true);
        return;
      }

      setAutoConnectAttempted(true);
      
      try {
        await connectWallet();
        console.log("[ReferralSystem] Auto-connect successful");
      } catch (err) {
        console.log("[ReferralSystem] Auto-connect failed:", err.message);
      }
    };

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

  const handleEmailSignup = async () => {
    if (!signupEmail || !signupPassword) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/signup`, {
        email: signupEmail,
        password: signupPassword,
        tier: "starter",
        referral_code: effectiveReferralCode,
      });

      if (response.data.success) {
        const { token } = response.data;
        localStorage.setItem("auth_token", token);
        setIsAuthenticated(true);
        setShowSignupForm(false);
        setSuccess("Account created successfully! You can now participate in referrals.");
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const isGuestMode = guestMode && !isConnected && !isAuthenticated;
  const isWalletConnected = isConnected && !isAuthenticated;

  // Wallet Guide Modal
  const WalletGuideModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Choose Your Wallet</h2>
          <button onClick={() => setShowWalletGuide(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            A Web3 wallet is your gateway to the decentralized web. Choose one below to get started:
          </p>

          {/* Browser Extensions */}
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FaChrome className="text-blue-500" /> Browser Extensions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <WalletOption
              name="MetaMask"
              icon="🦊"
              description="The most popular Web3 wallet"
              installUrl="https://metamask.io/download/"
              color="orange"
            />
            <WalletOption
              name="Coinbase Wallet"
              icon="💰"
              description="Easy to use, great for beginners"
              installUrl="https://www.coinbase.com/wallet"
              color="blue"
            />
            <WalletOption
              name="Rabby Wallet"
              icon="🐰"
              description="Advanced features for DeFi"
              installUrl="https://rabby.io/"
              color="purple"
            />
            <WalletOption
              name="Trust Wallet"
              icon="🔒"
              description="Multi-chain support"
              installUrl="https://trustwallet.com/"
              color="green"
            />
          </div>

          {/* Mobile Wallets */}
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FaMobile className="text-green-500" /> Mobile Wallets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <WalletOption
              name="MetaMask Mobile"
              icon="🦊"
              description="iOS & Android app"
              installUrl="https://metamask.io/download/"
              color="orange"
              mobile
            />
            <WalletOption
              name="Trust Wallet"
              icon="🔒"
              description="Binance's official wallet"
              installUrl="https://trustwallet.com/"
              color="green"
              mobile
            />
            <WalletOption
              name="Rainbow"
              icon="🌈"
              description="Beautiful iOS wallet"
              installUrl="https://rainbow.me/"
              color="purple"
              mobile
            />
            <WalletOption
              name="Coinbase Wallet"
              icon="💰"
              description="iOS & Android"
              installUrl="https://www.coinbase.com/wallet"
              color="blue"
              mobile
            />
          </div>

          {/* Hardware Wallets */}
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <FaMedal className="text-yellow-500" /> Hardware Wallets (Most Secure)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WalletOption
              name="Ledger"
              icon="🔐"
              description="Industry standard hardware wallet"
              installUrl="https://www.ledger.com/"
              color="red"
            />
            <WalletOption
              name="Trezor"
              icon="🔒"
              description="Secure and open-source"
              installUrl="https://trezor.io/"
              color="gray"
            />
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-800">
              💡 <strong>New to crypto?</strong> Start with MetaMask - it's the most widely used and has great tutorials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const WalletOption = ({ name, icon, description, installUrl, color, mobile }) => (
    <a
      href={installUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 border rounded-xl hover:shadow-md transition-all group"
    >
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold group-hover:text-emerald-600 transition">
          {name}
          {mobile && <span className="text-xs ml-2 text-gray-400">Mobile</span>}
        </div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <FaArrowRight className="text-gray-400 group-hover:text-emerald-600 transition" />
    </a>
  );

  // No wallet installed - show comprehensive options
  if (!hasWallet && !autoConnectAttempted && !guestMode) {
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
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
                <FaWallet className="text-5xl text-emerald-600" />
              </div>

              <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                Start the Referral Program
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
                Choose how you want to participate. Get your personal referral link and start earning rewards.
              </p>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Option 1: Install Wallet */}
                <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 text-left">
                  <div className="text-4xl mb-3">🦊</div>
                  <h3 className="text-xl font-bold mb-2">Use a Web3 Wallet</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Get the full experience with a crypto wallet. Best for earning and claiming rewards.
                  </p>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1">
                    <li>✓ Earn referral rewards</li>
                    <li>✓ Claim directly to your wallet</li>
                    <li>✓ Track NFT progress</li>
                  </ul>
                  <button
                    onClick={() => setShowWalletGuide(true)}
                    className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition"
                  >
                    Choose a Wallet →
                  </button>
                </div>

                {/* Option 2: Email Signup */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 text-left">
                  <div className="text-4xl mb-3">✉️</div>
                  <h3 className="text-xl font-bold mb-2">Use Email Only</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Start with just an email address. Perfect for beginners.
                  </p>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1">
                    <li>✓ Get referral link instantly</li>
                    <li>✓ Track referrals</li>
                    <li>✓ Add wallet later for claims</li>
                  </ul>
                  <button
                    onClick={() => setShowSignupForm(true)}
                    className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
                  >
                    Sign up with Email →
                  </button>
                </div>

                {/* Option 3: Guest Mode */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 text-left md:col-span-2">
                  <div className="text-4xl mb-3">👀</div>
                  <h3 className="text-xl font-bold mb-2">Just Looking</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    Browse the referral program without creating an account.
                  </p>
                  <button
                    onClick={() => setGuestMode(true)}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    Continue as Guest →
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Guide Modal */}
        {showWalletGuide && <WalletGuideModal />}

        {/* Email Signup Modal */}
        {showSignupForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Create Account</h2>
                <button onClick={() => setShowSignupForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>
                <button
                  onClick={handleEmailSignup}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? <FaSpinner className="animate-spin mx-auto" /> : "Create Account"}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  You can add a wallet later to claim rewards
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Guest Mode View
  if (isGuestMode) {
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-yellow-800 flex items-center gap-2">
              👋 You're in guest mode. <button onClick={() => setGuestMode(false)} className="underline font-semibold">Create an account</button> or{' '}
              <button onClick={() => setShowWalletGuide(true)} className="underline font-semibold">connect a wallet</button> to get your personal referral link and earn rewards!
            </p>
          </div>

          <div className="text-center py-12">
            <FaUserFriends className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">See the Referral Program</h2>
            <p className="text-gray-600 mb-6">
              Create an account or connect a wallet to get your referral link and start earning.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowSignupForm(true)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
              >
                Sign Up
              </button>
              <button
                onClick={() => setShowWalletGuide(true)}
                className="border border-emerald-600 text-emerald-600 px-6 py-2 rounded-lg hover:bg-emerald-50"
              >
                Connect Wallet
              </button>
            </div>
          </div>

          {/* Show limited preview content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 opacity-50">
            {/* Preview of referral content - blurred/disabled */}
            <div className="lg:col-span-5 text-center text-gray-400">
              <p>Sign up to see your referral dashboard</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rest of your existing component (connecting, loading, main view)
  // ... (keep your existing code from here)
  
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

  // Not connected but wallet exists - show connect screen
  if (!isConnected && hasWallet && autoConnectAttempted && !guestMode) {
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
                Connect Your Wallet
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
                Connect your Web3 wallet to get your personal referral link and start earning rewards.
              </p>

              <button
                onClick={handleConnectWallet}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {connecting ? <FaSpinner className="animate-spin" /> : <FaWallet className="text-sm" />}
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>

              <div className="mt-6">
                <button
                  onClick={() => setShowWalletGuide(true)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm underline"
                >
                  Don't have a wallet? Learn more →
                </button>
              </div>
            </div>
          </div>
        </div>

        {showWalletGuide && <WalletGuideModal />}
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

  // Main authenticated view
  const mainGuestMode = isConnected && !isAuthenticated;

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

        {mainGuestMode && (
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
                onError={(e) => { e.target.style.display = 'none'; }}
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
                onError={(e) => { e.target.style.display = 'none'; }}
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
                  disabled={referralData.pendingRewards <= 0 || claimLoading || mainGuestMode}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition ${
                    referralData.pendingRewards > 0 && !claimLoading && !mainGuestMode
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : <FaGift />}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>

              {mainGuestMode && (
                <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
                  You can share your link now. To claim rewards later, log in or finish creating your account.
                </div>
              )}

              {showWalletInput && !mainGuestMode && (
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
