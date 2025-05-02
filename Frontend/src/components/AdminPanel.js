import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import ReactGA from "react-ga4";
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
  const { account, provider, connectWallet } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [analyticsData, setAnalyticsData] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);

  useEffect(() => {
    ReactGA.initialize("G-KDRSH4G2Y9");
    ReactGA.send("pageview");
  }, []);

  useEffect(() => {
    const savedType = localStorage.getItem("walletType");
    if (savedType && !account) {
      connectWallet(savedType);
    }
  }, [account, connectWallet]);

  const generateMockAnalytics = () => {
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
      activeUsers: Math.floor(Math.random() * 100) + 50,
      bounceRate: Math.random() * 100,
      avgSession: Math.random() * 300
    }));
  };

  const logDebug = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] [${type}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), formatted]);
    if (type === "ERROR") console.error(formatted, data);
    else if (type === "WARN") console.warn(formatted, data);
    else console.log(formatted, data);
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!account || !provider) return;
      try {
        const signer = provider.getSigner();
        const contract = await getContractInstance("Lending", signer);
        const owner = await contract.owner();
        setIsOwner(account.toLowerCase() === owner.toLowerCase());
        logDebug("INFO", "Admin status verified");
      } catch (err) {
        logDebug("ERROR", "Admin check failed", err);
      }
    };
    checkAdminStatus();
  }, [account, provider]);

  useEffect(() => {
    if (!account) return;
    const loadAnalytics = () => {
      try {
        logDebug("INFO", "Loading analytics data");
        const mockData = generateMockAnalytics();
        setAnalyticsData(mockData);
        logDebug("INFO", "Analytics data loaded");
      } catch (err) {
        logDebug("WARN", "Failed to load analytics", err);
      }
    };
    loadAnalytics();
  }, [account]);

  const { chartData, chartOptions, trafficPrediction } = useMemo(() => {
    if (analyticsData.length === 0) return {};
    const data = {
      labels: analyticsData.map(d => d.date),
      datasets: [
        {
          label: "Active Users",
          data: analyticsData.map(d => d.activeUsers),
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: "Bounce Rate %",
          data: analyticsData.map(d => d.bounceRate),
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          yAxisID: 'y1'
        },
        {
          label: "Avg Session (sec)",
          data: analyticsData.map(d => d.avgSession),
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          yAxisID: 'y2'
        }
      ]
    };
    const options = {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'Active Users' }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Bounce Rate %' }, max: 100
        },
        y2: { type: 'linear', display: false }
      },
      plugins: {
        title: { display: true, text: 'Website Analytics (Last 7 Days)' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              let label = ctx.dataset.label || '';
              if (label) label += ': ';
              return label +
                (ctx.dataset.label.includes('%') ? `${ctx.raw.toFixed(2)}%`
                : ctx.dataset.label.includes('sec') ? `${ctx.raw.toFixed(0)}s`
                : ctx.raw);
            }
          }
        }
      }
    };
    const getTrafficPrediction = () => {
      if (analyticsData.length < 3) return "Not enough data for prediction";
      const last = analyticsData[analyticsData.length - 1].activeUsers;
      const avg = analyticsData.reduce((sum, d) => sum + d.activeUsers, 0) / analyticsData.length;
      return last > avg * 1.3 ? "📈 Strong upward trend detected"
        : last < avg * 0.7 ? "📉 Downward trend detected"
        : "➡️ Stable traffic pattern";
    };
    return { chartData: data, chartOptions: options, trafficPrediction: getTrafficPrediction() };
  }, [analyticsData]);

  const handleExportCSV = () => {
    try {
      const headers = "Date,Active Users,Bounce Rate (%),Avg Session Duration (s)";
      const csv = [headers, ...analyticsData.map(d => `${d.date},${d.activeUsers},${d.bounceRate.toFixed(2)},${d.avgSession.toFixed(2)}`)].join("\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imali-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
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
      ReactGA.event({ category: "Admin", action: "MintSuccess", label: mintAmount });
      logDebug("INFO", "Mint completed successfully");
      setStatus(`✅ ${mintAmount} IMALI minted successfully`);
    } catch (err) {
      logDebug("ERROR", "Mint failed", err);
      setStatus(`❌ Mint failed: ${err.message.split("(")[0]}`);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      
      
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FaRobot className="mr-2" /> Admin Dashboard
      </h1>
      <p className="text-sm text-gray-600">Wallet connected: {account || 'Not connected'}</p>

      {!account && (
        <div className="mb-6">
          <button
            onClick={() => connectWallet('metamask')}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Connect MetaMask
          </button>
        </div>
      )}

      {!isOwner && account && (
        <div className="mt-4 bg-red-100 text-red-700 p-3 rounded">
          You are not authorized to access this panel.
        </div>
      )}

      {isOwner && account && (
        <>
          <div className="mt-6 bg-green-100 text-green-800 p-3 rounded">
            Welcome, Admin. You now have access to owner features.
          </div>

          <div className="my-6 bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <FaChartLine className="mr-2" /> Analytics
              </h2>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <FaDownload className="mr-1" /> Export
              </button>
            </div>
            {chartData && (
              <div className="h-80">
                <Line data={chartData} options={chartOptions} />
              </div>
            )}
            {trafficPrediction && (
              <div className="mt-4 p-3 bg-blue-50 rounded flex items-center">
                <FaRobot className="text-blue-500 mr-2" />
                <p>{trafficPrediction}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-4 rounded bg-white">
              <h3 className="font-medium mb-2 flex items-center">
                <FaCoins className="mr-2" /> Mint IMALI Tokens
              </h3>
              <div className="flex">
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="Amount to mint"
                  className="flex-grow p-2 border rounded-l"
                />
                <button
                  onClick={handleMint}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r"
                >
                  Mint
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Only for protocol reserves</p>
            </div>

            <div className="border p-4 rounded bg-white">
              <h3 className="font-medium mb-2">System Status</h3>
              {status && (
                <div className="p-2 bg-blue-50 text-blue-700 rounded mb-2">
                  {status}
                </div>
              )}
              <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
                <pre className="text-xs font-mono">
                  {debugLogs.join('\n')}
                </pre>
              </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">📊 Live Looker Analytics</h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded shadow">
              <iframe
                title="Imali Looker Dashboard"
                src="https://lookerstudio.google.com/s/n0R2h4hqHkw"
                frameBorder="0"
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
