import React, { createContext, useState, useContext, useEffect } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  // Enhanced mobile detection
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMetaMaskInjected = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    
    setIsMobile(isMobileDevice);
    
    // If on mobile but no injected provider, show prompt
    if (isMobileDevice && !isMetaMaskInjected) {
      setShowMobilePrompt(true);
    }
  }, []);

  // Initialize wallet listeners
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      };

      const handleChainChanged = (newChainId) => {
        setChainId(parseInt(newChainId, 16));
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      const initializeWallet = async () => {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
          const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(currentChainId, 16));
        } catch (err) {
          console.error("Failed to initialize wallet:", err);
        }
      };

      initializeWallet();

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Enhanced mobile connection handler
  const openInMetaMaskMobile = () => {
    const currentUrl = encodeURIComponent(window.location.href.replace(/^https?:\/\//, ''));
    const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl}`;
    
    // Try to open in MetaMask first
    window.location.href = metamaskDeepLink;
    
    // Fallback to app store after a short delay
    setTimeout(() => {
      if (/android/i.test(navigator.userAgent)) {
        window.location.href = "https://play.google.com/store/apps/details?id=io.metamask";
      } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        window.location.href = "https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202";
      }
    }, 500);
  };

  // Enhanced connection function
  const connectWallet = async () => {
    // Mobile-specific handling
    if (isMobile) {
      if (typeof window.ethereum !== 'undefined') {
        // Regular connection if MetaMask is injected
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);
          setError(null);
        } catch (err) {
          setError(err.message);
        }
      } else {
        // Show mobile prompt if no injected provider
        setShowMobilePrompt(true);
      }
      return;
    }

    // Desktop handling
    if (typeof window.ethereum === 'undefined') {
      setError("MetaMask extension not detected. Please install MetaMask.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setError(null);
  };

  return (
    <WalletContext.Provider value={{
      account,
      chainId,
      error,
      isMobile,
      showMobilePrompt,
      connectWallet,
      disconnectWallet,
      openInMetaMaskMobile,
      setShowMobilePrompt
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
