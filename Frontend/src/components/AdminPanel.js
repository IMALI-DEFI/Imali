import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { 
  FaRobot, 
  FaCog, 
  FaUserShield, 
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
  Filler // Added Filler plugin for area charts
} from "chart.js";

// Register all required ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  Filler // Registering the Filler plugin
);

const AdminPanel = () => {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [shareContent, setShareContent] = useState("🚀 $IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const contract = await getContractInstance("Lending");
        const owner = await contract.owner();
        setIsOwner(account.toLowerCase() === owner.toLowerCase());

        if (account.toLowerCase() === owner.toLowerCase()) setRole("owner");
        else if (account.toLowerCase().endsWith("73")) setRole("moderator");
        else setRole("analyst");
      } catch (e) {
        console.error("Admin check failed:", e);
        setError("Failed to verify admin status");
      }
    };
    if (account) initAdmin();
  }, [account]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to fetch from your API
        const response = await fetch('/api/analytics');
        
        // Check if response is HTML (error page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('API returned HTML instead of JSON');
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If API fails, fall back to sample data
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format from API');
        }
        
        setAnalyticsData(data);
        generateChartData(data);
        generatePrediction(data);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError(err.message);
        
        // Fallback to sample data
        const sampleData = generateSampleData();
        setAnalyticsData(sampleData);
        generateChartData(sampleData);
        generatePrediction(sampleData);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  const generateSampleData = () => {
    return Array.from({ length: 7 }, (_, i) => ({ 
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 100) + 50 
    }));
  };

  const generateChartData = (data) => {
    setChartData({
      labels: data.map(d => d.date),
      datasets: [{
        label: "User Engagement",
        data: data.map(d => d.activeUsers),
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        fill: true // Now works because Filler plugin is registered
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
      setPrediction("📈 Strong upward trend detected - engagement likely to keep increasing");
    } else if (lastValue < avg * 0.7) {
      setPrediction("📉 Downward trend detected - consider promotional activities");
    } else {
      setPrediction("➡️ Stable engagement - maintain current strategy");
    }
  };

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

  const shareToSocial = (platform, content) => {
    const message = encodeURIComponent(content || shareContent);
    const base = "https://imali-defi.com";
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${base}&quote=${message}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${base}&summary=${message}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}&url=${base}`,
      bluesky: `https://bsky.app/intent/post?text=${message}`,
      threads: `https://www.threads.net/intent/post?text=${message}`,
      instagram: `https://www.instagram.com/imali_defi`,
      discord: `https://discord.gg/wSNq32q5`,
      github: `https://github.com/IMALI-DEFI/imali`,
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

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>⚠️ {error}</p>
          <p className="text-sm mt-1">Using sample data for demonstration</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        chartData && (
          <div className="mb-6 bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2 flex items-center">
              <FaUsers className="mr-2" /> Engagement Trends
            </h2>
            <Line data={chartData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'User Activity (Last 7 Days)',
                },
              },
            }} />
            <p className="mt-2 text-green-600 font-semibold">{prediction}</p>
          </div>
        )
      )}

      {role === "owner" && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaRobot className="mr-2" /> Contract Management
          </h2>
          <button 
            onClick={handleBuyback} 
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2 w-full transition"
          >
            Trigger Buyback Now (Buyback.sol)
          </button>
          <button 
            onClick={handleAirdrop} 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2 w-full transition"
          >
            Distribute Airdrop (AirdropDistributor.sol)
          </button>
          <button 
            onClick={handleLiquidity} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full transition"
          >
            Add Liquidity to Pool (LiquidityManager.sol)
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaShareAlt className="mr-2" /> Social Media Management
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
            onClick={() => shareToSocial("facebook")} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaShareAlt className="mr-1" /> Facebook
          </button>
          <button 
            onClick={() => shareToSocial("linkedin")} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaShareAlt className="mr-1" /> LinkedIn
          </button>
          <button 
            onClick={() => shareToSocial("twitter")} 
            className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaTwitter className="mr-1" /> Twitter
          </button>
          <button 
            onClick={() => shareToSocial("bluesky")} 
            className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaShareAlt className="mr-1" /> BlueSky
          </button>
          <button 
            onClick={() => shareToSocial("threads")} 
            className="bg-gray-900 hover:bg-black text-white px-3 py-1 rounded transition flex items-center"
          >
            <FaShareAlt className="mr-1" /> Threads
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
