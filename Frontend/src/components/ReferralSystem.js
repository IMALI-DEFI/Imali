// src/components/ReferralSystem.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaUserFriends, FaCoins, FaChartLine, FaTelegram, FaCopy,
  FaRobot, FaCheckCircle, FaSpinner, FaWallet, FaGift,
  FaTwitter, FaArrowLeft, FaMedal, FaLink, FaSyncAlt,
} from "react-icons/fa";
import referralImg from "../assets/images/referral_program.png";
import referralBot from "../assets/images/cards/referralbot.png";

// ... (keep all helper functions and components)

export default function ReferralSystem() {
  const navigate = useNavigate();
  const { account, isConnected: walletConnected, connectWallet, connecting, hasWallet } = useWallet();
  const { signup, isAuthenticated } = useAuth();
  const { socket, isConnected: socketConnected, liveStats } = useSocket();

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
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentReferrals, setRecentReferrals] = useState([]);

  // Listen for real-time referral events
  useEffect(() => {
    if (!socket || !socketConnected) return;
    
    // Subscribe to referral events for this user
    if (isAuthenticated && account) {
      socket.subscribeReferrals(account);
    }
    
    const unsubscribeReferral = socket.onReferralEvent((data) => {
      console.log("[ReferralSystem] New referral event:", data);
      setRecentReferrals(prev => [data, ...prev].slice(0, 20));
      // Refresh referral data
      fetchReferralData();
    });
    
    const unsubscribeLeaderboard = socket.onLeaderboardUpdate((data) => {
      setLeaderboard(data.leaderboard || []);
    });
    
    return () => {
      unsubscribeReferral();
      unsubscribeLeaderboard();
    };
  }, [socket, socketConnected, isAuthenticated, account]);

  // Live leaderboard display
  const LiveLeaderboard = () => (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FaMedal className="text-amber-600" />
        <h3 className="font-bold text-gray-900">Live Leaderboard</h3>
        {socketConnected && (
          <span className="text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            Live
          </span>
        )}
      </div>
      
      {leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((referrer, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-600 w-6">#{i+1}</span>
                <span className="truncate max-w-[120px]">{referrer.name || referrer.email}</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span>{referrer.referrals} referrals</span>
                <span className="font-semibold text-green-600">${referrer.earnings}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center">Be the first to top the leaderboard!</p>
      )}
    </div>
  );

  // Add live referral feed
  const RecentReferralsFeed = () => (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FaUserFriends className="text-indigo-600" />
        <h3 className="font-bold text-gray-900">Recent Referrals</h3>
      </div>
      
      {recentReferrals.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {recentReferrals.map((ref, i) => (
            <div key={i} className="text-xs flex justify-between">
              <span className="text-gray-600 truncate">{ref.referred_email}</span>
              <span className="text-gray-400">{timeAgo(ref.created_at)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center">No recent referrals yet</p>
      )}
    </div>
  );

  // Add connection status to the header
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Connection Status Bar */}
        <div className="mb-4 flex justify-end">
          <div className="flex items-center gap-2 text-xs bg-gray-100 px-3 py-1 rounded-full">
            <span className={`inline-block w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-gray-600">{socketConnected ? 'Live referrals' : 'Updates every 30s'}</span>
          </div>
        </div>
        
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <FaArrowLeft className="text-sm" />
          Back to Home
        </Link>

        {/* Live Stats Banner */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">Active Referrers</div>
            <div className="text-xl font-bold text-emerald-600">{leaderboard.length}</div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">Total Referrals</div>
            <div className="text-xl font-bold text-amber-600">{liveStats.totalReferrals || 0}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">Rewards Paid</div>
            <div className="text-xl font-bold text-purple-600">${liveStats.totalRewardsPaid || 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <aside className="space-y-6 lg:col-span-2">
            {/* Add LiveLeaderboard component */}
            <LiveLeaderboard />
            
            {/* Add RecentReferralsFeed component */}
            <RecentReferralsFeed />
            
            {/* Rest of the existing sidebar content */}
            {/* ... */}
          </aside>
          
          <section className="space-y-6 lg:col-span-3">
            {/* Rest of the existing main content */}
            {/* ... */}
          </section>
        </div>
      </div>
    </div>
  );
}
