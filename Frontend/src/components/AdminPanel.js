import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { saveCSVFile } from '../utils/file-saver';
import {
  FaRobot, FaUsers, FaShareAlt, FaClock,
  FaTwitter, FaFacebook, FaLinkedin, FaCoins,
  FaDownload, FaChartLine, FaPercentage, FaHourglassHalf
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Title, Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title, Filler);

const AdminPanel = () => {
  const { account, provider } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  const logDebug = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] [${type}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), formatted]);
    if (type === "ERROR") console.error(formatted, data);
    else if (type === "WARN") console.warn(formatted, data);
    else console.log(formatted, data);
  };

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        setIsOwner(account && account.toLowerCase() === owner.toLowerCase());
        logDebug("INFO", "Admin status verified");
      } catch (err) {
        logDebug("ERROR", "Admin check failed", err);
      }
    };

    const fetchGAData = async () => {
      try {
        logDebug("INFO", "Fetching Google Analytics data...");
        const mockData = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
          activeUsers: Math.floor(Math.random() * 100) + 50,
          bounceRate: Math.random() * 100,
          avgSession: Math.random() * 300
        }));

        setAnalyticsData(mockData);
        generateChartData(mockData);
        generatePrediction(mockData);
        logDebug("INFO", "Analytics data loaded");
      } catch (err) {
        logDebug("WARN", "Failed to load analytics", err);
      }
    };

    if (account) {
      initAdmin();
      fetchGAData();
    }
  }, [account]);

  const generateChartData = (data) => {
    setChartData({
      labels: data.map(d => d.date),
      datasets: [
        {
          label: "Active Users",
          data: data.map(d => d.activeUsers),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: "Bounce Rate %",
          data: data.map(d => d.bounceRate),
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          yAxisID: 'y1'
        },
        {
          label: "Avg Session (sec)",
          data: data.map(d => d.avgSession),
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          yAxisID: 'y2'
        }
      ]
    });
  };

  const generatePrediction = (data) => {
    if (data.length < 3) {
      setPrediction("Not enough data for prediction");
      return;
    }

    const last = data[data.length - 1].activeUsers;
    const avg = data.reduce((sum, d) => sum + d.activeUsers, 0) / data.length;

    if (last > avg * 1.3) setPrediction("📈 Strong upward trend detected");
    else if (last < avg * 0.7) setPrediction("📉 Downward trend detected");
    else setPrediction("➡️ Stable traffic pattern");
  };

  const handleExportCSV = () => {
    try {
      const headers = "Date,Active Users,Bounce Rate (%),Avg Session Duration (s)";
      const csv = [
        headers,
        ...analyticsData.map(d => `${d.date},${d.activeUsers},${d.bounceRate.toFixed(2)},${d.avgSession.toFixed(2)}`)
      ].join("\n");

      const filename = `imali-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      saveCSVFile(csv, filename);

      logDebug("INFO", "CSV exported successfully");
      setStatus("✅ Analytics data exported");
    } catch (err) {
      logDebug("ERROR", "CSV export failed", err);
      setStatus("❌ Export failed");
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  const handleMint = async () => {
    if (!mintAmount || isNaN(mintAmount)) {
      setStatus("❌ Please enter a valid amount");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    try {
      setStatus("⏳ Minting in progress...");
      logDebug("INFO", `Initiating mint of ${mintAmount} IMALI`);

      const contract = await getContractInstance("IMALIToken", provider.getSigner());
      const tx = await contract.mint(account, ethers.parseEther(mintAmount));

      logDebug("INFO", "Transaction sent", { txHash: tx.hash });
      setStatus("⏳ Waiting for confirmation...");

      await tx.wait();
      logDebug("INFO", "Mint completed successfully");
      setStatus(`✅ ${mintAmount} IMALI minted successfully`);
    } catch (err) {
      logDebug("ERROR", "Mint failed", err);
      setStatus(`❌ Mint failed: ${err.message.split("(")[0]}`);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Active Users'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Bounce Rate %'
        },
        max: 100
      },
      y2: {
        type: 'linear',
        display: false
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Website Analytics (Last 7 Days)'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.dataset.label.includes('%')) {
              label += context.raw.toFixed(2) + '%';
            } else if (context.dataset.label.includes('sec')) {
              label += context.raw.toFixed(0) + 's';
            } else {
              label += context.raw;
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      {/* Remaining JSX unchanged */}
    </div>
  );
};

export default AdminPanel;
