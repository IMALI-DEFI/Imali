// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

/* ======================================================
   SIMPLE STATUS HELPERS
====================================================== */

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

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
  />
);

const Button = ({ children, variant = "primary", ...props }) => {
  const base =
    "px-4 py-2 rounded-lg font-medium transition disabled:opacity-50";

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

/* ======================================================
   MAIN
====================================================== */

export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [okx, setOkx] = useState({ key: "", secret: "", passphrase: "", mode: "paper" });
  const [alpaca, setAlpaca] = useState({ key: "", secret: "", mode: "paper" });
  const [wallet, setWallet] = useState("");

  const tier = useMemo(() => user?.tier?.toLowerCase() || "starter", [user]);

  const needsOkx = ["starter", "pro", "bundle"].includes(tier);
  const needsAlpaca = ["starter", "bundle"].includes(tier);
  const needsWallet = ["elite", "bundle"].includes(tier);

  const billingComplete = !!status?.billing_complete;
  const okxConnected = !!status?.okx_connected;
  const alpacaConnected = !!status?.alpaca_connected;
  const walletConnected = !!status?.wallet_connected;
  const tradingEnabled = !!status?.trading_enabled;

  const connectionsComplete =
    (!needsOkx || okxConnected) &&
    (!needsAlpaca || alpacaConnected) &&
    (!needsWallet || walletConnected);

  const canEnableTrading = billingComplete && connectionsComplete;

  // ✅ NEW: Activation Complete Logic
  const activationComplete =
    billingComplete &&
    connectionsComplete &&
    tradingEnabled;

  /* ======================================================
     LOAD DATA
  ====================================================== */

  const load = async () => {
    try {
      const me = await BotAPI.me();
      const activation = await BotAPI.activationStatus();

      setUser(me?.user || me);
      setStatus(activation?.status || activation);
    } catch (e) {
      setError("Session expired. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ NEW: Auto Redirect When Activation Complete
  useEffect(() => {
    if (activationComplete) {
      const timer = setTimeout(() => {
        navigate("/memberdashboard", { replace: true });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [activationComplete, navigate]);

  /* ======================================================
     CONNECT FUNCTIONS
  ====================================================== */

  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    try {
      await BotAPI.connectOKX({
        api_key: okx.key,
        api_secret: okx.secret,
        passphrase: okx.passphrase,
        mode: okx.mode,
      });

      setSuccess("OKX connected.");
      setOkx({ key: "", secret: "", passphrase: "", mode: "paper" });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "OKX connection failed.");
    } finally {
      setBusy("");
    }
  };

  const connectAlpaca = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("alpaca");

    try {
      await BotAPI.connectAlpaca({
        api_key: alpaca.key,
        api_secret: alpaca.secret,
        mode: alpaca.mode,
      });

      setSuccess("Alpaca connected.");
      setAlpaca({ key: "", secret: "", mode: "paper" });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Alpaca connection failed.");
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("wallet");

    try {
      await BotAPI.connectWallet({ address: wallet });
      setSuccess("Wallet connected.");
      setWallet("");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Wallet connection failed.");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    try {
      await BotAPI.toggleTrading(!tradingEnabled);
      setSuccess(tradingEnabled ? "Trading disabled." : "Trading enabled.");
      await load();
    } catch (e) {
      setError("Failed to update trading.");
    } finally {
      setBusy("");
    }
  };

  /* ======================================================
     UI STATES
  ====================================================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading activation…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {error && <div className="bg-red-500/20 p-3 rounded">{error}</div>}
        {success && <div className="bg-emerald-500/20 p-3 rounded">{success}</div>}

        <h1 className="text-2xl font-bold">
          Activation ({tier.toUpperCase()})
        </h1>

        <Section
          title="1. Billing"
          description="Billing must be complete."
          right={<StatusPill value={billingComplete} />}
        >
          {!billingComplete && (
            <Button onClick={() => navigate("/billing")}>
              Go to Billing
            </Button>
          )}
        </Section>

        <Section
          title="2. Connections"
          description="Connect required services."
          right={<StatusPill value={connectionsComplete} />}
        >

          {needsOkx && !okxConnected && (
            <form onSubmit={connectOKX} className="space-y-3">
              <h3 className="font-semibold">OKX</h3>
              <Input placeholder="API Key"
                value={okx.key}
                onChange={(e) => setOkx({ ...okx, key: e.target.value })} />
              <Input placeholder="Secret" type="password"
                value={okx.secret}
                onChange={(e) => setOkx({ ...okx, secret: e.target.value })} />
              <Input placeholder="Passphrase" type="password"
                value={okx.passphrase}
                onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })} />
              <Button type="submit" disabled={busy === "okx"}>
                Connect OKX
              </Button>
            </form>
          )}

          {needsAlpaca && !alpacaConnected && (
            <form onSubmit={connectAlpaca} className="space-y-3">
              <h3 className="font-semibold">Alpaca</h3>
              <Input placeholder="API Key"
                value={alpaca.key}
                onChange={(e) => setAlpaca({ ...alpaca, key: e.target.value })} />
              <Input placeholder="Secret" type="password"
                value={alpaca.secret}
                onChange={(e) => setAlpaca({ ...alpaca, secret: e.target.value })} />
              <Button type="submit" disabled={busy === "alpaca"}>
                Connect Alpaca
              </Button>
            </form>
          )}

          {needsWallet && !walletConnected && (
            <form onSubmit={connectWallet} className="space-y-3">
              <h3 className="font-semibold">Wallet</h3>
              <Input
                placeholder="0x..."
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              />
              <Button type="submit" disabled={busy === "wallet"}>
                Connect Wallet
              </Button>
            </form>
          )}
        </Section>

        <Section
          title="3. Enable Trading"
          description="Turn trading on when ready."
          right={<StatusPill value={tradingEnabled} />}
        >
          <Button
            variant="success"
            disabled={!canEnableTrading || busy === "trading"}
            onClick={toggleTrading}
          >
            {tradingEnabled ? "Disable Trading" : "Enable Trading"}
          </Button>
        </Section>

      </div>
    </div>
  );
}
