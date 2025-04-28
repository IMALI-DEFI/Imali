// src/components/AdminPanel.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import getContractInstance from "../getContractInstance";
import { useWallet } from "../context/WalletContext";
import { Line } from "react-chartjs-2";
import { FaUsers, FaCoins, FaTwitter, FaSpinner } from "react-icons/fa";
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
  const { account, chainId, getSigner } = useWallet();

  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [chartData, setChartData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [mintAmount, setMintAmount] = useState("");
  const [tweetText, setTweetText] = useState("");
  const [tweetStatus, setTweetStatus] = useState("");
  const [realTimeUsers, setRealTimeUsers] = useState(null);

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
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/.netlify/functions/analytics");
        if (!res.ok) throw new Error("GA API failed");
        const json = await res.json();

        if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
          setStatus("No analytics data found.");
          setChartData(null);
          return;
        }

        const analytics = json.data.map(item => ({
          day: item.date,
          value: parseInt(item.users) || 0,
        }));

        setChartData({
          labels: analytics.map(d => d.day),
          datasets: [{
            label: "User Engagement",
            data: analytics.map(d => d.value),
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        });

        const peakDay = analytics.reduce((max, current) => current.value > max.value ? current : max, { day: "None", value: 0 });
        setPrediction(peakDay.value > 0 ? `📈 Highest engagement: ${peakDay.day} (${peakDay.value} users)` : "No significant engagement detected.");
      } catch (err) {
        console.error("Failed to load GA data:", err.message);
        setStatus("\u274C Google Analytics error: " + err.message);
        setChartData(null);
      }
    };
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const fetchRealTimeUsers = async () => {
      try {
        const res = await fetch("/.netlify/functions/realtime");
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error || "Realtime fetch failed");
        }

        setRealTimeUsers(json.activeUsers);
      } catch (err) {
        console.error("Failed to load realtime users:", err.message);
        setRealTimeUsers(0);
      }
    };

    fetchRealTimeUsers();
    const interval = setInterval(fetchRealTimeUsers, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleMint = async () => {
    if (!mintAmount || isNaN(mintAmount)) {
      setStatus("\u274C Invalid mint amount");
      return;
    }
    try {
      const signer = await getSigner();
      const contract = await getContractInstance("Token", { chainId });
      const amount = ethers.parseUnits(mintAmount, 18);
      const tx = await contract.connect(signer).mint(account, amount);
      await tx.wait();
      setStatus(`\u2705 Successfully minted ${mintAmount} IMALI to ${account}`);
      setMintAmount("");
    } catch (err) {
      console.error(err);
      setStatus("\u274C Minting failed: " + err.message);
    }
  };

  const handleTweetPost = async () => {
    if (!tweetText.trim()) return setTweetStatus("\u274C Tweet cannot be empty");

    try {
      const res = await fetch("/.netlify/functions/post-to-twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: tweetText })
      });

      if (!res.ok) throw new Error("Tweet failed");

      setTweetStatus("\u2705 Tweet posted successfully!");
      setTweetText("");
    } catch (err) {
      setTweetStatus("\u274C Error posting tweet");
    }
  };

  const handleBuyback = async () => {
    try {
      const contract = await getContractInstance("Buyback");
      const tx = await contract.distribute();
      await tx.wait();
      alert("\u2705 Buyback distributed.");
    } catch (err) {
      alert("\u274C Buyback failed: " + err.message);
    }
  };

  const handleAirdrop = async () => {
    try {
      const contract = await getContractInstance("AirdropDistributor");
      const tx = await contract.executeAirdrop();
      await tx.wait();
      alert("\u2705 Airdrop sent.");
    } catch (err) {
      alert("\u274C Airdrop failed: " + err.message);
    }
  };

  const handleLiquidity = async () => {
    try {
      const contract = await getContractInstance("LiquidityManager");
      const tx = await contract.addLiquidity();
      await tx.wait();
      alert("\u2705 Liquidity added.");
    } catch (err) {
      alert("\u274C Liquidity add failed: " + err.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="mb-6 p-4 bg-white rounded shadow flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <FaUsers className="mr-2" /> Live Visitors
        </h2>
        <span className="text-3xl font-bold text-green-600">
          {realTimeUsers !== null ? realTimeUsers : <FaSpinner className="animate-spin" />}
        </span>
      </div>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center"><FaUsers className="mr-2" /> User Engagement (GA4)</h2>

        {!chartData && !status && (
          <div className="flex justify-center items-center py-10 text-gray-500">
            <FaSpinner className="animate-spin mr-2" /> Loading analytics...
          </div>
        )}

        {status && (
          <p className="text-red-500 font-semibold">{status}</p>
        )}

        {chartData && (
          <>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: "easeOutQuart" },
                scales: { y: { beginAtZero: true } },
              }}
              height={300}
            />
            <p className="mt-4 text-green-600 font-semibold">{prediction}</p>
          </>
        )}
      </div>

      {role === "owner" && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2">💧 Buyback / Airdrop / Liquidity Tools</h2>
          <button onClick={handleBuyback} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2 w-full">
            Trigger Buyback
          </button>
          <button onClick={handleAirdrop} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2 w-full">
            Distribute Airdrop
          </button>
          <button onClick={handleLiquidity} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">
            Add Liquidity
          </button>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2 flex items-center"><FaCoins className="mr-2" /> Mint IMALI Tokens</h2>
        <input
          type="text"
          placeholder="Amount to mint (e.g. 1000000)"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />
        <button
          onClick={handleMint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
        >
          Mint Tokens
        </button>
        {status && <p className="text-sm mt-2 font-medium text-gray-700">{status}</p>}
      </div>

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center"><FaTwitter className="mr-2" /> Post to Twitter</h2>
        <textarea
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          rows={3}
          className="w-full border p-2 rounded mb-2"
          placeholder="Write a tweet..."
        />
        <button
          onClick={handleTweetPost}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          Post Tweet
        </button>
        {tweetStatus && <p className="mt-2 text-sm font-medium text-gray-700">{tweetStatus}</p>}
      </div>
    </div>
  );
};

export default AdminPanel;
