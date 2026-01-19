// src/getContractInstance.js
import {
  BrowserProvider,
  Contract,
  ZeroAddress,
  getAddress as toChecksum,
  isAddress,
} from "ethers";

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
} from "../abi";

// -------------------- Chains --------------------
export const ETHEREUM_MAINNET = "ethereum";
export const POLYGON_MAINNET  = "polygon";
export const BASE_MAINNET     = "base";

export const NETWORKS = {
  [ETHEREUM_MAINNET]: { chainIdHex: "0x1",    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrlsKey: "VITE_RPC_ETHEREUM",
    explorers: ["https://etherscan.io/"],
  },
  [POLYGON_MAINNET]:  { chainIdHex: "0x89",   name: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrlsKey: "VITE_RPC_POLYGON",
    explorers: ["https://polygonscan.com/"],
  },
  [BASE_MAINNET]:     { chainIdHex: "0x2105", name: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrlsKey: "VITE_RPC_BASE",
    explorers: ["https://basescan.org/"],
  },
};

export const short = (a) => (a ? a.slice(0, 6) + "..." + a.slice(-4) : "");

// -------------------- Env helpers --------------------
function readEnv(key, fallback = "") {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) return import.meta.env[key] || fallback;
    if (typeof process !== "undefined" && process.env && key in process.env) return process.env[key] || fallback;
  } catch {}
  return fallback;
}

// Optional public RPCs (read-only fallback)
function readRpcUrlFor(chainKey) {
  const def = NETWORKS[chainKey]?.rpcUrlsKey;
  return def ? readEnv(def, "") : "";
}

// Normalize an address (empty -> "", invalid -> throw), returns checksum
function norm(addr, label) {
  if (!addr) return "";
  if (!isAddress(addr)) throw new Error(`Invalid address for ${label}: ${addr}`);
  return toChecksum(addr);
}

// -------------------- Address book --------------------
const ADDR = {
  IMALI: {
    [ETHEREUM_MAINNET]: readEnv("VITE_IMALI_TOKEN_ETH")     || readEnv("REACT_APP_IMALI_TOKEN_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_IMALI_TOKEN_POLYGON") || readEnv("REACT_APP_IMALI_TOKEN_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_IMALI_TOKEN_BASE")    || readEnv("REACT_APP_IMALI_TOKEN_BASE"),
  },
  PRESALE: {
    [ETHEREUM_MAINNET]: readEnv("VITE_PRESALE_ETH")     || readEnv("REACT_APP_PRESALE_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_PRESALE_POLYGON") || readEnv("REACT_APP_PRESALE_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_PRESALE_BASE")    || readEnv("REACT_APP_PRESALE_BASE"),
  },
  STAKING: {
    [ETHEREUM_MAINNET]: readEnv("VITE_STAKING_ETH")     || readEnv("REACT_APP_STAKING_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_STAKING_POLYGON") || readEnv("REACT_APP_STAKING_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_STAKING_BASE")    || readEnv("REACT_APP_STAKING_BASE"),
  },
  REFERRAL: {
    [ETHEREUM_MAINNET]: readEnv("VITE_REFERRAL_ETH")     || readEnv("REACT_APP_REFERRAL_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_REFERRAL_POLYGON") || readEnv("REACT_APP_REFERRAL_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_REFERRAL_BASE")    || readEnv("REACT_APP_REFERRAL_BASE"),
  },
  BUYBACK: {
    [ETHEREUM_MAINNET]: readEnv("VITE_BUYBACK_ETH")     || readEnv("REACT_APP_BUYBACK_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_BUYBACK_POLYGON") || readEnv("REACT_APP_BUYBACK_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_BUYBACK_BASE")    || readEnv("REACT_APP_BUYBACK_BASE"),
  },
  FEEDIST: {
    [ETHEREUM_MAINNET]: readEnv("VITE_FEEDIST_ETH")     || readEnv("REACT_APP_FEEDIST_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_FEEDIST_POLYGON") || readEnv("REACT_APP_FEEDIST_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_FEEDIST_BASE")    || readEnv("REACT_APP_FEEDIST_BASE"),
  },
  LIQUIDITY: {
    [ETHEREUM_MAINNET]: readEnv("VITE_LIQ_ETH")     || readEnv("REACT_APP_LIQ_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_LIQ_POLYGON") || readEnv("REACT_APP_LIQ_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_LIQ_BASE")    || readEnv("REACT_APP_LIQ_BASE"),
  },
  VESTING: {
    [ETHEREUM_MAINNET]: readEnv("VITE_VESTING_ETH")     || readEnv("REACT_APP_VESTING_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_VESTING_POLYGON") || readEnv("REACT_APP_VESTING_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_VESTING_BASE")    || readEnv("REACT_APP_VESTING_BASE"),
  },
  AIRDROP: {
    [ETHEREUM_MAINNET]: readEnv("VITE_AIRDROP_ETH")     || readEnv("REACT_APP_AIRDROP_ETH"),
    [POLYGON_MAINNET]:  readEnv("VITE_AIRDROP_POLYGON") || readEnv("REACT_APP_AIRDROP_POLYGON"),
    [BASE_MAINNET]:     readEnv("VITE_AIRDROP_BASE")    || readEnv("REACT_APP_AIRDROP_BASE"),
  },
};

// -------------------- ABIs --------------------
const ABIS = {
  IMALI: IMALITOKENABI,        // default IMALI ABI
  IMALI_BASE: IMALITOKENBASEABI, // if Base has a variant
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
const providerCache = new Map(); // chainKey -> BrowserProvider | JsonRpcProvider-like
const signerCache   = new Map(); // chainKey -> Signer

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
        params: [{
          chainId: net.chainIdHex,
          chainName: net.name,
          nativeCurrency: net.nativeCurrency,
          rpcUrls: rpc ? [rpc] : [],
          blockExplorerUrls: NETWORKS[chainKey].explorers || [],
        }],
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

// Read-only provider fallback if no wallet is present (optional)
async function getReadOnlyProvider(chainKey) {
  const cached = providerCache.get(chainKey);
  if (cached) return cached;

  const rpc = readRpcUrlFor(chainKey);
  if (!rpc) throw new Error(`No wallet and no RPC configured for ${chainKey}. Set ${NETWORKS[chainKey]?.rpcUrlsKey}.`);

  // Use BrowserProvider when wallet exists, otherwise build a lightweight provider via ethers' fetch abstraction.
  // For simplicity, reuse BrowserProvider type guard; here we keep it minimal and rely on Contract with a URL runner.
  // ethers v6 allows passing a simple { send } compatible object; but to keep things simple,
  // we just error if no wallet unless RPC is provided (above).
  const p = new (class MinimalJsonRpcProvider {
    constructor(url) { this.url = url; }
    async send(method, params) {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    }
  })(rpc);

  providerCache.set(chainKey, p);
  return p;
}

export async function getProvider(chainKey = POLYGON_MAINNET) {
  if (providerCache.get(chainKey)) return providerCache.get(chainKey);

  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new BrowserProvider(window.ethereum);
    providerCache.set(chainKey, provider);
    return provider;
  }
  // read-only fallback
  return getReadOnlyProvider(chainKey);
}

export async function getSigner(chainKey = POLYGON_MAINNET) {
  if (signerCache.get(chainKey)) return signerCache.get(chainKey);
  const provider = await getProvider(chainKey);
  if (!(provider instanceof BrowserProvider)) {
    throw new Error("No signer available: wallet not detected (read-only mode).");
  }
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
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
 *      - autoSwitch?: boolean (default false) — try switch/add network in wallet
 */
export async function getContractInstance(type, chainKey, opts = {}) {
  const {
    address,
    withSigner = true,
    autoSwitch = false,
  } = opts;

  const chain = chainKey || POLYGON_MAINNET;

  if (!(type in ABIS)) throw new Error(`ABI not found for type ${type}`);

  // Resolve & normalize address
  let resolvedAddr = address || getAddressFor(type, chain);
  if (!resolvedAddr || resolvedAddr === ZeroAddress) {
    throw new Error(`No address configured for ${type} on ${chain}`);
  }

  if (autoSwitch && typeof window !== "undefined" && window.ethereum) {
    await ensureNetwork(chain);
  }

  // Runner: signer for write, provider for read
  const provider = await getProvider(chain);
  const runner = withSigner ? await getSigner(chain) : provider;

  const cacheKey = keyOf(type, chain, resolvedAddr, !!withSigner);
  if (contractCache.has(cacheKey)) return contractCache.get(cacheKey);

  const abi =
    (type === "IMALI" && chain === BASE_MAINNET ? ABIS.IMALI_BASE : ABIS[type]) || ABIS[type];

  const contract = new Contract(resolvedAddr, abi, runner);
  contractCache.set(cacheKey, contract);
  return contract;
}