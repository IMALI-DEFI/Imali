// YieldFarming.js (Revised Layout + Connection Fix + Error Handling)
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { toast } from "react-toastify";

const YieldFarming = () => {
  const { account, connectWallet, disconnectWallet, provider } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [apy, setApy] = useState("0.00");
  const [rewards, setRewards] = useState("0.00");
  const [staked, setStaked] = useState("0.00");
  const [error, setError] = useState(null);

  const stakingRef = useRef(null);
  const lpTokenRef = useRef(null);

  const initContracts = useCallback(async () => {
    try {
      stakingRef.current = await getContractInstance("Staking");
      lpTokenRef.current = await getContractInstance("LPToken");
    } catch (err) {
      console.error("Contract init failed:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!stakingRef.current || !account) return;
    try {
      const [stakedRaw, rewardRaw, rewardRate] = await Promise.all([
        stakingRef.current.lpStakers(account).catch(() => ({ amount: 0n, rewards: 0n })),
        stakingRef.current.lpStakers(account).catch(() => ({ amount: 0n, rewards: 0n })),
        stakingRef.current.lpRewardRate().catch(() => 0n),
      ]);

      const stakedAmount = ethers.formatUnits(stakedRaw.amount || 0n, 18);
      const rewardAmount = ethers.formatUnits(stakedRaw.rewards || 0n, 18);
      const rate = ethers.formatUnits(rewardRate || 0n, 18);
      const apyEstimate = ((parseFloat(rate) * 31536000) / parseFloat(stakedAmount || "1")) * 100;

      setStaked(stakedAmount);
      setRewards(rewardAmount);
      setApy(apyEstimate.toFixed(2));
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      initContracts().then(fetchStats);
    }
  }, [account, initContracts, fetchStats]);

  const handleStake = async () => {
    if (!amount || !stakingRef.current || !lpTokenRef.current || !provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wei = ethers.parseUnits(amount, 18);
      const contractAddress = await stakingRef.current.getAddress();
      const allowance = await lpTokenRef.current.allowance(account, contractAddress);

      if (allowance < wei) {
        const tx = await lpTokenRef.current.connect(signer).approve(contractAddress, wei);
        await tx.wait();
      }

      const tx = await stakingRef.current.connect(signer).stakeLP(wei);
      await tx.wait();
      toast.success("✅ Staked successfully!");
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Stake failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!amount || !stakingRef.current || !provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const tx = await stakingRef.current.connect(signer).unstakeLP(ethers.parseUnits(amount, 18));
      await tx.wait();
      toast.success("✅ Unstaked successfully!");
      fetchStats();
    } catch (err) {
      toast.error("Unstake failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!stakingRef.current || !provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const tx = await stakingRef.current.connect(signer).claimRewards();
      await tx.wait();
      toast.success("✅ Rewards claimed!");
      fetchStats();
    } catch (err) {
      toast.error("Claim failed: " + (err.reason || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-10 px-4 max-w-5xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold text-center text-green-700 mb-6">Yield Farming</h1>

      {!account ? (
        <div className="text-center">
          <button
            onClick={() => connectWallet("metamask")}
            className="bg-green-600 text-white px-6 py-2 rounded"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="text-lg font-semibold">Staked LP</h3>
              <p>{staked}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="text-lg font-semibold">Rewards</h3>
              <p>{rewards}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="text-lg font-semibold">APY</h3>
              <p>{apy}%</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="border p-2 rounded w-full sm:w-1/2"
            />
            <button
              className="bg-green-600 text-white px-4 py-2 rounded w-full sm:w-auto"
              onClick={handleStake}
              disabled={loading}
            >Stake</button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded w-full sm:w-auto"
              onClick={handleUnstake}
              disabled={loading}
            >Unstake</button>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
              onClick={handleClaim}
              disabled={loading}
            >Claim</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </section>
  );
};

export default YieldFarming;
