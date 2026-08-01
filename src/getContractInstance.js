// src/getContractInstance.js
// CRA-safe + Ethers v5 compatible (removes import.meta + BrowserProvider)

import { ethers } from "ethers";

import {
  IMALITOKENABI,
  IMALITOKENBASEABI,
  PresaleABI,
  StakingABI,
  ReferralSystemABI,
  BuybackABI,
  FeeDistributorABI,
  LiquidityManagerABI,
  VestingVaultABI,
  AirdropDistributorABI,
} from "./abi";

// -------------------- Chains --------------------
export const ETHEREUM_MAINNET = "ethereum";
export const POLYGON_MAINNET = "polygon";
export const BASE_MAINNET = "base";

export const NETWORKS = {
  [ETHEREUM_MAINNET]: {
    chainIdHex: "0x1",
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrlsKey: "REACT_APP_RPC_ETHEREUM",
    explorers: ["https://etherscan.io/"],
  },
  [POLYGON_MAINNET]: {
    chainIdHex: "0x89",
    name: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrlsKey: "REACT_APP_RPC_POLYGON",
    explorers: ["https://polygonscan.com/"],
  },
  [BASE_MAINNET]: {
    chainIdHex: "0x2105",
    name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrlsKey: "REACT_APP_RPC_BASE",
    explorers: ["https://basescan.org/"],
  },
};

export const short = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "");

// -------------------- Env helpers (CRA) --------------------
function readEnv(key, fallback = "") {
  try {
    // CRA supports process.env only
    if (typeof process !== "undefined" && process.env && process.env[key] != null) {
      return process.env[key] || fallback;
    }
  } catch {}
  return fallback;
}

// Optional: allow VITE_* values if you also defined them in Netlify env
// (still read via process.env on CRA builds if the build system injects them)
function readEither(viteKey, craKey, fallback = "") {
  return readEnv(craKey, "") || readEnv(viteKey, "") || fallback;
}

// Optional public RPCs (read-only fallback)
function readRpcUrlFor(chainKey) {
  const envKey = NETWORKS[chainKey]?.rpcUrlsKey;
  return envKey ? readEnv(envKey, "") : "";
}

// Normalize an address (empty -> "", invalid -> throw), returns checksum
function norm(addr, label) {
  if (!addr) return "";
  if (!ethers.utils.isAddress(addr)) throw new Error(`Invalid address for ${label}: ${addr}`);
  return ethers.utils.getAddress(addr);
}

// -------------------- Address book --------------------
const ADDR = {
  IMALI: {
    [ETHEREUM_MAINNET]: readEither("VITE_IMALI_TOKEN_ETH", "REACT_APP_IMALI_TOKEN_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_IMALI_TOKEN_POLYGON", "REACT_APP_IMALI_TOKEN_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_IMALI_TOKEN_BASE", "REACT_APP_IMALI_TOKEN_BASE", ""),
  },
  PRESALE: {
    [ETHEREUM_MAINNET]: readEither("VITE_PRESALE_ETH", "REACT_APP_PRESALE_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_PRESALE_POLYGON", "REACT_APP_PRESALE_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_PRESALE_BASE", "REACT_APP_PRESALE_BASE", ""),
  },
  STAKING: {
    [ETHEREUM_MAINNET]: readEither("VITE_STAKING_ETH", "REACT_APP_STAKING_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_STAKING_POLYGON", "REACT_APP_STAKING_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_STAKING_BASE", "REACT_APP_STAKING_BASE", ""),
  },
  REFERRAL: {
    [ETHEREUM_MAINNET]: readEither("VITE_REFERRAL_ETH", "REACT_APP_REFERRAL_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_REFERRAL_POLYGON", "REACT_APP_REFERRAL_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_REFERRAL_BASE", "REACT_APP_REFERRAL_BASE", ""),
  },
  BUYBACK: {
    [ETHEREUM_MAINNET]: readEither("VITE_BUYBACK_ETH", "REACT_APP_BUYBACK_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_BUYBACK_POLYGON", "REACT_APP_BUYBACK_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_BUYBACK_BASE", "REACT_APP_BUYBACK_BASE", ""),
  },
  FEEDIST: {
    [ETHEREUM_MAINNET]: readEither("VITE_FEEDIST_ETH", "REACT_APP_FEEDIST_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_FEEDIST_POLYGON", "REACT_APP_FEEDIST_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_FEEDIST_BASE", "REACT_APP_FEEDIST_BASE", ""),
  },
  LIQUIDITY: {
    [ETHEREUM_MAINNET]: readEither("VITE_LIQ_ETH", "REACT_APP_LIQ_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_LIQ_POLYGON", "REACT_APP_LIQ_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_LIQ_BASE", "REACT_APP_LIQ_BASE", ""),
  },
  VESTING: {
    [ETHEREUM_MAINNET]: readEither("VITE_VESTING_ETH", "REACT_APP_VESTING_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_VESTING_POLYGON", "REACT_APP_VESTING_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_VESTING_BASE", "REACT_APP_VESTING_BASE", ""),
  },
  AIRDROP: {
    [ETHEREUM_MAINNET]: readEither("VITE_AIRDROP_ETH", "REACT_APP_AIRDROP_ETH", ""),
    [POLYGON_MAINNET]: readEither("VITE_AIRDROP_POLYGON", "REACT_APP_AIRDROP_POLYGON", ""),
    [BASE_MAINNET]: readEither("VITE_AIRDROP_BASE", "REACT_APP_AIRDROP_BASE", ""),
  },
};

// -------------------- ABIs --------------------
const ABIS = {
  IMALI: IMALITOKENABI,
  IMALI_BASE: IMALITOKENBASEABI,
  PRESALE: PresaleABI,
  STAKING: StakingABI,
  REFERRAL: ReferralSystemABI,
  BUYBACK: BuybackABI,
  FEEDIST: FeeDistributorABI,
  LIQUIDITY: LiquidityManagerABI,
  VESTING: VestingVaultABI,
  AIRDROP: AirdropDistributorABI,
};

// -------------------- Caches & lifecycle --------------------
const contractCache = new Map(); // key -> Contract
const providerCache = new Map(); // chainKey -> provider
const signerCache = new Map(); // chainKey -> signer

const keyOf = (type, chain, addr, withSigner) => `${type}:${chain}:${addr}:${withSigner ? "w" : "r"}`;

export function clearContractCache() {
  contractCache.clear();
  signerCache.clear();
  providerCache.clear();
}

// Clear stale caches when wallet changes chain/accounts
if (typeof window !== "undefined" && window.ethereum && !window.__imali_cache_hooks__) {
  window.__imali_cache_hooks__ = true;
  window.ethereum.on?.("chainChanged", () => clearContractCache());
  window.ethereum.on?.("accountsChanged", () => clearContractCache());
}

// -------------------- Network helpers --------------------
export async function ensureNetwork(chainKey) {
  if (!window.ethereum) return;
  const net = NETWORKS[chainKey];
  if (!net) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainIdHex }],
    });
  } catch (e) {
    // 4902 = Unrecognized chain; try adding it
    if (e && e.code === 4902) {
      const rpc = readRpcUrlFor(chainKey);
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: net.chainIdHex,
            chainName: net.name,
            nativeCurrency: net.nativeCurrency,
            rpcUrls: rpc ? [rpc] : [],
            blockExplorerUrls: net.explorers || [],
          },
        ],
      });
      // retry once
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: net.chainIdHex }],
      });
    } else {
      throw e;
    }
  }
}

// Read-only provider fallback if no wallet is present
function getReadOnlyProvider(chainKey) {
  const cached = providerCache.get(chainKey);
  if (cached) return cached;

  const rpc = readRpcUrlFor(chainKey);
  if (!rpc) throw new Error(`No wallet and no RPC configured for ${chainKey}. Set ${NETWORKS[chainKey]?.rpcUrlsKey}.`);

  const p = new ethers.providers.JsonRpcProvider(rpc);
  providerCache.set(chainKey, p);
  return p;
}

export function getProvider(chainKey = POLYGON_MAINNET) {
  const cached = providerCache.get(chainKey);
  if (cached) return cached;

  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    providerCache.set(chainKey, provider);
    return provider;
  }

  return getReadOnlyProvider(chainKey);
}

export async function getSigner(chainKey = POLYGON_MAINNET) {
  const cached = signerCache.get(chainKey);
  if (cached) return cached;

  const provider = getProvider(chainKey);

  // If it's a JsonRpcProvider (no wallet), no signer available
  if (!provider || typeof provider.getSigner !== "function") {
    throw new Error("No signer available: wallet not detected (read-only mode).");
  }

  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  signerCache.set(chainKey, signer);
  return signer;
}

// -------------------- Address utils --------------------
export function getAddressFor(type, chainKey) {
  const raw =
    (ADDR[type] && ADDR[type][chainKey]) ||
    (type === "IMALI" && ADDR.IMALI[chainKey]) ||
    (type === "IMALI_BASE" && ADDR.IMALI[BASE_MAINNET]) ||
    "";

  return raw ? norm(raw, `${type} on ${chainKey}`) : "";
}

// -------------------- Main factory --------------------
/**
 * getContractInstance(type, chainKey, opts)
 *  - type: one of keys in ABIS (e.g., "IMALI", "STAKING", ...)
 *  - chainKey: ethereum | polygon | base (default polygon)
 *  - opts:
 *      - address?: override address
 *      - withSigner?: boolean (default true)
 *      - autoSwitch?: boolean (default false)
 */
export async function getContractInstance(type, chainKey, opts = {}) {
  const { address, withSigner = true, autoSwitch = false } = opts;

  const chain = chainKey || POLYGON_MAINNET;

  if (!(type in ABIS)) throw new Error(`ABI not found for type ${type}`);

  // Resolve & normalize address
  const resolvedAddr = norm(address || getAddressFor(type, chain), `${type} on ${chain}`);
  if (!resolvedAddr || resolvedAddr === ethers.constants.AddressZero) {
    throw new Error(`No address configured for ${type} on ${chain}`);
  }

  if (autoSwitch && typeof window !== "undefined" && window.ethereum) {
    await ensureNetwork(chain);
  }

  // Runner: signer for write, provider for read
  const provider = getProvider(chain);
  const runner = withSigner ? await getSigner(chain) : provider;

  const cacheKey = keyOf(type, chain, resolvedAddr, !!withSigner);
  if (contractCache.has(cacheKey)) return contractCache.get(cacheKey);

  const abi = type === "IMALI" && chain === BASE_MAINNET ? ABIS.IMALI_BASE : ABIS[type];

  const contract = new ethers.Contract(resolvedAddr, abi, runner);
  contractCache.set(cacheKey, contract);
  return contract;
}
