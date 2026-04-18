// src/components/ReferralSystem.jsx
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
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
  FaQrcode,
  FaInfoCircle,
  FaEnvelope,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
  FaSignOutAlt,
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

// Wallet guide modal
const WalletGuideModal = ({ onClose, onConnectMetaMask }) => (
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
          💡 After installing, refresh this page and connect your new wallet.
        </div>
      </div>
    </div>
  </div>
);

// Email Signup Modal
const EmailSignupModal = ({ onClose, onSignup, loading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const validatePassword = () => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must include a number.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validatePassword();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError("");
    await onSignup(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Sign Up with Email</h2>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <p className="text-xs text-gray-500">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>

          {(localError || error) && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="mx-auto animate-spin" /> : "Create Account"}
          </button>

          <p className="text-center text-xs text-gray-500">
            You can add a wallet later to claim rewards.
          </p>
        </form>
      </div>
    </div>
  );
};

// QR Code Info Tooltip
const QrInfoTooltip = () => (
  <div className="group relative inline-block ml-2">
    <FaInfoCircle className="text-gray-400 cursor-help hover:text-emerald-600" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 rounded-lg bg-gray-900 p-3 text-xs text-white group-hover:block z-10">
      <p className="font-semibold mb-1">How to use QR code:</p>
      <ul className="space-y-1">
        <li>1. Open your phone camera</li>
        <li>2. Scan the QR code</li>
        <li>3. Opens signup with your code pre-filled</li>
        <li>4. Friend signs up using email or wallet</li>
      </ul>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
    </div>
  </div>
);

const ReferralSystem = () => {
  const navigate = useNavigate();
  const { 
    account, 
    isConnected, 
    connectWallet, 
    disconnectWallet,
    connecting, 
    hasWallet,
    error: walletError 
  } = useWallet();
  const { signup, isAuthenticated, user, logout } = useAuth();

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
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [localWalletError, setLocalWalletError] = useState("");

  // Generate referral code from wallet address
  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    return `IMALI-${wallet.slice(2, 10).toUpperCase()}`;
  };

  const referralCode = referralData.code || (account ? generateReferralCode(account) : "");
  const referralUrl = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : "";

  // Fetch referral data from API
  const fetchReferralData = async () => {
    if (!isConnected && !isAuthenticated) return;

    try {
      if (isAuthenticated && user) {
        setReferralData({
          code: user.referral_code || (account ? generateReferralCode(account) : ""),
          totalReferrals: user.referral_count || 0,
          level1Earnings: user.level1_earnings || 0,
          level2Earnings: user.level2_earnings || 0,
          pendingRewards: user.pending_rewards || 0,
        });
      } else if (account) {
        setReferralData({
          code: generateReferralCode(account),
          totalReferrals: 0,
          level1Earnings: 0,
          level2Earnings: 0,
          pendingRewards: 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [account, isConnected, isAuthenticated, user]);

  // Clear wallet error after 5 seconds
  useEffect(() => {
    if (walletError || localWalletError) {
      const timer = setTimeout(() => {
        setLocalWalletError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [walletError, localWalletError]);

  const handleConnectClick = async () => {
    setLocalWalletError("");
    if (!hasWallet) {
      setShowWalletGuide(true);
      return;
    }
    
    try {
      await connectWallet();
    } catch (err) {
      setLocalWalletError(err?.message || "Failed to connect wallet. Please make sure MetaMask is installed and unlocked.");
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const handleConnectMetaMask = async () => {
    setShowWalletGuide(false);
    try {
      await connectWallet();
    } catch (err) {
      setLocalWalletError(err?.message || "Failed to connect MetaMask.");
    }
  };

  const copyToClipboard = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setApplyMessage({ type: "error", text: "Failed to copy link." });
    }
  };

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setApplyMessage({ type: "error", text: "Please sign up or log in to apply a referral code." });
      return;
    }

    setApplyLoading(true);
    setApplyMessage(null);

    try {
      localStorage.setItem("pending_referral_code", referralInput.trim().toUpperCase());
      setApplyMessage({ 
        type: "success", 
        text: `Referral code ${referralInput.trim().toUpperCase()} saved! It will be applied to your account.` 
      });
      setReferralInput("");
      setTimeout(() => fetchReferralData(), 1000);
    } catch (err) {
      setApplyMessage({ type: "error", text: err.message || "Failed to apply referral code." });
    } finally {
      setApplyLoading(false);
    }
  };

  const claimRewards = async () => {
    if (referralData.pendingRewards <= 0) {
      setApplyMessage({ type: "error", text: "No pending rewards to claim." });
      return;
    }

    if (!isAuthenticated) {
      setApplyMessage({ type: "error", text: "Please log in to claim rewards." });
      return;
    }

    setClaimLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Claimed ${referralData.pendingRewards} IMALI rewards!`);
      setReferralData(prev => ({ ...prev, pendingRewards: 0 }));
    } catch (err) {
      setApplyMessage({ type: "error", text: "Failed to claim rewards. Please try again." });
    } finally {
      setClaimLoading(false);
    }
  };

  const handleEmailSignup = async (email, password) => {
    setSignupLoading(true);
    setSignupError("");

    try {
      const pendingRefCode = localStorage.getItem("pending_referral_code");
      
      const result = await signup({
        email: email.toLowerCase(),
        password: password,
        tier: "starter",
        strategy: "ai_weighted",
        referral_code: pendingRefCode || referralCode || undefined,
      });

      if (!result?.success) {
        setSignupError(result?.error || "Signup failed.");
        return;
      }

      localStorage.removeItem("pending_referral_code");
      setShowEmailSignup(false);
      navigate("/billing", {
        replace: true,
        state: {
          email: email.toLowerCase(),
          fromSignup: true,
          showWelcome: true,
        },
      });
    } catch (err) {
      setSignupError(err?.message || "Signup failed. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Loading state while connecting
  if (connecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to wallet...</p>
          <p className="text-sm text-gray-400 mt-2">Please approve in your wallet if prompted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <FaUserFriends className="text-emerald-600" /> Boost With Referrals
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
            Share your link, level up rewards, and unlock perks. Earnings pay out in USDC/IMALI.
          </p>
        </div>

        {/* Wallet/Account Status */}
        {(isConnected || isAuthenticated) && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {isConnected && (
                  <span className="text-sm text-emerald-700">
                    Wallet: {account?.slice(0, 6)}...{account?.slice(-4)}
                  </span>
                )}
                {isAuthenticated && (
                  <span className="text-sm text-emerald-700">
                    {isConnected && " • "}Account: {user?.email?.split("@")[0]}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {isConnected && (
                  <button
                    onClick={handleDisconnectWallet}
                    className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <FaSignOutAlt /> Disconnect Wallet
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connect Wallet / Sign Up Section */}
        {!isConnected && !isAuthenticated && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
            <div className="text-center sm:text-left">
              <p className="text-gray-700 font-medium">Get your referral link</p>
              <p className="text-sm text-gray-500 mb-4">Connect a wallet or sign up with email</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConnectClick}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <FaWallet /> Connect Wallet
              </button>
              <button
                onClick={() => setShowEmailSignup(true)}
                className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <FaEnvelope /> Sign Up with Email
              </button>
            </div>
            {(walletError || localWalletError) && (
              <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {walletError || localWalletError}
              </div>
            )}
          </div>
        )}

        {/* Apply message */}
        {applyMessage && (
          <div className={`mb-4 rounded-xl p-3 flex items-center gap-2 ${
            applyMessage.type === "success" 
              ? "border-green-200 bg-green-50 text-green-700" 
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {applyMessage.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
            {applyMessage.text}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* LEFT COLUMN */}
          <aside className="lg:col-span-2 space-y-6">
            {/* Explainer card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <img src={referralImg} alt="IMALI Referral overview" className="w-full rounded-xl mb-4" />
              <h3 className="text-lg font-bold mb-2 text-gray-900">How it works</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                <li>Connect your wallet or sign up with email.</li>
                <li>Share your link or QR code with friends.</li>
                <li>Friends sign up using your link.</li>
                <li>You earn rewards. Track and claim here.</li>
              </ol>
              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm"
              >
                <FaTelegram className="mr-2" /> Join Telegram
              </a>
            </div>

            {/* Referral Bot card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                  <FaRobot className="text-amber-600" /> Your Referral Bot
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  Value Accrual
                </span>
              </div>
              <img src={referralBot} alt="IMALI Referral Bot" className="w-full rounded-xl border border-amber-200 mb-4" />
              <p className="text-sm text-gray-700">
                As the <b>IMALI bot</b> grows, your Referral Bot gains utility and long-term value.
              </p>
              <ul className="mt-3 text-sm space-y-2 text-gray-700">
                <li>• <b>Tier Boosts:</b> Higher tiers increase your rev-share.</li>
                <li>• <b>Volume Rewards:</b> Trading volume unlocks bonuses.</li>
                <li>• <b>Staking Synergy:</b> Stake IMALI to boost payouts.</li>
              </ul>
            </div>

            {/* QR + Link */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <h3 className="text-lg font-bold mb-3 text-gray-900 flex items-center gap-2">
                <FaQrcode className="text-emerald-600" /> Your Referral Link
                <QrInfoTooltip />
              </h3>
              
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 relative">
                  <QRCodeCanvas value={referralUrl || "https://imali-defi.com/signup"} size={120} />
                  {!referralUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-xl">
                      <span className="text-xs text-gray-500">Connect</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <code className="text-xs break-all text-emerald-700">
                    {referralUrl || "Connect to generate link"}
                  </code>
                  <p className="text-xs text-gray-500 mt-1">
                    Scan with phone → Opens signup with your code
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 p-3 rounded-xl bg-white border border-gray-300 text-sm text-gray-900"
                  placeholder="Connect to generate"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`px-4 rounded-xl flex items-center justify-center gap-2 ${
                    referralUrl
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <FaCopy /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent("Join me on IMALI — crypto trading made simple:");
                  const url = encodeURIComponent(referralUrl);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                }}
                className="mt-3 w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center justify-center gap-2 text-sm"
                disabled={!referralUrl}
              >
                <FaShareAlt /> Share on X/Twitter
              </button>

              <div className="mt-3 p-2 bg-white rounded-lg text-center">
                <p className="text-xs text-gray-600">
                  Your code: <span className="font-mono font-bold text-emerald-700">{referralCode || "—"}</span>
                </p>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN */}
          <section className="lg:col-span-3 space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Tile title="Referrals" value={referralData.totalReferrals} icon={FaUserFriends} accent="emerald" />
              <Tile title="Level 1" value={`${referralData.level1Earnings.toFixed(2)} IMALI`} icon={FaCoins} accent="yellow" />
              <Tile title="Level 2" value={`${referralData.level2Earnings.toFixed(2)} IMALI`} icon={FaCoins} accent="amber" />
              <Tile title="Pending" value={`${referralData.pendingRewards.toFixed(2)} IMALI`} icon={FaChartLine} accent="violet" />
            </div>

            {/* Claim rewards */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Claim your rewards</h3>
                  <p className="text-sm text-gray-600">Payouts in USDC or IMALI. Requires connected wallet.</p>
                </div>
                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0 || claimLoading}
                  className={`px-6 py-3 rounded-2xl font-semibold ${
                    referralData.pendingRewards > 0 && !claimLoading
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : "Claim Rewards"}
                </button>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                <ul className="space-y-2 list-disc list-inside text-gray-700">
                  <li>20% referral share on signups from your link.</li>
                  <li>Paid in USDC or IMALI tokens.</li>
                </ul>
                <ul className="space-y-2 list-disc list-inside text-gray-700">
                  <li>Rewards unlock after friend completes signup.</li>
                  <li>Track live stats in your dashboard.</li>
                </ul>
              </div>
            </div>

            {/* Apply referral code */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <h3 className="font-semibold mb-3 text-gray-900">Have a referral code?</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter referral code (e.g., IMALI-XXXXXXX)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 p-3 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`px-6 py-3 rounded-xl ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply Code"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Enter a friend's code to give them credit when you sign up.
              </p>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6">
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-gray-900">Ready to start earning?</h3>
                <p className="text-sm text-gray-600 mt-1">Choose how you want to join.</p>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                {!isConnected && (
                  <button
                    onClick={handleConnectClick}
                    className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <FaWallet /> Connect Wallet
                  </button>
                )}
                {!isAuthenticated && (
                  <button
                    onClick={() => setShowEmailSignup(true)}
                    className="flex-1 px-5 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <FaEnvelope /> Sign Up with Email
                  </button>
                )}
                {(isConnected || isAuthenticated) && (
                  <Link
                    to="/pricing"
                    className="flex-1 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-center"
                  >
                    View Pricing →
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {showWalletGuide && (
        <WalletGuideModal 
          onClose={() => setShowWalletGuide(false)} 
          onConnectMetaMask={handleConnectMetaMask}
        />
      )}
      {showEmailSignup && (
        <EmailSignupModal
          onClose={() => setShowEmailSignup(false)}
          onSignup={handleEmailSignup}
          loading={signupLoading}
          error={signupError}
        />
      )}
    </div>
  );
};

export default ReferralSystem;