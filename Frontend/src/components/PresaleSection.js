import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import Countdown from "react-countdown";
import { FaRegCopy, FaWallet, FaEthereum } from "react-icons/fa";
import { MdOutlineSecurity } from "react-icons/md";
import FlowerAnimation from "../assets/animations/flower-opening.svg";

const PresaleSection = () => {
  const { 
    account,
    connectMetaMask,
    connectWalletConnect,
    disconnectWallet,
    isConnecting,
    error: walletError
  } = useWallet();

  // Set presale end date to 60 days from now
  const [presaleEnd] = useState(() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60);
    return endDate;
  });

  const [tokenPrice] = useState("0.005");
  const [softCap] = useState("300");
  const [hardCap] = useState("750");
  const [totalRaised, setTotalRaised] = useState("0");
  const [contribution, setContribution] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrer, setReferrer] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState({ message: "", type: "" });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const ref = query.get("ref");
    if (ethers.isAddress(ref) && ref.toLowerCase() !== account?.toLowerCase()) {
      setReferrer(ref);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      setReferralLink(`${window.location.origin}/presale?ref=${account}`);
      fetchStats();
    }
  }, [account]);

  const fetchStats = async () => {
    try {
      const contract = await getContractInstance("Presale");
      const raised = await contract.totalRaised();
      setTotalRaised(ethers.formatEther(raised));
    } catch (err) {
      console.error("Failed to fetch presale stats:", err);
      setTransactionStatus({ 
        message: "Failed to load presale data", 
        type: "error" 
      });
    }
  };

  const handleContribute = async () => {
    if (!account) {
      setTransactionStatus({ 
        message: "Please connect your wallet first", 
        type: "error" 
      });
      return;
    }

    if (!contribution || Number(contribution) <= 0) {
      setTransactionStatus({ 
        message: "Please enter a valid contribution amount", 
        type: "error" 
      });
      return;
    }

    try {
      setTransactionStatus({ 
        message: "Processing contribution...", 
        type: "info" 
      });

      const contract = await getContractInstance("Presale");
      const signer = await contract.runner;
      const tx = await contract.connect(signer).participate(
        referrer || ethers.ZeroAddress, 
        { value: ethers.parseEther(contribution) }
      );

      await tx.wait();
      setTransactionStatus({ 
        message: "✅ Contribution successful! Tokens will be claimable after presale ends.", 
        type: "success" 
      });
      setContribution("");
      await fetchStats();
    } catch (err) {
      console.error("Contribution failed:", err);
      setTransactionStatus({ 
        message: `❌ Contribution failed: ${err.reason || err.message}`,
        type: "error" 
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setTransactionStatus({ 
      message: "Referral link copied to clipboard!", 
      type: "success" 
    });
    setTimeout(() => setTransactionStatus({ message: "", type: "" }), 3000);
  };

  const calculateProgress = () => {
    const hard = parseFloat(hardCap);
    const raised = parseFloat(totalRaised);
    return Math.min((raised / hard) * 100, 100);
  };

  const countdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      return <span className="text-red-500">Presale Ended</span>;
    }
    return (
      <span className="font-semibold">
        {days}d {hours}h {minutes}m {seconds}s
      </span>
    );
  };

  if (!account) {
    return (
      <section className="p-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">🚀 IMALI Token Presale</h2>
        <div className="flex justify-center mb-8">
          <img 
            src={FlowerAnimation} 
            alt="Presale Animation" 
            className="w-40 h-40 animate-pulse" 
          />
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Join the IMALI Presale</h3>
          <p className="text-gray-600 mb-6">
            Connect your wallet to participate in the presale and secure your IMALI tokens at the best price
          </p>

          <div className="flex flex-col space-y-4">
            <button
              onClick={connectMetaMask}
              disabled={isConnecting}
              className="flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
            >
              <FaWallet className="mr-2" />
              {isConnecting ? "Connecting..." : "Connect with MetaMask"}
            </button>
            
            <button
              onClick={connectWalletConnect}
              disabled={isConnecting}
              className="flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <img 
                src="/walletconnect-icon.svg" 
                alt="WalletConnect" 
                className="w-5 h-5 mr-2" 
              />
              {isConnecting ? "Connecting..." : "Connect with WalletConnect"}
            </button>
          </div>

          {walletError && (
            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded text-sm">
              {walletError}
            </div>
          )}
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Presale Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Stat label="Token Price" value={`${tokenPrice} ETH`} icon={<FaEthereum />} />
            <Stat label="Hard Cap" value={`${hardCap} ETH`} icon={<FaEthereum />} />
          </div>
          <p className="text-sm text-gray-500 flex items-center">
            <MdOutlineSecurity className="mr-1" />
            Audited smart contracts with time-locked tokens
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">🚀 IMALI Token Presale</h2>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
        >
          Disconnect Wallet
        </button>
      </div>

      <div className="flex justify-center mb-8">
        <img 
          src={FlowerAnimation} 
          alt="Presale Animation" 
          className="w-32 h-32 animate-spin-slow" 
        />
      </div>

      {transactionStatus.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          transactionStatus.type === "error" ? "bg-red-100 text-red-700" :
          transactionStatus.type === "success" ? "bg-green-100 text-green-700" :
          "bg-blue-100 text-blue-700"
        }`}>
          {transactionStatus.message}
        </div>
      )}

      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Token Price" value={`${tokenPrice} ETH`} />
          <Stat label="Soft Cap" value={`${softCap} ETH`} />
          <Stat label="Hard Cap" value={`${hardCap} ETH`} />
          <Stat label="Total Raised" value={`${totalRaised} ETH`} />
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{calculateProgress().toFixed(2)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500" 
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
          <p className="text-lg font-semibold">
            <Countdown 
              date={presaleEnd} 
              renderer={countdownRenderer} 
            />
          </p>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Contribute to Presale</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="0.0"
            min="0.01"
            step="0.01"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum contribution: 0.01 ETH
          </p>
        </div>
        <button
          onClick={handleContribute}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md transition-all"
        >
          💰 Contribute Now
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Your Referral Link</h3>
        <p className="text-sm text-gray-600 mb-3">
          Earn 5% bonus tokens for every contribution made through your link
        </p>
        <div className="flex">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50"
          />
          <button
            onClick={handleCopy}
            className="px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg flex items-center"
          >
            <FaRegCopy />
          </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-4">📊 Token Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Token Allocation</h4>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Presale</span>
                <span className="font-medium">50%</span>
              </li>
              <li className="flex justify-between">
                <span>Liquidity</span>
                <span className="font-medium">20% (locked)</span>
              </li>
              <li className="flex justify-between">
                <span>Team</span>
                <span className="font-medium">15% (12mo vesting)</span>
              </li>
              <li className="flex justify-between">
                <span>Marketing</span>
                <span className="font-medium">10%</span>
              </li>
              <li className="flex justify-between">
                <span>Advisors</span>
                <span className="font-medium">5%</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Funds Usage</h4>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Development</span>
                <span className="font-medium">40%</span>
              </li>
              <li className="flex justify-between">
                <span>Marketing</span>
                <span className="font-medium">30%</span>
              </li>
              <li className="flex justify-between">
                <span>Liquidity</span>
                <span className="font-medium">20%</span>
              </li>
              <li className="flex justify-between">
                <span>Legal</span>
                <span className="font-medium">10%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ label, value, icon }) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <p className="text-sm text-gray-600 flex items-center">
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default PresaleSection;