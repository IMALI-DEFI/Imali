import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import ReactGA from "react-ga4";
import {
  FaRobot, FaSlidersH, FaCoins, FaChartLine, FaShareAlt, FaClock,
  FaTwitter, FaFacebook, FaLinkedin, FaDiscord, FaGithub, FaInstagram,
  FaTimes
} from "react-icons/fa";

const AdminPanel = () => {
  const { account, provider, connectWallet } = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [status, setStatus] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [debugLogs, setDebugLogs] = useState([]);
  const [shareContent, setShareContent] = useState("🚀 $IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [newBorrowFee, setNewBorrowFee] = useState("");
  const [newDepositFee, setNewDepositFee] = useState("");
  const [newInterestRate, setNewInterestRate] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Initialize Google Analytics
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

  const logDebug = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] [${type}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-19), formatted]);
    console[type === "ERROR" ? "error" : type === "WARN" ? "warn" : "log"](formatted, data);
  };

  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
    ReactGA.event({
      category: 'Admin',
      action: 'Toggle Analytics',
      label: showAnalytics ? 'Hide' : 'Show'
    });
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

  const updateLendingParameters = async () => {
    try {
      const contract = await getContractInstance("Lending", provider.getSigner());
      if (newBorrowFee) await contract.updateBorrowFee(parseInt(newBorrowFee));
      if (newDepositFee) await contract.updateDepositFee(parseInt(newDepositFee));
      if (newInterestRate) await contract.updateAnnualInterestRate(parseInt(newInterestRate));
      logDebug("INFO", "Lending parameters updated");
      setStatus("✅ Lending parameters updated");
      ReactGA.event({
        category: 'Admin',
        action: 'Update Parameters',
        label: `Borrow: ${newBorrowFee}, Deposit: ${newDepositFee}, Interest: ${newInterestRate}`
      });
    } catch (err) {
      logDebug("ERROR", "Failed to update lending parameters", err);
      setStatus("❌ Update failed: " + err.message);
    }
  };

  const handleSchedulePost = () => {
    if (!shareContent || !scheduleTime) return alert("Please add content and time");
    const newTask = { content: shareContent, time: new Date(scheduleTime) };
    setScheduledPosts([...scheduledPosts, newTask]);
    setScheduleTime("");
    ReactGA.event({
      category: 'Admin',
      action: 'Schedule Post',
      label: `Scheduled for ${new Date(scheduleTime).toLocaleString()}`
    });
  };

  const shareToSocial = (platform) => {
    const message = encodeURIComponent(shareContent || "🚀 $IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
    const base = "https://imali-defi.com";
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${base}&quote=${message}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${base}&summary=${message}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}`,
      instagram: `https://www.instagram.com/imali_defi`,
      discord: `https://discord.gg/wSNq32q5`,
      github: `https://github.com/IMALI-DEFI/imali`
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
    ReactGA.event({
      category: 'Social',
      action: 'Share',
      label: platform
    });
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FaRobot className="mr-2" /> Admin Dashboard
      </h1>
      <p className="text-sm text-gray-600">Wallet connected: {account || 'Not connected'}</p>

      {!account && (
        <button onClick={() => connectWallet('metamask')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Connect MetaMask
        </button>
      )}

      {account && !isOwner && (
        <div className="mt-4 bg-red-100 text-red-700 p-3 rounded">
          You are not authorized to access this panel.
        </div>
      )}

      {account && isOwner && (
        <>
          <div className="mt-6 bg-green-100 text-green-800 p-3 rounded">
            Welcome, Admin. You now have access to owner features.
          </div>

          {/* Analytics Dashboard - Now visible by default with close button */}
          {showAnalytics && (
            <div className="my-6 bg-white p-4 rounded shadow relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <FaChartLine className="mr-2" /> Analytics Dashboard
                </h2>
                <button
                  onClick={toggleAnalytics}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close dashboard"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="w-full overflow-hidden rounded-md">
                <iframe
                  width="600"
                  height="2125"
                  src="https://lookerstudio.google.com/embed/reporting/004a3462-42f3-4e04-bdab-464bf56b9f0a/page/kIV1C"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen
                  sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                ></iframe>
              </div>
            </div>
          )}

          {/* Show Analytics button when dashboard is hidden */}
          {!showAnalytics && (
            <div className="my-4">
              <button
                onClick={toggleAnalytics}
                className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
              >
                <FaChartLine className="mr-2" />
                Show Analytics Dashboard
              </button>
            </div>
          )}

          {/* Minting Section */}
          <div className="my-6 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaCoins className="mr-2" /> Token Minting
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="number"
                className="p-2 border rounded flex-grow"
                placeholder="Amount to mint"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
              <button
                onClick={handleMint}
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                Mint IMALI
              </button>
            </div>
            {status && <p className="mt-2">{status}</p>}
          </div>

          {/* Lending Controls */}
          <div className="my-6 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaSlidersH className="mr-2" /> Lending Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="number"
                className="p-2 border rounded"
                placeholder="Borrow Fee (bps)"
                value={newBorrowFee}
                onChange={(e) => setNewBorrowFee(e.target.value)}
              />
              <input
                type="number"
                className="p-2 border rounded"
                placeholder="Deposit Fee (bps)"
                value={newDepositFee}
                onChange={(e) => setNewDepositFee(e.target.value)}
              />
              <input
                type="number"
                className="p-2 border rounded"
                placeholder="Interest Rate (%)"
                value={newInterestRate}
                onChange={(e) => setNewInterestRate(e.target.value)}
              />
            </div>
            <button
              onClick={updateLendingParameters}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Update Parameters
            </button>
          </div>

          {/* Social Media Sharing */}
          <div className="my-6 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaShareAlt className="mr-2" /> Social Media
            </h2>
            <textarea
              className="w-full p-2 border rounded mb-4"
              rows="3"
              value={shareContent}
              onChange={(e) => setShareContent(e.target.value)}
              placeholder="Share something exciting about IMALI..."
            />
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => shareToSocial('twitter')} className="px-3 py-2 bg-blue-400 text-white rounded flex items-center">
                <FaTwitter className="mr-2" /> Twitter
              </button>
              <button onClick={() => shareToSocial('facebook')} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center">
                <FaFacebook className="mr-2" /> Facebook
              </button>
              <button onClick={() => shareToSocial('linkedin')} className="px-3 py-2 bg-blue-700 text-white rounded flex items-center">
                <FaLinkedin className="mr-2" /> LinkedIn
              </button>
              <button onClick={() => shareToSocial('discord')} className="px-3 py-2 bg-purple-600 text-white rounded flex items-center">
                <FaDiscord className="mr-2" /> Discord
              </button>
              <button onClick={() => shareToSocial('instagram')} className="px-3 py-2 bg-pink-600 text-white rounded flex items-center">
                <FaInstagram className="mr-2" /> Instagram
              </button>
              <button onClick={() => shareToSocial('github')} className="px-3 py-2 bg-gray-800 text-white rounded flex items-center">
                <FaGithub className="mr-2" /> GitHub
              </button>
            </div>

            {/* Scheduled Posts */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <FaClock className="mr-2" /> Scheduled Posts
              </h3>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                  type="datetime-local"
                  className="p-2 border rounded"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
                <button
                  onClick={handleSchedulePost}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Schedule Post
                </button>
              </div>
              {scheduledPosts.length > 0 && (
                <div className="border rounded p-2">
                  {scheduledPosts.map((post, index) => (
                    <div key={index} className="mb-2 pb-2 border-b last:border-b-0">
                      <p className="text-sm text-gray-500">
                        {post.time.toLocaleString()}
                      </p>
                      <p>{post.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Debug Logs */}
          <div className="my-6 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm h-40 overflow-y-auto">
              {debugLogs.length > 0 ? (
                debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No logs available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
