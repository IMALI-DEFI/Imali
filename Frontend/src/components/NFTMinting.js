// NFTMinting.js
import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { getContractInstance, POLYGON_MAINNET } from "../getContractInstance";
import { ethers } from "ethers";
import NFTAnimation from "../assets/animations/nft-animation.svg";
import NFTPreview from "./NFTPreview";
import FAQAccordion from "./FAQAccordion";
import NetworkGuard from "./NetworkGuard";

const TIER_IMAGES = {
  Bronze: "/assets/images/nfts/nft-tier-bronze.png",
  Silver: "/assets/images/nfts/nft-tier-silver.png",
  Gold: "/assets/images/nfts/nft-tier-gold.png",
};

const TIERS = [
  {
    name: "Bronze",
    benefits: [
      "Basic staking access",
      "Earn passive royalties",
      "Entry to IMALI community"
    ],
    description: "Ideal for beginners. Start earning with minimal risk."
  },
  {
    name: "Silver",
    benefits: [
      "Boosted APY on staking",
      "Eligible for yield farming",
      "Earn enhanced royalties"
    ],
    description: "For active users ready to level up rewards."
  },
  {
    name: "Gold",
    benefits: [
      "Highest APY boost",
      "DAO voting rights",
      "Priority access to new pools",
      "All Silver & Bronze perks"
    ],
    description: "Premium tier with governance and maximum benefits."
  }
];

const NFTMinting = () => {
  const { account, chainId, connectWallet } = useWallet();
  const [status, setStatus] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintedTier, setMintedTier] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [selectedTier, setSelectedTier] = useState("Bronze");

  const switchToPolygon = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x89",
          chainName: "Polygon Mainnet",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: ["https://polygon-rpc.com"],
          blockExplorerUrls: ["https://polygonscan.com"]
        }]
      });
      return true;
    } catch (err) {
      setStatus("Failed to switch network: " + err.message);
      return false;
    }
  };

  const detectTierFromTokenURI = async (contract, tokenId) => {
    try {
      const uri = await contract.tokenURI(tokenId);
      if (uri.toLowerCase().includes("gold")) return "Gold";
      if (uri.toLowerCase().includes("silver")) return "Silver";
      return "Bronze";
    } catch (e) {
      console.warn("Error detecting tier from tokenURI", e);
      return "Bronze";
    }
  };

  const handleMint = async () => {
    if (!account) return setStatus("Connect your wallet first.");
    if (chainId !== POLYGON_MAINNET) {
      setStatus("Switching to Polygon...");
      const switched = await switchToPolygon();
      if (!switched) return;
    }

    try {
      setIsMinting(true);
      setStatus("Minting NFT...");
      const contract = await getContractInstance("NFT", { chainId: POLYGON_MAINNET });
      const tx = await contract.mint(account);
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      const transferEvent = receipt.logs.find(log => log.topics[0] === ethers.id("Transfer(address,address,uint256)"));

      if (transferEvent) {
        const tokenId = ethers.getBigInt(transferEvent.topics[3]).toString();
        const tier = await detectTierFromTokenURI(contract, tokenId);
        setMintedTier(tier);
      }

      setStatus("Minted successfully!");
    } catch (err) {
      setStatus("Mint failed: " + (err.reason || err.message));
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <NetworkGuard chainId={POLYGON_MAINNET}>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-blue-700 mb-4 text-center">Mint Your IMALI NFT</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="space-y-4">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full p-3 border rounded"
            >
              {TIERS.map(tier => (
                <option key={tier.name} value={tier.name}>{tier.name} Tier</option>
              ))}
            </select>
            <img src={TIER_IMAGES[selectedTier]} alt="Tier NFT" className="rounded-lg shadow" />
            <p className="text-gray-600 text-sm mt-2">{TIERS.find(t => t.name === selectedTier)?.description}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {TIERS.find(t => t.name === selectedTier)?.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            {!account ? (
              <button onClick={connectWallet} className="bg-green-600 text-white py-3 rounded">
                🔗 Connect Wallet
              </button>
            ) : (
              <>
                <p className="text-sm text-gray-600">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="bg-blue-600 text-white py-3 rounded"
                >
                  {isMinting ? "Minting..." : "🚀 Mint Now"}
                </button>
              </>
            )}
            {status && <p className="text-sm text-gray-700">{status}</p>}
            <img src={NFTAnimation} alt="Minting Animation" className="w-64 mx-auto" />
          </div>
        </div>

        {mintedTier && <NFTPreview tier={mintedTier} hash={txHash} />}

        <div className="mt-10">
          <FAQAccordion />
        </div>
      </div>
    </NetworkGuard>
  );
};

export default NFTMinting;
