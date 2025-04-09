import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import Countdown from "react-countdown";
import { FaRegCopy } from "react-icons/fa";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import FlowerAnimation from "../assets/animations/flower-opening.svg";
import BronzeImg from "../assets/images/nfts/nft-tier-bronze.png";
import SilverImg from "../assets/images/nfts/nft-tier-silver.png";
import GoldImg from "../assets/images/nfts/nft-tier-gold.png";

Chart.register(ArcElement, Tooltip, Legend);

const tierData = [
  { name: "Bronze", bonus: "5%", image: BronzeImg, description: "Basic staking access" },
  { name: "Silver", bonus: "10%", image: SilverImg, description: "Boosted APY + Yield access" },
  { name: "Gold", bonus: "20%", image: GoldImg, description: "Highest APY + DAO Voting" },
];

const PresaleSection = () => {
  const { account } = useWallet();
  const [tokenPrice, setTokenPrice] = useState("0.005");
  const [tokenPriceUSD, setTokenPriceUSD] = useState("8.50"); // Approx
  const [softCap, setSoftCap] = useState("300");
  const [hardCap, setHardCap] = useState("750");
  const [totalRaised, setTotalRaised] = useState("0");
  const [contribution, setContribution] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referrer, setReferrer] = useState(null);
  const [referralEarnings, setReferralEarnings] = useState("0");
  const [presaleEnd, setPresaleEnd] = useState(new Date("2025-07-04T00:00:00Z"));
  const [claimable, setClaimable] = useState("0");

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
      const earned = await contract.referralEarnings(account);
      const claim = await contract.getClaimableTokens(account);
      setTotalRaised(ethers.formatEther(raised));
      setReferralEarnings(ethers.formatEther(earned));
      setClaimable(ethers.formatEther(claim));
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
      fetchStats();
      alert("✅ Contribution successful!");
    } catch (err) {
      console.error("Contribution failed:", err);
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
      fetchStats();
      alert("✅ Tokens claimed successfully!");
    } catch (err) {
      console.error("Claim failed:", err);
      alert("❌ Claim failed");
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

  const doughnutData = {
    labels: ["Raised", "Remaining"],
    datasets: [
      {
        data: [parseFloat(totalRaised), parseFloat(hardCap) - parseFloat(totalRaised)],
        backgroundColor: ["#10b981", "#e5e7eb"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-6">🚀 IMALI Token Presale</h2>
      <div className="flex justify-center mb-6">
        <img src={FlowerAnimation} alt="Presale Animation" className="w-40 h-40" />
      </div>

      <div className="bg-white shadow rounded p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <Stat label="Token Price" value={`${tokenPrice} ETH (~$${tokenPriceUSD})`} />
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
          <Doughnut data={doughnutData} />
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
        <div className="flex gap-2 items-center overflow-x-auto">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 p-2 border rounded min-w-0"
          />
          <button
            onClick={handleCopy}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
          >
            <FaRegCopy />
          </button>
        </div>
        <p className="text-xs mt-2 text-gray-600">You'll earn bonus tokens when friends use this link!</p>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-xl font-bold mb-4">🎁 NFT Tiers & Mint</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {tierData.map((tier) => (
            <div key={tier.name} className="text-center border rounded-lg p-4">
              <img src={tier.image} alt={tier.name} className="h-32 mx-auto mb-2 object-contain" />
              <h4 className="text-lg font-bold">{tier.name}</h4>
              <p className="text-sm text-gray-600">{tier.description}</p>
              <p className="text-sm text-blue-600">Bonus: {tier.bonus}</p>
              <button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm">
                Mint {tier.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-xl font-bold mb-2">🎉 Claim Your Tokens</h3>
        <p className="text-sm mb-2">After presale ends, you'll be able to claim your IMALI tokens here.</p>
        <p className="text-sm text-gray-600 mb-3">Claimable: {claimable} IMALI</p>
        <button
          onClick={handleClaimTokens}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
        >
          🎯 Claim Tokens
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-xl font-bold mb-4">💰 Referral Earnings</h3>
        <p className="text-sm text-gray-700 mb-1">You've earned:</p>
        <p className="text-lg font-semibold text-green-700">{referralEarnings} bonus tokens</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
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
        <h3 className="text-xl font-bold mb-4">❓ Presale FAQ & How It Works</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li><strong>What is IMALI?</strong> A DeFi token with staking, yield, NFTs, and DAO rewards.</li>
          <li><strong>How does the presale work?</strong> Contribute ETH, earn IMALI tokens and referral bonuses. After July 4, claim your tokens.</li>
          <li><strong>What do I need to do?</strong> Connect your wallet, enter ETH amount, click contribute. Share your referral link!</li>
          <li><strong>What do I get for contributing?</strong> IMALI tokens at 0.005 ETH each + additional rewards.</li>
          <li><strong>Are rewards just tokens?</strong> No! Bonuses include extra tokens and exclusive NFT perks.</li>
          <li><strong>Where can I trade IMALI?</strong> After launch on <a className="text-blue-600 underline" href="https://app.uniswap.org/explore/tokens/polygon/0x15d3f466d34df102383760ccc70f9f970fcead09" target="_blank" rel="noreferrer">Uniswap</a>.</li>
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
