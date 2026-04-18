import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ethers } from "ethers";

export const WalletContext = createContext(null);

function getMetaMaskProvider() {
  if (typeof window === "undefined") return null;

  const { ethereum } = window;
  if (!ethereum) return null;

  if (Array.isArray(ethereum.providers)) {
    const metaMask = ethereum.providers.find((provider) => provider?.isMetaMask);
    if (metaMask) return metaMask;
  }

  if (ethereum.isMetaMask) return ethereum;

  return null;
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [error, setError] = useState(null);

  const initializedRef = useRef(false);
  const ethereumRef = useRef(null);

  const syncWalletState = useCallback(async (ethProvider) => {
    if (!ethProvider) return;

    try {
      const web3Provider = new ethers.providers.Web3Provider(ethProvider, "any");
      setProvider(web3Provider);

      const [accounts, hexChainId] = await Promise.all([
        ethProvider.request({ method: "eth_accounts" }),
        ethProvider.request({ method: "eth_chainId" }),
      ]);

      setAccount(accounts?.[0] || null);
      setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
    } catch (err) {
      console.error("[WalletContext] Failed to sync wallet state:", err);
      setError(err?.message || "Failed to initialize wallet.");
    }
  }, []);

  useEffect(() => {
    let intervalId = null;

    const initialize = async () => {
      const metaMaskProvider = getMetaMaskProvider();
      setHasWallet(!!metaMaskProvider);

      if (!metaMaskProvider) return;

      ethereumRef.current = metaMaskProvider;

      if (!initializedRef.current) {
        initializedRef.current = true;
        await syncWalletState(metaMaskProvider);
      }
    };

    initialize();

    if (!getMetaMaskProvider()) {
      intervalId = window.setInterval(() => {
        const metaMaskProvider = getMetaMaskProvider();
        if (metaMaskProvider) {
          window.clearInterval(intervalId);
          setHasWallet(true);
          ethereumRef.current = metaMaskProvider;
          syncWalletState(metaMaskProvider);
        }
      }, 500);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [syncWalletState]);

  useEffect(() => {
    const ethProvider = ethereumRef.current || getMetaMaskProvider();
    if (!ethProvider?.on) return;

    const handleAccountsChanged = (accounts) => {
      console.log("[WalletContext] accountsChanged:", accounts);
      setAccount(accounts?.[0] || null);

      if (!accounts?.length) {
        setAccount(null);
      }
    };

    const handleChainChanged = (hexChainId) => {
      console.log("[WalletContext] chainChanged:", hexChainId);
      setChainId(hexChainId ? parseInt(hexChainId, 16) : null);

      try {
        const web3Provider = new ethers.providers.Web3Provider(ethProvider, "any");
        setProvider(web3Provider);
      } catch (err) {
        console.error("[WalletContext] Failed to refresh provider:", err);
      }
    };

    const handleDisconnect = (disconnectError) => {
      console.log("[WalletContext] disconnect:", disconnectError);
      setAccount(null);
      setChainId(null);
    };

    ethProvider.on("accountsChanged", handleAccountsChanged);
    ethProvider.on("chainChanged", handleChainChanged);
    ethProvider.on("disconnect", handleDisconnect);

    return () => {
      if (ethProvider.removeListener) {
        ethProvider.removeListener("accountsChanged", handleAccountsChanged);
        ethProvider.removeListener("chainChanged", handleChainChanged);
        ethProvider.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [hasWallet]);

  const connectWallet = useCallback(async () => {
    setError(null);

    const metaMaskProvider = getMetaMaskProvider();

    if (!metaMaskProvider) {
      const message = "MetaMask not detected. Please install MetaMask and refresh the page.";
      setHasWallet(false);
      setError(message);
      throw new Error(message);
    }

    if (connecting) {
      console.log("[WalletContext] Connection already in progress.");
      return null;
    }

    setHasWallet(true);
    ethereumRef.current = metaMaskProvider;
    setConnecting(true);

    try {
      const accounts = await metaMaskProvider.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("No accounts returned. Please unlock MetaMask and try again.");
      }

      const connectedAccount = accounts[0];

      const hexChainId = await metaMaskProvider.request({
        method: "eth_chainId",
      });

      const connectedChainId = hexChainId ? parseInt(hexChainId, 16) : null;
      const web3Provider = new ethers.providers.Web3Provider(metaMaskProvider, "any");

      setProvider(web3Provider);
      setAccount(connectedAccount);
      setChainId(connectedChainId);

      console.log("[WalletContext] Connected:", {
        account: connectedAccount,
        chainId: connectedChainId,
      });

      return {
        account: connectedAccount,
        chainId: connectedChainId,
      };
    } catch (err) {
      console.error("[WalletContext] connectWallet failed:", err);

      let message = "Failed to connect wallet.";

      if (err?.code === 4001) {
        message = "Connection rejected. Please approve the connection in MetaMask.";
      } else if (err?.code === -32002) {
        message = "A connection request is already pending. Please open MetaMask and respond there.";
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setError(null);
    console.log("[WalletContext] Wallet state cleared.");
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
      error,
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
      error,
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
      hasWallet: typeof window !== "undefined" ? !!getMetaMaskProvider() : false,
      isConnected: false,
      error: null,
      connectWallet: async () => {
        console.warn("WalletProvider not mounted.");
        throw new Error("WalletProvider not mounted");
      },
      disconnectWallet: () => {},
    };
  }

  return ctx;
}