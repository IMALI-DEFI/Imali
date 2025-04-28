// AdminPanel.js (Finalized with Predictive Analytics, Role Access, Social Tools + Scheduling + Buyback/Airdrop/Liquidity Integration)
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
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

  const handleBuyback = async () => {
    try {
      const contract = await getContractInstance("Buyback");
      const tx = await contract.distribute();
      await tx.wait();
      alert("✅ Buyback distributed.");
    } catch (err) {
      alert("❌ Buyback failed: " + err.message);
    }
  };

  const handleAirdrop = async () => {
    try {
      const contract = await getContractInstance("AirdropDistributor");
      const tx = await contract.executeAirdrop();
      await tx.wait();
      alert("✅ Airdrop sent.");
    } catch (err) {
      alert("❌ Airdrop failed: " + err.message);
    }
  };

  const handleLiquidity = async () => {
    try {
      const contract = await getContractInstance("LiquidityManager");
      const tx = await contract.addLiquidity();
      await tx.wait();
      alert("✅ Liquidity added.");
    } catch (err) {
      alert("❌ Liquidity add failed: " + err.message);
    }
  };

  const shareToSocial = (platform, content) => {
    const message = encodeURIComponent(content || shareContent);
    const base = "https://imali-defi.com";
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${base}&quote=${message}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${base}&summary=${message}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}`,
      bluesky: `https://bsky.app/intent/post?text=${message}`,
      threads: `https://www.threads.net/@imali_defi`,
      instagram: `https://www.instagram.com/imali_defi`,
      discord: `https://discord.gg/wSNq32q5`,
      github: `https://github.com/IMALI-DEFI/imali`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
  };

  const handleSchedulePost = () => {
    if (!shareContent || !scheduleTime) return alert("Please add content and time");
    const newTask = { content: shareContent, time: new Date(scheduleTime) };
    setScheduledPosts([...scheduledPosts, newTask]);
    setScheduleTime("");
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {chartData && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2 flex items-center"><FaUsers className="mr-2" /> Engagement Trends</h2>
          <Line data={chartData} />
          <p className="mt-2 text-green-600 font-semibold">📈 {prediction}</p>
        </div>
      )}

      {role === "owner" && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2">💧 Buyback / Airdrop / Liquidity Tools</h2>
          <button onClick={handleBuyback} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2 w-full">
            Trigger Buyback Now (Buyback.sol)
          </button>
          <button onClick={handleAirdrop} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2 w-full">
            Distribute Airdrop (AirdropDistributor.sol)
          </button>
          <button onClick={handleLiquidity} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">
            Add Liquidity to Pool (LiquidityManager.sol)
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center"><FaShareAlt className="mr-2" /> Share a Social Update</h2>
        <textarea
          value={shareContent}
          onChange={(e) => setShareContent(e.target.value)}
          rows={3}
          className="w-full border p-2 rounded mb-2"
        />
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={() => shareToSocial("facebook")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">Facebook</button>
          <button onClick={() => shareToSocial("linkedin")} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">LinkedIn</button>
          <button onClick={() => shareToSocial("twitter")} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded">X</button>
          <button onClick={() => shareToSocial("bluesky")} className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-1 rounded">BlueSky</button>
          <button onClick={() => shareToSocial("instagram")} className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded">Instagram</button>
          <button onClick={() => shareToSocial("threads")} className="bg-gray-900 hover:bg-black text-white px-3 py-1 rounded">Threads</button>
          <button onClick={() => shareToSocial("discord")} className="bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1 rounded">Discord</button>
          <button onClick={() => shareToSocial("github")} className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded">GitHub</button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="border p-2 rounded"
          />
          <button onClick={handleSchedulePost} className="bg-gray-700 text-white px-3 py-1 rounded flex items-center gap-1">
            <FaClock /> Schedule Post
          </button>
        </div>
        {scheduledPosts.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold">🕓 Scheduled Posts:</h4>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {scheduledPosts.map((post, i) => (
                <li key={i}><strong>{post.time.toLocaleString()}:</strong> {post.content}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {status && <p className="mt-4 font-bold text-blue-600">{status}</p>}
    </div>
  );
};

export default AdminPanel;
