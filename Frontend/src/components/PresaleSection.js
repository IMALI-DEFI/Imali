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

const NFTPreview = ({ tier, image, bonus, description, onMint, gasEstimate }) => (
  <div className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow relative">
    <img src={image} alt={`${tier} Tier NFT`} className="mx-auto h-40 object-contain mb-2" />
    <h4 className="font-bold text-lg">{tier} Tier</h4>
    <p className="text-sm text-gray-600 mb-2">{description}</p>
    <p className="text-sm text-blue-600">🎁 Bonus: {bonus}</p>
    {gasEstimate && <p className="text-xs text-gray-400 mt-1">Est. Gas: {gasEstimate} MATIC</p>}
    <button
      onClick={onMint}
      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded text-sm"
    >
      Mint {tier}
    </button>
  </div>
);

const PresaleSection = () => {
  const { account } = useWallet();
  const [tokenPrice, setTokenPrice] = useState("0.005");
  const [softCap, setSoftCap] = useState("300");
  const [hardCap, setHardCap] = useState("750");
  const [totalRaised, setTotalRaised] = useState("0");
  const [contribution, setContribution] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [presaleEnd, setPresaleEnd] = useState(new Date("2025-07-04T00:00:00Z"));
  const [gasEstimates, setGasEstimates] = useState({});

  useEffect(() => {
    if (account) {
      setReferralLink(`${window.location.origin}/presale?ref=${account}`);
      fetchStats();
      estimateGasForTiers();
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

  const estimateGasForTiers = async () => {
    try {
      const contract = await getContractInstance("NFT");
      const estimates = {};
      for (const tier of tierData) {
        const estimatedGas = await contract.estimateGas.mint(account);
        estimates[tier.name] = ethers.formatUnits(estimatedGas, "gwei").slice(0, 5);
      }
      setGasEstimates(estimates);
    } catch (e) {
      console.warn("Gas estimation failed", e);
    }
  };

  const handleMint = (tier) => {
    alert(`Minting ${tier} Tier NFT...`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Copied referral link!");
  };

  const handleContribute = async () => {
    try {
      const contract = await getContractInstance("Presale");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract.connect(signer).participate({
        value: ethers.parseEther(contribution),
      });
      await tx.wait();
      alert("✅ Contribution successful!");
    } catch (err) {
      console.error("Contribution failed:", err);
      alert("❌ Contribution failed");
    }
  };

  const calculateProgress = () => {
    const hard = parseFloat(hardCap);
    const raised = parseFloat(totalRaised);
    return Math.min((raised / hard) * 100, 100);
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      {/* existing content remains unchanged */}

      <div className="bg-white p-4 rounded shadow mt-6 text-center">
        <h3 className="text-xl font-bold mb-4">📢 Share the Presale</h3>
        <p className="text-gray-700 mb-4">Spread the word and earn referral bonuses!</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href={`https://twitter.com/intent/tweet?text=🔥 Join the IMALI presale and earn crypto + NFT perks! ${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Share on Twitter
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join the IMALI presale and earn bonuses!`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded"
          >
            Share on Telegram
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
          >
            Share on Facebook
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded"
          >
            Share on LinkedIn
          </a>
        </div>
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
