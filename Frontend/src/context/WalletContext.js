import React, { createContext, useState, useContext, useEffect } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  useEffect(() => {
    // Check if user is on mobile
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });

      window.ethereum.on("chainChanged", (newChainId) => {
        setChainId(parseInt(newChainId));
        window.location.reload(); // Recommended to reload on chain change
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

  const openInMetaMaskMobile = () => {
    const dAppUrl = window.location.href.replace(/^https?:\/\//, '');
    const metamaskAppUrl = `https://metamask.app.link/dapp/${dAppUrl}`;

    // Attempt to open MetaMask
    window.location.href = metamaskAppUrl;

    // Immediately redirect to app store.  MetaMask will handle opening if installed.
    if (navigator.userAgent.match(/Android/i)) {
      window.location.href = "https://play.google.com/store/apps/details?id=io.metamask";
    } else if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
      window.location.href = "https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202";
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      if (isMobile) {
        setShowMobilePrompt(true);
      } else {
        setError("MetaMask not installed. Please install the extension.");
      }
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setError(null);
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError(error.message);
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