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

/* ---------------- Utilities ---------------- */

const isMobileUA = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );

const getEnv = (key) => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env && key in process.env) {
      return process.env[key];
    }
  } catch {}
  return "";
};

const getDappUrl = () => {
  // MetaMask mobile expects a full URL with protocol
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";
  const path =
    typeof window !== "undefined" && window.location
      ? window.location.pathname + window.location.search
      : "";
  return `${origin}${path}`; // ex: https://imali-defi.com/activation
};

/* ---------------- Provider ---------------- */

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /* -------- Connect -------- */

  const connectWallet = useCallback(async (type = "metamask") => {
    setIsConnecting(true);
    setError(null);

    try {
      let ethersProvider;

      /* ----- MetaMask ----- */
      if (type === "metamask") {
        if (!window.ethereum) {
          if (isMobileUA()) {
            const deepLink = `https://metamask.app.link/dapp/${encodeURIComponent(
              getDappUrl().replace(/^https?:\/\//, "")
            )}`;
            window.location.href = deepLink;
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

      /* ----- WalletConnect ----- */
      if (type === "walletconnect") {
        const projectId =
          getEnv("REACT_APP_WC_PROJECT_ID") ||
          getEnv("VITE_WC_PROJECT_ID") ||
          "";

        if (!projectId) throw new Error("Missing WalletConnect Project ID.");

        const wc = await EthereumProvider.init({
          projectId,
          chains: [1, 137, 8453],
          showQrModal: true,
          rpcMap: {
            1:
              getEnv("REACT_APP_RPC_ETH") ||
              getEnv("VITE_RPC_ETH") ||
              "https://cloudflare-eth.com",
            137:
              getEnv("REACT_APP_RPC_POLYGON") ||
              getEnv("VITE_RPC_POLYGON") ||
              "https://polygon-rpc.com",
            8453:
              getEnv("REACT_APP_RPC_BASE") ||
              getEnv("VITE_RPC_BASE") ||
              "https://mainnet.base.org",
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
      console.error("Wallet connect error:", err);
      setError(err?.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /* -------- Disconnect -------- */

  const disconnectWallet = useCallback(async () => {
    try {
      const p = provider?._provider || provider?.provider || null;
      if (p?.disconnect) await p.disconnect();
    } catch {}

    setAccount(null);
    setProvider(null);
    setWalletType(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem("walletType");
  }, [provider]);

  /* -------- Auto-reconnect (WalletConnect only) -------- */

  useEffect(() => {
    const saved = localStorage.getItem("walletType");
    if (saved === "walletconnect" && !account && !isConnecting) {
      connectWallet("walletconnect");
    }
  }, [account, isConnecting, connectWallet]);

  /* -------- Context Value -------- */

  const value = useMemo(
    () => ({
      account,
      address: account,
      chainId,
      provider,
      walletType,
      error,
      isConnecting,

      isConnected: !!account,

      connectWallet,
      disconnectWallet,
      connect: () => connectWallet(walletType || "metamask"),
      disconnect: disconnectWallet,

      getSigner: async () => {
        if (!provider) throw new Error("Wallet not connected.");
        return await provider.getSigner(); // ✅ ethers v6
      },
    }),
    [
      account,
      chainId,
      provider,
      walletType,
      error,
      isConnecting,
      connectWallet,
      disconnectWallet,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/* ---------------- Hook ---------------- */

export const useWallet = () => {
  const ctx = useContext(WalletContext);

  if (!ctx) {
    return {
      account: null,
      address: null,
      chainId: null,
      provider: null,
      walletType: null,
      isConnected: false,
      isConnecting: false,
      error: "WalletProvider missing (wrap your app).",
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