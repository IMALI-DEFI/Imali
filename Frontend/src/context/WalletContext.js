// src/context/WalletContext.jsx
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ethers } from "ethers";

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    if (!window.ethereum) {
      setHasWallet(false);
      return;
    }

    setHasWallet(true);

    const p = new ethers.providers.Web3Provider(window.ethereum, "any");
    setProvider(p);

    const initWallet = async () => {
      try {
        const [accounts, hexChainId] = await Promise.all([
          window.ethereum.request({ method: "eth_accounts" }),
          window.ethereum.request({ method: "eth_chainId" }),
        ]);

        setAccount(accounts?.[0] || null);
        setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
      } catch (err) {
        console.error("[WalletContext] Failed to initialize wallet:", err);
      }
    };

    initWallet();
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) return;

    const onAccountsChanged = (accounts) => {
      setAccount(accounts?.[0] || null);
    };

    const onChainChanged = (hexChainId) => {
      setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", onAccountsChanged);
        window.ethereum.removeListener("chainChanged", onChainChanged);
      }
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask or a compatible wallet is not installed");
    }

    if (connecting) return null;

    setConnecting(true);

    try {
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);

      const [accounts, hexChainId] = await Promise.all([
        window.ethereum.request({ method: "eth_requestAccounts" }),
        window.ethereum.request({ method: "eth_chainId" }),
      ]);

      const nextAccount = accounts?.[0] || null;
      const nextChainId = hexChainId ? parseInt(hexChainId, 16) : null;

      setAccount(nextAccount);
      setChainId(nextChainId);

      return {
        account: nextAccount,
        chainId: nextChainId,
      };
    } catch (err) {
      console.error("[WalletContext] connectWallet failed:", err);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
  }, []);

  const isConnected = !!account;

  const value = useMemo(
    () => ({
      account,
      chainId,
      provider,
      connecting,
      hasWallet,
      isConnected,
      connectWallet,
      disconnectWallet,
    }),
    [
      account,
      chainId,
      provider,
      connecting,
      hasWallet,
      isConnected,
      connectWallet,
      disconnectWallet,
    ]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = React.useContext(WalletContext);

  if (!ctx) {
    return {
      account: null,
      chainId: null,
      provider: null,
      connecting: false,
      hasWallet: typeof window !== "undefined" ? !!window.ethereum : false,
      isConnected: false,
      connectWallet: async () => {
        throw new Error("WalletProvider not mounted");
      },
      disconnectWallet: () => {},
    };
  }

  return ctx;
}
