// src/pages/TradeDemo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TradingOverview from "../components/Dashboard/TradingOverview.jsx"; // listens to `trade-demo:update`

/* -------------------------- Env helpers (CRA & Vite) -------------------------- */
/*  ✅ FIX: Fallbacks now use your Oracle server IP instead of localhost        */
const DEMO_API_DEFAULT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_DEMO_API) ||
  process.env.REACT_APP_DEMO_API ||
  "http://129.213.90.84:5055";

const LIVE_API_DEFAULT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_LIVE_API) ||
  process.env.REACT_APP_LIVE_API ||
  "http://129.213.90.84:6066";

const TG_NOTIFY_URL_DEFAULT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_TG_NOTIFY_URL) ||
  process.env.REACT_APP_TG_NOTIFY_URL ||
  "http://129.213.90.84:8081/notify";

const STOCK_DEMO_API_DEFAULT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_STOCK_DEMO_API) ||
  process.env.REACT_APP_STOCK_DEMO_API ||
  "";

const STOCK_LIVE_API_DEFAULT =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_STOCK_LIVE_API) ||
  process.env.REACT_APP_STOCK_LIVE_API ||
  "";

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
function mkTime(t0, idx, stepMs) {
  return Math.floor(t0 + idx * stepMs);
}

/* ----------------------- Local Multi-Stocks Simulator (hook) ----------------------- */
function useStocksSimMulti(initialPrice = 100, stepMs = 60_000, symbols = ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]) {
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

  const lastPrice = (sym) => (ohlcMap[sym]?.at(-1)?.close ?? initialPrice);

  function exec(sym, side, qty, { feeBps = 5, spreadBps = 8, slipBps = 10, latencyMs = 80 } = {}) {
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
        setTrades((t) => [...t, { t: Date.now(), venue: "STOCKS", sym, action: "BUY", price: px, amount: qty, fee }]);
      }, latencyMs);
      return true;
    } else {
      if ((hold[sym] || 0) < qty) return false;
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

        const next = {
          t: mkTime(t0.current, series.length, stepMs),
          open, high, low,
          close: Math.max(0.01, newClose),
          volume: vol,
          symbol: sym,
        };

        nextMap[sym] = [...series.slice(-99), next];
      });
      return nextMap;
    });

    const totalHoldValue = Object.entries(hold).reduce((sum, [sym, q]) => sum + lastPrice(sym) * (q || 0), 0);
    const eq = cash + totalHoldValue;
    setEquity((e) => [...e.slice(-199), { t: Date.now(), value: eq }]);
  }

  function reset(newSymbols = symList.current) {
    symList.current = newSymbols;
    t0.current = Date.now() - 50 * stepMs;
    const seeded = Object.fromEntries(newSymbols.map((s) => [s, makeSeedSeries(s)]));
    setOhlcMap(seeded);
    setCash(10000);
    setHold(Object.fromEntries(newSymbols.map((s) => [s, 0])));
    setTrades([]);
    setEquity([]);
  }

  return {
    ohlcMap, cash, hold, trades, equity,
    exec, tickOne, reset, lastPrice,
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
  defaultVenue = "cex",         // "dex" | "cex" | "both" | "stocks" | "bundle"
  initialRunMode = "demo",      // "demo" | "live"
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

  /* ----------------------------- State ---------------------------- */
  const [venue, setVenue] = useState(defaultVenue);
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
        { key: "minScore", label: "Min Confidence", step: 0.01, min: 0, max: 1, desc: "Won’t trade unless confidence is at least this." },
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

  // Local Multi-Stocks sim
  const stockList = useMemo(
    () => stockSymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    [stockSymbols]
  );
  const sim = useStocksSimMulti(100, 60_000, stockList);

  // UI/gamification
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coins, setCoins] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showAutoHint, setShowAutoHint] = useState(false);

  // Simulated take-profit PnL
  const [simPnL, setSimPnL] = useState(0);

  // Self-check display
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
  const getTier = (imali) => tiers.reduce((acc, t) => (imali >= t.minImali ? t : acc), tiers[0]);
  const activeTier = getTier(currentImali);
  const simulatedTier = getTier(currentImali + addImali);

  const timer = useRef(null);
  const haveAny = !!(dexSess || cexSess || stocksSess);
  const isRunning = haveAny;
  const parseSymbols = () => symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  /* ---------------------- Telegram alerts ------------------------- */
  const tgNotifyUrl = TG_NOTIFY_URL_DEFAULT;
  const lastSentRef = useRef({});
  function shouldSend(kind, gapMs) {
    const now = Date.now();
    const last = lastSentRef.current[kind] || 0;
    if (now - last < gapMs) return false;
    lastSentRef.current[kind] = now;
    return true;
  }
  async function notifyTelegram(kind, payload = {}, { minGapMs = 0 } = {}) {
    if (minGapMs && !shouldSend(kind, minGapMs)) return;
    try {
      await fetch(tgNotifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: kind, data: payload }),
        keepalive: true,
      });
    } catch {
      /* no-op */
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
      if (signal === "BUY") did = sim.exec(sym, "BUY", Math.max(1, stockTradeUnits), { feeBps, spreadBps, slipBps, latencyMs });
      if (signal === "SELL") did = sim.exec(sym, "SELL", Math.max(1, stockTradeUnits), { feeBps, spreadBps, slipBps, latencyMs });

      const delta = did ? Math.max(1, Math.round(px * 0.1)) : 0;
      totalDelta += delta;

      setStocksSess((prev) => {
        const history = [...(prev?.history || []), { t: Date.now(), venue: "STOCKS", sym, pnlDelta: delta }];
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
    if (kind === "stocks") {
      const wantRemote = useRemoteStocks;
      const isLive = runMode === "live";
      const base = isLive ? stockLiveApi : stockDemoApi;
      const startPath = isLive ? "/stocks/live/start" : "/stocks/demo/start";
      const configPath = isLive ? "/stocks/live/config" : "/stocks/demo/config";
      const basket = stockList;

      if (wantRemote && base) {
        try {
          const r = await Promise.race([
            fetch(`${base}${startPath}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "STOCKS", startBalance }),
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("stocks start timeout")), 5000)),
          ]);
          const d = await r.json().catch(() => ({}));
          if (!d?.stocksId) throw new Error("No stocksId");

          const r2 = await Promise.race([
            fetch(`${base}${configPath}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                stocksId: d.stocksId,
                symbols: basket,
                strategy,
                params,
              }),
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("stocks config timeout")), 5000)),
          ]);
          const c = await r2.json().catch(() => ({}));
          if (!c?.ok) throw new Error("Stocks config failed");
          return { ...d, __venue: "stocks", base, remote: true, balance: startBalance, equity: startBalance, realizedPnL: 0, wins: 0, losses: 0, history: [] };
        } catch (e) {
          setError("Stocks API unreachable — falling back to local basket.");
        }
      }

      // Local basket simulator session
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

    // Crypto paths
    const usingDemoPaths = usingDemo;
    const startPath = usingDemoPaths ? "/demo/start" : "/live/start";
    const configPath = usingDemoPaths ? "/demo/config" : "/live/config";
    const idKey = usingDemoPaths ? "demoId" : "liveId";

    const r = await fetch(`${apiBase}${startPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: kind.toUpperCase(), startBalance }),
    });
    const d = await r.json();
    if (!d?.[idKey]) throw new Error(`No ${idKey} for ${kind}`);

    const r2 = await fetch(`${apiBase}${configPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [idKey]: d[idKey],
        mode: kind,
        chain,
        symbols: parseSymbols(),
        strategy,
        params,
      }),
    });
    const c = await r2.json();
    if (!c?.ok) throw new Error(`Config failed for ${kind}`);
    return { ...d, __venue: kind };
  }

  const handleStart = async () => {
    setBusy(true);
    setError("");
    setSimPnL(0);
    setXp(0);
    setStreak(0);
    setCoins(0);

    if (isRunning) {
      stopAuto();
      setDexSess(null);
      setCexSess(null);
      setStocksSess(null);
    }

    // ❗ Gate Live for ANY crypto venue (dex/cex/both/bundle)
    if (!usingDemo && includesCrypto(venue) && !isLiveEligible) {
      setBusy(false);
      setShowUpgrade(true);
      return;
    }

    try {
      let started = [];

      if (venue === "bundle") {
        const [d1, d2, s1] = await Promise.all([startOne("dex"), startOne("cex"), startOne("stocks")]);
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
        setDexSess(d); setCexSess(null); setStocksSess(null);
        started = ["dex"];
      } else if (venue === "cex") {
        const c = await startOne("cex");
        setCexSess(c); setDexSess(null); setStocksSess(null);
        started = ["cex"];
      } else if (venue === "stocks") {
        const s = await startOne("stocks");
        setStocksSess(s); setDexSess(null); setCexSess(null);
        started = ["stocks"];
      }

      // Nudge: Auto run
      setShowAutoHint(true);

      notifyTelegram("started", {
        mode: usingDemo ? "DEMO" : "LIVE",
        venues: started.join("+"),
        symbols: parseSymbols(),
        stockSymbols: stockList,
        strategy, params, startBalance,
      });
    } catch (e) {
      setError(`Could not start (${usingDemo ? "DEMO" : "LIVE"}). Check server & env. Error: ${e.message}`);
      notifyTelegram("error", { where: "handleStart", message: String(e?.message || e) }, { minGapMs: 5000 });
    } finally {
      setBusy(false);
    }
  };

  async function reconfigure(kind, sess) {
    if (kind === "stocks") {
      if (!sess?.remote || !sess?.base) return;
      const configPath = runMode === "live" ? "/stocks/live/config" : "/stocks/demo/config";
      try {
        await fetch(`${sess.base}${configPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stocksId: sess.stocksId,
            symbols: stockList,
            strategy,
            params,
          }),
        });
        notifyTelegram("reconfigured", { mode: "stocks", strategy, params, symbols: stockList }, { minGapMs: 8000 });
      } catch (e) {
        notifyTelegram("error", { where: "reconfigure:stocks", message: String(e?.message || e) }, { minGapMs: 5000 });
      }
      return;
    }

    const configPath = usingDemo ? "/demo/config" : "/live/config";
    const idKey = usingDemo ? "demoId" : "liveId";
    try {
      await fetch(`${apiBase}${configPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [idKey]: sess[idKey],
          mode: kind,
          chain,
          symbols: parseSymbols(),
          strategy,
          params,
        }),
      });
      notifyTelegram("reconfigured", { mode: kind, strategy, params, chain, symbols: parseSymbols() }, { minGapMs: 8000 });
    } catch (e) {
      notifyTelegram("error", { where: "reconfigure", message: String(e?.message || e) }, { minGapMs: 5000 });
    }
  }

  useEffect(() => {
    if (dexSess) reconfigure("dex", dexSess);
    if (cexSess) reconfigure("cex", cexSess);
    if (stocksSess) reconfigure("stocks", stocksSess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy, params, chain, symbols, stockSymbols, runMode]);

  /* ------------------------------ Ticking ----------------------------- */
  async function tickOne(sess, setSess) {
    const tickPath = usingDemo ? "/demo/tick" : "/live/tick";
    const idKey = usingDemo ? "demoId" : "liveId";

    const r = await fetch(`${apiBase}${tickPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [idKey]: sess[idKey] }),
    });
    const data = await r.json();
    if (data?.error) throw new Error(data.error);
    setSess((prev) => ({ ...prev, ...data, __venue: prev?.__venue }));
    return data;
  }

  async function handleTick() {
    try {
      let delta = 0;

      if (dexSess) {
        const d = await tickOne(dexSess, setDexSess);
        delta += Number(d?.realizedPnLDelta || 0);
      }
      if (cexSess) {
        const d = await tickOne(cexSess, setCexSess);
        delta += Number(d?.realizedPnLDelta || 0);
      }
      if (stocksSess) {
        if (stocksSess.remote && stocksSess.base) {
          const tickPath = runMode === "live" ? "/stocks/live/tick" : "/stocks/demo/tick";
          const r = await Promise.race([
            fetch(`${stocksSess.base}${tickPath}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stocksId: stocksSess.stocksId }),
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error("stocks tick timeout")), 5000)),
          ]);
          const data = await r.json();
          if (data?.error) throw new Error(data.error);
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
      notifyTelegram("tick", { pnlDelta: delta }, { minGapMs: 10_000 });
    } catch (e) {
      setError(e.message || "Tick failed");
      notifyTelegram("error", { where: "handleTick", message: String(e?.message || e) }, { minGapMs: 5000 });
    }
  }

  const stopAuto = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      notifyTelegram("stopped", { reason: "manual" }, { minGapMs: 2000 });
    }
    stopProgressCycle();
  };
  useEffect(() => () => stopAuto(), []); // stop on unmount

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

    const dexHist = (dexSess?.history || []).map((h) => ({ ...h, venue: "DEX" }));
    const cexHist = (cexSess?.history || []).map((h) => ({ ...h, venue: "CEX" }));
    const stxHist = (stocksSess?.history || []).map((h) => ({ ...h, venue: "STOCKS" }));
    const history = [...dexHist, ...cexHist, ...stxHist].sort((a, b) => (a.t || 0) - (b.t || 0)).slice(-220);
    return { equity, balance, realizedPnL, wins, losses, history };
  }, [dexSess, cexSess, stocksSess, startBalance]);

  // Broadcast snapshot → TradingOverview listens (equity curve etc.)
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

  /* ------------------------- Honeypot & TP markers -------------------- */
  useEffect(() => {
    const hist = combined?.history || [];
    if (!hist.length) return;
    const hp = [];
    for (let i = 1; i < hist.length; i++) {
      const h = hist[i], prev = hist[i - 1];
      if (h.honeypot || h.flagged) hp.push(h);
      else if ((Number(h.pnl || 0) - Number(prev.pnl || 0)) < -Math.max(5, startBalance * 0.01)) hp.push(h);
    }
    const payload = hp.slice(-24).map((e) => ({
      time: Math.floor((e.t || Date.now()) / 1000),
      venue: e.venue,
      kind: "honeypot",
      text: "Honeypot risk",
    }));
    window.dispatchEvent(new CustomEvent("trade-demo:markers", { detail: { hp: payload } }));
  }, [combined, startBalance]);

  /* ------------------ Automatic simulated profit taking --------------- */
  const lastEqRef = useRef(null);
  const lastTpRef = useRef(0);
  useEffect(() => {
    if (!combined?.equity) return;
    const now = Date.now();
    const prev = lastEqRef.current ?? combined.equity;
    const rise = combined.equity - prev;
    lastEqRef.current = combined.equity;

    const MIN_GAP_MS = 12_000;
    const RISE_THRESHOLD = Math.max(6, startBalance * 0.002);
    if (rise > RISE_THRESHOLD && now - lastTpRef.current > MIN_GAP_MS) {
      const dCount = dexSess?.history?.length || 0;
      const cCount = cexSess?.history?.length || 0;
      const sCount = stocksSess?.history?.length || 0;
      const total = Math.max(1, dCount + cCount + sCount);

      const gain = Math.round(Math.max(5, rise * 0.35));
      const dGain = Math.round((gain * dCount) / total);
      const cGain = Math.round((gain * cCount) / total);
      const sGain = gain - dGain - cGain;

      const bump = (venueTag, g) => {
        if (g <= 0) return;
        setSimPnL((v) => v + g);
        setXp((x) => x + Math.max(1, Math.round(g / 5)));
        window.dispatchEvent(
          new CustomEvent("trade-demo:markers:tp", {
            detail: { time: Math.floor(Date.now() / 1000), venue: venueTag, kind: "takeprofit", text: `TP +$${g}` },
          })
        );
      };
      bump("DEX", dGain);
      bump("CEX", cGain);
      bump("STOCKS", sGain);

      setStreak((s) => s + 1);
      setCoins((c) => c + Math.max(1, Math.round(gain / 10)));
      lastTpRef.current = now;
    }
  }, [combined?.equity, dexSess, cexSess, stocksSess, startBalance]);

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

  const lastByVenue = (tag) =>
    (combined?.history || [])
      .filter((h) => h.venue === tag)
      .at(-1) || null;
  const lastCex = lastByVenue("CEX");
  const lastDex = lastByVenue("DEX");
  const lastStocks = lastByVenue("STOCKS");

  /* --------------------------- Self-Check panel --------------------------- */
  const runSelfCheck = async () => {
    try {
      const r = await fetch(`${apiBase}/healthz`, { cache: "no-store" });
      const j = await r.json();
      setCheck({ ok: !!j.ok, message: j.ok ? "Healthy" : "Unhealthy" });
    } catch (e) {
      setCheck({ ok: false, message: `Health check failed: ${String(e?.message || e)}` });
    }
  };

  /* ----------------------------- Restart ----------------------------- */
  function restartDemo() {
    stopAuto();
    setDexSess(null);
    setCexSess(null);
    setStocksSess(null);
    setSimPnL(0);
    setXp(0);
    setStreak(0);
    setStrategy("ai_weighted");
    setParams(strategyCatalog["ai_weighted"].defaults);
    setVenue(defaultVenue);
    setChain("ethereum");
    setSymbols(defaultSymbols || "BTC,ETH");
    setStockSymbols("AAPL,MSFT,NVDA,AMZN,TSLA");
    setError("");
    sim.reset(stockList);
    notifyTelegram("restart", { reason: "user" }, { minGapMs: 2000 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -------------------------------- UI -------------------------------- */
  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Sticky Progress Bar */}
      {isRunning && (
        <div className="sticky top-0 z-40">
          <div className="bg-emerald-900/40 backdrop-blur-sm border-b border-emerald-400/30">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-600/80 border border-emerald-300 text-white">Auto</span>
              <div className="flex-1 h-2 rounded-full bg-emerald-950/40 overflow-hidden border border-emerald-400/30">
                <div className="h-full bg-emerald-400 transition-[width] duration-100 ease-linear" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="hidden sm:flex gap-3 text-emerald-100/90">
                <span>XP ⭐ {xp}</span>
                <span>Streak 🔥 {streak}</span>
                <span>Coins 🪙 {coins}</span>
                <span>Net {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}</span>
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
                    <li>After you click <b>Start</b>, click <b>Auto run</b> to stream ticks.</li>
                    <li>Phone & laptop must be on the same Wi-Fi for LAN endpoints.</li>
                    <li>Backend reachable: <code>{apiBase}/healthz</code>.</li>
                    <li>Use LAN IP in <code>.env</code> (e.g. <code>REACT_APP_DEMO_API=http://10.0.0.9:5055</code>).</li>
                  </ul>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black">Trade {usingDemo ? "Demo" : "Live"}</h1>
            {haveAny ? <Badge color="emerald" text="RUNNING" /> : <Badge color="slate" text="READY" />}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <StepHint>1) Choose Where</StepHint>
            <StepHint>2) Configure</StepHint>
            <StepHint highlight>3) Start → Auto run</StepHint>
            <ModeToggle
              runMode={runMode}
              setRunMode={setRunMode}
              isLiveEligible={isLiveEligible || isStocksOnly(venue)}
              onUpgrade={() => setShowUpgrade(true)}
              venue={venue}
            />
          </div>
        </div>

        {/* Per-venue backend status */}
        <div className="mt-2">
          <BackendBadges
            usingDemo={usingDemo}
            venue={venue}
            apiBase={apiBase}
            stockDemoApi={stockDemoApi}
            stockLiveApi={stockLiveApi}
            runMode={runMode}
            stocksSess={stocksSess}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-500/80 bg-rose-600 px-3 py-2 text-xs sm:text-sm">
            {error} — Using <code>{venue === "stocks" ? (runMode === "live" ? stockLiveApi || "local-sim" : stockDemoApi || "local-sim") : apiBase}</code>.{" "}
            <button onClick={runSelfCheck} className="underline font-semibold" title="Call /healthz on your crypto demo server">
              Run Self-Check
            </button>
            {check.ok === false && <span className="ml-2">• {check.message}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10">
        {/* Self-Check row */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-300">
          <button onClick={runSelfCheck} className="px-2 py-1 rounded border border-slate-600/60 bg-slate-800/90 hover:bg-slate-700">
            Run Self-Check
          </button>
          {check.ok != null && (
            <span
              className={`px-2 py-1 rounded border ${
                check.ok ? "border-emerald-400 bg-emerald-700/50 text-emerald-100" : "border-rose-400 bg-rose-700/50 text-rose-100"
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
                        venue === v ? "bg-emerald-600 border-emerald-400" : "bg-slate-800/90 border-slate-600/60 hover:bg-slate-700"
                      }`}
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
                {venue === "both" && <div className="mt-2 text-xs text-emerald-300">BOTH = DEX + CEX (crypto only)</div>}
                {venue === "bundle" && <div className="mt-2 text-xs text-emerald-300">BUNDLE = DEX + CEX + STOCKS</div>}
                {venue === "dex" && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {["ethereum", "polygon", "base", "optimism", "arbitrum", "bsc"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setChain(c)}
                        className={`rounded-full px-3 py-1 border ${
                          chain === c ? "bg-emerald-600 border-emerald-400" : "bg-slate-800/90 border-slate-600/60 hover:bg-slate-700"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </FieldCard>

              {/* Crypto strategy */}
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
                          onChange={(e) => setParams((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                          className="w-full border border-slate-600/60 rounded bg-slate-950 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </FieldCard>
              )}

              {/* Stocks strategy controls */}
              {(venue === "stocks" || venue === "bundle") && (
                <FieldCard title="Stocks Strategy (Step 2)" help="Uses a Fast/Slow Average crossover with RSI filter.">
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

              {/* Starting balance + symbols */}
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
                  <div className="mt-2 text-xs text-slate-400">Demo stocks use the basket above. Remote API may support custom lists.</div>
                )}
              </FieldCard>

              {/* Stocks realism controls */}
              {(venue === "stocks" || venue === "bundle") && (
                <FieldCard title="Execution & Market Feel" help="Make fills more/less realistic.">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <LabeledNumber label="Fees (bps)" value={feeBps} setValue={setFeeBps} min={0} />
                    <LabeledNumber label="Spread (bps)" value={spreadBps} setValue={setSpreadBps} min={0} />
                    <LabeledNumber label="Slippage (bps)" value={slipBps} setValue={setSlipBps} min={0} />
                    <LabeledNumber label="Fill Delay (ms)" value={latencyMs} setValue={setLatencyMs} min={0} />
                    <LabeledNumber label="Drift (bps/bar)" value={driftBps} setValue={setDriftBps} />
                    <LabeledNumber label="Surprise Jumps (0–1)" value={shockProb} setValue={setShockProb} step={0.001} min={0} max={1} />
                    <LabeledNumber label="Trend Regime (0–1)" value={trendProb} setValue={setTrendProb} step={0.01} min={0} max={1} />
                  </div>
                </FieldCard>
              )}

              {/* How to Start (new) */}
              <FieldCard title="How to Start" help="Follow these quick steps to see the demo moving.">
                <ol className="list-decimal pl-5 space-y-1 text-[13px] text-slate-200">
                  <li>Pick <b>Where to trade</b> (DEX, CEX, BOTH, STOCKS, or BUNDLE).</li>
                  <li>Set your <b>Strategy</b> and <b>Starting Balance</b>.</li>
                  <li>Click <b>Start {usingDemo ? "Demo" : "Live"}</b>.</li>
                  <li>Then click <b>Auto run</b> (top-right) to stream ticks automatically every ~4s.</li>
                </ol>
                <div className="mt-2 text-xs text-slate-400">
                  Tip: Use <b>Tick once</b> to advance manually; switch back to <b>Auto run</b> anytime.
                </div>
              </FieldCard>
            </div>

            {/* IMALI take-rate simulation */}
            <FieldCard title="IMALI Discount Simulator" help="More IMALI → lower take rate → higher net PnL. Toggle to apply to display.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs mb-1">Add IMALI (simulation)</div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="100"
                    value={addImali}
                    onChange={(e) => setAddImali(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400 mt-1">
                    <span>+{addImali} IMALI</span>
                    <span>
                      Tier → <b>{simulatedTier.name}</b> ({(simulatedTier.takeRate * 100).toFixed(0)}% take)
                    </span>
                  </div>
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" checked={applyNetToDisplay} onChange={(e) => setApplyNetToDisplay(e.target.checked)} />
                    Apply to Net PnL display
                  </label>
                </div>
                <div className="text-xs text-slate-300">
                  Current Tier: <b>{activeTier.name}</b> ({(activeTier.takeRate * 100).toFixed(0)}% take)
                  <br />
                  Simulated Tier: <b>{simulatedTier.name}</b> ({(simulatedTier.takeRate * 100).toFixed(0)}% take)
                </div>
              </div>
            </FieldCard>

            {/* Start */}
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

            {/* Post-start nudge */}
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
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 sm:gap-3">
              <Stat label="Equity" value={`$${Number((combined?.equity || 0) + simPnL).toFixed(2)}`} tip="Balance + PnL" />
              <Stat label="Cash balance" value={`$${Number(combined?.balance || 0).toFixed(2)}`} />
              <Stat label="Gross PnL" value={`${gross >= 0 ? "+" : "-"}$${Math.abs(gross).toFixed(2)}`} />
              <Stat label={`Net PnL (${(takeRate * 100).toFixed(0)}% take)`} value={`${net >= 0 ? "+" : "-"}$${Math.abs(net).toFixed(2)}`} />
              <Stat label="Wins • Losses" value={`${combined?.wins || 0} • ${combined?.losses || 0}`} />
              <Stat label="XP • Streak" value={`${xp} ⭐ / ${streak} 🔥`} />
              <Stat label="Coins" value={`${coins} 🪙`} />
            </div>

            {/* Live controls */}
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
                <Button onClick={stopAuto} variant="ghost">
                  Stop
                </Button>
              </div>
            </div>

            {/* Manual stocks trade (local sim) */}
            {stocksSess && !stocksSess.remote && (
              <div className="rounded-xl border border-slate-600/60 bg-slate-900/90 p-3">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="font-semibold">Manual Stocks Trade:</span>
                  <span className="text-slate-300">{sim.symbols.slice(0, 3).join(", ")}… (basket)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      sim.symbols.slice(0, 3).forEach((sym) =>
                        sim.exec(sym, "BUY", Math.max(1, stockTradeUnits), { feeBps, spreadBps, slipBps, latencyMs })
                      );
                    }}
                    variant="solid"
                  >
                    Buy {stockTradeUnits} each (top 3)
                  </Button>
                  <Button
                    onClick={() => {
                      sim.symbols.slice(0, 3).forEach((sym) =>
                        sim.exec(sym, "SELL", Math.max(1, stockTradeUnits), { feeBps, spreadBps, slipBps, latencyMs })
                      );
                    }}
                    variant="ghost"
                  >
                    Sell {stockTradeUnits} each (top 3)
                  </Button>
                </div>
              </div>
            )}

            {/* Last trade indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card title="Last CEX Trade" tip="Most recent CEX trade impact">
                <div className="text-sm">
                  {lastCex ? (
                    <span>
                      {lastCex.sym || lastCex.symbol || "CEX"} • ΔPnL:{" "}
                      <b className={`${(lastCex.pnlDelta || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {(lastCex.pnlDelta >= 0 ? "+" : "")}${Number(lastCex.pnlDelta || 0).toFixed(2)}
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
                        {(lastDex.pnlDelta >= 0 ? "+" : "")}${Number(lastDex.pnlDelta || 0).toFixed(2)}
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
                        {(lastStocks.pnlDelta >= 0 ? "+" : "")}${Number(lastStocks.pnlDelta || 0).toFixed(2)}
                      </b>
                    </span>
                  ) : (
                    <span className="text-slate-300">No Stocks trades yet.</span>
                  )}
                </div>
              </Card>
            </div>

            {/* Trade Tape */}
            <Card title="Trade Tape (live)" tip="Dots are trades in time order. Newer ones show symbol.">
              <div className="h-10 w-full rounded-xl border border-slate-600/60 bg-slate-950 overflow-hidden">
                <svg viewBox="0 0 400 40" className="w-full h-full">
                  <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" className="text-slate-400/40" strokeWidth="1" />
                  {tapeMarks.map((m, i) => (
                    <g
                      key={i}
                      className={
                        m.venue === "DEX" ? "text-emerald-300" : m.venue === "CEX" ? "text-sky-300" : "text-yellow-300"
                      }
                    >
                      <circle cx={m.x} cy={m.y} r="3" fill="currentColor" />
                      {i > tapeMarks.length * 0.75 && m.sym && (
                        <text x={m.x + 4} y={m.y - 4} fontSize="9.5" className="fill-current">
                          {m.sym}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                Markers: <span className="text-sky-300">★</span> take-profit, <span className="text-rose-300">▽</span> honeypot
              </div>
            </Card>

            {/* Overview dashboard (equity curve + positions + stats) */}
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

            {/* Result banner */}
            <div className="p-3 rounded-xl border border-amber-600 bg-amber-400 text-black text-sm sm:text-base">
              <span className="font-semibold">{usingDemo ? "Demo" : "Live"} result so far:</span>{" "}
              <b>
                Gross {gross >= 0 ? "+" : "-"}${Math.abs(gross).toFixed(2)} • Net ({(takeRate * 100).toFixed(0)}% take){" "}
                {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(2)}
              </b>
              <span className="ml-1">• After Start, click <b>Auto run</b> to stream ticks ⭐</span>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade overlay */}
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

  const cryptoLabel = includesCrypto(venue)
    ? cryptoLive ? "CRYPTO • LIVE" : "CRYPTO • DEMO"
    : null;

  const stocksLabel = (venue === "stocks" || venue === "bundle")
    ? stocksLive ? "STOCKS • LIVE" : (stocksSess?.remote ? "STOCKS • DEMO API" : "STOCKS • LOCAL SIM")
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {cryptoLabel && <Badge color={cryptoLive ? "emerald" : "slate"} text={cryptoLabel} />}
      {stocksLabel && <Badge color={stocksLive ? "emerald" : (stocksSess?.remote ? "sky" : "slate")} text={stocksLabel} />}
      <span className="text-[11px] text-slate-400">
        {includesCrypto(venue) && <>Crypto base: <code className="text-slate-300">{apiBase}</code></>}
        {(venue === "stocks" || venue === "bundle") && (
          <>
            {" "}{stocksLive ? "• Stocks live API" : stockDemoApi ? "• Stocks demo API" : "• Stocks local sim"}
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
        <div className="text-sm font-semibold text.white">{title}</div>
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
      <span className={`px-2 py-1 rounded border ${!isLive ? "border-emerald-400 text-emerald-300 bg-emerald-900/30" : "border-slate-600 text-slate-300"}`}>
        DEMO
      </span>
      <label className="relative inline-flex cursor-pointer items-center" title="Toggle Demo / Live">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isLive}
          onChange={(e) => {
            const nextIsLive = e.target.checked;
            // ❗ Gate Live if venue includes crypto and user isn't eligible
            if (nextIsLive && includesCrypto(venue) && !isLiveEligible) {
              onUpgrade?.();
              return;
            }
            setRunMode(nextIsLive ? "live" : "demo");
          }}
        />
        <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:bg-emerald-600" />
      </label>
      <span className={`px-2 py-1 rounded border ${isLive ? "border-emerald-400 text-emerald-300 bg-emerald-900/30" : "border-slate-600 text-slate-300"}`}>
        LIVE
      </span>
    </div>
  );
}
function StepHint({ children, highlight = false }) {
  return (
    <span
      className={`hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
        highlight ? "border-emerald-400 bg-emerald-500/20 text-emerald-100" : "border-slate-300/30 bg-slate-200/10 text-slate-100"
      }`}
    >
      {children}
    </span>
  );
}
function LabeledNumber({ label, value, setValue, step = 1, min, max }) {
  return (
    <label>
      {label}
      <input
        type="number"
        step={step}
        min={min ?? undefined}
        max={max ?? undefined}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full mt-1 border border-slate-600/60 rounded bg-slate-950 px-2 py-1 text-xs"
      />
    </label>
  );
}