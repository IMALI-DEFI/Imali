// 📦 Enhanced PresaleSection.js with Animation, FAQ, Novice Instructions, Referral Support, Uniswap Info
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import Countdown from "react-countdown";
import { FaRegCopy } from "react-icons/fa";
import FlowerAnimation from "../assets/animations/flower-opening.svg";
import BronzeImg from "../assets/images/nfts/nft-tier-bronze.png";
import SilverImg from "../assets/images/nfts/nft-tier-silver.png";
import GoldImg from "../assets/images/nfts/nft-tier-gold.png";

const tierData = [
  { name: "Bronze", bonus: "5%", image: BronzeImg, description: "Basic staking access" },
  { name: "Silver", bonus: "10%", image: SilverImg, description: "Boosted APY + Yield access" },
  { name: "Gold", bonus: "20%", image: GoldImg, description: "Highest APY + DAO Voting" },
];

const PresaleSection = () => {
  const { account } = useWallet();
  const [tokenPrice, setTokenPrice] = useState("0.005");
  const [softCap, setSoftCap] = useState("300");
  const [hardCap, setHardCap] = useState("750");
  const [totalRaised, setTotalRaised] = useState("0");
  const [contribution, setContribution] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrer, setReferrer] = useState(null);
  const [presaleEnd, setPresaleEnd] = useState(new Date("2025-07-04T00:00:00Z"));

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
    }
  };

  const handleContribute = async () => {
    try {
      const contract = await getContractInstance("Presale");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract.connect(signer).participate(referrer || ethers.ZeroAddress, {
        value: ethers.parseEther(contribution),
      });
      await tx.wait();
      alert("✅ Contribution successful!");
    } catch (err) {
      console.error("Contribution failed:", err);
      alert("❌ Contribution failed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Copied referral link!");
  };

  const calculateProgress = () => {
    const hard = parseFloat(hardCap);
    const raised = parseFloat(totalRaised);
    return Math.min((raised / hard) * 100, 100);
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-6">🚀 IMALI Token Presale</h2>
      <div className="flex justify-center mb-6">
        <img src={FlowerAnimation} alt="Presale Animation" className="w-40 h-40" />
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <p className="text-gray-800 text-base mb-2 font-semibold">How It Works:</p>
        <ul className="list-disc text-gray-600 pl-6">
          <li>Connect your wallet using MetaMask, Trust Wallet, or Coinbase Wallet.</li>
          <li>Enter the amount of ETH or MATIC to contribute (0.005 ETH = 1 IMALI).</li>
          <li>Optional: Share your referral link to earn bonus tokens!</li>
          <li>After July 4, 2025, return here to claim your tokens and rewards.</li>
        </ul>
      </div>

      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <Stat label="Token Price" value={`${tokenPrice} ETH`} />
          <Stat label="Soft Cap" value={`${softCap} ETH`} />
          <Stat label="Hard Cap" value={`${hardCap} ETH`} />
          <Stat label="Total Raised" value={`${totalRaised} ETH`} />
          <div className="col-span-2">
            <p className="text-sm text-gray-600">Ends In</p>
            <p className="text-lg font-semibold text-blue-600">
              <Countdown date={presaleEnd} />
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-1 flex justify-between">
            <span>Progress</span>
            <span>{calculateProgress().toFixed(2)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-green-500 h-4 rounded-full transition-all duration-700" style={{ width: `${calculateProgress()}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow p-4 rounded mb-6">
        <label className="block text-sm font-semibold mb-1">Your Contribution (ETH)</label>
        <input
          type="number"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          placeholder="e.g. 0.5"
        />
        <button
          onClick={handleContribute}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
        >
          💸 Contribute Now
        </button>
      </div>

      <div className="bg-white shadow p-4 rounded mb-6">
        <label className="block text-sm font-semibold mb-2">Your Referral Link</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 p-2 border rounded text-sm"
          />
          <button
            onClick={handleCopy}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
          >
            <FaRegCopy />
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h3 className="text-xl font-bold mb-4">📘 Tokenomics Overview</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>50% Presale Distribution</li>
          <li>20% Liquidity Pool (locked)</li>
          <li>15% Team (12-month vesting)</li>
          <li>10% Marketing & Growth</li>
          <li>5% Advisors</li>
        </ul>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h3 className="text-xl font-bold mb-4">❓ FAQ</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li><strong>How do I contribute?</strong> Connect your wallet, input your contribution, and click "Contribute Now."</li>
          <li><strong>Is there a referral bonus?</strong> Yes. You earn 5% bonus in IMALI tokens when someone contributes with your link.</li>
          <li><strong>How are tokens distributed?</strong> You can claim your tokens after the presale ends through the claim page.</li>
          <li><strong>Can I add liquidity?</strong> Yes, IMALI is live on Uniswap: <a href="https://app.uniswap.org/explore/tokens/polygon/0x15d3f466d34df102383760ccc70f9f970fcead09" target="_blank" className="text-blue-500 underline">View IMALI on Uniswap</a>.</li>
          <li><strong>Do I need MATIC or ETH?</strong> IMALI supports MATIC for Polygon; ETH for Ethereum presale versions.</li>
        </ul>
      </div>
    </section>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default PresaleSection;
