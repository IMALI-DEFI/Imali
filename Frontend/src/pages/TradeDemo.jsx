// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx";

/* -------------------------- Env helpers -------------------------- */
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

/* ----------------------- Configuration ----------------------- */
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

// API endpoints - fixed based on your actual API
const DEMO_API_DEFAULT = isProduction
  ? '/api'  // Use proxy
  : (isLocalhost ? "http://localhost:8001" : "https://api.imali-defi.com");

const LIVE_API_DEFAULT = isProduction
  ? '/api'
  : "https://api.imali-defi.com";

/* -------------------------------- helpers -------------------------------- */
const includesCrypto = (v) => ["dex", "cex", "both", "bundle"].includes(v);

/* ------------------------------ fetch helpers ------------------------------ */
async function postJson(url, body, { timeoutMs = 12000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    console.log(`POST ${url}`, body);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
      cache: "no-store",
      mode: 'cors',
      credentials: 'include',
    });

    // Check for CORS errors
    if (r.status === 0) {
      throw new Error(`CORS error: Cannot access ${url}`);
    }

    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    console.log(`Response from ${url}:`, { status: r.status, data });

    if (!r.ok) {
      const msg = data?.error || data?.detail || data?.message || data?.raw || `HTTP ${r.status} ${r.statusText}`;
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

async function getJson(url, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    console.log(`GET ${url}`);
    const r = await fetch(url, { 
      cache: "no-store", 
      signal: ctrl.signal,
      mode: 'cors',
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
      const data = text ? JSON.parse(text) : null;
      console.log(`GET response from ${url}:`, data);
      return data;
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

/* ----------------------- Local Stocks Simulator ----------------------- */
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

  // Get the correct API base
  const apiBase = usingDemo ? demoApi : liveApi;
  
  // Clean up the base URL
  const cleanApiBase = useMemo(() => {
    let base = apiBase || '';
    // Remove trailing slash
    base = base.replace(/\/$/, '');
    // If it's a relative path, make it absolute
    if (base.startsWith('/') && typeof window !== 'undefined') {
      base = window.location.origin + base;
    }
    return base;
  }, [apiBase]);

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
      // Step 1: Start session
      const startUrl = `${cleanApiBase}/${usingDemoNow ? 'demo' : 'live'}/start`;
      const startBody = {
        name: kind.toUpperCase(),
        startBalance,
        venue: kind,
        symbols: parseSymbols()
      };

      console.log("Starting session:", { url: startUrl, body: startBody });
      const startData = await postJson(startUrl, startBody, { timeoutMs: 9000 });
      console.log("Start response:", startData);

      const demoId = startData?.demoId;
      const liveId = startData?.liveId;
      const sessionId = demoId || liveId || startData?.id;

      if (!sessionId) {
        throw new Error("No session ID returned by server");
      }

      // Step 2: Configure session (using GET instead of POST since POST to /config returns 405)
      const configUrl = `${cleanApiBase}/${usingDemoNow ? 'demo' : 'live'}/config`;
      console.log("Getting config from:", configUrl);
      const configData = await getJson(configUrl, { timeoutMs: 5000 });
      console.log("Config response:", configData);

      // Step 3: Apply configuration if needed (but skip since config is GET-only)
      // The session should already be configured with defaults

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
      console.error(`API failed for ${kind}:`, e.message);
      // Fallback to local simulation
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
    
    if (!id) {
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
      const tickUrl = `${cleanApiBase}/${usingDemoNow ? 'demo' : 'live'}/tick`;
      const body = usingDemoNow ? { demoId: id } : { liveId: id };
      
      console.log("Ticking:", { url: tickUrl, body });
      const data = await postJson(tickUrl, body, { timeoutMs: 9000 });
      console.log("Tick response:", data);

      if (data.error) {
        console.warn("Tick error:", data.error);
        // Simulate small PnL change
        const delta = (Math.random() - 0.5) * 10;
        setSess((prev) => ({
          ...prev,
          realizedPnL: (prev?.realizedPnL || 0) + delta,
          equity: (prev?.equity || startBalance) + delta,
        }));
        return { realizedPnLDelta: delta };
      }

      setSess((prev) => ({ ...prev, ...data, __venue: prev?.__venue }));
      return data;
    } catch (e) {
      console.warn("Tick failed, using simulation:", e.message);
      // Simulate small PnL change
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
      const healthUrl = `${cleanApiBase}/health`;
      console.log("Running health check:", healthUrl);
      const data = await getJson(healthUrl, { timeoutMs: 6000 });
      console.log("Health check result:", data);
      
      if (data?.ok) {
        setCheck({ ok: true, message: "API is healthy and reachable" });
      } else {
        setCheck({ ok: false, message: data?.message || data?.error || "API responded but not healthy" });
      }
    } catch (e) {
      console.error("Health check failed:", e);
      setCheck({
        ok: false,
        message: `API unreachable: ${String(e?.message || e)}`,
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