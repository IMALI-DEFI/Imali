// src/context/WalletContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if MetaMask is installed
  useEffect(() => {
    const checkMetaMask = () => {
      if (window.ethereum && window.ethereum.isMetaMask) {
        setIsMetaMaskInstalled(true);
        setError(null);
        return true;
      } else {
        setIsMetaMaskInstalled(false);
        setError("Please install MetaMask to use this application");
        return false;
      }
    };

    checkMetaMask();

    // Listen for MetaMask installation
    const checkInterval = setInterval(checkMetaMask, 3000);
    return () => clearInterval(checkInterval);
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setChainId(network.chainId);
      
      // Setup listeners
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
      });

      window.ethereum.on('chainChanged', (chainId) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload();
      });

      setError(null);
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err.message);
      setAccount(null);
      setChainId(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setError(null);
  };

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const network = await provider.getNetwork();
            setAccount(accounts[0]);
            setChainId(network.chainId);
          }
        } catch (err) {
          console.error("Auto-connect error:", err);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isMetaMaskInstalled,
        error,
        loading,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
