// src/pages/Activation.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

/**
 * IMPORTANT:
 * - Your NGINX is routing /api/* → FastAPI/Flask upstream (127.0.0.1:8001)
 * - So the frontend should call `${API_BASE}/api/...` (NOT `${API_BASE}/me`)
 * - This file is written to be resilient if WalletProvider is missing (no hard crash).
 */

const RAW_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8001";

const API_BASE = String(RAW_BASE || "").replace(/\/+$/, ""); // trim trailing slash
const apiUrl = (path) => {
  const p = String(path || "");
  if (!p) return API_BASE;
  return `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
};

export default function Activation() {
  // ✅ Guard: prevents "Cannot destructure property 'connect' ... as it is undefined."
  const wallet = typeof useWallet === "function" ? useWallet() : null;

  const connect = wallet?.connect;
  const disconnect = wallet?.disconnect;
  const address = wallet?.address;
  const chainId = wallet?.chainId;

  const walletReady = !!wallet && typeof connect === "function";

  const [tab, setTab] = useState("overview"); // overview | stocks | cex | dex

  // Server truth
  const [me, setMe] = useState(null); // { email, tier, is_active, entitlements, execution_mode }
  const [meErr, setMeErr] = useState("");
  const [meLoading, setMeLoading] = useState(true);

  // Execution mode
  const [execMode, setExecMode] = useState("manual"); // manual | auto
  const [execSaving, setExecSaving] = useState(false);
  const [execMsg, setExecMsg] = useState("");

  // --- STOCKS (Broker) ---
  const [stockBroker, setStockBroker] = useState("paper"); // paper | alpaca | tradier | ibkr
  const [sApiKey, setSApiKey] = useState("");
  const [sApiSecret, setSApiSecret] = useState("");
  const [sPassphrase, setSPassphrase] = useState("");
  const [sSaving, setSSaving] = useState(false);
  const [sErr, setSErr] = useState("");
  const [sOk, setSOk] = useState("");

  // Stock universe settings
  const [mode, setMode] = useState("fixed"); // fixed | auto
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);
  const [minPrice, setMinPrice] = useState(5);
  const [minDollarVol, setMinDollarVol] = useState(5_000_000);
  const [blacklist, setBlacklist] = useState("OTC");
  const [uSaving, setUSaving] = useState(false);
  const [uMsg, setUMsg] = useState("");

  // --- CEX (OKX) ---
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [subaccount, setSubaccount] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cErr, setCErr] = useState("");
  const [cOk, setCOk] = useState("");

  // --- DEX Wallet save ---
  const [wSaving, setWSaving] = useState(false);
  const [wErr, setWErr] = useState("");
  const [wOk, setWOk] = useState("");

  // axios defaults (helps debugging + avoids hanging requests)
  const AX = useMemo(() => {
    const inst = axios.create({
      withCredentials: true,
      timeout: 20_000,
      headers: { "Content-Type": "application/json" },
    });
    return inst;
  }, []);

  // Fetch /api/me as source of truth
  const loadMe = async () => {
    setMeLoading(true);
    setMeErr("");

    try {
      const { data } = await AX.get(apiUrl("/api/me"));
      setMe(data || null);
      if (data?.execution_mode) setExecMode(data.execution_mode);
    } catch (e) {
      setMeErr(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load account."
      );
    } finally {
      setMeLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierLabel = useMemo(() => {
    const t = String(me?.tier || "").toLowerCase();
    if (!t) return "UNKNOWN";
    return t.toUpperCase();
  }, [me?.tier]);

  // Prefill stock universe settings (optional)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await AX.get(apiUrl("/api/activation/stock-setup"));
        if (!mounted || !data) return;

        if (data.mode) setMode(data.mode);
        if (Array.isArray(data.symbols)) setSymbols(data.symbols.join(","));
        if (Number.isFinite(Number(data.autoCount))) setAutoCount(Number(data.autoCount));
        if (Number.isFinite(Number(data.minPrice))) setMinPrice(Number(data.minPrice));
        if (Number.isFinite(Number(data.minDollarVol))) setMinDollarVol(Number(data.minDollarVol));
        if (Array.isArray(data.blacklist)) setBlacklist(data.blacklist.join(","));
      } catch {
        // ignore (endpoint optional)
      }
    })();

    return () => {
      mounted = false;
    };
  }, [AX]);

  // Save execution mode (manual vs auto)
  const saveExecutionMode = async () => {
    setExecSaving(true);
    setExecMsg("");

    try {
      await AX.post(apiUrl("/api/me/execution-mode"), { execution_mode: execMode });
      setExecMsg("Saved ✓");
      setTimeout(() => setExecMsg(""), 1500);
      await loadMe();
    } catch (e) {
      setExecMsg(
        e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Save failed"
      );
    } finally {
      setExecSaving(false);
    }
  };

  // Emergency stop (you implement endpoint)
  const stopAllTrading = async () => {
    if (!window.confirm("Stop all trading now?")) return;

    try {
      await AX.post(apiUrl("/api/me/trading/stop"), {});
      alert("Trading stopped.");
    } catch (e) {
      alert(e?.response?.data?.detail || e?.response?.data?.error || "Stop failed");
    }
  };

  // Stocks connect/test
  const connectStock = async (e) => {
    e.preventDefault();
    setSSaving(true);
    setSErr("");
    setSOk("");

    try {
      if (stockBroker === "paper") {
        await AX.post(apiUrl("/api/broker/connect"), { broker: "paper" });
        setSOk("Paper mode saved for Stocks.");
      } else {
        if (!sApiKey.trim() || !sApiSecret.trim()) throw new Error("API Key & Secret required.");

        await AX.post(apiUrl("/api/broker/connect"), {
          broker: stockBroker,
          api_key: sApiKey.trim(),
          api_secret: sApiSecret.trim(),
          passphrase: sPassphrase.trim() || null,
        });

        const { data } = await AX.post(apiUrl("/api/broker/test"), { broker: stockBroker });

        setSOk(
          data?.ok ? "Stock broker connected and verified." : "Stock broker saved. Verification pending."
        );
        setSApiSecret(""); // wipe secret from UI
      }
    } catch (e2) {
      setSErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to connect broker."
      );
    } finally {
      setSSaving(false);
    }
  };

  const saveUniverse = async () => {
    setUSaving(true);
    setUMsg("");

    try {
      await AX.post(apiUrl("/api/activation/stock-setup"), {
        mode,
        symbols:
          mode === "fixed"
            ? symbols
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
            : [],
        autoCount: Number(autoCount),
        minPrice: Number(minPrice),
        minDollarVol: Number(minDollarVol),
        blacklist: blacklist
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      });

      setUMsg("Saved ✓");
      setTimeout(() => setUMsg(""), 1500);
    } catch (e2) {
      setUMsg(
        e2?.response?.data?.detail || e2?.response?.data?.error || e2?.message || "Save failed"
      );
    } finally {
      setUSaving(false);
    }
  };

  // OKX connect/test
  const connectOKX = async (e) => {
    e.preventDefault();
    setCSaving(true);
    setCErr("");
    setCOk("");

    try {
      if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
        throw new Error("API Key, Secret, and Passphrase are required.");
      }

      await AX.post(apiUrl("/api/exchange/connect"), {
        exchange: "okx",
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        passphrase: passphrase.trim(),
        subaccount: subaccount.trim() || null,
      });

      const { data } = await AX.post(apiUrl("/api/exchange/test"), { exchange: "okx" });

      setCOk(data?.ok ? "✅ OKX connected and verified." : "⚠️ OKX saved. Verification pending.");
      setApiSecret(""); // wipe secret from UI
    } catch (e2) {
      setCErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to connect OKX."
      );
    } finally {
      setCSaving(false);
    }
  };

  // Save wallet address
  const saveWallet = async () => {
    setWSaving(true);
    setWErr("");
    setWOk("");

    try {
      if (!walletReady) throw new Error("Wallet system not loaded. Check WalletProvider.");
      if (!address) throw new Error("Please connect your wallet first.");

      await AX.post(apiUrl("/api/me/wallet"), {
        address,
        chainId: Number(chainId) || null,
      });

      setWOk("Wallet saved ✓");
      setTimeout(() => setWOk(""), 1500);
      await loadMe();
    } catch (e2) {
      setWErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to save wallet."
      );
    } finally {
      setWSaving(false);
    }
  };

  const TabBtn = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-2 rounded-xl border ${
        tab === id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
      }`}
    >
      {label}
    </button>
  );

  // If wallet context is missing, show a helpful banner but don’t crash the page.
  const WalletBanner = () =>
    walletReady ? null : (
      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-amber-200 text-sm">
        Wallet system isn’t loaded (WalletProvider missing or hook path mismatch). You can still activate
        Stocks/OKX, but DEX wallet connect won’t work until it’s fixed.
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activation</h1>
          <p className="text-sm text-gray-300">
            Connect what you want to trade. Pick <b>Manual (alerts)</b> or <b>Auto</b>. You can change anytime.
          </p>
          <div className="mt-2 text-xs text-white/50">
            API Base: <span className="font-mono">{API_BASE}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={stopAllTrading}
          className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-500 font-extrabold"
          title="Emergency stop"
        >
          🛑 STOP TRADING
        </button>
      </div>

      <WalletBanner />

      {/* Account status */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
        {meLoading ? (
          <div className="text-sm text-gray-300">Loading your account…</div>
        ) : meErr ? (
          <div className="text-sm text-red-300">
            {meErr}
            <div className="mt-2">
              <Link className="underline text-emerald-300" to="/login">
                Log in
              </Link>
              <span className="mx-2 text-white/40">•</span>
              <button type="button" onClick={loadMe} className="underline text-indigo-300">
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="text-white/90">
                Signed in as <span className="font-mono">{me?.email || "—"}</span>
              </div>
              <div className="text-white/70">
                Tier: <b>{tierLabel}</b> • Status: <b>{me?.is_active ? "Active" : "Pending"}</b>
              </div>
            </div>

            <button
              type="button"
              onClick={loadMe}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Execution mode */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-bold mb-2">How should IMALI run?</h2>
        <p className="text-sm text-white/70 mb-3">
          <b>Manual</b> = alerts only (you click Buy/Sell). <b>Auto</b> = IMALI can place trades for you.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExecMode("manual")}
            className={`px-3 py-2 rounded-xl border ${
              execMode === "manual" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
            }`}
          >
            ✅ Manual (alerts)
          </button>

          <button
            type="button"
            onClick={() => setExecMode("auto")}
            className={`px-3 py-2 rounded-xl border ${
              execMode === "auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
            }`}
          >
            ⚡ Auto
          </button>

          <button
            type="button"
            disabled={execSaving}
            onClick={saveExecutionMode}
            className="ml-auto px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-60"
          >
            {execSaving ? "Saving…" : "Save"}
          </button>
        </div>

        {execMsg ? <div className="mt-2 text-sm text-white/80">{execMsg}</div> : null}

        <div className="mt-2 text-xs text-amber-200/90">
          Enforce fee rules server-side (Manual vs Auto) — don’t rely on frontend.
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 flex-wrap">
        <TabBtn id="overview" label="Overview" />
        <TabBtn id="stocks" label="Stocks" />
        <TabBtn id="cex" label="Established Crypto (OKX)" />
        <TabBtn id="dex" label="New Crypto (Wallet / DEX)" />
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-bold mb-2">Quick checklist</h3>
          <ul className="text-sm text-white/80 space-y-1">
            <li>• If you want <b>Stocks</b>: connect a broker (Paper is fine)</li>
            <li>• If you want <b>Established Crypto</b>: connect OKX keys</li>
            <li>• If you want <b>New Crypto</b>: connect your wallet (DEX)</li>
            <li>• Use 🛑 <b>STOP TRADING</b> anytime</li>
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/MemberDashboard"
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
              Go to Dashboard
            </Link>

            <Link
              to="/pricing"
              className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}

      {/* STOCKS */}
      {tab === "stocks" && (
        <>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-2">Stocks: pick Paper or connect a broker</h2>
            <p className="text-sm text-white/70 mb-4">
              Paper = simulator (recommended first). Live broker = API keys.
            </p>

            <form onSubmit={connectStock} className="space-y-4">
              <label className="block">
                <span className="text-sm">Broker</span>
                <select
                  value={stockBroker}
                  onChange={(e) => {
                    setStockBroker(e.target.value);
                    setSErr("");
                    setSOk("");
                  }}
                  className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                >
                  <option value="paper">Paper (Simulator)</option>
                  <option value="alpaca">Alpaca</option>
                  <option value="tradier">Tradier</option>
                  <option value="ibkr">Interactive Brokers</option>
                </select>
              </label>

              {stockBroker !== "paper" && (
                <>
                  <label className="block">
                    <span className="text-sm">API Key</span>
                    <input
                      value={sApiKey}
                      onChange={(e) => setSApiKey(e.target.value)}
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm">API Secret</span>
                    <input
                      value={sApiSecret}
                      onChange={(e) => setSApiSecret(e.target.value)}
                      type="password"
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm">Passphrase (if required)</span>
                    <input
                      value={sPassphrase}
                      onChange={(e) => setSPassphrase(e.target.value)}
                      className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                      placeholder="Leave blank if not used"
                    />
                  </label>
                </>
              )}

              <button
                disabled={sSaving}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60"
              >
                {sSaving ? "Saving..." : stockBroker === "paper" ? "Save Paper Mode" : "Save & Verify"}
              </button>

              {sErr && <div className="text-red-300 text-sm">{sErr}</div>}
              {sOk && <div className="text-emerald-300 text-sm">{sOk}</div>}

              <div className="text-xs text-amber-200/90">Revoke/rotate keys anytime in your broker account.</div>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-2">Stocks: choose symbols (or auto-pick)</h2>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMode("fixed")}
                className={`px-3 py-2 rounded-xl border ${
                  mode === "fixed" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                }`}
              >
                Pick symbols
              </button>

              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`px-3 py-2 rounded-xl border ${
                  mode === "auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                }`}
              >
                Auto-pick top movers
              </button>
            </div>

            {mode === "fixed" ? (
              <label className="block">
                <span className="text-sm">Symbols (comma separated)</span>
                <input
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  placeholder="SPY,QQQ,AAPL"
                  className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm">Top N</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={autoCount}
                    onChange={(e) => setAutoCount(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm">Min price ($)</span>
                  <input
                    type="number"
                    min={1}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm">Min dollar volume</span>
                  <input
                    type="number"
                    step={100000}
                    value={minDollarVol}
                    onChange={(e) => setMinDollarVol(e.target.value)}
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm">Blacklist</span>
                  <input
                    value={blacklist}
                    onChange={(e) => setBlacklist(e.target.value)}
                    placeholder="OTC,LOWFLOAT"
                    className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={uSaving}
                onClick={saveUniverse}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold disabled:opacity-60"
              >
                {uSaving ? "Saving…" : "Save"}
              </button>
              {uMsg && <span className="text-sm">{uMsg}</span>}
            </div>
          </div>
        </>
      )}

      {/* CEX */}
      {tab === "cex" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold mb-2">Established Crypto: connect OKX</h2>
          <p className="text-sm text-white/70 mb-4">
            This is usually more “established” crypto pairs (more liquidity) than brand-new DEX tokens.
          </p>

          <form onSubmit={connectOKX} className="space-y-4">
            <label className="block">
              <span className="text-sm">API Key</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                autoComplete="off"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">API Secret</span>
              <input
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                type="password"
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">Passphrase</span>
              <input
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm">Subaccount (optional)</span>
              <input
                value={subaccount}
                onChange={(e) => setSubaccount(e.target.value)}
                className="w-full p-3 bg-black/30 rounded-xl border border-white/10"
                placeholder="Leave blank if not used"
              />
            </label>

            <button
              disabled={cSaving}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60"
            >
              {cSaving ? "Saving..." : "Save & Verify"}
            </button>

            {cErr && <div className="text-red-300 text-sm">{cErr}</div>}
            {cOk && <div className="text-emerald-300 text-sm">{cOk}</div>}

            <div className="text-xs text-amber-200/90 mt-2">
              Tip: start in Manual alerts first. Move to Auto only when you’re comfortable.
            </div>
          </form>
        </div>
      )}

      {/* DEX */}
      {tab === "dex" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold mb-2">New Crypto: connect your wallet (DEX)</h2>
          <p className="text-sm text-white/70 mb-4">
            DEX tokens can be very new and risky. This step just connects your wallet for DEX features.
          </p>

          {!walletReady ? (
            <div className="text-sm text-amber-200">
              WalletProvider/hook is not available. Fix WalletContext first (so <code>useWallet()</code> is not undefined).
            </div>
          ) : address ? (
            <>
              <div className="text-sm">
                Connected: <span className="font-mono">{address}</span>
                {chainId ? ` (chain ${chainId})` : ""}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-4 py-2 rounded-2xl bg-gray-700 hover:bg-gray-600"
                >
                  Disconnect
                </button>

                <button
                  type="button"
                  disabled={wSaving}
                  onClick={saveWallet}
                  className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                >
                  {wSaving ? "Saving…" : "Save Wallet"}
                </button>
              </div>

              {wErr && <div className="text-red-300 text-sm mt-2">{wErr}</div>}
              {wOk && <div className="text-emerald-300 text-sm mt-2">{wOk}</div>}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={connect}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500"
              >
                Connect Wallet
              </button>
              <div className="text-xs text-gray-400 mt-2">No API keys required for this step.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
