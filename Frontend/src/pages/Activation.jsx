// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

// ────────────────────────────────────────────────────────────
// Presentational Components (unchanged layout)
// ────────────────────────────────────────────────────────────

const StatusBadge = ({ done }) => (
  <span
    className={`px-3 py-1 rounded-full text-sm font-medium ${
      done
        ? "bg-green-500/20 text-green-300 border border-green-500/30"
        : "bg-gray-800 text-gray-400 border border-gray-700"
    }`}
  >
    {done ? "✓ DONE" : "⋯ PENDING"}
  </span>
);

const SectionCard = ({ number, title, description, status, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 font-bold text-lg">
          {number}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <StatusBadge done={status} />
    </div>
    {children}
  </div>
);

const SimpleInput = ({ label, type = "text", value, onChange, placeholder, disabled }) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-400">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
    />
  </div>
);

const ActionButton = ({ onClick, disabled, loading, children, color = "blue", type = "button" }) => {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    gray: "bg-gray-700 hover:bg-gray-600",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-medium transition-all ${colors[color]} disabled:opacity-50 disabled:cursor-not-allowed text-white`}
    >
      {loading ? "Working..." : children}
    </button>
  );
};

const HelpLink = () => (
  <a
    href="https://imali-defi.com/funding-guide"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
  >
    <span>📘</span>
    Need help? Read our funding guide
  </a>
);

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export default function Activation() {
  const navigate = useNavigate();
  const { user, activation, refreshActivation, setActivation } = useAuth();
  const hasRedirected = useRef(false);
  const initialLoadDone = useRef(false);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [okx, setOkx] = useState({ apiKey: "", apiSecret: "", passphrase: "" });
  const [alpaca, setAlpaca] = useState({ apiKey: "", apiSecret: "" });
  const [wallet, setWallet] = useState("");

  // ── Derived state (all memoized so React tracks changes) ──

  const tier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user]);

  const needs = useMemo(
    () => ({
      okx: ["starter", "pro", "bundle"].includes(tier),
      alpaca: ["starter", "bundle"].includes(tier),
      wallet: ["elite", "bundle"].includes(tier),
    }),
    [tier]
  );

  const status = useMemo(
    () => ({
      billing: !!activation?.billing_complete,
      okx: !!activation?.okx_connected,
      alpaca: !!activation?.alpaca_connected,
      wallet: !!activation?.wallet_connected,
      trading: !!activation?.trading_enabled,
    }),
    [activation]
  );

  const connectionsDone = useMemo(
    () =>
      (!needs.okx || status.okx) &&
      (!needs.alpaca || status.alpaca) &&
      (!needs.wallet || status.wallet),
    [needs, status]
  );

  const canEnableTrading = useMemo(
    () => status.billing && connectionsDone,
    [status.billing, connectionsDone]
  );

  const fullyActivated = useMemo(
    () => status.billing && connectionsDone && status.trading,
    [status.billing, connectionsDone, status.trading]
  );

  // ── Load initial data once ────────────────────────────────

  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;
      
      try {
        // Only refresh if we don't have activation data yet
        if (!activation && refreshActivation) {
          console.log("[Activation] Loading initial activation data");
          await refreshActivation();
        }
      } catch (err) {
        console.warn("[Activation] Initial load failed:", err);
      }
    };

    loadInitialData();
  }, [activation, refreshActivation]);

  // ── Debug logging ─────────────────────────────────────────

  useEffect(() => {
    console.log("[Activation] State snapshot:", {
      tier,
      activation,
      needs,
      status,
      connectionsDone,
      canEnableTrading,
      fullyActivated,
      hasRedirected: hasRedirected.current,
    });
  }, [tier, activation, needs, status, connectionsDone, canEnableTrading, fullyActivated]);

  // ── Redirect when fully activated ─────────────────────────

  useEffect(() => {
    if (fullyActivated && !hasRedirected.current) {
      console.log("[Activation] ✅ Fully activated — redirecting to /dashboard");
      hasRedirected.current = true;

      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate]);

  // ── Refresh helper (called after every action) ────────────

  const refreshAfterAction = useCallback(async () => {
    try {
      if (refreshActivation) {
        await refreshActivation();
      } else {
        // Fallback: fetch and set manually
        const res = await BotAPI.activationStatus();
        const fresh = res?.status ?? res?.data?.status ?? res;
        if (setActivation) setActivation(fresh);
      }
    } catch (err) {
      console.error("[Activation] Refresh after action failed:", err);
    }
  }, [refreshActivation, setActivation]);

  // ── Connection handlers ───────────────────────────────────

  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    if (!okx.apiKey || !okx.apiSecret || !okx.passphrase) {
      setError("Please fill in all OKX fields");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectOKX({
        api_key: okx.apiKey.trim(),
        api_secret: okx.apiSecret.trim(),
        passphrase: okx.passphrase.trim(),
        mode: "live",
      });
      setSuccess("✅ OKX connected successfully!");
      setOkx({ apiKey: "", apiSecret: "", passphrase: "" });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX. Check your keys.");
    } finally {
      setBusy("");
    }
  };

  const connectAlpaca = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("alpaca");

    if (!alpaca.apiKey || !alpaca.apiSecret) {
      setError("Please fill in both Alpaca fields");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectAlpaca({
        api_key: alpaca.apiKey.trim(),
        api_secret: alpaca.apiSecret.trim(),
        mode: "live",
      });
      setSuccess("✅ Alpaca connected successfully!");
      setAlpaca({ apiKey: "", apiSecret: "" });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca. Check your keys.");
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("wallet");

    const addr = wallet.trim();
    if (!addr) {
      setError("Please enter your wallet address");
      setBusy("");
      return;
    }
    if (!addr.startsWith("0x") || addr.length !== 42) {
      setError("Wallet address must start with 0x and be 42 characters long");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr, address: addr });
      setSuccess("✅ Wallet connected successfully!");
      setWallet("");
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect wallet");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !status.trading) {
      setError("Please finish billing and connections first");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      setSuccess(enabling ? "✅ Trading enabled! Redirecting…" : "Trading turned off");
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading");
    } finally {
      setBusy("");
    }
  };

  const handleSkipToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to IMALI! 🚀</h1>
          <p className="text-gray-400 mb-4">
            Let's get your account ready to trade. Just 3 simple steps:
          </p>
          <HelpLink />
        </div>

        {/* Fully-activated banner */}
        {fullyActivated && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center justify-between">
            <span>🎉 You're all set! Redirecting to dashboard…</span>
            <button
              onClick={handleSkipToDashboard}
              className="underline hover:text-white transition-colors"
            >
              Go now →
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
            ⚠️ {error}
          </div>
        )}
        {success && !fullyActivated && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-200">
            {success}
          </div>
        )}

        {/* Dev debug panel */}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-400">
              🔧 Debug: Activation State
            </summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded-lg overflow-auto text-gray-400">
              {JSON.stringify(
                { tier, needs, status, connectionsDone, canEnableTrading, fullyActivated, activation },
                null,
                2
              )}
            </pre>
          </details>
        )}

        {/* Step 1: Billing */}
        <SectionCard
          number="1"
          title="Add Payment Method"
          description="We need a card on file to charge performance fees (30% on profits)"
          status={status.billing}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Your card will be securely saved with Stripe. We only charge when you make money.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton onClick={() => navigate("/billing")} color="blue">
                  Add Credit Card
                </ActionButton>
                <HelpLink />
              </div>
            </div>
          ) : (
            <div className="text-green-300">✅ Payment method saved</div>
          )}
        </SectionCard>

        {/* Step 2: Connect Accounts */}
        <SectionCard
          number="2"
          title="Connect Your Accounts"
          description="Link the accounts you want to trade with"
          status={connectionsDone}
        >
          <div className="space-y-6">

            {/* OKX */}
            {needs.okx && !status.okx && (
              <form onSubmit={connectOKX} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-blue-300">🔷 OKX Exchange</h3>
                <p className="text-sm text-gray-400">
                  Get your API keys from OKX (enable trading, disable withdrawals)
                </p>
                <SimpleInput
                  label="API Key"
                  value={okx.apiKey}
                  onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                  placeholder="okx-..."
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={okx.apiSecret}
                  onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                  placeholder="••••••••"
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Passphrase"
                  type="password"
                  value={okx.passphrase}
                  onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                  placeholder="your passphrase"
                  disabled={busy === "okx"}
                />
                <ActionButton
                  type="submit"
                  disabled={busy === "okx"}
                  loading={busy === "okx"}
                  color="blue"
                >
                  Connect OKX
                </ActionButton>
              </form>
            )}

            {/* Alpaca */}
            {needs.alpaca && !status.alpaca && (
              <form onSubmit={connectAlpaca} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-green-300">📈 Alpaca Trading</h3>
                <p className="text-sm text-gray-400">
                  Get your API keys from Alpaca (enable trading)
                </p>
                <SimpleInput
                  label="API Key"
                  value={alpaca.apiKey}
                  onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                  placeholder="AK..."
                  disabled={busy === "alpaca"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={alpaca.apiSecret}
                  onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                  placeholder="••••••••"
                  disabled={busy === "alpaca"}
                />
                <ActionButton
                  type="submit"
                  disabled={busy === "alpaca"}
                  loading={busy === "alpaca"}
                  color="green"
                >
                  Connect Alpaca
                </ActionButton>
              </form>
            )}

            {/* Wallet */}
            {needs.wallet && !status.wallet && (
              <form onSubmit={connectWallet} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-purple-300">🦄 Crypto Wallet</h3>
                <p className="text-sm text-gray-400">
                  Enter your Ethereum wallet address (starts with 0x)
                </p>
                <SimpleInput
                  label="Wallet Address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  disabled={busy === "wallet"}
                />
                <ActionButton
                  type="submit"
                  disabled={busy === "wallet"}
                  loading={busy === "wallet"}
                  color="blue"
                >
                  Connect Wallet
                </ActionButton>
              </form>
            )}

            {/* Connected indicators */}
            {needs.okx && status.okx && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ OKX connected
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Alpaca connected
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Wallet connected
              </div>
            )}
          </div>
        </SectionCard>

        {/* Step 3: Start Trading */}
        <SectionCard
          number="3"
          title="Start Trading"
          description="Turn on trading and let the bot work for you"
          status={status.trading}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <p className="text-yellow-500/80 text-sm">
                ⏳ Finish steps 1 and 2 first
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  When you're ready, flip the switch to start trading
                </p>
                <ActionButton
                  onClick={toggleTrading}
                  disabled={busy === "trading" || (!canEnableTrading && !status.trading)}
                  loading={busy === "trading"}
                  color={status.trading ? "gray" : "green"}
                >
                  {status.trading ? "Turn Trading OFF" : "Turn Trading ON"}
                </ActionButton>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Quick Links */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm">
          <a
            href="https://imali-defi.com/funding-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            📘 Funding Guide
          </a>
          <span className="text-gray-600">•</span>
          <button onClick={handleSkipToDashboard} className="text-gray-400 hover:text-white">
            Skip to Dashboard
          </button>
          <span className="text-gray-600">•</span>
          <a href="mailto:support@imali-defi.com" className="text-gray-400 hover:text-white">
            Need Help?
          </a>
        </div>
      </div>
    </div>
  );
}
