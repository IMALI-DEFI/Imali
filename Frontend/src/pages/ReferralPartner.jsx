// src/components/ReferralSystem.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaUserFriends,
  FaShareAlt,
  FaCoins,
  FaChartLine,
  FaTelegram,
  FaCopy,
  FaRobot,
  FaCheckCircle,
  FaSpinner,
  FaWallet,
  FaArrowLeft,
  FaSyncAlt,
  FaArrowRight,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const Tile = ({ title, value, icon: Icon, accent = "emerald" }) => {
  const accentColors = {
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100",
    yellow: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100",
    amber: "border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100",
    violet: "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100",
  };

  const iconColors = {
    emerald: "text-emerald-600",
    yellow: "text-yellow-600",
    amber: "text-amber-600",
    violet: "text-violet-600",
  };

  return (
    <div className={`rounded-2xl p-5 border ${accentColors[accent]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm uppercase tracking-wide text-gray-600">{title}</h4>
        {Icon && <Icon className={iconColors[accent]} />}
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
};

const WalletOption = ({ name, icon, description, installUrl, mobile }) => (
  <a
    href={installUrl}
    target="_blank"
    rel="noopener noreferrer"
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

const WalletGuideModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white">
      <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Wallet</h2>
        <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <div className="p-6">
        <p className="mb-6 text-gray-600">
          A Web3 wallet helps you get your referral link, track rewards, and claim payouts later.
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
          💡 New to crypto? MetaMask or Coinbase Wallet are the easiest places to start.
        </div>
      </div>
    </div>
  </div>
);

const SignupModal = ({ onClose, onSignup, loading, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
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

        <p className="text-xs text-gray-600">
          Use at least 8 characters with uppercase, lowercase, and a number.
        </p>

        <button
          onClick={onSignup}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-3 text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? <FaSpinner className="mx-auto animate-spin" /> : "Create Account"}
        </button>

        <p className="text-center text-xs text-gray-600">
          You can add a wallet later to claim rewards.
        </p>
      </div>
    </div>
  </div>
);

const ReferralSystem = () => {
  const navigate = useNavigate();
  const { account, isConnected, connectWallet, connecting, hasWallet } = useWallet();
  const { signup, isAuthenticated } = useAuth();

  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    pendingRewards: 0,
  });
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const tryAutoConnect = async () => {
      if (autoConnectAttempted || isConnected || connecting || !hasWallet) return;
      setAutoConnectAttempted(true);

      try {
        await connectWallet();
      } catch (err) {
        console.log("[ReferralSystem] Auto-connect skipped:", err?.message);
      }
    };

    const timer = setTimeout(tryAutoConnect, 400);
    return () => clearTimeout(timer);
  }, [autoConnectAttempted, isConnected, connecting, hasWallet, connectWallet]);

  useEffect(() => {
    if (!account) return;
    const code = account.slice(2, 10).toUpperCase();
    setReferralData((prev) => ({
      ...prev,
      code,
      totalReferrals: 12,
      level1Earnings: 5.42,
      level2Earnings: 1.23,
      pendingRewards: 2.15,
    }));
  }, [account]);

  const handleConnectWallet = async () => {
    setError("");
    try {
      await connectWallet();
      setGuestMode(false);
    } catch (err) {
      setError(err?.message || "Could not connect wallet.");
    }
  };

  const copyToClipboard = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy your referral link.");
    }
  };

  const registerReferral = async () => {
    if (!referralInput.trim()) return;
    alert(`Referral code ${referralInput.trim()} registered!`);
    setReferralInput("");
  };

  const claimRewards = async () => {
    if (referralData.pendingRewards <= 0) {
      setError("No pending rewards to claim.");
      return;
    }
    alert("Rewards claimed successfully!");
    setReferralData((p) => ({ ...p, pendingRewards: 0 }));
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
    setError("");
    setSuccess("");

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
      setSuccess("Account created successfully!");
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

  // Loading state while connecting
  if (connecting && !isConnected) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex min-h-screen flex-col items-center justify-center">
          <FaSpinner className="mb-4 animate-spin text-4xl text-emerald-600" />
          <p className="text-gray-600">Connecting to wallet...</p>
        </div>
      </div>
    );
  }

  // No wallet detected - show options screen
  if (!hasWallet && !guestMode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
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
                Choose how you want to participate. You can use a wallet, sign up with email, or browse first.
              </p>

              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 text-left">
                  <div className="mb-3 text-4xl">🦊</div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">Use a Web3 Wallet</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Best for full referral rewards and direct wallet payouts.
                  </p>
                  <ul className="mb-4 space-y-1 text-sm text-gray-700">
                    <li>✓ Get referral link instantly</li>
                    <li>✓ Claim rewards to your wallet</li>
                    <li>✓ Track Referral NFT progress</li>
                  </ul>
                  <button
                    onClick={() => setShowWalletGuide(true)}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-white transition hover:bg-emerald-700"
                  >
                    Choose a Wallet →
                  </button>
                </div>

                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 text-left">
                  <div className="mb-3 text-4xl">✉️</div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">Use Email Only</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Good for beginners. You can add a wallet later.
                  </p>
                  <ul className="mb-4 space-y-1 text-sm text-gray-700">
                    <li>✓ Get referral link</li>
                    <li>✓ Track referrals</li>
                    <li>✓ Upgrade later</li>
                  </ul>
                  <button
                    onClick={() => setShowSignupForm(true)}
                    className="w-full rounded-lg bg-gray-600 py-2 text-white transition hover:bg-gray-700"
                  >
                    Sign up with Email →
                  </button>
                </div>
              </div>

              <button
                onClick={() => setGuestMode(true)}
                className="rounded-lg bg-gray-100 px-6 py-3 text-gray-700 transition hover:bg-gray-200"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>

        {showWalletGuide && <WalletGuideModal onClose={() => setShowWalletGuide(false)} />}
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

  // Wallet detected but not connected
  if (!isConnected && hasWallet && !guestMode) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
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
                Connect your wallet to get your personal referral link and start sharing right away.
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
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Need help choosing a wallet?
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
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

        {showWalletGuide && <WalletGuideModal onClose={() => setShowWalletGuide(false)} />}
      </div>
    );
  }

  // Guest mode view (browse only)
  if (guestMode && !isConnected && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            You are browsing in guest mode. Create an account or connect a wallet to get your referral link and earn rewards.
          </div>

          {/* Preview dashboard header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 flex items-center justify-center gap-3">
              <FaUserFriends className="text-emerald-600" /> Boost With Referrals
            </h1>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Share your link, level up rewards, and unlock perks.
            </p>
          </div>

          {/* Preview dashboard grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 opacity-60 pointer-events-none">
            {/* LEFT COLUMN - Preview */}
            <aside className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <img src={referralImg} alt="IMALI Referral overview" className="w-full rounded-xl mb-4" />
                <h3 className="text-lg font-bold mb-2 text-gray-900">How it works</h3>
                <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                  <li>Connect your wallet to generate a unique code.</li>
                  <li>Share your link/QR. Friends sign up for any tier.</li>
                  <li>You earn a revenue share. Track and claim here.</li>
                </ol>
              </div>

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
                  As the <b>IMALI bot</b> grows, your Referral Bot gains utility and long-term value.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="text-lg font-bold mb-3 text-gray-900">Your Referral Link</h3>
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200">
                    <QRCodeCanvas value="https://imali-defi.com/signup" size={140} />
                  </div>
                  <code className="text-xs break-all text-emerald-700 text-center">
                    Connect to generate your link
                  </code>
                </div>
              </div>
            </aside>

            {/* RIGHT COLUMN - Preview */}
            <section className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Tile title="Referrals" value="0" icon={FaUserFriends} accent="emerald" />
                <Tile title="Level 1" value="0 IMALI" icon={FaCoins} accent="yellow" />
                <Tile title="Level 2" value="0 IMALI" icon={FaCoins} accent="amber" />
                <Tile title="Pending" value="0 IMALI" icon={FaChartLine} accent="violet" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Claim your rewards</h3>
                    <p className="text-sm text-gray-600">Payouts in USDC or IMALI.</p>
                  </div>
                  <button className="px-6 py-3 rounded-2xl font-semibold bg-gray-300 text-gray-600 cursor-not-allowed">
                    Claim Rewards
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 text-center">
            <p className="mb-6 text-gray-600">Sign up or connect a wallet to activate your referral dashboard.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowSignupForm(true)}
                className="rounded-lg bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700"
              >
                Sign Up
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

  // Main dashboard - Full access
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        {isConnected && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-emerald-700">
                Wallet Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
            </div>
            <button
              onClick={handleConnectWallet}
              className="text-xs text-emerald-600 hover:text-emerald-800"
            >
              <FaSyncAlt className="mr-1 inline" />
              Switch Wallet
            </button>
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
                  className={`px-4 rounded-r-xl flex items-center gap-2 ${referralUrl ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
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
                  className={`px-6 py-3 rounded-2xl font-semibold ${referralData.pendingRewards > 0 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
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
                  className={`px-6 py-3 rounded-r-xl ${referralInput.trim() ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
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
                <Link to="/pricing" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">View Pricing</Link>
                <Link to="/signup" className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Go to Signup</Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showWalletGuide && <WalletGuideModal onClose={() => setShowWalletGuide(false)} />}
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
};

export default ReferralSystem;