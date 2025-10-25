// src/pages/Activation.jsx
// Post-payment setup that wires ALL THREE: Stocks (paper/Alpaca/Tradier/IBKR),
// Crypto CEX (OKX), and DEX Wallet (via WalletContext).

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useWallet } from "../context/WalletContext";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8001";

export default function Activation() {
  const email =
    (typeof window !== "undefined" && localStorage.getItem("IMALI_EMAIL")) || "";

  /* --------------------------- UI Tabs --------------------------- */
  const [tab, setTab] = useState("stocks"); // stocks | crypto | wallet

  /* ----------------------- STOCKS (Broker) ----------------------- */
  const [stockBroker, setStockBroker] = useState("paper"); // paper | alpaca | tradier | ibkr
  const [sApiKey, setSApiKey] = useState("");
  const [sApiSecret, setSApiSecret] = useState("");
  const [sPassphrase, setSPassphrase] = useState("");
  const [sSaving, setSSaving] = useState(false);
  const [sErr, setSErr] = useState("");
  const [sOk, setSOk] = useState("");

  // Universe / Movers
  const [mode, setMode] = useState("fixed"); // fixed | auto
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);
  const [minPrice, setMinPrice] = useState(5);
  const [minDollarVol, setMinDollarVol] = useState(5_000_000);
  const [blacklist, setBlacklist] = useState("OTC");
  const [uSaving, setUSaving] = useState(false);
  const [uMsg, setUMsg] = useState("");

  /* ------------------------- CRYPTO (OKX) ------------------------ */
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [subaccount, setSubaccount] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cErr, setCErr] = useState("");
  const [cOk, setCOk] = useState("");

  /* --------------------------- DEX Wallet ------------------------ */
  const { connect, disconnect, address, chainId } = useWallet();
  const [wSaving, setWSaving] = useState(false);
  const [wErr, setWErr] = useState("");
  const [wOk, setWOk] = useState("");

  /* --------------------- Prefill Stock Setup --------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/activation/stock-setup`, {
          params: { email },
          withCredentials: true,
        });
        if (!mounted || !data) return;
        if (data.mode) setMode(data.mode);
        if (Array.isArray(data.symbols)) setSymbols(data.symbols.join(","));
        if (data.autoCount) setAutoCount(data.autoCount);
        if (data.minPrice) setMinPrice(data.minPrice);
        if (data.minDollarVol) setMinDollarVol(data.minDollarVol);
        if (Array.isArray(data.blacklist)) setBlacklist(data.blacklist.join(","));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

  /* -------------------- Stocks: Connect/Test --------------------- */
  const connectStock = async (e) => {
    e.preventDefault();
    setSSaving(true); setSErr(""); setSOk("");
    try {
      if (stockBroker === "paper") {
        await axios.post(`${API_BASE}/broker/connect`, {
          broker: "paper",
          api_key: null, api_secret: null, passphrase: null, email,
        }, { withCredentials: true });
        setSOk("Paper mode saved for Stocks.");
      } else {
        if (!sApiKey.trim() || !sApiSecret.trim())
          throw new Error("API Key & Secret required.");
        await axios.post(`${API_BASE}/broker/connect`, {
          broker: stockBroker,
          api_key: sApiKey.trim(),
          api_secret: sApiSecret.trim(),
          passphrase: sPassphrase.trim() || null,
          email,
        }, { withCredentials: true });

        const { data } = await axios.post(`${API_BASE}/broker/test`, {
          broker: stockBroker, email,
        }, { withCredentials: true });

        setSOk(data?.ok ? "Stock broker connected and verified." : "Stock broker saved. Verification pending.");
        setSApiSecret("");
      }
    } catch (e2) {
      setSErr(e2?.response?.data?.error || e2?.message || "Failed to connect broker.");
    } finally {
      setSSaving(false);
    }
  };

  /* -------------------- Stocks: Save Universe -------------------- */
  const saveUniverse = async () => {
    setUSaving(true); setUMsg("");
    try {
      await axios.post(`${API_BASE}/activation/stock-setup`, {
        email,
        mode,
        symbols: symbols.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean),
        autoCount: Number(autoCount),
        minPrice: Number(minPrice),
        minDollarVol: Number(minDollarVol),
        blacklist: blacklist.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean),
      }, { withCredentials: true });
      setUMsg("Saved ✓"); setTimeout(()=>setUMsg(""), 2000);
    } catch (e2) {
      setUMsg(e2?.response?.data?.error || e2?.message || "Save failed");
    } finally {
      setUSaving(false);
    }
  };

  /* ---------------------- OKX: Connect/Test ---------------------- */
  const connectOKX = async (e) => {
    e.preventDefault();
    setCSaving(true); setCErr(""); setCOk("");
    try {
      if (!apiKey.trim() || !apiSecret.trim() || !passphrase.trim()) {
        throw new Error("API Key, Secret, and Passphrase are required.");
      }

      await axios.post(`${API_BASE}/exchange/connect`, {
        exchange: "okx",
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        passphrase: passphrase.trim(),
        subaccount: subaccount.trim() || null,
        email,
      }, { withCredentials: true });

      const { data } = await axios.post(`${API_BASE}/exchange/test`, {
        exchange: "okx", email,
      }, { withCredentials: true });

      setCOk(data?.ok ? "✅ OKX connected and verified." : "⚠️ OKX saved. Verification pending.");
      setApiSecret("");
    } catch (e2) {
      setCErr(e2?.response?.data?.error || e2?.message || "Failed to connect OKX.");
    } finally {
      setCSaving(false);
    }
  };

  /* -------------------- DEX Wallet: Save Addr -------------------- */
  const saveWallet = async () => {
    setWSaving(true); setWErr(""); setWOk("");
    try {
      if (!address) throw new Error("Please connect your wallet first.");
      await axios.post(`${API_BASE}/me/wallet`, {
        email,
        address,
        chainId: Number(chainId) || null,
      }, { withCredentials: true });
      setWOk("Wallet saved ✓");
      setTimeout(()=>setWOk(""), 2000);
    } catch (e2) {
      setWErr(e2?.response?.data?.error || e2?.message || "Failed to save wallet.");
    } finally {
      setWSaving(false);
    }
  };

  /* ------------------------------ UI ------------------------------ */
  const stockGuide =
    stockBroker === "alpaca"  ? "/how-to/api-keys/alpaca"  :
    stockBroker === "tradier" ? "/how-to/api-keys/tradier" :
    stockBroker === "ibkr"    ? "/how-to/api-keys/ibkr"    : null;

  const TabBtn = ({id, label}) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-2 rounded-xl border ${tab===id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">Activation</h1>
      <p className="text-sm text-gray-300 mb-4">Complete these steps after payment to enable live trading.</p>

      <div className="mb-6 flex gap-2">
        <TabBtn id="stocks" label="Stocks" />
        <TabBtn id="crypto" label="Crypto (OKX)" />
        <TabBtn id="wallet" label="DEX Wallet" />
      </div>

      {/* --------------------------- STOCKS --------------------------- */}
      {tab === "stocks" && (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold mb-3">1) Stock Broker</h2>
            <form onSubmit={connectStock} className="space-y-4">
              <label className="block">
                <span className="text-sm">Select</span>
                <select
                  value={stockBroker}
                  onChange={(e)=>{ setStockBroker(e.target.value); setSErr(""); setSOk(""); }}
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
                  {stockGuide && (
                    <div className="text-xs text-gray-300 -mt-1">
                      Need keys?{" "}
                      <a className="underline text-emerald-300" href={stockGuide}>
                        Get {stockBroker.toUpperCase()} API Keys
                      </a>
                    </div>
                  )}
                  <label className="block">
                    <span className="text-sm">API Key</span>
                    <input value={sApiKey} onChange={e=>setSApiKey(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" autoComplete="off" required />
                  </label>
                  <label className="block">
                    <span className="text-sm">API Secret</span>
                    <input value={sApiSecret} onChange={e=>setSApiSecret(e.target.value)} type="password" className="w-full p-3 bg-black/30 rounded-xl border border-white/10" autoComplete="new-password" required />
                  </label>
                  <label className="block">
                    <span className="text-sm">Passphrase (if required)</span>
                    <input value={sPassphrase} onChange={e=>setSPassphrase(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" placeholder="Leave blank if not used" />
                  </label>
                </>
              )}

              <button disabled={sSaving} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60">
                {sSaving ? "Saving..." : stockBroker === "paper" ? "Save Paper Mode" : "Save & Verify"}
              </button>

              {sErr && <div className="text-red-300 text-sm">{sErr}</div>}
              {sOk &&  <div className="text-emerald-300 text-sm">{sOk}</div>}
              <div className="text-xs text-amber-200/90 mt-2">Secrets are stored server-side. Revoke anytime in Settings.</div>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mt-6">
            <h2 className="text-lg font-bold mb-3">2) Symbols or Top Movers</h2>

            <div className="flex gap-2 mb-4">
              <button onClick={()=>setMode("fixed")} className={`px-3 py-2 rounded-xl border ${mode==="fixed"?"bg-white/10 border-white/30":"bg-white/5 border-white/10"}`}>Pick Symbols</button>
              <button onClick={()=>setMode("auto")}  className={`px-3 py-2 rounded-xl border ${mode==="auto" ?"bg-white/10 border-white/30":"bg-white/5 border-white/10"}`}>Auto-Pick Top Movers</button>
            </div>

            {mode === "fixed" ? (
              <label className="block">
                <span className="text-sm">Symbols (comma separated)</span>
                <input value={symbols} onChange={e=>setSymbols(e.target.value)} placeholder="SPY,QQQ,AAPL" className="w-full p-3 bg-black/30 rounded-xl border border-white/10" />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm">Top N</span>
                  <input type="number" min={5} max={100} value={autoCount} onChange={e=>setAutoCount(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" />
                </label>
                <label className="block">
                  <span className="text-sm">Min Price ($)</span>
                  <input type="number" min={1} value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" />
                </label>
                <label className="block">
                  <span className="text-sm">Min Dollar Volume</span>
                  <input type="number" step={100000} value={minDollarVol} onChange={e=>setMinDollarVol(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm">Blacklist (tickers/tags)</span>
                  <input value={blacklist} onChange={e=>setBlacklist(e.target.value)} placeholder="OTC,LOWFLOAT" className="w-full p-3 bg-black/30 rounded-xl border border-white/10" />
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button disabled={uSaving} onClick={saveUniverse} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold disabled:opacity-60">
                {uSaving ? "Saving…" : "Save Symbols/Movers"}
              </button>
              {uMsg && <span className="text-sm">{uMsg}</span>}
            </div>

            <div className="mt-4 text-xs text-gray-400">You can change this anytime in the dashboard.</div>
          </div>
        </>
      )}

      {/* --------------------------- CRYPTO (OKX) -------------------------- */}
      {tab === "crypto" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold mb-3">Connect OKX</h2>
          <form onSubmit={connectOKX} className="space-y-4">
            <div className="text-xs text-gray-300 -mt-1">
              Need help? <a className="underline text-emerald-300" href="/how-to/api-keys/okx">Get OKX API Keys</a>
            </div>

            <label className="block">
              <span className="text-sm">API Key</span>
              <input value={apiKey} onChange={(e)=>setApiKey(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" autoComplete="off" required />
            </label>

            <label className="block">
              <span className="text-sm">API Secret</span>
              <input value={apiSecret} onChange={(e)=>setApiSecret(e.target.value)} type="password" className="w-full p-3 bg-black/30 rounded-xl border border-white/10" autoComplete="new-password" required />
            </label>

            <label className="block">
              <span className="text-sm">Passphrase</span>
              <input value={passphrase} onChange={(e)=>setPassphrase(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" required />
            </label>

            <label className="block">
              <span className="text-sm">Subaccount (optional)</span>
              <input value={subaccount} onChange={(e)=>setSubaccount(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl border border-white/10" placeholder="Leave blank if not used" />
            </label>

            <button disabled={cSaving} className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold disabled:opacity-60">
              {cSaving ? "Saving..." : "Save & Verify"}
            </button>

            {cErr && <div className="text-red-300 text-sm">{cErr}</div>}
            {cOk  && <div className="text-emerald-300 text-sm">{cOk}</div>}
            <div className="text-xs text-amber-200/90 mt-2">Secrets are stored server-side. Revoke anytime in Settings.</div>
          </form>
        </div>
      )}

      {/* ------------------------------ WALLET ----------------------------- */}
      {tab === "wallet" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold mb-3">Connect Wallet (DEX)</h2>
          {address ? (
            <>
              <div className="text-sm">
                Connected: <span className="font-mono">{address}</span>{chainId ? ` (chain ${chainId})` : ""}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={disconnect} className="px-4 py-2 rounded-2xl bg-gray-700 hover:bg-gray-600">Disconnect</button>
                <button disabled={wSaving} onClick={saveWallet} className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
                  {wSaving ? "Saving…" : "Save Wallet"}
                </button>
              </div>
              {wErr && <div className="text-red-300 text-sm mt-2">{wErr}</div>}
              {wOk  && <div className="text-emerald-300 text-sm mt-2">{wOk}</div>}
            </>
          ) : (
            <>
              <button onClick={connect} className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500">Connect Wallet</button>
              <div className="text-xs text-gray-400 mt-2">Used for DEX features. No API keys required.</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
