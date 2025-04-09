import { BrowserProvider, Contract, ethers } from "ethers";

// Import ABIs
import LendingABI from "./utils/LendingABI.json";
import YieldFarmingABI from "./utils/YieldFarmingABI.json";
import StakingABI from "./utils/StakingABI.json";
import TokenPolygonABI from "./utils/TokenABI.json";
import TokenBaseABI from "./utils/IMALITOKENBASEABI.json";
import LPTokenABI from "./utils/LPTokenABI.json";
import DAOABI from "./utils/IMALIDAOABI.json";
import PresaleABI from "./utils/PresaleABI.json";
import NFTABI from "./utils/IMALINFTABI.json";
import FeeDistributorABI from "./utils/FeeDistributorABI.json";
import LPLotteryABI from "./utils/LPLotteryABI.json";
import BuybackABI from "./utils/BuybackABI.json";
import VestingVaultABI from "./utils/VestingVaultABI.json";
import AirdropABI from "./utils/AirdropABI.json";
import LiquidityManagerABI from "./utils/LiquidityManagerABI.json";

const ETHEREUM_MAINNET = 1;
const POLYGON_MAINNET = 137;
const BASE_MAINNET = 8453;

// Contract Addresses (Lending on Ethereum, all others on Polygon)
const CONTRACT_ADDRESSES = {
  Lending: { [ETHEREUM_MAINNET]: process.env.REACT_APP_LENDING_ETHEREUM },
  YieldFarming: { [POLYGON_MAINNET]: process.env.REACT_APP_YIELDFARMING_POLYGON },
  Staking: { [POLYGON_MAINNET]: process.env.REACT_APP_STAKING_POLYGON },
  Token: {
    [POLYGON_MAINNET]: process.env.REACT_APP_TOKEN_POLYGON,
    [BASE_MAINNET]: process.env.REACT_APP_TOKEN_BASE,
  },
  LPToken: { [POLYGON_MAINNET]: process.env.REACT_APP_LPTOKEN_POLYGON },
  DAO: { [POLYGON_MAINNET]: process.env.REACT_APP_DAO_POLYGON },
  Presale: { [POLYGON_MAINNET]: process.env.REACT_APP_PRESALE_POLYGON },
  NFT: { [POLYGON_MAINNET]: process.env.REACT_APP_NFT_POLYGON },
  FeeDistributor: { [POLYGON_MAINNET]: process.env.REACT_APP_FEEDISTRIBUTOR_POLYGON },
  LPLottery: { [POLYGON_MAINNET]: process.env.REACT_APP_LPLOTTERY_POLYGON },
  Buyback: { [POLYGON_MAINNET]: process.env.REACT_APP_BUYBACK_ADDRESS },
  VestingVault: { [POLYGON_MAINNET]: process.env.REACT_APP_VESTINGVAULT_ADDRESS },
  AirdropDistributor: { [POLYGON_MAINNET]: process.env.REACT_APP_AIRDROPDISTRIBUTOR_ADDRESS },
  LiquidityManager: { [POLYGON_MAINNET]: process.env.REACT_APP_LIQUIDITYMANAGER_ADDRESS },
};

// Contract ABIs
const CONTRACT_ABIS = {
  Lending: LendingABI,
  YieldFarming: YieldFarmingABI,
  Staking: StakingABI,
  Token: {
    [POLYGON_MAINNET]: TokenPolygonABI,
    [BASE_MAINNET]: TokenBaseABI,
  },
  LPToken: LPTokenABI,
  DAO: DAOABI,
  Presale: PresaleABI,
  NFT: NFTABI,
  FeeDistributor: FeeDistributorABI,
  LPLottery: LPLotteryABI,
  Buyback: BuybackABI,
  VestingVault: VestingVaultABI,
  AirdropDistributor: AirdropABI,
  LiquidityManager: LiquidityManagerABI,
};

// Network Configurations
const NETWORK_CONFIGS = {
  [ETHEREUM_MAINNET]: {
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ethereum", decimals: 18, symbol: "ETH" },
    rpcUrls: [
      `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_KEY}`,
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
    ],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  [POLYGON_MAINNET]: {
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "Matic", decimals: 18, symbol: "MATIC" },
    rpcUrls: [
      "https://polygon-rpc.com",
      "https://rpc-mainnet.matic.quiknode.pro",
      "https://polygon-rpc.gateway.pokt.network",
    ],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  [BASE_MAINNET]: {
    chainName: "Base Mainnet",
    nativeCurrency: { name: "Ethereum", decimals: 18, symbol: "ETH" },
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
    ],
    blockExplorerUrls: ["https://basescan.org"],
  },
};

const contractCache = new Map();

class ContractError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = "ContractError";
    this.code = code;
    this.originalError = originalError;
  }
}

export const getContractInstance = async (contractType, options = {}) => {
  try {
    const externalProvider = options.externalProvider;
    const targetChainId = contractType === "Lending" ? ETHEREUM_MAINNET : POLYGON_MAINNET;
    const cacheKey = `${contractType}-${targetChainId}`;

    if (contractCache.has(cacheKey)) {
      return contractCache.get(cacheKey);
    }

    let provider = externalProvider
      ? new BrowserProvider(externalProvider)
      : new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    const isWalletConnect = externalProvider?.wc || externalProvider?.isWalletConnect;

    if (!isWalletConnect && network.chainId !== targetChainId) {
      await switchNetwork(targetChainId);
      // ✅ Refresh provider after switching
      provider = externalProvider
        ? new BrowserProvider(externalProvider)
        : new BrowserProvider(window.ethereum);
    }

    const contractAddress = CONTRACT_ADDRESSES[contractType]?.[targetChainId];
    const contractABI = contractType === "Token"
      ? CONTRACT_ABIS[contractType][targetChainId]
      : CONTRACT_ABIS[contractType];

    if (!contractAddress || !contractABI) {
      throw new ContractError(`Missing config for ${contractType} on chain ${targetChainId}`, "CONFIG_MISSING");
    }

    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, contractABI, signer);

    contract._debug = {
      type: contractType,
      address: contractAddress,
      chainId: targetChainId,
      network: NETWORK_CONFIGS[targetChainId]?.chainName,
    };

    contractCache.set(cacheKey, contract);
    console.log(`✅ Loaded ${contractType} contract`, contract._debug);
    return contract;
  } catch (error) {
    console.error(`❌ Error creating ${contractType} contract:`, {
      message: error.message,
      code: error.code,
      originalError: error.originalError,
    });
    throw error;
  }
};

const switchNetwork = async (chainId) => {
  if (!window.ethereum?.request) throw new Error("No wallet available");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      const config = NETWORK_CONFIGS[chainId];
      if (!config) throw new ContractError("Unsupported network", "UNSUPPORTED_NETWORK");

      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}`, ...config }],
        });
      } catch (addError) {
        throw new ContractError("Failed to add network", "NETWORK_ADD_FAILED", addError);
      }
    } else {
      throw new ContractError("Network switch failed", "NETWORK_SWITCH_REJECTED", switchError);
    }
  }
};

if (typeof window !== "undefined" && window.ethereum) {
  window.ethereum.on("chainChanged", () => contractCache.clear());
  window.ethereum.on("accountsChanged", () => contractCache.clear());
}

export {
  ETHEREUM_MAINNET,
  POLYGON_MAINNET,
  BASE_MAINNET,
};

export default getContractInstance;
