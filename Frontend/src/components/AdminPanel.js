import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { 
  FaRobot, FaUsers, FaShareAlt, FaClock,
  FaTwitter, FaFacebook, FaLinkedin 
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Title, Filler
} from "chart.js";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title, Filler);

const AdminPanel = () => {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [shareContent, setShareContent] = useState("🚀 $IMALI just hit 10K in presale!");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [gaError, setGaError] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  // Unified logger
  const logDebug = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] [${type}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), formatted]);
    if (type === "ERROR") console.error(formatted, data);
    else if (type === "WARN") console.warn(formatted, data);
    else console.log(formatted, data);
  };

  useEffect(() => {
    logDebug("INFO", "AdminPanel mounted");
  }, []);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        logDebug("INFO", "Checking admin status...");
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        logDebug("INFO", "Contract owner: " + owner);
        if (account) {
          const isAdmin = account.toLowerCase() === owner.toLowerCase();
          logDebug("INFO", "Is owner: " + isAdmin);
          setIsOwner(isAdmin);
        } else {
          logDebug("WARN", "Wallet account not connected");
        }
      } catch (e) {
        logDebug("ERROR", "Admin check failed", e);
      }
    };
    if (account) {
      logDebug("INFO", "Wallet account connected", account);
      initAdmin();
    }
  }, [account]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        logDebug("INFO", "Attempting to load Google Analytics...");
        await loadGAEmbedAPI();
      } catch (err) {
        logDebug("WARN", "Google Analytics failed - using fallback", err);
        setGaError("Google Analytics failed - showing fallback data");
        loadFallbackData();
      }
    };

    const loadGAEmbedAPI = async () => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => {
          const analyticsScript = document.createElement('script');
          analyticsScript.src = 'https://www.google-analytics.com/analytics.js';
          analyticsScript.async = true;
          analyticsScript.onload = () => {
            window.gapi = window.gapi || {};
            window.gapi.analytics = window.gapi.analytics || {};
            logDebug("INFO", "Google Analytics scripts loaded");
            resolve();
          };
          analyticsScript.onerror = reject;
          document.body.appendChild(analyticsScript);
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const loadFallbackData = () => {
      logDebug("INFO", "Loading fallback analytics data");
      const sampleData = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 100) + 50
      }));
      setAnalyticsData(sampleData);
      generateChartData(sampleData);
      generatePrediction(sampleData);
    };

    loadAnalytics();

    return () => {
      logDebug("INFO", "Cleaning up Google Analytics scripts");
      ['https://accounts.google.com/gsi/client', 'https://www.google-analytics.com/analytics.js'].forEach(src => {
        const script = document.querySelector(`script[src="${src}"]`);
        if (script) document.body.removeChild(script);
      });
    };
  }, []);

  const generateChartData = (data) => {
    logDebug("INFO", "Generating chart data");
    setChartData({
      labels: data.map(d => d.date),
      datasets: [{
        label: "User Engagement",
        data: data.map(d => d.activeUsers),
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        fill: true
      }]
    });
  };

  const generatePrediction = (data) => {
    logDebug("INFO", "Analyzing data for trend prediction");
    if (data.length < 3) {
      setPrediction("Not enough data for prediction");
      return;
    }
    const lastValue = data[data.length - 1].activeUsers;
    const avg = data.reduce((sum, d) => sum + d.activeUsers, 0) / data.length;
    if (lastValue > avg * 1.3) setPrediction("📈 Strong upward trend detected");
    else if (lastValue < avg * 0.7) setPrediction("📉 Downward trend detected");
    else setPrediction("➡️ Stable engagement");
  };

  const handleBuyback = async () => {
    try {
      logDebug("INFO", "Buyback triggered");
      setStatus("Processing buyback...");
      const contract = await getContractInstance("Buyback");
      const tx = await contract.distribute();
      await tx.wait();
      setStatus("✅ Buyback distributed successfully");
      logDebug("INFO", "Buyback transaction complete");
    } catch (err) {
      setStatus("❌ Buyback failed: " + err.message);
      logDebug("ERROR", "Buyback failed", err);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  const handleAirdrop = async () => {
    try {
      logDebug("INFO", "Airdrop triggered");
      setStatus("Processing airdrop...");
      const contract = await getContractInstance("AirdropDistributor");
      const tx = await contract.executeAirdrop();
      await tx.wait();
      setStatus("✅ Airdrop sent successfully");
      logDebug("INFO", "Airdrop complete");
    } catch (err) {
      setStatus("❌ Airdrop failed: " + err.message);
      logDebug("ERROR", "Airdrop failed", err);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  const handleLiquidity = async () => {
    try {
      logDebug("INFO", "Liquidity addition started");
      setStatus("Adding liquidity...");
      const contract = await getContractInstance("LiquidityManager");
      const tx = await contract.addLiquidity();
      await tx.wait();
      setStatus("✅ Liquidity added successfully");
      logDebug("INFO", "Liquidity added");
    } catch (err) {
      setStatus("❌ Liquidity add failed: " + err.message);
      logDebug("ERROR", "Liquidity addition failed", err);
    } finally {
      setTimeout(() => setStatus(""), 5000);
    }
  };

  const shareToSocial = (platform) => {
    logDebug("INFO", `Sharing to ${platform}`, shareContent);
    const message = encodeURIComponent(shareContent);
    const base = "https://imali-defi.com";
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${message}&url=${base}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${base}&quote=${message}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${base}&summary=${message}`
    };
    if (urls[platform]) {
      window.open(urls[platform], "_blank", "noopener,noreferrer");
    }
  };

  const handleSchedulePost = () => {
    logDebug("INFO", "Scheduling social post", { content: shareContent, time: scheduleTime });
    if (!shareContent) return alert("Please add content");
    if (!scheduleTime) return alert("Please select a time");

    const newTask = {
      content: shareContent,
      time: new Date(scheduleTime).toLocaleString()
    };
    setScheduledPosts([...scheduledPosts, newTask]);
    setScheduleTime("");
    setStatus("✅ Post scheduled successfully");
    setTimeout(() => setStatus(""), 3000);
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* ... existing JSX for GA charts, buttons, social tools, etc. remains unchanged ... */}

      {status && (
        <div className={`p-3 rounded ${status.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {status}
        </div>
      )}

      {/* 🧪 Debug Console */}
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
