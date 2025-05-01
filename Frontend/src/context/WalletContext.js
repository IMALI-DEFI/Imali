import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext
} from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { BrowserProvider } from 'ethers';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isMobile = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const connectWallet = useCallback(async (type) => {
    setIsConnecting(true);
    setError(null);

    try {
      let ethersProvider;

      if (type === 'metamask') {
        if (!window.ethereum) {
          if (isMobile()) {
            const universalLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            window.location.href = universalLink;
            setTimeout(() => {
              window.open(universalLink, '_blank');
            }, 500);
            return;
          } else {
            window.open('https://metamask.io/download.html', '_blank');
            throw new Error('Please install MetaMask extension.');
          }
        }

        const metamaskProvider =
          window.ethereum.providers?.find((p) => p.isMetaMask) ||
          window.ethereum;

        if (!metamaskProvider.isMetaMask) {
          throw new Error('MetaMask provider not found.');
        }

        ethersProvider = new BrowserProvider(metamaskProvider);

        const accounts = await ethersProvider.send('eth_requestAccounts', []);
        const network = await ethersProvider.getNetwork();

        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType('metamask');
      }

      else if (type === 'walletconnect') {
        const walletConnectProvider = new WalletConnectProvider({
          rpc: {
            1: 'https://mainnet.infura.io/v3/YOUR_INFURA_ID',
            56: 'https://bsc-dataseed.binance.org/',
            137: 'https://polygon-rpc.com/'
          },
          qrcodeModalOptions: {
            mobileLinks: isMobile() ? ['metamask', 'trust'] : []
          }
        });

        await walletConnectProvider.enable();
        ethersProvider = new BrowserProvider(walletConnectProvider);

        const signer = await ethersProvider.getSigner();
        const address = await signer.getAddress();
        const network = await ethersProvider.getNetwork();

        setAccount(address);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType('walletconnect');
      }

      localStorage.setItem('walletType', type);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet.');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setWalletType(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem('walletType');
  }, []);

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
          if (!provider) throw new Error('Wallet not connected.');
          return await provider.getSigner();
        }
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
