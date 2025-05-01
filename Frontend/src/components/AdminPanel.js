import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { 
  FaRobot, 
  FaUsers, 
  FaShareAlt, 
  FaClock,
  FaTwitter 
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
  Filler
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

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

  // Initialize admin status
  useEffect(() => {
    const initAdmin = async () => {
      try {
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        setIsOwner(account.toLowerCase() === owner.toLowerCase());
      } catch (e) {
        console.error("Admin check failed:", e);
      }
    };
    if (account) initAdmin();
  }, [account]);

  // Initialize GA Embed API with fallback
  useEffect(() => {
    const loadGAScripts = () => {
      return new Promise((resolve) => {
        if (window.gapi) return resolve();
        
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.onload = () => {
          window.gapi.load('analytics', () => resolve());
        };
        
        document.body.appendChild(gsiScript);
        document.body.appendChild(gapiScript);
      });
    };

    const initEmbedAPI = async () => {
      try {
        await loadGAScripts();
        
        window.gapi.analytics.ready(() => {
          // Authorization
          window.gapi.analytics.auth.authorize({
            container: 'auth-container',
            clientid: process.env.REACT_APP_GA_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/analytics.readonly'
          });
          
          // View selector
          const viewSelector = new window.gapi.analytics.ViewSelector({
            container: 'view-selector'
          });
          
          // Chart configuration
          const timeline = new window.gapi.analytics.googleCharts.DataChart({
            query: {
              metrics: 'ga:users',
              dimensions: 'ga:date',
              'start-date': '7daysAgo',
              'end-date': 'yesterday'
            },
            chart: {
              type: 'LINE',
              container: 'timeline',
              options: {
                width: '100%',
                height: '300px'
              }
            }
          });
          
          viewSelector.execute()
            .then((ids) => timeline.set({query: {ids: ids}}).execute())
            .catch(err => {
              console.error("GA Embed failed:", err);
              setGaError("Google Analytics failed - showing fallback data");
              loadFallbackData();
            });
        });
      } catch (err) {
        console.error("GA initialization failed:", err);
        setGaError("Google Analytics failed - showing fallback data");
        loadFallbackData();
      }
    };

    const loadFallbackData = () => {
      // Sample data fallback
      const sampleData = Array.from({ length: 7 }, (_, i) => ({ 
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 100) + 50 
      }));
      
      setAnalyticsData(sampleData);
      generateChartData(sampleData);
      generatePrediction(sampleData);
    };

    initEmbedAPI();

    return () => {
      // Cleanup
      ['https://accounts.google.com/gsi/client', 'https://apis.google.com/js/api.js']
        .forEach(src => {
          const script = document.querySelector(`script[src="${src}"]`);
          if (script) document.body.removeChild(script);
        });
    };
  }, []);

  const generateChartData = (data) => {
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
    if (data.length < 3) {
      setPrediction("Not enough data for prediction");
      return;
    }
    
    const lastValue = data[data.length - 1].activeUsers;
    const avg = data.reduce((sum, d) => sum + d.activeUsers, 0) / data.length;
    
    if (lastValue > avg * 1.3) {
      setPrediction("📈 Strong upward trend detected");
    } else if (lastValue < avg * 0.7) {
      setPrediction("📉 Downward trend detected");
    } else {
      setPrediction("➡️ Stable engagement");
    }
  };

  // Contract functions
  const handleBuyback = async () => {
    try {
      setStatus("Processing buyback...");
      const contract = await getContractInstance("Buyback");
      const tx = await contract.distribute();
      await tx.wait();
      setStatus("✅ Buyback distributed successfully");
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setStatus("❌ Buyback failed: " + err.message);
      console.error("Buyback error:", err);
    }
  };

  const handleAirdrop = async () => {
    try {
      setStatus("Processing airdrop...");
      const contract = await getContractInstance("AirdropDistributor");
      const tx = await contract.executeAirdrop();
      await tx.wait();
      setStatus("✅ Airdrop sent successfully");
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setStatus("❌ Airdrop failed: " + err.message);
      console.error("Airdrop error:", err);
    }
  };

  const handleLiquidity = async () => {
    try {
      setStatus("Adding liquidity...");
      const contract = await getContractInstance("LiquidityManager");
      const tx = await contract.addLiquidity();
      await tx.wait();
      setStatus("✅ Liquidity added successfully");
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      setStatus("❌ Liquidity add failed: " + err.message);
      console.error("Liquidity error:", err);
    }
  };

  const shareToSocial = (platform) => {
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

      {gaError && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          {gaError}
        </div>
      )}

      {/* Google Analytics Embed */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaUsers className="mr-2" /> Engagement Trends
        </h2>
        <div id="auth-container"></div>
        <div id="view-selector"></div>
        <div id="timeline"></div>
        
        {/* Fallback Chart */}
        {gaError && chartData && (
          <div className="mt-4">
            <Line data={chartData} options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'User Activity (Last 7 Days)' }
              }
            }} />
            {prediction && (
              <p className="mt-2 text-green-600 font-semibold">{prediction}</p>
            )}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaRobot className="mr-2" /> Contract Management
          </h2>
          <button 
            onClick={handleBuyback} 
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2 w-full transition"
          >
            Trigger Buyback Now
          </button>
          <button 
            onClick={handleAirdrop} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2 w-full transition"
          >
            Distribute Airdrop
          </button>
          <button 
            onClick={handleLiquidity} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full transition"
          >
            Add Liquidity
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaShareAlt className="mr-2" /> Social Media
        </h2>
        <textarea
          value={shareContent}
          onChange={(e) => setShareContent(e.target.value)}
          rows={3}
          className="w-full border p-2 rounded mb-2"
          placeholder="Enter your social media post content..."
        />
        <div className="flex gap-2 mb-3 flex-wrap">
          <button 
            onClick={() => shareToSocial("twitter")} 
            className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaTwitter className="mr-1" /> Twitter
          </button>
          <button 
            onClick={() => shareToSocial("facebook")} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition flex items-center"
          >
            Facebook
          </button>
          <button 
            onClick={() => shareToSocial("linkedin")} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition flex items-center"
          >
            LinkedIn
          </button>
        </div>
        
        <h3 className="font-semibold mt-4 mb-2 flex items-center">
          <FaClock className="mr-2" /> Schedule Post
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="border p-2 rounded"
            min={new Date().toISOString().slice(0, 16)}
          />
          <button 
            onClick={handleSchedulePost} 
            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded flex items-center gap-1 transition"
          >
            <FaClock /> Schedule
          </button>
        </div>
        
        {scheduledPosts.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">🕓 Scheduled Posts:</h4>
            <ul className="space-y-2">
              {scheduledPosts.map((post, i) => (
                <li key={i} className="bg-gray-50 p-2 rounded border">
                  <p className="font-medium">{post.time}</p>
                  <p className="text-gray-700">{post.content}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {status && (
        <div className={`p-3 rounded ${status.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
