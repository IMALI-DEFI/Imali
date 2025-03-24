import { BrowserProvider, Contract } from "ethers";

// Import all ABIs
import LendingABI from "./utils/LendingABI.json";
import YieldFarmingABI from "./utils/YieldFarmingABI.json";
import StakingABI from "./utils/StakingABI.json";
import TokenABI from "./utils/TokenABI.json";
import LPTokenABI from "./utils/LPTokenABI.json";
import DAOABI from "./utils/IMALIDAOABI.json";
import PresaleABI from "./utils/PresaleABI.json";
import NFTABI from "./utils/IMALINFTABI.json";

// Network IDs
const ETHEREUM_MAINNET = 1;
const POLYGON_MAINNET = 137;

// Contract addresses configuration
const CONTRACT_ADDRESSES = {
  Lending: {
    [ETHEREUM_MAINNET]: process.env.REACT_APP_LENDING_ETHEREUM,
  },
  YieldFarming: {
    [POLYGON_MAINNET]: process.env.REACT_APP_YIELDFARMING_POLYGON,
  },
  Staking: {
    [POLYGON_MAINNET]: process.env.REACT_APP_STAKING_POLYGON,
  },
  Token: {
    [POLYGON_MAINNET]: process.env.REACT_APP_TOKEN_POLYGON,
  },
  LPToken: {
    [POLYGON_MAINNET]: process.env.REACT_APP_LPTOKEN_POLYGON,
  },
  DAO: {
    [POLYGON_MAINNET]: process.env.REACT_APP_DAO_POLYGON,
  },
  Presale: {
    [POLYGON_MAINNET]: process.env.REACT_APP_PRESALE_POLYGON,
  },
  NFT: {
    [POLYGON_MAINNET]: process.env.REACT_APP_NFT_POLYGON,
  }
};

const CONTRACT_ABIS = {
  Lending: LendingABI,
  YieldFarming: YieldFarmingABI,
  Staking: StakingABI,
  Token: TokenABI,
  LPToken: LPTokenABI,
  DAO: DAOABI,
  Presale: PresaleABI,
  NFT: NFTABI
};

// Network configuration for switching
const NETWORK_CONFIGS = {
  [ETHEREUM_MAINNET]: {
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "ETH", decimals: 18, symbol: "ETH" },
    rpcUrls: ["https://mainnet.infura.io/v3/YOUR_INFURA_KEY"],
    blockExplorerUrls: ["https://etherscan.io"]
  },
  [POLYGON_MAINNET]: {
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "MATIC", decimals: 18, symbol: "MATIC" },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"]
  }
};

let provider;

const getContractInstance = async (contractType, options = {}) => {
  try {
    // 1. Validate environment
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }

    // 2. Determine target network
    const targetChainId = options.chainId || 
      (contractType === "Lending" ? ETHEREUM_MAINNET : POLYGON_MAINNET);

    // 3. Initialize or refresh provider
    provider = new BrowserProvider(window.ethereum);

    // 4. Check current network
    const network = await provider.getNetwork();
    
    // 5. Handle network switching if needed
    if (network.chainId !== targetChainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        
        // Wait for network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        provider = new BrowserProvider(window.ethereum); // Refresh provider
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Network not added, try to add it
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${targetChainId.toString(16)}`,
                ...NETWORK_CONFIGS[targetChainId]
              }]
            });
            provider = new BrowserProvider(window.ethereum); // Refresh provider
          } catch (addError) {
            throw new Error(`Failed to add network ${targetChainId}: ${addError.message}`);
          }
        } else {
          throw new Error(`Failed to switch to network ${targetChainId}: ${switchError.message}`);
        }
      }
    }

    // 6. Validate contract configuration
    const contractAddress = CONTRACT_ADDRESSES[contractType]?.[targetChainId];
    if (!contractAddress) {
      throw new Error(`No address configured for ${contractType} on chain ${targetChainId}`);
    }

    const contractABI = CONTRACT_ABIS[contractType];
    if (!contractABI) {
      throw new Error(`No ABI configured for ${contractType}`);
    }

    // 7. Create contract instance
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, contractABI, signer);

    console.log(`Created ${contractType} contract instance`, {
      address: contractAddress,
      network: targetChainId
    });

    return contract;
  } catch (error) {
    console.error(`Failed to initialize ${contractType} contract:`, error);
    throw error;
  }
};

// Handle chain changes
if (window.ethereum) {
  window.ethereum.on('chainChanged', () => {
    provider = new BrowserProvider(window.ethereum); // Refresh provider
  });
}

export default getContractInstance;
