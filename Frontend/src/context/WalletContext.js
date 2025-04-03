import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ethersProvider, setEthersProvider] = useState(null);
  const [wcConnector, setWcConnector] = useState(null);

  // Detect mobile device
  useEffect(() => {
    const mobileCheck = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };
    setIsMobile(mobileCheck());
  }, []);

  // Handle automatic mobile connection
  const connectMobile = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const connector = new WalletConnectProvider({
        rpc: {
          1: "https://cloudflare-eth.com",
          5: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
          137: "https://polygon-rpc.com",
        },
        bridge: "https://bridge.walletconnect.org",
        qrcode: false, // Disable QR code on mobile
      });

      await connector.enable();

      // Directly open MetaMask or other wallet apps
      if (connector.connector?.uri) {
        const uri = connector.connector.uri;
        const deeplink = `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;
        window.location.href = deeplink;
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(connector);
      const signer = await ethersProvider.getSigner();
      const network = await ethersProvider.getNetwork();

      setAccount(await signer.getAddress());
      setChainId(Number(network.chainId));
      setEthersProvider(ethersProvider);
      setWcConnector(connector);
    } catch (err) {
      console.error("Mobile connection failed:", err);
      setError("Failed to connect. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Handle desktop connection
  const connectDesktop = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask or another Ethereum wallet");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setEthersProvider(provider);
    } catch (err) {
      console.error("Desktop connection failed:", err);
      setError(err.message || "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Smart connect function that chooses the right method
  const connectWallet = useCallback(async () => {
    if (isMobile) {
      return connectMobile();
    }
    return connectDesktop();
  }, [isMobile, connectMobile, connectDesktop]);

  // Disconnect handler
  const disconnectWallet = useCallback(() => {
    if (wcConnector) {
      wcConnector.disconnect();
    }
    setAccount(null);
    setChainId(null);
    setEthersProvider(null);
    setWcConnector(null);
    setError(null);
  }, [wcConnector]);

  // Check existing connection on load
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const network = await provider.getNetwork();
            setAccount(accounts[0]);
            setChainId(Number(network.chainId));
            setEthersProvider(provider);
          }
        } catch (err) {
          console.error("Auto-connect check failed:", err);
        }
      }
    };

    checkExistingConnection();
  }, []);

  // Event listeners for changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (hexChainId) => {
      setChainId(parseInt(hexChainId, 16));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnectWallet]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        error,
        isMobile,
        isConnecting,
        provider: ethersProvider,
        connectWallet,
        disconnectWallet,
        getSigner: useCallback(async () => {
          if (!ethersProvider) throw new Error("Not connected");
          return await ethersProvider.getSigner();
        }, [ethersProvider]),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
