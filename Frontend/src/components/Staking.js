import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import getContractInstance from "../getContractInstance";
import { FaInfoCircle, FaQuestionCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const Staking = () => {
  const { account, chainId } = useWallet();
  const [contracts, setContracts] = useState({
    staking: null,
    imaliToken: null,
    lpToken: null
  });
  const [balances, setBalances] = useState({
    imaliStaked: "0",
    imaliRewards: "0",
    lpStaked: "0",
    lpRewards: "0",
    walletImali: "0",
    walletLp: "0"
  });
  const [inputs, setInputs] = useState({
    imaliStake: "",
    lpStake: "",
    imaliUnstake: "",
    lpUnstake: ""
  });
  const [status, setStatus] = useState({
    message: "",
    type: "" // 'success', 'error', 'info'
  });
  const [loading, setLoading] = useState({
    stakeIMALI: false,
    stakeLP: false,
    unstakeIMALI: false,
    unstakeLP: false,
    claim: false
  });
  const [estimates, setEstimates] = useState({
    imaliAPY: "12",
    lpAPY: "18",
    dailyRewards: "0",
    weeklyRewards: "0"
  });

  // Initialize contracts
  useEffect(() => {
    const initContracts = async () => {
      if (!account || !chainId) return;
      
      try {
        const staking = await getContractInstance("Staking", chainId);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const imaliTokenAddress = await staking.imaliToken();
        const lpTokenAddress = await staking.lpToken();
        
        const imaliToken = new ethers.Contract(
          imaliTokenAddress,
          [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address,uint256) returns (bool)",
            "function allowance(address,address) view returns (uint256)"
          ],
          signer
        );
        
        const lpToken = new ethers.Contract(
          lpTokenAddress,
          [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address,uint256) returns (bool)",
            "function allowance(address,address) view returns (uint256)"
          ],
          signer
        );

        setContracts({ staking, imaliToken, lpToken });
        setStatus({ message: "Contracts initialized", type: "success" });
      } catch (error) {
        console.error("Contract initialization failed:", error);
        setStatus({
          message: "Failed to initialize contracts",
          type: "error"
        });
      }
    };

    initContracts();
  }, [account, chainId]);

  // Fetch all staking data
  const fetchStakingData = async () => {
    if (!contracts.staking || !account) return;

    try {
      const [
        imaliData,
        lpData,
        imaliBalance,
        lpBalance
      ] = await Promise.all([
        contracts.staking.imaliStakers(account),
        contracts.staking.lpStakers(account),
        contracts.imaliToken.balanceOf(account),
        contracts.lpToken.balanceOf(account)
      ]);

      setBalances({
        imaliStaked: ethers.formatUnits(imaliData.amount, 18),
        imaliRewards: ethers.formatUnits(imaliData.rewards, 18),
        lpStaked: ethers.formatUnits(lpData.amount, 18),
        lpRewards: ethers.formatUnits(lpData.rewards, 18),
        walletImali: ethers.formatUnits(imaliBalance, 18),
        walletLp: ethers.formatUnits(lpBalance, 18)
      });

      // Calculate estimated rewards
      const dailyImali = parseFloat(balances.imaliStaked) * 0.12 / 365;
      const dailyLp = parseFloat(balances.lpStaked) * 0.18 / 365;
      
      setEstimates({
        ...estimates,
        dailyRewards: (dailyImali + dailyLp).toFixed(6),
        weeklyRewards: ((dailyImali + dailyLp) * 7).toFixed(6)
      });

    } catch (error) {
      console.error("Failed to fetch staking data:", error);
      setStatus({
        message: "Failed to fetch staking data",
        type: "error"
      });
    }
  };

  // Refresh data periodically
  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 30000);
    return () => clearInterval(interval);
  }, [contracts.staking, account]);

  // Handle token approvals
  const checkAndApprove = async (token, spender, amount) => {
    const allowance = await token.allowance(account, spender);
    if (allowance < amount) {
      setStatus({ message: "Approving tokens...", type: "info" });
      const approveTx = await token.approve(spender, amount);
      await approveTx.wait();
    }
  };

  // Enhanced transaction handler
  const handleTransaction = async (txFunction, args, loadingKey) => {
    if (!contracts.staking) return;

    try {
      setLoading({ ...loading, [loadingKey]: true });
      
      // Simulate first
      await contracts.staking.callStatic[txFunction](...args);
      
      // Estimate gas
      const gasEstimate = await contracts.staking[txFunction].estimateGas(...args);
      
      // Execute with buffer
      const tx = await contracts.staking[txFunction](...args, {
        gasLimit: gasEstimate.mul(120).div(100)
      });
      
      setStatus({
        message: "Transaction submitted...",
        type: "info"
      });
      
      const receipt = await tx.wait();
      setStatus({
        message: "Transaction confirmed!",
        type: "success"
      });
      
      fetchStakingData();
      return receipt;
    } catch (error) {
      let errorMessage = "Transaction failed";
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }
      
      setStatus({
        message: errorMessage,
        type: "error"
      });
      throw error;
    } finally {
      setLoading({ ...loading, [loadingKey]: false });
    }
  };

  // Staking handlers
  const handleStake = async (tokenType, amount) => {
    const amountWei = ethers.parseUnits(amount, 18);
    const token = tokenType === "IMALI" ? contracts.imaliToken : contracts.lpToken;
    
    try {
      await checkAndApprove(token, contracts.staking.address, amountWei);
      const txFunction = tokenType === "IMALI" ? "stakeIMALI" : "stakeLP";
      await handleTransaction(txFunction, [amountWei], `stake${tokenType}`);
      
      setInputs({ ...inputs, [`${tokenType.toLowerCase()}Stake`]: "" });
    } catch (error) {
      console.error(`Staking ${tokenType} failed:`, error);
    }
  };

  // Unstaking handlers
  const handleUnstake = async (tokenType, amount) => {
    const amountWei = ethers.parseUnits(amount, 18);
    const txFunction = tokenType === "IMALI" ? "unstakeIMALI" : "unstakeLP";
    
    try {
      await handleTransaction(txFunction, [amountWei], `unstake${tokenType}`);
      setInputs({ ...inputs, [`${tokenType.toLowerCase()}Unstake`]: "" });
    } catch (error) {
      console.error(`Unstaking ${tokenType} failed:`, error);
    }
  };

  // Claim rewards
  const handleClaimRewards = async () => {
    try {
      await handleTransaction("claimRewards", [], "claim");
    } catch (error) {
      console.error("Claiming rewards failed:", error);
    }
  };

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
        <p className="text-gray-600">
          Please connect your wallet to access the staking platform
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Status Messages */}
      {status.message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center ${
          status.type === "success" ? "bg-green-100 text-green-800" :
          status.type === "error" ? "bg-red-100 text-red-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {status.type === "success" ? (
            <FaCheckCircle className="mr-2" />
          ) : (
            <FaExclamationTriangle className="mr-2" />
          )}
          {status.message}
        </div>
      )}

      {/* Dashboard Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">
          Staking Dashboard
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Earn passive income by staking your tokens
        </p>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* IMALI Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">
              IMALI Staking
            </h3>
            <div className="space-y-2">
              <p className="flex justify-between">
                <span className="font-medium">Staked:</span>
                <span>{balances.imaliStaked} IMALI</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Rewards:</span>
                <span className="text-green-600">{balances.imaliRewards} IMALI</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Wallet:</span>
                <span>{balances.walletImali} IMALI</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">APY:</span>
                <span className="font-bold">{estimates.imaliAPY}%</span>
              </p>
            </div>
          </div>

          {/* LP Stats */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <h3 className="text-xl font-semibold mb-3 text-purple-800">
              LP Token Staking
            </h3>
            <div className="space-y-2">
              <p className="flex justify-between">
                <span className="font-medium">Staked:</span>
                <span>{balances.lpStaked} LP</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Rewards:</span>
                <span className="text-green-600">{balances.lpRewards} LP</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">Wallet:</span>
                <span>{balances.walletLp} LP</span>
              </p>
              <p className="flex justify-between">
                <span className="font-medium">APY:</span>
                <span className="font-bold">{estimates.lpAPY}%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Reward Estimates */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Estimated Rewards
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="flex justify-between">
                <span>Daily:</span>
                <span className="font-medium">{estimates.dailyRewards} Tokens</span>
              </p>
            </div>
            <div>
              <p className="flex justify-between">
                <span>Weekly:</span>
                <span className="font-medium">{estimates.weeklyRewards} Tokens</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Panels */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* IMALI Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">IMALI Actions</h2>
            
            <div className="space-y-4">
              {/* Stake IMALI */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Amount to Stake
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={inputs.imaliStake}
                    onChange={(e) => setInputs({...inputs, imaliStake: e.target.value})}
                    className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleStake("IMALI", inputs.imaliStake)}
                    disabled={loading.stakeIMALI || !inputs.imaliStake}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg disabled:opacity-50"
                  >
                    {loading.stakeIMALI ? "Staking..." : "Stake"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available: {balances.walletImali} IMALI
                </p>
              </div>

              {/* Unstake IMALI */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Amount to Unstake
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={inputs.imaliUnstake}
                    onChange={(e) => setInputs({...inputs, imaliUnstake: e.target.value})}
                    className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleUnstake("IMALI", inputs.imaliUnstake)}
                    disabled={loading.unstakeIMALI || !inputs.imaliUnstake}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-r-lg disabled:opacity-50"
                  >
                    {loading.unstakeIMALI ? "Unstaking..." : "Unstake"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Staked: {balances.imaliStaked} IMALI
                </p>
              </div>
            </div>
          </div>

          {/* LP Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">LP Token Actions</h2>
            
            <div className="space-y-4">
              {/* Stake LP */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Amount to Stake
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={inputs.lpStake}
                    onChange={(e) => setInputs({...inputs, lpStake: e.target.value})}
                    className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleStake("LP", inputs.lpStake)}
                    disabled={loading.stakeLP || !inputs.lpStake}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg disabled:opacity-50"
                  >
                    {loading.stakeLP ? "Staking..." : "Stake"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available: {balances.walletLp} LP
                </p>
              </div>

              {/* Unstake LP */}
              <div>
                <label className="block mb-2 font-medium text-gray-700">
                  Amount to Unstake
                </label>
                <div className="flex">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={inputs.lpUnstake}
                    onChange={(e) => setInputs({...inputs, lpUnstake: e.target.value})}
                    className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleUnstake("LP", inputs.lpUnstake)}
                    disabled={loading.unstakeLP || !inputs.lpUnstake}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 rounded-r-lg disabled:opacity-50"
                  >
                    {loading.unstakeLP ? "Unstaking..." : "Unstake"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Staked: {balances.lpStaked} LP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Rewards */}
        <div className="mt-8 text-center">
          <button
            onClick={handleClaimRewards}
            disabled={loading.claim ||
              (Number(balances.imaliRewards) <= 0 && Number(balances.lpRewards) <= 0)}
            className={`px-6 py-3 rounded-lg font-medium text-lg ${
              (Number(balances.imaliRewards) > 0 || Number(balances.lpRewards) > 0) ?
              "bg-green-600 hover:bg-green-700 text-white" :
              "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading.claim ? "Processing..." : "💰 Claim All Rewards"}
          </button>
          <p className="mt-2 text-sm text-gray-600">
            Total rewards: {Number(balances.imaliRewards) + Number(balances.lpRewards)} Tokens
          </p>
        </div>

        {/* Educational Section */}
        <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaInfoCircle className="mr-2 text-blue-500" />
            Staking Guide
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">How Staking Works</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Stake tokens to earn passive rewards</li>
                <li>Rewards compound automatically</li>
                <li>No lock-in period - unstake anytime</li>
                <li>Higher APY for longer staking periods</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Getting LP Tokens</h3>
              <p className="text-gray-700 mb-3">
                LP tokens represent your share in our liquidity pool. You get them when you:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                <li>Provide equal value of two tokens</li>
                <li>Add liquidity to our DEX</li>
                <li>Receive LP tokens in return</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staking;
