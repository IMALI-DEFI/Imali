// src/pages/MetaMaskGuide.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function MetaMaskGuide() {
  const card = "rounded-xl bg-gray-800/70 border border-white/10 p-6 shadow-lg";

  // ---- Demo/Live toggle (like your other pages) ---------------------------
  const [mode, setMode] = useState("demo"); // "demo" | "live"

  // ---- Wallet state -------------------------------------------------------
  const [hasMM, setHasMM] = useState(false);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  // Detect MetaMask/Provider
  useEffect(() => {
    const isThere = typeof window !== "undefined" && window.ethereum && window.ethereum.isMetaMask;
    setHasMM(!!isThere);

    if (isThere) {
      // attach listeners (optional)
      const handleAccountsChanged = (accs) => {
        setAccount(accs?.[0] || "");
      };
      const handleChainChanged = (cid) => {
        setChainId(cid);
      };
      window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
        if (accs?.length) setAccount(accs[0]);
      });
      window.ethereum.request({ method: "eth_chainId" }).then((cid) => setChainId(cid));

      window.ethereum.on?.("accountsChanged", handleAccountsChanged);
      window.ethereum.on?.("chainChanged", handleChainChanged);
      return () => {
        window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // Quick actions
  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        setStatus({ type: "error", message: "MetaMask not detected. Install the extension first." });
        return;
      }
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs?.[0] || "");
      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(cid);
      setStatus({ type: "success", message: "Wallet connected." });
    } catch (err) {
      setStatus({ type: "error", message: err?.message || "Failed to connect wallet." });
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setStatus({ type: "success", message: "Copied to clipboard." });
    } catch {
      setStatus({ type: "error", message: "Copy failed — copy manually." });
    }
  };

  const addNetwork = async (network) => {
    if (!window.ethereum) {
      setStatus({ type: "error", message: "MetaMask not detected." });
      return;
    }
    try {
      // Known presets
      const presets = {
        ethereum: {
          chainId: "0x1",
          chainName: "Ethereum Mainnet",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.ankr.com/eth"],
          blockExplorerUrls: ["https://etherscan.io"],
        },
        polygon: {
          chainId: "0x89",
          chainName: "Polygon",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
          blockExplorerUrls: ["https://polygonscan.com"],
        },
        bnb: {
          chainId: "0x38",
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"],
          blockExplorerUrls: ["https://bscscan.com"],
        },
      };

      const cfg = presets[network];
      if (!cfg) throw new Error("Unknown network preset.");

      // First try to switch, then (if needed) add
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: cfg.chainId }],
        });
      } catch (switchErr) {
        // 4902 = chain not added
        if (switchErr?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [cfg],
          });
        } else {
          throw switchErr;
        }
      }

      const cid = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(cid);
      setStatus({ type: "success", message: `Switched to ${cfg.chainName}.` });
    } catch (err) {
      setStatus({ type: "error", message: err?.message || "Failed to add/switch network." });
    }
  };

  // ---- Gamified onboarding checklist (XP rail) ----------------------------
  const [tasks, setTasks] = useState([
    { id: "t1", label: "Install MetaMask extension / mobile app", done: false },
    { id: "t2", label: "Write seed phrase on paper (never screenshot)", done: false },
    { id: "t3", label: "Create strong password and enable biometrics", done: false },
    { id: "t4", label: "Connect MetaMask to IMALI (read-only OK)", done: false },
  ]);
  const xpPerTask = 25;
  const completed = tasks.filter((t) => t.done).length;
  const progress = Math.round((completed / tasks.length) * 100);
  const xp = completed * xpPerTask;

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const [openFAQ, setOpenFAQ] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const features = useMemo(
    () => [
      {
        title: "Account & Keys",
        points: [
          "Create multiple accounts under one seed phrase.",
          "Export private key (rarely needed; protect it like your bank vault key).",
          "Hardware wallet support (Ledger/Trezor) for safer signing.",
        ],
      },
      {
        title: "Networks",
        points: [
          "Switch between Ethereum, Polygon, BNB, and more.",
          "Add custom RPC endpoints for reliability and speed.",
          "Track current chain ID and connected site permissions.",
        ],
      },
      {
        title: "Tokens & NFTs",
        points: [
          "Auto-detect many tokens; add custom tokens by contract address.",
          "View NFTs in supported networks and dapps.",
          "Approve spending limits safely (know how to revoke).",
        ],
      },
      {
        title: "Dapps & Signatures",
        points: [
          "Connect to DeFi, games, and tools via the injected provider.",
          "Sign messages and transactions; inspect what you’re signing.",
          "Use read-only connections when testing a new dapp.",
        ],
      },
      {
        title: "Swaps (Optional)",
        points: [
          "Swap within MetaMask or use a DEX; compare fees.",
          "Set slippage carefully; higher slippage can be risky.",
          "Prefer reputable routers and audited protocols.",
        ],
      },
    ],
    []
  );

  return (
    <div className="relative bg-gradient-to-b from-gray-900 to-indigo-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-24 relative">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            MetaMask <span className="text-indigo-400">Wallet Guide</span>
          </h1>
          <p className="mt-4 text-lg text-indigo-200/90">
            Learn what MetaMask does, how to set it up safely, and how to connect it to IMALI.
            Demo or Live — the same habits keep you safe.
          </p>

          {/* Mode Toggle */}
          <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {["demo", "live"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm rounded-lg transition ${
                  mode === m ? "bg-indigo-600" : "hover:bg-white/10"
                }`}
              >
                {m === "demo" ? "Demo Mode" : "Live Mode"}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-indigo-200/80">
            In <b>{mode === "demo" ? "Demo" : "Live"}</b> you’ll see{" "}
            {mode === "demo" ? "practice flows with tiny amounts" : "real balances & signing prompts"}.
          </div>
        </div>

        {/* Status */}
        {status.message && (
          <div
            className={`mx-auto max-w-3xl mb-6 rounded-lg p-3 text-sm ${
              status.type === "success" ? "bg-emerald-600/20 border border-emerald-500/40" : "bg-red-600/20 border border-red-500/40"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Progress rail */}
        <div className="mx-auto max-w-4xl mb-10">
          <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-indigo-200 mt-2">
            <span>Level 1: Install</span>
            <span>Level 2: Secure Seed</span>
            <span>Level 3: Connect</span>
            <span>Level 4: First Action</span>
          </div>
        </div>

        {/* Gamified checklist */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 p-5 mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold">Level 1: Wallet Setup</h2>
              <p className="text-gray-300">Complete the steps to earn XP and unlock pro tools.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-300">XP: {xp} / {xpPerTask * tasks.length}</div>
              <div className="w-48 h-2 bg-white/10 rounded-full mt-1">
                <div className="h-2 rounded-full bg-purple-400" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">{progress}% complete</div>
            </div>
          </div>

          <ul className="mt-4 grid md:grid-cols-2 gap-3">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3 bg-white/5">
                <button
                  aria-label={t.done ? "Uncheck task" : "Check task"}
                  onClick={() => toggleTask(t.id)}
                  className={`mt-0.5 w-5 h-5 rounded grid place-items-center border ${
                    t.done ? "bg-green-500/80 border-green-400" : "bg-transparent border-white/20"
                  }`}
                >
                  {t.done ? "✓" : ""}
                </button>
                <span className={t.done ? "line-through text-gray-400" : ""}>{t.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold"
            >
              Install MetaMask
            </a>
            <Link
              to="/how-it-works"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
            >
              How IMALI Works
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          <section className={card}>
            <h3 className="text-lg font-semibold mb-2">Connect / Address</h3>
            <p className="text-indigo-100/90 text-sm mb-3">
              Connect MetaMask and copy your public address when needed. Never share your seed phrase.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <button onClick={connectMetaMask} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 font-semibold">
                {account ? "Reconnect" : "Connect MetaMask"}
              </button>
              <button
                onClick={() => copy(account || "")}
                disabled={!account}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold hover:bg-white/10 disabled:opacity-40"
              >
                Copy Address
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-300">
              {hasMM ? (
                account ? (
                  <>
                    <div><b>Account:</b> <span className="font-mono break-all">{account}</span></div>
                    <div><b>Chain:</b> <span className="font-mono">{chainId || "unknown"}</span></div>
                  </>
                ) : (
                  "MetaMask detected. Click Connect to proceed."
                )
              ) : (
                "MetaMask not detected. Install the extension/app first."
              )}
            </div>
          </section>

          <section className={card}>
            <h3 className="text-lg font-semibold mb-2">Add / Switch Network</h3>
            <p className="text-indigo-100/90 text-sm mb-3">Quickly add or switch to a popular EVM network.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => addNetwork("ethereum")} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold">
                Ethereum
              </button>
              <button onClick={() => addNetwork("polygon")} className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-sm font-semibold">
                Polygon
              </button>
              <button onClick={() => addNetwork("bnb")} className="rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-2 text-sm font-semibold">
                BNB Smart Chain
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              If switching fails with code 4902, we’ll attempt to add the chain automatically.
            </p>
          </section>

          <section className={card}>
            <h3 className="text-lg font-semibold mb-2">What is MetaMask?</h3>
            <p className="text-indigo-100/90 text-sm">
              MetaMask is a non-custodial crypto wallet and gateway to Web3. You control your keys,
              connect to dapps, sign transactions, view tokens/NFTs, and manage networks.
            </p>
          </section>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
          {features.map((f, idx) => (
            <section key={idx} className={card}>
              <h4 className="text-lg font-semibold">{f.title}</h4>
              <ul className="mt-3 space-y-2 text-indigo-100/90 text-sm">
                {f.points.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Safety First */}
        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <section className={card}>
            <h4 className="text-lg font-semibold">Cautionary Notes (Read This!)</h4>
            <ul className="mt-3 space-y-2 text-indigo-100/90 text-sm">
              <li>🔐 <b>Seed Phrase:</b> Write it on paper. Never share. Never type it into a website. No staff will ask for it.</li>
              <li>🧾 <b>Approvals:</b> Token approvals let dapps spend tokens. Use a revoke tool to remove old/unlimited approvals.</li>
              <li>🎭 <b>Phishing:</b> Fake sites/support are common. Check URLs, avoid DMs, and use official links.</li>
              <li>🛰️ <b>RPC Spoofing:</b> Only add networks from trusted docs or inside the app. Malicious RPCs can mislead you.</li>
              <li>🧪 <b>Test First:</b> Try $1–$5 swaps for new dapps/bridges. Learn fees and flow safely.</li>
              <li>📉 <b>Volatility:</b> Prices swing; set limits. Keep extra gas on each chain to avoid getting stuck.</li>
            </ul>
          </section>

          <section className={card}>
            <h4 className="text-lg font-semibold">Advanced (Optional)</h4>
            <ul className="mt-3 space-y-2 text-gray-300 text-sm">
              <li>• Customize gas (max fee, priority) and nonce when needed.</li>
              <li>• Review “Connected Sites” and remove any you don’t use.</li>
              <li>• Reset account / clear activity if UI is out of sync (doesn’t affect funds).</li>
              <li>• Pair a hardware wallet for higher-value accounts.</li>
            </ul>
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              {showAdvanced ? "Hide Pro Tips" : "Show Pro Tips"}
            </button>
            {showAdvanced && (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-gray-400">
                Pro tip: Use separate accounts for experimenting vs. storing value. Consider a dedicated browser profile for Web3.
              </div>
            )}
          </section>
        </div>

        {/* FAQ */}
        <section className="mt-10">
          <h4 className="text-lg font-semibold mb-3">FAQ</h4>
          <div className="space-y-2">
            {[
              {
                q: "Is MetaMask safe?",
                a: "It’s non-custodial: you control keys. Safety depends on your habits—protect your seed, verify sites, and use hardware wallets for larger balances.",
              },
              {
                q: "What’s the difference between address, private key, and seed phrase?",
                a: "Your address is public. Your private key controls one account. The seed phrase can derive all accounts—protect it above all.",
              },
              {
                q: "Why do I need gas?",
                a: "Every action on a chain costs a small fee in the chain’s native token. Keep a buffer to avoid failed or stuck transactions.",
              },
              {
                q: "MetaMask shows the wrong balance/tx?",
                a: "Hit refresh, switch networks, or clear activity. If still off, check on a block explorer (Etherscan/Polygonscan) which is the source of truth.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
                open={openFAQ === i}
                onToggle={(e) => setOpenFAQ(e.currentTarget.open ? i : null)}
              >
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-gray-300 text-sm">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 font-semibold"
          >
            Install MetaMask
          </a>
          <Link
            to="/supported-chains"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 font-semibold"
          >
            Choose a Network
          </Link>
          <Link
            to="/funding-guide"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
          >
            Funding Guide
          </Link>
        </div>
      </div>
    </div>
  );
}