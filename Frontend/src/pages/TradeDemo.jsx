// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

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
 * Simple API base resolver:
 * - Remove trailing slashes
 * - Convert http to https when needed
 */
function resolveApiBase(raw, fallbackFullUrl) {
  const normalize = (url) => (url || "").replace(/\/+$/, "");

  if (raw && raw.trim()) {
    const v = raw.trim();
    if (v.startsWith("/") && typeof window !== "undefined" && window.location?.origin) {
      return normalize(`${window.location.origin}${v}`);
    }
    return normalize(v);
  }

  return normalize(fallbackFullUrl || "");
}

/**
 * Cleaner API candidates builder to avoid double /api issues
 */
function buildApiCandidates(base) {
  const b = String(base || "").replace(/\/+$/, "");
  if (!b) return [];
  
  // If base already ends with /api, don't add another
  if (/\/api$/i.test(b)) {
    return [b];
  }
  
  // Try with /api suffix only if not present
  const withApi = `${b}/api`;
  return [b, withApi];
}

/* ✅ Environment configuration */
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

// Use relative paths in production for better compatibility
const DEMO_API_DEFAULT = isProduction
  ? '/api'  // Use relative path in production
  : resolveApiBase(
      getEnvVar("VITE_DEMO_API", "REACT_APP_DEMO_API"),
      "http://localhost:5055"
    );

const LIVE_API_DEFAULT = isProduction
  ? '/api'  // Use relative path in production
  : resolveApiBase(
      getEnvVar("VITE_LIVE_API", "REACT_APP_LIVE_API"),
      "https://api.imali-defi.com"
    );

/* -------------------------------- helpers -------------------------------- */
const includesCrypto = (v) => ["dex", "cex", "both", "bundle"].includes(v);
const isStocksOnly = (v) => v === "stocks";

/* ------------------------------ fetch helpers ------------------------------ */
async function postJson(url, body, { timeoutMs = 8000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        ...headers 
      },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
      cache: "no-store",
      credentials: 'include', // Important for CORS
    });

    // Handle CORS errors gracefully
    if (r.status === 0) {
      throw new Error(`CORS error: Cannot access ${url}. Check server CORS configuration.`);
    }

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

async function getJson(url, { timeoutMs = 5000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { 
      cache: "no-store", 
      signal: ctrl.signal,
      credentials: 'include',
    });
    
    if (r.status === 0) {
      throw new Error(`CORS error: Cannot access ${url}`);
    }
    
    const text = await r.text();

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

/* ----------------------- Local Multi-Stocks Simulator ----------------------- */
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
        t: Math.floor(t0.current + i * stepMs),
        open, high, low,
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

  const cashRef = useRef(cash);
  const holdRef = useRef(hold);
  useEffect(() => { cashRef.current = cash; }, [cash]);
  useEffect(() => { holdRef.current = hold; }, [hold]);

  const lastPrice = (sym) => ohlcMap[sym]?.at(-1)?.close ?? initialPrice;

  function exec(sym, side, qty, { feeBps = 5, spreadBps = 8, slipBps = 10, latencyMs = 80 } = {}) {
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
          t: Math.floor(t0.current + series.length * stepMs),
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
  }

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

/* -------------------------------- Main Component -------------------------------- */
export default function TradeDemo({
  demoApi = DEMO_API_DEFAULT,
  liveApi = LIVE_API_DEFAULT,
  useRemoteStocks = false,
  isLiveEligible = false,
  userImaliBalance = 0,
  defaultVenue = "cex",
  initialRunMode = "demo",
  defaultSymbols,
}) {
  /* ----------------------- Mode & endpoints ----------------------- */
  const [runMode, setRunMode] = useState(() => {
    const saved = (localStorage.getItem("IMALI_RUNMODE") || "").toLowerCase();
    return saved === "live" ? "live" : initialRunMode;
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

  // Get API candidates (simplified approach)
  const apiBase = usingDemo ? demoApi : liveApi;
  const apiCandidates = useMemo(() => buildApiCandidates(apiBase), [apiBase]);
  const apiCandidatesRef = useRef(apiCandidates);
  useEffect(() => {
    apiCandidatesRef.current = apiCandidates;
  }, [apiCandidates]);

  // For display only
  const apiBaseDisplay = apiCandidates[0] || apiBase;

  useEffect(() => {
    const title = usingDemo ? "IMALI • Trade Demo" : "IMALI • Trade Live";
    document.title = title;
    localStorage.setItem("IMALI_RUNMODE", runMode);
  }, [usingDemo, runMode]);

  /* ----------------------------- State ---------------------------- */
  const [chain, setChain] = useState("ethereum");
  const [symbols, setSymbols] = useState(defaultSymbols || "BTC,ETH");
  const [stockSymbols, setStockSymbols] = useState("AAPL,MSFT,NVDA,AMZN,TSLA");

  // FIXED: Add all strategies back with proper structure
  const strategyCatalog = {
    ai_weighted: {
      name: "Smart Mix",
      help: "Blends trend, dip-buy, and volume. Only trades when confidence is high.",
      defaults: { momentumWeight: 0.4, meanRevWeight: 0.3, volumeWeight: 0.3, minScore: 0.65 },
    },
    momentum: {
      name: "Momentum",
      help: "Buys when prices are rising.",
      defaults: { lookback: 30, threshold: 1.5, cooldown: 10 },
    },
    dip_buyer: {
      name: "Dip Buyer",
      help: "Buys after price drops.",
      defaults: { dipThreshold: -0.05, recoveryTarget: 0.03, maxHoldBars: 60 },
    },
    mean_reversion: {
      name: "Mean Reversion",
      help: "Trades when prices return to normal.",
      defaults: { band: 2.0, maxHoldBars: 60, size: 1 },
    },
    volume_spike: {
      name: "Volume Spike",
      help: "Trades when activity suddenly increases.",
      defaults: { window: 50, spikeMultiplier: 2.5, cooldown: 15 },
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

  // Tier/IMALI simulator
  const tiers = [
    { name: "Starter", minImali: 0, takeRate: 0.3 },
    { name: "Bronze", minImali: 500, takeRate: 0.25 },
    { name: "Silver", minImali: 2000, takeRate: 0.2 },
    { name: "Gold", minImali: 5000, takeRate: 0.15 },
    { name: "Platinum", minImali: 15000, takeRate: 0.1 },
  ];
  const [currentImali] = useState(userImaliBalance || 0);
  const getTier = (imali) =>
    tiers.reduce((acc, t) => (imali >= t.minImali ? t : acc), tiers[0]);
  const activeTier = getTier(currentImali);

  const timer = useRef(null);
  const haveAny = !!(dexSess || cexSess || stocksSess);
  const isRunning = haveAny;

  const parseSymbols = () =>
    symbols
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

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

  function sma(arr, n) {
    if (!arr || arr.length < n) return null;
    let s = 0;
    for (let i = arr.length - n; i < arr.length; i++) s += Number(arr[i] || 0);
    return s / n;
  }

  function rsi(arr, n = 14) {
    if (!arr || arr.length < n + 1) return null;
    let gains = 0, losses = 0;
    for (let i = arr.length - n; i < arr.length; i++) {
      const d = Number(arr[i]) - Number(arr[i - 1]);
      if (d > 0) gains += d;
      else losses -= d;
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  function localStocksTick() {
    sim.tickOne({ driftBps: 1, shockProb: 0.01, trendProb: 0.6 });
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
          feeBps: 5,
          spreadBps: 8,
          slipBps: 10,
          latencyMs: 80,
        });

      if (signal === "SELL")
        did = sim.exec(sym, "SELL", Math.max(1, stockTradeUnits), {
          feeBps: 5,
          spreadBps: 8,
          slipBps: 10,
          latencyMs: 80,
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

  /* --------------------------- Start/Config --------------------------- */
  async function startOne(kind) {
    const usingDemoNow = runModeRef.current === "demo";
    
    // Always use local simulation for stocks for now
    if (kind === "stocks") {
      sim.reset(stockList);
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

    try {
      // Try each API candidate
      for (const base of apiCandidatesRef.current) {
        try {
          // Step 1: Start session - use only the standard endpoint
          const startUrl = `${base}/${usingDemoNow ? 'demo' : 'live'}/start`;
          const startBody = {
            name: kind.toUpperCase(),
            startBalance,
            venue: kind,
            symbols: parseSymbols()
          };

          const startData = await postJson(startUrl, startBody, { timeoutMs: 8000 });
          
          const demoId = startData?.demoId;
          const liveId = startData?.liveId;
          const sessionId = demoId || liveId || startData?.id;

          if (!sessionId) {
            throw new Error("No session ID returned by server");
          }

          // Step 2: Configure session
          const configUrl = `${base}/${usingDemoNow ? 'demo' : 'live'}/config`;
          const configBody = {
            [usingDemoNow ? 'demoId' : 'liveId']: sessionId,
            chain,
            symbols: parseSymbols(),
            strategy,
            params,
          };

          await postJson(configUrl, configBody, { timeoutMs: 5000 });

          return {
            ...startData,
            demoId,
            liveId,
            sessionId,
            __venue: kind,
            balance: startBalance,
            equity: startBalance,
            realizedPnL: 0,
            wins: 0,
            losses: 0,
            history: [],
          };
        } catch (e) {
          console.log(`Failed with base ${base}, trying next...`, e.message);
          continue;
        }
      }
      
      // If all candidates fail, throw the last error
      throw new Error("All API endpoints failed");
    } catch (e) {
      console.error(`API failed for ${kind}:`, e.message);
      // Fallback to local simulation for demo mode only
      if (usingDemoNow) {
        return {
          local: true,
          __venue: kind,
          demoId: `local-${kind}-${Date.now()}`,
          balance: startBalance,
          equity: startBalance,
          realizedPnL: 0,
          wins: 0,
          losses: 0,
          history: [],
        };
      }
      throw e;
    }
  }

  /* --------------------------- Start button --------------------------- */
  const stopAuto = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
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
      setStatus("Sessions started. Click 'Auto run' to begin.", 3000);
    } catch (e) {
      setFatalError(`Could not start: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ Ticking ----------------------------- */
  async function tickCryptoOnce(sess, setSess) {
    const usingDemoNow = runModeRef.current === "demo";
    const id = usingDemoNow ? sess?.demoId : sess?.liveId || sess?.sessionId;
    
    if (!id || sess?.local) {
      // Local simulation
      const delta = (Math.random() - 0.5) * 20;
      setSess((prev) => ({
        ...prev,
        realizedPnL: (prev?.realizedPnL || 0) + delta,
        equity: (prev?.equity || startBalance) + delta,
      }));
      return { realizedPnLDelta: delta };
    }

    try {
      // Try each API candidate
      for (const base of apiCandidatesRef.current) {
        try {
          const tickUrl = `${base}/${usingDemoNow ? 'demo' : 'live'}/tick`;
          const body = usingDemoNow ? { demoId: id } : { liveId: id };
          
          const data = await postJson(tickUrl, body, { timeoutMs: 8000 });

          setSess((prev) => ({ ...prev, ...data, __venue: prev?.__venue }));
          return data;
        } catch (e) {
          console.log(`Tick failed with base ${base}, trying next...`, e.message);
          continue;
        }
      }
      
      // If all fail, simulate
      const delta = (Math.random() - 0.5) * 15;
      setSess((prev) => ({
        ...prev,
        realizedPnL: (prev?.realizedPnL || 0) + delta,
        equity: (prev?.equity || startBalance) + delta,
      }));
      return { realizedPnLDelta: delta };
    } catch (e) {
      console.warn("Tick failed, using simulation:", e.message);
      const delta = (Math.random() - 0.5) * 15;
      setSess((prev) => ({
        ...prev,
        realizedPnL: (prev?.realizedPnL || 0) + delta,
        equity: (prev?.equity || startBalance) + delta,
      }));
      return { realizedPnLDelta: delta };
    }
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
        const { delta: localDelta } = localStocksTick();
        delta += localDelta;
      }

      if (delta > 0) {
        setXp((x) => x + Math.round(delta));
        setStreak((s) => s + 1);
        setCoins((c) => c + Math.max(1, Math.round(delta / 10)));
      } else if (delta < 0) {
        setStreak(0);
      }

      startProgressCycle(4000);
    } catch (e) {
      console.warn("Tick failed:", e.message);
      setStatus("Tick failed, retrying next cycle", 2000);
    }
  }

  /* ---------------------------- Aggregation --------------------------- */
  const combined = useMemo(() => {
    const sims = [dexSess, cexSess, stocksSess].filter(Boolean);
    if (!sims.length) return null;

    const baseBal = sims.reduce((s, d) => s + Number(d?.balance || 0), 0) || 1;
    const scale = startBalance / baseBal;

    const equity = sims.reduce((s, d) => s + Number(d?.equity ?? d?.balance ?? 0), 0) * scale;
    const balance = sims.reduce((s, d) => s + Number(d?.balance || 0), 0) * scale;
    const realizedPnL = sims.reduce((s, d) => s + Number(d?.realizedPnL || 0), 0) * scale;

    const wins = sims.reduce((s, d) => s + Number(d?.wins || 0), 0);
    const losses = sims.reduce((s, d) => s + Number(d?.losses || 0), 0);

    return { equity, balance, realizedPnL, wins, losses };
  }, [dexSess, cexSess, stocksSess, startBalance]);

  // Broadcast snapshot
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
  const takeRate = activeTier.takeRate || 0;
  const net = gross * (1 - takeRate);

  /* --------------------------- Self-Check panel --------------------------- */
  const runSelfCheck = async () => {
    try {
      // Try each API candidate
      for (const base of apiCandidatesRef.current) {
        try {
          const healthUrl = `${base}/health`;
          const data = await getJson(healthUrl, { timeoutMs: 5000 });
          
          if (data?.ok) {
            setCheck({ ok: true, message: "API is healthy and reachable" });
            return;
          } else {
            setCheck({ ok: false, message: data?.message || data?.error || "API responded but not healthy" });
            return;
          }
        } catch (e) {
          console.log(`Health check failed for ${base}, trying next...`, e.message);
          continue;
        }
      }
      
      setCheck({
        ok: false,
        message: `All API endpoints unreachable`,
      });
    } catch (e) {
      console.error("Health check failed:", e);
      setCheck({
        ok: false,
        message: `Health check failed: ${String(e?.message || e)}`,
      });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -------------------- DEMO/LIVE switching -------------------- */
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
      setStatus(`Switched to ${nextIsLive ? "LIVE" : "DEMO"}. Start again.`);
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
                      Backend reachable: <code>{apiBaseDisplay}/health</code>
                    </li>
                    <li>
                      If self-check fails, check your API base URL.
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
            <ModeToggle
              runMode={runMode}
              setRunMode={(m) => safeSetRunMode(m)}
              isLiveEligible={isLiveEligible || venue === "stocks"}
              onUpgrade={() => setShowUpgrade(true)}
              venue={venue}
            />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={usingDemo ? "slate" : "emerald"} text={usingDemo ? "DEMO MODE" : "LIVE MODE"} />
            <span className="text-[11px] text-slate-400">
              API: <code className="text-slate-300">{apiBaseDisplay}</code>
            </span>
          </div>
        </div>

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
                  help="Choose a trading strategy for crypto markets."
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

                  <div className="mt-3 text-xs text-slate-300">
                    Crypto Symbols:{" "}
                    <input
                      value={symbols}
                      onChange={(e) => setSymbols(e.target.value)}
                      className="ml-1 rounded bg-slate-800/80 border border-slate-600/60 px-2 py-[2px] w-full sm:w-auto"
                      title="Comma-separated list, e.g. BTC,ETH"
                    />
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
                    Then click <b>Auto run</b> to stream ticks automatically every ~4s.
                  </li>
                </ol>
                <div className="mt-2 text-xs text-slate-400">
                  Tip: Use <b>Tick once</b> to advance manually.
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
                ✅ Sessions started. Now click <b>Auto run</b> to stream ticks automatically every ~4s.
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
                  }}
                  variant="ghost"
                >
                  Stop
                </Button>
              </div>
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
                    winRate: combined?.wins && combined?.losses ? 
                      (combined.wins / (combined.wins + combined.losses)) * 100 : 0,
                    trades: (combined?.wins || 0) + (combined?.losses || 0),
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
            if (nextIsLive && ["dex", "cex", "both", "bundle"].includes(venue) && !isLiveEligible) {
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
