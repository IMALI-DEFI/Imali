import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import { FaRecycle, FaChartLine, FaPercentage, FaExchangeAlt } from "react-icons/fa";

const BuybackDashboard = () => {
  const { account, chainId } = useWallet();
  const [buybackContract, setBuybackContract] = useState(null);
  const [buybackData, setBuybackData] = useState({
    totalDistributed: "0",
    lastBuyback: "0",
    treasuryShare: 60,
    teamShare: 20,
    buybackShare: 20,
    nextDistribution: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initContracts = async () => {
      if (!account || !chainId) return;
      
      const buyback = await getContractInstance("Buyback", { chainId });
      setBuybackContract(buyback);
      
      // Fetch initial data
      const [treasuryShare, teamShare, buybackShare, lastDistribution] = await Promise.all([
        buyback.treasuryShare(),
        buyback.teamShare(),
        buyback.buybackShare(),
        buyback.lastDistribution()
      ]);
      
      // These would come from events or a separate tracking system
      setBuybackData({
        totalDistributed: "12500",
        lastBuyback: "2500",
        treasuryShare: treasuryShare.toNumber(),
        teamShare: teamShare.toNumber(),
        buybackShare: buybackShare.toNumber(),
        nextDistribution: (lastDistribution.toNumber() + 86400) * 1000 // Next day in ms
      });
    };

    initContracts();
  }, [account, chainId]);

  const triggerDistribution = async () => {
    if (!buybackContract) return;
    
    setLoading(true);
    try {
      const tx = await buybackContract.distribute();
      await tx.wait();
      
      // Refresh data
      const lastDistribution = await buybackContract.lastDistribution();
      setBuybackData(prev => ({
        ...prev,
        nextDistribution: (lastDistribution.toNumber() + 86400) * 1000
      }));
    } catch (err) {
      console.error("Distribution failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-green-600 flex justify-center items-center">
          <FaRecycle className="mr-3" />
          Buyback & Distribution System
        </h1>
        
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
            <h3 className="text-xl font-semibold mb-3 text-green-800">
              Total Distributed
            </h3>
            <p className="text-2xl font-bold text-center">
              {buybackData.totalDistributed} IMALI
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">
              Last Buyback
            </h3>
            <p className="text-2xl font-bold text-center">
              {buybackData.lastBuyback} IMALI
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <h3 className="text-xl font-semibold mb-3 text-purple-800">
              Next Distribution
            </h3>
            <p className="text-xl text-center">
              {buybackData.nextDistribution ? (
                new Date(buybackData.nextDistribution).toLocaleString()
              ) : (
                "Loading..."
              )}
            </p>
          </div>
        </div>
        
        {/* Distribution Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaPercentage className="mr-2 text-purple-500" />
            Distribution Shares
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Treasury</h3>
              <div className="h-4 w-full bg-gray-200 rounded-full">
                <div 
                  className="h-4 bg-blue-600 rounded-full" 
                  style={{ width: `${buybackData.treasuryShare}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 font-bold">
                {buybackData.treasuryShare}%
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Team</h3>
              <div className="h-4 w-full bg-gray-200 rounded-full">
                <div 
                  className="h-4 bg-green-600 rounded-full" 
                  style={{ width: `${buybackData.teamShare}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 font-bold">
                {buybackData.teamShare}%
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">Buyback</h3>
              <div className="h-4 w-full bg-gray-200 rounded-full">
                <div 
                  className="h-4 bg-purple-600 rounded-full" 
                  style={{ width: `${buybackData.buybackShare}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 font-bold">
                {buybackData.buybackShare}%
              </p>
            </div>
          </div>
        </div>
        
        {/* Distribution Action */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold mb-3 text-yellow-800 flex items-center">
            <FaExchangeAlt className="mr-2" />
            Manual Distribution
          </h3>
          <p className="mb-4">
            The system automatically distributes daily, but you can trigger it manually if needed.
          </p>
          <button
            onClick={triggerDistribution}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium ${
              !loading
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Processing...' : 'Trigger Distribution'}
          </button>
        </div>
        
        {/* Buyback Impact */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3 flex items-center">
              <FaChartLine className="mr-2 text-green-500" />
              Buyback Impact
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>20% of rewards are used for buybacks</li>
              <li>Creates constant buy pressure on IMALI</li>
              <li>Reduces circulating supply</li>
              <li>Stabilizes token price during downturns</li>
            </ul>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3 flex items-center">
              <FaRecycle className="mr-2 text-blue-500" />
              Sustainability
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>60% to treasury for development</li>
              <li>20% to team for operations</li>
              <li>20% buyback creates deflationary pressure</li>
              <li>Daily distributions ensure steady growth</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuybackDashboard;