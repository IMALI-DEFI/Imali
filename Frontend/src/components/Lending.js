// src/components/Lending.js

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import { FaEthereum, FaCoins, FaPercentage } from "react-icons/fa";

const Lending = () => {
  const { account, connectWallet, chainId, provider, disconnectWallet } = useWallet();
  const [assetPrices, setAssetPrices] = useState({});
  const [lendingStats, setLendingStats] = useState({});
  const [loading, setLoading] = useState(false);

  const assets = [
    { symbol: "ETH", label: "Ethereum", icon: <FaEthereum size={28} /> },
    { symbol: "IMALI", label: "Imali Token", icon: <FaCoins size={28} /> },
    { symbol: "MATIC", label: "Polygon (Matic)", icon: <FaEthereum size={28} /> },
  ];

  const fetchAssetPrices = useCallback(async () => {
    try {
      const prices = {
        ETH: "3500",
        IMALI: "0.005",
        MATIC: "0.75"
      };
      setAssetPrices(prices);
    } catch (error) {
      console.error("Error fetching asset prices:", error);
    }
  }, []);

  const fetchLendingStats = useCallback(async () => {
    try {
      const contract = await getContractInstance("Lending");
      const liquidity = await contract.getLiquidity();
      const supplyRate = await contract.getSupplyRate();
      const borrowRate = await contract.getBorrowRate();

      setLendingStats({
        liquidity: ethers.formatEther(liquidity),
        supplyAPY: (Number(supplyRate) / 10000).toFixed(2),
        borrowAPY: (Number(borrowRate) / 10000).toFixed(2)
      });
    } catch (error) {
      console.error("Error fetching lending stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchAssetPrices();
    fetchLendingStats();
  }, [fetchAssetPrices, fetchLendingStats]);

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Connect Wallet to Start Lending</h2>
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">💸 Lending Dashboard</h1>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          Disconnect Wallet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.symbol} className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              {asset.icon}
              <div>
                <h2 className="text-lg font-bold">{asset.label}</h2>
                <p className="text-gray-500 text-sm">{asset.symbol}</p>
              </div>
            </div>

            <p className="text-gray-800 mb-2">💲 Price: ${assetPrices[asset.symbol] || "Loading..."}</p>
            <p className="text-gray-800 mb-2">🏦 Liquidity: {lendingStats.liquidity || "Loading..."} ETH</p>
            <p className="text-green-600 mb-2">📈 Supply APY: {lendingStats.supplyAPY || "Loading..."}%</p>
            <p className="text-red-600 mb-4">📉 Borrow APY: {lendingStats.borrowAPY || "Loading..."}%</p>

            <div className="flex flex-col gap-2">
              <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded">
                Deposit
              </button>
              <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded">
                Borrow
              </button>
              <button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded">
                Repay
              </button>
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
                Withdraw
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lending;
