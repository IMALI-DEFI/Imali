// src/context/WalletContext.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";

/* =========================
   Context
========================= */
export const WalletContext = createContext(null);

/* =========================
   Provider
========================= */
export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);

  /* ---------- Init provider ---------- */
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const p = new BrowserProvider(window.ethereum);
    setProvider(p);

    // preload if already connected
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts?.[0]) setAccount(accounts[0]);
      })
      .catch(() => {});
  }, []);

  /* ---------- Chain + account listeners ---------- */
  useEffect(() => {
    if (!window.ethereum?.on) return;

    const onAccounts = (accounts) => {
      setAccount(accounts?.[0] || null);
    };

    const onChain = (hexId) => {
      try {
        setChainId(parseInt(hexId, 16));
      } catch {
        setChainId(null);
      }
    };

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  /* ---------- Actions ---------- */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    if (connecting) return;
    setConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts?.[0] || null);

      const hexId = await window.ethereum.request({
        method: "eth_chainId",
      });

      setChainId(parseInt(hexId, 16));
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = useCallback(() => {
    // MetaMask cannot truly disconnect programmatically
    setAccount(null);
    setChainId(null);
  }, []);

  /* ---------- Value ---------- */
  const value = useMemo(
    () => ({
      account,
      chainId,
      provider,
      connecting,
      connectWallet,
      disconnectWallet,
    }),
    [account, chainId, provider, connecting, connectWallet, disconnectWallet]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/* =========================
   SAFE HOOK (CRITICAL FIX)
========================= */
export function useWallet() {
  const ctx = React.useContext(WalletContext);

  // 🚨 THIS IS THE FIX 🚨
  // Never return undefined — EVER
  if (!ctx) {
    return {
      account: null,
      chainId: null,
      provider: null,
      connecting: false,
      connectWallet: async () => {
        throw new Error("WalletProvider not mounted");
      },
      disconnectWallet: () => {},
    };
  }

  return ctx;
}
