import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import ReactGA from "react-ga4";
import {
  FaRobot, FaUsers, FaShareAlt, FaClock,
  FaTwitter, FaFacebook, FaLinkedin, FaCoins,
  FaDownload, FaChartLine
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

  const handleSchedulePost = () => {
    if (!shareContent || !scheduleTime) return alert("Please add content and time");
    const newTask = { content: shareContent, time: new Date(scheduleTime) };
    setScheduledPosts([...scheduledPosts, newTask]);
    setScheduleTime("");
  };

  return (
    <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FaRobot className="mr-2" /> Admin Dashboard
      </h1>
      <p className="text-sm text-gray-600">Wallet connected: {account || 'Not connected'}</p>

      {!account && (
        <div className="mb-6">
          <button onClick={() => connectWallet('metamask')} className="px-4 py-2 bg-indigo-600 text-white rounded">
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
            <h2 className="text-xl font-semibold flex items-center">
              <FaChartLine className="mr-2" /> Analytics
            </h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded shadow mt-4">
              <iframe
                title="Imali Looker Dashboard"
                src="https://lookerstudio.google.com/s/kagTIaB9NVs"
                frameBorder="0"
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="mb-6 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-2">💧 Buyback / Airdrop / Liquidity Tools</h2>
            <button onClick={async () => {
              try {
                const contract = await getContractInstance("Buyback", provider.getSigner());
                const tx = await contract.distribute();
                await tx.wait();
                alert("✅ Buyback distributed.");
              } catch (err) {
                alert("❌ Buyback failed: " + err.message);
              }
            }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2 w-full">
              Trigger Buyback Now (Buyback.sol)
            </button>
            <button onClick={async () => {
              try {
                const contract = await getContractInstance("AirdropDistributor", provider.getSigner());
                const tx = await contract.executeAirdrop();
                await tx.wait();
                alert("✅ Airdrop sent.");
              } catch (err) {
                alert("❌ Airdrop failed: " + err.message);
              }
            }} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2 w-full">
              Distribute Airdrop (AirdropDistributor.sol)
            </button>
            <button onClick={async () => {
              try {
                const contract = await getContractInstance("LiquidityManager", provider.getSigner());
                const tx = await contract.addLiquidity();
                await tx.wait();
                alert("✅ Liquidity added.");
              } catch (err) {
                alert("❌ Liquidity add failed: " + err.message);
              }
            }} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full">
              Add Liquidity to Pool (LiquidityManager.sol)
            </button>
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
            </div>
          </div>

          <div className="my-6 p-4 bg-white rounded shadow">
            <h2 className="text-lg font-semibold mb-2 flex items-center">
              <FaShareAlt className="mr-2" /> Share a Social Update
            </h2>
            <textarea
              value={shareContent}
              onChange={(e) => setShareContent(e.target.value)}
              rows={3}
              className="w-full border p-2 rounded mb-2"
            />
            <div className="flex gap-2 mb-3 flex-wrap">
              {['facebook', 'linkedin', 'twitter', 'bluesky', 'instagram', 'threads', 'discord', 'github'].map(platform => (
                <button
                  key={platform}
                  onClick={() => shareToSocial(platform, shareContent)}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded"
                >
                  Share to {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </button>
              ))}
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
        </>
      )}
    </div>
  );
};

export default AdminPanel;

const shareToSocial = (platform, content) => {
  const message = encodeURIComponent(content || "🚀 $IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
  const base = "https://imali-defi.com";
  const urls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${base}&quote=${message}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${base}&summary=${message}`,
    twitter: `https://twitter.com/intent/tweet?text=${message}`,
    bluesky: `https://bsky.app/intent/post?text=${message}`,
    threads: `https://www.threads.net/@imali_defi`,
    instagram: `https://www.instagram.com/imali_defi`,
    discord: `https://discord.gg/wSNq32q5`,
    github: `https://github.com/IMALI-DEFI/imali`
  };
  if (urls[platform]) window.open(urls[platform], "_blank");
};
