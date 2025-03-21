import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaCoins, FaWallet, FaPercentage } from "react-icons/fa";

const YieldFarming = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [apy, setApy] = useState("0");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  // Refs for contract instances
  const stakingContractRef = useRef(null);
  const lpTokenContractRef = useRef(null);

  // Check that the user is on the Polygon network.
  const checkNetwork = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 137) {
        toast.error("⚠️ Please switch to the Polygon network to use yield farming features.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  // Initialize contract instances
  const initContracts = async () => {
    try {
      stakingContractRef.current = await getContractInstance("Staking");
      lpTokenContractRef.current = await getContractInstance("LPToken");
      if (!stakingContractRef.current || !lpTokenContractRef.current) {
        throw new Error("Contract instances failed to load.");
      }
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setError(`Error initializing contracts: ${err.message || err.reason}`);
    }
  };

  // Fetch yield farming data from contracts
  const fetchFarmData = async () => {
    if (!walletAddress || !stakingContractRef.current || !lpTokenContractRef.current) return;

    try {
      setLoading(true);
      setError("");

      // Fetch LP staker info, LP token balance of staking contract, and reward rate
      const stakedLPData = await stakingContractRef.current.lpStakers(walletAddress);
      const stakedLPToken = await lpTokenContractRef.current.balanceOf(
        await stakingContractRef.current.getAddress()
      );
      const rewardRate = await stakingContractRef.current.lpRewardRate();

      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));

      // Calculate APY using a simple model (reward rate * seconds in year / total staked * 100)
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000;
      const apyValue = stakedTotal > 0 ? ((rateNum * secondsInYear) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));
    } catch (err) {
      console.error("Error fetching farm data:", err);
      setError(`Error fetching farm data: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch LP token balance of the user (for display purposes)
  const fetchUserBalance = async () => {
    if (walletAddress && lpTokenContractRef.current) {
      const balance = await lpTokenContractRef.current.balanceOf(walletAddress);
      setFarmBalance(ethers.formatUnits(balance, 18));
    }
  };

  // Initialize contracts and fetch data on wallet change
  useEffect(() => {
    if (walletAddress) {
      initContracts().then(() => {
        fetchFarmData();
        fetchUserBalance();
      });
    }
  }, [walletAddress]);

  // Handle token approval and staking
  const stakeTokensInFarm = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress || !amount) {
      setError("❌ Connect wallet and enter an amount to stake");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError("❌ Amount to stake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const amountInWei = ethers.parseUnits(amount, 18);

      // Get staking contract address to check token allowance
      const stakingAddress = await stakingContractRef.current.getAddress();
      const allowance = await lpTokenContractRef.current.allowance(walletAddress, stakingAddress);

      // If current allowance is insufficient, approve the tokens
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        const approveTx = await lpTokenContractRef.current.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("LP token approval confirmed!");
      }

      // Stake the tokens
      const stakeTx = await stakingContractRef.current.stakeLP(amountInWei);
      await stakeTx.wait();
      toast.success(`Successfully staked ${amount} LP tokens!`);
      fetchFarmData();
      fetchUserBalance();
    } catch (err) {
      console.error("Staking error:", err);
      setError(`Staking failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle unstaking LP tokens
  const unstakeTokensInFarm = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress || !amount) {
      setError("❌ Connect wallet and enter an amount to unstake");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError("❌ Amount to unstake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const amountInWei = ethers.parseUnits(amount, 18);

      // Unstake the tokens
      const unstakeTx = await stakingContractRef.current.unstakeLP(amountInWei);
      await unstakeTx.wait();
      toast.success(`Successfully unstaked ${amount} LP tokens!`);
      fetchFarmData();
      fetchUserBalance();
    } catch (err) {
      console.error("Unstaking error:", err);
      setError(`Unstaking failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle claiming rewards
  const claimRewards = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress) {
      setError("❌ Connect wallet to claim rewards");
      return;
    }
    try {
      setLoading(true);
      setError("");

      // Claim rewards
      const claimTx = await stakingContractRef.current.claimRewards();
      await claimTx.wait();
      toast.success("Successfully claimed rewards!");
      fetchFarmData();
    } catch (err) {
      console.error("Claiming rewards error:", err);
      setError(`Claiming rewards failed: ${err.message || err.reason}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dashboard text-gray-900 py-12">
      {/* Wallet Connection */}
      <div className="container mx-auto text-center mb-8">
        {walletAddress ? (
          <>
            <div className="bg-gray-100 p-3 rounded-lg shadow-sm text-center">
              <p className="text-sm text-gray-700">Connected Wallet:</p>
              <p className="text-md font-mono text-[#036302] break-words">{walletAddress}</p>
            </div>
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-gray-700"
              onClick={resetWallet}
            >
              🔄 Reset Wallet
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={connectWallet}
          >
            🔗 Connect Wallet
          </button>
        )}
      </div>

      {/* Instructions at the Top */}
      <div className="container mx-auto mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-green-600 mb-4">How to Use Yield Farming</h2>
        <ol className="list-decimal list-inside text-gray-800 space-y-2">
          <li>Connect your wallet using the "Connect Wallet" button.</li>
          <li>Ensure your wallet is connected to the Polygon network.</li>
          <li>Deposit LP tokens to start earning rewards.</li>
          <li>Stake, unstake, or claim rewards as needed.</li>
        </ol>
      </div>

      {/* Yield Farming Stats */}
      <div className="container mx-auto text-center my-6 bg-white">
        <div className="bg-white shadow-md rounded-lg p-4 inline-block">
          <p className="text-lg font-semibold">📊 Yield Farming Stats:</p>
          <p><FaCoins className="inline" /> Staked LP Tokens: {farmBalance}</p>
          <p><FaWallet className="inline" /> Earned Rewards: {earnedRewards}</p>
          <p><FaPercentage className="inline" /> APY: {apy}%</p>
        </div>
      </div>

      {/* Yield Farming Form */}
      <div className="container mx-auto mt-6 px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-white">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FaCoins size={24} />
              <span>LP Tokens</span>
            </div>
          </div>
          <div className="mt-4">
            <input
              type="number"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={stakeTokensInFarm}
              disabled={loading}
            >
              {loading ? "Processing..." : "Stake"}
            </button>
            <button
              className="w-full px-4 py-2 mt-2 bg-red-500 text-white rounded-md"
              onClick={unstakeTokensInFarm}
              disabled={loading}
            >
              {loading ? "Processing..." : "Unstake"}
            </button>
            <button
              className="w-full px-4 py-2 mt-2 bg-green-500 text-white rounded-md"
              onClick={claimRewards}
              disabled={loading}
            >
              {loading ? "Processing..." : "Claim Rewards"}
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default YieldFarming;
