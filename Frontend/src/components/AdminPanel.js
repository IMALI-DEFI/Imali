// AdminPanel.js with GA OAuth, Bounce Rate, Session Duration, CSV Export
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { saveAs } from 'file-saver';
import { 
  FaRobot, FaUsers, FaShareAlt, FaClock,
  FaTwitter, FaFacebook, FaLinkedin, FaCoins, FaDownload 
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Title, Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title, Filler);

const AdminPanel = () => {
  const { account } = useWallet();
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
      } catch (err) {
        logDebug("ERROR", "Admin check failed", err);
      }
    };
    if (account) initAdmin();
  }, [account]);

  useEffect(() => {
    const fetchGAData = async () => {
      try {
        const token = process.env.REACT_APP_GA_API_KEY;
        const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${process.env.REACT_APP_GA_ID}/runReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "activeUsers" },
              { name: "bounceRate" },
              { name: "averageSessionDuration" }
            ]
          })
        });
        const data = await response.json();
        if (!data.rows) throw new Error("No GA rows returned");
        const parsed = data.rows.map(row => ({
          date: row.dimensionValues[0].value,
          activeUsers: parseInt(row.metricValues[0].value),
          bounceRate: parseFloat(row.metricValues[1].value),
          avgSession: parseFloat(row.metricValues[2].value)
        }));
        setAnalyticsData(parsed);
        generateChartData(parsed);
        generatePrediction(parsed);
        logDebug("INFO", "GA data loaded", parsed);
      } catch (err) {
        logDebug("WARN", "Fallback to sample data", err);
        const fallback = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
          activeUsers: Math.floor(Math.random() * 100) + 50,
          bounceRate: Math.random() * 100,
          avgSession: Math.random() * 300
        }));
        setAnalyticsData(fallback);
        generateChartData(fallback);
        generatePrediction(fallback);
      }
    };

    

    fetchGAData();
  }, []);

  const generateChartData = (data) => {
    setChartData({
      labels: data.map(d => d.date),
      datasets: [
        {
          label: "Active Users",
          data: data.map(d => d.activeUsers),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          fill: true
        },
        {
          label: "Bounce Rate %",
          data: data.map(d => d.bounceRate),
          borderColor: "rgba(255, 99, 132, 1)",
          borderDash: [5, 5],
          borderWidth: 1,
          fill: false
        },
        {
          label: "Avg Session Duration (s)",
          data: data.map(d => d.avgSession),
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
          fill: false
        }
      ]
    });
  };

  const generatePrediction = (data) => {
    const last = data[data.length - 1].activeUsers;
    const avg = data.reduce((sum, d) => sum + d.activeUsers, 0) / data.length;
    if (last > avg * 1.3) setPrediction("📈 Surge expected");
    else if (last < avg * 0.7) setPrediction("📉 Drop expected");
    else setPrediction("➡️ Stable pattern");
  };

  const handleExportCSV = () => {
    const csv = ["Date,Active Users,Bounce Rate (%),Avg Session Duration (s)",
      ...analyticsData.map(d => `${d.date},${d.activeUsers},${d.bounceRate},${d.avgSession}`)
    ].join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `analytics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleMint = async () => {
    try {
      setStatus("Minting in progress...");
      const contract = await getContractInstance("IMALIToken");
      const tx = await contract.mint(account, ethers.parseEther(mintAmount));
      await tx.wait();
      setStatus(`✅ Minted ${mintAmount} IMALI successfully`);
    } catch (err) {
      setStatus("❌ Mint failed: " + err.message);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {chartData && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <FaUsers className="mr-2" /> Engagement Trends
          </h2>
          <Line data={chartData} />
          {prediction && <p className="mt-2 text-green-600 font-semibold">{prediction}</p>}
          <button
            onClick={handleExportCSV}
            className="mt-4 flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded"
          >
            <FaDownload /> Export to CSV
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaCoins className="mr-2" /> Token Minting
        </h2>
        <input
          type="number"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          placeholder="Amount to mint"
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={handleMint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
        >
          Mint IMALI Tokens
        </button>
      </div>

      {status && (
        <div className={`p-3 rounded ${status.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {status}
        </div>
      )}

      <div className="mt-6 bg-black text-green-300 p-4 rounded max-h-64 overflow-y-auto text-sm font-mono shadow-inner">
        <div className="font-bold text-white mb-2">🧪 Debug Console</div>
        {debugLogs.length === 0 ? (
          <p className="text-gray-400">No logs yet.</p>
        ) : (
          debugLogs.map((log, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap">{log}</div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
