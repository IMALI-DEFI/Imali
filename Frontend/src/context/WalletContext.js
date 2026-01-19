import React, { createContext, useState, useCallback, useContext } from "react";
import EthereumProvider from "@walletconnect/ethereum-provider";
import { BrowserProvider } from "ethers";

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

  const connectWallet = useCallback(async (type = "metamask") => {
    setIsConnecting(true);
    setError(null);

    try {
      let ethersProvider;

      if (type === "metamask") {
        if (!window.ethereum) {
          if (isMobile()) {
            const universalLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            window.location.href = universalLink;
            return;
          }
          window.open("https://metamask.io/download.html", "_blank");
          throw new Error("Please install MetaMask.");
        }

        const metamaskProvider =
          window.ethereum.providers?.find((p) => p.isMetaMask) || window.ethereum;

        ethersProvider = new BrowserProvider(metamaskProvider);
        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        const network = await ethersProvider.getNetwork();

        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setProvider(ethersProvider);
        setWalletType("metamask");
      }

      if (type === "walletconnect") {
        const projectId =
          process.env.REACT_APP_WC_PROJECT_ID ||
          (typeof import.meta !== "undefined" && import.meta.env?.VITE_WC_PROJECT_ID) ||
          "";

        if (!projectId) {
          throw new Error("Missing WalletConnect Project ID (WC_PROJECT_ID).");
        }

        const wc = await EthereumProvider.init({
          projectId,
          chains: [1, 137, 8453],
          showQrModal: true,
          rpcMap: {
            1: process.env.REACT_APP_RPC_ETH || "https://cloudflare-eth.com",
            137: process.env.REACT_APP_RPC_POLYGON || "https://polygon-rpc.com",
            8453: process.env.REACT_APP_RPC_BASE || "https://mainnet.base.org",
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
      // if it's WalletConnect v2 provider, it supports .disconnect()
      const p = provider?._provider || provider?.provider || null;
      if (p?.disconnect) await p.disconnect();
    } catch (e) {
      // ignore
    }
    setAccount(null);
    setProvider(null);
    setWalletType(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem("walletType");
  }, [provider]);

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
          if (!provider) throw new Error("Wallet not connected.");
          return await provider.getSigner();
        },
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
