import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import { FaInfoCircle, FaCoins, FaWallet, FaPercentage, FaExclamationTriangle, FaCheckCircle, FaQuestionCircle } from "react-icons/fa";
import YieldFarmingVisual from "../assets/images/farming.png";
const YieldFarming = () => {
  const { account, chainId, connectWallet, disconnectWallet, isConnecting, error } = useWallet();
  const [stakingContract, setStakingContract] = useState(null);
  const [farmBalance, setFarmBalance] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState(0);
  const [apy, setApy] = useState(0);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [lpBalance, setLpBalance] = useState(0);
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
  useEffect(() => {
    fetchFarmData();
  }, [stakingContract, account]);
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
      const userLpBalance = await lpTokenContract.balanceOf(account);
      setLpBalance(ethers.formatUnits(userLpBalance, 18));
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

  const handleStakeLP = async () => {
    if (!stakingContract || !amount) return;
    setLoading(true);
    try {
      const tx = await stakingContract.stakeLP(ethers.parseUnits(amount, 18));
      await tx.wait();
      setStatus("Staking successful!");
      fetchFarmData();
    } catch (error) {
      console.error("Staking failed:", error);
      setStatus("Staking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeLP = async () => {
    if (!stakingContract || !amount) return;
    setLoading(true);
    try {
      const tx = await stakingContract.unstakeLP(ethers.parseUnits(amount, 18));
      await tx.wait();
      setStatus("Unstaking successful!");
      fetchFarmData();
    } catch (error) {
      console.error("Unstaking failed:", error);
      setStatus("Unstaking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!stakingContract) return;
    setLoading(true);
    try {
      const tx = await stakingContract.claimLPRewards();
      await tx.wait();
      setStatus("Rewards claimed successfully!");
      fetchFarmData();
    } catch (error) {
      console.error("Claiming rewards failed:", error);
      setStatus("Failed to claim rewards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="p-8 text-center">
	@@ -182,22 +230,22 @@ const YieldFarming = () => {
              />
              <div className="flex space-x-4 mt-4">
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  onClick={handleStakeLP}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Stake"}
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                  onClick={handleUnstakeLP}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Unstake"}
                </button>
              </div>
              <button
                className="w-full px-4 py-2 mt-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                onClick={handleClaimRewards}
                disabled={loading}
              >
                {loading ? "Processing..." : "Claim Rewards"}
              </button>
            </div>
          </div>
          {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
        </div>
      </div>
      <div className="mt-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">What are LP tokens?</h3>
            <p className="text-gray-700">
              LP tokens represent your share in a liquidity pool. You receive them when you provide liquidity to a decentralized exchange.
            </p>
          </div>
          <div>
            <h3 className="font-medium">How do I get LP tokens?</h3>
            <p className="text-gray-700">
              You can obtain LP tokens by providing an equal value of two tokens (e.g., IMALI and another token) to a liquidity pool on a decentralized exchange.
            </p>
          </div>
          <div>
            <h3 className="font-medium">What is APY?</h3>
            <p className="text-gray-700">
              APY (Annual Percentage Yield) is the rate of return earned on an investment over a year, taking into account the effect of compounding interest.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Is there a lock-up period?</h3>
            <p className="text-gray-700">
              No, there is no lock-up period. You can unstake your LP tokens at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default YieldFarming;
