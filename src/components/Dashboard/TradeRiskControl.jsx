import React, { useCallback, useEffect, useState } from "react";
import BotAPI from "../../utils/BotAPI";

const MIN_TRADE = 5;
const MAX_TRADE = 1000;
const STEP = 5;
const DEFAULT_TRADE = 100;

const numberValue = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function TradeRiskControl() {
  const [maxTradeUsd, setMaxTradeUsd] = useState(DEFAULT_TRADE);
  const [savedTradeUsd, setSavedTradeUsd] = useState(DEFAULT_TRADE);
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    win_rate: 0,
    total_pnl: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [riskResponse, statsResponse] = await Promise.allSettled([
        BotAPI.getTradingRiskSettings(),
        BotAPI.getRealTradingStats(30),
      ]);

      if (riskResponse.status === "fulfilled") {
        const risk =
          riskResponse.value?.data ||
          riskResponse.value ||
          {};

        const value = Math.max(
          MIN_TRADE,
          Math.min(
            MAX_TRADE,
            numberValue(risk.max_trade_usd, DEFAULT_TRADE)
          )
        );

        setMaxTradeUsd(value);
        setSavedTradeUsd(value);
      }

      if (statsResponse.status === "fulfilled") {
        const payload =
          statsResponse.value?.data ||
          statsResponse.value ||
          {};

        const summary = payload.summary || payload;

        setStats({
          wins: numberValue(summary.wins),
          losses: numberValue(summary.losses),
          win_rate: numberValue(summary.win_rate),
          total_pnl: numberValue(summary.total_pnl),
        });
      }
    } catch (error) {
      console.warn("Unable to load trade control:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 15000);

    return () => clearInterval(timer);
  }, [loadData]);

  const handleSave = async () => {
    const value = Math.max(
      MIN_TRADE,
      Math.min(MAX_TRADE, numberValue(maxTradeUsd, DEFAULT_TRADE))
    );

    setSaving(true);
    setMessage("");

    try {
      const response =
        await BotAPI.updateTradingRiskSettings(value);

      const payload =
        response?.data ||
        response ||
        {};

      const saved = Math.max(
        MIN_TRADE,
        Math.min(
          MAX_TRADE,
          numberValue(payload.max_trade_usd, value)
        )
      );

      setMaxTradeUsd(saved);
      setSavedTradeUsd(saved);

      setMessage(
        `Saved. IMALI can use up to $${saved.toFixed(
          0
        )} per trade.`
      );
    } catch (error) {
      console.error("Trade-size save failed:", error);
      setMessage("Unable to save trade amount.");
    } finally {
      setSaving(false);
    }
  };

  const changed =
    Number(maxTradeUsd) !== Number(savedTradeUsd);

  const pnl = numberValue(stats.total_pnl);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Max Amount Per Trade
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Set the most IMALI may use for one trade.
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-900">
                ${numberValue(maxTradeUsd).toFixed(0)}
              </div>

              <div className="text-xs text-slate-500">
                maximum
              </div>
            </div>
          </div>

          <div className="mt-5">
            <input
              type="range"
              min={MIN_TRADE}
              max={MAX_TRADE}
              step={STEP}
              value={maxTradeUsd}
              disabled={loading || saving}
              onChange={(e) =>
                setMaxTradeUsd(Number(e.target.value))
              }
              className="w-full cursor-pointer accent-orange-500"
              aria-label="Maximum amount per trade"
            />

            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>${MIN_TRADE}</span>
              <span>${MAX_TRADE.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            IMALI may trade <strong>up to ${numberValue(maxTradeUsd).toFixed(0)}</strong>.
            Actual trade size can be smaller based on your strategy,
            available buying power, market conditions, and IMALI risk controls.
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!changed || loading || saving}
              className={
                "min-h-[44px] rounded-xl px-5 py-2 text-sm font-bold transition " +
                (
                  changed && !saving
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                )
              }
            >
              {saving ? "Saving..." : "Save Trade Limit"}
            </button>

            {message && (
              <span
                className="text-sm text-slate-600"
                aria-live="polite"
              >
                {message}
              </span>
            )}
          </div>
        </div>


        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[470px]">

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Wins
            </div>

            <div className="mt-1 text-xl font-extrabold text-emerald-600">
              {stats.wins}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Losses
            </div>

            <div className="mt-1 text-xl font-extrabold text-red-600">
              {stats.losses}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Win Rate
            </div>

            <div className="mt-1 text-xl font-extrabold text-slate-900">
              {numberValue(stats.win_rate).toFixed(1)}%
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Live P/L
            </div>

            <div
              className={
                "mt-1 text-xl font-extrabold " +
                (
                  pnl > 0
                    ? "text-emerald-600"
                    : pnl < 0
                    ? "text-red-600"
                    : "text-slate-900"
                )
              }
            >
              {pnl > 0 ? "+" : ""}
              ${pnl.toFixed(2)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
