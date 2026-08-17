import React, { useCallback, useEffect, useMemo, useState } from "react";
import BotAPI from "../../utils/BotAPI";

const unwrap = (response) => {
  if (!response) return {};
  if (response.data?.data) return response.data.data;
  if (response.data) return response.data;
  return response;
};

const fmt = (value) =>
  Number(value || 0).toLocaleString();

const fmtDate = (value) => {
  if (!value) return "Never";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const fmtDuration = (value) => {
  const ms = Number(value || 0);

  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} sec`;
};

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    value === "success" ||
    value === "active" ||
    value === "running"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value === "failed" ||
    value === "failure" ||
    value === "inactive"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
};

function MetricCard({ label, value, subtext }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs uppercase tracking-wide text-white/45">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-white">
        {value}
      </div>

      {subtext && (
        <div className="mt-1 text-xs text-white/40">
          {subtext}
        </div>
      )}
    </div>
  );
}

export default function AdminAutomationAnalytics() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await BotAPI.getAutomationAnalytics();
      setData(unwrap(response) || {});
    } catch (err) {
      console.error("Automation analytics load failed:", err);

      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load automation analytics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userGrowth = data.user_growth || {};
  const services = data.services || [];
  const jobStats = data.job_stats || [];
  const recentRuns = data.recent_runs || [];
  const sources = data.signup_sources || [];
  const products = data.product_signups || [];
  const marketing = data.marketing || {};
  const latest = marketing.latest || {};

  const totalRuns = useMemo(
    () =>
      jobStats.reduce(
        (sum, job) => sum + Number(job.runs || 0),
        0
      ),
    [jobStats]
  );

  const totalFailures = useMemo(
    () =>
      jobStats.reduce(
        (sum, job) => sum + Number(job.failures || 0),
        0
      ),
    [jobStats]
  );

  const healthyServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.active === "active"
      ).length,
    [services]
  );

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-emerald-300">
              IMALI OPERATIONS
            </div>

            <h1 className="mt-1 text-3xl font-bold">
              Automation Analytics
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-white/55">
              Marketing automation, acquisition, scheduler health,
              campaign production and user growth across IMALI.
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard
            label="Total Users"
            value={fmt(userGrowth.total_users)}
          />

          <MetricCard
            label="Users 24h"
            value={fmt(userGrowth.users_24h)}
          />

          <MetricCard
            label="Users 7d"
            value={fmt(userGrowth.users_7d)}
          />

          <MetricCard
            label="Users 30d"
            value={fmt(userGrowth.users_30d)}
          />

          <MetricCard
            label="Automation Runs"
            value={fmt(totalRuns)}
            subtext="Last 7 days"
          />

          <MetricCard
            label="Failures"
            value={fmt(totalFailures)}
            subtext="Last 7 days"
          />

          <MetricCard
            label="Healthy Services"
            value={`${healthyServices}/${services.length}`}
          />

          <MetricCard
            label="Campaigns"
            value={fmt(marketing.campaign_packages)}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">
              Automation Health
            </h2>

            <p className="mt-1 text-sm text-white/45">
              Current systemd service and timer state.
            </p>

            <div className="mt-4 space-y-3">
              {services.length === 0 && (
                <div className="text-sm text-white/40">
                  No service health data available.
                </div>
              )}

              {services.map((service) => (
                <div
                  key={service.unit}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div>
                    <div className="font-medium">
                      {service.unit}
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      {service.sub || service.result || "Unknown"}
                    </div>
                  </div>

                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      statusClass(service.active),
                    ].join(" ")}
                  >
                    {service.active || "unknown"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">
              Marketing Production
            </h2>

            <p className="mt-1 text-sm text-white/45">
              Content generated by the automated IMALI marketing engine.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricCard
                label="Campaigns"
                value={fmt(marketing.campaign_packages)}
              />
              <MetricCard
                label="Articles"
                value={fmt(marketing.articles)}
              />
              <MetricCard
                label="Videos"
                value={fmt(marketing.videos)}
              />
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-white/40">
                Latest Campaign
              </div>

              <div className="mt-2 font-semibold">
                {latest.title || latest.campaign || "No campaign available"}
              </div>

              {latest.product && (
                <div className="mt-1 text-sm text-emerald-300">
                  {latest.product}
                </div>
              )}

              {latest.campaign && (
                <div className="mt-2 text-xs text-white/40">
                  Campaign: {latest.campaign}
                </div>
              )}

              {latest.youtube_url && (
                <a
                  href={latest.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
                >
                  Open YouTube Video
                </a>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-lg font-semibold">
            Automation Performance — 7 Days
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-3">Job</th>
                  <th className="px-3 py-3">Runs</th>
                  <th className="px-3 py-3">Success</th>
                  <th className="px-3 py-3">Failures</th>
                  <th className="px-3 py-3">Success Rate</th>
                  <th className="px-3 py-3">Avg Duration</th>
                  <th className="px-3 py-3">Last Run</th>
                </tr>
              </thead>

              <tbody>
                {jobStats.map((job) => {
                  const runs = Number(job.runs || 0);
                  const success = Number(job.successes || 0);

                  const rate =
                    runs > 0
                      ? ((success / runs) * 100).toFixed(0)
                      : "0";

                  return (
                    <tr
                      key={job.job_id}
                      className="border-b border-white/5"
                    >
                      <td className="px-3 py-3 font-medium">
                        {job.job_id}
                      </td>
                      <td className="px-3 py-3">{fmt(runs)}</td>
                      <td className="px-3 py-3 text-emerald-300">
                        {fmt(success)}
                      </td>
                      <td className="px-3 py-3 text-red-300">
                        {fmt(job.failures)}
                      </td>
                      <td className="px-3 py-3">
                        {rate}%
                      </td>
                      <td className="px-3 py-3">
                        {fmtDuration(job.avg_duration_ms)}
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {fmtDate(job.last_run)}
                      </td>
                    </tr>
                  );
                })}

                {jobStats.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-3 py-6 text-center text-white/40"
                    >
                      No automation history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">
              Signup Attribution — 30 Days
            </h2>

            <div className="mt-4 space-y-2">
              {sources.map((row) => (
                <div
                  key={row.source}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span className="capitalize">
                    {row.source}
                  </span>

                  <span className="font-semibold text-emerald-300">
                    {fmt(row.signups)}
                  </span>
                </div>
              ))}

              {sources.length === 0 && (
                <div className="text-sm text-white/40">
                  No attributed signups yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">
              Product Acquisition — 30 Days
            </h2>

            <div className="mt-4 space-y-2">
              {products.map((row) => (
                <div
                  key={row.product}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span>
                    {row.product}
                  </span>

                  <span className="font-semibold text-blue-300">
                    {fmt(row.signups)}
                  </span>
                </div>
              ))}

              {products.length === 0 && (
                <div className="text-sm text-white/40">
                  No product attribution yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-lg font-semibold">
            Recent Automation Runs
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-white/40">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Job</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Duration</th>
                  <th className="px-3 py-3">Trigger</th>
                  <th className="px-3 py-3">Message / Error</th>
                </tr>
              </thead>

              <tbody>
                {recentRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-white/5"
                  >
                    <td className="px-3 py-3 text-white/55">
                      {fmtDate(run.started_at)}
                    </td>

                    <td className="px-3 py-3 font-medium">
                      {run.job_id}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-xs",
                          statusClass(run.status),
                        ].join(" ")}
                      >
                        {run.status}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {fmtDuration(run.duration_ms)}
                    </td>

                    <td className="px-3 py-3">
                      {run.trigger_source}
                    </td>

                    <td className="max-w-md px-3 py-3 text-white/55">
                      {run.error || run.message || "—"}
                    </td>
                  </tr>
                ))}

                {recentRuns.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-3 py-6 text-center text-white/40"
                    >
                      No automation runs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
