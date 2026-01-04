// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx"; // listens to `trade-demo:update`

/* -------------------------- Env helpers (CRA & Vite) -------------------------- */
function getEnvVar(viteKey, craKey) {
  let v;
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && viteKey) {
      v = import.meta.env[viteKey];
    }
  } catch {
    // ignore
  }
  if (!v && typeof process !== "undefined" && process.env && craKey) {
    v = process.env[craKey];
  }
  return v;
}

/**
 * Crypto API base resolver:
 * - Full URLs → as-is (minus trailing slash).
 * - Relative paths (/bot-api/api) → prefixes window.location.origin.
 * - Fallback to provided full URL.
 */
function resolveCryptoBase(raw, fallbackFullUrl) {
  const normalize = (url) => (url || "").replace(/\/$/, "");

  const upgradeIfNeeded = (url) => {
    if (typeof window !== "undefined" && window.location?.protocol === "https:") {
      return url.replace(/^http:\/\//i, "https://");
    }
    return url;
  };

  if (raw && raw.trim()) {
    const v = raw.trim();
    if (v.startsWith("/")) {
      if (typeof window !== "undefined" && window.location?.origin) {
        return normalize(`${window.location.origin}${v}`);
      }
      return normalize(v);
    }
    return normalize(upgradeIfNeeded(v));
  }

  return normalize(upgradeIfNeeded(fallbackFullUrl || ""));
}

/**
 * ✅ Robust: return BOTH base styles so we never 404:
 * - with /api suffix
 * - without /api suffix
 *
 * Some nginx configs strip /api before forwarding; some do not.
 * We try both and take the first that works.
 */
function buildStocksCandidates(base) {
  const b = String(base || "").replace(/\/+$/, "");
  if (!b) return [];
  // Some deployments use /api prefix even for stocks routes
  const withApi = /\/api$/i.test(b) ? b : `${b}/api`;
  const withoutApi = b.replace(/\/api$/i, "");
  return Array.from(new Set([withoutApi, withApi].filter(Boolean)));
}
function buildApiCandidates(base) {
  const b = String(base || "").replace(/\/+$/, "");
  if (!b) return [];
  const withApi = /\/api$/i.test(b) ? b : `${b}/api`;
  const withoutApi = b.replace(/\/api$/i, "");
  return Array.from(new Set([withoutApi, withApi].filter(Boolean)));
}
/* ✅ Option 2: Use relative paths in production */
const isProduction = process.env.NODE_ENV === 'production';

const DEMO_API_DEFAULT = isProduction 
  ? '/api/demo'  // Use relative path in production
  : resolveCryptoBase(
      getEnvVar("VITE_DEMO_API", "REACT_APP_DEMO_API"),
      "https://api.imali-defi.com"
    );

const LIVE_API_DEFAULT = isProduction
  ? '/api/demo'  // Use relative path in production
  : resolveCryptoBase(
      getEnvVar("VITE_LIVE_API", "REACT_APP_LIVE_API"),
      "https://api.imali-defi.com"
    );

// Telegram notify base (optional). We will treat notify as best-effort (never blocks UI).
const TG_NOTIFY_URL_DEFAULT = isProduction
  ? '/api/demo'  // Use relative path in production
  : getEnvVar("VITE_TG_NOTIFY_URL", "REACT_APP_TG_NOTIFY_URL") ||
    getEnvVar("VITE_TG_NOTIFY_BASE", "REACT_APP_TG_NOTIFY_BASE") ||
    "https://api.imali-defi.com"; // base, not necessarily /notify

const STOCK_DEMO_API_DEFAULT = isProduction
  ? '/api/demo'  // Use relative path in production
  : getEnvVar("VITE_STOCK_DEMO_API", "REACT_APP_STOCK_DEMO_API") || "";

const STOCK_LIVE_API_DEFAULT = isProduction
  ? '/api/demo'  // Use relative path in production
  : getEnvVar("VITE_STOCK_LIVE_API", "REACT_APP_STOCK_LIVE_API") || "";

/* -------------------------------- helpers -------------------------------- */
const includesCrypto = (v) => ["dex", "cex", "both", "bundle"].includes(v);
const isStocksOnly = (v) => v === "stocks";

/* ------------------------------ fetch helpers ------------------------------ */
async function postJson(url, body, { timeoutMs = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
      cache: "no-store",
      keepalive: true,
    });

    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!r.ok) {
      const msg =
        data?.error ||
        data?.detail ||
        data?.message ||
        data?.raw ||
        `HTTP ${r.status} ${r.statusText}`;
      const err = new Error(`${msg}`);
      err.status = r.status;
      err.url = url;
      err.data = data;
      throw err;
    }

    return data;
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      const err = new Error(`Request timeout (${timeoutMs}ms): ${url}`);
      err.timeout = true;
      err.url = url;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/**
 * ✅ More informative GET JSON:
 * - reads text first
 * - if non-JSON, throws with status + snippet
 */
async function getJson(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    const text = await r.text();

    // ✅ if server returns non-2xx, throw (include snippet)
    if (!r.ok) {
      const snip = String(text || "").slice(0, 180);
      throw new Error(`HTTP ${r.status} from ${url}: ${snip}`);
    }

    try {
      return text ? JSON.parse(text) : null;
    } catch {
      const snip = String(text || "").slice(0, 180);
      throw new Error(`Non-JSON response (${r.status}) from ${url}: ${snip}`);
    }
  } finally {
    clearTimeout(t);
  }
}
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

  // ✅ state first
  const [cash, setCash] = useState(10000);
  const [hold, setHold] = useState(() =>
    Object.fromEntries(symList.current.map((s) => [s, 0]))
  );
  const [trades, setTrades] = useState([]);
  const [equity, setEquity] = useState([]);

  // ✅ refs after
  const cashRef = useRef(cash);
  const holdRef = useRef(hold);
  useEffect(() => { cashRef.current = cash; }, [cash]);
  useEffect(() => { holdRef.current = hold; }, [hold]);

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

    const cNow = Number(cashRef.current || 0);
    const hNow = holdRef.current || {};

    if (side === "BUY") {
      if (cNow < notional + fee) return false;
      setTimeout(() => {
        setCash((c) => c - notional - fee);
        setHold((h) => ({ ...h, [sym]: (h[sym] || 0) + qty }));
        setTrades((t) => [...t, { t: Date.now(), venue: "STOCKS", sym, action: "BUY", price: px, amount: qty, fee }]);
      }, latencyMs);
      return true;
    } else {
      if ((hNow[sym] || 0) < qty) return false;
      setTimeout(() => {
        setCash((c) => c + notional - fee);
        setHold((h) => ({ ...h, [sym]: (h[sym] || 0) - qty }));
        setTrades((t) => [...t, { t: Date.now(), venue: "STOCKS", sym, action: "SELL", price: px, amount: qty, fee }]);
      }, latencyMs);
      return true;
    }
  }

  function tickOne({ driftBps = 1, shockProb = 0.01, trendProb = 0.6 } = {}) {
    setOhlcMap((prev) => {
      const nextMap = { ...prev };
      Object.keys(nextMap).forEach((sym) => {
        const series = nextMap[sym] || [];
        const last = series.at(-1);
        const lastClose = last?.close ?? initialPrice;

        const trend = Math.random() < trendProb;
        const drift = lastClose * (driftBps / 10000);
        const noise = lastClose * (Math.random() - 0.5) * (trend ? 0.01 : 0.006);
        let newClose = lastClose + drift + noise;

        if (Math.random() < shockProb) {
          const shockSign = Math.random() < 0.5 ? -1 : +1;
          newClose *= 1 + shockSign * (0.03 + Math.random() * 0.04);
        }

        const open = lastClose * (1 + (Math.random() - 0.5) * 0.004);
        const high = Math.max(open, newClose) * (1 + Math.random() * 0.004);
        const low = Math.min(open, newClose) * (1 - Math.random() * 0.004);
        const vol = 5000 + Math.random() * 9000;

        nextMap[sym] = [...series.slice(-99), {
          t: mkTime(t0.current, series.length, stepMs),
          open, high, low,
          close: Math.max(0.01, newClose),
          volume: vol,
          symbol: sym,
        }];
      });
      return nextMap;
    });

    const hNow = holdRef.current || {};
    const cNow = Number(cashRef.current || 0);
    const totalHoldValue = Object.entries(hNow).reduce(
      (sum, [sym, q]) => sum + lastPrice(sym) * (q || 0),
      0
    );

    setEquity((e) => [...e.slice(-199), { t: Date.now(), value: cNow + totalHoldValue }]);
  } // ✅ missing brace fixed

  function reset(newSymbols = symList.current) {
    symList.current = newSymbols;
    t0.current = Date.now() - 50 * stepMs;
    setOhlcMap(Object.fromEntries(newSymbols.map((s) => [s, makeSeedSeries(s)])));
    setCash(10000);
    setHold(Object.fromEntries(newSymbols.map((s) => [s, 0])));
    setTrades([]);
    setEquity([]);
  }

  return { ohlcMap, cash, hold, trades, equity, exec, tickOne, reset, lastPrice, symbols: symList.current };
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
  const [runMode, setRunMode] = useState(() => {
    const saved = (localStorage.getItem("IMALI_RUNMODE") || "").toLowerCase();
    const wanted = saved === "live" ? "live" : initialRunMode;
    return wanted === "live" ? "live" : "demo";
  });

  const runModeRef = useRef(runMode);
  useEffect(() => {
    runModeRef.current = runMode;
  }, [runMode]);

  const [venue, setVenue] = useState(defaultVenue);
  const venueRef = useRef(venue);
  useEffect(() => {
    venueRef.current = venue;
  }, [venue]);

  const usingDemo = runMode === "demo";

  /**
   * ✅ KEY FIX:
   * We keep TWO candidates (with /api and without),
   * then every request tries both. This removes your "not_found" issue
   * regardless of nginx proxy prefix behavior.
   */
  const apiCandidates = useMemo(() => {
    const raw = usingDemo ? demoApi : liveApi;
    const resolved = resolveCryptoBase(raw, "https://api.imali-defi.com");
    return buildApiCandidates(resolved);
  }, [usingDemo, demoApi, liveApi]);

  const apiCandidatesRef = useRef(apiCandidates);
  useEffect(() => {
    apiCandidatesRef.current = apiCandidates;
  }, [apiCandidates]);

  // For display only (what user sees as "Crypto base:")
  const apiBaseDisplay = apiCandidates[0] || "";

  useEffect(() => {
    const title = usingDemo ? "IMALI • Trade Demo" : "IMALI • Trade Live";
    document.title = title;
    localStorage.setItem("IMALI_RUNMODE", runMode);
  }, [usingDemo, runMode]);

  /* ----------------------------- State ---------------------------- */
  const [chain, setChain] = useState("ethereum");
  const [symbols, setSymbols] = useState(defaultSymbols || "BTC,ETH");
  const [stockSymbols, setStockSymbols] = useState("AAPL,MSFT,NVDA,AMZN,TSLA");

  const strategyCatalog = {
    ai_weighted: {
      name: "Smart Mix",
      help: "Blends trend, dip-buy, and volume. Only trades when confidence is high.",
      defaults: { momentumWeight: 0.4, meanRevWeight: 0.3, volumeWeight: 0.3, minScore: 0.65 },
      fields: [
        { key: "momentumWeight", label: "Trend Bias", step: 0.05, min: 0, max: 1, desc: "How much to follow strength. Higher = chase trends more." },
        { key: "meanRevWeight", label: "Dip-Buy Bias", step: 0.05, min: 0, max: 1, desc: "How much to fade moves. Higher = buy dips/sell rips." },
        { key: "volumeWeight", label: "Volume Reactivity", step: 0.05, min: 0, max: 1, desc: "Sensitivity to unusual volume." },
        { key: "minScore", label: "Min Confidence", step: 0.01, min: 0, max: 1, desc: "Won't trade unless confidence is at least this." },
      ],
    },
    momentum: {
      name: "Trend Follower",
      help: "Buys strength, sells weakness.",
      defaults: { lookback: 30, threshold: 1.5, cooldown: 10 },
      fields: [
        { key: "lookback", label: "Lookback Bars", step: 1, min: 5, desc: "How many bars to judge trend." },
        { key: "threshold", label: "Signal Threshold", step: 0.1, desc: "How strong the trend must be to act." },
        { key: "cooldown", label: "Cooldown Bars", step: 1, min: 0, desc: "Wait this long between trades." },
      ],
    },
    meanrev: {
      name: "Buy the Dip",
      help: "Fades extremes back to average.",
      defaults: { band: 2.0, maxHoldBars: 60, size: 1 },
      fields: [
        { key: "band", label: "Band (σ)", step: 0.1, desc: "How far price must wander before acting." },
        { key: "maxHoldBars", label: "Max Hold Bars", step: 1, min: 5, desc: "Force exit after this many bars." },
        { key: "size", label: "Position Size", step: 1, min: 1, desc: "Relative size multiplier." },
      ],
    },
    volume_spike: {
      name: "Volume Spike",
      help: "Jumps on unusual volume surges.",
      defaults: { window: 50, spikeMultiplier: 2.5, cooldown: 15 },
      fields: [
        { key: "window", label: "Average Window", step: 1, min: 5, desc: "Bars used to compute normal volume." },
        { key: "spikeMultiplier", label: "Spike × Normal", step: 0.1, min: 1, desc: "How big volume must be vs. normal." },
        { key: "cooldown", label: "Cooldown Bars", step: 1, min: 0, desc: "Wait time between signals." },
      ],
    },
    trade_signal: {
      name: "Signal Gate",
      help: "Trades only if confidence passes a bar.",
      defaults: { minConfidence: 0.7, maxPositions: 2, cooldown: 10 },
      fields: [
        { key: "minConfidence", label: "Min Confidence", step: 0.01, min: 0, max: 1, desc: "Only trade when high conviction." },
        { key: "maxPositions", label: "Max Positions", step: 1, min: 1, desc: "Limit open positions." },
        { key: "cooldown", label: "Cooldown Bars", step: 1, min: 0, desc: "Wait time between signals." },
      ],
    },
  };

  const [strategy, setStrategy] = useState("ai_weighted");
  const [params, setParams] = useState(strategyCatalog["ai_weighted"].defaults);
  const [startBalance, setStartBalance] = useState(1000);

  // Stocks strategy controls
  const [smaFast, setSmaFast] = useState(10);
  const [smaSlow, setSmaSlow] = useState(30);
  const [rsiWindow, setRsiWindow] = useState(14);
  const [rsiTop, setRsiTop] = useState(70);
  const [rsiBottom, setRsiBottom] = useState(30);
  const [stockTradeUnits, setStockTradeUnits] = useState(10);

  // Stocks realism knobs
  const [feeBps, setFeeBps] = useState(5);
  const [spreadBps, setSpreadBps] = useState(8);
  const [slipBps, setSlipBps] = useState(10);
  const [latencyMs, setLatencyMs] = useState(80);
  const [driftBps, setDriftBps] = useState(1);
  const [shockProb, setShockProb] = useState(0.01);
  const [trendProb, setTrendProb] = useState(0.6);

  // Sessions
  const [dexSess, setDexSess] = useState(null);
  const [cexSess, setCexSess] = useState(null);
  const [stocksSess, setStocksSess] = useState(null);

  const dexRef = useRef(dexSess);
  const cexRef = useRef(cexSess);
  const stocksRef = useRef(stocksSess);
  useEffect(() => void (dexRef.current = dexSess), [dexSess]);
  useEffect(() => void (cexRef.current = cexSess), [cexSess]);
  useEffect(() => void (stocksRef.current = stocksSess), [stocksSess]);

  // Local Multi-Stocks sim
  const stockList = useMemo(
    () =>
      stockSymbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    [stockSymbols]
  );
  const sim = useStocksSimMulti(100, 60_000, stockList);

  // UI/gamification
  const [busy, setBusy] = useState(false);

  const [fatalError, setFatalError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const statusTimerRef = useRef(null);

  const setStatus = (msg, ms = 3500) => {
    setStatusNote(msg || "");
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (msg && ms) {
      statusTimerRef.current = setTimeout(() => setStatusNote(""), ms);
    }
  };

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showAutoHint, setShowAutoHint] = useState(false);

  const [simPnL, setSimPnL] = useState(0);

  const [check, setCheck] = useState({ ok: null, message: "" });

  // Tier/IMALI simulator (Net PnL)
  const tiers = [
    { name: "Starter", minImali: 0, takeRate: 0.3 },
    { name: "Bronze", minImali: 500, takeRate: 0.25 },
    { name: "Silver", minImali: 2000, takeRate: 0.2 },
    { name: "Gold", minImali: 5000, takeRate: 0.15 },
    { name: "Platinum", minImali: 15000, takeRate: 0.1 },
  ];
  const [currentImali] = useState(userImaliBalance || 0);
  const [addImali, setAddImali] = useState(0);
  const [applyNetToDisplay, setApplyNetToDisplay] = useState(true);
  const getTier = (imali) =>
    tiers.reduce((acc, t) => (imali >= t.minImali ? t : acc), tiers[0]);
  const activeTier = getTier(currentImali);
  const simulatedTier = getTier(currentImali + addImali);

  const timer = useRef(null);
  const haveAny = !!(dexSess || cexSess || stocksSess);
  const isRunning = haveAny;

  const parseSymbols = () =>
    symbols
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

  /* ---------------------- Telegram alerts (best-effort) ------------------------- */
  const lastSentRef = useRef({});

  function shouldSend(kind, gapMs) {
    const now = Date.now();
    const last = lastSentRef.current[kind] || 0;
    if (now - last < gapMs) return false;
    lastSentRef.current[kind] = now;
    return true;
  }

  function buildNotifyCandidates(anyApiBaseCandidate) {
    const list = [];
    const base = (TG_NOTIFY_URL_DEFAULT || "").replace(/\/$/, "");
    const clean = String(anyApiBaseCandidate || "").replace(/\/$/, "");
  
    const addApiNotify = (b) => {
      if (!b) return;
      const withApi = /\/api$/i.test(b) ? b : `${b}/api`;
      list.push(`${withApi}/notify`);
    };
  
    addApiNotify(base);
    addApiNotify(clean);
  
    return Array.from(new Set(list.filter(Boolean)));
  }

  async function notifyTelegram(kind, payload = {}, { minGapMs = 0 } = {}) {
    if (minGapMs && !shouldSend(kind, minGapMs)) return;

    const candidates = [];
    for (const b of apiCandidatesRef.current || []) {
      candidates.push(...buildNotifyCandidates(b));
    }
    const urls = Array.from(new Set(candidates));

    for (const url of urls) {
      try {
        await postJson(url, { event: kind, data: payload }, { timeoutMs: 2500 });
        return;
      } catch {
        // silent
      }
    }
  }

  /* ----------------------- Progress bar state ----------------------- */
  const [progressPct, setProgressPct] = useState(0);
  const nextTickAtRef = useRef(null);
  const progressAnimRef = useRef(null);

  function startProgressCycle(periodMs = 4000) {
    nextTickAtRef.current = Date.now() + periodMs;
    setProgressPct(0);
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    const step = () => {
      if (!nextTickAtRef.current) return;
      const left = Math.max(0, nextTickAtRef.current - Date.now());
      const pct = Math.min(100, Math.max(0, 100 * (1 - left / periodMs)));
      setProgressPct(pct);
      if (left <= 0) setProgressPct(100);
      else progressAnimRef.current = requestAnimationFrame(step);
    };
    progressAnimRef.current = requestAnimationFrame(step);
  }
  function stopProgressCycle() {
    nextTickAtRef.current = null;
    if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    progressAnimRef.current = null;
    setProgressPct(0);
  }

  /* -------------------------- Local Stocks Helpers -------------------------- */
  function stocksSignalForSeries(series) {
    const closes = series.map((d) => d.close);
    const sFast = sma(closes, smaFast);
    const sSlow = sma(closes, smaSlow);
    const r = rsi(closes, rsiWindow);
    if (sFast == null || sSlow == null || r == null) return "HOLD";
    if (sFast > sSlow && r < rsiTop) return "BUY";
    if (sFast < sSlow && r > rsiBottom) return "SELL";
    return "HOLD";
  }

  function localStocksTick() {
    sim.tickOne({ driftBps, shockProb, trendProb });
    const actives = [...sim.symbols].slice(0, Math.min(3, sim.symbols.length));
    let totalDelta = 0;

    actives.forEach((sym) => {
      const series = sim.ohlcMap[sym] || [];
      if (!series.length) return;
      const signal = stocksSignalForSeries(series);
      const px = series.at(-1)?.close || 0;
      let did = false;

      if (signal === "BUY")
        did = sim.exec(sym, "BUY", Math.max(1, stockTradeUnits), {
          feeBps,
          spreadBps,
          slipBps,
          latencyMs,
        });

      if (signal === "SELL")
        did = sim.exec(sym, "SELL", Math.max(1, stockTradeUnits), {
          feeBps,
          spreadBps,
          slipBps,
          latencyMs,
        });

      const delta = did ? Math.max(1, Math.round(px * 0.1)) : 0;
      totalDelta += delta;

      setStocksSess((prev) => {
        const history = [
          ...(prev?.history || []),
          { t: Date.now(), venue: "STOCKS", sym, pnlDelta: delta },
        ];
        const realizedPnL = (prev?.realizedPnL || 0) + delta;
        return {
          ...(prev || {}),
          __venue: "stocks",
          equity: sim.equity.at(-1)?.value || startBalance,
          balance: sim.cash,
          realizedPnL,
          history,
          wins: (prev?.wins || 0) + (delta > 0 ? 1 : 0),
          losses: (prev?.losses || 0) + (delta < 0 ? 1 : 0),
        };
      });
    });

    return { delta: totalDelta };
  }

  /* --------------------------- Start/Config (bulletproof) --------------------------- */
  function normalizeStartResponse(obj) {
    const o = obj || {};
    const demoId = o.demoId || o.demo_id || o.demoID || o.id || o.sessionId || o.session_id;
    const liveId = o.liveId || o.live_id || o.liveID || o.id || o.sessionId || o.session_id;
    return { ...o, demoId, liveId };
  }

  function buildCryptoConfigVariants(kind, sess) {
    const symArr = parseSymbols();
    const symCsv = symArr.join(",");

    const baseCommon = {
      chain,
      symbols: symArr,
      symbolsCsv: symCsv,
      pairs: symArr,
      tickers: symArr,
      mode: kind,
      venue: kind,
      market: kind,
      strategy,
      strategyKey: strategy,
      strategy_name: strategy,
      params,
      config: { ...params },
      settings: { ...params },
    };

    const ids = {
      demoId: sess?.demoId,
      demo_id: sess?.demoId || sess?.demo_id,
      demoID: sess?.demoId || sess?.demoID,
      liveId: sess?.liveId,
      live_id: sess?.liveId || sess?.live_id,
      sessionId: sess?.demoId || sess?.liveId || sess?.sessionId,
      session_id: sess?.demoId || sess?.liveId || sess?.session_id,
    };

    const nested = {
      ...ids,
      ...baseCommon,
      configuration: {
        ...baseCommon,
        params,
        config: { ...params },
      },
    };

    const withName = {
      ...ids,
      ...baseCommon,
      name: kind.toUpperCase(),
      bot: kind,
    };

    const stringOnly = {
      ...ids,
      ...baseCommon,
      symbols: symCsv,
      tickers: symCsv,
      pairs: symCsv,
    };

    return [withName, nested, stringOnly];
  }

  /**
   * ✅ FIX: include both styles in PATHS too:
   * - /demo/start
   * - /api/demo/start
   */
  function buildCryptoPaths(usingDemoNow) {
    if (usingDemoNow) {
      return {
        start: ["/demo/start", "/api/demo/start", "/demo/begin", "/api/demo/begin"],
        config: ["/demo/config", "/api/demo/config", "/demo/configure", "/api/demo/configure"],
        tick: ["/demo/tick", "/api/demo/tick", "/demo/step", "/api/demo/step"],
      };
    }
    return {
      start: ["/live/start", "/api/live/start", "/live/begin", "/api/live/begin"],
      config: ["/live/config", "/api/live/config", "/live/configure", "/api/live/configure"],
      tick: ["/live/tick", "/api/live/tick", "/live/step", "/api/live/step"],
    };
  }

  /**
   * ✅ KEY FIX: try ALL api candidates (with /api and without)
   */
  async function tryPostAny(bases, paths, bodies, { timeoutMs = 8000 } = {}) {
    let lastErr = null;
    const baseList = Array.isArray(bases) ? bases : [bases].filter(Boolean);

    for (const base of baseList) {
      for (const p of paths) {
        const url = `${String(base).replace(/\/+$/, "")}${p}`;
        for (const body of bodies) {
          try {
            const d = await postJson(url, body, { timeoutMs });
            return { ok: true, data: d, url, body };
          } catch (e) {
            lastErr = e;
            continue;
          }
        }
      }
    }

    const err = lastErr || new Error("Request failed");
    throw err;
  }

  async function startOne(kind) {
    const usingDemoNow = runModeRef.current === "demo";
  
    if (kind === "stocks") {
      const wantRemote = useRemoteStocks;
      const isLive = runModeRef.current === "live";
    
      const rawBase = isLive ? stockLiveApi : stockDemoApi;
      const bases = buildStocksCandidates(rawBase); // ✅ try with/without /api
    
      const startPath = isLive ? "/stocks/live/start" : "/stocks/demo/start";
      const configPath = isLive ? "/stocks/live/config" : "/stocks/demo/config";
      const basket = stockList;
    
      if (wantRemote && bases.length) {
        // try bases until one works
        for (const base of bases) {
          try {
            const d0 = await postJson(
              `${base}${startPath}`,
              { name: "STOCKS", startBalance },
              { timeoutMs: 8000 }
            );
    
            const stocksId = d0?.stocksId || d0?.id || d0?.sessionId;
            if (!stocksId) throw new Error("No stocksId");
    
            const c = await postJson(
              `${base}${configPath}`,
              {
                stocksId,
                symbols: basket,
                symbolsCsv: basket.join(","),
                strategy,
                strategyKey: strategy,
                params,
                config: { ...params },
              },
              { timeoutMs: 8000 }
            );
    
            if (c?.ok === false) throw new Error(c?.error || "Stocks config failed");
    
            return {
              ...d0,
              stocksId,
              __venue: "stocks",
              base, // ✅ the working base
              remote: true,
              balance: startBalance,
              equity: startBalance,
              realizedPnL: 0,
              wins: 0,
              losses: 0,
              history: [],
            };
          } catch (e) {
            // try next base
          }
        }
    
        setStatus("Stocks API unavailable — using local basket sim.");
      }
    
      // ✅ fallback: local sim
      sim.reset(basket);
      return {
        local: true,
        __venue: "stocks",
        demoId: "local-stocks-basket",
        balance: startBalance,
        equity: startBalance,
        realizedPnL: 0,
        wins: 0,
        losses: 0,
        history: [],
      };
    }

    const paths = buildCryptoPaths(usingDemoNow);

    const startBodies = [
      { name: kind.toUpperCase(), startBalance, venue: kind, mode: kind },
      { bot: kind, startingBalance: startBalance, symbols: parseSymbols() },
      { venue: kind, balance: startBalance },
      { startBalance, venue: kind },
    ];

    const started = await tryPostAny(apiCandidatesRef.current, paths.start, startBodies, { timeoutMs: 9000 });
    const d = normalizeStartResponse(started.data);

    const idKey = usingDemoNow ? "demoId" : "liveId";
    const primaryId = d?.[idKey] || (usingDemoNow ? d?.demoId : d?.liveId);
    if (!primaryId) {
      const err = new Error(`No ${idKey} returned by server`);
      err.data = d;
      throw err;
    }

    const variants = buildCryptoConfigVariants(kind, { ...d, [idKey]: primaryId });
    const configRes = await tryPostAny(apiCandidatesRef.current, paths.config, variants, { timeoutMs: 9000 });

    const ok = configRes?.data?.ok;
    if (ok === false) {
      throw new Error(configRes?.data?.error || "Config rejected");
    }

    return { ...d, [idKey]: primaryId, __venue: kind };
  }

  /* ------------------- Silent demo auto-recovery (no red bar) ------------------- */
  const recoveringRef = useRef(false);
  const lastRecoveryAtRef = useRef(0);

  async function recoverDemoConnection(reason = "connection") {
    if (runModeRef.current !== "demo") return false;
    if (recoveringRef.current) return false;

    const now = Date.now();
    if (now - lastRecoveryAtRef.current < 7000) return false;

    recoveringRef.current = true;
    lastRecoveryAtRef.current = now;

    try {
      const wantDex = !!dexRef.current;
      const wantCex = !!cexRef.current;
      const wantStocks = !!stocksRef.current;

      const tasks = [];
      if (wantDex) tasks.push(startOne("dex").then((s) => setDexSess(s)));
      if (wantCex) tasks.push(startOne("cex").then((s) => setCexSess(s)));
      if (wantStocks) tasks.push(startOne("stocks").then((s) => setStocksSess(s)));

      if (!tasks.length) return false;

      await Promise.allSettled(tasks);
      setStatus(`Recovered demo connection (${reason}).`);
      notifyTelegram("recovered", { reason, mode: "demo", venues: venueRef.current }, { minGapMs: 8000 });
      return true;
    } catch {
      return false;
    } finally {
      recoveringRef.current = false;
    }
  }

  /* --------------------------- Start button --------------------------- */
  const stopAuto = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      notifyTelegram("stopped", { reason: "manual" }, { minGapMs: 2000 });
    }
    stopProgressCycle();
  };
  useEffect(() => () => stopAuto(), []);

  const clearAllSessions = () => {
    stopAuto();
    setDexSess(null);
    setCexSess(null);
    setStocksSess(null);
  };

  const handleStart = async () => {
    setBusy(true);
    setFatalError("");
    setStatusNote("");
    setSimPnL(0);
    setXp(0);
    setStreak(0);
    setCoins(0);

    if (isRunning) clearAllSessions();

    if (!usingDemo && includesCrypto(venue) && !isLiveEligible) {
      setBusy(false);
      setShowUpgrade(true);
      return;
    }

    try {
      let started = [];

      if (venue === "bundle") {
        const [d1, d2, s1] = await Promise.all([
          startOne("dex"),
          startOne("cex"),
          startOne("stocks"),
        ]);
        setDexSess(d1);
        setCexSess(d2);
        setStocksSess(s1);
        started = ["dex", "cex", "stocks"];
      } else if (venue === "both") {
        const [d1, d2] = await Promise.all([startOne("dex"), startOne("cex")]);
        setDexSess(d1);
        setCexSess(d2);
        setStocksSess(null);
        started = ["dex", "cex"];
      } else if (venue === "dex") {
        const d = await startOne("dex");
        setDexSess(d);
        setCexSess(null);
        setStocksSess(null);
        started = ["dex"];
      } else if (venue === "cex") {
        const c = await startOne("cex");
        setCexSess(c);
        setDexSess(null);
        setStocksSess(null);
        started = ["cex"];
      } else if (venue === "stocks") {
        const s = await startOne("stocks");
        setStocksSess(s);
        setDexSess(null);
        setCexSess(null);
        started = ["stocks"];
      }

      setShowAutoHint(true);

      notifyTelegram("started", {
        mode: usingDemo ? "DEMO" : "LIVE",
        venues: started.join("+"),
        symbols: parseSymbols(),
        stockSymbols: stockList,
        strategy,
        params,
        startBalance,
      });
    } catch (e) {
      if (runModeRef.current === "demo") {
        const recovered = await recoverDemoConnection("start");
        if (recovered) {
          setBusy(false);
          return;
        }
      }
      setFatalError(
        `Could not start (${usingDemo ? "DEMO" : "LIVE"}). ${String(e?.message || e)}`
      );
      notifyTelegram("error", { where: "handleStart", message: String(e?.message || e) }, { minGapMs: 7000 });
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------- Reconfigure ---------------------------- */
  async function reconfigure(kind, sess) {
    const usingDemoNow = runModeRef.current === "demo";

    if (kind === "stocks") {
      if (!sess?.remote || !sess?.base) return;
      const configPath = runModeRef.current === "live" ? "/stocks/live/config" : "/stocks/demo/config";
      try {
        await postJson(
          `${sess.base}${configPath}`,
          {
            stocksId: sess.stocksId,
            symbols: stockList,
            symbolsCsv: stockList.join(","),
            strategy,
            strategyKey: strategy,
            params,
            config: { ...params },
          },
          { timeoutMs: 8000 }
        );
        notifyTelegram("reconfigured", { mode: "stocks", strategy, params, symbols: stockList }, { minGapMs: 8000 });
      } catch {
        // silent
      }
      return;
    }

    const paths = buildCryptoPaths(usingDemoNow);
    const variants = buildCryptoConfigVariants(kind, sess);

    try {
      await tryPostAny(apiCandidatesRef.current, paths.config, variants, { timeoutMs: 9000 });
      notifyTelegram("reconfigured", { mode: kind, strategy, params, chain, symbols: parseSymbols() }, { minGapMs: 8000 });
    } catch (e) {
      if (usingDemoNow) {
        const recovered = await recoverDemoConnection("config");
        if (recovered) return;
      }
      if (!usingDemoNow) setFatalError(`Config failed (${kind.toUpperCase()}): ${String(e?.message || e)}`);
      notifyTelegram("error", { where: "reconfigure", message: String(e?.message || e) }, { minGapMs: 8000 });
    }
  }

  useEffect(() => {
    if (dexSess) reconfigure("dex", dexSess);
    if (cexSess) reconfigure("cex", cexSess);
    if (stocksSess) reconfigure("stocks", stocksSess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy, params, chain, symbols, stockSymbols, runMode]);

  /* ------------------------------ Ticking ----------------------------- */
  async function tickCryptoOnce(sess, setSess) {
    const usingDemoNow = runModeRef.current === "demo";
    const paths = buildCryptoPaths(usingDemoNow);

    const id = usingDemoNow ? sess?.demoId : sess?.liveId;
    const body = usingDemoNow
      ? { demoId: id, demo_id: id, sessionId: id, session_id: id }
      : { liveId: id, live_id: id, sessionId: id, session_id: id };

    const res = await tryPostAny(apiCandidatesRef.current, paths.tick, [body], { timeoutMs: 9000 });
    const data = res?.data || {};
    if (data?.error) throw new Error(data.error);

    setSess((prev) => ({ ...prev, ...data, __venue: prev?.__venue }));
    return data;
  }

  async function handleTick() {
    try {
      let delta = 0;

      if (dexRef.current) {
        const d = await tickCryptoOnce(dexRef.current, setDexSess);
        delta += Number(d?.realizedPnLDelta || 0);
      }
      if (cexRef.current) {
        const d = await tickCryptoOnce(cexRef.current, setCexSess);
        delta += Number(d?.realizedPnLDelta || 0);
      }

      if (stocksRef.current) {
        const s = stocksRef.current;
        if (s.remote && s.base) {
          const tickPath = runModeRef.current === "live" ? "/stocks/live/tick" : "/stocks/demo/tick";
          const data = await postJson(
            `${s.base}${tickPath}`,
            { stocksId: s.stocksId },
            { timeoutMs: 8000 }
          );
          setStocksSess((prev) => ({ ...prev, ...data, __venue: "stocks", remote: true }));
          delta += Number(data?.realizedPnLDelta || 0);
        } else {
          const { delta: localDelta } = localStocksTick();
          delta += localDelta;
        }
      }

      if (delta > 0) {
        setXp((x) => x + Math.round(delta));
        setStreak((s) => s + 1);
        setCoins((c) => c + Math.max(1, Math.round(delta / 10)));
      } else if (delta < 0) {
        setStreak(0);
      }

      startProgressCycle(4000);
      notifyTelegram("tick", { pnlDelta: delta }, { minGapMs: 12_000 });
    } catch (e) {
      if (runModeRef.current === "demo") {
        const recovered = await recoverDemoConnection("tick");
        if (recovered) return;
        setStatus("Demo connection hiccup. Retrying…", 3000);
        return;
      }

      setFatalError(String(e?.message || "Tick failed"));
      notifyTelegram("error", { where: "handleTick", message: String(e?.message || e) }, { minGapMs: 7000 });
    }
  }

  /* ---------------------------- Aggregation --------------------------- */
  const combined = useMemo(() => {
    const sims = [dexSess, cexSess, stocksSess].filter(Boolean);
    if (!sims.length) return null;

    const baseBal = sims.reduce((s, d) => s + Number(d?.balance || 0), 0) || 1;
    const scale = startBalance / baseBal;

    const equity =
      sims.reduce((s, d) => s + Number(d?.equity ?? d?.balance ?? 0), 0) * scale;
    const balance =
      sims.reduce((s, d) => s + Number(d?.balance || 0), 0) * scale;
    const realizedPnL =
      sims.reduce((s, d) => s + Number(d?.realizedPnL || 0), 0) * scale;

    const wins = sims.reduce((s, d) => s + Number(d?.wins || 0), 0);
    const losses = sims.reduce((s, d) => s + Number(d?.losses || 0), 0);

    const dexHist = (dexSess?.history || []).map((h) => ({ ...h, venue: "DEX" }));
    const cexHist = (cexSess?.history || []).map((h) => ({ ...h, venue: "CEX" }));
    const stxHist = (stocksSess?.history || []).map((h) => ({ ...h, venue: "STOCKS" }));

    const history = [...dexHist, ...cexHist, ...stxHist]
      .sort((a, b) => (a.t || 0) - (b.t || 0))
      .slice(-220);

    return { equity, balance, realizedPnL, wins, losses, history };
  }, [dexSess, cexSess, stocksSess, startBalance]);

  // Broadcast snapshot → TradingOverview listens
  useEffect(() => {
    if (!combined) return;
    window.dispatchEvent(
      new CustomEvent("trade-demo:update", {
        detail: {
          source: usingDemo ? "trade-demo" : "trade-live",
          pnl: Number(combined.realizedPnL || 0) + simPnL,
          equity: Number(combined.equity || 0) + simPnL,
          balance: Number(combined.balance || 0),
          wins: combined.wins,
          losses: combined.losses,
          running: haveAny,
          mode: runMode,
          ts: Date.now(),
        },
      })
    );
  }, [combined, haveAny, runMode, usingDemo, simPnL]);

  /* --------------------------- Derived UI ---------------------------- */
  const gross = (combined ? Number(combined.realizedPnL) : 0) + simPnL;
  const takeRate = (applyNetToDisplay ? simulatedTier.takeRate : activeTier.takeRate) || 0;
  const net = gross * (1 - takeRate);

  const tapeMarks = useMemo(() => {
    const list = combined?.history || [];
    const w = 400, h = 36;
    return list.map((pt, i) => ({
      x: (i / Math.max(1, list.length - 1)) * w,
      y: h / 2,
      sym: pt.sym || pt.symbol || "",
      venue: pt.venue,
    }));
  }, [combined]);

  const lastByVenue = (tag) => (combined?.history || []).filter((h) => h.venue === tag).at(-1) || null;
  const lastCex = lastByVenue("CEX");
  const lastDex = lastByVenue("DEX");
  const lastStocks = lastByVenue("STOCKS");

  /* --------------------------- Self-Check panel --------------------------- */
  const runSelfCheck = async () => {
    try {
      // ✅ Try both base styles for health checks
      const bases = apiCandidatesRef.current || [];
      const healthPaths = ["/health", "/api/health", "/healthz", "/api/healthz"];

      let lastErr = null;
      for (const b of bases) {
        for (const p of healthPaths) {
          const url = `${String(b).replace(/\/+$/, "")}${p}`;
          try {
            const j = await getJson(url, { timeoutMs: 6000 });
            const ok = !!j?.ok;
            setCheck({ ok, message: ok ? "Healthy" : (j?.message || j?.error || "Unhealthy") });
            return;
          } catch (e) {
            lastErr = e;
          }
        }
      }
      throw lastErr || new Error("Health check failed");
    } catch (e) {
      setCheck({ ok: false, message: `Health check failed: ${String(e?.message || e)}` });
    }
  };

  /* ----------------------------- Restart ----------------------------- */
  function restartDemo() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    stopProgressCycle();
    setDexSess(null);
    setCexSess(null);
    setStocksSess(null);
    setSimPnL(0);
    setXp(0);
    setStreak(0);
    setCoins(0);
    setStrategy("ai_weighted");
    setParams(strategyCatalog["ai_weighted"].defaults);
    setVenue(defaultVenue);
    setChain("ethereum");
    setSymbols(defaultSymbols || "BTC,ETH");
    setStockSymbols("AAPL,MSFT,NVDA,AMZN,TSLA");
    setFatalError("");
    setStatusNote("");
    setCheck({ ok: null, message: "" });
    sim.reset(stockList);
    notifyTelegram("restart", { reason: "user" }, { minGapMs: 2000 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -------------------- Bulletproof DEMO/LIVE switching -------------------- */
  const safeSetRunMode = (nextMode) => {
    const next = nextMode === "live" ? "live" : "demo";
    const nextIsLive = next === "live";

    if (nextIsLive && includesCrypto(venueRef.current) && !isLiveEligible) {
      setShowUpgrade(true);
      return;
    }

    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    stopProgressCycle();

    if (dexRef.current || cexRef.current || stocksRef.current) {
      setDexSess(null);
      setCexSess(null);
      setStocksSess(null);
      setShowAutoHint(false);
      setStatus(nextIsLive ? "Switched to LIVE. Start again." : "Switched to DEMO. Start again.");
    }

    setFatalError("");
    setRunMode(next);
  };

  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Sticky Progress Bar */}
      {isRunning && (
        <div className="sticky top-0 z-40">
          <div className="bg-emerald-900/40 backdrop-blur-sm border-b border-emerald-400/30">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-600/80 border border-emerald-300 text-white">
                Auto
              </span>
              <div className="flex-1 h-2 rounded-full bg-emerald-950/40 overflow-hidden border border-emerald-400/30">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-100 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="hidden sm:flex gap-3 text-emerald-100/90">
                <span>XP ⭐ {xp}</span>
                <span>Streak 🔥 {streak}</span>
                <span>Coins 🪙 {coins}</span>
                <span>
                  Net {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={restartDemo}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600/70 bg-slate-800/90 hover:bg-slate-700 text-xs sm:text-sm"
                title="Reset sessions, clear XP, stop auto-run, and reapply defaults."
              >
                ↺ Restart
              </button>
              <button
                onClick={() => setShowHints((s) => !s)}
                className="ml-2 inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-600/70 bg-slate-800/90 hover:bg-slate-700 text-xs"
                title="Open quick troubleshooting tips"
              >
                Help
              </button>
              {showHints && (
                <div className="absolute z-10 mt-2 w-80 sm:w-96 rounded-xl border border-slate-600/70 bg-slate-900/95 p-3 text-xs">
                  <div className="font-semibold mb-1">Quick Hints</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-200">
                    <li>
                      After you click <b>Start</b>, click <b>Auto run</b> to stream ticks.
                    </li>
                    <li>
                      Backend reachable: <code>{apiBaseDisplay}/health</code> (or <code>{apiBaseDisplay}/healthz</code>).
                    </li>
                    <li>
                      If self-check fails, your API base is wrong or the backend is down.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black">Trade {usingDemo ? "Demo" : "Live"}</h1>
            {haveAny ? <Badge color="emerald" text="RUNNING" /> : <Badge color="slate" text="READY" />}
            {!!statusNote && <Badge color="sky" text={statusNote} />}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StepHint>1) Choose Where</StepHint>
            <StepHint>2) Configure</StepHint>
            <StepHint highlight>3) Start → Auto run</StepHint>
            <ModeToggle
              runMode={runMode}
              setRunMode={(m) => safeSetRunMode(m)}
              isLiveEligible={isLiveEligible || isStocksOnly(venue)}
              onUpgrade={() => setShowUpgrade(true)}
              venue={venue}
            />
          </div>
        </div>

        <div className="mt-2">
          <BackendBadges
            usingDemo={usingDemo}
            venue={venue}
            apiBase={apiBaseDisplay}
            stockDemoApi={stockDemoApi}
            stockLiveApi={stockLiveApi}
            runMode={runMode}
            stocksSess={stocksSess}
          />
        </div>

        {/* Only show fatal errors */}
        {fatalError && (
          <div className="mt-3 rounded-lg border border-rose-500/80 bg-rose-600 px-3 py-2 text-xs sm:text-sm">
            {fatalError}{" "}
            <button
              onClick={runSelfCheck}
              className="underline font-semibold"
              title="Call /health on your server"
            >
              Run Self-Check
            </button>
            {check.ok === false && <span className="ml-2">• {check.message}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-300">
          <button
            onClick={runSelfCheck}
            className="px-2 py-1 rounded border border-slate-600/60 bg-slate-800/90 hover:bg-slate-700"
          >
            Run Self-Check
          </button>
          {check.ok != null && (
            <span
              className={`px-2 py-1 rounded border ${
                check.ok
                  ? "border-emerald-400 bg-emerald-700/50 text-emerald-100"
                  : "border-rose-400 bg-rose-700/50 text-rose-100"
              }`}
            >
              {check.ok ? "Health OK" : `Health FAIL: ${check.message}`}
            </span>
          )}
        </div>

        {/* Setup */}
        {!haveAny && (
          <div className="space-y-4 rounded-2xl border border-slate-600/60 bg-slate-900/90 p-3 sm:p-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <FieldCard
                title="Where to trade? (Step 1)"
                help="Pick crypto (DEX, CEX), STOCKS (equities), BOTH (DEX+CEX), or BUNDLE (DEX+CEX+STOCKS)."
              >
                <div className="flex flex-wrap gap-2">
                  {["dex", "cex", "both", "stocks", "bundle"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setVenue(v)}
                      className={`flex-1 rounded-lg px-3 py-2 border text-sm ${
                        venue === v
                          ? "bg-emerald-600 border-emerald-400"
                          : "bg-slate-800/90 border-slate-600/60 hover:bg-slate-700"
                      }`}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>

                {venue === "dex" && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {["ethereum", "polygon", "base", "optimism", "arbitrum", "bsc"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setChain(c)}
                        className={`rounded-full px-3 py-1 border ${
                          chain === c
                            ? "bg-emerald-600 border-emerald-400"
                            : "bg-slate-800/90 border-slate-600/60 hover:bg-slate-700"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </FieldCard>

              {venue !== "stocks" && (
                <FieldCard
                  title="Crypto Strategy (Step 2)"
                  help="Simple knobs with plain English. Less to tweak, easier to understand."
                >
                  <select
                    value={strategy}
                    onChange={(e) => {
                      const k = e.target.value;
                      setStrategy(k);
                      setParams(strategyCatalog[k].defaults);
                    }}
                    className="w-full border border-slate-600/60 rounded bg-slate-950 px-3 py-2 text-sm"
                  >
                    {Object.keys(strategyCatalog).map((k) => (
                      <option key={k} value={k}>
                        {strategyCatalog[k].name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {strategyCatalog[strategy].fields.map((f) => (
                      <div key={f.key} className="text-xs">
                        <label className="flex items-center gap-2 mb-1 text-slate-200">
                          <span>{f.label}</span>
                          {f.desc && <HoverInfo label="?" description={f.desc} />}
                        </label>
                        <input
                          type="number"
                          step={f.step ?? 1}
                          min={f.min ?? undefined}
                          max={f.max ?? undefined}
                          value={params[f.key]}
                          onChange={(e) =>
                            setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))
                          }
                          className="w-full border border-slate-600/60 rounded bg-slate-950 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </FieldCard>
              )}

              {(venue === "stocks" || venue === "bundle") && (
                <FieldCard
                  title="Stocks Strategy (Step 2)"
                  help="Uses a Fast/Slow Average crossover with RSI filter."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label title="Short-term trend line">
                      Fast Average (bars)
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={smaFast}
                        onChange={(e) => setSmaFast(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                    <label title="Long-term trend line">
                      Slow Average (bars)
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={smaSlow}
                        onChange={(e) => setSmaSlow(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                    <label title="How far back RSI looks">
                      RSI Lookback
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={rsiWindow}
                        onChange={(e) => setRsiWindow(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                    <label title="Upper RSI gate: avoid buying when too hot">
                      RSI Overbought
                      <input
                        type="number"
                        min="60"
                        max="90"
                        value={rsiTop}
                        onChange={(e) => setRsiTop(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                    <label title="Lower RSI gate: avoid selling when too weak">
                      RSI Oversold
                      <input
                        type="number"
                        min="10"
                        max="40"
                        value={rsiBottom}
                        onChange={(e) => setRsiBottom(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                    <label title="How many shares to trade per signal">
                      Trade Units
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={stockTradeUnits}
                        onChange={(e) => setStockTradeUnits(Number(e.target.value))}
                        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1"
                      />
                    </label>
                  </div>

                  <div className="mt-3 text-xs text-slate-300">
                    Stocks Basket (demo):{" "}
                    <input
                      value={stockSymbols}
                      onChange={(e) => setStockSymbols(e.target.value)}
                      className="ml-1 rounded bg-slate-800/80 border border-slate-600/60 px-2 py-[2px] w-full sm:w-auto"
                      title="Comma-separated list, e.g. AAPL,MSFT,NVDA"
                    />
                  </div>
                </FieldCard>
              )}

              <FieldCard title="Starting Balance" help="UI scales to this; backend/sim track equity internally.">
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={startBalance}
                  onChange={(e) => setStartBalance(Math.max(0, Number(e.target.value || 0)))}
                  className="w-full border border-slate-600/60 rounded bg-slate-950 px-3 py-2 text-sm"
                />
                {venue !== "stocks" && venue !== "bundle" ? (
                  <div className="mt-2 text-xs text-slate-300">
                    Crypto Symbols:{" "}
                    <input
                      value={symbols}
                      onChange={(e) => setSymbols(e.target.value)}
                      className="ml-1 rounded bg-slate-800/80 border border-slate-600/60 px-2 py-[2px] w-full sm:w-auto"
                      title="Comma-separated list, e.g. BTC,ETH"
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400">
                    Demo stocks use the basket above. Remote API may support custom lists.
                  </div>
                )}
              </FieldCard>

              <FieldCard title="How to Start" help="Follow these quick steps to see the demo moving.">
                <ol className="list-decimal pl-5 space-y-1 text-[13px] text-slate-200">
                  <li>
                    Pick <b>Where to trade</b> (DEX, CEX, BOTH, STOCKS, or BUNDLE).
                  </li>
                  <li>
                    Set your <b>Strategy</b> and <b>Starting Balance</b>.
                  </li>
                  <li>
                    Click <b>Start {usingDemo ? "Demo" : "Live"}</b>.
                  </li>
                  <li>
                    Then click <b>Auto run</b> (top-right) to stream ticks automatically every ~4s.
                  </li>
                </ol>
                <div className="mt-2 text-xs text-slate-400">
                  Tip: Use <b>Tick once</b> to advance manually; switch back to <b>Auto run</b> anytime.
                </div>
              </FieldCard>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleStart}
                disabled={busy}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 font-semibold"
              >
                {busy ? "Starting…" : `Start ${usingDemo ? "Demo" : "Live"}`}
              </button>
              {venue !== "stocks" && venue !== "bundle" && !isLiveEligible && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="w-full sm:w-auto py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 border border-yellow-400 font-semibold text-black"
                >
                  Upgrade to Go Live
                </button>
              )}
            </div>

            {showAutoHint && (
              <div className="rounded-lg border border-emerald-400/70 bg-emerald-700/30 text-emerald-100 px-3 py-2 text-xs">
                ✅ Sessions started. Now click <b>Auto run</b> (top-right) to stream ticks automatically every ~4s.
              </div>
            )}
          </div>
        )}

        {/* Running */}
        {haveAny && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 sm:gap-3">
              <Stat label="Equity" value={`$${Number((combined?.equity || 0) + simPnL).toFixed(2)}`} tip="Balance + PnL" />
              <Stat label="Cash balance" value={`$${Number(combined?.balance || 0).toFixed(2)}`} />
              <Stat label="Gross PnL" value={`${gross >= 0 ? "+" : "-"}$${Math.abs(gross).toFixed(2)}`} />
              <Stat label={`Net PnL (${(takeRate * 100).toFixed(0)}% take)`} value={`${net >= 0 ? "+" : "-"}$${Math.abs(net).toFixed(2)}`} />
              <Stat label="Wins • Losses" value={`${combined?.wins || 0} • ${combined?.losses || 0}`} />
              <Stat label="XP • Streak" value={`${xp} ⭐ / ${streak} 🔥`} />
              <Stat label="Coins" value={`${coins} 🪙`} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {dexSess && <Badge color="emerald" text="DEX active" />}
              {cexSess && <Badge color="sky" text="CEX active" />}
              {stocksSess && <Badge color="emerald" text="STOCKS active" />}
              <Badge color="slate" text="Auto Run ≈ 4s" />
              <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    handleTick();
                    startProgressCycle(4000);
                    setShowAutoHint(false);
                  }}
                  variant="ghost"
                >
                  Tick once
                </Button>
                <Button
                  onClick={() => {
                    if (timer.current) clearInterval(timer.current);
                    timer.current = setInterval(() => {
                      handleTick();
                      startProgressCycle(4000);
                    }, 4000);
                    startProgressCycle(4000);
                    setShowAutoHint(false);
                  }}
                  variant="solid"
                >
                  Auto run
                </Button>
                <Button
                  onClick={() => {
                    if (timer.current) clearInterval(timer.current);
                    timer.current = null;
                    stopProgressCycle();
                    notifyTelegram("stopped", { reason: "manual" }, { minGapMs: 2000 });
                  }}
                  variant="ghost"
                >
                  Stop
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card title="Last CEX Trade" tip="Most recent CEX trade impact">
                <div className="text-sm">
                  {lastCex ? (
                    <span>
                      {lastCex.sym || lastCex.symbol || "CEX"} • ΔPnL:{" "}
                      <b className={`${(lastCex.pnlDelta || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {lastCex.pnlDelta >= 0 ? "+" : ""}${Number(lastCex.pnlDelta || 0).toFixed(2)}
                      </b>
                    </span>
                  ) : (
                    <span className="text-slate-300">No CEX trades yet.</span>
                  )}
                </div>
              </Card>

              <Card title="Last DEX Trade" tip="Most recent DEX trade impact">
                <div className="text-sm">
                  {lastDex ? (
                    <span>
                      {lastDex.sym || lastDex.symbol || "DEX"} • ΔPnL:{" "}
                      <b className={`${(lastDex.pnlDelta || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {lastDex.pnlDelta >= 0 ? "+" : ""}${Number(lastDex.pnlDelta || 0).toFixed(2)}
                      </b>
                    </span>
                  ) : (
                    <span className="text-slate-300">No DEX trades yet.</span>
                  )}
                </div>
              </Card>

              <Card title="Last STOCKS Trade" tip="Most recent Stocks trade impact">
                <div className="text-sm">
                  {lastStocks ? (
                    <span>
                      {lastStocks.sym || lastStocks.symbol || "AAPL"} • ΔPnL:{" "}
                      <b className={`${(lastStocks.pnlDelta || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {lastStocks.pnlDelta >= 0 ? "+" : ""}${Number(lastStocks.pnlDelta || 0).toFixed(2)}
                      </b>
                    </span>
                  ) : (
                    <span className="text-slate-300">No Stocks trades yet.</span>
                  )}
                </div>
              </Card>
            </div>

            <div className="rounded-2xl border border-slate-600/60 bg-slate-900/90">
              <div className="p-3 sm:p-4">
                <TradingOverview
                  feed={
                    combined
                      ? {
                          equity: Number(combined.equity || 0) + simPnL,
                          pnl: Number(combined.realizedPnL || 0) + simPnL,
                          balance: Number(combined.balance || 0),
                          wins: combined.wins || 0,
                          losses: combined.losses || 0,
                          running: haveAny,
                          mode: runMode,
                          ts: Date.now(),
                        }
                      : null
                  }
                  stats={{
                    pnl24h: gross,
                    winRate: 0,
                    trades: combined?.history?.length || 0,
                    sharpe: 1,
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-600 bg-amber-400 text-black text-sm sm:text-base">
              <span className="font-semibold">{usingDemo ? "Demo" : "Live"} result so far:</span>{" "}
              <b>
                Gross {gross >= 0 ? "+" : "-"}$${Math.abs(gross).toFixed(2)} • Net ({(takeRate * 100).toFixed(0)}% take){" "}
                {net >= 0 ? "+" : "-"}$${Math.abs(net).toFixed(2)}
              </b>
              <span className="ml-1">
                • After Start, click <b>Auto run</b> to stream ticks ⭐
              </span>
            </div>
          </div>
        )}
      </div>

      {showUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-yellow-500/70 bg-slate-900 text-white p-5">
            <div className="text-lg font-extrabold mb-1">Unlock Live Trading</div>
            <p className="text-sm text-slate-200">
              To go <b>Live</b>, complete your plan upgrade and wallet verification.
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-200 my-3 space-y-1">
              <li>Access to Live API endpoints</li>
              <li>Run real strategies with your params</li>
              <li>Telegram alerts for fills & risk</li>
            </ul>
            <div className="flex gap-2 mt-3">
              <a href="/pricing" className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400">
                See Plans
              </a>
              <button onClick={() => setShowUpgrade(false)} className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ——— Small UI atoms ——— */
function BackendBadges({ usingDemo, venue, apiBase, stockDemoApi, stockLiveApi, runMode, stocksSess }) {
  const cryptoLive = !usingDemo && includesCrypto(venue);
  const stocksLive = runMode === "live" && !!stockLiveApi;

  const cryptoLabel = includesCrypto(venue) ? (cryptoLive ? "CRYPTO • LIVE" : "CRYPTO • DEMO") : null;

  const stocksLabel =
    venue === "stocks" || venue === "bundle"
      ? stocksLive
        ? "STOCKS • LIVE"
        : stocksSess?.remote
        ? "STOCKS • DEMO API"
        : "STOCKS • LOCAL SIM"
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {cryptoLabel && <Badge color={cryptoLive ? "emerald" : "slate"} text={cryptoLabel} />}
      {stocksLabel && <Badge color={stocksLive ? "emerald" : stocksSess?.remote ? "sky" : "slate"} text={stocksLabel} />}
      <span className="text-[11px] text-slate-400">
        {includesCrypto(venue) && (
          <>
            Crypto base: <code className="text-slate-300">{apiBase}</code>
          </>
        )}
        {(venue === "stocks" || venue === "bundle") && (
          <>
            {" "}
            {stocksLive ? "• Stocks live API" : stockDemoApi ? "• Stocks demo API" : "• Stocks local sim"}
          </>
        )}
      </span>
    </div>
  );
}
function Badge({ color = "slate", text }) {
  const map = {
    emerald: "border-emerald-400 bg-emerald-600/90 text-white",
    sky: "border-sky-400 bg-sky-600/90 text-white",
    slate: "border-slate-400 bg-slate-800 text-white",
  };
  return <span className={`text-[11px] rounded-full border px-2 py-1 ${map[color]}`}>{text}</span>;
}
function Button({ children, onClick, variant = "ghost" }) {
  const classes =
    variant === "solid"
      ? "px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-sm"
      : "px-3 py-2 rounded border border-slate-600/60 bg-slate-800/90 hover:bg-slate-700 text-white text-sm";
  return (
    <button className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
function FieldCard({ title, help, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-600/60 bg-slate-900/90 p-3 sm:p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        <HoverInfo label="?" description={help} />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Card({ title, tip, children }) {
  return (
    <div className="rounded-2xl border border-slate-600/60 bg-slate-900/90 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-white">{title}</div>
        <HoverInfo label="?" description={tip} />
      </div>
      {children}
    </div>
  );
}
function Stat({ label, value, tip }) {
  return (
    <div className="p-3 rounded-lg border border-slate-600/60 bg-slate-900/90" title={tip}>
      <div className="text-[11px] sm:text-[12px] uppercase text-slate-100 tracking-wide">{label}</div>
      <div className="text-sm sm:text-base font-semibold break-all text-white">{value}</div>
    </div>
  );
}
function HoverInfo({ label, description }) {
  return (
    <div className="relative group">
      <span className="text-xs text-slate-100 underline decoration-dotted cursor-help">{label}</span>
      <div className="pointer-events-none absolute right-0 mt-2 w-64 sm:w-72 rounded-xl border border-slate-600/60 bg-slate-900/95 p-3 text-xs text-white opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
        {description}
      </div>
    </div>
  );
}
function ModeToggle({ runMode, setRunMode, isLiveEligible, onUpgrade, venue }) {
  const isLive = runMode === "live";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`px-2 py-1 rounded border ${
          !isLive ? "border-emerald-400 text-emerald-300 bg-emerald-900/30" : "border-slate-600 text-slate-300"
        }`}
      >
        DEMO
      </span>
      <label className="relative inline-flex cursor-pointer items-center" title="Toggle Demo / Live">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isLive}
          onChange={(e) => {
            const nextIsLive = e.target.checked;
            if (nextIsLive && includesCrypto(venue) && !isLiveEligible) {
              onUpgrade?.();
              return;
            }
            setRunMode(nextIsLive ? "live" : "demo");
          }}
        />
        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:bg-emerald-600" />
      </label>
      <span
        className={`px-2 py-1 rounded border ${
          isLive ? "border-emerald-400 text-emerald-300 bg-emerald-900/30" : "border-slate-600 text-slate-300"
        }`}
      >
        LIVE
      </span>
    </div>
  );
}
function StepHint({ children, highlight = false }) {
  return (
    <span
      className={`hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
        highlight
          ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
          : "border-slate-300/30 bg-slate-200/10 text-slate-100"
      }`}
    >
      {children}
    </span>
  );
}
