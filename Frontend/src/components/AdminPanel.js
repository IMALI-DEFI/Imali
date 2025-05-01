import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import { 
  FaRobot, 
  FaUsers, 
  FaShareAlt, 
  FaClock,
  FaTwitter 
} from "react-icons/fa";

const AdminPanel = () => {
  const { account } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [shareContent, setShareContent] = useState("🚀 $IMALI just hit 10K in presale!");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");

  // Initialize GA Embed API
  useEffect(() => {
    const loadGA = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.body.appendChild(script);

      const analyticsScript = document.createElement('script');
      analyticsScript.src = 'https://apis.google.com/js/api.js';
      analyticsScript.async = true;
      analyticsScript.onload = initEmbedAPI;
      document.body.appendChild(analyticsScript);
    };

    const initEmbedAPI = () => {
      window.gapi.load('analytics', () => {
        window.gapi.analytics.ready(() => {
          new window.gapi.analytics.auth.authorize({
            container: 'auth-container',
            clientid: process.env.REACT_APP_GA_CLIENT_ID,
          });
          
          const viewSelector = new window.gapi.analytics.ViewSelector({
            container: 'view-selector'
          });
          
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
          
          viewSelector.execute().then((ids) => {
            timeline.set({query: {ids: ids}}).execute();
          });
        });
      });
    };

    loadGA();
    return () => {
      // Cleanup
      const scripts = ['https://accounts.google.com/gsi/client', 'https://apis.google.com/js/api.js'];
      scripts.forEach(src => {
        const script = document.querySelector(`script[src="${src}"]`);
        if (script) document.body.removeChild(script);
      });
    };
  }, []);

  // Contract functions remain the same
  const handleBuyback = async () => {
    /* ... existing buyback logic ... */
  };

  const handleAirdrop = async () => {
    /* ... existing airdrop logic ... */
  };

  const handleLiquidity = async () => {
    /* ... existing liquidity logic ... */
  };

  // Social sharing functions remain the same
  const shareToSocial = (platform) => {
    /* ... existing social sharing logic ... */
  };

  const handleSchedulePost = () => {
    /* ... existing schedule post logic ... */
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Google Analytics Embed */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaUsers className="mr-2" /> Engagement Trends
        </h2>
        <div id="auth-container"></div>
        <div id="view-selector"></div>
        <div id="timeline"></div>
      </div>

      {/* Rest of your admin panel UI */}
      {isOwner && (
        <div className="mb-6 p-4 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaRobot className="mr-2" /> Contract Management
          </h2>
          {/* ... contract buttons ... */}
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <FaShareAlt className="mr-2" /> Social Media
        </h2>
        {/* ... social media UI ... */}
      </div>

      {status && (
        <div className={`p-3 rounded ${status.includes("✅") ? "bg-green-100" : "bg-red-100"}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
