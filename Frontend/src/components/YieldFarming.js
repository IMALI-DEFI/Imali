import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import { FaCoins, FaWallet, FaPercentage } from "react-icons/fa";

const YieldFarming = () => {
  const {
    account,
    chainId,
    connectMetaMask,
    connectWalletConnect,
    disconnectWallet,
    isConnecting: walletConnecting,
    error: walletError,
    provider,
    getSigner
  } = useWallet();

  const [stakingContract, setStakingContract] = useState(null);
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [apy, setApy] = useState("0");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [lpBalance, setLpBalance] = useState("0");

  const initContract = useCallback(async () => {
    if (!account || !chainId) return;
    try {
      const contract = await getContractInstance("Staking", { chainId });
      setStakingContract(contract);
    } catch (error) {
      console.error("Failed to initialize contract:", error);
      setStatus({ message: "Failed to initialize contract", type: "error" });
    }
  }, [account, chainId]);

  const fetchFarmData = useCallback(async () => {
    if (!stakingContract || !account) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      const stakedLPData = await stakingContract.connect(signer).lpStakers(account);
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));

      const lpTokenAddress = await stakingContract.lpToken();
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        ["function balanceOf(address) view returns (uint256)"],
        signer
      );
      
      const [stakedLPToken, userLpBalance] = await Promise.all([
        lpTokenContract.balanceOf(await stakingContract.getAddress()),
        lpTokenContract.balanceOf(account)
      ]);

      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));
      setLpBalance(ethers.formatUnits(userLpBalance, 18));

      const rewardRate = await stakingContract.lpRewardRate();
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000;
      const apyValue = stakedTotal > 0 ? ((rateNum * secondsInYear) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));
    } catch (error) {
      console.error("Failed to fetch farm data:", error);
      setStatus({ message: "Failed to fetch farm data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [stakingContract, account, getSigner]);

  useEffect(() => { initContract(); }, [initContract]);
  useEffect(() => { if (stakingContract) fetchFarmData(); }, [stakingContract, fetchFarmData]);

  const handleStakeLP = async () => {
    if (!stakingContract || !amount) {
      setStatus({ message: "Please enter amount to stake", type: "error" });
      return;
    }
    
    const amountInWei = ethers.parseUnits(amount, 18);
    if (Number(amount) > Number(lpBalance)) {
      setStatus({ message: "Insufficient LP balance", type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const signer = await getSigner();
      const lpTokenAddress = await stakingContract.lpToken();
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        ["function allowance(address,address) view returns (uint256)", "function approve(address,uint256) external returns (bool)"],
        signer
      );
      
      const stakingContractAddress = await stakingContract.getAddress();
      const allowance = await lpTokenContract.allowance(account, stakingContractAddress);

      if (allowance < amountInWei) {
        setStatus({ message: "Approving LP tokens...", type: "info" });
        const approveTx = await lpTokenContract.approve(stakingContractAddress, amountInWei);
        await approveTx.wait();
      }

      setStatus({ message: "Staking LP tokens...", type: "info" });
      const tx = await stakingContract.connect(signer).stakeLP(amountInWei);
      await tx.wait();
      
      setStatus({ message: "LP Tokens Staked!", type: "success" });
      setAmount("");
      await fetchFarmData();
    } catch (error) {
      console.error("Failed to stake LP tokens:", error);
      setStatus({ message: error.reason || error.message || "Stake failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeLP = async () => {
    if (!stakingContract || !amount) {
      setStatus({ message: "Please enter amount to unstake", type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const signer = await getSigner();
      const amountInWei = ethers.parseUnits(amount, 18);
      
      setStatus({ message: "Unstaking LP Tokens...", type: "info" });
      const tx = await stakingContract.connect(signer).unstakeLP(amountInWei);
      await tx.wait();
      
      setStatus({ message: "LP Tokens Unstaked!", type: "success" });
      setAmount("");
      await fetchFarmData();
    } catch (error) {
      console.error("Failed to unstake LP tokens:", error);
      setStatus({ message: error.reason || error.message || "Unstake failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!stakingContract) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      setStatus({ message: "Claiming Rewards...", type: "info" });
      const tx = await stakingContract.connect(signer).claimRewards();
      await tx.wait();
      setStatus({ message: "Rewards Claimed!", type: "success" });
      await fetchFarmData();
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      setStatus({ message: error.reason || error.message || "Claim failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <h2 className="text-3xl font-bold mb-6">🌾 Yield Farming</h2>
        <p className="text-gray-600 mb-8 text-lg">
          Connect your wallet to participate in yield farming and earn rewards
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={connectMetaMask}
            disabled={walletConnecting}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center"
          >
            <img src="/metamask-icon.svg" alt="MetaMask" className="w-6 h-6 mr-2" />
            {walletConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
          <button
            onClick={connectWalletConnect}
            disabled={walletConnecting}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center"
          >
            <img src="/walletconnect-icon.svg" alt="WalletConnect" className="w-6 h-6 mr-2" />
            {walletConnecting ? "Connecting..." : "Connect WalletConnect"}
          </button>
        </div>
        {walletError && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg max-w-md mx-auto">
            {walletError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Wallet Connection Status */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-2 sm:mb-0">
          <p className="text-sm text-gray-600">Connected Wallet</p>
          <p className="font-mono text-green-700 break-words">{account}</p>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Disconnect Wallet
        </button>
      </div>

      {/* Rest of your component remains the same */}
      {/* ... */}
    </div>
  );
};

export default YieldFarming;