import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import stakingVisual from "../assets/images/staking-visual.png"; // Your new staking image
import { FaCoins, FaChartLine, FaSeedling } from "react-icons/fa";

const Staking = () => {
  const { account, chainId, connectWallet, disconnectWallet, isConnecting, error } = useWallet();

  const [stakingContract, setStakingContract] = useState(null);
  const [stakedBalance, setStakedBalance] = useState(0);
  const [rewards, setRewards] = useState(0);
  const [apy, setApy] = useState(0);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      if (account && chainId) {
        try {
          const contract = await getContractInstance("Staking", chainId);
          setStakingContract(contract);
        } catch (error) {
          console.error("Failed to load staking contract:", error);
        }
      }
    };
    initContract();
  }, [account, chainId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!stakingContract || !account) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const userInfo = await stakingContract.stakers(account);
        setStakedBalance(ethers.formatUnits(userInfo.amount, 18));
        setRewards(ethers.formatUnits(userInfo.rewards, 18));

        const rewardRate = await stakingContract.rewardRate();
        const totalStaked = await stakingContract.totalStaked();

        const yearlyReward = rewardRate * 31536000; // Seconds in a year
        const apyCalc = totalStaked > 0n ? (Number(yearlyReward) / Number(totalStaked)) * 100 : 0;
        setApy(apyCalc.toFixed(2));
      } catch (error) {
        console.error("Failed to fetch staking data:", error);
      }
    };
    fetchData();
  }, [stakingContract, account]);

  const handleStake = async () => {
    if (!stakingContract || !amount) return;
    setLoading(true);
    try {
      const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner();
      const tx = await stakingContract.connect(signer).stake(ethers.parseUnits(amount, 18));
      await tx.wait();
      setStatus("✅ Stake successful!");
      setAmount("");
    } catch (err) {
      console.error("Stake failed:", err);
      setStatus("❌ Stake failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!stakingContract || !amount) return;
    setLoading(true);
    try {
      const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner();
      const tx = await stakingContract.connect(signer).unstake(ethers.parseUnits(amount, 18));
      await tx.wait();
      setStatus("✅ Unstake successful!");
      setAmount("");
    } catch (err) {
      console.error("Unstake failed:", err);
      setStatus("❌ Unstake failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!stakingContract) return;
    setLoading(true);
    try {
      const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner();
      const tx = await stakingContract.connect(signer).claimRewards();
      await tx.wait();
      setStatus("✅ Rewards claimed!");
    } catch (err) {
      console.error("Claim failed:", err);
      setStatus("❌ Claim failed");
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">🔗 Connect Wallet to Stake</h2>
        <button onClick={connectWallet} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">
          Connect Wallet
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <img
          src={stakingVisual}
          alt="Staking Explained"
          className="mx-auto rounded-lg shadow-lg max-w-md"
        />
        <h2 className="text-3xl font-bold text-green-700 my-4">Grow Your Crypto Garden with IMALI</h2>
        <p className="text-gray-700 max-w-2xl mx-auto">
          Stake your IMALI tokens, earn rewards daily, and watch your digital assets grow! No complex steps — just stake, relax, and harvest your gains.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4 flex items-center"><FaCoins className="mr-2" /> Your Staking Stats</h3>
          <p>🔹 Staked Balance: {stakedBalance} IMALI</p>
          <p>🔹 Earned Rewards: {rewards} IMALI</p>
          <p>🔹 Current APY: {apy}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold mb-4 flex items-center"><FaChartLine className="mr-2" /> Stake or Claim</h3>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-2 mb-4 border rounded"
          />
          <div className="flex flex-col space-y-2">
            <button onClick={handleStake} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded">
              {loading ? "Processing..." : "Stake"}
            </button>
            <button onClick={handleUnstake} disabled={loading} className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded">
              {loading ? "Processing..." : "Unstake"}
            </button>
            <button onClick={handleClaim} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
              {loading ? "Processing..." : "Claim Rewards"}
            </button>
          </div>
          {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
        </div>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center">
        <h3 className="text-lg font-bold mb-2"><FaSeedling className="mr-2 inline-block" /> How Staking Works</h3>
        <p className="text-gray-700">
          When you stake IMALI tokens, they are locked into the protocol. In exchange, you earn rewards over time, based on the APY. You can claim your rewards or unstake anytime.
        </p>
      </div>
    </section>
  );
};

export default Staking;
