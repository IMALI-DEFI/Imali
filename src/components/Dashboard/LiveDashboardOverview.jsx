import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaChartLine,
  FaWallet,
  FaCoins,
  FaTrophy,
  FaTimesCircle,
  FaPercentage,
  FaRobot,
  FaSpinner,
  FaSyncAlt,
} from "react-icons/fa";
import BotAPI from "../../utils/BotAPI";
import CandlestickChart from "../charts/CandlestickChart";

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
  num(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const priceMoney = (value) => {
  const n = num(value);

  if (n === 0) return "$0.00";

  // High-price assets: standard cents.
  if (Math.abs(n) >= 1) {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Small crypto prices need more precision, but not 10+ decimals.
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
};

const unwrap = (response) => {
  let value = response;
  for (let i = 0; i < 4; i += 1) {
    if (
      value &&
      typeof value === "object" &&
      "data" in value &&
      value.data !== value
    ) {
      value = value.data;
    } else {
      break;
    }
  }
  return value || {};
};

const cleanBaseSymbol = (symbol) =>
  String(symbol || "")
    .toUpperCase()
    .replace("/", "-")
    .split("-")[0];

const isCashSymbol = (symbol) =>
  [
    "USD",
    "USDT",
    "USDC",
    "USDG",
    "FDUSD",
    "DAI",
    "TUSD",
    "PYUSD",
  ].includes(cleanBaseSymbol(symbol));

const candleSymbol = (base, exchange) => {
  const coin = cleanBaseSymbol(base);

  if (!coin) return "";

  if (exchange === "alpaca") return coin;
  if (exchange === "robinhood") return `${coin}-USD`;

  return `${coin}-USDT`;
};

const StatCard = ({
  icon,
  label,
  value,
  detail,
  tone = "",
  help = "",
}) => (
  <div
    title={help || `${label}: ${detail || value}`}
    className="rounded-2xl border border-white/10 bg-black/25 p-4 min-w-0 overflow-hidden cursor-help"
  >
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs sm:text-sm font-semibold text-white/45">
        {label}
      </p>
      <span className="text-cyan-300">{icon}</span>
    </div>

    <p
      className={`mt-2 text-lg sm:text-2xl font-black truncate tabular-nums ${tone}`}
      title={String(value)}
    >
      {value}
    </p>

    {detail ? (
      <p className="mt-1 text-[10px] sm:text-xs text-white/35 truncate">
        {detail}
      </p>
    ) : null}
  </div>
);

const ScanCard = ({ scan }) => {
  const symbol =
    scan?.symbol ||
    scan?.instrument ||
    scan?.pair ||
    scan?.ticker ||
    scan?.market ||
    "Unknown";

  const recommendation = String(
    scan?.recommendation ||
      scan?.decision ||
      scan?.action ||
      scan?.signal ||
      "SCANNING"
  ).toUpperCase();

  const score = num(
    scan?.score ??
      scan?.ai_score ??
      scan?.aiScore ??
      scan?.overall_score ??
      scan?.overallScore
  );

  const confidence = num(
    scan?.confidence ??
      scan?.confidence_score ??
      scan?.confidenceScore
  );

  const risk = scan?.risk || scan?.risk_level || scan?.riskLevel;

  return (
    <div
      title="Live market candidate currently being evaluated by IMALI."
      className="rounded-2xl border border-cyan-400/15 bg-black/25 p-4 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black text-white">{symbol}</p>
          <p className="text-xs text-white/35">Current scan</p>
        </div>

        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
          {recommendation}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/[0.04] p-2">
          <p className="text-[10px] text-white/35">AI Score</p>
          <p className="font-black">
            {score > 0 ? score.toFixed(1) : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.04] p-2">
          <p className="text-[10px] text-white/35">Confidence</p>
          <p className="font-black">
            {confidence > 0 ? `${confidence.toFixed(1)}%` : "—"}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.04] p-2">
          <p className="text-[10px] text-white/35">Risk</p>
          <p className="font-black capitalize">{risk || "—"}</p>
        </div>
      </div>
    </div>
  );
};


const NON_CHARTABLE_ASSETS = new Set([
  "USD",
  "USDT",
  "USDC",
  "USDG",
  "DAI",
  "FDUSD",
  "TUSD",
  "PYUSD"
]);

const normalizeOkxChartSymbol = (value = "") => {
  let symbol = String(value || "")
    .trim()
    .toUpperCase()
    .replace("/", "-");

  if (!symbol) return "";

  if (symbol.endsWith("-USD")) {
    symbol = symbol.replace(/-USD$/, "-USDT");
  }

  if (!symbol.includes("-")) {
    if (NON_CHARTABLE_ASSETS.has(symbol)) return "";
    symbol = `${symbol}-USDT`;
  }

  const [base, quote] = symbol.split("-");

  if (!base || NON_CHARTABLE_ASSETS.has(base)) {
    return "";
  }

  if (quote === "USD") {
    return `${base}-USDT`;
  }

  if (quote !== "USDT") {
    return "";
  }

  return `${base}-USDT`;
};

const isChartableOkxAsset = (value = "") =>
  Boolean(normalizeOkxChartSymbol(value));

export default function LiveDashboardOverview({
  exchange = "okx",
  exchangeLabel = "Trading Account",
  botRunning = false,
}) {
  const [balance, setBalance] = useState({});
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState({});
  const [scans, setScans] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState("");
  const [candles, setCandles] = useState([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [maxTradeUsd, setMaxTradeUsd] = useState(100);
  const [savedMaxTradeUsd, setSavedMaxTradeUsd] = useState(100);
  const [savingRisk, setSavingRisk] = useState(false);

  const normalizedAssets = useMemo(() => {
    let raw = [];

    if (exchange === "robinhood") {
      raw = Array.isArray(balance.robinhood_assets)
        ? balance.robinhood_assets
        : Array.isArray(balance.assets)
        ? balance.assets
        : [];
    } else if (exchange === "okx") {
      raw = Array.isArray(balance.okx_assets)
        ? balance.okx_assets
        : Array.isArray(balance.assets)
        ? balance.assets
        : [];
    } else if (exchange === "alpaca") {
      raw = Array.isArray(balance.alpaca_assets)
        ? balance.alpaca_assets
        : Array.isArray(balance.assets)
        ? balance.assets
        : [];
    } else {
      raw = Array.isArray(balance.assets) ? balance.assets : [];
    }

    return raw
      .map((asset) => {
        const symbol =
          asset.ccy ||
          asset.currency ||
          asset.symbol ||
          asset.asset ||
          asset.ticker ||
          "";

        const quantity = num(
          asset.available ??
            asset.amount ??
            asset.balance ??
            asset.bal ??
            asset.qty ??
            asset.quantity
        );

        const value = num(
          asset.usdValue ??
            asset.usd_value ??
            asset.value ??
            asset.totalUsd ??
            asset.total_usd ??
            asset.eqUsd ??
            asset.market_value
        );

        return {
          ...asset,
          symbol: cleanBaseSymbol(symbol),
          quantity,
          value,
        };
      })
      .filter((asset) => asset.symbol);
  }, [balance, exchange]);

  const heldCoins = useMemo(() => {
    const symbols = new Set();

    normalizedAssets.forEach((asset) => {
      if (
        !isCashSymbol(asset.symbol) &&
        (asset.quantity > 0 || asset.value > 0)
      ) {
        symbols.add(cleanBaseSymbol(asset.symbol));
      }
    });

    positions.forEach((position) => {
      const symbol = cleanBaseSymbol(
        position.symbol ||
          position.instrument ||
          position.pair ||
          position.ticker
      );

      if (symbol && !isCashSymbol(symbol)) symbols.add(symbol);
    });

    return Array.from(symbols);
  }, [normalizedAssets, positions]);

  const buyingPower = useMemo(() => {
    if (exchange === "robinhood") {
      return num(
        balance.robinhood_buying_power ??
            balance.robinhood_available_usd ??
          balance.buying_power ??
          balance.cash
      );
    }

    if (exchange === "okx") {
      return num(
        balance.okx_available_usdt ??
          balance.available_usdt ??
          balance.usdt_available ??
          balance.cash
      );
    }

    if (exchange === "alpaca") {
      return num(
        balance.alpaca_available_usd ??
          balance.alpaca_cash ??
          balance.cash ??
          balance.buying_power
      );
    }

    return num(balance.cash ?? balance.buying_power);
  }, [balance, exchange]);

  const walletValue = useMemo(() => {
    if (exchange === "robinhood") {
      return (
        num(
          balance.robinhood_total ??
            balance.portfolio_value ??
            balance.total
        ) ||
        buyingPower +
          normalizedAssets.reduce((sum, a) => sum + num(a.value), 0)
      );
    }

    if (exchange === "okx") {
      return (
        num(balance.okx_total ?? balance.okx ?? balance.total) ||
        buyingPower +
          normalizedAssets.reduce((sum, a) => sum + num(a.value), 0)
      );
    }

    if (exchange === "alpaca") {
      return (
        num(
          balance.alpaca_total ??
            balance.alpaca_equity ??
            balance.alpaca ??
            balance.total
        ) ||
        buyingPower +
          normalizedAssets.reduce((sum, a) => sum + num(a.value), 0)
      );
    }

    return num(balance.total ?? balance.total_value);
  }, [balance, buyingPower, exchange, normalizedAssets]);

  const wins = num(stats.wins);
  const losses = num(stats.losses);
  const closedTrades =
    wins + losses ||
    num(stats.closed_trades ?? stats.closedTrades);

  const totalTrades = num(
    stats.total_trades ??
      stats.totalTrades ??
      closedTrades
  );

  const livePnl = num(
    stats.total_pnl ??
      stats.totalPnl ??
      stats.realized_pnl ??
      stats.realizedPnl
  );

  const winRate =
    wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const loadOverview = useCallback(async () => {
    setLoading(true);

    try {
      const requests = [
        BotAPI.getExchangeBalance?.(true),
        BotAPI.getOpenPositions?.(exchange, true),
        BotAPI.getLiveTradingStats?.(exchange, true),
        BotAPI.getTradingBotStatus?.(true),
      ];

      const riskSupported =
        typeof BotAPI.getTradingRiskSettings === "function";

      if (riskSupported) {
        requests.push(BotAPI.getTradingRiskSettings());
      }

      const results = await Promise.allSettled(requests);

      if (results[0]?.status === "fulfilled") {
        setBalance(unwrap(results[0].value));
      }

      if (results[1]?.status === "fulfilled") {
        const data = unwrap(results[1].value);
        const list =
          data.positions ||
          data.openPositions ||
          data.data ||
          [];

        setPositions(Array.isArray(list) ? list : []);
      }

      if (results[2]?.status === "fulfilled") {
        const data = unwrap(results[2].value);
        setStats(data.summary || data || {});
      }

      if (results[3]?.status === "fulfilled") {
        const raw = unwrap(results[3].value);

        const bots = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.data)
          ? raw.data
          : [raw];

        const running =
          bots.find(
            (b) =>
              b?.isRunning === true ||
              b?.status === "running" ||
              b?.active === true
          ) ||
          bots[0] ||
          {};

        // IMPORTANT:
        // NO SAMPLE / RANDOM SCANS.
        // Only render what the backend actually reports.
        const scanCandidates = [
          running.scan_results,
          running.scanResults,
          running.scans,
          running.current_scans,
          running.currentScans,
          running.candidates,
          running.current_candidates,
          running.currentCandidates,
          raw.scan_results,
          raw.scanResults,
          raw.scans,
          raw.current_scans,
          raw.currentScans,
          raw.candidates,
        ];

        let actualScans =
          scanCandidates.find(Array.isArray) || [];

        if (!actualScans.length) {
          const single =
            running.current_scan ||
            running.currentScan ||
            running.scanning ||
            raw.current_scan ||
            raw.currentScan ||
            raw.scanning;

          if (single && typeof single === "object") {
            actualScans = [single];
          } else if (typeof single === "string" && single.trim()) {
            actualScans = [{ symbol: single, action: "scanning" }];
          }
        }

        setScans(actualScans.slice(0, 12));
      }

      if (
        riskSupported &&
        results[4]?.status === "fulfilled"
      ) {
        const risk = unwrap(results[4].value);
        const current = num(
          risk.max_trade_usd ??
            risk.maxTradeUsd ??
            risk.max_trade_amount
        );

        if (current > 0) {
          setMaxTradeUsd(current);
          setSavedMaxTradeUsd(current);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    loadOverview();

    const timer = window.setInterval(loadOverview, 10000);
    return () => window.clearInterval(timer);
  }, [loadOverview]);

  const chartableHeldCoins = useMemo(
    () =>
      heldCoins.filter((coin) => {
        const value =
          coin?.symbol ||
          coin?.asset ||
          coin?.currency ||
          coin;

        if (!value) return false;

        if (exchange === "okx") {
          return (
            !isCashSymbol(value) &&
            isChartableOkxAsset(value)
          );
        }

        return !isCashSymbol(value);
      }),
    [heldCoins, exchange]
  );

  useEffect(() => {
    if (
      chartableHeldCoins.length &&
      (
        !selectedCoin ||
        !chartableHeldCoins.includes(selectedCoin)
      )
    ) {
      setSelectedCoin(chartableHeldCoins[0]);
      setCandles([]);
      return;
    }

    if (!chartableHeldCoins.length) {
      setSelectedCoin("");
      setCandles([]);
    }
  }, [chartableHeldCoins, selectedCoin]);

  useEffect(() => {
    if (!selectedCoin) return undefined;

    let active = true;

    const loadCandles = async () => {
      setCandlesLoading(true);

      try {
        const symbol = candleSymbol(selectedCoin, exchange);

        const response = await BotAPI.getMarketCandles?.({
          exchange,
          symbol,
          timeframe: "1m",
          limit: 100,
        });

        if (!active) return;

        const data = unwrap(response);
        const raw = data.candles || data.data || [];

        const formatted = (Array.isArray(raw) ? raw : [])
          .map((candle) => {
            const rawTime =
              candle.time ??
              candle.timestamp ??
              candle.ts ??
              candle.created_at;

            let time;

            if (typeof rawTime === "number") {
              time =
                rawTime > 100000000000
                  ? Math.floor(rawTime / 1000)
                  : Math.floor(rawTime);
            } else {
              time = Math.floor(new Date(rawTime).getTime() / 1000);
            }

            return {
              time,
              open: num(candle.open ?? candle.o),
              high: num(candle.high ?? candle.h),
              low: num(candle.low ?? candle.l),
              close: num(candle.close ?? candle.c),
            };
          })
          .filter(
            (c) =>
              c.time &&
              c.open > 0 &&
              c.high > 0 &&
              c.low > 0 &&
              c.close > 0
          )
          .sort((a, b) => a.time - b.time);

        setCandles(formatted);
      } catch (error) {
        console.warn(
          `Could not load candles for ${selectedCoin}:`,
          error
        );

        if (active) setCandles([]);
      } finally {
        if (active) setCandlesLoading(false);
      }
    };

    loadCandles();

    const timer = window.setInterval(loadCandles, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [exchange, selectedCoin]);

  const saveMaxTrade = async () => {
    if (
      typeof BotAPI.updateTradingRiskSettings !== "function"
    ) {
      return;
    }

    try {
      setSavingRisk(true);
      await BotAPI.updateTradingRiskSettings(maxTradeUsd);
      setSavedMaxTradeUsd(maxTradeUsd);
    } catch (error) {
      console.error("Unable to save max trade amount:", error);
    } finally {
      setSavingRisk(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ====================================================
          LIVE ACCOUNT STAT CARDS
          ==================================================== */}
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black">
              Live Account Stats
            </h2>
            <p className="text-xs sm:text-sm text-white/40">
              {exchangeLabel} • real account and trading data
            </p>
          </div>

          <button
            type="button"
            onClick={loadOverview}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-white/10"
          >
            {loading ? (
              <FaSpinner className="mr-2 inline animate-spin" />
            ) : (
              <FaSyncAlt className="mr-2 inline" />
            )}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<FaWallet />}
            label="Wallet Value"
            value={money(walletValue)}
            detail={exchangeLabel}
            help="Total estimated value of cash and assets in this connected trading account."
          />

          <StatCard
            icon={<FaWallet />}
            label="Buying Power"
            value={money(buyingPower)}
            detail="Available to trade"
            help="Funds currently available for new trades. This may be lower than total wallet value when money is already invested."
          />

          <StatCard
            icon={<FaCoins />}
            label="Holdings"
            value={heldCoins.length.toLocaleString()}
            help="Number of non-cash assets currently detected in your connected account."
            detail={
              heldCoins.length
                ? heldCoins.join(", ")
                : "No coin holdings"
            }
          />

          <StatCard
            icon={<FaRobot />}
            label="Open Positions"
            value={positions.length.toLocaleString()}
            help="Trades IMALI currently considers open and still subject to exit management."
            detail={
              botRunning ? "Bot running" : "Bot stopped"
            }
          />

          <StatCard
            icon={<FaTrophy />}
            label="Wins"
            value={wins.toLocaleString()}
            help="Closed live trades with positive realized P/L."
            detail={`${totalTrades.toLocaleString()} total trades`}
            tone="text-emerald-300"
          />

          <StatCard
            icon={<FaTimesCircle />}
            label="Losses"
            value={losses.toLocaleString()}
            help="Closed live trades with negative realized P/L."
            detail={`${closedTrades.toLocaleString()} closed trades`}
            tone="text-red-300"
          />

          <StatCard
            icon={<FaPercentage />}
            label="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            help="Winning closed live trades divided by wins plus losses."
            detail="Closed live trades"
          />

          <StatCard
            icon={<FaChartLine />}
            label="Live P/L"
            value={
              livePnl === 0
                ? money(0)
                : `${livePnl > 0 ? "+" : ""}${money(livePnl)}`
            }
            help="Realized P/L from completed live trades. Open-position gains and losses are not counted here."
            detail="Realized trading P/L"
            tone={
              livePnl >= 0
                ? "text-emerald-300"
                : "text-red-300"
            }
          />
        </div>
      </section>

      {/* ====================================================
          MAX TRADE CONTROL
          ==================================================== */}
      <section
        title="Sets the maximum dollars IMALI may use for one trade. Strategy and risk logic may choose a smaller amount."
        className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black">
              Max Amount Per Trade
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-white/45">
              Hard ceiling for one trade. IMALI can use less based on
              strategy, balance, market conditions and risk.
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-black text-cyan-300">
              {money(maxTradeUsd)}
            </p>
            <p className="text-[10px] text-white/35">
              Saved: {money(savedMaxTradeUsd)}
            </p>
          </div>
        </div>

        <input
          type="range"
          title="Maximum dollars allowed for a single IMALI trade."
          aria-label="Maximum amount per trade"
          min="5"
          max="1000"
          step="5"
          value={maxTradeUsd}
          onChange={(e) => setMaxTradeUsd(Number(e.target.value))}
          className="mt-5 w-full"
        />

        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>$5</span>
          <span>$1,000</span>
        </div>

        {typeof BotAPI.updateTradingRiskSettings === "function" && (
          <button
            type="button"
            disabled={
              savingRisk || maxTradeUsd === savedMaxTradeUsd
            }
            onClick={saveMaxTrade}
            className="mt-4 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            {savingRisk ? (
              <>
                <FaSpinner className="mr-2 inline animate-spin" />
                Saving
              </>
            ) : (
              "Save Trade Limit"
            )}
          </button>
        )}
      </section>

      {/* ====================================================
          HELD COIN CANDLE CHART
          ==================================================== */}
      <section className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FaChartLine className="text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-black">
                Held Coin Market
              </h2>
            </div>

            <p className="mt-1 text-xs text-white/40">
              Candle chart follows coins actually held in this account.
            </p>
          </div>

          {chartableHeldCoins.length > 0 && (
            <select
              value={selectedCoin}
              onChange={(e) => {
                setSelectedCoin(e.target.value);
                setCandles([]);
              }}
              className="rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-sm font-black text-white"
            >
              {chartableHeldCoins.map((coin) => (
                <option key={coin} value={coin}>
                  {coin}
                </option>
              ))}
            </select>
          )}
        </div>

        {!chartableHeldCoins.length ? (
          <div className="grid h-[260px] place-items-center rounded-2xl border border-white/10 bg-black/25 text-center">
            <div>
              <FaCoins className="mx-auto mb-3 text-3xl text-white/20" />
              <p className="font-black text-white/60">
                No held coins detected
              </p>
              <p className="mt-1 text-xs text-white/30">
                The chart will appear when this account has a crypto holding.
              </p>
            </div>
          </div>
        ) : candlesLoading ? (
          <div className="grid h-[320px] place-items-center rounded-2xl bg-black/25">
            <FaSpinner className="animate-spin text-3xl text-cyan-300" />
          </div>
        ) : candles.length ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="font-black">
                {candleSymbol(selectedCoin, exchange)}
              </p>
              <span className="text-xs text-emerald-300">
                ● LIVE
              </span>
            </div>

            <CandlestickChart
              data={candles}
              liveCandle={candles[candles.length - 1]}
              height={360}
            />
          </div>
        ) : (
          <div className="grid h-[320px] place-items-center rounded-2xl bg-black/25 text-center text-white/40">
            Live candle data unavailable for {selectedCoin}
          </div>
        )}
      </section>

      {/* ====================================================
          REAL CURRENT SCANS ONLY
          ==================================================== */}
      {scans.length > 0 && (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FaRobot className="text-cyan-300" />
            <div>
              <h3 className="text-xl font-black">
                Currently Scanning
              </h3>
              <p className="text-xs text-white/40">
                Only symbols returned by the live bot scanner are shown.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scans.map((scan, index) => (
              <ScanCard
                key={`${scan?.symbol || scan?.pair || "scan"}-${index}`}
                scan={scan}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
