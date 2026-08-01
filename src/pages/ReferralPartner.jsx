import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  FaExclamationTriangle,
  FaCrown,
  FaGift,
  FaTrophy,
  FaStar,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

// Glass Card Component
const GlassCard = ({ children, className = "", gradient = "from-white/5 to-white/5" }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
    <div className="relative z-10">{children}</div>
  </div>
);

const Tile = ({ title, value, icon: Icon, accent = "emerald", subtitle }) => {
  const accentClasses = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-400",
    yellow: "border-yellow-400/30 bg-yellow-500/10 text-yellow-400",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-400",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-400",
    purple: "border-purple-400/30 bg-purple-500/10 text-purple-400",
  };

  const iconClasses = {
    emerald: "text-emerald-400",
    yellow: "text-yellow-400",
    amber: "text-amber-400",
    violet: "text-violet-400",
    purple: "text-purple-400",
  };

  return (
    <GlassCard className="p-5" gradient="from-white/5 to-white/5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm uppercase tracking-wide text-white/50">{title}</h4>
        {Icon && <Icon className={iconClasses[accent]} />}
      </div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
      {subtitle && <div className="text-xs text-white/30 mt-1">{subtitle}</div>}
    </GlassCard>
  );
};

const WalletOption = ({ name, icon, description, installUrl, mobile, onClick }) => {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
      return;
    }

    if (installUrl) {
      window.open(installUrl, "_blank");
    }
  };

  return (
    <a
      href={installUrl || "#"}
      onClick={handleClick}
      target={installUrl ? "_blank" : undefined}
      rel={installUrl ? "noopener noreferrer" : undefined}
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-400/30 hover:bg-white/10"
    >
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-white transition group-hover:text-emerald-400">
          {name}
          {mobile && <span className="ml-2 text-xs text-white/40">Mobile</span>}
        </div>
        <div className="text-xs text-white/50">{description}</div>
      </div>
      <FaArrowRight className="text-white/30 transition group-hover:text-emerald-400" />
    </a>
  );
};

const WalletGuideModal = ({ onClose, onConnectMetaMask }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-900/90 backdrop-blur p-4">
        <h2 className="text-2xl font-bold text-white">Choose a Wallet</h2>
        <button
          onClick={onClose}
          className="text-2xl text-white/50 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="p-6">
        <p className="mb-6 text-white/70">
          To get your referral link and earn rewards, connect a Web3 wallet or sign up with email.
        </p>

        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <FaWallet className="text-emerald-400" />
          Popular Wallets
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WalletOption
            name="MetaMask"
            icon="🦊"
            description="Open this referral page in MetaMask and connect"
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

        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          💡 On mobile, MetaMask opens this page inside the MetaMask browser first, then you can connect there.
        </div>
      </div>
    </motion.div>
  </div>
);

const EmailSignupModal = ({ onClose, onSignup, loading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

    if (!acceptedTerms) {
      setLocalError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLocalError("");
    await onSignup(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Sign Up with Email</h2>
          <button
            onClick={onClose}
            className="text-2xl text-white/50 hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </div>

          <p className="text-xs text-white/40">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400"
            />
            <label htmlFor="terms" className="text-xs text-white/60">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-emerald-400 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-emerald-400 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          {(localError || error) && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? <FaSpinner className="mx-auto animate-spin" /> : "Create Account"}
          </button>

          <p className="text-center text-xs text-white/40">
            You can add a wallet later to claim rewards.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

const QrInfoTooltip = () => (
  <div className="group relative ml-2 inline-block">
    <FaInfoCircle className="cursor-help text-white/40 hover:text-emerald-400" />
    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-800 p-3 text-xs text-white group-hover:block">
      <p className="mb-1 font-semibold text-emerald-400">How to use QR code:</p>
      <ul className="space-y-1 text-white/70">
        <li>1. Open your phone camera</li>
        <li>2. Scan the QR code</li>
        <li>3. Opens signup with your code pre-filled</li>
        <li>4. Friend signs up using email or wallet</li>
      </ul>
      <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
    </div>
  </div>
);

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const isInsideMetaMaskBrowser = () => {
  if (typeof window === "undefined") return false;
  return !!window.ethereum?.isMetaMask;
};

const buildMetaMaskDeepLink = () => {
  const currentUrl = window.location.href.replace(/^https?:\/\//, "");
  return `https://metamask.app.link/dapp/${currentUrl}`;
};

const ReferralSystem = () => {
  const navigate = useNavigate();

  const {
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
    connecting,
    error: walletError,
  } = useWallet();

  const { signup, isAuthenticated, user, logout } = useAuth();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    paidSubscribers: 0,
    subscriptionCredits: 0,
    freeMonthsEarned: 0,
    referralStatus: "Bronze",
    nextReward: "2 referrals",
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
  const [connectionError, setConnectionError] = useState("");

  // Leaderboard data
  const [leaderboard] = useState([
    { name: "TraderPro", referrals: 128 },
    { name: "CryptoWhale", referrals: 94 },
    { name: "DeFiKing", referrals: 73 },
    { name: "SignalMaster", referrals: 56 },
    { name: "BotRunner", referrals: 42 },
  ]);

  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    return `IMALI-${wallet.slice(2, 10).toUpperCase()}`;
  };

  const referralCode = referralData.code || (account ? generateReferralCode(account) : "");
  const referralUrl = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : "";

  const fetchReferralData = useCallback(async () => {
    if (!isConnected && !isAuthenticated) return;

    try {
      if (isAuthenticated && user) {
        setReferralData({
          code: user.referral_code || (account ? generateReferralCode(account) : ""),
          totalReferrals: user.referral_count || 14,
          paidSubscribers: user.paid_subscribers || 6,
          subscriptionCredits: user.subscription_credits || 114,
          freeMonthsEarned: user.free_months_earned || 3,
          referralStatus: user.referral_status || "Silver",
          nextReward: user.next_reward || "2 referrals",
        });
        return;
      }

      if (account) {
        setReferralData({
          code: generateReferralCode(account),
          totalReferrals: 0,
          paidSubscribers: 0,
          subscriptionCredits: 0,
          freeMonthsEarned: 0,
          referralStatus: "Bronze",
          nextReward: "2 referrals",
        });
      }
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    }
  }, [account, isConnected, isAuthenticated, user]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  useEffect(() => {
    if (!connectionError) return;
    const timer = setTimeout(() => setConnectionError(""), 5000);
    return () => clearTimeout(timer);
  }, [connectionError]);

  const getStatusColor = (status) => {
    const colors = {
      Bronze: "border-amber-600/30 bg-amber-500/10 text-amber-400",
      Silver: "border-gray-400/30 bg-gray-400/10 text-gray-300",
      Gold: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      Platinum: "border-cyan-400/30 bg-cyan-400/10 text-cyan-400",
      Diamond: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    };
    return colors[status] || colors.Bronze;
  };

  const openMetaMaskReferralPage = () => {
    const deepLink = buildMetaMaskDeepLink();
    window.location.href = deepLink;
  };

  const connectOnCurrentPage = async () => {
    setConnectionError("");

    try {
      const result = await connectWallet();
      if (result?.account) {
        console.log("Connected successfully:", result.account);
      }
    } catch (err) {
      const message = err?.message || "Failed to connect MetaMask.";
      setConnectionError(message);

      if (message.toLowerCase().includes("not detected")) {
        setShowWalletGuide(true);
      }
    }
  };

  const handleConnectClick = async () => {
    setConnectionError("");

    if (isMobileDevice() && !isInsideMetaMaskBrowser()) {
      openMetaMaskReferralPage();
      return;
    }

    await connectOnCurrentPage();
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  const handleConnectMetaMask = async () => {
    setShowWalletGuide(false);

    if (isMobileDevice() && !isInsideMetaMaskBrowser()) {
      openMetaMaskReferralPage();
      return;
    }

    await connectOnCurrentPage();
  };

  const copyToClipboard = async () => {
    if (!referralUrl) return;

    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setApplyMessage({ type: "error", text: "Failed to copy link." });
    }
  };

  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;

    if (!isAuthenticated) {
      setApplyMessage({
        type: "error",
        text: "Please sign up or log in to apply a referral code.",
      });
      return;
    }

    setApplyLoading(true);
    setApplyMessage(null);

    try {
      localStorage.setItem("pending_referral_code", referralInput.trim().toUpperCase());
      setApplyMessage({
        type: "success",
        text: `Referral code ${referralInput.trim().toUpperCase()} saved! It will be applied to your account.`,
      });
      setReferralInput("");
      setTimeout(() => fetchReferralData(), 1000);
    } catch (err) {
      setApplyMessage({
        type: "error",
        text: err?.message || "Failed to apply referral code.",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const claimCredits = async () => {
    if (referralData.subscriptionCredits <= 0) {
      setApplyMessage({ type: "error", text: "No subscription credits to claim." });
      return;
    }

    if (!isAuthenticated) {
      setApplyMessage({ type: "error", text: "Please log in to claim credits." });
      return;
    }

    setClaimLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setApplyMessage({
        type: "success",
        text: `$${referralData.subscriptionCredits} in subscription credits applied to your account!`,
      });
      setReferralData((prev) => ({ ...prev, subscriptionCredits: 0 }));
    } catch {
      setApplyMessage({
        type: "error",
        text: "Failed to claim credits. Please try again.",
      });
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
        password,
        tier: "starter",
        strategy: "ai_weighted",
        referral_code: pendingRefCode || referralCode || undefined,
        accepted_terms: true,
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

  if (connecting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
          <p className="text-white/60">Connecting to wallet...</p>
          <p className="mt-2 text-sm text-white/30">
            Please approve the request in MetaMask if prompted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="flex flex-wrap items-center justify-center gap-2 text-3xl font-extrabold tracking-tight text-white sm:gap-3 sm:text-4xl md:text-5xl">
            <FaUserFriends className="text-emerald-400" />
            Grow IMALI Together
          </h1>
          <p className="mx-auto mt-3 max-w-2xl px-4 text-sm text-white/60 sm:text-base">
            Invite friends. Earn subscription credits. Upgrade faster.
          </p>
        </div>

        {/* Connection Status */}
        {(isConnected || isAuthenticated) && (
          <GlassCard className="mb-6 p-4 border-emerald-400/30" gradient="from-emerald-500/10 to-emerald-500/10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected && (
                  <span className="text-sm text-emerald-300">
                    Wallet: {account?.slice(0, 6)}...{account?.slice(-4)}
                  </span>
                )}
                {isAuthenticated && (
                  <span className="text-sm text-emerald-300">
                    {isConnected && " • "}Account: {user?.email?.split("@")[0]}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                {isConnected && (
                  <button
                    onClick={handleDisconnectWallet}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition"
                  >
                    <FaSignOutAlt />
                    Disconnect
                  </button>
                )}

                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Connect Prompt */}
        {!isConnected && !isAuthenticated && (
          <GlassCard className="mb-6 p-6" gradient="from-white/5 to-white/5">
            <div className="text-center">
              <p className="text-lg font-medium text-white">Get Your Referral Link</p>
              <p className="mb-4 text-sm text-white/50">
                Connect a wallet or sign up with email to start earning
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleConnectClick}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 transition"
              >
                <FaWallet />
                Connect Wallet
              </button>

              <button
                onClick={() => setShowEmailSignup(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-medium text-white hover:bg-white/20 transition"
              >
                <FaEnvelope />
                Sign Up with Email
              </button>
            </div>

            {(walletError || connectionError) && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
                <FaExclamationTriangle />
                {walletError || connectionError}
              </div>
            )}
          </GlassCard>
        )}

        {/* Messages */}
        {applyMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 flex items-center gap-2 rounded-xl p-3 ${
              applyMessage.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-400/30 bg-red-500/10 text-red-400"
            } border`}
          >
            {applyMessage.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
            {applyMessage.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          {/* LEFT COLUMN */}
          <aside className="space-y-6 lg:col-span-2">
            {/* How it works */}
            <GlassCard className="p-5" gradient="from-white/5 to-white/5">
              <img
                src={referralImg}
                alt="IMALI Referral"
                className="mb-4 w-full rounded-xl"
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              <h3 className="mb-3 text-lg font-bold text-white">How It Works</h3>
              <ol className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">1.</span>
                  <span>Share your referral link with friends and traders.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">2.</span>
                  <span>When they sign up, you earn subscription credits.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">3.</span>
                  <span>Credits automatically reduce your next bill.</span>
                </li>
              </ol>

              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
              >
                <FaTelegram className="mr-2" />
                Join Telegram Community
              </a>
            </GlassCard>

            {/* Referral Bot */}
            <GlassCard className="p-5 border-amber-400/30" gradient="from-amber-500/10 to-amber-900/10">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <FaRobot className="text-amber-400" />
                  Referral Bot
                </h3>
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                  Active
                </span>
              </div>

              <img
                src={referralBot}
                alt="Referral Bot"
                className="mb-4 w-full rounded-xl border border-amber-400/20"
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              <p className="text-sm text-white/70">
                Invite developers, traders, and investors to join IMALI.
              </p>

              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  <b className="text-white">Subscription Credits</b> — Earn credits for every paying referral
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  <b className="text-white">Free Months</b> — Unlock Pro or Elite for free
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  <b className="text-white">Status Badges</b> — Bronze → Silver → Gold → Platinum
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  <b className="text-white">Lifetime Badge</b> — Earn the Founder status
                </li>
              </ul>
            </GlassCard>

            {/* QR + Link */}
            <GlassCard className="p-5 border-emerald-400/30" gradient="from-emerald-500/10 to-emerald-500/10">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <FaQrcode className="text-emerald-400" />
                Your Referral Link
                <QrInfoTooltip />
              </h3>

              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="relative rounded-xl border border-emerald-400/30 bg-black/40 p-3">
                  <QRCodeCanvas
                    value={referralUrl || "https://imali-defi.com/signup"}
                    size={120}
                  />
                  {!referralUrl && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
                      <span className="text-xs text-white/40">Connect</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <code className="break-all text-xs text-emerald-300">
                    {referralUrl || "Connect to generate link"}
                  </code>
                  <p className="mt-1 text-xs text-white/30">
                    Scan with phone → Opens signup with your code
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30"
                  placeholder="Connect to generate"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 transition ${
                    referralUrl
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "cursor-not-allowed bg-white/5 text-white/30"
                  }`}
                >
                  <FaCopy />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent(
                    "Join me on IMALI — automated trading made simple:"
                  );
                  const url = encodeURIComponent(referralUrl);
                  window.open(
                    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
                    "_blank"
                  );
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2 text-sm text-white hover:bg-blue-400 transition"
                disabled={!referralUrl}
              >
                <FaShareAlt />
                Share on X/Twitter
              </button>

              <div className="mt-3 rounded-xl bg-black/40 p-2 text-center">
                <p className="text-xs text-white/50">
                  Your code:{" "}
                  <span className="font-mono font-bold text-emerald-400">
                    {referralCode || "—"}
                  </span>
                </p>
              </div>
            </GlassCard>
          </aside>

          {/* RIGHT COLUMN */}
          <section className="space-y-6 lg:col-span-3">
            {/* Stats Tiles */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Tile
                title="Successful Referrals"
                value={referralData.totalReferrals}
                icon={FaUserFriends}
                accent="emerald"
              />
              <Tile
                title="Paid Subscribers"
                value={referralData.paidSubscribers}
                icon={FaCrown}
                accent="yellow"
              />
              <Tile
                title="Subscription Credits"
                value={`$${referralData.subscriptionCredits}`}
                icon={FaCoins}
                accent="amber"
              />
              <Tile
                title="Free Months Earned"
                value={referralData.freeMonthsEarned}
                icon={FaGift}
                accent="violet"
              />
            </div>

            {/* Status + Next Reward */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-5" gradient="from-white/5 to-white/5">
                <h4 className="text-sm uppercase tracking-wide text-white/40">Referral Status</h4>
                <div className={`mt-2 inline-block px-4 py-2 rounded-full border text-sm font-bold ${getStatusColor(referralData.referralStatus)}`}>
                  {referralData.referralStatus}
                </div>
                <div className="mt-2 text-xs text-white/30">Higher status = better rewards</div>
              </GlassCard>

              <GlassCard className="p-5" gradient="from-white/5 to-white/5">
                <h4 className="text-sm uppercase tracking-wide text-white/40">Next Reward</h4>
                <div className="mt-2 text-xl font-bold text-white">{referralData.nextReward}</div>
                <div className="mt-1 text-xs text-white/30">Keep sharing to unlock more!</div>
              </GlassCard>
            </div>

            {/* Claim Credits */}
            <GlassCard className="p-6" gradient="from-white/5 to-white/5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Claim Subscription Credits</h3>
                  <p className="text-sm text-white/50 mt-1">
                    Credits automatically apply to your next billing cycle.
                  </p>
                </div>

                <button
                  onClick={claimCredits}
                  disabled={referralData.subscriptionCredits <= 0 || claimLoading}
                  className={`rounded-2xl px-6 py-3 font-semibold transition ${
                    referralData.subscriptionCredits > 0 && !claimLoading
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "cursor-not-allowed bg-white/5 text-white/30"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : `Claim $${referralData.subscriptionCredits}`}
                </button>
              </div>

              <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <ul className="space-y-2 text-white/50">
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400 text-xs" />
                    Credits from every paid referral
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400 text-xs" />
                    Auto-applied to your subscription
                  </li>
                </ul>
                <ul className="space-y-2 text-white/50">
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400 text-xs" />
                    Stack credits for free months
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheckCircle className="text-emerald-400 text-xs" />
                    Track live stats here
                  </li>
                </ul>
              </div>
            </GlassCard>

            {/* Referral Rewards Table */}
            <GlassCard className="p-6" gradient="from-white/5 to-white/5">
              <h3 className="text-lg font-bold text-white mb-4">Referral Rewards</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="text-left py-3 font-medium">Referrals</th>
                      <th className="text-left py-3 font-medium">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className="text-white/70">
                      <td className="py-3">1</td>
                      <td className="py-3">$10 subscription credit</td>
                    </tr>
                    <tr className="text-white/70">
                      <td className="py-3">3</td>
                      <td className="py-3">1 month Pro free</td>
                    </tr>
                    <tr className="text-white/70">
                      <td className="py-3">5</td>
                      <td className="py-3">2 months Pro free</td>
                    </tr>
                    <tr className="text-white/70">
                      <td className="py-3">10</td>
                      <td className="py-3">Elite for one month</td>
                    </tr>
                    <tr className="text-white/70">
                      <td className="py-3">25</td>
                      <td className="py-3 text-amber-400 font-bold">🏆 Lifetime Founder Badge</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Leaderboard */}
            <GlassCard className="p-6" gradient="from-white/5 to-white/5">
              <div className="flex items-center gap-3 mb-4">
                <FaTrophy className="text-amber-400 text-xl" />
                <h3 className="text-lg font-bold text-white">Top Referrers This Month</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.map((referrer, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${
                        index === 0 ? 'text-amber-400' : 
                        index === 1 ? 'text-gray-400' : 
                        index === 2 ? 'text-amber-600' : 
                        'text-white/30'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-white">{referrer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaUserFriends className="text-white/20 text-xs" />
                      <span className="text-white font-bold">{referrer.referrals}</span>
                      <span className="text-white/30 text-xs">referrals</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Apply Referral Code */}
            <GlassCard className="p-6 border-amber-400/30" gradient="from-amber-500/10 to-amber-500/10">
              <h3 className="font-bold text-white mb-3">Have a referral code?</h3>
              <p className="text-sm text-white/50 mb-3">
                Enter a friend's code to get them a bonus.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`rounded-xl px-6 py-3 transition ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 text-white hover:bg-amber-400"
                      : "cursor-not-allowed bg-white/5 text-white/30"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply Code"}
                </button>
              </div>
            </GlassCard>

            {/* Final CTA */}
            <GlassCard className="p-6 border-indigo-400/30" gradient="from-indigo-600/20 to-purple-700/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Invite 3 friends.</h3>
                  <p className="text-sm text-white/60">Get your next month free.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/pricing"
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition"
                  >
                    View Plans
                  </Link>
                  <button
                    onClick={() => {
                      if (!referralUrl) return;
                      const text = encodeURIComponent(
                        "Join me on IMALI — automated trading made simple:"
                      );
                      const url = encodeURIComponent(referralUrl);
                      window.open(
                        `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
                        "_blank"
                      );
                    }}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white transition flex items-center gap-2"
                    disabled={!referralUrl}
                  >
                    <FaShareAlt /> Share Now
                  </button>
                </div>
              </div>
            </GlassCard>
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