import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWallet,
  FaSyncAlt,
  FaCrown,
} from "react-icons/fa";

export default function ConnectWallet() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    connected: false,
    wallet: "",
    tier: "starter",
  });

  const loadStatus = async () => {
    setLoading(true);

    const integration = await BotAPI.getIntegrationStatus?.(true);
    const me = await BotAPI.getMe?.(true);

    setStatus({
      connected: Boolean(integration?.wallet_connected),
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

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const address = accounts?.[0];

    if (!address) {
      alert("Wallet connection cancelled.");
      return;
    }

    const res = await BotAPI.connectWallet?.({
      walletAddress: address,
      provider: "metamask",
    });

    if (res?.success === false) {
      alert(res.error || "Failed to connect wallet.");
      return;
    }

    await loadStatus();
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
              status.connected
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-yellow-400/30 bg-yellow-400/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {status.connected ? (
                <FaCheckCircle className="mt-1 text-emerald-300" />
              ) : (
                <FaExclamationTriangle className="mt-1 text-yellow-300" />
              )}

              <div>
                <h2 className="font-black">
                  {status.connected ? "Wallet Connected" : "Wallet Not Connected"}
                </h2>
                <p className="text-sm text-white/60">
                  {status.connected
                    ? `Wallet: ${status.wallet || "Connected"}`
                    : "Connect wallet to activate DEX and IMALI token features."}
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
              {status.connected ? "Reconnect Wallet" : "Connect Wallet"}
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
      </main>
    </div>
  );
}