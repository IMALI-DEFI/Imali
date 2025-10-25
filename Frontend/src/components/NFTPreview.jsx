// src/components/NFTPreview.jsx
import React from "react";

// Import images so the bundler includes them
import imgStarter from "../../assets/images/nfts/nft-starter.png";
import imgPro     from "../../assets/images/nfts/nft-pro.png";
import imgElite   from "../../assets/images/nfts/nft-elite.png";

// Map canonical tiers to assets + perks
const CANONICAL = {
  STARTER: {
    img: imgStarter,
    perks: ["Basic staking access", "Royalties"],
    label: "Starter",
  },
  PRO: {
    img: imgPro,
    perks: ["Boosted APY", "Royalties", "Yield access"],
    label: "Pro",
  },
  ELITE: {
    img: imgElite,
    perks: ["Highest APY boost", "All perks", "DAO voting"],
    label: "Elite",
  },
};

// Accept aliases like Bronze/Silver/Gold -> Starter/Pro/Elite
function normalizeTier(tier) {
  const t = String(tier || "").trim().toUpperCase();
  if (["STARTER", "BRONZE", "TIER 1"].includes(t)) return "STARTER";
  if (["PRO", "SILVER", "TIER 2"].includes(t)) return "PRO";
  if (["ELITE", "GOLD", "TIER 3"].includes(t)) return "ELITE";
  // fallback
  return "STARTER";
}

const NFTPreview = ({ tier = "Starter" }) => {
  const key = normalizeTier(tier);
  const data = CANONICAL[key];

  return (
    <div className="text-center p-4 border rounded-lg shadow-md bg-white/5 border-white/10">
      <h3 className="text-xl font-semibold text-blue-700 mb-2">
        {data.label} Tier NFT
      </h3>

      <img
        src={data.img}
        alt={`${data.label} NFT`}
        className="w-full max-w-xs mx-auto rounded-md mb-4"
        onError={(e) => {
          // graceful fallback if an asset path ever breaks
          e.currentTarget.src = imgStarter;
        }}
      />

      <ul className="text-left list-disc list-inside text-sm text-gray-700 space-y-1">
        {data.perks.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
};

export default NFTPreview;
