// src/context/WalletContext.jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!window.ethereum) return;

    const p = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(p);

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts?.[0]) setAccount(accounts[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) return;

    const onAccounts = (accounts) => setAccount(accounts?.[0] || null);
    const onChain = (hex) => setChainId(parseInt(hex, 16));

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not installed");
    if (connecting) return;

    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts?.[0] || null);

      const hex = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(hex, 16));
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
  };

  const value = useMemo(
    () => ({
      account,
      chainId,
      provider,
      connecting,
      connectWallet,
      disconnectWallet,
    }),
    [account, chainId, provider, connecting, connectWallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = React.useContext(WalletContext);

  // 🚨 crash-proof fallback
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
