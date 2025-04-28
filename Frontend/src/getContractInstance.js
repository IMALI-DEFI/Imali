// src/getContractInstance.js

import { BrowserProvider, Contract } from "ethers";

// Import ABIs
import LendingABI from "../utils/LendingABI.json";
import YieldFarmingABI from "../utils/YieldFarmingABI.json";
import StakingABI from "../utils/StakingABI.json";
import TokenPolygonABI from "../utils/TokenABI.json";
import TokenBaseABI from "../utils/IMALITOKENBASEABI.json";
import LPTokenABI from "../utils/LPTokenABI.json";
import DAOABI from "../utils/IMALIDAOABI.json";
import PresaleABI from "../utils/PresaleABI.json";
import NFTABI from "../utils/IMALINFTABI.json";
import FeeDistributorABI from "../utils/FeeDistributorABI.json";
import LPLotteryABI from "../utils/LPLotteryABI.json";
import BuybackABI from "../utils/BuybackABI.json";
import VestingVaultABI from "../utils/VestingVaultABI.json";
import AirdropABI from "../utils/AirdropABI.json";
import LiquidityManagerABI from "../utils/LiquidityManagerABI.json";

// Network Chain IDs
export const ETHEREUM_MAINNET = 1;
export const POLYGON_MAINNET = 137;
export const BASE_MAINNET = 8453;

// Contract addresses
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

// Cache to prevent re-creating contract instances
const contractCache = new Map();

// Get a contract instance
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
      provider = externalProvider
        ? new BrowserProvider(externalProvider)
        : new BrowserProvider(window.ethereum);
    }

    const contractAddress = CONTRACT_ADDRESSES[contractType]?.[targetChainId];
    const contractABI = contractType === "Token"
      ? CONTRACT_ABIS[contractType][targetChainId]
      : CONTRACT_ABIS[contractType];

    if (!contractAddress || !contractABI) {
      throw new Error(`Missing configuration for ${contractType} on chain ${targetChainId}`);
    }

    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, contractABI, signer);

    contractCache.set(cacheKey, contract);
    console.log(`✅ Loaded ${contractType} contract`, {
      address: contractAddress,
      chainId: targetChainId,
    });

    return contract;
  } catch (error) {
    console.error(`❌ Error creating ${contractType} contract:`, {
      message: error.message,
    });
    throw error;
  }
};

// Helper to switch MetaMask network
const switchNetwork = async (chainId) => {
  if (!window.ethereum?.request) {
    throw new Error("No wallet available");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      throw new Error("Unsupported network");
    } else {
      throw new Error("Network switch rejected");
    }
  }
};

// Clear cache on network or account change
if (typeof window !== "undefined" && window.ethereum) {
  window.ethereum.on("chainChanged", () => contractCache.clear());
  window.ethereum.on("accountsChanged", () => contractCache.clear());
}

export default getContractInstance;
