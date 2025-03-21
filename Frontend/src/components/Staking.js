import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaCoins, FaWallet, FaPercentage, FaExchangeAlt } from "react-icons/fa";

const Staking = () => {
  const { walletAddress, connectWallet, resetWallet, loading, setLoading } = useWallet();
  const web3ModalRef = useRef();

  // Contract instances
  const [stakingContract, setStakingContract] = useState(null);
  const [lpTokenContract, setLpTokenContract] = useState(null);
  const [imaliTokenContract, setImaliTokenContract] = useState(null);

  // Staking and reward data
  const [stakingData, setStakingData] = useState({
    stakedLP: "0",
    stakedIMALI: "0",
    totalStakedLP: "0",
    totalStakedIMALI: "0",
    rewardBalance: "0",
    apy: "0",
  });

  // User token balances
  const [lpBalance, setLpBalance] = useState("0");
  const [imaliBalance, setImaliBalance] = useState("0");

  // Form states for staking actions
  const [stakeType, setStakeType] = useState("LP"); // Options: "LP" or "IMALI"
  const [amountToStake, setAmountToStake] = useState("");
  const [unstakeType, setUnstakeType] = useState("LP");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [error, setError] = useState("");

  // Check that the user is on the Polygon network.
  const checkNetwork = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== 137) {
        toast.error("⚠️ Please switch to the Polygon network to use staking features.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  // Fetch staking data (staked amounts, rewards, APY) from the staking contract.
  const fetchStakingData = async () => {
    if (!stakingContract || !lpTokenContract || !imaliTokenContract || !walletAddress) {
      console.warn("Contracts not initialized yet.");
      return;
    }
    try {
      setLoading(true);
      const [lpStakerData, imaliStakerData, totalStakedLP, totalStakedIMALI, rewardRate] = await Promise.all([
        stakingContract.lpStakers(walletAddress),
        stakingContract.imaliStakers(walletAddress),
        lpTokenContract.balanceOf(await stakingContract.getAddress()),
        imaliTokenContract.balanceOf(await stakingContract.getAddress()),
        stakingContract.lpRewardRate(),
      ]);
      const stakedTotal = parseFloat(ethers.formatUnits(totalStakedLP, 18));
      const rate = parseFloat(ethers.formatUnits(rewardRate, 18));
      const apyValue = stakedTotal > 0 ? ((rate * 365) / stakedTotal) * 100 : 0;
      setStakingData({
        stakedLP: ethers.formatUnits(lpStakerData.amount, 18),
        stakedIMALI: ethers.formatUnits(imaliStakerData.amount, 18),
        totalStakedLP: ethers.formatUnits(totalStakedLP, 18),
        totalStakedIMALI: ethers.formatUnits(totalStakedIMALI, 18),
        rewardBalance: ethers.formatUnits(lpStakerData.rewards + imaliStakerData.rewards, 18),
        apy: apyValue.toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching staking data:", error);
      setError(`Error fetching staking data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch token balances for the user.
  const fetchBalances = async () => {
    if (walletAddress && lpTokenContract && imaliTokenContract) {
      const lpBal = await lpTokenContract.balanceOf(walletAddress);
      const imaliBal = await imaliTokenContract.balanceOf(walletAddress);
      setLpBalance(ethers.formatUnits(lpBal, 18));
      setImaliBalance(ethers.formatUnits(imaliBal, 18));
    }
  };

  // Initialize contracts (staking, LP token, IMALI token).
  const initializeContracts = async () => {
    if (!walletAddress) {
      setError("❌ Wallet not connected");
      return;
    }
    try {
      setLoading(true);
      const staking = await getContractInstance("Staking");
      const lpToken = await getContractInstance("LPToken");
      const imaliToken = await getContractInstance("IMALIToken");
      if (!staking || !lpToken || !imaliToken) {
        throw new Error("Contract initialization failed");
      }
      setStakingContract(staking);
      setLpTokenContract(lpToken);
      setImaliTokenContract(imaliToken);
    } catch (error) {
      console.error("Error initializing contracts:", error);
      setError(error.message || "Contract initialization error");
    } finally {
      setLoading(false);
    }
  };

  // Handle staking tokens.
  const handleStake = async () => {
    if (!(await checkNetwork())) return;
    if (!walletAddress || !amountToStake) {
      setError("❌ Connect wallet and enter an amount to stake");
      return;
    }
    if (parseFloat(amountToStake) <= 0) {
      setError("❌ Amount to stake must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      const tokenContract = stakeType === "LP" ? lpTokenContract : imaliTokenContract;
      const stakeFunction = stakeType === "LP" ? "stakeLP" : "stakeIMALI";
      const stakingAddress = await stakingContract.getAddress();
      const amountInWei = ethers.parseUnits(amountToStake, 18);
      const allowance = await tokenContract.allowance(walletAddress, stakingAddress);
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        const approveTx = await tokenContract.approve(stakingAddress, amountInWei);
        await approveTx.wait();
        toast.success("Token approval confirmed!");
      }
      const stakeTx = await stakingContract[stakeFunction](amountInWei);
      await stakeTx.wait();
      toast.success(`Successfully staked ${amountToStake} ${stakeType} tokens!`);
      fetchStakingData();
      fetchBalances();
    } catch (error) {
      console.error("Staking error:", error);
      setError(error.reason || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawing staked tokens.
  const handleWithdraw = async () => {
    if (!(await checkNetwork())) return;
    if (!stakingContract) {
      setError("Contracts not initialized.");
      return;
    }
    if (!walletAddress || !unstakeAmount) {
      setError("❌ Connect wallet and enter an amount to withdraw");
      return;
    }
    if (parseFloat(unstakeAmount) <= 0) {
      setError("❌ Amount to withdraw must be greater than 0");
      return;
    }
    const balance = unstakeType === "LP" ? stakingData.stakedLP : stakingData.stakedIMALI;
    if (parseFloat(unstakeAmount) > parseFloat(balance)) {
      setError("❌ Insufficient staked balance");
      return;
    }
    try {
      setLoading(true);
      const unstakeFunction = unstakeType === "LP" ? "unstakeLP" : "unstakeIMALI";
      const amountInWei = ethers.parseUnits(unstakeAmount, 18);
      const unstakeTx = await stakingContract[unstakeFunction](amountInWei);
      await unstakeTx.wait();
      toast.success(`Successfully unstaked ${unstakeAmount} ${unstakeType} tokens!`);
      fetchStakingData();
      fetchBalances();
    } catch (error) {
      console.error("Unstaking error:", error);
      setError(error.reason || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize contracts and fetch data on wallet change.
  useEffect(() => {
    if (walletAddress) {
      initializeContracts().then(() => {
        fetchStakingData();
        fetchBalances();
      });
    }
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="container mx-auto text-center mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Please connect your wallet to access the Staking Dashboard.
          </h2>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={connectWallet}
          >
            🔗 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

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
        <h2 className="text-2xl font-bold text-green-600 mb-4">How to Stake & Yield Farm with IMALI</h2>
        <ol className="list-decimal list-inside text-gray-800 space-y-2">
          <li>Connect your wallet using the "Connect Wallet" button.</li>
          <li>Ensure your wallet is connected to the Polygon network.</li>
          <li>Select the token type (LP or IMALI) you want to stake.</li>
          <li>Enter the amount to stake or withdraw.</li>
          <li>Confirm the transaction in your wallet.</li>
        </ol>
      </div>

      {/* Staking Stats */}
      <div className="container mx-auto text-center my-6 bg-white">
        <div className="bg-white shadow-md rounded-lg p-4 inline-block">
          <p className="text-lg font-semibold">📊 Staking Stats:</p>
          <p><FaCoins className="inline" /> Staked LP: {stakingData.stakedLP}</p>
          <p><FaWallet className="inline" /> Staked IMALI: {stakingData.stakedIMALI}</p>
          <p><FaPercentage className="inline" /> APY: {stakingData.apy}%</p>
          <p><FaExchangeAlt className="inline" /> Total Rewards: {stakingData.rewardBalance}</p>
        </div>
      </div>

      {/* Staking Form */}
      <div className="container mx-auto mt-6 px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-white">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FaCoins size={24} />
              <span>Stake Tokens</span>
            </div>
          </div>
          <div className="mt-4">
            <select
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
              value={stakeType}
              onChange={(e) => setStakeType(e.target.value)}
            >
              <option value="LP">LP Tokens</option>
              <option value="IMALI">IMALI Tokens</option>
            </select>
            <input
              type="number"
              className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg"
              placeholder="Enter amount"
              value={amountToStake}
              onChange={(e) => setAmountToStake(e.target.value)}
            />
            <button
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md"
              onClick={handleStake}
              disabled={loading}
            >
              {loading ? "Processing..." : "Stake"}
            </button>
            <button
              className="w-full px-4 py-2 mt-2 bg-red-500 text-white rounded-md"
              onClick={handleWithdraw}
              disabled={loading}
            >
              {loading ? "Processing..." : "Withdraw"}
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

export default Staking;
