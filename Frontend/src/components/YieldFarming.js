import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import YieldFarmingVisual from "../assets/images/farming-visual.png";
import { FaInfoCircle, FaCoins, FaWallet, FaPercentage, FaQuestionCircle } from "react-icons/fa";

const YieldFarming = () => {
  const { account, chainId, connectWallet, disconnectWallet, isConnecting, error } = useWallet();

  const [stakingContract, setStakingContract] = useState(null);
  const [farmBalance, setFarmBalance] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState(0);
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
          console.error("Failed to initialize contract:", error);
          setStatus("Failed to initialize contract.");
        }
      }
    };
    initContract();
  }, [account, chainId]);

  const fetchFarmData = async () => {
    if (!stakingContract || !account) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const stakedLPData = await stakingContract.lpStakers(account);
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));

      const lpTokenAddress = await stakingContract.lpToken();
      const lpTokenContract = new ethers.Contract(lpTokenAddress, ["function balanceOf(address) view returns (uint256)"], signer);
      const stakedLPToken = await lpTokenContract.balanceOf(await stakingContract.getAddress());
      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));

      const rewardRate = await stakingContract.lpRewardRate();
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000;
      const apyValue = stakedTotal > 0 ? ((rateNum * secondsInYear) / stakedTotal) * 100 : 0;
      setApy(apyValue.toFixed(2));
    } catch (error) {
      console.error("Failed to fetch farm data:", error);
      setStatus("Failed to fetch farm data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmData();
  }, [stakingContract, account]);

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">🔗 Connect Your Wallet</h2>
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      <div className="bg-white border rounded-lg p-6 mb-8 text-center">
        <img
          src={YieldFarmingVisual}
          alt="Yield Farming Guide"
          className="mx-auto mb-6 rounded-lg shadow-md max-w-xs"
        />
        <h2 className="text-2xl font-bold text-green-700 mb-2">Farm Crypto Rewards the Easy Way</h2>
        <p className="text-gray-700 max-w-2xl mx-auto">
          Deposit your LP tokens into our Yield Farm, earn daily crypto rewards, and watch your digital garden grow — no experience needed!
        </p>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <FaInfoCircle className="mr-2 text-blue-500" /> What is Yield Farming?
        </h2>
        <p className="mb-4">
          Think of it like renting your crypto to the market and earning interest for your service! You provide liquidity and get rewarded with extra tokens over time.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <FaQuestionCircle className="mr-2 text-green-500" /> Your Farm Stats
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <FaCoins className="text-green-700 mb-2" size={24} />
            <p>Staked LP Tokens: {farmBalance}</p>
          </div>
          <div>
            <FaWallet className="text-green-700 mb-2" size={24} />
            <p>Earned Rewards: {earnedRewards}</p>
          </div>
          <div>
            <FaPercentage className="text-green-700 mb-2" size={24} />
            <p>APY: {apy}%</p>
          </div>
        </div>
      </div>

      {status && <p className="text-center text-red-600">{status}</p>}
    </section>
  );
};

export default YieldFarming;
