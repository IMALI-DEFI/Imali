// 📦 YieldFarming.js (New Refactored)
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import farmingGuideImage from "../assets/images/farming-guide-visual.png";

const YieldFarming = () => {
  const { account, connectWallet, disconnectWallet, provider } = useWallet();
  const [farmingData, setFarmingData] = useState({ tvl: "Loading...", apy: "Loading...", rewards: "Loading..." });
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const fetchFarmingStats = async () => {
    try {
      const contract = await getContractInstance("YieldFarming");
      const signer = await provider.getSigner();
      const user = await signer.getAddress();

      const [tvl, apy, rewards] = await Promise.all([
        contract.totalStaked(),
        contract.currentAPY(),
        contract.pendingRewards(user)
      ]);

      setFarmingData({
        tvl: Number(ethers.formatEther(tvl)).toFixed(2) + " IMALI",
        apy: (Number(apy) / 100).toFixed(2) + "%",
        rewards: Number(ethers.formatEther(rewards)).toFixed(4) + " IMALI"
      });
    } catch (error) {
      console.error("Error fetching farming stats:", error);
      setFarmingData({ tvl: "Error", apy: "Error", rewards: "Error" });
    }
  };

  const handleAction = async (action) => {
    if (!account) return alert("Please connect your wallet.");

    setLoading(true);
    setStatus("");

    try {
      const contract = await getContractInstance("YieldFarming");
      const signer = await provider.getSigner();

      let tx;
      if (action === "stake") {
        tx = await contract.connect(signer).stake(ethers.parseEther(amount));
      } else if (action === "unstake") {
        tx = await contract.connect(signer).unstake(ethers.parseEther(amount));
      } else if (action === "claim") {
        tx = await contract.connect(signer).claimRewards();
      }

      await tx.wait();
      setAmount("");
      setStatus("✅ Transaction successful!");
      fetchFarmingStats();
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus("❌ Transaction failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && provider) {
      fetchFarmingStats();
    }
  }, [account, provider]);

  return (
    <section className="py-10 px-4">
      <div className="container mx-auto">

        {/* Wallet Connect Section */}
        <div className="text-center mb-8">
          {!account ? (
            <button className="px-6 py-3 bg-green-500 text-white rounded-md" onClick={() => connectWallet('metamask')}>
              Connect Wallet
            </button>
          ) : (
            <div>
              <p className="text-sm mb-2">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <button className="text-red-500 underline" onClick={disconnectWallet}>Disconnect</button>
            </div>
          )}
        </div>

        {/* Farming Visual */}
        <div className="flex justify-center">
          <img src={farmingGuideImage} alt="Yield Farming Guide" className="rounded-lg shadow-md max-w-md" />
        </div>

        {/* Stats Display */}
        <div className="bg-white shadow-md rounded-lg p-6 my-8 text-center">
          <h2 className="text-2xl font-bold mb-4">📈 Farming Stats</h2>
          <p>💰 Total Value Locked (TVL): {farmingData.tvl}</p>
          <p>🚀 Current APY: {farmingData.apy}</p>
          <p>🎁 Your Pending Rewards: {farmingData.rewards}</p>
        </div>

        {/* Action Inputs */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Stake / Unstake / Claim</h2>
          <input
            type="number"
            placeholder="Enter amount (IMALI)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleAction("stake")}
              disabled={loading}
              className="bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
            >
              Stake
            </button>
            <button
              onClick={() => handleAction("unstake")}
              disabled={loading}
              className="bg-yellow-500 text-white py-2 rounded-md hover:bg-yellow-600"
            >
              Unstake
            </button>
            <button
              onClick={() => handleAction("claim")}
              disabled={loading}
              className="bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
            >
              Claim Rewards
            </button>
          </div>
          {status && <p className="mt-4 text-center font-semibold text-gray-700">{status}</p>}
        </div>

      </div>
    </section>
  );
};

export default YieldFarming;
