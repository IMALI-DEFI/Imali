// src/context/WalletContext.jsx
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { ethers } from "ethers";

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [error, setError] = useState(null);
  const initializedRef = useRef(false);

  // Check for wallet on mount and when ethereum appears
  useEffect(() => {
    const checkWallet = () => {
      const hasEth = typeof window !== "undefined" && !!window.ethereum;
      setHasWallet(hasEth);
      
      if (hasEth && !initializedRef.current) {
        initializedRef.current = true;
        
        try {
          const p = new ethers.providers.Web3Provider(window.ethereum, "any");
          setProvider(p);
          
          // Get initial accounts without prompting
          window.ethereum.request({ method: "eth_accounts" })
            .then(accounts => {
              if (accounts && accounts.length > 0) {
                setAccount(accounts[0]);
              }
            })
            .catch(err => console.error("Failed to get accounts:", err));
            
          window.ethereum.request({ method: "eth_chainId" })
            .then(hexChainId => {
              if (hexChainId) {
                setChainId(parseInt(hexChainId, 16));
              }
            })
            .catch(err => console.error("Failed to get chainId:", err));
        } catch (err) {
          console.error("Failed to initialize provider:", err);
          setError(err.message);
        }
      }
    };

    checkWallet();

    // Listen for ethereum injection (if it loads late)
    if (typeof window !== "undefined" && !window.ethereum) {
      const interval = setInterval(() => {
        if (window.ethereum) {
          clearInterval(interval);
          checkWallet();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Set up event listeners after provider is ready
  useEffect(() => {
    if (!window.ethereum?.on) return;

    const handleAccountsChanged = (accounts) => {
      console.log("[WalletContext] Accounts changed:", accounts);
      setAccount(accounts?.[0] || null);
      if (accounts?.length === 0) {
        // User disconnected their wallet
        setAccount(null);
      }
    };

    const handleChainChanged = (hexChainId) => {
      console.log("[WalletContext] Chain changed:", hexChainId);
      setChainId(hexChainId ? parseInt(hexChainId, 16) : null);
      // Refresh provider on chain change
      if (window.ethereum) {
        try {
          const p = new ethers.providers.Web3Provider(window.ethereum, "any");
          setProvider(p);
        } catch (err) {
          console.error("Failed to update provider on chain change:", err);
        }
      }
    };

    const handleDisconnect = (error) => {
      console.log("[WalletContext] Wallet disconnected:", error);
      setAccount(null);
      setChainId(null);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("disconnect", handleDisconnect);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  }, []);

  const connectWallet = useCallback(async () => {
    // Clear previous errors
    setError(null);

    // Check if wallet is available
    if (typeof window === "undefined" || !window.ethereum) {
      const msg = "No wallet detected. Please install MetaMask or another Web3 wallet.";
      setError(msg);
      throw new Error(msg);
    }

    // Check if already connecting
    if (connecting) {
      console.log("[WalletContext] Already connecting, please wait...");
      return null;
    }

    setConnecting(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned. Please unlock your wallet.");
      }

      const connectedAccount = accounts[0];
      
      // Get chain ID
      const hexChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      const connectedChainId = hexChainId ? parseInt(hexChainId, 16) : null;

      // Update provider
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);
      setAccount(connectedAccount);
      setChainId(connectedChainId);
      
      console.log("[WalletContext] Connected successfully:", {
        account: connectedAccount,
        chainId: connectedChainId,
      });

      return {
        account: connectedAccount,
        chainId: connectedChainId,
      };
    } catch (err) {
      console.error("[WalletContext] connectWallet failed:", err);
      
      let errorMessage = "Failed to connect wallet.";
      if (err.code === 4001) {
        errorMessage = "Connection rejected. Please approve the connection in your wallet.";
      } else if (err.code === -32002) {
        errorMessage = "Connection request already pending. Please check your wallet.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setError(null);
    console.log("[WalletContext] Disconnected wallet");
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
    // Return a fallback that won't break the app
    return {
      account: null,
      chainId: null,
      provider: null,
      connecting: false,
      hasWallet: typeof window !== "undefined" ? !!window.ethereum : false,
      isConnected: false,
      error: null,
      connectWallet: async () => {
        console.warn("WalletProvider not mounted, using fallback");
        throw new Error("WalletProvider not mounted");
      },
      disconnectWallet: () => {},
    };
  }

  return ctx;
}