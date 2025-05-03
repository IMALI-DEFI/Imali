import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContractInstance } from '../getContractInstance';
import { useWallet } from "../context/WalletContext";
import ReactGA from "react-ga4";
import {
FaRobot, FaSlidersH, FaCoins, FaChartLine, FaShareAlt, FaClock
} from "react-icons/fa";

const AdminPanel = () => {
const { account, provider, connectWallet } = useWallet();
const \[isOwner, setIsOwner] = useState(false);
const \[status, setStatus] = useState("");
const \[mintAmount, setMintAmount] = useState("");
const \[debugLogs, setDebugLogs] = useState(\[]);
const \[shareContent, setShareContent] = useState("🚀 \$IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
const \[scheduledPosts, setScheduledPosts] = useState(\[]);
const \[scheduleTime, setScheduleTime] = useState("");
const \[newBorrowFee, setNewBorrowFee] = useState("");
const \[newDepositFee, setNewDepositFee] = useState("");
const \[newInterestRate, setNewInterestRate] = useState("");

useEffect(() => {
ReactGA.initialize("G-KDRSH4G2Y9");
ReactGA.send("pageview");
}, \[]);

useEffect(() => {
const savedType = localStorage.getItem("walletType");
if (savedType && !account) {
connectWallet(savedType);
}
}, \[account, connectWallet]);

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
}, \[account, provider]);

const logDebug = (type, message, data = null) => {
const timestamp = new Date().toLocaleTimeString();
const formatted = `[${timestamp}] [${type}] ${message}`;
setDebugLogs(prev => \[...prev.slice(-19), formatted]);
console\[type === "ERROR" ? "error" : type === "WARN" ? "warn" : "log"]\(formatted, data);
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
} catch (err) {
logDebug("ERROR", "Failed to update lending parameters", err);
setStatus("❌ Update failed: " + err.message);
}
};

const handleSchedulePost = () => {
if (!shareContent || !scheduleTime) return alert("Please add content and time");
const newTask = { content: shareContent, time: new Date(scheduleTime) };
setScheduledPosts(\[...scheduledPosts, newTask]);
setScheduleTime("");
};

return ( <div className="p-6 bg-gray-50 rounded-md shadow-md max-w-6xl mx-auto"> <h1 className="text-3xl font-bold mb-6 flex items-center"> <FaRobot className="mr-2" /> Admin Dashboard </h1> <p className="text-sm text-gray-600">Wallet connected: {account || 'Not connected'}</p>

```
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

      <div className="my-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaSlidersH className="mr-2" /> Lending Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="number" className="p-2 border rounded" placeholder="Borrow Fee (bps)" value={newBorrowFee} onChange={(e) => setNewBorrowFee(e.target.value)} />
          <input type="number" className="p-2 border rounded" placeholder="Deposit Fee (bps)" value={newDepositFee} onChange={(e) => setNewDepositFee(e.target.value)} />
          <input type="number" className="p-2 border rounded" placeholder="Interest Rate (%)" value={newInterestRate} onChange={(e) => setNewInterestRate(e.target.value)} />
        </div>
        <button onClick={updateLendingParameters} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Update Parameters
        </button>
      </div>
    </>
  )}
</div>
```

);
};

export default AdminPanel;

const shareToSocial = (platform, content) => {
const message = encodeURIComponent(content || "🚀 \$IMALI just hit 10K in presale! Join the DeFi movement & stake with confidence. 🌐");
const base = "[https://imali-defi.com](https://imali-defi.com)";
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
if (urls\[platform]) window\.open(urls\[platform], "\_blank");
};
