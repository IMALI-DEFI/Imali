import React, { useCallback, useEffect, useState } from "react";
import {
  FaBriefcase,
  FaCheckCircle,
  FaDollarSign,
  FaEnvelope,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaUserTie,
} from "react-icons/fa";

import BotAPI from "../../utils/BotAPI";
import "./AdminWorkAgent.css";

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function AdminWorkAgent() {
  const [overview, setOverview] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        overviewResponse,
        opportunitiesResponse,
      ] = await Promise.all([
        BotAPI.get("/api/admin/work-agent/overview"),
        BotAPI.get(
          "/api/admin/work-agent/opportunities?execution=ready&limit=100"
        ),
      ]);

      const overviewData =
        overviewResponse?.data || overviewResponse;

      const opportunitiesData =
        opportunitiesResponse?.data || opportunitiesResponse;

      setOverview(overviewData);

      setOpportunities(
        opportunitiesData?.opportunities || []
      );
    } catch (err) {
      console.error("Work Agent load error:", err);

      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load Work Agent."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (
    id,
    endpoint,
    body = {}
  ) => {
    try {
      setBusyId(id);

      await BotAPI.post(
        `/api/admin/work-agent/opportunities/${id}/${endpoint}`,
        body
      );

      await load();
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.error ||
        err?.message ||
        "Action failed"
      );
    } finally {
      setBusyId(null);
    }
  };

  const counts = overview?.counts || {};
  const financial = overview?.financial || {};

  if (loading && !overview) {
    return (
      <div className="admin-work-agent">
        <div className="wa-loading">
          <FaSyncAlt className="spin" />
          Loading Work Agent...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-work-agent">
      <div className="wa-header">
        <div>
          <h1>Work Agent</h1>
          <p>
            Developer opportunities, applications,
            outreach and revenue pipeline.
          </p>
        </div>

        <button
          className="wa-button"
          onClick={load}
        >
          <FaSyncAlt />
          Refresh
        </button>
      </div>

      {error && (
        <div className="wa-error">
          {error}
        </div>
      )}

      <div className="wa-cards">
        <Metric
          icon={<FaBriefcase />}
          label="Pursuit Queue"
          value={counts.pursuitQueue}
        />

        <Metric
          icon={<FaCheckCircle />}
          label="Execution Verified"
          value={counts.executionVerified}
        />

        <Metric
          icon={<FaUserTie />}
          label="Applications Sent"
          value={counts.applicationsSent}
        />

        <Metric
          icon={<FaEnvelope />}
          label="Outreach Sent"
          value={counts.outreachSent}
        />

        <Metric
          icon={<FaEnvelope />}
          label="Replies"
          value={counts.replies}
        />

        <Metric
          icon={<FaUserTie />}
          label="Interviews"
          value={counts.interviews}
        />

        <Metric
          icon={<FaCheckCircle />}
          label="Won"
          value={counts.won}
        />

        <Metric
          icon={<FaDollarSign />}
          label="Estimated Pipeline"
          value={money(
            financial.estimatedRevenue
          )}
        />
      </div>

      <div className="wa-money">
        <Money
          label="Estimated Revenue"
          value={financial.estimatedRevenue}
        />

        <Money
          label="Estimated Margin"
          value={financial.estimatedMargin}
        />

        <Money
          label="Actual Revenue"
          value={financial.actualRevenue}
        />

        <Money
          label="Actual Margin"
          value={financial.actualMargin}
        />
      </div>

      <div className="wa-panel">
        <div className="wa-panel-title">
          <h2>Execution Queue</h2>
          <span>
            {opportunities.length} opportunities
          </span>
        </div>

        <div className="wa-table-wrap">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Company</th>
                <th>Role</th>
                <th>Path</th>
                <th>P/B/D</th>
                <th>Status</th>
                <th>Target</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {opportunities.map((item) => {
                const target =
                  item.application_url ||
                  item.application_email ||
                  item.outreach_contact_email;

                const employment =
                  item.revenue_path ===
                  "employment";

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.pursuit_priority}
                      </strong>
                    </td>

                    <td>
                      {item.company || "—"}
                    </td>

                    <td>
                      {item.title}
                    </td>

                    <td>
                      {item.revenue_path}
                    </td>

                    <td>
                      {item.personal_fit}/
                      {item.business_value}/
                      {item.demand_confidence}
                    </td>

                    <td>
                      {item.pipeline_stage ||
                        item.execution_status}
                    </td>

                    <td>
                      {target ? (
                        target.startsWith("http")
                          ? (
                            <a
                              href={target}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open{" "}
                              <FaExternalLinkAlt />
                            </a>
                          )
                          : target
                      ) : "—"}
                    </td>

                    <td>
                      <div className="wa-actions">
                        {employment ? (
                          <>
                            {item.application_status !==
                              "approved" &&
                              item.application_status !==
                                "applied" && (
                                <button
                                  disabled={
                                    busyId ===
                                    item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "approve-application"
                                    )
                                  }
                                >
                                  Approve
                                </button>
                              )}

                            {item.application_status !==
                              "applied" && (
                                <button
                                  disabled={
                                    busyId ===
                                    item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "applied"
                                    )
                                  }
                                >
                                  Applied
                                </button>
                              )}
                          </>
                        ) : (
                          <>
                            {item.outreach_status !==
                              "approved_email" &&
                              item.outreach_status !==
                                "sent" && (
                                <button
                                  disabled={
                                    busyId ===
                                    item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "approve-outreach"
                                    )
                                  }
                                >
                                  Approve
                                </button>
                              )}

                            {item.outreach_status !==
                              "sent" && (
                                <button
                                  disabled={
                                    busyId ===
                                    item.id
                                  }
                                  onClick={() =>
                                    action(
                                      item.id,
                                      "outreach-sent"
                                    )
                                  }
                                >
                                  Sent
                                </button>
                              )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!opportunities.length && (
                <tr>
                  <td
                    colSpan="8"
                    className="wa-empty"
                  >
                    No execution-ready opportunities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value = 0,
}) {
  return (
    <div className="wa-card">
      <div className="wa-icon">
        {icon}
      </div>

      <div>
        <strong>
          {value || 0}
        </strong>

        <span>
          {label}
        </span>
      </div>
    </div>
  );
}

function Money({
  label,
  value,
}) {
  return (
    <div className="wa-money-card">
      <span>
        {label}
      </span>

      <strong>
        {money(value)}
      </strong>
    </div>
  );
}
