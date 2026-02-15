// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

/* ======================================================
   SIMPLE STATUS HELPERS
====================================================== */

const statusLabel = (value) => {
  if (value) return "Complete";
  return "Pending";
};

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

// FIXED: Added autocomplete attributes
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

  // Form fields
  const [okx, setOkx] = useState({ 
    apiKey: "", 
    apiSecret: "", 
    passphrase: "", 
    mode: "paper" 
  });
  
  const [alpaca, setAlpaca] = useState({ 
    apiKey: "", 
    apiSecret: "", 
    mode: "paper" 
  });
  
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

  /* ======================================================
     LOAD DATA
  ====================================================== */

  const load = async () => {
    try {
      setError("");
      
      const me = await BotAPI.me();
      const activation = await BotAPI.activationStatus();

      setUser(me?.user || me);
      setStatus(activation?.status || activation);
    } catch (e) {
      console.error("Load error:", e);
      if (e.response?.status === 401) {
        setError("Session expired. Please login again.");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError("Failed to load activation data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ======================================================
     CONNECT FUNCTIONS
  ====================================================== */

  const connectOKX = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("okx");

    // Validate
    if (!okx.apiKey || !okx.apiSecret || !okx.passphrase) {
      setError("All OKX fields are required.");
      setBusy("");
      return;
    }

    try {
      // FIXED: Using correct API endpoint with proper parameter names
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"}/api/integrations/okx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({
          api_key: okx.apiKey.trim(),
          api_secret: okx.apiSecret.trim(),
          passphrase: okx.passphrase.trim(),
          mode: okx.mode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setSuccess("✅ OKX connected successfully.");
      setOkx({ apiKey: "", apiSecret: "", passphrase: "", mode: "paper" });
      await load();
    } catch (e) {
      console.error("OKX connection error:", e);
      setError(e.message || "OKX connection failed. Please check your API keys.");
    } finally {
      setBusy("");
    }
  };

  const connectAlpaca = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("alpaca");

    // Validate
    if (!alpaca.apiKey || !alpaca.apiSecret) {
      setError("Both Alpaca API Key and Secret are required.");
      setBusy("");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"}/api/integrations/alpaca`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({
          api_key: alpaca.apiKey.trim(),
          api_secret: alpaca.apiSecret.trim(),
          mode: alpaca.mode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setSuccess("✅ Alpaca connected successfully.");
      setAlpaca({ apiKey: "", apiSecret: "", mode: "paper" });
      await load();
    } catch (e) {
      console.error("Alpaca connection error:", e);
      setError(e.message || "Alpaca connection failed. Please check your API keys.");
    } finally {
      setBusy("");
    }
  };

  const connectWallet = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy("wallet");

    // Validate
    if (!wallet.trim()) {
      setError("Wallet address is required.");
      setBusy("");
      return;
    }

    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      setError("Invalid wallet address. Must be 42 characters starting with 0x.");
      setBusy("");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"}/api/integrations/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({
          wallet: wallet.trim(),
          address: wallet.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setSuccess("✅ Wallet connected successfully.");
      setWallet("");
      await load();
    } catch (e) {
      console.error("Wallet connection error:", e);
      setError(e.message || "Wallet connection failed.");
    } finally {
      setBusy("");
    }
  };

  const toggleTrading = async () => {
    setError("");
    setSuccess("");
    setBusy("trading");

    if (!canEnableTrading && !tradingEnabled) {
      setError("Complete billing and connections first.");
      setBusy("");
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"}/api/trading/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BotAPI.getToken()}`
        },
        body: JSON.stringify({ enabled: !tradingEnabled })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      setSuccess(tradingEnabled ? "Trading disabled." : "✅ Trading enabled.");
      await load();
    } catch (e) {
      console.error("Trading toggle error:", e);
      setError("Failed to update trading. Please try again.");
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Messages */}
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

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Activation</h1>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Tier:</span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* BILLING */}
        <Section
          title="1. Billing"
          description="Payment method must be on file."
          right={<StatusPill value={billingComplete} />}
        >
          {!billingComplete && (
            <Button onClick={() => navigate("/billing")}>
              Add Payment Method
            </Button>
          )}
        </Section>

        {/* CONNECTIONS */}
        <Section
          title="2. Connections"
          description="Connect required services for your tier."
          right={<StatusPill value={connectionsComplete} />}
        >
          <div className="space-y-6">
            {/* OKX */}
            {needsOkx && !okxConnected && (
              <form onSubmit={connectOKX} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-blue-300">OKX Exchange</h3>
                
                <div className="grid gap-3">
                  <Input 
                    placeholder="API Key"
                    value={okx.apiKey}
                    onChange={(e) => setOkx({ ...okx, apiKey: e.target.value })}
                    disabled={busy === "okx"}
                    autoComplete="off"
                  />
                  
                  <Input 
                    placeholder="API Secret"
                    type="password"
                    value={okx.apiSecret}
                    onChange={(e) => setOkx({ ...okx, apiSecret: e.target.value })}
                    disabled={busy === "okx"}
                    autoComplete="new-password"
                  />
                  
                  <Input 
                    placeholder="Passphrase"
                    type="password"
                    value={okx.passphrase}
                    onChange={(e) => setOkx({ ...okx, passphrase: e.target.value })}
                    disabled={busy === "okx"}
                    autoComplete="new-password"
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
                      <span className="text-sm">Paper Trading</span>
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
                      <span className="text-sm">Live Trading</span>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={busy === "okx" || !okx.apiKey || !okx.apiSecret || !okx.passphrase}
                    variant="success"
                  >
                    {busy === "okx" ? "Connecting..." : "Connect OKX"}
                  </Button>
                </div>
              </form>
            )}

            {/* Alpaca */}
            {needsAlpaca && !alpacaConnected && (
              <form onSubmit={connectAlpaca} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-emerald-300">Alpaca</h3>
                
                <div className="grid gap-3">
                  <Input 
                    placeholder="API Key"
                    value={alpaca.apiKey}
                    onChange={(e) => setAlpaca({ ...alpaca, apiKey: e.target.value })}
                    disabled={busy === "alpaca"}
                    autoComplete="off"
                  />
                  
                  <Input 
                    placeholder="Secret Key"
                    type="password"
                    value={alpaca.apiSecret}
                    onChange={(e) => setAlpaca({ ...alpaca, apiSecret: e.target.value })}
                    disabled={busy === "alpaca"}
                    autoComplete="new-password"
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
                      <span className="text-sm">Paper Trading</span>
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
                      <span className="text-sm">Live Trading</span>
                    </label>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={busy === "alpaca" || !alpaca.apiKey || !alpaca.apiSecret}
                    variant="success"
                  >
                    {busy === "alpaca" ? "Connecting..." : "Connect Alpaca"}
                  </Button>
                </div>
              </form>
            )}

            {/* Wallet */}
            {needsWallet && !walletConnected && (
              <form onSubmit={connectWallet} className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-purple-300">Wallet</h3>
                
                <div className="grid gap-3">
                  <Input
                    placeholder="0x..."
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    disabled={busy === "wallet"}
                    autoComplete="off"
                  />

                  <Button 
                    type="submit" 
                    disabled={busy === "wallet" || !wallet}
                    variant="success"
                  >
                    {busy === "wallet" ? "Connecting..." : "Connect Wallet"}
                  </Button>
                </div>
              </form>
            )}

            {/* Already Connected Message */}
            {needsOkx && okxConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ OKX connected in {status?.okx_mode || "paper"} mode
              </div>
            )}

            {needsAlpaca && alpacaConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ Alpaca connected in {status?.alpaca_mode || "paper"} mode
              </div>
            )}

            {needsWallet && walletConnected && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                ✅ Wallet connected
              </div>
            )}
          </div>
        </Section>

        {/* TRADING */}
        <Section
          title="3. Enable Trading"
          description="Turn trading on when all connections are complete."
          right={<StatusPill value={tradingEnabled} />}
        >
          <div className="space-y-3">
            {!canEnableTrading && !tradingEnabled && (
              <p className="text-sm text-yellow-500/80">
                ⚠️ Complete billing and required connections first
              </p>
            )}
            
            <Button
              variant="success"
              disabled={!canEnableTrading && !tradingEnabled || busy === "trading"}
              onClick={toggleTrading}
            >
              {busy === "trading" ? "Updating..." : 
               tradingEnabled ? "Disable Trading" : "Enable Trading"}
            </Button>
          </div>
        </Section>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
