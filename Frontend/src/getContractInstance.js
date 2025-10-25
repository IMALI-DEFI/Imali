// src/getContractInstance.js
import { ethers } from "ethers";
import stakingAbi from "./abi/Staking.json";
import lendingAbi from "./abi/Lending.json";
import farmingAbi from "./abi/YieldFarming.json";
import lotteryAbi from "./abi/LPLottery.json";

/** Replace these with your real deployed addresses per chain */
const ADDRS = {
  defaultChainId: 137, // polygon example; change to your target
  137: {
    Staking:    "0xStakingAddr...",
    Lending:    "0xLendingAddr...",
    YieldFarming:"0xYieldFarm...",
    LPLottery:  "0xLotteryAddr...",
  },
  1: { /* mainnet addresses if any */ },
};

const ABIS = {
  Staking: stakingAbi,
  Lending: lendingAbi,
  YieldFarming: farmingAbi,
  LPLottery: lotteryAbi,
};

export function getInjected() {
  return typeof window !== "undefined" && window.ethereum ? window.ethereum : null;
}

export function getEthersProvider() {
  const eth = getInjected();
  if (!eth) return null;
  return new ethers.BrowserProvider(eth, "any");
}

export async function getSigner() {
  const provider = getEthersProvider();
  if (!provider) return null;
  return await provider.getSigner();
}

export async function getChainId() {
  const provider = getEthersProvider();
  if (!provider) return null;
  const net = await provider.getNetwork();
  return Number(net.chainId);
}

/** Connect & Disconnect */
export async function connectWallet() {
  const eth = getInjected();
  if (!eth) throw new Error("No injected wallet found.");
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  return accounts?.[0] || null;
}

export async function disconnectWallet() {
  // Most injected wallets don't support programmatic disconnect.
  // We still expose this for UI parity; clears dapp-side state.
  return true;
}

/** Contract factory (auto-picks ABI + address by name & chain) */
export async function getContractInstance(name, signerOrProvider) {
  const provider = signerOrProvider ?? (await getSigner()) ?? getEthersProvider();
  if (!provider) throw new Error("No provider/signer available");
  const chainId = await getChainId() || ADDRS.defaultChainId;
  const addr = ADDRS[chainId]?.[name];
  if (!addr) throw new Error(`No address for contract '${name}' on chain ${chainId}`);
  const abi = ABIS[name];
  if (!abi) throw new Error(`No ABI for contract '${name}'`);
  return new ethers.Contract(addr, abi, provider);
}

/** React-friendly wallet state (no external context required) */
import React from "react";

export function useEvmWallet() {
  const [account, setAccount] = React.useState(null);
  const [chainId, setChainId] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  const refresh = React.useCallback(async () => {
    const prov = getEthersProvider();
    setProvider(prov);
    if (!prov) { setAccount(null); setChainId(null); return; }
    try {
      const [cid, signer] = await Promise.all([ getChainId(), prov.getSigner().catch(() => null) ]);
      setChainId(cid || null);
      if (signer) setAccount(await signer.getAddress());
    } catch {
      setAccount(null);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const eth = getInjected();
    if (!eth) return;
    const onAccounts = (accs) => setAccount(accs && accs[0] ? accs[0] : null);
    const onChain    = () => refresh();
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    eth.on?.("disconnect", () => { setAccount(null); });
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
      eth.removeListener?.("disconnect", () => {});
    };
  }, [refresh]);

  const connect = React.useCallback(async () => {
    const a = await connectWallet();
    setAccount(a);
    const cid = await getChainId();
    setChainId(cid || null);
    setProvider(getEthersProvider());
  }, []);

  const disconnect = React.useCallback(async () => {
    await disconnectWallet();
    setAccount(null);
  }, []);

  return { account, chainId, provider, connect, disconnect };
}

/** Small helper */
export function short(addr, left = 6, right = 4) {
  if (!addr) return "";
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}
