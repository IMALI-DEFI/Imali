import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";

const YieldFarming = () => {
  const { walletAddress, connectWallet, resetWallet } = useWallet();
  const [farmBalance, setFarmBalance] = useState("0");
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [apy, setApy] = useState("0");
  const [amount, setAmount] = useState("");
  const [stakingFee, setStakingFee] = useState("0");
  const [gasFee, setGasFee] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Format wallet address
  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "❌ Not connected";
  };

  // Fetch yield farming data from contract
    const fetchFarmData = async () => {
      try {
        if (!walletAddress) return;

        const contract = await getContractInstance("YieldFarming", "Polygon");
        if (!contract) {
          console.error("❌ Contract not found.");
          setError("❌ Contract not found.");
          return;
        }

        console.log("📡 Fetching data from contract:", contract.address);

        // Fix: Access `stakedLpTokens` as a property, not a function
        const staked = await contract.stakedLpTokens(walletAddress);
        const rewards = await contract.earned(walletAddress);
        const rewardRate = await contract.rewardRate();
        const totalStaked = await contract.totalStaked();
        const feePercentage = await contract.feePercentage();

        setFarmBalance(ethers.formatUnits(staked, 18));
        setEarnedRewards(ethers.formatUnits(rewards, 18));
        setStakingFee(feePercentage.toString());

        // Calculate APY
        const secondsInYear = 31536000;
        const totalStakedFloat = parseFloat(ethers.formatUnits(totalStaked, 18));
        if (totalStakedFloat > 0) {
          const apyValue =
            (parseFloat(ethers.formatUnits(rewardRate, 18)) * secondsInYear * 100) / totalStakedFloat;
          setApy(apyValue.toFixed(2));
        } else {
          setApy("0");
        }

        console.log("✅ Yield farm data fetched successfully.");
      } catch (err) {
        console.error("❌ Error fetching yield farm data:", err);
        setError("❌ Error fetching yield farm data.");
      }
    };

  // Stake tokens in the yield farm
    const stakeTokensInFarm = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        alert("❌ Please enter a valid amount.");
        return;
      }

      try {
        setLoading(true);

        const contract = await getContractInstance("YieldFarming", "Polygon");
        const lpToken = await getContractInstance("LPToken", "Polygon");

        if (!contract || !lpToken) {
          alert("❌ Contract not found.");
          setLoading(false);
          return;
        }

        const amountInWei = ethers.parseUnits(amount, 18);
        
        // Check LP Token Balance
        const balance = await lpToken.balanceOf(walletAddress);
        if (balance < amountInWei) {
          alert("❌ Insufficient LP token balance.");
          setLoading(false);
          return;
        }

        // Check Allowance
        const allowance = await lpToken.allowance(walletAddress, contract.address);
        if (allowance < amountInWei) {
          alert("🔄 Approving LP tokens...");

          const approveTx = await lpToken.approve(contract.address, amountInWei);
          await approveTx.wait();
          
          alert("✅ LP tokens approved.");
        }

        console.log(`📡 Staking ${amount} LP tokens...`);
        
        const tx = await contract.stake(amountInWei);
        await tx.wait();

        alert("✅ Tokens staked in yield farm!");
        fetchFarmData();
      } catch (err) {
        console.error("❌ Staking failed:", err);
        alert("❌ Staking failed. Check console for details.");
      } finally {
        setLoading(false);
      }
    };


  // Claim rewards from the yield farm
  const claimRewards = async () => {
    try {
      setLoading(true);
      const contract = await getContractInstance("YieldFarming", "Polygon");
      if (!contract) {
        alert("❌ Contract not found.");
        setLoading(false);
        return;
      }
      const tx = await contract.claimRewards();
      await tx.wait();
      alert("✅ Rewards claimed!");
      fetchFarmData();
    } catch (err) {
      console.error("❌ Failed to claim rewards:", err);
      alert("❌ Failed to claim rewards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchFarmData();
    }
  }, [walletAddress]);

  return (
    <section className="bg-gray-50 text-gray-900 py-12">
      <div className="container mx-auto px-4 bg-white shadow-md rounded-lg py-6">
        <h2 className="text-4xl font-extrabold text-center mb-4 text-[#036302]">💰 Yield Farming</h2>
        <p className="text-lg text-center text-black mb-6">
          Yield farming allows you to earn additional tokens by staking your tokens in a pool.
          Connect your wallet, stake tokens, and claim your rewards.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Farm Balance */}
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-2xl mb-2 text-gray-600">Farm Balance</h3>
            <p className="text-3xl font-bold text-[#036302]">{farmBalance} Tokens</p>
          </div>

          {/* Earned Rewards */}
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-2xl mb-2 text-gray-600">Earned Rewards</h3>
            <p className="text-3xl font-bold text-blue-600">{earnedRewards} Tokens</p>
          </div>

          {/* APY */}
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-2xl mb-2 text-gray-600">APY (Annual Yield)</h3>
            <p className="text-3xl font-bold text-purple-600">{apy}%</p>
          </div>

          {/* Connected Wallet */}
          <div className="bg-white shadow-md rounded-lg p-6 text-center">
            <h3 className="font-bold text-2xl mb-2 text-[#036302]">🔗 Connected Wallet</h3>
            <p className="text-lg font-semibold text-gray-900">
              {walletAddress ? formatAddress(walletAddress) : "❌ Not connected"}
            </p>
            <div className="mt-4 flex flex-col space-y-2">
              {!walletAddress ? (
                <button
                  className="px-4 py-2 w-auto bg-[#036302] text-white font-semibold text-base rounded-lg hover:bg-[#FFFF00] transition"
                  onClick={connectWallet}
                >
                  🚀 Connect Wallet
                </button>
              ) : (
                <>
                  <button
                    className="px-4 py-2 w-auto bg-[#036302] text-white font-semibold text-base rounded-lg hover:bg-[#FFFF00] transition"
                    onClick={() => alert("Wallet is already connected")}
                  >
                    🚀 Connected
                  </button>
                  <button
                    className="px-4 py-2 w-auto bg-red-600 text-white font-semibold text-base rounded-lg hover:bg-red-700 transition"
                    onClick={resetWallet}
                  >
                    🧹 Reset Wallet
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stake and Claim Section */}
        <div className="mt-8 flex flex-col items-center justify-center text-center">
          <div className="p-6 border border-gray-300 rounded-md w-auto">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md w-auto text-center"
              placeholder="Enter amount to stake"
            />
          </div>
          <div className="mt-4 flex flex-col items-center space-y-2">
            <button
              onClick={stakeTokensInFarm}
              className="px-4 py-2 w-auto bg-red-600 text-white font-semibold text-base rounded-lg hover:bg-red-700 transition"
              disabled={loading}
            >
              {loading ? "Processing..." : "Stake in Farm"}
            </button>
            <button
              onClick={claimRewards}
              className="px-4 py-2 w-auto bg-blue-600 text-white font-semibold text-base rounded-lg hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? "Processing..." : "Claim Rewards"}
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="mt-8 bg-gray-100 p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold text-gray-800">📝 How to Use Yield Farming</h3>
          <ol className="list-decimal list-inside text-lg text-gray-700 mt-4 space-y-2">
            <li>
              <strong>Connect Wallet:</strong> Click the "Connect Wallet" button above to link your MetaMask wallet.
            </li>
            <li>
              <strong>Select Network:</strong> Ensure you are connected to the Polygon network in MetaMask.
            </li>
            <li>
              <strong>Buy Tokens:</strong> Purchase tokens from an exchange and transfer them to your wallet.
            </li>
            <li>
              <strong>Stake Tokens:</strong> Enter the amount you wish to stake and click "Stake in Farm."
            </li>
            <li>
              <strong>Claim Rewards:</strong> Once rewards accumulate, click "Claim Rewards" to receive them.
            </li>
            <li>
              <strong>Fees:</strong> A fee of {stakingFee}% is applied on staking, plus gas fees for each transaction.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
};

export default YieldFarming;
