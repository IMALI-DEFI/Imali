import React, { createContext, useState, useContext, useEffect } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });

      window.ethereum.on("chainChanged", (newChainId) => {
        setChainId(parseInt(newChainId));
      });

      const getInitialData = async () => {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) setAccount(accounts[0]);
          const chainId = await window.ethereum.request({ method: "eth_chainId" });
          setChainId(parseInt(chainId));
        } catch (error) {
          console.error("Error getting initial wallet data:", error);
        }
      };
      getInitialData();
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask not installed");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) setAccount(accounts[0]);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError(error.message);
    }
  };

  const disconnectWallet = () => setAccount(null);

  return (
    <WalletContext.Provider value={{ account, chainId, error, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

// Add this export
export const useWallet = () => useContext(WalletContext);