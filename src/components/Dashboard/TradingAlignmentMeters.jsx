import React, { useCallback, useEffect, useMemo, useState } from "react";
import BotAPI from "../../utils/BotAPI";

const clamp = (n, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(n) || 0));

const extract = (message = "", key) => {
  const match = String(message).match(
    new RegExp(`(?:^|\\|\\s*)${key}=([^|]+)`, "i")
  );
  return match ? match[1].trim() : null;
};

const numberFrom = (message, key) => {
  const value = extract(message, key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAlignmentLabel = (score) => {
  if (score >= 85) return "STRONG ALIGNMENT";
  if (score >= 75) return "ALIGNED";
  if (score >= 60) return "WATCH";
  if (score >= 40) return "MIXED";
  return "WEAK";
};

const getPortfolioLabel = (score) => {
  if (score >= 85) return "STRONG PROFIT HEALTH";
  if (score >= 75) return "PROFITABLE";
  if (score >= 60) return "IMPROVING";
  if (score >= 40) return "MIXED";
  return "WEAK";
};

const money = (value) => {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
};

function Meter({ value, label, subtitle }) {
  const pct = clamp(value);

  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-4xl font-black tracking-tight text-white">
            {Math.round(pct)}
            <span className="ml-1 text-lg text-white/40">/100</span>
          </div>
          <div className="mt-1 text-xs font-black tracking-[0.18em] text-white/70">
            {label}
          </div>
        </div>

        {subtitle ? (
          <div className="max-w-[55%] text-right text-xs leading-relaxed text-white/50">
            {subtitle}
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/30">
        <span>Weak</span>
        <span>Mixed</span>
        <span>Watch</span>
        <span>Aligned</span>
        <span>Strong</span>
      </div>
    </div>
  );
}

function Metric({ label, value, status = "neutral" }) {
  const dot =
    status === "good"
      ? "bg-emerald-400"
      : status === "bad"
      ? "bg-rose-400"
      : status === "warn"
      ? "bg-amber-400"
      : "bg-white/30";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate text-sm text-white/55">{label}</span>
      </div>
      <span className="text-right text-sm font-bold text-white">{value}</span>
    </div>
  );
}

export default function TradingAlignmentMeters({
  exchange = "",
  running = false,
}) {
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [activityResult, statsResult] = await Promise.allSettled([
        BotAPI.getTradingActivity?.(exchange, 150),
        BotAPI.getRealTradingStats?.(exchange),
      ]);

      if (activityResult.status === "fulfilled") {
        const result = activityResult.value;
        const rows =
          result?.activity ||
          result?.data?.activity ||
          result?.data ||
          [];

        setActivity(Array.isArray(rows) ? rows : []);
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value || null);
      }
    } catch (err) {
      console.warn("Alignment meter load failed", err);
    } finally {
      setLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    load();

    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const decisions = useMemo(() => {
    return activity
      .filter((row) =>
        String(row?.message || "").includes("ROBINHOOD TOKEN DECISION")
      )
      .map((row) => {
        const message = row?.message || "";

        return {
          ...row,
          symbol:
            extract(message, "symbol") ||
            row?.symbol ||
            "Unknown",
          grade: extract(message, "grade") || "—",
          score: numberFrom(message, "score") || 0,
          confidence: numberFrom(message, "confidence") || 0,
          recommendation:
            extract(message, "recommendation") || "hold",
          qualified:
            String(extract(message, "qualified")).toLowerCase() === "true",
          reason: extract(message, "reason") || "",
        };
      });
  }, [activity]);

  const blocked = useMemo(() => {
    return activity.find((row) =>
      String(row?.message || "").includes("ROBINHOOD BUY BLOCKED")
    );
  }, [activity]);

  const best = useMemo(() => {
    if (!decisions.length) return null;

    return [...decisions].sort((a, b) => {
      if (a.qualified !== b.qualified) return a.qualified ? -1 : 1;
      return b.score - a.score;
    })[0];
  }, [decisions]);

  const opportunityAlignment = useMemo(() => {
    if (!best) return 0;

    const recommendationPoints =
      best.recommendation === "buy"
        ? 100
        : best.recommendation === "hold"
        ? 50
        : 10;

    return clamp(
      best.score * 0.45 +
        best.confidence * 0.35 +
        recommendationPoints * 0.2
    );
  }, [best]);

  const normalizedStats = useMemo(() => {
    const source =
      stats?.summary ||
      stats?.data?.summary ||
      stats?.data ||
      stats ||
      {};

    const wins = Number(
      source.wins ??
        source.winning_trades ??
        source.total_wins ??
        0
    );

    const losses = Number(
      source.losses ??
        source.losing_trades ??
        source.total_losses ??
        0
    );

    const closed = wins + losses;

    const winRateRaw =
      source.win_rate ??
      source.winRate ??
      (closed > 0 ? (wins / closed) * 100 : 0);

    const winRate =
      Number(winRateRaw) <= 1 && Number(winRateRaw) > 0
        ? Number(winRateRaw) * 100
        : Number(winRateRaw || 0);

    const realized = Number(
      source.pnl_usd ??
        source.realized_pnl ??
        source.realizedPnl ??
        source.total_pnl ??
        0
    );

    const open = Number(
      source.open_trades ??
        source.open_positions ??
        source.openPositions ??
        0
    );

    return {
      wins,
      losses,
      closed,
      winRate: clamp(winRate),
      realized,
      open,
    };
  }, [stats]);

  const portfolioAlignment = useMemo(() => {
    const { closed, winRate, realized } = normalizedStats;

    if (!closed) return realized > 0 ? 55 : 40;

    const sampleStrength = clamp((closed / 10) * 100);

    const pnlDirection =
      realized > 0 ? 100 : realized < 0 ? 10 : 50;

    return clamp(
      winRate * 0.5 +
        pnlDirection * 0.3 +
        sampleStrength * 0.2
    );
  }, [normalizedStats]);

  const buyCount = decisions.filter(
    (d) => d.recommendation === "buy"
  ).length;

  const holdCount = decisions.filter(
    (d) => d.recommendation === "hold"
  ).length;

  const sellCount = decisions.filter(
    (d) => d.recommendation === "sell"
  ).length;

  const qualifiedCount = decisions.filter(
    (d) => d.qualified
  ).length;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black sm:text-2xl">
              IMALI Alignment
            </h3>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider ${
                running
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-white/10 text-white/45"
              }`}
            >
              {running ? "LIVE" : "BOT STOPPED"}
            </span>
          </div>

          <p className="mt-1 max-w-2xl text-sm text-white/45">
            Visualizes current trading alignment and portfolio health.
            These are descriptive indicators, not profit guarantees.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* OPPORTUNITY */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="text-xs font-black tracking-[0.18em] text-white/40">
            OPPORTUNITY ALIGNMENT
          </div>

          <Meter
            value={opportunityAlignment}
            label={getAlignmentLabel(opportunityAlignment)}
            subtitle={
              best
                ? `${best.symbol} • Grade ${best.grade}`
                : loading
                ? "Analyzing market..."
                : "Waiting for token decisions"
            }
          />

          <div className="mt-4">
            <Metric
              label="Best Opportunity"
              value={best?.symbol || "Waiting"}
              status={best?.qualified ? "good" : "neutral"}
            />

            <Metric
              label="Grade"
              value={best?.grade || "—"}
              status={
                best?.score >= 70
                  ? "good"
                  : best?.score >= 50
                  ? "warn"
                  : "neutral"
              }
            />

            <Metric
              label="AI Score"
              value={
                best
                  ? best.score.toFixed(1)
                  : "—"
              }
            />

            <Metric
              label="Confidence"
              value={
                best
                  ? `${best.confidence.toFixed(1)}%`
                  : "—"
              }
              status={best?.confidence >= 70 ? "good" : "neutral"}
            />

            <Metric
              label="Recommendation"
              value={
                best?.recommendation
                  ? best.recommendation.toUpperCase()
                  : "—"
              }
              status={
                best?.recommendation === "buy"
                  ? "good"
                  : best?.recommendation === "sell"
                  ? "bad"
                  : "neutral"
              }
            />

            <Metric
              label="Signal Qualified"
              value={best?.qualified ? "YES" : "NO"}
              status={best?.qualified ? "good" : "neutral"}
            />

            <Metric
              label="Execution"
              value={blocked ? "BLOCKED" : best?.qualified ? "READY" : "WAIT"}
              status={blocked ? "warn" : best?.qualified ? "good" : "neutral"}
            />
          </div>
        </div>

        {/* PORTFOLIO */}
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="text-xs font-black tracking-[0.18em] text-white/40">
            PORTFOLIO PROFIT ALIGNMENT
          </div>

          <Meter
            value={portfolioAlignment}
            label={getPortfolioLabel(portfolioAlignment)}
            subtitle="Based on verified closed-trade results and realized P/L"
          />

          <div className="mt-4">
            <Metric
              label="Realized P/L"
              value={money(normalizedStats.realized)}
              status={
                normalizedStats.realized > 0
                  ? "good"
                  : normalizedStats.realized < 0
                  ? "bad"
                  : "neutral"
              }
            />

            <Metric
              label="Win Rate"
              value={`${normalizedStats.winRate.toFixed(1)}%`}
              status={
                normalizedStats.winRate >= 60
                  ? "good"
                  : normalizedStats.winRate > 0
                  ? "warn"
                  : "neutral"
              }
            />

            <Metric
              label="Wins"
              value={normalizedStats.wins}
              status={normalizedStats.wins > 0 ? "good" : "neutral"}
            />

            <Metric
              label="Losses"
              value={normalizedStats.losses}
              status={normalizedStats.losses > 0 ? "bad" : "good"}
            />

            <Metric
              label="Closed Trades"
              value={normalizedStats.closed}
            />

            <Metric
              label="Open Positions"
              value={normalizedStats.open}
            />

            <Metric
              label="Rotation Readiness"
              value={
                blocked && best?.qualified
                  ? "CANDIDATE FOUND"
                  : "MONITORING"
              }
              status={
                blocked && best?.qualified
                  ? "warn"
                  : "neutral"
              }
            />
          </div>
        </div>
      </div>

      {/* SCAN SUMMARY */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["Scanned", decisions.length],
          ["Buy", buyCount],
          ["Hold", holdCount],
          ["Sell", sellCount],
          ["Qualified", qualifiedCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-center"
          >
            <div className="text-xl font-black">{value}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/35">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* LEGEND */}
      <details className="mt-4 rounded-2xl border border-white/10 bg-black/20">
        <summary className="cursor-pointer px-4 py-3 text-sm font-black text-white/70">
          Alignment Legend
        </summary>

        <div className="grid gap-2 border-t border-white/10 p-4 text-xs text-white/55 sm:grid-cols-2 lg:grid-cols-3">
          <div>🟢 BUY — entry conditions aligned</div>
          <div>⚪ HOLD — monitor without entry</div>
          <div>🔴 SELL — analysis favors exit / avoid</div>
          <div>✓ Qualified — passes entry requirements</div>
          <div>🔒 Blocked — execution prevented by a rule</div>
          <div>🔄 Rotation — profitable replacement candidate</div>
          <div>A / B — stronger opportunity grade</div>
          <div>C — mixed opportunity</div>
          <div>D / F — weak opportunity</div>
        </div>
      </details>
    </section>
  );
}
