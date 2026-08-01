// src/hooks/useOwner.js
import { useMemo } from "react";

/**
 * Simple owner hook used by Admin routes/panels.
 * Reads an owner address from env (CRA: REACT_APP_OWNER_ADDRESS).
 * In production, replace with an on-chain or backend check.
 */
export default function useOwner(walletAddress) {
  const owner = (process.env.REACT_APP_OWNER_ADDRESS || "").toLowerCase();
  return useMemo(() => {
    const wa = (walletAddress || "").toLowerCase();
    return {
      isOwner: owner && wa && wa === owner,
      ownerAddress: owner,
    };
  }, [walletAddress, owner]);
}
