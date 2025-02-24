import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";

const Staking = () => {
  // Wallet Context
  const { walletAddress, connectWallet, resetWallet } = useWallet();

  // Contract States
  const [stakingContract, setStakingContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);

  // Staking Data States
  const [stakingData, setStakingData] = useState({
    stakedBalance: "0",
    totalStaked: "0",
    rewardBalance: "0",
    apy: "0",
    stakingFee: "0",
    gasFee: "0"
  });

  // UI States
  const [amountToStake, setAmountToStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Format wallet address
  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "❌ Not connected";
  };

  // Initialize Contracts with improved error handling
  const initializeContracts = async () => {
    if (!walletAddress) {
      setError("Wallet not connected");
      return;
    }
  
      try {
              console.log("🔄 Initializing contracts...");
              const staking = await getContractInstance("Staking");
              const token = await getContractInstance("Token");

              if (!staking || !token) {
                  console.error("❌ Failed to load contracts");
                  alert("❌ Could not fetch contracts. Please check the console.");
                  return;
              }
  
        console.log("✅ Contract Instances:", { staking, token });
  
          setStakingContract(staking);
               setTokenContract(token);
  
    } catch (error) {
        console.error("❌ Error initializing contracts:", error);
    } finally {
      setLoading(false);
    }
  };
  // Fetch Staking Data
  const fetchStakingData = async () => {
    if (!stakingContract?.address || !tokenContract?.address || !walletAddress) {
      console.log("⚠️ Required contracts or wallet not ready");
      return;
    }

    try {
      setLoading(true);
      console.log("🔄 Fetching staking data...");

      const [
        stakedAmount,
        totalStakedAmount,
        earnedReward,
        rewardRate,
        feePercentage
      ] = await Promise.all([
        stakingContract.stakedAmount(walletAddress),
        tokenContract.balanceOf(stakingContract.address),
        stakingContract.calculateReward(walletAddress),
        stakingContract.rewardRate(),
        stakingContract.feePercentage()
      ]);

      // Calculate APY
      const stakedTotal = parseFloat(ethers.formatUnits(totalStakedAmount, 18));
      const rate = parseFloat(ethers.formatUnits(rewardRate, 18));
      const apyValue = stakedTotal > 0 ? ((rate * 365) / stakedTotal) * 100 : 0;

      setStakingData({
        stakedBalance: ethers.formatUnits(stakedAmount, 18),
        totalStaked: ethers.formatUnits(totalStakedAmount, 18),
        rewardBalance: ethers.formatUnits(earnedReward, 18),
        apy: apyValue.toFixed(2),
        stakingFee: feePercentage.toString(),
        gasFee: "0"
      });

    } catch (error) {
      console.error("❌ Failed to fetch staking data:", error);
      setError(`Error fetching staking data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Staking
  const handleStake = async () => {
    if (!stakingContract || !tokenContract || !walletAddress) {
      setError("Please connect your wallet and try again.");
      return;
    }

    if (!amountToStake || isNaN(amountToStake) || parseFloat(amountToStake) <= 0) {
      setError("Please enter a valid amount to stake.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const amountInWei = ethers.parseUnits(amountToStake, 18);
      
      // Check allowance
      const allowance = await tokenContract.allowance(walletAddress, stakingContract.address);

      if (allowance < amountInWei) {
        console.log("🔄 Approving tokens...");
        const approveTx = await tokenContract.approve(stakingContract.address, amountInWei);
        await approveTx.wait();
        toast.success("✅ Token approval confirmed!");
      }

      console.log("🔄 Staking tokens...");
      const stakeTx = await stakingContract.stake(amountInWei);
      await stakeTx.wait();

      toast.success("✅ Tokens staked successfully!");
      setAmountToStake("");
      fetchStakingData();

    } catch (error) {
      console.error("❌ Staking error:", error);
      setError(`Staking failed: ${error.reason || error.message}`);
      toast.error("Failed to stake tokens");
    } finally {
      setLoading(false);
    }
  };

  // Handle Unstake
  const handleUnstake = async () => {
    if (!stakingContract || !walletAddress) {
      setError("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const tx = await stakingContract.unstake(ethers.parseUnits(stakingData.stakedBalance, 18));
      await tx.wait();
      
      toast.success("Tokens unstaked successfully!");
      fetchStakingData();

    } catch (error) {
      console.error("❌ Unstaking error:", error);
      setError(`Unstaking failed: ${error.reason || error.message}`);
      toast.error("Failed to unstake tokens");
    } finally {
      setLoading(false);
    }
  };

  // Handle Claim Rewards
  const handleClaimRewards = async () => {
    if (!stakingContract || !walletAddress) {
      setError("Please connect your wallet");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const tx = await stakingContract.claimRewards();
      await tx.wait();
      
      toast.success("Rewards claimed successfully!");
      fetchStakingData();

    } catch (error) {
      console.error("❌ Claim rewards error:", error);
      setError(`Failed to claim rewards: ${error.reason || error.message}`);
      toast.error("Failed to claim rewards");
    } finally {
      setLoading(false);
    }
  };

  // Effect for contract initialization
  useEffect(() => {
    if (walletAddress) {
      initializeContracts();
    }
  }, [walletAddress]);

  // Effect for data fetching
  useEffect(() => {
    const fetchData = async () => {
      if (stakingContract && tokenContract && walletAddress) {
        await fetchStakingData();
      }
    };

    fetchData();
  }, [stakingContract, tokenContract, walletAddress]);

  return (
    <section className="bg-gray-50 text-gray-900 py-12">
      <div className="container mx-auto px-4 bg-white shadow-md rounded-lg py-6">
        <h2 className="text-4xl font-extrabold text-center mb-4 text-[#036302]">
          📈 IMALI Staking
        </h2>

        {/* Wallet Connection */}
        <div className="text-center mb-4">
          {walletAddress ? (
            <>
              <p className="text-lg font-bold text-green-600">
                ✅ Connected: {formatAddress(walletAddress)}
              </p>
              <button
                className="mt-2 px-4 py-2 text-lg font-semibold rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
                onClick={resetWallet}
                disabled={loading}
              >
                🔄 Reset Wallet
              </button>
            </>
          ) : (
            <button
              className="mt-2 px-4 py-2 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={connectWallet}
              disabled={loading}
            >
              🔗 Connect Wallet
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-red-600 text-center mb-4 p-2 bg-red-100 rounded">
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center mb-4">
            <p className="text-blue-600">Loading...</p>
          </div>
        )}

        {/* Staking Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StakingCard
            title="Your Staked Balance"
            value={`${stakingData.stakedBalance} IMALI`}
            icon="💰"
          />
          <StakingCard
            title="Total Staked"
            value={`${stakingData.totalStaked} IMALI`}
            icon="📊"
          />
          <StakingCard
            title="APY"
            value={`${stakingData.apy}%`}
            icon="📈"
          />
        </div>

        {/* Staking Actions */}
        <div className="max-w-md mx-auto space-y-4">
          {/* Stake Form */}
          <div className="flex gap-2">
            <input
              type="number"
              value={amountToStake}
              onChange={(e) => setAmountToStake(e.target.value)}
              placeholder="Amount to stake"
              className="flex-1 px-4 py-2 border rounded-lg"
              disabled={loading || !walletAddress}
            />
            <button
              onClick={handleStake}
              disabled={loading || !walletAddress}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Stake"}
            </button>
          </div>

          {/* Additional Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUnstake}
              disabled={loading || !walletAddress || stakingData.stakedBalance === "0"}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Unstake All
            </button>
            <button
              onClick={handleClaimRewards}
              disabled={loading || !walletAddress || stakingData.rewardBalance === "0"}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Claim Rewards
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// Staking Card Component
const StakingCard = ({ title, value, icon }) => (
  <div className="bg-white shadow-md rounded-lg p-6 text-center">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
    <p className="text-2xl font-bold text-green-600">{value}</p>
  </div>
);

export default Staking;
