import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { FaUserFriends, FaShareAlt, FaCoins, FaChartLine } from "react-icons/fa";
import QRCode from "qrcode.react";

const ReferralSystem = () => {
  const { account } = useWallet();
  const [referralData, setReferralData] = useState({
    code: "",
    totalReferrals: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    pendingRewards: 0
  });
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (account) {
      // Generate referral code (first 8 chars of address)
      const code = account.slice(2, 10).toUpperCase();
      setReferralData(prev => ({
        ...prev,
        code,
        // These would come from your backend or contract
        totalReferrals: 12,
        level1Earnings: 5.42,
        level2Earnings: 1.23,
        pendingRewards: 2.15
      }));
    }
  }, [account]);

  const copyToClipboard = () => {
    const url = `${window.location.origin}?ref=${referralData.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const registerReferral = async () => {
    // This would interact with your backend/contract
    alert(`Referral code ${referralInput} registered!`);
    setReferralInput("");
  };

  const claimRewards = async () => {
    // This would interact with your contract
    alert("Rewards claimed successfully!");
    setReferralData(prev => ({ ...prev, pendingRewards: 0 }));
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-600 flex justify-center items-center">
          <FaUserFriends className="mr-3" />
          Referral Program
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Referral Code Section */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <h3 className="text-xl font-semibold mb-4 text-purple-800">
              Your Referral Code
            </h3>
            
            <div className="text-center mb-4">
              <div className="inline-block p-2 bg-white rounded-lg border border-purple-300">
                <QRCode 
                  value={`${window.location.origin}?ref=${referralData.code}`} 
                  size={128} 
                />
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="text"
                value={`${window.location.origin}?ref=${referralData.code}`}
                readOnly
                className="flex-1 p-2 border rounded-l-lg"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center">
                <FaShareAlt className="mr-2" />
                Share
              </button>
            </div>
          </div>
          
          {/* Referral Stats */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center">
                <FaChartLine className="mr-2 text-green-500" />
                Your Referral Stats
              </h4>
              <div className="space-y-3">
                <p className="flex justify-between">
                  <span>Total Referrals:</span>
                  <span className="font-bold">{referralData.totalReferrals}</span>
                </p>
                <p className="flex justify-between">
                  <span>Level 1 Earnings:</span>
                  <span className="text-green-600 font-bold">{referralData.level1Earnings} IMALI</span>
                </p>
                <p className="flex justify-between">
                  <span>Level 2 Earnings:</span>
                  <span className="text-green-600 font-bold">{referralData.level2Earnings} IMALI</span>
                </p>
                <p className="flex justify-between">
                  <span>Pending Rewards:</span>
                  <span className="text-blue-600 font-bold">{referralData.pendingRewards} IMALI</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={claimRewards}
              disabled={referralData.pendingRewards <= 0}
              className={`w-full py-3 rounded-lg font-medium ${
                referralData.pendingRewards > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Claim Rewards
            </button>
          </div>
        </div>
        
        {/* Register Referral */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-yellow-800">
            Have a referral code?
          </h3>
          <div className="flex">
            <input
              type="text"
              placeholder="Enter referral code"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-yellow-500"
            />
            <button
              onClick={registerReferral}
              disabled={!referralInput}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-r-lg disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
        
        {/* How It Works */}
        <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-3">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-2 text-blue-600">Level 1 (5%)</h4>
              <p className="text-sm text-gray-600">
                Earn 5% of all swaps from users you refer directly
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-2 text-purple-600">Level 2 (2%)</h4>
              <p className="text-sm text-gray-600">
                Earn 2% of swaps from users referred by your referrals
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-2 text-green-600">Staking Rewards</h4>
              <p className="text-sm text-gray-600">
                Earn 1% of staking rewards from your referral network
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;