// src/components/NetworkGuard.js

import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { POLYGON_MAINNET } from "../getContractInstance";

const NetworkGuard = ({ children, fallback }) => {
  const { chainId } = useWallet();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);

  useEffect(() => {
    setIsCorrectNetwork(chainId === POLYGON_MAINNET);
  }, [chainId]);

  if (!isCorrectNetwork) {
    return fallback || (
      <div className="text-center text-red-600 p-4 bg-red-100 rounded">
        🚫 Please switch to Polygon Mainnet to use this feature.
      </div>
    );
  }

  return children;
};

export default NetworkGuard;
