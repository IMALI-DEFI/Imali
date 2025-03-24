import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaInfoCircle, FaQuestionCircle, FaCoins, FaWallet, FaPercentage } from "react-icons/fa";

const YieldFarming = () => {
  const { account, chainId } = useWallet();
  const [stakingContract, setStakingContract] = useState(null);
  const [farmBalance, setFarmBalance] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState(0);
  const [apy, setApy] = useState(0);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(""); // Use status for user feedback
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

  const fetchFarmData = async () => {
    if (!stakingContract || !account) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // Fetch LP staker info
      const stakedLPData = await stakingContract.lpStakers(account);
      setEarnedRewards(ethers.formatUnits(stakedLPData.rewards, 18));

      // Fetch LP token balance of staking contract.  This is the total amount of LP tokens that have been staked with the contract.
      const lpTokenAddress = await stakingContract.lpToken();
      const lpTokenContract = new ethers.Contract(lpTokenAddress, ["function balanceOf(address) view returns (uint256)"], signer);
      const stakedLPToken = await lpTokenContract.balanceOf(await stakingContract.getAddress());
      setFarmBalance(ethers.formatUnits(stakedLPToken, 18));

      //get user LP balance
      const userLpBalance = await lpTokenContract.balanceOf(account);
      setLpBalance(ethers.formatUnits(userLpBalance, 18));

      // Fetch LP reward rate
      const rewardRate = await stakingContract.lpRewardRate();

      // Calculate APY (Annual Percentage Yield)
      const stakedTotal = parseFloat(ethers.formatUnits(stakedLPToken, 18));
      const rateNum = parseFloat(ethers.formatUnits(rewardRate, 18));
      const secondsInYear = 31536000; // Number of seconds in a year
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

  const handleStakeLP = async () => {
    if (!stakingContract || !amount) {
      setStatus("Please enter amount to stake.");
      return;
    }

    const amountInWei = ethers.parseUnits(amount, 18);
     if (Number(amount) > Number(lpBalance)) {
      setStatus("Insufficient LP balance.");
      return;
    }

    setLoading(true);
    try {
      const signer = await (new ethers.BrowserProvider(window.ethereum)).getSigner();
      const lpTokenAddress = await stakingContract.lpToken();
      const lpTokenContract = new ethers.Contract(lpTokenAddress, ["function allowance(address,address) view returns (uint256)", "function approve(address,uint256) external returns (bool)", "function balanceOf(address) view returns (uint256)"], signer);
      const stakingContractAddress = await stakingContract.getAddress();

      // Check the allowance
      const allowance = await lpTokenContract.allowance(account, stakingContractAddress);
      if (ethers.toBigInt(allowance) < ethers.toBigInt(amountInWei)) {
        // Approve the staking contract to spend the user's LP tokens
        setStatus("Approving LP tokens...");
        const approveTx = await lpTokenContract.approve(stakingContractAddress, amountInWei);
        await approveTx.wait();
        setStatus("LP Token approval confirmed.");
      }

      setStatus("Staking LP tokens...");
      const tx = await stakingContract.stakeLP(amountInWei);
      await tx.wait();
      setStatus("LP Tokens Staked!");
      setAmount(""); // Clear input
      fetchFarmData(); // Refresh data
    } catch (error) {
      console.error("Failed to stake LP tokens:", error);
      setStatus(`Failed to stake: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstakeLP = async () => {
    if (!stakingContract || !amount) {
      setStatus("Please enter amount to unstake.");
      return;
    }
    const amountInWei = ethers.parseUnits(amount, 18);
    setLoading(true);
    try {
      setStatus("Unstaking LP Tokens...");
      const tx = await stakingContract.unstakeLP(amountInWei);
      await tx.wait();
      setStatus("LP Tokens Unstaked!");
      setAmount("");
      fetchFarmData();
    } catch (error) {
      console.error("Failed to unstake LP tokens:", error);
      setStatus(`Failed to unstake: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!stakingContract) return;
    setLoading(true);
    try {
      setStatus("Claiming Rewards...");
      const tx = await stakingContract.claimRewards();
      await tx.wait();
      setStatus("Rewards Claimed!");
      fetchFarmData();
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      setStatus(`Failed to claim rewards: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return <div className="p-4">Please connect your wallet.</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
          Yield Farming
        </h1>

        {/* Educational Section */}
        <div className="bg-blue-50 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            What is Yield Farming?
          </h2>
          <p className="mb-4">
            Yield farming is a way to earn more cryptocurrency with your existing
            crypto.  It involves providing liquidity to decentralized exchanges (DEXes)
            by staking LP tokens and earning rewards.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2">💰 Earn Rewards</h3>
              <p>
                Stake your LP tokens and earn additional tokens as rewards.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2">🔄 Provide Liquidity</h3>
              <p>
                Yield farming helps maintain liquidity in the decentralized
                exchange.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2">📈 Potential for High Returns</h3>
              <p>
                APY can be higher compared to traditional savings accounts.
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3 flex items-center">
            <FaQuestionCircle className="mr-2 text-blue-500" />
            How to Get Started
          </h3>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li className="font-medium">
              Connect your wallet.
            </li>
            <li className="font-medium">
              Obtain LP tokens by providing liquidity.
            </li>
            <li className="font-medium">
              Stake your LP tokens in the farm.
            </li>
            <li className="font-medium">
              Earn rewards over time.
            </li>
            <li className="font-medium">
              Claim your rewards.
            </li>
          </ol>
        </div>

        {/* Current Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Yield Farming Dashboard</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Your Farm</h3>
              <p>
                <FaCoins className="inline mr-1" /> Staked LP Tokens: {farmBalance}
              </p>
              <p>
                <FaWallet className="inline mr-1" /> Earned Rewards: {earnedRewards}
              </p>
              <p>
                <FaPercentage className="inline mr-1" /> APY: {apy}%
              </p>
               <p>
                💰 <span className="font-semibold">Your LP Balance:</span> {lpBalance} LP
              </p>
            </div>
          </div>
        </div>

        {/* Staking Actions */}
        <div className="grid md:grid-cols-1 gap-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Stake/Unstake LP Tokens</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">
                  Amount (LP Tokens)
                </label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
                <div className="flex space-x-4 mt-4">
                  <button
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                    onClick={handleStakeLP}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Stake"}
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium"
                    onClick={handleUnstakeLP}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Unstake"}
                  </button>
                </div>
                <button
                  className="w-full px-4 py-2 mt-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
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

        {/* FAQ Section */}
        <div className="mt-12 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">What are LP tokens?</h3>
              <p className="text-gray-700">
                LP tokens represent your share in a liquidity pool.  You receive them when you provide liquidity to a decentralized exchange.
              </p>
            </div>
            <div>
              <h3 className="font-medium">How do I get LP tokens?</h3>
              <p className="text-gray-700">
                You can obtain LP tokens by providing an equal value of two tokens
                (e.g., IMALI and another token) to a liquidity pool on a
                decentralized exchange.
              </p>
            </div>
            <div>
              <h3 className="font-medium">What is APY?</h3>
              <p className="text-gray-700">
                APY (Annual Percentage Yield) is the rate of return earned on an
                investment over a year, taking into account the effect of
                compounding interest.
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
    </div>
  );
};

export default YieldFarming;