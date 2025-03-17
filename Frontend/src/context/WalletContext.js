// src/context/WalletContext.js
import { createContext, useContext, useEffect, useState } from "react";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";

const WalletContext = createContext();

export const useWallet = () => {
    return useContext(WalletContext);
};

export const WalletProvider = ({ children }) => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [network, setNetwork] = useState(null);
    const [selectedWallet, setSelectedWallet] = useState("MetaMask"); // Default to MetaMask
    const [provider, setProvider] = useState(null);

    const connectWallet = async () => {
        setLoading(true);
        try {
            let selectedProvider;

            if (selectedWallet === "MetaMask") {
                if (!window.ethereum) {
                    alert("❌ MetaMask not detected. Install MetaMask.");
                    return;
                }
                selectedProvider = window.ethereum;
            } else if (selectedWallet === "WalletConnect") {
                const walletConnectProvider = new WalletConnectProvider({
                    rpc: {
                        89: "https://polygon-rpc.com", // Polygon Mainnet RPC URL
                    },
                });
                await walletConnectProvider.enable();
                selectedProvider = walletConnectProvider;
            }

            const ethProvider = new ethers.BrowserProvider(selectedProvider);
            const signer = await ethProvider.getSigner();
            const address = await signer.getAddress();

            setWalletAddress(address);
            setProvider(selectedProvider);
            checkNetwork(selectedProvider);

            selectedProvider.on("accountsChanged", (accounts) => {
                if (accounts.length === 0) {
                    setWalletAddress(null);
                    alert("🔌 Wallet disconnected.");
                } else {
                    setWalletAddress(accounts[0]);
                }
            });

            selectedProvider.on("chainChanged", (chainId) => {
                console.log("🔄 Network changed:", chainId);
                checkNetwork(selectedProvider);
            });

        } catch (error) {
            console.error("❌ Failed to connect wallet:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const checkNetwork = async (prov) => {
        const ethProvider = new ethers.BrowserProvider(prov);
        const network = await ethProvider.getNetwork();

        if (network.chainId !== 89) {
            alert("⚠️ Please switch to Polygon (Matic) network.");
            setNetwork(null);
        } else {
            setNetwork("Polygon");
        }
    };

    const resetWallet = () => {
        setWalletAddress(null);
        setLoading(false);
        setNetwork(null);
        if(provider && selectedWallet === "WalletConnect"){
            provider.disconnect();
        }
        setProvider(null);
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    checkNetwork(window.ethereum);
                }
            });
        }
    }, []);

    return (
        <WalletContext.Provider
            value={{
                walletAddress,
                setWalletAddress,
                connectWallet,
                resetWallet,
                loading,
                setLoading,
                network,
                selectedWallet,
                setSelectedWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};