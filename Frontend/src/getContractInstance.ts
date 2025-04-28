// src/utils/getContractInstance.ts

import { BrowserProvider, Contract, ethers } from "ethers";

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

const ETHEREUM_MAINNET = 1;
const POLYGON_MAINNET = 137;
const BASE_MAINNET = 8453;

// Define contract type options
export type ContractType =
  | "Lending"
  | "YieldFarming"
  | "Staking"
  | "Token"
  | "LPToken"
  | "DAO"
  | "Presale"
  | "NFT"
  | "FeeDistributor"
  | "LPLottery"
  | "Buyback"
  | "VestingVault"
  | "AirdropDistributor"
  | "LiquidityManager";

const CONTRACT_ADDRESSES: Record<string, Record<number, string | undefined>> = {
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

const CONTRACT_ABIS: Record<string, any> = {
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

const contractCache = new Map<string, Contract>();

export const getContractInstance = async (
  contractType: ContractType,
  options: { externalProvider?: any } = {}
): Promise<Contract> => {
  try {
    const externalProvider = options.externalProvider;
    const targetChainId = contractType === "Lending" ? ETHEREUM_MAINNET : POLYGON_MAINNET;
    const cacheKey = `${contractType}-${targetChainId}`;

    if (contractCache.has(cacheKey)) {
      return contractCache.get(cacheKey)!;
    }

    let provider = externalProvider
      ? new BrowserProvider(externalProvider)
      : new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (!externalProvider && network.chainId !== targetChainId) {
      await switchNetwork(targetChainId);
      provider = new BrowserProvider(window.ethereum);
    }

    const contractAddress = CONTRACT_ADDRESSES[contractType]?.[targetChainId];
    const contractABI = contractType === "Token"
      ? CONTRACT_ABIS[contractType][targetChainId]
      : CONTRACT_ABIS[contractType];

    if (!contractAddress || !contractABI) {
      throw new Error(`Missing config for ${contractType} on chain ${targetChainId}`);
    }

    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, contractABI, signer);

    contractCache.set(cacheKey, contract);
    console.log(`✅ Loaded ${contractType} contract on chain ${targetChainId}`);

    return contract;
  } catch (error: any) {
    console.error(`❌ Error loading contract [${contractType}]:`, error.message);
    throw error;
  }
};

const switchNetwork = async (chainId: number) => {
  if (!window.ethereum?.request) throw new Error("Wallet not available");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    throw new Error("Network switch rejected or failed");
  }
};

export { ETHEREUM_MAINNET, POLYGON_MAINNET, BASE_MAINNET };
