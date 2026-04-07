import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

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

const SimpleInput = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  helper,
}) => (
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
    {helper && <p className="text-xs text-gray-500">{helper}</p>}
  </div>
);

const ModeToggle = ({ isLive, onChange, disabled }) => (
  <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg">
    <span className="text-sm text-gray-400">Mode:</span>
    <button
      type="button"
      onClick={() => onChange(false)}
      disabled={disabled}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        !isLive
          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      🎮 Paper Trading
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      disabled={disabled}
      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
        isLive
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-gray-800 text-gray-500 hover:text-gray-300"
      }`}
    >
      💰 Live Trading
    </button>
  </div>
);

const ActionButton = ({
  onClick,
  disabled,
  loading,
  children,
  color = "blue",
  type = "button",
}) => {
  const colors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    gray: "bg-gray-700 hover:bg-gray-600",
    orange: "bg-orange-600 hover:bg-orange-700",
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

const InfoBox = ({ type = "info", children }) => {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-200",
    tip: "bg-purple-500/10 border-purple-500/30 text-purple-200",
  };

  return <div className={`p-4 rounded-lg border ${styles[type]} text-sm`}>{children}</div>;
};

const HelpLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors underline"
  >
    {children}
  </a>
);

const extractStatus = (activation) => ({
  billing: !!activation?.has_card_on_file || !!activation?.billing_complete,
  okx: !!activation?.okx_connected,
  alpaca: !!activation?.alpaca_connected,
  wallet: !!activation?.wallet_connected,
  trading: !!activation?.trading_enabled,
});

export default function Activation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, refreshActivation } = useAuth();

  const hasRedirected = useRef(false);
  const initialLoadDone = useRef(false);
  const billingCheckInterval = useRef(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tier = useMemo(() => {
    const userTier = user?.tier?.toLowerCase();
    const stateTier = location.state?.tier;
    const savedTier = localStorage.getItem("IMALI_TIER");
    return userTier || stateTier || savedTier || "starter";
  }, [location.state?.tier, user?.tier]);

  const [okx, setOkx] = useState({
    apiKey: "",
    apiSecret: "",
    passphrase: "",
    isLive: false,
  });

  const [alpaca, setAlpaca] = useState({
    apiKey: "",
    apiSecret: "",
    isLive: false,
  });

  const [wallet, setWallet] = useState("");

  const needs = useMemo(
    () => ({
      billing: true,
      okx: ["starter", "pro", "bundle"].includes(tier),
      alpaca: ["starter", "bundle"].includes(tier),
      wallet: ["elite", "bundle"].includes(tier),
    }),
    [tier]
  );

  const status = useMemo(() => extractStatus(activation || {}), [activation]);

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

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;

      try {
        if (refreshActivation) {
          await refreshActivation();
        }
      } catch (err) {
        console.warn("[Activation] Initial load failed:", err);
      }
    };

    loadInitialData();
  }, [refreshActivation]);

  // Check for billing status periodically (in case user comes from billing page)
  useEffect(() => {
    const checkBillingStatus = async () => {
      try {
        const cardStatus = await BotAPI.getCardStatus();
        if (cardStatus?.has_card || cardStatus?.billing_complete) {
          await refreshActivation();
        }
      } catch (err) {
        console.warn("[Activation] Failed to check billing status:", err);
      }
    };

    // Check immediately when component mounts
    checkBillingStatus();

    // Set up interval to check every 5 seconds (for when returning from billing)
    billingCheckInterval.current = setInterval(checkBillingStatus, 5000);

    return () => {
      if (billingCheckInterval.current) {
        clearInterval(billingCheckInterval.current);
      }
    };
  }, [refreshActivation]);

  // Auto-redirect when fully activated
  useEffect(() => {
    if (fullyActivated && !hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate]);

  const refreshAfterAction = useCallback(async () => {
    try {
      await refreshActivation?.();
    } catch (err) {
      console.error("[Activation] Refresh after action failed:", err);
    }
  }, [refreshActivation]);

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
        mode: okx.isLive ? "live" : "paper",
      });

      setSuccess(
        `✅ OKX connected successfully in ${okx.isLive ? "LIVE" : "PAPER"} mode!`
      );
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to connect OKX. Please double-check your API keys."
      );
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
        mode: alpaca.isLive ? "live" : "paper",
      });

      setSuccess(
        `✅ Alpaca connected successfully in ${alpaca.isLive ? "LIVE" : "PAPER"} mode!`
      );
      setAlpaca({ apiKey: "", apiSecret: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to connect Alpaca. Please double-check your API keys."
      );
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
      setError("Wallet address must start with '0x' and be exactly 42 characters long");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr });
      setSuccess("✅ Wallet connected successfully!");
      setWallet("");
      await refreshAfterAction();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to connect wallet"
      );
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !status.trading) {
      setError("Please complete billing and connect your accounts first");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      await refreshAfterAction();
      setSuccess(
        enabling
          ? "✅ Trading enabled! Redirecting to your dashboard…"
          : "Trading has been turned off"
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not update trading status"
      );
    } finally {
      setBusy("");
    }
  };

  const handleSkipToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleUpgradePlan = () => {
    navigate("/pricing");
  };

  const getPlanName = () => {
    switch (tier) {
      case "starter":
        return "Starter (Free)";
      case "pro":
        return "Pro";
      case "elite":
        return "Elite";
      case "stock":
        return "DeFi (New Crypto)";
      case "bundle":
        return "Bundle";
      default:
        return "Current Plan";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to IMALI! 🚀</h1>
          <p className="text-gray-400 mb-4">
            You&apos;ve selected the{" "}
            <span className="text-blue-400 font-semibold">{getPlanName()}</span> plan.
            Let&apos;s set up your automated trading bot.
          </p>

          {tier === "starter" && (
            <InfoBox type="tip">
              💡 <strong>Want more features?</strong> You can upgrade to Pro, Elite, or
              Bundle at any time from the{" "}
              <button
                onClick={handleUpgradePlan}
                className="ml-1 text-blue-400 hover:text-blue-300 underline"
              >
                Pricing page
              </button>
              .
            </InfoBox>
          )}
        </div>

        {fullyActivated && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center justify-between">
            <span>🎉 Your account is fully activated! Redirecting to your dashboard…</span>
            <button
              onClick={handleSkipToDashboard}
              className="underline hover:text-white transition-colors"
            >
              Go now →
            </button>
          </div>
        )}

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

        <SectionCard
          number="1"
          title="Add Payment Method"
          description="Set up billing before activation"
          status={status.billing}
        >
          {!status.billing ? (
            <div className="space-y-4">
              <InfoBox type="info">
                📌 <strong>How billing works:</strong><br />
                • Your card is securely stored with Stripe<br />
                • Billing setup is required before activation can complete<br />
                • You can review your billing flow before turning on trading
              </InfoBox>
              <div className="flex flex-col sm:flex-row gap-3">
                <ActionButton onClick={() => navigate("/billing", { state: { tier } })} color="blue">
                  Add Credit Card
                </ActionButton>
                <HelpLink href="https://imali-defi.com/faq#billing">
                  Learn more about billing →
                </HelpLink>
              </div>
            </div>
          ) : (
            <div className="text-green-300">✅ Payment method saved successfully</div>
          )}
        </SectionCard>

        <SectionCard
          number="2"
          title="Connect Your Trading Accounts"
          description="Link the platforms where you want the bot to trade"
          status={connectionsDone}
        >
          <div className="space-y-6">
            {needs.okx && !status.okx && (
              <form onSubmit={connectOKX} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-blue-300">🔷 OKX Exchange (Cryptocurrency)</h3>

                <InfoBox type="info">
                  <strong>What is OKX?</strong> A cryptocurrency exchange where you can trade Bitcoin, Ethereum, and other digital assets.
                </InfoBox>

                <ModeToggle
                  isLive={okx.isLive}
                  onChange={(isLive) => setOkx({ ...okx, isLive })}
                  disabled={busy === "okx"}
                />

                {okx.isLive && (
                  <InfoBox type="warning">
                    ⚠️ <strong>Live Mode:</strong> The bot will trade with real money.
                  </InfoBox>
                )}

                <SimpleInput
                  label="API Key"
                  value={okx.apiKey}
                  onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                  placeholder="Enter your OKX API key"
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={okx.apiSecret}
                  onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                  placeholder="Enter your OKX secret key"
                  disabled={busy === "okx"}
                />
                <SimpleInput
                  label="Passphrase"
                  type="password"
                  value={okx.passphrase}
                  onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                  placeholder="Enter your OKX passphrase"
                  disabled={busy === "okx"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "okx"}
                    loading={busy === "okx"}
                    color={okx.isLive ? "green" : "orange"}
                  >
                    Connect OKX ({okx.isLive ? "Live" : "Paper"})
                  </ActionButton>
                </div>
              </form>
            )}

            {needs.alpaca && !status.alpaca && (
              <form onSubmit={connectAlpaca} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-green-300">📈 Alpaca (US Stocks)</h3>

                <InfoBox type="info">
                  <strong>What is Alpaca?</strong> A stock trading platform for US markets.
                </InfoBox>

                <ModeToggle
                  isLive={alpaca.isLive}
                  onChange={(isLive) => setAlpaca({ ...alpaca, isLive })}
                  disabled={busy === "alpaca"}
                />

                <SimpleInput
                  label="API Key ID"
                  value={alpaca.apiKey}
                  onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                  placeholder="PK..."
                  disabled={busy === "alpaca"}
                />
                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={alpaca.apiSecret}
                  onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                  placeholder="Enter your secret key"
                  disabled={busy === "alpaca"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "alpaca"}
                    loading={busy === "alpaca"}
                    color={alpaca.isLive ? "green" : "orange"}
                  >
                    Connect Alpaca ({alpaca.isLive ? "Live" : "Paper"})
                  </ActionButton>
                </div>
              </form>
            )}

            {needs.wallet && !status.wallet && (
              <form onSubmit={connectWallet} className="space-y-4 border-t border-white/10 pt-6">
                <h3 className="text-lg font-medium text-purple-300">🦄 DeFi Wallet</h3>

                <InfoBox type="info">
                  <strong>What is a DeFi wallet?</strong> A crypto wallet for decentralized trading.
                </InfoBox>

                <SimpleInput
                  label="Ethereum Wallet Address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  helper="42 characters starting with 0x"
                  disabled={busy === "wallet"}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <ActionButton
                    type="submit"
                    disabled={busy === "wallet"}
                    loading={busy === "wallet"}
                    color="blue"
                  >
                    Connect Wallet
                  </ActionButton>
                </div>
              </form>
            )}

            {needs.okx && status.okx && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ OKX connected successfully
              </div>
            )}
            {needs.alpaca && status.alpaca && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Alpaca connected successfully
              </div>
            )}
            {needs.wallet && status.wallet && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                ✅ Wallet connected successfully
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          number="3"
          title="Activate Trading Bot"
          description="Turn on automated trading when you're ready"
          status={status.trading}
        >
          <div className="space-y-4">
            {!canEnableTrading && !status.trading ? (
              <InfoBox type="warning">
                ⏳ Please complete steps 1 and 2 first before activating the trading bot.
              </InfoBox>
            ) : (
              <div className="space-y-4">
                <InfoBox type="info">
                  🤖 <strong>How the bot works:</strong><br />
                  • Analyzes market conditions<br />
                  • Executes trades based on configured strategies<br />
                  • You can monitor everything from your dashboard
                </InfoBox>

                {status.trading && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-300 font-medium mb-2">🟢 Trading bot is currently ACTIVE</p>
                    <p className="text-sm text-gray-400">
                      Your bot is running and looking for trading opportunities.
                    </p>
                  </div>
                )}

                <ActionButton
                  onClick={toggleTrading}
                  disabled={busy === "trading" || (!canEnableTrading && !status.trading)}
                  loading={busy === "trading"}
                  color={status.trading ? "gray" : "green"}
                >
                  {status.trading ? "⏸ Pause Trading Bot" : "▶️ Start Trading Bot"}
                </ActionButton>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Need Help? 🤝</h3>
          <div className="grid gap-3">
            <a
              href="https://imali-defi.com/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>📚</span>
              <div>
                <div className="font-medium">Getting Started Guide</div>
                <div className="text-xs text-gray-400">Step-by-step walkthrough for beginners</div>
              </div>
            </a>

            <a
              href="mailto:support@imali-defi.com"
              className="flex items-center gap-2 p-3 bg-black/30 rounded-lg hover:bg-black/50 transition-colors"
            >
              <span>📧</span>
              <div>
                <div className="font-medium">Email Support</div>
                <div className="text-xs text-gray-400">Get help from our team</div>
              </div>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm">
          <button 
            onClick={handleSkipToDashboard} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            Skip to Dashboard →
          </button>
          <span className="text-gray-600">•</span>
          <button onClick={handleUpgradePlan} className="text-gray-400 hover:text-white transition-colors">
            Upgrade Plan →
          </button>
        </div>
      </div>
    </div>
  );
}