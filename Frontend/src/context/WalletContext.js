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
  const [rawProvider, setRawProvider] = useState(null);
  const [wcConnector, setWcConnector] = useState(null);

  useEffect(() => {
    const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      navigator.userAgent.toLowerCase()
    );
    setIsMobile(mobileCheck);

    if (typeof window.ethereum !== "undefined") {
      const provider =
        window.ethereum.providers?.find((p) => p.isMetaMask) || window.ethereum;
      setRawProvider(provider);
      checkExistingConnection(provider);
    }
  }, []);

  useEffect(() => {
    if (!rawProvider?.on) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (hexChainId) => {
      setChainId(parseInt(hexChainId, 16));
    };

    const handleDisconnect = () => {
      setAccount(null);
      setChainId(null);
      setEthersProvider(null);
      setError("Wallet disconnected");
    };

    rawProvider.on("accountsChanged", handleAccountsChanged);
    rawProvider.on("chainChanged", handleChainChanged);
    rawProvider.on("disconnect", handleDisconnect);

    return () => {
      rawProvider.removeListener("accountsChanged", handleAccountsChanged);
      rawProvider.removeListener("chainChanged", handleChainChanged);
      rawProvider.removeListener("disconnect", handleDisconnect);
    };
  }, [rawProvider]);

  const checkExistingConnection = useCallback(async (provider) => {
    try {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const network = await ethersProvider.getNetwork();

        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setEthersProvider(ethersProvider);
      }
    } catch (err) {
      console.error("Auto-connect check failed:", err);
    }
  }, []);

  const connectViaWalletConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const connector = new WalletConnectProvider({
        rpc: {
          1: process.env.REACT_APP_ETHEREUM_RPC_URL,
        },
        qrcode: !isMobile,
        qrcodeModalOptions: {
          mobileLinks: [
            "metamask",
            "trust",
            "rainbow",
            "argent",
            "imtoken",
            "pillar",
          ],
        },
      });

      await connector.enable();

      // ✅ Deep link to MetaMask on mobile
      if (isMobile && connector.connector?.uri) {
        const uri = connector.connector.uri;
        const deepLink = `https://metamask.app.link/wc?uri=${encodeURIComponent(
          uri
        )}`;
        window.location.href = deepLink;
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(connector);
      const signer = await ethersProvider.getSigner();
      const network = await ethersProvider.getNetwork();

      setAccount(await signer.getAddress());
      setChainId(Number(network.chainId));
      setEthersProvider(ethersProvider);
      setWcConnector(connector);
      setRawProvider(connector);
    } catch (err) {
      console.error("WalletConnect connection failed:", err);
      setError("WalletConnect connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [isMobile]);

  const connectWallet = useCallback(async () => {
    if (isMobile && !window.ethereum?.isMetaMask) {
      return connectViaWalletConnect();
    }

    if (!window.ethereum) {
      setError("Ethereum wallet not detected");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethersProvider.send("eth_requestAccounts", []);
      const network = await ethersProvider.getNetwork();

      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setEthersProvider(ethersProvider);
      setRawProvider(window.ethereum);
    } catch (err) {
      handleConnectionError(err);
    } finally {
      setIsConnecting(false);
    }
  }, [isMobile, connectViaWalletConnect]);

  const handleConnectionError = useCallback((error) => {
    console.error("Connection error:", error);
    let message = "Connection failed";

    if (error.code === 4001) {
      message = "Connection rejected";
    } else if (error.code === -32002) {
      message = "Request already pending";
    } else if (error.message.includes("not authorized")) {
      message = "Please authorize this site";
    } else if (error.message) {
      message = error.message;
    }

    setError(message);
  }, []);

  const disconnectWallet = useCallback(() => {
    if (wcConnector?.disconnect) {
      wcConnector.disconnect();
    }

    setAccount(null);
    setChainId(null);
    setEthersProvider(null);
    setWcConnector(null);
    setError(null);
  }, [wcConnector]);

  const getSigner = useCallback(async () => {
    if (!ethersProvider) {
      throw new Error("Provider not initialized");
    }
    return await ethersProvider.getSigner();
  }, [ethersProvider]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        error,
        isMobile,
        isConnecting,
        provider: ethersProvider,
        rawProvider,
        connectWallet,
        disconnectWallet,
        getSigner,
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
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};