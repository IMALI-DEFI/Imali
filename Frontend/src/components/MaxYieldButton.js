import React, { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { FaBolt, FaCoins } from "react-icons/fa";

const MaxYieldButton = () => {
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  const handleMaxYield = async () => {
    if (!account || !amount) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would:
      // 1. Swap ETH to IMALI via router
      // 2. Stake IMALI in staking contract
      // 3. All in one transaction using a multicall or similar
      alert(`Max Yield action would swap and stake ${amount} ETH`);
      setAmount("");
    } catch (err) {
      console.error("Max Yield failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-3 flex items-center">
        <FaBolt className="mr-2 text-yellow-500" />
        Max Yield Button
      </h2>
      
      <p className="text-gray-600 mb-4">
        Automatically swap and stake in one click for maximum yield.
      </p>
      
      <div className="flex mb-4">
        <input
          type="number"
          placeholder="ETH amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 p-3 border rounded-l-lg"
        />
        <button
          onClick={() => setAmount("0.1")}
          className="px-3 bg-gray-200 border-t border-b border-r border-gray-300"
        >
          0.1
        </button>
        <button
          onClick={() => setAmount("0.5")}
          className="px-3 bg-gray-200 border-t border-b border-r border-gray-300"
        >
          0.5
        </button>
        <button
          onClick={() => setAmount("1")}
          className="px-3 bg-gray-200 border-t border-b border-r border-gray-300 rounded-r-lg"
        >
          MAX
        </button>
      </div>
      
      <button
        onClick={handleMaxYield}
        disabled={loading || !amount}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
          !loading && amount
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        {loading ? (
          "Processing..."
        ) : (
          <>
            <FaCoins className="mr-2" />
            Max Yield (Swap + Stake)
          </>
        )}
      </button>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
        <p className="font-semibold text-blue-800">Estimated Outcome:</p>
        <p className="mt-1">
          Swap {amount || "0"} ETH → {amount ? (parseFloat(amount) * 1000).toFixed(2) : "0"} IMALI
        </p>
        <p>
          Stake at {amount ? "15.5" : "0"}% APY
        </p>
      </div>
    </div>
  );
};

export default MaxYieldButton;