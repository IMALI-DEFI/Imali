// TokenPage.js
import React, { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import { getContractInstance } from "../getContractInstance";
import FlowerAnimation from "../assets/animations/flower-opening.svg";
import BronzeImg from "../assets/images/nfts/nft-tier-bronze.png";
import SilverImg from "../assets/images/nfts/nft-tier-silver.png";
import GoldImg from "../assets/images/nfts/nft-tier-gold.png";

const TokenPage = () => {
  const { account, connectWallet } = useWallet();
  const [minting, setMinting] = useState(false);

  const nftTiers = [
    {
      name: "Bronze Supporter NFT",
      price: "5", // MATIC
      image: BronzeImg,
      bonus: "Early Supporter Badge + Discord Shoutout",
    },
    {
      name: "Silver Yield Hero NFT",
      price: "10", // MATIC
      image: SilverImg,
      bonus: "Bonus IMALI airdrop after liquidity expansion (500 IMALI)",
    },
    {
      name: "Gold Governance Founder NFT",
      price: "20", // MATIC
      image: GoldImg,
      bonus: "Exclusive DAO voting rights + IMALI airdrop + Early Access",
    },
  ];

  const handleMintNFT = async (tierIndex) => {
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      setMinting(true);
      const contract = await getContractInstance("IMALINFT"); // make sure you have this contract connected
      const mintPrice = ethers.parseEther(nftTiers[tierIndex].price);
      const tx = await contract.mint(tierIndex, { value: mintPrice });
      await tx.wait();
      alert(`✅ Successfully minted your ${nftTiers[tierIndex].name}!`);
    } catch (err) {
      console.error("Minting error:", err);
      alert("❌ Minting failed. Please try again.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <section className="bg-gray-50 min-h-screen py-10 px-4">
      {/* Hero Banner */}
      <div className="text-center mb-8">
        <img src={FlowerAnimation} alt="IMALI Animation" className="w-40 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-green-700">Welcome to the IMALI Ecosystem!</h1>
        <p className="text-gray-700 mt-2">Buy Tokens. Mint NFTs. Support the Future of DeFi on Polygon.</p>
      </div>

      {/* How to Buy Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-10 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4">🛒 How to Buy IMALI Tokens</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 text-lg">
          <li>Connect your wallet (MetaMask, Trust Wallet, Coinbase Wallet).</li>
          <li>Make sure your wallet is set to the <span className="text-purple-700 font-bold">Polygon Network</span>.</li>
          <li>Get some MATIC (Polygon's token) in your wallet.</li>
          <li>Click the button below to swap MATIC for IMALI tokens instantly!</li>
        </ol>
        <div className="flex justify-center mt-6">
          <a
            href="https://app.uniswap.org/explore/tokens/polygon/0x15d3f466d34df102383760ccc70f9f970fcead09"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-xl"
          >
            🚀 Buy IMALI Tokens
          </a>
        </div>
      </div>

      {/* NFT Tiers Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-10 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">🎁 IMALI Supporter NFTs</h2>
        <p className="text-center text-gray-600 mb-6">Mint an NFT to directly support IMALI liquidity growth and unlock amazing bonuses!</p>
        <div className="grid md:grid-cols-3 gap-8">
          {nftTiers.map((tier, index) => (
            <div key={tier.name} className="border rounded-lg p-4 flex flex-col items-center text-center">
              <img src={tier.image} alt={tier.name} className="h-32 w-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700 mb-2">{tier.name}</h3>
              <p className="text-gray-600 mb-4">{tier.bonus}</p>
              <button
                onClick={() => handleMintNFT(index)}
                disabled={minting}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-5 rounded text-lg"
              >
                {minting ? "Minting..." : `Mint for ${tier.price} MATIC`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Community */}
      <div className="text-center text-sm text-gray-600 mt-10">
        <p>Powered by Polygon | Join the IMALI Movement!</p>
      </div>
    </section>
  );
};

export default TokenPage;
