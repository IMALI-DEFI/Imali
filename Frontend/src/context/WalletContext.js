import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const connectWallet = useCallback(async (type) => {
    setIsConnecting(true);
    setError(null);

    try {
      let ethersProvider;

      if (type === 'metamask') {
        // Enhanced MetaMask detection and mobile handling
        if (!window.ethereum) {
          if (isMobile()) {
            // Universal link that works across all browsers
            const universalLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            
            // Try to open directly first
            window.location.href = universalLink;
            
            // Fallback for Safari and other browsers
            setTimeout(() => {
              window.open(universalLink, '_blank');
            }, 500);
            
            return;
          } else {
            // Desktop - direct to MetaMask install page
            window.open('https://metamask.io/download.html', '_blank');
            throw new Error('Please install MetaMask extension.');
          }
        }

        // Check if MetaMask is the injected provider
        if (!window.ethereum.isMetaMask) {
          // Handle cases where another wallet is injected
          const providers = window.ethereum.providers || [];
          const metamaskProvider = providers.find(p => p.isMetaMask) || window.ethereum;
          
          if (!metamaskProvider.isMetaMask) {
            throw new Error('Please install MetaMask.');
          }
          
          ethersProvider = new ethers.BrowserProvider(metamaskProvider);
        } else {
          ethersProvider = new ethers.BrowserProvider(window.ethereum);
        }

        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        const network = await ethersProvider.getNetwork();
        
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType('metamask');
      } 
      else if (type === 'walletconnect') {
        const walletConnectProvider = new WalletConnectProvider({
          rpc: {
            1: "https://mainnet.infura.io/v3/YOUR_INFURA_ID",
            56: "https://bsc-dataseed.binance.org/",
            137: "https://polygon-rpc.com/"
          },
          qrcodeModalOptions: {
            mobileLinks: isMobile() ? ['metamask', 'trust'] : []
          }
        });

        await walletConnectProvider.enable();
        ethersProvider = new ethers.Web3Provider(walletConnectProvider, "any");

        const signer = ethersProvider.getSigner();
        setAccount(await signer.getAddress());
        const network = await ethersProvider.getNetwork();
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType('walletconnect');
      }

      localStorage.setItem('walletType', type);

    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ... rest of the WalletProvider implementation remains the same ...

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        error,
        isConnecting,
        provider,
        walletType,
        connectWallet,
        disconnectWallet,
        getSigner: async () => {
          if (!provider) throw new Error("Wallet not connected.");
          return await provider.getSigner();
        }
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
