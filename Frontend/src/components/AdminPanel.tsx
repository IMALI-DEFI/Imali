// src/components/AdminPanel.tsx
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from "../utils/getContractInstance";
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { TatumSDK } from '@tatumio/tatum';
import { FaRobot, FaCog, FaUserShield, FaUsers, FaShareAlt, FaClock } from "react-icons/fa";
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
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        setIsOwner(account?.toLowerCase() === owner.toLowerCase());
      } catch (e) {
        console.error("Admin check failed:", e);
      }
    };
    if (account) initAdmin();
  }, [account]);

  useEffect(() => {
    const fetchAnalytics = () => {
      const sample = Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, value: Math.random() * 100 }));
      setAnalyticsData(sample);
      setChartData({
        labels: sample.map(d => d.day),
        datasets: [{
          label: "User Engagement",
          data: sample.map(d => d.value),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1
        }]
      });
      setPrediction("Engagement likely to peak Friday @ 8PM");
    };
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const initTatumNotifications = async () => {
      try {
        const tatum = await TatumSDK.init({ apiKey: process.env.NEXT_PUBLIC_TATUM_API_KEY });
        await tatum.notification.subscribe.incomingNftTx(
          process.env.NEXT_PUBLIC_IMALI_NFT_CONTRACT,
          (tx) => {
            console.log('Incoming NFT transaction:', tx);
            // (Optional) Update dashboard analytics
          }
        );
      } catch (e) {
        console.error("Tatum subscription failed:", e);
      }
    };
    initTatumNotifications();
  }, []);

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      {/* Your dashboard UI (same as before) */}
    </div>
  );
};

export default AdminPanel;
