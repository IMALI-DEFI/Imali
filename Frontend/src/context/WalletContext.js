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
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);

  const isMobile = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const connectWallet = useCallback(async (walletType = "metamask") => {
    setIsConnecting(true);
    setError(null);

    try {
      let web3Provider;

      // MetaMask flow
      if (walletType === "metamask") {
        const metamaskInstalled = typeof window.ethereum !== "undefined";

        // Deep link if on mobile and MetaMask not injected
        if (!metamaskInstalled && isMobile()) {
          const dappLink = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}`;
          window.location.href = dappLink;
          return;
        }

        if (!metamaskInstalled) {
          throw new Error("Please install MetaMask to continue.");
        }

        web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      }

      // WalletConnect flow
      else if (walletType === "walletconnect") {
        const wcProvider = new WalletConnectProvider({
          rpc: {
            1: "https://mainnet.infura.io/v3/YOUR_INFURA_ID",
            56: "https://bsc-dataseed.binance.org/",
            137: "https://polygon-rpc.com/",
          },
          qrcodeModalOptions: {
            mobileLinks: isMobile() ? ["metamask", "trust", "rainbow"] : [],
          },
        });

        await wcProvider.enable();
        web3Provider = new ethers.BrowserProvider(wcProvider);
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

  // Check if already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum?.selectedAddress) {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await web3Provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const network = await web3Provider.getNetwork();
            setAccount(accounts[0]);
            setChainId(Number(network.chainId));
            setProvider(web3Provider);
          }
        } catch (err) {
          console.error("Auto-connect failed:", err);
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
          if (!provider) throw new Error("Wallet not connected");
          return await provider.getSigner();
        },
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
