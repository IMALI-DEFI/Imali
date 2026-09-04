import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import { ethers } from "ethers";
import {
  createPublicClient,
  custom,
} from "viem";
import { baseSepolia } from "viem/chains";
import { toAccount } from "viem/accounts";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWallet,
  FaSyncAlt,
  FaCrown,
} from "react-icons/fa";

const BASE_SEPOLIA_CHAIN_ID = 84532;

const SAFE_VERSION = "1.4.1";

const ENTRY_POINT = {
  address:
    "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  version: "0.7",
};

const SAFE_LAUNCHPAD =
  "0x75798463024bda64d83c94a64bc7d7eab41300ef";

const SAFE_ADAPTER =
  "0x7579f2ad53b01c3d8779fe17928e0d48885b0003";

const SAFE_SINGLETON =
  "0x29fcb43b46531bca003ddc8fcb67ffe91900c762";

const SAFE_FACTORY =
  "0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67";

async function reconstructImaliSafe(ownerAddress) {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: custom(window.ethereum),
  });

  const ownerAccount = toAccount({
    address: ownerAddress,
  });

  const safe = await toSafeSmartAccount({
    client,
    owners: [ownerAccount],
    threshold: 1n,
    version: SAFE_VERSION,
    entryPoint: ENTRY_POINT,

    safe4337ModuleAddress:
      SAFE_ADAPTER,

    safeProxyFactoryAddress:
      SAFE_FACTORY,

    safeSingletonAddress:
      SAFE_SINGLETON,

    erc7579LaunchpadAddress:
      SAFE_LAUNCHPAD,

    saltNonce: 0n,

    validators: [],
    executors: [],
    fallbacks: [],
    hooks: [],
    attesters: [],
    attestersThreshold: 0,
  });

  return safe.getAddress();
}

export default function ConnectWallet() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    connected: false,
    verified: false,
    wallet: "",
    tier: "starter",
  });

  const [dexPrepare, setDexPrepare] = useState({
    loading: false,
    ready: false,
    signing: false,
    signed: false,
    safe: "",
    reconstructedSafe: "",
    safeMatched: false,
    permissionId: "",
    typedData: null,
    customerSignature: "",
    error: "",
  });

  const loadStatus = async () => {
    setLoading(true);

    const integration = await BotAPI.getIntegrationStatus?.(true);
    const me = await BotAPI.getMe?.(true);

    setStatus({
      connected: Boolean(integration?.wallet_connected),
      verified: integration?.wallet_verified === true,
      wallet: integration?.wallet_address_masked || "",
      tier: me?.tier || me?.user?.tier || "starter",
    });

    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask was not detected.");
      return;
    }

    try {
      const provider =
        new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );

      await provider.send(
        "eth_requestAccounts",
        []
      );

      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const challenge =
        await BotAPI.createWalletChallenge(
          address
        );

      if (!challenge?.message || !challenge?.nonce) {
        throw new Error(
          "Wallet verification challenge was not received."
        );
      }

      const signature =
        await signer.signMessage(
          challenge.message
        );

      const result =
        await BotAPI.connectWallet({
          wallet: address,
          signature,
          nonce: challenge.nonce,
        });

      if (result?.success === false) {
        throw new Error(
          result.error ||
          "Failed to verify wallet."
        );
      }

      await loadStatus();
      alert("Wallet ownership verified.");
    } catch (error) {
      if (error?.code === 4001) {
        alert(
          "Wallet verification was cancelled."
        );
        return;
      }

      alert(
        error?.message ||
        "Failed to verify wallet ownership."
      );
    }
  };

  const handlePrepareDexAuthorization = async () => {
    if (!status.verified) {
      alert("Verify wallet ownership first.");
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask was not detected.");
      return;
    }

    try {
      setDexPrepare({
        loading: true,
        ready: false,
        signing: false,
        signed: false,
        safe: "",
        reconstructedSafe: "",
        safeMatched: false,
        permissionId: "",
        typedData: null,
        customerSignature: "",
        error: "",
      });

      const provider =
        new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );

      const network = await provider.getNetwork();

      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
        throw new Error(
          "Switch MetaMask to Base Sepolia before preparing DEX authorization."
        );
      }

      const result =
        await BotAPI.prepareDexAuthorization({
          sell_token:
            "0x036cbd53842c5426634e7929541ec2318f3dcf7c",
          buy_token:
            "0x4200000000000000000000000000000000000006",
          max_sell_amount_atomic:
            "1000000",
        });

      const safe =
        result?.smart_account ||
        result?.safe_address ||
        result?.safe ||
        "";

      const permissionId =
        result?.permission_id ||
        result?.permissionId ||
        "";

      const typedData =
        result?.typed_data ||
        result?.typedData ||
        null;

      if (!safe || !permissionId || !typedData) {
        throw new Error(
          "DEX authorization preparation returned incomplete data."
        );
      }

      await provider.send(
        "eth_requestAccounts",
        []
      );

      const signer = provider.getSigner();
      const signerAddress =
        await signer.getAddress();

      const reconstructedSafe =
        await reconstructImaliSafe(
          signerAddress
        );

      if (
        reconstructedSafe.toLowerCase() !==
        safe.toLowerCase()
      ) {
        throw new Error(
          "Safe reconstruction mismatch. DEX authorization was stopped."
        );
      }

      setDexPrepare({
        loading: false,
        ready: true,
        signing: false,
        signed: false,
        safe,
        reconstructedSafe,
        safeMatched: true,
        permissionId,
        typedData,
        customerSignature: "",
        error: "",
      });
    } catch (error) {
      setDexPrepare({
        loading: false,
        ready: false,
        signing: false,
        signed: false,
        safe: "",
        reconstructedSafe: "",
        safeMatched: false,
        permissionId: "",
        typedData: null,
        customerSignature: "",
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to prepare DEX authorization.",
      });
    }
  };

  const handleSignDexAuthorization = async () => {
    if (!dexPrepare.ready || !dexPrepare.typedData) {
      alert("Prepare the DEX authorization first.");
      return;
    }

    if (!dexPrepare.safeMatched) {
      alert(
        "Safe address verification has not passed."
      );
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask was not detected.");
      return;
    }

    try {
      setDexPrepare((current) => ({
        ...current,
        signing: true,
        signed: false,
        customerSignature: "",
        error: "",
      }));

      const provider =
        new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );

      const network = await provider.getNetwork();

      if (Number(network.chainId) !== BASE_SEPOLIA_CHAIN_ID) {
        throw new Error(
          "Switch MetaMask to Base Sepolia before signing DEX authorization."
        );
      }

      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();

      const reconstructedSafe =
        await reconstructImaliSafe(
          signerAddress
        );

      if (
        reconstructedSafe.toLowerCase() !==
        dexPrepare.safe.toLowerCase()
      ) {
        throw new Error(
          "Safe reconstruction mismatch. Authorization signing was stopped."
        );
      }

      const typedData = dexPrepare.typedData;

      if (
        !typedData?.domain ||
        !typedData?.types ||
        !typedData?.message
      ) {
        throw new Error(
          "Prepared EIP-712 authorization data is incomplete."
        );
      }

      const types = { ...typedData.types };
      delete types.EIP712Domain;

      const signature =
        await signer._signTypedData(
          typedData.domain,
          types,
          typedData.message
        );

      if (!signature || !signature.startsWith("0x")) {
        throw new Error(
          "MetaMask did not return a valid authorization signature."
        );
      }

      setDexPrepare((current) => ({
        ...current,
        signing: false,
        signed: true,
        customerSignature: signature,
        error: "",
      }));

      console.log(
        "[DEX] Customer authorization signature created",
        {
          signer: signerAddress,
          permissionId: dexPrepare.permissionId,
        }
      );
    } catch (error) {
      if (error?.code === 4001) {
        setDexPrepare((current) => ({
          ...current,
          signing: false,
          signed: false,
          customerSignature: "",
          error: "DEX authorization signature was cancelled.",
        }));
        return;
      }

      setDexPrepare((current) => ({
        ...current,
        signing: false,
        signed: false,
        customerSignature: "",
        error:
          error?.message ||
          "Failed to sign DEX authorization.",
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white grid place-items-center">
        <FaSyncAlt className="animate-spin text-4xl text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white pb-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_35%)]" />

      <main className="relative mx-auto max-w-4xl px-4 py-6 space-y-5">
        <button onClick={() => navigate("/dashboard")} className="text-white/60 hover:text-white">
          <FaArrowLeft className="inline mr-2" />
          Back to Dashboard
        </button>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-3xl font-black">Connect Wallet</h1>
          <p className="mt-2 text-white/50">
            Used for DEX sniper bots, DeFi features, and IMALI token benefits.
          </p>

          <div
            className={`mt-6 rounded-2xl border p-4 ${
              status.verified
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-yellow-400/30 bg-yellow-400/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {status.verified ? (
                <FaCheckCircle className="mt-1 text-emerald-300" />
              ) : (
                <FaExclamationTriangle className="mt-1 text-yellow-300" />
              )}

              <div>
                <h2 className="font-black">
                  {status.verified ? "Wallet Verified" : "Wallet Not Verified"}
                </h2>
                <p className="text-sm text-white/60">
                  {status.verified
                    ? `Wallet: ${status.wallet || "Verified"}`
                    : "Connect MetaMask and verify wallet ownership before enabling DEX features."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <FaWallet className="text-5xl text-cyan-300" />

          <h2 className="mt-5 text-2xl font-black">DEX Trading Connection</h2>
          <p className="mt-2 text-white/50">
            Connect MetaMask to enable wallet-based trading features.
          </p>

          <ul className="mt-5 space-y-3 text-white/70">
            <li>• DEX sniper bots</li>
            <li>• DeFi strategies</li>
            <li>• IMALI token balance checks</li>
            <li>• Subscription discounts</li>
            <li>• Future governance features</li>
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleConnectWallet}
              className="rounded-2xl bg-cyan-500 py-3 font-black text-black hover:bg-cyan-400"
            >
              <FaWallet className="inline mr-2" />
              {status.verified ? "Reverify Wallet" : "Connect and Verify Wallet"}
            </button>

            <button
              onClick={() => navigate("/billing-dashboard")}
              className="rounded-2xl bg-purple-500 py-3 font-black hover:bg-purple-400"
            >
              <FaCrown className="inline mr-2" />
              Upgrade for DEX
            </button>
          </div>
        </section>

        {status.verified && (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">DEX Authorization</h2>
            <p className="mt-2 text-white/50">
              Prepare the restricted Base Sepolia trading authorization.
              This step does not sign or send a transaction.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="font-black">
                {dexPrepare.ready
                  ? "Safe Ready — Authorization Required"
                  : "Authorization Not Prepared"}
              </div>

              {dexPrepare.ready && (
                <div className="mt-2 space-y-1 text-sm text-white/60">
                  <div>
                    Safe: {dexPrepare.safe}
                  </div>
                  <div>
                    Permission ID: {dexPrepare.permissionId}
                  </div>
                </div>
              )}

              {dexPrepare.error && (
                <div className="mt-3 text-sm text-red-300">
                  {dexPrepare.error}
                </div>
              )}
            </div>

            {dexPrepare.ready && (
              <button
                onClick={handleSignDexAuthorization}
                disabled={dexPrepare.signing}
                className="mt-3 rounded-2xl bg-purple-500 px-5 py-3 font-black hover:bg-purple-400 disabled:opacity-50"
              >
                {dexPrepare.signing
                  ? "Waiting for MetaMask..."
                  : dexPrepare.signed
                    ? "Authorization Signed"
                    : "Sign DEX Authorization"}
              </button>
            )}

            {dexPrepare.signed && (
              <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                Customer authorization signed. Session is not enabled yet.
              </div>
            )}

            <button
              onClick={handlePrepareDexAuthorization}
              disabled={dexPrepare.loading}
              className="mt-5 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {dexPrepare.loading
                ? "Preparing..."
                : "Prepare DEX Authorization"}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}