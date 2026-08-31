import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBrain,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaRobot,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
} from "react-icons/fa";

import BotAPI from "../../utils/BotAPI";

const iconFor = (category) => {
  switch (
    String(category || "").toLowerCase()
  ) {
    case "scan":
      return <FaSearch />;

    case "score":
    case "decision":
      return <FaBrain />;

    case "risk":
    case "reconcile":
      return <FaShieldAlt />;

    case "order":
      return <FaExchangeAlt />;

    case "filled":
    case "exit":
      return <FaCheckCircle />;

    case "skip":
      return <FaExclamationTriangle />;

    default:
      return <FaRobot />;
  }
};

const labelFor = (category) =>
  String(category || "activity")
    .replaceAll("_", " ")
    .toUpperCase();

const shortMessage = (message) => {
  let value = String(message || "");

  // Remove leading emoji/noise so the dashboard is cleaner.
  value = value.replace(
    /^[^\wA-Z0-9]+/,
    ""
  );

  return value;
};

export default function LiveBotActivity({
  exchange = "",
  running = false,
}) {
  const [activity, setActivity] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [updatedAt, setUpdatedAt] =
    useState(null);

  const loadActivity =
    useCallback(
      async (manual = false) => {
        try {
          if (manual) {
            setLoading(true);
          }

          const result =
            await BotAPI.getTradingActivity(
              exchange,
              100
            );

          const rows =
            result?.activity ||
            result?.data?.activity ||
            [];

          setActivity(
            Array.isArray(rows)
              ? rows
              : []
          );

          setUpdatedAt(new Date());
          setError("");
        } catch (err) {
          setError(
            err?.message ||
              "Unable to load live activity."
          );
        } finally {
          setLoading(false);
        }
      },
      [exchange]
    );

  useEffect(() => {
    loadActivity();

    const timer =
      window.setInterval(
        () => {
          loadActivity(false);
        },
        3000
      );

    return () =>
      window.clearInterval(timer);
  }, [loadActivity]);

  const counts = useMemo(() => {
    const output = {
      scans: 0,
      decisions: 0,
      orders: 0,
      fills: 0,
    };

    activity.forEach((item) => {
      const category = String(
        item.category || ""
      ).toLowerCase();

      if (
        category === "scan" ||
        category === "score"
      ) {
        output.scans += 1;
      }

      if (
        category === "decision" ||
        category === "skip" ||
        category === "risk"
      ) {
        output.decisions += 1;
      }

      if (category === "order") {
        output.orders += 1;
      }

      if (
        category === "filled" ||
        category === "exit"
      ) {
        output.fills += 1;
      }
    });

    return output;
  }, [activity]);

  return (
    <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FaRobot className="text-xl text-cyan-300" />

            <h3 className="text-xl sm:text-2xl font-black">
              Live Bot Activity
            </h3>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                running
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {running
                ? "BOT RUNNING"
                : "BOT STOPPED"}
            </span>
          </div>

          <p className="mt-1 text-xs sm:text-sm text-white/45">
            Real IMALI scans, scores,
            decisions, risk checks,
            position monitoring and
            executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <FaClock />
              {updatedAt.toLocaleTimeString()}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              loadActivity(true)
            }
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 disabled:opacity-50"
            title="Refresh activity"
          >
            <FaSyncAlt
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-[10px] font-black text-white/35">
            SCAN EVENTS
          </p>

          <p className="mt-1 text-xl font-black">
            {counts.scans}
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-[10px] font-black text-white/35">
            DECISIONS
          </p>

          <p className="mt-1 text-xl font-black">
            {counts.decisions}
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-[10px] font-black text-white/35">
            ORDERS
          </p>

          <p className="mt-1 text-xl font-black">
            {counts.orders}
          </p>
        </div>

        <div className="rounded-2xl bg-black/20 p-3">
          <p className="text-[10px] font-black text-white/35">
            EXECUTIONS
          </p>

          <p className="mt-1 text-xl font-black">
            {counts.fills}
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {error &&
        activity.length === 0 ? (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            <FaExclamationTriangle className="mr-2 inline" />
            {error}
          </div>
        ) : activity.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
            <FaRobot className="mx-auto mb-3 text-3xl text-cyan-300/60" />

            <p className="font-black">
              Waiting for bot activity
            </p>

            <p className="mt-1 text-xs text-white/40">
              New scans, evaluations and
              executions will appear here
              automatically.
            </p>
          </div>
        ) : (
          activity.map((item) => {
            const timestamp =
              item.created_at
                ? new Date(
                    item.created_at
                  )
                : null;

            const validDate =
              timestamp &&
              !Number.isNaN(
                timestamp.getTime()
              );

            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-2xl border border-white/5 bg-black/20 p-3 transition hover:bg-white/[0.03]"
              >
                <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  {iconFor(
                    item.category
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black tracking-wide text-cyan-300">
                      {labelFor(
                        item.category
                      )}
                    </span>

                    {item.symbol && (
                      <span className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-white/70">
                        {item.symbol}
                      </span>
                    )}

                    {item.exchange && (
                      <span className="text-[10px] uppercase text-white/30">
                        {item.exchange}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 break-words text-xs sm:text-sm text-white/70">
                    {shortMessage(
                      item.message
                    )}
                  </p>
                </div>

                <span className="shrink-0 text-[9px] sm:text-[10px] text-white/25">
                  {validDate
                    ? timestamp.toLocaleTimeString()
                    : ""}
                </span>
              </div>
            );
          })
        )}
      </div>

      {error &&
        activity.length > 0 && (
          <p className="mt-3 text-xs text-yellow-300/60">
            Latest refresh failed.
            Showing recently loaded
            activity.
          </p>
        )}
    </section>
  );
}
