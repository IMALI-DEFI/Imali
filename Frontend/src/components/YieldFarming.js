// YieldFarming.js (Refactored with Visual Layout, Banner, and Functional Logic)
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { toast } from "react-toastify";
import farmingBanner from "../assets/images/farming-guide-visual.png";

const YieldFarming = () => {
  const { account, connectWallet, disconnectWallet, provider } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [apy, setApy] = useState("0.00");
  const [rewards, setRewards] = useState("0.00");
  const [staked, setStaked] = useState("0.00");
  const [error, setError] = useState(null);

  const stakingRef = useRef(null);
  const tokenRef = useRef(null);

  const initContracts = useCallback(async () => {
    try {
      stakingRef.current = await getContractInstance("Staking");
      tokenRef.current = await getContractInstance("LPToken");
    } catch (err) {
      console.error("Contract init failed:", err);
      setError("Failed to initialize contracts");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!stakingRef.current || !account) return;
    try {
      const [userStakeData, rewardRate] = await Promise.all([
        stakingRef.current.lpStakers(account).catch(() => [0n, 0n, 0n]),
        stakingRef.current.lpRewardRate().catch(() => 0n),
      ]);

      const stakedAmount = ethers.formatUnits(userStakeData[0] || 0n, 18);
      const rewardAmount = ethers.formatUnits(userStakeData[2] || 0n, 18);
      const rate = ethers.formatUnits(rewardRate || 0n, 18);
      const apyEstimate = ((parseFloat(rate) * 31536000) / parseFloat(stakedAmount || "1")) * 100;

      setStaked(stakedAmount);
      setRewards(rewardAmount);
      setApy(apyEstimate.toFixed(2));
    } catch (err) {
      console.error("Stats fetch failed:", err);
      setError("Failed to fetch farming stats");
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      initContracts().then(fetchStats);
    }
  }, [account, initContracts, fetchStats]);

  const handleStake = async () => {
    if (!amount || !stakingRef.current || !tokenRef.current || !provider) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const wei = ethers.parseUnits(amount, 18);
      const contractAddress = await stakingRef.current.getAddress();
      const allowance = await tokenRef.current.allowance(account, contractAddress);

      if (allowance < wei) {
        const tx = await tokenRef.current.connect(signer).approve(contractAddress, wei);
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
    <section className="bg-gray-50 text-gray-900 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <img
          src={farmingBanner}
          alt="Yield Farming Guide"
          className="w-full max-w-2xl mx-auto rounded mb-6"
        />
        <h2 className="text-3xl font-bold text-center text-green-700 mb-4">💰 Yield Farming</h2>
        <p className="text-center text-gray-700 mb-6">
          Provide liquidity and stake your LP tokens to earn rewards in real time.
        </p>

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-100 p-4 rounded text-center">
                <h4 className="font-semibold">Staked LP</h4>
                <p>{staked}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded text-center">
                <h4 className="font-semibold">Rewards</h4>
                <p>{rewards}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded text-center">
                <h4 className="font-semibold">APY</h4>
                <p>{apy}%</p>
              </div>
            </div>

            <div className="mb-6">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="border p-3 rounded w-full mb-4"
              />
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={handleStake}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded"
                >Stake</button>
                <button
                  onClick={handleUnstake}
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-2 rounded"
                >Unstake</button>
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded"
                >Claim</button>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <h3 className="text-lg font-semibold mb-2">📘 How It Works</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Stake LP tokens you’ve earned by providing liquidity.</li>
            <li>Earn rewards over time based on the pool’s APY.</li>
            <li>Unstake anytime. Rewards are claimable on demand.</li>
            <li>Watch your yield grow with our real-time stats.</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default YieldFarming;
