// src/context/TierContext.js
import React, { createContext, useContext, useState } from "react";

/**
 * Minimal TierContext to satisfy AdminPanel and other consumers.
 * Stores the current tier and allows updating it.
 * Replace with your real logic as needed.
 */
const TierContext = createContext(null);

export function TierProvider({ children }) {
  const [tier, setTier] = useState("starter"); // starter | pro | elite
  const value = { tier, setTier };
  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) {
    throw new Error("useTier must be used within a TierProvider");
  }
  return ctx;
}

export default TierContext;
