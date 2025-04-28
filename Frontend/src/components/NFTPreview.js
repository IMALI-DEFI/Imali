// src/components/NFTPreview.js

import React from "react";

const TIER_IMAGES = {
  Bronze: "/assets/images/nfts//nft-bronze.png",
  Silver: "/assets/images/nfts//nft-silver.png",
  Gold: "/assets/images/nfts//nft-gold.png",
};

const TIERS = {
  Bronze: ["Basic staking access", "Royalties"],
  Silver: ["Boosted APY", "Royalties", "Yield access"],
  Gold: ["Highest APY boost", "All perks", "DAO voting"],
};

const NFTPreview = ({ tier }) => {
  const image = TIER_IMAGES[tier] || TIER_IMAGES.Bronze;
  const benefits = TIERS[tier] || TIERS.Bronze;

  return (
    <div className="text-center p-4 border rounded-lg shadow-md">
      <h3 className="text-xl font-semibold text-blue-700 mb-2">{tier} Tier NFT</h3>
      <img src={image} alt={`${tier} NFT`} className="w-full max-w-xs mx-auto rounded-md mb-4" />
      <ul className="text-left list-disc list-inside text-sm text-gray-700">
        {benefits.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
};

export default NFTPreview;
