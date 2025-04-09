// 📦 PresaleSection.js (Updated for new referral-enabled ABI)
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
        <h3 className="text-xl font-bold mb-4">❓ Presale FAQ</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li><strong>What is IMALI?</strong> IMALI is a DeFi token offering staking, DAO voting, and NFT-based perks.</li>
          <li><strong>What is the presale price?</strong> 1 IMALI = 0.005 ETH for early investors.</li>
          <li><strong>How do I buy?</strong> Connect your wallet, enter the amount in ETH, and click contribute.</li>
          <li><strong>What do I get for contributing?</strong> IMALI tokens and eligibility for NFT rewards + referral bonuses.</li>
          <li><strong>How is the token distributed?</strong> Through smart contracts with vesting logic. See tokenomics section.</li>
          <li><strong>What if I refer a friend?</strong> You get a 5% bonus in tokens when your link is used.</li>
          <li><strong>When can I claim?</strong> After the presale ends (July 4, 2025), tokens become claimable.</li>
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
