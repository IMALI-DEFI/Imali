// src/context/WalletContext.js (or .jsx)
import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useMemo,
  useEffect,
} from "react";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { BrowserProvider } from "ethers";

const WalletContext = createContext(null);

const isMobileUA = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );

const getEnv = (key) => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
      return import.meta.env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== "undefined" && process.env && key in process.env) {
      return process.env[key];
    }
  } catch {
    // ignore
  }
  return "";
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = useCallback(async (type = "metamask") => {
    setIsConnecting(true);
    setError(null);

    try {
      let ethersProvider;

      if (type === "metamask") {
        if (!window.ethereum) {
          if (isMobileUA()) {
            const universalLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            window.location.href = universalLink;
            return;
          }
          window.open("https://metamask.io/download.html", "_blank");
          throw new Error("Please install MetaMask.");
        }

        const metamaskProvider =
          window.ethereum?.providers?.find((p) => p.isMetaMask) || window.ethereum;

        ethersProvider = new BrowserProvider(metamaskProvider);

        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        const network = await ethersProvider.getNetwork();

        setAccount(accounts?.[0] || null);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType("metamask");
      }

      if (type === "walletconnect") {
        const projectId =
          getEnv("REACT_APP_WC_PROJECT_ID") ||
          getEnv("VITE_WC_PROJECT_ID") ||
          "";

        if (!projectId) throw new Error("Missing WalletConnect Project ID (WC_PROJECT_ID).");

        const rpcEth =
          getEnv("REACT_APP_RPC_ETH") || getEnv("VITE_RPC_ETH") || "https://cloudflare-eth.com";
        const rpcPolygon =
          getEnv("REACT_APP_RPC_POLYGON") ||
          getEnv("VITE_RPC_POLYGON") ||
          "https://polygon-rpc.com";
        const rpcBase =
          getEnv("REACT_APP_RPC_BASE") || getEnv("VITE_RPC_BASE") || "https://mainnet.base.org";

        const wc = await EthereumProvider.init({
          projectId,
          chains: [1, 137, 8453],
          showQrModal: true,
          rpcMap: {
            1: rpcEth,
            137: rpcPolygon,
            8453: rpcBase,
          },
        });

        await wc.connect();

        ethersProvider = new BrowserProvider(wc);

        const signer = await ethersProvider.getSigner();
        const address = await signer.getAddress();
        const network = await ethersProvider.getNetwork();

        setAccount(address);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType("walletconnect");
      }

      localStorage.setItem("walletType", type);
    } catch (err) {
      console.error("Connection error:", err);
      setError(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      // WalletConnect v2 provider may exist under a few shapes
      const p = provider?._provider || provider?.provider || null;
      if (p?.disconnect) await p.disconnect();
    } catch {
      // ignore
    }

    setAccount(null);
    setProvider(null);
    setWalletType(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem("walletType");
  }, [provider]);

  // Optional: auto-reconnect on refresh (only if user previously chose a wallet)
  useEffect(() => {
    const saved = localStorage.getItem("walletType");
    if (saved && !account && !isConnecting) {
      // don't force metamask popups too aggressively; WC is safe to re-init
      if (saved === "walletconnect") connectWallet("walletconnect");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    return {
      // original fields
      account,
      chainId,
      error,
      isConnecting,
      provider,
      walletType,
      connectWallet,
      disconnectWallet,

      // ✅ aliases so Activation.jsx (and others) won’t crash
      address: account,
      connect: () => connectWallet(walletType || "metamask"),
      disconnect: disconnectWallet,

      // helper
      getSigner: async () => {
        if (!provider) throw new Error("Wallet not connected.");
        return await provider.getSigner();
      },
    };
  }, [
    account,
    chainId,
    error,
    isConnecting,
    provider,
    walletType,
    connectWallet,
    disconnectWallet,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    // ✅ prevents “Cannot destructure … undefined”
    return {
      account: null,
      address: null,
      chainId: null,
      error: "WalletProvider missing (wrap your app).",
      isConnecting: false,
      provider: null,
      walletType: null,
      connectWallet: async () => {
        throw new Error("WalletProvider missing.");
      },
      disconnectWallet: async () => {},
      connect: async () => {
        throw new Error("WalletProvider missing.");
      },
      disconnect: async () => {},
      getSigner: async () => {
        throw new Error("WalletProvider missing.");
      },
    };
  }
  return ctx;
};
