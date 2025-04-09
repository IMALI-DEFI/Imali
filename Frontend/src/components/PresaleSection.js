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
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  const mintNFT = async (tier) => {
    try {
      const contract = await getContractInstance("NFT");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract.connect(signer).mint(account);
      await tx.wait();
      alert(`✅ Successfully minted ${tier} NFT!`);
    } catch (err) {
      console.error("Minting failed:", err);
      alert("❌ Minting failed");
    }
  };

  const chartData = {
    labels: ["Soft Cap", "Hard Cap", "Raised"],
    datasets: [
      {
        label: "ETH",
        data: [softCap, hardCap, totalRaised],
        backgroundColor: ["#cbd5e0", "#a0aec0", "#48bb78"],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Presale Progress" },
    },
  };

  const calculateProgress = () => {
    const hard = parseFloat(hardCap);
    const raised = parseFloat(totalRaised);
    return Math.min((raised / hard) * 100, 100);
  };

  return (
    <section className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-6">🚀 IMALI Token Presale</h2>
      <div className="flex justify-center mb-6">
        <img src={FlowerAnimation} alt="Presale Animation" className="w-40 h-40" />
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
        <div className="mt-6">
          <Bar data={chartData} options={chartOptions} />
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
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleCopy}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
          >
            <FaRegCopy />
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-xl font-bold mb-4">🎁 NFT Tier Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tierData.map(tier => (
            <div key={tier.name} className="text-center p-4 border rounded hover:shadow-md">
              <img src={tier.image} alt={`${tier.name} NFT`} className="mx-auto h-40 object-contain mb-2" />
              <h4 className="font-bold text-lg">{tier.name} Tier</h4>
              <p className="text-sm text-gray-600 mb-1">{tier.description}</p>
              <p className="text-sm text-blue-600">🎁 Bonus: {tier.bonus}</p>
              <button
                onClick={() => mintNFT(tier.name)}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded text-sm"
              >
                Mint {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h3 className="text-xl font-bold mb-4">❓ Presale FAQ</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li><strong>What is IMALI?</strong> IMALI is a DeFi token offering staking, DAO voting, NFT rewards, and referral bonuses.</li>
          <li><strong>How do I contribute?</strong> Connect your wallet, input the amount of ETH, and click "Contribute Now".</li>
          <li><strong>What are NFT Tiers?</strong> Mint Bronze, Silver, or Gold NFTs for staking boosts and DAO access.</li>
          <li><strong>How do I earn referral rewards?</strong> Share your referral link with friends. When they contribute, you earn bonus tokens.</li>
          <li><strong>Where can I trade IMALI?</strong> Visit the <a className="text-blue-600 underline" href="https://app.uniswap.org/explore/tokens/polygon/0x15d3f466d34df102383760ccc70f9f970fcead09" target="_blank" rel="noopener noreferrer">Uniswap IMALI Listing</a>.</li>
          <li><strong>How can I claim tokens?</strong> After the presale ends, you’ll see a "Claim Tokens" button here.</li>
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
