// src/components/AdminPanel.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import {
  FaUsers, FaShareAlt, FaRobot, FaCog, FaClock, FaWallet
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

// Chart.js setup
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

const AdminPanel = () => {
  const { account, connectWallet } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  // Owner Check
  useEffect(() => {
    const initAdmin = async () => {
      if (!account) return;
      try {
        const lendingContract = await getContractInstance("Lending");
        const ownerAddress = await lendingContract.owner();
        console.log("Contract owner:", ownerAddress);
        console.log("Connected account:", account);
        setIsOwner(account.toLowerCase() === ownerAddress.toLowerCase());
      } catch (error) {
        console.error("Owner check failed:", error);
        setIsOwner(false);
      }
    };
    initAdmin();
  }, [account]);

  // Fetch Analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/analytics");
        if (!response.ok) throw new Error("Failed to fetch GA analytics");

        const data = await response.json();
        const formatted = data.rows.map((row) => ({
          day: row.dimensionValues[0].value,
          value: Number(row.metricValues[0].value),
        }));

        setAnalyticsData(formatted);
        setChartData({
          labels: formatted.map((d) => d.day),
          datasets: [{
            label: "User Engagement",
            data: formatted.map((d) => d.value),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
            tension: 0.4,
          }],
        });
        setPrediction("📈 Traffic is trending upward!");
      } catch (error) {
        console.error("Analytics fetch failed:", error);
        setAnalyticsError("Unable to load Google Analytics data.");
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Smart Contract Admin Functions
  const handleBuyback = async () => {
    try {
      const contract = await getContractInstance("Buyback");
      const tx = await contract.distribute();
      await tx.wait();
      alert("✅ Buyback distributed successfully.");
    } catch (err) {
      alert("❌ Buyback failed: " + err.message);
    }
  };

  const handleAirdrop = async () => {
    try {
      const contract = await getContractInstance("AirdropDistributor");
      const tx = await contract.executeAirdrop();
      await tx.wait();
      alert("✅ Airdrop executed successfully.");
    } catch (err) {
      alert("❌ Airdrop failed: " + err.message);
    }
  };

  const handleLiquidity = async () => {
    try {
      const contract = await getContractInstance("LiquidityManager");
      const tx = await contract.addLiquidity();
      await tx.wait();
      alert("✅ Liquidity added to pool.");
    } catch (err) {
      alert("❌ Liquidity addition failed: " + err.message);
    }
  };

  // Shorten Address Helper
  const shortenAddress = (address) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 rounded-md shadow-md">
      <h1 className="text-3xl font-bold mb-8 text-green-800">Admin Dashboard</h1>

      {/* Connected Wallet Info */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between mb-8">
        {account ? (
          <>
            <div className="flex items-center space-x-4">
              <FaWallet className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-gray-600">Connected Wallet</p>
                <p className="font-bold text-green-700">{shortenAddress(account)}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${isOwner ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {isOwner ? "Owner Access ✅" : "Unauthorized ⚠️"}
            </div>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Unauthorized Alert */}
      {account && !isOwner && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-6">
          ⚠️ You are connected but not authorized to use admin functions.
        </div>
      )}

      {/* Smart Contract Admin Tools */}
      {account && isOwner && (
        <section className="mb-10 bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <FaRobot className="mr-2" /> Smart Contract Controls
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleBuyback}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded"
            >
              🔥 Trigger Buyback
            </button>
            <button
              onClick={handleAirdrop}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded"
            >
              🎁 Execute Airdrop
            </button>
            <button
              onClick={handleLiquidity}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded"
            >
              💧 Add Liquidity
            </button>
          </div>
        </section>
      )}

      {/* Analytics */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <FaUsers className="mr-2" /> Weekly User Analytics
        </h2>
        {loadingAnalytics ? (
          <p>Loading analytics...</p>
        ) : analyticsError ? (
          <p className="text-red-600">{analyticsError}</p>
        ) : (
          <>
            {chartData && <Line data={chartData} />}
            <p className="mt-4 text-green-700 font-semibold">{prediction}</p>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminPanel;
