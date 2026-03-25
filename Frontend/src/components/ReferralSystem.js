// src/components/ReferralSystem.jsx
import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import axios from "axios";
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
  FaGift,
  FaTwitter,
  FaArrowLeft
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const Tile = ({ title, value, icon: Icon, accent = "emerald", suffix = "" }) => (
  <div className={`rounded-2xl p-5 border bg-gradient-to-br from-${accent}-500/10 to-${accent}-900/10 border-${accent}-400/30`}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm uppercase tracking-wide text-white/70">{title}</h4>
      {Icon && <Icon className={`text-${accent}-300`} />}
    </div>
    <div className="text-2xl font-extrabold">
      {typeof value === 'number' ? value.toLocaleString() : value}
      {suffix}
    </div>
  </div>
);

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

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Generate referral code from wallet address
  const generateReferralCode = (wallet) => {
    if (!wallet) return "";
    const shortCode = wallet.slice(2, 10).toUpperCase();
    return `IMALI-${shortCode}`;
  };

  const referralUrl = referralData.code 
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(referralData.code)}` 
    : "";

  // Fetch referral data from backend
  const fetchReferralData = async () => {
    if (!account || !isConnected) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!token) {
        setError("Please log in to view referral data");
        setLoading(false);
        return;
      }
      
      const [infoRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/referrals/info`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/referrals/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (infoRes.data.success) {
        const info = infoRes.data.data;
        setReferralData(prev => ({
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
        setReferralData(prev => ({
          ...prev,
          qualifiedReferrals: stats.qualified_referrals || 0,
          level1Earnings: stats.total_rewards_earned || 0,
          level2Earnings: stats.total_rewards_earned * 0.25,
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
      // Fallback to generated code
      setReferralData(prev => ({
        ...prev,
        code: generateReferralCode(account),
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Apply referral code
  const applyReferralCode = async () => {
    if (!referralInput.trim()) return;
    
    if (!isAuthenticated) {
      setError("Please log in to apply a referral code");
      return;
    }
    
    setApplyLoading(true);
    setError(null);
    setValidationStatus(null);
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!token) {
        setError("Please log in to apply a referral code");
        setApplyLoading(false);
        return;
      }
      
      // First validate the code
      const validateRes = await axios.post(`${API_BASE}/api/referrals/validate`, {
        code: referralInput.trim().toUpperCase()
      });
      
      if (validateRes.data.success) {
        setValidationStatus({ valid: true, message: "Valid referral code!" });
        
        // Apply the code
        const applyRes = await axios.post(`${API_BASE}/api/referrals/apply`, {
          code: referralInput.trim().toUpperCase()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
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
        setError(error.response.data.message || "Cannot apply referral code to your account");
      } else {
        setError("Failed to apply referral code. Please try again.");
      }
    } finally {
      setApplyLoading(false);
    }
  };
  
  // Claim rewards
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
      setError("Please enter a valid Ethereum wallet address (0x followed by 40 hex characters)");
      return;
    }
    
    setClaimLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (!token) {
        setError("Please log in to claim rewards");
        setClaimLoading(false);
        return;
      }
      
      const response = await axios.post(`${API_BASE}/api/referrals/claim`, {
        amount: referralData.pendingRewards,
        wallet_address: walletAddress,
        claim_all: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      window.dispatchEvent(new CustomEvent('open-wallet-modal'));
    }
  };
  
  useEffect(() => {
    if (account && isConnected && isAuthenticated) {
      fetchReferralData();
    }
  }, [account, isConnected, isAuthenticated]);
  
  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Back button */}
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 mb-6">
              <FaUserFriends className="text-5xl text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              IMALI Referral Program
            </h1>
            <p className="text-white/70 max-w-2xl mx-auto mb-8 text-lg">
              Earn 20% of fees paid by users you refer. Connect your account to get started.
            </p>
            
            <div className="max-w-md mx-auto bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
              <h3 className="text-lg font-semibold mb-3">How it works</h3>
              <ol className="text-left space-y-3 text-white/70">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">1</span>
                  <span>Create an account or log in</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">2</span>
                  <span>Get your unique referral link</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">3</span>
                  <span>Share with friends and earn 20% of their fees in USDC</span>
                </li>
              </ol>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl font-semibold hover:from-emerald-500 hover:to-cyan-500 transition"
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition border border-white/20"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Wallet not connected state (but authenticated)
  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition">
            <FaArrowLeft className="text-sm" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <FaWallet className="text-6xl text-emerald-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-white/70 max-w-md mx-auto mb-8">
              Connect your wallet to view your referral stats and start earning rewards
            </p>
            <button
              onClick={handleConnectWallet}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl font-semibold hover:from-emerald-500 hover:to-cyan-500 transition inline-flex items-center gap-2"
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
      <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white/70">Loading referral data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition">
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <FaUserFriends /> Boost With Referrals
          </h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Share your link, earn {referralData.rewardPercentage}% of fees paid by users you refer. 
            Payouts in {referralData.rewardCurrency}. Your referral bot grows as the IMALI ecosystem scales.
          </p>
        </div>
        
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 rounded-xl bg-green-500/20 border border-green-400/30 p-4 text-green-300 flex items-center gap-2">
            <FaCheckCircle />
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 border border-red-400/30 p-4 text-red-300">
            {error}
          </div>
        )}

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
                <li>You earn {referralData.rewardPercentage}% of their fees.</li>
                <li>Track earnings and claim rewards here.</li>
              </ol>
              <a
                href="https://t.me/Imalitradingbot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition"
              >
                <FaTelegram className="mr-2" /> Start via Telegram
              </a>
            </div>

            {/* Referral Bot value card */}
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
                <li>• <b>Tier Boosts:</b> Higher member tiers you refer increase your rev-share multipliers.</li>
                <li>• <b>Volume Rewards:</b> A % of trading volume from your network unlocks milestone bonuses.</li>
                <li>• <b>Staking Synergy:</b> Holding/staking IMALI boosts your partner payout percentages.</li>
                <li>• <b>Seasonal Leaderboards:</b> Top referrers earn bonus pools and exclusive rewards.</li>
                <li>• <b>Partner Utilities:</b> Access to partner-only signals, early betas, and DAO proposals.</li>
              </ul>
              <p className="mt-3 text-xs text-white/60">
                Program specifics evolve as IMALI scales. Track your referral bot value in your dashboard.
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
                  {referralUrl || "Generating your link..."}
                </code>
              </div>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="flex-1 p-3 rounded-l-xl bg-black/40 border border-emerald-500/30 text-sm"
                  placeholder="Connect wallet to generate link"
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!referralUrl}
                  className={`px-4 rounded-r-xl flex items-center gap-2 transition ${
                    referralUrl ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-500/50 cursor-not-allowed"
                  }`}
                >
                  <FaCopy /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => {
                  if (!referralUrl) return;
                  const text = encodeURIComponent(`Join me on IMALI — earn ${referralData.rewardPercentage}% referral rewards on ${referralData.rewardCurrency}!`);
                  const url = encodeURIComponent(referralUrl);
                  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                }}
                className="mt-3 w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white inline-flex items-center justify-center transition"
                disabled={!referralUrl}
              >
                <FaTwitter className="mr-2" /> Share on X/Twitter
              </button>
            </div>
          </aside>

          {/* RIGHT COLUMN: Stats + Actions */}
          <section className="lg:col-span-3 space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Tile title="Referrals" value={referralData.totalReferrals} icon={FaUserFriends} accent="emerald" />
              <Tile 
                title="Total Earned" 
                value={`${referralData.earned.toFixed(2)}`} 
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
                value={`${referralData.pendingRewards.toFixed(2)}`} 
                icon={FaGift} 
                accent="violet" 
                suffix={` ${referralData.rewardCurrency}`}
              />
            </div>

            {/* Claim + Program rules */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Claim your rewards</h3>
                  <p className="text-sm text-white/70">
                    Pending: {referralData.pendingRewards.toFixed(2)} {referralData.rewardCurrency}
                  </p>
                </div>
                <button
                  onClick={claimRewards}
                  disabled={referralData.pendingRewards <= 0 || claimLoading}
                  className={`px-6 py-3 rounded-2xl font-semibold transition flex items-center gap-2 ${
                    referralData.pendingRewards > 0 && !claimLoading
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-gray-600/40 cursor-not-allowed"
                  }`}
                >
                  {claimLoading ? <FaSpinner className="animate-spin" /> : <FaGift />}
                  {claimLoading ? "Processing..." : "Claim Rewards"}
                </button>
              </div>
              
              {showWalletInput && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                  <label className="block text-sm font-medium mb-2">Wallet Address for {referralData.rewardCurrency}</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full p-3 rounded-xl bg-black/40 border border-emerald-500/30"
                  />
                  <p className="text-xs text-white/60 mt-2">Enter your Ethereum/Polygon wallet to receive {referralData.rewardCurrency}</p>
                </div>
              )}
              
              <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                <ul className="space-y-2 list-disc list-inside text-white/80">
                  <li>{referralData.rewardPercentage}% referral share on fees paid by users you refer.</li>
                  <li>Paid in {referralData.rewardCurrency} after user qualifies.</li>
                </ul>
                <ul className="space-y-2 list-disc list-inside text-white/80">
                  <li>Rewards unlock once referred user pays fees.</li>
                  <li>Minimum claim: $10 {referralData.rewardCurrency}.</li>
                </ul>
              </div>
            </div>

            {/* Apply a Code */}
            <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-6">
              <h3 className="font-semibold mb-3">Have a referral code?</h3>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter referral code (e.g., IMALI-XXXXXX)"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 p-3 rounded-l-xl bg-black/40 border border-amber-400/30 text-sm"
                />
                <button
                  onClick={applyReferralCode}
                  disabled={!referralInput.trim() || applyLoading}
                  className={`px-6 py-3 rounded-r-xl transition ${
                    referralInput.trim() && !applyLoading
                      ? "bg-amber-500 hover:bg-amber-600" 
                      : "bg-gray-500/40 cursor-not-allowed"
                  }`}
                >
                  {applyLoading ? <FaSpinner className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {validationStatus && (
                <p className={`mt-2 text-xs ${validationStatus.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {validationStatus.message}
                </p>
              )}
              <p className="mt-2 text-xs text-white/70">
                Enter a friend's code to give them a referral bonus when you start trading.
              </p>
            </div>

            {/* CTA: Drive to pricing/signup */}
            <div className="rounded-2xl border border-indigo-400/30 p-6 bg-gradient-to-r from-indigo-600/20 to-purple-700/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Ready to invite friends?</h3>
                <p className="text-sm text-white/80">Share your link and start earning {referralData.rewardPercentage}% of their fees.</p>
              </div>
              <div className="flex gap-3">
                <Link to="/pricing" className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold transition">View Pricing</Link>
                <Link to="/signup" className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition">Go to Signup</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;
