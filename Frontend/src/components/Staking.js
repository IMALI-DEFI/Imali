import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const Staking = () => {
  const {
    account,
    chainId,
    connectWallet,
    disconnectWallet,
    isConnecting,
    error,
  } = useWallet();

  const [contracts, setContracts] = useState({
    staking: null,
    imaliToken: null,
    lpToken: null
  });
  const [contractsInitialized, setContractsInitialized] = useState(false);
  const [balances, setBalances] = useState({
    imaliStaked: "0",
    imaliRewards: "0",
    lpStaked: "0",
    lpRewards: "0",
    walletImali: "0",
    walletLp: "0",
  });
  const [inputs, setInputs] = useState({
    imaliStake: "",
    lpStake: "",
    imaliUnstake: "",
    lpUnstake: "",
  });
  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState({
    stakeIMALI: false,
    stakeLP: false,
    unstakeIMALI: false,
    unstakeLP: false,
    claim: false,
  });
  const [estimates, setEstimates] = useState({
    imaliAPY: "12",
    lpAPY: "18",
    dailyRewards: "0",
    weeklyRewards: "0",
  });

    useEffect(() => {
        const initContracts = async () => {
            if (!account || !chainId) return;

            try {
                setStatus({ message: "Initializing contracts...", type: "info" });

                const staking = await getContractInstance("Staking", { chainId });
                const imaliToken = await getContractInstance("Token", { chainId }); // Corrected
                const lpToken = await getContractInstance("LPToken", { chainId }); // Corrected

                if (!staking || !imaliToken || !lpToken) {
                    throw new Error("Failed to initialize one or more contracts");
                }

                setContracts({ staking, imaliToken, lpToken });
                setContractsInitialized(true);
                setStatus({ message: "Contracts initialized successfully", type: "success" });
            } catch (err) {
                console.error("Contract initialization failed:", err);
                setStatus({
                    message: err.message.includes("Missing configuration")
                        ? "Staking not available on this network"
                        : "Failed to initialize contracts",
                    type: "error"
                });
                setContractsInitialized(false);
            }
        };

        initContracts();
    }, [account, chainId]);

  useEffect(() => {
    const fetchStakingData = async () => {
      if (!contractsInitialized || !contracts.staking || !account) return;
      
      try {
        const [imaliData, lpData, imaliBalance, lpBalance] = await Promise.all([
          contracts.staking.imaliStakers(account),
          contracts.staking.lpStakers(account),
          contracts.imaliToken.balanceOf(account),
          contracts.lpToken.balanceOf(account),
        ]);

        const newBalances = {
          imaliStaked: ethers.formatUnits(imaliData.amount, 18),
          imaliRewards: ethers.formatUnits(imaliData.rewards, 18),
          lpStaked: ethers.formatUnits(lpData.amount, 18),
          lpRewards: ethers.formatUnits(lpData.rewards, 18),
          walletImali: ethers.formatUnits(imaliBalance, 18),
          walletLp: ethers.formatUnits(lpBalance, 18),
        };

        const dailyImali = parseFloat(newBalances.imaliStaked) * 0.12 / 365;
        const dailyLp = parseFloat(newBalances.lpStaked) * 0.18 / 365;

        setBalances(newBalances);
        setEstimates({
          ...estimates,
          dailyRewards: (dailyImali + dailyLp).toFixed(6),
          weeklyRewards: ((dailyImali + dailyLp) * 7).toFixed(6),
        });
      } catch (err) {
        console.error("Failed to fetch staking data:", err);
        setStatus({ message: "Failed to fetch staking data", type: "error" });
      }
    };

    fetchStakingData();
    const interval = setInterval(fetchStakingData, 30000);
    return () => clearInterval(interval);
  }, [contracts, account, contractsInitialized]);

  const checkAndApprove = async (token, spender, amount) => {
    try {
      const allowance = await token.allowance(account, spender);
      if (allowance < amount) {
        setStatus({ message: "Approving tokens...", type: "info" });
        const tx = await token.approve(spender, amount);
        await tx.wait();
      }
    } catch (err) {
      console.error("Approval failed:", err);
      throw err;
    }
  };

  const handleTransaction = async (txFunction, args, loadingKey) => {
    try {
      setLoading(prev => ({ ...prev, [loadingKey]: true }));
      await contracts.staking.callStatic[txFunction](...args);
      const gasEstimate = await contracts.staking[txFunction].estimateGas(...args);
      const tx = await contracts.staking[txFunction](...args, { gasLimit: gasEstimate.mul(120).div(100) });
      await tx.wait();
      setStatus({ message: "Transaction confirmed!", type: "success" });
      return true;
    } catch (err) {
      const msg = err.reason || err.data?.message || err.message || "Transaction failed";
      setStatus({ message: msg, type: "error" });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleStake = async (tokenType, amount) => {
    if (!amount || isNaN(amount)) {
      setStatus({ message: "Please enter a valid amount", type: "error" });
      return;
    }

    const amountWei = ethers.parseUnits(amount, 18);
    const token = tokenType === "IMALI" ? contracts.imaliToken : contracts.lpToken;
    
    try {
      await checkAndApprove(token, contracts.staking.address, amountWei);
      const txFunc = tokenType === "IMALI" ? "stakeIMALI" : "stakeLP";
      const success = await handleTransaction(txFunc, [amountWei], `stake${tokenType}`);
      if (success) {
        setInputs(prev => ({ ...prev, [`${tokenType.toLowerCase()}Stake`]: "" }));
      }
    } catch (err) {
      console.error(`Staking ${tokenType} failed:`, err);
    }
  };

  const handleUnstake = async (tokenType, amount) => {
    if (!amount || isNaN(amount)) {
      setStatus({ message: "Please enter a valid amount", type: "error" });
      return;
    }

    const amountWei = ethers.parseUnits(amount, 18);
    const txFunc = tokenType === "IMALI" ? "unstakeIMALI" : "unstakeLP";
    
    try {
      const success = await handleTransaction(txFunc, [amountWei], `unstake${tokenType}`);
      if (success) {
        setInputs(prev => ({ ...prev, [`${tokenType.toLowerCase()}Unstake`]: "" }));
      }
    } catch (err) {
      console.error(`Unstaking ${tokenType} failed:`, err);
    }
  };

  const handleClaimRewards = async () => {
    try {
      await handleTransaction("claimRewards", [], "claim");
    } catch (err) {
      console.error("Claiming rewards failed:", err);
    }
  };

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">🔗 Connect Your Wallet</h2>
        <p className="text-gray-600 mb-4">
          To get started, please connect your wallet.
        </p>
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isConnecting ? "🔄 Connecting..." : "🔗 Connect Wallet"}
        </button>
        {error && <div className="mt-4 text-red-500 text-sm">⚠️ {error}</div>}
      </div>
    );
  }

  if (!contractsInitialized) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Loading Staking Dashboard</h2>
        <p className="text-gray-600 mb-4">
          {status.message || "Initializing staking contracts..."}
        </p>
        {status.type === "error" && (
          <button
            onClick={disconnectWallet}
            className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
          >
            Disconnect Wallet
          </button>
        )}
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

      {/* Wallet Connection Status */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div>
          ✅ Connected: <span className="font-mono text-green-700">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="mt-2 sm:mt-0 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect Wallet
        </button>
      </div>

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
  );
};

export default Staking;
