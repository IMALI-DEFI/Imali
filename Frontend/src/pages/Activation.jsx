// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BotAPI from "../utils/BotAPI";

const statusLabel = (value) => (value ? "Complete" : "Pending");

const StatusPill = ({ value }) => (
  <span
    className={`px-3 py-1 rounded-full text-sm ${
      value
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-gray-800 text-gray-400"
    }`}
  >
    {statusLabel(value)}
  </span>
);

const Section = ({ title, description, right, children }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
    <div className="flex justify-between items-start gap-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Input = ({ type = "text", autoComplete, ...props }) => (
  <input
    {...props}
    type={type}
    autoComplete={autoComplete || "off"}
    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-gray-500"
  />
);

const Button = ({ children, variant = "primary", ...props }) => {
  const base =
    "px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

  const style =
    variant === "primary"
      ? "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
      : variant === "success"
      ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
      : "bg-gray-700/40 text-gray-200 hover:bg-gray-700/60";

  return (
    <button {...props} className={`${base} ${style}`}>
      {children}
    </button>
  );
};

export default function Activation() {
  const navigate = useNavigate();
  const { user, activation, refreshUser } = useAuth();
  
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [okx, setOkx] = useState({
    apiKey: "",
    apiSecret: "",
    passphrase: "",
    mode: "paper",
  });

  const [alpaca, setAlpaca] = useState({
    apiKey: "",
    apiSecret: "",
    mode: "paper",
  });

  const [wallet, setWallet] = useState("");

  const tier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user]);

  const needsOkx = ["starter", "pro", "bundle"].includes(tier);
  const needsAlpaca = ["starter", "bundle"].includes(tier);
  const needsWallet = ["elite", "bundle"].includes(tier);

  const billingComplete = !!activation?.billing_complete;
  const okxConnected = !!activation?.okx_connected;
  const alpacaConnected = !!activation?.alpaca_connected;
  const walletConnected = !!activation?.wallet_connected;
  const tradingEnabled = !!activation?.trading_enabled;

  const connectionsComplete =
    (!needsOkx || okxConnected) &&
    (!needsAlpaca || alpacaConnected) &&
    (!needsWallet || walletConnected);

  const canEnableTrading = billingComplete && connectionsComplete;

  // Redirect if fully activated
  useEffect(() => {
    if (billingComplete && connectionsComplete && tradingEnabled) {
      navigate("/dashboard", { replace: true });
    }
  }, [billingComplete, connectionsComplete, tradingEnabled, navigate]);

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
        mode: okx.mode,
      });

      setSuccess("✅ OKX connected.");
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", mode: "paper" });
      await refreshUser();
    } catch (err) {
      console.error("OKX connection error:", err);
      setError(err?.response?.data?.message || "OKX connection failed.");
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
        mode: alpaca.mode,
      });

      setSuccess("✅ Alpaca connected.");
      setAlpaca({ apiKey: "", apiSecret: "", mode: "paper" });
      await refreshUser();
    } catch (err) {
      console.error("Alpaca connection error:", err);
      setError(err?.response?.data?.message || "Alpaca connection failed.");
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
      setError("Wallet address is required.");
      setBusy("");
      return;
    }
    if (!addr.startsWith("0x") || addr.length !== 42) {
      setError("Wallet address must be 42 characters and start with 0x.");
      setBusy("");
      return;
    }

    try {
      await BotAPI.connectWallet({
        wallet: addr,
        address: addr,
      });

      setSuccess("✅ Wallet connected.");
      setWallet("");
      await refreshUser();
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err?.response?.data?.message || "Wallet connection failed.");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !tradingEnabled) {
      setError("Finish billing + required connections first.");
      setBusy("");
      return;
    }

    try {
      await BotAPI.toggleTrading(!tradingEnabled);
      setSuccess(tradingEnabled ? "Trading turned off." : "✅ Trading turned on.");
      await refreshUser();
    } catch (err) {
      console.error("Trading toggle error:", err);
      setError(err?.response?.data?.message || "Couldn't update trading.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-lg text-red-200">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-lg text-emerald-200">
            ✅ {success}
          </div>
        )}

        <div className="flex justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Activation</h1>
            <p className="text-sm text-gray-400">
              Complete the steps below to start trading.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Tier:</span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        <Section
          title="1) Billing"
          description="Add a payment method to unlock activation."
          right={<StatusPill value={billingComplete} />}
        >
          {!billingComplete ? (
            <Button onClick={() => navigate("/billing")}>Add Payment Method</Button>
          ) : (
            <div className="text-sm text-emerald-200">✅ Billing is set.</div>
          )}
        </Section>

        <Section
          title="2) Connections"
          description="Connect what your tier needs."
          right={<StatusPill value={connectionsComplete} />}
        >
          <div className="space-y-6">
            {needsOkx && !okxConnected && (
              <form onSubmit={connectOKX} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-blue-300">OKX Exchange</h3>
                <div className="grid gap-3">
                  <Input
                    placeholder="API Key"
                    value={okx.apiKey}
                    onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                    disabled={busy === "okx"}
                  />
                  <Input
                    placeholder="API Secret"
                    type="password"
                    value={okx.apiSecret}
                    onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                    disabled={busy === "okx"}
                  />
                  <Input
                    placeholder="Passphrase"
                    type="password"
                    value={okx.passphrase}
                    onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                    disabled={busy === "okx"}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="okxMode"
                        value="paper"
                        checked={okx.mode === "paper"}
                        onChange={(e) => setOkx({ ...okx, mode: e.target.value })}
                        className="text-emerald-500"
                      />
                      <span className="text-sm">Paper</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="okxMode"
                        value="live"
                        checked={okx.mode === "live"}
                        onChange={(e) => setOkx({ ...okx, mode: e.target.value })}
                        className="text-emerald-500"
                      />
                      <span className="text-sm">Live</span>
                    </label>
                  </div>
                  <Button type="submit" disabled={busy === "okx"} variant="success">
                    {busy === "okx" ? "Connecting..." : "Connect OKX"}
                  </Button>
                </div>
              </form>
            )}

            {needsAlpaca && !alpacaConnected && (
              <form onSubmit={connectAlpaca} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-emerald-300">Alpaca</h3>
                <div className="grid gap-3">
                  <Input
                    placeholder="API Key"
                    value={alpaca.apiKey}
                    onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                    disabled={busy === "alpaca"}
                  />
                  <Input
                    placeholder="Secret Key"
                    type="password"
                    value={alpaca.apiSecret}
                    onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                    disabled={busy === "alpaca"}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alpacaMode"
                        value="paper"
                        checked={alpaca.mode === "paper"}
                        onChange={(e) => setAlpaca({ ...alpaca, mode: e.target.value })}
                        className="text-emerald-500"
                      />
                      <span className="text-sm">Paper</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="alpacaMode"
                        value="live"
                        checked={alpaca.mode === "live"}
                        onChange={(e) => setAlpaca({ ...alpaca, mode: e.target.value })}
                        className="text-emerald-500"
                      />
                      <span className="text-sm">Live</span>
                    </label>
                  </div>
                  <Button type="submit" disabled={busy === "alpaca"} variant="success">
                    {busy === "alpaca" ? "Connecting..." : "Connect Alpaca"}
                  </Button>
                </div>
              </form>
            )}

            {needsWallet && !walletConnected && (
              <form onSubmit={connectWallet} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-purple-300">Wallet</h3>
                <div className="grid gap-3">
                  <Input
                    placeholder="0x..."
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    disabled={busy === "wallet"}
                  />
                  <Button type="submit" disabled={busy === "wallet"} variant="success">
                    {busy === "wallet" ? "Connecting..." : "Connect Wallet"}
                  </Button>
                </div>
              </form>
            )}

            {needsOkx && okxConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ OKX connected ({activation?.okx_mode || "paper"} mode)
              </div>
            )}

            {needsAlpaca && alpacaConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ Alpaca connected ({activation?.alpaca_mode || "paper"} mode)
              </div>
            )}

            {needsWallet && walletConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ Wallet connected
              </div>
            )}
          </div>
        </Section>

        <Section
          title="3) Enable Trading"
          description="When you're ready, turn trading on."
          right={<StatusPill value={tradingEnabled} />}
        >
          <div className="space-y-3">
            {!canEnableTrading && !tradingEnabled && (
              <p className="text-sm text-yellow-500/80">
                ⚠️ Finish billing + required connections first.
              </p>
            )}

            <Button
              variant="success"
              disabled={((!canEnableTrading && !tradingEnabled) || busy === "trading")}
              onClick={toggleTrading}
            >
              {busy === "trading"
                ? "Updating..."
                : tradingEnabled
                ? "Disable Trading"
                : "Enable Trading"}
            </Button>
          </div>
        </Section>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
