import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  // Add validation for children
  if (!children) {
    console.error('WalletProvider requires children');
    return null;
  }

  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);

  // ... rest of your existing code ...

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
          if (!provider) throw new Error("Not connected");
          return await provider.getSigner();
        }
      }}
    >
      {children || null}  {/* Additional safeguard */}
    </WalletContext.Provider>
  );
};

// Add error handling to the hook
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
