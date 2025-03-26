import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);

  // Detect environment and initialize provider
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(mobileCheck);

    const initializeProvider = () => {
      if (typeof window.ethereum !== 'undefined') {
        setProvider(window.ethereum);
        
        // Handle cases where multiple wallets are installed
        if (window.ethereum.providers?.length) {
          const metamaskProvider = window.ethereum.providers.find(
            p => p.isMetaMask
          );
          if (metamaskProvider) setProvider(metamaskProvider);
        }
        
        // Check if already connected
        checkExistingConnection();
      } else if (mobileCheck) {
        setShowMobilePrompt(true);
      }
    };

    initializeProvider();

    // Handle provider injection after page load
    const handleInjection = () => {
      if (typeof window.ethereum !== 'undefined' && !provider) {
        initializeProvider();
      }
    };
    
    window.addEventListener('ethereum#initialized', handleInjection, {
      once: true,
    });

    return () => {
      window.removeEventListener('ethereum#initialized', handleInjection);
    };
  }, [provider]);

  // Check for existing connection
  const checkExistingConnection = useCallback(async () => {
    if (!provider) return;

    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        setChainId(parseInt(currentChainId, 16));
      }
    } catch (err) {
      handleConnectionError(err, "Auto-connect check failed");
    }
  }, [provider]);

  // Event listeners for account and chain changes
  useEffect(() => {
    if (!provider) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // MetaMask locked or user disconnected all accounts
        setAccount(null);
        setError('Wallet disconnected. Please connect again.');
      } else if (account !== accounts[0]) {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (hexChainId) => {
      const newChainId = parseInt(hexChainId, 16);
      if (chainId !== newChainId) {
        setChainId(newChainId);
        // Optional: Add chain change handling logic here
      }
    };

    const handleDisconnect = (error) => {
      console.error('Provider disconnected:', error);
      setAccount(null);
      setError('Wallet connection lost. Please reconnect.');
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
    };
  }, [provider, account, chainId]);

  // Enhanced error handler
  const handleConnectionError = (error, context) => {
    console.error(`${context}:`, error);
    
    let userMessage = 'An unknown error occurred';
    
    if (error.code) {
      switch (error.code) {
        case 4001:
          userMessage = 'Connection request rejected';
          break;
        case -32002:
          userMessage = 'Request already pending. Check your wallet';
          break;
        case 4902:
          userMessage = 'Unsupported network. Please switch chains';
          break;
        default:
          userMessage = `Wallet error: ${error.message || error.code}`;
      }
    } else if (error.message) {
      userMessage = error.message.includes('not authorized')
        ? 'Please authorize this site in MetaMask'
        : error.message;
    }
    
    setError(userMessage);
    setIsConnecting(false);
  };

  // Connection handler with full error handling
  const connectWallet = useCallback(async () => {
    if (!provider) {
      if (isMobile) {
        setShowMobilePrompt(true);
      } else {
        setError('MetaMask not detected. Please install the extension.');
      }
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // First request accounts
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts',
      }).catch(err => {
        throw new Error(`Account request failed: ${err.message}`);
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      // Then get chain ID
      const currentChainId = await provider.request({ 
        method: 'eth_chainId',
      }).catch(err => {
        throw new Error(`Chain ID request failed: ${err.message}`);
      });

      setAccount(accounts[0]);
      setChainId(parseInt(currentChainId, 16));
      setError(null);
    } catch (err) {
      handleConnectionError(err, 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [provider, isMobile]);

  // Mobile connection handler
  const openInMetaMaskMobile = useCallback(() => {
    try {
      const currentUrl = encodeURIComponent(window.location.href);
      const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl}`;
      
      // Create hidden iframe for better deep link handling
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', metamaskDeepLink);
      iframe.setAttribute('style', 'display:none;');
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
        // Fallback to app stores
        if (/android/i.test(navigator.userAgent)) {
          window.location.href = "https://play.google.com/store/apps/details?id=io.metamask";
        } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
          window.location.href = "https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202";
        }
      }, 500);
    } catch (err) {
      handleConnectionError(err, 'Mobile deep link failed');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setError(null);
  }, []);

  // Debugging values
  const debugInfo = {
    providerAvailable: !!provider,
    providerInfo: provider
      ? {
          isMetaMask: provider.isMetaMask,
          chainId: provider.chainId,
          selectedAddress: provider.selectedAddress,
        }
      : null,
    environment: {
      isMobile,
      userAgent: navigator.userAgent,
    },
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        error,
        isMobile,
        isConnecting,
        showMobilePrompt,
        provider,
        debugInfo,
        connectWallet,
        disconnectWallet,
        openInMetaMaskMobile,
        setShowMobilePrompt,
        checkConnection: checkExistingConnection,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
