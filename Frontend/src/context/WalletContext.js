import { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import PropTypes from 'prop-types';

const WalletContext = createContext(null);

export const WalletProvider = ({ children = null }) => {
  const [state, setState] = useState({
    account: null,
    chainId: null,
    error: null,
    isConnecting: false,
    provider: null
  });

  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const handleAccountsChanged = useCallback((accounts) => {
    setState(prev => ({
      ...prev,
      account: accounts[0] || null
    }));
  }, []);

  const handleChainChanged = useCallback((chainId) => {
    setState(prev => ({
      ...prev,
      chainId: parseInt(chainId, 16)
    }));
  }, []);

  const setupListeners = useCallback((provider) => {
    if (provider?.on) {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (provider?.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const connectWallet = useCallback(async (walletType) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      let web3Provider;

      if (walletType === 'metamask') {
        if (!window.ethereum) {
          if (isMobile()) {
            window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            return;
          }
          throw new Error('Please install MetaMask');
        }

        web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        setupListeners(window.ethereum);

        setState(prev => ({
          ...prev,
          account: accounts[0],
          provider: web3Provider
        }));
      } else if (walletType === 'walletconnect') {
        const walletConnectProvider = new WalletConnectProvider({
          rpc: {
            1: process.env.REACT_APP_INFURA_MAINNET_URL,
            56: "https://bsc-dataseed.binance.org/",
            137: "https://polygon-rpc.com/"
          }
        });

        await walletConnectProvider.enable();
        web3Provider = new ethers.BrowserProvider(walletConnectProvider);
        const signer = await web3Provider.getSigner();

        setState(prev => ({
          ...prev,
          account: await signer.getAddress(),
          provider: web3Provider
        }));
      }

      const network = await web3Provider.getNetwork();
      setState(prev => ({
        ...prev,
        chainId: Number(network.chainId)
      }));
    } catch (err) {
      console.error("Connection error:", err);
      setState(prev => ({
        ...prev,
        error: err.message || "Connection failed"
      }));
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [isMobile, setupListeners]);

  const disconnectWallet = useCallback(() => {
    setState({
      account: null,
      chainId: null,
      error: null,
      isConnecting: false,
      provider: null
    });
  }, []);

  const getSigner = useCallback(async () => {
    if (!state.provider) throw new Error("Not connected");
    return await state.provider.getSigner();
  }, [state.provider]);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const network = await provider.getNetwork();
            setupListeners(window.ethereum);
            setState({
              account: accounts[0],
              chainId: Number(network.chainId),
              provider,
              error: null,
              isConnecting: false
            });
          }
        } catch (err) {
          console.error("Connection check failed:", err);
        }
      }
    };
    checkConnection();
  }, [setupListeners]);

  const value = useMemo(() => ({
    ...state,
    connectWallet,
    disconnectWallet,
    getSigner
  }), [state, connectWallet, disconnectWallet, getSigner]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

WalletProvider.propTypes = {
  children: PropTypes.node
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
