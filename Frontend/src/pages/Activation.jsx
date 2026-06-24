// src/pages/Activation.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    {done ? "✓ COMPLETE" : "⋯ PENDING"}
  </span>
);

const StepCard = ({ number, title, description, status, children }) => (
  <div
    className={`rounded-2xl border-2 overflow-hidden ${
      status
        ? "border-green-500/50 bg-green-500/10"
        : "border-gray-700 bg-gray-900/60"
    }`}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {number}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>

        <StatusBadge done={status} />
      </div>

      {children}
    </div>
  </div>
);

const InfoBox = ({ type = "info", children }) => {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-200",
    success: "bg-green-500/10 border-green-500/30 text-green-200",
    tip: "bg-purple-500/10 border-purple-500/30 text-purple-200",
  };

  return (
    <div className={`p-4 rounded-xl border text-sm ${styles[type]}`}>
      {children}
    </div>
  );
};

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
      className="w-full px-4 py-3 rounded-lg bg-black/60 border border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none"
    />
    {helper && <p className="text-xs text-gray-500">{helper}</p>}
  </div>
);

const ModeToggle = ({ isLive, onChange, disabled }) => (
  <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg border border-white/10">
    <span className="text-sm text-gray-400">Mode:</span>

    <button
      type="button"
      onClick={() => onChange(false)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${
        !isLive
          ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
          : "bg-gray-800 text-gray-500"
      }`}
    >
      Paper
    </button>

    <button
      type="button"
      onClick={() => onChange(true)}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${
        isLive
          ? "bg-green-500/20 text-green-300 border border-green-500/40"
          : "bg-gray-800 text-gray-500"
      }`}
    >
      Live
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
    blue: "from-blue-600 to-blue-700",
    green: "from-green-600 to-emerald-700",
    orange: "from-orange-600 to-orange-700",
    purple: "from-purple-600 to-pink-700",
    gray: "from-gray-700 to-gray-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-lg font-semibold bg-gradient-to-r ${colors[color]} disabled:opacity-50 text-white`}
    >
      {loading ? "Processing..." : children}
    </button>
  );
};

export default function Activation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activation, refreshActivation, refreshUser } = useAuth();

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  // ✅ FIX: Get tier from URL, state, localStorage, then user
  const urlTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tier") || params.get("plan");
  }, [location.search]);

  const tier = useMemo(() => {
    const tierValue =
      urlTier ||
      location.state?.tier ||
      localStorage.getItem("IMALI_SELECTED_TIER") ||
      user?.tier ||
      "starter";
    return String(tierValue).toLowerCase();
  }, [urlTier, location.state?.tier, user?.tier]);

  // ✅ Persist tier to localStorage
  useEffect(() => {
    if (tier && tier !== "starter") {
      localStorage.setItem("IMALI_SELECTED_TIER", tier);
    }
  }, [tier]);

  const needs = useMemo(() => {
    if (tier === "starter") {
      return { billing: false, okx: false, alpaca: false, wallet: false };
    }

    if (tier === "pro") {
      return { billing: true, okx: true, alpaca: true, wallet: false };
    }

    if (tier === "elite") {
      return { billing: true, okx: true, alpaca: false, wallet: true };
    }

    return { billing: false, okx: false, alpaca: false, wallet: false };
  }, [tier]);

  // ✅ FIX: Only has_card_on_file means card exists
  const status = useMemo(
    () => ({
      billing: activation?.has_card_on_file === true,
      okx: activation?.okx_connected === true,
      alpaca: activation?.alpaca_connected === true,
      wallet: activation?.wallet_connected === true,
      trading: activation?.trading_enabled === true,
    }),
    [activation]
  );

  const connectionsDone =
    (!needs.okx || status.okx) &&
    (!needs.alpaca || status.alpaca) &&
    (!needs.wallet || status.wallet);

  const canEnableTrading =
    (tier === "starter" || !needs.billing || status.billing) && connectionsDone;

  const fullyActivated = canEnableTrading && status.trading;

  // ✅ FIX: Refresh activation on mount
  useEffect(() => {
    refreshActivation?.();
  }, [refreshActivation]);

  // ✅ FIX: Handle Starter redirect - only redirect after checking
  useEffect(() => {
    if (tier === "starter" && user) {
      // Don't redirect if we're coming from pricing with a different tier
      const hasTierParam = new URLSearchParams(location.search).get("tier");
      const hasStateTier = location.state?.tier;
      
      if (!hasTierParam && !hasStateTier) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [tier, user, navigate, location.search, location.state]);

  // Auto-redirect when fully activated
  useEffect(() => {
    if (fullyActivated) {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [fullyActivated, navigate]);

  const refreshAfterAction = useCallback(async () => {
    await refreshActivation?.();
    await refreshUser?.();
  }, [refreshActivation, refreshUser]);

  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    if (!okx.apiKey || !okx.apiSecret || !okx.passphrase) {
      setError("Please fill in all OKX fields.");
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

      setSuccess(`OKX connected in ${okx.isLive ? "live" : "paper"} mode.`);
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect OKX.");
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
      setError("Please fill in both Alpaca fields.");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectAlpaca({
        api_key: alpaca.apiKey.trim(),
        api_secret: alpaca.apiSecret.trim(),
        mode: alpaca.isLive ? "live" : "paper",
      });

      setSuccess(`Alpaca connected in ${alpaca.isLive ? "live" : "paper"} mode.`);
      setAlpaca({ apiKey: "", apiSecret: "", isLive: false });
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect Alpaca.");
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

    if (!addr.startsWith("0x") || addr.length !== 42) {
      setError("Wallet must start with 0x and be 42 characters.");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({ wallet: addr });
      setSuccess("Wallet connected successfully.");
      setWallet("");
      await refreshAfterAction();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to connect wallet.");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !status.trading) {
      setError("Complete the required setup steps first.");
      setBusy("");
      return;
    }

    try {
      const enabling = !status.trading;
      await BotAPI.toggleTrading(enabling);
      await refreshAfterAction();
      setSuccess(enabling ? "Trading bot activated." : "Trading bot paused.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update trading status.");
    } finally {
      setBusy("");
    }
  };

  // ✅ FIX: Show correct loading state for Starter
  if (tier === "starter" && !location.state?.tier && !new URLSearchParams(location.search).get("tier")) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Redirecting to paper trading dashboard...</p>
        </div>
      </div>
    );
  }

  if (tier === "enterprise") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">🏢</div>
          <h1 className="text-3xl font-bold mb-4">Enterprise Plan</h1>
          <p className="text-gray-400 mb-6">
            Enterprise accounts require manual approval.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
          >
            Return to Dashboard
          </button>

          <a
            href="mailto:sales@imali-defi.com"
            className="inline-block mt-4 text-blue-400 underline"
          >
            Contact Sales →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Complete Your Setup
          </h1>
          <p className="text-gray-400 capitalize">
            {tier} Plan • Complete the steps below to start live trading
          </p>

          {fullyActivated && (
            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
              <p className="text-green-300 font-semibold">
                ✓ All steps complete. Redirecting to dashboard...
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200">
            ⚠️ {error}
          </div>
        )}

        {success && !fullyActivated && (
          <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200">
            ✓ {success}
          </div>
        )}

        {needs.billing && (
          <StepCard
            number="1"
            title="Payment Method"
            description="Add a payment method to continue"
            status={status.billing}
          >
            {!status.billing ? (
              <div className="space-y-4">
                <InfoBox type="info">
                  Your payment method is securely processed through Stripe.
                </InfoBox>

                <ActionButton
                  onClick={() =>
                    navigate("/billing", {
                      state: {
                        tier,
                        updateCard: true,
                      },
                    })
                  }
                  color="blue"
                >
                  Add Payment Method
                </ActionButton>
              </div>
            ) : (
              <div className="text-green-300 font-medium text-center py-2">
                ✓ Payment method on file
              </div>
            )}
          </StepCard>
        )}

        <StepCard
          number={needs.billing ? "2" : "1"}
          title="Connect Trading Accounts"
          description="Link your exchange accounts"
          status={connectionsDone}
        >
          <div className="space-y-6">
            {needs.okx && !status.okx && (
              <form
                onSubmit={connectOKX}
                className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5 space-y-4"
              >
                <h3 className="text-lg font-semibold text-blue-300">
                  OKX Exchange
                </h3>

                <ModeToggle
                  isLive={okx.isLive}
                  onChange={(isLive) => setOkx({ ...okx, isLive })}
                  disabled={busy === "okx"}
                />

                <SimpleInput
                  label="API Key"
                  value={okx.apiKey}
                  onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                  placeholder="Enter API key"
                  disabled={busy === "okx"}
                />

                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={okx.apiSecret}
                  onChange={(e) =>
                    setOkx({ ...okx, apiSecret: e.target.value })
                  }
                  placeholder="Enter secret key"
                  disabled={busy === "okx"}
                />

                <SimpleInput
                  label="Passphrase"
                  type="password"
                  value={okx.passphrase}
                  onChange={(e) =>
                    setOkx({ ...okx, passphrase: e.target.value })
                  }
                  placeholder="Enter passphrase"
                  disabled={busy === "okx"}
                />

                <ActionButton
                  type="submit"
                  loading={busy === "okx"}
                  color={okx.isLive ? "green" : "orange"}
                >
                  Connect OKX
                </ActionButton>
              </form>
            )}

            {needs.alpaca && !status.alpaca && (
              <form
                onSubmit={connectAlpaca}
                className="border border-green-500/30 rounded-xl p-4 bg-green-500/5 space-y-4"
              >
                <h3 className="text-lg font-semibold text-green-300">
                  Alpaca Trading
                </h3>

                <ModeToggle
                  isLive={alpaca.isLive}
                  onChange={(isLive) => setAlpaca({ ...alpaca, isLive })}
                  disabled={busy === "alpaca"}
                />

                <SimpleInput
                  label="API Key ID"
                  value={alpaca.apiKey}
                  onChange={(e) =>
                    setAlpaca({ ...alpaca, apiKey: e.target.value })
                  }
                  placeholder="Enter Alpaca key"
                  disabled={busy === "alpaca"}
                />

                <SimpleInput
                  label="Secret Key"
                  type="password"
                  value={alpaca.apiSecret}
                  onChange={(e) =>
                    setAlpaca({ ...alpaca, apiSecret: e.target.value })
                  }
                  placeholder="Enter secret key"
                  disabled={busy === "alpaca"}
                />

                <ActionButton
                  type="submit"
                  loading={busy === "alpaca"}
                  color={alpaca.isLive ? "green" : "orange"}
                >
                  Connect Alpaca
                </ActionButton>
              </form>
            )}

            {needs.wallet && !status.wallet && (
              <form
                onSubmit={connectWallet}
                className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5 space-y-4"
              >
                <h3 className="text-lg font-semibold text-purple-300">
                  DeFi Wallet
                </h3>

                <InfoBox type="tip">
                  Use MetaMask or another EVM wallet for DeFi access.
                </InfoBox>

                <SimpleInput
                  label="Wallet Address"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x..."
                  helper="Must start with 0x and be 42 characters"
                  disabled={busy === "wallet"}
                />

                <ActionButton
                  type="submit"
                  loading={busy === "wallet"}
                  color="purple"
                >
                  Connect Wallet
                </ActionButton>
              </form>
            )}

            {needs.okx && status.okx && (
              <InfoBox type="success">✓ OKX connected</InfoBox>
            )}

            {needs.alpaca && status.alpaca && (
              <InfoBox type="success">✓ Alpaca connected</InfoBox>
            )}

            {needs.wallet && status.wallet && (
              <InfoBox type="success">✓ Wallet connected</InfoBox>
            )}

            {connectionsDone && (
              <InfoBox type="success">
                All required connections are complete.
              </InfoBox>
            )}
          </div>
        </StepCard>

        <StepCard
          number={needs.billing ? "3" : "2"}
          title="Enable Live Trading"
          description="Turn on automated trading"
          status={status.trading}
        >
          {!canEnableTrading && !status.trading ? (
            <InfoBox type="warning">
              {!status.billing && needs.billing
                ? "Complete billing setup first."
                : "Connect your required trading accounts first."}
            </InfoBox>
          ) : status.trading ? (
            <InfoBox type="success">✓ Trading bot is active.</InfoBox>
          ) : (
            <ActionButton
              onClick={toggleTrading}
              loading={busy === "trading"}
              color="green"
            >
              Enable Live Trading
            </ActionButton>
          )}
        </StepCard>

        <div className="text-center">
          <button
            onClick={() => {
              // ✅ Save tier before navigating
              if (tier) localStorage.setItem("IMALI_SELECTED_TIER", tier);
              navigate("/dashboard", { replace: true });
            }}
            className="text-gray-500 hover:text-gray-300 text-sm underline"
          >
            Skip to Dashboard
          </button>
          <p className="text-xs text-gray-600 mt-2">
            You can complete setup later from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
