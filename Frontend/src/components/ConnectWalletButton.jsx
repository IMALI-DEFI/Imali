import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";

const walletNames = {
  1: "Ethereum",
  137: "Polygon",
  8453: "Base",
};

const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const ConnectWalletButton = () => {
  const {
    account,
    chainId,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);

  const handleWalletSelect = (wallet) => {
    setShowDropdown(false);
    connectWallet(wallet);
  };

  if (isConnecting) {
    return (
      <button className="wallet-button connecting" disabled>
        Connecting...
      </button>
    );
  }

  if (account) {
    return (
      <div className="wallet-connected">
        <span>{shortenAddress(account)}</span>
        <span className="chain-name">
          {walletNames[chainId] || `Chain ${chainId}`}
        </span>
        <button className="disconnect" onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connector">
      <button
        className="wallet-button"
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        Connect Wallet
      </button>

      {showDropdown && (
        <div className="wallet-dropdown">
          <button onClick={() => handleWalletSelect("metamask")}>
            MetaMask
          </button>
          <button onClick={() => handleWalletSelect("trust")}>
            Trust Wallet
          </button>
          <button onClick={() => handleWalletSelect("coinbase")}>
            Coinbase Wallet
          </button>
          <button onClick={() => handleWalletSelect("rainbow")}>
            Rainbow
          </button>
        </div>
      )}

      {error && <p className="wallet-error">{error}</p>}
    </div>
  );
};

export default ConnectWalletButton;