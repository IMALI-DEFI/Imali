import React from "react";
import Starter from "../../assets/images/nfts/nft-starter.png";
import Pro from "../../assets/images/nfts/nft-pro.png";
import Elite from "../../assets/images/nfts/nft-elite.png";

export default function NFTPreview() {
  const nfts = [Starter, Pro, Elite];
  return (
    <div>
      <div className="text-lg font-semibold mb-3">Your NFTs</div>
      <div className="grid sm:grid-cols-3 gap-4">
        {nfts.map((src, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-3">
            <img src={src} alt="" className="w-full h-36 object-cover rounded-lg border border-white/10" />
            <div className="text-sm mt-2 text-white/80">Tier #{i+1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
