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
        if (!window.ethereum) {
          if (isMobile()) {
            window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            return;
          }
          throw new Error('Please install MetaMask.');
        }
        ethersProvider = new ethers.BrowserProvider(window.ethereum);
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
            1: "https://mainnet.infura.io/v3/YOUR_INFURA_ID",  // Replace with your Infura ID
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

      localStorage.setItem('walletType', type); // Save last connected wallet

    } catch (err) {
      console.error("Connection error:", err);
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      if (provider?.provider?.disconnect) {
        await provider.provider.disconnect();
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    }
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setWalletType(null);
    localStorage.removeItem('walletType');
  }, [provider]);

  const checkExistingConnection = useCallback(async () => {
    try {
      const savedWallet = localStorage.getItem('walletType');
      if (savedWallet) {
        await connectWallet(savedWallet);
      }
    } catch (err) {
      console.error("Auto reconnect failed:", err);
    }
  }, [connectWallet]);

  useEffect(() => {
    checkExistingConnection();
  }, [checkExistingConnection]);

  // Listen to account and chain changes
  useEffect(() => {
    if (walletType === 'metamask' && window.ethereum?.on) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (chainId) => {
        setChainId(Number(chainId));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [walletType, disconnectWallet]);

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
