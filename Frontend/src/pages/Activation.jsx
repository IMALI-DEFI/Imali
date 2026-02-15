// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BotAPI from "../utils/BotAPI";

/* ======================================================
   STATUS STYLES
====================================================== */
const STATUS_STYLES = {
  complete: {
    ring: "border-emerald-500/30 bg-emerald-500/20",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400",
    icon: "✓",
  },
  pending: {
    ring: "border-gray-700 bg-gray-800/50",
    text: "text-gray-400",
    badge: "bg-gray-800 text-gray-400",
    icon: "○",
  },
  active: {
    ring: "border-blue-500/30 bg-blue-500/20",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400",
    icon: "⟳",
  },
  error: {
    ring: "border-red-500/30 bg-red-500/20",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
    icon: "!",
  },
};

function Banner({ type = "info", children }) {
  const map = {
    info: "bg-white/5 border-white/10 text-white/90",
    ok: "bg-emerald-500/10 border-emerald-500/30 text-emerald-100",
    error: "bg-red-500/10 border-red-500/30 text-red-100",
    warn: "bg-yellow-500/10 border-yellow-500/30 text-yellow-100",
  };
  return (
    <div className={`p-4 rounded-xl border ${map[type] || map.info}`}>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label =
    status === "complete" ? "Complete" :
    status === "active" ? "In Progress" :
    status === "error" ? "Needs Attention" : "Pending";

  return (
    <span className={`text-sm px-3 py-1 rounded-full ${s.badge}`}>
      {label}
    </span>
  );
}

function Step({ number, title, description, status, children, right }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div className="relative pl-14 py-4">
      <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gray-800" />

      <div className={`absolute left-0 h-14 w-14 rounded-full border-2 ${s.ring} flex items-center justify-center`}>
        <span className={`${s.text} font-semibold text-lg`}>
          {status === "complete" ? s.icon : number}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white text-lg">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>

          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            {right}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, variant = "primary" }) {
  const base = "px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
      : variant === "emerald"
      ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
      : variant === "danger"
      ? "bg-red-500/20 text-red-200 hover:bg-red-500/30"
      : "bg-gray-700/40 text-gray-100 hover:bg-gray-700/60";

  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-300">{label}</div>
        {hint ? <div className="text-[11px] text-gray-500">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-gray-600 disabled:opacity-60"
    />
  );
}

// FIXED: Password inputs are now inside forms
function PasswordInput({ value, onChange, placeholder, disabled, showPassword, onToggleShow }) {
  return (
    <div className="flex gap-2">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white placeholder:text-gray-600 disabled:opacity-60"
      />
      <ActionButton
        variant="secondary"
        disabled={disabled}
        onClick={onToggleShow}
        type="button"
      >
        {showPassword ? "Hide" : "Show"}
      </ActionButton>
    </div>
  );
}

async function safePaste(setter) {
  try {
    const text = await navigator.clipboard.readText();
    if (text) setter(text);
  } catch {
    // clipboard may be blocked; ignore
  }
}

function Accordion({ title, open, setOpen, right, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition"
      >
        <div className="font-semibold text-white">{title}</div>
        <div className="flex items-center gap-3">
          {right}
          <div className="text-gray-400">{open ? "▾" : "▸"}</div>
        </div>
      </button>
      {open ? <div className="p-4 border-t border-white/10">{children}</div> : null}
    </div>
  );
}

/* ======================================================
   MAIN
====================================================== */
export default function Activation() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(""); // okx_save, alpaca_save, wallet, trading
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(null);

  const [bannerError, setBannerError] = useState("");
  const [bannerOk, setBannerOk] = useState("");

  // Accordion toggles
  const [openOkx, setOpenOkx] = useState(true);
  const [openAlpaca, setOpenAlpaca] = useState(false);
  const [openWallet, setOpenWallet] = useState(false);

  // OKX fields
  const [okxKey, setOkxKey] = useState("");
  const [okxSecret, setOkxSecret] = useState("");
  const [okxPassphrase, setOkxPassphrase] = useState("");
  const [okxShowSecret, setOkxShowSecret] = useState(false);
  const [okxShowPass, setOkxShowPass] = useState(false);
  const [okxMode, setOkxMode] = useState("paper"); // paper or live

  // Alpaca fields
  const [alpacaKey, setAlpacaKey] = useState("");
  const [alpacaSecret, setAlpacaSecret] = useState("");
  const [alpacaShowSecret, setAlpacaShowSecret] = useState(false);
  const [alpacaMode, setAlpacaMode] = useState("paper"); // paper or live

  // Wallet
  const [walletAddress, setWalletAddress] = useState("");

  const tier = useMemo(() => String(user?.tier || "starter").toLowerCase(), [user]);

  // Requirements by tier
  const needsOkx = tier === "starter" || tier === "pro" || tier === "bundle";
  const needsAlpaca = tier === "starter" || tier === "bundle";
  const needsWallet = tier === "elite" || tier === "bundle";

  const billingComplete = !!status?.billing_complete;
  const okxConnected = !!status?.okx_connected;
  const alpacaConnected = !!status?.alpaca_connected;
  const walletConnected = !!status?.wallet_connected;
  const tradingEnabled = !!status?.trading_enabled;
  const activationComplete = !!status?.activation_complete;

  const connectionsComplete = useMemo(() => {
    const ok = needsOkx ? okxConnected : true;
    const al = needsAlpaca ? alpacaConnected : true;
    const wa = needsWallet ? walletConnected : true;
    return ok && al && wa;
  }, [needsOkx, needsAlpaca, needsWallet, okxConnected, alpacaConnected, walletConnected]);

  const canEnableTrading = billingComplete && connectionsComplete;

  const clearBanners = () => {
    setBannerError("");
    setBannerOk("");
  };

  const reload = async () => {
    const me = await BotAPI.me();
    const u = me?.user || me;
    setUser(u);

    const act = await BotAPI.activationStatus();
    const s = act?.status || act || {};
    setStatus(s);

    // Force billing if missing
    if (!s.billing_complete) {
      navigate("/billing", { replace: true });
      return;
    }

    // Auto dashboard if complete
    if (s.activation_complete) {
      navigate("/dashboard", { replace: true });
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        clearBanners();
        await reload();
      } catch {
        if (!mounted) return;
        setBannerError("Unable to load activation. Please log in again.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     HELPERS (validation)
  ========================= */
  const validateOkx = () => {
    if (!okxKey.trim()) return "OKX API Key is required.";
    if (!okxSecret.trim()) return "OKX API Secret is required.";
    if (!okxPassphrase.trim()) return "OKX Passphrase is required.";
    return "";
  };

  const validateAlpaca = () => {
    if (!alpacaKey.trim()) return "Alpaca API Key is required.";
    if (!alpacaSecret.trim()) return "Alpaca API Secret is required.";
    return "";
  };

  const validateWallet = () => {
    const a = walletAddress.trim();
    if (!a) return "Wallet address is required.";
    if (!a.startsWith("0x") || a.length < 42) return "Wallet address looks invalid (should start with 0x and be 42 chars).";
    return "";
  };

  /* =========================
     CONNECT: OKX (FIXED - removed /test endpoint)
  ========================= */
  const saveOkx = async (e) => {
    e.preventDefault(); // Important for form submission
    clearBanners();
    const msg = validateOkx();
    if (msg) return setBannerError(msg);

    try {
      setBusyKey("okx_save");

      const response = await BotAPI.connectOKX({
        apiKey: okxKey.trim(),
        apiSecret: okxSecret.trim(),
        passphrase: okxPassphrase.trim(),
        mode: okxMode,
      });

      if (response?.connected) {
        setBannerOk("✅ OKX connected successfully.");
        // Clear secrets after save
        setOkxKey("");
        setOkxSecret("");
        setOkxPassphrase("");
        await reload();
      } else {
        throw new Error("Connection failed");
      }
    } catch (e) {
      console.error("OKX connection error:", e);
      setBannerError(e?.response?.data?.message || e?.message || "Failed to connect OKX. Please check your API keys.");
    } finally {
      setBusyKey("");
    }
  };

  /* =========================
     CONNECT: ALPACA (FIXED - removed /test endpoint)
  ========================= */
  const saveAlpaca = async (e) => {
    e.preventDefault(); // Important for form submission
    clearBanners();
    const msg = validateAlpaca();
    if (msg) return setBannerError(msg);

    try {
      setBusyKey("alpaca_save");

      const response = await BotAPI.connectAlpaca({
        apiKey: alpacaKey.trim(),
        apiSecret: alpacaSecret.trim(),
        mode: alpacaMode,
      });

      if (response?.connected) {
        setBannerOk("✅ Alpaca connected successfully.");
        setAlpacaKey("");
        setAlpacaSecret("");
        await reload();
      } else {
        throw new Error("Connection failed");
      }
    } catch (e) {
      console.error("Alpaca connection error:", e);
      setBannerError(e?.response?.data?.message || e?.message || "Failed to connect Alpaca. Please check your API keys.");
    } finally {
      setBusyKey("");
    }
  };

  /* =========================
     CONNECT: WALLET
  ========================= */
  const saveWallet = async (e) => {
    e.preventDefault(); // Important for form submission
    clearBanners();
    const msg = validateWallet();
    if (msg) return setBannerError(msg);

    try {
      setBusyKey("wallet");
      const response = await BotAPI.connectWallet({ address: walletAddress.trim() });
      
      if (response?.connected) {
        setBannerOk("✅ Wallet connected successfully.");
        setWalletAddress("");
        await reload();
      } else {
        throw new Error("Connection failed");
      }
    } catch (e) {
      console.error("Wallet connection error:", e);
      setBannerError(e?.response?.data?.message || e?.message || "Failed to connect wallet.");
    } finally {
      setBusyKey("");
    }
  };

  /* =========================
     TRADING
  ========================= */
  const toggleTrading = async () => {
    clearBanners();

    if (!canEnableTrading && !tradingEnabled) {
      setBannerError("Finish your required connections before enabling trading.");
      return;
    }

    try {
      setBusyKey("trading");
      const response = await BotAPI.enableTrading(!tradingEnabled);
      
      if (response?.enabled !== undefined) {
        setBannerOk(!tradingEnabled ? "✅ Trading enabled." : "Trading disabled.");
        await reload();
      } else {
        throw new Error("Failed to update trading");
      }
    } catch (e) {
      console.error("Trading toggle error:", e);
      setBannerError(e?.response?.data?.message || e?.message || "Failed to update trading.");
    } finally {
      setBusyKey("");
    }
  };

  /* =========================
     VIEW STATES
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <div>Loading activation…</div>
        </div>
      </div>
    );
  }

  if (!user || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-red-400 mb-4">Session expired.</div>
          <ActionButton onClick={() => navigate("/login")}>
            Go to Login
          </ActionButton>
        </div>
      </div>
    );
  }

  const step1 = billingComplete ? "complete" : "active";
  const step2 = connectionsComplete ? "complete" : "active";
  const step3 = tradingEnabled ? "complete" : "pending";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {bannerError && <Banner type="error">{bannerError}</Banner>}
        {bannerOk && <Banner type="ok">{bannerOk}</Banner>}

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Activation</h1>
              <p className="text-gray-400 text-sm mt-1">
                You’re on <span className="text-white font-semibold">{tier.toUpperCase()}</span>. Complete the steps below to start.
              </p>
            </div>

            <ActionButton variant="secondary" onClick={reload} disabled={!!busyKey}>
              Refresh
            </ActionButton>
          </div>

          {/* STEP 1: BILLING */}
          <Step
            number={1}
            title="Billing"
            description="Billing must be complete before activation can finish."
            status={step1}
            right={
              !billingComplete ? (
                <ActionButton onClick={() => navigate("/billing")} disabled={!!busyKey}>
                  Go to Billing
                </ActionButton>
              ) : null
            }
          />

          {/* STEP 2: CONNECTIONS */}
          <Step
            number={2}
            title="Connections"
            description="Connect only what your tier requires."
            status={step2}
          >
            <div className="ml-0 mt-3 space-y-4">
              <Banner type="info">
                <div className="font-semibold text-white mb-1">What you need for your tier</div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-white/80">
                  {needsOkx && <li>OKX (API Key + Secret + Passphrase)</li>}
                  {needsAlpaca && <li>Alpaca (API Key + Secret)</li>}
                  {needsWallet && <li>Wallet (address)</li>}
                  {!needsOkx && !needsAlpaca && !needsWallet && <li>No connections required.</li>}
                </ul>
              </Banner>

              {/* OKX ACCORDION - FIXED: Now with form */}
              {needsOkx && (
                <Accordion
                  title="Connect OKX"
                  open={openOkx}
                  setOpen={setOpenOkx}
                  right={
                    <span className={`text-xs ${okxConnected ? "text-emerald-300" : "text-gray-400"}`}>
                      {okxConnected ? "Connected" : "Not connected"}
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <Banner type="info">
                      <div className="font-semibold mb-1">Where do I find OKX API keys?</div>
                      <div className="text-sm text-white/80">
                        OKX → Profile → API → Create API Key. Enable trading permissions.
                      </div>
                    </Banner>

                    {!okxConnected ? (
                      <form onSubmit={saveOkx} className="space-y-4">
                        {/* Mode selection */}
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="okxMode"
                              value="paper"
                              checked={okxMode === "paper"}
                              onChange={(e) => setOkxMode(e.target.value)}
                              className="text-emerald-500"
                            />
                            <span>Paper Trading (Demo)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="okxMode"
                              value="live"
                              checked={okxMode === "live"}
                              onChange={(e) => setOkxMode(e.target.value)}
                              className="text-emerald-500"
                            />
                            <span>Live Trading</span>
                          </label>
                        </div>

                        <FieldRow label="OKX API Key" hint="Paste from OKX dashboard">
                          <div className="flex gap-2">
                            <TextInput
                              value={okxKey}
                              onChange={setOkxKey}
                              placeholder="OKX API Key"
                              disabled={busyKey === "okx_save"}
                            />
                            <ActionButton
                              variant="secondary"
                              disabled={busyKey === "okx_save"}
                              onClick={() => safePaste(setOkxKey)}
                              type="button"
                            >
                              Paste
                            </ActionButton>
                          </div>
                        </FieldRow>

                        <FieldRow label="OKX API Secret" hint="Keep this private">
                          <PasswordInput
                            value={okxSecret}
                            onChange={setOkxSecret}
                            placeholder="OKX Secret"
                            disabled={busyKey === "okx_save"}
                            showPassword={okxShowSecret}
                            onToggleShow={() => setOkxShowSecret(!okxShowSecret)}
                          />
                          <div className="mt-2">
                            <ActionButton
                              variant="secondary"
                              disabled={busyKey === "okx_save"}
                              onClick={() => safePaste(setOkxSecret)}
                              type="button"
                            >
                              Paste Secret
                            </ActionButton>
                          </div>
                        </FieldRow>

                        <FieldRow label="OKX Passphrase" hint="The passphrase you created">
                          <PasswordInput
                            value={okxPassphrase}
                            onChange={setOkxPassphrase}
                            placeholder="OKX Passphrase"
                            disabled={busyKey === "okx_save"}
                            showPassword={okxShowPass}
                            onToggleShow={() => setOkxShowPass(!okxShowPass)}
                          />
                        </FieldRow>

                        <div className="flex gap-2">
                          <ActionButton
                            variant="emerald"
                            type="submit"
                            disabled={busyKey !== "" || !okxKey || !okxSecret || !okxPassphrase}
                          >
                            {busyKey === "okx_save" ? "Connecting…" : "Connect OKX"}
                          </ActionButton>
                        </div>
                      </form>
                    ) : (
                      <Banner type="ok">
                        <div className="flex items-center justify-between">
                          <span>OKX is connected in {status?.okx_mode || "paper"} mode.</span>
                          <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">
                            {status?.okx_mode || "paper"}
                          </span>
                        </div>
                      </Banner>
                    )}
                  </div>
                </Accordion>
              )}

              {/* ALPACA ACCORDION - FIXED: Now with form */}
              {needsAlpaca && (
                <Accordion
                  title="Connect Alpaca"
                  open={openAlpaca}
                  setOpen={setOpenAlpaca}
                  right={
                    <span className={`text-xs ${alpacaConnected ? "text-emerald-300" : "text-gray-400"}`}>
                      {alpacaConnected ? "Connected" : "Not connected"}
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <Banner type="info">
                      <div className="font-semibold mb-1">Where do I find Alpaca keys?</div>
                      <div className="text-sm text-white/80">
                        Alpaca Dashboard → API Keys. Copy your Key ID and Secret Key.
                      </div>
                    </Banner>

                    {!alpacaConnected ? (
                      <form onSubmit={saveAlpaca} className="space-y-4">
                        {/* Mode selection */}
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="alpacaMode"
                              value="paper"
                              checked={alpacaMode === "paper"}
                              onChange={(e) => setAlpacaMode(e.target.value)}
                              className="text-emerald-500"
                            />
                            <span>Paper Trading</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="alpacaMode"
                              value="live"
                              checked={alpacaMode === "live"}
                              onChange={(e) => setAlpacaMode(e.target.value)}
                              className="text-emerald-500"
                            />
                            <span>Live Trading</span>
                          </label>
                        </div>

                        <FieldRow label="Alpaca API Key" hint="Key ID">
                          <div className="flex gap-2">
                            <TextInput
                              value={alpacaKey}
                              onChange={setAlpacaKey}
                              placeholder="Alpaca API Key"
                              disabled={busyKey === "alpaca_save"}
                            />
                            <ActionButton
                              variant="secondary"
                              disabled={busyKey === "alpaca_save"}
                              onClick={() => safePaste(setAlpacaKey)}
                              type="button"
                            >
                              Paste
                            </ActionButton>
                          </div>
                        </FieldRow>

                        <FieldRow label="Alpaca API Secret" hint="Keep this private">
                          <PasswordInput
                            value={alpacaSecret}
                            onChange={setAlpacaSecret}
                            placeholder="Alpaca Secret"
                            disabled={busyKey === "alpaca_save"}
                            showPassword={alpacaShowSecret}
                            onToggleShow={() => setAlpacaShowSecret(!alpacaShowSecret)}
                          />
                          <div className="mt-2">
                            <ActionButton
                              variant="secondary"
                              disabled={busyKey === "alpaca_save"}
                              onClick={() => safePaste(setAlpacaSecret)}
                              type="button"
                            >
                              Paste Secret
                            </ActionButton>
                          </div>
                        </FieldRow>

                        <div className="flex gap-2">
                          <ActionButton
                            variant="emerald"
                            type="submit"
                            disabled={busyKey !== "" || !alpacaKey || !alpacaSecret}
                          >
                            {busyKey === "alpaca_save" ? "Connecting…" : "Connect Alpaca"}
                          </ActionButton>
                        </div>
                      </form>
                    ) : (
                      <Banner type="ok">
                        <div className="flex items-center justify-between">
                          <span>Alpaca is connected in {status?.alpaca_mode || "paper"} mode.</span>
                          <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">
                            {status?.alpaca_mode || "paper"}
                          </span>
                        </div>
                      </Banner>
                    )}
                  </div>
                </Accordion>
              )}

              {/* WALLET ACCORDION - FIXED: Now with form */}
              {needsWallet && (
                <Accordion
                  title="Connect Wallet"
                  open={openWallet}
                  setOpen={setOpenWallet}
                  right={
                    <span className={`text-xs ${walletConnected ? "text-emerald-300" : "text-gray-400"}`}>
                      {walletConnected ? "Connected" : "Not connected"}
                    </span>
                  }
                >
                  <div className="space-y-3">
                    {!walletConnected ? (
                      <form onSubmit={saveWallet} className="space-y-3">
                        <Banner type="info">
                          <div className="font-semibold mb-1">Wallet connection</div>
                          <div className="text-sm text-white/80">
                            Paste your wallet address (0x...).
                          </div>
                        </Banner>

                        <div className="flex gap-2">
                          <TextInput
                            value={walletAddress}
                            onChange={setWalletAddress}
                            placeholder="0x..."
                            disabled={busyKey === "wallet"}
                          />
                          <ActionButton
                            variant="secondary"
                            disabled={busyKey === "wallet"}
                            onClick={() => safePaste(setWalletAddress)}
                            type="button"
                          >
                            Paste
                          </ActionButton>
                        </div>

                        <ActionButton
                          variant="emerald"
                          type="submit"
                          disabled={busyKey !== "" || !walletAddress}
                        >
                          {busyKey === "wallet" ? "Connecting…" : "Connect Wallet"}
                        </ActionButton>
                      </form>
                    ) : (
                      <Banner type="ok">Wallet is already connected.</Banner>
                    )}
                  </div>
                </Accordion>
              )}
            </div>
          </Step>

          {/* STEP 3: TRADING */}
          <Step
            number={3}
            title="Enable Trading"
            description={
              canEnableTrading
                ? "You’re ready. Enable trading when you’re comfortable."
                : "Finish billing + required connections first."
            }
            status={step3}
            right={
              <ActionButton
                variant={tradingEnabled ? "secondary" : "emerald"}
                onClick={toggleTrading}
                disabled={busyKey !== "" || (!canEnableTrading && !tradingEnabled)}
              >
                {busyKey === "trading" ? "Updating…" : tradingEnabled ? "Disable" : "Enable"}
              </ActionButton>
            }
          />

          {/* Final message */}
          <div className="ml-14 pt-2">
            {activationComplete ? (
              <div className="text-emerald-300 text-sm flex items-center gap-2">
                <span>✓</span>
                <span>Activation complete — sending you to your dashboard…</span>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                Finish the required connections above and you’ll unlock the dashboard.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
