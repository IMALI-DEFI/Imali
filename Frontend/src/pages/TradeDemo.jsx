// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx"; // listens to `trade-demo:update`

/* -------------------------- Env helpers (CRA & Vite) -------------------------- */

function getEnvVar(viteKey, craKey) {
  let v;
  if (typeof import.meta !== "undefined" && import.meta.env && viteKey) {
    v = import.meta.env[viteKey];
  }
  if (!v && typeof process !== "undefined" && process.env && craKey) {
    v = process.env[craKey];
  }
  return v;
}

/**
 * Crypto API base resolver:
 * - Accepts full URLs (http://..., https://...) → returns as-is (minus trailing slash).
 * - Accepts relative paths (/bot-api/api) → prefixes with window.location.origin in the browser.
 * - If nothing is set, falls back to the given fallback (already a full URL).
 */
function resolveCryptoBase(raw, fallbackFullUrl) {
  if (raw && raw.trim()) {
    const v = raw.trim();
    // Relative path from Netlify env, e.g. "/bot-api/api"
    if (v.startsWith("/")) {
      if (typeof window !== "undefined" && window.location?.origin) {
        return `${window.location.origin}${v}`.replace(/\/$/, "");
      }
      // Last-resort: leave it as is (still a valid fetch path in pure SPA)
      return v.replace(/\/$/, "");
    }
    // Already an absolute URL
    return v.replace(/\/$/, "");
  }
  return (fallbackFullUrl || "").replace(/\/$/, "");
}

/*  ✅ CRYPTO DEMO/LIVE now work with Netlify proxy
    - In Netlify: REACT_APP_DEMO_API = /bot-api/api
    - This becomes e.g. "https://imali-defi.com/bot-api/api" at runtime.
    - Fallbacks use your Oracle IP + /api when no env is set.
*/
const DEMO_API_DEFAULT = resolveCryptoBase(
  getEnvVar("VITE_DEMO_API", "REACT_APP_DEMO_API"),
  "http://129.213.90.84:8001/api"
);

const LIVE_API_DEFAULT = resolveCryptoBase(
  getEnvVar("VITE_LIVE_API", "REACT_APP_LIVE_API"),
  "http://129.213.90.84:6066/api"
);

/*  Telegram notify URL + STOCK endpoints stay as-is.
    Stock is already working with your current env values.
*/
const TG_NOTIFY_URL_DEFAULT =
  getEnvVar("VITE_TG_NOTIFY_URL", "REACT_APP_TG_NOTIFY_URL") ||
  "http://129.213.90.84:8081/notify";

const STOCK_DEMO_API_DEFAULT =
  getEnvVar("VITE_STOCK_DEMO_API", "REACT_APP_STOCK_DEMO_API") || "";

const STOCK_LIVE_API_DEFAULT =
  getEnvVar("VITE_STOCK_LIVE_API", "REACT_APP_STOCK_LIVE_API") || "";

/* -------------------------------- helpers -------------------------------- */
const includesCrypto = (v) => ["dex", "cex", "both", "bundle"].includes(v);
const isStocksOnly = (v) => v === "stocks";

/* -------------------------------- Math helpers -------------------------------- */
function sma(arr, n) {
  if (!arr || arr.length < n) return null;
  let s = 0;
  for (let i = arr.length - n; i < arr.length; i++) s += Number(arr[i] || 0);
  return s / n;
}
function rsi(arr, n = 14) {
  if (!arr || arr.length < n + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = arr.length - n; i < arr.length; i++) {
    const d = Number(arr[i]) - Number(arr[i - 1]);
    if (d > 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}
function mkTime(t0, idx, stepMs) {
  return Math.floor(t0 + idx * stepMs);
}

/* ----------------------- Local Multi-Stocks Simulator (hook) ----------------------- */
function useStocksSimMulti(
  initialPrice = 100,
  stepMs = 60_000,
  symbols = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]
) {
  const symList = useRef(symbols);
  const t0 = useRef(Date.now() - 50 * stepMs);

  const makeSeedSeries = (sym) => {
    let list = [];
    let p = initialPrice * (0.8 + Math.random() * 0.4);
    for (let i = 0; i < 50; i++) {
      const close = p * (1 + (Math.random() - 0.5) * 0.01);
      const open = p;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      list.push({
        t: mkTime(t0.current, i, stepMs),
        open,
        high,
        low,
        close: Math.max(0.01, close),
        volume: 5000 + Math.random() * 5000,
        symbol: sym,
      });
      p = close;
    }
    return list;
  };

  const [ohlcMap, setOhlcMap] = useState(() =>
    Object.fromEntries(symList.current.map((s) => [s, makeSeedSeries(s)]))
  );

  const [cash, setCash] = useState(10000);
  const [hold, setHold] = useState(() =>
    Object.fromEntries(symList.current.map((s) => [s, 0]))
  );
  const [trades, setTrades] = useState([]);
  const [equity, setEquity] = useState([]);

  const lastPrice = (sym) => ohlcMap[sym]?.at(-1)?.close ?? initialPrice;

  function exec(
    sym,
    side,
    qty,
    { feeBps = 5, spreadBps = 8, slipBps = 10, latencyMs = 80 } = {}
  ) {
    const m = lastPrice(sym);
    const spread = m * (spreadBps / 10000);
    const sideSign = side === "BUY" ? +1 : -1;
    const slip = m * (slipBps / 10000) * Math.max(1, qty / 10);
    const px = m + sideSign * (spread / 2) + sideSign * slip;
    const notional = px * qty;
    const fee = notional * (feeBps / 10000);

    if (side === "BUY") {
      if (cash < notional + fee) return false;
      setTimeout(() => {
        setCash((c) => c - notional - fee);
        setHold((h) => ({ ...h, [sym]: (h[sym] || 0) + qty }));
        setTrades((t) => [
          ...t,
          {
            t: Date.now(),
            venue: "STOCKS",
            sym,
            action: "BUY",
            price: px,
            amount: qty,
            fee,
          },
        ]);
      }, latencyMs);
      return true;
    } else {
      if ((hold[sym] || 0) < qty) return false;
      setTimeout(() => {
        setCash((c) => c + notional - fee);
        setHold((h) => ({ ...h, [sym]: (h[sym] || 0) - qty }));
        setTrades((t) => [
          ...t,
          {
            t: Date.now(),
            venue: "STOCKS",
            sym,
            action: "SELL",
            price: px,
            amount: qty,
            fee,
          },
        ]);
      }, latencyMs);
      return true;
    }
  }

  function tickOne({
    driftBps = 1,
    shockProb = 0.01,
    trendProb = 0.6,
  } = {}) {
    setOhlcMap((prev) => {
      const nextMap = { ...prev };
      Object.keys(nextMap).forEach((sym) => {
        const series = nextMap[sym] || [];
        const last = series.at(-1);
        const lastClose = last?.close ?? initialPrice;

        const trend = Math.random() < trendProb;
        const drift = lastClose * (driftBps / 10000);
        const noise =
          lastClose * (Math.random() - 0.5) * (trend ? 0.01 : 0.006);
        let newClose = lastClose + drift + noise;

        if (Math.random() < shockProb) {
          const shockSign = Math.random() < 0.5 ? -1 : +1;
          newClose *= 1 + shockSign * (0.03 + Math.random() * 0.04);
        }

        const open =
          lastClose * (1 + (Math.random() - 0.5) * 0.004);
        const high =
          Math.max(open, newClose) *
          (1 + Math.random() * 0.004);
        const low =
          Math.min(open, newClose) *
          (1 - Math.random() * 0.004);
        const vol = 5000 + Math.random() * 9000;

        const next = {
          t: mkTime(t0.current, series.length, stepMs),
          open,
          high,
          low,
          close: Math.max(0.01, newClose),
          volume: vol,
          symbol: sym,
        };

        nextMap[sym] = [...series.slice(-99), next];
      });
      return nextMap;
    });

    const totalHoldValue = Object.entries(hold).reduce(
      (sum, [sym, q]) => sum + lastPrice(sym) * (q || 0),
      0
    );
    const eq = cash + totalHoldValue;
    setEquity((e) => [...e.slice(-199), { t: Date.now(), value: eq }]);
  }

  function reset(newSymbols = symList.current) {
    symList.current = newSymbols;
    t0.current = Date.now() - 50 * stepMs;
    const seeded = Object.fromEntries(
      newSymbols.map((s) => [s, makeSeedSeries(s)])
    );
    setOhlcMap(seeded);
    setCash(10000);
    setHold(Object.fromEntries(newSymbols.map((s) => [s, 0])));
    setTrades([]);
    setEquity([]);
  }

  return {
    ohlcMap,
    cash,
    hold,
    trades,
    equity,
    exec,
    tickOne,
    reset,
    lastPrice,
    symbols: symList.current,
  };
}

/* -------------------------------- Component -------------------------------- */
export default function TradeDemo({
  demoApi = DEMO_API_DEFAULT,
  liveApi = LIVE_API_DEFAULT,
  stockDemoApi = STOCK_DEMO_API_DEFAULT,
  stockLiveApi = STOCK_LIVE_API_DEFAULT,
  useRemoteStocks = false,
  isLiveEligible = false,
  userImaliBalance = 0,
  defaultVenue = "cex", // "dex" | "cex" | "both" | "stocks" | "bundle"
  initialRunMode = "demo", // "demo" | "live"
  defaultSymbols,
}) {
  /* ----------------------- Mode & endpoints ----------------------- */
  const [runMode, setRunMode] = useState(initialRunMode);
  const usingDemo = runMode === "demo";
  const apiBase = usingDemo ? demoApi : liveApi;

  useEffect(() => {
    const title = usingDemo ? "IMALI • Trade Demo" : "IMALI • Trade Live";
    document.title = title;
    localStorage.setItem("IMALI_RUNMODE", runMode);
  }, [usingDemo, runMode]);

  /* ... REST OF YOUR COMPONENT UNCHANGED ... */