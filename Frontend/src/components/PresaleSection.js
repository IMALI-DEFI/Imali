// 📦 Enhanced PresaleSection.js with NFT minting, token claim, chart, and referral
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import Countdown from "react-countdown";
import { FaRegCopy } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import Chart from "chart.js/auto";
import BronzeImg from "../assets/images/nfts/nft-tier-bronze.png";
import SilverImg from "../assets/images/nfts/nft-tier-silver.png";
import GoldImg from "../assets/images/nfts/nft-tier-gold.png";

const tierData = [
  { name: "Bronze", bonus: "5%", image: BronzeImg },
  { name: "Silver", bonus: "10%", image: SilverImg },
  { name: "Gold", bonus: "20%", image: GoldImg },
];

const PresaleSection = () => {
  const { account } = useWallet();
  const [referrer, setReferrer] = useState(null);
  const [referralLink, setReferralLink] = useState("");
  const [contribution, setContribution] = useState("");
  const [totalRaised, setTotalRaised] = useState("0");
  const [tokenClaimable, setTokenClaimable] = useState("0");
  const [presaleEnd] = useState(new Date("2025-07-04T00:00:00Z"));
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

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

      const tokens = await contract.getClaimableTokens(account);
      setTokenClaimable(ethers.formatEther(tokens));

      // Fake chart data for now
      const labels = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
      const values = Array.from({ length: 7 }, () => Math.random() * 100);
      setChartData({
        labels,
        datasets: [
          {
            label: "Total Raised (ETH)",
            data: values,
            fill: true,
            backgroundColor: "rgba(34,197,94,0.2)",
            borderColor: "#22c55e",
          },
        ],
      });
    } catch (err) {
      console.error("Fetch error:", err);
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
      fetchStats();
    } catch (err) {
      alert("❌ Contribution failed");
    }
  };

  const handleClaimTokens = async () => {
    try {
      const contract = await getContractInstance("Presale");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract.connect(signer).claimTokens();
      await tx.wait();
      alert("✅ Tokens claimed!");
      fetchStats();
    } catch (err) {
      alert("❌ Claim failed");
    }
  };

  const handleMint = async (tier) => {
    try {
      const contract = await getContractInstance("NFT");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await contract.connect(signer).mint(account);
      await tx.wait();
      alert(`✅ Minted ${tier} NFT`);
    } catch (err) {
      alert("❌ NFT Minting failed");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Copied referral link!");
  };

  const calculateProgress = () => {
    const hard = 750;
    const raised = parseFloat(totalRaised);
    return Math.min((raised / hard) * 100, 100);
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-6">🚀 IMALI Token Presale</h2>

      <div className="bg-white shadow p-4 rounded mb-6">
        <div className="text-center">
          <Line data={chartData} />
        </div>
      </div>

      <div className="bg-white shadow p-4 rounded mb-6">
        <p className="mb-2 font-semibold">Total Raised: {totalRaised} ETH</p>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-green-500 h-4 rounded-full transition-all duration-700" style={{ width: `${calculateProgress()}%` }}></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <input
          type="number"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          placeholder="e.g. 0.5 ETH"
          className="w-full p-2 border rounded mb-2"
        />
        <button
          onClick={handleContribute}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          💸 Contribute Now
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <label className="block text-sm font-semibold mb-1">Your Referral Link</label>
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
        <h3 className="text-xl font-bold mb-4">🎁 Mint Your NFT Tier</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {tierData.map(({ name, image, bonus }) => (
            <div key={name} className="text-center p-4 border rounded-lg hover:shadow-md">
              <img src={image} alt={`${name} Tier`} className="mx-auto h-32 mb-2" />
              <h4 className="font-bold">{name} Tier</h4>
              <p className="text-blue-600 text-sm mb-2">Bonus: {bonus}</p>
              <button
                onClick={() => handleMint(name)}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
              >
                Mint
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-xl font-bold mb-2">🎯 Claim Your Tokens</h3>
        <p className="mb-2">Claimable: {tokenClaimable} IMALI</p>
        <button
          onClick={handleClaimTokens}
          className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
        >
          Claim Tokens
        </button>
      </div>

      <div className="text-center mt-6">
        <a
          href="https://app.uniswap.org/explore/tokens/polygon/0x15d3f466d34df102383760ccc70f9f970fcead09"
          className="text-blue-500 underline hover:text-blue-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          View IMALI Token on Uniswap
        </a>
      </div>
    </section>
  );
};

export default PresaleSection;
