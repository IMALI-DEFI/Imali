// src/components/activation/StockUniverseSetup.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ---------------- API base resolver ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env) {
      return import.meta.env[key] || fallback;
    }
  } catch {}
  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
}

function normalizeBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const envBase =
    getEnv("VITE_API_BASE_URL") ||
    getEnv("VITE_API_BASE") ||
    getEnv("REACT_APP_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE");

  if (envBase) {
    const b = normalizeBase(envBase);
    return b.endsWith("/api") ? b : `${b}/api`;
  }

  if (IS_BROWSER) return "https://api.imali-defi.com/api";
  return "http://localhost:8001/api";
}

const API_BASE = resolveApiBase();

function getLocalEmail() {
  if (!IS_BROWSER) return "";
  return String(localStorage.getItem("imali_email") || localStorage.getItem("email") || "")
    .trim()
    .toLowerCase();
}

export default function StockUniverseSetup({ email }) {
  const userEmail = (email || getLocalEmail() || "").trim().toLowerCase();

  const [mode, setMode] = useState("fixed"); // "fixed" | "auto"
  const [symbols, setSymbols] = useState("SPY,QQQ,AAPL");
  const [autoCount, setAutoCount] = useState(20);
  const [minPrice, setMinPrice] = useState(5);
  const [minDollarVol, setMinDollarVol] = useState(5_000_000);
  const [blacklist, setBlacklist] = useState("OTC");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const AX = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      timeout: 20000,
      headers: { "Content-Type": "application/json" },
    });
  }, []);

  const headers = useMemo(() => {
    return userEmail ? { "X-Imali-Email": userEmail } : {};
  }, [userEmail]);

  useEffect(() => {
    (async () => {
      if (!userEmail) return; // no email, skip
      try {
        const { data } = await AX.get(`/activation/stock-setup`, {
          headers,
          params: { email: userEmail },
        });

        if (data?.mode) setMode(data.mode);
        if (Array.isArray(data?.symbols)) setSymbols(data.symbols.join(","));
        if (Number.isFinite(Number(data?.autoCount))) setAutoCount(Number(data.autoCount));
        if (Number.isFinite(Number(data?.minPrice))) setMinPrice(Number(data.minPrice));
        if (Number.isFinite(Number(data?.minDollarVol))) setMinDollarVol(Number(data.minDollarVol));
        if (Array.isArray(data?.blacklist)) setBlacklist(data.blacklist.join(","));
      } catch {
        // optional endpoint; ignore
      }
    })();
  }, [AX, headers, userEmail]);

  const onSave = async () => {
    setSaving(true);
    setErr("");
    setOk(false);

    try {
      if (!userEmail) throw new Error("Missing email. Please log in again.");

      const payload = {
        email: userEmail,
        mode,
        symbols: symbols
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        autoCount: Number(autoCount),
        minPrice: Number(minPrice),
        minDollarVol: Number(minDollarVol),
        blacklist: blacklist
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      };

      await AX.post(`/activation/stock-setup`, payload, { headers });

      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white">
      <h3 className="text-lg font-bold mb-2">Stocks: Symbols or Top Movers</h3>

      <div className="text-xs text-white/50 mb-3">
        API: <span className="font-mono">{API_BASE}</span>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          className={`px-3 py-2 rounded-xl border ${
            mode === "fixed" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
          }`}
          onClick={() => setMode("fixed")}
          type="button"
        >
          Pick Symbols
        </button>
        <button
          className={`px-3 py-2 rounded-xl border ${
            mode === "auto" ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
          }`}
          onClick={() => setMode("auto")}
          type="button"
        >
          Auto-pick Top Movers
        </button>
      </div>

      {mode === "fixed" ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm text-gray-300">Symbols (comma separated)</span>
            <input
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="SPY,QQQ,AAPL"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
          <p className="text-xs text-gray-400">Tip: start with 3–5 liquid tickers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-300">How many symbols (top N)</span>
            <input
              type="number"
              min={5}
              max={100}
              value={autoCount}
              onChange={(e) => setAutoCount(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min price ($)</span>
            <input
              type="number"
              min={1}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Min dollar volume (daily)</span>
            <input
              type="number"
              min={100000}
              step={100000}
              value={minDollarVol}
              onChange={(e) => setMinDollarVol(e.target.value)}
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-gray-300">Blacklist (tickers or tags, comma separated)</span>
            <input
              value={blacklist}
              onChange={(e) => setBlacklist(e.target.value)}
              placeholder="OTC,LOWFLOAT"
              className="mt-1 w-full p-3 rounded-xl bg-black/30 border border-white/10"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={saving}
          onClick={onSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold disabled:opacity-60"
          type="button"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {ok && <span className="text-emerald-300 text-sm">Saved ✓</span>}
        {err && <span className="text-red-300 text-sm">{err}</span>}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        You can change this later in the dashboard.
      </div>
    </div>
  );
}
