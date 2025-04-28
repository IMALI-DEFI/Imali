// WalletContext.js
import { createContext, useState, useEffect, useCallback } from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);

  // Mobile detection
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const connectWallet = useCallback(async (walletType) => {
    setIsConnecting(true);
    setError(null);

    try {
      let web3Provider;
      
      if (walletType === 'metamask') {
        if (!window.ethereum) {
          if (isMobile()) {
            // Deep link to MetaMask mobile app
            window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            return;
          }
          throw new Error('Please install MetaMask');
        }
        web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } 
      else if (walletType === 'walletconnect') {
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
        web3Provider = new ethers.BrowserProvider(walletConnectProvider);
        const signer = await web3Provider.getSigner();
        setAccount(await signer.getAddress());
      }

      const network = await web3Provider.getNetwork();
      setChainId(Number(network.chainId));
      setProvider(web3Provider);
      
    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setError(null);
  }, []);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
          setProvider(provider);
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
        error,
        isConnecting,
        provider,
        connectWallet,
        disconnectWallet,
        getSigner: async () => {
          if (!provider) throw new Error("Not connected");
          return await provider.getSigner();
        }
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);