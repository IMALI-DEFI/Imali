// src/components/AdminPanel.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { TatumSDK } from "@tatumio/tatum";
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
import { FaUsers, FaShareAlt, FaClock } from "react-icons/fa";

// Chart.js setup
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

const AdminPanel = () => {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // Owner Check
  useEffect(() => {
    const initAdmin = async () => {
      try {
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        setIsOwner(account?.toLowerCase() === owner.toLowerCase());
      } catch (error) {
        console.error("Admin initialization failed:", error);
      }
    };
    if (account) initAdmin();
  }, [account]);

  // Fetch Analytics from your API
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        const data = await res.json();

        const formatted = data.rows.map((row) => ({
          day: row.dimensionValues[0].value,
          value: Number(row.metricValues[0].value),
        }));

        setAnalyticsData(formatted);
        setChartData({
          labels: formatted.map((d) => d.day),
          datasets: [
            {
              label: "Active Users",
              data: formatted.map((d) => d.value),
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 2,
              tension: 0.4,
            },
          ],
        });
        setPrediction("📈 Traffic looks good!");
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
        setPrediction("❌ Failed to load analytics");
      }
    };
    fetchAnalytics();
  }, []);

  // Monitor Tatum NFT Tx (if available)
  useEffect(() => {
    const initTatum = async () => {
      if (!process.env.NEXT_PUBLIC_TATUM_API_KEY || !process.env.NEXT_PUBLIC_IMALI_NFT_CONTRACT) {
        console.warn("Tatum API key or NFT contract address missing, skipping Tatum connection.");
        return;
      }

      try {
        const tatum = await TatumSDK.init({ apiKey: process.env.NEXT_PUBLIC_TATUM_API_KEY });
        await tatum.notification.subscribe.incomingNftTx(
          process.env.NEXT_PUBLIC_IMALI_NFT_CONTRACT,
          (tx) => {
            console.log("Incoming NFT transaction:", tx);
          }
        );
      } catch (error) {
        console.error("Tatum subscription failed:", error);
      }
    };
    initTatum();
  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {chartData ? (
        <div className="mb-8 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FaUsers className="mr-2" /> Weekly User Analytics
          </h2>
          <Line data={chartData} />
          <p className="mt-2 text-green-700 font-semibold">{prediction}</p>
        </div>
      ) : (
        <p>Loading analytics...</p>
      )}

      {isOwner && (
        <div className="p-4 bg-white rounded shadow mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FaShareAlt className="mr-2" /> Admin Actions
          </h2>
          <p>Owner-only functions will be here (buyback, airdrop, liquidity ops, etc.)</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
