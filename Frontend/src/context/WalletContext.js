import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect
} from "react";
import { ethers } from "ethers";

const WalletContext = createContext(null);

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

      if (type === "metamask") {
        if (!window.ethereum) {
          if (isMobile()) {
            const link = `https://metamask.app.link/dapp/${window.location.host}`;
            window.location.href = link;
            return;
          }
          throw new Error("MetaMask is not installed.");
        }

        const injected =
          window.ethereum.providers?.find((p) => p.isMetaMask) ||
          window.ethereum;

        ethersProvider = new ethers.providers.Web3Provider(injected);

        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        const network = await ethersProvider.getNetwork();

        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType("metamask");
      }

      // WalletConnect removed - using web3modal instead
      if (type === "walletconnect") {
        throw new Error("WalletConnect temporarily disabled. Please use MetaMask.");
      }

      localStorage.setItem("walletType", type);
    } catch (err) {
      console.error(err);
      setError(err.message || "Wallet connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      // WalletConnect disconnect removed
    } catch (_) {}

    setAccount(null);
    setChainId(null);
    setProvider(null);
    setWalletType(null);
    setError(null);
    localStorage.removeItem("walletType");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("walletType");
    if (saved && saved === "metamask") { // Only auto-connect MetaMask
      connectWallet(saved);
    }
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        provider,
        walletType,
        error,
        isConnecting,
        connectWallet,
        disconnectWallet,
        getSigner: async () => {
          if (!provider) throw new Error("Wallet not connected");
          return provider.getSigner();
        }
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
